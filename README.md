# Invera AI Interview Practice Platform

Nền tảng luyện phỏng vấn kỹ thuật với trải nghiệm end-to-end: tạo phiên phỏng vấn, trả lời câu hỏi, chấm điểm, quản lý hồ sơ, billing, QnA và bảng điều khiển admin. Repo gồm một frontend Vite + React và một backend FastAPI phục vụ API, auth, scoring, billing, admin, cùng hệ thống migration và publish FE.

## Tính năng chính
- Đăng ký/đăng nhập, OAuth, xác thực email, refresh/expire token.
- Tạo và quản lý phiên phỏng vấn, lịch sử phiên, điểm số và phân tích.
- Phòng phỏng vấn (Interview Room) với luồng câu hỏi – câu trả lời.
- QnA, xuất tài liệu và xử lý file hồ sơ (resume).
- Billing/plan, tích hợp VNPay (sandbox), quản trị admin.
- Admin dashboard, quản trị user, question bank, thống kê hệ thống.
- Serve FE build trực tiếp từ backend khi deploy.

## Tech stack
**Frontend**
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- React Query, React Router, Zod, React Hook Form

**Backend**
- FastAPI + Uvicorn
- PostgreSQL (asyncpg)
- JWT (python-jose), argon2/passlib
- Email + file upload
- VNPay integration

## Kiến trúc nhanh
- `FE/` là SPA chạy trên Vite, gọi API qua `VITE_API_BASE_URL` (mặc định `/api`).
- `BE/` là FastAPI, mount FE build từ `FE/dist`, tự chạy migrations khi startup.
- API được phục vụ dưới `/api`, có docs tại `/api/docs`.
- Static uploads được phục vụ tại `/media`.

## Cấu trúc thư mục
- `BE/app/main.py`: FastAPI app, middleware, routing, serve FE build.
- `BE/app/api/endpoints/*`: các API domain (auth, sessions, qna, billing, admin, profile, meetings).
- `BE/app/services/*`: scoring, QnA, email, file storage, billing.
- `BE/migrations/*.sql`: migrations tự chạy khi backend khởi động.
- `FE/src/pages/*`: các màn hình chính của app.
- `FE/src/lib/api.ts`: API client, quản lý token và lỗi.
- `scripts/*`: bootstrap backend, build FE, vận hành systemd.

## Chạy local

### Backend
Yêu cầu: Python 3.10+, PostgreSQL, (conda env nếu dùng scripts).

```bash
./scripts/bootstrap_backend.sh
```

Tạo file `BE/.env` (tối thiểu):
```bash
API_PREFIX=/api
BACKEND_HOST=127.0.0.1
BACKEND_PORT=9000
PG_HOST=127.0.0.1
PG_PORT=5432
PG_DBNAME=invera
PG_USER=postgres
PG_PASSWORD=postgres
SECRET_KEY=change-me
```

Chạy server:
```bash
cd BE
python -m uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
```

### Frontend
```bash
cd FE
npm install
npm run dev
```

Frontend sẽ gọi API từ `VITE_API_BASE_URL` (mặc định `/api`).

## Deploy / vận hành
Scripts hỗ trợ systemd user units và Cloudflared:
```bash
./scripts/inveractl up
./scripts/inveractl status
./scripts/inveractl logs
```

Build FE để publish:
```bash
./scripts/publish_frontend.sh
```

## Biến môi trường quan trọng
- `API_PREFIX`, `BACKEND_HOST`, `BACKEND_PORT`
- `FRONTEND_URL`, `API_URL`
- PostgreSQL: `PG_HOST`, `PG_PORT`, `PG_DBNAME`, `PG_USER`, `PG_PASSWORD`
- JWT: `SECRET_KEY`, `ALGORITHM`
- OAuth: `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID` (và secrets)
- Email: `SMTP_*`, `EMAIL_DELIVERY_MODE`
- Billing: `VNPAY_*`
- LLM: `DEEPSEEK_*`

## API Docs
Sau khi chạy backend:
- Swagger: `http://127.0.0.1:9000/api/docs`
- OpenAPI: `http://127.0.0.1:9000/api/openapi.json`

## Ghi chú
- Backend tự chạy migrations khi startup.
- Uploads public tại `uploads/` và private tại `private_uploads/`.

