# Deployment & operations runbook

Concrete operational procedure for the first European deployment of **sport-date**
on the ratified stack: **Neon Postgres (Frankfurt) + Vercel (`fra1`) + Upstash
Redis (Frankfurt) + Sentry (EU)**. It assumes the decisions in
`infrastructure-plan.md` and the credential-free scaffolds already in the repo
(`apps/web/vercel.json`, `apps/web/.env.production.example`, the health/readiness
routes, the cron-authorized session-cleanup endpoint).

> **Secrets discipline (applies to every section below).** Never paste a real
> connection string, token, DSN, or `CRON_SECRET` into this repo, a PR, a chat,
> or any log. All values live only in the provider console and in Vercel's
> per-environment env vars. Every value shown here is a placeholder.

> **Provisioning is owner-gated.** Creating accounts, accepting terms, and
> spending money are owner actions (`infrastructure-plan.md` → "owner actions";
> `owner-escalation.md` Gate 1). The agent does not deploy, create accounts, or
> add secrets. This runbook documents the procedure for whoever holds those
> credentials.

---

## 0. Status / prerequisites

- **`[OWNER:]`** Neon production project + branch provisioned in Frankfurt; a
  separate **test** branch for CI (`infrastructure-plan.md` owner step 2).
- **`[OWNER:]`** Vercel account created, this GitHub repo imported, region
  `fra1`, production env vars set (step 1 below).
- **`[OWNER:]`** Upstash Redis (Frankfurt) + Sentry (EU) provisioned (owner
  steps 4–5). The app degrades gracefully without these (in-memory rate limiting;
  no error reporting) but they should be set before real registration opens.
- **`[OWNER:]`** Named on-call / incident owner and an escalation channel
  (see `owner-escalation.md` Gate 5) — required for §9, not yet decided.

---

## 1. First deploy (GitHub → Vercel)

1. **Import the repo.** In Vercel, "Add New… → Project", import the GitHub repo.
2. **Root Directory: `apps/web`.** This is a monorepo; the deployable Next.js app
   is `apps/web`, not the repo root. Set Vercel's **Root Directory** to `apps/web`
   so it builds the right workspace and picks up `apps/web/vercel.json`.
3. **Framework / build.** Vercel auto-detects Next.js. Build command `next build`
   and output are the defaults (see `apps/web/package.json` scripts); no override
   needed. (This is a non-standard Next.js 16.2.9 install — do not hand-edit build
   settings to match older Next conventions.)
4. **Region.** `apps/web/vercel.json` already pins `"regions": ["fra1"]`
   (Frankfurt) and `maxDuration: 60` for the API routes. Confirm the project's
   region matches; do not override to a non-EU region (data residency).
5. **Environment variables.** Set the table below in Vercel → Project → Settings →
   Environment Variables, scoped to **Production** (and Preview where it makes
   sense). The canonical template with inline comments is
   `apps/web/.env.production.example` (placeholders only; never commit a real
   `.env` — `.gitignore` tracks `*.example` and ignores real `.env`).

   | Var | Purpose | Source | Notes |
   | --- | --- | --- | --- |
   | `DATABASE_URL` | Neon production connection string | Neon (owner step 2) | Read by `getDatabase()`. Use the Frankfurt prod branch. |
   | `APP_PUBLIC_ORIGIN` | Canonical server origin for email links | The deployed origin | Never derived from request headers. |
   | `NEXT_PUBLIC_APP_ORIGIN` | Client-side origin (in the browser bundle) | The deployed origin | |
   | `NODE_ENV` | `production` | Vercel default | Pin for clarity. |
   | `EMAIL_DELIVERY_ENABLED` | master transactional-mail switch | keep `false` through setup | Flip only after the owner-authorized Gmail test send succeeds. |
   | `EMAIL_DELIVERY_PROVIDER` | `gmail` | owner-approved Gate 4 choice | Adapter still fails closed until every required Gmail value exists. |
   | `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | narrow owner-authorized Gmail API credentials | Google OAuth + Vercel secrets | Never commit or paste into chat; use the send-only authorization. |
   | `GMAIL_SENDER_EMAIL` / `GMAIL_SENDER_NAME` / `GMAIL_REPLY_TO` | verified From identity and replies | Gmail “Send mail as” configuration | Use the verified support alias; missing/unsafe values disable delivery. |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | shared rate-limit store | Upstash (owner step 4) | **Both** required to activate the shared limiter; otherwise in-memory fallback. |
   | `SENTRY_DSN` | error reporting (EU region) | Sentry (owner step 5) | |
   | `CRON_SECRET` | shared bearer for the session-cleanup + attendance-reminder crons | generate a long random value | The cron endpoints **fail closed** if unset (never run unauthenticated). |
   | `FEEDBACK_AGENT_SECRET` | shared bearer for the internal feedback agent/admin API | generate a long random value | The `/api/internal/feedback*` write path **fails closed** if unset; members never hold it, so they can't post as "team" or change a status. |
   | `MODERATION_AGENT_SECRET` | shared bearer for the internal photo-moderation approve/reject API | generate a long random value | `/api/internal/photo-moderation/[photoId]` **fails closed** if unset; resolves photos held for review. |
   | `IMAGE_MODERATION_PROVIDER` (+ its key) | owner-provisioned image-safety provider id | empty until owner provisions one | When absent, new photo uploads are **held pending** (fail-safe), never auto-approved. Sending member images to a vendor is owner-gated; prefer an EU/GDPR-appropriate provider. |

   > `RUN_DB_INTEGRATION` is **test-only** and must NEVER be set in production.

6. **Run migrations against production before / as part of first deploy** (§2).
7. **Deploy** the production branch. Verify:
   - `GET /api/health` → `200 { "status": "ok" }` (liveness; no DB call).
   - `GET /api/health/ready` → `200 { "status": "ready" }` once `DATABASE_URL`
     is set and migrations have run; `503 { "status": "not_ready", ... }` if the
     DB is unreachable or unconfigured.
8. **Uptime monitor** (owner step 6, after a URL exists): point Better Stack /
   UptimeRobot at **`/api/health`** for liveness. Optionally add a second check on
   **`/api/health/ready`** to alert when the process is up but the database is
   unreachable. See §7.

---

## 2. Database migrations

Migrations live in `apps/web/db/NNN_*.sql` and are applied by
`apps/web/scripts/migrate.mjs`.

```
DATABASE_URL="postgres://…(prod)…" npm run db:migrate -w @sport-date/web
```

### Automatic on every production deploy (CX-20260701)

Production migrations run **as part of the Vercel build, before `next build`**, so
a deploy can never serve code that reads a column/table prod hasn't migrated yet
(the 2026-07-01 outage). This is wired in `apps/web/vercel.json`:

```
"buildCommand": "node scripts/deploy-migrate.mjs && next build"
```

- `apps/web/scripts/deploy-migrate.mjs` decides what to do via the pure
  `planDeployMigration({ vercelEnv, hasDatabaseUrl })` in `scripts/migrations.mjs`
  (unit-tested in `scripts/migrations.test.mjs`):
  - **production** with `DATABASE_URL` present → **runs** pending migrations, then
    builds. Idempotent (`schema_migrations`), so a deploy with no new migration is
    a no-op.
  - **production** with **no** reachable `DATABASE_URL` → **fails the build (exit
    1)**, i.e. the deploy is **blocked** and the last good deployment keeps
    serving. A migration that throws also blocks the build for the same reason.
  - **preview / development** → **skips** entirely (never touches a database).
- **Credential:** reuses the existing Vercel **Production** `DATABASE_URL` env var
  (available at build time). Never committed; set only in Vercel → Settings → Env
  Vars → Production. To rotate, see §4.
- **The Neon HTTP driver (`neon()`) is used**, so the `-pooler` connection string
  is fine here (no persistent TCP pool); the `schema_migrations` guard makes
  concurrent builds safe.
- **Verify a no-op:** a deploy that adds no migration logs
  `[deploy-migrate] … 0 new migration(s) applied (0 means prod was already
  current).` A deploy that adds one logs `Applied database migration NNN_*.sql`.
- The manual command below remains the fallback (e.g. applying a migration out of
  band, or against a Neon branch).

- The runner creates a `schema_migrations` table and applies each unapplied file
  in lexical order, recording its name — it is **idempotent**; re-running applies
  only new files.
- Migrations are written to be **additive and re-runnable** (`CREATE TABLE IF NOT
  EXISTS`, `CREATE … IF NOT EXISTS`, additive `ALTER`s). Re-applying the set
  against an up-to-date database is a no-op.
- **Runner caveat — statement splitting.** `migrate.mjs` splits each file on
  `;` followed by a newline (`/;\s*(?:\r?\n|$)/`). A multi-line `$$ … $$`
  PL/pgSQL function body would be **shredded** at every internal `;`+newline. The
  established workaround (do **not** change the runner without re-validating
  every migration) is to author any `CREATE FUNCTION … $$ … $$` body on a
  **single physical line**, so no internal `;` is the last non-space character
  before a newline. See `019_audit_append_only_allows_user_nulling.sql` and its
  decision-log entry (2026-06-29). Honor this caveat when adding any new
  function/`DO` block migration.
- **Where to run from.** Locally with the prod `DATABASE_URL` exported (above), or
  as a one-off in the Vercel deploy pipeline. Confirm against the right Neon
  branch first. For migrations that touch RI/constraints, prefer Neon's **direct
  (non-pooler) endpoint** to avoid cached referential-integrity plans (see the
  2026-06-29 audit-erasure decision-log note).
- **Verify after:** `GET /api/health/ready` returns `200 ready`, and the new
  schema objects exist.

---

## 3. Rollback

**App rollback (instant, preferred).** Vercel keeps every previous deployment.
To roll back, in Vercel → Deployments, select the last known-good deployment and
**"Promote to Production"** (instant rollback / alias re-point). This reverts the
running code with no rebuild.

**Migrations are forward-only.** There are **intentionally no down-migrations** in
this repo. Migrations are additive (`… IF NOT EXISTS`, additive `ALTER`s) and
designed so an older app version keeps working against a newer schema — that is
what makes an app rollback safe even after a migration has run. Rationale: hand-
written down-migrations are an extra failure mode and a data-loss risk, and at
pre-launch a forward-only, additive discipline is simpler and safer than
maintaining reversible pairs.

**Handling a bad migration.** Because there is no automatic "down":

1. **Roll the app back first** (above) if the new code is what's failing — an
   additive migration usually leaves the previous app version functional.
2. **If the schema change itself is wrong,** write a **new, forward** migration
   (`NNN+1`) that corrects it (e.g. drops/replaces the offending object, adjusts
   the column). Never edit or delete an already-applied migration file or its
   `schema_migrations` row — that desyncs environments. Migration `019` is the
   model for a corrective, forward-only schema change.
3. **If the bad migration was destructive** (it should not be — additive is the
   rule), recover the data via Neon PITR (§5) into a branch, reconcile, then
   forward-fix. Treat any destructive migration as an incident (§9).

---

## 4. Secret rotation

Rotate on a schedule and **immediately on any suspected leak** (§9). General
procedure for every secret: **rotate at the provider → update the Vercel env var
→ redeploy** (env var changes take effect on the next deployment).

- **`DATABASE_URL` (Neon).** Rotate/reset the role password (or roll the role) in
  the Neon console → update `DATABASE_URL` in Vercel → redeploy. The dev
  credential shared earlier in chat must be rotated per `infrastructure-plan.md`
  owner step 2.
- **`UPSTASH_REDIS_REST_TOKEN` (Upstash).** Regenerate the REST token in Upstash →
  update `UPSTASH_REDIS_REST_TOKEN` (and URL if it changed) in Vercel → redeploy.
  During the gap the limiter degrades to in-memory enforcement (never to
  unlimited), so rotation is low-risk.
- **`SENTRY_DSN` (Sentry).** Rotate the client key / DSN in Sentry → update
  `SENTRY_DSN` in Vercel → redeploy. Worst case during the gap is missing error
  reports, not an outage.
- **`CRON_SECRET`.** Generate a new long random value → update it in **both** the
  Vercel env and the Vercel Cron configuration (they must match) → redeploy. The
  endpoint fails closed, so a mismatch means the cron returns 401 (no cleanup
  runs) rather than exposing anything — fix the mismatch and the next scheduled
  run recovers.

**`[OWNER:]`** Rotation cadence (e.g. quarterly) is not yet set.

---

## 5. Backup & recovery (Neon PITR)

- **Backups:** Neon provides point-in-time recovery (PITR) with history retention.
  `infrastructure-plan.md` sets the starting retention at **7 days**; an optional
  scheduled logical `pg_dump` can be added later for an off-provider copy.
- **Restore procedure:** in the Neon console, create a **branch from a past
  timestamp** (PITR) at or just before the bad event. Validate the data on that
  branch, then either (a) point `DATABASE_URL` at the recovered branch and
  redeploy, or (b) reconcile specific rows back into the live branch. Restoring to
  a branch (rather than overwriting prod in place) keeps the current state
  recoverable while you verify.
- **After a destructive incident:** recover via PITR into a branch, forward-fix
  the schema/data, then cut over. Do not attempt down-migrations (§3).
- **`[COUNSEL:]` / `[OWNER:]`** RTO/RPO targets are **not yet committed** — do not
  state a recovery-time or recovery-point SLA until the owner/counsel set one.
  Neon's 7-day PITR window bounds the worst-case recovery point but is not a
  promised RPO.

---

## 6. Health vs readiness endpoints

| Endpoint | Checks | Touches DB? | Success | Failure |
| --- | --- | --- | --- | --- |
| `GET /api/health` | **Liveness** — the web process serves requests | No | `200 { status: "ok" }` | (process down → no response) |
| `GET /api/health/ready` | **Readiness** — the process can reach the database (one `SELECT 1`) | Yes | `200 { status: "ready" }` | `503 { status: "not_ready", reason: "database_not_configured" \| "database_unreachable" }` |

- Both are `runtime="nodejs"`, `dynamic="force-dynamic"`, `Cache-Control:
  no-store` (a stale cached "ok"/"ready" would hide a down process/DB).
- Neither endpoint leaks connection details: readiness reports only a coarse,
  non-sensitive `reason` and never the connection string or driver message.
- **Uptime monitor target:** `/api/health` for the primary liveness check (it
  answers even before the stack is wired). Add `/api/health/ready` as a secondary
  check to distinguish "DB unreachable" from "process down".

---

## 7. Scheduled job — session cleanup (Vercel Cron)

- **Definition:** `apps/web/vercel.json` → `crons` runs `GET
  /api/internal/session-cleanup` daily at `0 3 * * *` (03:00 UTC).
- **What it does:** runs the existing `cleanupExpiredSessionResidue`
  (`apps/web/src/lib/session-cleanup.mjs`) — purges expired browser sessions,
  spent mobile sessions, and outdated refresh-token history. Same logic as
  `scripts/cleanup-sessions.mjs`, on a schedule, no separate worker.
- **Auth:** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; the handler
  verifies it and **fails closed** — missing/wrong token → 401, and if
  `CRON_SECRET` is unset it refuses to run (also 401), so a misconfigured deploy
  never exposes an open "delete expired sessions" trigger. `CRON_SECRET` in the
  Vercel env and in the Cron config must match.
- **Responses:** `200 { success, summary }` on success; `503` if the DB is
  unconfigured; `500` on unexpected failure (logged, no detail in body).
- **Verify:** trigger the cron from Vercel ("Run" on the cron) and confirm a
  `200` with a summary, or inspect the function logs for the daily run.

### 7b. Scheduled job — attendance reminders (Vercel Cron)

- **Definition:** `apps/web/vercel.json` → `crons` runs `GET
  /api/internal/attendance-reminders` every 15 minutes (`*/15 * * * *`).
  Sub-daily crons require a Vercel plan that permits them.
- **What it does:** the idempotent T-2h attendance sweep
  (`runAttendanceReminderSweep`) — for each published event starting within 2h,
  creates one `pending` confirmation + token per accepted attendee that has none
  yet, and dispatches the reminder email through the DARK gate. `UNIQUE
  (event_id, member_id)` + `ON CONFLICT DO NOTHING` make re-runs safe.
- **Auth:** same shared `Authorization: Bearer ${CRON_SECRET}`, fails closed
  exactly like session-cleanup (no secret ⇒ 401, never runs unauthenticated).
- **Email is DARK:** the sweep composes the reminder but sends nothing unless
  `EMAIL_DELIVERY_ENABLED === "true"` with a provider configured — until then
  each send is a logged no-op (`suppressed` in the summary), and the confirm/
  cancel tokens + in-app prompt work regardless. Turning it on is an owner
  action (provision an ESP, flip the flag); the links expose the approximate
  area only, never the exact venue.
- **Migration dependency:** requires `033_event_attendance_confirmations.sql`
  applied (the deploy-time auto-migrate handles this before the new code serves).
- **Responses:** `200 { success, summary:{created,simulated,suppressed} }`;
  `503` if the DB is unconfigured; `500` on unexpected failure (logged).

---

## 8. Monitoring

- **Uptime:** external check on `/api/health` (+ optional `/api/health/ready`).
- **Errors:** Sentry (EU region) once `SENTRY_DSN` is set. Until wiring lands
  (owner step 5), there is no server/client error reporting — rely on Vercel
  function logs. **`[OWNER:]`** alert routing/destination not yet decided.
- **Rate-limit store:** the shared Upstash limiter logs a single warning and
  degrades to in-memory on any Upstash error (never to unlimited) — a spike in
  that warning indicates an Upstash problem, not an abuse-control outage.

---

## 9. Incident-response checklist

Minimal procedure for a suspected production incident. **`[OWNER:]`** A named
on-call owner, an incident channel, and response-time targets are **not yet
decided** (`owner-escalation.md` Gate 5) — fill these in before relying on this.

1. **Who:** page the **`[OWNER:]`** named on-call / incident owner via the
   **`[OWNER:]`** incident channel. At pre-launch this is a single maintainer.
2. **Assess:** is the process down (`/api/health` failing) or a dependency
   (`/api/health/ready` 503, Sentry errors, Upstash warnings)? Check Vercel
   function logs.
3. **Contain:**
   - Bad deploy / code → **instant Vercel rollback** to the last good deployment
     (§3).
   - Bad migration → app rollback + forward-fix migration (§3).
   - Database incident → assess PITR recovery (§5).
4. **On a suspected secret leak:** treat as urgent — **rotate the affected
   secret immediately** (§4: Neon `DATABASE_URL`, Upstash token, Sentry DSN, or
   `CRON_SECRET`) at the provider, update Vercel, redeploy. Rotate broadly if the
   blast radius is unclear. Never put the leaked value in the incident notes.
5. **Disable delivery if abuse is suspected:** transactional email is OFF by
   default (`EMAIL_DELIVERY_ENABLED=false`); if it has been enabled (Gate 4) and
   is being abused, set `EMAIL_DELIVERY_ENABLED=false` in Vercel and redeploy to
   stop sends immediately.
6. **Recover & verify:** confirm `/api/health` and `/api/health/ready` are green,
   the cron runs, and error rates are normal.
7. **Record:** write up the incident and any decision in `decision-log.md`; if a
   personal-data breach is plausible, escalate to **`[COUNSEL:]`** for the GDPR
   notification assessment (this runbook does not decide notification duties).

---

## References

- `docs/operations/infrastructure-plan.md` — the ratified stack, env var table,
  owner provisioning steps, interlocks.
- `docs/operations/owner-escalation.md` — Gate 1 (infra) and Gate 5 (safety/
  on-call owner) decisions this runbook depends on.
- `docs/operations/decision-log.md` — the deploy-scaffold, migration-019, and
  rate-limit decisions referenced above.
- `apps/web/.env.production.example` — canonical env template (placeholders).
- `apps/web/vercel.json` — region, function limits, cron schedule.
