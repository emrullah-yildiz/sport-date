// Local-only concept QA. Start Next on port 3015, then run:
// node apps/web/qa/concepts.mjs
// No accounts, real feedback, API requests, or mutations are permitted.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.env.CONCEPT_QA_URL ?? "http://127.0.0.1:3015";
const focusedCosmetics = process.argv.includes("--cosmetics-only");
const origin = new URL(base);
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) throw new Error("Concept QA requires a localhost URL.");
const artifacts = new URL("./artifacts/concepts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const themes = [{ id: "cards", name: "Player Cards" }, { id: "clubhouse", name: "Clubhouse" }, { id: "map", name: "Play Map" }];
const eventNames = ["A rally, then a coffee.", "The no-rush run club.", "Meet you at the net."];
const failures = [];
const networkViolations = [];
const browserErrors = [];
const passed = [];
const browser = await chromium.launch({ headless: true });

async function guard(context) {
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (!local || !["GET", "HEAD"].includes(request.method()) || /^\/api(?:\/|$)/.test(url.pathname)) {
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
  const overflow = await page.evaluate(() => {
    const surface = document.querySelector("[data-theme][data-view]");
    return {
      document: document.documentElement.scrollWidth - window.innerWidth,
      surface: surface ? surface.scrollWidth - surface.clientWidth : -1,
    };
  });
  expect(overflow.document, `${label}: document overflow`).toBeLessThanOrEqual(1);
  expect(overflow.surface, `${label}: concept surface overflow`).toBeLessThanOrEqual(1);
}

function eventsIn(surface) {
  return eventNames.map(name => surface.getByRole("button").filter({ hasText: name }));
}

async function checkTheme(theme, width) {
  const name = `${theme.id}-${width}`;
  const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 960 : 844 }, hasTouch: true, acceptDownloads: true });
  await guard(context);
  const page = await context.newPage();
  page.on("pageerror", error => browserErrors.push({ case: name, message: error.message }));
  try {
    await page.goto(`${base}/concepts`, { waitUntil: "networkidle" });
    const surface = page.locator("[data-theme][data-view]");
    const nav = surface.getByRole("navigation", { name: "Concept navigation" });
    await expect(surface).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: new RegExp(theme.name) }).click();
    await expect(surface).toHaveAttribute("data-theme", theme.id);
    await expect(surface).toHaveAttribute("data-view", "discover");
    await noOverflow(page, `${name} discovery`);
    await screenshot(page, `${name}-discovery`);
    if (width === 1280) {
      const devices = page.getByRole("group", { name: "Preview device" });
      await devices.getByRole("button", { name: "Mobile", exact: true }).click();
      await expect(devices.getByRole("button", { name: "Mobile", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect.poll(async () => surface.evaluate(element => Math.round(element.parentElement.getBoundingClientRect().width))).toBe(390);
      await noOverflow(page, `${name} mobile container`);
      await screenshot(page, `${name}-mobile-container-discovery`);
      await nav.getByRole("button", { name: "Player card", exact: true }).click();
      await noOverflow(page, `${name} mobile container profile`);
      await screenshot(page, `${name}-mobile-container-profile`);
      await nav.getByRole("button", { name: "Find a game", exact: true }).click();
      await devices.getByRole("button", { name: "Desktop", exact: true }).click();
      await expect.poll(async () => surface.evaluate(element => Math.round(element.parentElement.getBoundingClientRect().width))).toBeGreaterThan(390);
    }

    const filters = page.getByRole("group", { name: "Filter activities" });
    for (const [index, sport] of ["Tennis", "Running", "Padel"].entries()) {
      await filters.getByRole("button", { name: sport, exact: true }).click();
      if (theme.id === "map") {
        const rows = surface.locator("[data-game-id]");
        await expect(rows.first()).toHaveAttribute("data-game-sport", sport);
        expect(await rows.evaluateAll(elements => elements.every(element => element.dataset.gameSport === elements[0].dataset.gameSport))).toBe(true);
      } else for (const [eventIndex, button] of eventsIn(surface).entries()) await expect(button).toHaveCount(eventIndex === index ? 1 : 0);
    }
    await filters.getByRole("button", { name: "Anything goes", exact: true }).click();
    if (theme.id === "map") {
      const views = page.getByRole("group", { name: "Activity view" });
      await views.getByRole("button", { name: "List", exact: true }).click();
      await expect(views.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(surface.locator("[data-game-id]")).toHaveCount(8);
      await noOverflow(page, `${name} list`);
      await screenshot(page, `${name}-list`);
      await views.getByRole("button", { name: "Map", exact: true }).click();
    }
    await page.getByLabel("Preview state", { exact: true }).selectOption("empty");
    if (theme.id === "map") await expect(surface.locator("[data-game-id]")).toHaveCount(0);
    else for (const button of eventsIn(surface)) await expect(button).toHaveCount(0);
    await expect(surface.getByRole("heading", { level: 3 }).last()).toBeVisible();
    await noOverflow(page, `${name} empty`);
    await page.getByLabel("Preview state", { exact: true }).selectOption("normal");

    await nav.getByRole("button", { name: "Player card", exact: true }).click();
    await expect(surface).toHaveAttribute("data-view", "profile");
    const photos = surface.getByRole("group", { name: /photos$/ });
    const photo = photos.locator("img");
    await expect(photo).toBeVisible();
    await expect(photo).toHaveJSProperty("naturalWidth", 1086);
    const first = await photo.getAttribute("src");
    const next = photos.getByRole("button", { name: "Next photo" });
    await next.click();
    await expect(photo).not.toHaveAttribute("src", first);
    await expect(photos).toContainText("2 / 3");
    await next.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(photo).toHaveAttribute("src", first);
    await photos.getByRole("button", { name: "Previous photo" }).click();
    await expect(photos).toContainText("3 / 3");
    await next.click();
    await expect(photo).toHaveAttribute("src", first);

    // Use actual Chromium touch input, not a call to the component handler.
    await photos.scrollIntoViewIfNeeded();
    const bounds = await photos.boundingBox();
    const touchX = Math.round(bounds.x + bounds.width * 0.7);
    const touchY = Math.round(bounds.y + Math.min(bounds.height / 2, 200));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchX, y: touchY }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchX - 95, y: touchY }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(photos).toContainText("2 / 3");
    await cdp.detach();
    await photos.getByRole("button", { name: "Previous photo" }).click();
    await screenshot(page, `${name}-profile`);
    await noOverflow(page, `${name} profile`);
    await surface.getByRole("button", { name: "Flip card to interests" }).click();
    await expect(surface.getByRole("button", { name: /Back to photos/ })).toBeVisible();
    await expect(photos).toHaveCount(0);
    await surface.getByRole("button", { name: /Back to photos/ }).click();
    await expect(photo).toBeVisible();
    await page.getByLabel("Preview state", { exact: true }).selectOption("no-photo");
    await expect(photos.locator("img")).toHaveCount(0);
    await expect(photos.getByRole("button", { name: "Next photo" })).toHaveCount(0);
    await expect(photos).toContainText("camera shy");
    await page.getByLabel("Preview state", { exact: true }).selectOption("long-name");
    await expect(surface.getByRole("heading", { name: /Mara Alexandra/ })).toBeVisible();
    await noOverflow(page, `${name} long name`);
    await screenshot(page, `${name}-long-name`);
    await page.getByLabel("Preview state", { exact: true }).selectOption("normal");
    const sports = surface.locator('[aria-label="Choose card sport"]');
    await sports.getByRole("button", { name: "Running", exact: true }).click();
    await expect(surface.getByText("Beginner", { exact: true })).toBeVisible();
    await expect(surface.getByText("Casual", { exact: true })).toBeVisible();
    await surface.getByRole("button", { name: theme.id === "map" ? "Find a running game" : /See the running plan/ }).click();
    if (theme.id === "map") {
      await expect(surface).toHaveAttribute("data-view", "discover");
      await expect(surface.getByRole("group", { name: "Filter activities" }).getByRole("button", { name: "Running", exact: true })).toHaveAttribute("aria-pressed", "true");
      await surface.locator("[data-game-id]").first().getByRole("button").click();
    }
    await expect(surface).toHaveAttribute("data-view", "event");
    if (theme.id !== "map") await expect(surface.getByRole("heading", { level: 1 })).toHaveText(eventNames[1]);
    await surface.getByRole("button", { name: /Say hello to Mara/ }).click();
    await expect(sports.getByRole("button", { name: "Running", exact: true })).toHaveAttribute("aria-pressed", "true");

    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    if (theme.id === "map") await surface.locator("[data-game-id]").first().getByRole("button").click();
    else await eventsIn(surface)[0].click();
    await expect(surface).toHaveAttribute("data-view", "event");
    const accept = page.getByRole("button", { name: "Host accepts", exact: true });
    const attend = page.getByRole("button", { name: "Event attended", exact: true });
    await expect(accept).toBeDisabled();
    await expect(attend).toBeDisabled();
    await screenshot(page, `${name}-event`);
    await noOverflow(page, `${name} event`);
    await surface.getByRole("button", { name: "Request to join", exact: true }).click();
    await expect(surface.locator('li[aria-current="step"]')).toContainText("Requested");
    await expect(accept).toBeEnabled();
    await expect(attend).toBeDisabled();
    await screenshot(page, `${name}-pending`);
    await accept.click();
    await expect(surface.locator('li[aria-current="step"]')).toContainText("Accepted");
    await expect(accept).toBeDisabled();
    await expect(attend).toBeEnabled();
    await screenshot(page, `${name}-accepted`);
    await attend.click();
    await expect(surface.locator('li[aria-current="step"]')).toContainText("Played");
    await expect(attend).toBeDisabled();
    await attend.evaluate(button => button.click());
    await surface.getByRole("button", { name: /See my progress/ }).click();
    await expect(surface).toHaveAttribute("data-view", "progress");
    await expect(surface).toContainText("3 shared activities");
    await noOverflow(page, `${name} progress`);
    await screenshot(page, `${name}-progress`);
    const milestone = page.getByLabel("Preview milestone", { exact: true });
    for (const count of [0, 1, 3, 6, 10]) {
      await milestone.selectOption(String(count));
      await expect(surface).toContainText(`${count} shared activities`);
      await expect(surface.locator('[data-reached="true"]')).toHaveCount([1, 3, 6, 10].filter(threshold => count >= threshold).length);
    }
    await milestone.selectOption("journey");
    await expect(surface).toContainText("3 shared activities");

    // Preview notes remain local, keyed by theme, and can be downloaded.
    const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    await page.getByRole("button", { name: /Review notes/ }).click();
    const notes = page.getByRole("region", { name: "Concept review notes" });
    await notes.getByLabel("Feels fun").selectOption("4");
    await notes.getByLabel("Easy to understand").selectOption("5");
    await notes.getByLabel("What would you change?").fill(`${theme.id}: local QA note`);
    const otherTheme = themes.find(other => other.id !== theme.id);
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: new RegExp(otherTheme.name) }).click();
    await expect(notes.getByLabel("What would you change?")).toHaveValue("");
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: new RegExp(theme.name) }).click();
    await expect(notes.getByLabel("What would you change?")).toHaveValue(`${theme.id}: local QA note`);
    const downloadPromise = page.waitForEvent("download");
    await notes.getByRole("button", { name: /Download all notes/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("keepitup-concept-review.txt");
    expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
    await page.getByRole("button", { name: /Review notes/ }).click();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await nav.getByRole("button", { name: "Player card", exact: true }).click();
    await surface.getByRole("button", { name: "Flip card to interests" }).click();
    const moving = await surface.locator("*").evaluateAll(elements => elements.filter(element => {
      const style = getComputedStyle(element);
      return style.animationName !== "none" || style.transitionDuration.split(",").some(value => parseFloat(value) > 0);
    }).map(element => element.tagName));
    expect(moving, "Reduced motion disables concept animations and transitions").toEqual([]);
    await surface.getByRole("button", { name: /Back to photos/ }).focus();
    await page.keyboard.press("Enter");
    await expect(photo).toBeVisible();
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ case: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `${name}-FAIL`).catch(() => {});
  } finally { await context.close(); }
}

async function checkCosmetics() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await guard(context);
  const page = await context.newPage();
  page.on("pageerror", error => browserErrors.push({ case: "card-cosmetics", message: error.message }));
  try {
    await page.goto(`${base}/concepts`, { waitUntil: "networkidle" });
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: /Player Cards/ }).click();
    const surface = page.locator("[data-theme][data-view]");
    const nav = surface.getByRole("navigation", { name: "Concept navigation" });
    const progress = nav.getByRole("button", { name: "My progress", exact: true });
    const profile = nav.getByRole("button", { name: "Player card", exact: true });
    const milestone = page.getByLabel("Preview milestone", { exact: true });
    await progress.click();
    await expect(surface).toContainText("2 shared activities");
    await milestone.selectOption("3");
    await surface.getByRole("button", { name: "Use Colour shift", exact: true }).click();
    await expect(surface).toHaveAttribute("data-view", "profile");
    await expect(surface.getByRole("article", { name: "Mara's player card" })).toHaveAttribute("data-finish", "3");
    await noOverflow(page, "card cosmetic colour shift");
    await screenshot(page, "cards-390-applied-finish");
    await progress.click();
    await milestone.selectOption("1");
    const locked = surface.getByRole("button", { name: "Unlock at 6", exact: true });
    await expect(locked).toBeDisabled();
    await locked.evaluate(button => button.click());
    await expect(surface).toHaveAttribute("data-view", "progress");
    await profile.click();
    await expect(surface.getByRole("article", { name: "Mara's player card" })).toHaveAttribute("data-finish", "0");
    await progress.click();
    await milestone.selectOption("journey");
    await expect(surface).toContainText("2 shared activities");
    await expect(surface.locator('[data-reached="true"]')).toHaveCount(1);
    await profile.click();
    await expect(surface.getByRole("article", { name: "Mara's player card" })).toHaveAttribute("data-finish", "0");
    // Capture the final Clubhouse caption placement after the small CSS polish.
    await page.getByRole("group", { name: "Design theme" }).getByRole("button", { name: /Clubhouse/ }).click();
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    await noOverflow(page, "clubhouse final mobile caption");
    await screenshot(page, "clubhouse-390-discovery-final");
    passed.push("card-cosmetics");
    console.log("PASS card-cosmetics");
  } catch (error) {
    failures.push({ case: "card-cosmetics", message: error.message });
    console.error(`FAIL card-cosmetics: ${error.message}`);
    await screenshot(page, "card-cosmetics-FAIL").catch(() => {});
  } finally { await context.close(); }
}

try {
  if (!focusedCosmetics) for (const width of [1280, 390, 320]) for (const theme of themes) await checkTheme(theme, width);
  await checkCosmetics();
  expect(networkViolations, "The concept must never call APIs, write methods, or external hosts").toEqual([]);
  expect(browserErrors, "Browser runtime errors").toEqual([]);
} catch (error) { failures.push({ case: "global", message: error.message }); }
finally {
  await writeFile(new URL(focusedCosmetics ? "cosmetics-results.json" : "results.json", artifacts), JSON.stringify({ passed, failures, networkViolations, browserErrors }, null, 2));
  await browser.close();
}
console.log(`Concept QA: ${passed.length}/${focusedCosmetics ? 1 : 10} cases passed. Artifacts: ${fileURLToPath(artifacts)}`);
if (failures.length) process.exitCode = 1;
