import { NextResponse } from "next/server";

import { isTrustedBrowserMutation } from "@/lib/request-security";
import { blockMember, unblockMember } from "@/lib/safety-actions";
import { getCurrentUser } from "@/lib/session";

const USER_ID_PATTERN = /^\d+$/;
async function readTarget(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.blockedUserId === "string" && USER_ID_PATTERN.test(body.blockedUserId) ? body.blockedUserId : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const targetId = await readTarget(request);
  if (!targetId || targetId === user.id) return NextResponse.json({ error: "Choose a valid member to block." }, { status: 400 });
  if (!await blockMember(user.id, targetId)) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ success: true, message: "Member blocked. Shared requests, places, and room access were removed." });
}

export async function DELETE(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const targetId = await readTarget(request);
  if (!targetId) return NextResponse.json({ error: "Choose a valid member to unblock." }, { status: 400 });
  await unblockMember(user.id, targetId);
  return NextResponse.json({ success: true, message: "Member unblocked. Previous requests and places are not restored." });
}

