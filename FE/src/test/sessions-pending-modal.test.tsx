import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

import Sessions from "../pages/Sessions";
import { PENDING_SESSION_COMPLETION_KEY } from "../lib/session-completion";

const testState = vi.hoisted(() => ({
  sessionsData: [] as Array<{
    id: string;
    role: string;
    level: string;
    mode: string;
    status: string;
    created_at: string;
    question_count: number;
    avg_score: number | null;
    evaluation_report: string | null;
  }>,
  downloadAllPdf: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: testState.sessionsData,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "vi",
    t: (_section: string, key: string) => key,
  }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: { id: "user-1", is_admin: false, plan_tier: "pro", plan_status: "active" },
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../lib/mock-data", () => ({
  roleLabelMap: {
    frontend: { en: "Frontend", vi: "Frontend" },
  },
}));

vi.mock("../lib/plans", () => ({
  canExportSessions: () => false,
}));

vi.mock("../lib/score", () => ({
  formatScore: (score: number | null) => (score == null ? "-" : `${score}`),
  getScoreTextClass: () => "",
}));

vi.mock("../lib/api", () => ({
  sessionsApi: {
    downloadAllPdf: testState.downloadAllPdf,
  },
}));

describe("Sessions pending completion modal", () => {
  beforeEach(() => {
    sessionStorage.clear();
    testState.sessionsData = [];
    testState.downloadAllPdf.mockReset();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("shows the pending grading modal when a completion marker exists", async () => {
    sessionStorage.setItem(
      PENDING_SESSION_COMPLETION_KEY,
      JSON.stringify({
        sessionId: "session-1",
        status: "completing",
        startedAt: Date.now(),
      }),
    );
    testState.sessionsData = [
      {
        id: "session-1",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "IN_PROGRESS",
        created_at: "2026-05-05T00:00:00Z",
        question_count: 1,
        avg_score: null,
        evaluation_report: null,
      },
    ];

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sessions />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hãy chờ chút Invera chấm điểm cho bạn/i)).toBeInTheDocument();
    });
  });

  it("clears the modal once the pending session becomes completed", async () => {
    sessionStorage.setItem(
      PENDING_SESSION_COMPLETION_KEY,
      JSON.stringify({
        sessionId: "session-2",
        status: "completing",
        startedAt: Date.now(),
      }),
    );
    testState.sessionsData = [
      {
        id: "session-2",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "IN_PROGRESS",
        created_at: "2026-05-05T00:00:00Z",
        question_count: 1,
        avg_score: null,
        evaluation_report: null,
      },
    ];

    const { rerender } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sessions />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hãy chờ chút Invera chấm điểm cho bạn/i)).toBeInTheDocument();
    });

    testState.sessionsData = [
      {
        id: "session-2",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "COMPLETED",
        created_at: "2026-05-05T00:00:00Z",
        question_count: 1,
        avg_score: 8.2,
        evaluation_report: "done",
      },
    ];

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sessions />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Hãy chờ chút Invera chấm điểm cho bạn/i)).not.toBeInTheDocument();
    });
    expect(sessionStorage.getItem(PENDING_SESSION_COMPLETION_KEY)).toBeNull();
  });

  it("allows the user to close the modal by clicking the backdrop", async () => {
    sessionStorage.setItem(
      PENDING_SESSION_COMPLETION_KEY,
      JSON.stringify({
        sessionId: "session-3",
        status: "completing",
        startedAt: Date.now(),
      }),
    );
    testState.sessionsData = [
      {
        id: "session-3",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "IN_PROGRESS",
        created_at: "2026-05-05T00:00:00Z",
        question_count: 1,
        avg_score: null,
        evaluation_report: null,
      },
    ];

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sessions />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hãy chờ chút Invera chấm điểm cho bạn/i)).toBeInTheDocument();
    });

    const backdrop = screen.getByTestId("pending-modal-backdrop");
    act(() => {
      fireEvent.click(backdrop);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Hãy chờ chút Invera chấm điểm cho bạn/i)).not.toBeInTheDocument();
    });
    expect(sessionStorage.getItem(PENDING_SESSION_COMPLETION_KEY)).toBeNull();
  });
});
