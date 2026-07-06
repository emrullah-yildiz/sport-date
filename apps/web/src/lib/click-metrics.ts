import "server-only";

import { getDatabase } from "@/lib/db";

// Anonymous first-party click/funnel analytics (CX-20260706). The owner needs
// to see which CTAs get clicked and where the funnel drops WITHOUT a consent
// banner, third parties, cookies, or any per-person record. Anonymity here is
// structural, not a promise:
//
// - `event` must be one of the fixed names below — never free text.
// - `path` is collapsed to one of a handful of PAGE CLASSES — never the raw URL
//   (a raw path like /events/{id} could act as a quasi-identifier).
// - Storage is a single counter per (day, event, path_class): no user id, no
//   session id, no IP, no user agent, no timestamp finer than the day
//   (db/043_click_metrics_daily.sql). A row can never describe a person.

/**
 * The complete set of trackable events. Adding one is a code change on
 * purpose — the beacon endpoint rejects anything else, so the table's
 * cardinality (and its anonymity) is bounded by this list.
 */
export const CLICK_METRIC_EVENTS = [
  "landing_cta_join",
  "landing_cta_survey",
  "signup_started",
  "signup_completed",
  "discover_viewed",
  "event_publish_started",
  "event_published",
  "join_requested",
  "share_opened",
  // ONE event for every platform button — the platform is deliberately NOT
  // recorded (cardinality stays low; a rare platform×day pair can't single
  // anyone out).
  "share_platform_click",
  "poster_downloaded",
  "survey_started",
  "survey_completed",
] as const;

export type ClickMetricEvent = (typeof CLICK_METRIC_EVENTS)[number];

export function isClickMetricEvent(value: unknown): value is ClickMetricEvent {
  return typeof value === "string" && (CLICK_METRIC_EVENTS as readonly string[]).includes(value);
}

/** The only page classes ever stored — everything else collapses to "other". */
export const CLICK_METRIC_PATH_CLASSES = [
  "/",
  "/signup",
  "/discover",
  "/events/*",
  "/e/*",
  "/research",
  "other",
] as const;

export type ClickMetricPathClass = (typeof CLICK_METRIC_PATH_CLASSES)[number];

/**
 * Collapse a client-reported pathname to a coarse page class. Never returns
 * free text: any unrecognised, malformed, or missing value is "other". The raw
 * path is used only inside this pure function and is never stored or logged.
 */
export function classifyClickPath(path: unknown): ClickMetricPathClass {
  if (typeof path !== "string") return "other";
  const clean = path.trim().toLowerCase().split(/[?#]/, 1)[0];
  if (clean === "/" || clean === "/landing") return "/";
  if (clean === "/signup") return "/signup";
  if (clean === "/discover" || clean.startsWith("/discover/")) return "/discover";
  if (clean === "/events" || clean.startsWith("/events/")) return "/events/*";
  if (clean === "/e" || clean.startsWith("/e/")) return "/e/*";
  if (clean === "/research" || clean.startsWith("/research/")) return "/research";
  return "other";
}

/**
 * Bump today's counter for one (event, path_class) pair. The insert carries
 * exactly these two values plus the server's own date — the signature
 * physically cannot transport an identifier into storage.
 */
export async function recordClickMetric(
  event: ClickMetricEvent,
  pathClass: ClickMetricPathClass,
): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO click_metrics_daily (day, event, path_class, count)
    VALUES (CURRENT_DATE, ${event}, ${pathClass}, 1)
    ON CONFLICT (day, event, path_class)
    DO UPDATE SET count = click_metrics_daily.count + 1`;
}

export type ClickMetricRow = Readonly<{
  day: string;
  event: ClickMetricEvent;
  pathClass: ClickMetricPathClass;
  count: number;
}>;

type SummaryRow = {
  day: string | Date;
  event: ClickMetricEvent;
  path_class: ClickMetricPathClass;
  count: number | string;
};

function toIsoDay(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Daily counts per (event, path class) over the last `days` days, newest first. */
export async function summarizeClickMetrics(days: number): Promise<ClickMetricRow[]> {
  const sql = getDatabase();
  const window = Math.min(90, Math.max(1, Math.trunc(days)));
  const rows = (await sql`
    SELECT day, event, path_class, count
    FROM click_metrics_daily
    WHERE day >= CURRENT_DATE - (${window - 1}::int)
    ORDER BY day DESC, event ASC, path_class ASC`) as unknown as SummaryRow[];
  return rows.map((row) => ({
    day: toIsoDay(row.day),
    event: row.event,
    pathClass: row.path_class,
    count: Number(row.count),
  }));
}
