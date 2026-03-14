/**
 * Invera API Client
 * Sử dụng native fetch (không cần axios).
 * - Tự động đính kèm Bearer token từ localStorage
 * - 401 → clear token + redirect /login
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const TOKEN_KEY = 'invera_token';

// ─── Token helpers ──────────────────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// ─── Core fetch wrapper ─────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 → token hết hạn hoặc không hợp lệ
  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(errorBody.detail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserOut {
  id: string;
  email: string;
  created_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface QuestionOut {
  id: number;
  role: string;
  level: string;
  text: string;
  category: string;
  difficulty: string;
}

export interface AnswerOut {
  id: string;
  session_id: string;
  question_id: number;
  answer_text: string;
  score: number;
  feedback: string;
  submitted_at: string;
}

export interface SessionOut {
  id: string;
  user_id: string;
  role: string;
  level: string;
  mode: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  avg_score: number | null;
  question_count: number | null;
}

export interface SessionDetail extends SessionOut {
  questions: QuestionOut[];
  answers: AnswerOut[];
}

export interface SessionCreate {
  role: string;
  level: string;
  mode?: string;
  question_count?: number;
}

export interface AnswerSubmit {
  question_id: number;
  answer_text: string;
}

// ─── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  /**
   * Đăng nhập — BE dùng OAuth2PasswordRequestForm nên phải gửi form-urlencoded
   * với field `username` (không phải `email`).
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  },

  /** Đăng ký tài khoản mới với email, password và full_name tuỳ chọn. */
  register: async (data: RegisterData): Promise<UserOut> => {
    return request<UserOut>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Lấy thông tin user hiện tại từ token (GET /auth/me). */
  me: async (): Promise<UserOut> => {
    return request<UserOut>('/auth/me');
  },
};

// ─── Sessions API ────────────────────────────────────────────────────────────
export const sessionsApi = {
  /** Tạo session mới, trả về session + questions */
  create: async (data: SessionCreate): Promise<SessionDetail> => {
    return request<SessionDetail>('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Lấy danh sách sessions của user */
  list: async (): Promise<SessionOut[]> => {
    return request<SessionOut[]>('/sessions');
  },

  /** Lấy chi tiết session + questions + answers */
  get: async (id: string): Promise<SessionDetail> => {
    return request<SessionDetail>(`/sessions/${id}`);
  },

  /** Nộp câu trả lời cho 1 câu hỏi, nhận về score + feedback */
  submitAnswer: async (sessionId: string, data: AnswerSubmit): Promise<AnswerOut> => {
    return request<AnswerOut>(`/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Đánh dấu session hoàn thành */
  complete: async (sessionId: string): Promise<SessionOut> => {
    return request<SessionOut>(`/sessions/${sessionId}/complete`, {
      method: 'PUT',
    });
  },
};

