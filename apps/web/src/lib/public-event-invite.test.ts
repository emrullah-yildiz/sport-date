import { describe, expect, it } from "vitest";

import {
  clampPublicText,
  describeInviteLevels,
  describePublicInvite,
  publicEventInviteFromRow,
  type PublicEventInvite,
  type PublicEventInviteRow,
} from "./public-event-invite";

// Realistic private data a widened row could carry. The public mapping must drop
// every one of these strings — they are the exact class of leak the ticket forbids
// on the unauthenticated share page and its OG image.
const PRIVATE_STRINGS = {
  venue_name: "Baza Sportiva Voinicelul, Court 3",
  address: "Strada Maior Coravu 34, Sector 2, Bucharest",
  arrival_instructions: "Ring at gate B, code 4711, ask for Ana",
  host_first_name: "Ana",
  title: "Evening rally at Voinicelul court 3",
  description: "We meet at Strada Maior Coravu 34, gate B.",
} as const;

function inviteRow(over: Partial<Record<string, unknown>> = {}): PublicEventInviteRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sport: "Tennis",
    experience_levels: ["beginner", "intermediate"],
    language: "English",
    public_area_label: "Floreasca",
    public_city: "Bucharest",
    public_country_code: "RO",
    starts_at: "2026-07-10T16:00:00.000Z",
    time_zone: "Europe/Bucharest",
    duration_minutes: 90,
    capacity: 4,
    accepted_count: 1,
    ...over,
  } as PublicEventInviteRow;
}

describe("publicEventInviteFromRow — the unauthenticated allowlist choke point", () => {
  it("copies exactly the allowlisted public fields, never spreading the row", () => {
    // Simulate the worst case: the row arrives polluted with every private column.
    const polluted = inviteRow({
      ...PRIVATE_STRINGS,
      precise_latitude: 44.4268,
      precise_longitude: 26.1025,
      public_approximate_latitude: 44.4,
      public_approximate_longitude: 26.1,
    });
    const invite = publicEventInviteFromRow(polluted);

    expect(Object.keys(invite).sort()).toEqual([
      "acceptedCount",
      "areaLabel",
      "capacity",
      "city",
      "countryCode",
      "durationMinutes",
      "experienceLevels",
      "id",
      "language",
      "sport",
      "startsAt",
      "timeZone",
    ]);
  });

  it("never lets a venue, address, instruction, coordinate, or person survive serialization", () => {
    const polluted = inviteRow({ ...PRIVATE_STRINGS, precise_latitude: 44.4268, precise_longitude: 26.1025 });
    const serialized = JSON.stringify(publicEventInviteFromRow(polluted));

    for (const leak of Object.values(PRIVATE_STRINGS)) {
      expect(serialized).not.toContain(leak);
    }
    expect(serialized).not.toContain("44.4268");
    expect(serialized).not.toContain("26.1025");
    // Not even the coarse public coordinate ships: the page shows the area as text only.
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
  });

  it("carries no host-authored free text at all (title/description are a location-leak vector)", () => {
    const invite = publicEventInviteFromRow(inviteRow(PRIVATE_STRINGS));
    expect(invite).not.toHaveProperty("title");
    expect(invite).not.toHaveProperty("description");
    expect(invite).not.toHaveProperty("hostFirstName");
    expect(invite).not.toHaveProperty("venueName");
    expect(invite).not.toHaveProperty("address");
  });

  it("normalises a driver-returned Date to an ISO instant", () => {
    const invite = publicEventInviteFromRow(inviteRow({ starts_at: new Date("2026-07-10T16:00:00.000Z") }));
    expect(invite.startsAt).toBe("2026-07-10T16:00:00.000Z");
  });
});

describe("describePublicInvite — every public/OG string derives from safe fields only", () => {
  const invite: PublicEventInvite = publicEventInviteFromRow(inviteRow(PRIVATE_STRINGS));
  const before = new Date("2026-07-01T00:00:00.000Z");

  it("builds a structured headline (sport + approximate area), not host free text", () => {
    const described = describePublicInvite(invite, before);
    expect(described.headline).toBe("Tennis in Floreasca, Bucharest");
    expect(described.metaTitle).toBe("Tennis in Floreasca, Bucharest");
  });

  it("keeps every rendered string free of the exact meeting point", () => {
    const described = describePublicInvite(invite, before);
    const everything = JSON.stringify(described);
    for (const leak of Object.values(PRIVATE_STRINGS)) {
      expect(everything).not.toContain(leak);
    }
  });

  it("renders the when in the event's own timezone and states the privacy guarantee", () => {
    const described = describePublicInvite(invite, before);
    expect(described.when.day).toBe("Fri 10 Jul");
    expect(described.when.time).toBe("19:00"); // Europe/Bucharest = UTC+3 in July
    expect(described.when.machineDateTime).toBe("2026-07-10T16:00:00.000Z");
    expect(described.metaDescription).toContain("Approximate area only");
    expect(described.metaDescription).toContain("after the host accepts");
    expect(described.ogAlt).toContain("Approximate area only");
  });

  it("uses the same honest availability wording as discovery — no fake scarcity", () => {
    const threeLeft = describePublicInvite(invite, before);
    expect(threeLeft.availability.label).toBe("3 places left");
    expect(threeLeft.availability.isFull).toBe(false);

    const lastPlace = describePublicInvite({ ...invite, acceptedCount: 3 }, before);
    expect(lastPlace.availability.label).toBe("Last place"); // literally true: one remains

    const full = describePublicInvite({ ...invite, acceptedCount: 4 }, before);
    expect(full.availability.label).toBe("Fully booked");
    expect(full.availability.isFull).toBe(true);
  });

  it("flags a started event so the page can retire the join CTA gracefully", () => {
    expect(describePublicInvite(invite, before).hasStarted).toBe(false);
    expect(describePublicInvite(invite, new Date("2026-07-10T16:00:00.001Z")).hasStarted).toBe(true);
  });
});

describe("describeInviteLevels", () => {
  it("labels the welcomed levels calmly", () => {
    expect(describeInviteLevels(["beginner", "intermediate"])).toBe("Beginner / intermediate");
    expect(describeInviteLevels(["advanced"])).toBe("Advanced");
    expect(describeInviteLevels(["beginner", "intermediate", "advanced"])).toBe("All levels");
    expect(describeInviteLevels([])).toBe("All levels");
  });
});

describe("clampPublicText", () => {
  it("returns short text untouched and clamps long text with an ellipsis", () => {
    expect(clampPublicText("Floreasca", 40)).toBe("Floreasca");
    const long = "An extraordinarily long neighbourhood-and-district area label";
    const clamped = clampPublicText(long, 24);
    expect(clamped.length).toBeLessThanOrEqual(24);
    expect(clamped.endsWith("…")).toBe(true);
  });
});
