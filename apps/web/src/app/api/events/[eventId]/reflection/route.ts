import { validateEventReflection } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateEventReflection(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const sql = getDatabase();
  const rows = await sql`
    WITH eligible_event AS (
      SELECT id FROM events
      WHERE id = ${eventId}::uuid AND status IN ('published', 'completed')
        AND starts_at + (duration_minutes * INTERVAL '1 minute') <= NOW()
        AND (
          (host_user_id = ${user.id} AND EXISTS (
            SELECT 1 FROM event_participants WHERE event_id = events.id
          ))
          OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${user.id})
        )
      FOR UPDATE
    ), completed_event AS (
      UPDATE events SET status = 'completed', updated_at = NOW()
      WHERE id IN (SELECT id FROM eligible_event) AND status = 'published'
      RETURNING id
    ), saved_reflection AS (
      INSERT INTO event_reflections (event_id, user_id, attendance, would_join_again, qualified_for_progress)
      SELECT id, ${user.id}, ${validation.data.attendance}, ${validation.data.wouldJoinAgain}, TRUE
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
  if (rows.length === 0) return NextResponse.json({ error: "Reflection opens after the event ends for hosts and accepted participants." }, { status: 409 });
  return NextResponse.json({ success: true, attendance: rows[0].attendance, wouldJoinAgain: rows[0].would_join_again });
}
