import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AddressAutocomplete from "./AddressAutocomplete";

const STORED_PIN = {
  address: "Strada Sportului 12",
  latitude: 44.4268,
  longitude: 26.1025,
  city: "București",
  countryCode: "RO",
  areaLabel: "Tineretului",
  postalCode: "010101",
};

describe("AddressAutocomplete — map gating (CX-20260706)", () => {
  it("renders NO map before a pin exists — address search is the primary path, and no tile can load early", () => {
    const html = renderToStaticMarkup(<AddressAutocomplete />);
    expect(html).not.toContain("event-location-map");
    expect(html).not.toContain("tile.openstreetmap.org");
  });

  it("renders the map preview once a pin exists (edit flow prefill), still without any tile URL in the HTML", () => {
    const html = renderToStaticMarkup(<AddressAutocomplete initial={STORED_PIN} />);
    expect(html).toContain("event-location-map");
    // Tiles load only after the map scrolls into view — never from static HTML.
    expect(html).not.toContain("tile.openstreetmap.org");
  });

  it("keeps the pin in hidden inputs for the HOST form only — with the existing private-pin messaging", () => {
    const html = renderToStaticMarkup(<AddressAutocomplete initial={STORED_PIN} />);
    expect(html).toContain('name="latitude"');
    expect(html).toContain('name="longitude"');
    expect(html).toContain("stays private");
  });
});
