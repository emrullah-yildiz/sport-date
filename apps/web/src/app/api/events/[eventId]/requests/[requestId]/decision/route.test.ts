import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/join-requests", () => ({
  decideEventJoinRequest: vi.fn(),
}));

let POST: typeof import("./route").POST;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let decideEventJoinRequest: typeof import("@/lib/join-requests").decideEventJoinRequest;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ decideEventJoinRequest } = await import("@/lib/join-requests"));
});

describe("browser host decision route", () => {
  it("returns an explicit quiet decline message when the third skip closes the request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(decideEventJoinRequest).mockResolvedValue({ status: "declined", skipCount: 3 } as never);

    const response = await POST(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://sportdate.example" },
        body: JSON.stringify({ action: "skip" }),
      }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      status: "declined",
      skipCount: 3,
      message: "Third skip reached. The request is now quietly declined.",
    });
  });
});
