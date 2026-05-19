import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NewSession from "../pages/NewSession";

const catalog = vi.fn();
const createSession = vi.fn();

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_section: string, key: string) => key,
  }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: {
      can_start_new_session: true,
    },
  }),
}));

vi.mock("../lib/plans", () => ({
  resolveSessionTimeLimitId: () => "5",
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload: unknown = null) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  },
  sessionsApi: {
    catalog: (...args: unknown[]) => catalog(...args),
    create: (...args: unknown[]) => createSession(...args),
  },
}));

describe("NewSession configuration", () => {
  beforeEach(() => {
    catalog.mockResolvedValue([
      {
        major: "technology",
        role: "frontend",
        total_questions: 30,
        counts_by_level: {
          intern: 10,
          fresher: 10,
          junior: 10,
          mid: 10,
          senior: 10,
        },
      },
    ]);

    createSession.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      major: "technology",
      role: "frontend",
      level: "junior",
      mode: "voice",
      status: "IN_PROGRESS",
      created_at: "2026-05-05T00:00:00Z",
      completed_at: null,
      avg_score: null,
      question_count: 10,
      time_limit_minutes: 50,
      questions: [],
      answers: [],
    });
  });

  it("shows text and voice only and calculates five minutes per question", async () => {
    render(
      <MemoryRouter initialEntries={["/app/new"]}>
        <Routes>
          <Route path="/app/new" element={<NewSession />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: /frontend developer/i });

    fireEvent.click(screen.getByRole("button", { name: /frontend developer/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText(/junior/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("button", { name: /text/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /video/i })).not.toBeInTheDocument();
    expect(screen.getByText(/5 min\s*\/\s*question/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^10$/ }));
    fireEvent.click(screen.getByRole("button", { name: /easy/i }));
    fireEvent.click(screen.getByRole("button", { name: /voice/i }));

    expect(screen.getAllByText(/50 min/i)).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: /startInterview/i })[1]);

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          major: "technology",
          role: "frontend",
          level: "junior",
          mode: "voice",
          question_count: 10,
        }),
      );
      expect(createSession.mock.calls[0][0]).not.toHaveProperty("time_limit_minutes");
    });
  });
});
