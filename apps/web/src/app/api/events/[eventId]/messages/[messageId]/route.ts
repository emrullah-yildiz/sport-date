import { NextResponse } from "next/server";

import { deleteOwnEventMessage } from "@/lib/event-messages";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Soft-delete the viewer's OWN chat message (CX-20260704-feature-event-group-chat).
// Same-origin/CSRF guard, auth, then ownership+access enforced in the lib. Only
// the original sender can remove their message; there is no delete-for-everyone
// or edit — reporting is the path for someone else's message.
export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; messageId: string }> }) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId, messageId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(messageId)) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const deleted = await deleteOwnEventMessage(eventId, messageId, user.id);
  if (!deleted) {
    // Uniform 404 whether the message is missing, already deleted, or not the
    // caller's — never disclose another member's message state.
    return NextResponse.json({ error: "You can only delete your own message." }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
