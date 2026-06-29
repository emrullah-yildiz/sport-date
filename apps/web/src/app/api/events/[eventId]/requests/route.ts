import { NextResponse } from "next/server";

import { createEventJoinRequest } from "@/lib/join-requests";
import { enforceRateLimit, joinRequestRateLimitRules } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limited = await enforceRateLimit(
    "events:join-request",
    joinRequestRateLimitRules(request, requester.id),
    "Too many join requests in a short period. Please wait before trying again.",
  );
  if (limited) return limited;
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

  const created = await createEventJoinRequest(eventId, requester, introduction);
  if (!created) return NextResponse.json({ error: "This event is not available for a new request." }, { status: 409 });
  return NextResponse.json({ success: true, ...created }, { status: 201 });
}
