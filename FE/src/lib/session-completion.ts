export const PENDING_SESSION_COMPLETION_KEY = 'invera_pending_session_completion';

export type PendingSessionCompletion = {
  sessionId: string;
  status: 'completing';
  startedAt: number;
};

export function readPendingSessionCompletion(): PendingSessionCompletion | null {
  if (typeof window === 'undefined') return null;

  const cached = sessionStorage.getItem(PENDING_SESSION_COMPLETION_KEY);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as PendingSessionCompletion;
    if (
      parsed &&
      typeof parsed.sessionId === 'string' &&
      parsed.status === 'completing' &&
      typeof parsed.startedAt === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Ignore malformed pending markers.
  }

  sessionStorage.removeItem(PENDING_SESSION_COMPLETION_KEY);
  return null;
}

export function markPendingSessionCompletion(sessionId: string): PendingSessionCompletion {
  const value: PendingSessionCompletion = {
    sessionId,
    status: 'completing',
    startedAt: Date.now(),
  };
  sessionStorage.setItem(PENDING_SESSION_COMPLETION_KEY, JSON.stringify(value));
  return value;
}

export function clearPendingSessionCompletion(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_SESSION_COMPLETION_KEY);
}
