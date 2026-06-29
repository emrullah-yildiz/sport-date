import "server-only";

import type { EventReflectionInput } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

export async function saveEventReflection(eventId: string, userId: string, reflection: EventReflectionInput) {
  const sql = getDatabase();
  const rows = await sql`
    WITH eligible_event AS (
      SELECT id FROM events
      WHERE id = ${eventId}::uuid AND status IN ('published', 'completed')
        AND starts_at + (duration_minutes * INTERVAL '1 minute') <= NOW()
        AND (
          (host_user_id = ${userId} AND EXISTS (
            SELECT 1 FROM event_participants WHERE event_id = events.id
          ))
          OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${userId})
        )
      FOR UPDATE
    ), completed_event AS (
      UPDATE events SET status = 'completed', updated_at = NOW()
      WHERE id IN (SELECT id FROM eligible_event) AND status = 'published'
      RETURNING id
    ), saved_reflection AS (
      INSERT INTO event_reflections (event_id, user_id, attendance, would_join_again, qualified_for_progress)
      SELECT id, ${userId}, ${reflection.attendance}, ${reflection.wouldJoinAgain}, TRUE
      FROM eligible_event
      ON CONFLICT (event_id, user_id) DO UPDATE SET
        attendance = EXCLUDED.attendance,
        would_join_again = EXCLUDED.would_join_again,
        qualified_for_progress = TRUE,
        updated_at = NOW()
      RETURNING event_id, attendance, would_join_again
    )
    SELECT event_id, attendance, would_join_again FROM saved_reflection
  `;
  const row = rows[0];
  return row ? { eventId: String(row.event_id), attendance: row.attendance, wouldJoinAgain: row.would_join_again } : null;
}

