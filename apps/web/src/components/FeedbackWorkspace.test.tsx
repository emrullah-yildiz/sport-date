import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedbackConfirmation } from "./FeedbackWorkspace";

const source = readFileSync(fileURLToPath(new URL("./FeedbackWorkspace.tsx", import.meta.url)), "utf8");
const globalsCss = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

// Pull a single CSS rule body (`{ ... }`) for a selector out of globals.css so we
// can assert what it does — and does not — declare.
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`rule not found: ${selector}`);
  return match[1];
}

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
    // Honest acknowledgement that also points to tracking + replies (CX-20260704).
    expect(html).toContain("We&#x27;ve received this");
    expect(html).toContain("track it and see replies here");
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

// Regression target: CX-20260702-feedback-history-page-value-capitalized-distorts-member-text.
// The "What you've shared" history rendered the <dd> value cells (and the header
// spans) with `text-transform: capitalize`. The Page cell echoes the member's own
// free-text path (`/discover`), so capitalize silently rewrote their words
// (`/discover` -> `/Discover`, case-meaningful for a path); it also title-cased the
// calm sentence-case labels ("Small friction" -> "Small Friction"). The member's
// text must be shown verbatim, and controlled values must map to a proper human
// label — never a raw enum or CSS-mangled casing.
describe("feedback history renders member text and labels faithfully (no forced capitalize)", () => {
  it("does not force-capitalize the value cells that carry the member's free-text Page value", () => {
    // The Page (<dd>{ticket.currentPath}</dd>) is member-authored free text and must
    // echo back verbatim, so the shared value cell must not transform casing.
    expect(ruleBody(".feedback-ticket dd")).not.toMatch(/text-transform\s*:\s*(capitalize|uppercase|lowercase)/);
  });

  it("does not force-capitalize the category/status header labels either", () => {
    // These spans render displayLabel() output — already calm sentence-case human
    // labels — so capitalize would distort them ("An idea for improvement").
    expect(ruleBody(".feedback-ticket > header span")).not.toMatch(
      /text-transform\s*:\s*(capitalize|uppercase|lowercase)/,
    );
  });

  it("renders the member's Page value verbatim in the history (casing preserved)", () => {
    // The JSX outputs the raw currentPath into the Page cell with no transform.
    expect(source).toMatch(/<dt>Page<\/dt><dd>\{ticket\.currentPath\}<\/dd>/);
  });

  it("keeps the <dt> chrome labels' own uppercase styling on the chrome, not member content", () => {
    // The static column labels (Surface/Impact/Page/Shared) are UI chrome and may be
    // uppercased — that styling stays on the <dt>, never on the member's <dd> value.
    expect(ruleBody(".feedback-ticket dt")).toMatch(/text-transform\s*:\s*uppercase/);
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
