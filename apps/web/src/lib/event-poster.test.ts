import { describe, expect, it } from "vitest";

import {
  eventPosterViewFromInvite,
  POSTER_FALLBACK_LINK_LABEL,
  POSTER_FILE_NAME,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  posterDimensions,
  posterFileName,
  posterFormatFromParam,
  posterInviteUrl,
  posterLinkLabel,
  STORY_FILE_NAME,
  STORY_HEIGHT,
  STORY_WIDTH,
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
    expect(view.inviteUrl).toBe(`https://keepitup.social/e/${EVENT_ID}`);
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
      "inviteUrl",
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

    const view = eventPosterViewFromInvite(polluted, "https://keepitup.social");
    // The QR target is EXACTLY the public invite URL — no query, no extra path,
    // nothing from the widened object can ride inside it.
    expect(view.inviteUrl).toBe(`https://keepitup.social/e/${EVENT_ID}`);
    const serialized = JSON.stringify(view);
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

  it("a map-fine-tuned high-precision pin (CX-20260706) can never reach the poster", () => {
    const polluted = {
      ...invite(),
      latitude: 44.426837, // tap-precision coordinates from the map picker
      longitude: 26.102513,
    } as unknown as PublicEventInvite;
    const serialized = JSON.stringify(eventPosterViewFromInvite(polluted, null));
    expect(serialized).not.toContain("44.426837");
    expect(serialized).not.toContain("26.102513");
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
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

describe("posterInviteUrl — the QR target (CX-20260706-poster-share-v2)", () => {
  it("is exactly {canonical origin}/e/{id} — nothing else", () => {
    expect(posterInviteUrl("https://keepitup.social", EVENT_ID)).toBe(`https://keepitup.social/e/${EVENT_ID}`);
    // Path/query/hash on a misconfigured origin are stripped down to the origin.
    expect(posterInviteUrl("https://www.keepitup.social/some/path?x=1", EVENT_ID)).toBe(
      `https://www.keepitup.social/e/${EVENT_ID}`,
    );
  });

  it("falls back to the brand host — a broken config can never print a bad QR", () => {
    expect(posterInviteUrl(null, EVENT_ID)).toBe(`https://keepitup.social/e/${EVENT_ID}`);
    expect(posterInviteUrl("not a url", EVENT_ID)).toBe(`https://keepitup.social/e/${EVENT_ID}`);
    expect(posterInviteUrl("mailto:x@example.com", EVENT_ID)).toBe(`https://keepitup.social/e/${EVENT_ID}`);
  });
});

describe("poster formats (CX-20260706-poster-share-v2)", () => {
  it("is the 1080×1350 post by default and the 1080×1920 story on ?format=story", () => {
    expect(POSTER_WIDTH).toBe(1080);
    expect(POSTER_HEIGHT).toBe(1350);
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
    expect(posterFormatFromParam(null)).toBe("post");
    expect(posterFormatFromParam("story")).toBe("story");
    expect(posterFormatFromParam("STORY")).toBe("post"); // junk → the safe default
    expect(posterFormatFromParam("4k")).toBe("post");
    expect(posterDimensions("post")).toEqual({ width: 1080, height: 1350 });
    expect(posterDimensions("story")).toEqual({ width: 1080, height: 1920 });
  });

  it("uses generic filenames for both formats (no event data in the name)", () => {
    expect(POSTER_FILE_NAME).toBe("keepitup-event-poster.png");
    expect(STORY_FILE_NAME).toBe("keepitup-event-story.png");
    expect(posterFileName("post")).toBe(POSTER_FILE_NAME);
    expect(posterFileName("story")).toBe(STORY_FILE_NAME);
    expect(POSTER_FILE_NAME).not.toContain(EVENT_ID);
    expect(STORY_FILE_NAME).not.toContain(EVENT_ID);
  });
});
