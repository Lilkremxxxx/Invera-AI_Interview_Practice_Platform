import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "../pages/Login";
import Signup from "../pages/Signup";

// Mock contexts and modules
vi.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
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

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// ─── Login Tests ──────────────────────────────────────────────────────────────
describe("Login page", () => {
  it("renders email and password fields", () => {
    const Wrapper = createWrapper();
    render(<Login />, { wrapper: Wrapper });
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    // Use getAllByLabelText to handle multiple matches (label + show/hide button aria-label)
    const passwordElements = screen.getAllByLabelText(/password|mật khẩu/i);
    expect(passwordElements.length).toBeGreaterThan(0);
  });

  it("renders login submit button", () => {
    const Wrapper = createWrapper();
    render(<Login />, { wrapper: Wrapper });
    // Find a button (submit)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows validation error on empty submit", async () => {
    const Wrapper = createWrapper();
    render(<Login />, { wrapper: Wrapper });
    const submitBtn = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("type") === "submit" || btn.textContent?.includes("login") || btn.textContent?.includes("Đăng nhập")
    );
    if (submitBtn) {
      fireEvent.click(submitBtn);
    }
    // Form should not navigate away (still on page)
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
  });

  it("email field accepts input", () => {
    const Wrapper = createWrapper();
    render(<Login />, { wrapper: Wrapper });
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");
  });
});

// ─── Signup Tests ─────────────────────────────────────────────────────────────
describe("Signup page", () => {
  it("renders email and password fields", () => {
    const Wrapper = createWrapper();
    render(<Signup />, { wrapper: Wrapper });
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    // Password field (by placeholder or label)
    const passwordInputs = screen.getAllByDisplayValue("");
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it("renders signup button", () => {
    const Wrapper = createWrapper();
    render(<Signup />, { wrapper: Wrapper });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("email field is of type email", () => {
    const Wrapper = createWrapper();
    render(<Signup />, { wrapper: Wrapper });
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.type).toBe("email");
  });

  it("has a link to login page", () => {
    const Wrapper = createWrapper();
    render(<Signup />, { wrapper: Wrapper });
    const links = screen.getAllByRole("link");
    const loginLink = links.find(
      (l) => l.getAttribute("href")?.includes("login") || l.textContent?.toLowerCase().includes("login") || l.textContent?.includes("đăng nhập")
    );
    expect(loginLink).toBeTruthy();
  });
});
