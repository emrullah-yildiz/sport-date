import { NextResponse } from "next/server";

// Liveness probe for an external uptime monitor. Deliberately does NOT touch the
// database or any provider, so it answers `200 { status: "ok" }` even before the
// production stack (Neon, Upstash, Sentry) is wired. It only proves the web
// process is up and serving requests; readiness/dependency checks belong on a
// separate, authenticated endpoint if one is ever needed.
export const runtime = "nodejs";
// Never cache a liveness response: a stale cached "ok" would hide a down process
// from the monitor. (`dynamic` is available here because Cache Components is off.)
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
