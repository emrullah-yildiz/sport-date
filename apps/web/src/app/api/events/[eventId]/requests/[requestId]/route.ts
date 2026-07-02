import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { cancelEventJoinRequest } from "@/lib/join-requests";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  // Everything runs inside the guard so a thrown error (a DB failure like the
  // missing exit_reason/exit_note columns that took cancel/leave down, or any
  // other unexpected throw) can NEVER escape as a raw empty-body 500 that leaves
  // the member's button stuck on "Cancelling…". Every exit returns a calm JSON
  // body the client can read; internals/stack/PII are only logged server-side.
  try {
    if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
    const requester = await getCurrentUser();
    if (!requester) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { eventId, requestId } = await params;
    if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404 });

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

    if (!await cancelEventJoinRequest(eventId, requestId, requester.id, exit)) return NextResponse.json({ error: "Request cannot be cancelled." }, { status: 409 });
    return NextResponse.json({ success: true, status: "cancelled" });
  } catch (error) {
    // Distinguish a not-yet-connected database (a transient, retryable condition)
    // from an unexpected failure, but never leak details to the member. The log
    // is server-side only and deliberately carries no event/request/user IDs.
    if (error instanceof DatabaseNotConfiguredError) {
      console.error("Cancel join request failed: database not configured");
      return NextResponse.json({ error: "We couldn't reach the service just now. Your place is unchanged — please try again." }, { status: 503 });
    }
    console.error("Cancel join request failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't complete that just now. Your place is unchanged — please try again." }, { status: 500 });
  }
}
