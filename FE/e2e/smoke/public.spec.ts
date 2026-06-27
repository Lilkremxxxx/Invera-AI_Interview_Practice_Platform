import { expect, test } from "@playwright/test";
import { smokeSelectors } from "../support/selectors";

test("public page render @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(smokeSelectors.landingHero);
  await expect(page.getByRole("link", { name: /sign up|đăng ký/i }).first()).toBeVisible();
});

