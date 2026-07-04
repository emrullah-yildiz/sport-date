import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RegionInterestSignal from "./RegionInterestSignal";

/**
 * Tripwire for CX-20260704-region-honest-empty-state-and-demand-capture.
 *
 * The out-of-region discover empty state must be HONEST (pre-launch everywhere,
 * you're here early — never a fake nearby event or invented scarcity), must
 * offer a privacy-safe "tell us where you'd play" path, and a "how it works"
 * link. These assertions fail the build if the honest framing regresses.
 */

describe("RegionInterestSignal — honest region empty state + demand capture", () => {
  it("sets an honest pre-launch expectation naming the member's area", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Bucharest" />);
    // Honest: not live near YOUR area *yet* — never a promise it is live, never a fake event.
    expect(html).toContain("isn&#x27;t live near Bucharest yet");
    expect(html).toMatch(/here early/i);
    // Consistent with "Europe first" without claiming other regions are unsupported forever.
    expect(html).toMatch(/Europe first/i);
  });

  it("offers a one-tap demand signal for the member's area and a how-it-works link", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Cluj-Napoca" />);
    // The one-tap capture is labelled with the area (posts only the approximate area).
    expect(html).toContain("Tell us you&#x27;d play near Cluj-Napoca");
    // The richer survey path and the how-it-works link are both present.
    expect(html).toContain('href="/research"');
    expect(html).toContain('href="/landing"');
  });

  it("degrades honestly when the member has no stored area (no one-tap area claim)", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal />);
    expect(html).toContain("isn&#x27;t live in many places yet");
    // With no area there is nothing to one-tap — only the survey/how-it-works paths.
    expect(html).not.toMatch(/Tell us you&#x27;d play near/);
    expect(html).toContain('href="/research"');
  });

  it("never invents nearby activity or scarcity (anti-dark-pattern)", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Berlin" />);
    // No fabricated urgency / popularity / fake events.
    expect(html).not.toMatch(/spots? left|almost full|selling fast|\d+ people near|others (are )?waiting/i);
  });
});
