import { NextResponse } from "next/server";

import { addTeamFeedbackReply, setFeedbackStatus } from "@/lib/feedback";
import { isMemberFeedbackStatus, validateFeedbackComment } from "@/lib/feedback-thread";
import { isAuthorizedFeedbackAgent } from "@/lib/internal-agent-auth";

// PROTECTED internal endpoint — an authenticated agent/admin posts a team reply
// and/or changes a ticket's member-visible status (CX-20260704). Secret bearer,
// fails closed. This is what lets an AI agent triage + respond; members can never
// reach it. Both actions bump the member's in-app "heard" indicator and fire the
// DARK member-update email (a logged no-op until the owner enables delivery).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  if (!isAuthorizedFeedbackAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }
  const { ticketId } = await params;
  if (!UUID_PATTERN.test(ticketId)) return NextResponse.json({ error: "Feedback not found." }, { status: 404, headers: noStore });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }
  const payload = (body ?? {}) as { reply?: unknown; status?: unknown; authorId?: unknown };

  const hasReply = payload.reply !== undefined && payload.reply !== null;
  const hasStatus = payload.status !== undefined && payload.status !== null;
  if (!hasReply && !hasStatus) {
    return NextResponse.json({ error: "Provide a reply, a status, or both." }, { status: 400, headers: noStore });
  }
  if (hasStatus && !isMemberFeedbackStatus(payload.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400, headers: noStore });
  }

  let comment = null;
  let ticket = null;

  if (hasStatus) {
    ticket = await setFeedbackStatus(ticketId, payload.status as never);
    if (!ticket) return NextResponse.json({ error: "Feedback not found." }, { status: 404, headers: noStore });
  }
  if (hasReply) {
    const validation = validateFeedbackComment(payload.reply);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400, headers: noStore });
    const authorId = typeof payload.authorId === "string" ? payload.authorId : null;
    comment = await addTeamFeedbackReply(ticketId, authorId, validation.body);
    if (!comment) return NextResponse.json({ error: "Feedback not found." }, { status: 404, headers: noStore });
  }

  return NextResponse.json({ ok: true, ticket, comment }, { status: 200, headers: noStore });
}
