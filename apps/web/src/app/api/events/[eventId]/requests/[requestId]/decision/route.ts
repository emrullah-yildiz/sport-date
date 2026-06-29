import { NextResponse } from "next/server";

import { decideEventJoinRequest } from "@/lib/join-requests";
import { summarizeHostDecision } from "@/lib/join-request-policy";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; requestId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId, requestId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(requestId)) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  let action: "accept" | "skip" | null = null;
  try {
    const body = await request.json();
    action = body?.action === "accept" || body?.action === "skip" ? body.action : null;
  } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!action) return NextResponse.json({ error: "Choose accept or skip." }, { status: 400 });
  const decision = await decideEventJoinRequest(eventId, requestId, host.id, action);
  if (!decision) return NextResponse.json({ error: action === "accept" ? "No place is available or the request is no longer eligible." : "Request cannot be skipped." }, { status: 409 });
  return NextResponse.json({ success: true, ...summarizeHostDecision(action, decision) });
}
