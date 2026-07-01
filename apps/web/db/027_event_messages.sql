-- Event-room chat for the host + accepted participants of an event
-- (CX-20260702-event-room-chat-for-accepted-participants).
--
-- Additive, backwards-compatible: a single new table. Old code that never reads
-- it keeps working, so a brief deploy-before-migrate window does not 500 any
-- existing page (the new table is only read by the new chat surface).
--
-- Data minimisation: we store ONLY the event, the sender, a short body, and the
-- created-at timestamp. No location, no contact details, no read receipts, no
-- edit history. The body length is capped in the DB (mirrors the domain cap) so
-- an oversized or empty message can never be persisted even if a caller bypasses
-- the app-level guard.
--
-- Hard deletion: both foreign keys cascade, so removing an event or a user hard
-- deletes their messages with them (account hard-deletion coverage). The
-- account soft-lock path additionally removes the member's own messages up front.
CREATE TABLE IF NOT EXISTS event_messages (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_messages_thread_idx ON event_messages(event_id, created_at);
CREATE INDEX IF NOT EXISTS event_messages_sender_idx ON event_messages(sender_user_id);
