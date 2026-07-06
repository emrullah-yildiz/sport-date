import { describe, expect, it } from "vitest";

import { buildEventShareIntentLinks, buildEventShareText } from "./event-share";
import type { PublicEventInvite } from "./public-event-invite";

// Share-text + intent-link builders for the poster share control
// (CX-20260705-event-poster-share). The text is derived only from the
// allowlisted public payload; the links must encode it safely for each platform.

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

describe("buildEventShareText", () => {
  it("writes a friendly, honest message from structured public facts only", () => {
    expect(buildEventShareText(invite())).toBe(
      "🎾 Tennis in Floreasca, Bucharest — Fri 10 Jul, 19:00. 3 places left. Come play?",
    );
  });

  it("stays honest when the event is full — no fake scarcity, no pressure", () => {
    const text = buildEventShareText(invite({ acceptedCount: 4 }));
    expect(text).toContain("Fully booked");
    expect(text).not.toMatch(/hurry|act now|last chance|don'?t miss/i);
  });

  it("PRIVACY BOUNDARY: never leaks exact location, persons, or host free text", () => {
    const polluted = {
      ...invite(),
      venueName: "Baza Sportiva Voinicelul",
      address: "Strada Maior Coravu 34",
      postalCode: "021976",
      latitude: 44.4268,
      hostFirstName: "Ana",
      title: "Evening rally at gate B",
      description: "Meet at gate B",
    } as unknown as PublicEventInvite;
    const text = buildEventShareText(polluted);
    expect(text).not.toContain("Voinicelul");
    expect(text).not.toContain("Coravu");
    expect(text).not.toContain("021976");
    expect(text).not.toContain("44.4268");
    expect(text).not.toContain("Ana");
    expect(text).not.toContain("gate B");
    expect(text).toContain("Floreasca, Bucharest");
  });
});

describe("buildEventShareIntentLinks", () => {
  const url = "https://keepitup.social/e/" + EVENT_ID;
  const text = "🎾 Tennis in Floreasca, Bucharest — Fri 10 Jul, 19:00. 3 places left. Come play?";

  it("builds WhatsApp / Facebook / X intents with the text and link fully encoded", () => {
    const links = buildEventShareIntentLinks(url, text);
    expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);
    expect(links.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    expect(links.x).toBe(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  });

  it("leaves no raw spaces, newlines, or emoji bytes in any intent URL", () => {
    for (const link of Object.values(buildEventShareIntentLinks(url, text))) {
      expect(link).not.toMatch(/[\s\u{1F300}-\u{1FAFF}]/u);
      expect(() => new URL(link)).not.toThrow();
    }
  });

  it("carries the invite URL into every platform intent", () => {
    const links = buildEventShareIntentLinks(url, text);
    const encodedUrl = encodeURIComponent(url);
    expect(links.whatsapp).toContain(encodedUrl);
    expect(links.facebook).toContain(`u=${encodedUrl}`);
    expect(links.x).toContain(`url=${encodedUrl}`);
  });
});
