-- Two-way tracked feedback: member-visible status lifecycle + reply thread
-- (CX-20260704-feature-member-feedback-tracking-threads).
--
-- Additive and backwards-compatible. Builds on feedback_tickets (012). Product
-- feedback ONLY — safety reports stay on their separate moderation path and are
-- never merged here.

-- 1) Honest, member-visible status lifecycle. The old CHECK allowed
--    open/in_progress/resolved/closed; we widen it to the richer lifecycle and
--    backfill the legacy values so no member ever sees a stale "open"/"closed".
--    The old values are kept ALLOWED so a previous-deploy insert during the
--    deploy→migrate window can never violate the constraint (defence in depth;
--    the DEFAULT also moves to 'received' so unspecified inserts are honest).
ALTER TABLE feedback_tickets ALTER COLUMN status SET DEFAULT 'received';
ALTER TABLE feedback_tickets DROP CONSTRAINT IF EXISTS feedback_tickets_status_check;
UPDATE feedback_tickets SET status = 'received' WHERE status = 'open';
UPDATE feedback_tickets SET status = 'closed_not_planned' WHERE status = 'closed';
ALTER TABLE feedback_tickets ADD CONSTRAINT feedback_tickets_status_check
  CHECK (status IN (
    'received', 'in_review', 'planned', 'in_progress', 'resolved', 'closed_not_planned',
    'open', 'closed'
  ));

-- 2) Activity + unread tracking. `last_activity_at` bumps on any thread activity
--    (member or team); `last_team_activity_at` bumps ONLY on a team reply or a
--    status change, so a member's own reply never marks their own ticket as an
--    "update from the team"; `member_last_seen_at` records when the submitter
--    last opened the thread. Unread = last_team_activity_at > member_last_seen_at.
ALTER TABLE feedback_tickets ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE feedback_tickets ADD COLUMN IF NOT EXISTS last_team_activity_at TIMESTAMPTZ;
ALTER TABLE feedback_tickets ADD COLUMN IF NOT EXISTS member_last_seen_at TIMESTAMPTZ;

-- 3) The reply thread. One row per message. `author_kind` distinguishes the
--    submitter ('member') from a team/AI reply ('team'); `author_id` is the
--    acting user when there is one (nullable — an AI/agent team reply may have
--    none, and ON DELETE SET NULL keeps the thread intact if a team member's
--    account is later removed). Member-visible body only — NO internal-only
--    notes are ever stored here.
CREATE TABLE IF NOT EXISTS feedback_ticket_comments (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES feedback_tickets(id) ON DELETE CASCADE,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('member', 'team')),
  author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_ticket_comments_thread_idx
  ON feedback_ticket_comments(ticket_id, created_at);
