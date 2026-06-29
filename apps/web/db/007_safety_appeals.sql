ALTER TABLE safety_reports
  ADD COLUMN IF NOT EXISTS decision_code TEXT CHECK (decision_code IN (
    'no_action', 'warning', 'event_removal', 'feature_restriction',
    'temporary_suspension', 'permanent_removal', 'external_escalation'
  )),
  ADD COLUMN IF NOT EXISTS decision_summary TEXT CHECK (
    decision_summary IS NULL OR length(decision_summary) BETWEEN 20 AND 2000
  ),
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_deadline TIMESTAMPTZ;

ALTER TABLE safety_reports ADD CONSTRAINT safety_reports_decision_notice_complete CHECK (
  (decision_code IS NULL AND decision_summary IS NULL AND decided_at IS NULL AND appeal_deadline IS NULL)
  OR
  (decision_code IS NOT NULL AND decision_summary IS NOT NULL AND decided_at IS NOT NULL
    AND appeal_deadline IS NOT NULL AND status IN ('actioned', 'dismissed'))
);

CREATE TABLE IF NOT EXISTS moderation_appeals (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE RESTRICT,
  appellant_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 20 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'upheld', 'modified', 'reversed')),
  outcome_summary TEXT CHECK (outcome_summary IS NULL OR length(outcome_summary) BETWEEN 20 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  UNIQUE (report_id, appellant_user_id)
);

CREATE INDEX IF NOT EXISTS moderation_appeals_queue_idx ON moderation_appeals(status, created_at);

ALTER TABLE moderation_audit_log DROP CONSTRAINT IF EXISTS moderation_audit_log_action_check;
ALTER TABLE moderation_audit_log ADD CONSTRAINT moderation_audit_log_action_check CHECK (action IN (
  'report_created', 'subject_blocked', 'status_changed', 'note_added', 'evidence_preserved',
  'decision_notice_sent', 'appeal_created', 'appeal_status_changed'
));
