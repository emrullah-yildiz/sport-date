import { NextResponse } from "next/server";

import { hashSessionToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isMobileClientRequest, validMobileDeviceId, validMobileRefreshToken } from "@/lib/mobile-session";

export async function POST(request: Request) {
  if (!isMobileClientRequest(request)) return NextResponse.json({ error: "Mobile client headers required." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  if (!validMobileDeviceId(input.deviceId) || !validMobileRefreshToken(input.refreshToken)) {
    return NextResponse.json({ success: true });
  }
  const sql = getDatabase();
  await sql`
    UPDATE mobile_sessions SET revoked_at = NOW()
    WHERE refresh_token_hash = ${hashSessionToken(input.refreshToken)}
      AND device_id_hash = ${hashSessionToken(input.deviceId)} AND revoked_at IS NULL
  `;
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}

