import "server-only";

import { getDatabase } from "@/lib/db";
import { isValidDirectionId } from "@/lib/standup-directions";

// Daily standup reports, published via POST /api/standup/report (owner request
// 2026-07-07: the report must land on /hq.html the moment the standup routine
// finishes). The shape mirrors the static JSON contract documented in
// docs/operations/standup-runbook.md; the static files under
// apps/web/public/standup/ remain as history + fallback. Internal ops signal
// only — no member PII.

export type StandupAgentEntry = Readonly<{
  name: string;
  status: string;
  metric: string;
  note: string;
}>;

export type StandupDirection = Readonly<{
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  recommendation: string;
}>;

export type StandupReport = Readonly<{
  day: string;
  generatedAt: string;
  headline: string;
  summary: readonly string[];
  agents: readonly StandupAgentEntry[];
  directions: readonly StandupDirection[];
}>;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AGENT_STATUSES = new Set(["keep", "probation", "fired", "rehired-v2", "hired", "idle-blocked"]);
const PRIORITIES = new Set(["high", "medium", "low"]);
// Generous per-field caps: the report renders on an internal page, but a bad
// payload must not be able to balloon the row or the HQ response.
const MAX_TEXT = 4000;
const MAX_SUMMARY_ITEMS = 10;
const MAX_AGENTS = 25;
const MAX_DIRECTIONS = 8;
const MAX_SERIALIZED = 64_000;

function isShortString(value: unknown, max = MAX_TEXT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/**
 * Validate an incoming report payload against the runbook contract. Returns an
 * error message (for the 400 body) or null when the payload is a valid report.
 * Strict on shape so junk can never render back into /hq.html, but tolerant of
 * empty agents/directions arrays — a quiet day is a valid report.
 */
export function validateStandupReport(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return "report must be a JSON object.";
  }
  const r = payload as Record<string, unknown>;

  if (typeof r.day !== "string" || !DAY_PATTERN.test(r.day)) return "day must be YYYY-MM-DD.";
  const dayDate = new Date(`${r.day}T00:00:00Z`);
  if (!Number.isFinite(dayDate.getTime())) return "day must be a real calendar date.";
  if (!isShortString(r.generatedAt, 64) || !Number.isFinite(new Date(r.generatedAt as string).getTime())) {
    return "generatedAt must be an ISO timestamp.";
  }
  if (!isShortString(r.headline)) return "headline must be a non-empty string.";

  if (!Array.isArray(r.summary) || r.summary.length === 0 || r.summary.length > MAX_SUMMARY_ITEMS) {
    return `summary must be 1-${MAX_SUMMARY_ITEMS} paragraphs.`;
  }
  if (!r.summary.every((s) => isShortString(s))) return "summary entries must be non-empty strings.";

  if (!Array.isArray(r.agents) || r.agents.length > MAX_AGENTS) return `agents must be an array of at most ${MAX_AGENTS}.`;
  for (const a of r.agents as unknown[]) {
    const entry = (a ?? {}) as Record<string, unknown>;
    if (!isShortString(entry.name, 200)) return "each agent needs a name.";
    if (typeof entry.status !== "string" || !AGENT_STATUSES.has(entry.status)) {
      return "agent status must be keep|probation|fired|rehired-v2|hired|idle-blocked.";
    }
    if (!isShortString(entry.metric) || !isShortString(entry.note)) {
      return "each agent needs a metric and a note.";
    }
  }

  if (!Array.isArray(r.directions) || r.directions.length > MAX_DIRECTIONS) {
    return `directions must be an array of at most ${MAX_DIRECTIONS}.`;
  }
  for (const d of r.directions as unknown[]) {
    const dir = (d ?? {}) as Record<string, unknown>;
    if (!isValidDirectionId(dir.id)) return "direction ids must match SD-YYYYMMDD-slug.";
    if (typeof dir.priority !== "string" || !PRIORITIES.has(dir.priority)) return "direction priority must be high|medium|low.";
    if (!isShortString(dir.title, 300) || !isShortString(dir.detail) || !isShortString(dir.recommendation)) {
      return "each direction needs a title, detail, and recommendation.";
    }
  }

  if (JSON.stringify(r).length > MAX_SERIALIZED) return `report must serialize to at most ${MAX_SERIALIZED} characters.`;
  return null;
}

type ReportRow = { report: StandupReport; published_at: string | Date };

/** Latest published report (what /hq.html renders), or null before the first publish. */
export async function getLatestStandupReport(): Promise<StandupReport | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT report, published_at
    FROM standup_reports
    ORDER BY day DESC
    LIMIT 1`) as unknown as ReportRow[];
  return rows.length ? rows[0].report : null;
}

/**
 * Publish (or replace) the report for its day. Upsert by day so a re-run of
 * the routine updates that day's report instead of failing on the key.
 */
export async function publishStandupReport(report: StandupReport, publishedBy: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO standup_reports (day, report, published_by)
    VALUES (${report.day}, ${JSON.stringify(report)}::jsonb, ${publishedBy})
    ON CONFLICT (day) DO UPDATE SET
      report = EXCLUDED.report,
      published_by = EXCLUDED.published_by,
      published_at = NOW()`;
}
