import { NextResponse } from "next/server";

import { getMobileDeviceSessions, revokeMobileDeviceSession } from "@/lib/mobile-devices";
import { getMobileSession } from "@/lib/mobile-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ devices: await getMobileDeviceSessions(session.user.id, session.sessionId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  let sessionId = "";
  try { const body = await request.json(); sessionId = typeof body?.sessionId === "string" ? body.sessionId : ""; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!UUID_PATTERN.test(sessionId)) return NextResponse.json({ error: "Device session not found." }, { status: 404 });
  if (sessionId === session.sessionId) return NextResponse.json({ error: "Use sign out for this device." }, { status: 400 });
  if (!await revokeMobileDeviceSession(session.user.id, sessionId)) return NextResponse.json({ error: "Device session is already revoked or unavailable." }, { status: 409 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
