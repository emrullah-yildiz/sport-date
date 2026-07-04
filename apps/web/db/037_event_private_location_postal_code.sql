-- Structured precise address: add a postal code to the private meeting location
-- (CX-20260704-feature-precise-address-and-maps).
--
-- Additive, nullable for back-compat (existing events predate the mandatory
-- postal code; the app requires it on NEW event creation). It lives in
-- event_private_locations alongside the venue name, street address, and precise
-- coordinates — all of which stay PRIVATE and are revealed only to the host and
-- accepted attendees, never in discovery, the public /e/{id} invite, OG images,
-- or notifications.
ALTER TABLE event_private_locations
  ADD COLUMN IF NOT EXISTS postal_code TEXT
  CHECK (postal_code IS NULL OR length(btrim(postal_code)) BETWEEN 1 AND 20);
