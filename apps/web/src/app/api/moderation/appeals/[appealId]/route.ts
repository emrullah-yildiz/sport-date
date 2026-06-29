import { validateModerationAppealUpdate } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { getModeratorSession } from "@/lib/moderation";
import { isTrustedBrowserMutation } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ appealId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const moderator = await getModeratorSession();
  if (!moderator) return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
  const { appealId } = await params;
  if (!UUID_PATTERN.test(appealId)) return NextResponse.json({ error: "Appeal not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateModerationAppealUpdate(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const sql = getDatabase();
  const rows = await sql`
    WITH authorized_moderator AS (
      SELECT role FROM user_roles
      WHERE user_id = ${moderator.user.id} AND revoked_at IS NULL
        AND role IN ('moderator', 'safety_admin')
      ORDER BY role LIMIT 1
    ), current_appeal AS (
      SELECT appeal.id, appeal.report_id, appeal.status
      FROM moderation_appeals AS appeal
      WHERE appeal.id = ${appealId}::uuid
        AND appeal.status IN ('open', 'reviewing')
        AND EXISTS (SELECT 1 FROM authorized_moderator)
        AND (
          (appeal.status = 'open' AND ${validation.status} IN ('reviewing', 'upheld', 'modified', 'reversed'))
          OR (appeal.status = 'reviewing' AND ${validation.status} IN ('upheld', 'modified', 'reversed'))
        )
        AND EXISTS (
          SELECT 1 FROM moderation_audit_log AS decision_audit
          WHERE decision_audit.report_id = appeal.report_id
            AND decision_audit.action = 'decision_notice_published'
            AND decision_audit.actor_user_id IS DISTINCT FROM ${moderator.user.id}
        )
      FOR UPDATE
    ), updated_appeal AS (
      UPDATE moderation_appeals AS appeal
      SET status = ${validation.status}, outcome_summary = ${validation.outcomeSummary},
        decided_at = CASE WHEN ${validation.outcomeSummary}::text IS NULL THEN NULL ELSE NOW() END
      FROM current_appeal
      WHERE appeal.id = current_appeal.id
      RETURNING appeal.id, appeal.report_id, current_appeal.status AS previous_status, appeal.status
    ), appeal_audit AS (
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, previous_status, next_status, metadata)
      SELECT report_id, 'moderator', ${moderator.user.id}, 'appeal_status_changed', previous_status, status,
        jsonb_build_object('appealId', id, 'role', authorized_moderator.role)
      FROM updated_appeal CROSS JOIN authorized_moderator
    )
    SELECT id, status FROM updated_appeal
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "This appeal transition is unavailable. The original decision-maker cannot review their own decision." }, { status: 409 });
  }
  return NextResponse.json({ success: true, status: rows[0].status });
}
