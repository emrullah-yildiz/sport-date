import "server-only";

import crypto from "node:crypto";

import { getDatabase } from "@/lib/db";

export async function createEventJoinRequest(eventId: string, requester: { id: string; age: number }, introduction: string) {
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
      AND EXISTS (SELECT 1 FROM UNNEST(candidate.languages) AS language WHERE LOWER(language) = LOWER(events.language))
      AND (SELECT COUNT(*) FROM event_participants WHERE event_id = events.id) < events.capacity
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = candidate.id AND blocked_user_id = events.host_user_id)
           OR (blocker_user_id = events.host_user_id AND blocked_user_id = candidate.id)
      )
    ON CONFLICT (event_id, requester_user_id) DO NOTHING
    RETURNING id, status
  `;
  return rows.length > 0 ? { requestId, status: "pending" as const } : null;
}

export async function cancelEventJoinRequest(eventId: string, requestId: string, requesterId: string) {
  const sql = getDatabase();
  const rows = await sql`
    WITH removed_seat AS (
      DELETE FROM event_participants
      WHERE event_id = ${eventId}::uuid AND user_id = ${requesterId}
    )
    UPDATE join_requests
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = ${requestId}::uuid AND event_id = ${eventId}::uuid
      AND requester_user_id = ${requesterId} AND status IN ('pending', 'accepted')
    RETURNING id
  `;
  return rows.length > 0;
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
