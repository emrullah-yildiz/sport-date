ALTER TABLE event_update_notices
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'routine'
  CHECK (severity IN ('routine', 'critical'));

UPDATE event_update_notices
SET severity = 'critical'
WHERE changed_fields && ARRAY['startsAt', 'durationMinutes', 'publicLocation', 'privateLocation', 'arrivalInstructions']::text[];
