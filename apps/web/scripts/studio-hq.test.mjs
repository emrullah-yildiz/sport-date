import { describe, expect, it, vi } from "vitest";
import { publishReport, readDecisions, reportCredential, HQ_ORIGIN } from "./studio-hq.mjs";

const report = { day: "2026-09-14", generatedAt: "2026-09-13T22:00:00Z", headline: "A truthful test report", summary: ["No member data."], agents: [], directions: [] };

describe("HQ reporting helper authorization and truthfulness", () => {
  it("fails closed with no publishing credential and sends nothing", async () => {
    const request = vi.fn();
    await expect(publishReport(report, { env: {}, fetchImpl: request })).rejects.toThrow("unavailable");
    expect(request).not.toHaveBeenCalled();
    expect(reportCredential({})).toBeNull();
  });
  it("rejects invalid report envelopes before network access", async () => {
    const request = vi.fn();
    await expect(publishReport({}, { env: { STANDUP_AGENT_SECRET: "test-only" }, fetchImpl: request })).rejects.toThrow("Invalid report");
    expect(request).not.toHaveBeenCalled();
  });
  it("publishes only to the fixed HQ endpoint, refuses redirects and verifies the result", async () => {
    const request = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, json: async () => ({ report }) });
    await expect(publishReport(report, { env: { STANDUP_AGENT_SECRET: "test-only" }, fetchImpl: request })).resolves.toEqual({ live: true, day: report.day, generatedAt: report.generatedAt });
    expect(request.mock.calls[0][0]).toBe(`${HQ_ORIGIN}/api/standup/report`);
    expect(request.mock.calls[0][1].redirect).toBe("error");
    expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer test-only");
    expect(request.mock.calls[1][1].headers).toBeUndefined();
  });
  it("never calls a successful POST a verified live result when readback differs", async () => {
    const request = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, json: async () => ({ report: { ...report, headline: "Old report" } }) });
    await expect(publishReport(report, { env: { SOCIAL_AGENT_SECRET: "test-only" }, fetchImpl: request })).rejects.toThrow("differs");
  });
  it("does not print server responses or credentials on denial", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(publishReport(report, { env: { SOCIAL_AGENT_SECRET: "test-only" }, fetchImpl: request })).rejects.toThrow("HTTP 401");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("cannot read owner decisions using the report-only credential", async () => {
    const request = vi.fn();
    await expect(readDecisions({ env: { STANDUP_AGENT_SECRET: "test-only" }, fetchImpl: request })).resolves.toMatchObject({ available: false, decisions: [] });
    expect(request).not.toHaveBeenCalled();
  });
});
