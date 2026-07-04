import { describe, expect, it } from "vitest";

import { parsePhotonSuggestions } from "./location-search";

describe("parsePhotonSuggestions", () => {
  it("projects only the address fields and valid pin coordinates the client needs", () => {
    const result = parsePhotonSuggestions({ features: [{
      geometry: { coordinates: [26.1025, 44.4268] },
      properties: { osm_type: "W", osm_id: 42, name: "Tennis Club", street: "Strada Sportului", housenumber: "12", postcode: "010101", city: "București", country: "România", countrycode: "ro", extra: { phone: "private" } },
    }] });
    expect(result).toEqual([{
      id: "W:42:44.4268:26.1025",
      label: "Tennis Club, Strada Sportului 12, 010101, București, România",
      address: "Strada Sportului 12",
      postalCode: "010101",
      city: "București",
      countryCode: "RO",
      latitude: 44.4268,
      longitude: 26.1025,
    }]);
    expect(JSON.stringify(result)).not.toContain("phone");
  });

  it("drops malformed and out-of-range coordinates", () => {
    expect(parsePhotonSuggestions({ features: [
      { geometry: { coordinates: [200, 44] }, properties: { name: "Nope" } },
      { geometry: { coordinates: [26, "bad"] }, properties: { name: "Nope" } },
    ] })).toEqual([]);
  });
});
