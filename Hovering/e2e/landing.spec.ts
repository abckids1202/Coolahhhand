import { expect, test } from "@playwright/test";

test("landing screen and pointer mode are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /nexus field/i })).toBeVisible();
  await page.getByRole("button", { name: /continue with pointer/i }).click();
  await expect(page.getByText("POINTER INPUT")).toBeVisible();
  await page.getByRole("button", { name: "SETTINGS" }).click();
  await expect(page.getByRole("heading", { name: "SESSION SETTINGS" })).toBeVisible();
});
