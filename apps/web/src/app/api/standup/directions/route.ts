import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedSocialAgent } from "@/lib/internal-agent-auth";
import { isOwnerEmail } from "@/lib/owner";
import { getCurrentUser } from "@/lib/session";
import {
  decideStandupDirection,
  isStandupDirectionAction,
  isValidDirectionId,
  listStandupDecisions,
} from "@/lib/standup-directions";

// Standup direction decisions (owner request 2026-07-05).
//
// GET  — owner session OR the internal CEO loop (Bearer SOCIAL_AGENT_SECRET,
//        reusing the marketing-loop guard: same trust domain, no new secret).
//        Lists decisions so the HQ page can overlay statuses and the loop can
//        pick up the owner's calls.
// POST — OWNER-GATED. Records { id, action: 'approve'|'deny', comment? } for a
//        direction proposed in the daily standup (apps/web/public/standup/).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const MAX_COMMENT = 4000;

async function isOwnerRequest(): Promise<{ ok: boolean; email?: string; status: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  if (!isOwnerEmail(user.email)) return { ok: false, status: 403 };
  return { ok: true, email: user.email, status: 200 };
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

  try {
    const decisions = await listStandupDecisions();
    return NextResponse.json({ decisions }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Standup decisions list failed:", error);
    return NextResponse.json({ error: "Standup decisions list failed." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  const owner = await isOwnerRequest();
  if (!owner.ok) {
    return NextResponse.json(
      { error: owner.status === 401 ? "Sign in as the owner." : "Owner access only." },
      { status: owner.status, headers: noStore },
    );
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }
  const payload = (body ?? {}) as { id?: unknown; action?: unknown; comment?: unknown };

  if (!isValidDirectionId(payload.id)) {
    return NextResponse.json({ error: "id must be a standup direction id (SD-YYYYMMDD-slug)." }, { status: 400, headers: noStore });
  }
  if (!isStandupDirectionAction(payload.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'deny'." }, { status: 400, headers: noStore });
  }
  const hasComment = payload.comment !== undefined && payload.comment !== null;
  if (hasComment && typeof payload.comment !== "string") {
    return NextResponse.json({ error: "comment must be a string." }, { status: 400, headers: noStore });
  }
  const comment = hasComment ? (payload.comment as string) : undefined;
  if (comment !== undefined && comment.length > MAX_COMMENT) {
    return NextResponse.json({ error: `comment must be at most ${MAX_COMMENT} characters.` }, { status: 400, headers: noStore });
  }

  try {
    const decision = await decideStandupDirection(payload.id, payload.action, comment, owner.email as string);
    return NextResponse.json({ ok: true, decision }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Standup direction decision failed:", error);
    return NextResponse.json({ error: "Standup direction decision failed." }, { status: 500, headers: noStore });
  }
}
