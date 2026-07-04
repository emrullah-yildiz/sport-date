// Pure, framework-free logic for the landing WARM-UP micro-game
// (CX-20260704-interactive-sporty-experience-microgames).
//
// Brand line (non-negotiable): this is delight that points people OUTWARD to go
// DO the sport — never a retention trap. So the logic here is deliberately thin
// and honest:
//  - A fixed, short round (5 seconds). No "just one more", no escalating levels,
//    no daily target, no streak, no score that persists between visits.
//  - The result is an instant, warm, non-comparative reaction to what the player
//    just did in this single round. It is not saved, ranked, or shown to anyone.
//  - Every result funnels to the SAME calm outward CTA ("find a game near you") —
//    the game's only job is to make someone smile and then leave to play for real.
//
// The module is written as a small mode registry so a second warm-up mode (a
// tennis-serve timing/reaction round) can be added next WITHOUT changing the
// component: add a descriptor + a `resultFor…` reducer and the UI can offer it.

/** How long a single tap round lasts. Short by design — a warm-up, not a grind. */
export const WARMUP_DURATION_MS = 5_000;

/** Interval the running clock ticks at (display only; the end is time-based). */
export const WARMUP_TICK_MS = 100;

export type WarmUpResult = Readonly<{
  /** Decorative reaction emoji (aria-hidden in the UI — the words carry meaning). */
  emoji: string;
  /** Warm, playful, NON-comparative one-liner about this single round. */
  headline: string;
  /** A calm line that always points OUTWARD, toward a real game. */
  blurb: string;
}>;

/**
 * Tap-round result tiers, ascending by `minTaps`. `resultForTaps` returns the
 * highest tier whose threshold the player reached. Every tier is encouraging —
 * there is no "you failed" tier, because the point is to feel capable and go
 * play, not to be graded. Thresholds assume a 5-second round.
 */
export const TAP_RESULT_TIERS: ReadonlyArray<Readonly<{ minTaps: number } & WarmUpResult>> = [
  {
    minTaps: 0,
    emoji: "👋",
    headline: "Warmed up and ready.",
    blurb: "That's all it takes to get moving. Real games are more fun than any counter.",
  },
  {
    minTaps: 15,
    emoji: "🙌",
    headline: "Nice rhythm!",
    blurb: "You've got a bit of a motor. Somewhere nearby, someone needs a fourth.",
  },
  {
    minTaps: 30,
    emoji: "🔥",
    headline: "Nice hands!",
    blurb: "Quick fingers. Imagine those reflexes on an actual court.",
  },
  {
    minTaps: 45,
    emoji: "⚡",
    headline: "Lightning reflexes!",
    blurb: "Seriously fast. That energy belongs in a real game, not a browser tab.",
  },
  {
    minTaps: 60,
    emoji: "🚀",
    headline: "Absolute rally machine!",
    blurb: "Okay, show-off. Go put that to use — find a game near you.",
  },
];

/**
 * Map a finished round's tap count to its warm result. Defensive against odd
 * inputs (negatives / non-integers snap to 0) so the UI never shows nothing.
 */
export function resultForTaps(taps: number): WarmUpResult {
  const count = Number.isFinite(taps) && taps > 0 ? Math.floor(taps) : 0;
  let chosen: WarmUpResult = TAP_RESULT_TIERS[0];
  for (const tier of TAP_RESULT_TIERS) {
    if (count >= tier.minTaps) chosen = tier;
  }
  return { emoji: chosen.emoji, headline: chosen.headline, blurb: chosen.blurb };
}

/**
 * The press feedback for the tap target, resolved purely so it can be unit-tested
 * for reduced-motion PARITY. Under reduced motion there is NO scale/spring — the
 * button still fully works and counts; it just doesn't move. This is the single
 * source of truth the component spreads onto the motion element.
 */
export function tapPressMotion(reducedMotion: boolean): Readonly<{
  whileTap?: { scale: number };
  transition: { type: "spring"; stiffness: number; damping: number } | { duration: number };
}> {
  if (reducedMotion) {
    // Calm parity: instant, no movement, no spring.
    return { transition: { duration: 0 } };
  }
  // Springy, sporty press — quick down, bouncy release.
  return { whileTap: { scale: 0.92 }, transition: { type: "spring", stiffness: 600, damping: 18 } };
}

// --- Mode registry (extension seam for the tennis-serve mode, added next) -------

export type WarmUpModeId = "tap-rally" | "serve-timing";

export type WarmUpMode = Readonly<{
  id: WarmUpModeId;
  label: string;
  /** Short imperative instruction shown before the round starts. */
  instruction: string;
  durationMs: number;
  /** Whether this mode is wired up in the UI yet. */
  available: boolean;
}>;

/**
 * Modes the warm-up can offer. `tap-rally` ships now; `serve-timing` is declared
 * (so the UI can already reason about "more modes coming") but not yet available.
 * Adding the serve mode later is: flip `available`, add its `resultFor…` reducer,
 * and a small timing-capture branch in the component — no shape changes here.
 */
export const WARMUP_MODES: ReadonlyArray<WarmUpMode> = [
  {
    id: "tap-rally",
    label: "Rally taps",
    instruction: "Tap as fast as you can for 5 seconds.",
    durationMs: WARMUP_DURATION_MS,
    available: true,
  },
  {
    id: "serve-timing",
    label: "Serve timing",
    instruction: "Hit the sweet spot when the marker peaks.",
    durationMs: WARMUP_DURATION_MS,
    available: false,
  },
];
