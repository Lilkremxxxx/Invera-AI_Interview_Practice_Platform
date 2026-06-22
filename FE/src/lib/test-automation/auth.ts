import { TOKEN_KEY } from "@/lib/api";

export const AUTOMATION_AUTH_TOKEN_KEY = TOKEN_KEY;

export function getAutomationAuthToken(
  storage: Pick<Storage, "getItem"> = localStorage,
): string | null {
  return storage.getItem(AUTOMATION_AUTH_TOKEN_KEY);
}

export function getAutomationAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
