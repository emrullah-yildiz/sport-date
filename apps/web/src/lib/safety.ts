import "server-only";

import { getDatabase } from "@/lib/db";

export type MemberSafetyCase = Readonly<{
  id: string;
  category: string;
  status: "open" | "triaged" | "investigating" | "actioned" | "dismissed";
  priority: "standard" | "urgent" | "critical";
  createdAt: string;
  event: { id: string; title: string; sport: string } | null;
  decision: { code: string; summary: string; decidedAt: string; appealDeadline: string } | null;
  appeal: { status: "open" | "reviewing" | "upheld" | "modified" | "reversed"; createdAt: string; outcomeSummary: string | null } | null;
  canAppeal: boolean;
}>;

type MemberSafetyCaseRow = {
  id: string;
  category: string;
  status: MemberSafetyCase["status"];
  priority: MemberSafetyCase["priority"];
  created_at: string;
  event_id: string | null;
  event_title: string | null;
  event_sport: string | null;
  decision_code: string | null;
  decision_summary: string | null;
  decided_at: string | null;
  appeal_deadline: string | null;
  appeal_status: NonNullable<MemberSafetyCase["appeal"]>["status"] | null;
  appeal_created_at: string | null;
  outcome_summary: string | null;
  can_appeal: boolean;
};

export async function getMemberSafetyCases(userId: string): Promise<MemberSafetyCase[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT report.id, report.category, report.status, report.priority, report.created_at,
      events.id AS event_id, events.title AS event_title, events.sport AS event_sport,
      report.decision_code, report.decision_summary, report.decided_at, report.appeal_deadline,
      appeal.status AS appeal_status, appeal.created_at AS appeal_created_at, appeal.outcome_summary,
      (report.status IN ('actioned', 'dismissed') AND report.decision_summary IS NOT NULL
        AND report.appeal_deadline >= NOW() AND appeal.id IS NULL) AS can_appeal
    FROM safety_reports AS report
    LEFT JOIN events ON events.id = report.event_id
    LEFT JOIN moderation_appeals AS appeal
      ON appeal.report_id = report.id AND appeal.appellant_user_id = ${userId}
    WHERE report.reporter_user_id = ${userId}
    ORDER BY report.created_at DESC
  ` as unknown as MemberSafetyCaseRow[];

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    event: row.event_id && row.event_title && row.event_sport
      ? { id: row.event_id, title: row.event_title, sport: row.event_sport }
      : null,
    decision: row.decision_code && row.decision_summary && row.decided_at && row.appeal_deadline
      ? { code: row.decision_code, summary: row.decision_summary, decidedAt: row.decided_at, appealDeadline: row.appeal_deadline }
      : null,
    appeal: row.appeal_status && row.appeal_created_at
      ? { status: row.appeal_status, createdAt: row.appeal_created_at, outcomeSummary: row.outcome_summary }
      : null,
    canAppeal: row.can_appeal,
  }));
}
