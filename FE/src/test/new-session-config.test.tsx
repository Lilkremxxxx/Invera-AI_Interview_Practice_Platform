import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NewSession from "../pages/NewSession";

const catalog = vi.fn();
const createSession = vi.fn();
const navigate = vi.fn();
let mockUser = {
  can_start_new_session: true,
  plan_tier: "pro",
  plan_status: "active",
};

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_section: string, key: string) => key,
  }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: mockUser,
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
    navigate.mockClear();
    createSession.mockClear();
    sessionStorage.clear();
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
      mode: "camera",
      language: "en",
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

  it("shows camera and live session only and calculates five minutes per question", async () => {
    mockUser = {
      can_start_new_session: true,
      plan_tier: "pro",
      plan_status: "active",
    };

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/new"]}>
        <Routes>
          <Route path="/app/new" element={<NewSession />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: /frontend developer/i });

    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vietnamese/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /english/i }));
    fireEvent.click(screen.getByRole("button", { name: /frontend developer/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText(/junior/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getAllByRole("button", { name: /camera/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /live session/i })[0]).toBeInTheDocument();
    expect(screen.getAllByText(/5 min\s*\/\s*question/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^10$/ }));
    fireEvent.click(screen.getByRole("button", { name: /easy/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /camera/i })[0]);

    fireEvent.click(screen.getAllByRole("button", { name: /startInterview/i })[1]);

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
          expect(createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            major: "technology",
            role: "frontend",
            level: "junior",
            mode: "camera",
            language: "en",
            question_count: 10,
          }),
        );
      expect(createSession.mock.calls[0][0]).not.toHaveProperty("time_limit_minutes");
    });
  });

  it("sends basic users to upgrade when they choose live session", async () => {
    mockUser = {
      can_start_new_session: true,
      plan_tier: "basic",
      plan_status: "active",
    };

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/new"]}>
        <Routes>
          <Route path="/app/new" element={<NewSession />} />
          <Route path="/app/upgrade" element={<div>Upgrade page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: /frontend developer/i });

    fireEvent.click(screen.getByRole("button", { name: /frontend developer/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText(/junior/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /live session/i })[0]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/app/upgrade");
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("supports a live-only setup route", async () => {
    mockUser = {
      can_start_new_session: true,
      plan_tier: "pro",
      plan_status: "active",
    };

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/live"]}>
        <Routes>
          <Route path="/app/live" element={<NewSession />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: /frontend developer/i });

    fireEvent.click(screen.getByRole("button", { name: /frontend developer/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText(/junior/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("button", { name: /live session/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /live session/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^10$/ }));
    fireEvent.click(screen.getByRole("button", { name: /easy/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /startInterview/i })[1]);

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "live",
        }),
      );
    });
  });
});
