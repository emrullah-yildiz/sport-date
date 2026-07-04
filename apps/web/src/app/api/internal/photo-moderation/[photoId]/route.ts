import { NextResponse } from "next/server";

import { isAuthorizedModerationAgent } from "@/lib/internal-agent-auth";
import { setPhotoModerationStatus } from "@/lib/photos";

// PROTECTED internal endpoint — resolve a profile photo held for review
// (CX-20260704-feature-image-moderation-nudity-block). A moderator/agent posts
// { action: "approve" | "reject" }. Secret bearer, fails closed; members can
// never reach it. Approve makes the photo visible to others; reject hides it and
// deletes its blob. This is the human-review resolution for the queue.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  if (!isAuthorizedModerationAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }
  const { photoId } = await params;
  if (!UUID_PATTERN.test(photoId)) return NextResponse.json({ error: "Photo not found." }, { status: 404, headers: noStore });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }
  const action = (body as { action?: unknown }).action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400, headers: noStore });
  }

  const ok = await setPhotoModerationStatus(photoId, action);
  if (!ok) return NextResponse.json({ error: "Photo not found." }, { status: 404, headers: noStore });
  return NextResponse.json({ ok: true, action }, { status: 200, headers: noStore });
}
