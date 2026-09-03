import { expect, test } from "@playwright/test";

test("login page renders the real sign-in boundary", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in to Kalki BOS" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("unauthenticated work access returns to the sign-in flow", async ({ page }) => {
  await page.goto("/work");

  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Sign in to Kalki BOS" })).toBeVisible();
});
