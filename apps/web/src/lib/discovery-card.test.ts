import { describe, expect, it } from "vitest";

import { describeDiscoveryAvailability, formatDiscoveryArea, formatDiscoveryDate } from "./discovery-card";

// These pin the scan-critical presentation rules for the /discover card hierarchy
// (CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed): the "when" is
// split so date/time can be emphasised, the location stays approximate-area-only,
// and availability wording is honest/calm — never manufactured scarcity.

describe("formatDiscoveryDate", () => {
  it("splits the start into a short calendar day and a 24h clock time in the event timezone", () => {
    // 2026-07-05T17:00:00Z is 19:00 in Central European Summer Time (UTC+2).
    const parts = formatDiscoveryDate("2026-07-05T17:00:00.000Z", "Europe/Berlin");
    expect(parts.day).toBe("Sun 5 Jul");
    expect(parts.time).toBe("19:00");
  });

  it("renders in the event's own timezone, so the same instant reads differently per zone", () => {
    const berlin = formatDiscoveryDate("2026-07-05T23:30:00.000Z", "Europe/Berlin");
    const london = formatDiscoveryDate("2026-07-05T23:30:00.000Z", "Europe/London");
    // Same instant: 01:30 in Berlin (CEST), 00:30 in London (BST).
    expect(berlin.time).toBe("01:30");
    expect(london.time).toBe("00:30");
  });
});

describe("formatDiscoveryArea", () => {
  it("shows approximate area and city, and never a precise venue or address", () => {
    expect(formatDiscoveryArea("Kreuzberg", "Berlin")).toBe("Kreuzberg, Berlin");
  });

  it("collapses to a single label when area and city are the same, avoiding 'Berlin, Berlin'", () => {
    expect(formatDiscoveryArea("Berlin", "Berlin")).toBe("Berlin");
    expect(formatDiscoveryArea("berlin", "Berlin")).toBe("berlin");
  });

  it("falls back gracefully when one part is missing", () => {
    expect(formatDiscoveryArea("", "Berlin")).toBe("Berlin");
    expect(formatDiscoveryArea("Kreuzberg", "")).toBe("Kreuzberg");
  });
});

describe("describeDiscoveryAvailability", () => {
  it("states the honest remaining count without urgency styling", () => {
    expect(describeDiscoveryAvailability(3)).toEqual({ label: "3 places left", isFull: false });
  });

  it("names a genuine single remaining place plainly, not as pressure", () => {
    expect(describeDiscoveryAvailability(1)).toEqual({ label: "Last place", isFull: false });
  });

  it("says fully booked calmly and marks it full (muted, never scarcity red)", () => {
    expect(describeDiscoveryAvailability(0)).toEqual({ label: "Fully booked", isFull: true });
    expect(describeDiscoveryAvailability(-2)).toEqual({ label: "Fully booked", isFull: true });
  });
});
