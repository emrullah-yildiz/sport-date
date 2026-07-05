import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicEventInvite } from "@/lib/public-event-invite";

// GET /e/{id}/poster (CX-20260705-event-poster-share): published → 200 PNG,
// unknown/unpublished/cancelled → plain 404 with zero data, and the privacy
// boundary — nothing beyond the allowlisted public payload can reach the
// rendered poster tree, even from a maliciously widened invite object.

const mocks = vi.hoisted(() => ({
  getPublicEventInvite: vi.fn(),
  rendered: [] as Array<{ element: unknown; options: { width?: number; height?: number; emoji?: string } }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/events", () => ({ getPublicEventInvite: mocks.getPublicEventInvite }));
vi.mock("@/lib/auth-email-content", () => ({ resolveAuthEmailOrigin: () => "https://keepitup.social" }));
// Capture what would be rendered instead of running Satori/wasm (and its
// twemoji fetch) in unit tests; the response surface stays a real Response.
vi.mock("next/og", () => ({
  ImageResponse: class extends Response {
    constructor(element: unknown, options: { width?: number; height?: number; emoji?: string; headers?: Record<string, string> }) {
      super("poster-png-bytes", { status: 200, headers: { "content-type": "image/png", ...(options.headers ?? {}) } });
      mocks.rendered.push({ element, options });
    }
  },
}));

import { GET } from "./route";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function invite(over: Partial<PublicEventInvite> = {}): PublicEventInvite {
  return {
    id: EVENT_ID,
    sport: "Tennis",
    experienceLevels: ["beginner", "intermediate"],
    language: "English",
    areaLabel: "Floreasca",
    city: "Bucharest",
    countryCode: "RO",
    startsAt: "2026-07-10T16:00:00.000Z",
    timeZone: "Europe/Bucharest",
    durationMinutes: 90,
    capacity: 4,
    acceptedCount: 1,
    ...over,
  };
}

function get(query = "", eventId = EVENT_ID): Parameters<typeof GET> {
  const request = new Request(`https://keepitup.social/e/${eventId}/poster${query}`);
  return [request, { params: Promise.resolve({ eventId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rendered.length = 0;
});

describe("GET /e/[eventId]/poster — the shareable event poster", () => {
  it("renders a published event as a 1080×1350 PNG shown inline", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    const response = await GET(...get());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="keepitup-event-poster.png"');
    // Availability changes as places fill — only a short public cache.
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(mocks.rendered).toHaveLength(1);
    expect(mocks.rendered[0].options.width).toBe(1080);
    expect(mocks.rendered[0].options.height).toBe(1350);
  });

  it("serves ?download=1 as an attachment for the fallback download control", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    const response = await GET(...get("?download=1"));
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="keepitup-event-poster.png"');
  });

  it("404s unknown / unpublished / cancelled events with no poster and no data", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(null);
    const response = await GET(...get());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
    expect(mocks.rendered).toHaveLength(0);
  });

  it("shows the public facts, the brand link, and the privacy guarantee on the poster", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    await GET(...get());
    const tree = JSON.stringify(mocks.rendered[0].element);
    expect(tree).toContain("Tennis in Floreasca, Bucharest");
    expect(tree).toContain("Fri 10 Jul · 19:00");
    expect(tree).toContain("3 places left");
    expect(tree).toContain("keepitup.social");
    expect(tree).toContain("Approximate area only — the exact meeting point is shared after the host accepts.");
  });

  it("PRIVACY BOUNDARY: exact location, persons, and host free text can never reach the poster tree", async () => {
    // Worst case: the read is somehow widened with every private field. The
    // poster still renders only the allowlisted derivations.
    mocks.getPublicEventInvite.mockResolvedValue({
      ...invite(),
      venueName: "Baza Sportiva Voinicelul",
      address: "Strada Maior Coravu 34",
      postalCode: "021976",
      latitude: 44.4268,
      longitude: 26.1025,
      hostFirstName: "Ana",
      title: "Evening rally at gate B",
      description: "Meet at gate B behind the fence",
    } as unknown as PublicEventInvite);
    await GET(...get());
    const tree = JSON.stringify(mocks.rendered[0].element);
    expect(tree).not.toContain("Voinicelul");
    expect(tree).not.toContain("Coravu");
    expect(tree).not.toContain("021976");
    expect(tree).not.toContain("44.4268");
    expect(tree).not.toContain("26.1025");
    expect(tree).not.toContain("Ana");
    expect(tree).not.toContain("Evening rally");
    expect(tree).not.toContain("gate B");
    expect(tree).toContain("Floreasca");
  });
});
