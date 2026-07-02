import { NextResponse } from "next/server";

import { cancelEventJoinRequest } from "@/lib/join-requests";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
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
}
