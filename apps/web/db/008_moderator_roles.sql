CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('moderator', 'safety_admin')),
  granted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  grant_reason TEXT NOT NULL CHECK (length(grant_reason) BETWEEN 10 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_active_role_idx
  ON user_roles(user_id, role) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS user_roles_active_user_idx
  ON user_roles(user_id) WHERE revoked_at IS NULL;

ALTER TABLE safety_reports
  ADD COLUMN IF NOT EXISTS decision_basis TEXT CHECK (
    decision_basis IS NULL OR length(decision_basis) BETWEEN 10 AND 500
  );
ALTER TABLE safety_reports DROP CONSTRAINT IF EXISTS safety_reports_decision_notice_complete;
ALTER TABLE safety_reports ADD CONSTRAINT safety_reports_decision_notice_complete CHECK (
  (decision_code IS NULL AND decision_basis IS NULL AND decision_summary IS NULL
    AND decided_at IS NULL AND appeal_deadline IS NULL)
  OR
  (decision_code IS NOT NULL AND decision_basis IS NOT NULL AND decision_summary IS NOT NULL
    AND decided_at IS NOT NULL AND appeal_deadline IS NOT NULL AND status IN ('actioned', 'dismissed'))
);

ALTER TABLE moderation_audit_log DROP CONSTRAINT IF EXISTS moderation_audit_log_action_check;
ALTER TABLE moderation_audit_log ADD CONSTRAINT moderation_audit_log_action_check CHECK (action IN (
  'report_created', 'subject_blocked', 'status_changed', 'note_added', 'evidence_preserved',
  'decision_notice_sent', 'decision_notice_published', 'appeal_created', 'appeal_status_changed'
));

CREATE TABLE IF NOT EXISTS role_audit_log (
  id BIGSERIAL PRIMARY KEY,
  target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('moderator', 'safety_admin')),
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked')),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE RULE role_audit_no_update AS ON UPDATE TO role_audit_log DO INSTEAD NOTHING;
CREATE RULE role_audit_no_delete AS ON DELETE TO role_audit_log DO INSTEAD NOTHING;
