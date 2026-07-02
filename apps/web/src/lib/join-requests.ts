import "server-only";

import crypto from "node:crypto";

import {
  applyLateCancellation,
  describeReliabilityStanding,
  exitReasonIsSafety,
  isNewJoinPaused,
  normalizeGracefulExit,
  restoreReliabilityAfterCleanAttendance,
  type CancellationContext,
  type GracefulExitInput,
  type ReliabilityNotice,
  type ReliabilityState,
} from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

type ReliabilityRow = {
  late_cancellation_streak: number;
  late_cancellation_streak_started_at: string | null;
  reliability_paused_until: string | null;
};

function toReliabilityState(row: ReliabilityRow): ReliabilityState {
  return {
    lateCancellationStreak: Number(row.late_cancellation_streak),
    streakStartedAt: row.late_cancellation_streak_started_at ? new Date(row.late_cancellation_streak_started_at) : null,
    pausedUntil: row.reliability_paused_until ? new Date(row.reliability_paused_until) : null,
  };
}

// Private reliability standing for the signed-in member only. Never selected into
// any host- or peer-facing query; the returned notice is the member's own copy.
export async function getMemberReliabilityStanding(
  userId: string,
  now: Date = new Date(),
): Promise<{ paused: boolean; notice: ReliabilityNotice }> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT late_cancellation_streak, late_cancellation_streak_started_at, reliability_paused_until
    FROM users WHERE id = ${userId}
  `) as unknown as ReliabilityRow[];
  if (rows.length === 0) return { paused: false, notice: { tone: "none", headline: "", body: "", liftsAt: null } };
  const state = toReliabilityState(rows[0]);
  return { paused: isNewJoinPaused(state, now), notice: describeReliabilityStanding(state, now) };
}

async function persistReliabilityState(userId: string, state: ReliabilityState): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE users
    SET late_cancellation_streak = ${state.lateCancellationStreak},
        late_cancellation_streak_started_at = ${state.streakStartedAt ? state.streakStartedAt.toISOString() : null},
        reliability_paused_until = ${state.pausedUntil ? state.pausedUntil.toISOString() : null}
    WHERE id = ${userId}
  `;
}

export type CreateJoinRequestResult =
  | { requestId: string; status: "pending" }
  | { paused: true; notice: ReliabilityNotice }
  | null;

export async function createEventJoinRequest(
  eventId: string,
  requester: { id: string; age: number },
  introduction: string,
): Promise<CreateJoinRequestResult> {
  const now = new Date();
  const standing = await getMemberReliabilityStanding(requester.id, now);
  // The ONLY consequence of the reliability rule: a temporary pause on requesting
  // NEW places. Leaving, reporting, blocking, safety, profile editing, and already-
  // accepted events are untouched (they never reach this gate).
  if (standing.paused) return { paused: true as const, notice: standing.notice };
  const requestId = crypto.randomUUID();
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO join_requests (id, event_id, requester_user_id, introduction)
    SELECT ${requestId}::uuid, events.id, candidate.id, ${introduction}
    FROM events
    JOIN users AS candidate ON candidate.id = ${requester.id} AND candidate.account_status = 'active'
    JOIN user_sports AS compatible_sport
      ON compatible_sport.user_id = candidate.id
      AND LOWER(compatible_sport.sport) = LOWER(events.sport)
      -- Inclusive skill matching (owner decision 2026-07-01, see events.ts
      -- memberSkillMatchesEvent): a member matches when their skill rank is at
      -- least the easiest level the event welcomes. Mirrors getDiscoverableEvents
      -- so a member is never shown an event in discovery they cannot join here.
      AND (CASE LOWER(compatible_sport.skill_level)
        WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 ELSE 0 END) >= (
        SELECT MIN(CASE LOWER(level)
          WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 ELSE 99 END)
        FROM UNNEST(events.experience_levels) AS level
      )
    WHERE events.id = ${eventId}::uuid
      AND events.status = 'published' AND events.starts_at > NOW()
      AND events.host_user_id <> candidate.id
      AND ${requester.age} BETWEEN events.minimum_age AND events.maximum_age
      -- Language-preference rule (shared with getDiscoverableEvents, see events.ts
      -- eventLanguageMatchesMemberPreference): a member who lists at least one
      -- language only joins events whose language overlaps theirs; a member with NO
      -- language listed (CARDINALITY = 0 — the default for every fresh signup, since
      -- signup does not collect one) has no preference to filter on and may request.
      -- Mirrors the discover clause exactly so a member is never shown an event here
      -- they are then barred from joining (CX-20260701 language-gate divergence).
      AND (
        CARDINALITY(candidate.languages) = 0
        OR EXISTS (SELECT 1 FROM UNNEST(candidate.languages) AS language WHERE LOWER(language) = LOWER(events.language))
      )
      AND (SELECT COUNT(*) FROM event_participants WHERE event_id = events.id) < events.capacity
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = candidate.id AND blocked_user_id = events.host_user_id)
           OR (blocker_user_id = events.host_user_id AND blocked_user_id = candidate.id)
      )
    -- Reversibility (CX-20260702): a member who cancelled their OWN pending request
    -- can ask again on the same still-open event, so one tap of "Cancel" is never a
    -- permanent, silent lockout (matching the "cancel quietly at any time" promise).
    -- The reopen is scoped to the member's own 'cancelled' row only — an accepted,
    -- declined (host-skipped-out), or already-pending row is left untouched, so this
    -- cannot reopen a state a host closed or double-submit a live request. Every join
    -- guard still lives in the SELECT above: if the event is closed/full, the member
    -- is blocked/excluded/ineligible, or the age/skill/language rules fail, the SELECT
    -- yields no row, there is no conflict, and nothing is reopened. The reliability
    -- cool-down is enforced earlier (standing.paused returns before this INSERT), so a
    -- legitimate active pause is never bypassed by a re-request.
    ON CONFLICT (event_id, requester_user_id) DO UPDATE
      SET status = 'pending',
          introduction = EXCLUDED.introduction,
          requested_at = NOW(),
          updated_at = NOW(),
          skip_count = 0,
          last_skipped_at = NULL,
          responded_at = NULL,
          cancelled_at = NULL,
          exit_reason = NULL,
          exit_note = NULL
      WHERE join_requests.status = 'cancelled'
    RETURNING id, status
  `;
  // Return the row's real id: on a reopen (DO UPDATE) the id is the original
  // cancelled row's, not the freshly generated one, so the client can cancel it
  // again. A conflicting row that is NOT cancelled (accepted/declined/pending)
  // fails the DO UPDATE WHERE, returns nothing, and is correctly reported as
  // unavailable.
  return rows.length > 0 ? { requestId: String(rows[0].id), status: "pending" as const } : null;
}

export async function cancelEventJoinRequest(
  eventId: string,
  requestId: string,
  requesterId: string,
  // Optional, PRIVATE graceful-exit reason. Never shown to hosts/peers, never a
  // public score. Best-effort: it is normalized (never rejected) so an optional
  // field can never block a member from leaving to protect themselves.
  exit?: GracefulExitInput | null,
) {
  const sql = getDatabase();
  const { reason, note } = normalizeGracefulExit(exit);
  // Capture the pre-cancel status and hours-until-start in the same statement that
  // cancels, so the reliability signal reflects the real state. The private exit
  // reason/note are recorded on the member's own row only. NOTE: safety-path exits
  // (report/block) cancel seats inside safety-actions.ts and never reach this
  // function, so a safety-motivated exit can never count here. Host-cancelled
  // events also do not route through here.
  const rows = (await sql`
    WITH removed_seat AS (
      DELETE FROM event_participants
      WHERE event_id = ${eventId}::uuid AND user_id = ${requesterId}
    )
    UPDATE join_requests
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW(),
        exit_reason = ${reason}, exit_note = ${note === "" ? null : note}
    FROM events
    WHERE join_requests.id = ${requestId}::uuid AND join_requests.event_id = ${eventId}::uuid
      AND join_requests.event_id = events.id
      AND join_requests.requester_user_id = ${requesterId}
      AND join_requests.status IN ('pending', 'accepted')
    RETURNING (join_requests.status = 'cancelled') AS cancelled,
      (join_requests.responded_at IS NOT NULL) AS was_accepted,
      EXTRACT(EPOCH FROM (events.starts_at - NOW())) / 3600 AS hours_until_start
  `) as unknown as Array<{ cancelled: boolean; was_accepted: boolean; hours_until_start: string | number }>;

  if (rows.length === 0) return false;

  // A cancellation only counts as a reliability signal when it was an ACCEPTED
  // place cancelled close to the start. The domain layer owns the exact rule. A
  // member who noted they felt unsafe is treated as a safety exit here so it can
  // NEVER count toward reliability, matching the report/block safety path.
  const context: CancellationContext = {
    wasAccepted: Boolean(rows[0].was_accepted),
    hoursUntilStart: Number(rows[0].hours_until_start),
    viaSafetyPath: exitReasonIsSafety(reason),
  };
  const now = new Date();
  const currentRows = (await sql`
    SELECT late_cancellation_streak, late_cancellation_streak_started_at, reliability_paused_until
    FROM users WHERE id = ${requesterId}
  `) as unknown as ReliabilityRow[];
  if (currentRows.length > 0) {
    const nextState = applyLateCancellation(toReliabilityState(currentRows[0]), context, now);
    await persistReliabilityState(requesterId, nextState);
  }

  return true;
}

// A clean completed attendance restores standing immediately (recoverable). Called
// from the reflection path when the member reports they attended.
export async function restoreMemberReliabilityStanding(userId: string): Promise<void> {
  await persistReliabilityState(userId, restoreReliabilityAfterCleanAttendance());
}

export async function decideEventJoinRequest(eventId: string, requestId: string, hostId: string, action: "accept" | "skip") {
  const sql = getDatabase();
  if (action === "skip") {
    const rows = await sql`
      UPDATE join_requests AS request
      SET skip_count = LEAST(3, request.skip_count + 1),
          status = CASE WHEN request.skip_count >= 2 THEN 'declined' ELSE 'pending' END,
          last_skipped_at = NOW(),
          responded_at = CASE WHEN request.skip_count >= 2 THEN NOW() ELSE request.responded_at END,
          updated_at = NOW()
      FROM events
      WHERE request.id = ${requestId}::uuid AND request.event_id = ${eventId}::uuid
        AND request.event_id = events.id AND events.host_user_id = ${hostId}
        AND request.status = 'pending'
      RETURNING request.status, request.skip_count
    `;
    return rows[0] ? { status: String(rows[0].status), skipCount: Number(rows[0].skip_count) } : null;
  }

  const rows = await sql`
    WITH eligible_request AS (
      SELECT request.id, request.event_id, request.requester_user_id, events.capacity
      FROM join_requests AS request
      JOIN events ON events.id = request.event_id
      JOIN users AS requester ON requester.id = request.requester_user_id AND requester.account_status = 'active'
      WHERE request.id = ${requestId}::uuid AND request.event_id = ${eventId}::uuid
        AND request.status = 'pending' AND events.host_user_id = ${hostId}
        AND events.status = 'published' AND events.starts_at > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = requester.id AND blocked_user_id = events.host_user_id)
             OR (blocker_user_id = events.host_user_id AND blocked_user_id = requester.id)
        )
    ), available_seat AS (
      SELECT eligible_request.*, seat.seat_number
      FROM eligible_request
      CROSS JOIN LATERAL (
        SELECT candidate AS seat_number
        FROM GENERATE_SERIES(1, eligible_request.capacity) AS candidate
        WHERE NOT EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = eligible_request.event_id AND seat_number = candidate
        )
        ORDER BY candidate LIMIT 1
      ) AS seat
    ), inserted_participant AS (
      INSERT INTO event_participants (event_id, user_id, seat_number)
      SELECT event_id, requester_user_id, seat_number FROM available_seat
      ON CONFLICT DO NOTHING
      RETURNING event_id, user_id
    )
    UPDATE join_requests AS request
    SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
    FROM inserted_participant
    WHERE request.id = ${requestId}::uuid
      AND request.event_id = inserted_participant.event_id
      AND request.requester_user_id = inserted_participant.user_id
    RETURNING request.id, request.skip_count
  `;
  return rows[0] ? { status: "accepted", skipCount: Number(rows[0].skip_count) } : null;
}
