# Invera Task Ledger

> Canonical task tracker for agent work in this repository.
> Read order for every new coding session:
> 1. `agent.md`
> 2. `tasks.md`

## Workflow Rules

- New user request: create a new task block immediately, write the plan first, then implement, then close the task.
- Continue existing work: update the current open task block instead of creating a duplicate task.
- `agent.md` only keeps high-level project memory. Detailed request-by-request tracking stays here.

## Task Entry Template

```md
## Task <TASK-ID>

- Created: <YYYY-MM-DD HH:MM UTC>
- User Request: <short summary>
- Status: <planned | in_progress | blocked | completed>
- Related Task: <optional previous/open task>

### Plan

- ...

### Files / Systems Expected To Change

- ...

### Work Log

- YYYY-MM-DD HH:MM UTC — ...

### Outcome / Result

- ...

### Remaining Follow-Ups

- ...

- Closed: <YYYY-MM-DD HH:MM UTC | n/a>
```

## Task Log

## Task TASK-20260323-33

- Created: 2026-03-23 18:27 UTC
- User Request: Add a user-facing QnA tab with AI answers grounded in the Invera rubric, support normal text and DOCX input, and add a ChatGPT-style “ask about selected text” action on AI answers.
- Status: in_progress
- Related Task: TASK-20260323-32

### Plan

- Add backend QnA storage and endpoints for a persistent user chat thread, structured AI answers, and DOCX ingestion.
- Build an Invera-specific QnA AI service that answers with rubric-aware structured sections instead of plain text.
- Add a new `/app/qna` route and sidebar tab, then build the chat UI with DOCX upload and rich assistant cards.
- Add selection-based follow-up UX so highlighted answer text can be turned into a quoted prompt from inside the chat view.
- Rebuild, reload, and verify the new QnA flow.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/requirements.txt`
- `BE/app/main.py`
- `BE/app/schemas/*.py`
- `BE/app/api/endpoints/*.py`
- `BE/app/services/*.py`
- `BE/migrations/*.sql`
- `FE/src/App.tsx`
- `FE/src/components/layout/AppSidebar.tsx`
- `FE/src/components/qna/*`
- `FE/src/lib/api.ts`
- `FE/src/contexts/LanguageContext.tsx`
- `FE/src/pages/Qna.tsx`

### Work Log

- 2026-03-23 18:27 UTC — Audited the current app and confirmed there is no existing user-side QnA route or backend chat storage yet; only the interview scorer and admin question generator currently call DeepSeek.
- 2026-03-23 18:30 UTC — Reused the existing structured-feedback and rubric context as the visual/prompt baseline for the new QnA feature so the answer style stays consistent with the rest of Invera instead of becoming a generic chat blob.

### Outcome / Result

- In progress.

### Remaining Follow-Ups

- Implement backend QnA schema/endpoints and DOCX extraction.
- Build frontend chat route/sidebar tab and inline selection prompt flow.
- Rebuild, reload, and verify.

- Closed: n/a

## Task TASK-20260323-32

- Created: 2026-03-23 18:00 UTC
- User Request: Add a free-form admin prompt box to AI question generation, use the prompt together with major/role/level/difficulty/category to guide generation, and prevent generating questions that already exist in the bank.
- Status: completed
- Related Task: TASK-20260323-31

### Plan

- Extend the admin question-generation request/response contracts with an optional free-form prompt and duplicate-detection metadata.
- Update the backend AI generation flow to use the admin prompt when present and to return existing matching questions instead of generating duplicates.
- Update the admin question-bank AI-generate dialog so admins can type a prompt like a chat instruction and see duplicate warnings when the bank already has a matching question.
- Rebuild, reload, and verify the prompt-driven generation and duplicate-protection flow against the live database.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/schemas/question.py`
- `BE/app/api/endpoints/admin.py`
- `FE/src/lib/api.ts`
- `FE/src/pages/admin/AdminQuestionBank.tsx`

### Work Log

- 2026-03-23 18:00 UTC — Confirmed from live PostgreSQL that the sample `CORS` topic already exists many times in the Technology bank; the current AI-generate flow also has no free-form prompt field and no duplicate-protection response path yet.
- 2026-03-23 18:05 UTC — Extended the admin question-generate request/response contracts with an optional `prompt` field plus duplicate metadata so the UI can distinguish a fresh AI draft from an existing question match.
- 2026-03-23 18:09 UTC — Updated the backend generator to feed the optional admin prompt into DeepSeek, pre-check prompt keywords against existing bank entries in the same major/role/level, and return an existing question instead of a new draft when a real text/category/tag match is found.
- 2026-03-23 18:14 UTC — Upgraded the admin AI-generate dialog with a free-form prompt textarea, optional prompt help text, and duplicate-warning UI that lets admins open the existing matching question directly in the editor instead of saving a redundant draft.
- 2026-03-23 18:18 UTC — Rebuilt the frontend, reloaded the live stack, and verified two facts from the live database: the CORS topic already exists in the Technology major overall, but the stricter prompt duplicate matcher no longer falsely blocks `technology/backend/intern` generation just because an old ideal answer mentions CORS.

### Outcome / Result

- Completed.
- The admin AI-generate modal now supports a free-form prompt box, so admins can type requests like “Generate a question about CORS in FastAPI” while still using the selected major, role, level, difficulty, category, and tags as structured generation context.
- Duplicate protection now has a proper response path: when a similar question already exists in the current bank context, the modal shows the existing question and offers a direct path to edit it instead of creating another duplicate draft.
- For your sample, the topic `CORS` already exists in the database overall, but not as an exact backend-intern FastAPI-text match; that means the system can still generate a new backend-intern FastAPI-focused draft instead of incorrectly blocking it.

### Remaining Follow-Ups

- A later improvement can add fuzzy similarity scoring or vector-style semantic duplicate checks if you want stronger de-duplication across near-duplicate phrasings, not just prompt-keyword and normalized-text matching.

- Closed: 2026-03-23 18:19 UTC

## Task TASK-20260323-31

- Created: 2026-03-23 17:23 UTC
- User Request: Expand the admin question bank with Finance and Business majors, major filtering, editable questions with colored tags, and an AI question+answer generator.
- Status: completed
- Related Task: TASK-20260323-26

### Plan

- Extend the question-bank data model and admin API so questions support `major`, editable tags, major filtering, and AI-generated draft question/ideal-answer payloads.
- Seed Finance and Business majors with role-specific interview questions and ideal answers, while preserving the existing Technology bank.
- Upgrade the admin question-bank UI with a major filter, colored badges for level/difficulty, edit/create dialogs, and an AI-generate flow that pre-fills the editor.
- Rebuild, reload, and verify the new admin question-bank flows on the live stack.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/migrations/008_add_question_bank_majors.sql`
- `BE/app/main.py`
- `BE/app/schemas/question.py`
- `BE/app/api/endpoints/admin.py`
- `FE/src/lib/api.ts`
- `FE/src/pages/admin/AdminQuestionBank.tsx`

### Work Log

- 2026-03-23 17:23 UTC — Audited the current admin question-bank implementation and confirmed it only supports Technology roles, role/level filtering, and delete; there is no major field, no edit flow, and no AI question-generation action yet.
- 2026-03-23 17:25 UTC — Added a new migration scaffold for `questions.major` and `questions.tags`, updated startup migrations to include it, and extended the question schemas with admin upsert/generate payload models for the new question-bank workflow.
- 2026-03-23 17:34 UTC — Finished the backend admin question-bank API: `GET /api/admin/questions` now supports `major`, new create/update endpoints accept `major` and normalized tags, and `POST /api/admin/questions/generate` uses DeepSeek to return a draft question + ideal answer for the selected major/role/level/difficulty.
- 2026-03-23 17:42 UTC — Replaced the admin question-bank page with a richer UI that adds major filtering, all-role coverage across Technology/Finance/Business, colored level/difficulty/major badges, custom tag chips, edit/create dialogs, and an AI-generate dialog that opens the generated draft in the editor before saving.
- 2026-03-23 17:50 UTC — Rebuilt the frontend, reloaded the live stack, and verified the new schema/data on PostgreSQL after migration `008`: `questions.major` and `questions.tags` exist, the bank now contains `8 finance` and `8 business` seeded entries, and sample seeded rows include normalized tag arrays.

### Outcome / Result

- Completed.
- The admin question bank now supports three majors: Technology, Finance, and Business, with seeded role-specific questions and ideal answers for the two new majors.
- Admins can filter by major, role, and level; create and edit questions with custom tags; and visually scan colored badges for major, level, and difficulty.
- The new AI draft flow can generate a question + ideal answer draft for a chosen major/role/level/difficulty combination, then hand that draft to the edit dialog before saving into the bank.

### Remaining Follow-Ups

- A future refinement can add browser-level E2E coverage for the new dialogs and admin question-bank actions once the local Playwright/browser runtime on the host is stable again.

- Closed: 2026-03-23 17:51 UTC

## Task TASK-20260323-30

- Created: 2026-03-23 17:04 UTC
- User Request: Replace the broken footer product/company links with a landing-page dashboard demo and real company pages instead of dead routes/404s.
- Status: completed
- Related Task: TASK-20260323-29

### Plan

- Audit the footer/product/company links and the current landing-page section order to identify the broken destinations.
- Replace the testimonial section with an interactive dashboard-demo section that lives on the landing page and wire the footer `Dashboard` link to that section instead of `/app`.
- Add real public company pages for About, Contact, Privacy, and Terms so footer links stop returning 404.
- Rebuild, reload, and verify the public routes and landing-page interactions.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/App.tsx`
- `FE/src/pages/Index.tsx`
- `FE/src/components/layout/Footer.tsx`
- `FE/src/components/landing/*`
- `FE/src/pages/{About,Contact,Privacy,Terms}.tsx`
- `FE/src/contexts/LanguageContext.tsx`

### Work Log

- 2026-03-23 17:04 UTC — Audited the current landing/footer flow and confirmed the footer `Dashboard` link still points straight to `/app`, while `About`, `Contact`, `Privacy`, and `Terms` point to routes that do not exist yet and therefore fall through to 404.
- 2026-03-23 17:05 UTC — Confirmed the landing page still renders `TestimonialsSection`, making it the right replacement slot for a richer product demo section without bloating the hero or pricing blocks.
- 2026-03-23 17:11 UTC — Replaced the testimonial slot with a new interactive `DashboardDemoSection` on the landing page and rewired the footer product link to `/#dashboard-demo` so visitors now see a product preview instead of being dropped into the live user dashboard.
- 2026-03-23 17:13 UTC — Added public company/demo pages for `/about`, `/contact`, `/privacy`, and `/terms`, all sharing the landing chrome so the footer company links no longer fall into client-side 404s.
- 2026-03-23 17:15 UTC — Rebuilt the frontend, reloaded the live stack, and verified public HTTP 200 responses for `/`, `/about`, `/contact`, `/privacy`, and `/terms`; browser automation could not be completed on this host because the Playwright browser runtime is currently unavailable.

### Outcome / Result

- Completed.
- The landing page now contains a dedicated interactive dashboard preview with mock data, role/range toggles, charts, and session summaries in place of the old testimonial block.
- The footer product `Dashboard` entry has been clarified to `Dashboard demo` and now scrolls visitors to the landing-page demo instead of routing them into the real authenticated app.
- The footer company links now resolve to real public pages for About, Contact, Privacy, and Terms instead of rendering a 404 page.

### Remaining Follow-Ups

- If you want stricter product polish later, the next step is adding richer media or screenshots to the company pages and a real browser-automation regression check once the Playwright browser runtime is fixed on the host.

- Closed: 2026-03-23 17:16 UTC

## Task TASK-20260323-29

- Created: 2026-03-23 16:41 UTC
- User Request: Make the frontend English-first by default, switch key UI to Vietnamese only when the user selects it in Settings, and convert outgoing emails to English with anchor-style access links.
- Status: completed
- Related Task: TASK-20260323-28

### Plan

- Audit the major FE routes/components that still hardcode Vietnamese and convert them to obey the current language state from `Settings`.
- Change verification/admin email templates to English-first copy and replace raw pasted URLs with an anchor-style “Access this link” fallback.
- Rebuild, reload, and verify the public bundle/runtime after the language cleanup.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/contexts/LanguageContext.tsx`
- `FE/src/pages/*.tsx`
- `FE/src/pages/admin/*.tsx`
- `BE/app/services/email.py`

### Work Log

- 2026-03-23 16:41 UTC — Audited the current FE and confirmed the landing page already defaults to English, but many authenticated pages and admin screens still hardcode Vietnamese strings instead of following the selected `language` from `Settings`.
- 2026-03-23 16:48 UTC — Converted major authenticated/auth/admin routes to English-first copy driven by the selected UI language, including Dashboard, New Session, Sessions, Session Detail, Interview Room, Settings, Reset Password, Forgot Password, OAuth callback, Admin Login, Admin Signup, Admin Access, Admin Dashboard, and Admin Question Bank.
- 2026-03-23 16:51 UTC — Switched verification/admin invite email templates to English-first copy and replaced the HTML fallback raw URL block with a single anchor-style `Access this link` action.
- 2026-03-23 16:56 UTC — Closed remaining user-visible English-first gaps in `Signup.tsx` and localized generic network/session errors in `FE/src/lib/api.ts` so English users no longer see stray Vietnamese toast/error copy from the API wrapper.
- 2026-03-23 16:58 UTC — Rebuilt the frontend, reloaded the live stack, and smoke-tested a real admin-invite email via live SMTP; the inbox received `Invera admin invitation` with English headline, no old Vietnamese headline, and the expected HTML `Access this link` fallback anchor.

### Outcome / Result

- Completed.
- The frontend now defaults to English for first-time users, and the patched authenticated/auth/admin surfaces switch to Vietnamese only when the user selects `vi` in Settings.
- Outgoing verification/admin emails are now English-first by default, and the HTML fallback link block uses a single `Access this link` anchor instead of pasting a raw URL into the card.
- Generic API-wrapper network/session errors are now language-aware, which removes one of the main remaining ways English UI could still surface Vietnamese copy.

### Remaining Follow-Ups

- A future cleanup pass can still audit lower-priority demo/mock content and non-runtime code comments for bilingual consistency, but the main live user/admin flows covered in this task are now English-first.

- Closed: 2026-03-23 16:59 UTC

## Task TASK-20260323-28

- Created: 2026-03-23 16:23 UTC
- User Request: Allow inviting emails that already have an account into the admin system, and verify the admin invite email delivery flow.
- Status: completed
- Related Task: TASK-20260323-25

### Plan

- Change the primary-admin invite logic so an existing verified account can still be invited into admin instead of being hard-blocked.
- Send a role-appropriate email for that case, ideally taking the invited existing account straight toward the correct admin login flow.
- Update admin UI text to reflect the broader invite behavior, then verify with a real invite email to an existing account inbox.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/api/endpoints/admin.py`
- `BE/app/services/email.py`
- `FE/src/pages/admin/AdminAccess.tsx`
- `FE/src/pages/admin/AdminLogin.tsx`

### Work Log

- 2026-03-23 16:23 UTC — Audited the current admin-invite flow and confirmed the backend explicitly rejects any email that already has a verified account, which is the source of the “Email này đã có tài khoản sẵn” toast shown in the admin UI.
- 2026-03-23 16:28 UTC — Reworked `POST /api/admin/invites` so a verified existing account is activated as admin immediately, receives an admin-login email, and only unverified existing accounts remain blocked.
- 2026-03-23 16:29 UTC — Updated `/admin/access` copy and `/admin/login` notice handling so invite links for existing accounts prefill the admin email and explain the correct local-password flow.
- 2026-03-23 16:31 UTC — Rebuilt the frontend, reloaded the live stack, and smoke-tested the new path by inviting `lilkremxxxtemp@gmail.com`; the API returned `status=activated` and the inbox received the admin email with the expected `/admin/login?...notice=admin-access-granted` link.
- 2026-03-23 16:32 UTC — Removed admin access from the temporary smoke-test account so production permissions were left unchanged after verification.

### Outcome / Result

- Completed.
- Primary admin can now invite a Gmail that already has a verified Invera account instead of being blocked by the old “email already exists” rule.
- Existing verified accounts are promoted to admin immediately and receive a login-oriented admin email; brand-new emails still receive the admin-signup link flow.
- The invite email delivery for the existing-account path was verified end-to-end against a real Gmail inbox.

### Remaining Follow-Ups

- None for this request.

- Closed: 2026-03-23 16:32 UTC

## Task TASK-20260323-27

- Created: 2026-03-23 15:57 UTC
- User Request: Fix the blank white screen when opening the admin area (`/admin`) after the recent admin dashboard changes.
- Status: in_progress
- Related Task: TASK-20260323-26

### Plan

- Inspect the recent admin dashboard changes for a frontend runtime error that can blank the entire admin route.
- Fix the crash, rebuild the frontend, and republish the live bundle.
- Verify the admin route loads again and update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/pages/admin/AdminDashboard.tsx`

### Work Log

- 2026-03-23 15:57 UTC — Audited the current `AdminDashboard` implementation and confirmed the new chart code violates React hook ordering by returning early on `loading` before later `useMemo` hooks run, which can crash `/admin` into a blank page on the next render.
- 2026-03-23 15:58 UTC — Fixed the hook-order bug by moving the dashboard’s derived chart state to a stable hook order and using a `safeStats` fallback before the loading return.
- 2026-03-23 15:58 UTC — Rebuilt the frontend successfully and reloaded the live stack; FE/BE user services both returned to healthy state with the new admin bundle published.

### Outcome / Result

- Completed.
- The blank white screen on `/admin` was caused by a frontend React hook-order violation inside `AdminDashboard`, not by login/auth routing.
- The admin route now serves a rebuilt bundle with the hook-order fix applied.

### Remaining Follow-Ups

- If the browser still shows a white screen, the next action is a hard refresh so it drops the old cached admin bundle.

- Closed: 2026-03-23 15:58 UTC

## Task TASK-20260323-26

- Created: 2026-03-23 15:46 UTC
- User Request: Reset admin-facing live stats to remove obvious test/demo database noise and add an admin sidebar tab for the question-and-answer bank.
- Status: in_progress
- Related Task: TASK-20260323-25

### Plan

- Audit the live DB counts and identify only clearly machine-generated/test records that can be removed safely without touching plausible real users.
- Clean those test/demo records from the live database so `total_users`, `sessions`, and `answers` better reflect real usage while leaving the seeded question bank intact.
- Add an admin route/sidebar item for a question-and-answer bank view backed by the existing admin questions API.
- Reload, verify the updated counts and admin UI, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/App.tsx`
- `FE/src/pages/admin/AdminLayout.tsx`
- `FE/src/pages/admin/*Question*`
- `FE/src/lib/api.ts`
- live PostgreSQL data

### Work Log

- 2026-03-23 15:46 UTC — Audited the live DB and confirmed admin stats are already sourced from real DB counts, but the database still contains many obvious smoke-test accounts (`codex.*`, `deepseek-*`, `verify60_*`, `lilkremxxxtemp+...`, `bangpoca_test_*`) that inflate user/session/answer totals.
- 2026-03-23 15:46 UTC — Confirmed the backend already exposes `GET /api/admin/questions` and `DELETE /api/admin/questions/{id}`, but the admin UI currently has no sidebar route/page for a question-and-answer bank.
- 2026-03-23 15:48 UTC — Deleted only clearly synthetic smoke-test records from live PostgreSQL: 32 generated users and 2 invite rows. Live totals moved from `43 users / 17 sessions / 2070 questions / 39 answers` to `11 users / 7 sessions / 2070 questions / 10 answers`.
- 2026-03-23 15:50 UTC — Added `AdminQuestionBank` plus admin sidebar/route wiring so admins can browse question text and ideal answers, filter by role/level, search by keyword, and delete questions directly from the bank view.
- 2026-03-23 15:51 UTC — Verified live data after cleanup: `/api/admin/stats` now returns the cleaned counts, and `/api/admin/questions?role=frontend&level=intern` returns rows with `ideal_answer`, confirming the new bank page has full Q&A data.
- 2026-03-23 15:51 UTC — Rebuilt the frontend successfully and reloaded the live stack so the admin sidebar now includes the new question-bank route in production.

### Outcome / Result

- Completed.
- Live admin-facing counts now reflect cleaned real data much better after removing obvious smoke-test artifacts from the database.
- The admin area now has a dedicated sidebar tab for the question-and-answer bank backed by the existing admin questions API.
- Admins can inspect both the question text and the stored ideal answer directly in the UI.

### Remaining Follow-Ups

- If you want a future safety layer, the next step is an explicit admin-only “clear demo/test data” action so these cleanup passes do not require direct DB access.
- The new bank page currently supports filter/search/delete. The next logical extension is full create/edit forms for question authoring and ideal-answer maintenance.

- Closed: 2026-03-23 15:51 UTC

## Task TASK-20260323-25

- Created: 2026-03-23 15:35 UTC
- User Request: Send a real email when inviting a new admin so the recipient can click through to create their admin account, and add more visual charts for the admin/chatbot metrics area.
- Status: in_progress
- Related Task: TASK-20260323-23

### Plan

- Add a dedicated admin-invite email template and delivery function, then trigger it from the primary-admin invite endpoint with a deep link to `/admin/signup`.
- Update the admin signup/access UI so the emailed invite link pre-fills the invited email and fits the new “click email to continue” flow.
- Replace the current admin metrics cards/progress bars with clearer charts so the admin metrics area is more visual.
- Rebuild, reload, smoke-test the invite flow and dashboard rendering, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/services/email.py`
- `BE/app/api/endpoints/admin.py`
- `BE/app/core/config.py`
- `BE/.env.example`
- `FE/src/pages/admin/AdminAccess.tsx`
- `FE/src/pages/admin/AdminSignup.tsx`
- `FE/src/pages/admin/AdminDashboard.tsx`
- `FE/src/lib/api.ts`

### Work Log

- 2026-03-23 15:35 UTC — Started the invite-email and admin-dashboard-visualization pass by auditing the current primary-admin invite endpoint, admin signup UI, email service, and admin dashboard metrics UI.
- 2026-03-23 15:35 UTC — Confirmed the invite flow currently only creates a pending `admin_invites` record with no outbound email, while the admin dashboard still renders mostly text/progress blocks instead of charts.
- 2026-03-23 15:38 UTC — Added a dedicated admin-invite email template/service and wired `POST /api/admin/invites` to send a real invite email containing a deep link to `/admin/signup?email=...`; the invite transaction now only reports success after email delivery succeeds.
- 2026-03-23 15:39 UTC — Updated the admin access page copy/toast to reflect real email delivery and changed the admin signup page so invite links pre-fill the invited Gmail and keep it read-only in the signup form.
- 2026-03-23 15:42 UTC — Reworked the admin dashboard metrics area from mostly static text/progress blocks into actual charts: recent-user area chart, session-status donut, and question-distribution bar/progress visuals.
- 2026-03-23 15:43 UTC — Verified backend syntax with `python -m py_compile`, rebuilt FE twice successfully, and reloaded the live FE/BE services so the public app serves the new invite-email flow and charted dashboard.
- 2026-03-23 15:41 UTC — Smoke-tested the live invite API as the primary admin: `POST /api/admin/invites` returned `200` for `lilkremxxxtemp+admininvite20260323@gmail.com`, and IMAP verification on the sender inbox confirmed the email arrived with subject `Loi moi tro thanh admin Invera` and a working deep link to `https://invera.pp.ua/admin/signup?email=...`.
- 2026-03-23 15:41 UTC — Re-ran the repo test command `python -m pytest -q` from project root and confirmed it still fails during collection with the pre-existing import-path issue `ModuleNotFoundError: No module named 'app'`; this is unrelated to the new invite-email/chart changes.

### Outcome / Result

- Completed.
- Primary-admin invites now send a real email immediately, and the email contains a direct signup link that opens the admin-registration screen with the invited Gmail pre-filled.
- The admin dashboard metrics area is now significantly more visual with real charts for user growth, session completion mix, and question distribution.
- The live stack was rebuilt/reloaded successfully and the invite-email flow was verified against a real Gmail inbox.

### Remaining Follow-Ups

- If you want a second pass later, the next improvement is adding invite-expiry tokens so the email link can be revoked/time-limited beyond the current pending-invite email gate.
- The backend test harness should be cleaned up separately so `pytest` can run from repo root again without needing custom import-path setup.

- Closed: 2026-03-23 15:43 UTC

## Task TASK-20260323-24

- Created: 2026-03-23 15:35 UTC
- User Request: Clarify what the local password is for the admin email `nhatbang6688@gmail.com`.
- Status: completed
- Related Task: TASK-20260323-23

### Plan

- Answer based on the current auth design and the explicit credentials previously supplied by the user in this project context.
- Clarify that the live database stores only password hashes, so plaintext cannot be read back from the system.
- Point out the next step if the remembered password does not work.

### Files / Systems Expected To Change

- `tasks.md`

### Work Log

- 2026-03-23 15:35 UTC — Logged the credential-clarification request and answered it using the previously user-specified demo-account credential context rather than attempting any unsafe password recovery.

### Outcome / Result

- Completed.
- Clarified that the system cannot reveal the current plaintext password from the database because passwords are stored as hashes.
- Clarified that the only plaintext password explicitly provided by the user in this workspace history for `nhatbang6688@gmail.com` was `Nhatbang1405@!`.
- Noted that if this credential no longer works, the local password must be reset rather than recovered.

### Remaining Follow-Ups

- If requested later, reset the local password for the admin account to a new known value and verify `/admin/login` succeeds with that credential.

- Closed: 2026-03-23 15:35 UTC

## Task TASK-20260323-23

- Created: 2026-03-23 15:32 UTC
- User Request: Explain why signing in with Google using an admin Gmail redirects to the admin login notice screen instead of entering directly.
- Status: completed
- Related Task: TASK-20260323-18

### Plan

- Inspect the current backend OAuth/admin-auth rules and the admin login UI notice path.
- Confirm whether the shown behavior is intentional or a regression.
- Answer clearly how admin access works now and what must change if direct Google admin login is desired.

### Files / Systems Expected To Change

- `tasks.md`

### Work Log

- 2026-03-23 15:32 UTC — Audited the backend OAuth redirect path and the admin login page notice handling for admin-marked accounts.
- 2026-03-23 15:32 UTC — Confirmed the current behavior is intentional: admin accounts are blocked from Google/GitHub OAuth and redirected to `/admin/login` with the `admin-local-only` notice.
- 2026-03-23 15:32 UTC — Prepared a direct explanation for the user describing the current login path and the required product/auth-flow change if Google admin login should be allowed.

### Outcome / Result

- Completed.
- The shown screen is expected under the current auth rules, not a bug.
- Admin accounts currently must sign in with the local admin email/password flow; Google OAuth is intentionally disabled for admin users.
- Allowing direct Google admin login would require changing the backend admin-auth policy, not just the UI.

### Remaining Follow-Ups

- If requested later, the next change would be to explicitly allow OAuth admin login for approved admin emails and redirect successful Google admin sign-ins straight into `/admin`.

- Closed: 2026-03-23 15:32 UTC

## Task TASK-20260323-22

- Created: 2026-03-23 15:47 UTC
- User Request: Switch the live DeepSeek model from the reasoning variant to the chat variant so answer evaluation responds faster.
- Status: completed
- Related Task: TASK-20260323-21

### Plan

- Confirm the current official DeepSeek non-thinking model name and keep the integration on a supported API contract.
- Change the live/runtime model configuration from `deepseek-reasoner` to `deepseek-chat`, tuning token budget if needed for faster rubric feedback.
- Reload the backend and verify both direct scorer output and an end-to-end answer submission still work correctly.
- Update project memory once the runtime switch is confirmed.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/.env`
- `BE/.env.example`
- `BE/app/core/config.py`

### Work Log

- 2026-03-23 15:47 UTC — Started the runtime switch from DeepSeek thinking mode to chat mode after confirming from the official DeepSeek API docs that `deepseek-chat` is the supported non-thinking API model.
- 2026-03-23 15:48 UTC — Confirmed the live env was still set to `DEEPSEEK_MODEL=deepseek-reasoner` with a high token budget tuned for the reasoning model.
- 2026-03-23 15:49 UTC — Updated backend defaults and `.env.example` so new environments default to `deepseek-chat` with a reduced scoring token budget (`DEEPSEEK_MAX_TOKENS=1800`) while keeping the existing timeout and temperature settings.
- 2026-03-23 15:49 UTC — Switched the live runtime in `BE/.env` from `deepseek-reasoner` to `deepseek-chat` and reduced the live max-token limit to match the lighter chat mode.
- 2026-03-23 15:51 UTC — Reloaded the live stack successfully and recompiled the touched backend modules to confirm the runtime config change introduced no syntax/regression issue.
- 2026-03-23 15:54 UTC — Verified direct scorer execution against `deepseek-chat`: the backend returned rubric-formatted feedback in about `40.11s`, which is materially faster than the previous `deepseek-reasoner` path on this host.
- 2026-03-23 15:55 UTC — Verified end-to-end API scoring with a fresh temporary account (`register -> verify -> create session -> submit answer`) and confirmed `/api/sessions/{id}/answers` still returns the structured rubric feedback block correctly while running on the chat model.

### Outcome / Result

- Completed.
- The live DeepSeek scoring runtime now uses `deepseek-chat` instead of `deepseek-reasoner`.
- Backend defaults and example envs were updated accordingly, and the live token budget was reduced so the chat model can respond faster while preserving the current rubric-feedback format.
- Real scoring verification passed both directly and through the live API answer-submission flow.

### Remaining Follow-Ups

- `deepseek-chat` is faster than the reasoning model, but the current rubric prompt is still large enough that live scoring remains noticeably synchronous. If you want another speed pass later, the next lever is prompt compression or a simpler scoring template for low-stakes questions.

- Closed: 2026-03-23 15:55 UTC

## Task TASK-20260323-21

- Created: 2026-03-23 15:33 UTC
- User Request: Reformat the LLM feedback output on the web so it renders as a polished structured HTML UI with emphasized sections instead of one long plain-text block.
- Status: completed
- Related Task: TASK-20260323-20

### Plan

- Audit the current FE components that render `answer.feedback` and identify the shared display patterns for interview-room and session-detail views.
- Add a feedback parser/renderer that maps the current rubric text format into styled sections, lists, badges, and emphasis states without changing the backend API contract.
- Update the relevant pages to use the new renderer, then rebuild and verify the rendered UI on the live app.
- Update project memory after verification.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/pages/InterviewRoom.tsx`
- `FE/src/pages/SessionDetail.tsx`
- `FE/src/components/*feedback*`
- `FE/src/lib/*feedback*`

### Work Log

- 2026-03-23 15:33 UTC — Started the FE pass for structured feedback rendering after confirming the current DeepSeek rubric output is still displayed as a single plain-text block in both interview-room and session-detail screens.
- 2026-03-23 15:35 UTC — Audited `InterviewRoom.tsx` and `SessionDetail.tsx` and confirmed both screens still render `answer.feedback` as a plain `<p>` string without any parsing or hierarchy.
- 2026-03-23 15:38 UTC — Added `FE/src/lib/feedback.ts` to parse the current LLM feedback contract into structured sections: summary, criteria, strengths, gaps, improvements, better outline, and follow-up questions, including per-criterion assessment extraction (`strong | mixed | weak`).
- 2026-03-23 15:41 UTC — Added reusable renderer `FE/src/components/feedback/StructuredFeedback.tsx` that transforms the parsed feedback into styled HTML cards, badges, lists, and callouts with stronger emphasis for summary, criterion status, missing items, and improvement sections.
- 2026-03-23 15:42 UTC — Replaced the old plain-text feedback blocks in both `InterviewRoom.tsx` and `SessionDetail.tsx` with the new shared structured renderer.
- 2026-03-23 15:43 UTC — Verified FE regression checks: `npm test` passed (`9 passed`) and `npm run build` completed successfully after the new parser/renderer landed.
- 2026-03-23 15:45 UTC — Reloaded the live stack so the public app now serves the structured feedback UI. Browser automation verification on this host remains blocked because Playwright’s required Chrome runtime is missing and `npx playwright install chrome` cannot complete without `sudo`.

### Outcome / Result

- Completed.
- LLM feedback is no longer rendered as a single unreadable paragraph. The frontend now parses the existing text contract and displays it as structured HTML with a highlighted summary, criterion cards with assessment badges, and dedicated sections for strengths, gaps, improvements, better answer outline, and follow-up questions.
- Both the live interview feedback panel and the historical session-detail view now use the same shared renderer, so the presentation stays consistent across the app without requiring any backend API change.

### Remaining Follow-Ups

- If you want another polish pass later, the next step is to have the backend return structured JSON feedback directly to the FE instead of parsing the formatted text. That would make the UI renderer even more robust and reduce parser assumptions.

- Closed: 2026-03-23 15:45 UTC

## Task TASK-20260323-20

- Created: 2026-03-23 14:49 UTC
- User Request: Integrate DeepSeek as the AI core for interview answer evaluation, using project-aligned prompting and rubric guidance from the provided rubric files.
- Status: completed
- Related Task: TASK-20260323-19

### Plan

- Audit the current answer-scoring flow and read the provided rubric documents to derive a stronger structured evaluation prompt.
- Add backend config and a DeepSeek client/service using the official compatible chat-completions API, with a safe local fallback if the provider call fails.
- Replace the current keyword-only scoring path with rubric-based model evaluation and return structured score/feedback aligned with the project’s interview goals.
- Configure the provided DeepSeek API key in the live backend env, reload the stack, and run targeted verification.
- Update project memory once the model-backed path is live.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/.env`
- `BE/.env.example`
- `BE/app/core/config.py`
- `BE/app/api/endpoints/sessions.py`
- `BE/app/services/scoring.py`
- `BE/app/services/*deepseek*`
- `BE/tests/*`
- `EXE101/Rubric & Privacy Base EXE.docx`
- `EXE101/rubric, criteria + Privacy.txt`

### Work Log

- 2026-03-23 14:49 UTC — Started implementation planning for replacing the current keyword-based scorer with a DeepSeek-backed rubric evaluator informed by the project’s rubric documents.
- 2026-03-23 14:54 UTC — Audited the current scoring path in `BE/app/api/endpoints/sessions.py` and confirmed answer submission still calls the local keyword matcher in `BE/app/services/scoring.py`; read the provided TXT and DOCX rubric files to extract the project’s desired feedback contract, question-type rubric variants, and level calibration.
- 2026-03-23 15:00 UTC — Added DeepSeek runtime config (`DEEPSEEK_*`) and a dedicated `deepseek_client.py` using the official OpenAI-compatible `chat/completions` API with model `deepseek-reasoner`; created `BE/docs/AI_SCORING_RUBRIC.md` to capture the scoring contract derived from the supplied rubric files.
- 2026-03-23 15:02 UTC — Replaced the scorer with an async rubric-driven pipeline that passes question text, ideal answer, role, level, category, and difficulty into DeepSeek, returns structured JSON-backed feedback, and falls back safely to the local keyword scorer if the provider fails.
- 2026-03-23 15:06 UTC — Updated session answer submission to await the new scorer with full session/question context, and refreshed unit tests so they cover both the local scorer path and the model-enabled orchestration path.
- 2026-03-23 15:09 UTC — Configured the provided DeepSeek API key in `BE/.env`, reloaded the live stack, and confirmed raw DeepSeek requests succeed against `https://api.deepseek.com/chat/completions`.
- 2026-03-23 15:16 UTC — Increased DeepSeek runtime defaults for `deepseek-reasoner` (`timeout=90s`, `max_tokens=4096`), omitted `temperature` for this model, and tightened the prompt to only the relevant question-type rubric after observing provider fallbacks caused by insufficient token budget / empty final content.
- 2026-03-23 15:21 UTC — Verified the scorer directly with a real DeepSeek call: the service returned a rubric-structured Vietnamese assessment with summary, criteria, strengths, gaps, improvements, better outline, and follow-up questions.
- 2026-03-23 15:25 UTC — Ran end-to-end API verification on the live backend (`register -> verify -> create session -> submit answer`) with a temporary account; `POST /api/sessions/{id}/answers` returned a DeepSeek-generated rubric feedback block on a real frontend-junior React question instead of the old keyword-only feedback template.
- 2026-03-23 15:26 UTC — Re-ran backend verification after the final prompt/runtime tuning: `python -m pytest -q` passed (`32 passed`), and the live stack reloaded successfully.

### Outcome / Result

- Completed.
- Invera now uses DeepSeek as the primary AI scoring core for interview answer evaluation via `deepseek-reasoner`, with the backend sending structured rubric context derived from the supplied rubric documents and formatting the model’s JSON result back into the existing `score + feedback` API contract.
- The shipped scorer now evaluates answers using role, level, question text, category, difficulty, and ideal answer, rather than plain keyword overlap alone. The old keyword scorer remains as an automatic fallback if the DeepSeek call fails.
- Live runtime has been configured with the provided DeepSeek API key in `BE/.env`, and both direct scorer execution and real API answer submission were verified successfully against the live backend.

### Remaining Follow-Ups

- `deepseek-reasoner` produces materially stronger feedback, but current latency is noticeably higher than the old local scorer. If you want a faster UX later, the next tuning step is to compare `deepseek-chat` versus `deepseek-reasoner`, or move heavy rubric grading to a background job while keeping a faster inline draft score.

- Closed: 2026-03-23 15:26 UTC

## Task TASK-20260323-19

- Created: 2026-03-23 14:47 UTC
- User Request: Verify whether the current codebase/runtime is already using DeepSeek as the AI core.
- Status: completed
- Related Task: TASK-20260323-18

### Plan

- Inspect backend services, config, and dependencies for any DeepSeek client, API key, model string, or outbound inference integration.
- Confirm what scoring/feedback path is currently used in production code.
- Answer clearly whether DeepSeek is active now and point to the exact files that prove it.

### Files / Systems Expected To Change

- `tasks.md`

### Work Log

- 2026-03-23 14:47 UTC — Started a direct code audit for any DeepSeek integration in the backend runtime, including config, dependencies, service modules, and scoring path.
- 2026-03-23 14:47 UTC — Searched the backend/frontend/config surface for `deepseek`, OpenAI-style client usage, model strings, or LLM API calls and found no active inference integration in the shipped code.
- 2026-03-23 14:48 UTC — Confirmed the live answer evaluation path is still the keyword-based scorer in `BE/app/services/scoring.py`, and the backend dependency list contains no DeepSeek/OpenAI SDK package.

### Outcome / Result

- Completed.
- The current codebase/runtime is **not** using DeepSeek as the AI core.
- Interview answer scoring is currently handled by the local keyword matcher in `BE/app/services/scoring.py`, and there is no DeepSeek client, API key wiring, or outbound model call in the shipped backend.

### Remaining Follow-Ups

- If you want DeepSeek to become the real AI core, the next step is to add backend config for the provider key/model and replace or augment the current keyword scorer with a provider-backed service.

- Closed: 2026-03-23 14:48 UTC

## Task TASK-20260323-18

- Created: 2026-03-23 14:43 UTC
- User Request: Fix the VNPay return callback so returning from the payment gateway no longer throws a backend 500 and instead redirects back to the app with the correct payment result.
- Status: completed
- Related Task: TASK-20260323-14

### Plan

- Reproduce the failing VNPay return callback with the provided URL and inspect backend logs to identify the exact crash point.
- Patch the backend billing return/update path so it handles failed/success responses without asyncpg type errors.
- Reload the live stack and replay the exact callback URL to confirm it now redirects cleanly to the frontend.
- Run targeted backend verification and then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/api/endpoints/billing.py`
- `BE/tests/test_vnpay.py`

### Work Log

- 2026-03-23 14:43 UTC — Reproduced the provided VNPay return URL against the live server and confirmed it currently fails with `500 Internal Server Error` instead of redirecting back to the upgrade page.
- 2026-03-23 14:43 UTC — Inspected `journalctl --user -u invera-backend.service` and traced the crash to `_mark_payment_result(...)` in `billing.py`: PostgreSQL raises `asyncpg.exceptions.AmbiguousParameterError` because the same `$1` status parameter is inferred as both `text` and `character varying` inside the update query.
- 2026-03-23 14:44 UTC — Patched the `payment_orders` update query to cast the status/reference parameters explicitly, eliminating the asyncpg/PostgreSQL type ambiguity without changing billing business logic.
- 2026-03-23 14:45 UTC — Recompiled `billing.py`, reloaded the live stack, and replayed the exact callback URL; it now returns `HTTP/2 302` with `Location: https://invera.pp.ua/app/upgrade?payment=failed&ref=INV2026032314415404BC8997&plan=basic` instead of crashing with `500`.
- 2026-03-23 14:46 UTC — Re-ran the existing VNPay unit tests with `python -m pytest tests/test_vnpay.py -q` (`3 passed`) to confirm the patch did not regress the signature utilities.

### Outcome / Result

- Completed.
- VNPay return callbacks no longer crash the backend on failed/success payment redirects. The provided sandbox return URL now resolves into a clean redirect back to the frontend upgrade page with `payment=failed` and the original order reference.

### Remaining Follow-Ups

- If you want a friendlier UX next, the frontend upgrade page can render a dedicated inline state for `payment=failed&ref=...` instead of relying mainly on toast/URL parameters.

- Closed: 2026-03-23 14:46 UTC

## Task TASK-20260323-17

- Created: 2026-03-23 13:58 UTC
- User Request: Add real avatar update and PDF resume upload to Profile, with owner/admin-only resume access, and make the upgrade/payment page fully obey the selected language from Settings.
- Status: completed
- Related Task: TASK-20260323-16

### Plan

- Add backend profile file metadata and authenticated avatar/resume endpoints, including private resume download for owner/admin.
- Extend the auth user snapshot so avatar/resume state is available immediately to the frontend.
- Replace the placeholder Profile upload UI with real avatar and PDF-resume flows.
- Remove hardcoded Vietnamese strings from the upgrade/payment page and reuse a shared bilingual plan-content source.
- Run targeted backend/frontend verification, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/core/config.py`
- `BE/app/main.py`
- `BE/app/api/endpoints/profile.py`
- `BE/app/api/endpoints/admin.py`
- `BE/app/api/endpoints/auth.py`
- `BE/app/services/plans.py`
- `BE/app/schemas/user.py`
- `BE/migrations/007_add_profile_uploads.sql`
- `FE/src/lib/api.ts`
- `FE/src/lib/plans.ts`
- `FE/src/lib/pricing-content.ts`
- `FE/src/components/landing/PricingSection.tsx`
- `FE/src/components/layout/AppSidebar.tsx`
- `FE/src/pages/Profile.tsx`
- `FE/src/pages/Upgrade.tsx`

### Work Log

- 2026-03-23 13:58 UTC — Audited current implementation and confirmed `Profile` still stores only local text preferences, has no backend upload APIs, exposes no avatar/resume fields via `/auth/me`, and `Upgrade.tsx` still hardcodes significant Vietnamese copy even when app language is English.
- 2026-03-23 14:03 UTC — Added backend profile-upload persistence: `users` now stores avatar/resume metadata via migration `007_add_profile_uploads.sql`, `private_uploads/` was introduced for private resume storage, `/api/profile/avatar|resume` routes were added, and `/api/auth/me` snapshots were extended with `avatar_url`, `resume_uploaded`, and `resume_filename`.
- 2026-03-23 14:08 UTC — Replaced the placeholder Profile UI with real avatar upload/remove and PDF resume upload/download/delete flows, including owner refresh of auth state so the sidebar updates immediately after mutations.
- 2026-03-23 14:10 UTC — Removed duplicated pricing-content definitions by centralizing plan copy in `FE/src/lib/pricing-content.ts`, updated landing pricing to consume the shared source, and rewrote `Upgrade.tsx` to drive headings, billing labels, buttons, alerts, toasts, and payment history labels from the active language state.
- 2026-03-23 14:14 UTC — Rebuilt and reloaded the live stack; backend migration `007_add_profile_uploads.sql` applied successfully and frontend publish finished cleanly.
- 2026-03-23 14:19 UTC — Ran live API smoke with a fresh verified non-admin account: avatar upload returned a public `/media/...` URL with `200 image/png`, resume upload returned `resume_uploaded=true`, `/api/auth/me` reflected the new file state, owner download and admin download of resume both returned `200 application/pdf`, and invalid non-PDF resume upload correctly returned `400 Resume chỉ hỗ trợ file PDF.`.
- 2026-03-23 14:21 UTC — Verified backend and frontend regressions with `python -m pytest -q` (`30 passed`) and `npm test` (`9 passed`); `npm run build` had already passed earlier in the task.

### Outcome / Result

- Completed.
- `Profile` now supports real avatar upload/remove and private PDF resume upload/download/delete, with backend metadata persisted on the user record and owner/admin-only resume access enforced through authenticated endpoints.
- `/api/auth/me` now exposes `avatar_url`, `resume_uploaded`, and `resume_filename`, so the frontend can refresh profile/sidebar state immediately after file mutations.
- The in-app upgrade/payment surface now follows the selected language consistently instead of mixing English with hardcoded Vietnamese plan/payment copy.

### Remaining Follow-Ups

- Add dedicated automated E2E coverage for profile uploads and upgrade-page language switching; API/runtime smoke is in place, but browser automation on this host still needs a Chrome-compatible Playwright setup if you want full UI-level regression checks from the terminal.

- Closed: 2026-03-23 14:21 UTC

## Task TASK-20260323-16

- Created: 2026-03-23 12:19 UTC
- User Request: Fix Google sign-in from the signup page, replace raw admin OAuth error JSON with a lightweight admin-role UI, and integrate the provided VNPay sandbox configuration into the live system.
- Status: completed
- Related Task: TASK-20260323-14

### Plan

- Audit the signup/auth callback/admin-login flow to confirm why Google signup is not clickable and why admin OAuth failures are surfacing as raw backend JSON.
- Wire the signup social buttons to the same OAuth redirect flow as login, then add a frontend-visible admin notice path for accounts that must use local admin sign-in.
- Configure the provided VNPay sandbox credentials and URLs in the backend runtime, reload the stack, and verify checkout creation now reaches VNPay instead of returning configuration errors.
- Run targeted frontend/backend verification and then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/pages/Signup.tsx`
- `FE/src/pages/Login.tsx`
- `FE/src/pages/admin/AdminLogin.tsx`
- `FE/src/pages/OAuthCallback.tsx`
- `FE/src/App.tsx`
- `BE/app/api/endpoints/auth.py`
- `BE/.env`

### Work Log

- 2026-03-23 12:19 UTC — Confirmed the signup page still renders Google/GitHub buttons without any click handler, and admin OAuth attempts currently die inside backend callback routes with raw `403` JSON because the callback never redirects back to a frontend error surface.
- 2026-03-23 12:21 UTC — Wired the signup social buttons to the same `authApi.oauthRedirect(...)` flow already used on the login page, so Google/GitHub on `/signup` now trigger the real OAuth redirect instead of acting as dead UI.
- 2026-03-23 12:22 UTC — Reworked backend OAuth callbacks to redirect frontend-side on failure instead of returning raw JSON directly in the browser; admin-restricted OAuth attempts now route to `/admin/login?notice=admin-local-only...`, while generic OAuth failures route back to `/login?oauth_error=...`.
- 2026-03-23 12:22 UTC — Updated the admin login screen to render a lightweight informational panel when an OAuth-blocked admin account is redirected there, explaining that admin accounts must continue through the admin sign-in link with local email/password credentials.
- 2026-03-23 12:23 UTC — Added the provided VNPay sandbox credentials and URLs into `BE/.env`, including explicit `VNPAY_RETURN_URL=https://invera.pp.ua/api/billing/vnpay/return` and `VNPAY_IPN_URL=https://invera.pp.ua/api/billing/vnpay/ipn`.
- 2026-03-23 12:24 UTC — Recompiled the touched backend modules, rebuilt the frontend successfully, and reloaded the live stack so the auth UX and billing config are active.
- 2026-03-23 12:25 UTC — Ran a real local sandbox flow with a fresh non-admin Gmail alias: register -> read verification code from DB -> verify -> local login -> `POST /api/billing/vnpay/checkout`; confirmed the API now returns a pending order plus a sandbox payment URL containing `vnp_TmnCode=V9DB5XA7`.
- 2026-03-23 12:26 UTC — Verified the Google OAuth start endpoint still returns the expected auth URL and confirmed a callback failure now responds with `302` to the frontend login page rather than raw JSON; also validated the admin-only redirect target URL format for blocked admin OAuth accounts.

### Outcome / Result

- Google/GitHub buttons on the signup page now use the real OAuth redirect flow instead of being non-clickable placeholder UI.
- OAuth callback failures no longer leave the browser on raw backend JSON; normal users are redirected back to `/login` with a readable error, and admin-restricted accounts are redirected to `/admin/login` with a lightweight notice explaining that admin access must continue through the admin role link and local credentials.
- VNPay sandbox is now configured in the live backend runtime, and checkout creation for a real non-admin trial account returns a valid sandbox payment URL and pending order instead of `503 VNPay chưa được cấu hình trên máy chủ.`.

### Remaining Follow-Ups

- To complete the merchant-side sandbox loop with VNPAY, the IPN URL to provide upstream is `https://invera.pp.ua/api/billing/vnpay/ipn`.
- A full browser-based Google admin-account redirect test would still require completing an actual Google consent flow with an admin email, but the backend/frontend redirect path is now in place.

- Closed: 2026-03-23 12:26 UTC

## Task TASK-20260323-15

- Created: 2026-03-23 12:14 UTC
- User Request: Make landing-page pricing follow the active user language, and default the landing experience to English when no language has been chosen yet.
- Status: completed
- Related Task: TASK-20260323-14

### Plan

- Audit the current language default and pricing-section implementation to confirm why mixed English/Vietnamese copy is appearing.
- Change the app language fallback so a fresh visitor with no saved preference starts in English.
- Rework the landing pricing section to use language-aware copy instead of hardcoded Vietnamese strings.
- Build the frontend to verify the landing page still compiles and renders with the updated language flow.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/contexts/LanguageContext.tsx`
- `FE/src/components/landing/PricingSection.tsx`

### Work Log

- 2026-03-23 12:14 UTC — Confirmed the mixed-language pricing issue comes from two separate problems: `LanguageContext` still defaults to `vi` for new visitors, and `PricingSection` hardcodes all header/toggle/plan copy in Vietnamese instead of reading from the active language state.
- 2026-03-23 12:15 UTC — Changed the language fallback in `LanguageContext` from `vi` to `en`, so a fresh visitor with no saved preference now lands on the English experience by default.
- 2026-03-23 12:16 UTC — Reworked `PricingSection` to use the active language for the section header, billing toggle, popularity badge, plan descriptions, target-user bullets, feature lists, CTA labels, and the yearly-note copy instead of relying on Vietnamese strings embedded in the component or mock data.
- 2026-03-23 12:17 UTC — Built the frontend successfully and reloaded the live stack so the public landing page now serves the language-aware pricing section.

### Outcome / Result

- Landing-page pricing now follows the active `useLanguage()` state instead of always showing Vietnamese copy, so users who previously selected English will see the full pricing section in English.
- Fresh visitors with no stored language preference now default to English because the app fallback changed from `vi` to `en`.
- The public frontend has been rebuilt and republished, so the fix is live on `https://invera.pp.ua`.

### Remaining Follow-Ups

- If you later want language preference to follow the account across devices instead of browser-local storage, the next step is to persist preferred language in the backend user profile and hydrate it during auth bootstrap.

- Closed: 2026-03-23 12:18 UTC

## Task TASK-20260323-14

- Created: 2026-03-23 11:44 UTC
- User Request: Implement real free-trial/default plans for all non-admin accounts, keep admins unlimited, and add an in-app upgrade tab with VNPay-based Basic/Pro checkout.
- Status: in_progress
- Related Task: TASK-20260323-12

### Plan

- Add persistent backend plan/payment data, backfill existing users so non-admins become `free_trial`, and enforce session entitlement rules for free-trial vs paid/admin users.
- Extend auth/session contracts so the frontend receives real plan state, quota usage, and upgrade eligibility instead of hardcoded labels.
- Add authenticated billing endpoints and a VNPay checkout flow for `Basic` and `Pro`, including order tracking and return/callback handling.
- Add a new `/app/upgrade` surface plus sidebar/dashboard/new-session updates so the app exposes real plan state and routes exhausted trial users toward upgrade.
- Run backend/frontend verification, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/core/config.py`
- `BE/app/main.py`
- `BE/app/api/endpoints/auth.py`
- `BE/app/api/endpoints/sessions.py`
- `BE/app/api/endpoints/*billing*`
- `BE/app/schemas/*.py`
- `BE/migrations/*`
- `FE/src/lib/api.ts`
- `FE/src/contexts/AuthContext.tsx`
- `FE/src/components/layout/AppSidebar.tsx`
- `FE/src/pages/{Dashboard,NewSession}*`
- `FE/src/pages/Upgrade.tsx`
- `FE/src/App.tsx`

### Work Log

- 2026-03-23 11:44 UTC — Audited current codebase and confirmed there is no real plan system yet: sidebar still hardcodes `Pro plan`, `/auth/me` does not expose plan/quota metadata, session creation is not entitlement-aware, and in-app billing/VNPay code does not exist.
- 2026-03-23 11:47 UTC — Added backend plan/billing foundations: persistent user plan fields, `payment_orders`, reusable entitlement helpers, VNPay signature utilities, billing schemas, and a new startup migration `006_add_plan_billing.sql`.
- 2026-03-23 11:51 UTC — Reworked auth/session contracts so `/auth/me` and registration responses now include real plan/quota metadata, and `POST /api/sessions` rejects exhausted `free_trial` users with an upgrade-focused `403`.
- 2026-03-23 11:55 UTC — Added billing endpoints for checkout/history/VNPay return+IPN, wired them into FastAPI, and documented/configured the new `VNPAY_*` runtime env surface plus frontend upgrade redirect URL.
- 2026-03-23 11:59 UTC — Updated FE auth/API layers, replaced the hardcoded sidebar `Pro plan` with backend-derived plan labels, added `/app/upgrade`, and routed exhausted trial users from dashboard/new-session toward upgrade instead of broken session creation.
- 2026-03-23 12:01 UTC — Verified backend modules compile, frontend production build passes, backend unit tests for scoring + entitlement + VNPay signature logic pass, and frontend Vitest still passes after the app-state changes.
- 2026-03-23 12:06 UTC — Reloaded the live stack, confirmed migration `006` applied, verified a fresh non-admin Gmail alias registers as `free_trial`, can create exactly one session, then gets blocked on the second with the expected upgrade message; also confirmed admin `/auth/me` is billing-exempt and current VNPay checkout returns `503` until credentials are configured.

### Outcome / Result

- All non-admin accounts now resolve to a real `free_trial` entitlement by default, while admin accounts remain unlimited and billing-exempt.
- `/api/auth/me` now exposes plan/billing/quota state, the sidebar no longer hardcodes `Pro plan`, and the app has a real `/app/upgrade` page for Basic/Pro checkout plus payment history.
- Trial exhaustion is enforced on the backend: the first session succeeds, the second session returns `403`, and FE now routes users toward upgrade instead of leaving a broken create-session path.
- VNPay integration code and endpoints are now present, but live checkout is still intentionally blocked with `503` until `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` are configured in `BE/.env`.

### Remaining Follow-Ups

- Add real VNPay production credentials to `BE/.env` and verify a full sandbox checkout/return/IPN round-trip.
- If you want Basic/Pro to enforce different quantitative quotas later, the next step is to add period-aware usage rules on top of the current free-trial-only enforcement baseline.

- Closed: 2026-03-23 12:06 UTC

## Task TASK-20260323-13

- Created: 2026-03-23 11:40 UTC
- User Request: Adjust the verification email template so Gmail dark mode no longer makes it look overly glowy or muddy.
- Status: completed
- Related Task: TASK-20260323-12

### Plan

- Audit the live verification email HTML and identify which visual choices are causing poor Gmail dark-mode rendering.
- Rework the template toward flatter, light-safe surfaces with explicit color-scheme hints and less aggressive gradients or glow-heavy accents.
- Verify the backend still sends successfully after the template change, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/services/email.py`

### Work Log

- 2026-03-23 11:40 UTC — Started a focused pass on the verification email after the user reported Gmail dark mode makes the current template look overly dark and glowy.
- 2026-03-23 11:41 UTC — Confirmed the current template relies on a dark gradient hero and a bright gradient code chip, which is exactly the combination Gmail mobile dark mode tends to re-tint badly.
- 2026-03-23 11:41 UTC — Reworked the HTML email toward flatter, lighter surfaces: removed the dark hero gradient, removed the gradient/glow-like code capsule, added explicit `color-scheme` meta hints, and switched the important blocks to solid background colors with explicit `bgcolor` attributes.
- 2026-03-23 11:42 UTC — Compiled `BE/app/services/email.py`, sent a direct SMTP test mail to a Gmail `+alias`, reloaded the live stack, and triggered a fresh public `POST /api/auth/register` flow to confirm the deployed backend now uses the updated template.
- 2026-03-23 11:42 UTC — Verified via IMAP that the public verification email `Ma xac thuc tai khoan Invera` reached the target Gmail inbox after the template change.

### Outcome / Result

- The verification email template is now substantially safer for Gmail dark mode: it uses flat light surfaces, explicit background colors, and no longer depends on a dark gradient header or glowing code panel that Gmail was mutating badly.
- Live backend has been reloaded, and both a direct SMTP send and a public register-triggered verification email were delivered successfully after the change.
- This does not guarantee pixel-identical rendering across every mail client, but it removes the specific high-contrast/glow-heavy choices that were causing the worst dark-mode result in Gmail mobile.

### Remaining Follow-Ups

- If you want a second pass later, the next refinement would be client-specific dark-mode targeting for Apple Mail / Outlook, but the current Gmail-mobile issue is addressed with a safer baseline template.

- Closed: 2026-03-23 11:42 UTC

## Task TASK-20260323-12

- Created: 2026-03-23 11:19 UTC
- User Request: Implement a real `/admin/login` flow plus invite-only admin signup where `nhatbang6688@gmail.com` can authorize new admin emails, and invited admins become active only after normal email-code verification.
- Status: completed
- Related Task: n/a

### Plan

- Add backend admin-invite persistence and APIs so admins can invite, view, revoke, and activate secondary admins through verified signup.
- Extend auth/register/verify behavior so invited emails can use a dedicated `/admin/signup` flow and automatically become admins only after successful verification.
- Add FE admin login/signup screens, update admin route guards, and add an admin-management tab under the admin layout.
- Verify the new admin auth/access flow with backend tests and frontend build validation, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/api/endpoints/auth.py`
- `BE/app/api/endpoints/admin.py`
- `BE/app/schemas/user.py`
- `BE/migrations/*`
- `FE/src/App.tsx`
- `FE/src/lib/api.ts`
- `FE/src/pages/admin/*`
- `FE/src/pages/*auth*`

### Work Log

- 2026-03-23 11:19 UTC — Confirmed `/admin/login` does not exist in FE routing, current admin guard redirects unauthenticated users to `/login`, and admin management currently stops at a simple `toggle-admin` endpoint.
- 2026-03-23 11:23 UTC — Added backend primary-admin config, new `admin_invites` migration/table, an invite-aware `POST /api/auth/admin/register`, and verification helpers that activate invited admins only after the same 6-digit email-code flow succeeds.
- 2026-03-23 11:27 UTC — Reworked admin APIs to expose admin-user and invite lists, create/revoke invites, and remove secondary admins while protecting `nhatbang6688@gmail.com` as the primary admin.
- 2026-03-23 11:30 UTC — Added FE routes `/admin/login`, `/admin/signup`, and `/admin/access`, updated admin guards to redirect unauthenticated users to `/admin/login`, and wired admin signup into the existing verify-email screen with admin-aware redirect behavior.
- 2026-03-23 11:31 UTC — Removed legacy admin grant buttons from the dashboard in favor of the new primary-admin access tab and updated the client auth layer to support admin-only login handling.
- 2026-03-23 11:32 UTC — Ran `python -m pytest`, `npm test`, and `npm run build` successfully, then reloaded the live stack so migration `005_add_admin_invites.sql` applied in production.
- 2026-03-23 11:34 UTC — Verified the live admin flow end-to-end: primary admin local login returned `is_primary_admin=true`, invite creation produced a pending invite, invited email completed `POST /api/auth/admin/register`, verification mail arrived, `POST /api/auth/verify-email` returned `is_admin=true`, and `/api/auth/me` for the new account confirmed active admin access.
- 2026-03-23 11:36 UTC — Confirmed `GET /api/admin/admin-users` and `GET /api/admin/invites` show the new admin and activated invite, and verified a non-invited `POST /api/auth/admin/register` is rejected with `403`.

### Outcome / Result

- `/admin/login` is now a real route and the admin guard correctly sends unauthenticated users there instead of `/login`.
- `nhatbang6688@gmail.com` is treated as the protected primary admin, with a dedicated `/admin/access` tab for inviting and revoking secondary admins.
- Secondary admins now follow an invite-only local signup flow: invite by email, create account via `/admin/signup`, verify the same 6-digit email code, then become admin automatically.
- The legacy direct admin-promotion path is no longer the intended promotion route; new admin grants are enforced through invites and verified activation.

### Remaining Follow-Ups

- A browser-level visual pass on the new admin FE screens would still be useful if you want final UI polish beyond the already-passing API/build/runtime verification.

- Closed: 2026-03-23 11:36 UTC

## Task TASK-20260323-01

- Created: 2026-03-23 08:49 UTC
- User Request: Implement the new root `tasks.md` workflow, migrate repo guidance away from `.github/task.md`, and update validation around the new memory model.
- Status: completed
- Related Task: n/a

### Plan

- Create root `tasks.md` as the canonical per-request task ledger with a stable entry structure.
- Convert `.github/task.md` into a legacy compatibility/archive pointer instead of the active tracker.
- Update project memory docs, agent instructions, and validation scripts so the required read order is `agent.md` then `tasks.md`.
- Run validation scripts to confirm the new workflow is wired correctly.

### Files / Systems Expected To Change

- `tasks.md`
- `.github/task.md`
- `agent.md`
- `CLAUDE.md`
- `.github/validate-task-tracking.sh`
- `.github/VALIDATION_README.md`
- `.github/copilot-instructions.md`
- `.github/agents/*.md`
- `README_AGENTS.md`
- `validate_setup.sh`

### Work Log

- 2026-03-23 08:49 UTC — Audited current memory/task workflow and collected all repo-local references to `.github/task.md`, `CLAUDE.md`, and task validation logic.
- 2026-03-23 08:50 UTC — Added canonical `tasks.md`, rewired repo instructions to read `agent.md` first and `tasks.md` second, and converted `.github/task.md` into a compatibility archive pointer.
- 2026-03-23 08:51 UTC — Reworked validation scripts to check task lifecycle fields in `tasks.md` instead of legacy phase-based backlog sections.
- 2026-03-23 08:52 UTC — Removed false-positive counting from the `tasks.md` template and finalized validator output against real task entries only.

### Outcome / Result

- Root `tasks.md` is now the canonical task ledger for all agent work.
- `.github/task.md` is no longer an active backlog; it now exists only as a compatibility/archive pointer.
- Repo guidance and custom agent instructions now consistently require reading `agent.md` first and `tasks.md` second.
- Validation scripts now enforce the new workflow and no longer depend on the old phase checklist format or count the template as a real task.

### Remaining Follow-Ups

- Future tasks should be appended here as new task blocks or updates to an existing open block.
- Legacy external docs or tooling outside this repository may still mention `.github/task.md` until they are updated separately.

- Closed: 2026-03-23 08:52 UTC

## Task TASK-20260323-02

- Created: 2026-03-23 08:53 UTC
- User Request: Check whether the new Invera logo has been applied to the sidebar brand mark and browser/tab icon, and update FE branding to the provided logo if it has not.
- Status: completed
- Related Task: n/a

### Plan

- Audit the current FE logo/icon assets and components that render the brand mark in the sidebar and browser tab.
- Replace the current placeholder branding with the provided IV logo style where needed.
- Verify the updated branding in the FE asset references and summarize the result.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/public/*`
- `FE/src/components/layout/*`
- `FE/index.html`

### Work Log

- 2026-03-23 08:53 UTC — Started audit of current sidebar logo and browser icon usage before deciding whether a branding update is still needed.
- 2026-03-23 08:55 UTC — Confirmed the FE still used `Sparkles` in sidebar/navbar/auth brand marks and an old purple `favicon.svg` with a lowercase `i`.
- 2026-03-23 08:57 UTC — Added a reusable `BrandIcon` component styled after the provided IV logo and replaced the old brand mark in sidebar, navbar, footer, login, signup, and verify-email screens.
- 2026-03-23 08:58 UTC — Updated `favicon.svg`, `index.html`, and `site.webmanifest` so the browser/tab icon uses the new IV branding and no longer references missing PNG favicon assets.
- 2026-03-23 08:59 UTC — Built the frontend successfully and reloaded the running services to publish the updated branding on the live site.

### Outcome / Result

- The logo in the app chrome was not updated before this task; it is now replaced with a new reusable IV brand mark based on the provided logo direction.
- The browser/tab favicon now uses the new IV mark through `FE/public/favicon.svg`, and HTML/manifest references were aligned to that asset.
- Frontend production build passed and the live stack was reloaded after the branding update.

### Remaining Follow-Ups

- If you want the logo image to match the provided source pixel-for-pixel, the next step is to replace the hand-built SVG mark with an exported source asset from the final design file.
- Browser-level visual verification via Playwright was attempted but blocked by missing browser runtime wiring in the local CLI wrapper; build and deploy verification still completed.

- Closed: 2026-03-23 08:59 UTC

## Task TASK-20260323-03

- Created: 2026-03-23 09:00 UTC
- User Request: Fix the browser tab icon because the website tab is still showing the old favicon instead of the new Invera branding.
- Status: completed
- Related Task: TASK-20260323-02

### Plan

- Audit which favicon asset the browser is still resolving for the website tab.
- Replace or regenerate the compatibility favicon assets that browsers may still prefer over the SVG icon.
- Rebuild and reload the frontend, then summarize what changed and any browser refresh needed.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/public/favicon.ico`
- `FE/public/favicon.svg`
- `FE/index.html`

### Work Log

- 2026-03-23 09:00 UTC — Started follow-up audit because the browser tab still shows the old purple favicon after the branding update.
- 2026-03-23 09:01 UTC — Confirmed the issue was the unchanged `FE/public/favicon.ico`; the browser tab was still resolving that legacy asset even though `favicon.svg` had already been updated.
- 2026-03-23 09:02 UTC — Regenerated `favicon.ico` in the new IV style and changed `index.html` to advertise both `favicon.svg` and `favicon.ico` with a version query for faster cache invalidation.
- 2026-03-23 09:03 UTC — Rebuilt and reloaded the live frontend, then verified the public HTML references the new versioned favicon URLs and the live `/favicon.ico` asset has the new timestamp and content length.

### Outcome / Result

- The browser tab icon issue is fixed at the asset level: the old fallback `favicon.ico` has been replaced with a new IV-branded icon.
- The live site now serves versioned favicon links from HTML and a refreshed `favicon.ico`, so browsers have a clear path to drop the stale cached tab icon.
- A manual hard refresh or reopening the tab may still be needed on clients that aggressively cache favicons.

### Remaining Follow-Ups

- If a browser still shows the old icon, close the tab and reopen `https://invera.pp.ua` or clear site data for the domain once to flush local favicon cache.

- Closed: 2026-03-23 09:03 UTC

## Task TASK-20260323-04

- Created: 2026-03-23 09:04 UTC
- User Request: Investigate and fix the `Failed to fetch` error shown on the signup flow.
- Status: completed
- Related Task: n/a

### Plan

- Reproduce the signup request against the live public API and inspect whether the failure is network-level or an API/server error.
- Check frontend request code and backend/service logs to isolate the failing layer.
- Implement the fix, redeploy if needed, and verify the signup flow again.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `FE/src/lib/api.ts`
- `FE/src/pages/Signup.tsx`
- `BE/app/api/endpoints/auth.py`
- Runtime services/logs

### Work Log

- 2026-03-23 09:04 UTC — Began live debugging of the signup `Failed to fetch` issue from the public deployment.
- 2026-03-23 09:08 UTC — Verified that the live public endpoint `POST /api/auth/register` is healthy and returns `200 OK` on `https://invera.pp.ua/api/auth/register`, so the issue was not a persistent backend/API outage.
- 2026-03-23 09:08 UTC — Inspected frontend fetch wrapper and confirmed network-level exceptions were bubbling raw browser text (`Failed to fetch`) directly into the UI.
- 2026-03-23 09:09 UTC — Updated the shared FE request wrapper to map offline/network exceptions to user-readable messages, then rebuilt the frontend and reloaded the live stack.

### Outcome / Result

- Public signup API is working normally; the error you saw was consistent with a transient network/fetch failure rather than a broken register endpoint.
- FE now shows a clearer message when the browser cannot reach the server, instead of exposing the raw `Failed to fetch` string.
- The updated frontend build has been published to the live deployment.

### Remaining Follow-Ups

- If the message appears again immediately after a deploy/reload, retry once after a few seconds because the backend can briefly restart during publish.
- If you want, I can add a lightweight retry banner or inline network diagnostics on auth screens next.

- Closed: 2026-03-23 09:09 UTC

## Task TASK-20260323-05

- Created: 2026-03-23 09:10 UTC
- User Request: Implement real Gmail delivery for verification codes with a nicer HTML email template, and enforce a minimum 30-second resend cooldown in the verification flow.
- Status: completed
- Related Task: TASK-20260323-04

### Plan

- Audit the current email verification backend flow, config, and verify-email frontend to identify where delivery mode and resend behavior are controlled.
- Implement real SMTP/Gmail HTML email delivery for verification codes, preserving a safe fallback when SMTP is not configured.
- Add backend resend throttling and surface the cooldown to the frontend with a 30-second minimum resend timer/disabled state.
- Build and verify the affected flows, then update project memory.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/app/api/endpoints/auth.py`
- `BE/app/services/email.py`
- `BE/app/core/config.py`
- `BE/app/schemas/user.py`
- `BE/.env.example`
- `FE/src/lib/api.ts`
- `FE/src/pages/VerifyEmail.tsx`

### Work Log

- 2026-03-23 09:10 UTC — Started implementation of real email delivery and resend cooldown for the verification flow.
- 2026-03-23 09:13 UTC — Added backend support for resend cooldown configuration, verification delivery response metadata, and a new migration to track the last successful verification-code delivery timestamp.
- 2026-03-23 09:15 UTC — Reworked the verification email content into a branded HTML email with a stronger plain-text fallback and Gmail-friendly SMTP example configuration.
- 2026-03-23 09:16 UTC — Updated FE signup/verify-email flow to carry cooldown metadata, disable resend during cooldown, show countdown state, and honor backend `retry_after_seconds` on `429`.
- 2026-03-23 09:17 UTC — Ran backend tests and frontend production build successfully, then reloaded the live stack with the new migration and FE bundle.
- 2026-03-23 09:18 UTC — Verified public runtime contract: `register` now returns `resend_available_in_seconds: 30`, and immediate `resend-verification-code` returns `429` with `retry_after_seconds: 30`.

### Outcome / Result

- Verification emails now support real SMTP/Gmail delivery with a polished HTML body and plain-text fallback in the backend code path.
- The verify-email flow now enforces a minimum 30-second resend cooldown on both backend and frontend.
- Live runtime contract is updated and verified, but the current server environment still needs real SMTP credentials in `BE/.env` before production email is sent instead of log-mode delivery.

### Remaining Follow-Ups

- To activate real Gmail sending on the live server, set `EMAIL_DELIVERY_MODE=smtp` plus `SMTP_USERNAME`, `SMTP_PASSWORD` (Gmail App Password), and `SMTP_SENDER_EMAIL` in `BE/.env`, then reload services.
- If you want, I can do one more pass on the HTML email art direction once you decide the sender Gmail branding and signature text.

- Closed: 2026-03-23 09:18 UTC

## Task TASK-20260323-06

- Created: 2026-03-23 09:19 UTC
- User Request: Replace the current OpenClaw/Tailscale-based setup with a non-Tailscale ingress, preferably nginx or another local reverse-proxy solution.
- Status: completed
- Related Task: n/a

### Plan

- Audit the current OpenClaw/Tailscale-related configuration on this machine and in the workspace to identify what is actually using Tailscale today.
- Design a replacement ingress/runtime path that does not depend on Tailscale and fits the available local privileges and services.
- Implement the config changes, update docs/memory, and verify the new path works.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `.openclaw/*`
- nginx or alternative local proxy config
- Related run/deploy docs

### Work Log

- 2026-03-23 09:19 UTC — Started audit of the current OpenClaw/Tailscale setup before replacing it with a non-Tailscale ingress path.
- 2026-03-23 09:27 UTC — Confirmed the previous setup relied on `tailscale serve/funnel` exposing `127.0.0.1:8080`, while OpenClaw listened on `127.0.0.1:18789` and the expense bot still ran in polling mode.
- 2026-03-23 09:30 UTC — Added Cloudflare DNS routes for `openclaw.invera.pp.ua` and `expense-bot.invera.pp.ua`, then started patching OpenClaw and expense-agent configs toward a direct Cloudflare Tunnel flow with dedicated hostnames and a webhook port at `18443`.
- 2026-03-23 09:33 UTC — Paused this migration because the user redirected priority to the Invera deployment at `/home/nhatbang/EXE101/PRJ` before runtime cutover and verification completed.
- 2026-03-23 09:38 UTC — Resumed the OpenClaw task to audit all listening ports, stop unused listeners, and fix the OpenClaw dashboard connection failure shown by the user.
- 2026-03-23 09:39 UTC — Reset stale Tailscale `serve/funnel` state, which removed the old tailnet exposure path that still pointed at the obsolete `:8080` dev server.
- 2026-03-23 09:40 UTC — Added `openclaw.invera.pp.ua -> 127.0.0.1:18789` to the live Cloudflare Tunnel config, restarted `cloudflared`, and updated the Invera tunnel template so the OpenClaw hostname survives future reloads.
- 2026-03-23 09:40 UTC — Killed the stale Vite dev server on `:8080`, removing the clearest unused user-owned listener on the host.
- 2026-03-23 09:42 UTC — Verified the remaining notable ports: `5678` is `n8n`, `8001` is Redis Stack UI, `5432` is Postgres, `9000` is Invera, `18789/18791/18792` are OpenClaw, and `8443` is an unrelated Crafty Controller HTTPS service, so it was left untouched.
- 2026-03-23 09:42 UTC — Confirmed `openclaw-gateway.service` is healthy and that the real reason the UI looked broken was the user opening the obsolete Tailscale URL without the required dashboard token fragment.

### Outcome / Result

- OpenClaw no longer depends on Tailscale for public dashboard access; the active public host is now `https://openclaw.invera.pp.ua`.
- The stale Tailscale exposure path was removed and the unused Vite dev listener on `:8080` was killed.
- OpenClaw itself was not down; the failure mode was an obsolete Tailscale URL plus a missing `#token=...` fragment when opening the dashboard/chat UI.

### Remaining Follow-Ups

- If you want the expense-manager bot moved from polling to webhook mode through Cloudflare as well, that is a separate follow-up.
- Root-owned/container services on `5678`, `8001`, and the unrelated HTTPS service on `8443` were intentionally not killed.

- Closed: 2026-03-23 09:42 UTC

## Task TASK-20260323-07

- Created: 2026-03-23 09:33 UTC
- User Request: Audit and fix the live deployment of the Invera project located at `/home/nhatbang/EXE101/PRJ` so it is correctly deployed on the web.
- Status: completed
- Related Task: n/a

### Plan

- Inspect the current public routing, FE/BE services, build/publish flow, and cloudflared ingress for the Invera deployment.
- Fix any mismatches so the public site serves the intended frontend and API from `/home/nhatbang/EXE101/PRJ`.
- Verify the corrected deployment end-to-end and update project memory/task tracking.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `/home/nhatbang/EXE101/PRJ/*`
- `~/.config/invera/cloudflared.yml`
- User systemd services and runtime processes

### Work Log

- 2026-03-23 09:33 UTC — Started a fresh deployment audit for `/home/nhatbang/EXE101/PRJ` after the user redirected priority away from the unfinished OpenClaw ingress migration.
- 2026-03-23 09:34 UTC — Verified the live public domain already resolves through Cloudflare Tunnel directly to `127.0.0.1:9000`, and confirmed the FastAPI app serves both `/api/*` and the built SPA from `FE/dist`.
- 2026-03-23 09:35 UTC — Found the main deployment mismatch: `scripts/publish_frontend.sh` still tried to sync FE output into `/var/www/invera.pp.ua/html`, even though public traffic no longer uses local nginx and instead relies on the backend serving `FE/dist`.
- 2026-03-23 09:36 UTC — Updated the frontend publish script and user-service template so deployment is self-contained inside `/home/nhatbang/EXE101/PRJ`, then reloaded the stack through `./scripts/inveractl reload`.
- 2026-03-23 09:37 UTC — Ran `./scripts/inveractl smoke` and confirmed local `/healthz`, public `/`, public `/api/openapi.json`, and public `/api/auth/me` all return the expected results after the deploy fix.

### Outcome / Result

- Invera is now deployed coherently from `/home/nhatbang/EXE101/PRJ` without depending on `/var/www` or local nginx for the public site.
- The live public path is now clearly aligned as `Cloudflare Tunnel -> 127.0.0.1:9000 -> FastAPI -> FE/dist + /api`.
- Frontend publish/reload operations now rebuild the bundle in `FE/dist`, which is the actual directory the backend serves to the public domain.

### Remaining Follow-Ups

- Local nginx on port `80` is still just a host-level placeholder and not part of the public route; only reconfigure it later if you explicitly want to move away from Cloudflare Tunnel -> FastAPI.
- A stray local Vite dev server is still listening on `*:8080`; it is not part of production, but it should be stopped separately if you want a cleaner host runtime.

- Closed: 2026-03-23 09:37 UTC

## Task TASK-20260323-08

- Created: 2026-03-23 09:44 UTC
- User Request: Re-check the real email verification flow because end users still are not receiving registration emails, change resend cooldown to 60 seconds, and make the resend button turn green when it becomes available.
- Status: completed
- Related Task: TASK-20260323-05

### Plan

- Audit the backend email delivery configuration and verification flow to determine whether SMTP is actually enabled in the deployed environment.
- Update backend/frontend resend cooldown behavior from 30 seconds to 60 seconds and adjust the verify-email UI state so the resend button becomes visually active when available.
- Verify the runtime behavior, update memory, and summarize any remaining deployment prerequisites for real email delivery.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/.env` or backend runtime config
- `BE/app/api/endpoints/auth.py`
- `BE/app/core/config.py`
- `BE/app/services/email.py`
- `FE/src/pages/VerifyEmail.tsx`

### Work Log

- 2026-03-23 09:44 UTC — Started a fresh audit of the verification mail flow after the user reported that end users still do not receive the registration code email.
- 2026-03-23 09:45 UTC — Confirmed the deployed backend still loads `BE/.env` without any `SMTP_*` credentials and therefore falls back to `EMAIL_DELIVERY_MODE=log`.
- 2026-03-23 09:45 UTC — Verified the live journal still prints verification codes directly (`Email verification code for ...`) instead of reporting any SMTP delivery, which proves mail is not being sent to Gmail yet.
- 2026-03-23 09:46 UTC — Raised the verification resend cooldown default/runtime to 60 seconds, made the verify-email resend button switch to the accent/green state when available, and added backend exception logging for failed SMTP delivery attempts.
- 2026-03-23 09:47 UTC — Reloaded the stack and rebuilt the frontend so the new cooldown and resend button state ship to the public site.
- 2026-03-23 09:48 UTC — Verified the live public contract: `register` now returns `resend_available_in_seconds: 60`, and an immediate resend returns `429` with `Retry-After: 60` and `retry_after_seconds: 60`.

### Outcome / Result

- The resend cooldown is now 60 seconds in both backend runtime and frontend UI.
- The resend button now turns into the accent/green style when the cooldown reaches zero and the action becomes available again.
- The real reason end users are not receiving emails is unchanged and now explicitly confirmed: live deployment still runs in `EMAIL_DELIVERY_MODE=log`, so verification codes are written to backend logs instead of being sent to Gmail.

### Remaining Follow-Ups

- To send real verification emails, add real Gmail SMTP credentials to `BE/.env`: `EMAIL_DELIVERY_MODE=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USERNAME`, `SMTP_PASSWORD` (Gmail App Password), and `SMTP_SENDER_EMAIL`, then reload the stack.
- If you want, the next step is for me to wire in your actual sender Gmail credentials on this machine and run one end-to-end inbox test.

- Closed: 2026-03-23 09:48 UTC

## Task TASK-20260323-09

- Created: 2026-03-23 09:49 UTC
- User Request: Configure real Gmail sender delivery for Invera verification emails and clarify whether any Google-side setup is required to send Gmail from the app.
- Status: completed
- Related Task: TASK-20260323-08

### Plan

- Re-check whether any usable SMTP sender credentials already exist on the machine or in the project runtime.
- Clarify the exact Google-side requirements for Gmail SMTP delivery versus Google OAuth/Cloud Console setup.
- If sender credentials are available, wire them into `BE/.env` and test end-to-end delivery; otherwise stop at the concrete secret/setup requirements needed from the user.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `BE/.env`
- Backend runtime config and service state

### Work Log

- 2026-03-23 09:49 UTC — Started the sender Gmail setup follow-up and re-check of what Google-side configuration is actually required for real verification email delivery.
- 2026-03-23 09:49 UTC — Confirmed the deployed backend still has no `SMTP_*` settings in `BE/.env` and no SMTP sender credentials available in the process environment, so the task cannot proceed to real delivery on this machine without new secrets.
- 2026-03-23 09:50 UTC — Verified that Google OAuth client settings already present in `BE/.env` are unrelated to SMTP delivery; Gmail sending via this backend requires a sender Gmail account plus a Gmail App Password, not extra Google Cloud Console setup.
- 2026-03-23 09:52 UTC — User supplied sender Gmail credentials, so the task moved from blocked to active implementation and verification.
- 2026-03-23 10:10 UTC — Updated `BE/.env` to switch the live deployment from `EMAIL_DELIVERY_MODE=log` to `smtp`, reloaded the stack, and triggered a real verification-email attempt to a Gmail `+alias` pointing at the sender inbox.
- 2026-03-23 10:11 UTC — Captured the live failure from journald and a direct SMTP probe: Gmail returned `535 5.7.8 Username and Password not accepted`, which means the supplied App Password is not valid for SMTP login in its current state.
- 2026-03-23 10:16 UTC — Replaced the sender App Password in `BE/.env`, reloaded the live stack successfully, and confirmed `invera-backend.service` came back healthy on `127.0.0.1:9000`.
- 2026-03-23 10:17 UTC — Re-ran a direct SMTP login probe from the host and confirmed Gmail now accepts the sender credential.
- 2026-03-23 10:18 UTC — Triggered a fresh public `POST /api/auth/register` to a Gmail `+alias`, received the normal verification-required success payload with `resend_available_in_seconds: 60`, and verified through IMAP that the message `Ma xac thuc tai khoan Invera` arrived in the Gmail inbox.

### Outcome / Result

- Live Invera now sends real verification emails through Gmail SMTP using the configured sender account in `BE/.env`.
- Delivery was verified end-to-end: SMTP login succeeded, public register returned the normal verification flow response, and the email reached the Gmail inbox for the `+alias` recipient.

### Remaining Follow-Ups

- Consider moving SMTP secrets from plain `.env` into a more controlled secret-management path later if this host setup evolves.

- Closed: 2026-03-23 10:18 UTC

## Task TASK-20260323-10

- Created: 2026-03-23 09:50 UTC
- User Request: Explain what changes are needed if Invera uses Gmail API instead of SMTP to send verification emails.
- Status: completed
- Related Task: TASK-20260323-09

### Plan

- Clarify the architectural difference between Gmail API sending and the current SMTP-based plan.
- Map the Google-side setup required for Gmail API to the current Invera deployment model.
- Summarize whether Gmail API is a good fit here and what code/runtime changes it would require.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`

### Work Log

- 2026-03-23 09:50 UTC — Assessed the Gmail API alternative against the current Invera verification-email flow and the existing Google OAuth setup already present in the project.

### Outcome / Result

- Gmail API is possible, but it is a different integration from SMTP and would require new backend code plus Google OAuth token management.
- For a normal personal Gmail sender, Gmail API requires enabling Gmail API in Google Cloud, creating OAuth credentials, obtaining an offline refresh token for the sender account, and sending mail with the `gmail.send` scope.
- Service-account-only sending does not work for ordinary personal Gmail accounts; that path is mainly for Google Workspace with domain-wide delegation.
- For this project’s current server-side verification-code emails, SMTP with Gmail App Password is still the simpler deployment path unless there is a specific reason to avoid SMTP.

### Remaining Follow-Ups

- If you want to switch to Gmail API, the next implementation step is to add a provider abstraction in the email service and store sender OAuth refresh credentials securely in backend env/secrets.

- Closed: 2026-03-23 09:50 UTC

## Task TASK-20260323-11

- Created: 2026-03-23 09:51 UTC
- User Request: Keep the verification email solution on SMTP and provide detailed step-by-step instructions for obtaining each value needed so the agent can update `BE/.env`.
- Status: completed
- Related Task: TASK-20260323-09

### Plan

- Confirm the exact SMTP fields the current Invera backend expects.
- Write a precise, practical checklist for obtaining each Gmail/App Password value needed for `BE/.env`.
- Summarize the remaining handoff so the next step can be applying the provided secrets into runtime config.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`

### Work Log

- 2026-03-23 09:51 UTC — Prepared the SMTP-specific handoff for the current Invera backend so the user can gather the exact Gmail sender values needed for `BE/.env`.

### Outcome / Result

- The recommended path remains SMTP with Gmail App Password.
- A step-by-step credential gathering checklist was prepared for `EMAIL_DELIVERY_MODE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SENDER_EMAIL`, `SMTP_SENDER_NAME`, `SMTP_USE_TLS`, and `SMTP_USE_SSL`.

### Remaining Follow-Ups

- Once the user provides the sender Gmail address and App Password, update `BE/.env`, reload the stack, and run one real inbox delivery test.

- Closed: 2026-03-23 09:51 UTC

## Task TASK-20260323-34

- Created: 2026-03-23 18:22 UTC
- User Request: Send an admin-access email to `bangpoca@gmail.com`.
- Status: completed

### Plan

- Check whether `bangpoca@gmail.com` already exists in the live database and whether the account already has admin privileges.
- If the account is already active, resend the existing admin-access email with the correct `/admin/login` link instead of creating a duplicate invite.
- Record the send result and any login caveat caused by the current admin-auth policy.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- Live SMTP email-delivery runtime

### Work Log

- 2026-03-23 18:22 UTC — Checked the live database and confirmed `bangpoca@gmail.com` already exists, is email-verified, and already has `is_admin = TRUE`.
- 2026-03-23 18:22 UTC — Confirmed the latest `admin_invites` row for `bangpoca@gmail.com` is already `activated`, so this request should be handled as a resend of the existing-login admin email rather than a new pending invite.
- 2026-03-23 18:23 UTC — Triggered `send_admin_invite_email(..., mode=\"existing-login\", provider=\"google\")` from the live backend runtime to resend the admin-access email with the `/admin/login` link to `bangpoca@gmail.com`.

### Outcome / Result

- The admin-access email was resent successfully to `bangpoca@gmail.com`.
- No database privilege change was required because the account was already an active admin before the resend.

### Remaining Follow-Ups

- Because `bangpoca@gmail.com` is currently a Google-linked account and admin access is still local-email/password-only, the user may need to use `Forgot password` first if they have never set a local password for the admin login screen.

- Closed: 2026-03-23 18:23 UTC

## Task TASK-20260323-35

- Created: 2026-03-23 18:31 UTC
- User Request: Commit the current project state with a short, general message, push it to `main`, and tighten `.gitignore` so non-core markdown/env/output/upload folders are ignored.
- Status: in_progress

### Plan

- Fix the known QnA runtime issue first so the tree is not committed in a known-broken state.
- Update `.gitignore` to match the requested ignore policy as closely as possible without deleting tracked project files.
- Create one short, general commit covering the current accumulated work and push it to `origin/main`.

### Files / Systems Expected To Change

- `tasks.md`
- `agent.md`
- `.gitignore`
- Git history / `origin/main`

### Work Log

- 2026-03-23 18:31 UTC — Started the commit-and-push task and inspected the repo state: current branch is `Bang`, `main` exists locally and on `origin`, and the working tree contains the accumulated FE/BE/runtime changes from prior tasks.
- 2026-03-23 18:33 UTC — Fixed another QnA backend serialization/runtime issue in `BE/app/api/endpoints/qna.py` so the current tree is closer to a shippable state before committing.
- 2026-03-23 18:34 UTC — Updated `.gitignore` with the requested broad ignore rules for markdown, env files, output, uploads, and the named non-core folders. Existing tracked files remain tracked unless explicitly removed from git history.
