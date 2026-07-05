-- Social dispatch trigger (CX-20260705-social-dispatch-trigger).
--
-- When the owner finishes reviewing the approval queue on /social-approve.html
-- they click "Done reviewing — schedule my approved posts". That records a row
-- here: a go-signal the CEO loop picks up on its next check (internal, secret-
-- guarded GET) so scheduling starts promptly instead of on a fixed timer. The
-- loop stamps handled_at once it has acted so the same click isn't processed
-- twice. Internal marketing signal only — no member PII lives here.
CREATE TABLE IF NOT EXISTS social_dispatch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_at TIMESTAMPTZ
);

-- The loop only ever asks for the latest UNHANDLED request; index that path.
CREATE INDEX IF NOT EXISTS social_dispatch_requests_unhandled_idx
  ON social_dispatch_requests(requested_at DESC)
  WHERE handled_at IS NULL;
