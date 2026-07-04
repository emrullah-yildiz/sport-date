import { NextResponse } from "next/server";

import { isAuthorizedModerationAgent } from "@/lib/internal-agent-auth";
import { readProfilePhoto } from "@/lib/photo-storage";
import { getPhotoBlobForModeration } from "@/lib/photos";

// PROTECTED internal endpoint — stream a photo's bytes to the photo-moderation
// agent so it can VIEW a pending image before deciding
// (CX-20260704-photo-review-agent-access). Secret bearer
// (MODERATION_AGENT_SECRET), fails closed. This is the ONLY non-owner way to
// fetch a pending image; the public serve route still gates on `approved`, so a
// pending image is never publicly viewable. Bytes are streamed straight through
// and never logged.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  if (!isAuthorizedModerationAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const { photoId } = await params;
  if (!UUID_PATTERN.test(photoId)) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const photo = await getPhotoBlobForModeration(photoId);
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const streamed = await readProfilePhoto(photo.pathname);
  if (!streamed.ok) {
    if (streamed.reason === "not-configured") {
      return NextResponse.json({ error: "Photo storage is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Photo not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return new NextResponse(streamed.stream, {
    status: 200,
    headers: {
      "Content-Type": streamed.contentType,
      // Sensitive, agent-only review bytes: never cached, never indexed.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
