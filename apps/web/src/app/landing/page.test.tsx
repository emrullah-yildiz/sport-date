import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import LandingExperience from "@/components/landing/LandingExperience";
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

function experienceProps(node: ReactNode): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (child.type === LandingExperience) return child.props;
    const nested = experienceProps(child.props.children as ReactNode);
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
  it("puts dating, friendship and group connection together in the hero", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    const hero = html.match(/<section\b[^>]*aria-labelledby="hero-heading"[\s\S]*?<\/section>/)?.[0];
    expect(hero).toBeDefined();
    expect(hero).toContain("dating, friendship, or a new crew");
    expect(hero).toContain("small local sports activities");
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

  it("labels example supply and keeps the demo distinct from a real request", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain("EXAMPLE ACTIVITY");
    expect(html).toContain("Fictional host");
    expect(html).toMatch(/nothing (?:you choose here )?is sent or saved/i);
    expect(html).toContain("Explore this example");
    expect(html).not.toContain("Near you this week");
    expect(html).not.toContain("DESIGN PREVIEW");
  });

  it("explains choosing, host approval and accepted meeting details in order", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const html = await render();
    const how = html.match(/<section\b[^>]*id="how-it-works"[\s\S]*?<\/section>/)?.[0] ?? "";
    const steps = [...how.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match => match[0]);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatch(/01<\/span><h3>Pick your kind of fun\./);
    expect(steps[1]).toMatch(/02<\/span><h3>Ask to join a small group\./);
    expect(steps[1]).toContain("host reviews");
    expect(steps[2]).toMatch(/03<\/span><h3>Get the details\. Show up\./);
    expect(steps[2]).toContain("Once accepted");
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
