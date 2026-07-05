-- Idea lifecycle tabs on the approval queue (owner request 2026-07-05).
--
-- The owner's review page now buckets ideas as Pending / Approved / Posted /
-- Archived / Deleted: "posted" is derived (scheduled_ref set), "deleted" is the
-- denied bucket (denied ideas leave the working view), and "archived" is a new
-- explicit status for posts the owner or CEO loop tidies away after they've
-- run their course. Extend the status CHECK to allow it.
ALTER TABLE social_content_ideas
  DROP CONSTRAINT IF EXISTS social_content_ideas_status_check;
ALTER TABLE social_content_ideas
  ADD CONSTRAINT social_content_ideas_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'archived'));
