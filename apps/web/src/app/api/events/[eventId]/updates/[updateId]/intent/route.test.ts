import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/event-update-intents", () => ({
  saveEventUpdateAttendanceIntent: vi.fn(),
}));

let POST: typeof import("./route").POST;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let saveEventUpdateAttendanceIntent: typeof import("@/lib/event-update-intents").saveEventUpdateAttendanceIntent;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ saveEventUpdateAttendanceIntent } = await import("@/lib/event-update-intents"));
}, 60000);

describe("browser event update attendance intent route", () => {
  it("saves an attendance response for an accepted participant", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(saveEventUpdateAttendanceIntent).mockResolvedValue(true as never);

    const response = await POST(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/updates/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://sportdate.example" },
        body: JSON.stringify({ response: "still_in" }),
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", updateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }) },
    );

    expect(saveEventUpdateAttendanceIntent).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      "still_in",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, response: "still_in" });
  });
});
