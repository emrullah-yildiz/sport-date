import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createResearchResponse: vi.fn(),
  extendResearchResponse: vi.fn(),
  createResearchContact: vi.fn(),
  enforceRateLimit: vi.fn(),
  researchSurveyRateLimitRules: vi.fn(() => []),
  isTrustedBrowserMutation: vi.fn(() => true),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/research-responses", () => ({
  createResearchResponse: mocks.createResearchResponse,
  extendResearchResponse: mocks.extendResearchResponse,
  createResearchContact: mocks.createResearchContact,
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  researchSurveyRateLimitRules: mocks.researchSurveyRateLimitRules,
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));

import { NextResponse } from "next/server";

import { POST } from "./route";

const RESPONSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function post(body: unknown): Request {
  return new Request("https://keepitup.example/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://keepitup.example" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.enforceRateLimit.mockResolvedValue(null);
});

describe("POST /api/research — anonymous answers", () => {
  it("stores sanitized answers and returns the response id", async () => {
    mocks.createResearchResponse.mockResolvedValue(RESPONSE_ID);
    const response = await POST(post({
      action: "answers",
      answers: { q1: "About weekly", q2: ["Went alone", "Not an option"], junk: "dropped" },
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ responseId: RESPONSE_ID });
    // Only the sanitized allowlist reaches storage — junk and invalid options gone.
    expect(mocks.createResearchResponse).toHaveBeenCalledWith({ q1: "About weekly", q2: ["Went alone"] });
  });

  it("accepts a fully-skipped submission (every question is skippable)", async () => {
    mocks.createResearchResponse.mockResolvedValue(RESPONSE_ID);
    const response = await POST(post({ action: "answers", answers: {} }));
    expect(response.status).toBe(201);
    expect(mocks.createResearchResponse).toHaveBeenCalledWith({});
  });

  it("rejects a malformed (non-object) answers payload without storing", async () => {
    const response = await POST(post({ action: "answers", answers: "q1=weekly" }));
    expect(response.status).toBe(400);
    expect(mocks.createResearchResponse).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response before touching storage", async () => {
    mocks.enforceRateLimit.mockResolvedValue(
      NextResponse.json({ error: "slow down" }, { status: 429, headers: { "Retry-After": "60" } }),
    );
    const response = await POST(post({ action: "answers", answers: {} }));
    expect(response.status).toBe(429);
    expect(mocks.createResearchResponse).not.toHaveBeenCalled();
    expect(mocks.createResearchContact).not.toHaveBeenCalled();
  });

  it("rejects cross-site submissions before rate limiting or storage", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const response = await POST(post({ action: "answers", answers: {} }));
    expect(response.status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.createResearchResponse).not.toHaveBeenCalled();
  });
});

describe("POST /api/research — optional Survey 2 extension", () => {
  it("extends an existing response with sanitized Q10–Q15 answers", async () => {
    mocks.extendResearchResponse.mockResolvedValue(true);
    const response = await POST(post({
      action: "extend",
      responseId: RESPONSE_ID,
      answers: { q13: "€5-9", q11: { time: 5, bogus: 3 } },
    }));
    expect(response.status).toBe(200);
    expect(mocks.extendResearchResponse).toHaveBeenCalledWith(RESPONSE_ID, { q13: "€5-9", q11: { time: 5 } });
  });

  it("404s when the response is unknown or already extended", async () => {
    mocks.extendResearchResponse.mockResolvedValue(false);
    const response = await POST(post({ action: "extend", responseId: RESPONSE_ID, answers: {} }));
    expect(response.status).toBe(404);
  });
});

describe("POST /api/research — contact requires explicit consent", () => {
  it("refuses to store a contact without the consent checkbox", async () => {
    for (const consent of [false, undefined, "true", 1]) {
      const response = await POST(post({ action: "contact", contact: "ana@example.com", consent }));
      expect(response.status).toBe(400);
    }
    expect(mocks.createResearchContact).not.toHaveBeenCalled();
  });

  it("stores a consented contact — and only the contact string, never a response id", async () => {
    mocks.createResearchContact.mockResolvedValue(undefined);
    const response = await POST(post({
      action: "contact",
      contact: "  ana@example.com ",
      consent: true,
      responseId: RESPONSE_ID, // a client bug/mischief tries to link — must be ignored
    }));
    expect(response.status).toBe(201);
    // Schema-level separation starts here: the storage call has no second
    // argument to carry an id, so contact and answers cannot be joined.
    expect(mocks.createResearchContact).toHaveBeenCalledWith("ana@example.com");
    expect(mocks.createResearchContact.mock.calls[0]).toHaveLength(1);
  });

  it("rejects an unusably short contact", async () => {
    const response = await POST(post({ action: "contact", contact: "ab", consent: true }));
    expect(response.status).toBe(400);
    expect(mocks.createResearchContact).not.toHaveBeenCalled();
  });
});

describe("POST /api/research — unknown input", () => {
  it("rejects an unknown action and non-JSON bodies", async () => {
    expect((await POST(post({ action: "exfiltrate" }))).status).toBe(400);
    const response = await POST(new Request("https://keepitup.example/api/research", {
      method: "POST",
      headers: { origin: "https://keepitup.example" },
      body: "not json",
    }));
    expect(response.status).toBe(400);
  });
});
