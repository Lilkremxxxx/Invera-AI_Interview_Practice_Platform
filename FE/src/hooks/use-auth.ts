/**
 * useAuth hook — wrapper của AuthContext.
 *
 * Trả về: { isAuthenticated, user, loading, login, logout }
 * - isAuthenticated: true nếu user đã đăng nhập (có token hợp lệ)
 * - user: thông tin user hiện tại (UserOut | null)
 * - loading: true khi đang validate token lúc mount
 * - login(email, password): đăng nhập thật với BE JWT
 * - logout(): xóa token + redirect về trang chủ
 */
import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}

