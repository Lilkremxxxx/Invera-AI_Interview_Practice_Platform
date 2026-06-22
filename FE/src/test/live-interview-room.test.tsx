import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LiveInterviewRoom from "../pages/LiveInterviewRoom";

const getSession = vi.fn();
const submitVideoAnswer = vi.fn();
const completeSession = vi.fn();
const createLiveAgentSocket = vi.fn();
const sendSpy = vi.fn();
const closeSpy = vi.fn();
const liveSocket = {
  readyState: 1,
  send: sendSpy,
  close: closeSpy,
  onmessage: null as ((event: { data: string }) => void) | null,
  onerror: null as (() => void) | null,
};

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("../lib/mock-data", () => ({
  roleLabelMap: {
    frontend: { en: "Frontend", vi: "Frontend" },
  },
}));

vi.mock("../components/interview/WebcamTelemetry", () => ({
  WebcamTelemetry: ({
    isRecording,
    onRecordingStart,
    onRecordingStop,
  }: {
    isRecording: boolean;
    onRecordingStart: (stream: MediaStream) => void;
    onRecordingStop: (videoBlob: Blob, telemetry: Record<string, unknown>) => void;
  }) => {
    const startedRef = React.useRef(false);

    React.useEffect(() => {
      const stream = {
        getTracks: () => [{ stop: vi.fn() }],
        getVideoTracks: () => [{ readyState: "live" }],
      } as unknown as MediaStream;

      if (isRecording && !startedRef.current) {
        startedRef.current = true;
        onRecordingStart(stream);
        return;
      }

      if (!isRecording && startedRef.current) {
        startedRef.current = false;
        onRecordingStop(
          new Blob(["video"], { type: "video/webm" }),
          {
            gazeRatio: 0.81,
            smileRatio: 0.19,
            slouchRatio: 0.09,
            handGestures: 2,
            fidgetRatio: 0.04,
          },
        );
      }
    }, [isRecording, onRecordingStart, onRecordingStop]);

    return <div>Live camera mock</div>;
  },
}));

vi.mock("../lib/api", () => ({
  getLocalizedQuestionText: (question: { text: string }) => question.text,
  sessionsApi: {
    get: (...args: unknown[]) => getSession(...args),
    submitVideoAnswer: (...args: unknown[]) => submitVideoAnswer(...args),
    complete: (...args: unknown[]) => completeSession(...args),
    createLiveAgentSocket: (...args: unknown[]) => createLiveAgentSocket(...args),
  },
}));

describe("LiveInterviewRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveSocket.onmessage = null;
    liveSocket.onerror = null;
    createLiveAgentSocket.mockReturnValue(liveSocket);
    Object.defineProperty(globalThis, "WebSocket", {
      value: { OPEN: 1 },
      writable: true,
      configurable: true,
    });

    getSession.mockResolvedValue({
      id: "session-live-1",
      user_id: "user-1",
      major: "technology",
      role: "frontend",
      level: "junior",
      mode: "live",
      status: "IN_PROGRESS",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: null,
      questions: [
        {
          id: 101,
          role: "frontend",
          level: "junior",
          text: "Tell me about a project you shipped.",
          category: "Projects",
          difficulty: "medium",
        },
      ],
      answers: [],
    });

    submitVideoAnswer.mockResolvedValue({ text: "processing" });
    completeSession.mockResolvedValue({
      id: "session-live-1",
      user_id: "user-1",
      major: "technology",
      role: "frontend",
      level: "junior",
      mode: "live",
      status: "COMPLETED",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: "2026-05-05T00:03:00Z",
      avg_score: null,
      question_count: 1,
      time_limit_minutes: null,
      evaluation_report: null,
      practice_plan: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the live agent and advances after the answer is submitted", async () => {
    let resolveSubmit: ((value: { text: string }) => void) | null = null;
    submitVideoAnswer.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/live/session-live-1"]}>
        <Routes>
          <Route path="/app/live/:id" element={<LiveInterviewRoom />} />
          <Route path="/app/sessions/:id" element={<div>Session detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/tell me about a project you shipped/i);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Connecting").length).toBeGreaterThan(0);
    expect(screen.getByText("Connecting to the live agent.")).toBeInTheDocument();

    // Simulate the websocket ready event so the page requests the first question.
    await act(async () => {
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "ready" }),
      });
    });

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: "ask",
          questionId: 101,
          language: "vi",
        }),
      );
    });
    expect(screen.getAllByText("Transitioning").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for the live agent to start the question.")).toBeInTheDocument();

    await act(async () => {
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "agent_status", status: "speaking" }),
      });
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "agent_transcript", text: "Tell me about a project you shipped." }),
      });
    });

    expect(screen.getAllByText("Presenting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tell me about a project you shipped.")).toHaveLength(2);

    await act(async () => {
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "agent_status", status: "idle" }),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /start answer/i }));
    expect(screen.getAllByText("Listening").length).toBeGreaterThan(0);
    expect(screen.getByText("Answer naturally. The recording is running.")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /stop answer/i }));

    await waitFor(() => {
      expect(submitVideoAnswer).toHaveBeenCalledWith(
        "session-live-1",
        expect.any(File),
        expect.objectContaining({
          gazeRatio: 0.81,
          smileRatio: 0.19,
        }),
        "vi",
        101,
      );
    });
    expect(screen.getAllByText("Transitioning").length).toBeGreaterThan(0);
    expect(screen.getByText("Saving your answer and preparing the next step.")).toBeInTheDocument();

    await act(async () => {
      resolveSubmit?.({ text: "processing" });
    });

    await waitFor(() => {
      expect(completeSession).toHaveBeenCalledWith("session-live-1", { generateReport: true });
      expect(screen.getByText("Session detail")).toBeInTheDocument();
    });
  });

  it("preserves replay and reconnect controls while surfacing probing state", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/live/session-live-1"]}>
        <Routes>
          <Route path="/app/live/:id" element={<LiveInterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/tell me about a project you shipped/i);

    await act(async () => {
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "ready" }),
      });
    });

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: "ask",
          questionId: 101,
          language: "vi",
        }),
      );
    });

    await act(async () => {
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "agent_transcript", text: "Give one concrete example with results." }),
      });
      liveSocket.onmessage?.({
        data: JSON.stringify({ type: "agent_status", status: "idle" }),
      });
    });

    expect(screen.getAllByText("Probing").length).toBeGreaterThan(0);
    expect(screen.getByText("Give one concrete example with results.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /replay question/i }));

    await waitFor(() => {
      expect(sendSpy).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: "ask",
          questionId: 101,
          language: "vi",
        }),
      );
    });

    await act(async () => {
      liveSocket.onerror?.();
    });

    const reconnectButton = await screen.findByRole("button", { name: /reconnect/i });
    expect(reconnectButton).toBeInTheDocument();

    fireEvent.click(reconnectButton);

    await waitFor(() => {
      expect(createLiveAgentSocket).toHaveBeenCalledTimes(2);
    });
  });
});
