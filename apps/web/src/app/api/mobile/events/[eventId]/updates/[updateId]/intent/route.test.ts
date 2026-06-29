import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mobile-session", () => ({
  getMobileSession: vi.fn(),
}));
vi.mock("@/lib/event-update-intents", () => ({
  saveEventUpdateAttendanceIntent: vi.fn(),
}));

let POST: typeof import("./route").POST;
let getMobileSession: typeof import("@/lib/mobile-session").getMobileSession;
let saveEventUpdateAttendanceIntent: typeof import("@/lib/event-update-intents").saveEventUpdateAttendanceIntent;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ getMobileSession } = await import("@/lib/mobile-session"));
  ({ saveEventUpdateAttendanceIntent } = await import("@/lib/event-update-intents"));
}, 40000);

describe("mobile event update attendance intent route", () => {
  it("saves an attendance response for an authenticated mobile participant", async () => {
    vi.mocked(getMobileSession).mockResolvedValue({ user: { id: "7" } } as never);
    vi.mocked(saveEventUpdateAttendanceIntent).mockResolvedValue(true as never);

    const response = await POST(
      new Request("https://sportdate.example/api/mobile/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/updates/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sport-Date-Client": "mobile-v1" },
        body: JSON.stringify({ response: "cannot_make" }),
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", updateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }) },
    );

    expect(saveEventUpdateAttendanceIntent).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "7",
      "cannot_make",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, response: "cannot_make" });
  });
});
