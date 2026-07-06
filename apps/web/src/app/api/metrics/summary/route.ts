import { NextResponse } from "next/server";

import { summarizeClickMetrics } from "@/lib/click-metrics";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedSocialAgent } from "@/lib/internal-agent-auth";
import { isOwnerEmail } from "@/lib/owner";
import { getCurrentUser } from "@/lib/session";

// Owner read surface for the anonymous click metrics (CX-20260706).
//
// GET — owner session OR the internal CEO/standup loop (Bearer
//       SOCIAL_AGENT_SECRET), mirroring the /api/standup/directions dual-auth
//       pattern: same trust domain, no new secret. Returns daily counts per
//       (event, page class) — aggregates only; there is nothing per-person to
//       return because the table structurally cannot hold identifiers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const DEFAULT_DAYS = 14;
const MAX_DAYS = 90;

async function isOwnerRequest(): Promise<{ ok: boolean; status: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  if (!isOwnerEmail(user.email)) return { ok: false, status: 403 };
  return { ok: true, status: 200 };
}

export async function GET(request: Request) {
  const agentOk = isAuthorizedSocialAgent(request);
  if (!agentOk) {
    const owner = await isOwnerRequest();
    if (!owner.ok) {
      return NextResponse.json(
        { error: owner.status === 401 ? "Sign in as the owner." : "Owner access only." },
        { status: owner.status, headers: noStore },
      );
    }
  }

  const requested = Number(new URL(request.url).searchParams.get("days") ?? DEFAULT_DAYS);
  const days = Number.isFinite(requested) ? Math.min(MAX_DAYS, Math.max(1, Math.trunc(requested))) : DEFAULT_DAYS;

  try {
    const rows = await summarizeClickMetrics(days);
    return NextResponse.json({ days, rows }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Click metrics summary failed:", error);
    return NextResponse.json({ error: "Click metrics summary failed." }, { status: 500, headers: noStore });
  }
}
