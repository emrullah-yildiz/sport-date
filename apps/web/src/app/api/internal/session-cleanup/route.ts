import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { cleanupExpiredSessionResidue } from "@/lib/session-cleanup.mjs";

// Protected internal endpoint invoked by Vercel Cron (see `vercel.json`). It runs
// the EXISTING session-cleanup logic — the same `cleanupExpiredSessionResidue`
// used by `scripts/cleanup-sessions.mjs` — on a schedule, without a separate
// worker. It is NOT a public endpoint: it authorizes a shared bearer secret and
// fails closed when that secret is absent, so a misconfigured deploy never exposes
// an unauthenticated "delete expired sessions" trigger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: with no configured secret there is no credential that could ever
  // be correct, so refuse to run rather than running unauthenticated.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const expected = `Bearer ${secret}`;
  return header === expected;
}

// Vercel Cron triggers a GET request to the configured path; it carries the
// `Authorization: Bearer ${CRON_SECRET}` header that this handler verifies.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sql = getDatabase();
    const summary = await cleanupExpiredSessionResidue(sql);
    return NextResponse.json(
      { success: true, summary },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Scheduled session cleanup failed:", error);
    return NextResponse.json(
      { error: "Session cleanup failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
