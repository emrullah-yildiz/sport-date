import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

let POST: typeof import("./route").POST;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getDatabase: typeof import("@/lib/db").getDatabase;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getDatabase } = await import("@/lib/db"));
}, 40000);

// A create request that varies only in the precise pin the autocomplete captured.
function createBody(pin: { latitude: unknown; longitude: unknown }) {
  return JSON.stringify({
    sport: "Tennis",
    title: "An easy evening rally",
    description: "A relaxed rally with room for newcomers and a calm arrival plan.",
    startsAt: "2026-07-10T17:00:00.000Z",
    timeZone: "Europe/Bucharest",
    durationMinutes: 90,
    capacity: 4,
    language: "English",
    experienceLevels: ["beginner", "intermediate"],
    participantAgeRange: { minimum: 24, maximum: 38 },
    location: {
      public: { city: "Bucharest", countryCode: "RO", areaLabel: "Floreasca", approximateLatitude: null, approximateLongitude: null },
      private: { venueName: "Court 2", address: "Strada Sportului 12", postalCode: "010101", instructions: "Ask for the evening group.", latitude: pin.latitude, longitude: pin.longitude },
    },
  });
}

function request(body: string) {
  return new Request("https://sportdate.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://sportdate.example" },
    body,
  });
}

describe("POST /api/events — optional geocoded pin (CX-20260704)", () => {
  beforeEach(() => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
  });

  it("stores an accurate pin when the host picked an autocomplete suggestion", async () => {
    const captured: unknown[][] = [];
    const sql = Object.assign(vi.fn(), {
      transaction: vi.fn((build: (t: (s: TemplateStringsArray, ...v: unknown[]) => unknown) => unknown[]) => {
        build((_strings, ...values) => { captured.push(values); return {}; });
        return Promise.resolve([[{ id: "created" }], []]);
      }),
    });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await POST(request(createBody({ latitude: 44.4268, longitude: 26.1025 })));
    expect(response.status).toBe(201);
    // The precise-location INSERT carries the exact coordinates.
    const insertValues = captured[1];
    expect(insertValues).toContain(44.4268);
    expect(insertValues).toContain(26.1025);
  });

  it("still creates the event with NULL coords when no pin was captured (geocoder down / manual entry)", async () => {
    const captured: unknown[][] = [];
    const sql = Object.assign(vi.fn(), {
      transaction: vi.fn((build: (t: (s: TemplateStringsArray, ...v: unknown[]) => unknown) => unknown[]) => {
        build((_strings, ...values) => { captured.push(values); return {}; });
        return Promise.resolve([[{ id: "created" }], []]);
      }),
    });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await POST(request(createBody({ latitude: null, longitude: null })));
    expect(response.status).toBe(201);
    const insertValues = captured[1];
    // Coordinates persisted as NULL — the address is still stored for directions.
    expect(insertValues).toContain(null);
    expect(insertValues).toContain("Strada Sportului 12");
  });

  it("rejects a malformed supplied pin instead of storing garbage coordinates", async () => {
    const sql = Object.assign(vi.fn(), { transaction: vi.fn() });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await POST(request(createBody({ latitude: 999, longitude: 26.1025 })));
    expect(response.status).toBe(400);
    expect(sql.transaction).not.toHaveBeenCalled();
  });
});
