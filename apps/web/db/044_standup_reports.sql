-- Daily standup reports published via API (owner request 2026-07-07).
--
-- Until now the standup report lived only as static JSON in the repo
-- (apps/web/public/standup/latest.json), so publishing required a git push +
-- redeploy — which the cloud scribe cannot do (read-only checkout; the
-- 2026-07-06 standup died in its sandbox because of this). This table gives
-- the scribe a direct publish path: it POSTs the finished report and /hq.html
-- renders it immediately, no deploy in between. One row per day, upserted so
-- a re-run replaces that day's report. Internal ops signal only — no member
-- PII lives here.
CREATE TABLE IF NOT EXISTS standup_reports (
  day DATE PRIMARY KEY,
  report JSONB NOT NULL,
  published_by TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
