import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLatestStandupReport: vi.fn(),
  publishStandupReport: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
// Keep the pure validator real; only stub the DB-touching functions.
vi.mock("@/lib/standup-reports", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/standup-reports")>();
  return { ...actual, getLatestStandupReport: mocks.getLatestStandupReport, publishStandupReport: mocks.publishStandupReport };
});

import { GET, POST } from "./route";

const ORIGINAL_STANDUP = process.env.STANDUP_AGENT_SECRET;
const ORIGINAL_SOCIAL = process.env.SOCIAL_AGENT_SECRET;

const REPORT = {
  day: "2026-07-07",
  generatedAt: "2026-07-07T04:05:00Z",
  headline: "Standup now publishes itself.",
  summary: ["The routine POSTs its report; HQ renders it instantly."],
  agents: [{ name: "standup-scribe", status: "keep", metric: "report live by 06:15", note: "self-delivering now" }],
  directions: [
    { id: "SD-20260707-secret", priority: "high", title: "Set the secret", detail: "Add STANDUP_AGENT_SECRET.", recommendation: "Approve." },
  ],
};

function post(body: unknown, auth?: string) {
  return new Request("https://keepitup.example/api/standup/report", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STANDUP_AGENT_SECRET = "standup-secret";
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  mocks.getLatestStandupReport.mockResolvedValue(REPORT);
  mocks.publishStandupReport.mockResolvedValue(undefined);
});
afterEach(() => {
  if (ORIGINAL_STANDUP === undefined) delete process.env.STANDUP_AGENT_SECRET; else process.env.STANDUP_AGENT_SECRET = ORIGINAL_STANDUP;
  if (ORIGINAL_SOCIAL === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SOCIAL;
});

describe("GET /api/standup/report — public latest report", () => {
  it("200s with the latest report", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ report: REPORT });
  });

  it("404s before the first publish (hq.html falls back to the static file)", async () => {
    mocks.getLatestStandupReport.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });
});

describe("POST /api/standup/report — internal publish", () => {
  it("publishes for the standup secret", async () => {
    const res = await POST(post(REPORT, "Bearer standup-secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, day: REPORT.day });
    expect(mocks.publishStandupReport).toHaveBeenCalledWith(REPORT, "standup-routine");
  });

  it("also accepts the social/CEO-loop secret (manual fallback path)", async () => {
    expect((await POST(post(REPORT, "Bearer social-secret"))).status).toBe(200);
  });

  it("401s without auth or with a wrong secret — never publishes", async () => {
    expect((await POST(post(REPORT))).status).toBe(401);
    expect((await POST(post(REPORT, "Bearer wrong"))).status).toBe(401);
    expect(mocks.publishStandupReport).not.toHaveBeenCalled();
  });

  it("fails closed when neither secret is set", async () => {
    delete process.env.STANDUP_AGENT_SECRET;
    delete process.env.SOCIAL_AGENT_SECRET;
    expect((await POST(post(REPORT, "Bearer standup-secret"))).status).toBe(401);
    expect(mocks.publishStandupReport).not.toHaveBeenCalled();
  });

  it("400s malformed reports without publishing", async () => {
    const auth = "Bearer standup-secret";
    expect((await POST(post({ ...REPORT, day: "07-07-2026" }, auth))).status).toBe(400);
    expect((await POST(post({ ...REPORT, headline: "" }, auth))).status).toBe(400);
    expect((await POST(post({ ...REPORT, summary: [] }, auth))).status).toBe(400);
    expect((await POST(post({ ...REPORT, agents: [{ name: "x", status: "great", metric: "m", note: "n" }] }, auth))).status).toBe(400);
    expect((await POST(post({ ...REPORT, directions: [{ ...REPORT.directions[0], id: "not-a-direction" }] }, auth))).status).toBe(400);
    expect(mocks.publishStandupReport).not.toHaveBeenCalled();
  });

  it("accepts a quiet day: empty agents and directions", async () => {
    const res = await POST(post({ ...REPORT, agents: [], directions: [] }, "Bearer standup-secret"));
    expect(res.status).toBe(200);
  });
});
