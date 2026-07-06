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

// The map-picker reverse geocode (CX-20260706) must follow the EXACT same
// data-minimization contract as the forward /api/locations/search proxy:
// authenticated, rate-limited, no-store, and NOTHING about the member (identity,
// cookies, client IP) ever reaches the geocoder.
describe("authenticated reverse geocode for the host map picker", () => {
  const url = (latitude: string, longitude: string) =>
    `https://sportdate.example/api/locations/reverse?latitude=${latitude}&longitude=${longitude}`;

  it("does not contact the geocoder for an unauthenticated visitor", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const provider = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request(url("44.4268", "26.1025")));
    expect(response.status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
  });

  it("stops at the rate limit without contacting the geocoder", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    const limited = Response.json({ error: "Too many map look-ups." }, { status: 429 });
    vi.mocked(enforceRateLimit).mockResolvedValue(limited as never);
    const provider = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request(url("44.4268", "26.1025")));
    expect(response.status).toBe(429);
    expect(provider).not.toHaveBeenCalled();
    // Same dual user+IP fixed-window rules as the forward search.
    const rules = vi.mocked(enforceRateLimit).mock.calls[0][1];
    expect(rules.map((rule) => rule.name).sort()).toEqual(["ip", "user"]);
  });

  it("rejects missing or out-of-range coordinates before any provider call", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    const provider = vi.spyOn(globalThis, "fetch");
    for (const [latitude, longitude] of [["", ""], ["91", "26.1"], ["44.4", "181"], ["not-a-number", "26.1"]]) {
      const response = await GET(new Request(url(latitude, longitude)));
      expect(response.status).toBe(400);
    }
    expect(provider).not.toHaveBeenCalled();
  });

  it("forwards ONLY the pin coordinates — no identity, cookies, or client IP — and never caches", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ features: [] }), { status: 200 }));

    const inbound = new Request(url("44.42683719482421", "26.10251283645629"), {
      headers: { cookie: "session=super-secret", "x-forwarded-for": "203.0.113.7", authorization: "Bearer nope" },
    });
    const response = await GET(inbound);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");

    const [providerUrl, init] = provider.mock.calls[0] as [URL, RequestInit];
    // Coordinates only, normalised to the canonical pin precision (6 decimals).
    expect(providerUrl.toString()).toContain("lat=44.426837");
    expect(providerUrl.toString()).toContain("lon=26.102513");
    expect(providerUrl.toString()).not.toContain("member-1");
    // The outbound headers carry nothing from the inbound request.
    const outboundHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>).map(([key, value]) => [key.toLowerCase(), value]));
    expect(Object.keys(outboundHeaders).sort()).toEqual(["accept", "user-agent"]);
    expect(JSON.stringify(outboundHeaders)).not.toContain("super-secret");
    expect(JSON.stringify(outboundHeaders)).not.toContain("203.0.113.7");
    expect(JSON.stringify(outboundHeaders)).not.toContain("member-1");
    expect(init.cache).toBe("no-store");
  });

  it("returns a data-minimized suggestion and drops provider extras", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ features: [{
      geometry: { coordinates: [26.1025, 44.4268] },
      properties: { osm_type: "W", osm_id: 42, name: "Club", street: "Strada Sportului", housenumber: "12", city: "București", countrycode: "RO", extra: { phone: "must-not-leak" } },
    }] }), { status: 200 }));

    const response = await GET(new Request(url("44.4268", "26.1025")));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestion).toMatchObject({ address: "Strada Sportului 12", city: "București", countryCode: "RO" });
    expect(JSON.stringify(body)).not.toContain("phone");
  });

  it("returns suggestion: null for a spot that resolves to nothing addressable", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ features: [] }), { status: 200 }));
    const response = await GET(new Request(url("44.4268", "26.1025")));
    expect(response.status).toBe(200);
    expect((await response.json()).suggestion).toBeNull();
  });

  it("degrades to a 503 (not a crash) when the geocoder is unavailable — the pin itself is already set client-side", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "member-1" } as never);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const response = await GET(new Request(url("44.4268", "26.1025")));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.suggestion).toBeUndefined();
    expect(body.error).toMatch(/unavailable/i);
  });
});
