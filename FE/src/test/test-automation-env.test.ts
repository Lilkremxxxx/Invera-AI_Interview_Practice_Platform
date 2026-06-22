import { describe, expect, it } from "vitest";
import { readAutomationConfig } from "@/lib/test-automation/env";

describe("readAutomationConfig", () => {
  it("throws when any automation env var is missing", () => {
    expect(() =>
      readAutomationConfig({
        VITE_AUTOMATION_BASE_URL: "http://localhost:4173",
        VITE_AUTOMATION_API_BASE_URL: "http://localhost:8000/api",
      }),
    ).toThrow("VITE_AUTOMATION_SEED_MODE");
  });

  it("reads the automation env contract when all vars are present", () => {
    const config = readAutomationConfig({
      VITE_AUTOMATION_BASE_URL: "http://localhost:4173",
      VITE_AUTOMATION_API_BASE_URL: "http://localhost:8000/api",
      VITE_AUTOMATION_SEED_MODE: "reset",
    });

    expect(config).toEqual({
      baseUrl: "http://localhost:4173",
      apiBaseUrl: "http://localhost:8000/api",
      seedMode: "reset",
    });
  });
});
