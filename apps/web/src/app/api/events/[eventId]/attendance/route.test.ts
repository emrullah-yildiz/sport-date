import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmAttendanceByMember: vi.fn(),
  cancelAttendanceByMember: vi.fn(),
  getCurrentUser: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/attendance-confirmations", () => ({
  confirmAttendanceByMember: mocks.confirmAttendanceByMember,
  cancelAttendanceByMember: mocks.cancelAttendanceByMember,
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST } from "./route";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function post(body: unknown, eventId = EVENT_ID): Parameters<typeof POST> {
  const request = new Request(`https://keepitup.example/api/events/${eventId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://keepitup.example" },
    body: JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ eventId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getCurrentUser.mockResolvedValue({ id: "202" });
});

describe("POST /api/events/[eventId]/attendance — in-app confirm/cancel", () => {
  it("confirms the viewer's own attendance", async () => {
    mocks.confirmAttendanceByMember.mockResolvedValue("confirmed");
    const response = await POST(...post({ action: "confirm" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: "confirmed" });
    expect(mocks.confirmAttendanceByMember).toHaveBeenCalledWith(EVENT_ID, "202", expect.any(Date));
  });

  it("cancels the viewer's own attendance (releases the seat)", async () => {
    mocks.cancelAttendanceByMember.mockResolvedValue("cancelled");
    const response = await POST(...post({ action: "cancel" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: "cancelled" });
  });

  it("409s when the prompt is no longer available (invalid/expired)", async () => {
    mocks.confirmAttendanceByMember.mockResolvedValue("invalid");
    expect((await POST(...post({ action: "confirm" }))).status).toBe(409);
  });

  it("rejects a cross-site request and an unauthenticated caller", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    expect((await POST(...post({ action: "confirm" }))).status).toBe(403);
    mocks.isTrustedBrowserMutation.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(...post({ action: "confirm" }))).status).toBe(401);
    expect(mocks.confirmAttendanceByMember).not.toHaveBeenCalled();
  });

  it("rejects an unknown action", async () => {
    expect((await POST(...post({ action: "explode" }))).status).toBe(400);
  });
});
