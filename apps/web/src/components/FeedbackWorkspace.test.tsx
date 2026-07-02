import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedbackConfirmation } from "./FeedbackWorkspace";

const source = readFileSync(fileURLToPath(new URL("./FeedbackWorkspace.tsx", import.meta.url)), "utf8");

// The container (FeedbackWorkspace) fetches on mount and only renders the
// confirmation after a successful submit, neither of which renderToStaticMarkup
// runs. So the success moment is asserted directly through the presentational
// FeedbackConfirmation — the exact JSX the container mounts on success — which is
// where all the acceptance-criteria markup lives (focusable heading, polite live
// region, forward path). Focus movement itself is driven by the container's
// attachConfirmation callback ref and is exercised live.

const POLITE_LIVE_REGION = /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/;
const FOCUSABLE_HEADING = /<h3[^>]*tabindex="-1"/i;

function render() {
  return renderToStaticMarkup(<FeedbackConfirmation />);
}

describe("FeedbackConfirmation success state", () => {
  it("announces the calm result once inside a polite live region", () => {
    const html = render();
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toContain("your feedback is with the team");
  });

  it("makes the confirmation heading a keyboard focus target so focus can move to it on submit", () => {
    // The heading carries tabindex=-1 so the container's callback ref can move
    // focus here — a keyboard / screen-reader member is never dumped to <body>.
    expect(render()).toMatch(FOCUSABLE_HEADING);
  });

  it("tells the member their feedback is now visible in what you've shared", () => {
    expect(render()).toMatch(/What you(&#x27;|')ve shared/);
  });

  it("offers a forward path: view it in the history and back to profile", () => {
    const html = render();
    // Anchor into the history landmark, so the pointer to the tracking view no
    // longer lives only in the vanished empty state.
    expect(html).toContain('href="#feedback-history-title"');
    // A clean way to move on.
    expect(html).toContain('href="/profile"');
  });

  it("stays dignified — no gamification of feedback volume", () => {
    const html = render();
    expect(html).not.toMatch(/streak|score|points|badge|you(&#x27;|')ve submitted \d|keep it up|again/i);
  });
});

// Regression target: CX-20260702-feedback-see-it-link-no-focus-move-to-history.
// Activating "See it in what you've shared" scrolls the history into view but the
// in-page anchor left keyboard/AT focus on <body> because the destination heading
// had no tabindex. Focus movement is driven by the container (a callback focuses
// the history heading on the link's onClick), so — exactly like EditProfileForm —
// it is asserted with source tripwires that fail the build if the wiring regresses.
describe("FeedbackConfirmation forward path moves focus to the history heading (not <body>)", () => {
  it("wires the 'see it' link to an activation handler so it can move focus", () => {
    // The presentational link forwards onSeeHistory to the anchor's onClick; when
    // absent (e.g. the static markup test above) nothing changes and no focus is
    // stolen. When the container passes focusHistoryHeading, activation moves focus.
    expect(source).toMatch(/onSeeHistory\?\s*:\s*\(\)\s*=>\s*void/);
    expect(source).toMatch(/onClick=\{onSeeHistory\}/);
    expect(source).toContain("onSeeHistory={focusHistoryHeading}");
  });

  it("makes the '#feedback-history-title' heading a keyboard focus target", () => {
    // Without tabIndex the anchor scrolls the heading into view but focus falls to
    // <body>. tabIndex={-1} on the destination heading is what lets focus land here.
    expect(source).toMatch(/id="feedback-history-title"[^>]*tabIndex=\{-1\}/);
  });

  it("moves focus to the history heading on activation, landing at the named destination", () => {
    // focusHistoryHeading focuses the heading ref — so a keyboard / screen-reader
    // member is read the destination, not dumped to the top of the document. Focus,
    // not scroll animation, conveys arrival (reduced-motion parity).
    expect(source).toMatch(/function focusHistoryHeading\(\)\s*\{[\s\S]*?historyHeadingRef\.current\?\.focus\(\)/);
  });

  it("only moves focus on explicit activation — ordinary renders never steal focus", () => {
    // focusHistoryHeading runs solely from the link's onClick; there is no effect
    // or render-time call that would focus the heading on a plain re-render.
    expect(source).not.toMatch(/useEffect\([^)]*historyHeadingRef/);
  });
});
