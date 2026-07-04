import { NextResponse } from "next/server";

import { runAttendanceReminderSweep } from "@/lib/attendance-confirmations";
import { DatabaseNotConfiguredError } from "@/lib/db";

// Protected internal endpoint invoked by a scheduler. It runs the idempotent
// T-2h attendance reminder sweep: create one
// `pending` confirmation (+ token) per accepted attendee of an event starting
// within 2h that has none yet, and dispatch the DARK reminder email (a logged
// no-op until the owner enables delivery). Authorizes the shared CRON_SECRET and
// FAILS CLOSED when it is absent — a misconfigured deploy never exposes an
// unauthenticated trigger (mirrors /api/internal/session-cleanup). Vercel Hobby
// currently invokes it daily; reliable T-2h delivery still needs an approved
// sub-daily scheduler or Vercel Pro.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret ⇒ no correct credential
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const summary = await runAttendanceReminderSweep();
    return NextResponse.json({ success: true, summary }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Attendance reminder sweep failed:", error);
    return NextResponse.json({ error: "Attendance reminder sweep failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
