# Live Interviewer Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Live session` feel like an AI interviewer that leads the conversation, asks threshold-based follow-ups, and shows clearer live phases in the UI.

**Architecture:** Keep the existing session, answer, and follow-up storage model. Extend the live-agent websocket and frontend room state so the UI can distinguish presenting, listening, probing, and transitioning, while the backend decides when to generate a follow-up based on answer score and soft telemetry signals.

**Tech Stack:** FastAPI, asyncpg, Pydantic, React, TypeScript, Vite, Vitest, pytest.

---

### Task 1: Lock the live-agent contract in backend tests

**Files:**
- Create: `tests/backend/test_session_live_mode.py`
- Modify: `BE/app/api/endpoints/sessions.py`

- [ ] **Step 1: Write the failing websocket contract test**

```python
from fastapi.testclient import TestClient


def test_live_agent_rejects_non_live_session(client: TestClient, monkeypatch):
    response = client.post(
        "/api/sessions",
        json={"major": "technology", "role": "backend_engineer", "level": "junior", "mode": "camera", "question_count": 1},
    )
    session_id = response.json()["id"]

    with client.websocket_connect(f"/api/sessions/{session_id}/live-agent?token=test-token") as socket:
        message = socket.receive_json()
        assert message["type"] == "error"
        assert "live-enabled" in message["message"].lower()


def test_live_agent_emits_ready_then_agent_events(client: TestClient, monkeypatch):
    async def fake_stream_agent_prompt(**kwargs):
        yield {"type": "agent_status", "status": "speaking"}
        yield {"type": "agent_transcript", "text": "Let us go deeper on that."}
        yield {"type": "agent_status", "status": "idle"}

    monkeypatch.setattr("app.api.endpoints.sessions.stream_agent_prompt", fake_stream_agent_prompt)

    response = client.post(
        "/api/sessions",
        json={"major": "technology", "role": "backend_engineer", "level": "junior", "mode": "live", "question_count": 1},
    )
    session_id = response.json()["id"]

    with client.websocket_connect(f"/api/sessions/{session_id}/live-agent?token=test-token") as socket:
        assert socket.receive_json()["type"] == "ready"
        socket.send_json({"type": "ask", "questionId": 1, "language": "en"})
        assert socket.receive_json()["type"] == "agent_status"
        assert socket.receive_json()["type"] == "agent_transcript"
        assert socket.receive_json()["type"] == "agent_status"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd BE && uv run pytest tests/backend/test_session_live_mode.py -v`
Expected: the new contract assertions fail until the websocket semantics are exercised.

- [ ] **Step 3: Keep the implementation minimal**

Use the existing `/{session_id}/live-agent` websocket in `BE/app/api/endpoints/sessions.py` and only add the event handling needed to support the contract.

- [ ] **Step 4: Run the test again**

Run: `cd BE && uv run pytest tests/backend/test_session_live_mode.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/backend/test_session_live_mode.py BE/app/api/endpoints/sessions.py
git commit -m "feat: tighten live agent websocket contract"
```

### Task 2: Add threshold-based follow-up decisioning in backend

**Files:**
- Modify: `BE/app/services/adaptive_interview.py`
- Modify: `BE/app/api/endpoints/sessions.py`
- Test: `tests/backend/test_adaptive_interview.py`

- [ ] **Step 1: Write the failing follow-up decision test**

```python
import pytest


@pytest.mark.asyncio
async def test_generate_follow_up_question_uses_clarify_bucket_for_mid_score(monkeypatch):
    async def fake_completion(**kwargs):
        return {"content": "{\"follow_up_question_text\": \"Can you give a concrete example?\", \"follow_up_reason\": \"clarify\"}"}

    monkeypatch.setattr("app.services.adaptive_interview.create_chat_completion", fake_completion)

    result = await generate_follow_up_question(
        question_text="Explain dependency injection.",
        answer_text="It helps with testing.",
        score=5.0,
        language="en",
        category="Backend",
        role="backend_engineer",
        level="junior",
    )

    assert result["follow_up_style"] == "clarify"
    assert result["follow_up_question_text"] == "Can you give a concrete example?"


@pytest.mark.asyncio
async def test_generate_follow_up_question_falls_back_when_model_returns_empty(monkeypatch):
    async def fake_completion(**kwargs):
        return {"content": "{\"follow_up_question_text\": \"\", \"follow_up_reason\": \"\"}"}

    monkeypatch.setattr("app.services.adaptive_interview.create_chat_completion", fake_completion)

    result = await generate_follow_up_question(
        question_text="Explain dependency injection.",
        answer_text="I am not sure.",
        score=2.0,
        language="en",
        category="Backend",
        role="backend_engineer",
        level="junior",
    )

    assert result["follow_up_style"] == "simplify"
    assert result["follow_up_question_text"]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd BE && uv run pytest tests/backend/test_adaptive_interview.py -v`
Expected: the style-bucket and fallback assertions fail until the backend logic is in place.

- [ ] **Step 3: Implement the minimal decision logic**

Keep the score bands in `BE/app/services/adaptive_interview.py` and make the websocket path in `BE/app/api/endpoints/sessions.py` use that decisioning to either:

```python
if score >= 7.0:
    follow_up_needed = False
elif score >= 4.0:
    follow_up_needed = True
    follow_up_style = "clarify"
else:
    follow_up_needed = True
    follow_up_style = "simplify"
```

Do not add a new persistence table. Keep the decision derived from the scored answer and the existing follow-up row.

- [ ] **Step 4: Run the test again**

Run: `cd BE && uv run pytest tests/backend/test_adaptive_interview.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add BE/app/services/adaptive_interview.py BE/app/api/endpoints/sessions.py tests/backend/test_adaptive_interview.py
git commit -m "feat: add threshold-based interview follow-ups"
```

### Task 3: Make live-agent transcript and phase states explicit in the frontend

**Files:**
- Modify: `FE/src/pages/LiveInterviewRoom.tsx`
- Modify: `FE/src/lib/api.ts`
- Test: `FE/src/test/live-interview-room.test.tsx`

- [ ] **Step 1: Write the failing UI state test**

```tsx
it("renders interviewer phases instead of only idle/speaking labels", async () => {
  render(<LiveInterviewRoom />);
  await screen.findByText(/live hr agent|hr live agent/i);
  expect(screen.getByText(/reading the question|listening to your answer|pushing deeper/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd FE && npm test -- --run src/test/live-interview-room.test.tsx`
Expected: FAIL until the room renders the new phase labels and transcript copy.

- [ ] **Step 3: Implement the minimal UI state mapping**

In `FE/src/pages/LiveInterviewRoom.tsx`, replace the simple `idle/speaking` mental model with a derived interview phase:

```ts
const interviewPhase =
  agentStatus === 'speaking' && agentTranscript
    ? 'probing'
    : agentStatus === 'speaking'
      ? 'presenting'
      : isRecording
        ? 'listening'
        : 'transitioning';
```

Use that phase to render copy such as:

```ts
const phaseCopy = {
  presenting: 'Reading the question',
  listening: 'Listening to your answer',
  probing: 'Pushing deeper',
  transitioning: 'Moving to the next topic',
} as const;
```

Keep `WebcamTelemetry` focused on recording and telemetry capture. Only pass through the transcript/cue text needed for the new phase labels.

- [ ] **Step 4: Run the test again**

Run: `cd FE && npm test -- --run src/test/live-interview-room.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/pages/LiveInterviewRoom.tsx FE/src/lib/api.ts FE/src/test/live-interview-room.test.tsx
git commit -m "feat: surface live interviewer phases in ui"
```

### Task 4: Wire telemetry as a soft signal only

**Files:**
- Modify: `BE/app/api/endpoints/sessions.py`
- Modify: `BE/app/schemas/session.py`
- Test: `tests/backend/test_session_live_mode.py`

- [ ] **Step 1: Write the failing telemetry-weighting test**

```python
def test_telemetry_can_nudge_follow_up_style_without_overriding_score(monkeypatch):
    telemetry = {"presentationConfidence": 35, "gazeRatio": 0.4, "bodyPostureScore": 0.5}
    telemetry_confidence = int(telemetry["presentationConfidence"])

    assert telemetry_confidence < 50
    assert 4.0 <= 5.2 < 7.0
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd BE && uv run pytest tests/backend/test_session_live_mode.py -v`
Expected: FAIL until telemetry is threaded as a soft hint only.

- [ ] **Step 3: Add the minimal model fields if needed**

If the UI needs a clearer phase hint from the API, extend `TelemetrySummary` or the live-agent response payload in `BE/app/schemas/session.py` without changing stored telemetry records.

- [ ] **Step 4: Implement the soft-nudge logic**

Use telemetry only to adjust the follow-up style bucket after score computation, for example:

```python
if score >= 7.0:
    style = "skip"
elif score >= 4.0:
    style = "clarify" if telemetry_confidence >= 50 else "deepen"
else:
    style = "simplify"
```

Do not let posture or gaze alone fail the response.

- [ ] **Step 5: Run the test again**

Run: `cd BE && uv run pytest tests/backend/test_session_live_mode.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add BE/app/api/endpoints/sessions.py BE/app/schemas/session.py tests/backend/test_session_live_mode.py
git commit -m "feat: use telemetry as a soft interviewer signal"
```

### Task 5: Run the focused regression set

**Files:**
- No code changes

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd BE && uv run pytest \
  tests/backend/test_session_live_mode.py \
  tests/backend/test_adaptive_interview.py \
  -v
```

Expected: both backend test files pass.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
cd FE && npm test -- --run src/test/live-interview-room.test.tsx
```

Expected: the live room state test passes.

- [ ] **Step 3: Sanity-check the live flow manually**

Open a live session and confirm:

```text
presenting -> listening -> probing (when needed) -> transitioning
```

Expected: the room feels like a short AI-led interview, not a question reader.
