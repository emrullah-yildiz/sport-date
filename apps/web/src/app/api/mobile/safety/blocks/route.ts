import { NextResponse } from "next/server";

import { getMobileSession } from "@/lib/mobile-session";
import { blockMember, unblockMember } from "@/lib/safety-actions";

const USER_ID_PATTERN = /^\d+$/;
async function targetFrom(request: Request) {
  try {
    const body = await request.json();
    return typeof body?.blockedUserId === "string" && USER_ID_PATTERN.test(body.blockedUserId) ? body.blockedUserId : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const targetId = await targetFrom(request);
  if (!targetId || targetId === session.user.id) return NextResponse.json({ error: "Choose a valid member to block." }, { status: 400 });
  if (!await blockMember(session.user.id, targetId)) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ success: true, message: "Member blocked. Shared requests, places, and room access were removed." }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const targetId = await targetFrom(request);
  if (!targetId) return NextResponse.json({ error: "Choose a valid member to unblock." }, { status: 400 });
  await unblockMember(session.user.id, targetId);
  return NextResponse.json({ success: true, message: "Member unblocked. Previous requests and places are not restored." }, { headers: { "Cache-Control": "no-store" } });
}

