import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminRevenue from "../pages/admin/AdminRevenue";

const getRevenue = vi.fn();

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "vi",
  }),
}));

vi.mock("../lib/api", () => ({
  adminApi: {
    getRevenue: (...args: unknown[]) => getRevenue(...args),
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ dataKey }: any) => <div data-testid="line" data-datakey={dataKey} />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

describe("AdminRevenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRevenue.mockResolvedValue({
      total_revenue: 1000000,
      breakdown: {
        summary: {
          total_revenue: 1000000,
          basic_revenue: 99000,
          pro_revenue: 199000,
          premium_revenue: 299000,
          additional_sessions_count: 12,
        },
        daily: [
          {
            day: "2026-06-18",
            total_revenue: 1000000,
            basic_revenue: 99000,
            pro_revenue: 199000,
            premium_revenue: 299000,
            additional_sessions_count: 12,
          },
        ],
      },
    });
  });

  it("renders clickable revenue cards and switches chart data when a card is selected", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdminRevenue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Tổng doanh thu")).toBeTruthy();
    });

    const chart = screen.getByTestId("line-chart");
    expect(chart.getAttribute("data-chart")).toContain("1000000");
    expect(screen.getByTestId("line")).toHaveAttribute("data-datakey", "value");

    fireEvent.click(screen.getByRole("button", { name: /basic/i }));

    await waitFor(() => {
      expect(screen.getByTestId("line-chart").getAttribute("data-chart")).toContain("99000");
    });
  });
});
