import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SafetyCenterError from "./error";

// The scoped `/safety` error boundary must degrade gracefully IN the segment:
// keep the emergency reminder + core guidance reachable, offer a retry, and
// never leak internal error detail. We render the boundary with a deliberately
// sensitive error and assert the member-facing markup. renderToStaticMarkup does
// not run effects, so the `console.error(error)` never fires and nothing from
// `error` reaches the output.
function render() {
  const secret = new Error("column safety_cases.deleted_at does not exist") as Error & {
    digest?: string;
  };
  secret.digest = "3141592653";
  return renderToStaticMarkup(
    <SafetyCenterError error={secret} unstable_retry={() => {}} />,
  );
}

describe("SafetyCenterError", () => {
  it("re-states the emergency-services reminder even when the case query failed", () => {
    const html = render();
    expect(html).toContain("contact local emergency services");
  });

  it("keeps the core safety guidance reachable in-segment", () => {
    const html = render();
    // The static SafetyGuidelines block (and its #guidelines anchor) render.
    expect(html).toContain("How safety works here");
    expect(html).toMatch(/id="guidelines"/);
    expect(html).toMatch(/href="#guidelines"/);
  });

  it("offers a Try again retry and states the failure is on our side", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
    expect(html).toContain("problem on our side");
  });

  it("uses an assertive alert region for the failure notice", () => {
    const html = render();
    expect(html).toMatch(/role="alert"/);
  });

  it("does NOT leak the error message, digest, SQL, or column name", () => {
    const html = render();
    expect(html).not.toContain("does not exist");
    expect(html).not.toContain("safety_cases");
    expect(html).not.toContain("3141592653");
    expect(html).not.toMatch(/digest/i);
    expect(html).not.toMatch(/stack|NeonDbError|DatabaseNotConfigured/i);
  });
});
