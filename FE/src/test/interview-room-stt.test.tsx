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
    FakeSpeechRecognition.instances = [];
    vi.stubGlobal("webkitSpeechRecognition", FakeSpeechRecognition);
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

    fireEvent.click(screen.getByRole("button", { name: /^voice$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(transcribeAnswer).toHaveBeenCalledTimes(1);
      expect(transcribeAnswer).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({ name: "session-session-1.webm" }),
        "vi",
        1,
      );
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("typed intro");
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("transcribed answer");
    });
  });

  it("uses backend Vietnamese STT even when browser speech recognition returns a final transcript", async () => {
    transcribeAnswer.mockResolvedValue({ text: "EventListener là API để lắng nghe sự kiện." });

    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /^voice$/i }));

    await waitFor(() => {
      expect(FakeSpeechRecognition.instances[0]?.lang).toBe("vi-VN");
    });

    act(() => {
      FakeSpeechRecognition.instances[0].onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: "EventListener is a line in JavaScript." },
          },
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(transcribeAnswer).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({ name: "session-session-1.webm" }),
        "vi",
        1,
      );
      expect(screen.getByRole("textbox")).toHaveValue("EventListener là API để lắng nghe sự kiện.");
    });
  });

  it("lets the user switch voice recognition to English for the next recording", async () => {
    transcribeAnswer.mockResolvedValue({ text: "EventListener is an API for listening to events." });
    submitAnswer.mockResolvedValue({
      id: "answer-1",
      session_id: "session-1",
      question_id: 1,
      answer_text: "EventListener is an API for listening to events.",
      score: 7.4,
      feedback: "Detailed rubric feedback",
      submitted_at: "2026-05-05T00:00:00Z",
      tts_script: "English feedback.",
      tts_audio_url: null,
    });

    render(
      <MemoryRouter initialEntries={["/app/interview/session-1"]}>
        <Routes>
          <Route path="/app/interview/:id" element={<InterviewRoom />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /english voice input/i }));
    fireEvent.click(screen.getByRole("button", { name: /^voice$/i }));

    await waitFor(() => {
      expect(FakeSpeechRecognition.instances[0]?.lang).toBe("en-US");
    });

    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(transcribeAnswer).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({ name: "session-session-1.webm" }),
        "en",
        1,
      );
      expect(screen.getByRole("textbox")).toHaveValue("EventListener is an API for listening to events.");
    });

    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(submitAnswer).toHaveBeenCalledWith("session-1", {
        question_id: 1,
        answer_text: "EventListener is an API for listening to events.",
        output_language: "en",
      });
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
      fireEvent.click(screen.getByRole("button", { name: /^voice$/i }));
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

  it("keeps the submitted answer visible and only prepares TTS after the user clicks", async () => {
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

    expect(screen.queryByLabelText(/feedback audio player/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /listen to feedback/i }));

    await waitFor(() => {
      expect(synthesizeFeedbackAudio).toHaveBeenCalledWith("session-1", "answer-1");
      expect(screen.getByLabelText(/feedback audio player/i)).toHaveAttribute("controls");
      expect(screen.getByLabelText(/feedback audio player/i)).toHaveAttribute("src", "/media/interview-tts/answer-1.wav");
    });
  });

  it("shows a random animated mascot when feedback arrives", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75);
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

    const mascot = await screen.findByAltText("Invera feedback mascot");

    expect(mascot).toHaveAttribute("src", "/mascot/animation-5.png");
    expect(mascot).toHaveClass("animate-mascot-spark");
  });

  it("renders native controls for an existing feedback audio URL", async () => {
    submitAnswer.mockResolvedValue({
      id: "answer-1",
      session_id: "session-1",
      question_id: 1,
      answer_text: "typed answer",
      score: 7.4,
      feedback: "Detailed rubric feedback",
      submitted_at: "2026-05-05T00:00:00Z",
      tts_script: "English feedback. Vietnamese feedback.",
      tts_audio_url: "/media/interview-tts/answer-1.wav",
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

    await waitFor(() => {
      expect(screen.getByLabelText(/feedback audio player/i)).toHaveAttribute("controls");
      expect(screen.getByLabelText(/feedback audio player/i)).toHaveAttribute("src", "/media/interview-tts/answer-1.wav");
    });

    expect(synthesizeFeedbackAudio).not.toHaveBeenCalled();
  });
});
