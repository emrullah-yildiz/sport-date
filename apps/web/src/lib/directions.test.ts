import { describe, expect, it } from "vitest";

import { buildDirectionsUrl, formatFullAddress, validateEventPostalCode, validateOptionalPinnedEventLocation } from "./directions";

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

describe("validateOptionalPinnedEventLocation — pin captured from autocomplete (CX-20260704)", () => {
  it("keeps a valid selected coordinate pair", () => {
    expect(validateOptionalPinnedEventLocation(44.4268, 26.1025)).toEqual({ valid: true, latitude: 44.4268, longitude: 26.1025 });
    expect(validateOptionalPinnedEventLocation("44.4268", "26.1025")).toEqual({ valid: true, latitude: 44.4268, longitude: 26.1025 });
  });

  it("allows an absent pin so a geocoder outage / manual entry never blocks creation", () => {
    expect(validateOptionalPinnedEventLocation(null, null)).toEqual({ valid: true, latitude: null, longitude: null });
    expect(validateOptionalPinnedEventLocation("", "")).toEqual({ valid: true, latitude: null, longitude: null });
    expect(validateOptionalPinnedEventLocation(undefined, undefined)).toEqual({ valid: true, latitude: null, longitude: null });
  });

  it("rejects a supplied but malformed or out-of-range pin instead of storing garbage", () => {
    expect(validateOptionalPinnedEventLocation(91, 26).valid).toBe(false);
    expect(validateOptionalPinnedEventLocation(44, 200).valid).toBe(false);
    expect(validateOptionalPinnedEventLocation("abc", 26).valid).toBe(false);
    // A half-supplied pair is malformed, not a clean fallback.
    expect(validateOptionalPinnedEventLocation(44.4268, "").valid).toBe(false);
  });
});

describe("formatFullAddress", () => {
  it("joins the parts present and skips empties", () => {
    expect(formatFullAddress({ address: "Str. Exemplu 12", postalCode: "010101", city: "Bucharest" })).toBe("Str. Exemplu 12, 010101, Bucharest");
    expect(formatFullAddress({ address: "Str. Exemplu 12", postalCode: null, city: "" })).toBe("Str. Exemplu 12");
  });
});

describe("validateEventPostalCode — optional derived postal code (CX-20260705)", () => {
  it("accepts and trims a real postal code", () => {
    expect(validateEventPostalCode("  010101 ")).toEqual({ valid: true, postalCode: "010101" });
  });

  it("accepts an absent postal code as null so a pin-less / provider-down publish is never blocked", () => {
    expect(validateEventPostalCode("")).toEqual({ valid: true, postalCode: null });
    expect(validateEventPostalCode("   ")).toEqual({ valid: true, postalCode: null });
    expect(validateEventPostalCode(undefined)).toEqual({ valid: true, postalCode: null });
  });

  it("rejects an over-long postal code", () => {
    expect(validateEventPostalCode("x".repeat(21)).valid).toBe(false);
  });
});
