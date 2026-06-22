# Automation Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid automation test suite that covers the full website flow, backend regressions, and realistic concurrent usage on both local and staging environments.

**Architecture:** Use Playwright for browser-level smoke, regression, and concurrent browser flows; use Pytest for backend API and service regression; add a guarded test-bootstrap API so test data can self-seed on local and staging. Keep shared config and auth helpers in reusable test-automation modules so browser and backend suites stay in sync.

**Tech Stack:** Playwright, Vitest, FastAPI, Pytest, HTTPX, existing FE/Vite app, existing BE/Pytest stack, GitHub Actions.

---

### Task 1: Add shared automation harness and environment contract

**Files:**
- Modify: `FE/package.json`
- Modify: `FE/vitest.config.ts`
- Create: `FE/playwright.config.ts`
- Create: `FE/src/lib/test-automation/env.ts`
- Create: `FE/src/lib/test-automation/auth.ts`
- Create: `FE/src/lib/test-automation/seed.ts`
- Create: `FE/src/lib/test-automation/paths.ts`
- Create: `FE/src/test/test-automation-env.test.ts`

- [ ] **Step 1: Write the failing test**

Create `FE/src/test/test-automation-env.test.ts` with cases that assert:

```ts
import { describe, expect, it } from "vitest";
import { readAutomationConfig } from "@/lib/test-automation/env";

describe("readAutomationConfig", () => {
  it("requires base URLs and a seed mode", () => {
    expect(() => readAutomationConfig({} as any)).toThrow("VITE_AUTOMATION_BASE_URL is required");
  });

  it("parses local and staging URLs", () => {
    const config = readAutomationConfig({
      VITE_AUTOMATION_BASE_URL: "http://127.0.0.1:5173",
      VITE_AUTOMATION_API_BASE_URL: "http://127.0.0.1:9000/api",
      VITE_AUTOMATION_SEED_MODE: "self-seed",
    } as any);

    expect(config.baseUrl).toBe("http://127.0.0.1:5173");
    expect(config.apiBaseUrl).toBe("http://127.0.0.1:9000/api");
    expect(config.seedMode).toBe("self-seed");
  });
});
```

Run: `cd FE && npm test -- --run src/test/test-automation-env.test.ts`

Expected: FAIL with a missing-module or missing-function error for `@/lib/test-automation/env`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FE && npm test -- --run src/test/test-automation-env.test.ts`

Expected: the test fails before implementation, proving the new shared config layer is not present yet.

- [ ] **Step 3: Write minimal implementation**

Add `FE/src/lib/test-automation/env.ts` with a small `readAutomationConfig(env)` helper that:

- Reads `VITE_AUTOMATION_BASE_URL`
- Reads `VITE_AUTOMATION_API_BASE_URL`
- Reads `VITE_AUTOMATION_SEED_MODE`
- Normalizes `local` and `staging` mode inputs

Add `FE/src/lib/test-automation/auth.ts`, `seed.ts`, and `paths.ts` as thin reusable helpers for:

- Test account creation via API
- Login token capture
- Worker-scoped entity names
- Route/path generation for public, app, and admin flows

Update `FE/package.json` with:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:e2e:concurrent": "playwright test --grep @concurrent"
  }
}
```

Add `FE/playwright.config.ts` with:

- Chromium and Firefox projects
- Mobile viewport project
- Trace-on-retry
- Environment-driven `baseURL` and `API_BASE_URL`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FE && npm test -- --run src/test/test-automation-env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/package.json FE/vitest.config.ts FE/playwright.config.ts FE/src/lib/test-automation FE/src/test/test-automation-env.test.ts
git commit -m "test: add shared automation harness"
```

### Task 2: Add backend bootstrap, API regression, and service regression coverage

**Files:**
- Modify: `BE/app/core/config.py`
- Modify: `BE/app/main.py`
- Create: `BE/app/api/endpoints/test_automation.py`
- Create: `BE/app/schemas/test_automation.py`
- Create: `tests/backend/test_test_automation_bootstrap.py`
- Create: `tests/backend/test_automation_api_smoke.py`
- Create: `tests/backend/test_automation_service.py`

- [ ] **Step 1: Write the failing test**

Create `tests/backend/test_test_automation_bootstrap.py` with a bootstrap contract like:

```python
def test_bootstrap_creates_unique_candidate_and_admin(client):
    response = client.post("/api/test/bootstrap", json={"run_id": "run-123"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["candidate"]["email"].startswith("run-123-")
    assert payload["admin"]["is_admin"] is True
    assert payload["session_seed"]["run_id"] == "run-123"
```

Create `tests/backend/test_automation_api_smoke.py` with one happy-path assertion per core API area:

- auth login
- session creation
- live follow-up generation
- export generation
- billing checkout
- admin access

Create `tests/backend/test_automation_service.py` with direct service assertions for:

- scoring
- transcript cleanup
- adaptive follow-up
- payment order cleanup

Run: `cd BE && uv run pytest ../tests/backend/test_test_automation_bootstrap.py -q`

Expected: FAIL because `/api/test/bootstrap` does not exist yet.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd BE && uv run pytest ../tests/backend/test_test_automation_bootstrap.py -q`

Expected: endpoint-not-found or import failure until the backend test hook exists.

- [ ] **Step 3: Write minimal implementation**

Add a guarded test router in `BE/app/api/endpoints/test_automation.py` that:

- Only mounts when a dedicated env flag is enabled
- Creates unique test users and an admin fixture
- Seeds a session/question payload for the current run
- Returns IDs and tokens needed by Playwright and Pytest helpers

Wire it through `BE/app/main.py` and `BE/app/core/config.py` so local and staging can enable it explicitly without affecting production defaults.

Keep the API regression and service regression tests focused on real backend behavior, not UI details.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd BE
uv run pytest ../tests/backend/test_test_automation_bootstrap.py ../tests/backend/test_automation_api_smoke.py ../tests/backend/test_automation_service.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add BE/app/core/config.py BE/app/main.py BE/app/api/endpoints/test_automation.py BE/app/schemas/test_automation.py tests/backend/test_test_automation_bootstrap.py tests/backend/test_automation_api_smoke.py tests/backend/test_automation_service.py
git commit -m "test(be): add automation bootstrap and regression coverage"
```

### Task 3: Build browser smoke flows for the critical user journeys

**Files:**
- Create: `FE/e2e/smoke/public.spec.ts`
- Create: `FE/e2e/smoke/auth.spec.ts`
- Create: `FE/e2e/smoke/candidate.spec.ts`
- Create: `FE/e2e/smoke/interview.spec.ts`
- Create: `FE/e2e/smoke/billing.spec.ts`
- Create: `FE/e2e/smoke/admin.spec.ts`
- Create: `FE/e2e/support/browser.ts`
- Create: `FE/e2e/support/bootstrap.ts`
- Create: `FE/e2e/support/selectors.ts`

- [ ] **Step 1: Write the failing test**

Create `FE/e2e/smoke/auth.spec.ts` with a smoke flow that:

```ts
import { test, expect } from "@playwright/test";

test("@smoke login flow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_CANDIDATE_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.E2E_CANDIDATE_PASSWORD ?? "");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/app|\/dashboard/);
});
```

Create parallel smoke specs for:

- public page render
- session creation
- interview room
- live interviewer room
- billing upgrade
- admin access gate

Run: `cd FE && npm run test:e2e:smoke`

Expected: FAIL until the browser harness and bootstrap helpers are wired to a real test account flow.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FE && npm run test:e2e:smoke`

Expected: fail on missing Playwright config, missing helper imports, or missing test data.

- [ ] **Step 3: Write minimal implementation**

Implement the smoke suite so each spec:

- Uses the shared bootstrap helper to obtain a seeded candidate/admin identity
- Logs in through the real UI where the login form is the thing under test
- Uses API bootstrap only for setup and cleanup
- Asserts the route, the visible heading, and one critical action per page

Keep the smoke suite short and deterministic:

- Public pages: load and redirect behavior
- Auth: signup/login/logout/reset
- Candidate: session create and session detail
- Interview: webcam and STT entry points
- Live room: phase rendering and follow-up transition
- Billing: upgrade entry point
- Admin: gate and dashboard entry

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd FE
npm run test:e2e:smoke
```

Expected: PASS on Chromium first, then Firefox, then the mobile viewport project for the chosen public/auth pages.

- [ ] **Step 5: Commit**

```bash
git add FE/e2e FE/playwright.config.ts FE/src/lib/test-automation FE/package.json
git commit -m "test(fe): add browser smoke coverage"
```

### Task 4: Add concurrent browser suites for realistic multi-user behavior

**Files:**
- Create: `FE/e2e/concurrent/session-create.spec.ts`
- Create: `FE/e2e/concurrent/answer-submit.spec.ts`
- Create: `FE/e2e/concurrent/live-room.spec.ts`
- Create: `FE/e2e/concurrent/admin-vs-candidate.spec.ts`
- Create: `FE/e2e/support/concurrency.ts`
- Create: `tests/backend/test_automation_concurrent.py`

- [ ] **Step 1: Write the failing test**

Create `FE/e2e/concurrent/session-create.spec.ts` with a worker-isolated multi-context test like:

```ts
import { test, expect } from "@playwright/test";
import { createWorkerAccounts } from "../support/concurrency";

test("@concurrent creates sessions in parallel", async ({ browser }) => {
  const accounts = await createWorkerAccounts(10);
  const contexts = await Promise.all(accounts.map((account) => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  await Promise.all(pages.map((page, index) => page.goto(`/login?worker=${index}`)));
  await Promise.all(pages.map((page) => page.getByRole("button", { name: /new session/i }).click()));
  await Promise.all(pages.map((page) => expect(page.getByText(/session created/i)).toBeVisible()));
});
```

Create backend concurrency coverage in `tests/backend/test_automation_concurrent.py` that exercises the same logical flows with `asyncio.gather()` and asserts isolation across users, sessions, exports, and billing state.

Run: `cd FE && npm run test:e2e:concurrent`

Expected: FAIL until concurrency helpers and worker-scoped bootstrap are implemented.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd FE
npm run test:e2e:concurrent
```

Expected: fail due to missing support helpers or missing seeded accounts.

- [ ] **Step 3: Write minimal implementation**

Implement concurrency helpers that:

- Allocate distinct worker IDs
- Create per-worker accounts and session seeds
- Prevent cross-worker reuse of mutable state
- Expose a small helper for `10`, `20`, and `50` worker runs

Cover the concurrent cases from the spec:

- simultaneous signup/login
- simultaneous session creation
- simultaneous answer submission
- simultaneous live-room sessions
- candidate and admin activity in parallel
- export and telemetry reads under load
- billing actions without cross-session leakage

In backend tests, assert:

- no duplicated session rows
- no leaked authentication state
- no cross-user exports
- no payment-order collisions

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd FE
npm run test:e2e:concurrent
cd ../BE
uv run pytest ../tests/backend/test_automation_concurrent.py -q
```

Expected: PASS for the chosen concurrency budget, with the default target staying in the 10-50 range.

- [ ] **Step 5: Commit**

```bash
git add FE/e2e FE/src/lib/test-automation tests/backend/test_automation_concurrent.py
git commit -m "test: add concurrent automation coverage"
```

### Task 5: Add CI, runbooks, and release verification commands

**Files:**
- Create: `.github/workflows/automation-tests.yml`
- Modify: `README.md`
- Modify: `BE/README.md`
- Modify: `FE/README.md`
- Create: `docs/superpowers/specs/automation-testing-runbook.md`

- [ ] **Step 1: Write the failing test**

Add a CI workflow that runs the suite on push/PR with separate jobs for:

- FE smoke
- FE concurrent
- BE API regression
- BE service regression

The failing test here is operational: run the workflow locally by invoking the same commands listed in the workflow file and confirm the repo currently lacks a unified automation entry point.

Run:

```bash
cd FE && npm run test:e2e:smoke
cd FE && npm run test:e2e:concurrent
cd BE && uv run pytest ../tests/backend/test_automation_api_smoke.py ../tests/backend/test_automation_service.py ../tests/backend/test_automation_concurrent.py -q
```

Expected: the suite is still incomplete until Tasks 1-4 land.

- [ ] **Step 2: Run test to verify it fails**

Run the exact local commands above and capture the failing areas in the workflow logs or terminal output.

- [ ] **Step 3: Write minimal implementation**

Add `.github/workflows/automation-tests.yml` with:

- Node setup for FE
- Python setup for BE
- Cached installs
- Separate jobs for smoke, regression, and concurrent suites
- Environment variables for local/staging URLs

Update the README files with:

- how to run smoke locally
- how to run staging against real URLs
- how to run concurrent suites with a worker budget
- what env vars are required

Add a short runbook in `docs/superpowers/specs/automation-testing-runbook.md` that explains:

- which suite to run first
- how to seed test users
- how to clear failed test data
- what to do when concurrent tests detect cross-user leakage

- [ ] **Step 4: Run test to verify it passes**

Run the workflow-equivalent commands locally and confirm they pass after Tasks 1-4 are complete.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/automation-tests.yml README.md BE/README.md FE/README.md docs/superpowers/specs/automation-testing-runbook.md
git commit -m "docs: add automation test runbook and ci"
```
