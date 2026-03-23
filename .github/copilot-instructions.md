# Copilot Instructions — Invera AI Interview Practice Platform

> **Project:** AI Interview Practice Platform targeting Vietnamese market  
> **Status:** MVP (Phase 0-3 DONE, Phase 4-7 in progress)  
> **Key Docs:** `agent.md` contains the live project context and `tasks.md` is the canonical task ledger for custom agents

---

## Build, Test, and Lint Commands

### Frontend (`FE/`)
```bash
cd FE
npm run dev          # Dev server at http://localhost:8080
npm run build        # Production build → dist/
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npm run test:watch   # Watch mode
npx vitest run src/test/auth.test.tsx  # Run single test file
```

### Backend (`BE/`)
```bash
cd BE
source ~/miniconda3/etc/profile.d/conda.sh
conda activate EXE101
uvicorn app.main:app --reload --host 127.0.0.1 --port 9000
```

### Development
- **Frontend:** Runs on port **8080** (NOT 5173) — configured in vite config
- **Backend:** Runs on port **9000**
- **Database:** PostgreSQL is configured from `BE/.env`
- **CORS:** Backend allows localhost dev origins and `invera.pp.ua` origins

---

## High-Level Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Shadcn/ui |
| **Backend** | FastAPI (async) + AsyncPG + Python 3.10+ |
| **Auth** | JWT (python-jose) + Argon2 password hashing |
| **Database** | PostgreSQL (asyncpg pool: 5-20 connections) |
| **State** | TanStack React Query v5 + React Context |
| **Forms** | React Hook Form + Zod validation |
| **i18n** | Custom LanguageContext (vi/en, 100+ keys) |
| **Icons** | Lucide React |
| **Charts** | Recharts |

### Application Flow
```
User Journey:
  Register/Login (JWT auth)
    → Dashboard (view stats + session history)
      → New Session (choose role: frontend/backend/fullstack, level: intern/junior/mid)
        → Interview Room (answer questions in text mode)
          → View Results (score + feedback)
            → Session Detail (review answers)

System Architecture:
  React SPA (port 8080 in dev, FE/dist in prod) ←→ REST API (port 9000, /api) ←→ PostgreSQL
         ↓ stores JWT in localStorage
```

### Provider Hierarchy (FE)
```tsx
BrowserRouter
  └─ QueryClientProvider      // TanStack React Query for server state
      └─ AuthProvider          // JWT auth state (token in localStorage)
          └─ LanguageProvider  // i18n (vi/en), default: 'vi'
              └─ ThemeProvider // Light (default) / Dark (auth-required)
                  └─ Routes    // React Router v6
```

### Database Schema (Current)
```sql
-- Core tables
users:
  id UUID PK, email UNIQUE, password_hash, created_at

sessions:
  id UUID PK, user_id FK→users, role TEXT, level TEXT, mode TEXT,
  status (IN_PROGRESS|COMPLETED), created_at, completed_at, avg_score

questions:
  id SERIAL PK, role TEXT, level TEXT, text TEXT, category TEXT,
  difficulty TEXT, ideal_keywords TEXT

answers:
  id UUID PK, session_id FK→sessions, question_id FK→questions,
  answer_text TEXT, score INT, feedback TEXT, submitted_at

-- Legacy (from initial scaffold, may be deprecated)
meetings:
  id UUID PK, user_id FK→users, title, original_filename,
  storage_provider, storage_path, status, created_at
```

### API Endpoints (See `BE/API_DOCS.md` for details)
```
Auth:
  POST   /api/auth/register      # Create account
  POST   /api/auth/login         # Get JWT token (form-encoded)
  GET    /api/auth/me            # Current user info 🔒

Sessions:
  POST   /api/sessions                  # Create new session + get questions 🔒
  GET    /api/sessions                  # List user's sessions 🔒
  GET    /api/sessions/{id}             # Session detail + answers 🔒
  POST   /api/sessions/{id}/answers     # Submit answer (auto-scored) 🔒
  PUT    /api/sessions/{id}/complete    # Mark session complete 🔒
  GET    /api/sessions/questions/list   # Debug: list available questions 🔒

🔒 = Requires Authorization: Bearer {token}
```

### Frontend Routes
```
Public:
  /                → Landing page (Hero, Features, Testimonials, Pricing, FAQ)
  /login           → Login form (real JWT flow)
  /signup          → Registration form

Protected (requires auth):
  /app                    → Dashboard (stats cards + progress chart)
  /app/new                → New Session wizard (3-step: role → level → config)
  /app/sessions           → Session history (list with filters)
  /app/sessions/:id       → Session detail (review answers)
  /app/interview/:id      → Interview Room (full-screen, no sidebar)
  /app/profile            → User profile (edit, CV upload placeholder)
  /app/settings           → Settings (language, theme, audio, privacy)
```

---

## Key Conventions

### Frontend Conventions

#### Path Aliases & Imports
- **Always use `@/` imports**, never relative `../../`. Example: `@/components/ui/button`
- `@/` maps to `FE/src/` (configured in tsconfig.json and vite.config.ts)

#### Styling
- **Tailwind utility classes** for all styling (no CSS files except globals)
- **Class merging**: Use `cn()` from `@/lib/utils` for conditional classes
  ```tsx
  import { cn } from "@/lib/utils"
  <div className={cn("base-class", isActive && "active-class")} />
  ```
- **Dark mode**: Manual toggle via `.dark` class on `<html>` (NOT system preference)
  - Light mode: default for all users
  - Dark mode: only available when authenticated (controlled in ThemeProvider)
- **UI Components**: Use Shadcn/ui from `@/components/ui/`. Do NOT install other UI libraries.

#### State Management
- **Server state**: TanStack React Query (`useQuery`, `useMutation`) for ALL API calls
- **Global UI state**: React Context (LanguageContext, ThemeProvider, AuthContext)
- **Forms**: React Hook Form + Zod validation for all user inputs
- **No Redux/MobX/Zustand** — keep it simple with Query + Context

#### i18n (Internationalization)
- All user-facing text MUST go through `LanguageContext`
- Usage: `const { t } = useLanguage()` then `t('key.path')`
- Translations in `FE/src/contexts/LanguageContext.tsx` (both `vi` and `en`)
- Default language: `'vi'` (Vietnamese)
- Switch language via Settings page (stored in localStorage)

#### TypeScript
- **Strict mode DISABLED** (`noImplicitAny: false`, `strictNullChecks: false`)
- This is intentional for rapid prototyping — may be enabled later
- Use types when helpful, but don't over-type during MVP phase

#### API Integration
- Use `@/lib/api.ts` client (fetch wrapper with Bearer token auto-injection)
- Token stored in localStorage (key: `invera_token`)
- 401 responses auto-clear token and redirect to `/login`
- Example:
  ```tsx
  import { sessionsApi } from '@/lib/api'
  const sessions = await sessionsApi.list()
  ```

### Backend Conventions

#### Code Style
- **100% async/await** — all handlers and DB calls are async
- **Dependency injection** for database: `db = Depends(get_db)`
- **Protected routes**: `current_user = Depends(get_current_user)`
- **Pydantic models** in `BE/app/schemas/` (e.g., `UserOut`, `SessionCreate`)

#### Database Access
- Use **asyncpg** via connection pool (configured in `db/session.py`)
- Always use parameterized queries: `await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id)`
- Connection pool settings: min=5, max=20

#### File Structure
```
BE/app/
├── main.py              # FastAPI app + CORS + startup
├── api/endpoints/       # Route handlers (auth.py, sessions.py)
├── core/
│   ├── config.py        # Environment variables (Settings class)
│   └── security.py      # JWT + password hashing
├── db/session.py        # AsyncPG pool management
├── schemas/             # Pydantic models (user.py, session.py, etc.)
└── services/
    ├── scoring.py       # Keyword-matching scorer
    └── storage/
        └── local.py     # File upload to disk
```

#### Scoring Logic
Current implementation uses **keyword matching** (MVP scope):
```python
# Match ratio: intersection of tokens
match_ratio = len(answer_tokens & ideal_tokens) / len(ideal_tokens)
length_bonus = min(0.1, len(answer_text) / 2000)
score = min(100, max(5, (match_ratio + length_bonus) * 100))
```

Feedback ranges:
- ≥80: ✅ Tốt!
- 55-79: 👍 Khá tốt!
- 35-54: 📝 Cần cải thiện
- <35: ❌ Cần cải thiện nhiều

### Custom Agents

This project has **9 custom agents** in `.github/agents/`:
- **invera-dev** ⭐ — Main development agent, reads `agent.md` for context
  - **Workflow:** Load `agent.md` → Load `tasks.md` → Update the current task block → Plan & execute → Review & fix → Update task status/result → Update `agent.md`
  - **MANDATORY:** Must update `tasks.md` at task start and task end
- **debug** — Bug investigation and root cause analysis
- **blueprint-mode** — Architecture and system design
- **critical-thinking** — Code review and security checks
- **devops-expert** — Infrastructure and deployment
- **prd** — Product requirements writing
- **adr-generator** — Architecture decision records
- **skill-creator-ultra** — Create reusable AI skills

**Important:** When `invera-dev` or other custom agents make changes:
1. Read `agent.md` for full project context
2. Read `tasks.md` for the current request ledger
3. **Add/update the relevant task block in `tasks.md` before starting implementation**
4. Make changes following conventions above
5. **Update the same task block in `tasks.md` after implementation**
6. Update `agent.md` with high-level memory only, using format:
   ```
   [YYYY-MM-DD] <scope> | <description> | files changed
   ```

`tasks.md` is for request-level execution tracking. `agent.md` is for coarse project memory only.

### Git & Branching
- **Current branch:** `Bang` (working branch)
- **Default branch:** `main`
- **Repository:** `Lilkremxxxx/Invera-AI_Interview_Practice_Platform`

---

## Current Status & MVP Scope

### ✅ Phases 0-3 Complete (see `.github/task.md` for full list)
- Backend foundation (schemas, JWT, storage service)
- Sessions API (create, list, answer, complete)
- Keyword-matching scorer
- Real JWT authentication (FE ↔ BE)
- Full session flow (NewSession → Interview → Results → History)
- Dashboard with real data

### ⏳ Phases 4-7 In Progress
- Code quality improvements
- Test coverage
- Documentation
- UX polish

### ❌ Out of MVP Scope (Backlog)
- AI question generation (using static seed data now)
- AI-powered scoring/feedback (using keyword matching now)
- Voice/video input (text-only for MVP)
- CV upload and parsing
- Payment integration
- Advanced analytics and charts
- Social login
- Mentor matching
- Email verification
- PDF export

---

## Mock Data (To Be Replaced)

Some UI currently uses placeholder/mock data:
- `@/lib/mock-data.ts` — Roles, levels, question categories (will come from API)
- Dashboard stats — Real data now (from sessions API)
- Interview questions — Real data from seed (seeded in DB migration)
- Testimonials & pricing on landing page — Hardcoded (product/marketing content)

---

## Important Notes

### Environment Setup
- **FE dev requires:** `VITE_API_BASE_URL=http://localhost:9000/api`
- **FE production uses:** `VITE_API_BASE_URL=/api`
- **BE requires:** PostgreSQL connection vars + JWT config in `BE/.env`:
  ```
  PG_HOST=100.82.138.69
  PG_PORT=5432
  PG_DBNAME=<db_name>
  PG_USER=<user>
  PG_PASSWORD=<password>
  SECRET_KEY=<generated_key>
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=10080
  ```

### Common Pitfalls
- ❌ Don't use `sudo npm` — causes permission issues
- ❌ Don't use relative imports in FE — use `@/` paths
- ❌ Don't bypass LanguageContext — all text must be translatable
- ❌ Don't install new UI libraries — use Shadcn/ui components
- ⚠️ Dark mode only works when user is authenticated (by design)
- ⚠️ JWT tokens stored in localStorage (not httpOnly cookies) — acceptable for MVP

### Performance Considerations
- Frontend built with Vite (fast HMR)
- Backend uses async/await throughout
- Database pool keeps 5-20 connections ready
- React Query caches API responses
- Images and assets optimized during build

---

## Quick Reference

### Start Development
```bash
# Terminal 1 — Backend
cd ~/EXE101/PRJ/BE
source ~/miniconda3/etc/profile.d/conda.sh
conda activate EXE101
uvicorn app.main:app --reload --host 127.0.0.1 --port 9000

# Terminal 2 — Frontend
cd ~/EXE101/PRJ/FE
npm run dev   # http://localhost:8080

# Terminal 3 — Tests (optional)
cd ~/EXE101/PRJ/FE
npm run test:watch
```

### Common Tasks
```bash
# Add new Shadcn component
cd FE
npx shadcn-ui@latest add <component-name>

# Add translation key
# Edit: FE/src/contexts/LanguageContext.tsx
# Add to both 'vi' and 'en' objects

# View task progress
cat ~/EXE101/PRJ/.github/task.md

# Check custom agents
ls ~/EXE101/PRJ/.github/agents/

# Read full project context
cat ~/EXE101/PRJ/agent.md
```

---

## Testing Conventions

### Backend Testing

**Test Framework:** pytest (configured but minimal test coverage currently)

```bash
cd BE
python -m pytest                          # Run all tests
python -m pytest tests/test_scoring.py -v  # Run specific file with verbose output
python -m pytest -k "test_tokenize"        # Run tests matching pattern
python -m pytest --cov=app                 # With coverage report
```

**Test Structure:**
```
BE/tests/
├── conftest.py              # Shared fixtures (database, test client)
└── test_scoring.py          # Unit tests for scoring service
```

**Writing Backend Tests:**
- Use pytest fixtures for database setup/teardown
- Mock external dependencies (API calls, file I/O)
- Test scoring logic thoroughly (edge cases, empty inputs, special characters)
- Example pattern:
  ```python
  def test_score_answer_empty_returns_zero():
      score, feedback = score_answer("", "ideal answer")
      assert score == 0
      assert "chưa cung cấp" in feedback
  ```

**API Testing (TODO):**
- Use FastAPI `TestClient` from `starlette.testclient`
- Create test database fixture with clean state per test
- Test authentication flows (register, login, protected endpoints)
- Example:
  ```python
  from fastapi.testclient import TestClient
  from app.main import app
  
  client = TestClient(app)
  
  def test_login_success():
      response = client.post("/api/auth/login", data={
          "username": "test@example.com",
          "password": "password123"
      })
      assert response.status_code == 200
      assert "access_token" in response.json()
  ```

### Frontend Testing

**Test Framework:** Vitest + React Testing Library

```bash
cd FE
npm test                           # Run all tests once
npm run test:watch                 # Watch mode (re-run on changes)
npx vitest run src/test/auth.test.tsx  # Run specific file
npx vitest --ui                    # UI mode for debugging
```

**Test Structure:**
```
FE/src/test/
├── setup.ts          # Global test configuration
├── example.test.ts   # Example unit tests
└── auth.test.tsx     # Auth component tests
```

**Writing Frontend Tests:**
- Mock contexts (AuthContext, LanguageContext) using `vi.mock()`
- Create wrapper with QueryClientProvider for components using React Query
- Test user interactions (form inputs, button clicks, validation)
- Test rendering (correct elements present, correct text displayed)
- Example pattern:
  ```tsx
  import { render, screen, fireEvent } from '@testing-library/react'
  import { vi } from 'vitest'
  
  vi.mock('@/contexts/AuthContext', () => ({
    useAuthContext: () => ({
      user: null,
      login: vi.fn(),
      logout: vi.fn()
    })
  }))
  
  test('login form submits with valid data', () => {
    render(<Login />)
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    // Assert expected behavior
  })
  ```

**Test Coverage Goals (Post-MVP):**
- Critical paths: auth flow, session creation, answer submission
- Shared components: buttons, forms, modals
- Utility functions: api.ts client, formatting helpers
- **Not required for MVP:** UI-only components without logic

---

## Database Migration Workflow

### Current Setup
- **No migration tool** (Alembic not configured)
- Migrations are **raw SQL files** in `BE/migrations/`
- Applied **manually** via `psql` or database client

### Migration Files
```
BE/migrations/
├── 001_create_sessions_questions_answers.sql  # Initial schema + seed data
└── 002_add_admin_and_reset_token.sql         # Add admin flag + password reset
```

### Applying Migrations

**New Database Setup:**
```bash
# 1. Ensure users table exists (from initial app setup)
# 2. Apply migrations in order
cd ~/EXE101/PRJ/BE/migrations

# Connect to PostgreSQL
psql -h 100.82.138.69 -p 5432 -U <username> -d <dbname>

# Apply each migration file
\i 001_create_sessions_questions_answers.sql
\i 002_add_admin_and_reset_token.sql

# Verify tables created
\dt

# Check question seed data
SELECT COUNT(*) FROM questions;  -- Should return 45+ questions

# Exit psql
\q
```

**Via Command Line:**
```bash
# Single command per migration
psql -h 100.82.138.69 -p 5432 -U <user> -d <db> -f migrations/001_create_sessions_questions_answers.sql

# Or all at once
cat migrations/*.sql | psql -h 100.82.138.69 -p 5432 -U <user> -d <db>
```

### Creating New Migrations

**Naming Convention:** `00X_description.sql` (numeric prefix for ordering)

**Template:**
```sql
-- Migration: <Description>
-- Author: <Name>
-- Date: YYYY-MM-DD

-- Create/alter tables
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_new_table_field ON new_table(field);

-- Seed data (if needed)
INSERT INTO new_table (field) VALUES ('value') ON CONFLICT DO NOTHING;

-- Rollback instructions (commented)
-- DROP TABLE IF EXISTS new_table;
```

**Best Practices:**
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency (safe to re-run)
- Always include rollback instructions in comments
- Test on local database before production
- Add `ON CONFLICT DO NOTHING` for seed data to avoid duplicates
- Use transactions for multi-step changes:
  ```sql
  BEGIN;
  -- Your changes here
  COMMIT;
  -- Or ROLLBACK; if something fails
  ```

### Schema Changes Workflow

1. **Create migration file:** `BE/migrations/00X_add_feature.sql`
2. **Test locally:** Apply to dev database and verify
3. **Update Pydantic schemas:** `BE/app/schemas/*.py` to match new columns
4. **Update API endpoints:** Add/modify endpoints using new fields
5. **Update frontend:** Add UI for new fields if needed
6. **Document in `agent.md`:** Log runtime, endpoint, and history changes in the main change log

### Future: Alembic Migration Tool (Recommended)

**Why Alembic?**
- Auto-generates migrations from SQLAlchemy models
- Version control for database schema
- Easy rollback (upgrade/downgrade commands)
- Track which migrations applied

**Setup (TODO):**
```bash
cd BE
pip install alembic
alembic init alembic
# Configure alembic.ini with database URL
# Create models in app/models/
# Generate migration: alembic revision --autogenerate -m "description"
# Apply: alembic upgrade head
```

---

## Deployment

### Current Deployment Stack

**Production Environment (current live state):**
- **Domain:** `https://invera.pp.ua` and `https://www.invera.pp.ua`
- **Public ingress:** Cloudflare Tunnel (`cloudflared.service`, user-level systemd)
- **Public origin:** FastAPI on `127.0.0.1:9000`
- **Public API base:** `https://invera.pp.ua/api`
- **Frontend:** built to `FE/dist`, then served by FastAPI in production
- **Static mirror:** `invera-frontend.service` also syncs `FE/dist` to `/var/www/invera.pp.ua/html`
- **Runtime env:** Conda env `EXE101`
- **Database:** PostgreSQL configured from `BE/.env`
- **Note:** older Caddy and root-level systemd examples are deprecated for this machine state

### Deployment Architecture

```
Internet
   ↓
Cloudflare Tunnel
   ↓
FastAPI on 127.0.0.1:9000
   ├─→ /api/*   → REST endpoints
   ├─→ /media/* → uploaded files
   └─→ /*       → React SPA from FE/dist
```

### One-Command Operations

Run from `~/EXE101/PRJ`:

```bash
./scripts/inveractl bootstrap
./scripts/inveractl install
./scripts/inveractl up
./scripts/inveractl reload
./scripts/inveractl status
./scripts/inveractl logs
./scripts/inveractl smoke
```

`inveractl` and the rendered user services activate conda env `EXE101` automatically before backend commands run.

### Deployment Steps

#### Standard Deploy / Refresh

```bash
cd ~/EXE101/PRJ
git pull
./scripts/inveractl bootstrap
./scripts/inveractl reload
./scripts/inveractl smoke
```

#### Manual User-Systemd Commands

```bash
systemctl --user daemon-reload
systemctl --user restart invera-frontend.service
systemctl --user restart invera-backend.service
systemctl --user restart cloudflared.service
systemctl --user status invera.target invera-frontend.service invera-backend.service cloudflared.service --no-pager
```

### Environment Variables

**Backend source of truth:** `BE/.env`

```bash
# Backend: BE/.env
PG_HOST=100.82.138.69
PG_PORT=5432
PG_DBNAME=<production_db>
PG_USER=<db_user>
PG_PASSWORD=<secure_password>
SECRET_KEY=<generate_with: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days
BACKEND_HOST=127.0.0.1
BACKEND_PORT=9000
API_PREFIX=/api
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,https://invera.pp.ua,https://www.invera.pp.ua

# Frontend dev: FE/.env.development
VITE_API_BASE_URL=http://localhost:9000/api

# Frontend prod: FE/.env.production
VITE_API_BASE_URL=/api
```

**Security Notes:**
- NEVER commit `.env` files to git
- Use different `SECRET_KEY` for production vs development
- Use strong database passwords
- Consider using secrets management (AWS Secrets Manager, HashiCorp Vault) for production

### User-Level Services

Rendered service files live in:

```text
~/.config/systemd/user/invera.target
~/.config/systemd/user/invera-backend.service
~/.config/systemd/user/invera-frontend.service
~/.config/systemd/user/cloudflared.service
```

Use:

```bash
systemctl --user enable invera.target
systemctl --user start invera.target
systemctl --user restart invera-backend.service
systemctl --user status invera-backend.service --no-pager
```

### Monitoring & Logs

```bash
# Backend logs
journalctl --user -u invera-backend.service -f

# Tunnel logs
journalctl --user -u cloudflared.service -f

# Frontend publish logs
journalctl --user -u invera-frontend.service -f
```

### Rollback Strategy

**If deployment fails:**

1. **Backend rollback:**
   ```bash
   git checkout <known-good-commit>
   ./scripts/inveractl bootstrap
   ./scripts/inveractl reload
   ```

2. **Frontend rollback:**
   ```bash
   git checkout <known-good-commit>
   ./scripts/inveractl reload
   ```

3. **Database rollback:**
   - Run rollback SQL from migration comments
   - Restore from backup if major schema change

**Always backup database before major deployments:**
```bash
pg_dump -h 100.82.138.69 -U <user> -d <db> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### CI/CD (Future Enhancement)

**GitHub Actions workflow (`.github/workflows/deploy.yml`):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/EXE101/PRJ
            git pull origin main
            ./scripts/inveractl bootstrap
            ./scripts/inveractl reload

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd FE && npm install && npm run build
      - name: Deploy to server
        # SCP dist/ to server
```

---

## Performance Optimization

### Frontend Performance Patterns

#### 1. React Performance Optimization

**Component Memoization:**
```tsx
// Wrap expensive components to prevent unnecessary re-renders
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />
})

// Use with custom comparison for complex props
const UserCard = React.memo(
  ({ user }) => <div>{user.name}</div>,
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
)
```

**useMemo for Expensive Calculations:**
```tsx
const Dashboard = ({ sessions }) => {
  // Cache computed value until sessions changes
  const stats = useMemo(() => {
    return sessions.reduce((acc, session) => {
      // Complex computation here
      return computeStats(acc, session)
    }, initialStats)
  }, [sessions])
  
  return <StatsDisplay stats={stats} />
}
```

**useCallback for Stable Function References:**
```tsx
const InterviewRoom = () => {
  const [answers, setAnswers] = useState([])
  
  // Cache function reference to prevent child re-renders
  const handleSubmit = useCallback((answer) => {
    setAnswers(prev => [...prev, answer])
  }, []) // Empty deps = function never changes
  
  return <AnswerForm onSubmit={handleSubmit} />
}
```

**When NOT to optimize:**
- Don't use `React.memo` everywhere (adds overhead)
- Skip `useMemo` for cheap calculations
- Profile first with React DevTools before optimizing

#### 2. Code Splitting & Lazy Loading

**Route-based code splitting:**
```tsx
// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'))
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/interview/:id" element={<InterviewRoom />} />
      </Routes>
    </Suspense>
  )
}
```

**Component-level lazy loading:**
```tsx
// Heavy chart component loaded only when needed
const AdvancedAnalytics = lazy(() => import('./components/AdvancedAnalytics'))

<Tabs>
  <Tab label="Overview">...</Tab>
  <Tab label="Analytics">
    <Suspense fallback={<Skeleton />}>
      <AdvancedAnalytics />
    </Suspense>
  </Tab>
</Tabs>
```

#### 3. React Query Optimization

**Stale-while-revalidate pattern:**
```tsx
const { data: sessions } = useQuery({
  queryKey: ['sessions'],
  queryFn: sessionsApi.list,
  staleTime: 5 * 60 * 1000,      // 5 minutes
  cacheTime: 10 * 60 * 1000,     // 10 minutes
  refetchOnWindowFocus: false,   // Don't refetch on tab switch
})
```

**Prefetching for faster navigation:**
```tsx
const queryClient = useQueryClient()

// Prefetch session details on hover
const handleSessionHover = (sessionId) => {
  queryClient.prefetchQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.get(sessionId)
  })
}

<SessionCard onMouseEnter={() => handleSessionHover(session.id)} />
```

**Optimistic updates:**
```tsx
const updateSessionMutation = useMutation({
  mutationFn: sessionsApi.update,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['session', newData.id])
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['session', newData.id])
    
    // Optimistically update UI
    queryClient.setQueryData(['session', newData.id], newData)
    
    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['session', newData.id], context.previous)
  }
})
```

#### 4. Image & Asset Optimization

**Already implemented in build:**
- Vite automatically optimizes images during build
- SVG icons via `lucide-react` (tree-shakeable)
- Tailwind CSS purges unused styles

**Best practices:**
- Use WebP format for images (fallback to PNG/JPG)
- Add `loading="lazy"` for images below fold
- Define explicit width/height to prevent CLS
  ```tsx
  <img 
    src="/hero.webp" 
    alt="Hero" 
    width={1200} 
    height={600}
    loading="lazy"
  />
  ```

#### 5. Bundle Size Optimization

**Check bundle size:**
```bash
cd FE
npm run build
# View dist/ folder sizes
du -sh dist/*

# Analyze bundle (add to package.json)
npm install --save-dev rollup-plugin-visualizer
```

**Tree-shaking:**
- Import specific components: `import { Button } from '@/components/ui/button'`
- Avoid barrel exports with heavy dependencies
- Use `date-fns` specific functions: `import { format } from 'date-fns'`

### Backend Performance Patterns

#### 1. Database Query Optimization

**Use indexes effectively:**
```sql
-- Index frequently queried columns
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_answers_session_id ON answers(session_id);

-- Composite index for common query patterns
CREATE INDEX idx_sessions_user_status ON sessions(user_id, status);
```

**Optimize queries with EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT s.*, COUNT(a.id) as answer_count
FROM sessions s
LEFT JOIN answers a ON a.session_id = s.id
WHERE s.user_id = 'user-uuid'
GROUP BY s.id;

-- Look for:
-- - Sequential scans (bad) → add index
-- - Index scans (good)
-- - Execution time
```

**Avoid N+1 queries:**
```python
# Bad: N+1 queries (1 for sessions + N for each session's answers)
sessions = await db.fetch("SELECT * FROM sessions WHERE user_id = $1", user_id)
for session in sessions:
    answers = await db.fetch("SELECT * FROM answers WHERE session_id = $1", session['id'])

# Good: Single query with JOIN
query = """
    SELECT s.*, json_agg(a.*) as answers
    FROM sessions s
    LEFT JOIN answers a ON a.session_id = s.id
    WHERE s.user_id = $1
    GROUP BY s.id
"""
result = await db.fetch(query, user_id)
```

**Connection pooling (already configured):**
- AsyncPG pool: min=5, max=20 connections
- Adjust based on load: `DB_POOL_MIN` and `DB_POOL_MAX` env vars

#### 2. Async Best Practices

**Proper use of async/await:**
```python
# Bad: Sequential (slow)
user = await get_user(user_id)
sessions = await get_sessions(user_id)
stats = await get_stats(user_id)

# Good: Parallel with asyncio.gather
import asyncio
user, sessions, stats = await asyncio.gather(
    get_user(user_id),
    get_sessions(user_id),
    get_stats(user_id)
)
```

**Background tasks for slow operations:**
```python
from fastapi import BackgroundTasks

async def send_email(user_email: str, content: str):
    # Slow email operation
    await email_service.send(user_email, content)

@app.post("/sessions/{id}/complete")
async def complete_session(
    session_id: str,
    background_tasks: BackgroundTasks
):
    # Return response immediately
    result = await mark_session_complete(session_id)
    
    # Send email in background
    background_tasks.add_task(send_email, user.email, "Session completed!")
    
    return result
```

#### 3. Caching Strategies

**Redis caching (future enhancement):**
```python
import redis.asyncio as redis

# Cache frequently accessed data
async def get_questions(role: str, level: str):
    cache_key = f"questions:{role}:{level}"
    
    # Try cache first
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from DB
    questions = await db.fetch(
        "SELECT * FROM questions WHERE role = $1 AND level = $2",
        role, level
    )
    
    # Cache for 1 hour
    await redis_client.setex(cache_key, 3600, json.dumps(questions))
    
    return questions
```

**In-memory caching for static data:**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_scoring_rules():
    # Expensive computation, result cached
    return load_scoring_rules()
```

#### 4. API Response Optimization

**Pagination for large datasets:**
```python
@router.get("/sessions")  # Public path: /api/sessions
async def list_sessions(
    user_id: str,
    page: int = 1,
    per_page: int = 20
):
    offset = (page - 1) * per_page
    
    sessions = await db.fetch(
        "SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        user_id, per_page, offset
    )
    
    total = await db.fetchval("SELECT COUNT(*) FROM sessions WHERE user_id = $1", user_id)
    
    return {
        "data": sessions,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": (total + per_page - 1) // per_page
    }
```

**Field selection (GraphQL-like):**
```python
@app.get("/sessions/{id}")
async def get_session(
    session_id: str,
    fields: str = "id,role,level,status"  # Query param: ?fields=id,role,level
):
    selected_fields = fields.split(',')
    query = f"SELECT {','.join(selected_fields)} FROM sessions WHERE id = $1"
    return await db.fetchrow(query, session_id)
```

#### 5. Load Testing & Monitoring

**Load testing with Locust:**
```python
# locustfile.py
from locust import HttpUser, task, between

class InveraUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login once
        response = self.client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "password"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def view_sessions(self):
        self.client.get(
            "/api/sessions",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def create_session(self):
        self.client.post(
            "/api/sessions",
            json={"role": "frontend", "level": "junior"},
            headers={"Authorization": f"Bearer {self.token}"}
        )

# Run: locust -f locustfile.py --host http://localhost:9000/api
```

**Performance monitoring:**
```python
from fastapi import Request
import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log slow requests
    if process_time > 1.0:
        logger.warning(f"Slow request: {request.url.path} took {process_time:.2f}s")
    
    return response
```

### General Performance Checklist

**Frontend:**
- ✅ Use React.memo for expensive components
- ✅ Lazy load routes and heavy components
- ✅ Enable React Query caching (staleTime, cacheTime)
- ✅ Optimize images (WebP, lazy loading, dimensions)
- ✅ Code splitting with dynamic imports
- ⏳ Monitor bundle size (< 500KB gzipped ideal)
- ⏳ Lighthouse score > 90 for all metrics

**Backend:**
- ✅ Database indexes on foreign keys and WHERE clauses
- ✅ AsyncPG connection pooling (5-20)
- ✅ Async endpoints with proper await
- ⏳ Redis caching for hot data
- ⏳ Background tasks for slow operations
- ⏳ API response time < 200ms for p95
- ⏳ Load testing before production

**Database:**
- ✅ Indexes on frequently queried columns
- ⏳ Query optimization with EXPLAIN ANALYZE
- ⏳ Connection pooling tuned for load
- ⏳ Regular VACUUM and ANALYZE
- ⏳ Monitor slow query log

---

## Additional Resources

- **API Documentation:** `BE/API_DOCS.md` (detailed endpoint specs)
- **Task Tracking:** `.github/task.md` (MVP checklist with completion status + progress log)
- **Task Validation:** `.github/validate-task-tracking.sh` (script to check task.md consistency)
- **Project Context:** `agent.md` (primary runtime/context/history file)
- **Quick Reference:** `~/EXE101/QUICK_REFERENCE.md` (agent cheat sheet)
- **Setup Guide:** `FE/README.md` (frontend setup instructions)

---

## Validation & Quality Checks

### Task Tracking Validation

Run this script to verify task.md is properly maintained:

```bash
cd ~/EXE101/PRJ
./.github/validate-task-tracking.sh
```

**What it checks:**
- ✅ Task completion statistics (total, completed, pending, %)
- ✅ Recent activity in progress log
- ✅ Template section exists
- ✅ Phase status consistency
- ✅ Duplicate task number detection
- ✅ `agent.md` change history freshness
- ⚠️ Warnings for incomplete "DONE" phases

**Example output:**
```
Total tasks:     60
Completed:       42
Pending:         18
Completion:      70%

✓ Progress log section exists
✓ Task template section exists
✓ All checks passed!
```

**Integration with agents:**
- `invera-dev` should update task.md before & after implementation
- Run validation script after major changes to ensure consistency
- Use in pre-commit hooks or CI/CD for automated checks
