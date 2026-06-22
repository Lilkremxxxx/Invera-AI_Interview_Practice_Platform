import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import InterviewRoom from "../pages/InterviewRoom";

const getSession = vi.fn();
const submitAnswer = vi.fn();
const completeSession = vi.fn();
const transcribeAnswer = vi.fn();
const submitVideoAnswer = vi.fn();

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

vi.mock("../components/feedback/StructuredFeedback", () => ({
  StructuredFeedback: ({ feedback }: { feedback: string }) => <div>{feedback}</div>,
}));

vi.mock("../components/interview/WebcamTelemetry", () => ({
  WebcamTelemetry: ({
    isRecording,
    onCameraReady,
    onRecordingStart,
    onRecordingStop,
  }: {
    isRecording: boolean;
    onCameraReady?: (stream: MediaStream) => void;
    onRecordingStart: (stream: MediaStream) => void;
    onRecordingStop: (videoBlob: Blob, telemetry: Record<string, unknown>) => void;
  }) => {
    const startedRef = React.useRef(false);

    React.useEffect(() => {
      const stream = {
        getTracks: () => [{ stop: vi.fn() }],
        getVideoTracks: () => [{ readyState: "live" }],
      } as unknown as MediaStream;
      onCameraReady?.(stream);
    }, [onCameraReady]);

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
            gazeRatio: 0.8,
            smileRatio: 0.2,
            slouchRatio: 0.1,
            handGestures: 1,
            fidgetRatio: 0.05,
          },
        );
      }
    }, [isRecording, onRecordingStart, onRecordingStop]);

    return (
      <div>
        <div>Camera mock</div>
      </div>
    );
  },
}));

vi.mock("../lib/api", () => ({
  getLocalizedQuestionCategory: () => "Architecture",
  getLocalizedQuestionText: (question: { text: string }) => question.text,
  sessionsApi: {
    get: (...args: unknown[]) => getSession(...args),
    submitAnswer: (...args: unknown[]) => submitAnswer(...args),
    complete: (...args: unknown[]) => completeSession(...args),
    transcribeAnswer: (...args: unknown[]) => transcribeAnswer(...args),
    submitVideoAnswer: (...args: unknown[]) => submitVideoAnswer(...args),
    createRealtimeSttSocket: () => null,
    synthesizeFeedbackAudio: vi.fn(),
  },
}));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];

  public ondataavailable: ((event: { data: Blob }) => void) | null = null;
  public onstop: (() => void) | null = null;
  public stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
    this.onstop?.();
  });

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }

  start() {}
}

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  public continuous = false;
  public interimResults = false;
  public lang = "";
  public onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: { isFinal: boolean; 0: { transcript: string } };
    };
  }) => void) | null = null;
  public onerror: (() => void) | null = null;
  public onend: (() => void) | null = null;
  public start = vi.fn();
  public stop = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
}

describe("InterviewRoom auto-advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
    });
    FakeMediaRecorder.instances = [];
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    FakeSpeechRecognition.instances = [];
    vi.stubGlobal("webkitSpeechRecognition", FakeSpeechRecognition);
    class FakeAudioContext {
      createMediaStreamDestination() {
        return { stream: { getTracks: () => [] } } as unknown as MediaStreamAudioDestinationNode;
      }
      close() {}
      resume() {}
      suspend() {}
    }
    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal("webkitAudioContext", FakeAudioContext as unknown as typeof AudioContext);
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    getSession.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      major: "frontend",
      role: "frontend",
      level: "junior",
      mode: "camera",
      status: "IN_PROGRESS",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: null,
      time_limit_minutes: null,
      questions: [
        {
          id: 1,
          role: "frontend",
          level: "junior",
          text: "Tell me about a project you built.",
          category: "Architecture",
          difficulty: "medium",
        },
        {
          id: 2,
          role: "frontend",
          level: "junior",
          text: "How do you review a pull request?",
          category: "Process",
          difficulty: "easy",
        },
      ],
      answers: [],
    });
    transcribeAnswer.mockResolvedValue({ text: "transcribed answer" });
    submitVideoAnswer.mockResolvedValue({ text: "transcribed video answer" });
    completeSession.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      major: "frontend",
      role: "frontend",
      level: "junior",
      mode: "camera",
      status: "COMPLETED",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: "2026-05-05T00:01:00Z",
      avg_score: null,
      question_count: 0,
      time_limit_minutes: null,
      evaluation_report: null,
      practice_plan: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes the textbox and advances to the next camera question immediately after stop", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
          <Route path="/app/sessions" element={<div>Sessions list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/project you built/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /record/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(submitVideoAnswer).toHaveBeenCalledWith(
        "session-1",
        expect.any(File),
        expect.objectContaining({
          gazeRatio: 0.8,
          smileRatio: 0.2,
        }),
        "en",
        1,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Question 2 \/ 2/i)).toBeInTheDocument();
    });
  });

  it("removes the textbox in camera mode and advances after the camera recording stops", async () => {
    getSession.mockResolvedValueOnce({
      id: "session-2",
      user_id: "user-1",
      major: "frontend",
      role: "frontend",
      level: "junior",
      mode: "camera",
      status: "IN_PROGRESS",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: null,
      time_limit_minutes: null,
      questions: [
        {
          id: 11,
          role: "frontend",
          level: "junior",
          text: "Describe your debugging workflow.",
          category: "Process",
          difficulty: "medium",
        },
        {
          id: 12,
          role: "frontend",
          level: "junior",
          text: "How do you prioritize bugs?",
          category: "Process",
          difficulty: "easy",
        },
      ],
      answers: [],
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/interview/session-2"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/debugging workflow/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /record/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(submitVideoAnswer).toHaveBeenCalledWith(
        "session-2",
        expect.any(File),
        expect.objectContaining({
          gazeRatio: 0.8,
          smileRatio: 0.2,
        }),
        "en",
        11,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Question 2 \/ 2/i)).toBeInTheDocument();
    });
  });

  it("completes the session after the last answer is recorded", async () => {
    getSession.mockResolvedValueOnce({
      id: "session-3",
      user_id: "user-1",
      major: "frontend",
      role: "frontend",
      level: "junior",
      mode: "camera",
      status: "IN_PROGRESS",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: null,
      time_limit_minutes: null,
      questions: [
        {
          id: 21,
          role: "frontend",
          level: "junior",
          text: "What is a closure?",
          category: "JavaScript",
          difficulty: "easy",
        },
      ],
      answers: [],
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/interview/session-3"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
          <Route path="/app/sessions" element={<div>Sessions list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /record/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(completeSession).toHaveBeenCalledWith("session-3", { generateReport: true });
      expect(screen.getByText("Sessions list")).toBeInTheDocument();
    });
  });
});
