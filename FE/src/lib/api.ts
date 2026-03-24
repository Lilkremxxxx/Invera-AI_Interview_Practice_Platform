/**
 * Invera API Client
 * Sử dụng native fetch (không cần axios).
 * - Tự động đính kèm Bearer token từ localStorage
 * - 401 → clear token + redirect /login
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const TOKEN_KEY = 'invera_token';

type UiLanguage = 'vi' | 'en';

function getCurrentLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('invera-language') === 'vi' ? 'vi' : 'en';
}

function uiMessage(key: 'offline' | 'server' | 'sessionExpired'): string {
  const language = getCurrentLanguage();
  const messages = {
    vi: {
      offline: 'Thiết bị đang offline. Hãy kiểm tra kết nối mạng rồi thử lại.',
      server: 'Không thể kết nối tới máy chủ lúc này. Hãy tải lại trang hoặc thử lại sau ít phút.',
      sessionExpired: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
    },
    en: {
      offline: 'You appear to be offline. Check your network connection and try again.',
      server: 'Unable to reach the server right now. Reload the page or try again in a few minutes.',
      sessionExpired: 'Your session has expired. Please log in again.',
    },
  } as const;

  return messages[language][key];
}

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

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

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      throw new Error(uiMessage('offline'));
    }

    if (error instanceof TypeError) {
      throw new Error(uiMessage('server'));
    }

    throw error;
  }

  // 401 → token hết hạn hoặc không hợp lệ
  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error(uiMessage('sessionExpired'));
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    const message =
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : `HTTP ${response.status}`;
    throw new ApiError(message, response.status, errorBody);
  }

  return response.json() as Promise<T>;
}

function parseFilenameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ?? null;
}

async function requestFile(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, { headers });
  } catch (error) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      throw new Error(uiMessage('offline'));
    }

    if (error instanceof TypeError) {
      throw new Error(uiMessage('server'));
    }

    throw error;
  }

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error(uiMessage('sessionExpired'));
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new ApiError(
      typeof errorBody?.detail === 'string' ? errorBody.detail : `HTTP ${response.status}`,
      response.status,
      errorBody,
    );
  }

  return {
    blob: await response.blob(),
    filename: parseFilenameFromDisposition(response.headers.get('content-disposition')),
  };
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
  full_name?: string | null;
  is_admin?: boolean;
  is_primary_admin?: boolean;
  email_verified?: boolean;
  plan_tier?: 'free_trial' | 'basic' | 'pro' | 'premium';
  plan_status?: 'active' | 'expired' | 'trial_exhausted';
  plan_billing_period?: 'month' | 'year' | null;
  plan_started_at?: string | null;
  plan_expires_at?: string | null;
  session_limit?: number | null;
  sessions_used?: number;
  can_start_new_session?: boolean;
  can_use_qna?: boolean;
  is_billing_exempt?: boolean;
  avatar_url?: string | null;
  resume_uploaded?: boolean;
  resume_filename?: string | null;
}

export interface RegisterResponse extends UserOut {
  verification_required: boolean;
  message: string;
  resend_available_in_seconds: number;
}

export interface VerificationDeliveryResponse {
  message: string;
  resend_available_in_seconds: number;
}

export interface AvatarUploadResponse {
  message: string;
  avatar_url?: string | null;
}

export interface ResumeUploadResponse {
  message: string;
  resume_uploaded: boolean;
  resume_filename?: string | null;
}

export interface EmailVerificationResponse {
  message: string;
  verified: boolean;
  access_token?: string;
  token_type?: string;
  is_admin?: boolean;
}

export interface AdminStats {
  total_users: number;
  total_admins: number;
  total_sessions: number;
  completed_sessions: number;
  total_answers: number;
  avg_score: number;
  total_questions: number;
}

export interface AdminUser extends UserOut {
  provider: string;
  session_count: number;
  avg_score: number | null;
}

export interface AdminInviteOut {
  id: string;
  email: string;
  status: string;
  notes?: string | null;
  created_at: string;
  activated_at?: string | null;
  invited_by?: string | null;
  invited_by_email?: string | null;
}

export interface AdminAccessUser extends UserOut {
  provider?: string | null;
}

export interface AdminManagedUser extends UserOut {
  provider?: string | null;
  avg_score?: number | null;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface QuestionOut {
  id: number;
  major?: string | null;
  role: string;
  level: string;
  text: string;
  category: string;
  difficulty: string;
  tags?: string[];
}

export interface AdminQuestionOut extends QuestionOut {
  ideal_answer?: string | null;
}

export interface AdminQuestionUpsert {
  major: string;
  role: string;
  level: string;
  text: string;
  category: string;
  difficulty: string;
  ideal_answer: string;
  tags: string[];
}

export interface AdminQuestionGenerateRequest {
  major: string;
  role: string;
  level: string;
  difficulty: string;
  category?: string;
  prompt?: string;
  tags?: string[];
  output_language?: 'vi' | 'en';
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

export interface PaymentOrderOut {
  id: string;
  user_id: string;
  provider: string;
  plan_tier: 'basic' | 'pro' | 'premium';
  billing_period: 'month' | 'year';
  amount_vnd: number;
  status: string;
  provider_order_ref: string;
  provider_transaction_no?: string | null;
  provider_response_code?: string | null;
  payment_url?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface CheckoutResponse {
  payment_url: string;
  order: PaymentOrderOut;
}

export interface RedeemCodeResponse {
  message: string;
  plan_tier: 'basic' | 'pro' | 'premium';
  billing_period: 'month' | 'year';
  plan_expires_at?: string | null;
}

export interface QnaStructuredAnswerOut {
  language: 'vi' | 'en';
  title: string;
  summary: string;
  direct_answer: string[];
  key_points: string[];
  common_gaps: string[];
  better_answer: string[];
  follow_up: string[];
  quoted_text?: string | null;
  attachment_name?: string | null;
}

export interface QnaMessageOut {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured_payload?: QnaStructuredAnswerOut | null;
  selected_text?: string | null;
  attachment_name?: string | null;
  created_at: string;
}

export interface QnaThreadOut {
  id: string;
  title: string;
  messages: QnaMessageOut[];
}

export interface QnaMessageCreateResult {
  thread_id: string;
  user_message: QnaMessageOut;
  assistant_message: QnaMessageOut;
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
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    return request<RegisterResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  adminRegister: async (data: RegisterData): Promise<RegisterResponse> => {
    return request<RegisterResponse>('/auth/admin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** Lấy thông tin user hiện tại từ token (GET /auth/me). */
  me: async (): Promise<UserOut> => {
    return request<UserOut>('/auth/me');
  },

  /** Yêu cầu reset password -> trả về token demo. */
  forgotPassword: async (email: string): Promise<{ message: string; reset_token?: string }> => {
    return request<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  /** Đặt lại mật khẩu với token. */
  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password }),
    });
  },

  verifyEmail: async (email: string, code: string): Promise<EmailVerificationResponse> => {
    return request<EmailVerificationResponse>('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
  },

  resendVerificationCode: async (email: string): Promise<VerificationDeliveryResponse> => {
    return request<VerificationDeliveryResponse>('/auth/resend-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  /** Gọi để lấy URL đăng nhập OAuth từ Backend rồi redirect browser. */
  oauthRedirect: async (provider: 'google' | 'github'): Promise<void> => {
    const res = await request<{ url: string }>(`/auth/oauth/${provider}`);
    if (res.url) {
      window.location.href = res.url;
    }
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

export const billingApi = {
  createCheckout: async (
    plan_tier: 'basic' | 'pro' | 'premium',
    billing_period: 'month' | 'year',
  ): Promise<CheckoutResponse> =>
    request<CheckoutResponse>('/billing/vnpay/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_tier, billing_period }),
    }),

  redeemCode: async (code: string): Promise<RedeemCodeResponse> =>
    request<RedeemCodeResponse>('/billing/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }),

  listOrders: async (): Promise<PaymentOrderOut[]> =>
    request<PaymentOrderOut[]>('/billing/orders'),
};

export const profileApi = {
  uploadAvatar: async (file: File): Promise<AvatarUploadResponse> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<AvatarUploadResponse>('/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  deleteAvatar: async (): Promise<AvatarUploadResponse> =>
    request<AvatarUploadResponse>('/profile/avatar', {
      method: 'DELETE',
    }),

  uploadResume: async (file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append('resume', file);
    return request<ResumeUploadResponse>('/profile/resume', {
      method: 'POST',
      body: formData,
    });
  },

  deleteResume: async (): Promise<ResumeUploadResponse> =>
    request<ResumeUploadResponse>('/profile/resume', {
      method: 'DELETE',
    }),

  downloadResume: async (): Promise<{ blob: Blob; filename: string | null }> =>
    requestFile('/profile/resume'),
};

export const qnaApi = {
  getThread: async (): Promise<QnaThreadOut> =>
    request<QnaThreadOut>('/qna/thread'),

  sendMessage: async (payload: {
    message?: string;
    selectedText?: string;
    docx?: File | null;
  }): Promise<QnaMessageCreateResult> => {
    const formData = new FormData();
    if (payload.message) formData.append('message', payload.message);
    if (payload.selectedText) formData.append('selected_text', payload.selectedText);
    if (payload.docx) formData.append('docx', payload.docx);
    return request<QnaMessageCreateResult>('/qna/messages', {
      method: 'POST',
      body: formData,
    });
  },
};

// ─── Admin API ─────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: async (): Promise<AdminStats> => request<AdminStats>('/admin/stats'),
  
  getUsers: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    is_admin?: boolean;
    plan_tier?: 'free_trial' | 'basic' | 'pro' | 'premium';
    plan_status?: 'active' | 'expired' | 'trial_exhausted';
    email_verified?: boolean;
  }): Promise<AdminManagedUser[]> => {
    const search = new URLSearchParams();
    if (typeof params?.limit === 'number') search.set('limit', String(params.limit));
    if (typeof params?.offset === 'number') search.set('offset', String(params.offset));
    if (params?.search) search.set('search', params.search);
    if (typeof params?.is_admin === 'boolean') search.set('is_admin', String(params.is_admin));
    if (params?.plan_tier) search.set('plan_tier', params.plan_tier);
    if (params?.plan_status) search.set('plan_status', params.plan_status);
    if (typeof params?.email_verified === 'boolean') search.set('email_verified', String(params.email_verified));
    const query = search.toString();
    return request<AdminManagedUser[]>(`/admin/users${query ? `?${query}` : ''}`);
  },

  getAdminUsers: async (): Promise<AdminAccessUser[]> =>
    request<AdminAccessUser[]>('/admin/admin-users'),

  getInvites: async (): Promise<AdminInviteOut[]> =>
    request<AdminInviteOut[]>('/admin/invites'),

  createInvite: async (email: string, notes?: string): Promise<AdminInviteOut> =>
    request<AdminInviteOut>('/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, notes }),
    }),

  revokeInvite: async (inviteId: string): Promise<{ revoked: string }> =>
    request<{ revoked: string }>(`/admin/invites/${inviteId}`, { method: 'DELETE' }),

  removeAdmin: async (userId: string): Promise<{ removed: string; email: string }> =>
    request<{ removed: string; email: string }>(`/admin/admin-users/${userId}`, { method: 'DELETE' }),

  updateUserPlan: async (
    userId: string,
    payload: { plan_tier: 'free_trial' | 'basic' | 'pro' | 'premium'; billing_period?: 'month' | 'year' },
  ): Promise<AdminManagedUser> =>
    request<AdminManagedUser>(`/admin/users/${userId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  downloadUserResume: async (userId: string): Promise<{ blob: Blob; filename: string | null }> =>
    requestFile(`/admin/users/${userId}/resume`),
    
  getQuestions: async (params?: { major?: string; role?: string; level?: string }): Promise<AdminQuestionOut[]> => {
    const search = new URLSearchParams();
    if (params?.major) search.set('major', params.major);
    if (params?.role) search.set('role', params.role);
    if (params?.level) search.set('level', params.level);
    const query = search.toString();
    return request<AdminQuestionOut[]>(`/admin/questions${query ? `?${query}` : ''}`);
  },

  createQuestion: async (payload: AdminQuestionUpsert): Promise<AdminQuestionOut> =>
    request<AdminQuestionOut>('/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  updateQuestion: async (questionId: number, payload: AdminQuestionUpsert): Promise<AdminQuestionOut> =>
    request<AdminQuestionOut>(`/admin/questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  generateQuestion: async (
    payload: AdminQuestionGenerateRequest,
  ): Promise<
    AdminQuestionUpsert & {
      duplicate_found?: boolean;
      existing_question_id?: number | null;
      prompt?: string | null;
    }
  > =>
    request<
      AdminQuestionUpsert & {
        duplicate_found?: boolean;
        existing_question_id?: number | null;
        prompt?: string | null;
      }
    >('/admin/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  
  toggleAdmin: async (userId: string): Promise<UserOut> => 
    request<UserOut>(`/admin/users/${userId}/toggle-admin`, { method: 'PUT' }),
    
  deleteQuestion: async (questionId: number): Promise<{ deleted: number }> => 
    request<{ deleted: number }>(`/admin/questions/${questionId}`, { method: 'DELETE' }),
};
