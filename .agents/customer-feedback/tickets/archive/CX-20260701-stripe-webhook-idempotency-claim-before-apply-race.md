# CX-20260701-stripe-webhook-idempotency-claim-before-apply-race

- Status: `verified`
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
- 2026-07-02 - Implemented (Builder). Fixed the claim-before-apply race by folding the idempotency claim and the entitlement write into ONE atomic SQL statement in `apps/web/src/lib/billing.ts`: a CTE `INSERT INTO billing_webhook_events (event_id) ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id`, then `UPDATE users ... WHERE id = <member> AND EXISTS (SELECT 1 FROM claim)`. A single Postgres statement is atomic, so claim + apply commit or roll back together — a failed apply leaves the event un-claimed (no poisoned marker) and Stripe's retry re-applies; a duplicate/concurrent delivery conflicts on the ledger PK, the claim CTE is empty, and the guarded UPDATE is a no-op (no double-apply). Exactly-once per event id. Unactionable events (no member resolves) are still recorded processed via a standalone idempotent INSERT so Stripe stops retrying. NO migration — reuses the existing `billing_webhook_events(event_id PRIMARY KEY)` ledger from migration 026 as the idempotency/concurrency guard. Signature verification and fail-closed 503 unchanged. Tests added in `billing.test.ts` prove: (a) duplicate delivery applies once (guarded ON CONFLICT + EXISTS(claim)); (b) apply-throws leaves the event un-claimed and a retry re-applies `plus_until`; (c) concurrent delivery uses the guarded atomic path. Checks: typecheck, lint, unit tests (503 pass), and prod build all green. Commit `7229c2d`, pushed to origin/main (no migration). Handing back for independent retest.
- 2026-07-02 - VERIFIED (Tester, independent, in an ISOLATED GIT WORKTREE at clean HEAD incl. 7229c2d — applying the session's concurrency lesson so a concurrent Builder's WIP could not contaminate the build). All 5 properties hold against the actual `billing.ts` code: (1) EXACTLY-ONCE — `applySubscriptionAndClaim` uses one CTE `INSERT ... billing_webhook_events ON CONFLICT (event_id) DO NOTHING RETURNING event_id` gating `UPDATE users ... WHERE id=$member AND EXISTS(SELECT 1 FROM claim)` in BOTH grant and clear branches (never unconditional); (2) FAILED-APPLY NO POISON — claim+apply are a single statement so a failing UPDATE rolls back the INSERT (test sets throwOnCallIndex=0, asserts one sql call + no recordOnly, and a retry re-applies plus_until); (3) CONCURRENT no-op — `billing_webhook_events(event_id PRIMARY KEY)` from migration 026 (confirmed line 45) serializes, loser's claim CTE empty → guarded UPDATE no-ops; (4) signature verify + fail-closed 503 UNCHANGED (stripe.ts constructEvent, BILLING_ENABLED+3-key gate, route 503/400/500 intact); (5) effect-free path records processed via standalone idempotent INSERT with no entitlement write. Checks the Tester ran itself in the worktree (after npm install): typecheck PASS, lint PASS (2 pre-existing warnings unrelated), test PASS (web 503/12 skipped, domain 165), prod `next build` PASS. Tests are genuine transactional-boundary assertions, not tautologies. No new migration (correctly reuses 026's PK). Orchestrator applied `verified` in the main tree and archived.
