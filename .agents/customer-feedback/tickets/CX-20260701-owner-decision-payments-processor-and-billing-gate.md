# CX-20260701-owner-decision-payments-processor-and-billing-gate

- Status: `blocked-owner` — **for GO-LIVE only.** Processor decided (**Stripe**); the TEST-mode, flag/env-gated BUILD is **unblocked** and filed as `ready` tickets. This ticket now tracks only the owner-only go-live actions (account KYC, LIVE keys, real Product/Price, legal entity + EU VAT/OSS, accept Stripe terms, flip the flag).
- Severity: `high`
- Priority: `P1` — gates any go-live of REAL billing; the go-live actions must not be actioned by an agent (spending money / accepting terms / handling payment data / creating accounts). The test-mode build is unblocked.
- Customer journey: (business/infrastructure — no member surface until go-live)
- Surface: `both` (eventual)
- Environment and viewport/device: n/a
- Found by: Product/growth strategist review (2026-07-01), analysis in `docs/marketing/monetization-and-pricing-analysis.md`
- Implementation owner: `owner` (go-live steps); the test-mode build is `unassigned` under the `ready` build tickets below.
- Related tickets: `CX-20260701-owner-decision-monetization-model-and-pricing` (verified — Plus €6.99/mo), `CX-20260701-plus-tier-entitlement-model-and-gating` (P1, ready — entitlement + gating), `CX-20260701-stripe-subscription-integration-test-mode` (P1, ready — the test-mode Stripe build this ticket unblocks), `CX-20260701-plus-billing-management-ui` (P2, ready), `CX-20260701-plus-perks-advanced-discovery-filters` (P2, ready), `CX-20260701-membership-tier-scaffolding-non-billing` (superseded/folded into the entitlement ticket). Go-live runbook: `docs/operations/monetization-go-live-runbook.md`.

## Decision needed

Select a payment processor and approve the go-live of billing, VAT handling, and the
EU-compliant subscription cancel/renewal experience. Per `AGENTS.md` / `references/escalation-policy.md`,
spending money, changing billing, accepting platform terms, and handling payment methods are
**owner-gated**. No billing exists and none may be switched on without this decision.

## Recommendation

- **Do not switch on billing until the free core loop is credible in the launch city** (see the
  phased rollout in `docs/marketing/monetization-and-pricing-analysis.md`, Phase 2).
- Build only the **EU-compliant cancel/renewal UX spec** and account scaffolding in the meantime;
  do not integrate a live processor or store payment data until approved.
- Require **one-tap cancel (as easy as subscribe)**, honest renewal reminders, VAT-inclusive EUR
  pricing, and **no dynamic/personalised pricing** — aligning early with the EU Digital Fairness
  Act (expected ~Q4 2026) and current UCPD guidance.
- Keep payment data outside the safety/moderation data boundary and minimise what is stored.

## Two meaningful alternatives

- **A) Native app-store billing (Apple/Google).** Simpler compliance surface but ~15-30% platform
  cut and less control over the cancel UX; note web-first is our primary discovery surface.
- **B) Direct processor (e.g. Stripe) for web + app-store for native.** More control and lower fees
  on web; more integration and VAT/SCA responsibility. (Owner to choose; agent will not create
  accounts or accept terms.)

## Consequence of delay

Plus cannot be charged. This is acceptable and intended until the free loop is proven; it does not
block any free feature work.

## Exact action requested

1. Approve (or defer) building the billing scaffolding + EU-compliant cancel/renewal UX spec (no
   live processor).
2. When ready, select the processor and authorize account creation / terms acceptance (owner
   action — agents will not do this).
3. Confirm counsel review of subscription terms is required before go-live (existing launch gate).

## Acceptance criteria

- [x] Owner records processor choice. (**Stripe**, 2026-07-01 — see log.)
- [ ] EU-compliant cancel/renewal requirements confirmed as binding. (Confirmed binding: cancel as easy as subscribe via Stripe Billing Portal; VAT-inclusive EUR; no dynamic pricing. Enforced by the `plus-billing-management-ui` ticket.)
- [ ] Counsel-review-before-go-live confirmed; decision logged in `docs/operations/decision-log.md`.
- [ ] **GO-LIVE gate (owner-only).** Before `BILLING_ENABLED` is ever set true in production: Stripe account created + KYC-verified; LIVE keys + webhook secret added to Vercel env; real €6.99 Product/Price (+ configurable annual) created in Stripe; legal entity/sole-trader + business bank registered; EU VAT/OSS registered for digital subscriptions; Stripe terms accepted; test checkout verified end-to-end first. Ordered steps: `docs/operations/monetization-go-live-runbook.md`.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist with recommendation; status `blocked-owner` (awaiting owner decision and credentials).
- 2026-07-01 - **Owner direction recorded (status intentionally kept `blocked-owner`).** Processor direction = **Stripe** (per alternative B: direct processor for web; app-store billing for native later). This records the chosen *direction* for **design only**. Go-live is NOT unblocked: it still requires owner-provided actions the escalation policy reserves — creating the Stripe account, providing live/test keys, accepting Stripe's platform terms, and signing off real pricing. **No agent may** create the account, add keys, accept terms, or switch on charging. Only **non-secret integration DESIGN** may proceed (EU-compliant cancel/renewal UX spec, VAT handling design, data-boundary design, a keyless integration sketch that reads any future credential from the environment). No live billing until credentials + explicit owner go-live approval + counsel review of subscription terms. Status remains `blocked-owner`.
- 2026-07-01 - **Processor CHOSEN = Stripe; the TEST-mode BUILD is UNBLOCKED; go-live stays `blocked-owner`.** Owner confirmed **Stripe** as the processor and directed that the billing integration be **BUILT NOW in TEST mode behind a `BILLING_ENABLED` flag** with env-gated keys — **no real charges, no live keys, no accepting terms, no spending** until go-live. What is now unblocked (filed as `ready`, no owner secret required): the **entitlement/gating model** (`CX-20260701-plus-tier-entitlement-model-and-gating`) and the **test-mode Stripe integration** (`CX-20260701-stripe-subscription-integration-test-mode`) — a `stripe` dependency, an env-gated Stripe module that reads `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` and **fails closed** (Plus unavailable, calm "coming soon") when unset, a Checkout Session route (subscription mode, €6.99 price id) and a signature-verified webhook that sets/clears Plus, all behind `BILLING_ENABLED`, unit-tested with Stripe mocked — plus the honest billing-management UI (`CX-20260701-plus-billing-management-ui`) and the first perk (`CX-20260701-plus-perks-advanced-discovery-filters`). This mirrors the fail-closed env-gated pattern in `apps/web/src/lib/photo-storage.ts`. What stays **`blocked-owner` (go-live only, owner actions the escalation policy reserves — NO agent may do these):** create + KYC-verify the Stripe account; add TEST then **LIVE** keys + webhook secret to Vercel env; create the real **€6.99** Stripe Product/Price (+ configurable annual); **register a legal entity / sole-trader + business bank**; **EU VAT/OSS registration** for digital subscriptions; **accept Stripe's terms**; counsel review of subscription terms; and finally **flip `BILLING_ENABLED`**. Exact ordered steps: `docs/operations/monetization-go-live-runbook.md`. Status remains `blocked-owner` for these go-live actions only.
