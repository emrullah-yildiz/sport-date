import "server-only";

import crypto from "node:crypto";

import type { SafetyPriority, SafetyReportInput } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

export async function blockMember(blockerId: string, blockedId: string) {
  const sql = getDatabase();
  const results = await sql.transaction([
    sql`
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
      SELECT ${blockerId}, id FROM users WHERE id = ${blockedId} AND account_status = 'active'
      ON CONFLICT DO NOTHING RETURNING blocked_user_id
    `,
    sql`
      DELETE FROM event_participants AS participant USING events
      WHERE participant.event_id = events.id
        AND ((events.host_user_id = ${blockerId} AND participant.user_id = ${blockedId})
          OR (events.host_user_id = ${blockedId} AND participant.user_id = ${blockerId}))
    `,
    sql`
      UPDATE join_requests AS request SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      FROM events WHERE request.event_id = events.id AND request.status IN ('pending', 'accepted')
        AND ((events.host_user_id = ${blockerId} AND request.requester_user_id = ${blockedId})
          OR (events.host_user_id = ${blockedId} AND request.requester_user_id = ${blockerId}))
    `,
  ]);
  if (results[0].length > 0) return true;
  const existing = await sql`SELECT 1 FROM user_blocks WHERE blocker_user_id = ${blockerId} AND blocked_user_id = ${blockedId}`;
  return existing.length > 0;
}

export async function unblockMember(blockerId: string, blockedId: string) {
  const sql = getDatabase();
  await sql`DELETE FROM user_blocks WHERE blocker_user_id = ${blockerId} AND blocked_user_id = ${blockedId}`;
}

export async function createSafetyReport(reporterId: string, report: SafetyReportInput, priority: SafetyPriority) {
  if (!report.eventId) return null;
  const sql = getDatabase();
  const relationship = await sql`
    SELECT 1 FROM events
    WHERE id = ${report.eventId}::uuid
      AND (
        (${report.reportedUserId}::bigint IS NULL AND events.status IN ('published', 'completed'))
        OR (host_user_id = ${report.reportedUserId}::bigint AND events.status IN ('published', 'completed'))
        OR (
          (host_user_id = ${reporterId} OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${reporterId}))
          AND (
            EXISTS (SELECT 1 FROM join_requests WHERE event_id = events.id AND requester_user_id = ${report.reportedUserId}::bigint)
            OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${report.reportedUserId}::bigint)
          )
        )
      )
  `;
  if (relationship.length === 0) return null;

  const reportId = crypto.randomUUID();
  const auditMetadata = JSON.stringify({ category: report.category, priority });
  const queries = [
    sql`
      INSERT INTO safety_reports (id, reporter_user_id, reported_user_id, event_id, category, details, priority)
      VALUES (${reportId}::uuid, ${reporterId}, ${report.reportedUserId}, ${report.eventId}::uuid, ${report.category}, ${report.details}, ${priority})
    `,
    sql`
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, next_status, metadata)
      VALUES (${reportId}::uuid, 'member', ${reporterId}, 'report_created', 'open', ${auditMetadata}::jsonb)
    `,
  ];
  if (report.blockUser && report.reportedUserId) {
    queries.push(
      sql`INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (${reporterId}, ${report.reportedUserId}) ON CONFLICT DO NOTHING`,
      sql`
        DELETE FROM event_participants AS participant USING events
        WHERE participant.event_id = events.id
          AND ((events.host_user_id = ${reporterId} AND participant.user_id = ${report.reportedUserId})
            OR (events.host_user_id = ${report.reportedUserId} AND participant.user_id = ${reporterId}))
      `,
      sql`
        UPDATE join_requests AS request SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        FROM events WHERE request.event_id = events.id AND request.status IN ('pending', 'accepted')
          AND ((events.host_user_id = ${reporterId} AND request.requester_user_id = ${report.reportedUserId})
            OR (events.host_user_id = ${report.reportedUserId} AND request.requester_user_id = ${reporterId}))
      `,
      sql`
        INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
        VALUES (${reportId}::uuid, 'system', NULL, 'subject_blocked', '{}'::jsonb)
      `,
    );
  }
  await sql.transaction(queries);
  return { reportId, priority };
}
