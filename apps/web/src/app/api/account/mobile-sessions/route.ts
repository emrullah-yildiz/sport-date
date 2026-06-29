import { NextResponse } from "next/server";

import { getMobileDeviceSessions, revokeMobileDeviceSession } from "@/lib/mobile-devices";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ devices: await getMobileDeviceSessions(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let sessionId = "";
  try { const body = await request.json(); sessionId = typeof body?.sessionId === "string" ? body.sessionId : ""; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!UUID_PATTERN.test(sessionId)) return NextResponse.json({ error: "Device session not found." }, { status: 404 });
  if (!await revokeMobileDeviceSession(user.id, sessionId)) return NextResponse.json({ error: "Device session is already revoked or unavailable." }, { status: 409 });
  return NextResponse.json({ success: true });
}

