CREATE TABLE IF NOT EXISTS communication_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  product_updates_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  product_updates_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  product_updates_source TEXT NOT NULL DEFAULT 'member_default'
    CHECK (product_updates_source IN ('member_default', 'member_profile', 'operator_import'))
);

CREATE TABLE IF NOT EXISTS communication_preference_events (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL CHECK (preference_key IN ('product_updates')),
  previous_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('member_default', 'member_profile', 'operator_import')),
  lawful_basis_note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS communication_preference_events_user_id_idx
  ON communication_preference_events(user_id, created_at DESC);

INSERT INTO communication_preferences (user_id, product_updates_opt_in, product_updates_source)
SELECT id, FALSE, 'member_default'
FROM users
ON CONFLICT (user_id) DO NOTHING;
