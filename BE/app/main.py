import time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db.session import create_pool, close_pool
from api.endpoints.meetings import router as meetings_endpoint_router
from api.endpoints.auth import router as login_router

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="AI Meeting")

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "http://localhost:8080",
]

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_endpoint_router, prefix="/meetings", tags=["meetings"])
app.include_router(login_router, prefix="/auth", tags=["auth"])

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")


@app.on_event("startup")
async def startup_event():
    print("🚀 Starting server...")
    await create_pool()
    print("✅ Server ready!")


@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down server...")
    await close_pool()
    print("✅ Server stopped!")
