# Live Interviewer Mode Design

**Goal**

Turn `Live session` into an AI-led interview experience that feels more like a real interviewer than a camera recorder. The agent should react to answer quality, ask follow-up questions when needed, and surface a clearer live conversation state in the UI.

**Current State**

- `FE/src/pages/LiveInterviewRoom.tsx` already plays question audio through the live-agent websocket.
- `BE/app/api/endpoints/sessions.py` already has:
  - a `/{session_id}/live-agent` websocket,
  - follow-up question generation via `generate_follow_up_question()`,
  - follow-up scoring via `score_follow_up_answer()`,
  - stored follow-up rows in `interview_follow_ups`.
- `FE/src/components/interview/WebcamTelemetry.tsx` already collects live camera telemetry, but the screen does not yet use it to drive interviewer behavior.

**Scope**

- Keep the existing camera recording flow and answer submission flow.
- Upgrade live mode so the AI can:
  - open each question with a natural interview lead-in,
  - decide whether to ask a follow-up based on answer quality,
  - explain why it is moving on or probing deeper,
  - expose richer live states in the UI.
- Do not change the session creation flow, billing, or non-live camera mode behavior.

**Design**

1. Interview state machine

- Treat each main question as a short conversation turn with four states:
  - `presenting`: the agent introduces or reads the current question.
  - `listening`: the candidate is answering on camera.
  - `probing`: the agent decides to ask a follow-up.
  - `transitioning`: the agent confirms the answer and moves to the next question.
- Replace the current binary `idle/speaking` mental model in `LiveInterviewRoom` with these interview states in the UI copy only. The socket can still use `agent_status` internally, but the screen should render a clearer phase label.

2. Threshold-based follow-up logic

- After each submitted answer, evaluate it with the existing scoring pipeline.
- Use score bands to choose the next behavior:
  - high score: skip follow-up and transition forward,
  - medium score: ask one clarification or example question,
  - low score: ask one simpler grounding or correction question.
- Reuse `adaptive_interview.generate_follow_up_question()` for the follow-up text.
- Reuse `score_follow_up_answer()` only when the user answers the follow-up.
- Keep the follow-up to one concise question sentence.
- If follow-up generation fails, fall back to a deterministic question so the flow never stalls.

3. Live agent behavior

- Keep the existing websocket route `/{session_id}/live-agent`.
- Expand the event stream semantics so the frontend can tell whether the agent is:
  - reading the main question,
  - thinking about a follow-up,
  - asking the follow-up,
  - or transitioning to the next topic.
- The agent transcript should read like a short interviewer script, not a raw TTS dump. Prefer short lines such as:
  - "Thanks. Let me push on that a bit."
  - "Can you give one concrete example?"
  - "That is clear. Let us move on."

4. UI changes in `LiveInterviewRoom`

- Make the left panel feel like an interviewer console instead of a simple speaker widget.
- Show:
  - current phase,
  - question number,
  - answer quality hint,
  - and a short agent line for the current turn.
- Keep the right panel as the candidate camera surface, but add a small live cue that explains why the current turn is happening.
- Continue to block answer submission while the agent is speaking.
- Keep the existing end-session flow and session completion redirect.

5. Telemetry influence

- Use telemetry only as a soft signal, not as a hard gate.
- If the answer is technically okay but telemetry suggests low confidence, add a lighter follow-up instead of a harder one.
- Do not make camera posture or eye contact the sole reason to fail a response.
- Telemetry should influence the follow-up style bucket, not overwrite the actual answer score.

**Data Flow**

1. The agent reads the main question through the websocket.
2. The candidate answers on camera and the frontend submits the recording with telemetry.
3. The backend scores the answer.
4. The backend chooses whether to generate a follow-up.
5. If a follow-up is generated, it is stored with the parent answer and the agent speaks it.
6. The candidate answers the follow-up only when needed.
7. The session advances once the turn is complete.

**Backend Notes**

- Preserve the existing `answers` and `interview_follow_ups` schema.
- No new session type is required.
- Any future state labels should be derived from existing records and websocket events, not from a separate long-lived state table.
- Keep live-agent failure handling graceful:
  - if TTS fails, fall back to text only,
  - if follow-up generation fails, skip to the next phase,
  - if scoring fails, record the error but do not break the session.

**Frontend Notes**

- `LiveInterviewRoom.tsx` should own the interview phase UI.
- `WebcamTelemetry.tsx` should remain focused on recording and telemetry capture.
- Avoid coupling camera preview logic to the live-agent websocket.
- The UI should make it obvious when the agent is:
  - reading,
  - probing,
  - waiting,
  - or moving on.

**Risks**

- If the live-agent websocket still only emits generic `speaking/idle` states, the frontend can only partially improve the experience until the event schema is expanded.
- Over-aggressive follow-up rules can make the flow feel punitive.
- Telemetry noise can distort the sense of answer quality if it is treated as primary scoring data.
- The main `LiveInterviewRoom` file may grow quickly, so the phase rendering should be extracted if it starts to become unreadable.

**Validation**

- Backend tests for:
  - live-agent websocket response shape,
  - follow-up generation on medium and low answer scores,
  - follow-up fallback when generation fails,
  - follow-up scoring path after a generated question.
- Frontend tests for:
  - phase label rendering,
  - live transcript copy for speaking/probing/transitioning,
  - reconnect and replay-question controls remaining functional.
- Manual check:
  - a live session should feel like a short back-and-forth interview, not a question reader.
