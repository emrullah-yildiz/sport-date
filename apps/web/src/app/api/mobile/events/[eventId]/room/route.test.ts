import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mobile-session", () => ({
  getMobileSession: vi.fn(),
}));
vi.mock("@/lib/events", () => ({
  getEventRoom: vi.fn(),
  getHostJoinRequests: vi.fn(),
}));

let GET: typeof import("./route").GET;
let getMobileSession: typeof import("@/lib/mobile-session").getMobileSession;
let getEventRoom: typeof import("@/lib/events").getEventRoom;
let getHostJoinRequests: typeof import("@/lib/events").getHostJoinRequests;

beforeAll(async () => {
  ({ GET } = await import("./route"));
  ({ getMobileSession } = await import("@/lib/mobile-session"));
  ({ getEventRoom, getHostJoinRequests } = await import("@/lib/events"));
}, 40000);

describe("mobile event room route", () => {
  it("returns the shared room update history for an accepted participant", async () => {
    vi.mocked(getMobileSession).mockResolvedValue({ user: { id: "7" } } as never);
    vi.mocked(getEventRoom).mockResolvedValue({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Sunset tennis",
      sport: "Tennis",
      startsAt: "2026-07-10T17:00:00.000Z",
      timeZone: "Europe/Bucharest",
      hasEnded: false,
      venueName: "Court 2",
      address: "Exact address",
      instructions: "Ask for the evening group.",
      isHost: false,
      viewerRequest: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "accepted" },
      host: { userId: "11", firstName: "Mira" },
      reflection: null,
      latestUpdateId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      viewerHasSeenLatestUpdate: false,
      updates: [{
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        severity: "critical",
        changedFields: ["startsAt", "privateLocation", "arrivalInstructions"],
        summary: "start time, exact venue, and arrival instructions updated by the host.",
        createdAt: "2026-07-08T10:00:00.000Z",
      }],
      participants: [{ userId: "7", firstName: "Alex", skillLevel: "intermediate", seenLatestUpdate: false }],
    } as never);
    vi.mocked(getHostJoinRequests).mockResolvedValue([] as never);

    const response = await GET(
      new Request("https://sportdate.example/api/mobile/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room"),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      room: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        viewerUserId: "7",
        latestUpdateId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        viewerHasSeenLatestUpdate: false,
        updates: [{
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          severity: "critical",
          changedFields: ["startsAt", "privateLocation", "arrivalInstructions"],
          summary: "start time, exact venue, and arrival instructions updated by the host.",
        }],
      },
    });
    expect(getHostJoinRequests).not.toHaveBeenCalled();
  });
});
