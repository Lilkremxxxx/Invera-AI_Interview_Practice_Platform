import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Upgrade from "../pages/Upgrade";

const mockNavigate = vi.fn();
const mockRefreshUser = vi.fn();

const paymentOrders = [
  {
    id: "order-succeeded",
    user_id: "user-1",
    provider: "payos",
    plan_tier: "basic",
    billing_period: "month",
    amount_vnd: 100000,
    status: "succeeded",
    provider_order_ref: "101",
    provider_transaction_no: "txn-1",
    provider_response_code: "00",
    payment_url: "https://payos.example/success",
    paid_at: "2026-06-18T00:00:00Z",
    created_at: "2026-06-18T00:00:00Z",
  },
  {
    id: "order-failed",
    user_id: "user-1",
    provider: "payos",
    plan_tier: "pro",
    billing_period: "year",
    amount_vnd: 200000,
    status: "failed",
    provider_order_ref: "102",
    provider_transaction_no: "txn-2",
    provider_response_code: "01",
    payment_url: "https://payos.example/failed",
    paid_at: null,
    created_at: "2026-06-17T00:00:00Z",
  },
  {
    id: "order-pending",
    user_id: "user-1",
    provider: "payos",
    plan_tier: "premium",
    billing_period: "month",
    amount_vnd: 300000,
    status: "pending",
    provider_order_ref: "103",
    provider_transaction_no: null,
    provider_response_code: null,
    payment_url: "https://payos.example/pending",
    paid_at: null,
    created_at: "2026-06-16T00:00:00Z",
  },
];

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: paymentOrders,
    isLoading: false,
  }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: {
      id: "user-1",
      email: "user@example.com",
      is_admin: false,
      plan_tier: "basic",
      plan_status: "active",
      plan_billing_period: "month",
      plan_expires_at: null,
      sessions_used: 1,
      session_limit: 5,
      additional_sessions: 0,
      can_start_new_session: true,
      can_use_qna: true,
    },
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "vi",
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("../lib/plans", () => ({
  formatBillingPeriod: (period: string) => (period === "month" ? "Theo tháng" : "Theo năm"),
  formatPlanLabel: () => "Basic",
  formatPlanStatus: () => "Đang hoạt động",
}));

vi.mock("../lib/pricing-content", () => ({
  pricingPlanContent: {
    basic: {
      description: {
        vi: "Gói Basic",
        en: "Basic plan",
      },
      features: {
        vi: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
        en: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
    },
    pro: {
      description: {
        vi: "Gói Pro",
        en: "Pro plan",
      },
      features: {
        vi: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
        en: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
    },
    premium: {
      description: {
        vi: "Gói Premium",
        en: "Premium plan",
      },
      features: {
        vi: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
        en: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
    },
  },
}));

vi.mock("../lib/mock-data", () => ({
  pricingPlans: [
    { id: "basic", name: "Basic", priceMonth: 100000, priceYear: 1000000 },
    { id: "pro", name: "Pro", priceMonth: 200000, priceYear: 2000000 },
    { id: "premium", name: "Premium", priceMonth: 300000, priceYear: 3000000 },
  ],
}));

describe("Upgrade payment history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders payment status badges in the requested colors and shows continue action for pending orders", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app/upgrade"]}>
        <Upgrade />
      </MemoryRouter>,
    );

    expect(screen.getByText("Thành công")).toHaveClass("bg-emerald-50");
    expect(screen.getByText("Thất bại")).toHaveClass("bg-red-50");
    expect(screen.getByText("Đang chờ")).toHaveClass("bg-sky-50");
    expect(screen.getByRole("link", { name: "Tiếp tục ->" })).toHaveAttribute(
      "href",
      "https://payos.example/pending",
    );
  });
});
