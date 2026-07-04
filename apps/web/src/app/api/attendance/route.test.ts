import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmAttendanceByToken: vi.fn(),
  cancelAttendanceByToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/attendance-confirmations", () => ({
  confirmAttendanceByToken: mocks.confirmAttendanceByToken,
  cancelAttendanceByToken: mocks.cancelAttendanceByToken,
}));

import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { POST } from "./route";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOKEN = "a-raw-token-value-abcdefghij1234567890";

function post(fields: Record<string, string>, json = true): Request {
  return new Request("https://keepitup.example/api/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(json ? { Accept: "application/json" } : {}),
    },
    body: new URLSearchParams(fields).toString(),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetRateLimitStoreForTests();
});

describe("POST /api/attendance — tokenized confirm/cancel (no login)", () => {
  it("confirms via a valid token and returns JSON to the enhanced client", async () => {
    mocks.confirmAttendanceByToken.mockResolvedValue("confirmed");
    const response = await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: "confirmed" });
    expect(mocks.confirmAttendanceByToken).toHaveBeenCalledWith(EVENT_ID, TOKEN, expect.any(Date));
  });

  it("cancels via a valid token", async () => {
    mocks.cancelAttendanceByToken.mockResolvedValue("cancelled");
    const response = await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "cancel" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: "cancelled" });
  });

  it("maps an expired token to 410 and invalid/already-cancelled to 404", async () => {
    mocks.confirmAttendanceByToken.mockResolvedValue("expired");
    expect((await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }))).status).toBe(410);
    mocks.confirmAttendanceByToken.mockResolvedValue("invalid");
    expect((await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }))).status).toBe(404);
  });

  it("redirects (303) to the landing page for a no-JS form submit", async () => {
    mocks.confirmAttendanceByToken.mockResolvedValue("confirmed");
    const response = await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }, false));
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain(`/e/${EVENT_ID}/confirm`);
    expect(location).toContain("state=confirmed");
  });

  it("rate-limits repeated actions on the same token and returns 429 with Retry-After (CX-20260704 item 2)", async () => {
    mocks.confirmAttendanceByToken.mockResolvedValue("confirmed");
    // The per-token limit is 10/hour; the 11th action in the window is blocked.
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }))).status).toBe(200);
    }
    const limited = await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "confirm" }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    // A blocked request never reaches the DB action for that 11th attempt.
    expect(mocks.confirmAttendanceByToken).toHaveBeenCalledTimes(10);
  });

  it("rejects a malformed event id, short token, or bad action without acting", async () => {
    expect((await POST(post({ eventId: "nope", token: TOKEN, action: "confirm" }))).status).toBe(400);
    expect((await POST(post({ eventId: EVENT_ID, token: "short", action: "confirm" }))).status).toBe(400);
    expect((await POST(post({ eventId: EVENT_ID, token: TOKEN, action: "sabotage" }))).status).toBe(400);
    expect(mocks.confirmAttendanceByToken).not.toHaveBeenCalled();
    expect(mocks.cancelAttendanceByToken).not.toHaveBeenCalled();
  });
});
