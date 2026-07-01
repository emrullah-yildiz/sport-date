import { validateEventMessage } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getEventMessages, postEventMessage } from "@/lib/event-messages";
import { enforceRateLimit, eventMessageRateLimitRules } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Read the event-room chat thread. Authorized to the host + accepted
// participants only; any other viewer gets 403 (the lib returns null and never
// discloses whether messages exist).
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const messages = await getEventMessages(eventId, user.id);
  if (messages === null) {
    return NextResponse.json(
      { error: "Only the host and accepted participants can read this room's chat." },
      { status: 403 },
    );
  }
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

// Post a chat message. Same-origin/CSRF guard, auth, per-user + per-IP
// rate-limit, then the empty/length-cap validation, then a server-side
// authorization re-check inside the lib before the row is written.
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const limited = await enforceRateLimit(
    "events:messages",
    eventMessageRateLimitRules(request, user.id),
    "You are sending messages too quickly. Please wait a moment.",
  );
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateEventMessage(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  const message = await postEventMessage(eventId, user.id, validation.body);
  if (!message) {
    return NextResponse.json(
      { error: "Only the host and accepted participants can post to this room's chat." },
      { status: 403 },
    );
  }
  return NextResponse.json({ message }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
