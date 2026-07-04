import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isOwnerEmail } from "@/lib/owner";
import { getCurrentUser } from "@/lib/session";
import { decideSocialIdea, isValidSocialIdeaId, type SocialIdeaDecision } from "@/lib/social-ideas";

// OWNER-GATED decision on a single idea (CX-20260705-social-content-approval-queue).
// Body { action?: 'approve'|'deny', comment?: string }. Approve/deny sets status
// + decided_at; a comment alone updates owner_comment. Reuses the session helper
// (no new auth) + the OWNER_EMAILS allow-list.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const MAX_COMMENT = 4000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in as the owner." }, { status: 401, headers: noStore });
  }
  if (!isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Owner access only." }, { status: 403, headers: noStore });
  }

  const { id } = await params;
  if (!isValidSocialIdeaId(id)) {
    return NextResponse.json({ error: "Idea not found." }, { status: 404, headers: noStore });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }
  const payload = (body ?? {}) as { action?: unknown; comment?: unknown };

  const hasAction = payload.action !== undefined && payload.action !== null;
  if (hasAction && payload.action !== "approve" && payload.action !== "deny") {
    return NextResponse.json({ error: "action must be 'approve' or 'deny'." }, { status: 400, headers: noStore });
  }

  const hasComment = payload.comment !== undefined;
  if (hasComment && typeof payload.comment !== "string") {
    return NextResponse.json({ error: "comment must be a string." }, { status: 400, headers: noStore });
  }
  const comment = hasComment ? (payload.comment as string) : undefined;
  if (comment !== undefined && comment.length > MAX_COMMENT) {
    return NextResponse.json({ error: `comment must be at most ${MAX_COMMENT} characters.` }, { status: 400, headers: noStore });
  }

  if (!hasAction && !hasComment) {
    return NextResponse.json({ error: "Provide an action, a comment, or both." }, { status: 400, headers: noStore });
  }

  const decision: SocialIdeaDecision = {
    ...(hasAction ? { action: payload.action as "approve" | "deny" } : {}),
    ...(hasComment ? { comment } : {}),
  };

  try {
    const idea = await decideSocialIdea(id, decision);
    if (!idea) return NextResponse.json({ error: "Idea not found." }, { status: 404, headers: noStore });
    return NextResponse.json({ ok: true, idea }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social idea decision failed:", error);
    return NextResponse.json({ error: "Social idea decision failed." }, { status: 500, headers: noStore });
  }
}
