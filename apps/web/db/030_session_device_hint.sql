-- Coarse, privacy-respecting device hint + last-active on web sessions
-- (CX-20260702-web-sessions-indistinguishable-no-device-hint-or-bulk-signout).
--
-- Members reviewing "Signed-in browsers" could not tell one session from another
-- (only a sign-in timestamp + the "This device" badge). This adds two OPTIONAL,
-- honest, low-resolution signals so a member can recognise a device before ending
-- it:
--
--   device_label   A short, coarse, human label DERIVED from the User-Agent at
--                  sign-in — e.g. "Chrome on Windows", "Safari on iPhone".
--                  PRIVACY CHOICE: we store ONLY this derived, bounded, coarse
--                  label. We deliberately do NOT store the raw User-Agent string,
--                  IP address, precise/approximate geolocation, or any device
--                  fingerprint. The label is a browser+OS FAMILY only (no version,
--                  no build, no hardware id), so it is a trust affordance, not
--                  surveillance, and cannot re-identify or fingerprint the device.
--                  Bounded to 60 chars; nullable (old rows / unparseable UAs have
--                  no label and simply fall back to the generic "Browser session").
--
--   last_active_at A COARSE last-active timestamp, refreshed at most about once a
--                  day when the session is used, giving a friendlier "last active"
--                  anchor than the fixed sign-in time. It is a rough recency signal,
--                  not an activity/behaviour log. Nullable; defaults to NULL for old
--                  rows (UI falls back to the sign-in time).
--
-- Deploy-safety: purely ADDITIVE and NULLABLE with no backfill and no default that
-- rewrites rows, so old code and old rows keep working if the deploy briefly
-- precedes the migration. Neither column is read by any broadly-rendered path
-- (getCurrentUser / root layout / landing / middleware); they are read ONLY by the
-- opt-in "Signed-in browsers" panel, which tolerates NULL. A missing column here
-- therefore cannot cause a site-wide outage.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS device_label TEXT
    CHECK (device_label IS NULL OR length(device_label) BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
