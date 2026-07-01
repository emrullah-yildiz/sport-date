import { validatePeerFeedback } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { savePeerFeedback } from "@/lib/peer-feedback";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_ID_PATTERN = /^[0-9]{1,19}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; participantId: string }> },
) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId, participantId } = await params;
  if (!UUID_PATTERN.test(eventId) || !USER_ID_PATTERN.test(participantId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validatePeerFeedback(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const saved = await savePeerFeedback(eventId, user.id, participantId, validation.data);
  if (!saved.ok) {
    if (saved.reason === "locked") {
      return NextResponse.json({ error: "This feedback is locked. The short edit window has passed." }, { status: 409 });
    }
    // Deliberately vague: never reveal whether the person exists or co-attended, so
    // this endpoint can't be used to probe who attended an event.
    return NextResponse.json({ error: "Feedback opens only for people you attended this event with, after it ends." }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    updated: saved.updated,
    // The signal is private: we never echo a score or aggregate. We only confirm it
    // was recorded, and, if a concern was raised, point to the real safety path.
    message: saved.flaggedSafetyConcern
      ? "Thanks — recorded privately. If something felt wrong, please also use Report or Block above; this note is not a safety report."
      : "Thanks — recorded privately. It is never shown on their profile or as a public score.",
    safetyConcern: saved.flaggedSafetyConcern,
  });
}
