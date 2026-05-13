const { expect, test } = require("@playwright/test");

const FIT_STORAGE_KEY = "caterham-academy-2026:delivery-fit-builder:v2";
const DEFAULT_PARTS = [
  "anti-slip-tape",
  "brake-pads",
  "camera-lens",
  "centre-mirror",
  "dash-timer",
  "foot-camera",
  "front-arb",
  "fuel-drain",
  "half-sidescreens",
  "impact-bar",
  "master-cylinder-cap",
  "race-mirror",
  "steering-wheel",
];

async function checkedBuilderParts(page) {
  return page.locator("[data-builder-choice]").evaluateAll((choices) =>
    choices
      .filter((choice) => choice.checked)
      .map((choice) => choice.dataset.builderChoice)
      .sort(),
  );
}

async function storedBuilderParts(page) {
  return page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]").sort();
  }, FIT_STORAGE_KEY);
}

async function visibleFitParts(page) {
  return page.locator("[data-fit-item]").evaluateAll((items) =>
    items
      .filter((item) => !item.classList.contains("is-fit-hidden"))
      .map((item) => item.dataset.fitItem)
      .sort(),
  );
}

async function seedBuilderStorage(page, parts) {
  await page.goto("/delivery-prep-builder.html#builder");
  await page.evaluate(
    ({ parts: selectedParts, storageKey }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(selectedParts));
    },
    { parts, storageKey: FIT_STORAGE_KEY },
  );
}

test("uses the recommended prep jobs by default and generates the full fitment list", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#builder");

  await expect(page.locator("[data-fit-summary]")).toHaveText("13 prep jobs selected.");
  expect(await checkedBuilderParts(page)).toEqual(DEFAULT_PARTS);
  expect(await storedBuilderParts(page)).toEqual(DEFAULT_PARTS);

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator('[data-fit-summary-mode="selected"]')).toHaveText("13 prep jobs selected.");
  await expect(page.locator('[data-fit-summary-mode="shown"]')).toHaveText("13 fitment jobs shown.");
  expect(await visibleFitParts(page)).toEqual(DEFAULT_PARTS);
  await expect(page.locator("[data-fit-empty]")).toBeHidden();
});

test("steps through the builder and sends the user back to the generated checklist", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#builder");

  await expect(page.locator('[data-builder-panel="body"]')).toBeVisible();
  await expect(page.locator("[data-builder-prev]")).toBeDisabled();

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/#brakes$/);
  await expect(page.locator('[data-builder-panel="brakes"]')).toBeVisible();
  await expect(page.locator("[data-builder-prev]")).toBeEnabled();

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/#setup$/);
  await expect(page.locator('[data-builder-panel="setup"]')).toBeVisible();

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/#review$/);
  await expect(page.locator('[data-builder-panel="review"]')).toBeVisible();
  await expect(page.locator("[data-builder-next]")).toHaveText("View checklist");

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/\/delivery-prep\.html#generated-checklist$/);
});

test("clears saved prep jobs and keeps the delivery checklist editable", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#review");

  await page.getByRole("button", { name: "Clear choices" }).click();

  await expect(page.locator("[data-fit-summary]")).toHaveText("0 prep jobs selected.");
  expect(await checkedBuilderParts(page)).toEqual([]);
  expect(await storedBuilderParts(page)).toEqual([]);

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator('[data-fit-summary-mode="selected"]')).toHaveText("0 prep jobs selected.");
  await expect(page.locator('[data-fit-summary-mode="shown"]')).toHaveText("0 fitment jobs shown.");
  expect(await visibleFitParts(page)).toEqual([]);
  await expect(page.locator("[data-fit-empty]")).toBeVisible();
  await expect(page.locator("[data-fit-empty]")).toHaveText("Use Edit prep jobs to add optional parts to this list.");

  await page.locator(".delivery-builder").getByRole("link", { name: "Edit prep jobs" }).click();
  await expect(page).toHaveURL(/\/delivery-prep-builder\.html#builder$/);
});

test("adds required dependent jobs without saving them as explicit choices", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#review");
  await page.getByRole("button", { name: "Clear choices" }).click();
  await page.locator('[data-builder-step-target="body"]').click();

  const halfSidescreens = page.locator('[data-builder-choice="half-sidescreens"]');
  const raceMirror = page.locator('[data-builder-choice="race-mirror"]');
  const raceMirrorOption = page
    .locator('[data-builder-choice="race-mirror"]')
    .locator("xpath=ancestor::*[@data-builder-option]");

  await halfSidescreens.check();

  await expect(halfSidescreens).toBeChecked();
  await expect(raceMirror).toBeChecked();
  await expect(raceMirrorOption).toHaveClass(/is-dependency-selected/);
  await expect(page.locator("[data-fit-summary]")).toHaveText("2 prep jobs selected.");
  expect(await storedBuilderParts(page)).toEqual(["half-sidescreens"]);

  await halfSidescreens.uncheck();

  await expect(halfSidescreens).not.toBeChecked();
  await expect(raceMirror).not.toBeChecked();
  await expect(raceMirrorOption).not.toHaveClass(/is-dependency-selected/);
  await expect(page.locator("[data-fit-summary]")).toHaveText("0 prep jobs selected.");
  expect(await storedBuilderParts(page)).toEqual([]);
});

test("expands saved dependencies when rendering the delivery checklist", async ({ page }) => {
  await seedBuilderStorage(page, ["half-sidescreens"]);

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator('[data-fit-summary-mode="selected"]')).toHaveText("2 prep jobs selected.");
  await expect(page.locator('[data-fit-summary-mode="shown"]')).toHaveText("2 fitment jobs shown.");
  expect(await visibleFitParts(page)).toEqual(["half-sidescreens", "race-mirror"]);
});
