# Automation Test Design

## Objective

Build a hybrid automation test strategy for the full website so the platform can be validated end to end on both local and staging environments.

The suite must cover:

- Public website flows
- Authentication and account recovery
- Candidate app flows
- Interview room and live interviewer flows
- Billing and upgrade flows
- Profile and settings flows
- Admin flows
- Backend/API and service-level regression
- Concurrent behavior for core functions

## Goals

- Catch regressions in user-facing flows before release.
- Verify critical backend services independently from the browser.
- Exercise concurrent usage at a realistic load level, not stress-test scale.
- Keep the suite runnable against both local and staging with the same test logic.
- Make test data self-seeding so runs do not depend on pre-created accounts.

## Non-Goals

- Load testing above realistic product usage.
- Mobile app automation outside the web browser.
- Full visual regression coverage for every page.
- Synthetic performance benchmarking for infrastructure capacity.

## Scope

This design covers the following product areas:

- Public pages: landing, about, contact, privacy, terms
- Auth: signup, login, logout, verification, password reset, OAuth callback
- Candidate app: dashboard, new session, session list, session detail, interview room, live interview room
- Q&A and exports
- Profile: avatar, resume, deletion, settings
- Billing and plan upgrade
- Admin: dashboard, users, revenue, sessions, question bank, access
- Backend service logic: scoring, adaptive follow-up, transcript cleanup, exports, payment order cleanup, telemetry

## Recommended Test Stack

### Browser E2E

Use Playwright for browser automation because it supports:

- Multiple browsers: Chromium, Firefox, WebKit-compatible patterns where needed
- Multiple contexts for concurrent execution
- Mobile viewport emulation
- Network interception and API coordination
- Reliable waits and tracing

### API and Service Regression

Use backend test tooling already present in the repo for:

- FastAPI route tests
- Service-level unit tests
- Database-related cleanup and validation

### Concurrent Validation

Use a Playwright-based concurrency harness for browser-visible flows, plus backend-side concurrent API tests where browser interaction is unnecessary.

## Testing Layers

### 1. Smoke E2E

Purpose: confirm the critical product journey still works.

Covered flows:

- Public landing page loads
- Signup and login
- Email verification path or mock equivalent
- Create a session
- Open interview room
- Open live interview room
- Submit an answer
- View session detail and history
- Upgrade path
- Admin access gate

Execution:

- Run on Chromium first
- Run on Firefox as the second browser
- Run on a mobile viewport for the highest-value public and auth pages

### 2. API Regression

Purpose: validate business logic without browser overhead.

Covered areas:

- Auth endpoints
- Session creation and retrieval
- Scoring and feedback generation
- Adaptive follow-up generation
- Telemetry endpoints
- Export endpoints
- Billing and payment order lifecycle
- Admin endpoints

### 3. Service Regression

Purpose: protect pure logic and boundary code.

Covered areas:

- Transcript cleanup
- Scoring feedback formatting
- Adaptive interview follow-up rules
- Question-bank seeding and normalization
- Export generation helpers
- Payment order cleanup helpers

### 4. Concurrent Suite

Purpose: verify that the product behaves correctly when multiple users operate at the same time.

Concurrency target:

- Realistic concurrent load only
- Default target range: 10 to 50 parallel workers, depending on the workflow

Concurrent cases:

- Multiple users sign up or log in at the same time
- Multiple users create sessions at the same time
- Multiple users submit answers at the same time
- Multiple live interview rooms run in parallel
- Candidate actions and admin actions run in parallel
- Export generation and telemetry reads run while sessions are active
- Billing/upgrade actions do not block unrelated sessions

## Environment Strategy

### Local

- Primary fast feedback environment
- Uses seeded fixture data and disposable test accounts
- Browser tests point to the local FE and BE services

### Staging

- Same test definitions, different base URLs and credentials
- Used for release verification and production-like validation
- Runs the same smoke and a reduced concurrent suite by default

### Config Model

The suite should be configured entirely through environment variables, not hard-coded URLs.

Required values:

- Frontend base URL
- Backend base URL
- Test user seed strategy
- Admin test credentials or admin token seed
- Optional OAuth bypass or test-mode auth hooks if staging requires them

## Data Strategy

Because there are no fixed test accounts, the suite should self-seed.

Seed strategy:

- Create unique users for each run
- Create unique sessions and question sets per test worker
- Create isolated admin fixtures where required
- Use deterministic prefixes for test entities so cleanup can find them

Cleanup strategy:

- Prefer idempotent cleanup at the end of each test or worker
- If cleanup fails, tag entities with a run ID for later purge
- Never reuse mutable shared test state between concurrent workers

## Role Coverage

### Anonymous Visitor

- Open public pages
- Open auth pages
- Check routing and redirects

### Candidate User

- Register
- Log in
- Reset password
- Create a session
- Run interview flows
- Submit answers
- View feedback
- Export results
- Manage profile and settings

### Admin User

- Log in to admin surface
- View dashboard and revenue
- Manage users
- Manage sessions
- Manage question bank
- Access restricted admin routes

## Key Flow Matrix

### Public and Auth

- Landing page renders
- Signup succeeds
- Login succeeds
- Logout succeeds
- Password reset request and completion work
- Verification flow works or is safely bypassed in test mode

### Candidate Journey

- Create new session
- Continue or resume session
- Answer questions in interview room
- Handle live interviewer mode
- View scoring and feedback
- Review session detail and history

### Billing

- View plan pages
- Start upgrade flow
- Confirm payment status handling
- Preserve account state after billing events

### Profile and Settings

- Update profile
- Upload or replace avatar
- Upload or replace resume
- Delete account

### Admin

- Enter admin area
- Review sessions and users
- Review revenue
- Operate question bank

## Concurrent Coverage Model

Concurrent tests should be grouped by workflow so failures are easy to diagnose.

Recommended groups:

- Auth concurrency
- Session creation concurrency
- Interview answer submission concurrency
- Live room concurrency
- Admin concurrency
- Billing concurrency
- Export concurrency

Each group should:

- Use separate worker-scoped accounts or session IDs
- Assert no cross-user leakage
- Assert response data stays isolated
- Assert no duplicate or missing records are created
- Fail fast on shared-state collisions

## Stability Rules

- Prefer API setup over UI setup when the UI is not the thing under test.
- Use browser UI only for flows where rendering, routing, or interaction matters.
- Stub external media or AI dependencies when the test target is logic, not provider integration.
- Keep live STT/TTS/AI tests deterministic by using mocks or contract doubles in lower layers.
- Reserve real provider calls for a tiny manual or nightly smoke set only if necessary.

## Suggested Suite Structure

- `smoke` for the shortest critical path
- `regression` for the broader browser and API set
- `concurrent` for multi-worker validation
- `service` for pure backend logic
- `staging` for release-like validation

## Pass Criteria

The automation effort is successful when:

- The smoke suite passes on local and staging.
- The core browser flows pass on Chromium and Firefox.
- Mobile viewport coverage passes for the chosen public and auth pages.
- The concurrent suite passes at the agreed 10-50 worker range.
- API and service regression suites pass reliably.
- Test runs are self-seeding and do not require manual account setup.

## Outbound Dependencies

The suite depends on:

- Stable FE and BE base URLs
- A predictable test database state or reset mechanism
- A way to generate or bypass verification for test users
- A safe admin test credential path
- Mocks or contract doubles for unstable external integrations

## Implementation Notes

This design intentionally separates the suite by concern:

- Browser tests validate user experience.
- API tests validate business behavior.
- Service tests validate pure logic.
- Concurrent tests validate isolation and race resistance.

That separation keeps the suite maintainable and makes failures easier to triage.
