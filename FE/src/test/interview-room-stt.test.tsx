import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import InterviewRoom from "../pages/InterviewRoom";

const getSession = vi.fn();
const submitAnswer = vi.fn();
const completeSession = vi.fn();
const transcribeAnswer = vi.fn();
const synthesizeFeedbackAudio = vi.fn();

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("../components/feedback/StructuredFeedback", () => ({
  StructuredFeedback: ({ feedback }: { feedback: string }) => <div>{feedback}</div>,
}));

vi.mock("../lib/mock-data", () => ({
  roleLabelMap: {
    frontend: { en: "Frontend", vi: "Frontend" },
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
    synthesizeFeedbackAudio: (...args: unknown[]) => synthesizeFeedbackAudio(...args),
  },
}));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];

  public ondataavailable: ((event: { data: Blob }) => void) | null = null;
  public onstop: (() => void) | null = null;
  public stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) });
    this.onstop?.();
  });

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }

  start() {}
}

describe("InterviewRoom STT", () => {
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
      mode: "voice",
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
      ],
      answers: [],
    });
    transcribeAnswer.mockResolvedValue({ text: "transcribed answer" });
    synthesizeFeedbackAudio.mockResolvedValue({
      tts_script: "English feedback. Vietnamese feedback.",
      tts_audio_url: "/media/interview-tts/answer-1.wav",
    });
    localStorage.setItem("invera_tts", "true");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads recorded audio on stop and appends the returned transcript", async () => {
    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    const textbox = await screen.findByRole("textbox");
    fireEvent.change(textbox, { target: { value: "typed intro" } });

    fireEvent.click(screen.getByRole("button", { name: /voice/i }));
    fireEvent.click(await screen.findByRole("button", { name: /stop/i }));

    await waitFor(() => {
      expect(transcribeAnswer).toHaveBeenCalledTimes(1);
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("typed intro");
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("transcribed answer");
    });
  });

  it("shows a recording countdown badge and auto-stops at the duration limit", async () => {
    let recordingTick: (() => void) | null = null;
    vi.spyOn(window, "setInterval").mockImplementation(((callback: TimerHandler) => {
      recordingTick = callback as () => void;
      return 1;
    }) as typeof window.setInterval);
    vi.spyOn(window, "clearInterval").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("textbox");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /voice/i }));
      await Promise.resolve();
    });

    expect(screen.getByText(/recording/i)).toBeInTheDocument();
    expect(screen.getByText(/02:00/)).toBeInTheDocument();

    act(() => {
      for (let index = 0; index < 120; index += 1) {
        recordingTick?.();
      }
    });

    await waitFor(() => {
      expect(FakeMediaRecorder.instances).toHaveLength(1);
      expect(FakeMediaRecorder.instances[0].stop).toHaveBeenCalledTimes(1);
      expect(transcribeAnswer).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the submitted answer visible and only plays TTS after the user clicks", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audioConstructor = vi.fn().mockImplementation(() => ({
      play,
      pause,
      currentTime: 0,
    }));
    vi.stubGlobal("Audio", audioConstructor);
    submitAnswer.mockResolvedValue({
      id: "answer-1",
      session_id: "session-1",
      question_id: 1,
      answer_text: "typed answer",
      score: 7.4,
      feedback: "Detailed rubric feedback",
      submitted_at: "2026-05-05T00:00:00Z",
      tts_script: "English feedback. Vietnamese feedback.",
      tts_audio_url: null,
    });

    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    const textbox = await screen.findByRole("textbox");
    fireEvent.change(textbox, { target: { value: "typed answer" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Your answer")).toBeInTheDocument();
      expect(screen.getByText("typed answer")).toBeInTheDocument();
      expect(screen.getByText("Detailed rubric feedback")).toBeInTheDocument();
    });

    expect(audioConstructor).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /listen to feedback/i }));

    await waitFor(() => {
      expect(synthesizeFeedbackAudio).toHaveBeenCalledWith("session-1", "answer-1");
      expect(audioConstructor).toHaveBeenCalledWith("/media/interview-tts/answer-1.wav");
      expect(play).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles feedback audio between play pause and resume", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audioConstructor = vi.fn().mockImplementation(() => ({
      play,
      pause,
      currentTime: 0,
      onended: null,
      onpause: null,
      onplay: null,
    }));
    vi.stubGlobal("Audio", audioConstructor);
    submitAnswer.mockResolvedValue({
      id: "answer-1",
      session_id: "session-1",
      question_id: 1,
      answer_text: "typed answer",
      score: 7.4,
      feedback: "Detailed rubric feedback",
      submitted_at: "2026-05-05T00:00:00Z",
      tts_script: "English feedback. Vietnamese feedback.",
      tts_audio_url: null,
    });

    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "typed answer" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    fireEvent.click(await screen.findByRole("button", { name: /listen to feedback/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^pause$/i })).toBeInTheDocument();
      expect(play).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /^pause$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
      expect(pause).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));

    await waitFor(() => {
      expect(play).toHaveBeenCalledTimes(2);
      expect(audioConstructor).toHaveBeenCalledTimes(1);
      expect(synthesizeFeedbackAudio).toHaveBeenCalledTimes(1);
    });
  });
});
