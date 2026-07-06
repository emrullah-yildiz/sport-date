# CX-20260706-first-party-click-analytics — Anonymous first-party click/funnel analytics

**Priority:** P1 (owner request 2026-07-06: "can you track what people click on the website?")
**Status:** `implemented` (commit 94aa855: beacon + structurally-anonymous `click_metrics_daily` migration 043, trackClick instrumentation, owner summary API + HQ funnel, privacy-notice 3.8) · **Owner-gate:** none (no spend; anonymous-by-construction)

## Why
The owner needs to see what visitors actually do (which CTAs get clicked, where
the funnel drops) to steer growth. Third-party analytics (GA4 etc.) would force
a consent banner and ship member data to a third party — wrong for an EU-first
dating product. We build the privacy-clean version in-house.

## What to build
1. **Beacon endpoint** — `POST /api/metrics/click` accepting
   `{ event: string, path?: string }` from the app itself (same-origin;
   `navigator.sendBeacon` with fetch fallback). Validate `event` against a
   fixed allowlist (see below) and `path` against a small set of page classes
   (`/`, `/signup`, `/discover`, `/events/*`, `/e/*`, `/research`, `other`) —
   never free-text. Rate-limited per IP (reuse the existing limiter, hashed
   scope, no IP stored), `no-store`, fails soft (analytics must never break UX).
2. **Anonymous aggregate storage** — table `click_metrics_daily`
   `(day DATE, event TEXT, path_class TEXT, count INT)` with
   `INSERT … ON CONFLICT … DO UPDATE SET count = count + 1`.
   **No user id, no session id, no IP, no user agent, no timestamp finer than
   the day.** A DB row can never describe a person.
3. **Client instrumentation** — tiny `trackClick(event)` helper; instrument:
   `landing_cta_join`, `landing_cta_survey`, `signup_started`,
   `signup_completed`, `discover_viewed`, `event_publish_started`,
   `event_published`, `join_requested`, `share_opened`, `share_platform_click`
   (one event; platform NOT recorded to keep cardinality/anonymity),
   `poster_downloaded`, `survey_started`, `survey_completed`. Fire-and-forget;
   zero impact on navigation.
4. **Owner read surface** — owner-gated `GET /api/metrics/summary?days=14`
   returning daily counts per event; render a compact funnel section on
   `/hq.html` (visits are NOT tracked — page views only via the events above;
   keep scope to clicks). The daily standup scribe may read the summary via the
   same owner/agent dual-auth pattern as `/api/standup/directions`
   (Bearer `SOCIAL_AGENT_SECRET`).
5. **Docs** — one paragraph in `docs/legal/privacy-notice.md` operational notes
   ("anonymous aggregate usage statistics, no identifiers") + decision-log line.

## Hard rules
- Anonymity is structural: the schema physically cannot hold identifiers.
  Test: the insert path drops/rejects any extra fields; no request header
  containing identity is read.
- No cookies, no localStorage, no fingerprinting, no third-party requests.
- Fails soft: analytics errors never surface to members or block actions.
- Full DoD: typecheck, lint, full web suite, prod build.

## Pointers
- Rate limiter: `apps/web/src/lib/rate-limit*` (hashed keys, no IP stored).
- Owner/agent dual-auth GET: `apps/web/src/app/api/standup/directions/route.ts`.
- Migration style: `apps/web/db/0NN_*.sql` (next number after current max).
- HQ page: `apps/web/public/hq.html` (static + fetch sections already exist).
