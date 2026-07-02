// Pure, framework-free detection of a HUMANE "milestone moment"
// (CX-20260701-humane-milestone-moments).
//
// A milestone is a warm, honest acknowledgement that a member reached a REAL,
// dignified point in their own real participation — "your first game", "your
// third game", "your first time hosting". It is deliberately NOT a scoreboard:
//
//  - It is a pure function of the member's ALREADY-EARNED real counts (attended,
//    hosted, joined) — the same qualified-attendance data that drives the
//    Movement Arc. It invents nothing; if the counts are 0, there is no moment.
//  - It exposes NO streak, score, rank, points, level, badge, leaderboard,
//    popularity, or comparison to anyone else. The copy speaks only to the
//    member, about the real thing that already happened, in a warm host voice.
//  - It never nags toward a "next" target and never frames anything as something
//    to lose. It is a reflection, not a quest.
//
// Because milestones are derived purely from existing counts, there is no new
// tracked behavior, no new column, and nothing that rewards time-in-app.

export const MILESTONE_KINDS = [
  "first_game",
  "third_game",
  "first_hosting",
] as const;

export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export type Milestone = Readonly<{
  kind: MilestoneKind;
  /** Warm, host-toned, PRIVATE acknowledgement. States only what really happened. */
  title: string;
  /** A calm one-line reflection — never a target, never a comparison. */
  body: string;
  /**
   * The single real count this milestone reflects (e.g. 1 for the first game,
   * 3 for the third, 1 for the first hosting). Carried so the UI/tests can prove
   * the moment is built from a REAL number the member actually reached — never a
   * fabricated or inflated figure.
   */
  realCount: number;
}>;

export type MilestoneCounts = Readonly<{
  /** Qualified self-confirmed attended moves (hosted + joined). */
  attendedMoves: number;
  /** Of those, the ones the member hosted. */
  hostedMoves: number;
}>;

/**
 * Detect the single most meaningful milestone the member is CURRENTLY at, or
 * `null` if none applies. "Currently at" means the exact real count equals a
 * milestone threshold — so the acknowledgement reflects the real moment the
 * member reached, not a permanent trophy and not a fabricated number.
 *
 * Selection is deterministic and honest:
 *  - Only real, non-negative integer counts count; anything else → no milestone.
 *  - Hosting is acknowledged the first time the member has hosted at all
 *    (hostedMoves === 1), independent of the attended total.
 *  - Otherwise the attended count is acknowledged at its first (1) and third (3)
 *    real game. We keep the set small and honest (per the ticket) rather than
 *    manufacturing a milestone at every number.
 *
 * The order of preference when more than one could apply: a first-ever hosting
 * is the most personal, so it wins; then the exact attended count. There is no
 * stacking, no "combo", no escalation — at most one calm moment.
 */
export function detectMilestone(counts: MilestoneCounts): Milestone | null {
  const attended = normalizeCount(counts.attendedMoves);
  const hosted = normalizeCount(counts.hostedMoves);

  // First time hosting — a real, specific, dignified moment. Acknowledged the
  // first time the member has hosted a completed, attended game.
  if (hosted === 1) {
    return {
      kind: "first_hosting",
      title: "You hosted your first game.",
      body: "People showed up because you made the plan real. That takes something — glad you did it.",
      realCount: 1,
    };
  }

  if (attended === 1) {
    return {
      kind: "first_game",
      title: "That was your first game.",
      body: "You showed up and moved with people. That's the whole thing — glad you're here.",
      realCount: 1,
    };
  }

  if (attended === 3) {
    return {
      kind: "third_game",
      title: "That's your third game.",
      body: "Three real games, three times you actually showed up. Quietly, that adds up to something good.",
      realCount: 3,
    };
  }

  return null;
}

/** Only a real, non-negative whole count is meaningful; everything else → 0. */
function normalizeCount(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}
