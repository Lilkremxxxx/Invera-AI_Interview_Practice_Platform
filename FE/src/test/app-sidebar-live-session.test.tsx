import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppSidebar } from "../components/layout/AppSidebar";

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_section: string, key: string) => {
      const labels: Record<string, string> = {
        dashboard: "Dashboard",
        newSession: "New session",
        sessions: "Sessions",
        qna: "Q&A",
        profile: "Profile",
        settings: "Settings",
        logout: "Logout",
        user: "User",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: {
      email: "candidate@example.com",
      full_name: "Candidate",
      is_admin: false,
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../lib/plans", () => ({
  formatPlanLabel: () => "Free Trial",
  userInitials: () => "CA",
}));

describe("AppSidebar", () => {
  it("shows a live session entry", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/app"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /live session/i })).toHaveAttribute("href", "/app/live");
  });
});
