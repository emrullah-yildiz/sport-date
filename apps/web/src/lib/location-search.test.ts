import { describe, expect, it } from "vitest";

import {
  derivePublicAreaFromSuggestion,
  parseCoordinatePair,
  parsePhotonReverseSuggestion,
  parsePhotonSuggestions,
  pinnedSuggestion,
  roundPinCoordinate,
  type LocationSuggestion,
} from "./location-search";

describe("parsePhotonSuggestions", () => {
  it("projects only the address fields and valid pin coordinates the client needs", () => {
    const result = parsePhotonSuggestions({ features: [{
      geometry: { coordinates: [26.1025, 44.4268] },
      properties: { osm_type: "W", osm_id: 42, name: "Tennis Club", street: "Strada Sportului", housenumber: "12", postcode: "010101", district: "Tineretului", city: "București", country: "România", countrycode: "ro", extra: { phone: "private" } },
    }] });
    expect(result).toEqual([{
      id: "W:42:44.4268:26.1025",
      label: "Tennis Club, Strada Sportului 12, 010101, București, România",
      address: "Strada Sportului 12",
      postalCode: "010101",
      city: "București",
      district: "Tineretului",
      countryCode: "RO",
      latitude: 44.4268,
      longitude: 26.1025,
    }]);
    expect(JSON.stringify(result)).not.toContain("phone");
  });

  it("derives the district from Photon `district`, falls back to `locality`, else empty", () => {
    const [withDistrict] = parsePhotonSuggestions({ features: [{
      geometry: { coordinates: [26.1, 44.43] },
      properties: { osm_type: "N", osm_id: 1, name: "A", street: "S", district: "Primavara", locality: "Ignored", city: "București", countrycode: "ro" },
    }] });
    expect(withDistrict.district).toBe("Primavara");

    const [withLocality] = parsePhotonSuggestions({ features: [{
      geometry: { coordinates: [26.1, 44.43] },
      properties: { osm_type: "N", osm_id: 2, name: "B", street: "S", locality: "Herastrau", city: "București", countrycode: "ro" },
    }] });
    expect(withLocality.district).toBe("Herastrau");

    const [withNeither] = parsePhotonSuggestions({ features: [{
      geometry: { coordinates: [26.1, 44.43] },
      properties: { osm_type: "N", osm_id: 3, name: "C", street: "S", city: "București", countrycode: "ro" },
    }] });
    expect(withNeither.district).toBe("");
  });

  it("drops malformed and out-of-range coordinates", () => {
    expect(parsePhotonSuggestions({ features: [
      { geometry: { coordinates: [200, 44] }, properties: { name: "Nope" } },
      { geometry: { coordinates: [26, "bad"] }, properties: { name: "Nope" } },
    ] })).toEqual([]);
  });
});

describe("derivePublicAreaFromSuggestion — coarse public area from the pin (CX-20260705)", () => {
  const pin: LocationSuggestion = {
    id: "W:42:44.4268:26.1025",
    label: "Tennis Club, Strada Sportului 12, 010101, București, România",
    address: "Strada Sportului 12",
    postalCode: "010101",
    city: "București",
    district: "Tineretului",
    countryCode: "RO",
    latitude: 44.4268,
    longitude: 26.1025,
  };

  it("derives city + district + country from the pin, using the district as the area label", () => {
    expect(derivePublicAreaFromSuggestion(pin)).toEqual({
      city: "București",
      countryCode: "RO",
      areaLabel: "Tineretului",
      postalCode: "010101",
    });
  });

  it("falls back to the city for the area label when the pin has no district", () => {
    expect(derivePublicAreaFromSuggestion({ ...pin, district: "" }).areaLabel).toBe("București");
  });

  it("PRIVACY: the derived public area excludes the street address and precise coordinates", () => {
    const area = derivePublicAreaFromSuggestion(pin);
    const serialized = JSON.stringify(area);
    expect(serialized).not.toContain("Strada Sportului 12");
    expect(serialized).not.toContain("44.4268");
    expect(serialized).not.toContain("26.1025");
    expect(Object.keys(area).sort()).toEqual(["areaLabel", "city", "countryCode", "postalCode"]);
  });
});

// ——— Map-pick / reverse-geocode helpers (CX-20260706-event-location-map-picker) ———

describe("roundPinCoordinate", () => {
  it("normalises raw Leaflet tap coordinates to 6 decimals (~0.1 m)", () => {
    expect(roundPinCoordinate(44.42683719482421)).toBe(44.426837);
    expect(roundPinCoordinate(-26.10251283645629)).toBe(-26.102513);
    expect(roundPinCoordinate(45)).toBe(45);
  });
});

describe("parseCoordinatePair — the reverse proxy's input gate", () => {
  it("parses a valid pair and rounds to the canonical pin precision", () => {
    expect(parseCoordinatePair("44.42683719482421", "26.10251283645629")).toEqual({ latitude: 44.426837, longitude: 26.102513 });
  });

  it("rejects missing, blank, non-numeric, and out-of-range values", () => {
    expect(parseCoordinatePair(null, "26.1")).toBeNull();
    expect(parseCoordinatePair("44.4", null)).toBeNull();
    expect(parseCoordinatePair("  ", "26.1")).toBeNull();
    expect(parseCoordinatePair("abc", "26.1")).toBeNull();
    expect(parseCoordinatePair("90.1", "26.1")).toBeNull();
    expect(parseCoordinatePair("-90.1", "26.1")).toBeNull();
    expect(parseCoordinatePair("44.4", "180.1")).toBeNull();
    expect(parseCoordinatePair("44.4", "-180.1")).toBeNull();
    expect(parseCoordinatePair("Infinity", "26.1")).toBeNull();
  });

  it("accepts the poles and the antimeridian as inclusive bounds", () => {
    expect(parseCoordinatePair("90", "-180")).toEqual({ latitude: 90, longitude: -180 });
    expect(parseCoordinatePair("-90", "180")).toEqual({ latitude: -90, longitude: 180 });
  });
});

describe("pinnedSuggestion — the tapped spot stays authoritative", () => {
  const reverseHit: LocationSuggestion = {
    id: "W:42:44.4271:26.1031",
    label: "Tennis Club, Strada Sportului 12, 010101, București, România",
    address: "Strada Sportului 12",
    postalCode: "010101",
    city: "București",
    district: "Tineretului",
    countryCode: "RO",
    // The nearest addressable object sits metres away from the tapped point.
    latitude: 44.4271,
    longitude: 26.1031,
  };

  it("keeps the geocoder's address text but overrides its coordinates with the host's tap", () => {
    const pinned = pinnedSuggestion(reverseHit, 44.426837, 26.102513);
    expect(pinned.latitude).toBe(44.426837);
    expect(pinned.longitude).toBe(26.102513);
    expect(pinned.address).toBe("Strada Sportului 12");
    expect(pinned.city).toBe("București");
    expect(pinned.id).toBe("pin:44.426837:26.102513");
  });

  it("does not mutate the input suggestion", () => {
    pinnedSuggestion(reverseHit, 1, 2);
    expect(reverseHit.latitude).toBe(44.4271);
    expect(reverseHit.longitude).toBe(26.1031);
  });
});

describe("parsePhotonReverseSuggestion", () => {
  it("returns the single best data-minimized suggestion from a reverse payload", () => {
    const suggestion = parsePhotonReverseSuggestion({ features: [{
      geometry: { coordinates: [26.1025, 44.4268] },
      properties: { osm_type: "W", osm_id: 42, name: "Club", street: "Strada Sportului", housenumber: "12", city: "București", countrycode: "ro", extra: { phone: "must-not-leak" } },
    }] });
    expect(suggestion).toMatchObject({ address: "Strada Sportului 12", city: "București", countryCode: "RO" });
    expect(JSON.stringify(suggestion)).not.toContain("phone");
  });

  it("returns null when the point resolves to nothing addressable", () => {
    expect(parsePhotonReverseSuggestion({ features: [] })).toBeNull();
    expect(parsePhotonReverseSuggestion(undefined)).toBeNull();
    expect(parsePhotonReverseSuggestion({ features: [{ geometry: { coordinates: [200, 44] }, properties: { name: "Nope" } }] })).toBeNull();
  });
});
