import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId, requestId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  let action = "";
  try {
    const body = await request.json();
    action = typeof body?.action === "string" ? body.action : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (action !== "accept" && action !== "skip") return NextResponse.json({ error: "Choose accept or skip." }, { status: 400 });
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
        AND request.event_id = events.id AND events.host_user_id = ${host.id}
        AND request.status = 'pending'
      RETURNING request.status, request.skip_count
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Request cannot be skipped." }, { status: 409 });
    return NextResponse.json({ success: true, status: rows[0].status, skipCount: rows[0].skip_count });
  }

  const rows = await sql`
    WITH eligible_request AS (
      SELECT request.id, request.event_id, request.requester_user_id, events.capacity
      FROM join_requests AS request
      JOIN events ON events.id = request.event_id
      JOIN users AS requester ON requester.id = request.requester_user_id AND requester.account_status = 'active'
      WHERE request.id = ${requestId}::uuid AND request.event_id = ${eventId}::uuid
        AND request.status = 'pending' AND events.host_user_id = ${host.id}
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
    RETURNING request.id
  `;
  if (rows.length === 0) return NextResponse.json({ error: "No place is available or the request is no longer eligible." }, { status: 409 });
  return NextResponse.json({ success: true, status: "accepted" });
}

