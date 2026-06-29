import { NextResponse } from "next/server";

import { cancelEventJoinRequest } from "@/lib/join-requests";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { eventId, requestId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (!await cancelEventJoinRequest(eventId, requestId, session.user.id)) {
    return NextResponse.json({ error: "Request cannot be cancelled. Its state may already have changed." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ success: true, status: "cancelled" }, { headers: { "Cache-Control": "no-store" } });
}
