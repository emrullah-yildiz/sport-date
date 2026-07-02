import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

  it("renders block-level markup (<div> wrapping a <ul>), so it must never be nested in a <p>", () => {
    const html = renderPanel();
    // The panel is intentionally block-level (a semantic list of facts). Because a <p>
    // may not contain <div>/<ul>, any render site that embeds the explainer MUST use a
    // non-<p> block wrapper (see the render-site regression test below).
    expect(html).toMatch(/^<div[^>]*class="term-explainer-panel"/);
    expect(html).toContain('<ul class="term-explainer-points">');
  });
});

// Regression guard for CX-20260702: opening the panel injected <div>/<ul> into a <p>,
// firing "In HTML, <div> cannot be a descendant of <p>" hydration/nesting errors. Every
// surface that embeds BetaTermExplainer must wrap it in a non-<p> block element so the
// block-level panel is valid HTML. This asserts the source of each render site directly.
describe("BetaTermExplainer render sites (valid DOM nesting)", () => {
  const RENDER_SITES: readonly { file: string; wrapperClass: string }[] = [
    { file: "../app/landing/page.tsx", wrapperClass: "microcopy" },
    { file: "./LoginForm.tsx", wrapperClass: "auth-switch" },
    { file: "../app/profile/page.tsx", wrapperClass: "eyebrow eyebrow-with-explainer" },
  ];

  for (const { file, wrapperClass } of RENDER_SITES) {
    it(`wraps the explainer in a non-<p> block in ${file}`, () => {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      // The explainer must be present at this site…
      expect(source).toContain("BetaTermExplainer");
      // …and the element that *contains* it (opening tag with this wrapper class,
      // through to <BetaTermExplainer) must be a <div>, not a <p>. A <p> would make the
      // block-level panel invalid HTML. We match the wrapper open tag immediately
      // preceding the explainer so unrelated <p className="microcopy"> siblings (e.g.
      // the signed-in variant, which does not host the explainer) are not falsely caught.
      // Look at the source up to the explainer and take the LAST wrapper open tag with
      // this class before it — that is the element that hosts the explainer. Unrelated
      // siblings (e.g. the signed-in <p className="microcopy"> with no explainer) sit
      // after the explainer in the source, so they never win this "last before" match.
      const upToExplainer = source.slice(0, source.indexOf("<BetaTermExplainer"));
      const wrapperTags = [
        ...upToExplainer.matchAll(new RegExp(`<(\\w+) className="${wrapperClass}[^"]*"`, "g")),
      ];
      const hostTag = wrapperTags.at(-1);
      expect(hostTag, `expected a wrapper hosting BetaTermExplainer in ${file}`).toBeDefined();
      // The host element must be a <div> (block-valid), never a <p> (would make the
      // block-level explainer panel invalid HTML — the CX-20260702 nesting bug).
      expect(hostTag?.[1]).toBe("div");
    });
  }
});
