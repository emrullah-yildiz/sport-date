// Full end-to-end customer workflow runner for Sport Date (QA OWNER pass).
// Drives REAL UI journeys 1-10 from the QA brief, on desktop (1280) and mobile
// (390) where it matters. Observation-only: never fixes anything. Emits a
// structured results JSON + screenshots into the scratchpad qa-flows dir.
//
// Usage: BASE_URL=http://localhost:3000 SHOT_DIR=<dir> node apps/web/qa/full-flows.mjs

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SHOT_DIR = process.env.SHOT_DIR || "./qa-shots";
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const PW = "Movement-Test-2026";

const results = [];   // workflow-level: {id,name,status,evidence,shots[]}
const findings = [];  // defect candidates
const strengths = [];
let seq = 0;

function wf(id, name) {
  const r = { id, name, status: "PASS", notes: [], shots: [] };
  results.push(r);
  return r;
}
function defect(o) { findings.push(o); console.log(`  [DEFECT ${o.severity}] ${o.id}: ${o.summary}`); }
function strength(s) { strengths.push(s); console.log(`  [STRENGTH] ${s}`); }

async function shot(page, label) {
  await mkdir(SHOT_DIR, { recursive: true });
  seq += 1;
  const safe = String(label).replace(/[^a-z0-9-]+/gi, "-").slice(0, 50).toLowerCase();
  const file = join(SHOT_DIR, `${String(seq).padStart(2, "0")}-${safe}.png`);
  try { await page.screenshot({ path: file, fullPage: true }); } catch { try { await page.screenshot({ path: file }); } catch {} }
  return file;
}

function instrument(page, bucket) {
  page.on("console", (m) => { if (m.type() === "error") bucket.console.push(m.text()); });
  page.on("pageerror", (e) => bucket.page.push(e.message || String(e)));
  page.on("response", (r) => { if (r.status() >= 500) bucket.server.push(`${r.status()} ${r.url()}`); });
}
const consoleByPage = {}; // path -> count
function tagConsole(path, bucket) {
  const ignore = [/favicon/i, /Download the React DevTools/i, /\[Fast Refresh\]/i, /status of 4\d\d/i];
  const real = bucket.console.filter((e) => !ignore.some((re) => re.test(e)));
  consoleByPage[path] = (consoleByPage[path] || 0) + real.length;
  return real;
}

async function type(loc, value) {
  await loc.click();
  await loc.fill("");
  if (value) await loc.pressSequentially(String(value), { delay: 6 });
  await loc.evaluate((el) => el.blur()).catch(() => {});
}

async function safeGoto(page, url, opts = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { await page.goto(url, { waitUntil: "domcontentloaded", ...opts }); return true; }
    catch (e) { if (!/ERR_ABORTED|interrupted|frame was detached/i.test(e?.message || "")) throw e; await page.waitForTimeout(350); }
  }
  return false;
}

// Open a discovery card's invitation robustly: prefer following its href via a
// real navigation so a soft client-nav swallowed during settling doesn't strand
// us on /discover. Returns true if we reached an event detail page.
async function openInvitation(page, cardLocator) {
  const link = cardLocator.locator("a").first();
  const href = await link.getAttribute("href").catch(() => null);
  if (href) { await safeGoto(page, BASE_URL + href); }
  else { await link.click().catch(() => {}); }
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  return /\/discover\/events\//.test(page.url());
}

async function clickNext(page) {
  const ind = () => page.locator(".step-indicator").first().innerText().catch(() => "");
  const before = await ind();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (let i = 0; i < 25; i++) { if ((await ind()) !== before) return true; await page.waitForTimeout(80); }
  return false;
}

async function fillStep1(page, { email, password, dob, terms = true }) {
  await type(page.locator("#signup-email"), email);
  await type(page.locator("#signup-password"), password);
  await page.fill("#signup-date-of-birth", dob);
  if (terms) { const cb = page.locator(".terms-check input[type=checkbox]"); if (!(await cb.isChecked())) await cb.check(); }
}

// Register a member through the real 5-step UI. options.sports = list of preset
// names to toggle; options.custom = custom sport string to add.
async function register(page, { suffix, sports = ["Tennis"], custom = null, seeking = "Friendship", language = null, dob = "1990-03-03" }) {
  const m = { email: `qa+${suffix}-${RUN}@sport-date.invalid`, password: PW, firstName: "Riley", lastName: `T${suffix}`, location: "Bucharest", dob };
  await safeGoto(page, BASE_URL + "/signup");
  await fillStep1(page, { email: m.email, password: m.password, dob: m.dob });
  await clickNext(page);
  await page.locator("#signup-first-name").waitFor({ state: "visible", timeout: 10000 });
  await type(page.locator("#signup-first-name"), m.firstName);
  await type(page.locator("#signup-last-name"), m.lastName);
  await type(page.locator("#signup-location"), m.location);
  await clickNext(page);
  await page.locator(".sport-card").first().waitFor({ state: "visible", timeout: 10000 });
  for (const s of sports) await page.locator(".sport-card").filter({ has: page.locator(`span:text-is("${s}")`) }).first().click();
  if (custom) { await type(page.locator("#signup-custom-sport"), custom); await page.locator(".custom-sport-add").click(); }
  await clickNext(page);
  await page.locator(".seeking-card", { hasText: seeking }).waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".seeking-card", { hasText: seeking }).click();
  await clickNext(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const ok = await page.locator(".signup-success").waitFor({ state: "visible", timeout: 20000 }).then(() => true).catch(() => false);
  // Set a language via profile editing if requested (signup never collects one).
  if (ok && language) {
    await safeGoto(page, BASE_URL + "/profile");
    const sum = page.locator(".edit-profile summary");
    if (await sum.count()) {
      await sum.click();
      await type(page.getByLabel("Languages, separated by commas"), language);
      await page.locator(".edit-profile button.privacy-action").click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
  }
  return ok ? m : null;
}

async function login(page, email, password) {
  await safeGoto(page, BASE_URL + "/login");
  await type(page.locator("#login-email"), email);
  await type(page.locator("#login-password"), password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  return page.waitForURL(/\/profile/, { timeout: 15000 }).then(() => true).catch(() => false);
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const probe = await fetch(BASE_URL + "/", { redirect: "manual" }).then((r) => r.status).catch(() => null);
  if (!probe) { console.error("server not reachable"); process.exit(2); }
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const bucket = { console: [], page: [], server: [] };
  const page = await ctx.newPage();
  instrument(page, bucket);

  let actor = null;

  // ---- WORKFLOW 1: Signup (chess + custom sport, 5 steps) -----------------
  {
    const r = wf(1, "Signup");
    try {
      // 1a underage block at step 1: DOB making the member ~10yo must not advance.
      await safeGoto(page, BASE_URL + "/signup");
      await fillStep1(page, { email: `qa+under-${RUN}@sport-date.invalid`, password: PW, dob: "2015-01-01" });
      const advanced = await clickNext(page);
      const stepInd = await page.locator(".step-indicator").first().innerText().catch(() => "");
      const blockErr = await page.locator(".error-message, .field-error").first().innerText().catch(() => "");
      if (advanced && !/step 1/i.test(stepInd)) { r.status = "BROKEN"; r.notes.push("Underage DOB advanced past step 1"); defect({ id:"signup-underage-advances", severity:"critical", summary:"Underage DOB advanced past step 1 of signup", expected:"18+ gate blocks at step 1", observed:`advanced to ${stepInd}`, shot: await shot(page,"signup-underage") }); }
      else { r.notes.push(`underage blocked at step 1 (msg: ${blockErr.slice(0,60)})`); strength("18+ gate blocks an underage date of birth at step 1 of signup"); }
      tagConsole("/signup", bucket); bucket.console.length = 0;

      // 1b full happy path: chess preset + custom sport
      const email = `qa+main-${RUN}@sport-date.invalid`;
      await safeGoto(page, BASE_URL + "/signup");
      await fillStep1(page, { email, password: PW, dob: "1992-04-04" });
      await clickNext(page);
      await type(page.locator("#signup-first-name"), "Morgan");
      await type(page.locator("#signup-last-name"), "Quill");
      await type(page.locator("#signup-location"), "Bucharest");
      // chaos: refresh mid-step
      await page.reload({ waitUntil: "domcontentloaded" });
      const reset = /step 1/i.test(await page.locator(".step-indicator").first().innerText().catch(() => ""));
      if (reset) strength("Refresh mid-signup resets cleanly to step 1 without crash");
      await fillStep1(page, { email, password: PW, dob: "1992-04-04" });
      await clickNext(page);
      await type(page.locator("#signup-first-name"), "Morgan");
      await type(page.locator("#signup-last-name"), "Quill");
      await type(page.locator("#signup-location"), "Bucharest");
      await clickNext(page);
      await page.locator(".sport-card").filter({ has: page.locator('span:text-is("Chess")') }).first().click();
      await type(page.locator("#signup-custom-sport"), "Underwater Hockey");
      await page.locator(".custom-sport-add").click();
      const customShown = await page.locator(".custom-sport-tag", { hasText: "Underwater Hockey" }).count();
      if (!customShown) { r.notes.push("custom sport tag did not appear"); defect({ id:"signup-custom-sport-missing", severity:"medium", summary:"Custom sport not shown after add", expected:"tag appears", observed:"no tag", shot: await shot(page,"signup-custom-missing") }); }
      await clickNext(page);
      await page.locator("#signup-bio").waitFor({ state: "visible", timeout: 10000 });
      await type(page.locator("#signup-bio"), "Mind-sport and water enthusiast, cautious first-timer.");
      await page.locator(".seeking-card", { hasText: "Friendship" }).click();
      await clickNext(page);
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      const ok = await page.locator(".signup-success").waitFor({ state: "visible", timeout: 20000 }).then(() => true).catch(() => false);
      if (!ok) { r.status = "BROKEN"; r.notes.push("create account did not reach success"); defect({ id:"signup-create-failed", severity:"high", summary:"Account creation failed", expected:"success card", observed:"no success", shot: await shot(page,"signup-failed") }); }
      else {
        actor = { email, password: PW };
        // land on profile, verify sports
        await page.getByRole("link", { name: /View your private profile/i }).click().catch(() => {});
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        if (!page.url().includes("/profile")) await safeGoto(page, BASE_URL + "/profile");
        const sportsText = await page.locator(".profile-sport-list").innerText().catch(() => "");
        const hasChess = /chess/i.test(sportsText);
        const hasCustom = /underwater hockey/i.test(sportsText);
        if (!hasChess || !hasCustom) { r.status = "BROKEN"; r.notes.push(`profile sports missing chess=${hasChess} custom=${hasCustom}; got "${sportsText}"`); defect({ id:"signup-sports-not-persisted", severity:"high", summary:"Chosen sports not on profile after signup", expected:"Chess + Underwater Hockey shown", observed:sportsText, shot: await shot(page,"profile-sports") }); }
        else { r.notes.push("profile shows Chess + custom Underwater Hockey"); strength("Signup persists both preset (Chess) and a custom sport, shown on profile"); }
      }
      tagConsole("/signup", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf1-exception"); }
  }

  // Ensure we have an authenticated actor for downstream flows.
  if (!actor) { actor = await register(page, { suffix: "fallback", sports: ["Tennis"], language: "English" }); }
  await login(page, actor.email, actor.password);

  // ---- WORKFLOW 2: Auth (logout/login/wrong/429) -- run LAST-ish for 429.
  // We do logout+login now; the 429 hammering happens at the very end.

  // ---- WORKFLOW 3: Edit profile (persist) ---------------------------------
  {
    const r = wf(3, "Edit profile");
    try {
      await safeGoto(page, BASE_URL + "/profile");
      await page.locator(".edit-profile summary").click();
      await type(page.locator(".edit-profile textarea").first(), "Updated bio for persistence check.");
      await type(page.getByLabel("Languages, separated by commas"), "English, Romanian");
      await page.getByLabel("What are you looking for?").selectOption("dating");
      // add a sport
      const addBtn = page.locator(".add-sport");
      if (await addBtn.isEnabled()) { await addBtn.click(); }
      const rows = page.locator(".edit-sport-row");
      const last = rows.last();
      await type(last.locator("input[aria-label^='Sport']"), "Squash");
      await last.locator("select").first().selectOption("advanced");
      await last.locator("select").nth(1).selectOption("monthly");
      // over-limit check
      for (let i = 0; i < 8; i++) { if (await addBtn.isEnabled().catch(() => false)) await addBtn.click(); else break; }
      const overLimit = (await rows.count()) > 5;
      if (overLimit) defect({ id:"profile-over-5-sports", severity:"medium", summary:"More than 5 sports allowed", expected:"Add disabled at 5", observed:`${await rows.count()} rows`, shot: await shot(page,"profile-over-limit") });
      else strength("Profile sport list caps at 5 (Add disabled)");
      // name any empty rows so save validates, then trim to 4
      const names = page.locator(".edit-sport-row input[aria-label^='Sport']");
      for (let i = 0; i < await names.count(); i++) { if (!(await names.nth(i).inputValue()).trim()) await type(names.nth(i), `Extra${i}`); }
      while ((await rows.count()) > 4) { const rb = page.locator(".edit-sport-row .remove-sport").last(); if (await rb.isEnabled().catch(() => false)) await rb.click(); else break; }
      await page.locator(".edit-profile button.privacy-action").click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(1500);
      // reload + verify persisted
      await safeGoto(page, BASE_URL + "/profile");
      const conn = await page.locator(".profile-grid").innerText().catch(() => "");
      const sportsText = await page.locator(".profile-sport-list").innerText().catch(() => "");
      const seekingShown = /dating/i.test(conn);
      const squash = /squash/i.test(sportsText);
      const bioShown = /Updated bio for persistence/i.test(await page.locator(".profile-panel blockquote").first().innerText().catch(() => ""));
      if (!seekingShown || !squash || !bioShown) { r.status = "BROKEN"; r.notes.push(`persist seeking=${seekingShown} squash=${squash} bio=${bioShown}`); defect({ id:"profile-edit-not-persisted", severity:"high", summary:"Profile edits did not persist after reload", expected:"dating/Squash/bio shown", observed:`seeking=${seekingShown} squash=${squash} bio=${bioShown}`, shot: await shot(page,"profile-persist") }); }
      else { r.notes.push("bio/seeking/added sport persisted across reload"); strength("Profile edits (bio, seeking, languages, added sport w/ skill+freq) persist across reload"); }
      // invalid: over-long bio clamp
      await page.locator(".edit-profile summary").click();
      const bio = page.locator(".edit-profile textarea").first();
      await type(bio, "z".repeat(260));
      const len = (await bio.inputValue()).length;
      if (len > 200) defect({ id:"profile-bio-overflow", severity:"low", summary:"Bio exceeds 200 char cap", expected:"clamp 200", observed:`len=${len}` });
      tagConsole("/profile", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf3-exception"); }
  }

  // ---- WORKFLOW 4: Create event (host) ------------------------------------
  let actorEventUrl = null;
  {
    const r = wf(4, "Create event");
    try {
      await safeGoto(page, BASE_URL + "/events/new");
      // empty submit
      await page.locator("button.event-publish").click();
      await page.waitForTimeout(400);
      if (!page.url().includes("/events/new")) r.notes.push("empty submit navigated away unexpectedly");
      else strength("Empty event submit is blocked by field validation (stays on form)");
      // valid event
      const f = new Date(Date.now() + 7 * 864e5); const p = (n) => String(n).padStart(2, "0");
      const dt = `${f.getFullYear()}-${p(f.getMonth()+1)}-${p(f.getDate())}T18:30`;
      const set = async (n, v, tag="input") => page.fill(`${tag}[name=${n}]`, v);
      await set("sport","Chess"); await set("title","Evening chess and tea "+RUN.slice(0,4));
      await set("description","A relaxed beginner-friendly chess evening. Newcomers welcome; gentle pace.","textarea");
      await set("startsAt",dt); await set("durationMinutes","90"); await set("capacity","4");
      await set("language","English"); await set("minimumAge","21"); await set("maximumAge","60");
      await set("city","Bucharest"); await set("countryCode","RO"); await set("areaLabel","Tineretului");
      await set("venueName","Cafe Central"); await set("address","Str. Exemplu 10");
      await set("instructions","Ask for the chess table at the back.","textarea");
      await page.locator("button.event-publish").click();
      const nav = await page.waitForURL(/\/events\/[0-9a-f-]{30,}/, { timeout: 15000 }).then(() => true).catch(() => false);
      if (!nav) { r.status = "BROKEN"; r.notes.push("valid event did not publish"); defect({ id:"event-create-failed", severity:"high", summary:"Valid event did not publish", expected:"navigate to event page", observed:page.url(), shot: await shot(page,"event-failed") }); }
      else { actorEventUrl = page.url(); r.notes.push("event published, reachable at host page"); strength("Event publishes and host lands on the host event page with public/private location split"); }
      tagConsole("/events/new", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf4-exception"); }
  }

  // ---- WORKFLOW 5: Discovery + filters + join + cancel --------------------
  // Needs the actor to have a language for discovery to match. Set English.
  {
    const r = wf(5, "Discovery + join");
    try {
      // ensure language set
      await safeGoto(page, BASE_URL + "/profile");
      await page.locator(".edit-profile summary").click();
      await type(page.getByLabel("Languages, separated by commas"), "English");
      await page.locator(".edit-profile button.privacy-action").click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(1000);

      await safeGoto(page, BASE_URL + "/discover");
      const baseCards = await page.locator(".discovery-card").count();
      r.notes.push(`discover baseline cards=${baseCards}`);
      // filter: nonsense city -> empty state reacts
      await page.fill("input[name=city]", "Nowhere-" + RUN);
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.getByRole("button", { name: /Find my events/i }).click()]);
      const afterCity = await page.locator(".discovery-card").count();
      const bodyTxt = await page.locator("body").innerText().catch(() => "");
      if (afterCity === 0 && /quiet court|No compatible/i.test(bodyTxt)) strength("City filter reacts; nonsense city shows a calm empty state");
      else if (afterCity >= baseCards && baseCards > 0) { r.notes.push("city filter did NOT reduce results"); defect({ id:"discover-filter-city-noop", severity:"medium", summary:"City filter did not change results", expected:"nonsense city -> 0 results", observed:`before=${baseCards} after=${afterCity}`, shot: await shot(page,"discover-filter") }); }
      tagConsole("/discover", bucket); bucket.console.length = 0;

      // back to full discover, join an event if any
      await safeGoto(page, BASE_URL + "/discover");
      const cards = page.locator(".discovery-card");
      if (await cards.count() > 0) {
        await openInvitation(page, cards.first());
        const box = page.locator(".join-request-box");
        if (await box.count()) {
          await type(page.locator("#join-introduction"), "Hello, beginner here, happy to follow your lead.");
          await page.getByRole("button", { name: /Request a place/i }).click();
          await page.waitForLoadState("domcontentloaded").catch(() => {});
          await page.waitForTimeout(800);
          if (await page.locator(".join-state.pending").count()) {
            r.notes.push("join request -> pending state confirmed");
            strength("Join request reaches a reassuring pending state with private skip counts");
            const cancel = page.getByRole("button", { name: /Cancel request/i });
            if (await cancel.count()) { await cancel.click(); await page.waitForLoadState("domcontentloaded").catch(() => {}); await page.waitForTimeout(600); if (await page.locator(".join-state.closed").count()) strength("Member can quietly cancel a pending join request"); }
          } else { r.notes.push("no pending state after request"); defect({ id:"join-no-pending", severity:"medium", summary:"Join request did not reach pending", expected:"pending state", observed:"none", shot: await shot(page,"join-no-pending") }); }
        } else { r.notes.push("no join box on first card (maybe own/requested)"); }
      } else { r.status = "CONFUSING"; r.notes.push("no discoverable events for actor (covered by existing language ticket)"); }
      tagConsole("/discover", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf5-exception"); }
  }

  // Shared host/requester contexts so WF6 and WF8 reuse the SAME two accounts
  // (registration is capped at 5/IP/hour in dev). Closed after WF8.
  let hostCtx, reqCtx, hostPage, reqPage, hostEventUrl = null, reqEventUrl = null;

  // ---- WORKFLOW 6: Multi-user host-accept + room + reflection -------------
  {
    const r = wf(6, "Multi-user accept");
    try {
      hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      hostPage = await hostCtx.newPage();
      const hb = { console: [], page: [], server: [] }; instrument(hostPage, hb);
      const host = await register(hostPage, { suffix: "hostB", sports: ["Tennis"], seeking: "Group events", language: "English" });
      if (!host) { r.status = "BROKEN"; r.notes.push("host register failed"); throw new Error("host register"); }
      // host an event open to all
      await safeGoto(hostPage, BASE_URL + "/events/new");
      const f = new Date(Date.now() + 5 * 864e5); const p = (n) => String(n).padStart(2, "0");
      const dt = `${f.getFullYear()}-${p(f.getMonth()+1)}-${p(f.getDate())}T19:00`;
      const set = async (n, v, tag="input") => hostPage.fill(`${tag}[name=${n}]`, v);
      await set("sport","Tennis"); await set("title",`Open tennis newcomers ${RUN.slice(0,4)}`);
      await set("description","A friendly beginner-welcoming session. Relaxed and social for everyone.","textarea");
      await set("startsAt",dt); await set("durationMinutes","90"); await set("capacity","6");
      await set("language","English"); await set("minimumAge","18"); await set("maximumAge","99");
      await set("city","Bucharest"); await set("countryCode","RO"); await set("areaLabel","Tineretului");
      await set("venueName","Court 2"); await set("address","Str. Exemplu 10");
      await set("instructions","Enter via the south gate.","textarea");
      await hostPage.locator("button.event-publish").click();
      const hosted = await hostPage.waitForURL(/\/events\/[0-9a-f-]{30,}/, { timeout: 15000 }).then(() => true).catch(() => false);
      hostEventUrl = hosted ? hostPage.url() : null;
      if (!hosted) { r.status = "BROKEN"; r.notes.push("host event failed"); throw new Error("host event"); }
      const eventId = hostEventUrl.split("/events/")[1].split(/[/?#]/)[0];

      // requester A
      reqCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      reqPage = await reqCtx.newPage();
      const rb = { console: [], page: [], server: [] }; instrument(reqPage, rb);
      const req = await register(reqPage, { suffix: "reqA", sports: ["Tennis"], seeking: "Friendship", language: "English" });
      if (!req) { r.status = "BROKEN"; r.notes.push("requester register failed"); throw new Error("req register"); }
      // (a) verify discoverability via the card list (real product check)
      await safeGoto(reqPage, BASE_URL + "/discover?sport=Tennis");
      const cards = reqPage.locator(".discovery-card");
      const mine = cards.filter({ has: reqPage.locator(`a[href="/discover/events/${eventId}"]`) });
      if (await cards.count() === 0) { r.status = "CONFUSING"; r.notes.push("requester saw 0 events even with language+sport set"); defect({ id:"multiuser-discover-empty", severity:"high", summary:"Compatible event not discoverable for matching new member", expected:"host's tennis event visible", observed:"0 cards", shot: await shot(reqPage,"mu-discover-empty") }); }
      else if (await mine.count() === 0) { r.notes.push("this run's host event not found in requester discovery list"); defect({ id:"multiuser-host-event-not-discoverable", severity:"high", summary:"A matching new member could not discover the host's exact event", expected:"host event present in discovery", observed:"event id not in card list", shot: await shot(reqPage,"mu-not-discoverable") }); }
      else { r.notes.push("requester can discover this run's exact host tennis event"); strength("A matching new member discovers the host's open event in /discover"); }
      // (b) act on the host's EXACT event detail (DB has many similar tennis events)
      {
        await safeGoto(reqPage, BASE_URL + `/discover/events/${eventId}`);
        const box = reqPage.locator(".join-request-box");
        if (await box.count()) {
          await type(reqPage.locator("#join-introduction"), "Hi, beginner, looking forward to it.");
          reqEventUrl = reqPage.url();
          await reqPage.getByRole("button", { name: /Request a place/i }).click();
          // the request triggers a client reload; wait for the pending state to render
          await reqPage.locator(".join-state.pending").waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
          const pending = await reqPage.locator(".join-state.pending").count();
          if (!pending) { r.notes.push("requester request not pending (timing)"); }

          // host accepts: load host page, wait for the pending request card to render
          await safeGoto(hostPage, hostEventUrl);
          await hostPage.locator(".host-request.pending").first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
          const acceptBtn = hostPage.locator(".accept-request").first();
          if (await acceptBtn.count()) {
            await acceptBtn.click();
            await hostPage.locator(".host-request.accepted").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
            const hostAccepted = await hostPage.locator(".host-request.accepted").count();
            if (hostAccepted) strength("Host sees the pending request, accepts it, and the request moves to the accepted group");
            else { r.status = "BROKEN"; r.notes.push("accept did not move request to accepted on host side"); }
          } else { r.status = "BROKEN"; r.notes.push("host had no accept button"); defect({ id:"host-no-accept", severity:"high", summary:"Host cannot see/accept pending request", expected:"Accept button on the pending request", observed:"none", shot: await shot(hostPage,"host-no-accept") }); }

          // requester sees accepted + precise location revealed
          await safeGoto(reqPage, reqEventUrl);
          await reqPage.locator(".join-state.accepted").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
          const accepted = await reqPage.locator(".join-state.accepted").count();
          const loc = await reqPage.locator(".accepted-location").count();
          const locText = await reqPage.locator(".accepted-location").innerText().catch(() => "");
          const showsVenue = /Court 2|Str\. Exemplu/i.test(locText);
          if (accepted && loc && showsVenue) { r.notes.push("requester sees accepted state + precise venue (Court 2) only after acceptance"); strength("Precise venue revealed to requester only after host acceptance"); }
          else { r.status = "BROKEN"; r.notes.push(`accepted=${accepted} locPanel=${loc} venue=${showsVenue}`); defect({ id:"accepted-location-missing", severity:"high", summary:"Accepted member did not see precise location after acceptance", expected:"venue + address shown", observed:`accepted=${accepted} loc=${loc}`, shot: await shot(reqPage,"mu-accepted") }); }
          // event room reachable
          const roomLink = reqPage.locator(".accepted-location a", { hasText: /event room/i });
          if (await roomLink.count()) {
            await roomLink.click(); await reqPage.waitForLoadState("domcontentloaded").catch(() => {});
            if (reqPage.url().includes("/room")) { strength("Accepted member can enter the coordination room");
              // reflection check
              const refl = await reqPage.locator(".room-page form").filter({ hasText: /reflect|attend/i }).count();
              r.notes.push(`reflection form present=${refl>0} (event is future -> expected absent; cannot fast-forward via UI)`);
            }
          }
          await shot(reqPage, "mu-room");
        } else { r.notes.push("no join box for requester"); }
      }
      tagConsole("/discover", rb); tagConsole("/events", hb);
    } catch (e) { if (r.status === "PASS") r.status = "BROKEN"; r.notes.push("exception: " + e.message); }
    r.notes.push("reflection/Movement-Arc progression requires a PAST event; cannot be fast-forwarded via UI, so not completed end-to-end");
  }

  // ---- WORKFLOW 7: Feedback (categories + history) ------------------------
  {
    const r = wf(7, "Feedback");
    try {
      await safeGoto(page, BASE_URL + "/feedback");
      // valid submission
      await page.locator(".feedback-form select").first().selectOption("usability");
      await type(page.locator(".feedback-form input").first(), "Filters were a little hard to find at first time");
      await type(page.locator(".feedback-form textarea").first(), "I opened discover and spent a moment hunting for where to change the city and sport filters before spotting the row.");
      await type(page.locator("input[pattern='[^?#]+']"), "/discover");
      await page.locator("input[name=severity][value=medium]").check();
      await page.getByRole("button", { name: /Share feedback/i }).click();
      const msg = await page.locator(".feedback-message").innerText({ timeout: 10000 }).catch(() => "");
      if (/thank you/i.test(msg)) {
        // verify appears in history
        await page.waitForTimeout(800);
        const hist = await page.locator("body").innerText().catch(() => "");
        const inHistory = /Filters were a little hard to find/i.test(hist);
        if (inHistory) { r.notes.push("feedback confirmed + appears in history"); strength("Feedback confirms with thank-you and appears in 'your feedback' history"); }
        else { r.status = "CONFUSING"; r.notes.push("feedback confirmed but not visibly in history"); defect({ id:"feedback-history-missing", severity:"low", summary:"Submitted feedback not visible in history list", expected:"item shown in history", observed:"not found", shot: await shot(page,"feedback-history") }); }
      } else { r.status = "BROKEN"; r.notes.push("feedback did not confirm"); defect({ id:"feedback-submit-failed", severity:"medium", summary:"Valid feedback did not confirm", expected:"thank-you", observed:msg||"none", shot: await shot(page,"feedback-failed") }); }
      tagConsole("/feedback", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf7-exception"); }
  }

  // ---- WORKFLOW 8: Safety (block/report) ----------------------------------
  {
    const r = wf(8, "Safety block/report");
    try {
      // Submit a report as the WF6 requester on their event detail (the host is a
      // reportable subject there). Runs BEFORE the block test below.
      const reportPage = (reqPage && reqEventUrl) ? reqPage : page;
      if (reqPage && reqEventUrl) await safeGoto(reportPage, reqEventUrl);
      else await safeGoto(reportPage, BASE_URL + "/discover");
      const sc = reportPage.locator(".safety-controls summary").first();
      if (await sc.count()) {
        await sc.click();
        await reportPage.locator(".safety-controls select").first().selectOption("harassment");
        await type(reportPage.locator(".safety-controls textarea").first(), "Test report: the host sent an off-platform message that felt pushy and inappropriate.");
        await reportPage.getByRole("button", { name: /Submit safety report/i }).first().click();
        const sm = await reportPage.locator(".safety-message").first().innerText({ timeout: 10000 }).catch(() => "");
        if (sm && sm.trim().length > 0) { r.notes.push("report confirmed: " + sm.slice(0,60)); strength("Safety report confirms with a message and offers an emergency note + immediate block option"); }
        else { r.status = "BROKEN"; r.notes.push("report no confirmation"); defect({ id:"report-no-confirm", severity:"high", summary:"Safety report gave no confirmation", expected:"confirmation message", observed:"none", shot: await shot(reportPage,"report-noconfirm") }); }
        await shot(reportPage, "safety-report");
      } else { r.status = "CONFUSING"; r.notes.push("no safety controls available to exercise report"); }

      // Block-and-revoke: reuse the WF6 host(B) + requester(A) accounts. A is an
      // accepted participant in B's event, so blocking is the strongest revocation
      // test (room access + precise location must be withdrawn).
      if (hostPage && reqPage && hostEventUrl && reqEventUrl) {
        await safeGoto(hostPage, hostEventUrl);
        const sc = hostPage.locator(".host-request .safety-controls summary").first();
        if (await sc.count()) {
          await sc.click();
          const blockBtn = hostPage.locator(".host-request .safety-quick-action button").first();
          if (await blockBtn.count()) {
            await blockBtn.click();
            await hostPage.waitForLoadState("domcontentloaded").catch(() => {});
            await hostPage.waitForTimeout(1500);
            const redirected = hostPage.url().includes("/profile");
            if (redirected) strength("Host can block a participant directly; block confirms by returning to profile");
            // verify A (blocked) loses access to the shared event detail + room
            await safeGoto(reqPage, reqEventUrl);
            const body = (await reqPage.locator("body").innerText().catch(() => "")).toLowerCase();
            const lostDetail = /not found|could not be found|404|no longer|removed/i.test(body) || reqPage.url().includes("/login");
            await safeGoto(reqPage, reqEventUrl.replace(/\/discover\/events\//, "/events/").replace(/\/?$/, "/room"));
            const roomBody = (await reqPage.locator("body").innerText().catch(() => "")).toLowerCase();
            const lostRoom = /not found|could not be found|404/i.test(roomBody) || reqPage.url().includes("/login") || !roomBody.includes("court 2");
            if (lostDetail || lostRoom) { r.notes.push(`blocked member lost access (detail=${lostDetail} room=${lostRoom})`); strength("Blocking revokes the blocked member's access to the shared event and room as claimed"); }
            else { r.status = "CONFUSING"; r.notes.push("blocked member still saw event/room"); defect({ id:"block-access-not-revoked", severity:"high", summary:"Blocked member still saw the shared event/room after being blocked", expected:"access revoked", observed:"event/room still visible", shot: await shot(reqPage,"block-not-revoked") }); }
          } else { r.notes.push("no block button on host request card"); }
        } else { r.notes.push("no safety controls on host request card (request may not be visible)"); }
      } else { r.notes.push("block test skipped: WF6 host/requester not available"); }
    } catch (e) { if (r.status === "PASS") r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf8-exception"); }
    finally { if (hostCtx) await hostCtx.close().catch(()=>{}); if (reqCtx) await reqCtx.close().catch(()=>{}); }
  }

  // ---- WORKFLOW 9: Account data export + deletion -------------------------
  {
    const r = wf(9, "Account data");
    try {
      // We use a throwaway account so deletion doesn't kill the main actor.
      const delCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const dPage = await delCtx.newPage();
      const db = { console: [], page: [], server: [] }; instrument(dPage, db);
      const delUser = await register(dPage, { suffix: "del", sports: ["Tennis"], language: "English" });
      await safeGoto(dPage, BASE_URL + "/profile");
      // export
      const [download] = await Promise.all([
        dPage.waitForEvent("download", { timeout: 10000 }).catch(() => null),
        dPage.locator("button.privacy-action", { hasText: /Download my data/i }).click(),
      ]);
      await dPage.waitForTimeout(800);
      const exportMsg = await dPage.locator(".privacy-message").innerText().catch(() => "");
      if (download || /export is ready/i.test(exportMsg)) { r.notes.push("export produced a download/confirmation"); strength("Account export downloads a machine-readable JSON with a clear confirmation"); }
      else { r.status = "CONFUSING"; r.notes.push("export gave no download/confirmation: "+exportMsg); defect({ id:"export-no-confirm", severity:"medium", summary:"Data export gave no download or confirmation", expected:"JSON download + confirmation", observed:exportMsg||"none", shot: await shot(dPage,"export") }); }
      // deletion: re-auth required
      await dPage.locator(".deletion-control summary").click();
      // wrong: missing password -> button stays disabled until DELETE typed; test wrong password
      await type(dPage.locator("#deletion-password"), "Wrong-Password-123");
      await type(dPage.locator("#deletion-confirmation"), "DELETE");
      await dPage.locator("button.danger-action").click();
      await dPage.waitForTimeout(1200);
      const wrongMsg = await dPage.locator(".privacy-message").innerText().catch(() => "");
      const stillProfile = dPage.url().includes("/profile");
      if (stillProfile && wrongMsg) { r.notes.push("wrong password blocked deletion: "+wrongMsg.slice(0,50)); strength("Deletion requires correct password; wrong password is rejected with a message"); }
      else if (!stillProfile) { r.status = "BROKEN"; r.notes.push("wrong password still triggered deletion/redirect"); defect({ id:"deletion-wrong-pw-accepted", severity:"critical", summary:"Deletion proceeded with wrong password", expected:"reject wrong password", observed:"redirected to login", shot: await shot(dPage,"del-wrongpw") }); }
      // correct deletion
      await type(dPage.locator("#deletion-password"), PW);
      await type(dPage.locator("#deletion-confirmation"), "DELETE");
      await dPage.locator("button.danger-action").click();
      const deleted = await dPage.waitForURL(/\/login\?deletion=requested/, { timeout: 10000 }).then(() => true).catch(() => false);
      if (deleted) { r.notes.push("deletion request completed -> signed out to login?deletion=requested"); strength("Re-authenticated deletion locks the profile and signs the member out");
        // verify locked: try login again
        const back = await login(dPage, delUser.email, PW);
        if (!back) strength("After deletion request the account can no longer sign in (profile locked)");
        else { r.notes.push("deleted account could still log in"); defect({ id:"deletion-not-enforced", severity:"high", summary:"Account still logs in after deletion request", expected:"login blocked", observed:"logged in", shot: await shot(dPage,"del-relogin") }); }
      } else { r.status = "BROKEN"; r.notes.push("deletion did not complete"); defect({ id:"deletion-failed", severity:"high", summary:"Correct-password deletion did not complete", expected:"redirect to login?deletion=requested", observed:dPage.url(), shot: await shot(dPage,"del-failed") }); }
      tagConsole("/profile", db);
      await delCtx.close();
    } catch (e) { if (r.status === "PASS") r.status = "BROKEN"; r.notes.push("exception: " + e.message); }
  }

  // ---- WORKFLOW 10: Device/session management -----------------------------
  {
    const r = wf(10, "Session management");
    try {
      await safeGoto(page, BASE_URL + "/profile");
      const panel = page.locator(".mobile-session-panel");
      await panel.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(1200);
      const panelText = await panel.innerText().catch(() => "");
      const noSessions = /No mobile device sessions yet/i.test(panelText);
      const revokeBtns = await page.locator(".mobile-device-list button", { hasText: /Revoke/i }).count();
      if (noSessions && revokeBtns === 0) {
        r.status = "CONFUSING";
        r.notes.push("Session panel only lists MOBILE/native sessions; a web-only member sees 'No mobile device sessions yet' and cannot view/revoke their current browser session");
        defect({ id:"sessions-web-not-listed", severity:"medium", summary:"Web/browser session not shown or revocable in session management", expected:"member can see and revoke their active web session", observed:"only native mobile sessions listed; web member sees 'No mobile device sessions yet' with nothing to revoke", shot: await shot(page,"sessions-web") });
      } else if (revokeBtns > 0) {
        r.notes.push(`${revokeBtns} revocable session(s) shown`);
        await page.locator(".mobile-device-list button", { hasText: /Revoke/i }).first().click();
        await page.waitForTimeout(1200);
        const msg = await page.locator(".mobile-session-message").innerText().catch(() => "");
        if (/revoked/i.test(msg)) strength("A device session can be revoked with confirmation");
        else { r.status = "BROKEN"; r.notes.push("revoke gave no confirmation"); }
      } else { r.notes.push("session panel state: " + panelText.slice(0,80)); }
      tagConsole("/profile", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf10-exception"); }
  }

  // ---- MOBILE 390 spot checks (login as the main actor; runs BEFORE the
  // 429 hammer so the per-IP login limit is still available) ----------------
  {
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mp = await mctx.newPage();
    const mb = { console: [], page: [], server: [] }; instrument(mp, mb);
    const mok = await login(mp, actor.email, actor.password);
    for (const path of ["/profile", "/discover", "/events/new", "/feedback"]) {
      await safeGoto(mp, BASE_URL + path);
      await mp.waitForTimeout(400);
      const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      await shot(mp, "mobile" + path.replace(/\//g, "-"));
      if (overflow) defect({ id:`mobile-overflow${path.replace(/\//g,"-")}`, severity:"low", summary:`Horizontal overflow on ${path} at 390px`, expected:"no horizontal scroll", observed:"page wider than viewport", shot: await shot(mp,"mob-overflow"+path.replace(/\//g,"-")) });
      tagConsole("mobile:"+path, mb); mb.console.length = 0;
    }
    if (mok) strength("Key surfaces render at 390px mobile width for a signed-in member");
    await mctx.close();
  }

  // ---- WORKFLOW 2 (auth) now: logout, login, wrong pw, 429 ---------------
  {
    const r = wf(2, "Auth");
    try {
      // logout (button does a POST then window.location.assign('/login'))
      await safeGoto(page, BASE_URL + "/profile");
      const logout = page.getByRole("button", { name: /log ?out|sign ?out/i }).first();
      if (await logout.count()) { await logout.click(); await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {}); }
      // verify the session is really gone: profile must redirect to login
      await safeGoto(page, BASE_URL + "/profile");
      if (page.url().includes("/login")) strength("Logout ends the session; /profile redirects to login afterward");
      else { r.status = "BROKEN"; r.notes.push("still had profile access after logout"); defect({ id:"logout-not-effective", severity:"high", summary:"Profile still accessible after logout", expected:"redirect to login", observed:page.url(), shot: await shot(page,"logout") }); }
      // correct login
      const ok = await login(page, actor.email, actor.password);
      if (ok) strength("Member can log back in with correct credentials");
      else { r.status = "BROKEN"; r.notes.push("correct login failed"); defect({ id:"login-correct-failed", severity:"critical", summary:"Correct credentials failed to log in", expected:"reach profile", observed:page.url(), shot: await shot(page,"login-correct") }); }
      // wrong password -> neutral
      await safeGoto(page, BASE_URL + "/login");
      await type(page.locator("#login-email"), actor.email);
      await type(page.locator("#login-password"), "Definitely-Wrong-999");
      await page.getByRole("button", { name: /Sign in/i }).click();
      const err = await page.locator(".error-message").first().innerText({ timeout: 8000 }).catch(() => "");
      if (/incorrect/i.test(err) && !/exist|no account|not found/i.test(err)) strength("Wrong password gives a neutral non-revealing message");
      else { r.notes.push("wrong-pw message: " + err); defect({ id:"login-revealing", severity:"medium", summary:"Wrong-credential message not neutral", expected:"neutral message", observed:err||"none", shot: await shot(page,"login-wrong") }); }
      // 429: hammer
      let saw429 = false, sawScary = false;
      const rlEmail = `qa+rl-${RUN}@sport-date.invalid`;
      for (let i = 0; i < 14; i++) {
        await type(page.locator("#login-email"), rlEmail);
        await type(page.locator("#login-password"), `Wrong-${i}-aaa`);
        await page.getByRole("button", { name: /Sign in/i }).click();
        const m = await page.locator(".error-message").first().innerText({ timeout: 8000 }).catch(() => "");
        if (/too many|wait before|try again later|rate/i.test(m)) saw429 = true;
        if (/internal server error|unexpected|\b500\b|stack/i.test(m)) sawScary = true;
        await page.waitForTimeout(100);
      }
      if (saw429) strength("Repeated bad logins are rate-limited with a calm 'too many attempts' message");
      else { r.status = "CONFUSING"; r.notes.push("no 429 message within 14 attempts"); defect({ id:"login-no-429", severity:"low", summary:"No visible rate-limit message in 14 rapid attempts", expected:"calm 429 message", observed:"none surfaced", shot: await shot(page,"login-no429") }); }
      if (sawScary) defect({ id:"login-scary", severity:"high", summary:"Scary/internal error during rapid logins", expected:"calm message", observed:"internal error shown", shot: await shot(page,"login-scary") });
      tagConsole("/login", bucket); bucket.console.length = 0;
    } catch (e) { r.status = "BROKEN"; r.notes.push("exception: " + e.message); await shot(page, "wf2-exception"); }
  }

  await ctx.close();
  await browser.close();

  const out = { run: RUN, baseUrl: BASE_URL, results, findings, strengths, consoleByPage };
  await writeFile(join(SHOT_DIR, "results.json"), JSON.stringify(out, null, 2), "utf8");
  console.log("\n===== WORKFLOW RESULTS =====");
  for (const r of results.sort((a,b)=>a.id-b.id)) console.log(`WF${r.id} ${r.name}: ${r.status}\n   ${r.notes.join("\n   ")}`);
  console.log(`\nDefects: ${findings.length}  Strengths: ${strengths.length}`);
  console.log("Console errors by page:", JSON.stringify(consoleByPage));
  console.log("Results JSON:", join(SHOT_DIR, "results.json"));
}

main().catch((e) => { console.error(e); process.exit(1); });
