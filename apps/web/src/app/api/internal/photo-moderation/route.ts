import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedModerationAgent } from "@/lib/internal-agent-auth";
import { listPendingPhotosForModeration } from "@/lib/photos";

// PROTECTED internal endpoint — the pending photo queue for the photo-moderation
// agent (CX-20260704-photo-review-agent-access). Secret bearer
// (MODERATION_AGENT_SECRET), fails closed. Returns ids + minimal metadata only,
// no image bytes and no member PII beyond the internal member id. Members can
// never reach it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedModerationAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const photos = await listPendingPhotosForModeration();
    return NextResponse.json({ photos }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Pending photo-moderation list failed:", error);
    return NextResponse.json({ error: "Pending photo list failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
