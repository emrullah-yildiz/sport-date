import "server-only";

import { getDatabase } from "@/lib/db";

// Daily standup direction decisions (owner request 2026-07-05). The standup
// report + proposed directions live as static JSON in the repo
// (apps/web/public/standup/latest.json); this layer stores only the owner's
// approve/deny calls made on /hq.html, keyed by the direction's stable id.
// Internal ops signal only — no member PII.

export type StandupDirectionAction = "approve" | "deny";

export type StandupDirectionDecision = Readonly<{
  directionId: string;
  action: StandupDirectionAction;
  comment: string | null;
  decidedBy: string | null;
  decidedAt: string;
}>;

// Direction ids are agent-authored slugs like "SD-20260705-1". Constrain them
// so a bad payload can't insert junk keys (they render back into the HQ page).
const DIRECTION_ID_PATTERN = /^SD-\d{8}-[a-z0-9][a-z0-9-]{0,48}$/i;

export function isValidDirectionId(id: unknown): id is string {
  return typeof id === "string" && DIRECTION_ID_PATTERN.test(id);
}

export function isStandupDirectionAction(value: unknown): value is StandupDirectionAction {
  return value === "approve" || value === "deny";
}

type DecisionRow = {
  direction_id: string;
  action: StandupDirectionAction;
  comment: string | null;
  decided_by: string | null;
  decided_at: string | Date;
};

function mapDecision(row: DecisionRow): StandupDirectionDecision {
  const at = row.decided_at instanceof Date ? row.decided_at : new Date(row.decided_at);
  return {
    directionId: row.direction_id,
    action: row.action,
    comment: row.comment,
    decidedBy: row.decided_by,
    decidedAt: Number.isFinite(at.getTime()) ? at.toISOString() : String(row.decided_at),
  };
}

/** List all decisions, newest-first (owner page overlay + CEO-loop pickup). */
export async function listStandupDecisions(): Promise<StandupDirectionDecision[]> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT direction_id, action, comment, decided_by, decided_at
    FROM standup_direction_decisions
    ORDER BY decided_at DESC
    LIMIT 500`) as unknown as DecisionRow[];
  return rows.map(mapDecision);
}

/**
 * Record (or change) the owner's call on one direction. Upsert by direction id
 * so re-deciding replaces the previous call instead of stacking rows.
 */
export async function decideStandupDirection(
  directionId: string,
  action: StandupDirectionAction,
  comment: string | undefined,
  decidedBy: string,
): Promise<StandupDirectionDecision> {
  const sql = getDatabase();
  const rows = (await sql`
    INSERT INTO standup_direction_decisions (direction_id, action, comment, decided_by)
    VALUES (${directionId}, ${action}, ${comment ?? null}, ${decidedBy})
    ON CONFLICT (direction_id) DO UPDATE SET
      action = EXCLUDED.action,
      comment = EXCLUDED.comment,
      decided_by = EXCLUDED.decided_by,
      decided_at = NOW()
    RETURNING direction_id, action, comment, decided_by, decided_at
  `) as unknown as DecisionRow[];
  return mapDecision(rows[0]);
}
