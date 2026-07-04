import { describe, expect, it } from "vitest";

import { derivePublicAreaFromSuggestion, parsePhotonSuggestions, type LocationSuggestion } from "./location-search";

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
