import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BetaTermExplainer, {
  BetaTermPanel,
  PRIVATE_BETA_LABEL,
  PRIVATE_BETA_POINTS,
} from "./BetaTermExplainer";

// The open/closed state is toggled by a click renderToStaticMarkup never runs, so the
// trigger is asserted in its initial (collapsed) disclosure state, and the explanation
// content is asserted directly through the presentational BetaTermPanel (the exact JSX
// the container renders when open).

function renderTrigger(label?: string) {
  return renderToStaticMarkup(<BetaTermExplainer label={label} />);
}

function renderPanel() {
  return renderToStaticMarkup(
    <BetaTermPanel
      panelId="term-test"
      title={PRIVATE_BETA_LABEL}
      points={PRIVATE_BETA_POINTS}
      onClose={() => {}}
    />,
  );
}

describe("BetaTermExplainer trigger", () => {
  it("is a real button with a collapsed disclosure contract (not hover-only)", () => {
    const html = renderTrigger();
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toMatch(/aria-controls="/);
  });

  it("names the term so screen readers announce what the button reveals", () => {
    expect(renderTrigger()).toContain(PRIVATE_BETA_LABEL);
  });

  it("supports a custom label so the pattern is reusable for other rare terms", () => {
    expect(renderTrigger("What is XP?")).toContain("What is XP?");
  });

  it("keeps the explanation collapsed (no panel/points) until opened", () => {
    const html = renderTrigger();
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain(PRIVATE_BETA_POINTS[0]);
  });
});

describe("BetaTermExplainer panel", () => {
  it("is a labelled group exposing every plain-language point plus a dismiss control", () => {
    const html = renderPanel();
    expect(html).toContain('role="group"');
    expect(html).toContain(`aria-label="${PRIVATE_BETA_LABEL}"`);
    for (const point of PRIVATE_BETA_POINTS) {
      expect(html).toContain(point);
    }
    expect(html).toMatch(/data-term-close/);
  });

  it("states only true, non-alarming preview facts (adults/Europe, free, open access)", () => {
    const joined = PRIVATE_BETA_POINTS.join(" ");
    expect(joined).toMatch(/adults/i);
    expect(joined).toMatch(/Europe/i);
    expect(joined).toMatch(/free/i);
    // Access is open today — the copy must say so and must NOT claim invite-only.
    expect(joined).toMatch(/no invite is required/i);
    expect(joined).not.toMatch(/invite-only/i);
    // No unproven safety/verification/identity claims in the explanation.
    expect(joined).not.toMatch(/verified|verification|guarantee|safe/i);
  });
});
