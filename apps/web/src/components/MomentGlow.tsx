"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * MomentGlow — a brief, tasteful neon confirmation on a genuinely positive
 * moment: an event that really ended (afterglow) or an invitation that just
 * went live (publish). It is FEEDBACK, not a payout.
 *
 * Ethical-energy guardrails (see CX-20260702-ethical-gamified-energy-pass and
 * docs/design-refresh-2026.md §4):
 *  - Purely decorative: `aria-hidden`, `pointer-events: none`. It NEVER gates,
 *    obscures, or blocks any action — it sits behind the content it celebrates.
 *  - It shows NO number, count, score, rank, streak, or countdown. It carries
 *    no text and reads nothing to assistive tech — the celebrated content
 *    (heading + copy) is the real, legible message.
 *  - It fires ONCE on mount (the moment the real state change is rendered) and
 *    settles; it does not loop, pulse forever, or manufacture urgency.
 *  - Under `prefers-reduced-motion` it renders a STATIC neon wash (no animation)
 *    so reduced-motion members get an equivalent, calm accent — never nothing,
 *    never motion.
 *
 * `tone` picks the semantic neon per the palette: "go" (green) for positive
 * confirmations. It never uses red (`--warn`), which is reserved for
 * urgency/destructive only.
 */
export default function MomentGlow({ tone = "go" }: { tone?: "go" }) {
  const reducedMotion = useReducedMotion();
  const color = tone === "go" ? "var(--accent)" : "var(--accent)";

  // A single, one-shot bloom: the neon lifts in, holds briefly, then eases back
  // to a calm resting wash. Not a loop — momentum, then quiet.
  const animation = reducedMotion
    ? { opacity: 0.5 }
    : { opacity: [0, 0.9, 0.35], scale: [0.96, 1.04, 1] };

  return (
    <motion.span
      aria-hidden="true"
      className="moment-glow"
      style={{ ["--moment-glow-color" as string]: color }}
      // `initial` is unconditional so the server render (where `useReducedMotion()`
      // is always null) and the first client render agree — branching it on
      // reduced-motion made React log a hydration mismatch on the ended-event room
      // for reduced-motion members. Reduced-motion still gets NO animation: the
      // `duration: 0` transition snaps straight to the static wash with no frames.
      initial={{ opacity: 0, scale: 0.96 }}
      animate={animation}
      transition={reducedMotion ? { duration: 0 } : { duration: 1.1, ease: "easeOut", times: [0, 0.35, 1] }}
    />
  );
}
