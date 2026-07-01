import { describe, expect, it } from "vitest";

import {
  applyLateCancellation,
  cancellationCountsTowardReliability,
  CLEAN_RELIABILITY_STATE,
  describeReliabilityStanding,
  isNewJoinPaused,
  RELIABILITY_POLICY,
  restoreReliabilityAfterCleanAttendance,
  type CancellationContext,
  type ReliabilityState,
} from "./reliability";

const NOW = new Date("2026-07-01T12:00:00.000Z");

const lateAccepted = (over: Partial<CancellationContext> = {}): CancellationContext => ({
  wasAccepted: true,
  hoursUntilStart: 2,
  viaSafetyPath: false,
  ...over,
});

describe("what counts toward reliability", () => {
  it("counts a late cancellation of an accepted place", () => {
    expect(cancellationCountsTowardReliability(lateAccepted())).toBe(true);
  });

  it("never counts a safety-motivated exit, even if late and accepted", () => {
    expect(cancellationCountsTowardReliability(lateAccepted({ viaSafetyPath: true }))).toBe(false);
  });

  it("does not count cancelling a still-pending request", () => {
    expect(cancellationCountsTowardReliability(lateAccepted({ wasAccepted: false }))).toBe(false);
  });

  it("does not count an early cancellation outside the window", () => {
    expect(
      cancellationCountsTowardReliability(lateAccepted({ hoursUntilStart: RELIABILITY_POLICY.lateCancellationWindowHours + 1 })),
    ).toBe(false);
  });

  it("does not count a cancellation after the event has started", () => {
    expect(cancellationCountsTowardReliability(lateAccepted({ hoursUntilStart: -1 }))).toBe(false);
  });
});

describe("streak accumulation and the pause threshold", () => {
  it("increments the streak on each qualifying late cancellation without pausing early", () => {
    let state: ReliabilityState = CLEAN_RELIABILITY_STATE;
    state = applyLateCancellation(state, lateAccepted(), NOW);
    expect(state.lateCancellationStreak).toBe(1);
    expect(isNewJoinPaused(state, NOW)).toBe(false);

    state = applyLateCancellation(state, lateAccepted(), NOW);
    expect(state.lateCancellationStreak).toBe(2);
    expect(isNewJoinPaused(state, NOW)).toBe(false);
  });

  it("pauses new joins only on reaching the pause threshold", () => {
    let state: ReliabilityState = CLEAN_RELIABILITY_STATE;
    for (let i = 0; i < RELIABILITY_POLICY.pauseThreshold; i += 1) {
      state = applyLateCancellation(state, lateAccepted(), NOW);
    }
    expect(state.lateCancellationStreak).toBe(RELIABILITY_POLICY.pauseThreshold);
    expect(isNewJoinPaused(state, NOW)).toBe(true);
    const expectedLift = new Date(NOW.getTime() + RELIABILITY_POLICY.cooldownHours * 3_600_000);
    expect(state.pausedUntil?.getTime()).toBe(expectedLift.getTime());
  });

  it("leaves state untouched for a non-qualifying cancellation", () => {
    const state = applyLateCancellation(CLEAN_RELIABILITY_STATE, lateAccepted({ viaSafetyPath: true }), NOW);
    expect(state).toEqual(CLEAN_RELIABILITY_STATE);
  });
});

describe("recovery and reset", () => {
  it("lifts the pause automatically once the cool-down passes", () => {
    let state: ReliabilityState = CLEAN_RELIABILITY_STATE;
    for (let i = 0; i < RELIABILITY_POLICY.pauseThreshold; i += 1) {
      state = applyLateCancellation(state, lateAccepted(), NOW);
    }
    const afterCooldown = new Date(NOW.getTime() + (RELIABILITY_POLICY.cooldownHours + 1) * 3_600_000);
    expect(isNewJoinPaused(state, afterCooldown)).toBe(false);
  });

  it("resets the streak automatically after the reset window passes cleanly", () => {
    const stale: ReliabilityState = {
      lateCancellationStreak: 2,
      streakStartedAt: NOW,
      pausedUntil: null,
    };
    const long = new Date(NOW.getTime() + (RELIABILITY_POLICY.streakResetAfterHours + 1) * 3_600_000);
    const next = applyLateCancellation(stale, lateAccepted(), long);
    // Decayed to zero first, then this fresh cancellation is the only one.
    expect(next.lateCancellationStreak).toBe(1);
  });

  it("restores clean standing immediately after a completed attendance", () => {
    expect(restoreReliabilityAfterCleanAttendance()).toEqual(CLEAN_RELIABILITY_STATE);
  });
});

describe("transparent, private member-facing copy", () => {
  it("says nothing when standing is clean", () => {
    expect(describeReliabilityStanding(CLEAN_RELIABILITY_STATE, NOW).tone).toBe("none");
  });

  it("warns at the warning boundary, before any pause", () => {
    const state: ReliabilityState = { lateCancellationStreak: RELIABILITY_POLICY.warningThreshold, streakStartedAt: NOW, pausedUntil: null };
    const notice = describeReliabilityStanding(state, NOW);
    expect(notice.tone).toBe("warning");
    expect(notice.body).toContain("safety");
  });

  it("explains the pause and exactly when it lifts", () => {
    const lift = new Date(NOW.getTime() + RELIABILITY_POLICY.cooldownHours * 3_600_000);
    const state: ReliabilityState = { lateCancellationStreak: RELIABILITY_POLICY.pauseThreshold, streakStartedAt: NOW, pausedUntil: lift };
    const notice = describeReliabilityStanding(state, NOW);
    expect(notice.tone).toBe("paused");
    expect(notice.liftsAt?.getTime()).toBe(lift.getTime());
    // The consequence is explicitly limited: safety and leaving stay available.
    expect(notice.body).toContain("leave events");
    expect(notice.body).toContain("safety");
  });

  it("never surfaces a numeric reliability score or badge in the paused copy", () => {
    const lift = new Date(NOW.getTime() + RELIABILITY_POLICY.cooldownHours * 3_600_000);
    const state: ReliabilityState = { lateCancellationStreak: 3, streakStartedAt: NOW, pausedUntil: lift };
    const notice = describeReliabilityStanding(state, NOW);
    expect(notice.body).not.toMatch(/score|badge|rating|\/\s*\d/i);
  });
});
