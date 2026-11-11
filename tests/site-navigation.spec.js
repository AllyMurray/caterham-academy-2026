const { expect, test } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const pages = fs.readdirSync(path.join(__dirname, "..")).filter((file) => file.endsWith(".html"));

for (const width of [1440, 1060, 820, 390]) {
  test(`all pages are navigable and fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    const inventory = new Map();
    const links = [];
    for (const file of pages) {
      await page.goto(`/${file}`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toBeVisible();
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        contentWidth: document.documentElement.scrollWidth,
        ids: Array.from(document.querySelectorAll("[id]"), (element) => element.id),
        links: Array.from(document.querySelectorAll('a[href]'), (element) => element.getAttribute("href")),
      }));
      expect(metrics.contentWidth, file).toBeLessThanOrEqual(metrics.width);
      expect(new Set(metrics.ids).size, `Unique IDs on ${file}`).toBe(metrics.ids.length);
      inventory.set(file, new Set(metrics.ids));
      links.push(...metrics.links.map((href) => ({ file, href })));
      if (width < 1060) {
        await page.getByRole("button", { name: "Open navigation", exact: true }).click();
        await expect(page.locator("#primary-menu")).toBeVisible();
        await expect(page.locator('#primary-menu a[href="parts.html"]')).toBeVisible();
        await expect(page.locator("main")).toHaveAttribute("inert", "");
        await page.keyboard.press("Escape");
        await expect(page.locator("#primary-menu")).not.toBeVisible();
        await expect(page.locator("main")).not.toHaveAttribute("inert", "");
      } else {
        await expect(page.locator("#primary-menu")).toBeVisible();
      }
      await page.screenshot({ path: `/tmp/academy-redesign-${width}-${file}.png`, fullPage: true });
    }
    for (const { file, href } of links) {
      const url = new URL(href, `http://127.0.0.1:4173/${file}`);
      if (url.origin !== "http://127.0.0.1:4173") continue;
      const destination = url.pathname.slice(1) || "index.html";
      if (!destination.endsWith(".html")) continue;
      expect(inventory.has(destination), `${file} links to ${href}`).toBeTruthy();
      if (url.hash) expect(inventory.get(destination).has(decodeURIComponent(url.hash.slice(1))), `${file} links to ${href}`).toBeTruthy();
    }
    expect(failures).toEqual([]);
  });
}

test("keeps existing workshop progress and makes remaining checks searchable", async ({ page }) => {
  await page.goto("/spanner-checks.html");
  await page.evaluate(() => localStorage.setItem("caterham-academy-2026:spanner-checks:v1", JSON.stringify({ "rear-suspension:1": true })));
  await page.reload();
  const chassis = page.locator("#checklist-rear-suspension-1");
  await expect(chassis).toBeChecked();
  await expect(page.locator("#checklist-progress")).toHaveText("1 of 53 checks complete.");
  await expect(page.locator("[data-checklist=rear-suspension]").locator("li").first()).toContainText("47 Nm.");
  await expect(page.locator(".checklist-group").filter({ has: chassis }).locator(".group-progress")).toHaveText("1 / 9");
  await page.locator("#remaining-only").check();
  await expect(chassis).not.toBeVisible();
  await page.locator("#site-search").fill("radius arms");
  await expect(page.locator("#checklist-rear-suspension-2")).toBeVisible();
  await expect(page.locator("#checklist-rear-suspension-2").locator("..")).toContainText("81 Nm.");
  await page.locator("#site-search").fill("no-such-component");
  await expect(page.locator("#filter-empty")).toBeVisible();
  await page.getByRole("button", { name: "Clear filter" }).click();
  await expect(page.locator("#filter-empty")).not.toBeVisible();
  await page.locator("#remaining-only").uncheck();
  await expect(chassis).toBeVisible();
  await page.locator("[data-checklist=rear-suspension]").evaluate((list) => { list.closest("details").open = false; });
  await page.locator("#site-search").fill("17mm");
  await expect(chassis).toBeVisible();
  await expect(page.locator("#checklist-progress")).toHaveText("1 of 53 checks complete.");
});

test("search returns matching sections and accepts queries from the shared header", async ({ page }) => {
  await page.goto("/parts.html");
  await page.getByRole("searchbox", { name: "Search the whole guide", exact: true }).fill("radius arms");
  await page.locator(".nav-search button").click();
  await expect(page).toHaveURL(/search\.html\?q=radius/);
  await expect(page.locator("#global-search")).toHaveValue("radius arms");
  const result = page.locator(".search-result").filter({ hasText: "Rear Suspension" }).first();
  await expect(result).toContainText(/radius/i);
  await result.locator("h3 a").click();
  await expect(page).toHaveURL(/spanner-checks\.html#rear-suspension/);
  await expect(page.locator("#checklist-rear-suspension-1")).toBeVisible();
  await page.goto("/search.html?q=30P307E");
  await expect(page.locator("#global-search-results")).toContainText("30P307E");
  await expect(page.locator("#global-search-results mark").first()).toHaveText(/30P307E/i);
  await page.locator("#global-search").fill("no-such-component");
  await expect(page.locator(".empty-results")).toContainText("Try fewer words");
});

test("mobile navigation routes directly to every guide and closes after selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.locator('#primary-menu a[href="guide-safety.html"]').click();
  await expect(page).toHaveURL(/guide-safety\.html$/);
  await expect(page.getByRole("heading", { name: "Harness & safety", level: 1 })).toBeVisible();
  await expect(page.locator("#primary-menu")).not.toBeVisible();
  await page.getByRole("link", { name: "Search the whole guide", exact: true }).click();
  await expect(page.locator("#global-search")).toBeVisible();
});

test("mobile deep links reveal the destination below the sticky navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/parts.html#brakes");
  const top = () => page.locator("#brakes").evaluate((element) => Math.round(element.getBoundingClientRect().top));
  await expect.poll(top).toBeGreaterThanOrEqual(110);
  await expect.poll(top).toBeLessThan(160);
  const active = page.locator('.on-page-nav a[href="#brakes"]');
  await expect(active).toHaveAttribute("aria-current", "location");
  const visible = await active.evaluate((link) => {
    const nav = link.closest("nav").getBoundingClientRect();
    const bounds = link.getBoundingClientRect();
    return bounds.left >= nav.left && bounds.right <= nav.right;
  });
  expect(visible).toBeTruthy();
});

test.describe("offline field guide", () => {
  test.use({ serviceWorkers: "allow" });

  test("opens a new section search offline using the cached pages and index", async ({ page, context }) => {
    await page.goto("/index.html");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.goto("/search.html?q=radius+arms");
    await expect(page.locator("h1")).toHaveText("Find an answer");
    await expect(page.locator(".search-result").first()).toBeVisible();
    await page.locator('.search-result h3 a[href="spanner-checks.html#rear-suspension"]').click();
    await expect(page.locator("#checklist-rear-suspension-1")).toBeVisible();
    await expect(page.locator(".checklist-group").filter({ has: page.locator("#checklist-rear-suspension-1") })).toContainText("47 Nm.");
  });
});
