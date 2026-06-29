CREATE TABLE IF NOT EXISTS event_update_notices (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_fields TEXT[] NOT NULL CHECK (cardinality(changed_fields) BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_update_notices_event_id_created_at_idx
  ON event_update_notices(event_id, created_at DESC);
