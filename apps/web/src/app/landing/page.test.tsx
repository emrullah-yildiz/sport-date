import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import LandingExperience from "@/components/landing/LandingExperience";
import ClickTracking from "@/components/ClickTracking";
import ConceptPage from "../concept/page";
import LandingPage from "./page";

async function render() {
  return renderToStaticMarkup(await LandingPage());
}

const member = {
  id: "private-member-id",
  firstName: "Ana",
  lastName: "private-family-name",
  email: "private-person@example.invalid",
  location: "private-profile-area",
  sexualOrientation: "private-orientation",
};

function experienceProps(node: ReactNode, component: unknown = LandingExperience): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (child.type === component) return child.props;
    const nested = experienceProps(child.props.children as ReactNode, component);
    if (nested) return nested;
  }
}

beforeEach(() => { vi.clearAllMocks(); });

describe("LandingPage auth-awareness", () => {
  it("keeps sign-in and clearly named registration available to visitors", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    expect(html).toMatch(/<a\b[^>]*href="\/login"[^>]*>Sign in<\/a>/);
    expect(html).toMatch(/<a\b[^>]*href="\/signup"[^>]*>[\s\S]*?Create/);
    expect(html).not.toContain("Enter KeepItUp");
    expect(html).not.toContain("Signed in as");
  });

  it("keeps a sign-in link inside the mobile-visible header", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    expect(header).toBeDefined();
    expect(header).toMatch(/<a\b[^>]*href="\/login"[^>]*>Sign in<\/a>/);
    // The old regression hid returning members' only login link at mobile widths.
    // The new module must not reintroduce hiding for the dedicated sign-in class.
    const css = readFileSync(fileURLToPath(new URL("../../components/landing/landing.module.css", import.meta.url)), "utf8");
    expect(css).not.toMatch(/\.signIn\s*\{[^}]*display\s*:\s*none/);
  });

  it("offers a signed-in path and never sends members back through registration", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    const html = await render();
    expect(html).toContain("Enter KeepItUp");
    expect(html).toContain('href="/discover"');
    expect(html).toContain("Signed in as Ana");
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/signup"');
  });

  it("points the labelled home logo at discovery for members and landing for visitors", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const guest = await render();
    const guestLogo = guest.match(/<a\b[^>]*aria-label="KeepItUp home"[^>]*>/)?.[0];
    expect(guestLogo).toContain('href="/landing"');
    mocks.getCurrentUser.mockResolvedValueOnce(member);
    const signedIn = await render();
    const memberLogo = signedIn.match(/<a\b[^>]*aria-label="KeepItUp home"[^>]*>/)?.[0];
    expect(memberLogo).toContain('href="/discover"');
  });

  it("sends only the display name across the client component boundary", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    const props = experienceProps(await LandingPage());
    expect(props).toBeDefined();
    expect(props?.memberName).toBe("Ana");
    expect(Object.keys(props ?? {}).filter(key => key !== "preview")).toEqual(["memberName"]);
    expect(props?.preview).not.toBe(true);
    const serialized = JSON.stringify(props);
    for (const value of Object.values(member).filter(value => value !== "Ana")) {
      expect(serialized).not.toContain(value);
    }
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(experienceProps(await LandingPage())?.memberName).toBeNull();
  });
});

describe("LandingPage clear and truthful product explanation", () => {
  it("counts only main landing loads without attaching session or demo choices", async () => {
    for (const user of [null, member]) {
      mocks.getCurrentUser.mockResolvedValue(user);
      expect(experienceProps(await LandingPage(), ClickTracking)).toEqual({ pageEvent: "landing_viewed" });
    }
    expect(experienceProps(ConceptPage(), ClickTracking)).toBeUndefined();
  });

  it("puts dating, friendship and group connection together in the hero", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    const hero = html.match(/<section\b[^>]*aria-labelledby="hero-heading"[\s\S]*?<\/section>/)?.[0];
    expect(hero).toBeDefined();
    expect(hero).toContain("dating, friendship, or a new crew");
    expect(hero).toContain("local sports activities");
  });

  it("states open adult worldwide access with an accessible beta disclosure and local-supply caveat", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    expect(html).toMatch(/Free beta[^<]*open to adults 18\+/i);
    expect(html).toContain("18+");
    expect(html).toMatch(/worldwide/i);
    expect(html).toMatch(/local availability depends on hosts near you/i);
    expect(html).toContain("term-explainer");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toMatch(/private beta|invite-only|only in Europe|Europe[- ]first/i);
    expect(html).not.toMatch(/first events (?:are being |are )?seeded in Europe/i);
  });

  it("keeps tutorials closed until an explicit action without an always-visible imitation flow", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain("See how it works");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("EXAMPLE ACTIVITY");
    expect(html).not.toMatch(/Fictional host|INTERACTIVE DEMO|fake|<dialog|join-introduction|section-invitation/);
    expect(html).not.toContain("DESIGN PREVIEW");
  });

  it("offers hosting and joining on demand and connects discovery to free time", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    const how = html.match(/<section\b[^>]*id="how-it-works"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(how).toContain("the day you have free");
    expect(how).toContain("Join a plan or host your own");
    expect(how).not.toContain("<article");
    expect(html).toContain("Turn your free time into a plan");
  });

  it("preserves legal, safety, research and feedback destinations", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    for (const path of ["/trust", "/terms", "/privacy", "/safety", "/research", "/feedback"]) {
      expect(html).toMatch(new RegExp(`href="${path}(?:#[^"]*)?"`));
    }
    expect(html).toContain('data-track="landing_cta_join"');
    expect(html).toContain('data-track="landing_cta_survey"');
  });
});
