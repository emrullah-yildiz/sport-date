# CX-20260701-global-error-boundary-white-screen-not-calm-branded

- Status: `ready`
- Severity: `high`
- Priority: `P1 high` — (Reach 3 × Impact 4 × Confidence 4) / Effort 2 = 24. When a broadly-rendered server path throws (missing `DATABASE_URL`, or a missing-migration `column does not exist`, or any RSC render error), the app-wide fallback renders a bare, unbranded, un-worded Next.js error page — the white-screen 500 the Release & deploy safety lens explicitly says required env/secret failures must NOT produce. Reliability/trust regression at the worst moment.
- Customer journey: (whole product / error + offline + deploy safety) — the last-resort fallback when a server component throws
- Surface: `web` (App Router global error boundary)
- Environment and viewport/device: dev + prod; source-verified against `apps/web/src/app/global-error.tsx`, 2026-07-01
- Found by: Experience & Design Explorer (Release & deploy safety lens 13c — env/secrets fail closed and calm, pass 19)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-no-automatic-production-migration-on-deploy` and `CX-20260701-prod-behind-migrations-020-024-broadly-rendered-500s` (this is the fallback those failures land in — a calm fallback would turn the outage's white-screen into a calm, on-brand "we're having a problem" page while the DB/migration is fixed), `CX-20260630-moderation-route-renders-unbranded-default-404` (same theme: an unbranded default framework page shipped where a calm branded one is expected).

## Customer outcome

As any member (or visitor), when something goes wrong server-side — a missing/misconfigured environment secret, a database that is temporarily unreachable or behind on a migration, or an unexpected render error — I want a calm, on-brand page that tells me the site is having a problem and what I can do (retry / come back shortly), not a blank white "Error" screen with a bare status code, so I keep trusting the product and know it isn't me who broke.

## What I observed

`apps/web/src/app/global-error.tsx` (the App Router application-wide error boundary, the last-resort fallback for any error a nested `error.tsx` did not catch) renders `<NextError statusCode={0} />` inside a minimal `<html><body>`. `next/error`'s default output is an unbranded, uncentered framework page (just a status number and a generic message) — no Sport Date wordmark, no calm host-voice copy, no reduced-motion/contrast consideration, no forward action (retry / go home / try again shortly). It does report to Sentry (a no-op without a DSN) and scrubs before send, which is good — but the *member-facing* surface is a white screen.

This is the exact failure mode the Release & deploy safety lens warns about for env/secrets: `getDatabase()` (`apps/web/src/lib/db.ts:12`) throws `DatabaseNotConfiguredError` when neither `DATABASE_URL` nor `NEON_DATABASE_URL` is set, and a broadly-rendered server component (landing/discover/profile) calling `getCurrentUser` will bubble that throw up to this global boundary → white screen. The same is true for the migration-behind `NeonDbError: column ... does not exist` that took prod down on 2026-07-01: the member saw a blank error page, not a calm one.

Contrast — the BLOB/photo path already fails closed AND calm (the good pattern to mirror): `apps/web/lib/photo-storage.ts` returns `{ ok: false, reason: "not-configured" }` when `BLOB_READ_WRITE_TOKEN` is unset, and the photo routes surface a calm HTTP 503 "Photo uploads aren't available yet. The rest of your profile is unaffected." So the BLOB token failure is handled well; the gap is the DATABASE/RSC-throw path, whose only backstop is this bare global-error page.

Note on scope: a DB-backed app genuinely cannot render most pages when the DB is unreachable, so the fix is NOT "render the page anyway" — it is to make the unavoidable failure land on a CALM, branded, worded fallback (Ink/Cream, wordmark, "Sport Date is having a problem — please try again shortly", a retry action) instead of a white `NextError`.

## What I expected

The global error boundary should render a calm, on-brand fallback: the Sport Date wordmark, a short human line ("Something went wrong on our side — please try again in a moment."), a retry affordance (the App Router boundary receives a `reset()` prop; use it for a "Try again" button) and/or a link home, AA contrast, no motion issues, and no leaked internal error text/stack/digest to the member. Sentry reporting + scrubbing stays.

## What I expected to avoid (guardrails)

Do not expose the internal error message, stack, `digest`, SQL, or column names to the member (anti-enumeration + don't leak schema). Keep the Sentry capture and `beforeSend` scrubbing. Do not fabricate a specific cause ("database is down") the boundary can't actually know — keep it a calm generic. No manufactured urgency. Because `global-error.tsx` replaces the root layout (it renders its own `<html>`/`<body>`), the fallback must be self-contained (inline-safe styles / a minimal component) and must not itself depend on data fetching that could throw again.

## Reproduction

1. Unset `DATABASE_URL`/`NEON_DATABASE_URL` (or point at a DB missing a migration a broadly-rendered path reads) and load a page that calls `getCurrentUser` while signed in (`/landing`, `/discover`, `/profile`).
2. Observe: the server component throws (`DatabaseNotConfiguredError` or `NeonDbError`), the throw bubbles to `global-error.tsx`, and the member sees a bare white `NextError` page with no branding, copy, or recovery action.
3. Inspect `apps/web/src/app/global-error.tsx`: the render body is `<NextError statusCode={0} />`.

Reproduction rate: `source-confirmed; the global boundary renders NextError for every uncaught render error`

## Customer impact

Trust/reliability: a white "Error" screen at any server failure reads as "the whole thing is broken" and gives no path back; it is the single worst first impression during an incident (and it is precisely what a signed-in member saw during the 2026-07-01 migration outage). Accessibility: a bare `NextError` page is not designed for contrast/reduced-motion/focus. No privacy leak today provided the fix keeps internal error text hidden (the current NextError with `statusCode={0}` shows only a generic message, so this is a UX/trust gap, not a data-exposure one) — but the fix must continue to withhold error internals.

## Evidence and limits

- Evidence: `apps/web/src/app/global-error.tsx` renders `<NextError statusCode={0} />`; `apps/web/src/lib/db.ts:12` throws `DatabaseNotConfiguredError` when the DB URL is unset; `apps/web/lib/photo-storage.ts` (the good pattern) returns `{ ok:false, reason:"not-configured" }` → calm 503. There is one route-level `error.tsx` under `/hosting` (and `/events/[eventId]/room` per prior passes), but no calm APP-WIDE fallback — the root `global-error.tsx` is the only global catch and it is the bare NextError.
- Redactions made: none needed.
- Facts: `global-error.tsx` must render its own `<html>`/`<body>` (it replaces the root layout) and receives `error` (+ `reset` in the App Router signature) — `reset` is available for a "Try again" action but is not currently used.
- Hypotheses to verify during implementation: whether a shared calm-error component can be reused between `global-error.tsx` and the nested `error.tsx` boundaries; whether to show a "Try again" (reset) button, a home link, or both.
- Paths or surfaces not tested: a live prod incident (source-level audit only; the 2026-07-01 outage is the real-world confirmation that this fallback is what members saw).

## Duplicate check

- Search terms used: global-error, error boundary, NextError, white screen, 500, DATABASE_URL, fail closed, calm, branded.
- Tickets reviewed: the two deploy-safety tickets above, `CX-20260630-moderation-route-renders-unbranded-default-404`, full queue.
- Why this is new: the deploy-safety tickets cover WHY the failure happens (missing prod migration / no auto-migrate) and WHICH routes break; none covers the member-facing FALLBACK the failure lands in. The moderation-404 ticket was about an unbranded default *not-found* page on one route; this is the unbranded default *error* page app-wide. Distinct, independently fixable, cross-linked.

## Acceptance criteria

- [ ] When a broadly-rendered server path throws (missing DB URL, missing-migration column error, or any uncaught RSC render error), the member sees a calm, on-brand fallback — Sport Date wordmark, a short human line, AA contrast, no motion issues — not a bare white `NextError`.
- [ ] The fallback offers a recovery affordance (a "Try again" action using the boundary `reset`, and/or a link home) with a ≥44px target and visible focus.
- [ ] No internal error message, stack, `digest`, SQL, or schema/column name is shown to the member; Sentry capture + `beforeSend` scrubbing is preserved.
- [ ] The fallback is self-contained (does not itself depend on a data fetch that could throw) since `global-error.tsx` replaces the root layout.
- [ ] Layout is usable and overflow-free at 375px and 1280px.
- [ ] Relevant automated tests and repository checks pass (add a render test asserting the calm fallback shows the wordmark + recovery action and does NOT render the raw error text).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (Release & deploy safety lens 13c — env/secrets must fail closed and calm). Source-confirmed the app-wide `global-error.tsx` renders a bare `<NextError statusCode={0} />`, that `getDatabase()` throwing bubbles here as a white screen (the DB path does NOT fail calm, unlike the BLOB/photo path which does), and that this is the fallback the 2026-07-01 migration outage landed in. Cross-linked to the two deploy-safety tickets; status `ready`.
