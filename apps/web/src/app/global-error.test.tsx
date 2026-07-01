import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlobalErrorFallback } from "./global-error";

// global-error replaces the root layout, so the fallback must render its own
// html/body and stay self-contained. We render the presentational fallback
// (the exact JSX the boundary shows) with renderToStaticMarkup — no DOM needed —
// and assert it is calm, branded, recoverable, and leaks nothing internal.
function render() {
  return renderToStaticMarkup(<GlobalErrorFallback />);
}

describe("GlobalErrorFallback", () => {
  it("renders its own html and body (it replaces the root layout)", () => {
    const html = render();
    expect(html).toMatch(/^<html[^>]*lang="en"/);
    expect(html).toMatch(/<body/);
  });

  it("shows the Rally wordmark and calm, honest reassurance copy", () => {
    const html = render();
    expect(html).toContain("Rally");
    expect(html).toContain("Something went wrong on our end");
    expect(html).toContain("Your account is safe");
    // Honest: no false "we've been notified" / manufactured urgency.
    expect(html).not.toMatch(/we(&#x27;|')ve been notified|notified the team/i);
    expect(html).not.toMatch(/hurry|act now|last chance/i);
  });

  it("offers a recovery affordance: a Try again action and a link to a surviving page", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
    expect(html).toMatch(/href="\/login"/);
  });

  it("uses an assertive alert region and a focusable heading", () => {
    const html = render();
    expect(html).toMatch(/role="alert"/);
    expect(html).toMatch(/<h1[^>]*tabindex="-1"/i);
    expect(html).toMatch(/role="main"/);
  });

  it("meets 44px touch targets on the recovery controls", () => {
    const html = render();
    // Both the button and the link carry an explicit min-height of 44px.
    const matches = html.match(/min-height:44px/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT leak any internal error text, stack, digest, SQL, or column name", () => {
    // The presentational fallback receives no error prop at all — proving the
    // member-facing surface cannot render error internals.
    const html = render();
    expect(html).not.toMatch(/digest/i);
    expect(html).not.toMatch(/stack|at Object\.|\.tsx:\d+/i);
    expect(html).not.toMatch(/column .* does not exist|NeonDbError|DatabaseNotConfigured/i);
    expect(html).not.toMatch(/statusCode/i);
  });
});
