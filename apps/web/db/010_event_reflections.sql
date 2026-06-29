CREATE TABLE IF NOT EXISTS event_reflections (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance TEXT NOT NULL CHECK (attendance IN ('attended', 'left_early', 'did_not_attend')),
  would_join_again TEXT NOT NULL CHECK (would_join_again IN ('yes', 'no', 'prefer_not_to_say')),
  qualified_for_progress BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_reflections_user_progress_idx
  ON event_reflections(user_id, attendance, created_at);
