import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { clearSessionCookie, getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type PasswordRow = { password_hash: string };

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!password || password.length > 1024) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }

  const sql = getDatabase();
  const credentials = await sql`
    SELECT password_hash FROM users WHERE id = ${user.id} AND account_status = 'active'
  ` as unknown as PasswordRow[];
  if (!credentials[0] || !(await verifyPassword(password, credentials[0].password_hash))) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
  }

  const requestId = crypto.randomUUID();
  const requests = await sql`
    WITH new_request AS (
      INSERT INTO data_requests (id, user_id, request_type, status)
      VALUES (${requestId}::uuid, ${user.id}, 'deletion', 'pending')
      ON CONFLICT DO NOTHING
      RETURNING id, user_id
    ), updated_user AS (
      UPDATE users
      SET account_status = 'deletion_pending', deletion_requested_at = NOW(), updated_at = NOW()
      FROM new_request
      WHERE users.id = new_request.user_id AND users.account_status = 'active'
      RETURNING users.id
    ), cancelled_hosted_events AS (
      UPDATE events SET status = 'cancelled', updated_at = NOW()
      FROM updated_user
      WHERE events.host_user_id = updated_user.id AND events.status IN ('draft', 'published')
    ), removed_participation AS (
      DELETE FROM event_participants
      USING updated_user
      WHERE event_participants.user_id = updated_user.id
    ), cancelled_join_requests AS (
      UPDATE join_requests SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      FROM updated_user
      WHERE join_requests.requester_user_id = updated_user.id
        AND join_requests.status IN ('pending', 'accepted')
    ), revoked_sessions AS (
      DELETE FROM sessions
      USING updated_user
      WHERE sessions.user_id = updated_user.id
    )
    SELECT id FROM new_request
  `;

  if (requests.length === 0) {
    return NextResponse.json({ error: "A deletion request is already pending." }, { status: 409 });
  }

  const response = NextResponse.json({
    success: true,
    requestId,
    message: "Your profile is locked and the deletion request is pending review.",
  });
  clearSessionCookie(response);
  return response;
}
