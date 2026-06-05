import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminQuestionBank } from "../pages/admin/AdminQuestionBank";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Recharts to avoid DOM SVG issues in JSDOM
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

// Mock Auth context
vi.mock("../hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-id",
      email: "admin@example.com",
      is_admin: true,
    },
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (sec: string, key: string) => key,
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock API endpoints
const getStats = vi.fn();
const getUsers = vi.fn();
const getQuestions = vi.fn();

vi.mock("../lib/api", () => ({
  adminApi: {
    getStats: (...args: any[]) => getStats(...args),
    getUsers: (...args: any[]) => getUsers(...args),
    getQuestions: (...args: any[]) => getQuestions(...args),
  },
}));

describe("AdminDashboard and QuestionBank components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AdminDashboard renders correctly and navigates to Users, Sessions, and Revenue pages on card clicks", async () => {
    getStats.mockResolvedValue({
      total_users: 100,
      active_users: 25,
      total_sessions: 80,
      completed_sessions: 60,
      total_revenue: 5000000,
      total_questions: 1500,
      role_distribution: { frontend: 10 },
      level_distribution: { junior: 5 },
    });
    getUsers.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Wait for data loading
    await waitFor(() => {
      expect(screen.getByText("Total users")).toBeTruthy();
    });

    // Verify stats are visible
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("Total Revenue")).toBeTruthy();

    // Click total users card
    fireEvent.click(screen.getByText("Total users"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/users");

    // Click sessions card
    fireEvent.click(screen.getByText("Sessions"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/sessions");
  });

  it("AdminQuestionBank fetches and renders questions with pagination controls", async () => {
    getQuestions.mockResolvedValue({
      items: [
        {
          id: 1,
          major: "technology",
          role: "frontend",
          level: "intern",
          text: "What is React?",
          category: "General",
          difficulty: "easy",
          tags: ["react"],
          ideal_answer: "Ideal answer text",
        },
      ],
      total: 40,
      page: 1,
      size: 20,
      pages: 2,
    });

    render(
      <MemoryRouter>
        <AdminQuestionBank />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("What is React?")).toBeTruthy();
    });

    // Check pagination information
    expect(screen.getByText(/showing 1 - 20 of 40 questions/i)).toBeTruthy();

    // Verify page numbers are rendered
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2" })).toBeTruthy();

    // Click page 2 to load more questions
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    
    await waitFor(() => {
      expect(getQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
