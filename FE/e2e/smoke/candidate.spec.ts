import { expect, test } from "@playwright/test";
import { bootstrapSmokeUsers } from "../support/bootstrap";
import { loginWithUi, setLocalStorageToken } from "../support/browser";

test("candidate session creation and session detail @smoke", async ({ page, request }) => {
  const bootstrap = await bootstrapSmokeUsers(request);

  await loginWithUi(page, bootstrap.candidate.email, bootstrap.candidate.password);
  await expect(page).toHaveURL(/\/app/);

  await page.goto("/app/new");
  await expect(page.getByRole("heading")).toContainText(/new session|tạo session mới/i);
  await page.getByRole("button", { name: /technology/i }).click();
  await page.getByRole("button", { name: /frontend engineer|frontend-engineer/i }).click();
  await page.getByRole("button", { name: /next|tiếp theo/i }).click();
  await page.getByRole("radio", { name: /junior/i }).check();
  await page.getByRole("button", { name: /next|tiếp theo/i }).click();
  await page.getByRole("button", { name: /^1$/ }).click();
  await page.getByRole("button", { name: /normal interview|camera|phỏng vấn thường/i }).click();
  await page.getByRole("button", { name: /easy|medium|hard|dễ|trung bình|khó/i }).first().click();
  await page.getByRole("button", { name: /start interview|bắt đầu phỏng vấn/i }).click();
  await expect(page).toHaveURL(/\/app\/(interview|live)\//);

  await page.goto(`/app/sessions/${bootstrap.session.id}`);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /continue|tiếp tục/i })).toBeVisible();
});

