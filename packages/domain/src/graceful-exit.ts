// Graceful-exit / no-show handling (CX-20260701-graceful-exit-no-show-non-punitive-handling).
//
// Design stance: leaving is always allowed and never punished. A member who leaves
// early, cannot attend, or has to protect themselves keeps full control. This module
// owns the OPTIONAL, PRIVATE reason a member may attach to their exit.
//
// Privacy contract (enforced here and in the data layer):
//   - The reason is the member's own note. It is NEVER shown to other members, the
//     host, or peers, and NEVER becomes a public score, count, or badge.
//   - Recording a reason is entirely optional; "prefer not to say" is a first-class
//     choice and the default.
//   - A "felt unsafe" reason is a routing hint only — it points the member at the
//     report/block/leave path (never paywalled). It carries no penalty and is not the
//     same as filing a report (the member still chooses whether to report/block).
//
// No shaming, no dark pattern: there is no reliability consequence for choosing a
// reason, and the reason list contains no manipulative or judgemental framing.

export const GRACEFUL_EXIT_REASONS = [
  "unspecified",
  "cant_make_it",
  "left_early",
  "plans_changed",
  "felt_unsafe",
  "prefer_not_to_say",
] as const;

export type GracefulExitReason = (typeof GRACEFUL_EXIT_REASONS)[number];

// The default when a member leaves without choosing anything. Kept distinct from
// "prefer_not_to_say" so the data layer can tell "did not open the reason step" from
// "opened it and deliberately declined to say" — both are treated identically and
// non-punitively; the distinction is only ever for the member's own private record.
export const DEFAULT_GRACEFUL_EXIT_REASON: GracefulExitReason = "unspecified";

// A short optional private note the member may add. Kept small on purpose: this is a
// personal memory aid, not an incident report. Safety incidents belong in the
// report/block flow, which preserves far more for the safety team.
export const MAX_GRACEFUL_EXIT_NOTE_LENGTH = 280;

// True only for the safety-motivated reason, which the UI uses to surface the
// report/block/leave path prominently. This is the single place that decides it, so
// UI and any server-side use stay in sync.
export function exitReasonIsSafety(reason: GracefulExitReason): boolean {
  return reason === "felt_unsafe";
}

export type NormalizedGracefulExit = Readonly<{
  reason: GracefulExitReason;
  // Trimmed private note, or empty string when none was given. Never surfaced to
  // anyone but the member.
  note: string;
}>;

export type GracefulExitInput = Readonly<{
  reason?: unknown;
  note?: unknown;
}>;

// Coerce arbitrary (client-supplied) input into a safe, stored shape. Unknown or
// missing reasons collapse to the non-punitive default; an over-long or non-string
// note is trimmed/dropped rather than rejected, because a member protecting
// themselves must never be blocked from leaving by a validation error on an OPTIONAL
// field. Leaving always succeeds; the reason is best-effort.
export function normalizeGracefulExit(input: GracefulExitInput | null | undefined): NormalizedGracefulExit {
  const reason: GracefulExitReason =
    typeof input?.reason === "string" && (GRACEFUL_EXIT_REASONS as readonly string[]).includes(input.reason)
      ? (input.reason as GracefulExitReason)
      : DEFAULT_GRACEFUL_EXIT_REASON;

  const rawNote = typeof input?.note === "string" ? input.note.trim() : "";
  const note = rawNote.slice(0, MAX_GRACEFUL_EXIT_NOTE_LENGTH);

  return { reason, note };
}
