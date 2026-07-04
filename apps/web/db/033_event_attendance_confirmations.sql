-- T-2h attendance confirm/cancel loop for accepted attendees
-- (CX-20260704-feature-event-attendance-confirmation).
--
-- Additive, backwards-compatible: one new table. Old code that never reads it
-- keeps working, so a deploy-before-migrate window does not 500 existing pages.
--
-- One row per (event, accepted member). The scheduled reminder job creates a
-- `pending` row (+ a signed token) ~2h before start; the member then confirms
-- or cancels via a tokenized email link or the in-app prompt. `UNIQUE
-- (event_id, member_id)` makes the sweep idempotent — a re-run can never create
-- a second reminder for the same membership. Only the token HASH is stored,
-- never the raw token, so a DB read can't reconstruct a working link.
--
-- Cascades: both foreign keys ON DELETE CASCADE, so deleting an event or a user
-- removes their confirmation rows too (hard-deletion coverage).
CREATE TABLE IF NOT EXISTS event_attendance_confirmations (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  -- SHA-256 hex of the raw single-purpose token. Never the raw value.
  token_hash TEXT NOT NULL,
  reminded_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS event_attendance_confirmations_token_idx ON event_attendance_confirmations(token_hash);
CREATE INDEX IF NOT EXISTS event_attendance_confirmations_event_idx ON event_attendance_confirmations(event_id);
