import { describe, expect, it } from "vitest";

import {
  COARSE_GRID_DEGREES,
  coarseCentreForArea,
  coarseCentreForEvent,
  coarsenCoordinate,
  coarsenCoordinates,
  distanceKm,
  filterEventsWithinRadius,
  filterWithinRadius,
  isWithinRadius,
  normalizeAreaKey,
  parseRadiusKm,
  resolveDiscoveryCentre,
  type RadiusCandidate,
} from "./discovery-geo";

// These pin the PRIVACY boundary and the distance/radius matching rule for the
// /discover geo-radius feature (CX-20260701-discover-geo-radius-and-use-my-location).
// The single guarantee under test: every coordinate the feature ever uses is coarsened
// to an area-granularity grid, so it can never be trilaterated to a precise point.

describe("coarsenCoordinate (privacy boundary)", () => {
  it("snaps a precise coordinate to the area grid, discarding sub-cell precision", () => {
    // A precise home fix like 44.4361234 must degrade to a ~10km cell centre.
    expect(coarsenCoordinate(44.4361234)).toBe(44.4);
    expect(coarsenCoordinate(26.1027)).toBe(26.1);
  });

  it("is idempotent — coarsening an already-coarse value does not drift", () => {
    const once = coarsenCoordinate(44.4361234);
    expect(coarsenCoordinate(once)).toBe(once);
  });

  it("uses the documented 0.1 degree grid", () => {
    expect(COARSE_GRID_DEGREES).toBe(0.1);
    // Two precise points inside the same cell collapse to the SAME coarse value,
    // so a member cannot be distinguished from a neighbour ~km away.
    expect(coarsenCoordinate(44.42)).toBe(coarsenCoordinate(44.44));
    expect(coarsenCoordinate(44.42)).toBe(44.4);
  });
});

describe("coarsenCoordinates", () => {
  it("coarsens a valid pair", () => {
    expect(coarsenCoordinates(44.4361, 26.1027)).toEqual({ latitude: 44.4, longitude: 26.1 });
  });

  it("rejects out-of-range or non-finite input rather than leaking a bogus match", () => {
    expect(coarsenCoordinates(999, 0)).toBeNull();
    expect(coarsenCoordinates(0, 999)).toBeNull();
    expect(coarsenCoordinates("nope", 10)).toBeNull();
    expect(coarsenCoordinates(NaN, NaN)).toBeNull();
  });

  it("accepts numeric strings (query params) and coarsens them", () => {
    expect(coarsenCoordinates("44.4361", "26.1027")).toEqual({ latitude: 44.4, longitude: 26.1 });
  });

  it("treats absent / blank input as no coordinate, never a bogus (0,0)", () => {
    expect(coarsenCoordinates("", "")).toBeNull();
    expect(coarsenCoordinates(null, null)).toBeNull();
    expect(coarsenCoordinates(undefined, undefined)).toBeNull();
    expect(coarsenCoordinates("44.4", "")).toBeNull();
  });
});

describe("distanceKm", () => {
  it("computes a plausible great-circle distance between two coarse city centres", () => {
    // Bucharest (44.4,26.1) to Ploiesti (44.9,26.0) is ~56km real; coarse ~within a few km.
    const d = distanceKm({ latitude: 44.4, longitude: 26.1 }, { latitude: 44.9, longitude: 26.0 });
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(65);
  });

  it("is zero for the same point", () => {
    expect(distanceKm({ latitude: 44.4, longitude: 26.1 }, { latitude: 44.4, longitude: 26.1 })).toBe(0);
  });
});

describe("isWithinRadius", () => {
  const bucharest = { latitude: 44.4, longitude: 26.1 };
  const ploiesti = { latitude: 44.9, longitude: 26.0 }; // ~56km away
  const cluj = { latitude: 46.8, longitude: 23.6 }; // ~330km away

  it("includes a nearby area within a generous radius", () => {
    expect(isWithinRadius(bucharest, ploiesti, 100)).toBe(true);
  });

  it("excludes a far area outside the radius", () => {
    expect(isWithinRadius(bucharest, cluj, 100)).toBe(false);
    expect(isWithinRadius(bucharest, ploiesti, 5)).toBe(false);
  });

  it("includes a same-cell area even at the smallest radius (boundary slack)", () => {
    expect(isWithinRadius(bucharest, bucharest, 5)).toBe(true);
  });

  it("rejects a non-positive radius", () => {
    expect(isWithinRadius(bucharest, bucharest, 0)).toBe(false);
    expect(isWithinRadius(bucharest, bucharest, -10)).toBe(false);
  });
});

describe("coarseCentreForArea (offline, no network)", () => {
  it("resolves a known city to its coarse centre", () => {
    expect(coarseCentreForArea("Bucharest")).toEqual({ latitude: 44.4, longitude: 26.1 });
  });

  it("normalises case, accents and hyphenation", () => {
    expect(coarseCentreForArea("cluj-napoca")).toEqual(coarseCentreForArea("Cluj Napoca"));
    expect(coarseCentreForArea("  BERLIN  ")).toEqual({ latitude: 52.5, longitude: 13.4 });
  });

  it("falls back to the city part of a 'Neighbourhood, City' free-text area", () => {
    expect(coarseCentreForArea("Kreuzberg, Berlin")).toEqual(coarseCentreForArea("Berlin"));
  });

  it("returns null for an area it cannot resolve (honest fallback, never invented)", () => {
    expect(coarseCentreForArea("Nowhereville")).toBeNull();
    expect(coarseCentreForArea("")).toBeNull();
  });

  it("only ever returns coarse (grid-snapped) coordinates", () => {
    const centre = coarseCentreForArea("Paris")!;
    expect(coarsenCoordinate(centre.latitude)).toBe(centre.latitude);
    expect(coarsenCoordinate(centre.longitude)).toBe(centre.longitude);
  });
});

describe("resolveDiscoveryCentre (privacy order of preference)", () => {
  it("prefers an opt-in device position and coarsens it", () => {
    const centre = resolveDiscoveryCentre({
      deviceCoordinates: { latitude: 44.4361234, longitude: 26.1027 },
      profileArea: "Cluj",
    });
    expect(centre).toEqual({ coordinates: { latitude: 44.4, longitude: 26.1 }, source: "device" });
  });

  it("falls back to the geocoded profile area when there is no device position", () => {
    const centre = resolveDiscoveryCentre({ profileArea: "Cluj-Napoca" });
    expect(centre).toEqual({ coordinates: { latitude: 46.8, longitude: 23.6 }, source: "area" });
  });

  it("returns null when neither a device position nor a resolvable area exists", () => {
    expect(resolveDiscoveryCentre({ profileArea: "Nowhereville" })).toBeNull();
    expect(resolveDiscoveryCentre({})).toBeNull();
  });

  it("ignores an out-of-range device fix and falls back to the area", () => {
    const centre = resolveDiscoveryCentre({
      deviceCoordinates: { latitude: 999, longitude: 0 },
      profileArea: "Bucharest",
    });
    expect(centre?.source).toBe("area");
  });
});

describe("filterWithinRadius", () => {
  const centre = { latitude: 44.4, longitude: 26.1 }; // Bucharest coarse
  const near: RadiusCandidate = { coordinates: { latitude: 44.9, longitude: 26.0 }, city: "Ploiesti" }; // ~56km
  const far: RadiusCandidate = { coordinates: { latitude: 46.8, longitude: 23.6 }, city: "Cluj-Napoca" }; // ~330km
  const uncoded: RadiusCandidate = { coordinates: null, city: "Bucharest" }; // no coord, same city

  it("keeps only coordinate candidates within the radius", () => {
    const kept = filterWithinRadius([near, far], centre, 100, "Bucharest");
    expect(kept).toEqual([near]);
  });

  it("widens with a larger radius to include a farther city", () => {
    const kept = filterWithinRadius([near, far], centre, 100, "Bucharest");
    expect(kept).not.toContain(far);
    const kept2 = filterWithinRadius([near, far], centre, 100 + 400, "Bucharest");
    expect(kept2).toContain(far);
  });

  it("falls back to city-label match for a candidate with no coordinate (additive, never hides)", () => {
    const kept = filterWithinRadius([uncoded], centre, 5, "Bucharest");
    expect(kept).toEqual([uncoded]);
    // An uncoded event in a DIFFERENT city than the centre is not label-matched.
    const otherCity: RadiusCandidate = { coordinates: null, city: "Cluj" };
    expect(filterWithinRadius([otherCity], centre, 5, "Bucharest")).toEqual([]);
  });
});

describe("coarseCentreForEvent", () => {
  it("prefers a stored approximate coordinate and coarsens it", () => {
    expect(
      coarseCentreForEvent({ approximateLatitude: 44.4361, approximateLongitude: 26.1027, city: "Cluj" }),
    ).toEqual({ latitude: 44.4, longitude: 26.1 });
  });

  it("geocodes the public city offline when no coordinate is stored", () => {
    expect(
      coarseCentreForEvent({ approximateLatitude: null, approximateLongitude: null, city: "Cluj-Napoca" }),
    ).toEqual({ latitude: 46.8, longitude: 23.6 });
  });

  it("returns null when there is neither a coordinate nor a resolvable city", () => {
    expect(
      coarseCentreForEvent({ approximateLatitude: null, approximateLongitude: null, city: "Nowhereville" }),
    ).toBeNull();
  });
});

describe("filterEventsWithinRadius (privacy boundary + matching, end to end)", () => {
  const centre = coarseCentreForArea("Bucharest")!;
  const nearStored = { approximateLatitude: 44.94, approximateLongitude: 26.03, city: "Ploiesti" }; // ~56km
  const farByCity = { approximateLatitude: null, approximateLongitude: null, city: "Cluj-Napoca" }; // ~330km, geocoded
  const sameCityUncoded = { approximateLatitude: null, approximateLongitude: null, city: "Bucharest" }; // label fallback

  it("keeps only events within the radius, geocoding cities that lack a coordinate", () => {
    expect(filterEventsWithinRadius([nearStored, farByCity], centre, 100, "Bucharest")).toEqual([nearStored]);
    expect(filterEventsWithinRadius([nearStored, farByCity], centre, 500, "Bucharest")).toEqual([nearStored, farByCity]);
  });

  it("never trilaterates: a precise stored coordinate is coarsened before matching", () => {
    // Two precise venues in the same coarse cell are indistinguishable to the filter.
    const a = { approximateLatitude: 44.421, approximateLongitude: 26.089, city: "Bucharest" };
    const b = { approximateLatitude: 44.438, approximateLongitude: 26.112, city: "Bucharest" };
    expect(coarseCentreForEvent(a)).toEqual(coarseCentreForEvent(b));
  });

  it("keeps an uncoded event via the same-city label fallback (additive, never hides)", () => {
    expect(filterEventsWithinRadius([sameCityUncoded], centre, 5, "Bucharest")).toEqual([sameCityUncoded]);
  });
});

describe("parseRadiusKm", () => {
  it("accepts the offered options", () => {
    expect(parseRadiusKm("5")).toBe(5);
    expect(parseRadiusKm("25")).toBe(25);
    expect(parseRadiusKm("100")).toBe(100);
  });

  it("treats anything else as no-radius (default), not a silent snap", () => {
    expect(parseRadiusKm("7")).toBeNull();
    expect(parseRadiusKm("")).toBeNull();
    expect(parseRadiusKm(null)).toBeNull();
    expect(parseRadiusKm("all")).toBeNull();
  });
});

describe("normalizeAreaKey", () => {
  it("lowercases, trims, folds accents and collapses whitespace", () => {
    expect(normalizeAreaKey("  Cluj-Napoca ")).toBe("cluj-napoca");
    expect(normalizeAreaKey("Iași")).toBe("iasi");
    expect(normalizeAreaKey("Cluj   Napoca")).toBe("cluj napoca");
  });
});
