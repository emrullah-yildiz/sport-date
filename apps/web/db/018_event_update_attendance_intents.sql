CREATE TABLE IF NOT EXISTS event_update_attendance_intents (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES event_update_notices(id) ON DELETE CASCADE,
  participant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('still_in', 'unsure', 'cannot_make')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notice_id, participant_user_id)
);

CREATE INDEX IF NOT EXISTS event_update_attendance_intents_notice_id_idx
  ON event_update_attendance_intents(notice_id);
