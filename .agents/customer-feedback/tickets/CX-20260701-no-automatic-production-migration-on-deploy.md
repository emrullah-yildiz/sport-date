# CX-20260701-no-automatic-production-migration-on-deploy

- Status: `implemented`
- Severity: `critical`
- Priority: `P0` — this gap caused a full production outage on 2026-07-01 (every page 500'd with `column users.personality_prompts does not exist`). Root-cause infra fix.
- Customer journey: (whole product / reliability)
- Surface: `web` (deploy pipeline)
- Environment and viewport/device: production (Vercel) + Neon
- Found by: Owner (prod error report 2026-07-01) + orchestrator diagnosis
- Implementation owner: `unassigned` (needs owner-provided production DB credential in the deploy env)
- Related tickets: `none`

## Customer outcome

As any member, I want the site to keep working after a deploy, so that a new feature never takes the whole product down.

## What happened

A push to `main` auto-deployed to Vercel production. The deploy included DB migrations 020–024, but **nothing applies migrations to the production database on deploy** — CI (`.github/workflows/ci.yml`) only migrates a disposable *test* branch, and the Vercel build runs `next build` with no migration step. The new code (`getCurrentUser`, called by the now-auth-aware landing page) selected `users.personality_prompts`, which prod lacked → `NeonDbError: column ... does not exist` → site-wide Server Components 500. The dev QA loop never caught it because dev runs against an already-migrated database.

## What we expect

Production migrations run automatically and safely as part of every deploy, before the new code serves — or the deploy is gated until they have. Adding a migration should never require a human to remember to run it against prod.

## Options (pick one; owner must provide the production `DATABASE_URL` to the chosen surface)

1. **Migrate in the Vercel build step** — set the production `DATABASE_URL` (or `NEON_DATABASE_URL`) as a Vercel *build* env var and change the build to `npm run db:migrate --workspace @sport-date/web && npm run build ...`. The runner is idempotent (tracks `schema_migrations`) and additive migrations are safe. Simplest; runs before the new deployment is promoted. (Caveat: Neon branch/pooler + build concurrency — use the direct, non-pooled URL and rely on the `schema_migrations` guard.)
2. **Migrate in a CI job gated before deploy** — a GitHub Actions job on push to `main` that runs `db:migrate` against production (secret `PROD_DATABASE_URL`) and must pass before Vercel is allowed to promote.
3. **Release script + Neon** — a dedicated release step (e.g. GitHub Environment with required reviewers) that runs migrations, then triggers the deploy.

Interim guardrail (buildable now, no secret): a CI/preflight check that FAILS the build when a `db/NNN_*.sql` file is added in a commit whose code also reads a new column on a broadly-rendered path — forcing a human to confirm the prod migration plan. Also: keep migrations additive/backwards-compatible so old code survives a brief window where deploy precedes migration.

## Acceptance criteria

- [ ] Production migrations are applied automatically (or gated) on every deploy, before new code serves; verified by deploying a no-op migration and confirming it lands on prod without manual action.
- [ ] A deploy that adds a migration prod hasn't run cannot silently 500 the site (either migrations run first, or the deploy is blocked, or the code degrades safely).
- [ ] The mechanism uses an owner-provided production DB credential stored as a secret — never committed.
- [ ] Runbook updated (`docs/operations/deployment-runbook.md`).
- [ ] A test/preflight covers the "migration added" case.

## Handoff and retest log

- 2026-07-01 - Filed after the prod outage; `blocked-owner` because the fix needs the owner to provide the production DB credential to the deploy/CI env and choose the approach. The agent-side lessons (prod build in definition-of-done; explorer "Release & deploy safety" lens) were applied immediately in the agent definitions.
- 2026-07-03 - Owner unblocked: chose **Option 1 (Vercel build-step)** and confirmed the production DB credential is present. Implemented by orchestrator. `apps/web/vercel.json` `buildCommand` now runs `node scripts/deploy-migrate.mjs && next build`; `deploy-migrate.mjs` uses the pure `planDeployMigration({vercelEnv,hasDatabaseUrl})` in `scripts/migrations.mjs` (extracted from the proven `migrate.mjs` logic; `runMigrations()` shared by the CLI and the deploy path). Behaviour: production+DATABASE_URL → run migrations then build (idempotent, no-op when current); production+no DB → **fail closed / block the deploy** so the last good deployment keeps serving; preview/development → skip. Credential = the EXISTING Vercel **Production** `DATABASE_URL` (verified host `ep-round-rain-...pooler`, i.e. prod) — available at build time, never committed; no new secret added. Verified locally: typecheck/lint pass; `scripts/migrations.test.mjs` (4 cases) proves the run/block/skip decision; full suite 769 tests pass; `npx vercel build --prod` ran the exact production build command end-to-end and logged `[deploy-migrate] production database migrated before build — 0 new migration(s) applied (prod already current)` then `next build` compiled — proving the mechanism reaches prod and no-ops. Runbook §2 updated with an "Automatic on every production deploy" subsection. Pending: confirm the first REAL Vercel deploy runs the build-step migrate and promotes healthy, then → `verified`.
