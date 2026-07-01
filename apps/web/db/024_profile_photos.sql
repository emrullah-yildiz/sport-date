-- Member profile photo series, up to six per member
-- (CX-20260701-profile-photo-series-up-to-six).
--
-- Photos are stored in a PRIVATE Vercel Blob store; this table holds only the
-- non-guessable blob pathname + a short-lived nothing-else pointer, the member's
-- chosen ordering, which one is primary, and optional alt text. The bytes are
-- NEVER public: they are served through an authenticated app route, never a
-- directly-guessable public URL. EXIF/metadata is stripped on upload in the
-- application layer before the bytes ever reach the store (no precise-location
-- leak).
--
-- Limit: at most 6 photos per member. Postgres CHECK constraints cannot count
-- sibling rows, so the max-6 ceiling is enforced in the domain/lib layer
-- (validateProfilePhotoUpload + an INSERT guarded by a COUNT, both unit-tested),
-- mirroring how the personality-prompts cap (migration 020) lives in the app
-- layer. The DB still guarantees: FK cascade on user hard-deletion, at most one
-- primary per member, a stable per-member ordering, and bounded column shapes.
--
-- Cascade: ON DELETE CASCADE means a user hard-deletion removes every photo row.
-- The corresponding blobs are deleted by the application deletion path before the
-- row cascade (best-effort), so no orphaned bytes remain in the private store.

CREATE TABLE IF NOT EXISTS profile_photos (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blob_pathname TEXT NOT NULL CHECK (length(blob_pathname) BETWEEN 1 AND 512),
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 20971520),
  alt TEXT NOT NULL DEFAULT '' CHECK (length(alt) <= 120),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0 AND position < 6),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_photos_user_id_position_idx
  ON profile_photos (user_id, position);

-- At most one primary photo per member. A partial unique index enforces this at
-- the database level regardless of application bugs.
CREATE UNIQUE INDEX IF NOT EXISTS profile_photos_one_primary_per_user
  ON profile_photos (user_id) WHERE is_primary;

-- A member never has two photos in the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS profile_photos_user_position_unique
  ON profile_photos (user_id, position);

-- The blob pathname is unique across the store so a serve route can resolve a
-- pathname to exactly one owner and reject cross-member access.
CREATE UNIQUE INDEX IF NOT EXISTS profile_photos_blob_pathname_unique
  ON profile_photos (blob_pathname);
