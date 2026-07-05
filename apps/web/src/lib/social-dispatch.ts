import "server-only";

import { getDatabase } from "@/lib/db";

// Social dispatch trigger data layer (CX-20260705-social-dispatch-trigger).
//
// The owner records a "schedule my approved posts now" go-signal via the
// owner-gated POST; the CEO loop reads the latest UNHANDLED signal via the
// internal secret-guarded GET and stamps it handled once acted on. Internal
// marketing signal only — no member PII.

export type SocialDispatchRequest = Readonly<{
  id: string;
  requestedBy: string | null;
  requestedAt: string;
  handledAt: string | null;
}>;

type SocialDispatchRow = {
  id: string;
  requested_by: string | null;
  requested_at: string | Date;
  handled_at: string | Date | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDispatchId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function toIso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

function mapRequest(row: SocialDispatchRow): SocialDispatchRequest {
  return {
    id: row.id,
    requestedBy: row.requested_by,
    requestedAt: toIso(row.requested_at) as string,
    handledAt: toIso(row.handled_at),
  };
}

/**
 * Count approved ideas that have not yet been scheduled — the work a dispatch
 * signal asks the CEO to do. Mirrors the queue's own "approved but unscheduled"
 * definition (status='approved' AND scheduled_ref IS NULL).
 */
export async function countApprovedUnscheduled(): Promise<number> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM social_content_ideas
    WHERE status = 'approved' AND scheduled_ref IS NULL
  `) as unknown as { count: number }[];
  return rows[0]?.count ?? 0;
}

/** Owner-gated: record a fresh dispatch request (unhandled). */
export async function recordDispatchRequest(requestedBy: string | null): Promise<SocialDispatchRequest> {
  const sql = getDatabase();
  const rows = (await sql`
    INSERT INTO social_dispatch_requests (requested_by)
    VALUES (${requestedBy})
    RETURNING id, requested_by, requested_at, handled_at
  `) as unknown as SocialDispatchRow[];
  return mapRequest(rows[0]);
}

/**
 * Internal: the latest UNHANDLED dispatch request, or null when there is none.
 * This is how the CEO loop detects "the owner clicked go."
 */
export async function latestUnhandledDispatch(): Promise<SocialDispatchRequest | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT id, requested_by, requested_at, handled_at
    FROM social_dispatch_requests
    WHERE handled_at IS NULL
    ORDER BY requested_at DESC, id DESC
    LIMIT 1
  `) as unknown as SocialDispatchRow[];
  const row = rows[0];
  return row ? mapRequest(row) : null;
}

/**
 * Internal: stamp a request handled. Only affects a still-unhandled row, so a
 * double-handle is a no-op. Returns the updated request, or null when the id is
 * unknown or was already handled.
 */
export async function markDispatchHandled(id: string): Promise<SocialDispatchRequest | null> {
  if (!isValidDispatchId(id)) return null;
  const sql = getDatabase();
  const rows = (await sql`
    UPDATE social_dispatch_requests
    SET handled_at = NOW()
    WHERE id = ${id}::uuid AND handled_at IS NULL
    RETURNING id, requested_by, requested_at, handled_at
  `) as unknown as SocialDispatchRow[];
  const row = rows[0];
  return row ? mapRequest(row) : null;
}
