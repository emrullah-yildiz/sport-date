import { describe, expect, it } from "vitest";

import { cleanupExpiredSessionResidue } from "./session-cleanup.mjs";

describe("session cleanup", () => {
  it("reports expired residue in dry-run mode without delete statements", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ text: strings.join("?"), values });
      return [{ browser_sessions: "2", mobile_sessions: 3, refresh_token_history: "4" }];
    };

    const result = await cleanupExpiredSessionResidue(sql, {
      now: new Date("2026-06-29T12:00:00.000Z"),
      dryRun: true,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain("SELECT COUNT(*)::int AS count");
    expect(calls[0].text).not.toContain("DELETE FROM");
    expect(result).toEqual({
      mode: "dry-run",
      runAt: "2026-06-29T12:00:00.000Z",
      browserSessions: 2,
      mobileSessions: 3,
      refreshTokenHistory: 4,
    });
  });

  it("deletes expired residue and reports the removed counts", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ text: strings.join("?"), values });
      return [{ browser_sessions: 1, mobile_sessions: "5", refresh_token_history: 7 }];
    };

    const result = await cleanupExpiredSessionResidue(sql, {
      now: new Date("2026-06-29T12:00:00.000Z"),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain("DELETE FROM mobile_refresh_token_history");
    expect(calls[0].text).toContain("DELETE FROM mobile_sessions");
    expect(calls[0].text).toContain("DELETE FROM sessions");
    expect(result).toEqual({
      mode: "delete",
      runAt: "2026-06-29T12:00:00.000Z",
      browserSessions: 1,
      mobileSessions: 5,
      refreshTokenHistory: 7,
    });
  });
});
