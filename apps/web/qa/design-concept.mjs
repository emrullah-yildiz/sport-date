// Local-only visual and interaction review. Never creates accounts or sends requests.
// Start the web dev server on port 3000, then run: node apps/web/qa/design-concept.mjs
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const artifacts = new URL("./artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:3000/landing", { waitUntil: "networkidle" });
  await page.screenshot({ path: new URL("design-before-desktop.png", artifacts).pathname.replace(/^\/(?=[A-Za-z]:)/, ""), fullPage: true });
  console.log("Existing landing captured:", await page.title());
  const errors = [];
  const mutations = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!['GET', 'HEAD'].includes(request.method()) && new URL(request.url()).pathname.startsWith('/api/')) mutations.push(request.url());
  });
  await page.goto("http://localhost:3000/concept", { waitUntil: "networkidle" });
  // Next dev tooling may own session entries. Compare before/after choices,
  // rather than treating framework-owned storage as demo preferences.
  const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Less small talk.");
  const example = page.getByRole("article", { name: "Your example activity" });
  const meeting = page.getByText("Demo meeting point:", { exact: false });
  await expect(meeting).toHaveCount(0);
  await page.screenshot({ path: fileURLToPath(new URL("design-concept-desktop.png", artifacts)), fullPage: true });
  await page.getByRole("button", { name: "Running", exact: true }).click();
  await expect(example).toContainText("Easy kilometres.");
  await page.getByRole("button", { name: "Dating", exact: true }).click();
  await expect(example).toContainText("Open to dating");
  await page.getByRole("button", { name: "Explore this example" }).click();
  await expect(meeting).toHaveCount(0);
  await page.getByRole("button", { name: "Try sending a demo request" }).click();
  await expect(example).toContainText("not booked yet");
  await expect(meeting).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel demo request" }).click();
  await expect(page.getByRole("button", { name: "Explore this example" })).toBeVisible();
  await page.getByRole("button", { name: "Explore this example" }).click();
  await page.getByRole("button", { name: "Try sending a demo request" }).click();
  await page.getByRole("button", { name: "Demo: see the host review" }).click();
  await expect(meeting).toHaveCount(0);
  await page.getByRole("button", { name: "Demo: simulate acceptance" }).click();
  await expect(meeting).toBeVisible();
  await expect(meeting).toContainText("Fictional location");
  await page.screenshot({ path: fileURLToPath(new URL("design-concept-accepted.png", artifacts)), fullPage: true });
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  await expect(meeting).toHaveCount(0);
  await expect(example).toContainText("scenic route");
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: fileURLToPath(new URL(`design-concept-${width}.png`, artifacts)), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("button", { name: "Explore this example" }).focus();
  await page.keyboard.press("Enter");
  await expect(example).toContainText("A little more about the plan");
  await expect(page.getByRole("button", { name: "Try sending a demo request" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Demo: see the host review" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Demo: simulate acceptance" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(meeting).toBeVisible();
  await page.getByRole("button", { name: "Leave demo activity" }).click();
  await expect(page.getByRole("button", { name: "Explore this example" })).toBeFocused();
  await expect(meeting).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Explore this example" })).toBeVisible();
  await page.evaluate(() => { document.body.style.zoom = "1"; });
  expect(errors).toEqual([]);
  expect(mutations).toEqual([]);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto("http://localhost:3000/concept");
  await expect(staticPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(staticPage.getByRole("link", { name: "Create an account", exact: true })).toHaveAttribute("href", "/signup");
  await noJs.close();
  console.log("Concept passed: demo lifecycle, cancellation, selection reset, location disclosure, no API mutations/storage, desktop/mobile widths, reduced-motion keyboard activation, and no-JS content.");
} finally {
  await browser.close();
}
