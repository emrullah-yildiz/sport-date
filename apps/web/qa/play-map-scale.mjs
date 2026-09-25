// Local-only Play Map scale/travel QA. Start Next on port 3015, then run:
// node apps/web/qa/play-map-scale.mjs
// All fixtures are fictional. No API requests, external hosts, or writes are permitted.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.env.CONCEPT_QA_URL ?? "http://127.0.0.1:3015";
const origin = new URL(base);
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) throw new Error("Play Map QA requires a localhost URL.");
const artifacts = new URL("./artifacts/play-map-scale/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const failures = [];
const networkViolations = [];
const browserErrors = [];
const passed = [];
const browser = await chromium.launch({ headless: true });

async function guard(context) {
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || !["GET", "HEAD"].includes(request.method())
      || /^\/api(?:\/|$)/.test(url.pathname)) {
      networkViolations.push({ method: request.method(), url: request.url() });
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
}

async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, artifacts)), fullPage: true, animations: "disabled", style: "nextjs-portal { visibility: hidden !important; }" });
}

async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => {
    const surface = document.querySelector("[data-theme][data-view]");
    return { document: document.documentElement.scrollWidth - innerWidth, surface: surface.scrollWidth - surface.clientWidth };
  });
  expect(sizes.document, `${label}: document overflow`).toBeLessThanOrEqual(1);
  expect(sizes.surface, `${label}: concept surface overflow`).toBeLessThanOrEqual(1);
}

async function resultCount(surface) {
  return Number(await surface.getByTestId("map-result-count").getAttribute("data-count"));
}

async function clusterConservation(surface, expected) {
  const clusters = surface.locator("button[data-cluster-count]");
  const counts = await clusters.evaluateAll(buttons => buttons.map(button => Number(button.dataset.clusterCount)));
  expect(counts.length, "A city overview groups games into a bounded number of broad areas").toBeLessThanOrEqual(10);
  expect(counts.every(count => count > 0), "No empty area markers").toBe(true);
  expect(counts.reduce((sum, count) => sum + count, 0), "Clusters conserve the filtered game count").toBe(expected);
}

async function openFilters(surface) {
  const more = surface.getByRole("button", { name: /^More filters/ });
  if (await more.getAttribute("aria-expanded") !== "true") await more.click();
}

async function clearFilters(surface) {
  await surface.getByRole("button", { name: "Clear filters", exact: true }).click();
}

async function check(width) {
  const name = `map-${width}`;
  const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 960 : 844 }, hasTouch: true });
  await guard(context);
  const page = await context.newPage();
  page.on("pageerror", error => browserErrors.push({ case: name, message: error.message }));
  try {
    await page.goto(`${base}/concepts`, { waitUntil: "networkidle" });
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: /Play Map/ }).click();
    const surface = page.locator('[data-theme="map"][data-view="discover"]');
    await expect(surface).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await noOverflow(page, `${name}: initial`);

    const destination = surface.getByLabel("Destination", { exact: true });
    const arrive = surface.getByLabel("Arrive from", { exact: true });
    const leave = surface.getByLabel("Leave by", { exact: true });
    const views = surface.getByRole("group", { name: "Activity view" });
    const rows = surface.locator("[data-game-id]");
    const count = surface.getByTestId("map-result-count");
    const nav = surface.getByRole("navigation", { name: "Concept navigation" });
    await expect(destination).toHaveValue("bucharest");
    await expect(count).toHaveAttribute("data-count", "100");
    await clusterConservation(surface, 100);
    await expect(rows).toHaveCount(8);
    await screenshot(page, `${name}-map`);

    // Broad-area markers remain useful at 100 games and are keyboard operable.
    const firstCluster = surface.locator("button[data-cluster-count]").first();
    const areaCount = Number(await firstCluster.getAttribute("data-cluster-count"));
    const areaId = await firstCluster.getAttribute("data-area-id");
    await firstCluster.focus();
    await page.keyboard.press("Enter");
    await expect(count).toHaveAttribute("data-count", String(areaCount));
    await clusterConservation(surface, areaCount);
    await openFilters(surface);
    await expect(surface.getByLabel("Area", { exact: true })).toHaveValue(areaId);
    await surface.getByRole("button", { name: "All areas", exact: true }).click();
    await expect(count).toHaveAttribute("data-count", "100");

    // The alternative list can reach every fixture without rendering 100 cards.
    await views.getByRole("button", { name: "List", exact: true }).click();
    await expect(views.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(surface.locator("button[data-cluster-count]")).toHaveCount(0);
    const firstPageIds = await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId));
    await expect(surface.getByRole("button", { name: "Previous games", exact: true })).toBeDisabled();
    await surface.getByRole("button", { name: "Next games", exact: true }).click();
    await expect(surface.getByRole("heading", { name: "Your next game", exact: true })).toBeFocused();
    await expect(rows).toHaveCount(8);
    expect(await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId))).not.toEqual(firstPageIds);
    await surface.getByRole("button", { name: "Previous games", exact: true }).click();
    expect(await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId))).toEqual(firstPageIds);
    if (width === 1280) {
      const collectedIds = [];
      for (let pageIndex = 0; pageIndex < 13; pageIndex++) {
        collectedIds.push(...await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId)));
        if (pageIndex < 12) await surface.getByRole("button", { name: "Next games", exact: true }).click();
      }
      expect(collectedIds.length).toBe(100);
      expect(new Set(collectedIds).size, "Every game is reachable exactly once across pages").toBe(100);
      await expect(surface.getByRole("button", { name: "Next games", exact: true })).toBeDisabled();
      await expect(rows).toHaveCount(4);
    }

    for (const city of ["barcelona", "lisbon", "bucharest"]) {
      await destination.selectOption(city);
      await expect(count).toHaveAttribute("data-count", "100");
      await expect(rows).toHaveCount(8);
      await expect(surface.getByRole("button", { name: "Previous games", exact: true })).toBeDisabled();
      await views.getByRole("button", { name: "Map", exact: true }).click();
      await clusterConservation(surface, 100);
    }
    await destination.selectOption("barcelona");
    await expect(surface).toContainText(/Barcelona/);
    await expect(surface).toContainText(/Times in CEST · UTC\+2/);
    await arrive.fill("2026-10-03");
    await leave.fill("2026-10-05");
    expect(await resultCount(surface)).toBeGreaterThan(0);
    expect(await resultCount(surface)).toBeLessThan(100);
    await clusterConservation(surface, await resultCount(surface));
    for (const date of await rows.evaluateAll(elements => elements.map(element => element.dataset.gameDate))) {
      expect(date >= "2026-10-03" && date <= "2026-10-05", `Game date ${date} is within trip dates`).toBe(true);
    }
    await screenshot(page, `${name}-travel`);
    await clearFilters(surface);
    await expect(destination).toHaveValue("barcelona");
    await expect(arrive).toHaveValue("");
    await expect(leave).toHaveValue("");
    await expect(count).toHaveAttribute("data-count", "100");

    const sportFilter = surface.getByRole("group", { name: "Filter activities" });
    for (const sport of ["Tennis", "Running", "Padel"]) {
      await sportFilter.getByRole("button", { name: sport, exact: true }).click();
      expect(await resultCount(surface)).toBeGreaterThan(0);
      expect(await resultCount(surface)).toBeLessThan(100);
      expect(await rows.evaluateAll(elements => elements.every(element => element.dataset.gameSport === elements[0].dataset.gameSport))).toBe(true);
      await expect(rows.first()).toHaveAttribute("data-game-sport", sport);
      await clusterConservation(surface, await resultCount(surface));
    }
    await sportFilter.getByRole("button", { name: "Anything goes", exact: true }).click();
    await openFilters(surface);
    const level = surface.getByLabel("Skill level", { exact: true });
    const time = surface.getByLabel("Time of day", { exact: true });
    const language = surface.getByLabel("Language", { exact: true });
    const places = surface.getByLabel("Places available", { exact: true });
    const free = surface.getByLabel("Free games only", { exact: true });
    for (const skill of ["beginner", "intermediate", "advanced"]) {
      await level.selectOption(skill);
      expect(await resultCount(surface)).toBeGreaterThan(0);
      expect(await resultCount(surface)).toBeLessThan(100);
    }
    await level.selectOption("any");
    for (const period of ["morning", "afternoon", "evening"]) {
      await time.selectOption(period);
      expect(await resultCount(surface)).toBeGreaterThan(0);
      expect(await resultCount(surface)).toBeLessThan(100);
      const hours = await rows.evaluateAll(elements => elements.map(element => Number(element.dataset.gameTime.split(":")[0])));
      expect(hours.every(hour => period === "morning" ? hour < 12 : period === "afternoon" ? hour >= 12 && hour < 17 : hour >= 17), `${period} matches destination-local times`).toBe(true);
    }
    await time.selectOption("any");
    await language.selectOption("English");
    expect(await resultCount(surface)).toBeGreaterThan(0);
    expect(await rows.evaluateAll(elements => elements.every(element => element.dataset.gameLanguage.includes("English")))).toBe(true);
    await language.selectOption("any");
    await places.check();
    expect(await resultCount(surface)).toBeGreaterThan(0);
    expect(await resultCount(surface)).toBeLessThan(100);
    expect(await rows.evaluateAll(elements => elements.every(element => Number(element.dataset.gamePlaces) > 0))).toBe(true);
    await places.uncheck();
    await free.check();
    expect(await resultCount(surface)).toBeGreaterThan(0);
    expect(await resultCount(surface)).toBeLessThan(100);
    expect(await rows.evaluateAll(elements => elements.every(element => element.dataset.gameFree === "true"))).toBe(true);
    await noOverflow(page, `${name}: expanded filters`);
    await screenshot(page, `${name}-filters`);
    await clearFilters(surface);
    const sort = surface.getByLabel("Sort games", { exact: true });
    await sort.selectOption("availability");
    const sortedPlaces = await rows.evaluateAll(elements => elements.map(element => Number(element.dataset.gamePlaces)));
    expect(sortedPlaces).toEqual([...sortedPlaces].sort((left, right) => right - left));
    await sort.selectOption("soonest");
    const sortedDates = await rows.evaluateAll(elements => elements.map(element => `${element.dataset.gameDate}T${element.dataset.gameTime}`));
    expect(sortedDates).toEqual([...sortedDates].sort());

    // Invalid ranges and valid ranges with no fixtures are different recoverable states.
    await arrive.fill("2026-10-08");
    await leave.fill("2026-10-02");
    await expect(surface.getByRole("alert")).toBeVisible();
    await arrive.fill("2026-11-01");
    await leave.fill("2026-11-03");
    await expect(surface.getByRole("alert")).toHaveCount(0);
    await expect(count).toHaveAttribute("data-count", "0");
    await expect(rows).toHaveCount(0);
    await expect(surface.getByRole("heading", { level: 3 })).toBeVisible();
    await noOverflow(page, `${name}: no results`);
    await screenshot(page, `${name}-empty`);
    await clearFilters(surface);

    // Event navigation preserves the travel plan, selected sport, view, and page.
    await arrive.fill("2026-10-02");
    await leave.fill("2026-10-08");
    await sportFilter.getByRole("button", { name: "Tennis", exact: true }).click();
    await openFilters(surface);
    await places.check();
    await views.getByRole("button", { name: "List", exact: true }).click();
    await surface.getByRole("button", { name: "Next games", exact: true }).click();
    const preservedIds = await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId));
    const preservedCount = await resultCount(surface);
    const selectedDate = await rows.first().getAttribute("data-game-date");
    await rows.locator("button").first().click();
    const eventSurface = page.locator('[data-theme="map"][data-view="event"]');
    await expect(eventSurface).toBeVisible();
    await expect(eventSurface).toContainText("Barcelona");
    await expect(eventSurface).toContainText(`Barcelona, Spain · ${selectedDate}`);
    await expect(eventSurface).toContainText("Local time · CEST · UTC+2");
    const selectedTitle = await eventSurface.getByRole("heading", { level: 1 }).innerText();
    await eventSurface.getByRole("button", { name: /Say hello to Mara/ }).click();
    const profileSurface = page.locator('[data-theme="map"][data-view="profile"]');
    await expect(profileSurface).toBeVisible();
    await profileSurface.getByRole("button", { name: "Back to the tennis game", exact: true }).click();
    await expect(eventSurface).toBeVisible();
    await expect(eventSurface.getByRole("heading", { level: 1 })).toHaveText(selectedTitle);
    await expect(eventSurface).toContainText("Barcelona");
    await eventSurface.getByRole("button", { name: "Request to join", exact: true }).click();
    await expect(eventSurface).toContainText("Requested");
    await eventSurface.getByRole("button", { name: "Back to discovery", exact: true }).click();
    await expect(surface).toBeVisible();
    await expect(destination).toHaveValue("barcelona");
    await expect(arrive).toHaveValue("2026-10-02");
    await expect(leave).toHaveValue("2026-10-08");
    await expect(sportFilter.getByRole("button", { name: "Tennis", exact: true })).toHaveAttribute("aria-pressed", "true");
    await openFilters(surface);
    await expect(places).toBeChecked();
    await expect(views.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await resultCount(surface)).toBe(preservedCount);
    expect(await rows.evaluateAll(elements => elements.map(element => element.dataset.gameId))).toEqual(preservedIds);
    await noOverflow(page, `${name}: restored discovery`);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await views.getByRole("button", { name: "Map", exact: true }).click();
    const moving = await surface.locator("*").evaluateAll(elements => elements.filter(element => {
      const style = getComputedStyle(element);
      return style.animationName !== "none" || style.transitionDuration.split(",").some(value => parseFloat(value) > 0);
    }).map(element => element.tagName));
    expect(moving, "Reduced motion disables Play Map animation and transition").toEqual([]);
    await clearFilters(surface);
    await expect(destination).toHaveValue("barcelona");
    await expect(count).toHaveAttribute("data-count", "100");
    await clusterConservation(surface, 100);
    await expect(nav.getByRole("button", { name: "Find a game", exact: true })).toBeVisible();
    const fullGame = surface.locator('[data-game-id][data-game-places="0"]').first();
    await expect(fullGame).toBeVisible();
    await fullGame.getByRole("button").click();
    await expect(eventSurface).toBeVisible();
    await expect(eventSurface.getByRole("button", { name: "This game is full", exact: true })).toBeDisabled();
    await eventSurface.getByRole("navigation", { name: "Concept navigation" }).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(surface).toBeVisible();
    // A profile opened afresh from discovery must respect a changed trip, not an old event.
    await arrive.fill("2026-10-06");
    await leave.fill("2026-10-06");
    await nav.getByRole("button", { name: "Player card", exact: true }).click();
    await expect(profileSurface).toBeVisible();
    await profileSurface.getByRole("button", { name: "Find a tennis game", exact: true }).click();
    await expect(surface).toBeVisible();
    await expect(destination).toHaveValue("barcelona");
    await expect(arrive).toHaveValue("2026-10-06");
    await expect(leave).toHaveValue("2026-10-06");
    expect(await rows.evaluateAll(elements => elements.every(element => element.dataset.gameDate === "2026-10-06"))).toBe(true);
    expect(await resultCount(surface)).toBeGreaterThan(0);
    await expect(sportFilter.getByRole("button", { name: "Tennis", exact: true })).toHaveAttribute("aria-pressed", "true");
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ case: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `${name}-FAIL`).catch(() => {});
  } finally { await context.close(); }
}

try {
  for (const width of [1280, 390, 320]) await check(width);
  expect(networkViolations, "No API, external host, or write requests").toEqual([]);
  expect(browserErrors, "Browser runtime errors").toEqual([]);
} catch (error) { failures.push({ case: "global", message: error.message }); }
finally {
  await writeFile(new URL("results.json", artifacts), JSON.stringify({ passed, failures, networkViolations, browserErrors }, null, 2));
  await browser.close();
}
console.log(`Play Map QA: ${passed.length}/3 cases passed. Artifacts: ${fileURLToPath(artifacts)}`);
if (failures.length) process.exitCode = 1;
