# Invera Agent Context

> Read this file first in every new coding session.
> Secondary operational task ledger: `tasks.md`.
> Legacy compatibility file: `CLAUDE.md` now points here.

## 1. Project Identity

- Product: **Invera**
- Domain: `https://invera.pp.ua`
- Category: AI interview practice platform for Vietnamese students and early-career candidates
- Report source: `EXE101/EXE101_IB1902_GROUP5_FINAL_REPORT.pdf`
- Core value: role-specific practice, rubric-based feedback, structured improvement

### Report-derived target users

- Final-year university students
- Fresh graduates
- Users preparing for Intern / Fresher / Entry-level interviews
- Vietnam-first, cost-sensitive audience

### Report-derived pricing

- Free: trial / activation layer
- Basic: VND 99,000/month
- Pro: VND 199,000/month
- Premium: VND 299,000/month

## 2. Current Shipped Scope

### Implemented in code

- Email/password auth with JWT
- Email verification by 6-digit code for newly registered local accounts
- OAuth entrypoints for Google and GitHub
- Forgot/reset password flow
- Session flow: create, answer, complete, history, detail
- Persistent plan state with `free_trial` default for non-admin users
- Backend-enforced free-trial session quota: exactly 1 lifetime session for non-admin trial users
- VNPay-backed upgrade/order endpoints for `Basic` and `Pro`
- DeepSeek-backed rubric scoring with local fallback
- Admin endpoints for stats, users, questions
- Admin question bank with create/edit/delete, major-aware filtering, custom tags, and AI-generated draft questions
- Invite-only admin signup with dedicated `/admin/login`, `/admin/signup`, and primary-admin access management
- Legacy meetings upload/list/detail/delete endpoints
- React SPA with landing, auth, dashboard, sessions, interview room, profile, settings, admin dashboard
- Structured FE feedback renderer for LLM output in interview and session-detail screens
- FE tests via `npm test`
- BE scoring tests via `python3 -m pytest`

### Planned in report, not shipped yet

- Real AI question generation
- Real AI rubric scoring and advanced feedback
- Premium billing tier and real successful VNPay checkout on the live server
- PDF export
- Cohort / institutional reporting
- Mentor-assisted premium workflows
- Advanced progress analytics

## 3. Tech Stack

### Backend

- FastAPI
- AsyncPG
- PostgreSQL
- `python-jose`
- `passlib[argon2]`
- Local file storage in `uploads/`
- Runtime config from `BE/.env`

### Frontend

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- Shadcn/ui
- TanStack Query
- React Router v6
- React Hook Form + Zod

## 4. Runtime Topology

### Live topology as of 2026-03-23

- Public traffic goes through **Cloudflare Tunnel**
- Tunnel forwards `invera.pp.ua` and `www.invera.pp.ua` to `127.0.0.1:9000`
- The same tunnel also forwards `openclaw.invera.pp.ua` to `127.0.0.1:18789`
- The backend service on `127.0.0.1:9000` serves:
  - public API under `/api`
  - built frontend SPA from `FE/dist`
- The frontend publish service only rebuilds the SPA bundle in `FE/dist`
- Local nginx still exists on the machine, but it was **not root-updated in this turn**

### Limitation

- Root access was unavailable, so `/etc/nginx` and `/etc/systemd/system` were not edited
- The stack runs as **user-level systemd services** with `Linger=yes`
- Public domain recovery currently depends on:
  - `invera-backend.service`
  - `invera-frontend.service`
  - `cloudflared.service`

### Ports

- `127.0.0.1:9000` → Invera public origin
- `127.0.0.1:18789` → OpenClaw gateway/dashboard origin
- `127.0.0.1:18791` → OpenClaw browser control
- `127.0.0.1:18792` → OpenClaw auxiliary local service
- `localhost:8080` → FE dev server
- `localhost:8000` → occupied by another app (`FLUX.1 Image Generation API`)

## 5. One-Command Operation

```bash
./scripts/inveractl up
```

### Other commands

```bash
./scripts/inveractl bootstrap
./scripts/inveractl install
./scripts/inveractl reload
./scripts/inveractl down
./scripts/inveractl status
./scripts/inveractl logs
./scripts/inveractl smoke
```

- Default runtime env: `CONDA_ENV_NAME=EXE101`

### Local development

```bash
# Backend
source ~/miniconda3/etc/profile.d/conda.sh
conda activate EXE101
cd BE
uvicorn app.main:app --reload --host 127.0.0.1 --port 9000

# Frontend
cd FE
npm run dev
```

## 6. Environment Contract

### Backend source of truth

- File: `BE/.env`
- Required groups:
  - DB: `PG_HOST`, `PG_PORT`, `PG_DBNAME`, `PG_USER`, `PG_PASSWORD`
  - Auth: `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
  - URLs: `FRONTEND_URL`, `API_URL`
  - Runtime: `BACKEND_HOST`, `BACKEND_PORT`, `API_PREFIX`, `CORS_ALLOWED_ORIGINS`
- OAuth: `GOOGLE_*`, `GITHUB_*`
  - Email verification: `EMAIL_DELIVERY_MODE`, `VERIFICATION_CODE_TTL_MINUTES`, `VERIFICATION_RESEND_COOLDOWN_SECONDS`, `SMTP_*`
  - Billing: `VNPAY_PAYMENT_URL`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, `VNPAY_LOCALE`, `FRONTEND_UPGRADE_URL`

### Frontend env behavior

- `FE/.env.development` → `VITE_API_BASE_URL=http://localhost:9000/api`
- `FE/.env.production` → `VITE_API_BASE_URL=/api`
- Root `.env` is legacy and should not be treated as backend runtime config anymore

## 7. Frontend Routes

### Public

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/oauth/callback`
- `/admin/login`
- `/admin/signup`

### Protected

- `/app`
- `/app/new`
- `/app/sessions`
- `/app/sessions/:id`
- `/app/interview/:id`
- `/app/profile`
- `/app/settings`
- `/app/upgrade`

### Admin

- `/admin`
- `/admin/access`

## 8. Backend Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/admin/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification-code`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/oauth/google`
- `GET /api/auth/oauth/google/callback`
- `GET /api/auth/oauth/github`
- `GET /api/auth/oauth/github/callback`

### Sessions

- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/sessions/{session_id}/answers`
- `PUT /api/sessions/{session_id}/complete`
- `GET /api/sessions/questions/list`

### Billing

- `GET /api/billing/orders`
- `POST /api/billing/vnpay/checkout`
- `GET /api/billing/vnpay/return`
- `GET /api/billing/vnpay/ipn`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/admin-users`
- `GET /api/admin/invites`
- `POST /api/admin/invites`
- `DELETE /api/admin/invites/{invite_id}`
- `DELETE /api/admin/admin-users/{user_id}`
- `PUT /api/admin/users/{user_id}/toggle-admin`
- `GET /api/admin/questions`
- `POST /api/admin/questions`
- `PUT /api/admin/questions/{question_id}`
- `POST /api/admin/questions/generate`
- `DELETE /api/admin/questions/{question_id}`

### Meetings

- `GET /api/meetings/`
- `GET /api/meetings/{meeting_id}`
- `POST /api/meetings/upload`
- `DELETE /api/meetings/{meeting_id}`

### Runtime helpers

- `GET /healthz`
- `GET /openapi.json`
- `GET /api/openapi.json`
- `GET /media/*`

## 9. Key Files

- `agent.md` → primary persistent context

## 10. Recent High-Level Changes

- 2026-03-23 — The admin question bank was expanded from a Technology-only browser into a managed bank that now supports Technology, Finance, and Business majors, seeded role-specific questions for the two new majors, custom tag metadata, major filtering, edit/create flows, and DeepSeek-powered draft question generation for admins.
- 2026-03-23 — The admin AI question generator now accepts an optional free-form admin prompt in addition to structured major/role/level/difficulty/category input, and it can return an existing matching bank entry instead of generating a duplicate draft.
- `tasks.md` → canonical per-request task ledger
- `.github/task.md` → legacy compatibility/archive pointer only
- `scripts/inveractl` → one-command operator entrypoint
- `scripts/conda_exec.sh` → activate `EXE101` before backend/runtime commands
- `scripts/publish_frontend.sh` → build the production SPA bundle into `FE/dist`
- `deploy/systemd/user/*.tmpl` → user-level service templates
- `deploy/cloudflared/config.yml.tmpl` → tunnel template
- `BE/app/main.py` → FastAPI entrypoint + SPA serving
- `BE/app/core/config.py` → runtime settings loader
- `BE/app/services/deepseek_client.py` → DeepSeek OpenAI-compatible client for rubric scoring
- `BE/app/services/email.py` → SMTP/log email verification delivery
- `BE/app/services/scoring.py` → rubric-based answer evaluation with DeepSeek primary path + local fallback
- `BE/docs/AI_SCORING_RUBRIC.md` → human-readable scoring contract distilled from the provided rubric files
- `FE/src/lib/api.ts` → FE API base + auth wrapper

## 10. Known Mismatches And Risks

- No root access was available during this turn
- nginx was not reconfigured for `/api` proxying or SPA fallback
- Public traffic is fixed through Cloudflare Tunnel → backend, not nginx reverse proxy
- Local nginx placeholder on port `80` still exists on the host, but it is not part of the live public path
- `Caddyfile` is a deprecated reference file only, not the active ingress config
- Old Tailscale `serve/funnel` exposure for OpenClaw was reset; any `tail76895c.ts.net` dashboard/chat URL is now stale
- Frontend production bundle still emits a large chunk warning
- Meetings is a legacy subsystem and not aligned with the report’s main MVP story
- Real email delivery depends on SMTP configuration in `BE/.env`; if SMTP is disabled or missing, the code falls back to `EMAIL_DELIVERY_MODE=log`
- Current resend cooldown is 60 seconds
- OAuth client config alone is not enough for outbound verification mail; the live sender now uses Gmail SMTP credentials from `BE/.env`
- Admin accounts are now intended to use local email/password auth; primary admin invite management lives under `/admin/access`
- Gmail API is a viable alternative, but it would require a separate sender OAuth/refresh-token integration and is not implemented in the current codebase
- The current recommended mail path for production remains SMTP with Gmail App Password because it matches the existing backend implementation directly
- Current live runtime is switched to SMTP and successfully delivers verification emails from `lilkremxxxtemp@gmail.com`
- VNPay sandbox is now configured in `BE/.env`; checkout creation returns a sandbox payment URL, and the merchant-side IPN endpoint to register upstream is `https://invera.pp.ua/api/billing/vnpay/ipn`
- VNPay return callbacks no longer crash on failed transactions; the backend now redirects cleanly back to `/app/upgrade?payment=...&ref=...&plan=...`
- Verification email HTML has been flattened for safer Gmail dark-mode rendering: no dark hero gradient, no glow-heavy code badge, and explicit light color-scheme hints are now in the template
- Frontend language fallback now defaults to English for first-time visitors; the landing pricing section follows the active client language instead of hardcoded Vietnamese copy
- Profile file uploads are now real for avatar/resume, but text preferences like target role and career goal are still client-side localStorage rather than backend-persisted profile fields
- Interview answer scoring is no longer keyword-only; live runtime is configured for DeepSeek `deepseek-chat` (switched down from `deepseek-reasoner` for lower latency), but scoring is still synchronous and the rubric prompt remains heavy enough that users can still notice response time
- The frontend currently parses the formatted feedback text into HTML cards/lists. This is much better than raw plain text, but it still assumes the current feedback text contract; a future backend JSON response would be more robust

## 11. Active Follow-Up Work

- Decide whether to keep backend-served SPA or switch back to nginx reverse proxy once root access is available
- Add endpoint/API tests for auth, sessions, admin, and meetings
- Add E2E happy-path validation
- Decide whether to keep synchronous `deepseek-reasoner` grading inline or introduce a lower-latency model/background workflow later
- Review and shrink frontend production bundle
- Decide whether to keep `EMAIL_DELIVERY_MODE=log` in dev and switch deployed env to `smtp` with Gmail App Password

## 12. Change History

```text
[2026-03-06] init | Tạo CLAUDE.md context file + invera-dev agent | CLAUDE.md, .github/agents/invera-dev.agent.md
[2026-03-16] fix+ux | Cập nhật task tracking và cải thiện SessionDetail/Profile/Settings | .github/task.md, BE/app/api/endpoints/sessions.py, FE/src/pages/Profile.tsx, FE/src/pages/SessionDetail.tsx, FE/src/pages/Settings.tsx
[2026-03-23] auth-email-verify | Thêm verify email bằng mã 6 số cho account local mới, chặn login trước verify, thêm verify/resend endpoints, màn hình FE `/verify-email`, grandfather user local cũ thành verified | BE/app/api/endpoints/auth.py, BE/app/services/email.py, BE/app/schemas/user.py, BE/app/core/config.py, BE/migrations/003_add_email_verification.sql, FE/src/lib/api.ts, FE/src/pages/Signup.tsx, FE/src/pages/VerifyEmail.tsx, FE/src/App.tsx, BE/API_DOCS.md, BE/.env.example, .github/task.md
[2026-03-18] agent-workflow | Chuẩn hoá task tracking cho custom agents | .github/task.md, .github/agents/invera-dev.agent.md, .github/agents/debug.agent.md, .github/agents/blueprint-mode.agent.md, .github/validate-task-tracking.sh, .github/copilot-instructions.md
[2026-03-23] deploy-audit | Domain public trả Cloudflare 1033; local nginx chỉ phục vụ placeholder; FE chạy ad-hoc ở 8080; port 8000 bị app khác chiếm | investigation only
[2026-03-23] deploy+context | Chuyển backend sang 9000, đưa API dưới /api, backend phục vụ FE build, thêm user-level systemd + cloudflared + inveractl, publish FE ra /var/www, tạo agent.md làm nguồn context chính | BE/app/main.py, BE/app/core/config.py, BE/app/core/security.py, BE/app/db/session.py, BE/app/api/endpoints/*.py, FE/src/lib/api.ts, FE/.env.*, scripts/*, deploy/*
[2026-03-23] conda-runtime | Chuyển backend/user services sang conda env EXE101 và đồng bộ tài liệu runtime/deploy với topology đang chạy thật | scripts/conda_exec.sh, scripts/bootstrap_backend.sh, scripts/install_user_services.sh, deploy/systemd/user/invera-backend.service.tmpl, .github/copilot-instructions.md, .github/task.md, Caddyfile, agent.md
[2026-03-23] operator-polish | Thêm pytest vào backend bootstrap requirements và sửa inveractl smoke để không fail giả do broken pipe; smoke giờ verify cả public HTML và 401 ở /api/auth/me | BE/requirements.txt, scripts/inveractl, agent.md, .github/task.md
[2026-03-23] reload-fix | Sửa `inveractl reload` dùng `systemctl restart` cho FE oneshot service để mỗi lần reload đều build/publish lại frontend thật sự | scripts/inveractl, agent.md, .github/task.md
[2026-03-23] deploy-self-contained | Sửa deployment flow để public site bám đúng codebase `/home/nhatbang/EXE101/PRJ`: Cloudflare Tunnel vào thẳng FastAPI, FastAPI phục vụ `FE/dist`, và frontend publish không còn phụ thuộc `/var/www` hay nginx placeholder | scripts/publish_frontend.sh, deploy/systemd/user/invera-frontend.service.tmpl, scripts/inveractl, agent.md, tasks.md
[2026-03-23] host-runtime-cleanup | Dọn listener dev `:8080`, reset Tailscale serve cũ, và đưa OpenClaw public access sang `openclaw.invera.pp.ua` qua Cloudflare Tunnel; URL Tailscale cũ không còn hợp lệ | .config/invera/cloudflared.yml, deploy/cloudflared/config.yml.tmpl, tasks.md, agent.md
[2026-03-23] verify-email-runtime | Xác nhận live deployment vẫn đang ở `EMAIL_DELIVERY_MODE=log` nên mã verify chỉ đi vào backend logs, tăng cooldown resend lên 60 giây, và đổi nút resend sang accent/green khi hết thời gian chờ | BE/.env, BE/app/core/config.py, BE/app/api/endpoints/auth.py, BE/.env.example, BE/API_DOCS.md, FE/src/pages/VerifyEmail.tsx, tasks.md, agent.md
[2026-03-23] smtp-prereq-check | Xác nhận không cần Google Cloud Console thêm cho luồng SMTP verify mail; việc gửi Gmail thật hiện chỉ bị chặn bởi thiếu `SMTP_USERNAME` + Gmail App Password trong `BE/.env` | tasks.md, agent.md
[2026-03-23] gmail-api-alt | Ghi nhận Gmail API là phương án thay thế cho SMTP nhưng sẽ cần backend integration mới với `gmail.send` + refresh token; chưa được implement | tasks.md, agent.md
[2026-03-23] smtp-handoff | Chốt hướng triển khai mail verify bằng SMTP và ghi rõ handoff rằng bước tiếp theo là điền sender Gmail + App Password vào `BE/.env` rồi reload để test inbox thật | tasks.md, agent.md
[2026-03-23] smtp-auth-check | Chuyển live env sang SMTP và xác nhận backend đã chạm được Gmail SMTP, nhưng credential hiện tại bị Google từ chối với lỗi `535 5.7.8 Username and Password not accepted` | BE/.env, tasks.md, agent.md
[2026-03-23] smtp-live-delivery | Cập nhật App Password sender trong `BE/.env`, reload live stack, xác nhận SMTP login thành công, và verify end-to-end rằng mail `Ma xac thuc tai khoan Invera` đã tới inbox Gmail thật qua public register flow | BE/.env, tasks.md, agent.md
[2026-03-23] admin-invite-flow | Bổ sung `/admin/login`, `/admin/signup`, bảng `admin_invites`, các API invite/list/revoke/remove-admin, và kích hoạt admin tự động sau verify-code cho email được mời; `nhatbang6688@gmail.com` là primary admin bảo vệ | BE/app/api/endpoints/auth.py, BE/app/api/endpoints/admin.py, BE/app/schemas/admin.py, BE/app/schemas/user.py, BE/migrations/005_add_admin_invites.sql, BE/app/main.py, BE/API_DOCS.md, FE/src/App.tsx, FE/src/lib/api.ts, FE/src/contexts/AuthContext.tsx, FE/src/pages/admin/AdminLogin.tsx, FE/src/pages/admin/AdminSignup.tsx, FE/src/pages/admin/AdminAccess.tsx, FE/src/pages/admin/AdminLayout.tsx, FE/src/pages/admin/AdminDashboard.tsx, FE/src/pages/VerifyEmail.tsx, tasks.md, agent.md
[2026-03-23] task-ledger | Chuyển task memory sang root `tasks.md`, hạ `.github/task.md` xuống compatibility archive, và đồng bộ toàn bộ instruction/validation theo read order `agent.md` → `tasks.md` | tasks.md, .github/task.md, agent.md, CLAUDE.md, .github/validate-task-tracking.sh, .github/VALIDATION_README.md, .github/copilot-instructions.md, .github/agents/invera-dev.agent.md, .github/agents/debug.agent.md, .github/agents/blueprint-mode.agent.md, README_AGENTS.md, validate_setup.sh
[2026-03-23] branding-iv | Thay brand mark placeholder bằng logo IV mới trong app chrome/auth pages và đổi favicon/tab icon sang cùng visual branding | FE/src/components/layout/BrandIcon.tsx, FE/src/components/layout/AppSidebar.tsx, FE/src/components/layout/Navbar.tsx, FE/src/components/layout/Footer.tsx, FE/src/pages/Login.tsx, FE/src/pages/Signup.tsx, FE/src/pages/VerifyEmail.tsx, FE/public/favicon.svg, FE/public/site.webmanifest, FE/index.html, tasks.md
[2026-03-23] favicon-compat | Sửa browser tab còn hiện icon cũ bằng cách thay mới `favicon.ico` fallback và thêm cache-busting version query trong HTML public head | FE/public/favicon.ico, FE/index.html, tasks.md
[2026-03-23] auth-network-copy | Xác nhận public signup API vẫn hoạt động và sửa FE request wrapper để lỗi mạng/offline không còn hiện raw `Failed to fetch` trên auth flows | FE/src/lib/api.ts, tasks.md
[2026-03-23] verification-mailer | Bổ sung HTML email verification đẹp hơn, thêm resend cooldown 30 giây ở cả backend/frontend, và mở sẵn đường SMTP/Gmail thật qua `BE/.env` | BE/app/api/endpoints/auth.py, BE/app/services/email.py, BE/app/core/config.py, BE/app/schemas/user.py, BE/migrations/004_add_verification_resend_cooldown.sql, BE/app/main.py, BE/.env.example, FE/src/lib/api.ts, FE/src/pages/Signup.tsx, FE/src/pages/VerifyEmail.tsx, tasks.md
[2026-03-23] mail-darkmode-safe | Làm phẳng template verification email để Gmail dark mode không còn làm giao diện bị tối bệt và chói: bỏ dark gradient hero, bỏ gradient/glow code badge, thêm `color-scheme` light hints và solid background colors; public register flow vẫn gửi mail thành công sau reload | BE/app/services/email.py, tasks.md, agent.md
[2026-03-23] plan-billing-vnpay | Thêm plan state thật cho user, backfill mọi non-admin về `free_trial`, enforce quota 1 session ở backend, bổ sung `/app/upgrade` và các endpoint/order flow cho VNPay `Basic`/`Pro`; admin vẫn billing-exempt và live checkout hiện còn chờ cấu hình `VNPAY_*` | BE/app/services/plans.py, BE/app/services/vnpay.py, BE/app/api/endpoints/billing.py, BE/app/api/endpoints/auth.py, BE/app/api/endpoints/sessions.py, BE/app/schemas/{user,billing}.py, BE/migrations/006_add_plan_billing.sql, BE/app/core/config.py, BE/app/main.py, BE/.env.example, BE/API_DOCS.md, FE/src/lib/{api,plans}.ts, FE/src/contexts/AuthContext.tsx, FE/src/components/layout/AppSidebar.tsx, FE/src/pages/{Dashboard,NewSession,Upgrade}.tsx, FE/src/App.tsx, BE/tests/{test_plans,test_vnpay}.py, tasks.md, agent.md
[2026-03-23] landing-pricing-i18n | Đổi fallback ngôn ngữ mặc định sang English cho first-time visitor và làm `PricingSection` bám theo language state hiện tại thay vì hardcode toàn bộ copy tiếng Việt | FE/src/contexts/LanguageContext.tsx, FE/src/components/landing/PricingSection.tsx, tasks.md, agent.md
[2026-03-23] oauth-admin-ui+vnpay-sandbox | Nối social OAuth thật vào `/signup`, đổi OAuth callback lỗi từ raw JSON sang redirect FE-friendly, thêm notice nhẹ ở `/admin/login` cho admin account bị chặn OAuth, và cấu hình live `VNPAY_*` sandbox để checkout trả payment URL test thật | FE/src/pages/{Signup,Login,admin/AdminLogin}.tsx, BE/app/api/endpoints/auth.py, BE/.env, tasks.md, agent.md
[2026-03-23] profile-uploads+upgrade-i18n | Thêm upload avatar public, upload/download/delete resume PDF private (owner + admin), mở rộng `/auth/me` với metadata file, cập nhật sidebar dùng avatar thật, và làm `/app/upgrade` dùng chung pricing-content song ngữ theo language hiện tại thay vì hardcode tiếng Việt | BE/app/core/config.py, BE/app/main.py, BE/app/api/endpoints/{auth,admin,profile}.py, BE/app/services/{plans,profile_files}.py, BE/app/schemas/user.py, BE/migrations/007_add_profile_uploads.sql, FE/src/lib/{api,pricing-content}.ts, FE/src/components/{landing/PricingSection,layout/AppSidebar}.tsx, FE/src/pages/{Profile,Upgrade}.tsx, tasks.md, agent.md
[2026-03-23] vnpay-return-fix | Sửa callback `/api/billing/vnpay/return` để không còn nổ `500` do asyncpg/PostgreSQL type ambiguity trong `payment_orders` update query; callback sandbox giờ trả redirect `302` sạch về `/app/upgrade?payment=...&ref=...&plan=...` | BE/app/api/endpoints/billing.py, tasks.md, agent.md
[2026-03-23] deepseek-rubric-scoring | Thay answer scorer local bằng DeepSeek dùng rubric theo file mẫu, thêm DeepSeek runtime config/client, giữ keyword scorer làm fallback, xác nhận live API `submit answer` trả feedback rubric thật qua provider, rồi chuyển runtime từ `deepseek-reasoner` sang `deepseek-chat` để giảm độ trễ | BE/app/core/config.py, BE/.env, BE/.env.example, BE/app/services/{deepseek_client,scoring}.py, BE/app/api/endpoints/sessions.py, BE/tests/test_scoring.py, BE/docs/AI_SCORING_RUBRIC.md, tasks.md, agent.md
[2026-03-23] feedback-ui-formatting | Thay plain-text feedback trên FE bằng parser + renderer có cấu trúc: summary card, criterion cards với assessment badge, và các section riêng cho strengths/gaps/improvements/outline/follow-up ở cả interview room lẫn session detail | FE/src/lib/feedback.ts, FE/src/components/feedback/StructuredFeedback.tsx, FE/src/pages/{InterviewRoom,SessionDetail}.tsx, tasks.md, agent.md
[2026-03-23] admin-invite-email+charts | Luồng mời admin giờ gửi email thật với deep link `admin/signup?email=...` để người được mời bấm vào tạo tài khoản ngay, còn admin dashboard đã có chart trực quan hơn cho user growth, session status, và question distribution | BE/app/services/email.py, BE/app/api/endpoints/admin.py, FE/src/pages/admin/{AdminAccess,AdminSignup,AdminDashboard}.tsx, tasks.md, agent.md
[2026-03-23] admin-stats-cleanup+question-bank | Dọn 32 user test + 2 invite test khỏi DB live để admin stats phản ánh dữ liệu thực hơn (`11 users / 7 sessions / 2070 questions / 10 answers` sau cleanup), đồng thời thêm tab admin `Question Bank` để duyệt question text + ideal answer trực tiếp từ UI | live PostgreSQL data, FE/src/pages/admin/AdminQuestionBank.tsx, FE/src/pages/admin/AdminLayout.tsx, FE/src/App.tsx, FE/src/lib/api.ts, tasks.md, agent.md
[2026-03-23] admin-dashboard-hookfix | Sửa blank white screen ở `/admin` do `AdminDashboard` vi phạm hook order sau khi thêm chart; FE bundle live đã được rebuild/publish lại với `safeStats` fallback trước loading return | FE/src/pages/admin/AdminDashboard.tsx, tasks.md, agent.md
[2026-03-23] admin-existing-account-invites | Luồng mời admin giờ hỗ trợ cả email đã có tài khoản Invera và đã xác thực: backend tự cấp `is_admin`, gửi mail chứa link `/admin/login`, còn UI `/admin/access` + `/admin/login` đã phản ánh đúng case này; đường mail thật đã được smoke-test end-to-end rồi dọn lại quyền của tài khoản test | BE/app/api/endpoints/admin.py, BE/app/services/email.py, FE/src/pages/admin/{AdminAccess,AdminLogin}.tsx, tasks.md, agent.md
[2026-03-23] english-first-ui+mail | Chuyển FE live sang English-first mặc định cho first-time visitors và các route auth/app/admin chính; khi user chọn `vi` trong Settings thì copy mới chuyển sang tiếng Việt. Đồng thời email verification/admin-invite giờ mặc định tiếng Anh, block fallback link trong HTML dùng anchor `Access this link`, và API client cũng đã trả network/session errors theo ngôn ngữ hiện tại | FE/src/pages/{Dashboard,Signup,NewSession,Sessions,SessionDetail,InterviewRoom,Settings,ForgotPassword,ResetPassword,OAuthCallback}.tsx, FE/src/pages/admin/{AdminLogin,AdminSignup,AdminAccess,AdminLayout,AdminDashboard,AdminQuestionBank}.tsx, FE/src/lib/api.ts, BE/app/services/email.py, tasks.md, agent.md
[2026-03-23] landing-demo+company-pages | Thay section testimonial trên landing bằng demo dashboard tương tác với dữ liệu giả, đổi footer `Dashboard` thành `Dashboard demo` trỏ về `/#dashboard-demo`, và thêm các public company pages `/about`, `/contact`, `/privacy`, `/terms` để footer không còn link chết/404 | FE/src/components/landing/DashboardDemoSection.tsx, FE/src/components/layout/{Footer,CompanyPageShell}.tsx, FE/src/pages/{Index,About,Contact,Privacy,Terms}.tsx, FE/src/App.tsx, FE/src/contexts/LanguageContext.tsx, tasks.md, agent.md
[2026-03-23] admin-email-resend | Resent the existing admin-access email to `bangpoca@gmail.com`; the account was already active and admin in the live database, so the resend reused the `/admin/login` existing-login flow instead of creating a new invite | live SMTP runtime, tasks.md, agent.md
[2026-03-23] repo-commit-prep | Tightened `.gitignore` to broadly exclude markdown/env/output/upload clutter per operator request and fixed another QnA JSON serialization path before the next repository-wide commit/push to `main` | .gitignore, BE/app/api/endpoints/qna.py, tasks.md, agent.md
```

*** 1 số comment để chạy code
cd /home/nhatbang/EXE101/PRJ && ./scripts/inveractl reload
