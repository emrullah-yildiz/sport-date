-- Automated image-safety moderation status for profile photos
-- (CX-20260704-feature-image-moderation-nudity-block).
--
-- Additive, fail-safe. Every new photo runs through the pluggable image-safety
-- seam (lib/image-moderation.ts) on upload:
--   - explicit/nude  → REJECTED at upload; never stored (no row here).
--   - clean          → 'approved' (visible to others).
--   - uncertain OR no provider configured → 'pending': stored but shown ONLY to
--     its owner and routed to the existing moderation queue for human review.
--     We NEVER auto-approve an unverifiable image, so we can never fail open to
--     explicit content.
--
-- The DEFAULT is 'pending' so any insert that forgets to classify fails toward
-- caution. Existing rows predate screening and were already public, so they are
-- backfilled to 'approved' (grandfathered; still reportable + moderatable).
ALTER TABLE profile_photos
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('approved', 'pending', 'rejected'));

-- All rows that exist at migration time predate screening → grandfather to approved.
UPDATE profile_photos SET moderation_status = 'approved';

-- Cross-member reads filter to approved photos; the owner sees all of their own.
CREATE INDEX IF NOT EXISTS profile_photos_user_moderation_idx
  ON profile_photos (user_id, moderation_status);
