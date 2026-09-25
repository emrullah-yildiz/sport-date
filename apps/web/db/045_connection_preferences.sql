-- Connection choices remain ordered; the first is the legacy scalar projection.
ALTER TABLE users ADD COLUMN IF NOT EXISTS seeking_preferences TEXT[];
UPDATE users SET seeking_preferences = ARRAY[seeking] WHERE seeking_preferences IS NULL;
-- Legacy account creators omit the new column. Derive it from their scalar.
-- Keep the function on one line for the migration runner statement splitter.
CREATE OR REPLACE FUNCTION initialize_seeking_preferences() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.seeking_preferences IS NULL THEN NEW.seeking_preferences := ARRAY[NEW.seeking]; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS users_initialize_seeking_preferences ON users;
CREATE TRIGGER users_initialize_seeking_preferences BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION initialize_seeking_preferences();
ALTER TABLE users ALTER COLUMN seeking_preferences SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_seeking_preferences_valid;
ALTER TABLE users ADD CONSTRAINT users_seeking_preferences_valid CHECK (
  cardinality(seeking_preferences) BETWEEN 1 AND 3
  AND array_ndims(seeking_preferences) = 1
  AND array_lower(seeking_preferences, 1) = 1
  AND array_position(seeking_preferences, NULL) IS NULL
  AND seeking_preferences <@ ARRAY['dating', 'friendship', 'group']::TEXT[]
  AND cardinality(seeking_preferences) =
    (CASE WHEN 'dating' = ANY(seeking_preferences) THEN 1 ELSE 0 END +
     CASE WHEN 'friendship' = ANY(seeking_preferences) THEN 1 ELSE 0 END +
     CASE WHEN 'group' = ANY(seeking_preferences) THEN 1 ELSE 0 END)
);
