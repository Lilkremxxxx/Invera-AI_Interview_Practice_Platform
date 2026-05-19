import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "../contexts/AuthContext";
import { TOKEN_KEY, authApi, getToken, clearToken } from "../lib/api";

vi.mock("../lib/api", () => {
  return {
    TOKEN_KEY: "invera_token",
    authApi: {
      me: vi.fn(),
      login: vi.fn(),
    },
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  };
});

function Consumer() {
  const { user, loading } = useAuthContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue("token");
    vi.mocked(authApi.me).mockResolvedValue({
      id: "user-1",
      email: "hello@example.com",
      created_at: "2026-05-05T00:00:00Z",
      is_admin: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not poll auth/me on an interval after login state is loaded", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("hello@example.com");
    });

    vi.mocked(authApi.me).mockClear();

    await new Promise((resolve) => {
      window.setTimeout(resolve, 75);
    });

    expect(authApi.me).not.toHaveBeenCalled();
  });

  it("refreshes the current user when auth token changes in another tab", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("hello@example.com");
    });

    vi.mocked(authApi.me).mockClear();
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: TOKEN_KEY,
          newValue: "next-token",
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.me).toHaveBeenCalledTimes(1);
    });
  });

  it("clears auth state when another tab removes the token", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("hello@example.com");
    });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: TOKEN_KEY,
          newValue: null,
        }),
      );
    });

    await waitFor(() => {
      expect(clearToken).toHaveBeenCalled();
      expect(screen.getByTestId("email").textContent).toBe("none");
    });
  });

});
