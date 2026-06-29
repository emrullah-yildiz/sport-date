import crypto from "node:crypto";

import "server-only";

import { getDatabase } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EventUpdateAttendanceIntent = "still_in" | "unsure" | "cannot_make";

export async function saveEventUpdateAttendanceIntent(
  eventId: string,
  updateId: string,
  userId: string,
  response: EventUpdateAttendanceIntent,
): Promise<boolean> {
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(updateId)) return false;

  const sql = getDatabase();
  const rows = await sql`
    WITH accessible_update AS (
      SELECT notice.id
      FROM event_update_notices AS notice
      JOIN events ON events.id = notice.event_id
      WHERE notice.id = ${updateId}::uuid
        AND notice.event_id = ${eventId}::uuid
        AND notice.severity = 'critical'
        AND events.status IN ('published', 'completed')
        AND EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = events.id AND user_id = ${userId}
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = ${userId} AND blocked_user_id = events.host_user_id)
             OR (blocker_user_id = events.host_user_id AND blocked_user_id = ${userId})
        )
    )
    INSERT INTO event_update_attendance_intents (id, notice_id, participant_user_id, response, responded_at)
    SELECT ${crypto.randomUUID()}::uuid, accessible_update.id, ${userId}, ${response}, NOW()
    FROM accessible_update
    ON CONFLICT (notice_id, participant_user_id)
    DO UPDATE SET response = EXCLUDED.response, responded_at = NOW()
    RETURNING notice_id
  `;

  return rows.length > 0;
}
