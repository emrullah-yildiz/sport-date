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
      AND compatible_sport.skill_level = ANY(events.experience_levels)
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

