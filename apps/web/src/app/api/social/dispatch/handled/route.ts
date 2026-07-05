import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedSocialAgent } from "@/lib/internal-agent-auth";
import { markDispatchHandled } from "@/lib/social-dispatch";

// Mark a dispatch request handled (CX-20260705-social-dispatch-trigger).
//
// INTERNAL, secret-guarded (SOCIAL_AGENT_SECRET). Once the CEO loop has acted on
// a go-signal it POSTs { id } here to stamp handled_at so the same click is not
// processed twice. Fails closed when the secret is unset. Chosen over a
// ?markHandled= query param so the mutating call is an explicit, secret-guarded
// POST kept separate from the owner-gated POST that records a new request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isAuthorizedSocialAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }

  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400, headers: noStore });
  }

  try {
    const dispatch = await markDispatchHandled(id.trim());
    if (!dispatch) {
      return NextResponse.json({ error: "Request not found or already handled." }, { status: 404, headers: noStore });
    }
    return NextResponse.json({ ok: true, request: dispatch }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social dispatch mark-handled failed:", error);
    return NextResponse.json({ error: "Social dispatch mark-handled failed." }, { status: 500, headers: noStore });
  }
}
