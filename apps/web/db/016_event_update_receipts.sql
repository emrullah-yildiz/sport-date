CREATE TABLE IF NOT EXISTS event_update_notice_receipts (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES event_update_notices(id) ON DELETE CASCADE,
  viewer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notice_id, viewer_user_id)
);

CREATE INDEX IF NOT EXISTS event_update_notice_receipts_notice_id_idx
  ON event_update_notice_receipts(notice_id);
