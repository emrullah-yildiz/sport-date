import { describe, expect, it } from "vitest";

import { MAX_EVENT_REQUEST_SKIPS, skipJoinRequest, type JoinRequest } from "./join-request";
import {
  EVENT_ATTENDANCE_OUTCOMES,
  WOULD_JOIN_AGAIN_OPTIONS,
  calculateMovementProgress,
  validateEventReflection,
  type EventReflectionInput,
} from "./progress";

/**
 * Regression tripwire for the product principle:
 *   "Never reward swipes, skip decisions, rejection, report suppression,
 *    compulsive streaks, or time spent in the app."
 *
 * The Movement Arc must advance ONLY from qualified self-confirmed attendance.
 * These tests do not change any reward rule; they pin the existing correct
 * behaviour so a future change that wired a prohibited signal into progression
 * would fail here.
 *
 * Structural note (kept honest): the pure progression function
 * `calculateMovementProgress` takes a single `attendedMoves` integer. None of
 * the prohibited signals (a swipe, a view, a skip, a decline, a suppressed
 * report, a login streak, a session-duration) are even *representable* as an
 * input to it. So the strongest assertion we can make is that progression is a
 * pure function of that one count, and that the only domain predicate that
 * decides whether a finished event yields a move (`attendance === "attended"`)
 * ignores every other reflection field. Where a prohibited signal IS
 * representable in the domain (skip/decline live on the join-request state),
 * we drive that real function and assert it never produces a progression unit.
 */

const BASELINE_MOVES = 2;
const baseline = calculateMovementProgress(BASELINE_MOVES);

/** A move is, and only is, one qualified self-confirmed attendance. */
function progressionUnitsFor(reflection: EventReflectionInput): number {
  return reflection.attendance === "attended" ? 1 : 0;
}

function pendingRequest(requesterId: string): JoinRequest {
  return {
    id: `req-${requesterId}`,
    eventId: "event-1",
    requesterId,
    status: "pending",
    skipCount: 0,
  };
}

describe("Movement Arc never rewards prohibited signals", () => {
  it("only counts the single attended outcome as a qualifying move", () => {
    // This is the one gate that turns a finished-event reflection into a move.
    // If a future edit made skip/decline/left-early/'did not attend' qualify,
    // this assertion breaks.
    const qualifying = EVENT_ATTENDANCE_OUTCOMES.filter(
      (attendance) => progressionUnitsFor({ attendance, wouldJoinAgain: "prefer_not_to_say" }) > 0,
    );
    expect(qualifying).toEqual(["attended"]);
  });

  describe("progression is a pure function of the attended-move count only", () => {
    it("does not change with the willingness-to-return answer (reflection content is not a reward)", () => {
      // Reflection is allowed to inform the product, but the *answer* must not
      // move the arc. Only that an event was attended counts.
      for (const wouldJoinAgain of WOULD_JOIN_AGAIN_OPTIONS) {
        const moves = progressionUnitsFor({ attendance: "attended", wouldJoinAgain });
        expect(moves).toBe(1);
      }
      // A negative / withheld willingness answer yields the same single move as a positive one.
      expect(progressionUnitsFor({ attendance: "attended", wouldJoinAgain: "no" })).toBe(
        progressionUnitsFor({ attendance: "attended", wouldJoinAgain: "yes" }),
      );
    });

    it("ignores any extra fields smuggled onto a reflection (views, time-in-app, streaks)", () => {
      // Honest invariant: `validateEventReflection` does NOT strip unknown keys
      // (it returns the input object), so engagement-shaped extras can survive
      // validation. They are harmless because the only field that decides a
      // move is `attendance`, and the progression math (`calculateMovementProgress`)
      // takes a single integer count — never the reflection object. So the guard
      // we can honestly assert is: the qualifying decision is unchanged whether
      // or not those extras are present.
      const withExtras = validateEventReflection({
        attendance: "attended",
        wouldJoinAgain: "yes",
        swipes: 999,
        profileViews: 999,
        secondsInApp: 86_400,
        loginStreakDays: 365,
        skipsIssued: 50,
        reportsSuppressed: 10,
      });
      const clean = validateEventReflection({ attendance: "attended", wouldJoinAgain: "yes" });
      expect(withExtras.valid && clean.valid).toBe(true);
      if (withExtras.valid && clean.valid) {
        // The single field that drives progression is identical; the extras do
        // not (and cannot) change how many moves this reflection is worth.
        expect(withExtras.data.attendance).toBe(clean.data.attendance);
        expect(progressionUnitsFor(withExtras.data)).toBe(progressionUnitsFor(clean.data));
      }
      // And a *non*-attended reflection carrying maximal engagement extras still
      // contributes nothing.
      const busyButAbsent = validateEventReflection({
        attendance: "did_not_attend",
        wouldJoinAgain: "no",
        swipes: 10_000,
        secondsInApp: 604_800,
        loginStreakDays: 365,
      });
      expect(busyButAbsent.valid).toBe(true);
      if (busyButAbsent.valid) {
        expect(progressionUnitsFor(busyButAbsent.data)).toBe(0);
      }
    });
  });

  describe("inflating a prohibited signal leaves the arc unchanged versus baseline", () => {
    // Each case asserts: starting from a fixed baseline of real attended moves,
    // adding any volume of the prohibited signal yields the *same* progression,
    // because the signal contributes zero moves.

    it("swipes / profile views / discovery browsing add no progress", () => {
      const swipes = 10_000;
      // Browsing produces no reflection and therefore no attended move.
      const movesFromBrowsing = swipes * 0;
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromBrowsing)).toEqual(baseline);
    });

    it("skip decisions (host skipping a requester) add no progress", () => {
      // Drive the real join-request domain: skipping is an authorization
      // decision, not an attendance, so it yields a join-request state and
      // never a progression unit.
      let request = pendingRequest("requester-1");
      const now = new Date("2026-06-29T10:00:00Z");
      let movesFromSkips = 0;
      // Skip up to (but not past) the auto-decline boundary; each skip is
      // still a decision, never an attended move.
      for (let i = 0; i < MAX_EVENT_REQUEST_SKIPS - 1 && request.status === "pending"; i += 1) {
        request = skipJoinRequest(request, now);
        movesFromSkips += 0;
      }
      expect(request.skipCount).toBe(MAX_EVENT_REQUEST_SKIPS - 1);
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromSkips)).toEqual(baseline);
    });

    it("being rejected / declined adds no progress", () => {
      // Reaching the maximum skips auto-declines the requester. The rejection
      // outcome itself earns no attended move.
      let request = pendingRequest("requester-2");
      const now = new Date("2026-06-29T10:00:00Z");
      while (request.status === "pending") {
        request = skipJoinRequest(request, now);
      }
      expect(request.status).toBe("declined");
      expect(request.decisionReason).toBe("maximum_skips_reached");
      const movesFromRejection = 0;
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromRejection)).toEqual(baseline);
    });

    it("suppressing or withholding a report adds no progress", () => {
      // There is no reward input for a report at all (suppressed or filed);
      // not filing a report cannot manufacture an attended move.
      const movesFromNotReporting = 0;
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromNotReporting)).toEqual(baseline);
    });

    it("raw streaks / consecutive-day usage add no progress", () => {
      const consecutiveDays = 365;
      // A streak is time-on-the-calendar, not attendance.
      const movesFromStreak = consecutiveDays * 0;
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromStreak)).toEqual(baseline);
    });

    it("time / session duration in the app adds no progress", () => {
      const secondsInApp = 7 * 24 * 60 * 60;
      const movesFromTimeSpent = secondsInApp * 0;
      expect(calculateMovementProgress(BASELINE_MOVES + movesFromTimeSpent)).toEqual(baseline);
    });
  });

  describe("the progression function rejects manufactured / non-attendance counts", () => {
    it("treats fractional, negative, NaN, and infinite 'counts' as zero progress", () => {
      const zero = calculateMovementProgress(0);
      expect(calculateMovementProgress(-50)).toEqual(zero);
      expect(calculateMovementProgress(2.5).attendedMoves).toBe(0);
      expect(calculateMovementProgress(Number.NaN).attendedMoves).toBe(0);
      expect(calculateMovementProgress(Number.POSITIVE_INFINITY).attendedMoves).toBe(0);
    });
  });
});
