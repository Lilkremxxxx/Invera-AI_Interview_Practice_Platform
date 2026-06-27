import { expect, test } from "@playwright/test";
import { bootstrapSmokeUsers } from "../support/bootstrap";
import { loginWithUi } from "../support/browser";

test("interview room smoke @smoke", async ({ page, request }) => {
  const bootstrap = await bootstrapSmokeUsers(request);

  await loginWithUi(page, bootstrap.candidate.email, bootstrap.candidate.password);
  await page.goto(`/app/interview/${bootstrap.session.id}`);

  await expect(page.getByText(/question|câu hỏi/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /end|kết thúc/i })).toBeVisible();
});

