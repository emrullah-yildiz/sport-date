import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import WarmUpGame from "./WarmUpGame";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

describe("WarmUpGame — self-contained, optional, points outward", () => {
  it("renders a playable idle surface: title, instruction, and a real start button", () => {
    const html = renderToStaticMarkup(<WarmUpGame />);
    // The warm-up is clearly optional and self-explanatory.
    expect(html).toContain("Warm-up · optional");
    expect(html).toContain("How many taps in 5 seconds?");
    // A real, focusable control to begin — this static markup IS the reduced-motion
    // / no-JS-motion fallback: the whole game is plain, focusable HTML.
    expect(html).toMatch(/<button[^>]*>Start warm-up<\/button>/);
    // The polite live region exists but is silent until there's an outcome.
    expect(html).toContain('role="status"');
  });

  it("always exposes an OUTWARD call to action (never traps the player)", () => {
    const html = renderToStaticMarkup(<WarmUpGame ctaHref="/discover" ctaLabel="Find a game near you" />);
    // The outward link is present even before playing — the game gates nothing.
    expect(html).toContain('href="/discover"');
    expect(html.toLowerCase()).toContain("find a game near you");
  });

  it("defaults the outward CTA to sign-up for logged-out visitors", () => {
    const html = renderToStaticMarkup(<WarmUpGame />);
    expect(html).toContain('href="/signup"');
  });

  it("carries no retention/dark-pattern mechanics in its source", () => {
    // Anti-dark-pattern is a durable guardrail: the game must not introduce a
    // streak, high-score, leaderboard, or daily-return loop. Scan the source with
    // comments stripped (the file openly DESCRIBES what it refuses to do).
    const source = readFileSync(path.resolve(currentDir, "WarmUpGame.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
      .replace(/\b(no|never|not|without)\b[^.!?;<)]*/gi, " ");
    for (const banned of [/\bstreaks?\b/i, /\bleaderboards?\b/i, /\bhigh[- ]?score\b/i, /come back tomorrow/i, /daily (?:login|reward)/i]) {
      expect(banned.test(source)).toBe(false);
    }
  });
});
