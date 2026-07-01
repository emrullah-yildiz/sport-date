import "server-only";

import crypto from "node:crypto";

import {
  peerFeedbackFlagsSafetyConcern,
  summarizeReceivedRatings,
  type PeerFeedbackInput,
  type PeerRatingAggregate,
} from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

// Short, self-explanatory edit window: a member can revise their own signal for a
// day after first leaving it, then it locks. Kept as a pure export so the rule is
// unit-tested and shared with any UI that needs to show "locked".
export const PEER_FEEDBACK_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Double-blind reveal window: a member sees a star they RECEIVED for an event only
// after they have submitted their own for that co-attendance, OR after this window
// passes since the giver left it — whichever comes first. The window blunts
// retaliation / quid-pro-quo (you can't peek before reciprocating) while still
// guaranteeing the rating eventually surfaces even if the recipient never rates
// back. Enforced server-side in the reveal query below.
export const PEER_FEEDBACK_REVEAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function peerFeedbackEditWindowOpen(firstSubmittedAt: string | Date, now: Date = new Date()): boolean {
  const submitted = firstSubmittedAt instanceof Date ? firstSubmittedAt : new Date(firstSubmittedAt);
  if (Number.isNaN(submitted.getTime())) return false;
  return now.getTime() - submitted.getTime() <= PEER_FEEDBACK_EDIT_WINDOW_MS;
}

export type PeerFeedbackTarget = Readonly<{
  userId: string;
  firstName: string;
  isHost: boolean;
  submitted: boolean;
  editable: boolean;
  given: {
    showedUp: PeerFeedbackInput["showedUp"];
    feltRespected: PeerFeedbackInput["feltRespected"];
    feltSafe: PeerFeedbackInput["feltSafe"];
    note: string | null;
    experienceStars: number | null;
  } | null;
}>;

type TargetRow = {
  user_id: string | number;
  first_name: string;
  is_host: boolean;
  showed_up: PeerFeedbackInput["showedUp"] | null;
  felt_respected: PeerFeedbackInput["feltRespected"] | null;
  felt_safe: PeerFeedbackInput["feltSafe"] | null;
  note: string | null;
  experience_stars: number | null;
  created_at: string | null;
};

// The co-attendees the viewer is eligible to leave a private signal for: the other
// people (participants + host) of an event both the viewer and that person attended,
// only after the event has ended, and only where no block exists in either
// direction. Returns [] for events the viewer did not attend, unrelated members, and
// events not yet ended — so the UI simply shows nothing to leave feedback about.
export async function getPeerFeedbackTargets(eventId: string, viewerId: string): Promise<PeerFeedbackTarget[]> {
  const sql = getDatabase();
  const rows = (await sql`
    WITH ended_event AS (
      SELECT events.id, events.host_user_id
      FROM events
      WHERE events.id = ${eventId}::uuid
        AND events.status IN ('published', 'completed')
        AND events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()
        -- The viewer must themselves have attended (participant or host).
        AND (
          events.host_user_id = ${viewerId}
          OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${viewerId})
        )
    ), co_attendees AS (
      -- Everyone who attended this event (participants + host) other than the viewer.
      SELECT event_participants.user_id, FALSE AS is_host
      FROM event_participants, ended_event
      WHERE event_participants.event_id = ended_event.id
        AND event_participants.user_id <> ${viewerId}
      UNION
      SELECT ended_event.host_user_id AS user_id, TRUE AS is_host
      FROM ended_event
      WHERE ended_event.host_user_id <> ${viewerId}
    )
    SELECT
      member.id AS user_id,
      member.first_name,
      co_attendees.is_host,
      given.showed_up, given.felt_respected, given.felt_safe, given.note, given.experience_stars, given.created_at
    FROM co_attendees
    JOIN users AS member ON member.id = co_attendees.user_id AND member.account_status = 'active'
    LEFT JOIN peer_feedback AS given
      ON given.event_id = ${eventId}::uuid
      AND given.from_user_id = ${viewerId}
      AND given.to_user_id = member.id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE (blocker_user_id = ${viewerId} AND blocked_user_id = member.id)
         OR (blocker_user_id = member.id AND blocked_user_id = ${viewerId})
    )
    ORDER BY co_attendees.is_host DESC, member.first_name
  `) as unknown as TargetRow[];

  return rows.map((row) => {
    const submitted = row.showed_up !== null && row.created_at !== null;
    return {
      userId: String(row.user_id),
      firstName: row.first_name,
      isHost: Boolean(row.is_host),
      submitted,
      editable: submitted ? peerFeedbackEditWindowOpen(row.created_at as string) : true,
      given: submitted
        ? {
            showedUp: row.showed_up as PeerFeedbackInput["showedUp"],
            feltRespected: row.felt_respected as PeerFeedbackInput["feltRespected"],
            feltSafe: row.felt_safe as PeerFeedbackInput["feltSafe"],
            note: row.note,
            experienceStars: row.experience_stars === null ? null : Number(row.experience_stars),
          }
        : null,
    };
  });
}

export type SavePeerFeedbackResult =
  | { ok: true; flaggedSafetyConcern: boolean; updated: boolean }
  | { ok: false; reason: "not_eligible" | "locked" };

// Persist a private signal, re-checking every gate inside the write so nothing can
// be forged by a crafted request: the event must have ended, both the giver and the
// recipient must have co-attended it, they must not be blocked in either direction,
// the giver cannot target themselves, and any existing row must still be inside the
// edit window. One row per (event, from, to) is enforced by the unique index; a
// second submission inside the window updates, after the window it is rejected.
export async function savePeerFeedback(
  eventId: string,
  fromUserId: string,
  toUserId: string,
  input: PeerFeedbackInput,
): Promise<SavePeerFeedbackResult> {
  if (String(fromUserId) === String(toUserId)) return { ok: false, reason: "not_eligible" };
  const sql = getDatabase();
  const flagged = peerFeedbackFlagsSafetyConcern(input);
  const id = crypto.randomUUID();

  const rows = (await sql`
    WITH eligible AS (
      SELECT events.id
      FROM events
      WHERE events.id = ${eventId}::uuid
        AND events.status IN ('published', 'completed')
        AND events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()
        -- Giver co-attended (participant or host).
        AND (
          events.host_user_id = ${fromUserId}
          OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${fromUserId})
        )
        -- Recipient co-attended (participant or host).
        AND (
          events.host_user_id = ${toUserId}
          OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${toUserId})
        )
        -- No block in either direction.
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = ${fromUserId} AND blocked_user_id = ${toUserId})
             OR (blocker_user_id = ${toUserId} AND blocked_user_id = ${fromUserId})
        )
        -- Recipient account still active.
        AND EXISTS (SELECT 1 FROM users WHERE id = ${toUserId} AND account_status = 'active')
    ), existing AS (
      SELECT created_at FROM peer_feedback
      WHERE event_id = ${eventId}::uuid AND from_user_id = ${fromUserId} AND to_user_id = ${toUserId}
    ), locked AS (
      -- A prior row outside the 24h edit window blocks any further change.
      SELECT 1 FROM existing
      WHERE created_at + INTERVAL '24 hours' < NOW()
    ), upserted AS (
      INSERT INTO peer_feedback (id, event_id, from_user_id, to_user_id, showed_up, felt_respected, felt_safe, note, experience_stars, flagged_safety_concern)
      SELECT ${id}::uuid, eligible.id, ${fromUserId}, ${toUserId},
        ${input.showedUp}, ${input.feltRespected}, ${input.feltSafe}, ${input.note}, ${input.experienceStars}, ${flagged}
      FROM eligible
      WHERE NOT EXISTS (SELECT 1 FROM locked)
      ON CONFLICT (event_id, from_user_id, to_user_id) DO UPDATE SET
        showed_up = EXCLUDED.showed_up,
        felt_respected = EXCLUDED.felt_respected,
        felt_safe = EXCLUDED.felt_safe,
        note = EXCLUDED.note,
        experience_stars = EXCLUDED.experience_stars,
        flagged_safety_concern = EXCLUDED.flagged_safety_concern,
        updated_at = NOW()
      RETURNING (xmax <> 0) AS updated
    )
    SELECT
      (SELECT 1 FROM eligible) AS eligible,
      (SELECT 1 FROM locked) AS locked,
      (SELECT updated FROM upserted) AS updated
  `) as unknown as Array<{ eligible: number | null; locked: number | null; updated: boolean | null }>;

  const result = rows[0];
  if (!result || result.eligible === null) return { ok: false, reason: "not_eligible" };
  if (result.locked !== null && result.updated === null) return { ok: false, reason: "locked" };
  return { ok: true, flaggedSafetyConcern: flagged, updated: Boolean(result.updated) };
}

// The recipient's OWN received experience rating, as a privacy-preserving aggregate.
//
// DOUBLE-BLIND, enforced here in SQL: a star another member gave `userId` for an
// event only counts toward the aggregate once EITHER the recipient has submitted
// their own peer feedback for that same event (reciprocated), OR the giver's row is
// older than the reveal window. Until one of those holds, the received star is
// invisible — the recipient cannot peek before reciprocating, blunting retaliation.
//
// The result is an aggregate AVERAGE only, gated at ≥3 revealed ratings; below that
// the recipient sees a calm "not enough ratings yet" state with no partial number.
// Individual stars, who gave them, and (below the threshold) any count are NEVER
// returned. This function is recipient-scoped by construction: it only ever reads
// rows where `to_user_id = ${userId}`, and nothing here is reachable for another
// member or a public profile.
export async function getReceivedRatingAggregate(userId: string): Promise<PeerRatingAggregate> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT received.experience_stars
    FROM peer_feedback AS received
    WHERE received.to_user_id = ${userId}
      AND received.experience_stars IS NOT NULL
      AND (
        -- Reciprocated: the recipient left their own feedback for the same event.
        EXISTS (
          SELECT 1 FROM peer_feedback AS mine
          WHERE mine.event_id = received.event_id
            AND mine.from_user_id = ${userId}
        )
        -- Or the reveal window (14 days) has passed since the star was given.
        OR received.created_at + INTERVAL '14 days' <= NOW()
      )
  `) as unknown as Array<{ experience_stars: number | string | null }>;

  const revealedStars = rows
    .map((row) => (row.experience_stars === null ? Number.NaN : Number(row.experience_stars)))
    .filter((value) => !Number.isNaN(value));
  return summarizeReceivedRatings(revealedStars);
}
