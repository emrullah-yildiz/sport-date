# CX-20260701-prod-behind-migrations-020-024-broadly-rendered-500s

- Status: `ready`
- Severity: `critical`
- Priority: `P0 blocker` — (Reach 5 × Impact 5 × Confidence 5) / Effort 3 = 41.7. Prod is CURRENTLY missing migrations 020–024 (confirmed by the 2026-07-01 outage: `column users.personality_prompts does not exist`). Every dynamic server route that reads a 020–024 column 500s in prod for any signed-in member. Reliability/availability regression → never below P0.
- Customer journey: (whole product / reliability + deploy safety) — release-ordering coupling between code and DB migrations
- Surface: `web` (server components + API routes) + `mobile` (getMobileSession)
- Environment and viewport/device: production (Vercel + Neon) currently behind on migrations 020–024; audited at source on the local checkout, 2026-07-01. Local dev DB is fully migrated so dev does not reproduce.
- Found by: Experience & Design Explorer (Release & deploy safety lens, pass 19)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-no-automatic-production-migration-on-deploy` (the ROOT-CAUSE infra fix — no automatic prod migration step; `blocked-owner` on the owner-provided prod DB credential). **This ticket does NOT duplicate it** — it enumerates the exact broadly-rendered routes that are broken in prod right now (for the owner's awareness and for a manual `db:migrate` against prod), and records the additive-migration analysis. Fix them together: run 020–024 against prod, then wire the automatic step from the P0.

## Customer outcome

As any member (or a signed-in member specifically), I want every page to keep working after a deploy, so that a new feature never 500s the whole product — and when prod is temporarily behind on a migration, I want the site to fail calmly, not white-screen.

## What I observed (source audit + confirmed outage)

`getCurrentUser()` (`apps/web/src/lib/session.ts:79`) `SELECT`s `users.personality_prompts` (migration **020**). `getCurrentUser` returns `null` early when there is no `auth_token` cookie, so a *logged-out* visitor skips the query — but ANY member with a session cookie triggers it. Because nearly every authenticated server page and API route resolves the session through `getCurrentUser` (and mobile through `getMobileSession`, `apps/web/src/lib/mobile-session.ts:52`, which reads the same column), prod 500s site-wide for signed-in members until migration 020 lands. This is the exact column named in the 2026-07-01 outage.

Mapping each recent migration to the broadly-rendered path that reads it:

- **020 `users.personality_prompts`** — read by `getCurrentUser` (web session) AND `getMobileSession` (mobile session). This is the widest blast radius: it is on the session-resolution path itself.
- **021 `users.late_cancellation_streak` / `late_cancellation_streak_started_at` / `reliability_paused_until`** — read by `getMemberReliabilityStanding` (`apps/web/src/lib/join-requests.ts:39`), called on the shared event-invitation page `/discover/events/[eventId]` (page.tsx:19) and inside `createEventJoinRequest`.
- **022 `peer_feedback` table** + **023 `peer_feedback.experience_stars`** — read by `getPeerFeedbackTargets` (room page, `events/[eventId]/room/page.tsx:26`, only when `room.hasEnded`) and `getReceivedRatingAggregate` (profile page).
- **024 `profile_photos` table** — read by `listProfilePhotos` on the profile hero (`profile/page.tsx:69`) and the `/api/photos/[id]` serve route.

Routes that are BROKEN in prod right now (dynamic `ƒ` routes reading a missing 020 column via getCurrentUser, or a 021–024 column) for a signed-in member:

- `/landing` (auth-aware home — the reported outage entry point; `/` redirects here)
- `/discover`
- `/discover/events/[eventId]` (also reads 021)
- `/events/[eventId]`
- `/events/[eventId]/room` (also reads 022/023 when ended)
- `/events/new`
- `/feedback`
- `/hosting`
- `/profile` (also reads 022/023/024)
- `/safety`
- `/moderation` (getCurrentUser at `moderation.ts:78`)
- Every `/api/*` and `/api/mobile/*` route that resolves a session via getCurrentUser / getMobileSession (account, events, safety, photos, peer-feedback, communication-preferences, web-sessions, etc.).

Routes that SURVIVE a missing migration (do NOT read 020–024 at render): `/login`, `/signup`, `/hosting-guidelines`, `/privacy`, `/safety-guidelines`, `/terms`, `/trust`, `/research/bucharest` (all static `○`), plus `/reset-password` and `/verify-email` (token-flow pages that do NOT call getCurrentUser — account recovery stays reachable even when prod is behind, which is the one piece of good news).

## What I expected

Migrations 020–024 are applied to prod before (or atomically with) the code that reads their columns, so no signed-in member ever hits a `column does not exist` 500. Until the automatic step (the P0 ticket) exists, the owner needs the explicit list above to run `npm run db:migrate` against prod manually and confirm the site recovers.

## Migration additivity analysis (are the migrations themselves defensive?)

The migrations ARE additive and backwards-compatible — this is correct and should be preserved:

- 020 (`db/020_profile_personality_prompts.sql`): `ADD COLUMN IF NOT EXISTS personality_prompts JSONB NOT NULL DEFAULT '[]'` — every existing row valid, no backfill.
- 021 (`db/021_member_reliability.sql`): three `ADD COLUMN IF NOT EXISTS` with clean defaults, no backfill.
- 022–024: new tables / a nullable `experience_stars` column — additive.

So OLD code survives a NEW schema (deploy lags migration → fine). The outage is the REVERSE: NEW code against an OLD schema (deploy preceded migration). That direction cannot be made "defensive" cheaply — wrapping every session read in a try/catch fallback for a missing column would mask real DB errors and is worse than the ordering fix. **Conclusion: the migrations do not need changing; the fix is release-ordering (the P0 ticket) plus a preflight tripwire.** The one buildable-now, no-secret guardrail worth adding here: a CI/preflight check that FAILS the build when a `db/NNN_*.sql` file is added in a commit whose code also introduces a new column read on a broadly-rendered path (getCurrentUser / getMobileSession / root layout / landing), forcing a human to confirm the prod migration plan — this is already listed as the interim guardrail in the P0 ticket; cross-linked so it is not built twice.

## Reproduction

1. Point the app at a DB that has run migrations ≤ 019 but not 020 (i.e. the prod state on 2026-07-01).
2. Sign in (any member with a session cookie), then open `/landing`, `/discover`, or `/profile`.
3. Observe a Server Components render 500 (`NeonDbError: column users.personality_prompts does not exist`). Dev does not reproduce because the dev DB is fully migrated.

Reproduction rate: `source-confirmed against the outage report; 1/1 for any 020-reading route on an un-migrated DB`

## Customer impact

Availability: signed-in members cannot use the product at all while prod is behind — every core surface 500s. Emotional: a returning member who just had a session sees a broken site. No privacy/authorization dimension in the failure itself (it is a missing column, not a data leak); anti-enumeration and auth logic are unchanged. Recovery surfaces (`/reset-password`, `/verify-email`, `/login`, `/signup`) stay up, so a member is not locked out of the account-recovery path — but they cannot reach discover/profile/events.

## Evidence and limits

- Evidence: `session.ts:79` (`users.personality_prompts AS prompts`), `mobile-session.ts:52` (same), `join-requests.ts:39` (021 columns), `profile/page.tsx:65-69` (022/023/024 reads), `room/page.tsx:26` (022/023), `discover/events/[eventId]/page.tsx:19` (021). Production build (`npm run build --workspace @sport-date/web`) PASSED (exit 0, "Compiled successfully") — the build does NOT catch this because it does not run against prod data; the route list above is taken from the build's dynamic (`ƒ`) vs static (`○`) classification.
- Redactions made: none needed (no credentials/PII in the audit).
- Facts: migrations 020–024 are additive (`ADD COLUMN IF NOT EXISTS` + defaults / new tables); the outage is new-code-vs-old-schema, not the reverse; getCurrentUser short-circuits for logged-out visitors so the marketing page renders for anonymous users even on an un-migrated DB.
- Hypotheses to verify during implementation: whether prod has since been manually migrated (the owner should confirm 020–024 are applied); whether the preflight tripwire belongs in `ci.yml` or a `predeploy` script.
- Paths or surfaces not tested: prod itself (no prod credentials in this env; audit is source-level against the checked-out code + the confirmed outage report).

## Duplicate check

- Search terms used: personality_prompts, migration, deploy, prod, getCurrentUser, column does not exist, 500, release ordering, db:migrate.
- Tickets reviewed: `CX-20260701-no-automatic-production-migration-on-deploy` (the root-cause infra ticket), full queue.
- Why this is new: the P0 ticket names only `getCurrentUser`/landing as the trigger and owns the automatic-migration infra fix (blocked on the owner's prod credential). This ticket adds the operational specifics the P0 lacks — the EXACT enumerated list of prod-broken vs surviving routes across all of 020–024, the per-migration read map, and the additivity analysis — so the owner can manually migrate and confirm recovery now, and so the preflight tripwire has a concrete broadly-rendered-path list to guard. Cross-linked, not duplicated.

## Acceptance criteria

- [ ] Migrations 020–024 are applied to production (manually now via `npm run db:migrate`, then automatically per the P0 ticket) and a signed-in member can load `/landing`, `/discover`, `/profile`, `/events/[id]`, `/events/[id]/room`, `/hosting`, `/feedback`, `/safety`, and `/moderation` without a 500.
- [ ] A preflight/CI tripwire fails the build when a `db/NNN_*.sql` migration is added alongside code that reads a new column on a broadly-rendered path (getCurrentUser / getMobileSession / root layout / landing), so this ordering gap can't recur silently (coordinate with the P0 ticket so it is built once).
- [ ] The migrations remain additive/backwards-compatible (no destructive DROP/rename on a broadly-read column) so a brief deploy-precedes-migrate window degrades safely for OLD code.
- [ ] No authorization, anti-enumeration, or privacy behavior changes as part of the fix.
- [ ] Relevant automated tests and repository checks pass; the runbook records the manual-migrate step until the automatic one lands.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (Release & deploy safety lens). Enumerated the prod-broken vs surviving route set across migrations 020–024 with the per-migration read map, confirmed the production build passes locally (does not catch the prod-schema gap), and analysed migration additivity (additive; the fix is release-ordering + a preflight tripwire, not per-read defensiveness). Cross-linked to the root-cause P0 `CX-20260701-no-automatic-production-migration-on-deploy`; status `ready`.
