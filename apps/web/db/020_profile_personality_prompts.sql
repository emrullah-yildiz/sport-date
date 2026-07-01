-- Adds optional, member-owned "personality prompts" to the profile so a member
-- reads like a person rather than an account record (CX-20260701-profile-lacks-
-- rich-browsable-detail). Each prompt is a { prompt, answer } pair the member
-- opts into; the whole set is optional, editable, and removable through the
-- existing profile update path. Stored as a single JSONB array on users to keep
-- this a minimal, reversible change (mirrors the existing languages TEXT[] rather
-- than adding another child table).
--
-- Defence-in-depth CHECK: the whole set is optional and bounded — an array of at
-- most 3 entries, each an object carrying a string `prompt` and string `answer`.
-- The per-field length caps (prompt <= 80, answer <= 140 chars, non-empty) live
-- in the application layer (packages/domain validateProfileUpdate, which is the
-- primary guard and is unit-tested) because Postgres CHECK constraints cannot
-- contain subqueries and SQL/JSONPath has no string-length operator. This
-- structural constraint still stops non-array values, over-long arrays, and
-- non-string / non-object members from ever reaching the row. Empty array
-- default means every existing member is valid with no backfill.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS personality_prompts JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_personality_prompts_shape;

ALTER TABLE users
  ADD CONSTRAINT users_personality_prompts_shape CHECK (
    jsonb_typeof(personality_prompts) = 'array'
    AND jsonb_array_length(personality_prompts) <= 3
    AND NOT jsonb_path_exists(
      personality_prompts,
      '$[*] ? (@.type() != "object" || @.prompt.type() != "string" || @.answer.type() != "string")'
    )
  );
