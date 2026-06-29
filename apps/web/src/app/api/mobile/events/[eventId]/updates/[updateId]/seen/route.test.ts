import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mobile-session", () => ({
  getMobileSession: vi.fn(),
}));
vi.mock("@/lib/event-update-receipts", () => ({
  markEventUpdateSeen: vi.fn(),
}));

let POST: typeof import("./route").POST;
let getMobileSession: typeof import("@/lib/mobile-session").getMobileSession;
let markEventUpdateSeen: typeof import("@/lib/event-update-receipts").markEventUpdateSeen;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ getMobileSession } = await import("@/lib/mobile-session"));
  ({ markEventUpdateSeen } = await import("@/lib/event-update-receipts"));
}, 40000);

describe("mobile event update seen route", () => {
  it("marks an event update as seen for an authenticated mobile participant", async () => {
    vi.mocked(getMobileSession).mockResolvedValue({ user: { id: "7" } } as never);
    vi.mocked(markEventUpdateSeen).mockResolvedValue(true as never);

    const response = await POST(
      new Request("https://sportdate.example/api/mobile/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/updates/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/seen", {
        method: "POST",
        headers: { "X-Sport-Date-Client": "mobile-v1" },
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", updateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }) },
    );

    expect(markEventUpdateSeen).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "7",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: "seen" });
  });
});
