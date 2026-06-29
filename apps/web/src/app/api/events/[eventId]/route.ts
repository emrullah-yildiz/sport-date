import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const sql = getDatabase();
  const result = await sql`
    WITH cancelled_event AS (
      UPDATE events
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${eventId}::uuid
        AND host_user_id = ${host.id}
        AND status IN ('draft', 'published')
      RETURNING id
    ), removed_participants AS (
      DELETE FROM event_participants
      USING cancelled_event
      WHERE event_participants.event_id = cancelled_event.id
    ), cancelled_requests AS (
      UPDATE join_requests AS request
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      FROM cancelled_event
      WHERE request.event_id = cancelled_event.id
        AND request.status IN ('pending', 'accepted')
    )
    SELECT id FROM cancelled_event
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "Event cannot be cancelled." }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    eventId,
    status: "cancelled",
    message: "Event cancelled. Active requests, seats, and room access are now closed.",
  });
}
