// Local-only full website QA. Start Next on port 3015, then run:
// node apps/web/qa/website-preview.mjs
// Fictional accounts only; no API, remote host, or write request is allowed.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.env.CONCEPT_QA_URL ?? "http://127.0.0.1:3015";
const origin = new URL(base);
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Website preview QA requires a localhost URL.");
}
const artifacts = new URL("./artifacts/website-preview/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const failures = [];
const violations = [];
const errors = [];
const passed = [];
const browser = await chromium.launch({ headless: true });

async function guard(context) {
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || !["GET", "HEAD"].includes(request.method())
      || /^\/api(?:\/|$)/.test(url.pathname)) {
      violations.push({ method: request.method(), url: request.url() });
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
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(1);
}

async function localOnly(page, label) {
  expect(new URL(page.url()).origin, `${label}: stays local`).toBe(origin.origin);
  expect(await page.evaluate(() => localStorage.length), `${label}: no stored personal details`).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length), `${label}: no stored personal details`).toBe(0);
}

async function buttonContrast(button) {
  const ratio = await button.evaluate(element => {
    const style = getComputedStyle(element);
    function luminance(value) {
      const channels = value.match(/[\d.]+/g).slice(0, 3).map(channel => {
        const value = Number(channel) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(ratio, "Primary action text has at least 4.5:1 contrast").toBeGreaterThanOrEqual(4.5);
}

async function signIn(page) {
  await expect(page.getByRole("heading", { name: "Good to see you.", exact: true })).toBeVisible();
  await buttonContrast(page.getByRole("button", { name: "Sign in to demo", exact: true }));
  await page.getByRole("button", { name: "Sign in to demo", exact: true }).click();
  await expect(page.getByLabel(/^Email/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await page.getByRole("button", { name: "Use demo details", exact: true }).click();
  await expect(page.getByLabel(/^Email/)).toHaveValue("alex@example.test");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel(/^Password/)).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(page.getByLabel(/^Password/)).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign in to demo", exact: true }).click();
}

async function signUp(page, name) {
  await expect(page.getByRole("list", { name: "Sign-up progress", exact: true }).locator("li")).toHaveCount(4);
  await buttonContrast(page.getByRole("button", { name: "Continue", exact: true }));
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^Email/)).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Use demo details", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A face behind the game.", exact: true })).toBeFocused();
  await page.getByLabel(/^First name/).fill("Alex Fictional");
  await page.getByLabel(/^Date of birth/).fill("2008-09-26");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^Date of birth/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Date of birth/)).toBeFocused();
  await expect(page.getByRole("heading", { name: "A face behind the game.", exact: true })).toBeVisible();
  await page.getByLabel(/^Date of birth/).fill("2008-09-25");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel(/^Email/)).toHaveValue("alex@example.test");
  await expect(page.getByLabel(/^Password/)).toHaveValue("PlayTogether42!");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^First name/)).toHaveValue("Alex Fictional");
  await expect(page.getByLabel(/^Date of birth/)).toHaveValue("2008-09-25");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What’s your game?", exact: true })).toBeFocused();
  await page.getByRole("radio", { name: "Running" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "Running" })).toBeChecked();
  await page.getByRole("radio", { name: "Beginner", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "Beginner", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You’re nearly in.", exact: true })).toBeVisible();
  const adult = page.getByRole("checkbox", { name: "I’m 18 or older.", exact: true });
  const notice = page.getByRole("checkbox", { name: "I understand the demo terms and privacy notice.", exact: true });
  await expect(adult).not.toBeChecked();
  await expect(notice).not.toBeChecked();
  await page.getByRole("button", { name: "Create demo account", exact: true }).click();
  await expect(adult).toHaveAttribute("aria-invalid", "true");
  await expect(adult).toBeFocused();
  await noOverflow(page, `${name}: signup`);
  await screenshot(page, `${name}-signup`);
  await adult.check();
  await page.getByRole("button", { name: "Create demo account", exact: true }).click();
  await expect(notice).toHaveAttribute("aria-invalid", "true");
  await expect(notice).toBeFocused();
  await notice.check();
  await page.getByRole("button", { name: "Create demo account", exact: true }).click();
}

async function createGame(page, name) {
  await expect(page.getByRole("list", { name: "Create-game progress", exact: true }).locator("li")).toHaveCount(3);
  await buttonContrast(page.getByRole("button", { name: "Continue", exact: true }));
  await page.getByLabel(/^Game name/).fill("");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^Game name/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Game name/)).toBeFocused();
  await page.getByRole("group", { name: "Sport", exact: true }).getByRole("button", { name: "Running", exact: true }).click();
  await page.getByLabel(/^Game name/).fill("Fictional sunset loop");
  await page.getByLabel(/^Who can play\?/).selectOption("beginner");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "When and where?", exact: true })).toBeFocused();
  await page.getByLabel(/^City/).selectOption("barcelona");
  await page.getByLabel(/^Area/).selectOption("barcelona-poblenou");
  await page.getByLabel(/^Date/).fill("2026-10-04");
  await page.getByLabel(/^Start time/).fill("18:30");
  await page.getByLabel(/^Open places/).fill("0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^Open places/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Open places/)).toBeFocused();
  await page.getByLabel(/^Open places/).fill("4");
  await page.getByLabel("Meeting point", { exact: false }).fill("Fictional blue arch");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel(/^Game name/)).toHaveValue("Fictional sunset loop");
  await expect(page.getByLabel(/^Who can play\?/)).toHaveValue("beginner");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/^City/)).toHaveValue("barcelona");
  await expect(page.getByLabel(/^Area/)).toHaveValue("barcelona-poblenou");
  await expect(page.getByLabel(/^Date/)).toHaveValue("2026-10-04");
  await expect(page.getByLabel(/^Start time/)).toHaveValue("18:30");
  await expect(page.getByLabel(/^Open places/)).toHaveValue("4");
  await expect(page.getByLabel("Meeting point", { exact: false })).toHaveValue("Fictional blue arch");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your game, ready to go.", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Fictional sunset loop", exact: true })).toBeVisible();
  await expect(page.getByText("Fictional blue arch", { exact: false })).toBeVisible();
  await noOverflow(page, `${name}: create`);
  await screenshot(page, `${name}-create-review`);
  await page.getByRole("button", { name: "Create game", exact: true }).click();
}

async function check(width, reducedMotion = "no-preference") {
  const name = `${width}-${reducedMotion}`;
  const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 960 : 844 }, hasTouch: true, reducedMotion });
  await guard(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push({ case: name, message: error.message }));
  try {
    await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await noOverflow(page, `${name}: landing`);
    await screenshot(page, `${name}-landing`);

    const main = page.locator("main[data-preview-view]");
    const nav = page.getByRole("navigation", { name: "Main navigation", exact: true });
    await expect(main).toHaveAttribute("data-preview-view", "home");
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Your next game.");
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "discover");
    await expect(main).toBeFocused();
    await main.getByLabel("Destination", { exact: true }).selectOption("barcelona");
    await main.getByLabel("Arrive from", { exact: true }).fill("2026-10-03");
    await main.getByLabel("Leave by", { exact: true }).fill("2026-10-05");
    await main.getByRole("group", { name: "Activity view", exact: true }).getByRole("button", { name: "List", exact: true }).click();
    await expect(main.locator("[data-game-id]")).toHaveCount(8);
    await noOverflow(page, `${name}: discovery`);
    await screenshot(page, `${name}-discovery`);
    const available = main.locator('[data-game-id]:not([data-game-places="0"])').first();
    const chosenId = await available.getAttribute("data-game-id");
    const chosenTitle = await available.locator("strong").innerText();
    await available.getByRole("button", { name: /^Join: / }).click();
    await expect(main).toHaveAttribute("data-preview-view", "signin");
    await expect(main).toContainText(`Next: join ${chosenTitle}`);
    await noOverflow(page, `${name}: sign in`);
    await screenshot(page, `${name}-signin`);
    await signIn(page);
    await expect(main).toHaveAttribute("data-preview-view", "event");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(chosenTitle);
    await expect(main.getByTestId("private-meeting-point")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Send request", exact: true })).toBeEnabled();
    await main.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Request sent.", exact: true })).toBeVisible();
    await expect(main).toContainText("Waiting for Mara to confirm your place.");
    await expect(main.getByTestId("private-meeting-point")).toHaveCount(0);
    await noOverflow(page, `${name}: pending request`);
    await screenshot(page, `${name}-requested`);

    // Profile photo controls work independently from joining.
    await main.getByRole("button", { name: /Hosted by Mara/ }).click();
    await expect(main).toHaveAttribute("data-preview-view", "profile");
    const photos = main.getByRole("group", { name: "Mara’s photos", exact: true });
    await expect(photos).toContainText("1 / 3");
    await photos.getByRole("button", { name: "Next photo", exact: true }).click();
    await expect(photos).toContainText("2 / 3");
    await page.keyboard.press("ArrowRight");
    await expect(photos).toContainText("3 / 3");
    await page.keyboard.press("ArrowRight");
    await expect(photos).toContainText("1 / 3");
    await noOverflow(page, `${name}: profile`);
    await screenshot(page, `${name}-profile`);
    await main.getByRole("button", { name: "Back to game", exact: true }).first().click();
    await expect(main).toHaveAttribute("data-preview-view", "event");
    await expect(main.getByRole("heading", { name: "Request sent.", exact: true })).toBeVisible();
    await main.getByRole("button", { name: "All games", exact: true }).click();
    await expect(main.getByLabel("Destination", { exact: true })).toHaveValue("barcelona");
    await expect(main.getByLabel("Arrive from", { exact: true })).toHaveValue("2026-10-03");
    await expect(main.getByLabel("Leave by", { exact: true })).toHaveValue("2026-10-05");
    await expect(main.locator(`[data-game-id="${chosenId}"]`).getByRole("button", { name: /^Requested: / })).toBeDisabled();

    // A signed-in player requests directly from the list, without a form.
    const other = main.getByRole("button", { name: /^Join: / }).first();
    await other.click();
    await expect(main).toHaveAttribute("data-preview-view", "discover");
    await expect(main.getByRole("button", { name: /^Requested: / })).toHaveCount(2);
    await nav.getByRole("button", { name: /^My games/ }).click();
    await expect(main.locator("[data-plan-id]")).toHaveCount(2);
    await expect(main.locator("[data-plan-id]").first()).toContainText("Requested · waiting for host");
    await noOverflow(page, `${name}: my games`);
    await screenshot(page, `${name}-my-games`);

    // Acceptance is an explicit demo action, never inferred from Join.
    await main.locator(`[data-plan-id="${chosenId}"]`).getByRole("button").click();
    await page.getByText("Preview actions", { exact: true }).click();
    await page.getByRole("button", { name: "Simulate host acceptance", exact: true }).click();
    await expect(main.getByRole("heading", { name: "You’re in.", exact: true })).toBeVisible();
    await expect(main.getByTestId("private-meeting-point")).toBeVisible();
    await main.getByRole("button", { name: "Leave game", exact: true }).click();
    await main.getByRole("button", { name: "Keep it", exact: true }).click();
    await expect(main.getByRole("heading", { name: "You’re in.", exact: true })).toBeVisible();
    await main.getByRole("button", { name: "Leave game", exact: true }).click();
    await main.getByRole("button", { name: "Yes, leave", exact: true }).click();
    await expect(main.getByTestId("private-meeting-point")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Join game", exact: true })).toBeEnabled();

    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    await main.getByRole("button", { name: "Clear filters", exact: true }).click();
    const full = main.locator('[data-game-id][data-game-places="0"]').first();
    await expect(full.getByRole("button", { name: /^Full: / })).toBeDisabled();
    await full.getByRole("button").first().click();
    await expect(main.getByRole("button", { name: "Game full", exact: true })).toBeDisabled();

    await nav.getByRole("button", { name: "Create a game", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "create");
    await createGame(page, name);
    await expect(main).toHaveAttribute("data-preview-view", "event");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Fictional sunset loop");
    await expect(main).toContainText("Hosted by you");
    await expect(main.getByTestId("private-meeting-point")).toContainText("Fictional blue arch");
    await screenshot(page, `${name}-hosted`);
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    await expect(main.getByLabel("Destination", { exact: true })).toHaveValue("barcelona");
    await main.getByRole("group", { name: "Activity view", exact: true }).getByRole("button", { name: "List", exact: true }).click();
    const hosted = main.locator("[data-game-id]").filter({ hasText: "Fictional sunset loop" });
    await expect(hosted.getByRole("button", { name: /^Hosting: / })).toBeDisabled();
    await expect(main).not.toContainText("Fictional blue arch");
    await hosted.getByRole("button").first().click();
    await main.getByRole("button", { name: "Cancel game", exact: true }).click();
    await main.getByRole("button", { name: "Yes, cancel game", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "my-games");
    await expect(main.locator("[data-plan-id]").filter({ hasText: "Fictional sunset loop" })).toHaveCount(0);

    // Sign out clears private session data; a new signup keeps its join intent.
    await page.getByRole("button", { name: "My profile", exact: true }).click();
    await main.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "home");
    await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeVisible();
    await main.getByRole("button", { name: /^Join[: ]/ }).first().click();
    await expect(main).toHaveAttribute("data-preview-view", "signin");
    await main.getByRole("button", { name: "Create an account", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "signup");
    await expect(main).toContainText("Next: join A rally, then a coffee.");
    await signUp(page, name);
    await expect(main).toHaveAttribute("data-preview-view", "event");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("A rally, then a coffee.");
    await expect(main.getByTestId("private-meeting-point")).toHaveCount(0);
    await main.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(main.getByRole("heading", { name: "Request sent.", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: /^My games/ }).click();
    await expect(main.locator("[data-plan-id]")).toHaveCount(1);

    if (reducedMotion === "reduce") {
      const moving = await main.locator("*").evaluateAll(elements => elements.filter(element => {
        const style = getComputedStyle(element);
        return style.animationName !== "none" || style.transitionDuration.split(",").some(value => parseFloat(value) > 0.001);
      }).map(element => element.tagName));
      expect(moving, "Reduced motion disables animations and transitions").toEqual([]);
    }
    await localOnly(page, name);
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ case: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `${name}-FAILED`).catch(() => {});
  } finally {
    await context.close();
  }
}

async function checkRecovery() {
  const name = "390-recovery";
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await guard(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push({ case: name, message: error.message }));
  try {
    await page.goto(`${base}/preview`, { waitUntil: "networkidle" });
    const main = page.locator("main[data-preview-view]");
    const nav = page.getByRole("navigation", { name: "Main navigation", exact: true });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await signIn(page);
    await nav.getByRole("button", { name: "Create a game", exact: true }).click();
    await page.getByLabel(/^Game name/).fill("Fictional saved draft");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel(/^City/).selectOption("barcelona");
    await page.getByLabel(/^Area/).selectOption("barcelona-poblenou");
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    await main.getByLabel("Destination", { exact: true }).selectOption("bucharest");
    await nav.getByRole("button", { name: "Create a game", exact: true }).click();
    await expect(page.getByLabel(/^Game name/)).toHaveValue("Fictional saved draft");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByLabel(/^City/)).toHaveValue("barcelona");
    await expect(page.getByLabel(/^Area/)).toHaveValue("barcelona-poblenou");
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    const first = main.locator("[data-game-id]").first();
    const firstTitle = await first.locator("strong").innerText();
    await first.getByRole("button").first().click();
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(firstTitle);
    await nav.getByRole("button", { name: "Find a game", exact: true }).click();
    const second = main.locator("[data-game-id]").nth(1);
    const secondTitle = await second.locator("strong").innerText();
    await second.getByRole("button").first().click();
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(secondTitle);
    await page.goBack();
    await expect(main).toHaveAttribute("data-preview-view", "discover");
    await page.goBack();
    await expect(main).toHaveAttribute("data-preview-view", "event");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(firstTitle);
    await main.getByRole("button", { name: /Hosted by Mara/ }).click();
    const photos = main.getByRole("group", { name: "Mara’s photos", exact: true });
    await photos.scrollIntoViewIfNeeded();
    const bounds = await photos.boundingBox();
    const x = Math.round(bounds.x + bounds.width * 0.7);
    const y = Math.round(bounds.y + Math.min(bounds.height / 2, 180));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 100, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(photos).toContainText("2 / 3");
    await cdp.detach();
    await main.getByRole("button", { name: "Back to game", exact: true }).first().click();
    await main.getByText("More options", { exact: true }).click();
    await main.getByRole("button", { name: "Block host", exact: true }).click();
    await main.getByRole("button", { name: "Block in preview", exact: true }).click();
    await expect(main).toHaveAttribute("data-preview-view", "discover");
    await expect(main.locator("[data-game-id]")).toHaveCount(0);
    await expect(main.getByTestId("map-result-count")).toHaveAttribute("data-count", "0");
    await page.getByRole("button", { name: "KeepItUp home", exact: true }).click();
    await expect(main).not.toContainText("Mara");
    await expect(main.getByRole("button", { name: /^Join[: ]/ })).toHaveCount(0);
    await expect(main.getByRole("img", { name: /Mara/ })).toHaveCount(0);
    await noOverflow(page, name);
    await screenshot(page, `${name}-blocked-landing`);
    await localOnly(page, name);
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ case: name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `${name}-FAILED`).catch(() => {});
  } finally { await context.close(); }
}

try {
  for (const width of [1280, 390, 320]) await check(width);
  await check(390, "reduce");
  await checkRecovery();
} finally {
  await browser.close();
}
const result = { passed, failures, violations, errors };
await writeFile(new URL("result.json", artifacts), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length || violations.length || errors.length) process.exitCode = 1;
