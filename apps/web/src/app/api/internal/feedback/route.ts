import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { listOpenFeedbackForAgent } from "@/lib/feedback";
import { isAuthorizedFeedbackAgent } from "@/lib/internal-agent-auth";

// PROTECTED internal endpoint — lists OPEN member feedback for an authenticated
// agent/admin to triage (CX-20260704). Secret bearer, fails closed. Never
// reachable by members. Product feedback only; safety reports are elsewhere.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedFeedbackAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const tickets = await listOpenFeedbackForAgent();
    return NextResponse.json({ tickets }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Internal feedback list failed:", error);
    return NextResponse.json({ error: "Feedback list failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
