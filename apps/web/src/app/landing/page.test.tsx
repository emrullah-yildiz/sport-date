import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import LandingPage from "./page";

async function render() {
  // The page is an async server component; await its element tree, then render
  // it to static markup so we can assert on the auth-aware CTAs.
  const element = await LandingPage();
  return renderToStaticMarkup(element);
}

const member = {
  id: "42",
  firstName: "Ana",
  lastName: "Pop",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LandingPage auth-awareness", () => {
  it("shows the logged-out marketing CTAs when there is no session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // Marketing sign-in / sign-up path is intact for visitors.
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Sign in");
    // No signed-in affordances leak to logged-out visitors.
    expect(html).not.toContain("Enter KeepItUp");
    expect(html).not.toContain("Signed in as");
  });

  it("marks the signed-out Sign in link so it stays reachable on mobile", async () => {
    // Tripwire for CX-20260703-landing-mobile-hides-sign-in-returning-user-stuck.
    // The signed-out "Sign in" affordance carries the .nav-signin--guest modifier
    // that the ≤700px media query keeps visible (while the signed-in greeting,
    // which shares .nav-signin, may still collapse). Losing this class would
    // re-hide the only route back to /login for a returning member on a phone.
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    expect(html).toMatch(/class="nav-signin nav-signin--guest"[^>]*href="\/login"|href="\/login"[^>]*class="nav-signin nav-signin--guest"/);
  });

  it("offers a signed-in path into the app when a session exists", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);

    const html = await render();

    // A signed-in member must reach the app in one click and see they're signed in.
    expect(html).toContain("Enter KeepItUp");
    expect(html).toContain('href="/discover"');
    expect(html).toContain("Signed in as Ana");
    // They are never shown the "Sign in" CTA that implies they were logged out.
    expect(html).not.toContain('href="/login"');
  });

  it("points the home logo at the app for signed-in members and at marketing for visitors", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const loggedOut = await render();
    expect(loggedOut).toContain('href="/landing"');

    mocks.getCurrentUser.mockResolvedValueOnce(member);
    const loggedIn = await render();
    // The brand logo must not send a returning member back to a logged-out-looking page.
    expect(loggedIn).not.toContain('href="/landing"');
  });
});

/**
 * Tripwires for CX-20260704-landing-conversion-pack (fixes 1 + 2).
 *
 * 1. The three intents (dating / friendship / community) must be stated in the
 *    HERO — a cold visitor from a dating-angled post has to confirm fit above
 *    the fold, not in body copy three screens down. Equal standing: one phrase,
 *    no intent framed as a consolation prize.
 * 2. The hero badge must read as an OPEN door. Access genuinely requires no
 *    invite, so "Private beta" (which reads as gated) must not be the badge.
 */
describe("LandingPage hero — intents above the fold and honest open badge", () => {
  it("names all three intents with equal standing inside the hero subtitle", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // The intents live in the hero subtitle itself (above the fold), before the
    // how-it-works section ever starts.
    const subtitleStart = html.indexOf('class="hero-subtitle"');
    const intents = html.indexOf("dating, friendship, or community");
    const howItWorks = html.indexOf('id="how-it-works"');
    expect(subtitleStart).toBeGreaterThan(-1);
    expect(intents).toBeGreaterThan(subtitleStart);
    expect(intents).toBeLessThan(howItWorks);
    // Equal standing framing accompanies them.
    expect(html).toContain("all equally welcome");
  });

  it("replaces the closed-door badge with honest open wording (adults-only, usable worldwide)", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    expect(html).toContain("Free beta · open to adults 18+ · usable worldwide");
    // The gated-sounding badge is gone from the hero…
    expect(html).not.toContain("Private beta · Adults only · Europe first");
    // …and no fabricated openness: the explainer disclosure stays alongside,
    // telling the same true story ("no invite is required").
    expect(html).toContain("term-explainer");
  });
});

/**
 * Tripwire for CX-20260704-worldwide-usable-europe-first-approach.
 *
 * KeepItUp is usable WORLDWIDE to organize sports events; "Europe-first" is our
 * privacy/safety/community APPROACH, not a geographic restriction. No member-visible
 * landing copy may state or imply KeepItUp is available only in Europe. Local
 * availability depends on hosts — we do not claim to operate everywhere.
 */
describe("LandingPage worldwide-usable, Europe-first-as-approach messaging", () => {
  it("states the worldwide-usable framing and drops the Europe-only phrasings", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // Worldwide-usable framing is present across the marketing surfaces.
    expect(html).toContain("usable worldwide");
    expect(html).toContain("use it worldwide to organize sports events");
    expect(html).toContain("use KeepItUp worldwide to organize sports events");
    // Owner rule (2026-07-06): "Europe-first" removed everywhere; GDPR-grade privacy for everyone.
    expect(html).not.toMatch(/Europe[- ]first/i);
    expect(html).toContain("local availability depends on hosts near you");

    // The prior "Europe-only" location-limit phrasings are gone everywhere on the page.
    expect(html).not.toContain("first events in Europe");
    expect(html).not.toContain("first events are being seeded in Europe");
    expect(html).not.toContain("seeding the first events in Europe");
    expect(html).not.toMatch(/only in Europe/i);
  });
});

describe('LandingPage "How it works" ordered sequence', () => {
  it("renders the three steps as an equal-weight 1 -> 2 -> 3 sequence, each with a number then a heading", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // Each step card renders its number (ordering cue) before its <h3> title, and
    // the three cards appear in numeric order — this is the scannable 1->2->3
    // sequence the "How it works" section exists to tell. No card is singled out
    // by markup; they share one .step-card treatment (equal visual weight).
    const stepOne = html.indexOf("STEP 01");
    const stepTwo = html.indexOf("STEP 02");
    const stepThree = html.indexOf("STEP 03");
    expect(stepOne).toBeGreaterThan(-1);
    expect(stepTwo).toBeGreaterThan(stepOne);
    expect(stepThree).toBeGreaterThan(stepTwo);

    // Within a card the number precedes the heading, and each step is an <h3>
    // (ordering carried by the number + heading, not by color alone).
    expect(html).toMatch(/STEP 01[\s\S]*?<h3>Build your profile<\/h3>/);
    expect(html).toMatch(/STEP 02[\s\S]*?<h3>Discover activities nearby<\/h3>/);
    expect(html).toMatch(/STEP 03[\s\S]*?<h3>Request a place &amp; meet<\/h3>/);

    // All three are the same non-interactive .step-card surface (no per-card
    // "selected/clickable-looking" fill class); exactly three cards render.
    expect((html.match(/class="step-card"/g) ?? []).length).toBe(3);
  });
});
