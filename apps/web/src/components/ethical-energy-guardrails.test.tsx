import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MilestoneMoment from "./MilestoneMoment";
import MomentGlow from "./MomentGlow";
import MovementArc from "./MovementArc";
import PostEventAfterglow from "./PostEventAfterglow";
import type { MemberMovementProgress } from "@/lib/progress";

/**
 * Tripwire for CX-20260702-ethical-gamified-energy-pass. The "ethical gamified
 * energy" surfaces (MomentGlow, the enriched MovementArc reflection, the
 * afterglow) must add energy from MOTION, NEON, and celebrating REAL, retrospective
 * participation — never from the manipulative mechanics the vision forbids. This
 * test fails the build if any banned mechanic re-enters the energy surface, and
 * asserts the humane properties hold (private, retrospective, reduced-motion-safe,
 * decorative-not-blocking, honest copy).
 */

const currentDir = path.dirname(fileURLToPath(import.meta.url));
function source(file: string): string {
  return readFileSync(path.resolve(currentDir, file), "utf8");
}

// The source files that make up the new/enriched energy layer.
const ENERGY_SURFACE_FILES = [
  "MomentGlow.tsx",
  "MovementArc.tsx",
  "PostEventAfterglow.tsx",
  "MilestoneMoment.tsx",
] as const;

// Words/mechanics that would signal a manipulative, casino-like energy layer.
// Matched case-insensitively as whole-ish tokens against the visible/JSX text of
// the energy surfaces. (Comments in these files openly DESCRIBE what they refuse
// to do — e.g. "no streaks" — so we scan only the code/markup, stripping comments,
// to avoid false positives on the guardrail documentation itself.)
const BANNED_MECHANICS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "streak", pattern: /\bstreaks?\b/i },
  { label: "leaderboard", pattern: /\bleaderboards?\b/i },
  // "points" (plural, the reward-currency mechanic) — not the everyday singular
  // "the whole point". Reward currencies like XP/coins/gems are always banned.
  { label: "points/XP", pattern: /\b(xp|points|coins?|gems?)\b/i },
  { label: "score/rank", pattern: /\b(scores?|ranks?|ranking|rankings?)\b/i },
  { label: "level up", pattern: /\blevel(?:\s|-)?up\b/i },
  { label: "badge/trophy", pattern: /\b(badges?|trophy|trophies|medals?)\b/i },
  { label: "attractiveness/popularity", pattern: /\b(attractiveness|popularity|hotness|most (?:popular|liked))\b/i },
  { label: "skip/like count exposed", pattern: /\b(skip count|like count|likes count|rejection count)\b/i },
  { label: "countdown/urgency", pattern: /\b(countdown|hurry|expires? (?:in|soon)|only .* left today|last chance)\b/i },
  { label: "don't lose your streak / daily login", pattern: /\b(don'?t (?:lose|break)|daily (?:login|reward)|come back tomorrow)\b/i },
];

// Prepare the code for the banned-mechanic scan. We remove the two places a
// banned WORD may legitimately appear as a PROMISE OF ITS ABSENCE rather than an
// implementation:
//   1. Comments — these files openly document what they refuse to do.
//   2. Negated disclaimer clauses in visible copy — e.g. the MovementArc footer
//      "No streaks, public scores, or points for browsing…" is honest
//      anti-manipulation copy; naming a mechanic to say we DON'T do it is the
//      opposite of a violation. We drop the clause led by a negation
//      (no/never/not/without/there is no …) up to the next clause boundary.
// Anything that survives is a banned mechanic used affirmatively — a real
// violation the tripwire should catch.
function scannableCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/\b(no|never|not|without|there (?:is|are) no)\b[^.!?;<)]*/gi, " ");
}

describe("ethical energy guardrails — no manipulative mechanics in the energy surface", () => {
  for (const file of ENERGY_SURFACE_FILES) {
    const code = scannableCode(source(file));
    for (const { label, pattern } of BANNED_MECHANICS) {
      it(`${file} contains no ${label}`, () => {
        expect(pattern.test(code)).toBe(false);
      });
    }
  }

  it("MomentGlow is decorative and non-blocking — aria-hidden, never red/urgency", () => {
    const code = source("MomentGlow.tsx");
    // Decorative: hidden from assistive tech and not a control.
    expect(code).toContain('aria-hidden');
    // Feedback signal is green (--accent) only; red is reserved for urgency.
    // (Scan with disclaimers/comments removed so the doc "never uses --warn" is ignored.)
    expect(scannableCode(code)).not.toMatch(/--warn|--danger|--coral/);
    // Honours reduced motion with a static fallback rather than motion.
    expect(code).toContain("useReducedMotion");
  });
});

const zeroProgress: MemberMovementProgress = {
  attendedMoves: 0,
  currentStage: { slug: "warm_up", label: "Warm-up", threshold: 0 },
  nextStage: { slug: "first_move", label: "First move", threshold: 1 },
  movesToNextStage: 1,
  stageProgressPercent: 0,
  hostedMoves: 0,
  joinedMoves: 0,
  recentMoves: [],
};

const activeProgress: MemberMovementProgress = {
  attendedMoves: 4,
  currentStage: { slug: "finding_rhythm", label: "Finding rhythm", threshold: 3 },
  nextStage: { slug: "in_motion", label: "In motion", threshold: 6 },
  movesToNextStage: 2,
  stageProgressPercent: 33,
  hostedMoves: 1,
  joinedMoves: 3,
  recentMoves: [
    { eventId: "e1", title: "Evening rally", sport: "Tennis", startsAt: "2026-06-01T18:00:00.000Z", role: "participant" },
  ],
};

// Pull just the celebratory reflection sentence out of the rendered arc so the
// negative assertions target the NEW copy, not the honest footer disclaimer
// (which legitimately names the banned mechanics to promise their absence).
function reflectionText(html: string): string {
  const match = html.match(/class="movement-reflection">([^<]*)</);
  return (match?.[1] ?? "").toLowerCase();
}

describe("MovementArc reflection — private, retrospective, honest about REAL meetings", () => {
  it("stays private-by-design with no public/popularity framing", () => {
    const html = renderToStaticMarkup(<MovementArc progress={activeProgress} />);
    // The honest, self-only privacy footer is preserved.
    expect(html).toContain("Private by design");
    const reflection = reflectionText(html);
    // The honest reflection describes real, already-happened games…
    expect(reflection).toContain("real games");
    // …and never frames the member against anyone else.
    expect(reflection).not.toContain("compared to");
    expect(reflection).not.toContain("out of");
    expect(reflection).not.toContain("better than");
  });

  it("celebrates only real completed counts it was given — never invents a number", () => {
    const reflection = reflectionText(renderToStaticMarkup(<MovementArc progress={activeProgress} />));
    // Given attendedMoves=4, the reflection speaks of "4 real games" and never a
    // larger, invented figure.
    expect(reflection).toContain("4 real games");
    expect(reflection).not.toContain("5 real games");
  });

  it("has an encouraging, pressure-free empty state (no target/streak)", () => {
    const reflection = reflectionText(renderToStaticMarkup(<MovementArc progress={zeroProgress} />));
    expect(reflection).toContain("your first real meeting");
    expect(reflection).not.toContain("streak");
    expect(reflection).not.toContain("don't");
  });

  it("only shows the celebratory glow once there is real activity to celebrate", () => {
    const withGlow = renderToStaticMarkup(<MovementArc progress={activeProgress} />);
    const withoutGlow = renderToStaticMarkup(<MovementArc progress={zeroProgress} />);
    expect(withGlow).toContain("moment-glow");
    expect(withoutGlow).not.toContain("moment-glow");
  });
});

describe("PostEventAfterglow — celebrates a real meeting, skippable, non-gating", () => {
  it("renders a warm ending with a clearly-optional, skippable reflection path", () => {
    const html = renderToStaticMarkup(<PostEventAfterglow isHost={false} hasReflected={false} />);
    expect(html).toContain("optional");
    expect(html).toContain("if you skip it");
    // A decorative celebration glow is present but does not gate the paths.
    expect(html).toContain("moment-glow");
    expect(html).toContain("/discover");
  });

  it("makes no unprovable safety or popularity claims", () => {
    const html = renderToStaticMarkup(<PostEventAfterglow isHost hasReflected />).toLowerCase();
    expect(html).not.toContain("verified");
    expect(html).not.toContain("no number could");
    // (host copy) still avoids scores/ranks entirely
    expect(html).not.toContain("score");
    expect(html).not.toContain("rank");
  });
});

describe("MomentGlow render", () => {
  it("renders a decorative, aria-hidden span (no text, no role)", () => {
    const html = renderToStaticMarkup(<MomentGlow tone="go" />);
    expect(html).toContain("moment-glow");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/role=/);
  });
});

describe("MilestoneMoment — humane, private, honest, non-pressuring", () => {
  it("acknowledges a REAL crossed milestone with warm host copy (first game)", () => {
    const html = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 1, hostedMoves: 0 }} firstName="Ana" />,
    );
    // The moment reflects the real first game, in host voice.
    expect(html).toContain("your first game");
    expect(html.toLowerCase()).toContain("showed up");
    // Private framing, not a scoreboard.
    expect(html).toContain("private to you");
    // Decorative celebration is present but does not gate anything.
    expect(html).toContain("moment-glow");
    // A clear opt-out control exists.
    expect(html.toLowerCase()).toContain("turn milestone moments off");
  });

  it("acknowledges first hosting as its own real, dignified moment", () => {
    const html = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 1, hostedMoves: 1 }} />,
    );
    expect(html.toLowerCase()).toContain("hosted your first game");
  });

  it("renders NOTHING when there is no real milestone (no dead-end, no nag)", () => {
    const html = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 0, hostedMoves: 0 }} />,
    );
    expect(html).toBe("");
    // And at a non-milestone count (2 games), still no moment is manufactured.
    const between = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 2, hostedMoves: 0 }} />,
    );
    expect(between).toBe("");
  });

  it("carries no banned scoreboard / pressure language in the rendered moment", () => {
    const html = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 3, hostedMoves: 0 }} />,
    ).toLowerCase();
    for (const banned of [
      "streak",
      "score",
      "rank",
      "leaderboard",
      "points",
      "badge",
      "level up",
      "don't lose",
      "keep your",
      "come back tomorrow",
      "better than",
      "compared to",
    ]) {
      expect(html).not.toContain(banned);
    }
  });

  it("is honest about which real number it reflects — never inflates the count", () => {
    // At exactly the third game, the copy speaks of the third game (real=3) and
    // never a larger, invented figure.
    const html = renderToStaticMarkup(
      <MilestoneMoment counts={{ attendedMoves: 3, hostedMoves: 0 }} />,
    ).toLowerCase();
    expect(html).toContain("third game");
    expect(html).not.toContain("fourth");
    expect(html).not.toContain("fifth");
  });

  it("reduced-motion safety rides on MomentGlow's static fallback (no bespoke motion)", () => {
    const code = source("MilestoneMoment.tsx");
    // The only celebratory motion is the shared MomentGlow (which itself honours
    // prefers-reduced-motion with a static wash) — this component adds no raw
    // framer-motion animation of its own that could bypass that.
    expect(code).toContain("MomentGlow");
    expect(code).not.toMatch(/from "framer-motion"/);
  });
});
