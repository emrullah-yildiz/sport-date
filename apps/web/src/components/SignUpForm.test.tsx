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
