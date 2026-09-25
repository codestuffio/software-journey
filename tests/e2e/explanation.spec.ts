import { expect, test } from "@playwright/test";
import { explanationFixture } from "../fixtures/explanation";

test("matching explanation stays local, displays labels, and clears on invalid input or restart", async ({
  page,
}) => {
  const { input, report } = await explanationFixture();
  let external = 0;
  await page.route("https://**", (route) => {
    external++;
    return route.abort();
  });
  await page.goto("/");
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
  const file = {
    name: "explanation.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(report)),
  };
  await page.getByLabel("Open a local explanation report").setInputFiles(file);
  await expect(
    page.getByRole("heading", { name: "Model inference" }),
  ).toBeVisible();
  await expect(page.getByText(/Unverified model interpretation/)).toBeVisible();
  await expect(page.locator(".explanation-report img")).toHaveCount(0);
  expect(external).toBe(0);
  await page
    .getByLabel("Open a local explanation report")
    .setInputFiles({ ...file, buffer: Buffer.from("{}") });
  await expect(
    page.locator(".explanation-report").getByRole("alert"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Model inference" }),
  ).toHaveCount(0);
  await page.getByLabel("Open a local explanation report").setInputFiles(file);
  await expect(
    page.getByRole("heading", { name: "Model inference" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restart lesson" }).click();
  await expect(
    page.getByRole("heading", { name: "Model inference" }),
  ).toHaveCount(0);
  expect(external).toBe(0);
});

test("a slow report selection cannot replace a newer invalid selection", async ({
  page,
}) => {
  const { input, report } = await explanationFixture();
  await page.goto("/");
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
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      const value = await original.call(this);
      if (this.name === "slow-report.json")
        await new Promise((resolve) => setTimeout(resolve, 100));
      return value;
    };
  });
  await page.getByLabel("Open a local explanation report").setInputFiles({
    name: "slow-report.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(report)),
  });
  await page.getByLabel("Open a local explanation report").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(
    page.locator(".explanation-report").getByRole("alert"),
  ).toBeVisible();
  await page.waitForTimeout(200);
  await expect(
    page.getByRole("heading", { name: "Model inference" }),
  ).toHaveCount(0);
});
