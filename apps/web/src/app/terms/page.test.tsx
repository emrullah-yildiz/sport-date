import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SafetyGuidelines from "@/components/SafetyGuidelines";
import PrivacyPage from "../privacy/page";
import TrustPage from "../trust/page";
import TermsPage from "./page";

/**
 * Tripwire for CX-20260706-legal-pages-still-say-private-beta.
 *
 * Standing owner rule: public copy is "open beta / early preview — free, no
 * invite, open worldwide to adults 18+" and must NEVER say "private beta" or
 * "private preview" (the landing hero was fixed under
 * CX-20260704-landing-conversion-pack; the legal pages were missed). These
 * assertions fail the build if the closed-door phrasing returns to any of the
 * public legal/trust surfaces, mirroring the Europe-first tripwires.
 */

const surfaces: Array<{ name: string; html: string }> = [
  { name: "terms", html: renderToStaticMarkup(<TermsPage />) },
  { name: "privacy", html: renderToStaticMarkup(<PrivacyPage />) },
  { name: "trust", html: renderToStaticMarkup(<TrustPage />) },
  { name: "safety guidelines", html: renderToStaticMarkup(<SafetyGuidelines />) },
];

describe("public legal/trust pages — no private-beta framing", () => {
  it.each(surfaces)("the $name page never says private beta / private preview", ({ html }) => {
    expect(html).not.toMatch(/private\s+beta/i);
    expect(html).not.toMatch(/private\s+preview/i);
    expect(html).not.toMatch(/not a generally available public service/i);
  });
});

describe("TermsPage — open-beta framing matches the landing", () => {
  const html = renderToStaticMarkup(<TermsPage />);

  it("describes the open beta the landing sold (no invite, worldwide, adults)", () => {
    expect(html).toContain("open beta");
    expect(html).toContain("no invite or payment is required");
    expect(html).toContain("worldwide");
    // Adults-only stays stated plainly.
    expect(html).toContain("Members must be 18 or older.");
  });

  it("keeps the genuinely-true preview limits without the closed-door wording", () => {
    // Honest early-product boundaries remain: legal review pending, product unfinished.
    expect(html).toContain("until launch-country legal review is complete");
    expect(html).toContain("It is still an early product, not a finished service.");
    expect(html).toContain("Open beta boundaries");
  });
});
