import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn(), getRequestIp: vi.fn(() => "test-ip") }));

let GET: typeof import("./route").GET;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let enforceRateLimit: typeof import("@/lib/rate-limit").enforceRateLimit;

beforeAll(async () => {
  ({ GET } = await import("./route"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ enforceRateLimit } = await import("@/lib/rate-limit"));
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(enforceRateLimit).mockResolvedValue(null);
});

describe("authenticated location search", () => {
  it("does not contact the geocoder for an unauthenticated visitor", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const provider = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request("https://sportdate.example/api/locations/search?q=tennis"));
    expect(response.status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
  });

  it("returns a data-minimized selected-pin candidate and applies the country filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ features: [{
      geometry: { coordinates: [26.1025, 44.4268] },
      properties: { osm_type: "W", osm_id: 42, name: "Club", street: "Strada Sportului", housenumber: "12", city: "București", countrycode: "RO", extra: { phone: "must-not-leak" } },
    }] }), { status: 200 }));

    const response = await GET(new Request("https://sportdate.example/api/locations/search?q=tennis%20club&countryCode=RO"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions[0]).toMatchObject({ address: "Strada Sportului 12", latitude: 44.4268, longitude: 26.1025 });
    expect(JSON.stringify(body)).not.toContain("phone");
    expect(vi.mocked(globalThis.fetch).mock.calls[0][0].toString()).toContain("countrycode=RO");
  });
});
