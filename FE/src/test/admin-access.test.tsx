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
const createInvite = vi.fn();
const revokeInvite = vi.fn();
const removeAdmin = vi.fn();

vi.mock("../lib/api", () => ({
  adminApi: {
    getAdminUsers: (...args: unknown[]) => getAdminUsers(...args),
    getInvites: (...args: unknown[]) => getInvites(...args),
    getUsers: (...args: unknown[]) => getUsers(...args),
    createInvite: (...args: unknown[]) => createInvite(...args),
    revokeInvite: (...args: unknown[]) => revokeInvite(...args),
    removeAdmin: (...args: unknown[]) => removeAdmin(...args),
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
    getAdminUsers.mockResolvedValue([
      {
        id: "primary-admin",
        email: "primary@example.com",
        created_at: "2026-05-05T00:00:00Z",
        full_name: "Primary Admin",
        is_admin: true,
        is_primary_admin: true,
        provider: "local",
      },
      {
        id: "admin-2",
        email: "admin2@example.com",
        created_at: "2026-05-10T00:00:00Z",
        full_name: "Secondary Admin",
        is_admin: true,
        is_primary_admin: false,
        provider: "local",
      },
    ]);
    getInvites.mockResolvedValue([
      {
        id: "invite-1",
        email: "new-admin@example.com",
        status: "pending",
        notes: "Content support",
        created_at: "2026-06-21T00:00:00Z",
        activated_at: null,
        invited_by: "primary-admin",
        invited_by_email: "primary@example.com",
      },
    ]);
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
    createInvite.mockResolvedValue({
      id: "invite-2",
      email: "another-admin@example.com",
      status: "pending",
      notes: null,
      created_at: "2026-06-21T00:00:00Z",
      activated_at: null,
      invited_by: "primary-admin",
      invited_by_email: "primary@example.com",
    });
    revokeInvite.mockResolvedValue({ revoked: "invite-1" });
    removeAdmin.mockResolvedValue({ removed: "admin-2", email: "admin2@example.com" });
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

  it("submits a new admin invite from the form", async () => {
    render(<AdminAccess />);

    fireEvent.change(screen.getByLabelText(/new admin gmail/i), {
      target: { value: "another-admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Extra ops support" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invite admin/i }));

    await waitFor(() => {
      expect(createInvite).toHaveBeenCalledWith("another-admin@example.com", "Extra ops support");
    });
  });

  it("revokes a pending invitation", async () => {
    render(<AdminAccess />);

    await waitFor(() => {
      expect(screen.getByText("new-admin@example.com")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

    await waitFor(() => {
      expect(revokeInvite).toHaveBeenCalledWith("invite-1");
    });
  });

  it("removes access from a secondary admin", async () => {
    render(<AdminAccess />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove access/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /remove access/i }));

    await waitFor(() => {
      expect(removeAdmin).toHaveBeenCalledWith("admin-2");
    });
  });
});
