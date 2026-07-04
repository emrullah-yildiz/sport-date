import "server-only";

import crypto from "node:crypto";

import type { SafetyPriority, SafetyReportInput } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

type SqlClient = ReturnType<typeof getDatabase>;

export type SharedUpcomingEvent = Readonly<{
  eventId: string;
  // The BLOCKER's OWN accepted join-request id for this event — their own data,
  // so a one-tap "leave this event" needs no extra lookup.
  requestId: string;
  sport: string;
  title: string;
  startsAt: string;
  timeZone: string;
}>;

export type BlockResult = Readonly<{
  blocked: boolean;
  // Upcoming THIRD-PARTY events (hosted by neither party) where the blocker and the
  // blocked member are BOTH still accepted participants after the block. The
  // host↔member seat removal below already unseats them from each other's own
  // events, so what remains is exactly the in-person overlap that blocking is meant
  // to defuse: they are scheduled into the same meetup with a stranger's event. We
  // surface these so the blocker can be warned and offered a one-tap leave. This
  // exposes nothing new — the blocker is a participant in each of these events and
  // can already see its attendees in the room; we NEVER reveal the blocked member's
  // participation in any event the blocker is not themselves part of.
  sharedUpcomingEvents: readonly SharedUpcomingEvent[];
}>;

// The block mutation as a set of statements, so every block path (the standalone
// blockMember AND createSafetyReport's report-and-block branch) shares ONE
// definition and its side-effects — including the `account_status = 'active'`
// guard on the insert — can never drift apart (audit finding 8).
function blockMutationQueries(sql: SqlClient, blockerId: string, blockedId: string) {
  return [
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
  ];
}

// Upcoming events where BOTH the blocker and the blocked member still hold an
// accepted seat and NEITHER hosts (a third party's event). Run after the block
// mutation so any host↔member seat just removed is already excluded. Only the
// blocker's own request id is selected.
function sharedUpcomingEventsQuery(sql: SqlClient, blockerId: string, blockedId: string) {
  return sql`
    SELECT e.id AS event_id, e.sport, e.title, e.starts_at, e.time_zone, blocker_request.id AS request_id
    FROM events AS e
    JOIN event_participants AS blocker_seat ON blocker_seat.event_id = e.id AND blocker_seat.user_id = ${blockerId}
    JOIN event_participants AS blocked_seat ON blocked_seat.event_id = e.id AND blocked_seat.user_id = ${blockedId}
    JOIN join_requests AS blocker_request
      ON blocker_request.event_id = e.id AND blocker_request.requester_user_id = ${blockerId} AND blocker_request.status = 'accepted'
    WHERE e.status = 'published' AND e.starts_at > NOW()
      AND e.host_user_id <> ${blockerId} AND e.host_user_id <> ${blockedId}
    ORDER BY e.starts_at ASC
  `;
}

type SharedEventRow = { event_id: string; sport: string; title: string; starts_at: string; time_zone: string; request_id: string };

function mapSharedEvents(rows: readonly SharedEventRow[]): SharedUpcomingEvent[] {
  return rows.map((row) => ({
    eventId: String(row.event_id),
    requestId: String(row.request_id),
    sport: row.sport,
    title: row.title,
    startsAt: row.starts_at,
    timeZone: row.time_zone,
  }));
}

export async function blockMember(blockerId: string, blockedId: string): Promise<BlockResult> {
  const sql = getDatabase();
  const results = await sql.transaction([
    ...blockMutationQueries(sql, blockerId, blockedId),
    sharedUpcomingEventsQuery(sql, blockerId, blockedId),
  ]);
  let blocked = results[0].length > 0;
  if (!blocked) {
    const existing = await sql`SELECT 1 FROM user_blocks WHERE blocker_user_id = ${blockerId} AND blocked_user_id = ${blockedId}`;
    blocked = existing.length > 0;
  }
  // Only surface the co-participant warning when the block is actually in effect.
  const sharedUpcomingEvents = blocked ? mapSharedEvents(results[3] as unknown as SharedEventRow[]) : [];
  return { blocked, sharedUpcomingEvents };
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
  // When the report also blocks the subject, reuse the SINGLE shared block mutation
  // (so the active-account guard and seat/request removal never drift from
  // blockMember), then read the same co-participant overlap so a report-and-block
  // gets the identical warning + one-tap leave as a standalone block.
  let sharedEventsIndex = -1;
  if (report.blockUser && report.reportedUserId) {
    const blockedId = String(report.reportedUserId);
    queries.push(
      ...blockMutationQueries(sql, reporterId, blockedId),
      sql`
        INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
        VALUES (${reportId}::uuid, 'system', NULL, 'subject_blocked', '{}'::jsonb)
      `,
    );
    sharedEventsIndex = queries.length;
    queries.push(sharedUpcomingEventsQuery(sql, reporterId, blockedId));
  }
  const results = await sql.transaction(queries);
  const sharedUpcomingEvents = sharedEventsIndex >= 0
    ? mapSharedEvents(results[sharedEventsIndex] as unknown as SharedEventRow[])
    : [];
  return { reportId, priority, sharedUpcomingEvents };
}
