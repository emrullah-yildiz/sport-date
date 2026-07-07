import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedStandupPublisher } from "@/lib/internal-agent-auth";
import {
  getLatestStandupReport,
  publishStandupReport,
  validateStandupReport,
  type StandupReport,
} from "@/lib/standup-reports";

// Daily standup report publish + read (owner request 2026-07-07).
//
// POST — internal-only (Bearer STANDUP_AGENT_SECRET, or SOCIAL_AGENT_SECRET
//        for the local CEO loop's fallback). The cloud standup routine calls
//        this the moment its report is written, so /hq.html updates instantly
//        — no git push, no redeploy. Fails closed when no secret is set.
// GET  — public, same exposure as the static /standup/latest.json it
//        replaces as the primary source (hq.html falls back to the static
//        file when this 404s). Internal ops signal only — no member PII.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const report = await getLatestStandupReport();
    if (!report) return NextResponse.json({ error: "No standup report published yet." }, { status: 404, headers: noStore });
    return NextResponse.json({ report }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Standup report read failed:", error);
    return NextResponse.json({ error: "Standup report read failed." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedStandupPublisher(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }

  const invalid = validateStandupReport(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400, headers: noStore });
  const report = body as StandupReport;

  try {
    await publishStandupReport(report, "standup-routine");
    return NextResponse.json({ ok: true, day: report.day }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Standup report publish failed:", error);
    return NextResponse.json({ error: "Standup report publish failed." }, { status: 500, headers: noStore });
  }
}
