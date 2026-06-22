import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "../pages/Dashboard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div>
      {React.isValidElement(children) ? React.cloneElement(children, { children: null }) : null}
      <div data-testid="chart-tooltip">custom-tooltip</div>
    </div>
  ),
  AreaChart: ({ data }: any) => <div data-testid="area-chart" data-chart={JSON.stringify(data)} />,
  Area: () => null,
  LineChart: ({ data }: any) => (
    <div data-testid="line-chart" data-chart={JSON.stringify(data)}>
      <div>Score</div>
      <div>Date</div>
      <div>Eye contact</div>
      <div>Posture</div>
      <div>Confidence</div>
      <div>Fillers</div>
      <div>Blink</div>
      <div>Tension</div>
    </div>
  ),
  Line: ({ name }: any) => <div>{name}</div>,
  BarChart: ({ data }: any) => <div>{JSON.stringify(data)}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({ content }: any) => <div data-testid="chart-tooltip">{content ? "custom-tooltip" : "default-tooltip"}</div>,
  LabelList: () => null,
  Label: ({ value }: any) => <div>{value}</div>,
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
      id: "user-1",
      email: "candidate@example.com",
      is_admin: false,
      can_start_new_session: true,
    },
  }),
}));

const listSessions = vi.fn();
const telemetryOverview = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual("../lib/api");
  return {
    ...actual,
    sessionsApi: {
      list: (...args: any[]) => listSessions(...args),
      telemetryOverview: (...args: any[]) => telemetryOverview(...args),
    },
  };
});

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard telemetry chart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders multi-metric telemetry with toggles, deltas, and a custom tooltip", async () => {
    listSessions.mockResolvedValue([
      {
        id: "session-1",
        user_id: "user-1",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "COMPLETED",
        created_at: "2026-06-10T10:00:00Z",
        completed_at: "2026-06-10T10:30:00Z",
        avg_score: 8.1,
        question_count: 5,
      },
      {
        id: "session-2",
        user_id: "user-1",
        role: "frontend",
        level: "junior",
        mode: "camera",
        status: "COMPLETED",
        created_at: "2026-06-14T10:00:00Z",
        completed_at: "2026-06-14T10:30:00Z",
        avg_score: 8.5,
        question_count: 5,
      },
    ]);

    telemetryOverview.mockResolvedValue({
      sessions: [
        {
          session_id: "session-1",
          role: "frontend",
          level: "junior",
          mode: "camera",
          created_at: "2026-06-10T10:00:00Z",
          completed_at: "2026-06-10T10:30:00Z",
          avg_score: 8.1,
          summary: {
            gaze: 74,
            posture: 69,
            wpm: 128,
            fillers: 4,
            confidence: 81,
            blink: 22,
            tension: 31,
            answer_count: 10,
          },
          answers: [
            {
              label: "Q1",
              question_id: 101,
              is_follow_up: false,
              score: 8.1,
              submitted_at: "2026-06-10T10:05:00Z",
              telemetry_data: {
                gazeRatio: 0.74,
                bodyPostureScore: 0.69,
                speakingPace: 128,
                fillerWordsCount: 4,
                presentationConfidence: 0.81,
                blinkRatio: 0.22,
                avgTensionScore: 0.31,
              },
            },
          ],
        },
        {
          session_id: "session-2",
          role: "frontend",
          level: "junior",
          mode: "camera",
          created_at: "2026-06-14T10:00:00Z",
          completed_at: "2026-06-14T10:30:00Z",
          avg_score: 8.5,
          summary: {
            gaze: 78,
            posture: 73,
            wpm: 132,
            fillers: 2,
            confidence: 85,
            blink: 18,
            tension: 25,
            answer_count: 10,
          },
          answers: [
            {
              label: "Q1",
              question_id: 201,
              is_follow_up: false,
              score: 8.5,
              submitted_at: "2026-06-14T10:05:00Z",
              telemetry_data: {
                gazeRatio: 0.78,
                bodyPostureScore: 0.73,
                speakingPace: 132,
                fillerWordsCount: 2,
                presentationConfidence: 0.85,
                blinkRatio: 0.18,
                avgTensionScore: 0.25,
              },
            },
          ],
        },
      ],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Camera progress over time")).toBeInTheDocument();
    });

    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("chart-tooltip").some((node) => node.textContent === "custom-tooltip")).toBe(true);
    expect(screen.getAllByText("Score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Date").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eye contact").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Posture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Confidence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fillers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blink").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tension").length).toBeGreaterThan(0);
    expect(screen.getByText("Skill breakdown")).toBeInTheDocument();
    expect(screen.getByText("Eye contact and confidence now reflect your actual camera telemetry across completed sessions.")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /eye contact/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("+4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-2").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /wpm/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /wpm/i })).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("renders empty state with zero values and no demo notice when there are no sessions", async () => {
    listSessions.mockResolvedValue([]);
    telemetryOverview.mockResolvedValue({ sessions: [] });

    renderDashboard();

    // Wait for loader to disappear
    await waitFor(() => {
      expect(screen.getByText("Camera progress over time")).toBeInTheDocument();
    });

    // Verify header is there
    expect(screen.getByText("Hi, candidate 👋")).toBeInTheDocument();

    // Verify demo notice is NOT present
    expect(screen.queryByText(/Đang hiển thị dữ liệu mẫu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing demo data/)).not.toBeInTheDocument();

    // Verify KPIs are 0
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("0/10")).toBeInTheDocument();

    // Verify empty state messages
    expect(screen.getByText("No progress data yet. Complete actual interviews to view.")).toBeInTheDocument();
    expect(screen.getByText("noSessions")).toBeInTheDocument();
  });
});
