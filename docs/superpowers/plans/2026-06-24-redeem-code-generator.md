# Redeem Code UUID Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded redeem codes with admin-generated UUID codes that can be redeemed once and expire by `7 days`, `30 days`, or an exact datetime.

**Architecture:** Store redeemable codes in a dedicated database table keyed by UUID, and make redemption an atomic database update so the same code cannot be used twice. Add admin endpoints to generate and inspect codes, then expose them in a new admin sidebar tab with a small generation form and recent-code list. Keep the existing billing redeem entrypoint, but move its validation from code constants to database-backed code lookup.

**Tech Stack:** FastAPI, asyncpg, PostgreSQL migrations, React + TypeScript, shadcn/ui, Vitest, pytest.

---

### Task 1: Add database-backed redeem codes and replace the hard-coded plan map

**Files:**
- Create: `BE/migrations/024_add_redeem_codes.sql`
- Modify: `BE/app/main.py`
- Modify: `BE/app/services/plans.py`
- Modify: `BE/app/schemas/billing.py`
- Test: `BE/tests/test_redeem_codes.py`

- [ ] **Step 1: Write the failing test**

```python
def test_redeem_code_cannot_be_used_twice():
    code = "4dd2d807-2a59-4d2f-9f86-1f3eea2dd3ab"
    first = asyncio.run(redeem_plan_code(fake_db, user_id=user_id, code=code))
    assert first["plan_tier"] == "basic"

    with pytest.raises(ValueError, match="already used"):
        asyncio.run(redeem_plan_code(fake_db, user_id=other_user_id, code=code))

def test_redeem_code_expires_at_fixed_datetime():
    code = "37f1e26f-7a6e-4b7d-bf7b-c2e7bf5f3e21"
    with pytest.raises(ValueError, match="expired"):
        asyncio.run(redeem_plan_code(fake_db, user_id=user_id, code=code, redeemed_at=frozen_now))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest BE/tests/test_redeem_codes.py -q`

Expected: FAIL because `redeem_codes` does not exist yet and the service still uses the removed hard-coded map.

- [ ] **Step 3: Write minimal implementation**

```sql
CREATE TABLE IF NOT EXISTS redeem_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code UUID NOT NULL UNIQUE,
    plan_tier VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ NULL,
    redeemed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_by_admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```python
def normalize_redeem_code(code: str) -> str:
    return str(uuid.UUID(code.strip()))


async def redeem_plan_code(db, *, user_id, code: str, redeemed_at=None):
    normalized_code = normalize_redeem_code(code)
    activated_at = redeemed_at or utcnow()
    async with db.transaction():
        row = await db.fetchrow(
            """
            UPDATE redeem_codes
               SET redeemed_at = $1,
                   redeemed_by_user_id = $2,
                   updated_at = NOW()
             WHERE code = $3
               AND redeemed_at IS NULL
               AND expires_at > $1
         RETURNING id, plan_tier, expires_at
            """,
            activated_at,
            user_id,
            normalized_code,
        )
        if row is None:
            existing = await db.fetchrow("SELECT redeemed_at, expires_at FROM redeem_codes WHERE code = $1", normalized_code)
            if existing is None:
                raise ValueError("Invalid redeem code")
            if existing["redeemed_at"] is not None:
                raise ValueError("Redeem code already used")
            raise ValueError("Redeem code expired")
        snapshot = await activate_paid_plan(
            db,
            user_id=user_id,
            plan_tier=row["plan_tier"],
            billing_period=MONTHLY_PERIOD,
            activated_at=activated_at,
        )
        await db.execute(
            """
            INSERT INTO redeem_code_redemptions (user_id, redeem_code, plan_tier, billing_period, redeemed_at)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id,
            normalized_code,
            row["plan_tier"],
            MONTHLY_PERIOD,
            activated_at,
        )
        return snapshot
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest BE/tests/test_redeem_codes.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add BE/migrations/024_add_redeem_codes.sql BE/app/main.py BE/app/services/plans.py BE/app/schemas/billing.py BE/tests/test_redeem_codes.py
git commit -m "feat(billing): back redeem codes with uuid records"
```

### Task 2: Add admin APIs for generating and listing redeem codes

**Files:**
- Modify: `BE/app/api/endpoints/admin.py`
- Modify: `BE/app/schemas/admin.py`
- Modify: `BE/app/services/plans.py`
- Test: `tests/backend/test_admin_redeem_codes.py`

- [ ] **Step 1: Write the failing test**

```python
def test_admin_can_generate_basic_code_with_7_day_expiry():
    payload = {"plan_tier": "basic", "expires_in_days": 7}
    response = client.post("/api/admin/redeem-codes", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["plan_tier"] == "basic"
    assert body["code"] == "4dd2d807-2a59-4d2f-9f86-1f3eea2dd3ab"
    assert body["redeemed_at"] is None

def test_admin_can_list_recent_redeem_codes():
    response = client.get("/api/admin/redeem-codes")
    assert response.status_code == 200
    assert response.json()[0]["code"] == "4dd2d807-2a59-4d2f-9f86-1f3eea2dd3ab"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest tests/backend/test_admin_redeem_codes.py -q`

Expected: FAIL because the admin endpoints and response models do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```python
class AdminRedeemCodeCreateRequest(BaseModel):
    plan_tier: Literal["basic", "pro", "premium"]
    expires_in_days: Literal[7, 30] | None = None
    expires_at: datetime | None = None


class AdminRedeemCodeOut(BaseModel):
    id: uuid.UUID
    code: uuid.UUID
    plan_tier: Literal["basic", "pro", "premium"]
    expires_at: datetime
    redeemed_at: datetime | None = None
    redeemed_by_email: str | None = None
    created_at: datetime
```

```python
@router.post("/redeem-codes", response_model=AdminRedeemCodeOut)
async def create_redeem_code(
    payload: AdminRedeemCodeCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(require_admin),
):
    expires_at = payload.expires_at
    if payload.expires_in_days is not None:
        expires_at = utcnow() + timedelta(days=payload.expires_in_days)
    if expires_at is None:
        raise HTTPException(status_code=400, detail="Chưa chọn hạn dùng cho redeem code.")
    return await create_redeem_code_record(db, created_by_admin_id=current_user.id, plan_tier=payload.plan_tier, expires_at=expires_at)


@router.get("/redeem-codes", response_model=list[AdminRedeemCodeOut])
async def list_redeem_codes(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(require_admin),
):
    return await list_redeem_code_records(db)
```

```python
async def create_redeem_code_record(db, *, created_by_admin_id, plan_tier: str, expires_at):
    code_value = str(uuid.uuid4())
    return await db.fetchrow(
        """
        INSERT INTO redeem_codes (code, plan_tier, expires_at, created_by_admin_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, code, plan_tier, expires_at, redeemed_at, redeemed_by_user_id, created_at
        """,
        code_value,
        plan_tier,
        expires_at,
        created_by_admin_id,
    )


async def list_redeem_code_records(db):
    return await db.fetch(
        """
        SELECT rc.id,
               rc.code,
               rc.plan_tier,
               rc.expires_at,
               rc.redeemed_at,
               u.email AS redeemed_by_email,
               rc.created_at
          FROM redeem_codes rc
     LEFT JOIN users u ON u.id = rc.redeemed_by_user_id
      ORDER BY rc.created_at DESC
         LIMIT 100
        """
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest tests/backend/test_admin_redeem_codes.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add BE/app/api/endpoints/admin.py BE/app/schemas/admin.py BE/app/services/plans.py tests/backend/test_admin_redeem_codes.py
git commit -m "feat(admin): add redeem code generator api"
```

### Task 3: Add the admin sidebar tab and generator page

**Files:**
- Modify: `FE/src/App.tsx`
- Modify: `FE/src/pages/admin/AdminLayout.tsx`
- Modify: `FE/src/lib/api.ts`
- Create: `FE/src/pages/admin/AdminRedeemCodes.tsx`
- Test: `FE/src/test/admin-redeem-codes.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("shows redeem codes in the admin sidebar", () => {
  render(<AdminLayout />);
  expect(screen.getByRole("link", { name: /redeem codes/i })).toBeTruthy();
});

it("creates a pro code with a 30 day expiry", async () => {
  render(<AdminRedeemCodes />);
  fireEvent.click(screen.getByRole("button", { name: /pro/i }));
  fireEvent.click(screen.getByRole("button", { name: /30 days/i }));
  fireEvent.click(screen.getByRole("button", { name: /generate code/i }));
  await waitFor(() => expect(createRedeemCode).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/nhatbang/EXE101/PRJ/FE && npm test -- src/test/admin-redeem-codes.test.tsx`

Expected: FAIL because the route, page, and API methods do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// FE/src/pages/admin/AdminLayout.tsx
{ name: language === 'vi' ? 'Redeem code' : 'Redeem Codes', path: '/admin/redeem-codes', icon: Gift, exact: false }
```

```tsx
// FE/src/App.tsx
const AdminRedeemCodes = lazy(() => import("./pages/admin/AdminRedeemCodes").then((module) => ({ default: module.AdminRedeemCodes })));

// inside the /admin route block
<Route path="redeem-codes" element={<AdminRedeemCodes />} />
```

```tsx
// FE/src/lib/api.ts
export interface AdminRedeemCodeOut {
  id: string;
  code: string;
  plan_tier: 'basic' | 'pro' | 'premium';
  expires_at: string;
  redeemed_at?: string | null;
  redeemed_by_email?: string | null;
  created_at: string;
}

// Add these members to the existing `adminApi` object literal.
createRedeemCode: async (payload: {
  plan_tier: 'basic' | 'pro' | 'premium';
  expires_in_days?: 7 | 30;
  expires_at?: string;
}) =>
  request<AdminRedeemCodeOut>('/admin/redeem-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
getRedeemCodes: async () => request<AdminRedeemCodeOut[]>('/admin/redeem-codes'),
```

```tsx
// FE/src/pages/admin/AdminRedeemCodes.tsx
const [planTier, setPlanTier] = useState<'basic' | 'pro' | 'premium'>('basic');
const [expiryMode, setExpiryMode] = useState<'7_days' | '30_days' | 'custom'>('7_days');
const [expiresAt, setExpiresAt] = useState('');
const [generatedCode, setGeneratedCode] = useState<string | null>(null);
await adminApi.createRedeemCode({
  plan_tier: planTier,
  expires_in_days: expiryMode === '7_days' ? 7 : expiryMode === '30_days' ? 30 : undefined,
  expires_at: expiryMode === 'custom' ? expiresAt : undefined,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/nhatbang/EXE101/PRJ/FE && npm test -- src/test/admin-redeem-codes.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/App.tsx FE/src/pages/admin/AdminLayout.tsx FE/src/pages/admin/AdminRedeemCodes.tsx FE/src/lib/api.ts FE/src/test/admin-redeem-codes.test.tsx
git commit -m "feat(admin-ui): add redeem code generator tab"
```

### Task 4: Update user-facing redeem copy and run regression tests

**Files:**
- Modify: `FE/src/pages/Upgrade.tsx`
- Modify: `BE/app/api/endpoints/billing.py`
- Modify: `tests/backend/test_billing_redeem.py`
- Modify: `BE/tests/test_redeem_codes.py`

- [ ] **Step 1: Write the failing test**

```python
def test_old_invera_static_codes_are_rejected():
    response = client.post("/api/billing/redeem", json={"code": "INVERA_BASIC"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Redeem code không hợp lệ."
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest BE/tests/test_redeem_codes.py tests/backend/test_billing_redeem.py -q`

Expected: FAIL before the service logic is switched over.

- [ ] **Step 3: Write minimal implementation**

```tsx
// FE/src/pages/Upgrade.tsx
redeemDescription: 'Bạn có thể kích hoạt gói bằng redeem code UUID do admin cấp. Mỗi code chỉ dùng được 1 lần và có ngày hết hạn.',
```

```python
# BE/app/api/endpoints/billing.py
try:
    snapshot = await redeem_plan_code(db, user_id=current_user.id, code=payload.code)
except ValueError as exc:
    raise HTTPException(status_code=400, detail="Redeem code không hợp lệ.") from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/nhatbang/EXE101/PRJ && BE/.venv/bin/pytest BE/tests/test_redeem_codes.py tests/backend/test_billing_redeem.py -q && cd FE && npm test -- src/test/admin-redeem-codes.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/pages/Upgrade.tsx BE/app/api/endpoints/billing.py tests/backend/test_billing_redeem.py
git commit -m "fix(billing): switch redeem flow to admin-issued uuid codes"
```

### Self-Review Checklist

- [ ] The plan covers the full flow: migration, admin generation, redeem validation, and UI.
- [ ] There are no leftover references to `INVERA_BASIC`, `INVERA_PRO`, or `INVERA_PREMIUM`.
- [ ] Each code is one-time because redemption is claimed atomically in the database.
- [ ] Each code can expire by `7 days`, `30 days`, or exact `expires_at`.
- [ ] The admin UI has a dedicated sidebar tab and a generation form for each plan tier.
- [ ] Every task has a concrete test command and a commit step.
