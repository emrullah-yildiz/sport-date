import { NextResponse } from "next/server";

import { createEventJoinRequest } from "@/lib/join-requests";
import { getMobileSession } from "@/lib/mobile-session";
import { enforceRateLimit, joinRequestRateLimitRules } from "@/lib/rate-limit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const limited = await enforceRateLimit(
    "mobile:events:join-request",
    joinRequestRateLimitRules(request, session.user.id),
    "Too many join requests in a short period. Please wait before trying again.",
  );
  if (limited) return limited;
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  let introduction = "";
  try {
    const body = await request.json();
    introduction = typeof body?.introduction === "string" ? body.introduction.trim() : "";
  } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (introduction.length > 500) return NextResponse.json({ error: "Introduction must be 500 characters or fewer." }, { status: 400 });
  const created = await createEventJoinRequest(eventId, session.user, introduction);
  if (!created) return NextResponse.json({ error: "This event is no longer available for a new request." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ success: true, ...created }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
