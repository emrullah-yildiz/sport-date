// Member reliability rule for repeated LATE cancellations
// (CX-20260701-repeated-cancellation-no-fair-reliability-rule).
//
// Design stance: fair, transparent, private, recoverable — never a dark pattern.
// Hosts plan logistics around accepted counts, so a member who repeatedly cancels
// an *accepted* place *shortly before it starts* erodes reliability. We count only
// that specific reliability signal, warn the member before any consequence, and the
// only consequence is a short, automatic, self-lifting pause on requesting NEW
// places. Leaving, reporting, blocking, safety features, editing the profile, and
// attending already-accepted events are NEVER affected. The count is private and
// never shown to hosts or other members.
//
// The numbers below are the owner-tunable policy dials. Defaults are conservative
// and forgiving (they favour the member). Any move toward a *visible* reliability
// signal is a separate owner decision and out of scope here.

export const RELIABILITY_POLICY = {
  // A cancellation only counts as a "late" reliability signal when it happens
  // within this many hours before the event start. Cancelling earlier than this
  // gives the host time to refill the seat, so it counts for nothing.
  lateCancellationWindowHours: 24,
  // The member is warned once they reach this many late cancellations in the
  // rolling streak — strictly BEFORE the pause threshold, so nothing is a surprise.
  warningThreshold: 2,
  // On this many consecutive late cancellations (the owner's "3 consecutive"
  // example), a temporary cool-down on requesting new places begins.
  pauseThreshold: 3,
  // How long the cool-down on requesting NEW places lasts. Leaving/reporting/
  // blocking/attending already-accepted events are unaffected for the whole time.
  cooldownHours: 48,
  // The streak self-heals: if the member goes this long with no new late
  // cancellation, the streak resets to zero on its own (recoverable standing).
  streakResetAfterHours: 30 * 24,
} as const;

export type ReliabilityState = Readonly<{
  // Consecutive late cancellations in the current rolling streak.
  lateCancellationStreak: number;
  // When the current streak began (null once the streak is zero).
  streakStartedAt: Date | null;
  // Timestamp the cool-down lifts, if a pause is active (null otherwise).
  pausedUntil: Date | null;
}>;

export const CLEAN_RELIABILITY_STATE: ReliabilityState = {
  lateCancellationStreak: 0,
  streakStartedAt: null,
  pausedUntil: null,
};

export type CancellationContext = Readonly<{
  // Was the place actually accepted (a real seat a host planned around)? Only an
  // accepted place is a reliability signal; cancelling a still-pending request is not.
  wasAccepted: boolean;
  // Hours between the cancellation moment and the event start. Negative means the
  // event has already started.
  hoursUntilStart: number;
  // True when the member is exiting via the safety path (report / block / "I felt
  // unsafe"). A safety-motivated exit NEVER counts, no matter the timing.
  viaSafetyPath: boolean;
}>;

// A cancellation only counts toward reliability when it is a member-initiated
// cancellation of an accepted place, close to the start, and NOT a safety exit.
export function cancellationCountsTowardReliability(
  context: CancellationContext,
  policy = RELIABILITY_POLICY,
): boolean {
  if (context.viaSafetyPath) return false;
  if (!context.wasAccepted) return false;
  // An already-started event is not a "late cancellation" signal we penalise here.
  if (context.hoursUntilStart < 0) return false;
  return context.hoursUntilStart <= policy.lateCancellationWindowHours;
}

// Fold a streak that has aged past the reset window back to a clean state, so
// standing recovers automatically over time even without a completed event.
function decayStreak(
  state: ReliabilityState,
  now: Date,
  policy: typeof RELIABILITY_POLICY,
): ReliabilityState {
  if (state.lateCancellationStreak === 0 || !state.streakStartedAt) return state;
  const ageHours = (now.getTime() - state.streakStartedAt.getTime()) / 3_600_000;
  if (ageHours >= policy.streakResetAfterHours) return CLEAN_RELIABILITY_STATE;
  return state;
}

// Apply a qualifying late cancellation and return the next state. Non-qualifying
// cancellations (safety, early, pending) leave state untouched — the caller checks
// cancellationCountsTowardReliability first, but this is defensive too.
export function applyLateCancellation(
  state: ReliabilityState,
  context: CancellationContext,
  now: Date,
  policy = RELIABILITY_POLICY,
): ReliabilityState {
  if (!cancellationCountsTowardReliability(context, policy)) return decayStreak(state, now, policy);

  const decayed = decayStreak(state, now, policy);
  const nextStreak = decayed.lateCancellationStreak + 1;
  const streakStartedAt = decayed.streakStartedAt ?? now;
  const pausedUntil = nextStreak >= policy.pauseThreshold
    ? new Date(now.getTime() + policy.cooldownHours * 3_600_000)
    : decayed.pausedUntil;

  return { lateCancellationStreak: nextStreak, streakStartedAt, pausedUntil };
}

// One clean completed attendance restores standing immediately (recoverable).
export function restoreReliabilityAfterCleanAttendance(): ReliabilityState {
  return CLEAN_RELIABILITY_STATE;
}

// Is the member currently paused from requesting NEW places? Only true when a
// live cool-down timestamp is in the future. Leaving/safety are never gated on this.
export function isNewJoinPaused(state: ReliabilityState, now: Date): boolean {
  return state.pausedUntil !== null && state.pausedUntil.getTime() > now.getTime();
}

export type ReliabilityNotice = Readonly<{
  tone: "none" | "warning" | "paused";
  headline: string;
  body: string;
  // When paused, the exact moment the cool-down lifts, for the member to see.
  liftsAt: Date | null;
}>;

// Private, calm, member-facing copy describing the member's current standing.
// Never shown to hosts or other members. No shaming, no score, no badge.
export function describeReliabilityStanding(
  state: ReliabilityState,
  now: Date,
  policy = RELIABILITY_POLICY,
): ReliabilityNotice {
  if (isNewJoinPaused(state, now)) {
    return {
      tone: "paused",
      headline: "New requests are paused for a short while.",
      body:
        "You cancelled a few accepted places close to their start recently, so new join requests are briefly on hold. You can still leave events, report or block anyone, use every safety feature, edit your profile, and attend any place you already hold. Your standing resets automatically, and one completed event restores it right away.",
      liftsAt: state.pausedUntil,
    };
  }

  const decayed = decayStreak(state, now, policy);
  if (decayed.lateCancellationStreak >= policy.warningThreshold && decayed.lateCancellationStreak < policy.pauseThreshold) {
    return {
      tone: "warning",
      headline: "A quiet heads-up, just for you.",
      body:
        `You have cancelled ${decayed.lateCancellationStreak} accepted places close to their start recently. One more within about ${Math.round(policy.streakResetAfterHours / 24)} days would briefly pause new join requests for ${policy.cooldownHours} hours. Cancelling early, or leaving for any safety reason, never counts.`,
      liftsAt: null,
    };
  }

  return { tone: "none", headline: "", body: "", liftsAt: null };
}
