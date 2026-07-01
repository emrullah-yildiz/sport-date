# CX-20260701-stripe-webhook-idempotency-claim-before-apply-race

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 3 × Impact 4 × Confidence 4) / Effort 2 = 24. Test-mode only today (billing is dark), but it is a correctness bug on the money/entitlement path — **must be fixed before go-live** or a member could pay and not receive Plus.
- Customer journey: billing / entitlement
- Surface: `web` (billing webhook)
- Environment and viewport/device: n/a (server webhook)
- Found by: Tester (four-agent loop, verifying the Stripe integration) 2026-07-01
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-stripe-subscription-integration-test-mode` (verified), `docs/operations/monetization-go-live-runbook.md`

## Customer outcome

As a member who subscribes to Plus, I want my payment to reliably grant Plus, so I am never charged (once live) without receiving what I paid for.

## What I observed

In `apps/web/src/lib/billing.ts`, `claimEvent` inserts the idempotency-ledger row **before** `applySubscription` runs. If the entitlement UPDATE then throws, the route returns 500 to trigger a Stripe retry — but the event id is already claimed, so the retry is treated as a duplicate no-op, and that entitlement write can be permanently dropped. The member's subscription would be active in Stripe but `plus_until` never set.

## What I expected

The idempotency claim and the entitlement change must be atomic: either both happen or neither. A failed entitlement write must leave the event un-claimed so Stripe's retry actually re-applies it.

## Reproduction

1. (Conceptual / unit) Deliver a valid `customer.subscription.created` webhook; force `applySubscription` to throw after `claimEvent` has recorded the event.
2. Stripe retries the same event id → it is seen as already-claimed → skipped → `plus_until` never set.

Reproduction rate: `logic-confirmed by the Tester; test-mode only until go-live`

## Customer impact

Once billing is live, a paid member could fail to receive Plus with no automatic recovery. Erodes trust and creates support/refund burden. Not a charge-safety issue (no double charge), but an entitlement-delivery reliability issue.

## Acceptance criteria

- [ ] The webhook records the idempotency-ledger row and applies the entitlement change atomically (single DB transaction), OR only records the ledger row **after** the entitlement change succeeds — so a failed apply leaves the event un-claimed and the Stripe retry re-applies it.
- [ ] A unit test proves: apply throws → event NOT marked processed → a retry of the same event succeeds and sets `plus_until`.
- [ ] Genuine duplicate deliveries (apply already succeeded) remain idempotent no-ops.
- [ ] No change to the fail-closed / no-charge guarantees; safety/core still never gated.
- [ ] Repository checks pass (incl. production build). Fix must land before go-live (`BILLING_ENABLED`).

## Handoff and retest log

- 2026-07-01 - Filed by the Tester during verification of the Stripe integration; status `ready`.
