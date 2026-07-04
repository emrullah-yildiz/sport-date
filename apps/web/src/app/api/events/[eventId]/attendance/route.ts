import { NextResponse } from "next/server";

import { cancelAttendanceByMember, confirmAttendanceByMember } from "@/lib/attendance-confirmations";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

// In-app (authenticated) attendance confirm/cancel for the viewer's OWN
// membership — CX-20260704. Same-origin/CSRF guard + auth; the action affects
// only the caller's own place. Cancel releases the seat.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const action = (body as { action?: unknown }).action;
  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const result = action === "confirm"
    ? await confirmAttendanceByMember(eventId, user.id, new Date())
    : await cancelAttendanceByMember(eventId, user.id, new Date());

  if (result === "invalid" || result === "expired") {
    return NextResponse.json({ error: "This attendance prompt is no longer available." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
}
