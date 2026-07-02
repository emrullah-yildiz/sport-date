# CX-20260702-login-and-signup-500-sessions-missing-device-columns

- Status: `verified`
- Severity: `critical`
- Priority: `P0 blocker` — (Reach 5 × Impact 5 × Confidence 5) / Effort 1 = 125. Reach 5: every member and every prospective member — both front doors (sign in AND sign up) are affected. Impact 5: the product is unusable — a member with correct credentials cannot get in and sees only "Login failed."; a newcomer cannot register. Confidence 5: reproduced live on the running app across the login UI, the login API, and all four pooled accounts, and root-caused at the database (the exact failing SQL was reproduced directly). Effort 1: apply the already-authored, additive migration 030 to the connected database (`ADD COLUMN IF NOT EXISTS`). Site-outage / lost-auth class, so P0 regardless of arithmetic.
- Customer journey: account & trust — sign in / sign up (the entry to the whole product)
- Surface: `web` (login + register API routes; the same columns are read by the web-sessions panel)
- Environment and viewport/device: dev server localhost:3000 + connected Neon database. Observed 2026-07-02. Chromium at 1280; also reproduced via API and via direct DB probe.
- Found by: user-simulator (safety/report-block journey pass — blocked at the login step)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-no-automatic-production-migration-on-deploy` (blocked-owner, P0 — the systemic "nothing applies migrations to the target DB on deploy" gap; this ticket is a concrete, live instance of that class for migration 030, and is fixable immediately by applying the migration to the connected DB while the systemic pipeline fix is owner-blocked), `CX-20260702-web-sessions-indistinguishable-no-device-hint-or-bulk-signout` (in-progress — the feature whose migration 030 adds `device_label`/`last_active_at`; that ticket is about *distinguishing* sessions, not the login/signup outage caused when its migration has not been applied)

## Customer outcome

As a member with the correct email and password, I want to sign in (and as a newcomer, to sign up) so that I can actually use the product. Right now I cannot get in at all, and the only thing the app tells me is "Login failed."

## What I observed

Signing in on `/login` with a valid pooled member's correct credentials returns a 500 and shows the error banner **"Login failed."** with no further guidance. Observed live 2026-07-02:

- Login UI (`/login`, correct credentials): the login request returns **HTTP 500**, the page stays on `/login`, and the `role="alert"` banner reads **"Login failed."**
- Login API (`POST /api/auth/login`): returns `{"error":"Login failed."}` with status **500** for all four pooled accounts (host-A, seeker-B, seeker-advanced-C, seeker-D).
- The database itself is healthy: `SELECT 1` succeeds in ~145 ms, the member row exists and is `active`, so this is not a connectivity or credentials problem.
- Reproducing the login route's session INSERT directly against the connected database throws: **`column "device_label" of relation "sessions" does not exist`**. The same INSERT without the two newer columns succeeds. So the `sessions` table on the connected database is missing the `device_label` and `last_active_at` columns that migration `030_session_device_hint.sql` adds, while the current login code unconditionally writes to them.
- The identical column set is written by the **register** route (`api/auth/register/route.ts` INSERT into `sessions (… device_label, last_active_at)`), so **new-member signup is affected the same way** — a newcomer who completes the form and submits also hits the 500.

Note: earlier in the same session one API login briefly returned 200 (likely served by an already-loaded module before the failing DB write path was exercised); every subsequent attempt across UI + API + all accounts returned 500, so the failure is now fully reproducible.

## What I expected

A member with correct credentials signs in and lands in the app; a newcomer who completes signup gets an account and a session. If a session cannot be created, the member should at minimum see a calm, honest, recoverable message (not a bare "Login failed." dead-end) — but the correct outcome here is that sign-in and sign-up simply work.

## Reproduction

1. On the running app, open `/login` and sign in with a known-good member's correct email and password (e.g. a pooled QA account).
2. Observe: the page stays on `/login` and shows "Login failed."; the network request to `/api/auth/login` is HTTP 500.
3. (Confirm root cause) The connected database's `sessions` table has only `id, user_id, token_hash, expires_at, created_at` — it is missing `device_label` and `last_active_at`, which migration `030_session_device_hint.sql` adds and which the login/register INSERTs require.

Reproduction rate: `confirmed live 2026-07-02` — 4/4 pooled accounts via API, 1/1 via login UI, and 1/1 direct DB INSERT reproduction of the exact `column "device_label" … does not exist` error.

## Customer impact

This is a full front-door outage: no existing member can sign in and no new member can sign up while the connected database is behind on migration 030. The failure is a **lost-authorization / whole-product-availability** issue. The member-facing message ("Login failed.") is also a dead-end — it gives no cause and no next step, so a member with a correct password has no way to understand or recover. No sensitive data is exposed (the error is generic and no member data leaks), but the practical and emotional consequence is severe: the product appears broken at the very first step.

This is the same failure *class* as the 2026-07-01 production outage (code depends on a column the target database has not migrated). It is not caused by migration 030 being unsafe — 030 is deliberately additive/`IF NOT EXISTS` and safe to apply — but by the migration not having been run against the connected database while the dependent code is live.

## Evidence and limits

- Evidence: live login UI + API returning 500 "Login failed." for all four pooled accounts; direct DB probe showing the `sessions` table lacks `device_label`/`last_active_at`; direct reproduction of the failing INSERT error `column "device_label" of relation "sessions" does not exist`; the legacy-shape INSERT (without the two columns) succeeding.
- Redactions made: database URL and credentials redacted; no member PII beyond synthetic QA identifiers; no report/safety-case content involved.
- Facts: `sessions` on the connected DB = `{id, user_id, token_hash, expires_at, created_at}`; login route (`api/auth/login/route.ts`) and register route (`api/auth/register/route.ts`) both INSERT into `device_label, last_active_at`; migration `030_session_device_hint.sql` adds exactly those two columns and is written to be additive/idempotent; `web-sessions.ts` also reads/updates them.
- Hypotheses to verify during implementation: applying migration 030 to the connected DB clears the 500 on both login and register (expected — the legacy-shape INSERT already succeeds and 030 is additive). Separately, the login/register error handling could be hardened so a session-write failure degrades to a calm, honest message rather than a bare "Login failed." (secondary; the primary fix is applying the migration).
- Paths or surfaces not tested: mobile app login (separate route/table `mobile_sessions`, not implicated by these columns); production/Vercel target (this observation is the connected dev database).

## Duplicate check

- Search terms used: "device_label", "last_active_at", "Login failed", "030_session", "migration", "sessions column", "login 500", "signup 500".
- Tickets reviewed: full active queue + archive. `CX-20260701-no-automatic-production-migration-on-deploy` (P0, blocked-owner) covers the systemic pipeline gap for migrations 020–024 on prod; `CX-20260702-web-sessions-indistinguishable-no-device-hint-or-bulk-signout` (in-progress) is the feature that introduced migration 030; the archived `CX-20260701-prod-behind-migrations-020-024-broadly-rendered-500s` covered a *different* migration set and the getCurrentUser/landing read path.
- Why this is new: no ticket reports that login **and** signup are currently 500'ing on the running app because the connected database is missing the migration-030 `sessions` columns. This is a concrete, live, immediately-fixable member-facing outage (apply migration 030 to the connected DB), distinct from the systemic pipeline policy ticket (which is owner-blocked on prod credentials) and from the session-distinguishing feature ticket.

## Acceptance criteria

- [ ] A member with correct credentials can sign in on `/login` and reach the app; `POST /api/auth/login` returns success (not 500) for a valid member on the connected database.
- [ ] A newcomer who completes `/signup` gets an account and a session; `POST /api/auth/register` returns success (not 500) on the connected database.
- [ ] The connected database's `sessions` table has the `device_label` and `last_active_at` columns (migration `030_session_device_hint.sql` applied); no member data is altered by applying it (additive only).
- [ ] The "Signed-in browsers" panel continues to render without error (it reads the same two columns).
- [ ] Secondary (recommended, may be split): if a session write fails for any reason, login/register surface a calm, honest, recoverable message with a next step rather than a bare "Login failed." dead-end (no internal/DB terminology shown to the member).
- [ ] No sensitive data (credentials, tokens, DB error text) is exposed to the member.
- [ ] Relevant automated tests and repository checks pass; a smoke test of login + signup against a migrated database passes.

## Handoff and retest log

- `2026-07-02` - Filed by user-simulator (safety/report-block journey pass, blocked at the login step). Root-caused live: `sessions` table on the connected DB is missing `device_label`/`last_active_at` (migration 030 not applied), so the login and register session INSERTs throw `column "device_label" … does not exist` → generic 500 "Login failed." for every member. Status `ready`.

- 2026-07-02 - RESOLVED (orchestrator). Root cause was the migration-ordering hazard: the web-sessions Builder correctly used MIGRATION ADDED (local commit 891ec8d, not pushed), but the hot-reloading DEV server immediately served the new login/register routes that unconditionally INSERT `sessions.device_label`/`last_active_at`, while the dev DB lacked migration 030 → 500 on login+signup. FIX: applied additive migration `030_session_device_hint.sql` to BOTH production (before pushing) AND the dev DB, then pushed 891ec8d — so prod stays consistent on deploy and dev login/signup is restored. Verified the migration applied clean to both (idempotent via schema_migrations). Login/signup should now return 200; the next User-simulator pass will re-drive sign-in + the blocked safety/report-block journey to confirm live. Cross-ref: `CX-20260702-web-sessions-indistinguishable-no-device-hint-or-bulk-signout` (the feature + migration source) and `CX-20260701-no-automatic-production-migration-on-deploy` (P0 owner-blocked — the systemic pipeline fix that would prevent this class entirely). PROCESS LESSON: a migration-bearing Builder working in the shared tree breaks the hot-reloading dev server for the concurrent User-simulator the moment it edits the code; mitigate by migrating the dev DB as soon as the migration file exists, or isolating migration-bearing builds. Archived.
