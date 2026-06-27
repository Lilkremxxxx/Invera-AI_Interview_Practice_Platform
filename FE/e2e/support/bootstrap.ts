import type { APIRequestContext } from "@playwright/test";
import {
  SMOKE_ADMIN_PREFIX,
  SMOKE_AUTOMATION_PASSWORD,
  SMOKE_CANDIDATE_PREFIX,
  SMOKE_SESSION_PAYLOAD,
} from "./constants";

type AutomationSessionPayload = {
  major: string;
  role: string;
  level: string;
  mode: "camera" | "live";
  language: "vi" | "en";
  question_count: number;
};

export type AutomationBootstrapResponse = {
  candidate: {
    id: string;
    email: string;
    full_name: string;
    is_admin: boolean;
  };
  admin: {
    id: string;
    email: string;
    full_name: string;
    is_admin: boolean;
  };
  session: {
    id: string;
  } & Record<string, unknown>;
  questions: Array<Record<string, unknown>>;
};

export type SmokeBootstrap = {
  candidate: AutomationBootstrapResponse["candidate"] & { password: string };
  admin: AutomationBootstrapResponse["admin"] & { password: string };
  session: AutomationBootstrapResponse["session"];
  questions: AutomationBootstrapResponse["questions"];
};

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function postBootstrap(apiBaseUrl: string): Promise<AutomationBootstrapResponse> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/test-automation/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      candidate_email_prefix: `${SMOKE_CANDIDATE_PREFIX}-${Date.now()}`,
      admin_email_prefix: `${SMOKE_ADMIN_PREFIX}-${Date.now()}`,
      candidate_full_name: "Automation Candidate",
      admin_full_name: "Automation Admin",
      session_payload: SMOKE_SESSION_PAYLOAD,
      questions: [
        {
          text: "Tell me about a time you shipped a feature under pressure.",
          category: "behavioral",
          difficulty: "medium",
          tags: ["smoke"],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Bootstrap request failed with ${response.status}`);
  }

  return response.json() as Promise<AutomationBootstrapResponse>;
}

export async function bootstrapSmokeUsers(_request?: APIRequestContext): Promise<SmokeBootstrap> {
  const apiBaseUrl = readEnv("VITE_AUTOMATION_API_BASE_URL");
  const payload = await postBootstrap(apiBaseUrl);
  return {
    candidate: { ...payload.candidate, password: SMOKE_AUTOMATION_PASSWORD },
    admin: { ...payload.admin, password: SMOKE_AUTOMATION_PASSWORD },
    session: payload.session,
    questions: payload.questions,
  };
}
