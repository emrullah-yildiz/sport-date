import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicEventInvite } from "@/lib/public-event-invite";

// GET /e/{id}/poster (CX-20260705-event-poster-share + CX-20260706-poster-share-v2):
// published → 200 PNG (4:5 post by default, 9:16 story on ?format=story),
// unknown/unpublished/cancelled → plain 404 with zero data, the canonical-origin
// rule (a request on a *.vercel.app alias still renders the brand origin), the
// QR that encodes ONLY the public invite URL, and the privacy boundary —
// nothing beyond the allowlisted public payload can reach either rendered tree,
// even from a maliciously widened invite object.

const mocks = vi.hoisted(() => ({
  getPublicEventInvite: vi.fn(),
  resolveAuthEmailOrigin: vi.fn<() => string | null>(() => "https://keepitup.social"),
  qrValues: [] as string[],
  rendered: [] as Array<{ element: unknown; options: { width?: number; height?: number; emoji?: string } }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/events", () => ({ getPublicEventInvite: mocks.getPublicEventInvite }));
vi.mock("@/lib/auth-email-content", () => ({ resolveAuthEmailOrigin: mocks.resolveAuthEmailOrigin }));
// Record what the QR encodes instead of generating a real code in unit tests
// (the real qrcode engine is covered by its own suite + the manual render pass).
vi.mock("@/lib/qr-data-uri", () => ({
  qrSvgDataUri: async (value: string) => {
    mocks.qrValues.push(value);
    return `data:image/svg+xml,qr-for(${value})`;
  },
}));
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

function get(query = "", eventId = EVENT_ID, host = "keepitup.social"): Parameters<typeof GET> {
  const request = new Request(`https://${host}/e/${eventId}/poster${query}`);
  return [request, { params: Promise.resolve({ eventId }) }];
}

/** Fully render the captured poster tree (the layouts are components) so the
 * assertions cover the ACTUAL text/attributes Satori would draw. */
function treeOf(index = 0): string {
  return renderToStaticMarkup(mocks.rendered[index].element as ReactElement);
}

const WIDENED = {
  venueName: "Baza Sportiva Voinicelul",
  address: "Strada Maior Coravu 34",
  postalCode: "021976",
  latitude: 44.4268,
  longitude: 26.1025,
  hostFirstName: "Ana",
  title: "Evening rally at gate B",
  description: "Meet at gate B behind the fence",
};

function expectNoPrivateData(tree: string) {
  expect(tree).not.toContain("Voinicelul");
  expect(tree).not.toContain("Coravu");
  expect(tree).not.toContain("021976");
  expect(tree).not.toContain("44.4268");
  expect(tree).not.toContain("26.1025");
  expect(tree).not.toContain("Ana");
  expect(tree).not.toContain("Evening rally");
  expect(tree).not.toContain("gate B");
  expect(tree).toContain("Floreasca");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveAuthEmailOrigin.mockReturnValue("https://keepitup.social");
  mocks.rendered.length = 0;
  mocks.qrValues.length = 0;
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

  it("renders the 1080×1920 story variant on ?format=story with its own filename", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    const response = await GET(...get("?format=story"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('inline; filename="keepitup-event-story.png"');
    expect(mocks.rendered[0].options.width).toBe(1080);
    expect(mocks.rendered[0].options.height).toBe(1920);
    // Same allowlisted content, story-tuned layout.
    const tree = treeOf();
    expect(tree).toContain("Tennis in Floreasca, Bucharest");
    expect(tree).toContain("SCAN TO JOIN");
  });

  it("treats an unknown format value as the default post — no error surface", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    const response = await GET(...get("?format=whatever"));
    expect(response.status).toBe(200);
    expect(mocks.rendered[0].options.height).toBe(1350);
  });

  it("serves ?download=1 as an attachment for the fallback download control", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    const response = await GET(...get("?download=1"));
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="keepitup-event-poster.png"');
    const story = await GET(...get("?format=story&download=1"));
    expect(story.headers.get("content-disposition")).toBe('attachment; filename="keepitup-event-story.png"');
  });

  it("404s unknown / unpublished / cancelled events with no poster and no data (both formats)", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(null);
    const response = await GET(...get());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
    const story = await GET(...get("?format=story"));
    expect(story.status).toBe(404);
    expect(mocks.rendered).toHaveLength(0);
    expect(mocks.qrValues).toHaveLength(0);
  });

  it("shows the public facts, the brand link, and the privacy guarantee on the poster", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    await GET(...get());
    const tree = treeOf();
    expect(tree).toContain("Tennis in Floreasca, Bucharest");
    expect(tree).toContain("Fri 10 Jul · 19:00");
    expect(tree).toContain("3 places left");
    expect(tree).toContain("keepitup.social");
    expect(tree).toContain("Approximate area only — the exact meeting point is shared after the host accepts.");
  });

  it("embeds a QR on BOTH formats encoding ONLY the public invite URL, labelled Scan to join", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    await GET(...get());
    await GET(...get("?format=story"));
    expect(mocks.qrValues).toEqual([
      `https://keepitup.social/e/${EVENT_ID}`,
      `https://keepitup.social/e/${EVENT_ID}`,
    ]);
    for (const index of [0, 1]) {
      const tree = treeOf(index);
      expect(tree).toContain(`qr-for(https://keepitup.social/e/${EVENT_ID})`);
      expect(tree).toContain("SCAN TO JOIN");
    }
  });

  it("CANONICAL ORIGIN: a request on a vercel.app deployment alias still renders the brand origin", async () => {
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    await GET(...get("", EVENT_ID, "sport-date-gray.vercel.app"));
    const tree = treeOf();
    expect(tree).toContain("keepitup.social");
    expect(tree).not.toContain("vercel.app");
    // The QR too — it encodes the canonical invite URL, never the alias.
    expect(mocks.qrValues).toEqual([`https://keepitup.social/e/${EVENT_ID}`]);
  });

  it("falls back to the request host ONLY when no canonical origin is configured", async () => {
    mocks.resolveAuthEmailOrigin.mockReturnValue(null);
    mocks.getPublicEventInvite.mockResolvedValue(invite());
    await GET(...get("", EVENT_ID, "localhost:3000"));
    const tree = treeOf();
    expect(tree).toContain("localhost:3000");
    expect(mocks.qrValues).toEqual([`https://localhost:3000/e/${EVENT_ID}`]);
  });

  it("PRIVACY BOUNDARY: exact location, persons, and host free text can never reach the poster tree", async () => {
    // Worst case: the read is somehow widened with every private field. The
    // poster still renders only the allowlisted derivations.
    mocks.getPublicEventInvite.mockResolvedValue({ ...invite(), ...WIDENED } as unknown as PublicEventInvite);
    await GET(...get());
    expectNoPrivateData(treeOf());
  });

  it("PRIVACY BOUNDARY (story + QR): the widened object leaks into neither the story tree nor the QR URL", async () => {
    mocks.getPublicEventInvite.mockResolvedValue({ ...invite(), ...WIDENED } as unknown as PublicEventInvite);
    await GET(...get("?format=story"));
    expectNoPrivateData(treeOf());
    // The QR encodes the bare public invite URL and nothing else.
    expect(mocks.qrValues).toEqual([`https://keepitup.social/e/${EVENT_ID}`]);
  });
});
