import { NextResponse } from "next/server";

import { saveEventUpdateAttendanceIntent, type EventUpdateAttendanceIntent } from "@/lib/event-update-intents";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTENTS: readonly EventUpdateAttendanceIntent[] = ["still_in", "unsure", "cannot_make"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; updateId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { eventId, updateId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(updateId)) return NextResponse.json({ error: "Update not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const response = typeof (body as Record<string, unknown> | null)?.response === "string"
    ? (body as Record<string, string>).response
    : "";
  if (!INTENTS.includes(response as EventUpdateAttendanceIntent)) {
    return NextResponse.json({ error: "Choose a valid attendance response." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!await saveEventUpdateAttendanceIntent(eventId, updateId, session.user.id, response as EventUpdateAttendanceIntent)) {
    return NextResponse.json({ error: "Attendance response could not be saved." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ success: true, response }, { headers: { "Cache-Control": "no-store" } });
}
