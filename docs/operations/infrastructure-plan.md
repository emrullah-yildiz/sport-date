# Production infrastructure plan (owner Gate 1)

> **DEPLOYED 2026-06-30.** Live at `https://sport-date-gray.vercel.app` (Vercel project `sport-date`, Frankfurt). Neon project `old-shadow-24384252` with `production` (clean, 19 migrations), `test`, and `dev` branches; local `.env` points at `dev`. Production env set: `DATABASE_URL` (Neon prod, pooled), `CRON_SECRET`, `EMAIL_DELIVERY_ENABLED=false`, `APP_PUBLIC_ORIGIN`/`NEXT_PUBLIC_APP_ORIGIN`. Health (`/api/health`), readiness (`/api/health/ready` → DB OK), and the protected daily session-cleanup cron (`/api/internal/session-cleanup`, `0 3 * * *`) all verified live. **Still pending:** Vercel↔GitHub auto-deploy (needs the Vercel GitHub App installed on the repo — currently deploying via `vercel deploy --prod`), `TEST_DATABASE_URL` CI secret, Upstash + Sentry env vars, and the launch gates below (this is production *infrastructure*, not yet clearance to onboard real users).



Decisions and trade-offs for the first European deployment. The agent has made the
calls below; the owner ratifies (or vetoes the one flagged fork) and provisions
the accounts under owner ownership. Nothing here has been provisioned, deployed,
or paid for. Billing accounts must be created by the owner.

Guiding constraints: Europe-first, privacy-first, adults-only, **pre-launch with
no real users yet**, single maintainer. Optimise for EU data residency, low
operational burden, low standing cost, and reversibility — not scale we do not
have.

## The stack (decided)

| Layer | Choice | Region | Why | Reversible? |
| --- | --- | --- | --- | --- |
| Database | **Neon Postgres** (keep) | `eu-central-1` (Frankfurt) | Already in use; managed; **branching** gives instant prod/dev/test isolation and disposable CI databases; PITR backups; scales to zero. | High — standard Postgres; `pg_dump` portable. |
| Web + mobile API | **Vercel**, functions pinned to `fra1` | Frankfurt | Native Next.js 16 fit, zero-ops, preview deploys, built-in Cron, env management, GDPR DPA, EU compute region. One deployment serves the web app and the mobile API. | High — Next.js is portable to any Node host. |
| Shared rate-limit store (Gate 6) | **Upstash Redis** | Frankfurt | Serverless Redis, free tier, pairs with Vercel; gives the existing in-app rate limits a cross-replica/restart-durable backing store and closes the reset-request timing residual. | High — adapter-isolated; falls back to in-memory. |
| Error monitoring | **Sentry** (EU data region) — **WIRED 2026-06-30** | EU | Mature, EU data residency, generous dev tier; one DSN env var. **`@sentry/nextjs` is integrated and build-verified on Next 16.2.9; env-gated on `NEXT_PUBLIC_SENTRY_DSN` (no-op without it), PII-scrubbed, Session Replay OFF. Activates when the owner sets the DSN.** | High — SDK-isolated. |
| Uptime | **Better Stack** or **UptimeRobot** | n/a | Free external check on `/api/health`. | High. |
| Backup / recovery | **Neon PITR** | Frankfurt | Point-in-time restore + history retention (start at 7 days); optional scheduled logical dump later. | n/a |
| Scheduled jobs | **Vercel Cron** → protected internal endpoint | Frankfurt | Runs the existing session-cleanup logic on a schedule without a separate worker. | High. |
| Secrets | **Vercel env vars** (per environment) + provider-native | n/a | Encrypted, per-env; nothing in the repo. | n/a |
| CI | **GitHub Actions** | n/a | Hermetic typecheck + tests now (`.github/workflows/ci.yml`); an integration job against a Neon **test** branch can be added once its connection string is a repo secret. | n/a |
| Domain | **Deferred to brand (Gate 3)** | n/a | Run on the Vercel URL until the brand/name is chosen; registering a domain now risks naming a product that may pivot. | n/a |

> **Resolved 2026-06-30:** the owner ratified **Vercel**. The EU-sovereign alternative below is retained only as the fallback if counsel (Gate 2) later objects to a US-incorporated processor.

### The one fork worth your explicit call

**Vercel (US-incorporated PaaS, EU compute) vs an EU-sovereign host (Hetzner VPS or Fly.io `fra`).**

- I chose **Vercel** because at pre-launch, time-to-production and the native Next.js fit dominate, compute can be pinned to Frankfurt, and the choice is reversible. It does mean a US-incorporated processor in the chain (under its DPA + SCCs).
- If you or counsel want to avoid US processors entirely for EU dating-app PII, the fallback is an **EU-sovereign host** (Hetzner/Fly `fra`) — stronger data-sovereignty story, more operational burden, no managed cron/preview niceties. This is the kind of call that interacts with Gate 2 (counsel), so flag it there.
- **My recommendation:** start on Vercel; revisit only if counsel objects. Veto this line and I switch the plan to Hetzner/Fly before anything is provisioned.

## Cost (pre-launch, order of magnitude)

All tiers below are free or low; expect **≈ $0–25/month** until real traffic: Neon (free/launch tier), Vercel (Hobby free, or Pro ~$20 if a team/commercial use is needed), Upstash (free tier), Sentry (free dev tier), uptime monitor (free). No standing spend is required to stand the stack up.

## What I need from you (owner actions)

Create each account under your ownership (I cannot create accounts, accept terms,
or spend money), then hand me the credentials via a method we agree on — **not in
chat, not in the repo**. A Vercel/secret-manager env entry is ideal.

1. **Ratify the stack** above (or veto the Vercel fork → I switch to the EU-sovereign plan).
2. **Neon:** create a **production** branch/project in Frankfurt and a separate **test** branch for CI. Send the production `DATABASE_URL`. Keep the existing dev database as-is. (And **rotate** the dev credential shared earlier in chat.)
3. **Vercel:** create the account, import this GitHub repo, set region `fra1`, and set the production environment variables (exact list below). Grant me project access or a deploy hook.
4. **Upstash:** create a Redis database in Frankfurt; send `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
5. **Sentry:** create a project on the EU data region; send the `SENTRY_DSN`.
6. **Uptime monitor:** create after a deployed URL exists (I will add `/api/health` first).
7. **Domain:** hold until the brand is chosen (Gate 3).

### Production environment variables (the app reads these)

| Var | Purpose | Source |
| --- | --- | --- |
| `DATABASE_URL` | Neon production connection string | Neon (step 2) |
| `APP_PUBLIC_ORIGIN` | Canonical server origin for email links (never request headers) | The deployed origin |
| `NEXT_PUBLIC_APP_ORIGIN` | Client-side origin | The deployed origin |
| `NODE_ENV` | `production` | Vercel default |
| `EMAIL_DELIVERY_ENABLED` | `false` until Gate 4 | keep disabled |
| `EMAIL_DELIVERY_PROVIDER` | provider id once Gate 4 lands | Gate 4 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | shared rate-limit store | Upstash (step 4) |
| `NEXT_PUBLIC_SENTRY_DSN` | error reporting (server + edge + client; public-safe) | Sentry (step 5) |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | *optional* — source-map upload at build time | Sentry (step 5) |

(`RUN_DB_INTEGRATION` is test-only and must never be set in production.)

## What I can do now / once each piece lands (no owner decision required)

- **Now:** CI workflow (done); add a `/api/health` endpoint; scaffold the Upstash rate-limit adapter behind a flag (in-memory fallback until the URL exists, mirroring the email-adapter seam); add a `vercel.json` (region `fra1` + the session-cleanup cron) and a `.env.production.example`.
- **Once Neon prod + test strings exist:** run migrations against production; add the CI integration job against the test branch; clean up the dev DB's fixture residue if desired.
- **Once Upstash exists:** wire the in-app rate limits to the shared store and add the integration test.
- **Sentry error reporting (server + edge + client) with PII scrubbing is now wired and build-verified (2026-06-30)** — env-gated on `NEXT_PUBLIC_SENTRY_DSN`, Session Replay OFF, `beforeSend` strips bodies/cookies/auth-headers/query/email/IP. It is a no-op until the owner sets the DSN; once set + redeployed, trigger a live test error to confirm events land. Source-map upload additionally needs `SENTRY_AUTH_TOKEN`+`SENTRY_ORG`+`SENTRY_PROJECT`.

## Interlocks

- **Gate 2 (counsel)** should confirm the processor set (Vercel, Neon, Upstash, Sentry) and their DPAs/sub-processors are acceptable for EU PII before real registration opens. The legal drafts in `docs/legal/drafts/` already leave the processor list as a `[COUNSEL:]` item.
- **Gate 3 (brand)** gates the real domain.
- **Gate 4 (email)** keeps `EMAIL_DELIVERY_ENABLED=false` until an approved provider exists.
- **Gate 6 (edge rate limiting)** is satisfied by the Upstash store above; the agent implements once it exists.
- **Gate 7 (test DB)** is satisfied more cleanly by a dedicated Neon **test branch** than by the shared dev DB.
