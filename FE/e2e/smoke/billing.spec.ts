import { expect, test } from "@playwright/test";
import { bootstrapSmokeUsers } from "../support/bootstrap";
import { loginWithUi } from "../support/browser";

test("billing upgrade smoke @smoke", async ({ page, request }) => {
  const bootstrap = await bootstrapSmokeUsers(request);

  await loginWithUi(page, bootstrap.candidate.email, bootstrap.candidate.password);
  await page.goto("/app/upgrade");

  await expect(page.getByRole("heading")).toContainText(/upgrade|nâng cấp/i);
  await expect(page.getByRole("button", { name: /buy now|purchase now|thanh toán ngay/i }).first()).toBeVisible();
});

