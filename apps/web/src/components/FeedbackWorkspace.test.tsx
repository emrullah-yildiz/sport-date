import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedbackConfirmation } from "./FeedbackWorkspace";

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
