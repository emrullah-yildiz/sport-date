import { describe, expect, it } from "vitest";

import {
  approximateAreaCue,
  approximateAreaPlacement,
  approximateDistanceHint,
  coarseDistanceBandKm,
} from "./approximate-location";
import { coarseCentreForArea, coarsenCoordinate } from "./discovery-geo";

// These pin the PRIVACY invariant and the derivation for the pre-acceptance approximate-area
// spatial cue on the public event-detail page
// (CX-20260630-event-detail-approximate-location-no-spatial-cue).
//
// The controlling guarantee: the cue is built ONLY from already-public, already-coarse data
// (0.1° grid coordinate / area+city labels / the viewer's free-text area). It must NEVER
// surface a precise venue, a precise coordinate, or a precise distance.

// A precise venue fix inside the Tineretului, Bucharest area — this is what the exact venue
// would look like. It must NEVER appear (nor anything derived at that precision) in the cue.
const PRECISE_VENUE = { lat: 44.4098765, lng: 26.0987654 } as const;

describe("coarseDistanceBandKm", () => {
  it("snaps a raw distance up to a wide band", () => {
    expect(coarseDistanceBandKm(0)).toBe(5);
    expect(coarseDistanceBandKm(4.9)).toBe(5);
    expect(coarseDistanceBandKm(6)).toBe(10);
    expect(coarseDistanceBandKm(21)).toBe(25);
    expect(coarseDistanceBandKm(88)).toBe(100);
  });

  it("clamps distances beyond the widest band to the widest band", () => {
    expect(coarseDistanceBandKm(500)).toBe(100);
  });

  it("returns null for non-finite / negative input rather than a bogus 0", () => {
    expect(coarseDistanceBandKm(Number.NaN)).toBeNull();
    expect(coarseDistanceBandKm(-1)).toBeNull();
  });
});

describe("approximateDistanceHint (coarse, area-to-area only)", () => {
  it("returns null when either party's area cannot be resolved", () => {
    const bucharest = coarseCentreForArea("Bucharest");
    expect(approximateDistanceHint(null, bucharest)).toBeNull();
    expect(approximateDistanceHint(bucharest, null)).toBeNull();
    expect(approximateDistanceHint(null, null)).toBeNull();
  });

  it("says 'in your area' for two coarse centres in the same cell — never a misleading 0 km", () => {
    const centre = coarseCentreForArea("Bucharest");
    expect(approximateDistanceHint(centre, centre)).toBe("About in your area");
  });

  it("produces a wide banded distance for distinct coarse areas, never a precise figure", () => {
    const bucharest = coarseCentreForArea("Bucharest");
    const cluj = coarseCentreForArea("Cluj-Napoca");
    const hint = approximateDistanceHint(bucharest, cluj);
    // Must be one of the wide bands, and must NOT contain a precise (decimal) figure.
    expect(hint).toMatch(/^(About \d+ km from your area|Over 100 km from your area)$/);
    expect(hint).not.toMatch(/\.\d/);
  });

  it("prints 'Over 100 km' rather than a precise large figure for far apart areas", () => {
    const london = coarseCentreForArea("London");
    const athens = coarseCentreForArea("Athens");
    expect(approximateDistanceHint(london, athens)).toBe("Over 100 km from your area");
  });
});

describe("approximateAreaPlacement (region seed, never a point)", () => {
  it("is deterministic for a given coarse centre", () => {
    const centre = coarseCentreForArea("Bucharest")!;
    expect(approximateAreaPlacement(centre)).toEqual(approximateAreaPlacement(centre));
  });

  it("centres the fallback when there is no resolvable centre", () => {
    expect(approximateAreaPlacement(null)).toEqual({ cx: 50, cy: 50 });
  });

  it("keeps the zone well inside the frame (never a corner that implies direction)", () => {
    const centre = coarseCentreForArea("Berlin")!;
    const { cx, cy } = approximateAreaPlacement(centre);
    expect(cx).toBeGreaterThanOrEqual(35);
    expect(cx).toBeLessThanOrEqual(65);
    expect(cy).toBeGreaterThanOrEqual(35);
    expect(cy).toBeLessThanOrEqual(65);
  });
});

describe("approximateAreaCue (privacy invariant end-to-end)", () => {
  const baseEvent = {
    areaLabel: "Tineretului",
    city: "Bucharest",
    approximateLatitude: coarsenCoordinate(PRECISE_VENUE.lat),
    approximateLongitude: coarsenCoordinate(PRECISE_VENUE.lng),
    viewerArea: "Bucharest",
  };

  it("keeps the honest area label unchanged", () => {
    expect(approximateAreaCue(baseEvent).label).toBe("Tineretului, Bucharest");
  });

  it("resolves a coarse centre from the event's approximate (already public) coordinate", () => {
    expect(approximateAreaCue(baseEvent).hasCentre).toBe(true);
  });

  it("NEVER exposes a precise venue coordinate in any returned string", () => {
    const cue = approximateAreaCue(baseEvent);
    const haystack = `${cue.label} ${cue.ariaLabel} ${cue.distanceHint ?? ""}`;
    // No raw precise latitude/longitude fragments (the exact venue) may appear anywhere.
    expect(haystack).not.toContain("44.409");
    expect(haystack).not.toContain("26.098");
    expect(haystack).not.toContain(String(PRECISE_VENUE.lat));
    expect(haystack).not.toContain(String(PRECISE_VENUE.lng));
    // Not even the coarse decimal centre is printed — the cue is textual/area only.
    expect(haystack).not.toMatch(/\d{2}\.\d/);
  });

  it("labels the visual as approximate and says the exact venue is not shown", () => {
    const cue = approximateAreaCue(baseEvent);
    expect(cue.ariaLabel.toLowerCase()).toContain("approximate area only");
    expect(cue.ariaLabel.toLowerCase()).toContain("exact venue is not shown");
  });

  it("derives the centre from the coarse column, not the raw precise venue", () => {
    // Passing the PRECISE venue lat/lng and the same-coarse-cell value must yield the SAME
    // cue placement, because the derivation coarsens defensively — no sub-cell precision
    // survives into the visual.
    const fromPrecise = approximateAreaCue({ ...baseEvent, approximateLatitude: PRECISE_VENUE.lat, approximateLongitude: PRECISE_VENUE.lng });
    const fromCoarse = approximateAreaCue(baseEvent);
    expect(fromPrecise.placement).toEqual(fromCoarse.placement);
  });

  it("falls back to a coarse city-centre geocode when no approximate coordinate is stored", () => {
    const cue = approximateAreaCue({ ...baseEvent, approximateLatitude: null, approximateLongitude: null });
    expect(cue.hasCentre).toBe(true); // Bucharest resolves offline
  });

  it("still returns an honest cue (centred, distance-less) for an unknown/ungeocodable area", () => {
    const cue = approximateAreaCue({ areaLabel: "Old Town", city: "Nowhereville", approximateLatitude: null, approximateLongitude: null, viewerArea: "Nowhereville" });
    expect(cue.hasCentre).toBe(false);
    expect(cue.placement).toEqual({ cx: 50, cy: 50 });
    expect(cue.distanceHint).toBeNull();
    expect(cue.ariaLabel).toContain("Old Town, Nowhereville");
  });

  it("omits the distance hint when the viewer has no resolvable area", () => {
    const cue = approximateAreaCue({ ...baseEvent, viewerArea: null });
    expect(cue.distanceHint).toBeNull();
  });

  it("gives a wide banded distance hint for a distant viewer, never a precise one", () => {
    const cue = approximateAreaCue({ ...baseEvent, viewerArea: "Cluj-Napoca" });
    expect(cue.distanceHint).toMatch(/from your area$/);
    expect(cue.distanceHint).not.toMatch(/\.\d/);
  });
});
