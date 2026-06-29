import { validateLogin } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { createMobileSessionTokens, hashSessionToken, verifyPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { isMobileClientRequest, validMobileDeviceId } from "@/lib/mobile-session";

export const runtime = "nodejs";

const DUMMY_PASSWORD_HASH = "$2b$12$Ad/rUVoyWWEHpeHc7A7mX.CJ5QzyE20ylxhB323v6GK1CvjyTuxMq";
type LoginUserRow = { id: string | number; password_hash: string; account_status: string; first_name: string };

export async function POST(request: Request) {
  if (!isMobileClientRequest(request)) return NextResponse.json({ error: "Mobile client headers required." }, { status: 400 });
  try {
    const body = await request.json();
    const validation = validateLogin(body);
    const deviceId = body?.deviceId;
    const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : "";
    if (!validation.valid || !validMobileDeviceId(deviceId) || deviceName.length < 2 || deviceName.length > 80) {
      return NextResponse.json({ error: validation.valid ? "Valid device information is required." : validation.errors[0] }, { status: 400 });
    }
    const sql = getDatabase();
    const rows = await sql`
      SELECT id, password_hash, account_status, first_name FROM users
      WHERE email = ${validation.data.email} LIMIT 1
    ` as unknown as LoginUserRow[];
    const user = rows[0];
    const passwordMatches = await verifyPassword(validation.data.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches || user.account_status !== "active") {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const tokens = createMobileSessionTokens();
    const deviceIdHash = hashSessionToken(deviceId);
    await sql.transaction((transaction) => [
      transaction`
        UPDATE mobile_sessions SET revoked_at = NOW()
        WHERE user_id = ${user.id} AND device_id_hash = ${deviceIdHash} AND revoked_at IS NULL
      `,
      transaction`
        INSERT INTO mobile_sessions (
          id, user_id, device_id_hash, device_name, access_token_hash, refresh_token_hash,
          access_expires_at, refresh_expires_at
        ) VALUES (
          ${tokens.id}::uuid, ${user.id}, ${deviceIdHash}, ${deviceName},
          ${tokens.accessTokenHash}, ${tokens.refreshTokenHash},
          ${tokens.accessExpiresAt.toISOString()}::timestamptz, ${tokens.refreshExpiresAt.toISOString()}::timestamptz
        )
      `,
    ]);
    return NextResponse.json({
      accessToken: tokens.accessToken,
      accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      member: { firstName: user.first_name },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    if (error instanceof DatabaseNotConfiguredError) return NextResponse.json({ error: "Mobile login is not connected yet." }, { status: 503 });
    console.error("Mobile login failed:", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
