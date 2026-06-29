export async function cleanupExpiredSessionResidue(sql, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const dryRun = options.dryRun === true;
  const nowIso = now.toISOString();

  const rows = dryRun
    ? await sql`
        WITH expired_refresh_history AS (
          SELECT COUNT(*)::int AS count
          FROM mobile_refresh_token_history
          WHERE expires_at <= ${nowIso}::timestamptz
        ), expired_mobile_sessions AS (
          SELECT COUNT(*)::int AS count
          FROM mobile_sessions
          WHERE refresh_expires_at <= ${nowIso}::timestamptz
        ), expired_browser_sessions AS (
          SELECT COUNT(*)::int AS count
          FROM sessions
          WHERE expires_at <= ${nowIso}::timestamptz
        )
        SELECT
          (SELECT count FROM expired_browser_sessions) AS browser_sessions,
          (SELECT count FROM expired_mobile_sessions) AS mobile_sessions,
          (SELECT count FROM expired_refresh_history) AS refresh_token_history
      `
    : await sql`
        WITH deleted_refresh_history AS (
          DELETE FROM mobile_refresh_token_history
          WHERE expires_at <= ${nowIso}::timestamptz
          RETURNING 1
        ), deleted_mobile_sessions AS (
          DELETE FROM mobile_sessions
          WHERE refresh_expires_at <= ${nowIso}::timestamptz
          RETURNING 1
        ), deleted_browser_sessions AS (
          DELETE FROM sessions
          WHERE expires_at <= ${nowIso}::timestamptz
          RETURNING 1
        )
        SELECT
          (SELECT COUNT(*)::int FROM deleted_browser_sessions) AS browser_sessions,
          (SELECT COUNT(*)::int FROM deleted_mobile_sessions) AS mobile_sessions,
          (SELECT COUNT(*)::int FROM deleted_refresh_history) AS refresh_token_history
      `;

  const row = rows[0] ?? {};
  return {
    mode: dryRun ? "dry-run" : "delete",
    runAt: nowIso,
    browserSessions: Number(row.browser_sessions ?? 0),
    mobileSessions: Number(row.mobile_sessions ?? 0),
    refreshTokenHistory: Number(row.refresh_token_history ?? 0),
  };
}
