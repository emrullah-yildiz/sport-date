-- Stripe billing linkage (test-mode subscription integration)
-- (CX-20260701-stripe-subscription-integration-test-mode).
--
-- ADDITIVE and backwards-compatible: two nullable columns on `users` map a member
-- to their Stripe customer/subscription, plus a small idempotency ledger so a
-- webhook re-delivery is a no-op. This migration adds ONLY the linkage needed to
-- set/clear the existing `plus_until` entitlement (migration 025) from verified
-- Stripe events. It stores NO card / PAN / payment data — Stripe holds all
-- sensitive payment data. It sits OUTSIDE the safety/moderation data boundary.
--
-- DEPLOY-ORDERING HAZARD (see CX-20260701-no-automatic-production-migration-on-deploy
-- and .agents/experience-build-agent.md "Release & schema safety"): this migration
-- MUST be applied to production BEFORE the webhook/checkout code that reads or
-- writes these columns serves. Because every column is nullable with no non-NULL
-- default and old code never selects them, a deploy that briefly precedes the
-- migration is still safe: the billing path fails closed (BILLING_ENABLED off /
-- keys absent by default), so nothing reads these columns until the owner flips
-- the flag at go-live. No backfill is required.
--
--   * users.stripe_customer_id     — the member's Stripe Customer id (cus_…), set
--                                     the first time they start Checkout; reused
--                                     on renewal/cancel so the customer↔member map
--                                     is stable. UNIQUE so one customer maps to at
--                                     most one member.
--   * users.stripe_subscription_id — the current subscription id (sub_…) the
--                                     webhook last acted on; lets a `deleted` event
--                                     cleanly clear the right member.
--   * billing_webhook_events        — append-only idempotency ledger keyed by the
--                                     Stripe event id, so a repeated delivery of
--                                     the same event is ignored (exactly-once
--                                     entitlement changes).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- One Stripe customer maps to at most one member. Partial index so the many NULLs
-- (every free member) do not collide.
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_unique
  ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Idempotency ledger: a Stripe event id we have already processed. Inserting the
-- same id twice conflicts, so a re-delivered webhook is a safe no-op.
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
