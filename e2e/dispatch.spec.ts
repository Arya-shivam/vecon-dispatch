import { test, expect } from "@playwright/test";
test("operator creates master data, dispatches a job, and sees persisted totals", async ({
  page,
}) => {
  const stamp = Date.now().toString();
  await page.goto("/trucks");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Registration", { exact: true }).fill("TEST-" + stamp);
  await page.getByLabel("WT (tons per trip)").fill("32.5");
  await page.getByLabel("Truck type").fill("Tipper");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("TEST-" + stamp, { exact: true })).toBeVisible();
  await page.goto("/d/2026-11-01/new");
  await page.getByLabel("Work order number").fill("E2E-" + stamp);
  await page.getByLabel("Target tonnage (t)").fill("100");
  await page.getByLabel("Planning WT (t/trip)").fill("32.5");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "TEST-" + stamp }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Planned trips for TEST-" + stamp).fill("3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("3 planned trips · 97.5 t capacity"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create job", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daily jobs", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Work order E2E-" + stamp)).toBeVisible();
  await page
    .getByRole("button", {
      name: `Truck TEST-${stamp}, trip 1, Not started. Change to In progress`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `Truck TEST-${stamp}, trip 1, In progress. Change to Completed`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Truck TEST-${stamp}, trip 1, Completed. Change to Not started`,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("32.5 t", { exact: true })).toBeVisible();
  await expect(page.getByText("32.5%", { exact: true })).toBeVisible();
  await page.locator("input[name=planned]").fill("1");
  await page.getByRole("button", { name: "Update plan" }).click();
  await expect(
    page.getByRole("button", {
      name: `Truck TEST-${stamp}, trip 2`,
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: `Truck TEST-${stamp}, trip 1, Completed. Change to Not started`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reports", exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Install on your phone" }),
  ).toBeVisible();
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/d/2026-11-01");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".taste-skill/daily-mobile.png",
    fullPage: true,
  });
});
