import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
// Read-only synthetic VALUES only; this query never reads application tables.
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required for read-only SQL boundary verification");
const source = await readFile(new URL("../src/lib/events.ts", import.meta.url), "utf8");
const expression = source.match(/AND (CASE WHEN \$\{onDate\}::date IS NOT NULL[\s\S]*?END)/)?.[1];
assert.ok(expression);
const predicate = expression.replaceAll("${onDate}", "events.selected_date").replaceAll("${filters.withinDays}", "1");
const sql = neon(databaseUrl);
const rows = await sql.query(`WITH events(label, starts_at, time_zone, selected_date, expected) AS (VALUES
  ('local-midnight', '2099-09-19 21:00:00+00'::timestamptz, 'Europe/Bucharest', '2099-09-20', true),
  ('before-local-midnight', '2099-09-19 20:59:59+00'::timestamptz, 'Europe/Bucharest', '2099-09-20', false),
  ('next-local-midnight', '2099-09-20 21:00:00+00'::timestamptz, 'Europe/Bucharest', '2099-09-20', false),
  ('spring-start', '2026-03-28 22:00:00+00'::timestamptz, 'Europe/Bucharest', '2026-03-29', true),
  ('spring-last-second', '2026-03-29 20:59:59+00'::timestamptz, 'Europe/Bucharest', '2026-03-29', true),
  ('spring-end', '2026-03-29 21:00:00+00'::timestamptz, 'Europe/Bucharest', '2026-03-29', false),
  ('autumn-first-3am', '2026-10-25 00:30:00+00'::timestamptz, 'Europe/Bucharest', '2026-10-25', true),
  ('autumn-second-3am', '2026-10-25 01:30:00+00'::timestamptz, 'Europe/Bucharest', '2026-10-25', true),
  ('autumn-last-second', '2026-10-25 21:59:59+00'::timestamptz, 'Europe/Bucharest', '2026-10-25', true),
  ('autumn-end', '2026-10-25 22:00:00+00'::timestamptz, 'Europe/Bucharest', '2026-10-25', false),
  ('west-local-date', '2099-09-20 00:30:00+00'::timestamptz, 'America/New_York', '2099-09-19', true),
  ('far-future-beyond-rolling-day', '2099-09-20 12:00:00+00'::timestamptz, 'Europe/Bucharest', '2099-09-20', true),
  ('rolling-future', NOW() + interval '1 hour', 'Europe/Bucharest', NULL, true),
  ('rolling-outside', NOW() + interval '2 days', 'Europe/Bucharest', NULL, false)
) SELECT label, expected, (${predicate}) AS actual FROM events`);
for (const row of rows) assert.equal(row.actual, row.expected, row.label);
console.log(`Passed ${rows.length} read-only PostgreSQL date boundaries using the application SQL predicate (midnight, DST, timezone, distant date, rolling fallback).`);
