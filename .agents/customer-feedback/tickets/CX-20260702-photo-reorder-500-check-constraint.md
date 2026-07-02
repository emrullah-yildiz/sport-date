# CX-20260702-photo-reorder-500-check-constraint

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — a shipped feature (photo reorder) 500s for any member with 2+ photos, now that storage is live. Found only after the Blob store was connected (the live path never ran before).
- Customer journey: profile / photos
- Surface: `web`
- Environment and viewport/device: all widths
- Found by: Tester (four-agent loop, live photo-upload verification) 2026-07-02
- Implementation owner: `Builder (experience-build-agent)`
- Related tickets: `CX-20260701-profile-photo-series-up-to-six` (verified — upload/primary/delete work; reorder is the broken sub-path)

## What happens

`PATCH /api/account/photos/order` returns **500**. `reorderProfilePhotos` (`apps/web/src/lib/photos.ts:156`) does a phase-1 `SET position = position + MAX_PROFILE_PHOTOS` (+6) to dodge the `UNIQUE(user_id, position)` index during the swap, but +6 violates the DB `CHECK (position >= 0 AND position < 6)` in `apps/web/db/024_profile_photos.sql:30` → Postgres error `23514`. So the transient "move out of the way" step is itself illegal. Any member with 2+ photos who reorders hits it.

## Expected

A member can reorder their photos and it persists, with no server error.

## Fix direction (implementer's call)

- Make the reorder transaction not transiently violate constraints — e.g. defer the unique index (`DEFERRABLE INITIALLY DEFERRED`) and set final positions in one statement; OR relax the migration's upper-bound CHECK (the ≤6 cap is already enforced in the domain/insert layer, so `CHECK (position >= 0)` alone is safe) so the +offset phase is legal; OR reorder via a single `UPDATE ... FROM (VALUES ...)` mapping that never collides. If a migration is needed it is additive/backwards-compatible → orchestrator migrates prod first.

## Acceptance criteria

- [ ] A member with 2–6 photos can reorder them; `PATCH /api/account/photos/order` returns 200 and the new order persists; the primary photo stays correct.
- [ ] No transient constraint violation; positions stay valid; unique-per-user preserved.
- [ ] A unit test reproduces the old 500 and proves the fix (reorder of 2+ photos succeeds).
- [ ] No regression to upload/set-primary/delete/export/deletion; repository checks pass incl. production build. (If a migration is added, it is additive and applied to prod first.)

## Handoff and retest log

- 2026-07-02 - Filed by the Tester after live photo-upload verification exposed the reorder path; status `ready`.
- 2026-07-02 - Builder took ticket `in-progress`; rewrote `reorderProfilePhotos` to a single set-based `UPDATE ... FROM unnest(ids, positions)` inside a transaction. A non-deferrable `UNIQUE(user_id, position)` index still 500'd mid-permutation (checked per-row), so added ADDITIVE migration `028_profile_photos_position_deferrable.sql` making that uniqueness `DEFERRABLE INITIALLY DEFERRED` (guarantee unchanged, checked at COMMIT). Reorder no longer touches `is_primary` (that is `setPrimaryProfilePhoto`'s job; re-deriving it would trip the one-primary partial index). MIGRATION ADDED — orchestrator must migrate prod before pushing. Live verified on dev: reorder of 3 photos → 200 + persisted order, positions unique/in-range, primary preserved, foreign id → 400. Checks: typecheck/lint/test/build all pass; migration applied clean on dev. Committed `96aa377` (NOT pushed — MIGRATION ADDED; orchestrator applies db/028 to prod first, then pushes). Status → `implemented` for independent retest.
