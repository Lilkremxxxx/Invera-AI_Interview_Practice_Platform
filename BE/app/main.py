import time
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.api.endpoints.admin import router as admin_router
from app.api.endpoints.auth import router as login_router
from app.api.endpoints.billing import router as billing_router
from app.api.endpoints.meetings import router as meetings_endpoint_router
from app.api.endpoints.profile import router as profile_router
from app.api.endpoints.qna import router as qna_router
from app.api.endpoints.sessions import router as sessions_router
from app.core.config import settings
from app.db.session import create_pool, close_pool

# Filter out Chrome DevTools Protocol requests from logs
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find("/json/") == -1

# Apply filter to uvicorn access logger
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

BASE_DIR = settings.backend_dir

app = FastAPI(
    title="Invera API",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
)

CANONICAL_HOST = "invera.pp.ua"
PUBLIC_HOSTS = {CANONICAL_HOST, "www.invera.pp.ua"}


def _forwarded_proto(request: Request) -> str:
    header = request.headers.get("x-forwarded-proto")
    if header:
        return header.split(",")[0].strip().lower()

    cf_visitor = request.headers.get("cf-visitor", "")
    if '"scheme":"https"' in cf_visitor.lower():
        return "https"
    if '"scheme":"http"' in cf_visitor.lower():
        return "http"

    return request.url.scheme.lower()


def _host_without_port(request: Request) -> str:
    forwarded_host = request.headers.get("x-forwarded-host")
    raw_host = forwarded_host or request.headers.get("host") or request.url.netloc
    return raw_host.split(",")[0].strip().split(":")[0].lower()


def _canonical_redirect_url(request: Request) -> str | None:
    host = _host_without_port(request)
    if host not in PUBLIC_HOSTS:
        return None

    forwarded_proto = _forwarded_proto(request)
    if forwarded_proto == "https" and host == CANONICAL_HOST:
        return None

    target = request.url.replace(scheme="https", netloc=CANONICAL_HOST)
    return str(target)


@app.middleware("http")
async def enforce_public_https(request: Request, call_next):
    redirect_url = _canonical_redirect_url(request)
    if redirect_url:
        return RedirectResponse(url=redirect_url, status_code=308)

    return await call_next(request)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_endpoint_router, prefix=f"{settings.api_prefix}/meetings", tags=["meetings"])
app.include_router(login_router, prefix=f"{settings.api_prefix}/auth", tags=["auth"])
app.include_router(profile_router, prefix=f"{settings.api_prefix}/profile", tags=["profile"])
app.include_router(qna_router, prefix=f"{settings.api_prefix}/qna", tags=["qna"])
app.include_router(sessions_router, prefix=f"{settings.api_prefix}/sessions", tags=["sessions"])
app.include_router(billing_router, prefix=f"{settings.api_prefix}/billing", tags=["billing"])
app.include_router(admin_router, prefix=f"{settings.api_prefix}/admin", tags=["admin"])

settings.uploads_dir.mkdir(exist_ok=True)
settings.private_uploads_dir.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(settings.uploads_dir)), name="media")


def _frontend_index() -> Path:
    return settings.frontend_dist_dir / "index.html"


def _build_openapi():
    return get_openapi(
        title=app.title,
        version="1.0.0",
        description="Invera public API served under /api.",
        routes=app.routes,
    )


@app.get("/healthz", include_in_schema=False)
async def healthcheck():
    return {"status": "ok"}


@app.get("/openapi.json", include_in_schema=False)
async def openapi_alias():
    return JSONResponse(_build_openapi())

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting server...")
    pool = await create_pool()
    # Run migrations on startup
    try:
        migrations = [
            "001_create_sessions_questions_answers.sql",
            "002_add_admin_and_reset_token.sql",
            "003_add_email_verification.sql",
            "004_add_verification_resend_cooldown.sql",
            "005_add_admin_invites.sql",
            "006_add_plan_billing.sql",
            "007_add_profile_uploads.sql",
            "008_add_question_bank_majors.sql",
            "009_add_qna_threads.sql",
        ]
        async with pool.acquire() as conn:
            for migration in migrations:
                migration_path = BASE_DIR / "migrations" / migration
                if migration_path.exists():
                    sql = migration_path.read_text(encoding="utf-8")
                    await conn.execute(sql)
                    print(f"✅ Migration applied: {migration}")
    except Exception as e:
        print(f"⚠️  Migration error (may already exist): {e}")
    print("✅ Server ready!")


@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down server...")
    await close_pool()
    print("✅ Server stopped!")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_frontend(full_path: str):
    api_root = settings.api_prefix.strip("/")
    if full_path == api_root or full_path.startswith(f"{api_root}/") or full_path == "media" or full_path.startswith("media/"):
        raise HTTPException(status_code=404, detail="Not found")

    index_file = _frontend_index()
    if not index_file.exists():
        raise HTTPException(status_code=503, detail="Frontend build not published yet")

    dist_root = settings.frontend_dist_dir.resolve()
    requested_path = (dist_root / full_path).resolve()

    try:
        requested_path.relative_to(dist_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Not found") from exc

    if full_path and requested_path.is_file():
        return FileResponse(requested_path)

    if full_path and "." in Path(full_path).name:
        raise HTTPException(status_code=404, detail="Asset not found")

    return FileResponse(index_file)
