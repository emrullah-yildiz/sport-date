import { NextResponse } from "next/server";

import { markEventUpdateSeen } from "@/lib/event-update-receipts";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; updateId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { eventId, updateId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(updateId)) return NextResponse.json({ error: "Update not found." }, { status: 404 });

  if (!await markEventUpdateSeen(eventId, updateId, session.user.id)) {
    return NextResponse.json({ error: "Update cannot be marked seen." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ success: true, status: "seen" }, { headers: { "Cache-Control": "no-store" } });
}
