import { NextResponse } from "next/server";

import { createMobileSessionTokens, hashSessionToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isMobileClientRequest, validMobileDeviceId, validMobileRefreshToken } from "@/lib/mobile-session";
import { enforceRateLimit, mobileRefreshRateLimitRules } from "@/lib/rate-limit";

type RefreshRow = { session_id: string; refresh_expires_at: string; reused: boolean };

export async function POST(request: Request) {
  if (!isMobileClientRequest(request)) return NextResponse.json({ error: "Mobile client headers required." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const deviceId = typeof input.deviceId === "string" ? input.deviceId.trim() : "";
  const limited = enforceRateLimit(
    "mobile:auth:refresh",
    mobileRefreshRateLimitRules(request, deviceId),
    "Too many session refresh attempts. Please sign in again in a few minutes.",
  );
  if (limited) return limited;
  if (!validMobileDeviceId(input.deviceId) || !validMobileRefreshToken(input.refreshToken)) {
    return NextResponse.json({ error: "Session refresh is invalid." }, { status: 401 });
  }

  const oldRefreshHash = hashSessionToken(input.refreshToken);
  const deviceIdHash = hashSessionToken(deviceId);
  const next = createMobileSessionTokens();
  const sql = getDatabase();
  const rows = await sql`
    WITH reused_token AS (
      SELECT session_id FROM mobile_refresh_token_history
      WHERE refresh_token_hash = ${oldRefreshHash} AND expires_at > NOW()
    ), revoked_reuse AS (
      UPDATE mobile_sessions SET revoked_at = NOW()
      WHERE id IN (SELECT session_id FROM reused_token) AND revoked_at IS NULL
      RETURNING id, refresh_expires_at
    ), current_session AS (
      SELECT id, refresh_token_hash, refresh_expires_at
      FROM mobile_sessions
      WHERE refresh_token_hash = ${oldRefreshHash} AND device_id_hash = ${deviceIdHash}
        AND refresh_expires_at > NOW() AND revoked_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM reused_token)
      FOR UPDATE
    ), saved_history AS (
      INSERT INTO mobile_refresh_token_history (refresh_token_hash, session_id, expires_at)
      SELECT refresh_token_hash, id, refresh_expires_at FROM current_session
      ON CONFLICT DO NOTHING
      RETURNING session_id
    ), updated_session AS (
      UPDATE mobile_sessions AS session SET
        access_token_hash = ${next.accessTokenHash},
        refresh_token_hash = ${next.refreshTokenHash},
        access_expires_at = ${next.accessExpiresAt.toISOString()}::timestamptz,
        last_used_at = NOW()
      FROM current_session
      WHERE session.id = current_session.id
        AND session.refresh_token_hash = ${oldRefreshHash}
        AND EXISTS (SELECT 1 FROM saved_history WHERE session_id = session.id)
      RETURNING session.id, session.refresh_expires_at
    )
    SELECT id AS session_id, refresh_expires_at, FALSE AS reused FROM updated_session
    UNION ALL
    SELECT id AS session_id, refresh_expires_at, TRUE AS reused FROM revoked_reuse
  ` as unknown as RefreshRow[];
  const result = rows[0];
  if (!result || result.reused) {
    return NextResponse.json({ error: "Session expired or was revoked. Sign in again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    accessToken: next.accessToken,
    accessExpiresAt: next.accessExpiresAt.toISOString(),
    refreshToken: next.refreshToken,
    refreshExpiresAt: result.refresh_expires_at,
  }, { headers: { "Cache-Control": "no-store" } });
}
