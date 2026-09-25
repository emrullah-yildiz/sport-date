// Local-only pavilion QA. Start Next on port 3015, then run:
// node apps/web/qa/pavilion.mjs
// Every account and request is a fictional, in-memory preview interaction.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.env.CONCEPT_QA_URL ?? "http://127.0.0.1:3015";
const origin = new URL(base);
const localHosts = ["127.0.0.1", "localhost", "[::1]"];
if (!localHosts.includes(origin.hostname)) throw new Error("Pavilion QA requires a localhost URL.");
const artifacts = new URL("./artifacts/pavilion/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const result = { passed: [], failures: [], violations: [], errors: [], observations: [] };
const requestedCases = new Set((process.env.PAVILION_QA_CASES ?? "").split(",").map(value => value.trim()).filter(Boolean));
const rendererPattern = /(?:pavilion[-_]scene|node_modules_three).*\.js(?:\?|$)/i;
// Turbopack's tiny async-loader stub is part of initial hydration. The actual
// renderer and Three.js are separate downloads and are the progressive asset.
const loaderStubs = new Set();
const html = await (await fetch(`${base}/preview`)).text();
for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
  const url = new URL(match[1], base);
  if (!rendererPattern.test(url.pathname)) continue;
  const source = await (await fetch(url)).text();
  if (source.length < 5000 && source.includes("(ecmascript, async loader)")) loaderStubs.add(url.pathname);
}
function isRendererChunk(url) { return rendererPattern.test(url) && !loaderStubs.has(url); }
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

function main(page) { return page.locator("main[data-preview-view]"); }
function scene(page) { return page.locator("[data-pavilion-state]"); }
function sports(page) { return page.getByRole("group", { name: "Choose a sport", exact: true }); }
function featured(page) { return page.getByRole("region", { name: "Games to get you going.", exact: true }); }
function home(page) { return page.getByRole("button", { name: "KeepItUp home", exact: true }).click(); }

async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, artifacts)), fullPage: true, animations: "disabled", style: "nextjs-portal { visibility: hidden !important; }" });
}

async function layout(page, label) {
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    headings: document.querySelectorAll("main h1").length,
    weight: getComputedStyle(document.querySelector("main h1")).fontWeight,
    outside: [...document.querySelectorAll("main button,main select")].filter(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1);
    }).map(element => element.textContent),
  }));
  expect(metrics.overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(1);
  expect(metrics.headings, `${label}: one primary heading`).toBe(1);
  expect(Number(metrics.weight), `${label}: light headline`).toBeLessThanOrEqual(500);
  expect(metrics.outside, `${label}: controls within viewport`).toEqual([]);
}

async function settleScene(page, expected = "ready") {
  await expect(scene(page)).toHaveAttribute("data-pavilion-state", expected, { timeout: 25000 });
  if (expected === "ready") await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveCount(1);
}

async function demoSignIn(page) {
  await expect(main(page)).toHaveAttribute("data-preview-view", "signin");
  await page.getByRole("button", { name: "Use demo details", exact: true }).click();
  await page.getByRole("button", { name: "Sign in to demo", exact: true }).click();
}

async function run(name, options, check) {
  if (requestedCases.size && !requestedCases.has(name)) return;
  const context = await browser.newContext({ viewport: { width: options.width ?? 390, height: options.height ?? 900 }, hasTouch: true, reducedMotion: options.reducedMotion ?? "no-preference" });
  const requests = [];
  const delayed = [];
  let releaseDelay;
  const delayGate = new Promise(resolve => { releaseDelay = resolve; });
  if (options.noWebGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(url.pathname);
    if (!localHosts.includes(url.hostname) || !["GET", "HEAD"].includes(request.method()) || /^\/api(?:\/|$)/.test(url.pathname)) {
      result.violations.push({ case: name, method: request.method(), url: request.url() });
      return route.abort("blockedbyclient");
    }
    if (options.missingPhoto && /\/mara-(?:tennis|coffee|run)[^/]*\.png$/i.test(url.pathname)) return route.abort("failed");
    if (options.delayScene && isRendererChunk(url.pathname)) { delayed.push(url.pathname); await delayGate; }
    try { await route.continue(); } catch (error) { if (!context.pages().length) return; throw error; }
  });
  const page = await context.newPage();
  page.on("pageerror", error => result.errors.push({ case: name, message: error.message }));
  try {
    await page.goto(`${base}/preview`, { waitUntil: "domcontentloaded" });
    await expect(main(page)).toHaveAttribute("data-preview-view", "home");
    await expect(sports(page)).toBeVisible();
    await check({ page, context, requests, delayed, releaseDelay });
    expect(await page.evaluate(() => localStorage.length), `${name}: no local personal storage`).toBe(0);
    expect(await page.evaluate(() => sessionStorage.length), `${name}: no session personal storage`).toBe(0);
    result.passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    result.failures.push({ case: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `${name}-FAILED`).catch(() => {});
  } finally { releaseDelay(); await context.close(); }
}

try {
  for (const width of [1440, 768, 390, 320]) await run(`${width}-layout-sports`, { width }, async ({ page }) => {
    await settleScene(page);
    await layout(page, "landing");
    for (const sport of ["Tennis", "Running", "Padel", "All sports"]) {
      const button = sports(page).getByRole("button", { name: sport, exact: true });
      await button.focus();
      await page.keyboard.press("Space");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(scene(page)).toHaveAttribute("data-sport", sport === "All sports" ? "All" : sport);
      if (sport !== "All sports") {
        const rows = featured(page).locator("[data-game-id]");
        expect(await rows.count(), `${sport}: matching games available`).toBeGreaterThan(0);
        expect(await rows.evaluateAll(elements => elements.map(element => element.getAttribute("data-game-sport")))).toEqual(Array(await rows.count()).fill(sport));
      }
      await layout(page, sport);
    }
    await page.getByLabel("Play in", { exact: true }).selectOption("barcelona");
    await sports(page).getByRole("button", { name: "Tennis", exact: true }).click();
    const ids = await featured(page).locator("[data-game-id]").evaluateAll(elements => elements.map(element => element.getAttribute("data-game-id")));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => id.startsWith("barcelona-"))).toBe(true);
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    await expect(scene(page)).toHaveAttribute("data-paused", "true");
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "false");
    await screenshot(page, `${width}-pavilion`);
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main(page)).toHaveAttribute("data-preview-view", "discover");
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue("barcelona");
    await expect(page.getByRole("group", { name: "Filter activities", exact: true }).getByRole("button", { name: "Tennis", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  await run("filters-rapid-switching", { width: 1440 }, async ({ page }) => {
    await settleScene(page);
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    for (let index = 0; index < 3; index++) for (const sport of ["Running", "Padel", "Tennis"]) await sports(page).getByRole("button", { name: sport, exact: true }).click();
    await expect(scene(page)).toHaveAttribute("data-sport", "Tennis");
    await expect(scene(page)).toHaveAttribute("data-paused", "true");
    await expect(scene(page).locator("canvas")).toHaveCount(1);
    await page.getByRole("button", { name: "Resume animation", exact: true }).click();
    await expect(scene(page)).toHaveAttribute("data-paused", "false");
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "true");
    await page.getByLabel("Play in", { exact: true }).selectOption("barcelona");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await page.getByLabel("Sort games", { exact: true }).selectOption("availability");
    await page.getByLabel("Arrive from", { exact: true }).fill("2026-10-03");
    await page.getByLabel("Leave by", { exact: true }).fill("2026-10-05");
    await page.getByRole("button", { name: /^More filters/ }).click();
    await page.getByLabel("Skill level", { exact: true }).selectOption("beginner");
    await page.getByLabel("Time of day", { exact: true }).selectOption("morning");
    await page.getByLabel("Language", { exact: true }).selectOption("English");
    await page.getByLabel("Area", { exact: true }).selectOption("barcelona-gracia");
    await page.getByLabel("Places available", { exact: true }).check();
    await page.getByLabel("Free games only", { exact: true }).check();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await home(page);
    await expect(page.getByLabel("Play in", { exact: true })).toHaveValue("barcelona");
    await expect(sports(page).getByRole("button", { name: "Tennis", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sports(page).getByRole("button", { name: "Running", exact: true }).click();
    await page.getByLabel("Play in", { exact: true }).selectOption("lisbon");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue("lisbon");
    await expect(page.getByLabel("Arrive from", { exact: true })).toHaveValue("2026-10-03");
    await expect(page.getByLabel("Leave by", { exact: true })).toHaveValue("2026-10-05");
    await expect(page.getByRole("group", { name: "Filter activities", exact: true }).getByRole("button", { name: "Running", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^More filters/ }).click();
    await expect(page.getByLabel("Skill level", { exact: true })).toHaveValue("beginner");
    await expect(page.getByLabel("Time of day", { exact: true })).toHaveValue("morning");
    await expect(page.getByLabel("Language", { exact: true })).toHaveValue("English");
    await expect(page.getByLabel("Area", { exact: true })).toHaveValue("all");
    await expect(page.getByLabel("Places available", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Free games only", { exact: true })).toBeChecked();
    if (await page.getByLabel("Sort games", { exact: true }).count()) await expect(page.getByLabel("Sort games", { exact: true })).toHaveValue("availability");
    await screenshot(page, "preserved-travel-filters");
  });

  await run("join-full-blocked", { width: 390 }, async ({ page }) => {
    const available = featured(page).locator('[data-game-id]:not([data-game-places="0"])').first();
    const chosenId = await available.getAttribute("data-game-id");
    const title = await available.locator("strong").innerText();
    await available.getByRole("button", { name: /^Join[: ]/ }).click();
    await expect(main(page)).toContainText(`Next: join ${title}`);
    await demoSignIn(page);
    await expect(main(page)).toHaveAttribute("data-preview-view", "event");
    await expect(main(page).getByTestId("private-meeting-point")).toHaveCount(0);
    await main(page).getByRole("button", { name: "Send request", exact: true }).click();
    await expect(main(page).getByRole("heading", { name: "Request sent.", exact: true })).toBeVisible();
    await expect(main(page).getByTestId("private-meeting-point")).toHaveCount(0);
    await home(page);
    await expect(featured(page).locator(`[data-game-id="${chosenId}"]`).getByRole("button", { name: /^Requested[: ]/ })).toBeDisabled();
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    const full = main(page).locator('[data-game-id][data-game-places="0"]').first();
    await expect(full.getByRole("button", { name: /^Full: / })).toBeDisabled();
    await full.getByRole("button").first().click();
    await expect(main(page).getByRole("button", { name: "Game full", exact: true })).toBeDisabled();
    await main(page).getByText("More options", { exact: true }).click();
    await main(page).getByRole("button", { name: "Block host", exact: true }).click();
    await main(page).getByRole("button", { name: "Block in preview", exact: true }).click();
    await home(page);
    await expect(featured(page).locator("[data-game-id]")).toHaveCount(0);
    await expect(main(page).getByRole("button", { name: /^Join[: ]/ })).toHaveCount(0);
    await expect(main(page)).not.toContainText("Mara");
    await expect(main(page).locator('img[alt*="Mara"]')).toHaveCount(0);
    await layout(page, "blocked landing");
    await screenshot(page, "blocked-landing");
  });

  await run("reduced-motion", { width: 390, reducedMotion: "reduce" }, async ({ page, requests }) => {
    await settleScene(page, "static");
    await sports(page).getByRole("button", { name: "Padel", exact: true }).click();
    await expect(scene(page)).toHaveAttribute("data-sport", "Padel");
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveCount(0);
    expect(requests.filter(isRendererChunk), "Reduced motion avoids downloading the renderer").toEqual([]);
    await layout(page, "reduced motion");
    await screenshot(page, "390-reduced-motion");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main(page)).toHaveAttribute("data-preview-view", "discover");
  });

  await run("missing-photo-long-title-empty", { width: 320, missingPhoto: true }, async ({ page }) => {
    await expect(main(page).getByLabel("Mara", { exact: true })).toBeVisible();
    await expect(main(page).locator('img[alt*="Mara"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await demoSignIn(page);
    await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("button", { name: "Create a game", exact: true }).click();
    const title = "A friendly morning tennis game with new faces and time for a coffee afterwards.";
    await page.getByLabel(/^Game name/).fill(title);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel(/^Date/).fill("2026-10-08");
    await page.getByLabel(/^Start time/).fill("06:45");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await home(page);
    await expect(featured(page).locator("[data-game-id]").filter({ hasText: title })).toBeVisible();
    await expect(featured(page).locator("[data-game-id]").filter({ hasText: title }).getByRole("button", { name: /^Hosting: / })).toBeDisabled();
    await layout(page, "long hosted title and missing photo");
    await screenshot(page, "320-long-title-missing-photo");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await page.getByLabel("Arrive from", { exact: true }).fill("2030-01-01");
    await page.getByLabel("Leave by", { exact: true }).fill("2030-01-03");
    await home(page);
    await expect(featured(page).locator("[data-game-id]")).toHaveCount(0);
    await expect(featured(page).getByRole("heading", { name: "No games match just yet.", exact: true })).toBeVisible();
    await sports(page).getByRole("button", { name: "Padel", exact: true }).click();
    await page.getByLabel("Play in", { exact: true }).selectOption("lisbon");
    await expect(featured(page).locator("[data-game-id]")).toHaveCount(0);
    await expect(main(page).getByRole("button", { name: /^Join[: ]/ })).toHaveCount(0);
    await layout(page, "empty filtered landing");
    await screenshot(page, "320-empty-filters");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(page.getByLabel("Arrive from", { exact: true })).toHaveValue("2030-01-01");
    await expect(page.getByLabel("Leave by", { exact: true })).toHaveValue("2030-01-03");
    await expect(main(page).getByTestId("map-result-count")).toHaveAttribute("data-count", "0");
  });

  await run("webgl-unavailable", { width: 390, noWebGL: true }, async ({ page }) => {
    await settleScene(page, "fallback");
    await expect(scene(page).locator("[data-pavilion-fallback]")).toBeVisible();
    await sports(page).getByRole("button", { name: "Running", exact: true }).click();
    await expect(scene(page)).toHaveAttribute("data-sport", "Running");
    await layout(page, "fallback");
    await screenshot(page, "390-webgl-fallback");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main(page)).toHaveAttribute("data-preview-view", "discover");
  });

  await run("scene-lifecycle", { width: 1440 }, async ({ page }) => {
    await settleScene(page);
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "true");
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "false");
    for (const sport of ["All sports", "Tennis", "Running", "Padel"]) {
      await sports(page).getByRole("button", { name: sport, exact: true }).click();
      await expect(scene(page)).toHaveAttribute("data-sport", sport === "All sports" ? "All" : sport);
      await screenshot(page, `1440-scene-${sport.replace(" sports", "").toLowerCase()}`);
    }
    await page.getByRole("button", { name: "Resume animation", exact: true }).click();
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "true");
    await featured(page).evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top, behavior: "instant" }));
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "false");
    await scene(page).scrollIntoViewIfNeeded();
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveAttribute("data-pavilion-running", "true");
    const lost = await scene(page).locator("[data-pavilion-canvas]").evaluate(canvas => {
      const context = canvas.getContext("webgl2");
      const extension = context?.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
    expect(lost, "A real WebGL context loss was triggered").toBe(true);
    await settleScene(page, "fallback");
    await expect(scene(page).locator("[data-pavilion-fallback]")).toBeVisible();
    await expect(scene(page).locator("[data-pavilion-canvas]")).toHaveCount(0);
    await sports(page).getByRole("button", { name: "Running", exact: true }).click();
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main(page)).toHaveAttribute("data-preview-view", "discover");
  });

  await run("delayed-scene", { width: 390, delayScene: true }, async ({ page, delayed, releaseDelay }) => {
    await expect.poll(() => delayed.length, { timeout: 15000 }).toBeGreaterThan(0);
    await expect(scene(page)).toHaveAttribute("data-pavilion-state", "loading");
    await expect(scene(page).locator("[data-pavilion-fallback]")).toBeVisible();
    await sports(page).getByRole("button", { name: "Running", exact: true }).click();
    await page.getByLabel("Play in", { exact: true }).selectOption("lisbon");
    await screenshot(page, "390-delayed-scene");
    await main(page).getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main(page)).toHaveAttribute("data-preview-view", "discover");
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue("lisbon");
    releaseDelay();
    await home(page);
    await settleScene(page);
    await expect(scene(page)).toHaveAttribute("data-sport", "Running");
    result.observations.push({ case: "delayed-scene", delayedChunks: delayed });
  });
} finally { await browser.close(); }

await writeFile(new URL("result.json", artifacts), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.failures.length || result.violations.length || result.errors.length) process.exitCode = 1;
