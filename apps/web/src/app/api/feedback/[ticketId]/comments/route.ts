import { NextResponse } from "next/server";

import { addMemberFeedbackComment } from "@/lib/feedback";
import { validateFeedbackComment } from "@/lib/feedback-thread";
import { enforceRateLimit, feedbackCommentRateLimitRules } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const privateHeaders = { "Cache-Control": "no-store" };

// The submitter posts a reply to their OWN feedback ticket
// (CX-20260704-feature-member-feedback-tracking-threads). Same-origin/CSRF guard,
// auth, rate limit, then ownership is enforced inside the lib (a non-owner gets a
// 404 with no content). A member can NEVER post as the team here.
export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: privateHeaders });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  const { ticketId } = await params;
  if (!UUID_PATTERN.test(ticketId)) return NextResponse.json({ error: "Feedback not found." }, { status: 404, headers: privateHeaders });

  const limited = await enforceRateLimit(
    "feedback:comments",
    feedbackCommentRateLimitRules(request, user.id),
    "You are replying too quickly. Please wait a moment.",
  );
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders }); }
  const validation = validateFeedbackComment(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400, headers: privateHeaders });

  const comment = await addMemberFeedbackComment(ticketId, user.id, validation.body);
  if (!comment) return NextResponse.json({ error: "Feedback not found." }, { status: 404, headers: privateHeaders });
  return NextResponse.json({ comment }, { status: 201, headers: privateHeaders });
}
