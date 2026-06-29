import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDatabase: vi.fn(),
}));

let DELETE: typeof import("./route").DELETE;
let PATCH: typeof import("./route").PATCH;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getDatabase: typeof import("@/lib/db").getDatabase;

beforeAll(async () => {
  ({ PATCH } = await import("./route"));
  ({ DELETE } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getDatabase } = await import("@/lib/db"));
}, 40000);

describe("browser host event cancellation route", () => {
  it("updates a host-owned event before it starts", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    const sql = Object.assign(
      vi.fn(),
      {
        transaction: vi.fn().mockResolvedValue([
          [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
          [{ event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
        ]),
      },
    );
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await PATCH(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "https://sportdate.example" },
        body: JSON.stringify({
          sport: "Tennis",
          title: "A calmer evening rally",
          description: "A relaxed rally with room for newcomers and a clearer arrival plan.",
          startsAt: "2026-07-10T17:00:00.000Z",
          timeZone: "Europe/Bucharest",
          durationMinutes: 90,
          capacity: 4,
          language: "English",
          experienceLevels: ["beginner", "intermediate"],
          participantAgeRange: { minimum: 24, maximum: 38 },
          location: {
            public: { city: "Bucharest", countryCode: "RO", areaLabel: "Floreasca", approximateLatitude: null, approximateLongitude: null },
            private: { venueName: "Court 2", address: "Exact address", instructions: "Ask for the evening group.", latitude: null, longitude: null },
          },
        }),
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      message: "Event updated.",
    });
  });

  it("cancels a host-owned event", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    const sql = vi.fn().mockResolvedValue([{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        method: "DELETE",
        headers: { Origin: "https://sportdate.example" },
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "cancelled",
      message: "Event cancelled. Active requests, seats, and room access are now closed.",
    });
  });

  it("rejects cross-site cancellation attempts", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { method: "DELETE" }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Cross-site request rejected." });
  });
});
