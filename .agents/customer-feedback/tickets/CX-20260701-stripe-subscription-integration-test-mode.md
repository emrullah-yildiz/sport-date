# CX-20260701-stripe-subscription-integration-test-mode

- Status: `in-progress`
- Severity: `high`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 3 × / Effort 4) → RICE ≈ 15, held at **P1**: it is the mechanism that turns the €6.99 launch decision into a real (test-mode) subscription and unblocks every downstream Plus surface. Build immediately after the entitlement ticket.
- Customer journey: commitment (upgrade) / coordination (renewal, cancel) — but NO member charging until go-live
- Surface: `web`
- Environment and viewport/device: server routes; test mode only
- Found by: Owner launch decision (2026-07-01) — Stripe chosen, build now in TEST mode behind a flag; `docs/marketing/monetization-and-pricing-analysis.md` §0
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-plus-tier-entitlement-model-and-gating` (P1 — **build first**; the webhook here sets/clears that entitlement), `CX-20260701-owner-decision-payments-processor-and-billing-gate` (blocked-owner — go-live gate this build sits behind; **do NOT** add live keys / accept terms / charge), `CX-20260701-plus-billing-management-ui` (P2 — the surface that starts Checkout and opens the Billing Portal), `CX-20260701-no-automatic-production-migration-on-deploy` (any additive migration here must be flagged for the orchestrator prod-migration process)

## Customer outcome

As a member who wants to support Sport Date and unlock convenience perks, I want to subscribe to Sport Date Plus and have my Plus status recognised reliably — and, before go-live, for the whole thing to sit dormant and harmless so I am never charged and never see a broken payment screen.

## What I observed

There is no payment integration of any kind. The owner has decided (2026-07-01) to build the Stripe billing **now, in TEST mode, behind a `BILLING_ENABLED` flag**, with **no real charges until go-live**. The integration must fail closed (Plus simply unavailable, calm "coming soon") whenever the flag or Stripe keys are absent — the default in dev/CI and in production until the owner flips it — exactly mirroring `apps/web/src/lib/photo-storage.ts` (a missing owner-provided secret degrades to a safe unavailable state, never a throw, never a charge).

## What I expected (scope — TEST-MODE STRIPE, FAIL-CLOSED, BEHIND A FLAG)

1. **Add the `stripe` dependency** to `apps/web` (server-side only; never imported into client bundles).
2. **An isolated, env-gated Stripe module** (e.g. `apps/web/src/lib/stripe.ts`) that reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (the €6.99 subscription price), and `STRIPE_WEBHOOK_SECRET` from the environment and a `BILLING_ENABLED` flag (env, e.g. `BILLING_ENABLED=true`). It **FAILS CLOSED**: when any required key is unset OR `BILLING_ENABLED` is not true, `isBillingConfigured()` returns false, every operation returns a typed `{ ok: false, reason: "not-configured" }` (never throws), and Plus checkout is simply unavailable with a calm "coming soon" state. Stripe is only ever constructed when fully configured. All Stripe SDK calls live behind this module so routes stay mockable (same discipline as `photo-storage.ts`).
3. **A Checkout Session route** (e.g. `POST /api/billing/checkout`) — authenticated, CSRF-safe, subscription mode, using `STRIPE_PRICE_ID` (the €6.99 price), success/cancel URLs back into the app, the member's Stripe customer created/reused. Returns the Checkout URL. Returns a calm 503 "coming soon" when not configured. **No charge is initiated by the app itself** — the member would complete Stripe's hosted checkout; in test mode this only ever uses Stripe test cards.
4. **A webhook route** (e.g. `POST /api/billing/webhook`) that **verifies the Stripe signature** against `STRIPE_WEBHOOK_SECRET` (reject unverified with 400), reads the raw body, and on `customer.subscription.created` / `updated` / `deleted` (and `checkout.session.completed` where needed) **sets or clears the member's Plus entitlement** via the entitlement helper from `CX-20260701-plus-tier-entitlement-model-and-gating`. Active/trialing → Plus on; canceled/unpaid/expired → Plus off (cleanly back to free). Idempotent on event id.
5. **Everything behind `BILLING_ENABLED`.** With the flag off or keys absent, the routes exist but report not-configured; no Plus can be granted; no member is charged. This is the production default until the owner flips it at go-live.
6. **Data linkage, minimal and outside the safety boundary.** If a small additive linkage is truly needed (e.g. `stripe_customer_id`, `stripe_subscription_id`, `plus_until` on the member), add it as an **additive migration only**, kept outside the safety/moderation data boundary, storing no card/PAN data (Stripe holds all sensitive payment data). **If a migration is added, FLAG IT for the orchestrator prod-migration process** (`CX-20260701-no-automatic-production-migration-on-deploy`) and keep it backwards-compatible so old code survives a deploy-before-migrate window.
7. **Unit-tested with Stripe fully mocked.** No real Stripe calls, no real charges, no network. Tests assert: fail-closed when keys/flag absent (checkout → not-configured 503, webhook → not-configured); checkout builds a subscription session with the €6.99 price id when configured (mocked); webhook rejects a bad/missing signature (400); a verified `subscription.created`/`updated` sets Plus, `deleted`/`canceled` clears it; idempotency; and that no client bundle imports the Stripe secret.

Explicitly **out of scope:** the upgrade/manage UI (sibling P2 ticket), any LIVE key, creating the Stripe account/Product/Price, accepting terms, and flipping the flag — those are owner go-live actions in `docs/operations/monetization-go-live-runbook.md`.

## Reproduction

1. Search for `stripe`, `checkout`, `webhook`, `BILLING_ENABLED` in the app. None exist.

Reproduction rate: `confirmed; feature absent (2026-07-01)`

## Customer impact

Done right, the path to the first euro exists in code and can be dry-run in test mode without any risk to members; at go-live the owner flips one flag and adds keys. Done wrong, a member could be charged prematurely, see a broken checkout, or have Plus granted without a verified subscription — all prevented by the flag + fail-closed + signature verification.

## Duplicate check

- Search terms used: `stripe`, `billing`, `checkout`, `webhook`, `subscription`, `BILLING_ENABLED`, `payment`.
- Tickets reviewed: full `CX-20260701-*` queue + the two owner-decision tickets. The payments-gate ticket is the owner *decision/go-live gate*; the entitlement ticket owns the *state*; this ticket owns the *Stripe mechanism that changes that state*. No overlap. New.

## Acceptance criteria

- [ ] The `stripe` dependency is added (server-only); the Stripe SDK is never imported into a client bundle (asserted).
- [ ] An isolated Stripe module reads `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` and a `BILLING_ENABLED` flag from the environment and **FAILS CLOSED** — `isBillingConfigured()` false, typed not-configured result, never throws, **no charge** — whenever any is absent or the flag is off (the dev/CI/default-prod state). Mirrors `photo-storage.ts`.
- [ ] A subscription-mode Checkout Session route (authenticated, CSRF-safe) uses the €6.99 `STRIPE_PRICE_ID` when configured and returns a calm 503 "coming soon" when not.
- [ ] A webhook route **verifies the Stripe signature** (rejects unverified with 400) and, on subscription created/updated/deleted, **sets/clears the member's Plus entitlement** via the entitlement helper; active/trialing → Plus, canceled/unpaid/expired → free; idempotent on event id.
- [ ] All of the above is behind `BILLING_ENABLED`; with the flag off or keys absent, **no member is charged and no Plus is granted**. **No LIVE keys, no terms accepted, no account created, no real charge anywhere.**
- [ ] Safety and core participation are untouched and remain free; the billing routes gate nothing free. Photos stay capped at 6 for everyone (no photo-related billing).
- [ ] **Forbidden-perks guardrail:** the only thing a subscription grants is the Plus entitlement (convenience/richness perks); it never grants paid boosts/likes/priority visibility, paid access to people, "who rated/skipped/viewed you", extra photos, or any attractiveness/popularity mechanic.
- [ ] **Cancel-easy:** a canceled/deleted subscription cleanly clears Plus back to free with no lingering half-state (the member-facing cancel path is the billing-UI ticket, via Stripe Billing Portal).
- [ ] Unit tests with **Stripe fully mocked** cover: fail-closed (keys/flag absent), configured checkout builds the €6.99 subscription session, webhook rejects bad signature, verified events set/clear Plus, idempotency, no secret in client bundle. **No real Stripe calls, no charges.**
- [ ] Any additive migration is backwards-compatible, stores no card/PAN data, sits outside the safety/moderation boundary, and is **flagged for the orchestrator prod-migration process** (`CX-20260701-no-automatic-production-migration-on-deploy`).
- [ ] `apps/web/.env.production.example` documents `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `BILLING_ENABLED` as commented placeholders — **no real value committed**.
- [ ] Relevant automated tests and repository checks pass (`typecheck`, `lint`, web + domain suites, production build green with the flag off / no keys).

## Handoff and retest log

- 2026-07-01 - Picked up by experience-build-agent; set `in-progress`. Building fail-closed test-mode Stripe rails behind `BILLING_ENABLED` (module + checkout route + signature-verified webhook + additive `stripe_customer_id`/`stripe_subscription_id` migration), mirroring `photo-storage.ts`.
- 2026-07-01 - Filed as the test-mode Stripe subscription integration for the €6.99 Plus launch decision (`docs/marketing/monetization-and-pricing-analysis.md` §0), unblocked by `CX-20260701-owner-decision-payments-processor-and-billing-gate` (Stripe chosen, test-mode build unblocked; go-live stays owner-gated). Build after `CX-20260701-plus-tier-entitlement-model-and-gating`. Fail-closed + flag mirror `apps/web/src/lib/photo-storage.ts`. Status `ready`.
