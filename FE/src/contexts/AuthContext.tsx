import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, UserOut, getToken, setToken, clearToken } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: UserOut | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

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
        const me = await authApi.me();
        setUser(me);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  /**
   * login: gọi POST /auth/login → lưu token → fetch user info.
   * Throw error nếu sai email/password để caller hiển thị message.
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setToken(response.access_token);
    const me = await authApi.me();
    setUser(me);
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
