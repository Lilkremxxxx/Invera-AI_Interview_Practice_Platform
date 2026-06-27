import { expect, test } from "@playwright/test";
import { bootstrapSmokeUsers } from "../support/bootstrap";
import { loginAsAdminWithUi } from "../support/browser";

test("admin access gate smoke @smoke", async ({ page, request }) => {
  const bootstrap = await bootstrapSmokeUsers(request);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginAsAdminWithUi(page, bootstrap.admin.email, bootstrap.admin.password);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading")).toContainText(/admin/i);
});

