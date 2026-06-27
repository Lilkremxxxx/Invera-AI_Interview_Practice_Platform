import { expect, type Page } from "@playwright/test";
import { smokeSelectors } from "./selectors";
import { SMOKE_ADMIN_LOGIN_PATH, SMOKE_APP_LOGIN_PATH, SMOKE_APP_LOGOUT_PATH } from "./paths";

export async function loginWithUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(SMOKE_APP_LOGIN_PATH);
  await expect(page.getByRole("heading")).toContainText(smokeSelectors.loginHeading);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in|đăng nhập/i }).click();
}

export async function loginAsAdminWithUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(SMOKE_ADMIN_LOGIN_PATH);
  await expect(page.getByRole("heading")).toContainText(smokeSelectors.adminLoginHeading);
  await page.getByLabel(/admin email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /enter admin area|vào khu vực admin/i }).click();
}

export async function logoutFromSidebar(page: Page): Promise<void> {
  await page.getByRole("button", { name: /log out|đăng xuất/i }).click();
  await expect(page).toHaveURL(new RegExp(`${SMOKE_APP_LOGOUT_PATH}$`));
}

export async function setLocalStorageToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem("invera_token", value);
  }, token);
}
