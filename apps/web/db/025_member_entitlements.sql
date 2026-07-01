-- Membership entitlement state: the single, additive column that marks a member
-- as "Sport Date Plus" until a moment in time
-- (CX-20260701-plus-tier-entitlement-model-and-gating).
--
-- Product stance (owner launch decision 2026-07-01, ethical freemium + Plus
-- €6.99/mo): the FREE tier is fully usable forever, including EVERY safety
-- feature and ALL core participation. Plus is convenience/richness only. This
-- migration adds ONLY the entitlement *state*, never a billing/subscription/
-- price/payment record (those, plus any stripe_customer_id linkage, are owned by
-- the separate Stripe ticket and kept outside the safety/moderation boundary).
--
-- Design:
--   * A single nullable `plus_until TIMESTAMPTZ`. NULL (the default and the value
--     for every existing member) means FREE — no backfill needed. A member is
--     Plus only while `plus_until > now`; a lapsed subscription cleanly returns
--     to free the instant it expires, with no half-Plus state to clean up.
--   * A future Stripe webhook SETS this (subscription active/renewed) and CLEARS
--     it to NULL / a past instant (cancelled/expired). No code in THIS ticket
--     ever writes a non-NULL value — everyone stays free until billing exists.
--
-- Fail-closed by construction: the entitlement helper treats missing/NULL/past
-- as FREE, so a member is never accidentally granted Plus. Because the column is
-- nullable with no default other than NULL, old code that never selects it keeps
-- working (backwards-compatible, additive — safe even if a deploy briefly
-- precedes this migration).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plus_until TIMESTAMPTZ;
