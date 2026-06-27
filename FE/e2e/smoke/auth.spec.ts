import { expect, test } from "@playwright/test";
import { bootstrapSmokeUsers } from "../support/bootstrap";
import { loginWithUi, logoutFromSidebar } from "../support/browser";

test("auth signup/login/logout/reset coverage @smoke", async ({ page, request }) => {
  const bootstrap = await bootstrapSmokeUsers(request);

  await page.goto("/signup");
  await expect(page.getByRole("heading")).toContainText(/start your interview journey|bắt đầu hành trình/i);
  await page.getByLabel(/full name|họ và tên/i).fill("Smoke Candidate");
  await page.getByLabel("Email").fill(`smoke-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("SmokePass123!");
  await page.getByRole("button", { name: /create account|tạo tài khoản/i }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);

  await page.goto("/forgot-password");
  await expect(page.getByRole("heading")).toContainText(/forgot password|quên mật khẩu/i);
  await page.getByLabel("Email").fill(bootstrap.candidate.email);
  await page.getByRole("button", { name: /send request|gửi yêu cầu/i }).click();
  await expect(page.getByText(/check your inbox|kiểm tra email/i)).toBeVisible();

  await page.goto("/reset-password?token=invalid-smoke-token");
  await expect(page.getByRole("heading")).toContainText(/reset password|đặt lại mật khẩu/i);
  await page.getByLabel(/new password|mật khẩu mới/i).fill("SmokePass123!");
  await page.getByLabel(/confirm new password|xác nhận mật khẩu mới/i).fill("SmokePass123!");
  await page.getByRole("button", { name: /save new password|lưu mật khẩu mới/i }).click();
  await expect(page.getByRole("heading")).toContainText(/reset password|đặt lại mật khẩu/i);

  await loginWithUi(page, bootstrap.candidate.email, bootstrap.candidate.password);
  await expect(page).toHaveURL(/\/app/);

  await logoutFromSidebar(page);
});

