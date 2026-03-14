# Invera - AI Interview Practice Platform

> **Context file cho agent `invera-dev`**. Agent đọc file này ở đầu mỗi chat mới để lấy context và lịch sử thay đổi.

---

## 1. Project Overview

**Invera** là nền tảng luyện phỏng vấn bằng AI, hướng đến sinh viên và người đi làm tại Việt Nam. Người dùng chọn role + level → AI tạo câu hỏi → người dùng trả lời (text/voice) → AI chấm rubric + feedback chi tiết.

### Business Model (4 gói)

| Gói | Đặc điểm chính |
|-----|-----------------|
| **Free** | 1 session, 1 role/level, basic rubric scoring, short summary |
| **Basic** | Pay-per-session, role/level selectable, 30-day history, score comparison |
| **Pro** | Unlimited history, detailed analytics, progress dashboard, PDF export, adaptive difficulty |
| **Premium** | Hybrid AI + mentor, real-time qualitative feedback, CV-based questions, readiness assessment |

### Product Workflow

```
Customer: Access → Login → Start Practice → Choose Role/Level → Upload CV (opt) → Answer Questions → View Result → Practice Again?
System:   Display Homepage → Authenticate → Home/Dashboard → Generate Questions → Analyze → Generate Feedback
```

---

## 2. Tech Stack

### Backend (`BE/`)
- **Framework**: FastAPI (async Python)
- **Database**: PostgreSQL (asyncpg, pool 5-20)
- **Auth**: JWT (python-jose) + Argon2 password hashing
- **File Storage**: Local disk (`uploads/`)
- **Config**: `.env` file (PG_HOST, PG_PORT, PG_DBNAME, PG_USER, PG_PASS, SECRET_KEY)

### Frontend (`FE/`)
- **Build**: Vite 5 + React 18 + TypeScript
- **Styling**: Tailwind CSS 3 + Shadcn/ui (50+ components)
- **Routing**: React Router v6 (nested layouts)
- **State**: React Query + Context API
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **i18n**: Custom LanguageContext (vi/en, 100+ keys)
- **Theme**: Light (default guest) / Dark (authenticated users only)

### Dev Commands
```bash
# Frontend
cd FE && npm run dev    # Dev server port 8080
cd FE && npm run build  # Production build
cd FE && npm test       # Vitest

# Backend
cd BE && uvicorn app.main:app --reload  # Dev server port 8000
```

---

## 3. Architecture

### Backend API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/auth/register` | User registration | ❌ |
| POST | `/auth/login` | JWT token | ❌ |
| GET | `/auth/me` | Current user | ✅ |
| GET | `/meetings/` | List meetings | ✅ |
| GET | `/meetings/{id}` | Get meeting + audio | ✅ |
| POST | `/meetings/upload` | Upload mp3/wav | ✅ |
| DELETE | `/meetings/{id}` | Delete meeting | ✅ |

### Frontend Routes

```
/                       → Landing page (public)
/login, /signup         → Auth (public)
/app                    → Dashboard (protected)
/app/new                → New session wizard (3-step)
/app/sessions           → Session list + filter
/app/sessions/:id       → Session detail + replay
/app/interview/:id      → Interview room (full-screen)
/app/profile            → User profile + CV upload
/app/settings           → Preferences (lang/theme/audio/privacy)
```

### Database Schema (current)

```sql
-- users
id UUID PK, email UNIQUE, password_hash, created_at

-- meetings
id UUID PK, user_id FK→users, title, original_filename,
storage_provider, storage_path, status (QUEUED|PROCESSING|COMPLETED), created_at
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| InterviewRoom | `pages/InterviewRoom.tsx` | Core interview experience: Q&A + feedback |
| NewSession | `pages/NewSession.tsx` | 3-step setup wizard (role/level/config) |
| Dashboard | `pages/Dashboard.tsx` | Stats cards + progress chart + recent |
| AppLayout | `components/layout/AppLayout.tsx` | Protected layout with sidebar |
| Navbar | `components/layout/Navbar.tsx` | Top nav (responsive) |
| ThemeProvider | `components/theme-provider.tsx` | Light/dark + auth-based switching |
| LanguageContext | `contexts/LanguageContext.tsx` | i18n vi/en |
| useAuth | `hooks/use-auth.ts` | Auth state (currently path-based mock) |

---

## 4. Current Status

### ✅ Implemented
- Full UI/UX cho tất cả pages
- Routing + navigation hoàn chỉnh
- Form validation (React Hook Form + Zod)
- Tailwind styling + dark mode
- i18n (Vietnamese/English)
- Backend API: auth + meetings CRUD
- JWT auth flow (backend)
- BE foundation: `schemas/user.py`, `services/storage/local.py`, `.env` với SECRET_KEY
- FE auth: kết nối thật với BE JWT — localStorage token, AuthContext, route guard PrivateRoute
- FE API client (`lib/api.ts`) với fetch, Bearer token interceptor, 401 redirect

### ⚠️ Mock / Placeholder
- Interview content: 10 sample questions, random scores
- User stats: hardcoded (24 sessions, 76% avg)
- Feedback: fixed sample responses
- Session history: mock data
- Testimonials + pricing: hardcoded
- Progress charts: random data
- AI integration: chưa có (câu hỏi + chấm rubric + feedback)
- Voice input: mock recording UI
- CV upload processing: chưa có
- Payment integration: chưa có

### 🎯 MVP Scope (xem chi tiết tại `.github/task.md`)

**IN SCOPE — MVP:**
1. BE foundation: tạo `schemas/user.py`, `services/storage/local.py`, `requirements.txt`, bổ sung `.env`
2. BE API: sessions (create/list/get/complete) + questions (static seed) + answers (submit + score)
3. Scoring: keyword-matching đơn giản (không cần AI)
4. FE auth: kết nối thật với BE JWT (localStorage, interceptor, route guard)
5. FE pages: wire Login, Signup, NewSession, InterviewRoom, Sessions, SessionDetail, Dashboard sang real API

**OUT OF SCOPE — MVP (backlog):**
- AI question generation, AI scoring/feedback
- Voice/video input, CV upload/parsing
- Payment integration, subscription enforcement
- Analytics charts (real data), PDF export
- Social login, mentor matching, email verification

---

## 5. Rubric System

### Technical Q&A Rubric

| Tiêu chí | Tốt | Xuất sắc |
|-----------|-----|----------|
| Bám sát yêu cầu | Bao phủ hầu hết ý chính | Đầy đủ + trọng tâm phụ |
| Đúng kỹ thuật | Đúng, nhất quán | Đúng + chỉ ra giả định/giới hạn |
| Lập luận & cấu trúc | Lập luận rõ, có bước | Chặt, nêu điều kiện/biên |
| Tính đầy đủ | Đủ phần chính + bổ sung | Đủ + edge cases |
| Trade-off / rủi ro | Phân tích trade-off chính | Phân tích + tác động |

### Behavioral Rubric (STAR method)

| Tiêu chí | Tốt | Xuất sắc |
|-----------|-----|----------|
| Situation/Task rõ ràng | Bối cảnh đủ hiểu | Rõ, có ràng buộc |
| Action cụ thể | Hành động có lý do | + quyết định then chốt |
| Result đo được | Kết quả rõ ràng | + bài học/reflect |
| Relevance | Liên quan tốt | + nhấn năng lực mục tiêu |

---

## 6. Privacy & Legal (Vietnam)

- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân
- Consent rõ ràng, có cơ chế rút consent
- Quyền xem/xuất/xóa dữ liệu (SLA 72h)
- Nếu dùng AI API nước ngoài → hồ sơ đánh giá chuyển dữ liệu xuyên biên giới
- Incident response: thông báo trong 24h
- OWASP ASVS compliance target

---

## 7. File Structure Quick Reference

```
PRJ/
├── BE/app/
│   ├── main.py                 # FastAPI entry + CORS
│   ├── api/endpoints/
│   │   ├── auth.py             # Register/login/me
│   │   └── meetings.py         # CRUD meetings + file upload
│   ├── core/
│   │   ├── config.py           # Env vars + settings
│   │   └── security.py         # JWT + Argon2
│   └── db/session.py           # AsyncPG pool
├── FE/src/
│   ├── pages/                  # 10 route pages
│   ├── components/
│   │   ├── landing/            # 8 landing sections
│   │   ├── layout/             # Navbar, Sidebar, Footer
│   │   └── ui/                 # 50+ Shadcn components
│   ├── contexts/               # LanguageContext
│   ├── hooks/                  # useAuth, useTheme, useToast
│   └── lib/                    # utils, mock-data
└── EXE101/                     # Project docs & requirements
```

---

## 8. Changelog

> Mỗi lần agent thực hiện thay đổi code, ghi log ở đây theo format:
> `[YYYY-MM-DD] <scope> | <mô tả ngắn> | files changed`

### Log

```
[2026-03-06] init | Tạo CLAUDE.md context file + invera-dev agent | CLAUDE.md, .github/agents/invera-dev.agent.md
[2026-07-18] fe+be | Kết nối FE với BE JWT auth — tạo schemas/user.py, services/storage/local.py, cập nhật .env với SECRET_KEY; tạo FE AuthContext, api.ts client (fetch), PrivateRoute guard; fix Login + Signup pages với real submit + error messages; thêm translations error keys | .env, BE/app/schemas/user.py, BE/app/schemas/__init__.py, BE/app/services/storage/local.py, BE/app/services/__init__.py, BE/app/services/storage/__init__.py, FE/.env, FE/src/lib/api.ts, FE/src/contexts/AuthContext.tsx, FE/src/contexts/LanguageContext.tsx, FE/src/hooks/use-auth.ts, FE/src/pages/Login.tsx, FE/src/pages/Signup.tsx, FE/src/App.tsx
```

---

## 9. Conventions & Patterns

### Code Style
- **FE**: TypeScript strict, Tailwind utility classes, Shadcn/ui components
- **BE**: Python async/await, FastAPI dependency injection, Pydantic models
- **Naming**: camelCase (FE), snake_case (BE)
- **Components**: Functional React with hooks
- **State**: React Query cho server state, Context cho global UI state

### Git
- Branch: `Bang` (current working branch)
- Default: `main`
- Repo: `Lilkremxxxx/Invera-AI_Interview_Practice_Platform`

### Environment
- FE dev: `localhost:8080`
- BE dev: `localhost:8000`
- DB: PostgreSQL at `100.82.138.69:5432`


