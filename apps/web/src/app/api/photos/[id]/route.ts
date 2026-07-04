import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { readProfilePhoto } from "@/lib/photo-storage";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Authenticated image serve route. Photo bytes live in a PRIVATE Vercel Blob store
// and are NEVER exposed via a public/guessable URL — the only way to fetch them is
// through this route, which requires a signed-in member. An unauthenticated request
// gets 401 (not the image), so photos cannot be scraped anonymously.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const sql = getDatabase();
  // Resolve the photo id to its private blob pathname. A viewer must not be blocked
  // by the photo's owner (and vice versa); otherwise any authenticated member may
  // view a member's profile photos in-app. AND a non-owner may only fetch an
  // APPROVED photo — a pending (awaiting image screening) or rejected photo is
  // served only to its own owner, never to other members
  // (CX-20260704-feature-image-moderation-nudity-block).
  const rows = (await sql`
    SELECT blob_pathname FROM profile_photos AS photo
    WHERE photo.id = ${id}::uuid
      AND (photo.user_id = ${viewer.id} OR photo.moderation_status = 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = ${viewer.id} AND blocked_user_id = photo.user_id)
           OR (blocker_user_id = photo.user_id AND blocked_user_id = ${viewer.id})
      )
  `) as unknown as Array<{ blob_pathname: string }>;
  const pathname = rows[0]?.blob_pathname;
  if (!pathname) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const streamed = await readProfilePhoto(pathname);
  if (!streamed.ok) {
    if (streamed.reason === "not-configured") {
      return NextResponse.json({ error: "Photos aren’t available yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  return new NextResponse(streamed.stream, {
    status: 200,
    headers: {
      "Content-Type": streamed.contentType,
      // Private, per-member content: never shared/CDN-cached, never indexed.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
