-- Make the per-member photo position uniqueness DEFERRABLE so a reorder can move
-- several photos in one transaction without a transient collision
-- (CX-20260702-photo-reorder-500-check-constraint).
--
-- Background: reordering a member's photos permutes their `position` values. With
-- a NON-deferrable unique index on (user_id, position), Postgres checks
-- uniqueness row-by-row as each UPDATE lands, so mid-permutation two rows briefly
-- share a slot (e.g. the row moving INTO position 0 collides with the row still
-- sitting at 0) and the write 500s (Postgres 23505). The previous code tried to
-- dodge this by bumping every position by +6 first, but +6 violated the
-- CHECK (position < 6) (23514) — so any member with 2+ photos hit a 500 on reorder.
--
-- Fix: replace the plain unique INDEX with an equivalent DEFERRABLE INITIALLY
-- DEFERRED unique CONSTRAINT. The guarantee is unchanged — a member still never
-- has two photos in the same slot — but the check is now enforced at COMMIT
-- (end of the transaction) rather than per row, so an intermediate state during a
-- reorder is allowed as long as the final state is unique. The reorder runs its
-- position updates inside a single transaction so the deferred check applies.
--
-- This migration is ADDITIVE and backwards-compatible: it only relaxes WHEN the
-- (unchanged) uniqueness rule is checked. Old code that sets positions one slot at
-- a time still works, because at COMMIT the positions are unique either way.
-- (Only a UNIQUE constraint can be DEFERRABLE — a bare CREATE UNIQUE INDEX cannot
-- — so we drop the index and add the constraint, which itself creates a backing
-- unique index.)

ALTER TABLE profile_photos
  DROP CONSTRAINT IF EXISTS profile_photos_user_position_key;

DROP INDEX IF EXISTS profile_photos_user_position_unique;

ALTER TABLE profile_photos
  ADD CONSTRAINT profile_photos_user_position_key
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED;
