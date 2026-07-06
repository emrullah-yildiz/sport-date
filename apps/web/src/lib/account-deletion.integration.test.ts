import crypto from "node:crypto";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// `server-only` throws when imported outside an RSC graph; neutralize it as the
// sibling integration specs do so the REAL route module graph loads here.
vi.mock("server-only", () => ({}));

// The ONLY mocked seam: the HTTP cookie transport. Vitest cannot provide a real
// Next.js request scope, so `cookies()` returns the sentinel session token the
// test seeded. Everything downstream is REAL: the real `getCurrentUser` does its
// real session-hash lookup against real SQL, the real bcrypt `verifyPassword`
// runs, the real CTE executes, and the real token-revocation / photo-purge
// helpers run their real statements.
const cookieState = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auth_token" && cookieState.token ? { name, value: cookieState.token } : undefined,
  }),
}));

import { POST } from "@/app/api/account/deletion/route";
import { hashPassword, hashSessionToken } from "@/lib/auth";

// Opt-in only. The default hermetic suite never connects to a database; these
// tests run against a real (dev) PostgreSQL and are enabled with
// RUN_DB_INTEGRATION=1 plus a DATABASE_URL / NEON_DATABASE_URL. See
// `npm run test:integration -w @sport-date/web`.
//
// What this proves (the named next outcome after the hermetic route tests):
// the GDPR erasure entry point works END-TO-END against real SQL through the
// application path — not just as pinned statement text.
//   1. A real session authenticates the member; the route's single atomic CTE
//      really locks the account (`deletion_pending`), records the deletion
//      request, cancels hosted events, removes accepted seats, deletes the
//      member's sent room messages (and ONLY theirs), cancels open join
//      requests, deletes browser sessions, and revokes mobile sessions — and
//      the real revocation/purge helpers invalidate outstanding auth tokens
//      and remove photo rows.
//   2. The lock is effective: the same session token can no longer authenticate
//      (session row gone AND account_status not 'active'), so a repeat request
//      is 401.
//   3. FINALIZATION interplay (migration 019): after the application-path lock,
//      the eventual hard `DELETE FROM users` completes erasure — append-only
//      audit rows and the deletion-request record survive with their user
//      reference nulled, and every remaining child row cascades away.
//   4. A wrong password leaves ZERO side effects in the real database.
//
// Non-destructive design: every row is a sentinel keyed to
// `int-test+...@sport-date.invalid` emails; afterEach removes all residue
// (audit rows via the transient no_delete-rule disable the sibling spec uses)
// so the dev DB is left pristine. No other row or table is read or modified.
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(databaseUrl);

const PASSWORD = "int-test-correct-password-12+";
const sentinelEmail = (tag: string) =>
  `int-test+account-deletion-${tag}-${crypto.randomUUID()}@sport-date.invalid`;
const randomHex64 = () => crypto.randomBytes(32).toString("hex");
const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();

function deletionRequest(password: string): Request {
  // Headers genuinely pass the REAL isTrustedBrowserMutation check
  // (same-origin fetch metadata + matching Origin) — it is not mocked.
  return new Request("http://localhost:3000/api/account/deletion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ password }),
  });
}

describe.skipIf(!enabled)("account deletion end-to-end (real SQL, application path)", () => {
  let sql: NeonQueryFunction<false, false>;

  // Cleanup registries, removed in FK-safe order in afterEach. Audit rows and
  // data_requests are tracked by their OWN ids because the flows under test
  // null their user references, which would otherwise strand them.
  const createdUserIds: Array<string | number> = [];
  const createdEventIds: string[] = [];
  const createdReportIds: string[] = [];
  const createdModerationAuditIds: Array<string | number> = [];
  const createdDataRequestIds: string[] = [];

  beforeAll(() => {
    sql = neon(databaseUrl as string);
  });

  afterEach(async () => {
    if (createdModerationAuditIds.length > 0) {
      await sql`ALTER TABLE moderation_audit_log DISABLE RULE moderation_audit_no_delete`;
      for (const auditId of createdModerationAuditIds) {
        await sql`DELETE FROM moderation_audit_log WHERE id = ${auditId}`;
      }
      await sql`ALTER TABLE moderation_audit_log ENABLE RULE moderation_audit_no_delete`;
    }
    createdModerationAuditIds.length = 0;

    for (const reportId of createdReportIds) {
      await sql`DELETE FROM safety_reports WHERE id = ${reportId}`;
    }
    createdReportIds.length = 0;

    for (const requestId of createdDataRequestIds) {
      await sql`DELETE FROM data_requests WHERE id = ${requestId}::uuid`;
    }
    createdDataRequestIds.length = 0;

    // Events cascade participants/messages/join_requests; users cascade
    // sessions/mobile sessions/tokens/photos. Users already hard-deleted by a
    // test are a no-op here.
    for (const eventId of createdEventIds) {
      await sql`DELETE FROM events WHERE id = ${eventId}::uuid`;
    }
    createdEventIds.length = 0;

    for (const userId of createdUserIds) {
      await sql`DELETE FROM data_requests WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }
    createdUserIds.length = 0;

    cookieState.token = "";
  }, 120_000);

  async function insertUser(tag: string, passwordHash: string): Promise<string> {
    const rows = (await sql`
      INSERT INTO users (
        email, password_hash, first_name, last_name, date_of_birth,
        location, seeking, accepted_terms_at
      ) VALUES (
        ${sentinelEmail(tag)}, ${passwordHash}, ${"Deletion"}, ${"Sentinel"}, ${"1990-01-01"},
        ${"Bucharest"}, ${"friendship"}, ${new Date().toISOString()}
      )
      RETURNING id
    `) as Array<{ id: string | number }>;
    const id = String(rows[0].id);
    createdUserIds.push(id);
    return id;
  }

  async function insertEvent(hostUserId: string, tag: string): Promise<string> {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO events (
        id, host_user_id, sport, title, description, starts_at, time_zone,
        duration_minutes, capacity, language, minimum_age, maximum_age,
        experience_levels, public_city, public_country_code, public_area_label
      ) VALUES (
        ${id}::uuid, ${hostUserId}, ${"running"}, ${`Integration sentinel ${tag}`},
        ${"Integration sentinel event used by the account-deletion end-to-end test."},
        ${inFuture(7 * 24 * 60 * 60 * 1000)}, ${"Europe/Bucharest"},
        ${60}, ${4}, ${"English"}, ${18}, ${99},
        ${["beginner"]}, ${"Bucharest"}, ${"RO"}, ${"Herastrau"}
      )
    `;
    createdEventIds.push(id);
    return id;
  }

  async function insertSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("base64url");
    await sql`
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES (${crypto.randomUUID()}::uuid, ${userId}, ${hashSessionToken(token)}, ${inFuture(60 * 60 * 1000)})
    `;
    return token;
  }

  async function insertMobileSession(userId: string): Promise<string> {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO mobile_sessions (
        id, user_id, device_id_hash, device_name,
        access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at
      ) VALUES (
        ${id}::uuid, ${userId}, ${randomHex64()}, ${"Integration Device"},
        ${randomHex64()}, ${randomHex64()},
        ${inFuture(15 * 60 * 1000)}, ${inFuture(30 * 24 * 60 * 60 * 1000)}
      )
    `;
    return id;
  }

  async function insertAuthTokens(userId: string, email: string): Promise<void> {
    await sql`
      INSERT INTO email_verification_tokens (id, user_id, email, token_hash, expires_at, last_sent_at, send_count)
      VALUES (${crypto.randomUUID()}::uuid, ${userId}, ${email}, ${randomHex64()}, ${inFuture(24 * 60 * 60 * 1000)}, ${new Date().toISOString()}, 1)
    `;
    await sql`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, last_sent_at, send_count)
      VALUES (${crypto.randomUUID()}::uuid, ${userId}, ${randomHex64()}, ${inFuture(60 * 60 * 1000)}, ${new Date().toISOString()}, 1)
    `;
  }

  it(
    "locks the account with every CTE side effect through the real route, then the finalization hard-delete completes erasure with audit and request rows surviving nulled",
    async () => {
      const passwordHash = await hashPassword(PASSWORD);
      const deleter = await insertUser("deleter", passwordHash);
      const deleterEmailRows = (await sql`SELECT email FROM users WHERE id = ${deleter}`) as Array<{ email: string }>;
      const other = await insertUser("other", "int-test-hash");

      // Hosted by the deleter: must be cancelled by the CTE.
      const hostedEvent = await insertEvent(deleter, "hosted");
      // Hosted by the OTHER member: the deleter holds an accepted seat + sent a
      // message there; the event itself must stay published.
      const joinedEvent = await insertEvent(other, "joined");
      // A second event with a still-pending request from the deleter.
      const pendingEvent = await insertEvent(other, "pending");

      const acceptedRequestId = crypto.randomUUID();
      await sql`
        INSERT INTO join_requests (id, event_id, requester_user_id, status, responded_at)
        VALUES (${acceptedRequestId}::uuid, ${joinedEvent}::uuid, ${deleter}, ${"accepted"}, ${new Date().toISOString()})
      `;
      await sql`
        INSERT INTO event_participants (event_id, user_id, seat_number)
        VALUES (${joinedEvent}::uuid, ${deleter}, 1)
      `;
      const pendingRequestId = crypto.randomUUID();
      await sql`
        INSERT INTO join_requests (id, event_id, requester_user_id, status)
        VALUES (${pendingRequestId}::uuid, ${pendingEvent}::uuid, ${deleter}, ${"pending"})
      `;

      const deleterMessageId = crypto.randomUUID();
      const otherMessageId = crypto.randomUUID();
      await sql`
        INSERT INTO event_messages (id, event_id, sender_user_id, body)
        VALUES (${deleterMessageId}::uuid, ${joinedEvent}::uuid, ${deleter}, ${"Sentinel message from the deleter."})
      `;
      await sql`
        INSERT INTO event_messages (id, event_id, sender_user_id, body)
        VALUES (${otherMessageId}::uuid, ${joinedEvent}::uuid, ${other}, ${"Sentinel message from the other member."})
      `;

      const deleterToken = await insertSession(deleter);
      const otherToken = await insertSession(other);
      void otherToken; // other member's session must SURVIVE; asserted by user id below.
      await insertMobileSession(deleter);
      await insertAuthTokens(deleter, deleterEmailRows[0].email);

      await sql`
        INSERT INTO profile_photos (id, user_id, blob_pathname, content_type, byte_size, is_primary)
        VALUES (${crypto.randomUUID()}::uuid, ${deleter}, ${`int-test/${crypto.randomUUID()}.jpg`}, ${"image/jpeg"}, ${1024}, TRUE)
      `;

      // Migration-019 interplay fixtures: an append-only audit row referencing
      // the deleter as ACTOR (must survive finalization with the ref nulled).
      const reportId = crypto.randomUUID();
      await sql`
        INSERT INTO safety_reports (id, reporter_user_id, reported_user_id, category, details, status, priority)
        VALUES (${reportId}::uuid, ${deleter}, ${other}, ${"other"}, ${"Integration sentinel report for the deletion end-to-end test."}, ${"open"}, ${"standard"})
      `;
      createdReportIds.push(reportId);
      const auditRows = (await sql`
        INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, metadata)
        VALUES (${reportId}::uuid, ${"member"}, ${deleter}, ${"report_created"}, ${JSON.stringify({ note: "sentinel" })})
        RETURNING id
      `) as Array<{ id: string | number }>;
      const auditId = auditRows[0].id;
      createdModerationAuditIds.push(auditId);

      // --- Act: the REAL route, authenticated by the REAL session lookup. ---
      cookieState.token = deleterToken;
      const response = await POST(deletionRequest(PASSWORD));
      expect(response.status).toBe(200);
      const body = (await response.json()) as { success: boolean; requestId: string };
      expect(body.success).toBe(true);
      expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
      createdDataRequestIds.push(body.requestId);

      // Immediate sign-out: the auth cookie is cleared on the response.
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("auth_token=;");
      expect(setCookie.toLowerCase()).toContain("expires=thu, 01 jan 1970");

      // --- Assert every CTE side effect against the real database. ---
      const userAfter = (await sql`
        SELECT account_status, deletion_requested_at FROM users WHERE id = ${deleter}
      `) as Array<{ account_status: string; deletion_requested_at: string | null }>;
      expect(userAfter[0].account_status).toBe("deletion_pending");
      expect(userAfter[0].deletion_requested_at).not.toBeNull();

      const dataRequests = (await sql`
        SELECT request_type, status, user_id FROM data_requests WHERE id = ${body.requestId}::uuid
      `) as Array<{ request_type: string; status: string; user_id: string | number | null }>;
      expect(dataRequests).toHaveLength(1);
      expect(dataRequests[0].request_type).toBe("deletion");
      expect(dataRequests[0].status).toBe("pending");
      expect(String(dataRequests[0].user_id)).toBe(deleter);

      const eventStatuses = (await sql`
        SELECT id, status FROM events
        WHERE id IN (${hostedEvent}::uuid, ${joinedEvent}::uuid, ${pendingEvent}::uuid)
      `) as Array<{ id: string; status: string }>;
      const statusById = new Map(eventStatuses.map((row) => [row.id, row.status]));
      expect(statusById.get(hostedEvent)).toBe("cancelled");
      expect(statusById.get(joinedEvent)).toBe("published");
      expect(statusById.get(pendingEvent)).toBe("published");

      const seats = await sql`SELECT 1 FROM event_participants WHERE user_id = ${deleter}`;
      expect(seats).toHaveLength(0);

      const messages = (await sql`
        SELECT id FROM event_messages WHERE event_id = ${joinedEvent}::uuid
      `) as Array<{ id: string }>;
      expect(messages.map((row) => row.id)).toEqual([otherMessageId]);

      const joinRequests = (await sql`
        SELECT id, status, cancelled_at FROM join_requests WHERE requester_user_id = ${deleter}
      `) as Array<{ id: string; status: string; cancelled_at: string | null }>;
      expect(joinRequests).toHaveLength(2);
      for (const request of joinRequests) {
        expect(request.status).toBe("cancelled");
        expect(request.cancelled_at).not.toBeNull();
      }

      const deleterSessions = await sql`SELECT 1 FROM sessions WHERE user_id = ${deleter}`;
      expect(deleterSessions).toHaveLength(0);
      const otherSessions = await sql`SELECT 1 FROM sessions WHERE user_id = ${other}`;
      expect(otherSessions).toHaveLength(1);

      const mobileSessions = (await sql`
        SELECT revoked_at FROM mobile_sessions WHERE user_id = ${deleter}
      `) as Array<{ revoked_at: string | null }>;
      expect(mobileSessions).toHaveLength(1);
      expect(mobileSessions[0].revoked_at).not.toBeNull();

      const verificationTokens = (await sql`
        SELECT invalidated_reason FROM email_verification_tokens WHERE user_id = ${deleter}
      `) as Array<{ invalidated_reason: string | null }>;
      expect(verificationTokens).toHaveLength(1);
      expect(verificationTokens[0].invalidated_reason).toBe("account_deletion");
      const resetTokens = (await sql`
        SELECT invalidated_reason FROM password_reset_tokens WHERE user_id = ${deleter}
      `) as Array<{ invalidated_reason: string | null }>;
      expect(resetTokens).toHaveLength(1);
      expect(resetTokens[0].invalidated_reason).toBe("account_deletion");

      const photos = await sql`SELECT 1 FROM profile_photos WHERE user_id = ${deleter}`;
      expect(photos).toHaveLength(0);

      // --- The lock is effective: the same token can no longer authenticate. ---
      const repeat = await POST(deletionRequest(PASSWORD));
      expect(repeat.status).toBe(401);

      // --- Finalization (migration-019 interplay): the eventual hard delete
      // now completes erasure through plain SQL, exactly as the operational
      // finalization step will issue it. ---
      await expect(sql`DELETE FROM users WHERE id = ${deleter}`).resolves.toBeDefined();
      const gone = await sql`SELECT 1 FROM users WHERE id = ${deleter}`;
      expect(gone).toHaveLength(0);

      // The append-only audit row SURVIVES with only its user reference nulled.
      const auditAfter = (await sql`
        SELECT actor_user_id, actor_type, action FROM moderation_audit_log WHERE id = ${auditId}
      `) as Array<{ actor_user_id: string | number | null; actor_type: string; action: string }>;
      expect(auditAfter).toHaveLength(1);
      expect(auditAfter[0].actor_user_id).toBeNull();
      expect(auditAfter[0].actor_type).toBe("member");
      expect(auditAfter[0].action).toBe("report_created");

      // The safety report survives (reported member's protection) with the
      // deleted reporter's identity nulled.
      const reportAfter = (await sql`
        SELECT reporter_user_id, reported_user_id FROM safety_reports WHERE id = ${reportId}::uuid
      `) as Array<{ reporter_user_id: string | number | null; reported_user_id: string | number | null }>;
      expect(reportAfter).toHaveLength(1);
      expect(reportAfter[0].reporter_user_id).toBeNull();
      expect(String(reportAfter[0].reported_user_id)).toBe(other);

      // The deletion-request record survives as the identity-free audit trail.
      const requestAfter = (await sql`
        SELECT user_id, request_type FROM data_requests WHERE id = ${body.requestId}::uuid
      `) as Array<{ user_id: string | number | null; request_type: string }>;
      expect(requestAfter).toHaveLength(1);
      expect(requestAfter[0].user_id).toBeNull();
      expect(requestAfter[0].request_type).toBe("deletion");

      // Zero residue: every remaining child row cascaded away with the user row.
      const hostedGone = await sql`SELECT 1 FROM events WHERE id = ${hostedEvent}::uuid`;
      expect(hostedGone).toHaveLength(0);
      const residue = (await sql`
        SELECT
          (SELECT COUNT(*) FROM sessions WHERE user_id = ${deleter})
          + (SELECT COUNT(*) FROM mobile_sessions WHERE user_id = ${deleter})
          + (SELECT COUNT(*) FROM email_verification_tokens WHERE user_id = ${deleter})
          + (SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = ${deleter})
          + (SELECT COUNT(*) FROM profile_photos WHERE user_id = ${deleter})
          + (SELECT COUNT(*) FROM event_messages WHERE sender_user_id = ${deleter})
          + (SELECT COUNT(*) FROM join_requests WHERE requester_user_id = ${deleter})
          + (SELECT COUNT(*) FROM event_participants WHERE user_id = ${deleter})
          AS total
      `) as Array<{ total: string | number }>;
      expect(Number(residue[0].total)).toBe(0);
    },
    180_000,
  );

  it(
    "a wrong password is rejected 401 by the real credential check and leaves ZERO side effects in the database",
    async () => {
      const passwordHash = await hashPassword(PASSWORD);
      const member = await insertUser("wrong-password", passwordHash);
      const memberEmailRows = (await sql`SELECT email FROM users WHERE id = ${member}`) as Array<{ email: string }>;
      const hostedEvent = await insertEvent(member, "untouched");
      const token = await insertSession(member);
      await insertMobileSession(member);
      await insertAuthTokens(member, memberEmailRows[0].email);

      cookieState.token = token;
      const response = await POST(deletionRequest("wrong-password-attempt-12+"));
      expect(response.status).toBe(401);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Password is incorrect.");

      const userAfter = (await sql`
        SELECT account_status, deletion_requested_at FROM users WHERE id = ${member}
      `) as Array<{ account_status: string; deletion_requested_at: string | null }>;
      expect(userAfter[0].account_status).toBe("active");
      expect(userAfter[0].deletion_requested_at).toBeNull();

      const dataRequests = await sql`SELECT 1 FROM data_requests WHERE user_id = ${member}`;
      expect(dataRequests).toHaveLength(0);

      const eventAfter = (await sql`
        SELECT status FROM events WHERE id = ${hostedEvent}::uuid
      `) as Array<{ status: string }>;
      expect(eventAfter[0].status).toBe("published");

      const sessions = await sql`SELECT 1 FROM sessions WHERE user_id = ${member}`;
      expect(sessions).toHaveLength(1);

      const mobileSessions = (await sql`
        SELECT revoked_at FROM mobile_sessions WHERE user_id = ${member}
      `) as Array<{ revoked_at: string | null }>;
      expect(mobileSessions[0].revoked_at).toBeNull();

      const tokenReasons = (await sql`
        SELECT invalidated_reason FROM email_verification_tokens WHERE user_id = ${member}
        UNION ALL
        SELECT invalidated_reason FROM password_reset_tokens WHERE user_id = ${member}
      `) as Array<{ invalidated_reason: string | null }>;
      expect(tokenReasons).toHaveLength(2);
      for (const row of tokenReasons) expect(row.invalidated_reason).toBeNull();

      // The session still authenticates: the SAME token immediately performs a
      // real deletion when the correct password is supplied (no hidden lockout).
      const retry = await POST(deletionRequest(PASSWORD));
      expect(retry.status).toBe(200);
      const retryBody = (await retry.json()) as { requestId: string };
      createdDataRequestIds.push(retryBody.requestId);
    },
    180_000,
  );
});
