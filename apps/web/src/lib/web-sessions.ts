import "server-only";

import { hashSessionToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export type WebSession = Readonly<{
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}>;

type WebSessionRow = {
  id: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
};

/**
 * List the member's ACTIVE (not-expired) web/browser sessions.
 *
 * Returns only safe metadata — a stable id, created_at, expires_at, and an
 * `isCurrent` flag for the session matching the supplied request token. The
 * raw `token_hash` is never selected or returned, so no credential can leak.
 *
 * `currentToken` is the value of the request's auth cookie; it is hashed here
 * and matched against `token_hash` purely to flag the current row.
 */
export async function getWebSessions(userId: string, currentToken?: string): Promise<WebSession[]> {
  const sql = getDatabase();
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  const rows = await sql`
    SELECT id, created_at, expires_at,
      COALESCE(token_hash = NULLIF(${currentHash}, ''), FALSE) AS is_current
    FROM sessions
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY (token_hash = NULLIF(${currentHash}, '')) DESC NULLS LAST, created_at DESC
    LIMIT 50
  ` as unknown as WebSessionRow[];
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isCurrent: row.is_current,
  }));
}

export type RevokeWebSessionResult = Readonly<{ revoked: boolean; wasCurrent: boolean }>;

/**
 * Revoke (delete) a single web session by id for the supplied user only.
 *
 * Authorization is enforced in the WHERE clause (`user_id = ${userId}`), so a
 * member can never delete another member's session. The row is hard-deleted,
 * so the revoked session token can never authenticate again. `wasCurrent` is
 * true when the deleted row matches the request's auth cookie, signalling the
 * caller to clear the cookie / sign the member out.
 */
export async function revokeWebSession(
  userId: string,
  sessionId: string,
  currentToken?: string,
): Promise<RevokeWebSessionResult> {
  const sql = getDatabase();
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  const rows = await sql`
    DELETE FROM sessions
    WHERE id = ${sessionId}::uuid AND user_id = ${userId}
    RETURNING COALESCE(token_hash = NULLIF(${currentHash}, ''), FALSE) AS is_current
  ` as unknown as Array<{ is_current: boolean }>;
  if (rows.length === 0) return { revoked: false, wasCurrent: false };
  return { revoked: true, wasCurrent: rows[0].is_current };
}
