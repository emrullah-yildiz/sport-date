import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let introduction = "";
  try {
    const body = await request.json();
    introduction = typeof body?.introduction === "string" ? body.introduction.trim() : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (introduction.length > 500) return NextResponse.json({ error: "Introduction must be 500 characters or fewer." }, { status: 400 });

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
  if (rows.length === 0) return NextResponse.json({ error: "This event is not available for a new request." }, { status: 409 });
  return NextResponse.json({ success: true, requestId, status: "pending" }, { status: 201 });
}

