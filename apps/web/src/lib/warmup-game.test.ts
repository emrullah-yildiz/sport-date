import { describe, expect, it } from "vitest";

import {
  resultForTaps,
  tapPressMotion,
  TAP_RESULT_TIERS,
  WARMUP_DURATION_MS,
  WARMUP_MODES,
} from "./warmup-game";

describe("warm-up game — round timing", () => {
  it("is a short, fixed 5-second round (a warm-up, not a grind)", () => {
    // The round is deliberately short and constant — no escalating/endless timer.
    expect(WARMUP_DURATION_MS).toBe(5_000);
  });
});

describe("warm-up game — result thresholds", () => {
  it("returns an encouraging result even at zero taps (no 'you failed' tier)", () => {
    const zero = resultForTaps(0);
    expect(zero.headline).toBe("Warmed up and ready.");
    // Every result points outward toward a real game.
    expect(zero.blurb.toLowerCase()).toContain("game");
  });

  it("picks the highest tier the tap count reaches", () => {
    // Just under the first non-zero threshold stays in the base tier.
    expect(resultForTaps(14).headline).toBe("Warmed up and ready.");
    // Exactly on each threshold crosses into that tier.
    expect(resultForTaps(15).headline).toBe("Nice rhythm!");
    expect(resultForTaps(29).headline).toBe("Nice rhythm!");
    expect(resultForTaps(30).headline).toBe("Nice hands!");
    expect(resultForTaps(45).headline).toBe("Lightning reflexes!");
    expect(resultForTaps(60).headline).toBe("Absolute rally machine!");
    // Well past the top threshold still resolves to the top tier (no overflow).
    expect(resultForTaps(999).headline).toBe("Absolute rally machine!");
  });

  it("snaps odd inputs (negative / fractional / NaN) down to the base tier", () => {
    expect(resultForTaps(-5).headline).toBe("Warmed up and ready.");
    expect(resultForTaps(Number.NaN).headline).toBe("Warmed up and ready.");
    // Fractional counts floor: 30.9 taps is still the 30-tap tier, never rounds up.
    expect(resultForTaps(29.9).headline).toBe("Nice rhythm!");
    expect(resultForTaps(30.9).headline).toBe("Nice hands!");
  });

  it("keeps tiers ascending and honest (thresholds strictly increasing)", () => {
    for (let i = 1; i < TAP_RESULT_TIERS.length; i += 1) {
      expect(TAP_RESULT_TIERS[i].minTaps).toBeGreaterThan(TAP_RESULT_TIERS[i - 1].minTaps);
    }
  });
});

describe("warm-up game — reduced-motion parity of the tap press", () => {
  it("under reduced motion: no scale/spring, instant transition (still works, just calm)", () => {
    const motion = tapPressMotion(true);
    expect(motion.whileTap).toBeUndefined();
    expect(motion.transition).toEqual({ duration: 0 });
  });

  it("with motion allowed: a springy sporty press", () => {
    const motion = tapPressMotion(false);
    expect(motion.whileTap).toEqual({ scale: 0.92 });
    expect(motion.transition).toMatchObject({ type: "spring" });
  });
});

describe("warm-up game — mode registry (extension seam)", () => {
  it("ships the tap-rally mode as available", () => {
    const tap = WARMUP_MODES.find((mode) => mode.id === "tap-rally");
    expect(tap?.available).toBe(true);
    expect(tap?.durationMs).toBe(WARMUP_DURATION_MS);
  });

  it("declares the tennis serve-timing mode as planned-but-not-yet-available", () => {
    // The seam exists so the serve mode can be added next without reshaping this.
    const serve = WARMUP_MODES.find((mode) => mode.id === "serve-timing");
    expect(serve).toBeDefined();
    expect(serve?.available).toBe(false);
  });
});
