import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SignUpForm from "./SignUpForm";

/**
 * Tripwire for CX-20260630-signup-redundant-double-headline-weak-focal-point.
 *
 * The signup header used to stack TWO near-equal headings: a persistent page
 * `<h1>Join the movement</h1>` and, below it, the per-step `<h2>` question. That
 * gave every step two competing titles and no single focal point. The fix makes
 * the step's own question the single dominant `<h1>` (the focal point) and demotes
 * the persistent brand line to a small, subordinate NON-heading eyebrow.
 *
 * These assertions fail the build if the double headline returns.
 */

function markup() {
  // Zustand's default state is step 1, so the form renders the first step's
  // question. renderToStaticMarkup gives us the server HTML to assert on.
  return renderToStaticMarkup(<SignUpForm />);
}

describe("SignUpForm header hierarchy — one dominant per-step focal point", () => {
  it("renders exactly one <h1>, and it is the step's own question", () => {
    const html = markup();
    const h1s = html.match(/<h1[^>]*>/g) ?? [];
    // Exactly one dominant heading per step — no stacked second title.
    expect(h1s.length).toBe(1);
    // The single h1 is the step's question (step 1 = "Let's get started"),
    // so the step question is the first heading a sighted member reads.
    expect(html).toMatch(/<h1[^>]*>Let&#x27;s get started<\/h1>/);
  });

  it("no longer renders the persistent title as a competing heading", () => {
    const html = markup();
    // "Join the movement" must not reappear as any heading; the brand line, if
    // present, is a subordinate non-heading eyebrow.
    expect(html).not.toMatch(/<h[1-4][^>]*>Join the movement<\/h[1-4]>/i);
    // The step question is not demoted to an h2 sitting under a larger title.
    expect(html).not.toMatch(/<h2[^>]*>Let&#x27;s get started<\/h2>/);
  });

  it("keeps the brand line present but subordinate (a labelled eyebrow, not a headline)", () => {
    const html = markup();
    // The quiet brand eyebrow is still there for context…
    expect(html).toMatch(/class="signup-brand"/);
    // …and the step indicator remains, but neither is a heading element.
    expect(html).toMatch(/class="step-indicator"/);
  });
});

/**
 * Tripwire for CX-20260703-landing-mobile-hides-sign-in-returning-user-stuck.
 *
 * The signup form used to be a one-way street: it offered no path back to
 * /login, so a returning member who reached signup (the only visible CTA on
 * mobile) was stranded. It must now carry a reciprocal cross-link to sign-in,
 * mirroring the login form's "New here? Create a profile" link.
 */
describe("SignUpForm reciprocal sign-in cross-link", () => {
  it("renders a link back to /login so a returning member can reach sign-in", () => {
    const html = markup();
    // The reciprocal route must resolve to the real /login page…
    expect(html).toContain('href="/login"');
    // …and be framed as a sign-in path for someone who already has a profile.
    expect(html).toMatch(/Already have a profile\?/);
  });
});

/**
 * Tripwire for CX-20260703-signup-wizard-ignores-reduced-motion.
 *
 * framer-motion does not honour prefers-reduced-motion on its own, so the card
 * entrance rise and the per-step horizontal slide must be gated on
 * `useReducedMotion()` — the same established pattern the sibling motion
 * surfaces (MomentGlow, JoinRequestControls, HostRequestDecision) use. jsdom
 * cannot exercise framer-motion's media-query branch reliably, so — like the
 * ethical-energy guardrail — we assert on the source that the gate is present.
 * This fails the build if the signup wizard ever animates unconditionally again.
 */
describe("SignUpForm reduced-motion parity", () => {
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "SignUpForm.tsx"),
    "utf8",
  );

  it("consults useReducedMotion from framer-motion", () => {
    expect(source).toMatch(/useReducedMotion\b[^;]*from "framer-motion"/);
    expect(source).toContain("useReducedMotion(");
  });

  it("gates its motion transition on the reduced-motion preference", () => {
    // Every framer-motion element that animates must receive the gated
    // transition, so a reduced-motion member gets an instant snap (duration 0)
    // rather than the rise / horizontal slide.
    expect(source).toMatch(/reducedMotion \? \{ duration: 0 \}/);
    const motionTags = source.match(/<motion\.div[^>]*>/g) ?? [];
    expect(motionTags.length).toBeGreaterThan(0);
    for (const tag of motionTags) {
      expect(tag).toContain("transition={snapTransition}");
    }
  });
});
