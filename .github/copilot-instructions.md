# Copilot Instructions — Invera AI Interview Practice Platform

## Skill Creator Ultra
When user asks to "create skill", "turn workflow into skill", or "automate this":
- Read `.github/skill-creator-ultra/SKILL.md`
- Follow the 8 Phase pipeline

## Commands

### Frontend (`FE/`)
```bash
cd FE
npm run dev          # Dev server at http://localhost:8080
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npx vitest run src/test/example.test.ts  # Run single test file
```

### Backend (`BE/`)
```bash
cd BE
uvicorn app.main:app --reload   # Dev server at http://localhost:8000
# No test runner configured yet (no pytest setup found)
```

---

## Architecture

### Overview
Full-stack AI interview practice platform (Vietnamese market). The FE is a standalone React SPA communicating with the FastAPI BE via REST. Auth is JWT-based on the backend, but **the FE currently uses a path-based mock** (`window.location.pathname.startsWith('/app')` → authenticated). Real FE↔BE JWT integration is pending.

### Provider Stack (FE, top-down)
```
BrowserRouter
  QueryClientProvider         ← TanStack React Query (server state)
    LanguageProvider          ← i18n (vi/en), 100+ keys in LanguageContext.tsx
      ThemeProvider           ← light/dark; dark only available when isAuthenticated
        Routes                ← React Router v6
```

### Route Structure
- Public: `/`, `/login`, `/signup`
- Full-screen (no sidebar): `/app/interview/:id`
- Protected (inside `AppLayout` with sidebar): `/app`, `/app/new`, `/app/sessions`, `/app/sessions/:id`, `/app/profile`, `/app/settings`

### Backend
- FastAPI (async) with AsyncPG connection pool (5–20 connections)
- Auth via `python-jose` (JWT) + Argon2 password hashing
- Files served from `/media` → `./uploads/` static directory
- DB: PostgreSQL at host configured in `.env` (`PG_HOST`, `PG_PORT`, `PG_DBNAME`, `PG_USER`, `PG_PASSWORD`)
- Required `.env` vars not yet present: `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

### Database Tables
```sql
users:    id (UUID PK), email (UNIQUE), password_hash, created_at
meetings: id (UUID PK), user_id (FK→users), title, original_filename,
          storage_provider, storage_path, status (QUEUED|PROCESSING|COMPLETED), created_at
```

---

## Key Conventions

### FE Code Style
- **Path alias**: `@/` maps to `FE/src/`. Always use `@/` imports, never relative `../../`.
- **Class merging**: Use `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`) for all conditional Tailwind classes.
- **UI components**: Use Shadcn/ui components from `@/components/ui/`. Do not install separate UI libraries.
- **TypeScript**: Strict mode is **disabled** (`noImplicitAny: false`, `strictNullChecks: false`). This is intentional for rapid dev.
- **Dark mode**: Tailwind `darkMode: ["class"]` — toggled by adding `.dark` class to `<html>`, not via `prefers-color-scheme`. Dark mode is only available for authenticated users.

### FE State Management
- **Server state**: TanStack React Query. Use `useQuery`/`useMutation` for all API calls.
- **Global UI state**: React Context (`LanguageContext`, `ThemeProvider`).
- **Auth state**: `useAuth()` hook in `@/hooks/use-auth.ts` — currently mock, will be replaced with real JWT.
- **Forms**: React Hook Form + Zod for all user-input forms.

### i18n
- All user-facing strings must go through `LanguageContext`. Use `const { t } = useLanguage()`.
- Translations live entirely in `FE/src/contexts/LanguageContext.tsx`. Add new keys to both `vi` and `en` objects.
- Default language is `'vi'` (Vietnamese).

### Mock vs Real Data
Several parts of the app are intentionally mocked and should be replaced when building real features:
- `@/lib/mock-data.ts` — roles, levels, sample questions, answer modes (to be replaced by API calls)
- `useAuth()` — path-based mock (to be replaced by BE JWT flow)
- `Dashboard.tsx` — hardcoded stats (24 sessions, 76% avg score)
- `InterviewRoom.tsx` — 10 hardcoded sample questions, random scores

### BE Code Style
- Python async/await throughout. All DB calls use `asyncpg` via `get_db` dependency injection.
- Pydantic models belong in `BE/app/schemas/` (not yet created — `schemas/user.py` is imported but missing).
- Storage service abstraction: `BE/app/services/storage/local.py` (also missing, imported in meetings endpoint).
- JWT dependency for protected routes: inject `current_user = Depends(get_current_user)`.

### Agent Definitions
Custom agent prompts live in `.github/agents/`. The `invera-dev` agent reads `CLAUDE.md` at session start and appends to its changelog after changes. All significant code changes should be logged in `CLAUDE.md` section 8 (Changelog) with format:
```
[YYYY-MM-DD] <scope> | <short description> | files changed
```

---

## MVP Scope

Full task list is in `.github/task.md`. Summary:

**Blocking BE startup (fix first):**
- `BE/app/schemas/user.py` — missing, imported by `auth.py`
- `BE/app/services/storage/local.py` — missing, imported by `meetings.py`
- `BE/requirements.txt` — does not exist
- `.env` missing `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

**MVP work (4 phases):**
1. **BE Foundation** — unblock startup (schemas, storage service, requirements.txt, .env)
2. **BE Sessions API** — new tables (`sessions`, `questions`, `answers`) + endpoints + keyword-based scorer
3. **FE Auth** — replace path-based mock with real JWT: `api.ts` client, `use-auth.ts` rewrite, Login/Signup pages wired to BE
4. **FE Session Flow** — wire NewSession → InterviewRoom → Sessions → SessionDetail → Dashboard to real API

**Out of scope for MVP:** AI question generation, AI scoring, voice/video input, CV upload, payment, analytics charts, social login, mentor matching, PDF export.
