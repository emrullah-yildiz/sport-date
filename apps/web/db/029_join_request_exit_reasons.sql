-- Optional, PRIVATE graceful-exit reason
-- (CX-20260701-graceful-exit-no-show-non-punitive-handling).
--
-- When a member leaves early / cancels / is a no-show, they MAY attach a private
-- reason and a short private note. Both are the member's own record and exist purely
-- so the exit feels dignified and in-control. They are NEVER selected into any host-,
-- peer-, or discover-facing query, NEVER exposed to another member, and NEVER become
-- a public score, count, or badge. Leaving is unpunished and always allowed; these
-- columns add zero reliability consequence (that logic lives in packages/domain
-- reliability.ts and is untouched here).
--
-- Deploy-safety: purely ADDITIVE and NULLABLE with no backfill, so old code keeps
-- working if the deploy briefly precedes the migration. These columns are only ever
-- WRITTEN on the member's own cancel path and are not read by any broadly-rendered
-- path (getCurrentUser / root layout / landing / middleware), so a missing column
-- cannot cause a site-wide outage.

ALTER TABLE join_requests
  ADD COLUMN IF NOT EXISTS exit_reason TEXT
    CHECK (exit_reason IS NULL OR exit_reason IN (
      'unspecified', 'cant_make_it', 'left_early', 'plans_changed', 'felt_unsafe', 'prefer_not_to_say'
    )),
  ADD COLUMN IF NOT EXISTS exit_note TEXT
    CHECK (exit_note IS NULL OR length(exit_note) <= 280);
