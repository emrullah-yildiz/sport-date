CREATE TABLE IF NOT EXISTS moderation_evidence_references (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE RESTRICT,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'system_record', 'member_statement', 'external_case', 'law_enforcement_request'
  )),
  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('restricted', 'high')),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 10 AND 160),
  reference_key TEXT NOT NULL CHECK (length(reference_key) BETWEEN 8 AND 200),
  preservation_purpose TEXT NOT NULL CHECK (length(preservation_purpose) BETWEEN 20 AND 500),
  retention_review_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (retention_review_at > created_at)
);

CREATE INDEX IF NOT EXISTS moderation_evidence_report_idx
  ON moderation_evidence_references(report_id, created_at);

CREATE RULE moderation_evidence_no_update AS
  ON UPDATE TO moderation_evidence_references DO INSTEAD NOTHING;
CREATE RULE moderation_evidence_no_delete AS
  ON DELETE TO moderation_evidence_references DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS moderation_case_access_log (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID REFERENCES safety_reports(id) ON DELETE RESTRICT,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL CHECK (access_type IN (
    'queue_view', 'case_view', 'evidence_reference_created'
  )),
  purpose TEXT NOT NULL CHECK (purpose IN (
    'case_triage', 'case_review', 'appeal_review', 'incident_response', 'quality_assurance'
  )),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((access_type = 'queue_view' AND report_id IS NULL) OR (access_type <> 'queue_view' AND report_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS moderation_case_access_report_idx
  ON moderation_case_access_log(report_id, created_at);
CREATE INDEX IF NOT EXISTS moderation_case_access_actor_idx
  ON moderation_case_access_log(actor_user_id, created_at);

CREATE RULE moderation_case_access_no_update AS
  ON UPDATE TO moderation_case_access_log DO INSTEAD NOTHING;
CREATE RULE moderation_case_access_no_delete AS
  ON DELETE TO moderation_case_access_log DO INSTEAD NOTHING;

