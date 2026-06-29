import { NextResponse } from "next/server";

import { getEventRoom, getHostJoinRequests } from "@/lib/events";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event room not found." }, { status: 404 });
  const room = await getEventRoom(eventId, session.user.id);
  if (!room) return NextResponse.json({ error: "Event room not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const hostRequests = room.isHost ? await getHostJoinRequests(eventId, session.user.id) : [];
  return NextResponse.json({ room: { ...room, viewerUserId: session.user.id, hostRequests } }, { headers: { "Cache-Control": "no-store" } });
}
