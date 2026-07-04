import "server-only";

import crypto from "node:crypto";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import {
  attendanceTokenExpired,
  buildAttendanceReminderEmail,
  dispatchAttendanceReminderEmail,
  generateAttendanceToken,
  hashAttendanceToken,
  isWithinReminderWindow,
  type AttendanceStatus,
} from "@/lib/attendance-confirmation";
import { getDatabase } from "@/lib/db";

// DB operations for the T-2h attendance confirmation loop
// (CX-20260704-feature-event-attendance-confirmation). Pure token/window/email
// logic lives in `attendance-confirmation.ts`; this module is the server-only
// data layer that the cron sweep, the tokenized links, and the in-app prompt use.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttendanceActionResult = "confirmed" | "cancelled" | "expired" | "invalid" | "already-cancelled";

export type AttendanceEventSummary = Readonly<{
  eventId: string;
  sport: string;
  areaLabel: string;
  city: string;
  startsAt: string;
  timeZone: string;
}>;

function formatWhen(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
  }).format(date);
}

type ConfirmationRow = {
  id: string;
  status: AttendanceStatus;
  member_id: string | number;
  event_id: string;
  sport: string;
  public_area_label: string;
  public_city: string;
  starts_at: string;
  time_zone: string;
  has_seat: boolean;
};

function summaryFromRow(row: ConfirmationRow): AttendanceEventSummary {
  return {
    eventId: String(row.event_id),
    sport: row.sport,
    areaLabel: row.public_area_label,
    city: row.public_city,
    startsAt: row.starts_at,
    timeZone: row.time_zone,
  };
}

async function loadConfirmationByToken(eventId: string, rawToken: string): Promise<ConfirmationRow | null> {
  if (!UUID_PATTERN.test(eventId) || typeof rawToken !== "string" || rawToken.length < 16) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT c.id, c.status, c.member_id, e.id AS event_id, e.sport,
      e.public_area_label, e.public_city, e.starts_at, e.time_zone,
      EXISTS (SELECT 1 FROM event_participants p WHERE p.event_id = e.id AND p.user_id = c.member_id) AS has_seat
    FROM event_attendance_confirmations AS c
    JOIN events AS e ON e.id = c.event_id
    WHERE c.event_id = ${eventId}::uuid
      AND c.token_hash = ${hashAttendanceToken(rawToken)}
      AND e.status = 'published'
    LIMIT 1
  ` as unknown as ConfirmationRow[];
  return rows[0] ?? null;
}

/** Read-only lookup for the confirm/cancel landing page — never mutates. */
export async function getAttendanceTokenView(
  eventId: string,
  rawToken: string,
  now: Date = new Date(),
): Promise<{ summary: AttendanceEventSummary; status: AttendanceStatus; expired: boolean } | null> {
  const row = await loadConfirmationByToken(eventId, rawToken);
  if (!row) return null;
  return { summary: summaryFromRow(row), status: row.status, expired: attendanceTokenExpired(row.starts_at, now) };
}

/** Confirm attendance via a tokenized link. Idempotent; expired tokens rejected. */
export async function confirmAttendanceByToken(eventId: string, rawToken: string, now: Date = new Date()): Promise<AttendanceActionResult> {
  const row = await loadConfirmationByToken(eventId, rawToken);
  if (!row) return "invalid";
  if (attendanceTokenExpired(row.starts_at, now)) return "expired";
  if (row.status === "cancelled") return "already-cancelled"; // reversible only by re-requesting
  const sql = getDatabase();
  await sql`
    UPDATE event_attendance_confirmations
    SET status = 'confirmed', responded_at = NOW()
    WHERE id = ${row.id}::uuid AND status <> 'cancelled'
  `;
  return "confirmed";
}

/** Cancel attendance via a tokenized link — releases the seat. Idempotent. */
export async function cancelAttendanceByToken(eventId: string, rawToken: string, now: Date = new Date()): Promise<AttendanceActionResult> {
  const row = await loadConfirmationByToken(eventId, rawToken);
  if (!row) return "invalid";
  if (attendanceTokenExpired(row.starts_at, now)) return "expired";
  if (row.status === "cancelled") return "cancelled"; // idempotent
  await releaseSeatAndCancel(String(row.event_id), String(row.member_id), row.id);
  return "cancelled";
}

/**
 * Atomically release a member's seat and mark them cancelled: delete the
 * participant seat (spots-left increments), cancel their join request, and set
 * the confirmation row cancelled. The released seat reopens the event; the host
 * sees the change in their breakdown. Reversible only by re-requesting a place.
 */
async function releaseSeatAndCancel(eventId: string, memberId: string, confirmationId: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    WITH released AS (
      DELETE FROM event_participants WHERE event_id = ${eventId}::uuid AND user_id = ${memberId}
    ), cancelled_request AS (
      UPDATE join_requests
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE event_id = ${eventId}::uuid AND requester_user_id = ${memberId} AND status IN ('pending', 'accepted')
    )
    UPDATE event_attendance_confirmations
    SET status = 'cancelled', responded_at = NOW()
    WHERE id = ${confirmationId}::uuid
  `;
}

/**
 * The idempotent reminder sweep. For every published event starting within the
 * next 2 hours, create a `pending` confirmation (+ token) for each accepted
 * attendee that has none yet, and dispatch the DARK reminder email. The UNIQUE
 * (event_id, member_id) + `ON CONFLICT DO NOTHING` + the "no row yet" filter make
 * overlapping cron runs safe — an attendee is reminded at most once.
 */
export async function runAttendanceReminderSweep(now: Date = new Date()): Promise<{ created: number; simulated: number; suppressed: number }> {
  const sql = getDatabase();
  const nowIso = now.toISOString();
  const candidates = await sql`
    SELECT e.id AS event_id, e.sport, e.public_area_label, e.public_city, e.starts_at, e.time_zone,
      m.id AS member_id, m.email, m.first_name
    FROM events AS e
    JOIN event_participants AS p ON p.event_id = e.id
    JOIN users AS m ON m.id = p.user_id AND m.account_status = 'active'
    WHERE e.status = 'published'
      AND e.starts_at > ${nowIso}::timestamptz
      AND e.starts_at <= ${nowIso}::timestamptz + INTERVAL '2 hours'
      AND NOT EXISTS (
        SELECT 1 FROM event_attendance_confirmations AS c
        WHERE c.event_id = e.id AND c.member_id = m.id
      )
    LIMIT 500
  ` as unknown as Array<{
    event_id: string; sport: string; public_area_label: string; public_city: string;
    starts_at: string; time_zone: string; member_id: string | number; email: string; first_name: string;
  }>;

  const origin = resolveAuthEmailOrigin() ?? "https://keepitup.social";
  let created = 0;
  let simulated = 0;
  let suppressed = 0;

  for (const candidate of candidates) {
    const token = generateAttendanceToken();
    const inserted = await sql`
      INSERT INTO event_attendance_confirmations (id, event_id, member_id, status, token_hash, reminded_at)
      VALUES (${crypto.randomUUID()}::uuid, ${candidate.event_id}::uuid, ${candidate.member_id}, 'pending', ${token.hash}, NOW())
      ON CONFLICT (event_id, member_id) DO NOTHING
      RETURNING id
    ` as unknown as Array<{ id: string }>;
    if (inserted.length === 0) continue; // another run created it first — never double-remind
    created += 1;

    const draft = buildAttendanceReminderEmail({
      origin,
      eventId: String(candidate.event_id),
      rawToken: token.raw,
      to: candidate.email,
      firstName: candidate.first_name,
      sport: candidate.sport,
      areaLabel: candidate.public_area_label,
      city: candidate.public_city,
      whenLabel: formatWhen(candidate.starts_at, candidate.time_zone),
    });
    const result = await dispatchAttendanceReminderEmail(draft);
    if (result.state === "simulated") simulated += 1;
    else suppressed += 1;
  }

  return { created, simulated, suppressed };
}

// ── In-app (authenticated) member + host operations ──────────────────────────

export type ViewerAttendanceState = Readonly<{
  withinWindow: boolean;
  status: AttendanceStatus;
  startsAt: string;
  timeZone: string;
}>;

/**
 * The accepted member's own confirmation state for the in-app prompt. Returns
 * null when the viewer is the host, is not an accepted participant, or the event
 * is not published. `withinWindow` gates whether the prompt shows.
 */
export async function getViewerAttendanceState(eventId: string, userId: string, now: Date = new Date()): Promise<ViewerAttendanceState | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT e.starts_at, e.time_zone, (e.host_user_id = ${userId}) AS is_host,
      EXISTS (SELECT 1 FROM event_participants p WHERE p.event_id = e.id AND p.user_id = ${userId}) AS has_seat,
      c.status AS confirmation_status
    FROM events AS e
    LEFT JOIN event_attendance_confirmations AS c ON c.event_id = e.id AND c.member_id = ${userId}
    WHERE e.id = ${eventId}::uuid AND e.status = 'published'
    LIMIT 1
  ` as unknown as Array<{ starts_at: string; time_zone: string; is_host: boolean; has_seat: boolean; confirmation_status: AttendanceStatus | null }>;
  const row = rows[0];
  if (!row || row.is_host || !row.has_seat) return null;
  return {
    withinWindow: isWithinReminderWindow(row.starts_at, now),
    status: row.confirmation_status ?? "pending",
    startsAt: row.starts_at,
    timeZone: row.time_zone,
  };
}

/** Confirm the authenticated viewer's own attendance (in-app prompt). */
export async function confirmAttendanceByMember(eventId: string, userId: string, now: Date = new Date()): Promise<AttendanceActionResult> {
  const state = await getViewerAttendanceState(eventId, userId, now);
  if (!state) return "invalid";
  if (attendanceTokenExpired(state.startsAt, now)) return "expired";
  if (!state.withinWindow) return "invalid";
  if (state.status === "cancelled") return "already-cancelled";
  const sql = getDatabase();
  const token = generateAttendanceToken();
  await sql`
    INSERT INTO event_attendance_confirmations (id, event_id, member_id, status, token_hash, responded_at)
    VALUES (${crypto.randomUUID()}::uuid, ${eventId}::uuid, ${userId}, 'confirmed', ${token.hash}, NOW())
    ON CONFLICT (event_id, member_id)
    DO UPDATE SET status = 'confirmed', responded_at = NOW()
    WHERE event_attendance_confirmations.status <> 'cancelled'
  `;
  return "confirmed";
}

/** Cancel the authenticated viewer's own attendance (in-app) — releases the seat. */
export async function cancelAttendanceByMember(eventId: string, userId: string, now: Date = new Date()): Promise<AttendanceActionResult> {
  const state = await getViewerAttendanceState(eventId, userId, now);
  if (!state) return "invalid";
  if (attendanceTokenExpired(state.startsAt, now)) return "expired";
  if (state.status === "cancelled") return "cancelled";
  const sql = getDatabase();
  const token = generateAttendanceToken();
  // Ensure a confirmation row exists (cancelled) even if the sweep hasn't run yet,
  // then release the seat + cancel the join request in one statement.
  await sql`
    INSERT INTO event_attendance_confirmations (id, event_id, member_id, status, token_hash, responded_at)
    VALUES (${crypto.randomUUID()}::uuid, ${eventId}::uuid, ${userId}, 'cancelled', ${token.hash}, NOW())
    ON CONFLICT (event_id, member_id)
    DO UPDATE SET status = 'cancelled', responded_at = NOW()
  `;
  await sql`
    WITH released AS (
      DELETE FROM event_participants WHERE event_id = ${eventId}::uuid AND user_id = ${userId}
    )
    UPDATE join_requests
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE event_id = ${eventId}::uuid AND requester_user_id = ${userId} AND status IN ('pending', 'accepted')
  `;
  return "cancelled";
}

export type AttendanceBreakdown = Readonly<{ confirmed: number; pending: number; cancelled: number }>;

/** Host-only confirmed/pending/cancelled counts for an event the viewer hosts. */
export async function getEventAttendanceBreakdown(eventId: string, hostId: string): Promise<AttendanceBreakdown | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE c.status = 'confirmed')::integer AS confirmed,
      COUNT(*) FILTER (WHERE c.status = 'pending')::integer AS pending,
      COUNT(*) FILTER (WHERE c.status = 'cancelled')::integer AS cancelled
    FROM events AS e
    LEFT JOIN event_attendance_confirmations AS c ON c.event_id = e.id
    WHERE e.id = ${eventId}::uuid AND e.host_user_id = ${hostId}
    GROUP BY e.id
    LIMIT 1
  ` as unknown as Array<{ confirmed: number; pending: number; cancelled: number }>;
  const row = rows[0];
  if (!row) return null;
  return { confirmed: row.confirmed, pending: row.pending, cancelled: row.cancelled };
}
