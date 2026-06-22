import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import Login from "../pages/Login";
import Signup from "../pages/Signup";

const mocks = vi.hoisted(() => ({
  oauthRedirect: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
    loginWithToken: vi.fn(),
    refreshUser: vi.fn(),
    clearAuth: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../contexts/LanguageContext", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLanguage: () => ({
    language: "vi",
    setLanguage: vi.fn(),
    t: (section: string, key: string) => `${section}.${key}`,
  }),
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
    payload: unknown = null;
  },
  authApi: {
    oauthRedirect: mocks.oauthRedirect,
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationCode: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mocks.oauthRedirect.mockClear();
});

describe("OAuth buttons", () => {
  it("routes Login Google through authApi.oauthRedirect", () => {
    const Wrapper = createWrapper();
    render(<Login />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    expect(mocks.oauthRedirect).toHaveBeenCalledWith("google");
  });

  it("routes Signup Google through authApi.oauthRedirect with signup mode", () => {
    const Wrapper = createWrapper();
    render(<Signup />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    expect(mocks.oauthRedirect).toHaveBeenCalledWith("google", "signup");
  });
});
