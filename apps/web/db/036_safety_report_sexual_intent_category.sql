-- Add a "sexual/inappropriate intent" report reason
-- (CX-20260704-policy-no-sexual-intent-events).
--
-- Additive: widens the safety_reports.category CHECK to include 'sexual_intent'
-- so members can report an event or profile that is organised for sexual
-- purposes / solicitation (this is not a hookup app). All existing categories
-- stay allowed, so a previous-deploy insert during the deploy→migrate window can
-- never violate the constraint. Routing is unchanged — these reports land in the
-- SAME moderation queue (safety_reports + moderation_audit_log).
ALTER TABLE safety_reports DROP CONSTRAINT IF EXISTS safety_reports_category_check;
ALTER TABLE safety_reports ADD CONSTRAINT safety_reports_category_check CHECK (category IN (
  'harassment', 'hate', 'sexual_misconduct', 'sexual_intent', 'violence_threat', 'stalking',
  'scam', 'impersonation', 'suspected_underage', 'unsafe_event', 'no_show', 'other'
));
