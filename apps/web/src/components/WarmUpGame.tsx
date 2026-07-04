"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  resultForTaps,
  tapPressMotion,
  WARMUP_DURATION_MS,
  WARMUP_TICK_MS,
  type WarmUpResult,
} from "@/lib/warmup-game";

/**
 * WarmUpGame — a self-contained, OPTIONAL landing warm-up micro-game
 * (CX-20260704-interactive-sporty-experience-microgames).
 *
 * Brand line (non-negotiable — this is the whole point): delight that makes
 * people want to go DO the sport, never a retention trap. So:
 *  - The round is a fixed 5 seconds, it saves nothing, ranks nothing, and never
 *    compares you to anyone. There is no streak, no high-score to defend, no
 *    "come back tomorrow", no escalating levels, no variable reward.
 *  - Every outcome funnels to the SAME calm OUTWARD call to action — the game
 *    exists to make you smile and then LEAVE to find a real game.
 *  - It gates nothing: signup, discovery, and safety never depend on playing.
 *
 * Accessibility: the tap target is a real <button> (native Space/Enter + touch +
 * click), ≥44px, with visible focus. The running count is shown visually and the
 * outcome is announced once via a polite live region (we do NOT announce every
 * tap — that would spam a screen reader). Reduced-motion parity is mandatory: the
 * springy press and the celebratory glow both fall back to calm/static, and the
 * game is fully playable with no motion at all.
 *
 * Extensible by design: round logic + result tiers live in `@/lib/warmup-game`
 * as a small mode registry, so a tennis-serve timing mode can be added next
 * without reshaping this component.
 */

type Phase = "idle" | "running" | "done";

export default function WarmUpGame({
  ctaHref = "/signup",
  ctaLabel = "Find a game near you",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [taps, setTaps] = useState(0);
  const [remainingMs, setRemainingMs] = useState(WARMUP_DURATION_MS);
  const [result, setResult] = useState<WarmUpResult | null>(null);

  // Timers/counters kept in refs so React re-renders don't drop or restart them.
  // `tapsRef` mirrors the tap count for the moment the clock ends (state updates
  // are async — the ref is the authoritative final count for the result).
  const tapsRef = useRef(0);
  const endsAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Always clear the interval if the component unmounts mid-round.
  useEffect(() => clearTick, [clearTick]);

  const finish = useCallback(() => {
    clearTick();
    setRemainingMs(0);
    setResult(resultForTaps(tapsRef.current));
    setPhase("done");
  }, [clearTick]);

  const start = useCallback(() => {
    clearTick();
    tapsRef.current = 0;
    setTaps(0);
    setResult(null);
    setRemainingMs(WARMUP_DURATION_MS);
    endsAtRef.current = Date.now() + WARMUP_DURATION_MS;
    setPhase("running");
    tickRef.current = setInterval(() => {
      const left = endsAtRef.current - Date.now();
      if (left <= 0) {
        finish();
      } else {
        setRemainingMs(left);
      }
    }, WARMUP_TICK_MS);
  }, [clearTick, finish]);

  const tap = useCallback(() => {
    if (phase !== "running") return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  }, [phase]);

  const press = tapPressMotion(Boolean(reducedMotion));
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / WARMUP_DURATION_MS) * 100));

  return (
    <section className="warmup" aria-labelledby="warmup-title">
      <div className="warmup-head">
        <p className="eyebrow warmup-eyebrow">Warm-up · optional</p>
        <h2 id="warmup-title" className="warmup-title">
          How many taps in 5 seconds?
        </h2>
        <p className="warmup-lede">
          A tiny warm-up while you&rsquo;re here. Nothing saved, nothing scored — just a smile,
          then go play for real.
        </p>
      </div>

      <div className="warmup-stage">
        {/* Live clock + count. The clock is decorative-but-informative; the outcome
            is announced once via the polite region below, not on every tap. */}
        <div className="warmup-meters" aria-hidden={phase === "idle"}>
          <div className="warmup-meter">
            <span className="warmup-meter-label">Time</span>
            <span className="warmup-meter-value">{phase === "done" ? 0 : secondsLeft}s</span>
          </div>
          <div className="warmup-meter warmup-meter--count">
            <span className="warmup-meter-label">Taps</span>
            <span className="warmup-meter-value warmup-count">{taps}</span>
          </div>
        </div>

        <div className="warmup-track" aria-hidden="true">
          <div
            className="warmup-track-fill"
            style={{ width: `${phase === "running" ? progressPercent : phase === "done" ? 0 : 100}%` }}
          />
        </div>

        {phase === "done" && result ? (
          <div className="warmup-result" role="group" aria-labelledby="warmup-result-headline">
            {/* Static under reduced motion; a one-shot bloom otherwise. */}
            <motion.span
              className="warmup-burst"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={reducedMotion ? { opacity: 0.5, scale: 1 } : { opacity: [0, 0.9, 0.4], scale: [0.9, 1.05, 1] }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
            />
            <span className="warmup-result-emoji" aria-hidden="true">{result.emoji}</span>
            <p id="warmup-result-headline" className="warmup-result-headline">{result.headline}</p>
            <p className="warmup-result-count">You tapped {taps} times.</p>
            <p className="warmup-result-blurb">{result.blurb}</p>
          </div>
        ) : null}

        {/* Primary control. A single real <button> handles start, tap, and (when
            done) play-again — keyboard (Space/Enter) and touch both work natively. */}
        {phase === "running" ? (
          <motion.button
            type="button"
            className="warmup-tap"
            onClick={tap}
            whileTap={press.whileTap}
            transition={press.transition}
          >
            <span className="warmup-tap-word">TAP!</span>
            <span className="warmup-tap-sub">Keep it up</span>
          </motion.button>
        ) : (
          <button type="button" className="btn btn--primary btn--lg warmup-start" onClick={start}>
            {phase === "done" ? "Play again" : "Start warm-up"}
          </button>
        )}

        {/* Announce ONLY the outcome (once), not every tap. */}
        <p className="warmup-live visually-hidden" role="status" aria-live="polite">
          {phase === "done" && result ? `Time! You tapped ${taps} times. ${result.headline}` : ""}
        </p>

        {/* The whole game points OUTWARD — the CTA is always reachable, and after a
            round it becomes the natural next step. Never gates anything. */}
        <p className={`warmup-cta${phase === "done" ? " warmup-cta--ready" : ""}`}>
          {phase === "done" ? (
            <>
              You&rsquo;ve got the energy —{" "}
              <Link href={ctaHref} className="warmup-cta-link">{ctaLabel}</Link>.
            </>
          ) : (
            <Link href={ctaHref} className="warmup-cta-link warmup-cta-link--muted">
              Or skip the warm-up — {ctaLabel.toLowerCase()}
            </Link>
          )}
        </p>
      </div>
    </section>
  );
}
