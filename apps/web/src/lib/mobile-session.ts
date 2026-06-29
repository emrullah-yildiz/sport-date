import "server-only";

import { hashSessionToken, isValidMobileAccessToken, isValidMobileDeviceId, isValidMobileRefreshToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

type MobileSessionUserRow = {
  session_id: string;
  id: string | number;
  email: string;
  age: number;
  first_name: string;
  last_name: string;
  location: string;
  bio: string;
  languages: string[];
  seeking: SessionUser["seeking"];
  email_verified: boolean;
  sports: Array<{ name: string; skillLevel: SessionUser["sports"][number]["skillLevel"]; frequency: SessionUser["sports"][number]["frequency"] }>;
};

export type MobileSessionContext = Readonly<{ sessionId: string; user: SessionUser }>;

export const validMobileDeviceId = isValidMobileDeviceId;
export const validMobileRefreshToken = isValidMobileRefreshToken;

export function isMobileClientRequest(request: Request): boolean {
  return request.headers.get("x-sport-date-client") === "mobile-v1";
}

export async function getMobileSession(request: Request): Promise<MobileSessionContext | null> {
  if (!isMobileClientRequest(request)) return null;
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const deviceId = request.headers.get("x-sport-date-device") ?? "";
  if (!isValidMobileAccessToken(accessToken) || !validMobileDeviceId(deviceId)) return null;

  const sql = getDatabase();
  const rows = await sql`
    WITH active_session AS (
      UPDATE mobile_sessions
      SET last_used_at = CASE WHEN last_used_at < NOW() - INTERVAL '5 minutes' THEN NOW() ELSE last_used_at END
      WHERE access_token_hash = ${hashSessionToken(accessToken)}
        AND device_id_hash = ${hashSessionToken(deviceId)}
        AND access_expires_at > NOW() AND refresh_expires_at > NOW() AND revoked_at IS NULL
      RETURNING id, user_id
    )
    SELECT active_session.id AS session_id, users.id, users.email,
      DATE_PART('year', AGE(CURRENT_DATE, users.date_of_birth))::integer AS age,
      users.first_name, users.last_name, users.location, users.bio, users.languages,
      users.seeking, users.email_verified,
      COALESCE(jsonb_agg(jsonb_build_object(
        'name', user_sports.sport, 'skillLevel', user_sports.skill_level, 'frequency', user_sports.frequency
      ) ORDER BY user_sports.created_at) FILTER (WHERE user_sports.id IS NOT NULL), '[]'::jsonb) AS sports
    FROM active_session
    JOIN users ON users.id = active_session.user_id AND users.account_status = 'active'
    LEFT JOIN user_sports ON user_sports.user_id = users.id
    GROUP BY active_session.id, users.id
    LIMIT 1
  ` as unknown as MobileSessionUserRow[];
  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    user: {
      id: String(row.id), email: row.email, age: row.age, firstName: row.first_name,
      lastName: row.last_name, location: row.location, bio: row.bio,
      languages: row.languages, seeking: row.seeking, emailVerified: row.email_verified,
      sports: row.sports,
    },
  };
}
