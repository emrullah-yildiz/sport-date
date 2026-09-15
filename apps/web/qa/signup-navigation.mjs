// Local-only keyboard regression: all API mutations are intercepted. No accounts
// or messages are created. Run with a local web server on port 3000.
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const artifacts = new URL("../../../.agents/product-studio/runtime/signup-qa/", import.meta.url);
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, reducedMotion] of [[320, "no-preference"], [390, "reduce"], [814, "no-preference"]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
    let releaseRegistration;
    const registrationResponse = new Promise((resolve) => { releaseRegistration = resolve; });
    let registrations = 0;
    await page.route("**/api/**", async (route) => {
      if (route.request().method() === "GET") return route.continue();
      if (new URL(route.request().url()).pathname === "/api/auth/register") {
        registrations += 1;
        await registrationResponse;
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Please try again shortly." }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto("http://127.0.0.1:3000/signup", { waitUntil: "networkidle" });
    await expect(page.locator(".signup-card")).toHaveCSS("opacity", "1");
    const next = page.getByRole("button", { name: "Next", exact: true });
    const back = page.getByRole("button", { name: "Back", exact: true });
    const heading = page.getByRole("heading", { level: 1 });
    const focusedHeading = async (text) => {
      await expect(heading).toHaveText(text);
      await expect(heading).toBeFocused();
      await expect(heading.locator("../../..")).toHaveCSS("opacity", "1");
      const layout = await page.evaluate(() => {
        const content = document.querySelector('.signup-step').getBoundingClientRect();
        const actions = document.querySelector('.signup-actions').getBoundingClientRect();
        const controls = [...document.querySelectorAll('.signup-step input, .signup-step button, .signup-actions button')].map(n => n.getBoundingClientRect());
        return { gap: actions.top - content.bottom, fits: controls.every(r => r.left >= 0 && r.right <= innerWidth), actionGap: document.querySelector('.signup-actions button').getBoundingClientRect().top - actions.top };
      });
      expect(layout.gap).toBeGreaterThanOrEqual(27);
      expect(layout.actionGap).toBeGreaterThanOrEqual(20);
      expect(layout.fits).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.getByLabel("First name", { exact: true }).fill("Test");
    await page.getByLabel("Last name", { exact: true }).press("Enter");
    await expect(page.locator("form").getByRole("alert")).toHaveText("Tell us your name to continue.");
    await page.getByLabel("Last name", { exact: true }).fill("Member");
    await page.getByLabel("Last name", { exact: true }).press("Enter");
    await focusedHeading("How do you describe your gender?");
    await expect(heading.locator("../../..")).toHaveCSS("opacity", "1");
    await expect(page.locator(".signup-card")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: new URL(`gender-${width}-${reducedMotion}.png`, artifacts).pathname.replace(/^\/(?=[A-Za-z]:)/, ""), fullPage: true });
    await page.keyboard.press("Tab");
    await expect(page.getByRole("group", { name: "Gender", exact: true }).getByRole("button").first()).toBeFocused();
    await next.click();
    await focusedHeading("What’s your sexual orientation?");
    await back.click();
    await focusedHeading("How do you describe your gender?");
    await back.click();
    await focusedHeading("What should we call you?");
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Test");
    await next.click();
    await focusedHeading("How do you describe your gender?");
    await next.click();
    await focusedHeading("What’s your sexual orientation?");
    await next.click();
    await focusedHeading("When’s your birthday?");
    await page.getByLabel("Date of Birth (18+ only)").fill("2020-01-01");
    await next.click();
    await expect(heading).toHaveText("When’s your birthday?");
    await page.getByLabel("Date of Birth (18+ only)").fill("2000-01-01");
    await next.click();
    await focusedHeading("What sports do you play?");
    await page.getByLabel("Don't see your sport? Add your own.").fill("Test sport");
    await page.getByLabel("Don't see your sport? Add your own.").press("Enter");
    await expect(heading).toHaveText("What sports do you play?");
    await next.click();
    await expect(heading).toBeFocused();
    await next.click();
    await focusedHeading("Add a photo or two?");
    await next.click();
    await focusedHeading("Where are you based?");
    await page.getByLabel("Location (city or region)").fill("Bucharest");
    await page.getByLabel("Location (city or region)").press("Enter");
    await focusedHeading("Save your profile");
    await page.getByLabel("Email", { exact: true }).fill("keyboard-test@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page.locator("form").getByRole("alert")).toHaveText("Use at least 12 characters for your password.");
    await page.getByLabel("Password", { exact: true }).fill("Test-Only-Password-2026");
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page.locator("form").getByRole("alert")).toHaveText("Confirm the Terms and Safety Guidelines to continue.");
    await page.getByRole("checkbox").check();
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await focusedHeading("Let’s review your profile");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(back).toBeDisabled();
    await expect(page.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    releaseRegistration();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Please try again shortly.");
    await expect(back).toBeEnabled();
    expect(registrations).toBe(1);
    await page.close();
    console.log(`PASS: signup keyboard, back, optional questions, custom sport, submission recovery; width=${width}; motion=${reducedMotion}`);
  }
} finally {
  await browser.close();
}
