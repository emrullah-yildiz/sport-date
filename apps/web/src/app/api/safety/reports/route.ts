import crypto from "node:crypto";

import { validateSafetyReport } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const reporter = await getCurrentUser();
  if (!reporter) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateSafetyReport(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  const report = validation.data;
  if (report.reportedUserId === reporter.id) return NextResponse.json({ error: "You cannot report yourself." }, { status: 400 });

  const sql = getDatabase();
  if (report.eventId) {
    const relationship = await sql`
      SELECT 1 FROM events
      WHERE id = ${report.eventId}::uuid
        AND (
          (${report.reportedUserId}::bigint IS NULL AND events.status = 'published')
          OR (host_user_id = ${report.reportedUserId}::bigint AND events.status = 'published')
          OR (
            (
              host_user_id = ${reporter.id}
              OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${reporter.id})
            )
            AND (
              EXISTS (SELECT 1 FROM join_requests WHERE event_id = events.id AND requester_user_id = ${report.reportedUserId}::bigint)
              OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${report.reportedUserId}::bigint)
            )
          )
        )
    `;
    if (relationship.length === 0) return NextResponse.json({ error: "The reported relationship could not be verified." }, { status: 403 });
  } else {
    return NextResponse.json({ error: "Choose the related event for this report." }, { status: 400 });
  }

  const reportId = crypto.randomUUID();
  const auditMetadata = JSON.stringify({ category: report.category, priority: validation.priority });
  const queries = [
    sql`
      INSERT INTO safety_reports (id, reporter_user_id, reported_user_id, event_id, category, details, priority)
      VALUES (${reportId}::uuid, ${reporter.id}, ${report.reportedUserId}, ${report.eventId}::uuid, ${report.category}, ${report.details}, ${validation.priority})
    `,
    sql`
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, next_status, metadata)
      VALUES (${reportId}::uuid, 'member', ${reporter.id}, 'report_created', 'open', ${auditMetadata}::jsonb)
    `,
  ];
  if (report.blockUser && report.reportedUserId) {
    queries.push(
      sql`INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (${reporter.id}, ${report.reportedUserId}) ON CONFLICT DO NOTHING`,
      sql`
        DELETE FROM event_participants AS participant USING events
        WHERE participant.event_id = events.id
          AND ((events.host_user_id = ${reporter.id} AND participant.user_id = ${report.reportedUserId})
            OR (events.host_user_id = ${report.reportedUserId} AND participant.user_id = ${reporter.id}))
      `,
      sql`
        UPDATE join_requests AS request SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        FROM events WHERE request.event_id = events.id AND request.status IN ('pending', 'accepted')
          AND ((events.host_user_id = ${reporter.id} AND request.requester_user_id = ${report.reportedUserId})
            OR (events.host_user_id = ${report.reportedUserId} AND request.requester_user_id = ${reporter.id}))
      `,
      sql`
        INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
        VALUES (${reportId}::uuid, 'system', NULL, 'subject_blocked', '{}'::jsonb)
      `,
    );
  }
  await sql.transaction(queries);
  return NextResponse.json({
    success: true, reportId, priority: validation.priority,
    message: validation.priority === "critical"
      ? "Report recorded as critical. If anyone is in immediate danger, contact local emergency services now."
      : "Report recorded. Preserve any relevant evidence and avoid further contact if that feels safer.",
  }, { status: 201 });
}
