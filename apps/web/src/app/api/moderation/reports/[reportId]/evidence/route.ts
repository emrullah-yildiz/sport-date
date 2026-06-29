import crypto from "node:crypto";

import { validateEvidenceReference } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { getModeratorSession } from "@/lib/moderation";
import { isTrustedBrowserMutation } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const moderator = await getModeratorSession();
  if (!moderator) return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
  const { reportId } = await params;
  if (!UUID_PATTERN.test(reportId)) return NextResponse.json({ error: "Safety case not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateEvidenceReference(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const sql = getDatabase();
  const evidenceId = crypto.randomUUID();
  const rows = await sql`
    WITH authorized_moderator AS (
      SELECT role FROM user_roles
      WHERE user_id = ${moderator.user.id} AND revoked_at IS NULL
        AND role IN ('moderator', 'safety_admin')
      ORDER BY role LIMIT 1
    ), eligible_report AS (
      SELECT id FROM safety_reports
      WHERE id = ${reportId}::uuid AND EXISTS (SELECT 1 FROM authorized_moderator)
      FOR UPDATE
    ), created_reference AS (
      INSERT INTO moderation_evidence_references (
        id, report_id, created_by_user_id, source_type, sensitivity, label,
        reference_key, preservation_purpose, retention_review_at
      )
      SELECT ${evidenceId}::uuid, id, ${moderator.user.id}, ${validation.sourceType},
        ${validation.sensitivity}, ${validation.label}, ${validation.referenceKey},
        ${validation.preservationPurpose}, NOW() + (${validation.reviewAfterDays} * INTERVAL '1 day')
      FROM eligible_report
      RETURNING id, report_id, retention_review_at
    ), moderation_audit AS (
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
      SELECT report_id, 'moderator', ${moderator.user.id}, 'evidence_preserved',
        jsonb_build_object('evidenceReferenceId', id, 'sourceType', ${validation.sourceType},
          'sensitivity', ${validation.sensitivity}, 'reviewAfterDays', ${validation.reviewAfterDays})
      FROM created_reference
    ), access_audit AS (
      INSERT INTO moderation_case_access_log (report_id, actor_user_id, access_type, purpose, metadata)
      SELECT report_id, ${moderator.user.id}, 'evidence_reference_created', 'case_review',
        jsonb_build_object('evidenceReferenceId', id, 'role', authorized_moderator.role)
      FROM created_reference CROSS JOIN authorized_moderator
    )
    SELECT id, retention_review_at FROM created_reference
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Safety case not found or access was revoked." }, { status: 409 });
  return NextResponse.json({ success: true, evidenceReferenceId: rows[0].id, retentionReviewAt: rows[0].retention_review_at }, { status: 201 });
}
