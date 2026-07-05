import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedSocialAgent } from "@/lib/internal-agent-auth";
import { isOwnerEmail } from "@/lib/owner";
import { getCurrentUser } from "@/lib/session";
import {
  countApprovedUnscheduled,
  latestUnhandledDispatch,
  recordDispatchRequest,
} from "@/lib/social-dispatch";

// Social dispatch trigger API (CX-20260705-social-dispatch-trigger).
//
// POST — OWNER-GATED. Records a "schedule my approved posts now" go-signal and
//        returns the current approved-unscheduled count. Reuses the session
//        helper (no new auth) + the OWNER_EMAILS allow-list.
// GET  — INTERNAL, secret-guarded (SOCIAL_AGENT_SECRET). Returns the latest
//        UNHANDLED request (or null) so the CEO loop can detect the click.
//        Fails closed when the secret is unset (never an open read path).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in as the owner." }, { status: 401, headers: noStore });
  }
  if (!isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Owner access only." }, { status: 403, headers: noStore });
  }

  try {
    await recordDispatchRequest(user.email);
    const approvedUnscheduled = await countApprovedUnscheduled();
    return NextResponse.json({ ok: true, approvedUnscheduled }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social dispatch record failed:", error);
    return NextResponse.json({ error: "Social dispatch record failed." }, { status: 500, headers: noStore });
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedSocialAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }

  try {
    const dispatch = await latestUnhandledDispatch();
    return NextResponse.json({ request: dispatch }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social dispatch fetch failed:", error);
    return NextResponse.json({ error: "Social dispatch fetch failed." }, { status: 500, headers: noStore });
  }
}
