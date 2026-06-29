import { validateModerationCaseUpdate } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { getModeratorSession } from "@/lib/moderation";
import { isTrustedBrowserMutation } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const moderator = await getModeratorSession();
  if (!moderator) return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
  const { reportId } = await params;
  if (!UUID_PATTERN.test(reportId)) return NextResponse.json({ error: "Safety case not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateModerationCaseUpdate(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const sql = getDatabase();
  const rows = await sql`
    WITH authorized_moderator AS (
      SELECT role FROM user_roles
      WHERE user_id = ${moderator.user.id} AND revoked_at IS NULL
        AND role IN ('moderator', 'safety_admin')
      ORDER BY role LIMIT 1
    ), current_report AS (
      SELECT id, status FROM safety_reports
      WHERE id = ${reportId}::uuid
        AND EXISTS (SELECT 1 FROM authorized_moderator)
        AND status NOT IN ('actioned', 'dismissed')
        AND (
          (status = 'open' AND ${validation.status} IN ('triaged', 'investigating', 'actioned', 'dismissed'))
          OR (status = 'triaged' AND ${validation.status} IN ('investigating', 'actioned', 'dismissed'))
          OR (status = 'investigating' AND ${validation.status} IN ('actioned', 'dismissed'))
        )
      FOR UPDATE
    ), updated_report AS (
      UPDATE safety_reports AS report
      SET status = ${validation.status},
        decision_code = ${validation.decisionCode},
        decision_basis = ${validation.decisionBasis},
        decision_summary = ${validation.decisionSummary},
        decided_at = CASE WHEN ${validation.decisionCode}::text IS NULL THEN NULL ELSE NOW() END,
        appeal_deadline = CASE WHEN ${validation.decisionCode}::text IS NULL THEN NULL ELSE NOW() + INTERVAL '6 months' END,
        updated_at = NOW()
      FROM current_report
      WHERE report.id = current_report.id
      RETURNING report.id, current_report.status AS previous_status, report.status, report.decision_code
    ), status_audit AS (
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, previous_status, next_status, metadata)
      SELECT id, 'moderator', ${moderator.user.id}, 'status_changed', previous_status, status,
        jsonb_build_object('role', authorized_moderator.role)
      FROM updated_report CROSS JOIN authorized_moderator
    ), decision_audit AS (
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, previous_status, next_status, metadata)
      SELECT id, 'moderator', ${moderator.user.id}, 'decision_notice_published', previous_status, status,
        jsonb_build_object('decisionCode', decision_code, 'appealMonths', 6)
      FROM updated_report WHERE decision_code IS NOT NULL
    )
    SELECT id, status FROM updated_report
  `;
  if (rows.length === 0) return NextResponse.json({ error: "That case transition is no longer available." }, { status: 409 });
  return NextResponse.json({ success: true, status: rows[0].status });
}
