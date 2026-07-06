import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EventLocationMapPicker, { OSM_ATTRIBUTION, OSM_TILE_URL_TEMPLATE } from "./EventLocationMapPicker";

function render() {
  return renderToStaticMarkup(
    <EventLocationMapPicker latitude={44.4268} longitude={26.1025} onPick={() => {}} />,
  );
}

describe("EventLocationMapPicker — lazy, host-only map for the private pin", () => {
  it("server-renders only a placeholder — no tile URL, so no tile request can fire before the host reaches the map", () => {
    const html = render();
    expect(html).toContain("event-location-map-canvas");
    expect(html).toContain("Map loads when you scroll here.");
    // The OSM tile host must not appear anywhere in the static HTML; tiles are
    // requested only after Leaflet boots on visibility.
    expect(html).not.toContain("tile.openstreetmap.org");
    expect(html).not.toContain("leaflet");
  });

  it("names itself for assistive tech and explains the fine-tune gesture and privacy", () => {
    const html = render();
    expect(html).toContain('role="application"');
    expect(html).toContain("fine-tune the exact spot");
    expect(html).toContain("stays private until you accept someone");
  });

  it("uses the standard OSM tile endpoint with the required visible attribution", () => {
    expect(OSM_TILE_URL_TEMPLATE).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(OSM_ATTRIBUTION).toContain("https://www.openstreetmap.org/copyright");
    expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
  });

  it("does not embed the pin coordinates in the static markup (they live in the form's hidden inputs, not here)", () => {
    const html = render();
    expect(html).not.toContain("44.4268");
    expect(html).not.toContain("26.1025");
  });
});
