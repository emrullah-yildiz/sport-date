import { NextResponse } from "next/server";

import { cancelFailureResponse } from "@/lib/cancel-response";
import { cancelEventJoinRequest } from "@/lib/join-requests";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  // Everything runs inside the guard so a thrown error (a DB failure like the missing
  // exit_reason/exit_note columns that took cancel/leave down, or any other unexpected
  // throw) can NEVER escape as a raw empty-body 500 that leaves a mobile client with no
  // readable recovery message. This mirrors the hardened web route via the shared
  // cancelFailureResponse contract so the two surfaces can't drift apart.
  try {
    const session = await getMobileSession(request);
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { eventId, requestId } = await params;
    if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

    // The optional, PRIVATE graceful-exit reason. Parsed best-effort: a missing or
    // malformed body must never stop a member from leaving, so any failure falls back
    // to an unspecified exit. The reason is normalized in the data layer.
    let exit: { reason?: unknown; note?: unknown } | null = null;
    try {
      const body = await request.json();
      if (body && typeof body === "object") exit = { reason: (body as Record<string, unknown>).reason, note: (body as Record<string, unknown>).note };
    } catch {
      exit = null;
    }

    if (!await cancelEventJoinRequest(eventId, requestId, session.user.id, exit)) {
      return NextResponse.json({ error: "Request cannot be cancelled. Its state may already have changed." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ success: true, status: "cancelled" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return cancelFailureResponse(error);
  }
}
