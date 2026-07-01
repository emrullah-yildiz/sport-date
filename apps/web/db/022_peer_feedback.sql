-- Private post-attendance peer signal — the SAFE MINIMUM
-- (CX-20260701-post-attendance-peer-signal-safe-minimum).
--
-- One member privately confirms a small fixed set of reliability & respect signals
-- about ANOTHER member they ACTUALLY co-attended the same event with. This is NOT a
-- rating: there is deliberately NO numeric/star column, NO attractiveness /
-- desirability / popularity dimension, and NO public or profile-facing surface. The
-- raw per-person rows here feed internal trust & safety only. Whether any of this is
-- ever aggregated or shown — and to whom — is an OWNER decision tracked separately
-- (CX-20260701-owner-decision-peer-rating-visibility-and-dimensions); this slice
-- exposes nothing.
--
-- Shared-attendance eligibility, block-awareness, and the edit window are enforced
-- in the application layer (packages/domain peer-feedback.ts + lib/peer-feedback.ts,
-- unit-tested). The table enforces the hard invariants: event-scoped, one row per
-- (event, from, to) pair, no self-feedback, and only the three fixed confirmation
-- dimensions.

CREATE TABLE IF NOT EXISTS peer_feedback (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  showed_up TEXT NOT NULL CHECK (showed_up IN ('yes', 'no', 'prefer_not_to_say')),
  felt_respected TEXT NOT NULL CHECK (felt_respected IN ('yes', 'no', 'prefer_not_to_say')),
  felt_safe TEXT NOT NULL CHECK (felt_safe IN ('yes', 'no', 'prefer_not_to_say')),
  -- Optional private note routed to trust & safety only; never shown to the recipient.
  note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 1000),
  -- Internal-only marker that this submission surfaced a safety/respect concern, so
  -- moderation can corroborate a report. Never surfaced to the recipient.
  flagged_safety_concern BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One signal per giver per co-attended person per event; a member can revise their
  -- own within the app-enforced edit window, then it locks.
  UNIQUE (event_id, from_user_id, to_user_id),
  -- A member can never leave feedback about themselves.
  CHECK (from_user_id <> to_user_id)
);

-- Index for the recipient-facing internal trust/safety lookups (moderation only).
CREATE INDEX IF NOT EXISTS peer_feedback_to_user_idx ON peer_feedback(to_user_id, created_at);
