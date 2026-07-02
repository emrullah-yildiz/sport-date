import "server-only";

import { hashSessionToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

/**
 * Maximum concurrent ACTIVE web/browser sessions kept per member. Enforced on
 * sign-in (see the login route): the newest N sessions — including the one just
 * created — are retained and the oldest active rows beyond N are evicted, so the
 * `sessions` table cannot grow without bound. This is the single source of truth
 * for the cap; the login route imports it so the cap and the listing limit below
 * can never drift apart. Mobile app sessions live in a separate table and are
 * unaffected by this cap.
 */
export const MAX_WEB_SESSIONS_PER_USER = 20;

/**
 * How many active sessions the "Signed-in browsers" panel lists. Derived from the
 * cap so it is ALWAYS >= the number of rows the cap can leave behind — guaranteeing
 * every retained session is individually visible and revocable and NOTHING is ever
 * silently omitted. (The old fixed LIMIT 50 could silently hide sessions past the
 * 50th on an uncapped account; capping at 20 makes 50 comfortably sufficient, but we
 * keep it tied to the cap so raising the cap can never re-introduce silent hiding.)
 */
export const WEB_SESSION_LIST_LIMIT = Math.max(50, MAX_WEB_SESSIONS_PER_USER + 5);

export type WebSession = Readonly<{
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  // Coarse, honest "Browser on OS" hint derived from the User-Agent at sign-in
  // (e.g. "Chrome on Windows"); null when the UA was missing/unrecognised or the
  // row predates the device-hint migration. Never a raw UA, IP, or location.
  deviceLabel: string | null;
  // Coarse last-active timestamp (refreshed at most ~daily); null for rows that
  // have not been used since the migration, in which case the UI falls back to
  // the sign-in time.
  lastActiveAt: string | null;
}>;

type WebSessionRow = {
  id: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
  device_label: string | null;
  last_active_at: string | null;
};

/**
 * List the member's ACTIVE (not-expired) web/browser sessions.
 *
 * Returns only safe metadata — a stable id, created_at, expires_at, the coarse
 * derived device_label / last_active_at hints, and an `isCurrent` flag for the
 * session matching the supplied request token. The raw `token_hash` is never
 * selected or returned, so no credential can leak.
 *
 * `currentToken` is the value of the request's auth cookie; it is hashed here
 * and matched against `token_hash` purely to flag the current row.
 */
export async function getWebSessions(userId: string, currentToken?: string): Promise<WebSession[]> {
  const sql = getDatabase();
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  const rows = await sql`
    SELECT id, created_at, expires_at, device_label, last_active_at,
      COALESCE(token_hash = NULLIF(${currentHash}, ''), FALSE) AS is_current
    FROM sessions
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY (token_hash = NULLIF(${currentHash}, '')) DESC NULLS LAST, created_at DESC
    LIMIT ${WEB_SESSION_LIST_LIMIT}
  ` as unknown as WebSessionRow[];
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isCurrent: row.is_current,
    deviceLabel: row.device_label ?? null,
    lastActiveAt: row.last_active_at ?? null,
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

/**
 * Revoke EVERY other web session for the member — every row for this user
 * EXCEPT the one whose token_hash matches the request's own auth cookie. The
 * current browser is NEVER logged out by this action (it is preserved by the
 * `token_hash <> currentHash` guard), so a member can lock out all other places
 * they are signed in without signing themselves out here.
 *
 * A valid current token is REQUIRED: if `currentToken` is missing/empty we
 * delete nothing and return 0, rather than risk deleting every session (which
 * would include the current one). Authorization is enforced by the
 * `user_id = ${userId}` predicate, so a member can only ever end their own
 * sessions. Returns the number of other sessions ended.
 */
export async function revokeOtherWebSessions(
  userId: string,
  currentToken?: string,
): Promise<number> {
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  if (currentHash === "") return 0;
  const sql = getDatabase();
  const rows = await sql`
    DELETE FROM sessions
    WHERE user_id = ${userId} AND token_hash <> ${currentHash}
    RETURNING id
  ` as unknown as Array<{ id: string }>;
  return rows.length;
}

/**
 * Refresh a session's COARSE last-active timestamp. Called on authenticated
 * reads but throttled in SQL to at most about once a day per session (only when
 * `last_active_at` is null or older than ~23h), so it is a rough recency anchor
 * for the "Signed-in browsers" panel, not a fine-grained activity log, and adds
 * almost no write load. Never throws into the caller's request path — the
 * caller treats it as best-effort.
 */
export async function touchWebSessionLastActive(currentToken?: string): Promise<void> {
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  if (currentHash === "") return;
  const sql = getDatabase();
  await sql`
    UPDATE sessions
    SET last_active_at = NOW()
    WHERE token_hash = ${currentHash}
      AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '23 hours')
  `;
}
