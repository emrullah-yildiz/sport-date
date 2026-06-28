ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'deletion_pending', 'restricted')),
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access_export', 'deletion', 'restriction', 'rectification')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS data_requests_user_id_idx ON data_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_deletion_per_user_idx
  ON data_requests(user_id)
  WHERE request_type = 'deletion' AND status IN ('pending', 'processing');

