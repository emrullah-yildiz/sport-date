ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (length(email) <= 254),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NOT NULL,
  send_count INTEGER NOT NULL CHECK (send_count >= 1),
  invalidated_reason TEXT
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx
  ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_at_idx
  ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS email_verification_tokens_active_user_idx
  ON email_verification_tokens(user_id)
  WHERE consumed_at IS NULL AND invalidated_reason IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NOT NULL,
  send_count INTEGER NOT NULL CHECK (send_count >= 1),
  invalidated_reason TEXT,
  requested_ip_hash CHAR(64)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS password_reset_tokens_active_user_idx
  ON password_reset_tokens(user_id)
  WHERE consumed_at IS NULL AND invalidated_reason IS NULL;
