import { describe, expect, it } from "vitest";

import { buildDirectionsUrl, formatFullAddress, validateEventPostalCode, validatePinnedEventLocation } from "./directions";

describe("buildDirectionsUrl — keyless Google Maps directions", () => {
  it("prefers precise coordinates when available", () => {
    const url = buildDirectionsUrl({ latitude: 44.4268, longitude: 26.1025, venueName: "Court 2", address: "Str. Exemplu 12" });
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=44.4268%2C26.1025");
    // Keyless: no api key parameter is present.
    expect(url).not.toContain("key=");
  });

  it("falls back to the url-encoded full address when there are no coordinates", () => {
    const url = buildDirectionsUrl({ latitude: null, longitude: null, venueName: "Court 2", address: "Str. Exemplu 12", postalCode: "010101", city: "Bucharest" });
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent("Court 2, Str. Exemplu 12, 010101, Bucharest"));
  });

  it("ignores non-finite coordinates and uses the address instead", () => {
    const url = buildDirectionsUrl({ latitude: Number.NaN, longitude: 26, venueName: "V", address: "A" });
    expect(url).toContain(encodeURIComponent("V, A"));
  });
});

describe("validatePinnedEventLocation", () => {
  it("requires a valid selected coordinate pair", () => {
    expect(validatePinnedEventLocation(44.4268, 26.1025)).toEqual({ valid: true, latitude: 44.4268, longitude: 26.1025 });
    expect(validatePinnedEventLocation(null, null).valid).toBe(false);
    expect(validatePinnedEventLocation(91, 26).valid).toBe(false);
  });
});

describe("formatFullAddress", () => {
  it("joins the parts present and skips empties", () => {
    expect(formatFullAddress({ address: "Str. Exemplu 12", postalCode: "010101", city: "Bucharest" })).toBe("Str. Exemplu 12, 010101, Bucharest");
    expect(formatFullAddress({ address: "Str. Exemplu 12", postalCode: null, city: "" })).toBe("Str. Exemplu 12");
  });
});

describe("validateEventPostalCode — mandatory structured address", () => {
  it("accepts and trims a real postal code", () => {
    expect(validateEventPostalCode("  010101 ")).toEqual({ valid: true, postalCode: "010101" });
  });

  it("rejects an empty, missing, or over-long postal code", () => {
    expect(validateEventPostalCode("").valid).toBe(false);
    expect(validateEventPostalCode("   ").valid).toBe(false);
    expect(validateEventPostalCode(undefined).valid).toBe(false);
    expect(validateEventPostalCode("x".repeat(21)).valid).toBe(false);
  });
});
