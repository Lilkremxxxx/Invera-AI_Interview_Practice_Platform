# Invera Frontend — Setup Guide

> **Invera** — AI Interview Practice Platform  
> Vite 5 + React 18 + TypeScript + Tailwind CSS + Shadcn/ui

---

## Prerequisites

- Node.js ≥ 18
- npm hoặc bun
- Backend dev chạy tại `http://localhost:9000/api` (xem `../BE/`)

---

## Quick Start

```bash
# 1. Cài dependencies
cd FE
npm install

# 2. Tạo file env (nếu chưa có)
cp .env.example .env   # hoặc tạo thủ công

# 3. Khởi động dev server (port 8080)
npm run dev
```

Mở trình duyệt tại **http://localhost:8080**

---

## Environment Variables

Tạo file `FE/.env` (không commit vào git):

```env
VITE_API_BASE_URL=http://localhost:9000/api
```

---

## Available Scripts

| Command | Mô tả |
|---------|-------|
| `npm run dev` | Dev server tại localhost:8080 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Chạy unit tests (Vitest) |
| `npm run lint` | ESLint check |

---

## Project Structure

```
FE/src/
├── pages/           # 11 route pages
│   ├── Index.tsx        → Landing page (/)
│   ├── Login.tsx         → /login
│   ├── Signup.tsx        → /signup
│   ├── Dashboard.tsx     → /app
│   ├── NewSession.tsx    → /app/new
│   ├── InterviewRoom.tsx → /app/interview/:id
│   ├── Sessions.tsx      → /app/sessions
│   ├── SessionDetail.tsx → /app/sessions/:id
│   ├── Profile.tsx       → /app/profile
│   └── Settings.tsx      → /app/settings
├── components/
│   ├── landing/     # 8 landing page sections
│   ├── layout/      # Navbar, Sidebar, AppLayout, Footer
│   └── ui/          # 50+ Shadcn/ui components
├── contexts/
│   ├── AuthContext.tsx   # JWT auth state (user, login, logout)
│   └── LanguageContext.tsx # i18n vi/en (100+ keys)
├── hooks/
│   ├── use-auth.ts       # Auth hook wrapping AuthContext
│   ├── use-theme.ts
│   └── use-toast.ts
├── lib/
│   ├── api.ts        # Fetch client (Bearer token + 401 redirect)
│   ├── mock-data.ts  # Role/level/config data
│   └── utils.ts
└── test/
    ├── setup.ts
    ├── example.test.ts
    └── auth.test.tsx
```

---

## Authentication Flow

1. User đăng ký/đăng nhập → `POST /api/auth/register` hoặc `POST /api/auth/login`
2. Token JWT lưu vào `localStorage` (key: `invera_token`)
3. `AuthContext` validate token qua `GET /auth/me` khi mount
4. `PrivateRoute` redirect về `/login` nếu `!isAuthenticated`
5. Token 401 → auto clear + redirect `/login`

---

## Tech Stack

| Thư viện | Version | Mục đích |
|----------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling |
| Shadcn/ui | latest | UI components |
| React Router | v6 | Routing |
| TanStack Query | v5 | Server state / data fetching |
| React Hook Form | 7 | Form handling |
| Zod | 3 | Schema validation |
| Recharts | 2 | Charts (Dashboard) |
| Vitest | latest | Unit testing |

---

## API Client (`lib/api.ts`)

```typescript
import { sessionsApi, authApi } from '@/lib/api';

// Auth
await authApi.login(email, password);   // → token
await authApi.register({ email, password });
await authApi.me();                      // → UserOut

// Sessions
await sessionsApi.create({ role, level, mode, question_count });
await sessionsApi.list();
await sessionsApi.get(id);
await sessionsApi.submitAnswer(sessionId, { question_id, answer_text });
await sessionsApi.complete(sessionId);
```

---

## Running Tests

```bash
npm test
# hoặc
npx vitest run        # single run
npx vitest --ui       # UI mode
```

Tests nằm tại `src/test/*.test.{ts,tsx}`.
