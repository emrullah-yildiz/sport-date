// Local-only visual and interaction review. Never creates accounts or sends requests.
// Start the web dev server on port 3000, then run: node apps/web/qa/design-concept.mjs
// Add --landing to verify the main page, root redirect, mobile auth links and beta disclosure.
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const artifacts = new URL("./artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const landing = process.argv.includes("--landing");
const route = landing ? "/landing" : "/concept";
const artifactPrefix = landing ? "design-landing" : "design-concept";
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const mutations = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!['GET', 'HEAD'].includes(request.method()) && new URL(request.url()).pathname.startsWith('/api/')) {
      // Main landing now has the existing anonymous page-load counter. Demo
      // choices must never add metadata or call any mutation endpoint.
      const body = request.postDataJSON();
      if (landing && new URL(request.url()).pathname === '/api/metrics/click' && body?.event === 'landing_viewed' && Object.keys(body).every(key => ['event', 'path'].includes(key))) return;
      mutations.push(request.url());
    }
  });
  await page.goto(`http://localhost:3000${landing ? "/" : route}`, { waitUntil: "networkidle" });
  if (landing) {
    await expect(page).toHaveURL(/\/landing$/);
    await expect(page.getByText("DESIGN PREVIEW", { exact: true })).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://keepitup.social/landing");
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  } else {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
  // Next dev tooling may own session entries. Compare before/after choices,
  // rather than treating framework-owned storage as demo preferences.
  const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Less small talk.");
  const tutorial = page.getByRole("dialog", { name: "How it works" });
  const trigger = page.getByRole("button", { name: "See how it works", exact: true });
  await expect(tutorial).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Explore this example" })).toHaveCount(0);
  await page.screenshot({ path: fileURLToPath(new URL(`${artifactPrefix}-desktop.png`, artifacts)), fullPage: true });
  await trigger.click();
  await expect(tutorial).toBeVisible();
  await expect(tutorial.getByRole("button", { name: /^Host an event/ })).toBeVisible();
  await expect(tutorial.getByRole("button", { name: /^Join an event/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tutorial).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (landing) {
      await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Get started" })).toBeVisible();
      if (width === 320) {
        const beta = page.getByRole("button", { name: /What does.*early preview.*mean/ });
        await beta.click();
        await expect(beta).toHaveAttribute("aria-expanded", "true");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.keyboard.press("Escape");
        await expect(beta).toBeFocused();
        await expect(beta).toHaveAttribute("aria-expanded", "false");
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    await page.screenshot({ path: fileURLToPath(new URL(`${artifactPrefix}-${width}.png`, artifacts)), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(tutorial).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(trigger).toBeVisible();
  await page.evaluate(() => { document.body.style.zoom = "1"; });
  expect(errors).toEqual([]);
  expect(mutations).toEqual([]);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(`http://localhost:3000${route}`);
  await expect(staticPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(staticPage.getByRole("link", { name: landing ? "Create a free profile" : "Create an account" })).toHaveAttribute("href", "/signup");
  await noJs.close();
  console.log(`${route} passed: collapsed tutorial entry, both paths, Escape/focus restoration, no tutorial API mutations/storage, desktop/mobile widths, reduced-motion keyboard activation, and no-JS content.`);
} finally {
  await browser.close();
}
