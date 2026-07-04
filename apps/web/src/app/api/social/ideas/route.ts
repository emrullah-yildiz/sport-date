import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";
import { isAuthorizedSocialAgent } from "@/lib/internal-agent-auth";
import { isOwnerEmail } from "@/lib/owner";
import { getCurrentUser } from "@/lib/session";
import {
  insertSocialIdeas,
  isSocialIdeaStatus,
  listSocialIdeas,
  normalizeSocialIdeaInput,
  type SocialIdeaInput,
} from "@/lib/social-ideas";

// Social content approval queue API (CX-20260705-social-content-approval-queue).
//
// GET  — OWNER-GATED. Lists post ideas (optionally ?status=) newest-first.
// POST — INTERNAL, secret-guarded (SOCIAL_AGENT_SECRET). The CEO/growth agent
//        seeds one idea or { ideas: [...] } into the queue as status='pending'.
//        Fails closed when the secret is unset (never an open write path).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in as the owner." }, { status: 401, headers: noStore });
  }
  if (!isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Owner access only." }, { status: 403, headers: noStore });
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  if (statusParam !== null && !isSocialIdeaStatus(statusParam)) {
    return NextResponse.json({ error: "Unknown status filter." }, { status: 400, headers: noStore });
  }

  try {
    const ideas = await listSocialIdeas(statusParam ?? undefined);
    return NextResponse.json({ ideas }, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social ideas list failed:", error);
    return NextResponse.json({ error: "Social ideas list failed." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedSocialAgent(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore }); }

  const payload = body as { ideas?: unknown };
  const rawList = Array.isArray(payload?.ideas) ? payload.ideas : [body];
  if (rawList.length === 0) {
    return NextResponse.json({ error: "Provide at least one idea." }, { status: 400, headers: noStore });
  }

  const inputs: SocialIdeaInput[] = [];
  for (const raw of rawList) {
    const normalized = normalizeSocialIdeaInput(raw);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400, headers: noStore });
    }
    inputs.push(normalized);
  }

  try {
    const ideas = await insertSocialIdeas(inputs);
    return NextResponse.json({ ok: true, ideas }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers: noStore });
    }
    console.error("Social ideas seed failed:", error);
    return NextResponse.json({ error: "Social ideas seed failed." }, { status: 500, headers: noStore });
  }
}
