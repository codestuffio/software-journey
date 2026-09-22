import { expect, test } from "@playwright/test";

test("landing page explains the local-first evidence boundary", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "software journey" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Local first\. Evidence at every step/i),
  ).toBeVisible();
});
