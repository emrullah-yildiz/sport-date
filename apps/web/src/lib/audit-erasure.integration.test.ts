import crypto from "node:crypto";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// `server-only` throws outside an RSC graph; neutralize it as the other
// server-lib specs do (this file imports no server-only module, but keep the
// guard consistent with the sibling integration spec).
vi.mock("server-only", () => ({}));

// Opt-in only. The default hermetic suite never connects to a database; these
// tests run against a real (dev) PostgreSQL and are enabled with
// RUN_DB_INTEGRATION=1 plus a DATABASE_URL / NEON_DATABASE_URL. See
// `npm run test:integration -w @sport-date/web`.
//
// What this proves (migration 019_audit_append_only_allows_user_nulling):
//   a. A user referenced by an append-only audit row CAN now be hard-deleted;
//      the audit row SURVIVES with its user-reference column nulled by the FK's
//      ON DELETE SET NULL, and every other column is unchanged.
//   b. An application UPDATE of a NON-user-ref column on an audit row is still
//      REJECTED (the BEFORE UPDATE trigger raises).
//   c. An application DELETE of an audit row is still a no-op (the surviving
//      ON DELETE DO INSTEAD NOTHING rule swallows it; the row remains).
//
// Coverage: ALL FOUR append-only audit tables that carry the shared trigger are
// now exercised DIRECTLY against real SQL:
//   - moderation_audit_log         (FK actor_user_id)
//   - role_audit_log               (FKs target_user_id + actor_user_id)
//   - moderation_case_access_log   (FK actor_user_id)
//   - moderation_evidence_references (FK created_by_user_id)
// The previous "by inference" gap for the last two tables is closed here.
//
// Non-destructive design: all rows created here are sentinel rows keyed to
// `int-test+...@sport-date.invalid` emails and a single sentinel safety_report;
// every row is cleaned up after each test and on teardown. No other row and no
// other table (e.g. `registrations`) is read or modified. Hard-deleting users
// now works (that is the fix under test), so teardown leaves the DB pristine.
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(databaseUrl);

const sentinelEmail = (tag: string) =>
  `int-test+audit-erasure-${tag}-${crypto.randomUUID()}@sport-date.invalid`;

describe.skipIf(!enabled)("audit append-only erasure (real SQL, migration 019)", () => {
  let sql: NeonQueryFunction<false, false>;

  // Rows to clean up after each test, in FK-safe deletion order. Audit rows are
  // tracked by their own primary key (not by user reference), because the FK
  // SET-NULL under test clears the user columns and would otherwise strand them.
  const createdUserIds: Array<string | number> = [];
  const createdReportIds: string[] = [];
  const createdModerationAuditIds: Array<string | number> = [];
  const createdRoleAuditIds: Array<string | number> = [];
  const createdCaseAccessIds: Array<string | number> = [];
  const createdEvidenceIds: string[] = [];

  async function insertUser(tag: string): Promise<string> {
    const rows = (await sql`
      INSERT INTO users (
        email, password_hash, first_name, last_name, date_of_birth,
        location, seeking, accepted_terms_at
      ) VALUES (
        ${sentinelEmail(tag)}, ${"int-test-hash"}, ${"Audit"}, ${"Sentinel"}, ${"1990-01-01"},
        ${"Bucharest"}, ${"friendship"}, ${new Date().toISOString()}
      )
      RETURNING id
    `) as Array<{ id: string | number }>;
    const id = rows[0].id;
    createdUserIds.push(id);
    return String(id);
  }

  async function insertSafetyReport(reportedUserId: string): Promise<string> {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO safety_reports (id, reported_user_id, category, details, status, priority)
      VALUES (
        ${id}, ${reportedUserId}, ${"other"},
        ${"Integration sentinel report used to satisfy the audit-log FK."},
        ${"open"}, ${"standard"}
      )
    `;
    createdReportIds.push(id);
    return id;
  }

  afterEach(async () => {
    // Audit rows are append-only and undeletable by design; remove the sentinel
    // ones by transiently disabling the surviving no_delete rule on each table,
    // then restoring it, so the dev DB is left with zero residue. Audit rows are
    // deleted by their own id (their user columns may already be nulled). Order:
    // audit rows -> safety_reports (RESTRICT-referenced by moderation_audit_log)
    // -> users (their FKs into audit tables are SET NULL, so they go last).
    if (createdModerationAuditIds.length > 0) {
      await sql`ALTER TABLE moderation_audit_log DISABLE RULE moderation_audit_no_delete`;
      for (const auditId of createdModerationAuditIds) {
        await sql`DELETE FROM moderation_audit_log WHERE id = ${auditId}`;
      }
      await sql`ALTER TABLE moderation_audit_log ENABLE RULE moderation_audit_no_delete`;
    }
    createdModerationAuditIds.length = 0;

    if (createdRoleAuditIds.length > 0) {
      await sql`ALTER TABLE role_audit_log DISABLE RULE role_audit_no_delete`;
      for (const auditId of createdRoleAuditIds) {
        await sql`DELETE FROM role_audit_log WHERE id = ${auditId}`;
      }
      await sql`ALTER TABLE role_audit_log ENABLE RULE role_audit_no_delete`;
    }
    createdRoleAuditIds.length = 0;

    if (createdCaseAccessIds.length > 0) {
      await sql`ALTER TABLE moderation_case_access_log DISABLE RULE moderation_case_access_no_delete`;
      for (const accessId of createdCaseAccessIds) {
        await sql`DELETE FROM moderation_case_access_log WHERE id = ${accessId}`;
      }
      await sql`ALTER TABLE moderation_case_access_log ENABLE RULE moderation_case_access_no_delete`;
    }
    createdCaseAccessIds.length = 0;

    if (createdEvidenceIds.length > 0) {
      await sql`ALTER TABLE moderation_evidence_references DISABLE RULE moderation_evidence_no_delete`;
      for (const evidenceId of createdEvidenceIds) {
        await sql`DELETE FROM moderation_evidence_references WHERE id = ${evidenceId}`;
      }
      await sql`ALTER TABLE moderation_evidence_references ENABLE RULE moderation_evidence_no_delete`;
    }
    createdEvidenceIds.length = 0;

    for (const reportId of createdReportIds) {
      await sql`DELETE FROM safety_reports WHERE id = ${reportId}`;
    }
    createdReportIds.length = 0;

    for (const userId of createdUserIds) {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }
    createdUserIds.length = 0;
  });

  beforeAll(() => {
    sql = neon(databaseUrl as string);
  });

  afterAll(async () => {
    // afterEach already cleared per-test residue; nothing persistent is created.
  });

  it("moderation_audit_log: referenced user can be hard-deleted, the audit row survives with actor_user_id nulled and all else unchanged", async () => {
    const reportedUser = await insertUser("reported");
    const actorUser = await insertUser("actor");
    const reportId = await insertSafetyReport(reportedUser);

    const inserted = (await sql`
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
      VALUES (${reportId}, ${"moderator"}, ${actorUser}, ${"status_changed"}, ${JSON.stringify({ note: "sentinel" })})
      RETURNING id, created_at
    `) as Array<{ id: string | number; created_at: string }>;
    const auditId = inserted[0].id;
    createdModerationAuditIds.push(auditId);
    const originalCreatedAt = inserted[0].created_at;

    // (a) The actor user is now hard-deletable even though an audit row references it.
    await expect(sql`DELETE FROM users WHERE id = ${actorUser}`).resolves.toBeDefined();
    const gone = await sql`SELECT 1 FROM users WHERE id = ${actorUser}`;
    expect(gone).toHaveLength(0);

    // The audit row survives; only actor_user_id is now NULL; everything else unchanged.
    const after = (await sql`
      SELECT actor_user_id, actor_type, action, report_id, metadata, created_at
      FROM moderation_audit_log WHERE id = ${auditId}
    `) as Array<{
      actor_user_id: string | number | null;
      actor_type: string;
      action: string;
      report_id: string;
      metadata: unknown;
      created_at: string;
    }>;
    expect(after).toHaveLength(1);
    expect(after[0].actor_user_id).toBeNull();
    expect(after[0].actor_type).toBe("moderator");
    expect(after[0].action).toBe("status_changed");
    expect(after[0].report_id).toBe(reportId);
    expect(after[0].metadata).toEqual({ note: "sentinel" });
    expect(new Date(after[0].created_at).getTime()).toBe(new Date(originalCreatedAt).getTime());

    // (b) An application UPDATE of a non-user-ref column is still rejected.
    await expect(
      sql`UPDATE moderation_audit_log SET action = ${"note_added"} WHERE id = ${auditId}`,
    ).rejects.toThrow();

    // (c) An application DELETE of the audit row is a no-op (row remains).
    await sql`DELETE FROM moderation_audit_log WHERE id = ${auditId}`;
    const stillThere = await sql`SELECT 1 FROM moderation_audit_log WHERE id = ${auditId}`;
    expect(stillThere).toHaveLength(1);
  });

  it("role_audit_log: a user referenced as target AND actor can be hard-deleted, both columns null while the row survives unchanged", async () => {
    const targetUser = await insertUser("role-target");
    const actorUser = await insertUser("role-actor");

    const inserted = (await sql`
      INSERT INTO role_audit_log (target_user_id, actor_user_id, role, action, reason)
      VALUES (${targetUser}, ${actorUser}, ${"moderator"}, ${"granted"}, ${"Integration sentinel grant."})
      RETURNING id, created_at
    `) as Array<{ id: string | number; created_at: string }>;
    const auditId = inserted[0].id;
    createdRoleAuditIds.push(auditId);
    const originalCreatedAt = inserted[0].created_at;

    // (a) Delete BOTH referenced users; both FK SET-NULLs must be permitted.
    await expect(sql`DELETE FROM users WHERE id = ${targetUser}`).resolves.toBeDefined();
    await expect(sql`DELETE FROM users WHERE id = ${actorUser}`).resolves.toBeDefined();

    const after = (await sql`
      SELECT target_user_id, actor_user_id, role, action, reason, created_at
      FROM role_audit_log WHERE id = ${auditId}
    `) as Array<{
      target_user_id: string | number | null;
      actor_user_id: string | number | null;
      role: string;
      action: string;
      reason: string;
      created_at: string;
    }>;
    expect(after).toHaveLength(1);
    expect(after[0].target_user_id).toBeNull();
    expect(after[0].actor_user_id).toBeNull();
    expect(after[0].role).toBe("moderator");
    expect(after[0].action).toBe("granted");
    expect(after[0].reason).toBe("Integration sentinel grant.");
    expect(new Date(after[0].created_at).getTime()).toBe(new Date(originalCreatedAt).getTime());

    // (b) An application UPDATE of a non-user-ref column is still rejected.
    await expect(
      sql`UPDATE role_audit_log SET reason = ${"tampered reason that is long enough"} WHERE id = ${auditId}`,
    ).rejects.toThrow();

    // Setting a user-ref column to a NON-null value is also rejected (only
    // clearing to NULL is permitted, and only via the FK action).
    await expect(
      sql`UPDATE role_audit_log SET actor_user_id = ${actorUser} WHERE id = ${auditId}`,
    ).rejects.toThrow();

    // (c) An application DELETE of the audit row is a no-op (row remains).
    await sql`DELETE FROM role_audit_log WHERE id = ${auditId}`;
    const stillThere = await sql`SELECT 1 FROM role_audit_log WHERE id = ${auditId}`;
    expect(stillThere).toHaveLength(1);
  });

  it("moderation_case_access_log: referenced actor can be hard-deleted, the access row survives with actor_user_id nulled and all else unchanged", async () => {
    // FK graph: a reported user -> a safety_report (report_id, ON DELETE RESTRICT)
    // + an actor user (actor_user_id, ON DELETE SET NULL). access_type 'case_view'
    // requires report_id NOT NULL (table CHECK), so we attach the access row to the report.
    const reportedUser = await insertUser("access-reported");
    const actorUser = await insertUser("access-actor");
    const reportId = await insertSafetyReport(reportedUser);

    const inserted = (await sql`
      INSERT INTO moderation_case_access_log (report_id, actor_user_id, access_type, purpose, metadata)
      VALUES (${reportId}, ${actorUser}, ${"case_view"}, ${"case_review"}, ${JSON.stringify({ note: "sentinel-access" })})
      RETURNING id, created_at
    `) as Array<{ id: string | number; created_at: string }>;
    const accessId = inserted[0].id;
    createdCaseAccessIds.push(accessId);
    const originalCreatedAt = inserted[0].created_at;

    // (a) The actor user is now hard-deletable even though an access row references it.
    await expect(sql`DELETE FROM users WHERE id = ${actorUser}`).resolves.toBeDefined();
    const gone = await sql`SELECT 1 FROM users WHERE id = ${actorUser}`;
    expect(gone).toHaveLength(0);

    // The access row survives; only actor_user_id is now NULL; everything else unchanged.
    const after = (await sql`
      SELECT actor_user_id, access_type, purpose, report_id, metadata, created_at
      FROM moderation_case_access_log WHERE id = ${accessId}
    `) as Array<{
      actor_user_id: string | number | null;
      access_type: string;
      purpose: string;
      report_id: string;
      metadata: unknown;
      created_at: string;
    }>;
    expect(after).toHaveLength(1);
    expect(after[0].actor_user_id).toBeNull();
    expect(after[0].access_type).toBe("case_view");
    expect(after[0].purpose).toBe("case_review");
    expect(after[0].report_id).toBe(reportId);
    expect(after[0].metadata).toEqual({ note: "sentinel-access" });
    expect(new Date(after[0].created_at).getTime()).toBe(new Date(originalCreatedAt).getTime());

    // (b) An application UPDATE of a non-user-ref column is still rejected.
    await expect(
      sql`UPDATE moderation_case_access_log SET purpose = ${"quality_assurance"} WHERE id = ${accessId}`,
    ).rejects.toThrow();

    // Setting the user-ref column to a NON-null value is also rejected.
    await expect(
      sql`UPDATE moderation_case_access_log SET actor_user_id = ${reportedUser} WHERE id = ${accessId}`,
    ).rejects.toThrow();

    // (c) An application DELETE of the access row is a no-op (row remains).
    await sql`DELETE FROM moderation_case_access_log WHERE id = ${accessId}`;
    const stillThere = await sql`SELECT 1 FROM moderation_case_access_log WHERE id = ${accessId}`;
    expect(stillThere).toHaveLength(1);
  });

  it("moderation_evidence_references: referenced creator can be hard-deleted, the reference row survives with created_by_user_id nulled and all else unchanged", async () => {
    // FK graph: a reported user -> a safety_report (report_id, ON DELETE RESTRICT)
    // + a creator user (created_by_user_id, ON DELETE SET NULL). All other columns
    // are NOT NULL with length/range CHECKs, satisfied with sentinel values.
    const reportedUser = await insertUser("evidence-reported");
    const creatorUser = await insertUser("evidence-creator");
    const reportId = await insertSafetyReport(reportedUser);

    const evidenceId = crypto.randomUUID();
    const retentionReviewAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const inserted = (await sql`
      INSERT INTO moderation_evidence_references (
        id, report_id, created_by_user_id, source_type, sensitivity,
        label, reference_key, preservation_purpose, retention_review_at
      ) VALUES (
        ${evidenceId}, ${reportId}, ${creatorUser}, ${"system_record"}, ${"restricted"},
        ${"Sentinel evidence label"}, ${"sentinel-reference-key-001"},
        ${"Integration sentinel preservation purpose for the audit-erasure test."},
        ${retentionReviewAt}
      )
      RETURNING id, created_at
    `) as Array<{ id: string; created_at: string }>;
    createdEvidenceIds.push(evidenceId);
    const originalCreatedAt = inserted[0].created_at;

    // (a) The creator user is now hard-deletable even though a reference row references it.
    await expect(sql`DELETE FROM users WHERE id = ${creatorUser}`).resolves.toBeDefined();
    const gone = await sql`SELECT 1 FROM users WHERE id = ${creatorUser}`;
    expect(gone).toHaveLength(0);

    // The reference row survives; only created_by_user_id is now NULL; everything else unchanged.
    const after = (await sql`
      SELECT created_by_user_id, source_type, sensitivity, label, reference_key,
             preservation_purpose, report_id, created_at
      FROM moderation_evidence_references WHERE id = ${evidenceId}
    `) as Array<{
      created_by_user_id: string | number | null;
      source_type: string;
      sensitivity: string;
      label: string;
      reference_key: string;
      preservation_purpose: string;
      report_id: string;
      created_at: string;
    }>;
    expect(after).toHaveLength(1);
    expect(after[0].created_by_user_id).toBeNull();
    expect(after[0].source_type).toBe("system_record");
    expect(after[0].sensitivity).toBe("restricted");
    expect(after[0].label).toBe("Sentinel evidence label");
    expect(after[0].reference_key).toBe("sentinel-reference-key-001");
    expect(after[0].preservation_purpose).toBe(
      "Integration sentinel preservation purpose for the audit-erasure test.",
    );
    expect(after[0].report_id).toBe(reportId);
    expect(new Date(after[0].created_at).getTime()).toBe(new Date(originalCreatedAt).getTime());

    // (b) An application UPDATE of a non-user-ref column is still rejected.
    await expect(
      sql`UPDATE moderation_evidence_references SET label = ${"Tampered evidence label"} WHERE id = ${evidenceId}`,
    ).rejects.toThrow();

    // Setting the user-ref column to a NON-null value is also rejected.
    await expect(
      sql`UPDATE moderation_evidence_references SET created_by_user_id = ${reportedUser} WHERE id = ${evidenceId}`,
    ).rejects.toThrow();

    // (c) An application DELETE of the reference row is a no-op (row remains).
    await sql`DELETE FROM moderation_evidence_references WHERE id = ${evidenceId}`;
    const stillThere = await sql`SELECT 1 FROM moderation_evidence_references WHERE id = ${evidenceId}`;
    expect(stillThere).toHaveLength(1);
  });
});
