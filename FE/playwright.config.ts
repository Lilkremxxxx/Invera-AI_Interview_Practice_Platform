import { defineConfig, devices } from "@playwright/test";
import { readAutomationConfig } from "./src/lib/test-automation/env";

const automationConfig = readAutomationConfig(process.env);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: automationConfig.baseUrl,
    extraHTTPHeaders: {
      "x-automation-api-base-url": automationConfig.apiBaseUrl,
    },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
