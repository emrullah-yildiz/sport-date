import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listOpenFeedbackForAgent: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback", () => ({ listOpenFeedbackForAgent: mocks.listOpenFeedbackForAgent }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));

import { GET } from "./route";

const ORIGINAL = process.env.FEEDBACK_AGENT_SECRET;

function req(auth?: string): Request {
  return new Request("https://keepitup.example/api/internal/feedback", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FEEDBACK_AGENT_SECRET = "agent-secret";
  mocks.listOpenFeedbackForAgent.mockResolvedValue([]);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FEEDBACK_AGENT_SECRET;
  else process.env.FEEDBACK_AGENT_SECRET = ORIGINAL;
});

describe("GET /api/internal/feedback — protected list", () => {
  it("lists open feedback for a correct secret", async () => {
    const response = await GET(req("Bearer agent-secret"));
    expect(response.status).toBe(200);
    expect(mocks.listOpenFeedbackForAgent).toHaveBeenCalledOnce();
  });

  it("401s without the secret and never reads (members can't reach it)", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mocks.listOpenFeedbackForAgent).not.toHaveBeenCalled();
  });

  it("fails closed (401) when the secret is unset", async () => {
    delete process.env.FEEDBACK_AGENT_SECRET;
    expect((await GET(req("Bearer anything"))).status).toBe(401);
  });
});
