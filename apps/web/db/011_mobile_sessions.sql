CREATE TABLE IF NOT EXISTS mobile_sessions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id_hash CHAR(64) NOT NULL,
  device_name TEXT NOT NULL CHECK (length(device_name) BETWEEN 2 AND 80),
  access_token_hash CHAR(64) NOT NULL UNIQUE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK (access_expires_at < refresh_expires_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS mobile_sessions_active_device_idx
  ON mobile_sessions(user_id, device_id_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS mobile_sessions_access_lookup_idx
  ON mobile_sessions(access_token_hash, access_expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS mobile_sessions_refresh_expiry_idx
  ON mobile_sessions(refresh_expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS mobile_refresh_token_history (
  refresh_token_hash CHAR(64) PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES mobile_sessions(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mobile_refresh_history_expiry_idx
  ON mobile_refresh_token_history(expires_at);

