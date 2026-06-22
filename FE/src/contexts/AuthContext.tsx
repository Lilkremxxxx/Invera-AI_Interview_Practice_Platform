import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, UserOut, TOKEN_KEY, getToken, setToken, clearToken } from '@/lib/api';

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

function safeGetItem(key: string): string | null {
  try {
    return typeof localStorage?.getItem === 'function' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage?.setItem === 'function') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage failures in constrained test environments.
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage?.removeItem === 'function') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures in constrained test environments.
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(() => {
    const token = getToken();
    if (!token) return null;
    try {
      const cached = safeGetItem('invera_user_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync user state to localStorage cache
  useEffect(() => {
    if (user) {
      safeSetItem('invera_user_cache', JSON.stringify(user));
    } else {
      safeRemoveItem('invera_user_cache');
    }
  }, [user]);

  const clearAuth = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

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
    } catch (err) {
      const isUnauthorized = err && typeof err === 'object' && 'status' in err && err.status === 401;
      if (isUnauthorized) {
        clearToken();
        setUser(null);
      } else {
        console.warn("Failed to load user info due to network/server error:", err);
      }
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
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [clearAuth, refreshUser]);

  useEffect(() => {
    const syncUserFromDatabase = () => {
      if (!getToken()) return;
      void refreshUser();
    };

    const handleFocus = () => {
      syncUserFromDatabase();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncUserFromDatabase();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        clearAuth();
        setLoading(false);
        return;
      }

      setLoading(true);
      void refreshUser().finally(() => {
        setLoading(false);
      });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearAuth, refreshUser]);

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
