# Production measurement observation — 14 September 2026

The restored HQ credential now permits a verified read of live anonymous activity counters. It does **not** establish a production customer, activation or revenue baseline.

At **2026-09-13T23:00:14.823Z** (September 14 in Bucharest), an authenticated, read-only `GET https://keepitup.social/api/metrics/summary?days=30` returned HTTP 200 and six daily aggregate rows. No individual records or credential values were retrieved or logged.

| Anonymous counter | 30-day count | Recorded days (UTC) |
| --- | ---: | --- |
| `discover_viewed` | 11 | September 1: 2; September 3: 2; September 4: 1; September 13: 6 |
| `signup_started` | 1 | September 1 |
| `signup_completed` | 1 | September 1 |

These are recorded events, including repeat loads and potentially staff/test activity. They are not unique people, completed authoritative account records or a conversion rate. Other counter names had no returned rows; that does not establish zero real activity where instrumentation was absent or failed. In particular, the production revision inspected predates the new landing-view instrumentation.

Read-only Vercel deployment metadata at the same observation confirmed production deployment `dpl_5S6b4bLUCVAspaWZHrYJDnE8SArC` was `READY`, with source SHA `7fe07ad31a4c86fb1fd741dde1989dd3f2d307e7`. The owner subsequently approved the separate reviewed framework/HQ release; its deployment and verification are being handled separately. This observation does not describe that later release.

## Remaining measurement gap

The existing summary route returns only the anonymous `click_metrics_daily` ledger. Its schema has no account identifiers, so staff/test exclusion and person-level activation cannot be recovered from these counters. The inspected account schema and migrations provide no explicit staff/test classification fields. The earlier locally configured database snapshot (111 unclassified account rows) remains unverified as production and must not be relabelled as live customers. Its empty click snapshot differs from this live ledger; the discrepancy does not by itself establish a database identity.

Next measurement work needs a verified production database connection or a separately reviewed authenticated aggregate route covering authoritative account/event/payment records, together with explicit fixture/staff exclusions. Do not infer exclusions from names, email patterns or behavior. Until then, real registered adults, activation, attendance, retention and settled customer revenue remain **unknown**. No SQL mutation, production deployment, outbound message or cron execution was performed in this observation.

Evidence reviewed: `apps/web/src/app/api/metrics/summary/route.ts`, `apps/web/src/lib/click-metrics.ts`, `apps/web/db/043_click_metrics_daily.sql`, account schema/migrations, `docs/operations/growth-plan-2026-09-14.md`, live aggregate response and filtered Vercel deployment metadata. Documentation-only: figures checked against the live response; no application changes or tests required.
