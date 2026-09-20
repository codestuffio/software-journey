import { expect, test } from "@playwright/test";

test("explorer makes recorded evidence and its limits visible", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Know the ground before you explore." }),
  ).toBeVisible();
  await expect(page.getByText("History: limited")).toBeVisible();
  await expect(page.getByText("history-limit")).toBeVisible();
  await expect(
    page.getByText("Captured text — display-only evidence"),
  ).toBeVisible();

  await page.getByRole("button", { name: "docs/contributing.md" }).click();
  await expect(
    page.getByRole("heading", { name: "docs/contributing.md" }),
  ).toBeVisible();
  await expect(page.getByText("Lines 20–29")).toBeVisible();
});

test("explorer preserves an empty filter state at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByLabel("Filter recorded paths").fill("nothing-here");
  await expect(
    page.getByText("No recorded evidence matches this path."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose a field note." }),
  ).toBeVisible();
});
