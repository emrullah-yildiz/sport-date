import crypto from "node:crypto";

import { validateSafetyAppeal } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { reportId } = await params;
  if (!UUID_PATTERN.test(reportId)) return NextResponse.json({ error: "Safety case not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateSafetyAppeal(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const sql = getDatabase();
  const appealId = crypto.randomUUID();
  const rows = await sql`
    WITH eligible_report AS (
      SELECT id FROM safety_reports
      WHERE id = ${reportId}::uuid AND reporter_user_id = ${user.id}
        AND status IN ('actioned', 'dismissed')
        AND decision_summary IS NOT NULL
        AND appeal_deadline >= NOW()
    ), created_appeal AS (
      INSERT INTO moderation_appeals (id, report_id, appellant_user_id, reason)
      SELECT ${appealId}::uuid, id, ${user.id}, ${validation.reason} FROM eligible_report
      ON CONFLICT (report_id, appellant_user_id) DO NOTHING
      RETURNING id, report_id
    ), audit AS (
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
      SELECT report_id, 'member', ${user.id}, 'appeal_created', jsonb_build_object('appealId', id)
      FROM created_appeal
    )
    SELECT id FROM created_appeal
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "This case is not eligible for appeal, the deadline passed, or an appeal already exists." }, { status: 409 });
  }
  return NextResponse.json({ success: true, appealId }, { status: 201 });
}
