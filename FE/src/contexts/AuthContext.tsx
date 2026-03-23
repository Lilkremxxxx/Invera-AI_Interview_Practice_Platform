import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, UserOut, getToken, setToken, clearToken } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: UserOut | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserOut>;
  loginWithToken: (token: string) => Promise<UserOut>;
  refreshUser: () => Promise<UserOut | null>;
  clearAuth: () => void;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const me = await authApi.me();
      setUser(me);
      return me;
    } catch {
      clearToken();
      setUser(null);
      return null;
    }
  }, []);

  /**
   * Khi mount: kiểm tra token trong localStorage.
   * Nếu có → gọi /auth/me để validate và lấy thông tin user.
   * Nếu không có / token hết hạn → clear + user = null.
   */
  useEffect(() => {
    const validateToken = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [refreshUser]);

  /**
   * login: gọi POST /auth/login → lưu token → fetch user info.
   * Throw error nếu sai email/password để caller hiển thị message.
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setToken(response.access_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  /**
   * loginWithToken: Dùng cho OAuth (nhận trực tiếp token từ URL params).
   */
  const loginWithToken = useCallback(async (token: string) => {
    setToken(token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const clearAuth = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  /**
   * logout: xóa token, reset user state, redirect về trang chủ.
   */
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithToken,
        refreshUser,
        clearAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext phải được dùng bên trong <AuthProvider>');
  }
  return ctx;
}
