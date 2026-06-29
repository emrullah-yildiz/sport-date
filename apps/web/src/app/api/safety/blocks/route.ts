import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const USER_ID_PATTERN = /^\d+$/;

async function readTarget(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.blockedUserId === "string" && USER_ID_PATTERN.test(body.blockedUserId) ? body.blockedUserId : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const targetId = await readTarget(request);
  if (!targetId || targetId === user.id) return NextResponse.json({ error: "Choose a valid member to block." }, { status: 400 });

  const sql = getDatabase();
  const results = await sql.transaction((transaction) => [
    transaction`
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
      SELECT ${user.id}, id FROM users WHERE id = ${targetId} AND account_status = 'active'
      ON CONFLICT DO NOTHING RETURNING blocked_user_id
    `,
    transaction`
      DELETE FROM event_participants AS participant
      USING events
      WHERE participant.event_id = events.id
        AND ((events.host_user_id = ${user.id} AND participant.user_id = ${targetId})
          OR (events.host_user_id = ${targetId} AND participant.user_id = ${user.id}))
    `,
    transaction`
      UPDATE join_requests AS request
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      FROM events
      WHERE request.event_id = events.id AND request.status IN ('pending', 'accepted')
        AND ((events.host_user_id = ${user.id} AND request.requester_user_id = ${targetId})
          OR (events.host_user_id = ${targetId} AND request.requester_user_id = ${user.id}))
    `,
  ]);
  if (results[0].length === 0) {
    const existing = await sql`SELECT 1 FROM user_blocks WHERE blocker_user_id = ${user.id} AND blocked_user_id = ${targetId}`;
    if (existing.length === 0) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: "Member blocked. Shared requests, places, and room access were removed." });
}

export async function DELETE(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const targetId = await readTarget(request);
  if (!targetId) return NextResponse.json({ error: "Choose a valid member to unblock." }, { status: 400 });
  await getDatabase()`DELETE FROM user_blocks WHERE blocker_user_id = ${user.id} AND blocked_user_id = ${targetId}`;
  return NextResponse.json({ success: true, message: "Member unblocked. Previous requests and places are not restored." });
}

