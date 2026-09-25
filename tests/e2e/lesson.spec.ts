import { expect, type Page, test } from "@playwright/test";
import { lessonFixture } from "../fixtures/lesson";

async function load(page: Page, input = lessonFixture()) {
  await page.getByLabel("Choose a local snapshot JSON file").setInputFiles({
    name: "snapshot.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(input.snapshot)),
  });
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "workflow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(input.bundle)),
    });
  await expect(
    page.getByRole("heading", { name: "Your first OpenSpec change" }),
  ).toBeVisible();
}
test("reader completes checkpoints, exports a plan, and resets progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await load(page);
  const lesson = page.locator(".guided-lesson");
  await lesson.getByRole("radio").nth(0).check();
  await lesson.getByRole("button", { name: "Check answer" }).click();
  await expect(lesson.getByText(/Try again/)).toBeVisible();
  for (const answer of [1, 0, 2, 1, 0]) {
    await lesson.getByRole("radio").nth(answer).focus();
    await page.keyboard.press("Space");
    await lesson.getByRole("button", { name: "Check answer" }).click();
    if (
      await lesson.getByRole("button", { name: "Next lesson step" }).isEnabled()
    )
      await lesson.getByRole("button", { name: "Next lesson step" }).click();
  }
  await expect(lesson.getByText(/5 of 5 checkpoints/)).toBeVisible();
  await expect(
    lesson.getByRole("button", { name: "Export my plan and citations" }),
  ).toBeDisabled();
  await lesson
    .getByLabel("Your first-change plan")
    .fill(
      "Clarify a validation error; update its governing scenario and CLI test.",
    );
  const downloaded = page.waitForEvent("download");
  await lesson
    .getByRole("button", { name: "Export my plan and citations" })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("first-change-plan.txt");
  await lesson.getByRole("button", { name: "Restart lesson" }).click();
  await expect(lesson.getByText(/0 of 5 checkpoints/)).toBeVisible();
  await expect(lesson.getByLabel("Your first-change plan")).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("incomplete evidence is explicit and artifact replacement clears the lesson", async ({
  page,
}) => {
  await page.goto("/");
  const input = lessonFixture();
  input.bundle.steps[0].evidence = {
    type: "unavailable",
    reason: "missing-object",
  };
  await load(page, input);
  await expect(page.locator(".guided-lesson").getByRole("alert")).toContainText(
    "missing or truncated",
  );
  await expect(
    page
      .locator(".guided-lesson")
      .getByRole("button", { name: "Check answer" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Return to the field-guide sample" })
    .click();
  await expect(page.locator(".guided-lesson")).toHaveCount(0);
});
test("new snapshot selection prevents an old workflow assembly from reappearing", async ({
  page,
}) => {
  await page.goto("/");
  await load(page);
  await page
    .getByLabel("Choose a local workflow bundle JSON file")
    .setInputFiles({
      name: "next.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(lessonFixture().bundle)),
    });
  await page.getByLabel("Choose a local snapshot JSON file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(page.locator(".guided-lesson")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeVisible();
});
