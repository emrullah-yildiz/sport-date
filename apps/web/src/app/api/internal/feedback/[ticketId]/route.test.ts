import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addTeamFeedbackReply: vi.fn(),
  setFeedbackStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback", () => ({
  addTeamFeedbackReply: mocks.addTeamFeedbackReply,
  setFeedbackStatus: mocks.setFeedbackStatus,
}));

import { POST } from "./route";

const TICKET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGINAL = process.env.FEEDBACK_AGENT_SECRET;

function post(body: unknown, auth?: string, ticketId = TICKET_ID): Parameters<typeof POST> {
  const request = new Request(`https://keepitup.example/api/internal/feedback/${ticketId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ ticketId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FEEDBACK_AGENT_SECRET = "agent-secret";
  mocks.addTeamFeedbackReply.mockResolvedValue({ id: "t1", authorKind: "team", authorLabel: "KeepItUp team", body: "hi", createdAt: "x" });
  mocks.setFeedbackStatus.mockResolvedValue({ id: TICKET_ID, status: "planned" });
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FEEDBACK_AGENT_SECRET;
  else process.env.FEEDBACK_AGENT_SECRET = ORIGINAL;
});

describe("POST /api/internal/feedback/[ticketId] — protected team write path", () => {
  it("posts a team reply for a correct secret", async () => {
    const response = await POST(...post({ reply: "We shipped a fix." }, "Bearer agent-secret"));
    expect(response.status).toBe(200);
    expect(mocks.addTeamFeedbackReply).toHaveBeenCalledWith(TICKET_ID, null, "We shipped a fix.");
  });

  it("changes status for a correct secret", async () => {
    const response = await POST(...post({ status: "planned" }, "Bearer agent-secret"));
    expect(response.status).toBe(200);
    expect(mocks.setFeedbackStatus).toHaveBeenCalledWith(TICKET_ID, "planned");
  });

  it("rejects a member/unauthenticated caller (401) and never writes — members can't post as team", async () => {
    expect((await POST(...post({ reply: "hi" }))).status).toBe(401); // no bearer at all
    expect((await POST(...post({ reply: "hi" }, "Bearer wrong"))).status).toBe(401);
    expect(mocks.addTeamFeedbackReply).not.toHaveBeenCalled();
    expect(mocks.setFeedbackStatus).not.toHaveBeenCalled();
  });

  it("fails closed (401) when FEEDBACK_AGENT_SECRET is unset, even with a bearer", async () => {
    delete process.env.FEEDBACK_AGENT_SECRET;
    expect((await POST(...post({ reply: "hi" }, "Bearer anything"))).status).toBe(401);
    expect(mocks.addTeamFeedbackReply).not.toHaveBeenCalled();
  });

  it("rejects an unknown status and an empty payload", async () => {
    expect((await POST(...post({ status: "made_up" }, "Bearer agent-secret"))).status).toBe(400);
    expect((await POST(...post({}, "Bearer agent-secret"))).status).toBe(400);
  });
});
