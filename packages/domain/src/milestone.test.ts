import { describe, expect, it } from "vitest";

import { detectMilestone, MILESTONE_KINDS, type Milestone } from "./milestone";

/**
 * Tripwire + behavior tests for the HUMANE milestone moment
 * (CX-20260701-humane-milestone-moments).
 *
 * A milestone must be an honest reflection of REAL, already-earned participation
 * and must NEVER carry a manipulative mechanic. These tests pin both properties:
 * the number is real (never fabricated/inflated), and no banned language ever
 * appears in the acknowledgement copy.
 */

// Language that would signal a scoreboard / pressure mechanic. Matched against
// the visible milestone copy (title + body).
const BANNED_LANGUAGE: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "streak", pattern: /\bstreaks?\b/i },
  { label: "score/rank", pattern: /\b(scores?|ranks?|ranking|rankings?)\b/i },
  { label: "points/XP", pattern: /\b(xp|points|coins?|gems?)\b/i },
  { label: "leaderboard", pattern: /\bleaderboards?\b/i },
  { label: "level up", pattern: /\blevel(?:\s|-)?up\b/i },
  { label: "badge/trophy", pattern: /\b(badges?|trophy|trophies|medals?)\b/i },
  { label: "popularity/attractiveness", pattern: /\b(popularity|attractiveness|hotness|most (?:popular|liked))\b/i },
  { label: "loss aversion / don't lose", pattern: /\b(don'?t (?:lose|break)|keep your|lose your|before it's gone)\b/i },
  { label: "fake urgency", pattern: /\b(hurry|last chance|expires?|countdown|only .* left)\b/i },
  { label: "comparison to others", pattern: /\b(better than|compared to|ahead of|out of \d|vs\.?)\b/i },
  { label: "daily login / come back", pattern: /\b(daily (?:login|reward)|come back tomorrow|log ?in streak)\b/i },
];

function copyOf(m: Milestone): string {
  return `${m.title} ${m.body}`;
}

// The set of milestones the detector can ever emit, driven by real counts.
const ALL_MILESTONES: Milestone[] = [
  detectMilestone({ attendedMoves: 1, hostedMoves: 0 })!, // first game
  detectMilestone({ attendedMoves: 3, hostedMoves: 0 })!, // third game
  detectMilestone({ attendedMoves: 1, hostedMoves: 1 })!, // first hosting
];

describe("humane milestone — honest, derived only from real participation", () => {
  it("emits nothing when there is no real participation", () => {
    expect(detectMilestone({ attendedMoves: 0, hostedMoves: 0 })).toBeNull();
  });

  it("acknowledges the first real game at exactly one attended move", () => {
    const m = detectMilestone({ attendedMoves: 1, hostedMoves: 0 });
    expect(m?.kind).toBe("first_game");
    expect(m?.realCount).toBe(1);
  });

  it("acknowledges the third real game at exactly three attended moves", () => {
    const m = detectMilestone({ attendedMoves: 3, hostedMoves: 0 });
    expect(m?.kind).toBe("third_game");
    expect(m?.realCount).toBe(3);
  });

  it("acknowledges the first hosting the first time the member has hosted", () => {
    const m = detectMilestone({ attendedMoves: 1, hostedMoves: 1 });
    expect(m?.kind).toBe("first_hosting");
    expect(m?.realCount).toBe(1);
  });

  it("never fabricates or inflates a number — realCount is a count actually reached", () => {
    // For every count 0..12, any milestone emitted reflects a realCount that is
    // <= the real attended total (or, for hosting, <= the real hosted total).
    for (let attended = 0; attended <= 12; attended += 1) {
      for (let hosted = 0; hosted <= attended; hosted += 1) {
        const m = detectMilestone({ attendedMoves: attended, hostedMoves: hosted });
        if (!m) continue;
        if (m.kind === "first_hosting") {
          expect(m.realCount).toBeLessThanOrEqual(hosted);
        } else {
          expect(m.realCount).toBeLessThanOrEqual(attended);
        }
        // The reflected number is a positive whole number the member reached.
        expect(Number.isInteger(m.realCount)).toBe(true);
        expect(m.realCount).toBeGreaterThan(0);
      }
    }
  });

  it("treats fractional / negative / NaN / infinite counts as no milestone", () => {
    expect(detectMilestone({ attendedMoves: 1.5, hostedMoves: 0 })).toBeNull();
    expect(detectMilestone({ attendedMoves: -3, hostedMoves: 0 })).toBeNull();
    expect(detectMilestone({ attendedMoves: Number.NaN, hostedMoves: 0 })).toBeNull();
    expect(detectMilestone({ attendedMoves: Number.POSITIVE_INFINITY, hostedMoves: 0 })).toBeNull();
  });

  it("emits at most one calm moment — no stacking / combo / escalation", () => {
    // A member at their third game who is also hosting for the first time gets a
    // single moment (the most personal one), never two piled together.
    const m = detectMilestone({ attendedMoves: 3, hostedMoves: 1 });
    expect(m).not.toBeNull();
    expect(MILESTONE_KINDS).toContain(m!.kind);
  });
});

describe("humane milestone — no banned scoreboard / pressure mechanic in copy", () => {
  for (const m of ALL_MILESTONES) {
    const text = copyOf(m);
    for (const { label, pattern } of BANNED_LANGUAGE) {
      it(`${m.kind} copy contains no ${label}`, () => {
        expect(pattern.test(text)).toBe(false);
      });
    }

    it(`${m.kind} copy is warm, honest, and self-directed (no comparison, no target nag)`, () => {
      const lower = copyOf(m).toLowerCase();
      // Speaks TO the member about a real thing, not a future quest.
      expect(lower).not.toContain("next milestone");
      expect(lower).not.toContain("keep going to unlock");
      expect(lower).not.toContain("unlock");
      // Honest: no unprovable claims.
      expect(lower).not.toContain("verified");
      expect(lower).not.toContain("guaranteed");
    });
  }
});
