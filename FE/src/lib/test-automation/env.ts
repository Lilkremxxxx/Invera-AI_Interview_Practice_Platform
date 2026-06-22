export type AutomationEnv = {
  baseUrl: string;
  apiBaseUrl: string;
  seedMode: string;
};

export type AutomationEnvInput = Partial<
  Record<
    | "VITE_AUTOMATION_BASE_URL"
    | "VITE_AUTOMATION_API_BASE_URL"
    | "VITE_AUTOMATION_SEED_MODE",
    string | undefined
  >
>;

function requireAutomationEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing required automation env var: ${key}`);
  }

  return value;
}

export function readAutomationConfig(env: AutomationEnvInput = import.meta.env): AutomationEnv {
  return {
    baseUrl: requireAutomationEnv(env.VITE_AUTOMATION_BASE_URL, "VITE_AUTOMATION_BASE_URL"),
    apiBaseUrl: requireAutomationEnv(env.VITE_AUTOMATION_API_BASE_URL, "VITE_AUTOMATION_API_BASE_URL"),
    seedMode: requireAutomationEnv(env.VITE_AUTOMATION_SEED_MODE, "VITE_AUTOMATION_SEED_MODE"),
  };
}
