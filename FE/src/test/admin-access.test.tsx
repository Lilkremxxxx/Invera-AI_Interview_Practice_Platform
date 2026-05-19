import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminAccess } from "../pages/admin/AdminAccess";

vi.mock("../hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "primary-admin",
      email: "primary@example.com",
      is_primary_admin: true,
      is_admin: true,
    },
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));

const downloadUserResume = vi.fn();
const getAdminUsers = vi.fn();
const getInvites = vi.fn();
const getUsers = vi.fn();

vi.mock("../lib/api", () => ({
  adminApi: {
    getAdminUsers: (...args: unknown[]) => getAdminUsers(...args),
    getInvites: (...args: unknown[]) => getInvites(...args),
    getUsers: (...args: unknown[]) => getUsers(...args),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    removeAdmin: vi.fn(),
    updateUserPlan: vi.fn(),
    deleteUser: vi.fn(),
    downloadUserResume: (...args: unknown[]) => downloadUserResume(...args),
  },
}));

describe("AdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:resume"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
    getAdminUsers.mockResolvedValue([]);
    getInvites.mockResolvedValue([]);
    downloadUserResume.mockResolvedValue({
      blob: new Blob(["resume"]),
      filename: "candidate-resume.pdf",
    });
    getUsers.mockResolvedValue([
      {
        id: "user-1",
        email: "candidate@example.com",
        created_at: "2026-05-05T00:00:00Z",
        full_name: "Candidate",
        is_admin: false,
        is_primary_admin: false,
        provider: "local",
        email_verified: true,
        plan_tier: "pro",
        plan_status: "active",
        plan_billing_period: "month",
        plan_expires_at: "2026-06-05T00:00:00Z",
        sessions_used: 2,
        session_limit: null,
        resume_uploaded: true,
        resume_filename: "candidate-resume.pdf",
      },
    ]);
  });

  it("shows a resume download action for users who uploaded a resume", async () => {
    render(<AdminAccess />);

    await waitFor(() => {
      expect(screen.getByText("candidate@example.com")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /download resume/i })).toBeTruthy();
  });

  it("downloads the resume when the admin clicks the action", async () => {
    render(<AdminAccess />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /download resume/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /download resume/i }));

    await waitFor(() => {
      expect(downloadUserResume).toHaveBeenCalledWith("user-1");
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume");
    });
  });
});
