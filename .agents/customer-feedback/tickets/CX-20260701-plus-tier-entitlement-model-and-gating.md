# CX-20260701-plus-tier-entitlement-model-and-gating

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 4) / Effort 3 = 26.7. Foundation every other Plus ticket depends on; nothing else can be gated honestly until this exists. Build first in the monetization sequence.
- Customer journey: (foundation — spans profile, discovery, and future Plus surfaces; no charging surface here)
- Surface: `web` (mobile parity where surfaced)
- Environment and viewport/device: all widths
- Found by: Owner launch decision (2026-07-01) — freemium + Plus €6.99/mo; `docs/marketing/monetization-and-pricing-analysis.md` §0
- Implementation owner: `experience-build-agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-owner-decision-monetization-model-and-pricing` (verified — the approved model this implements), `CX-20260701-owner-decision-payments-processor-and-billing-gate` (blocked-owner — go-live only; this ticket must NOT integrate a live processor or charge), `CX-20260701-stripe-subscription-integration-test-mode` (P1 — the Stripe webhook is what actually sets/clears the entitlement this ticket defines; sequence: build this first, then Stripe), `CX-20260701-plus-billing-management-ui` (P2), `CX-20260701-plus-perks-advanced-discovery-filters` (P2 — first consumer of the gating helper), `CX-20260701-membership-tier-scaffolding-non-billing` (**superseded / folded into this ticket** — see Duplicate check)

## Customer outcome

As a free member, I want everything I need to find, request, attend safely, and reflect on an event to work fully and forever without paying, so that I never feel safety or basic participation is behind a wall — while the product can honestly recognise a "Sport Date Plus" member for convenience/richness perks later, defaulting everyone to free and never pretending I am subscribed when I am not.

## What I observed

There is no concept of a membership tier or entitlement anywhere in the product (grep for `tier`/`plus`/`entitlement`/`isPlus` returns nothing in the data model or server code). The owner has decided (2026-07-01) an **ethical-freemium** model with **Sport Date Plus at €6.99/mo** (convenience/richness only), to be built now in Stripe **test mode behind a `BILLING_ENABLED` flag**. Before any Plus perk or the Stripe webhook can exist, the product needs one honest, fail-closed place that answers "is this member Plus?" and gates only convenience capabilities — never safety, never core participation.

## What I expected (scope — ENTITLEMENT + GATING ONLY, no billing)

Build the non-billing entitlement foundation the whole Plus line stands on:

1. **A Plus/free entitlement concept in the data model.** A simple per-member entitlement (e.g. `plus` boolean or a `membership_tier` of `free | plus`, plus an optional `plus_until` expiry timestamp so a lapsed subscription cleanly returns to free), defaulting **every existing and new member to free**. Additive migration only. **No billing/subscription/price/payment tables in this ticket** — the entitlement is the *state*, not the payment record. If the Stripe ticket needs a small `plus_since`/`stripe_customer_id`/`stripe_subscription_id` linkage, that is added by the Stripe ticket (kept outside the safety/moderation data boundary), not here.
2. **A fail-closed, server-side `isPlus(user)` / capability helper.** One module (e.g. `apps/web/src/lib/entitlements.ts`) exporting `isPlus(user): boolean` and a capability check `canUse(user, capability)` that ALL Plus-gated conveniences call **on the server**. It must **fail closed** — default to free / least-privilege — when the tier is unknown, missing, `null`, or the `plus_until` has expired. It is the single source of truth for tier logic so no feature re-implements gating. Mirror the "one isolated, tested seam" discipline of `photo-storage.ts` and `session.ts`.
3. **Safety + core participation are NEVER routed through the gate.** The helper must not be wired to any safety capability (report, block, leave, emergency guidance, approximate-location privacy, Safety Center, moderation, appeals) or core participation (discover/browse, request a place, cancel, attend, host baseline, message, sign out, basic profile, reflection, up to 6 photos — capped at 6 for **everyone**). A regression guard asserts these are never behind the Plus gate.
4. **Wire `SessionUser` (or the server user shape) to carry the tier**, resolved server-side in `getCurrentUser()` (or an adjacent read), so surfaces can call `isPlus(user)` without a new query per check. Default free if the column/value is absent (fail closed).
5. **No charging, no price, no "you are subscribed" claim.** Any placeholder affordance that references Plus must be honest (describe the convenience, note it is a Plus perk) and must NOT show a final charge action or imply the member is subscribed. The actual upgrade/checkout surface is a separate ticket and is hidden unless `BILLING_ENABLED` + keys are present.

Explicitly **out of scope:** the Stripe integration, Checkout, webhooks, the upgrade UI, and any real perk — those are the sibling tickets. This ticket delivers only the entitlement state + the gating helper + tests + the safety/core regression guard.

## Reproduction

1. Search the data model and server code for any membership-tier or `isPlus` capability check. There is none.

Reproduction rate: `confirmed; feature absent (2026-07-01)`

## Customer impact

Without a single fail-closed entitlement seam, later Plus work risks scattered ad-hoc checks, a capability leaking to free members by omission, or — worst — safety/core participation drifting behind a wall. Built right, free members keep a fully usable, fully safe product forever and Plus is a clean, honest, well-contained addition.

## Duplicate check

- Search terms used: `tier`, `plus`, `entitlement`, `membership`, `isPlus`, `canUse`, `subscription`, `capability`, `gate`.
- Tickets reviewed: full `CX-20260701-*` queue. `CX-20260701-membership-tier-scaffolding-non-billing` (P2, `ready`) proposed the same non-billing tier + gating helper.
- Why this is new / de-dup decision: this ticket **supersedes and folds in** `membership-tier-scaffolding-non-billing`. That ticket predates the €6.99 launch decision and the build-now-in-test-mode direction; this one carries the finalized guardrails, the fail-closed `isPlus(user)` contract, the `SessionUser` wiring, and the explicit sequence into the Stripe/perk tickets. The scaffolding ticket is marked superseded and should not be picked up independently.

## Acceptance criteria

- [ ] The **free tier is fully usable**, including **all safety features and all core participation**; nothing a free member needs is gated. Safety = report, block, leave, emergency guidance, approximate-location privacy, Safety Center, moderation, appeals. Core = discover, request, cancel, attend, host baseline, message, sign out, basic profile, reflection, up to 6 photos (photos capped at 6 **for everyone**, no per-tier photo advantage).
- [ ] A per-member entitlement exists in the data model, **defaulting all members to free** (additive migration only); no billing/subscription/payment/price tables added by this ticket.
- [ ] A single server-side `isPlus(user)` / `canUse(user, capability)` helper is the **one place** Plus checks live, and **fails closed** (defaults to free / least-privilege) on unknown/missing/`null`/expired tier.
- [ ] The helper is covered by tests: free denied Plus-only conveniences; Plus allowed; **safety/core capabilities are never routed through the gate**; fail-closed on unknown/missing/expired tier; expired `plus_until` resolves to free.
- [ ] A **regression guard** asserts safety + core-participation capabilities are not behind the Plus gate (so a future change that gates one fails the suite).
- [ ] `SessionUser` (or the server user shape) carries the tier, resolved server-side, defaulting free when absent.
- [ ] **No charging, no processor, no secret, no price, and no "you are subscribed" claim** is added anywhere. If any Plus affordance placeholder is shown, it is honest (describes the convenience, notes it is a Plus perk) with no charge/subscribe action.
- [ ] **Forbidden-perks guardrail honored:** the gate is only ever wired to allowed convenience/richness capabilities; it is never wired to paid boosts/likes/priority visibility, paid access to people, "see who rated/skipped/viewed you", unlimited/per-tier photos, or any attractiveness/popularity mechanic.
- [ ] **Cancel-easy note:** entitlement clears cleanly to free on expiry/cancellation (the actual cancel path lives in the Stripe + billing-UI tickets); a lapsed member is never left in a broken half-Plus state.
- [ ] Relevant automated tests and repository checks pass (`npm run typecheck`, `npm run lint`, web + domain test suites).

## Handoff and retest log

- 2026-07-01 - Filed as the entitlement + gating foundation for the owner-approved €6.99 freemium launch (`docs/marketing/monetization-and-pricing-analysis.md` §0). Supersedes/folds in `CX-20260701-membership-tier-scaffolding-non-billing`. Build first in the monetization sequence; the Stripe webhook (`CX-20260701-stripe-subscription-integration-test-mode`) is what sets/clears the entitlement this ticket defines. Status `ready`.
- 2026-07-01 - build (Claude Opus 4.8): implemented. Migration 025 adds nullable `users.plus_until TIMESTAMPTZ` (NULL = FREE, no backfill; every member defaults free). Pure fail-closed gating in `packages/domain/src/entitlements.ts` (`isPlus` / `canUsePlusCapability` / `memberEntitlements`; Plus only while `plus_until > now`; null/missing/malformed/expired → FREE). Server seam `apps/web/src/lib/entitlements.ts` adapts `SessionUser` (fail-closed on null user). `SessionUser` now carries `plusUntil`, resolved server-side in `getCurrentUser` and `getMobileSession`. HARD GUARDRAIL enforced by type + tests: safety/core capabilities are a separate always-free set the gate cannot touch; a regression guard asserts disjointness and that no forbidden perk is gate-able. No billing/price/charge/"subscribed" claim added; no real perk paywalled. Checks: typecheck ✓, lint ✓ (sole warning is the pre-existing untouched `qa/full-flows.mjs`), web tests 334 passed / domain 145 passed, migration applied + idempotent on DEV, prod build ✓, pooled free member logs in and /profile /discover /hosting /safety all 200; DB confirms 0/108 members Plus. **MIGRATION ADDED — committed, NOT pushed; awaiting orchestrator push + prod migrate.** Commit `ddf858b`. Status `implemented` for independent retest.
