import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AdminLayout } from "../pages/admin/AdminLayout";
import { AdminRedeemCodes } from "../pages/admin/AdminRedeemCodes";

const createRedeemCode = vi.fn();
const getRedeemCodes = vi.fn();

vi.mock("../hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      is_admin: true,
      is_primary_admin: true,
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../lib/api", () => ({
  adminApi: {
    getStats: vi.fn(),
    getUsers: vi.fn(),
    getAdminUsers: vi.fn(),
    getInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    removeAdmin: vi.fn(),
    updateUserPlan: vi.fn(),
    deleteUser: vi.fn(),
    downloadUserResume: vi.fn(),
    createRedeemCode: (...args: unknown[]) => createRedeemCode(...args),
    getRedeemCodes: (...args: unknown[]) => getRedeemCodes(...args),
  },
}));

describe("Admin redeem codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRedeemCodes.mockResolvedValue([]);
    createRedeemCode.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      code: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      plan_tier: "pro",
      expires_at: "2026-07-24T00:00:00Z",
      redeemed_at: null,
      redeemed_by_email: null,
      created_at: "2026-06-24T00:00:00Z",
    });
  });

  it("shows redeem codes in the admin sidebar", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /redeem codes/i })).toBeTruthy();
  });

  it("creates a pro code with a 30 day expiry", async () => {
    render(
      <MemoryRouter>
        <AdminRedeemCodes />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /pro/i }));
    fireEvent.click(screen.getByRole("button", { name: /30 days/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate code/i }));

    await waitFor(() => {
      expect(createRedeemCode).toHaveBeenCalledWith({
        plan_tier: "pro",
        expires_in_days: 30,
      });
    });
  });
});
