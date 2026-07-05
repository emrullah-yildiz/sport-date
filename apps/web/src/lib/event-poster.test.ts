import { describe, expect, it } from "vitest";

import {
  eventPosterViewFromInvite,
  POSTER_FALLBACK_LINK_LABEL,
  POSTER_FILE_NAME,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  posterLinkLabel,
} from "./event-poster";
import type { PublicEventInvite } from "./public-event-invite";

// The poster render model (CX-20260705-event-poster-share) is derived from the
// same allowlisted public payload as the invite page and OG card. These tests
// pin the derivation AND the privacy boundary: exact-location fields, persons,
// and host free text can never reach the poster payload — even from a
// maliciously widened invite object.

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

describe("eventPosterViewFromInvite — the invite → poster choke point", () => {
  it("derives every poster string from the structured public payload", () => {
    const view = eventPosterViewFromInvite(invite(), "https://keepitup.social");
    expect(view.emoji).toBe("🎾");
    expect(view.eyebrow).toBe("TENNIS · BEGINNER / INTERMEDIATE");
    expect(view.headline).toBe("Tennis in Floreasca, Bucharest");
    expect(view.whenLine).toBe("Fri 10 Jul · 19:00"); // the event's own timezone
    expect(view.durationLine).toBe("90 min");
    expect(view.availabilityLine).toBe("3 places left");
    expect(view.linkLabel).toBe("keepitup.social");
    expect(view.privacyLine).toContain("Approximate area only");
    expect(view.alt).toContain("Tennis in Floreasca, Bucharest");
    expect(view.alt).toContain("approximate area");
  });

  it("gives a custom sport the default glyph rather than a broken icon", () => {
    const view = eventPosterViewFromInvite(invite({ sport: "Spikeball" }), null);
    expect(view.emoji).toBe("🤸");
    expect(view.headline).toBe("Spikeball in Floreasca, Bucharest");
  });

  it("stays honest about availability — no fake scarcity", () => {
    expect(eventPosterViewFromInvite(invite({ acceptedCount: 4 }), null).availabilityLine).toBe("Fully booked");
    expect(eventPosterViewFromInvite(invite({ acceptedCount: 3 }), null).availabilityLine).toBe("Last place");
  });

  it("clamps an unusually long area label so it cannot blow the fixed layout", () => {
    const view = eventPosterViewFromInvite(
      invite({ areaLabel: "An Extraordinarily Long Neighbourhood Name That Keeps Going And Going" }),
      null,
    );
    expect(view.headline.length).toBeLessThanOrEqual(64);
    expect(view.headline.endsWith("…")).toBe(true);
  });

  it("emits exactly the allowlisted poster fields — nothing can ride along", () => {
    const view = eventPosterViewFromInvite(invite(), null);
    expect(Object.keys(view).sort()).toEqual([
      "alt",
      "availabilityLine",
      "durationLine",
      "emoji",
      "eyebrow",
      "headline",
      "linkLabel",
      "privacyLine",
      "whenLine",
    ]);
  });

  it("PRIVACY BOUNDARY: exact-location fields, persons, and host free text can never reach the poster payload", () => {
    // Simulate the worst case: an invite object maliciously widened with every
    // private field. The choke point copies an explicit allowlist, so none of
    // it can appear anywhere in the poster payload.
    const polluted = {
      ...invite(),
      venueName: "Baza Sportiva Voinicelul",
      address: "Strada Maior Coravu 34",
      postalCode: "021976",
      latitude: 44.4268,
      longitude: 26.1025,
      hostFirstName: "Ana",
      title: "Evening rally at gate B",
      description: "Meet at gate B behind the fence",
      arrivalInstructions: "Ring Ana at the gate",
    } as unknown as PublicEventInvite;

    const serialized = JSON.stringify(eventPosterViewFromInvite(polluted, "https://keepitup.social"));
    expect(serialized).not.toContain("Voinicelul");
    expect(serialized).not.toContain("Coravu");
    expect(serialized).not.toContain("021976");
    expect(serialized).not.toContain("44.4268");
    expect(serialized).not.toContain("26.1025");
    expect(serialized).not.toContain("Ana");
    expect(serialized).not.toContain("Evening rally");
    expect(serialized).not.toContain("gate B");
    // The approximate area is what the poster shows instead.
    expect(serialized).toContain("Floreasca");
    expect(serialized).toContain("Bucharest");
  });
});

describe("posterLinkLabel", () => {
  it("shows the configured public host, and falls back safely otherwise", () => {
    expect(posterLinkLabel("https://keepitup.social")).toBe("keepitup.social");
    expect(posterLinkLabel("https://keepitup.social/")).toBe("keepitup.social");
    expect(posterLinkLabel(null)).toBe(POSTER_FALLBACK_LINK_LABEL);
    expect(posterLinkLabel("not a url")).toBe(POSTER_FALLBACK_LINK_LABEL);
  });
});

describe("poster constants", () => {
  it("is the 1080×1350 portrait social size with a generic filename (no event data in the name)", () => {
    expect(POSTER_WIDTH).toBe(1080);
    expect(POSTER_HEIGHT).toBe(1350);
    expect(POSTER_FILE_NAME).toBe("keepitup-event-poster.png");
    expect(POSTER_FILE_NAME).not.toContain(EVENT_ID);
  });
});
