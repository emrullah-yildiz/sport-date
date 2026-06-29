import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId, requestId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const sql = getDatabase();
  const rows = await sql`
    WITH removed_seat AS (
      DELETE FROM event_participants
      WHERE event_id = ${eventId}::uuid AND user_id = ${requester.id}
    )
    UPDATE join_requests
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = ${requestId}::uuid AND event_id = ${eventId}::uuid
      AND requester_user_id = ${requester.id} AND status IN ('pending', 'accepted')
    RETURNING id
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Request cannot be cancelled." }, { status: 409 });
  return NextResponse.json({ success: true, status: "cancelled" });
}

