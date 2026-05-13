const { expect, test } = require("@playwright/test");

const FIT_STORAGE_KEY = "caterham-academy-2026:delivery-fit-builder:v2";
const DRIVER_FIT_STORAGE_KEY = "caterham-academy-2026:delivery-driver-fit:v1";
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

async function seedDriverFitStorage(page, state) {
  await page.goto("/delivery-prep-builder.html#builder");
  await page.evaluate(
    ({ driverFitState, storageKey }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(driverFitState));
    },
    { driverFitState: state, storageKey: DRIVER_FIT_STORAGE_KEY },
  );
}

test("uses the recommended prep jobs by default and generates the full fitment list", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#builder");

  await expect(page.locator("[data-driver-fit-summary]").first()).toHaveText(
    "Helmet clearance has not been checked yet.",
  );
  await expect(page.locator("[data-fit-summary]")).toHaveText("13 prep jobs selected.");
  expect(await checkedBuilderParts(page)).toEqual(DEFAULT_PARTS);
  expect(await storedBuilderParts(page)).toEqual(DEFAULT_PARTS);

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator('[data-fit-summary-mode="selected"]')).toHaveText("13 prep jobs selected.");
  await expect(page.locator("[data-driver-fit-summary]")).toHaveText(
    "Helmet clearance has not been checked yet.",
  );
  await expect(page.locator('[data-fit-summary-mode="shown"]')).toHaveText("13 fitment jobs shown.");
  await expect(page.getByText("Measure helmet-to-roll-cage clearance")).toBeVisible();
  await expect(page.getByText("Choose the seat path after measuring clearance")).toBeVisible();
  expect(await visibleFitParts(page)).toEqual(DEFAULT_PARTS);
  await expect(page.locator("[data-fit-empty]")).toBeHidden();
});

test("steps through the builder and sends the user back to the generated checklist", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#builder");

  await expect(page.locator('[data-builder-panel="fit"]')).toBeVisible();
  await expect(page.locator('[data-builder-panel="body"]')).toBeHidden();
  await expect(page.locator("[data-builder-prev]")).toBeDisabled();

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/#body$/);
  await expect(page.locator('[data-builder-panel="body"]')).toBeVisible();
  await expect(page.locator("[data-builder-prev]")).toBeEnabled();

  await page.locator("[data-builder-next]").click();
  await expect(page).toHaveURL(/#brakes$/);
  await expect(page.locator('[data-builder-panel="brakes"]')).toBeVisible();

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

test("generates a keep-seat path when helmet clearance is already 5 cm or more", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#fit");

  await page.locator('[data-driver-fit-choice="clearance"][value="pass"]').check();
  await page.locator('[data-driver-fit-choice="seatPlan"][value="keep-tillett"]').first().check();

  await expect(page.locator('[data-driver-fit-conditional="clearance-pass"]')).toBeVisible();
  await expect(page.locator("[data-driver-fit-summary]").first()).toHaveText(
    "Helmet clearance is 5 cm or more; keeping the original Tillett seat.",
  );

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator("[data-driver-fit-summary]")).toHaveText(
    "Helmet clearance is 5 cm or more; keeping the original Tillett seat.",
  );
  await expect(page.getByText("Confirm helmet-to-roll-cage clearance is at least 5 cm")).toBeVisible();
  await expect(page.getByText("Keep the original Tillett seat")).toBeVisible();
  await expect(page.getByText("Fit front seat spacers to tilt the seat back")).toHaveCount(0);
  await expect(page.getByText("Book bead seat fitting and covering")).toHaveCount(0);
});

test("generates a spacer and bead-seat path when clearance remains below 5 cm", async ({ page }) => {
  await page.goto("/delivery-prep-builder.html#fit");

  await page.locator('[data-driver-fit-choice="clearance"][value="fail"]').check();
  await page.locator('[data-driver-fit-choice="adjustedClearance"][value="fail"]').check();

  await expect(page.locator('[data-driver-fit-conditional="clearance-fail"]')).toBeVisible();
  await expect(page.locator("[data-driver-fit-summary]").first()).toHaveText(
    "Helmet clearance remains under 5 cm after front spacers; bead seat required.",
  );

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator("[data-driver-fit-summary]")).toHaveText(
    "Helmet clearance remains under 5 cm after front spacers; bead seat required.",
  );
  await expect(page.getByText("Record helmet-to-roll-cage clearance below 5 cm")).toBeVisible();
  await expect(page.getByText("Fit front seat spacers to tilt the seat back")).toBeVisible();
  await expect(page.getByText("Recheck helmet clearance after fitting spacers")).toBeVisible();
  await expect(page.getByText("Book bead seat fitting and covering")).toBeVisible();
  await expect(page.getByText("Keep the original Tillett seat")).toHaveCount(0);
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

test("does not include immobiliser bypass as a routine checklist job", async ({ page }) => {
  await page.goto("/delivery-prep.html#todo");

  await expect(page.locator("#todo").getByText("Arrange immobiliser bypass")).toHaveCount(0);
  await expect(page.locator("#prep-mods").getByText("Immobiliser bypass")).toHaveCount(1);
});

test("includes catch tank cap drilling and oil-resistant sponge prep", async ({ page }) => {
  await page.goto("/delivery-prep.html#todo");

  await expect(page.getByText("Drill catch tank cap and fit oil-resistant sponge")).toBeVisible();
  await expect(page.getByText("The catch tank cap is not drilled as supplied.")).toBeVisible();
  await expect(page.getByText("The drilling is expected from the factory now")).toHaveCount(0);
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

test("expands saved driver fit state when rendering the delivery checklist", async ({ page }) => {
  await seedDriverFitStorage(page, {
    clearance: "fail",
    adjustedClearance: "pass",
    seatPlan: "bead-seat",
  });

  await page.goto("/delivery-prep.html#generated-checklist");

  await expect(page.locator("[data-driver-fit-summary]")).toHaveText(
    "Helmet clearance reaches 5 cm or more after front spacers; fitting a bead seat by choice.",
  );
  await expect(page.getByText("Fit front seat spacers to tilt the seat back")).toBeVisible();
  await expect(page.getByText("Book bead seat fitting and covering")).toBeVisible();
});
