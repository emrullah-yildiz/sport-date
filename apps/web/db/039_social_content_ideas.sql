-- Social content approval queue (CX-20260705-social-content-approval-queue).
--
-- The CEO/growth agent files post ideas here via the internal secret-guarded
-- seed endpoint; the OWNER reviews them on /social-approve.html and approves,
-- denies, or comments. Approved ideas are what the growth agent then renders +
-- schedules to Buffer. Backs the social-autopilot draft -> approve -> publish
-- model.
--
-- `body` holds the full creative payload the growth agent produces so it can be
-- rendered on the queue and, once approved, pushed straight to publishing with
-- no re-authoring:
--   { slides?: string[], script?: string, caption: string,
--     hashtags: string[], cta: string, imageConcept: string }
--
-- Internal marketing content only — no member PII lives here.
CREATE TABLE IF NOT EXISTS social_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'both')),
  format TEXT NOT NULL CHECK (format IN ('carousel', 'reel', 'image', 'story')),
  title TEXT NOT NULL,
  trend TEXT,
  hook TEXT NOT NULL,
  body JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  owner_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  scheduled_ref TEXT
);

CREATE INDEX IF NOT EXISTS social_content_ideas_status_created_idx
  ON social_content_ideas(status, created_at DESC);
