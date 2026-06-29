import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/event-update-receipts", () => ({
  markEventUpdateSeen: vi.fn(),
}));

let POST: typeof import("./route").POST;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let markEventUpdateSeen: typeof import("@/lib/event-update-receipts").markEventUpdateSeen;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ markEventUpdateSeen } = await import("@/lib/event-update-receipts"));
}, 60000);

describe("browser event update seen route", () => {
  it("marks an event update as seen for an accepted participant", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(markEventUpdateSeen).mockResolvedValue(true as never);

    const response = await POST(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/updates/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/seen", {
        method: "POST",
        headers: { Origin: "https://sportdate.example" },
      }),
      {
        params: Promise.resolve({
          eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          updateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      },
    );

    expect(markEventUpdateSeen).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: "seen" });
  });
});
