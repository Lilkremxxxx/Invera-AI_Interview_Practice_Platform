import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Settings from "../pages/Settings";

const deleteAccount = vi.fn();
const logout = vi.fn();
const toast = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: () => ({
    logout,
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_section: string, key: string) => key,
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("../lib/api", () => ({
  profileApi: {
    deleteAccount: (...args: unknown[]) => deleteAccount(...args),
  },
}));

vi.mock("../components/theme-provider", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    isAuthenticated: true,
  }),
}));

describe("Settings delete account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAccount.mockResolvedValue({ deleted: "user-1", email: "user@example.com" });
    vi.stubGlobal("confirm", vi.fn(() => true));
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    });
  });

  it("deletes the current account after confirmation", async () => {
    render(<Settings />);

    fireEvent.click(screen.getByRole("button", { name: /deleteData/i }));

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
