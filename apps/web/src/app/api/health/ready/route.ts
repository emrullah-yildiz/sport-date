import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";

// Readiness probe — distinct from the liveness probe at `/api/health`. Liveness
// proves only that the web process is up; THIS endpoint proves the process can
// also reach its critical dependency (the database) by performing ONE cheap
// round-trip (`SELECT 1`). An orchestrator/uptime monitor can therefore tell
// "process is up but DB is unreachable" (503 here, 200 on liveness) apart from a
// full outage. It never echoes the connection string, query text, or any driver
// error detail in the response body — only a coarse, non-sensitive `reason`.
export const runtime = "nodejs";
// Never cache a readiness response: a stale cached "ready" would hide a database
// outage from the monitor. (`dynamic` is available here because Cache Components
// is off, matching the liveness and cron routes.)
export const dynamic = "force-dynamic";

export async function GET() {
  let sql;
  try {
    sql = getDatabase();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      // The DB URL is unset — a configuration state, not a leak. Report a coarse,
      // safe reason and stay 503 (not ready) so a misconfigured deploy is caught.
      return NextResponse.json(
        { status: "not_ready", reason: "database_not_configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    // Any other failure constructing the client is reported as a generic
    // dependency error — never the underlying message, which could carry the
    // connection string or credentials.
    return NextResponse.json(
      { status: "not_ready", reason: "database_unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    // One cheap round-trip. We do not read the result — only that it resolves.
    await sql`SELECT 1`;
    return NextResponse.json(
      { status: "ready" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Deliberately swallow the driver error: a failed `SELECT 1` can surface a
    // message containing the host/connection string, so we never put it in the
    // body. The coarse `reason` is enough for a monitor to alert on.
    return NextResponse.json(
      { status: "not_ready", reason: "database_unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
