import "server-only";

import { randomUUID } from "node:crypto";

import type { FeedbackCategory, FeedbackSeverity, FeedbackSurface, FeedbackTicketInput } from "@sport-date/domain";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { getDatabase } from "@/lib/db";
import { sendGmailEmail } from "@/lib/gmail-email-delivery";
import {
  MEMBER_FEEDBACK_STATUS_INFO,
  buildFeedbackUpdateEmail,
  dispatchFeedbackNotification,
  normalizeMemberFeedbackStatus,
  type MemberFeedbackStatus,
} from "@/lib/feedback-thread";

// Retained for back-compat; the member-visible lifecycle is MemberFeedbackStatus.
export type FeedbackTicketStatus = "open" | "in_progress" | "resolved" | "closed";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  /** The honest, member-visible lifecycle status (legacy values normalised). */
  status: MemberFeedbackStatus;
  createdAt: string;
  lastActivityAt: string;
  /** True when the team has replied or changed status since the member last looked. */
  hasUnread: boolean;
}>;

export type FeedbackComment = Readonly<{
  id: string;
  authorKind: "member" | "team";
  /** Member-facing author label: "You" for the submitter, "KeepItUp team" otherwise. */
  authorLabel: string;
  body: string;
  createdAt: string;
}>;

export type FeedbackTicketThread = Readonly<{ ticket: FeedbackTicket; comments: FeedbackComment[] }>;

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
  status: string;
  created_at: string;
  last_activity_at: string;
  has_unread: boolean;
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
    status: normalizeMemberFeedbackStatus(row.status),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    hasUnread: Boolean(row.has_unread),
  };
}

type FeedbackCommentRow = {
  id: string;
  author_kind: "member" | "team";
  body: string;
  created_at: string;
};

function mapFeedbackComment(row: FeedbackCommentRow): FeedbackComment {
  return {
    id: row.id,
    authorKind: row.author_kind,
    // We NEVER expose which team member/agent replied — just "KeepItUp team".
    authorLabel: row.author_kind === "member" ? "You" : "KeepItUp team",
    body: row.body,
    createdAt: row.created_at,
  };
}


export async function createFeedbackTicket(reporterUserId: string, input: FeedbackTicketInput): Promise<FeedbackTicket> {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO feedback_tickets (
      id, reporter_user_id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, last_activity_at
    ) VALUES (
      ${randomUUID()}::uuid, ${reporterUserId}, ${input.category}, ${input.surface},
      ${input.summary}, ${input.details}, ${input.currentPath}, ${input.expectedOutcome},
      ${input.actualOutcome}, ${input.severity}, NOW()
    )
    RETURNING id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at, last_activity_at,
      false AS has_unread
  ` as unknown as FeedbackTicketRow[];
  return mapFeedbackTicket(rows[0]);
}

export async function getFeedbackTickets(reporterUserId: string): Promise<FeedbackTicket[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at, last_activity_at,
      (last_team_activity_at IS NOT NULL
        AND last_team_activity_at > COALESCE(member_last_seen_at, 'epoch'::timestamptz)) AS has_unread
    FROM feedback_tickets
    WHERE reporter_user_id = ${reporterUserId}
    ORDER BY last_activity_at DESC
    LIMIT 100
  ` as unknown as FeedbackTicketRow[];
  return rows.map(mapFeedbackTicket);
}

/** Count of the member's tickets with a team update they haven't seen — the in-app "heard" badge. */
export async function countUnreadFeedback(reporterUserId: string): Promise<number> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT COUNT(*)::integer AS count
    FROM feedback_tickets
    WHERE reporter_user_id = ${reporterUserId}
      AND last_team_activity_at IS NOT NULL
      AND last_team_activity_at > COALESCE(member_last_seen_at, 'epoch'::timestamptz)
  ` as unknown as Array<{ count: number }>;
  return rows[0]?.count ?? 0;
}

/**
 * A single ticket + its full thread for the SUBMITTER only. Returns null when the
 * ticket doesn't exist or isn't the viewer's — so the caller answers 404/redirect
 * without disclosing another member's feedback (strict per-submitter privacy).
 */
export async function getFeedbackTicketForMember(ticketId: string, reporterUserId: string): Promise<FeedbackTicketThread | null> {
  if (!UUID_PATTERN.test(ticketId)) return null;
  const sql = getDatabase();
  const ticketRows = await sql`
    SELECT id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at, last_activity_at,
      (last_team_activity_at IS NOT NULL
        AND last_team_activity_at > COALESCE(member_last_seen_at, 'epoch'::timestamptz)) AS has_unread
    FROM feedback_tickets
    WHERE id = ${ticketId}::uuid AND reporter_user_id = ${reporterUserId}
    LIMIT 1
  ` as unknown as FeedbackTicketRow[];
  const ticketRow = ticketRows[0];
  if (!ticketRow) return null;
  const commentRows = await sql`
    SELECT id, author_kind, body, created_at
    FROM feedback_ticket_comments
    WHERE ticket_id = ${ticketId}::uuid
    ORDER BY created_at ASC, id ASC
    LIMIT 200
  ` as unknown as FeedbackCommentRow[];
  return { ticket: mapFeedbackTicket(ticketRow), comments: commentRows.map(mapFeedbackComment) };
}

/** Mark the submitter's ticket as seen (clears its "heard" badge). Owner-scoped. */
export async function markFeedbackTicketSeen(ticketId: string, reporterUserId: string): Promise<void> {
  if (!UUID_PATTERN.test(ticketId)) return;
  const sql = getDatabase();
  await sql`
    UPDATE feedback_tickets SET member_last_seen_at = NOW()
    WHERE id = ${ticketId}::uuid AND reporter_user_id = ${reporterUserId}
  `;
}

/**
 * The submitter adds a reply to their OWN ticket. Owner-enforced. Bumps
 * `last_activity_at` but NOT `last_team_activity_at`, so the member's own reply
 * never shows up as an unread "update from the team" to themselves. Returns the
 * stored comment, or null when the ticket isn't the viewer's.
 */
export async function addMemberFeedbackComment(ticketId: string, reporterUserId: string, body: string): Promise<FeedbackComment | null> {
  if (!UUID_PATTERN.test(ticketId)) return null;
  const sql = getDatabase();
  const owned = await sql`
    UPDATE feedback_tickets SET last_activity_at = NOW()
    WHERE id = ${ticketId}::uuid AND reporter_user_id = ${reporterUserId}
    RETURNING id
  ` as unknown as Array<{ id: string }>;
  if (owned.length === 0) return null;
  const rows = await sql`
    INSERT INTO feedback_ticket_comments (id, ticket_id, author_kind, author_id, body)
    VALUES (${randomUUID()}::uuid, ${ticketId}::uuid, 'member', ${reporterUserId}, ${body})
    RETURNING id, author_kind, body, created_at
  ` as unknown as FeedbackCommentRow[];
  return mapFeedbackComment(rows[0]);
}

// ── Internal agent/admin path (never reachable by members) ───────────────────

export type AgentFeedbackTicket = FeedbackTicket & Readonly<{ reporterUserId: string; reporterFirstName: string; commentCount: number }>;

/**
 * List OPEN member feedback for triage by an authenticated agent/admin. Excludes
 * resolved + closed tickets. Includes the reporter id/name and comment count so
 * an agent can prioritise; the caller (internal route) enforces the secret auth.
 */
export async function listOpenFeedbackForAgent(limit = 100): Promise<AgentFeedbackTicket[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT t.id, t.category, t.surface, t.summary, t.details, t.current_path,
      t.expected_outcome, t.actual_outcome, t.severity, t.status, t.created_at, t.last_activity_at,
      false AS has_unread,
      t.reporter_user_id, reporter.first_name AS reporter_first_name,
      (SELECT COUNT(*)::integer FROM feedback_ticket_comments c WHERE c.ticket_id = t.id) AS comment_count
    FROM feedback_tickets AS t
    JOIN users AS reporter ON reporter.id = t.reporter_user_id
    WHERE t.status NOT IN ('resolved', 'closed', 'closed_not_planned')
    ORDER BY t.last_activity_at ASC
    LIMIT ${Math.min(Math.max(1, limit), 200)}
  ` as unknown as Array<FeedbackTicketRow & { reporter_user_id: string | number; reporter_first_name: string; comment_count: number }>;
  return rows.map((row) => ({
    ...mapFeedbackTicket(row),
    reporterUserId: String(row.reporter_user_id),
    reporterFirstName: row.reporter_first_name,
    commentCount: row.comment_count,
  }));
}

/**
 * A team/AI reply posted through the internal path. `authorId` is the acting user
 * when there is one (or null for an agent). Bumps BOTH activity markers, so the
 * member's "heard" badge lights up. Then fires the DARK member-update email.
 * Returns the comment, or null if the ticket is unknown.
 */
export async function addTeamFeedbackReply(ticketId: string, authorId: string | null, body: string): Promise<FeedbackComment | null> {
  if (!UUID_PATTERN.test(ticketId)) return null;
  const sql = getDatabase();
  const updated = await sql`
    UPDATE feedback_tickets SET last_activity_at = NOW(), last_team_activity_at = NOW()
    WHERE id = ${ticketId}::uuid
    RETURNING id
  ` as unknown as Array<{ id: string }>;
  if (updated.length === 0) return null;
  const rows = await sql`
    INSERT INTO feedback_ticket_comments (id, ticket_id, author_kind, author_id, body)
    VALUES (${randomUUID()}::uuid, ${ticketId}::uuid, 'team', ${authorId}, ${body})
    RETURNING id, author_kind, body, created_at
  ` as unknown as FeedbackCommentRow[];
  await notifyMemberOfFeedbackUpdate(ticketId);
  return mapFeedbackComment(rows[0]);
}

/**
 * Change a ticket's member-visible status through the internal path. Bumps the
 * team-activity marker (lights the member's badge) and fires the DARK email.
 * Returns the updated ticket, or null if unknown.
 */
export async function setFeedbackStatus(ticketId: string, status: MemberFeedbackStatus): Promise<FeedbackTicket | null> {
  if (!UUID_PATTERN.test(ticketId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    UPDATE feedback_tickets
    SET status = ${status}, last_activity_at = NOW(), last_team_activity_at = NOW(), updated_at = NOW()
    WHERE id = ${ticketId}::uuid
    RETURNING id, category, surface, summary, details, current_path,
      expected_outcome, actual_outcome, severity, status, created_at, last_activity_at,
      true AS has_unread
  ` as unknown as FeedbackTicketRow[];
  if (rows.length === 0) return null;
  await notifyMemberOfFeedbackUpdate(ticketId);
  return mapFeedbackTicket(rows[0]);
}

/**
 * Fire the member-update notification for a ticket through the DARK email gate.
 * Best-effort and non-throwing: a mail failure must never break the write path.
 * When delivery is disabled (the default) this is a logged no-op — the in-app
 * "heard" indicator is the real signal until the owner enables email.
 */
async function notifyMemberOfFeedbackUpdate(ticketId: string): Promise<void> {
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT t.summary, t.status, reporter.email, reporter.first_name
      FROM feedback_tickets AS t
      JOIN users AS reporter ON reporter.id = t.reporter_user_id
      WHERE t.id = ${ticketId}::uuid
      LIMIT 1
    ` as unknown as Array<{ summary: string; status: string; email: string; first_name: string }>;
    const row = rows[0];
    if (!row) return;
    const status = normalizeMemberFeedbackStatus(row.status);
    const draft = buildFeedbackUpdateEmail({
      origin: resolveAuthEmailOrigin() ?? "https://keepitup.social",
      ticketId,
      to: row.email,
      firstName: row.first_name,
      summary: row.summary,
      statusLabel: MEMBER_FEEDBACK_STATUS_INFO[status].label,
    });
    await dispatchFeedbackNotification(draft, {
      env: process.env,
      send: async (email) => { await sendGmailEmail(email); },
      log: (message, meta) => console.info(message, meta),
    });
  } catch (error) {
    console.error("Feedback-update notification failed (non-fatal):", error);
  }
}
