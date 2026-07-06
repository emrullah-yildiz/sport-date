-- Anonymous first-party click/funnel analytics (CX-20260706, owner request:
-- "can you track what people click on the website?").
--
-- Aggregate-only by construction: one counter per (day, event, path_class).
-- The schema PHYSICALLY cannot hold an identifier — no user id, no session id,
-- no IP, no user agent, and no timestamp finer than the day. A row can never
-- describe a person, only "this allowlisted button was clicked N times on this
-- page class on this day". Both `event` and `path_class` are validated against
-- fixed allowlists in the write path (apps/web/src/lib/click-metrics.ts), so
-- free text can never smuggle an identifier into either column.
CREATE TABLE IF NOT EXISTS click_metrics_daily (
  day DATE NOT NULL,
  event TEXT NOT NULL,
  path_class TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
  PRIMARY KEY (day, event, path_class)
);
