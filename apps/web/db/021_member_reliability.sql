-- Member-side reliability state for repeated LATE cancellations
-- (CX-20260701-repeated-cancellation-no-fair-reliability-rule).
--
-- Fair, transparent, private, recoverable. We track only the member's OWN
-- consecutive late cancellations of an ACCEPTED place (a real seat a host planned
-- around). This is NOT the host-side skip_count on join_requests, and safety-path
-- exits (report/block/"I felt unsafe") never touch these columns — the application
-- layer (packages/domain reliability.ts, unit-tested) decides what counts.
--
-- The only consequence is a short, self-lifting cool-down on requesting NEW places,
-- expressed as reliability_paused_until. It never blocks leaving, reporting,
-- blocking, safety features, profile editing, or attending already-accepted events.
--
-- These columns are private: they are never selected into any host- or peer-facing
-- query and never exposed on the profile. Defaults keep every existing member on a
-- clean, unpaused standing with no backfill.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS late_cancellation_streak INTEGER NOT NULL DEFAULT 0
    CHECK (late_cancellation_streak >= 0),
  ADD COLUMN IF NOT EXISTS late_cancellation_streak_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reliability_paused_until TIMESTAMPTZ;
