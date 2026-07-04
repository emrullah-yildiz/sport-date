import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RegionInterestSignal from "./RegionInterestSignal";

/**
 * Tripwire for CX-20260704-region-honest-empty-state-and-demand-capture.
 *
 * The out-of-region discover empty state must be HONEST (pre-launch everywhere,
 * you're here early — never a fake nearby event or invented scarcity), must
 * offer a privacy-safe one-tap "notify me" demand signal for the member's area,
 * and a "how it works" link. These assertions fail the build if the honest
 * framing regresses.
 */

describe("RegionInterestSignal — honest region empty state + demand capture", () => {
  it("sets an honest pre-launch expectation naming the member's area", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Bucharest" />);
    // Honest: no games near YOUR area *yet*, you're here early — never a fake event.
    expect(html).toContain("near Bucharest yet");
    expect(html).toMatch(/here early/i);
    // Consistent with "Europe first" without claiming other regions are unsupported forever.
    expect(html).toMatch(/Europe first/i);
  });

  it("offers a one-tap demand signal for the member's area, plus host / how-it-works paths", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Cluj-Napoca" />);
    // The one-tap capture is labelled with the area (posts only the approximate area).
    expect(html).toContain("Notify me about games near Cluj-Napoca");
    // Consolidated action row: become the host, broaden, or learn how it works.
    expect(html).toContain('href="/events/new"');
    expect(html).toContain('href="/discover?near=all"');
    expect(html).toContain('href="/landing"');
    // The old redundant "Tell us where you'd play" survey link is gone from this surface.
    expect(html).not.toContain('href="/research"');
  });

  it("degrades honestly when the member has no stored area (no one-tap area claim)", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal />);
    expect(html).toContain("in your area yet");
    // With no area there is nothing to one-tap — only the host/broaden/how-it-works paths.
    expect(html).not.toMatch(/Notify me about games near/);
    expect(html).toContain('href="/landing"');
  });

  it("never invents nearby activity or scarcity (anti-dark-pattern)", () => {
    const html = renderToStaticMarkup(<RegionInterestSignal area="Berlin" />);
    // No fabricated urgency / popularity / fake events.
    expect(html).not.toMatch(/spots? left|almost full|selling fast|\d+ people near|others (are )?waiting/i);
  });
});
