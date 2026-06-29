CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requester_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  skip_count INTEGER NOT NULL DEFAULT 0 CHECK (skip_count BETWEEN 0 AND 3),
  introduction TEXT NOT NULL DEFAULT '' CHECK (length(introduction) <= 500),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_skipped_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, requester_user_id)
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 20),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id),
  UNIQUE (event_id, seat_number)
);

CREATE INDEX IF NOT EXISTS join_requests_host_queue_idx ON join_requests(event_id, status, requested_at);
CREATE INDEX IF NOT EXISTS join_requests_requester_idx ON join_requests(requester_user_id, status);
CREATE INDEX IF NOT EXISTS event_participants_user_idx ON event_participants(user_id);

