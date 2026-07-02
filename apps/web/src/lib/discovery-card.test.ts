import { describe, expect, it } from "vitest";

import { buildDiscoveryGreeting, describeDiscoveryAvailability, describeDiscoveryResultsHeading, formatDiscoveryArea, formatDiscoveryDate, resolveDiscoveryArea } from "./discovery-card";

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

  // CX-20260702: the `<time datetime>` attribute must be a valid, timezone-unambiguous
  // ISO-8601 value for the event's start INSTANT (not a localized Date.toString()),
  // so assistive tech and calendar tooling can parse it. The human-visible day/time
  // above stays in the event's own zone and is unchanged.
  describe("machineDateTime (the <time datetime> attribute value)", () => {
    it("emits a valid ISO-8601 value for the start instant, parseable by new Date()", () => {
      const parts = formatDiscoveryDate("2026-07-05T16:00:00.000Z", "Europe/Bucharest");
      // A real, machine-readable instant — not the server's localized Date.toString().
      expect(parts.machineDateTime).toBe("2026-07-05T16:00:00.000Z");
      const parsed = new Date(parts.machineDateTime);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      // Round-trips to the exact same instant, regardless of display timezone.
      expect(parsed.getTime()).toBe(Date.parse("2026-07-05T16:00:00.000Z"));
      // ISO shape, and no leaked server timezone label like "Eastern European Summer Time".
      expect(parts.machineDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);
    });

    it("normalizes a non-ISO Date.toString() input (the Postgres driver's Date) to the correct ISO instant", () => {
      // The bug source: the DB driver hands the render a JS Date whose toString() is a
      // localized, non-ISO, server-timezone-leaking string. Feeding that same textual
      // form through the helper must still yield the correct machine-readable instant.
      const instant = "2026-07-05T16:00:00.000Z";
      const nonIso = new Date(instant).toString(); // e.g. "Sun Jul 05 2026 19:00:00 GMT+0300 (…)"
      expect(nonIso).not.toMatch(/^\d{4}-\d{2}-\d{2}T/); // confirm the input is the broken shape
      const parts = formatDiscoveryDate(nonIso, "Europe/Bucharest");
      expect(new Date(parts.machineDateTime).getTime()).toBe(Date.parse(instant));
      expect(parts.machineDateTime).not.toContain("GMT");
    });

    it("keeps the visible day/time text unchanged while adding the machine value", () => {
      const parts = formatDiscoveryDate("2026-07-05T16:00:00.000Z", "Europe/Bucharest");
      // 16:00Z is 19:00 in Bucharest (EEST, UTC+3) — the human-visible text is unchanged.
      expect(parts.day).toBe("Sun 5 Jul");
      expect(parts.time).toBe("19:00");
    });

    it("yields an empty attribute (never a bogus non-ISO string) for an unparseable start", () => {
      const parts = formatDiscoveryDate("not-a-date", "Europe/Bucharest");
      expect(parts.machineDateTime).toBe("");
    });
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

// Pins the "around me" default (CX-20260701-discover-no-location-around-me-search):
// a member who types nothing should have discovery centred on their own profile
// area (not an empty, everywhere feed), while still being able to type a specific
// city or broaden to everywhere. Uses only the member's own approximate area.
describe("resolveDiscoveryArea", () => {
  it("defaults an empty search to the member's profile area (the near-me default)", () => {
    expect(resolveDiscoveryArea("Bucharest", "", false)).toEqual({
      effectiveCity: "Bucharest",
      isNearMeDefault: true,
      memberArea: "Bucharest",
    });
    // The reported scenario: a member who never types a city still sees local events.
    expect(resolveDiscoveryArea("Cluj-Napoca", "", false).effectiveCity).toBe("Cluj-Napoca");
  });

  it("lets an explicitly typed city override the near-me default", () => {
    const resolved = resolveDiscoveryArea("Bucharest", "Berlin", false);
    expect(resolved.effectiveCity).toBe("Berlin");
    expect(resolved.isNearMeDefault).toBe(false);
    // The member's own area is still reported so the UI can offer to return to it.
    expect(resolved.memberArea).toBe("Bucharest");
  });

  it("broadens to everywhere (empty city, no default) when the member opts in", () => {
    expect(resolveDiscoveryArea("Bucharest", "", true)).toEqual({
      effectiveCity: "",
      isNearMeDefault: false,
      memberArea: "Bucharest",
    });
  });

  it("does not invent an area when the member has no profile location", () => {
    expect(resolveDiscoveryArea("", "", false)).toEqual({
      effectiveCity: "",
      isNearMeDefault: false,
      memberArea: "",
    });
    expect(resolveDiscoveryArea("   ", "", false).isNearMeDefault).toBe(false);
  });

  it("trims whitespace on both the profile area and a typed city", () => {
    expect(resolveDiscoveryArea("  Bucharest  ", "", false).effectiveCity).toBe("Bucharest");
    expect(resolveDiscoveryArea("Bucharest", "  Berlin  ", false).effectiveCity).toBe("Berlin");
  });
});

// Pins the warm arrival greeting (CX-20260701-discover-first-run-arrival-lacks-warm-
// welcome): the /discover header greets the member by their own first name and orients
// them to their own approximate area, using only already-available data — no marketing
// billboard, no precise location, no fabricated traction.
describe("buildDiscoveryGreeting", () => {
  it("greets the member by first name and names their own approximate area", () => {
    expect(buildDiscoveryGreeting("Ana", "Bucharest")).toEqual({
      heading: "Welcome back, Ana.",
      subheading: "Here's what's happening near Bucharest.",
    });
  });

  it("stays warm and name-less when there is no first name, never an empty slot", () => {
    expect(buildDiscoveryGreeting("", "Bucharest").heading).toBe("Welcome back.");
    expect(buildDiscoveryGreeting("   ", "Cluj").heading).toBe("Welcome back.");
  });

  it("does not imply a location it does not have when the member has no profile area", () => {
    expect(buildDiscoveryGreeting("Ana", "").subheading).toBe("Here's what's happening in the community.");
  });

  it("reflects a broadened everywhere search honestly rather than a specific area", () => {
    expect(buildDiscoveryGreeting("Ana", "Bucharest", { searchEverywhere: true }).subheading).toBe(
      "Here's what's happening across every area.",
    );
  });

  it("trims the first name and area", () => {
    expect(buildDiscoveryGreeting("  Ana  ", "  Bucharest  ")).toEqual({
      heading: "Welcome back, Ana.",
      subheading: "Here's what's happening near Bucharest.",
    });
  });
});

// Pins the human, located results heading: it states the REAL count (no fabricated
// "people near you", scarcity, or popularity metric) but frames it as located rather
// than a bare "N invitations".
describe("describeDiscoveryResultsHeading", () => {
  it("frames the real count as located when centred on the member's own area", () => {
    expect(
      describeDiscoveryResultsHeading({ count: 6, memberArea: "Bucharest", isNearMeDefault: true, searchEverywhere: false }),
    ).toBe("6 invitations near Bucharest");
  });

  it("uses the singular noun for a single real invitation", () => {
    expect(
      describeDiscoveryResultsHeading({ count: 1, memberArea: "Bucharest", isNearMeDefault: true, searchEverywhere: false }),
    ).toBe("1 invitation near Bucharest");
  });

  it("says 'everywhere' honestly when the member broadened the search", () => {
    expect(
      describeDiscoveryResultsHeading({ count: 12, memberArea: "Bucharest", isNearMeDefault: false, searchEverywhere: true }),
    ).toBe("12 invitations everywhere");
  });

  it("falls back to a plain located-neutral count for a typed city or no area", () => {
    expect(
      describeDiscoveryResultsHeading({ count: 4, memberArea: "", isNearMeDefault: false, searchEverywhere: false }),
    ).toBe("4 invitations");
    // A typed city (not the near-me default, not everywhere) keeps the honest bare count.
    expect(
      describeDiscoveryResultsHeading({ count: 4, memberArea: "Bucharest", isNearMeDefault: false, searchEverywhere: false }),
    ).toBe("4 invitations");
  });

  it("never emits a negative or fractional count", () => {
    expect(
      describeDiscoveryResultsHeading({ count: -3, memberArea: "Bucharest", isNearMeDefault: true, searchEverywhere: false }),
    ).toBe("0 invitations near Bucharest");
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
