-- Append-only audit tables must stay immutable against application edits and
-- deletes, but the prior `ON UPDATE ... DO INSTEAD NOTHING` rules also swallowed
-- the internal SET-NULL UPDATE that a `... REFERENCES users(id) ON DELETE SET
-- NULL` foreign key performs when a user is hard-deleted, so Postgres raised
-- "referential integrity query ... gave unexpected result" and NO users row
-- could be deleted (GDPR right-to-erasure of the row was blocked).
--
-- Fix: drop the ON UPDATE DO INSTEAD NOTHING rules and replace each with a
-- BEFORE UPDATE trigger that still blocks every application edit EXCEPT the FK's
-- system SET-NULL: an UPDATE is allowed only when the sole columns that changed
-- are the listed user-reference column(s) AND each such changed column went from
-- NON-NULL to NULL. Any other change (including setting a user-ref column to a
-- non-null value, or nulling a user-ref column that was already null while some
-- other column changed) raises. The ON DELETE DO INSTEAD NOTHING rules are kept
-- so audit rows remain undeletable by the application; the FKs never delete
-- audit rows, they only null the user reference.
--
-- One shared trigger function is parameterised by the user-reference column
-- names via TG_ARGV. It compares OLD/NEW as jsonb: every non-user-ref column
-- must be unchanged, and every changed user-ref column must move to NULL from a
-- previously non-null value. NOTE on the migration runner (scripts/migrate.mjs):
-- it splits files on /;\s*(?:\r?\n|$)/, so a `;` immediately followed by a
-- newline ends a statement. The function body below is therefore written so no
-- internal `;` is the last non-space character on its line -- each statement's
-- semicolon is followed by more code on the same line -- which keeps the whole
-- CREATE FUNCTION as a single statement for the runner. (Verified by running the
-- migration against the dev DB.)

-- The function body is written on a SINGLE physical line so that none of its
-- internal `;` terminators is ever the last non-whitespace character before a
-- newline. That is what keeps the whole CREATE FUNCTION one statement under the
-- runner's /;\s*(?:\r?\n|$)/ split (verified by running the migration; see the
-- split-simulation note above).
CREATE OR REPLACE FUNCTION audit_append_only_allow_user_nulling() RETURNS trigger AS $$ DECLARE user_ref_cols text[] := TG_ARGV; old_json jsonb := to_jsonb(OLD); new_json jsonb := to_jsonb(NEW); col text; old_val jsonb; new_val jsonb; BEGIN FOR col IN SELECT jsonb_object_keys(new_json) LOOP old_val := old_json -> col; new_val := new_json -> col; IF old_val IS DISTINCT FROM new_val THEN IF NOT (col = ANY (user_ref_cols)) THEN RAISE EXCEPTION 'append-only audit row: column % cannot be modified', col USING ERRCODE = 'restrict_violation'; ELSIF NOT (old_val <> 'null'::jsonb AND new_val = 'null'::jsonb) THEN RAISE EXCEPTION 'append-only audit row: user reference % may only be cleared to NULL (FK ON DELETE SET NULL)', col USING ERRCODE = 'restrict_violation'; END IF; END IF; END LOOP; RETURN NEW; END $$ LANGUAGE plpgsql;

DROP RULE IF EXISTS moderation_audit_no_update ON moderation_audit_log;
CREATE TRIGGER moderation_audit_append_only BEFORE UPDATE ON moderation_audit_log FOR EACH ROW EXECUTE FUNCTION audit_append_only_allow_user_nulling('actor_user_id');

DROP RULE IF EXISTS role_audit_no_update ON role_audit_log;
CREATE TRIGGER role_audit_append_only BEFORE UPDATE ON role_audit_log FOR EACH ROW EXECUTE FUNCTION audit_append_only_allow_user_nulling('target_user_id', 'actor_user_id');

DROP RULE IF EXISTS moderation_evidence_no_update ON moderation_evidence_references;
CREATE TRIGGER moderation_evidence_append_only BEFORE UPDATE ON moderation_evidence_references FOR EACH ROW EXECUTE FUNCTION audit_append_only_allow_user_nulling('created_by_user_id');

DROP RULE IF EXISTS moderation_case_access_no_update ON moderation_case_access_log;
CREATE TRIGGER moderation_case_access_append_only BEFORE UPDATE ON moderation_case_access_log FOR EACH ROW EXECUTE FUNCTION audit_append_only_allow_user_nulling('actor_user_id');
