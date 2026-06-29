import { describe, expect, it } from "vitest";

import {
  assessEventEligibility,
  cancelEvent,
  completeEvent,
  eventLocationForViewer,
  InvalidEventTransition,
  publicEventLocation,
  publishEvent,
  validateEventCreation,
  type EventCandidate,
  type SportEvent,
} from "./event";

const future = new Date("2026-07-10T17:00:00.000Z");
const event = (overrides: Partial<SportEvent> = {}): SportEvent => ({
  id: "event-1", hostId: "host-1", sport: "Tennis", title: "An easy evening rally",
  description: "A relaxed rally with time to warm up and meet the group.",
  startsAt: future, timeZone: "Europe/Bucharest", durationMinutes: 90, capacity: 4, language: "English",
  participantAgeRange: { minimum: 24, maximum: 38 },
  experienceLevels: ["beginner", "intermediate"], status: "draft",
  location: {
    public: { city: "Bucharest", countryCode: "RO", areaLabel: "Tineretului", approximateLatitude: 44.41, approximateLongitude: 26.1 },
    private: { venueName: "Court 2", address: "Private exact address", latitude: 44.411, longitude: 26.101, instructions: "Ask for the evening group." },
  },
  ...overrides,
});

const candidate: EventCandidate = {
  userId: "member-1", age: 28, languages: ["Romanian", "English"],
  sports: [{ name: "tennis", experienceLevel: "intermediate" }],
};

const access = { acceptedMemberIds: ["member-2"], hostBlockedMemberIds: [], requesterHasBlockedHost: false };

describe("event lifecycle", () => {
  it("publishes a complete future draft", () => {
    expect(publishEvent(event(), new Date("2026-07-01T00:00:00Z")).status).toBe("published");
  });

  it("rejects invalid capacity and premature completion", () => {
    expect(() => publishEvent(event({ capacity: 1 }), new Date("2026-07-01T00:00:00Z"))).toThrow(InvalidEventTransition);
    expect(() => completeEvent(event({ status: "published" }), future)).toThrow("cannot be completed before it ends");
  });

  it("completes only after the event and never cancels completed events", () => {
    const completed = completeEvent(event({ status: "published" }), new Date("2026-07-10T19:00:00Z"));
    expect(completed.status).toBe("completed");
    expect(() => cancelEvent(completed)).toThrow(InvalidEventTransition);
  });
});

describe("event creation input", () => {
  it("normalizes a complete public and private location payload", () => {
    const source = event();
    const result = validateEventCreation({
      ...source,
      startsAt: source.startsAt.toISOString(),
      location: {
        public: { ...source.location.public, countryCode: "ro" },
        private: source.location.private,
      },
    }, new Date("2026-07-01T00:00:00Z"));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.location.public.countryCode).toBe("RO");
  });

  it("rejects invalid coordinates, duplicate levels, and thin descriptions", () => {
    const source = event();
    const result = validateEventCreation({
      ...source,
      description: "Too short",
      startsAt: source.startsAt.toISOString(),
      experienceLevels: ["beginner", "beginner"],
      location: { ...source.location, public: { ...source.location.public, approximateLatitude: 120 } },
    }, new Date("2026-07-01T00:00:00Z"));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toEqual(expect.arrayContaining([
      "Coordinates must use valid latitude and longitude ranges.",
      "Choose valid experience levels without duplicates.",
      "Event description must contain 20 to 1000 characters.",
    ]));
  });
});

describe("event eligibility", () => {
  it("accepts an adult with compatible sport, level, language, and capacity", () => {
    const result = assessEventEligibility(event({ status: "published" }), candidate, access, new Date("2026-07-01T00:00:00Z"));
    expect(result).toEqual({ eligible: true, reasons: [] });
  });

  it("enforces capacity, adulthood, level, language, host, and time", () => {
    const result = assessEventEligibility(
      event({ status: "published", capacity: 1 }),
      { ...candidate, userId: "host-1", age: 17, languages: ["French"], sports: [{ name: "Tennis", experienceLevel: "advanced" }] },
      access,
      future,
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["event_started", "event_full", "host_cannot_request", "adults_only", "experience_mismatch", "language_mismatch"]));
  });

  it("respects the host's adult age range", () => {
    const result = assessEventEligibility(event({ status: "published" }), { ...candidate, age: 42 }, access, new Date("2026-07-01T00:00:00Z"));
    expect(result.reasons).toContain("age_mismatch");
  });

  it("uses a non-revealing unavailable reason for blocking", () => {
    const result = assessEventEligibility(event({ status: "published" }), candidate, { ...access, hostBlockedMemberIds: [candidate.userId] }, new Date("2026-07-01T00:00:00Z"));
    expect(result.reasons).toContain("not_available");
  });
});

describe("event location privacy", () => {
  it("returns only an approximate public location", () => {
    expect(publicEventLocation(event().location)).toEqual(event().location.public);
  });

  it("hides precise details from public and pending viewers", () => {
    expect(eventLocationForViewer(event(), { kind: "public" }).visibility).toBe("approximate");
    expect(eventLocationForViewer(event(), { kind: "member", userId: "member-1", participation: "pending" }).visibility).toBe("approximate");
  });

  it("reveals precise details only to accepted members, the host, or authorized moderation", () => {
    expect(eventLocationForViewer(event(), { kind: "member", userId: "member-1", participation: "accepted" }).visibility).toBe("precise");
    expect(eventLocationForViewer(event(), { kind: "host", userId: "host-1" }).visibility).toBe("precise");
    expect(eventLocationForViewer(event(), { kind: "moderator", canAccessPreciseLocation: false }).visibility).toBe("approximate");
  });
});
