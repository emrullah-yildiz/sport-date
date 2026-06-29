import "server-only";

import { randomUUID } from "node:crypto";

import type { FeedbackCategory, FeedbackSeverity, FeedbackSurface, FeedbackTicketInput } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

export type FeedbackTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type FeedbackTicket = Readonly<{
  id: string;
  category: FeedbackCategory;
  surface: FeedbackSurface;
  summary: string;
  details: string;
  currentPath: string;
  expectedOutcome: string | null;
  actualOutcome: string | null;
  severity: FeedbackSeverity;
  status: FeedbackTicketStatus;
  createdAt: string;
}>;

type FeedbackTicketRow = {
  id: string;
  category: FeedbackCategory;
  surface: FeedbackSurface;
  summary: string;
  details: string;
  current_path: string;
  expected_outcome: string | null;
  actual_outcome: string | null;
  severity: FeedbackSeverity;
  status: FeedbackTicketStatus;
  created_at: string;
};

function mapFeedbackTicket(row: FeedbackTicketRow): FeedbackTicket {
  return {
    id: row.id,
    category: row.category,
    surface: row.surface,
    summary: row.summary,
    details: row.details,
    currentPath: row.current_path,
    expectedOutcome: row.expected_outcome,
    actualOutcome: row.actual_outcome,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createFeedbackTicket(reporterUserId: string, input: FeedbackTicketInput): Promise<FeedbackTicket> {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO feedback_tickets (
      id, reporter_user_id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity
    ) VALUES (
      ${randomUUID()}::uuid, ${reporterUserId}, ${input.category}, ${input.surface},
      ${input.summary}, ${input.details}, ${input.currentPath}, ${input.expectedOutcome},
      ${input.actualOutcome}, ${input.severity}
    )
    RETURNING id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at
  ` as unknown as FeedbackTicketRow[];
  return mapFeedbackTicket(rows[0]);
}

export async function getFeedbackTickets(reporterUserId: string): Promise<FeedbackTicket[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at
    FROM feedback_tickets
    WHERE reporter_user_id = ${reporterUserId}
    ORDER BY created_at DESC
    LIMIT 100
  ` as unknown as FeedbackTicketRow[];
  return rows.map(mapFeedbackTicket);
}
