import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/join-requests", () => ({
  cancelEventJoinRequest: vi.fn(),
}));

let DELETE: typeof import("./route").DELETE;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let cancelEventJoinRequest: typeof import("@/lib/join-requests").cancelEventJoinRequest;

beforeAll(async () => {
  ({ DELETE } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ cancelEventJoinRequest } = await import("@/lib/join-requests"));
}, 60000);

describe("browser join request cancellation route", () => {
  it("cancels an accepted place for the authenticated requester", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        method: "DELETE",
        headers: { Origin: "https://sportdate.example" },
      }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      null,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: "cancelled" });
  });

  it("passes an optional private graceful-exit reason through to the data layer", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        method: "DELETE",
        headers: { Origin: "https://sportdate.example", "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "felt_unsafe", note: "someone kept following me" }),
      }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      { reason: "felt_unsafe", note: "someone kept following me" },
    );
    expect(response.status).toBe(200);
  });

  it("still leaves when the request body is missing or malformed (exit reason is optional)", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        method: "DELETE",
        headers: { Origin: "https://sportdate.example", "Content-Type": "application/json" },
        body: "{ this is not valid json",
      }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      null,
    );
    expect(response.status).toBe(200);
  });

  it("rejects the request when the browser origin is not trusted", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/requests/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", { method: "DELETE" }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Cross-site request rejected." });
  });
});
