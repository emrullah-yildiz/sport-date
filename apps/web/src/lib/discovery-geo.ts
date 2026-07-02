// Pure geo helpers for the /discover distance-radius feature
// (CX-20260701-discover-geo-radius-and-use-my-location).
//
// PRIVACY IS PARAMOUNT here. Everything in this module works only on COARSE
// (area-granularity) coordinates:
//   - No member's precise home coordinates are ever produced or stored. A member
//     has no coordinates in the schema at all — we DERIVE a coarse centre from
//     their existing free-text profile area, or coarsen an opt-in device position
//     CLIENT-SIDE before it is ever sent. Either way it is rounded to a grid so it
//     cannot be trilaterated back to a precise point.
//   - Events expose only their already-public approximate area; when a stored
//     approximate coordinate is missing we derive a coarse centre from the public
//     city. The precise venue (event_private_locations) is never touched here.
//
// Kept free of `server-only` and any DB/React import so the matching rule and the
// coarsening/privacy boundary are unit-testable in the node test environment and
// so the same coarsening runs identically on the client (device-location path).

export type Coordinates = Readonly<{ latitude: number; longitude: number }>;

/**
 * Coarsening grid, in degrees. 0.1° of latitude is ~11 km; longitude shrinks with
 * latitude but at European latitudes a 0.1° cell is still several km across. Rounding
 * every coordinate to this grid means the value we hold or send can only ever name a
 * ~10 km cell centre — never a member's exact home or a precise venue — so it cannot
 * be trilaterated back to a point. This is the single privacy boundary the whole
 * feature depends on; it is deliberately coarser than any useful "find the person"
 * precision.
 */
export const COARSE_GRID_DEGREES = 0.1 as const;

/** The radius options offered on /discover, in kilometres. */
export const RADIUS_OPTIONS_KM = [5, 25, 100] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS_KM)[number];

/**
 * Round a coordinate to the coarse area grid. This is applied to EVERY coordinate
 * before it is compared, sent, or (never) stored, so a precise device fix or a
 * precise geocode result is immediately degraded to an area-granularity cell. Idempotent.
 */
export function coarsenCoordinate(value: number): number {
  // Round to the grid, then fix floating error to a stable number of decimals so
  // 0.1 grid cells compare cleanly (e.g. 44.4 not 44.400000001).
  const snapped = Math.round(value / COARSE_GRID_DEGREES) * COARSE_GRID_DEGREES;
  return Number(snapped.toFixed(4));
}

/**
 * Coarsen a full coordinate pair to the area grid, rejecting anything outside valid
 * lat/lng ranges (returns null) so a bad device fix or a parse error can never leak
 * through as a "0,0" match. The result is safe to send to the server / use in a query.
 */
export function coarsenCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  // Treat absent / blank input as "no coordinate" — NOT as 0. `Number("")` is 0, which
  // would otherwise smuggle a bogus (0,0) fix past the range check and override the
  // profile-area centre when the member never shared a location.
  if (latitude === null || latitude === undefined || latitude === "" || longitude === null || longitude === undefined || longitude === "") {
    return null;
  }
  const lat = typeof latitude === "number" ? latitude : Number(latitude);
  const lng = typeof longitude === "number" ? longitude : Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: coarsenCoordinate(lat), longitude: coarsenCoordinate(lng) };
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates in kilometres (haversine). Because
 * both inputs are already coarse (grid-snapped), the result is itself an approximate
 * area-to-area distance, not a precise point-to-point one — appropriate for a "within
 * X km" discovery filter and nothing more precise.
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The radius match rule: an event is within the radius when the (coarse) distance
 * from the member's (coarse) centre to the event's (coarse) centre is at most the
 * chosen radius. To absorb the up-to-~half-a-cell rounding either coordinate can
 * carry, we add one grid cell of slack (converted to km) so a coarsening artefact
 * never hides an event that is genuinely just inside the boundary. Erring toward
 * INCLUDING a borderline event is the honest choice — it never fabricates proximity
 * for something far away, and the member can always narrow the radius.
 */
export function isWithinRadius(centre: Coordinates, target: Coordinates, radiusKm: number): boolean {
  if (!(radiusKm > 0)) return false;
  const cellSlackKm = COARSE_GRID_DEGREES * 111; // ~1 grid cell of latitude in km
  return distanceKm(centre, target) <= radiusKm + cellSlackKm;
}

/**
 * A tiny OFFLINE gazetteer of Europe-first cities/areas → coarse coordinates. We do
 * NOT wire an external geocoding service: that would be a network dependency and an
 * owner-escalation call, and — more importantly for privacy — sending a member's
 * free-text area to a third party is exactly the leak we are avoiding. Instead we
 * resolve the common areas the product already serves, entirely in-process, and the
 * result is coarsened to the same area grid as everything else.
 *
 * Coverage is deliberately partial and honest: an area we cannot resolve simply has
 * NO coordinate, so the radius filter does not apply to it and discovery falls back
 * to the existing exact-label city match (never a wrong or invented location). Keys
 * are normalised (lowercased, trimmed, accents folded) so "Cluj-Napoca" and
 * "cluj napoca" resolve alike.
 */
const GAZETTEER_RAW: ReadonlyArray<readonly [string, number, number]> = [
  // Romania (product's first market)
  ["bucharest", 44.43, 26.1],
  ["bucuresti", 44.43, 26.1],
  ["cluj-napoca", 46.77, 23.6],
  ["cluj napoca", 46.77, 23.6],
  ["cluj", 46.77, 23.6],
  ["timisoara", 45.75, 21.23],
  ["iasi", 47.16, 27.59],
  ["brasov", 45.66, 25.61],
  ["constanta", 44.18, 28.63],
  ["sibiu", 45.79, 24.15],
  ["oradea", 47.06, 21.93],
  ["ploiesti", 44.94, 26.03],
  // Wider Europe (a few anchor cities so the radius is useful cross-border too)
  ["berlin", 52.52, 13.4],
  ["london", 51.51, -0.13],
  ["paris", 48.86, 2.35],
  ["madrid", 40.42, -3.7],
  ["barcelona", 41.39, 2.17],
  ["rome", 41.9, 12.5],
  ["milan", 45.46, 9.19],
  ["vienna", 48.21, 16.37],
  ["budapest", 47.5, 19.04],
  ["warsaw", 52.23, 21.01],
  ["prague", 50.08, 14.44],
  ["amsterdam", 52.37, 4.9],
  ["lisbon", 38.72, -9.14],
  ["athens", 37.98, 23.73],
  ["sofia", 42.7, 23.32],
  ["dublin", 53.35, -6.26],
];

/**
 * Normalise a free-text area/city to a gazetteer lookup key: lowercase, trim, fold
 * accents, and collapse internal whitespace. Kept pure and export-free of any locale
 * surprises so the same string resolves the same way on client and server.
 */
export function normalizeAreaKey(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const GAZETTEER: ReadonlyMap<string, Coordinates> = new Map(
  GAZETTEER_RAW.map(([name, lat, lng]) => [
    normalizeAreaKey(name),
    { latitude: coarsenCoordinate(lat), longitude: coarsenCoordinate(lng) },
  ]),
);

/**
 * Resolve a free-text area/city to a COARSE approximate centre using the offline
 * gazetteer, or null when we cannot resolve it (the honest fallback: no radius, keep
 * label matching). The returned coordinate is already grid-snapped. Never touches the
 * network and never returns a precise point.
 */
export function coarseCentreForArea(area: string): Coordinates | null {
  const key = normalizeAreaKey(area);
  if (!key) return null;
  const direct = GAZETTEER.get(key);
  if (direct) return direct;
  // Free-text areas are often "Neighbourhood, City" — fall back to the last comma
  // segment (the city) so "Kreuzberg, Berlin" still resolves to Berlin's coarse cell.
  if (key.includes(",")) {
    const city = key.split(",").map((part) => part.trim()).filter(Boolean).pop();
    if (city) {
      const byCity = GAZETTEER.get(city);
      if (byCity) return byCity;
    }
  }
  return null;
}

export type DiscoveryGeoCentre = Readonly<{
  coordinates: Coordinates;
  /** How we obtained the centre — for honest UI copy, never stored. */
  source: "device" | "area";
}>;

/**
 * Resolve the coarse centre the radius filter should use for THIS search, in privacy
 * order of preference:
 *   1. An opt-in device position (already coarsened client-side) — used only for this
 *      search, never stored.
 *   2. The member's profile area, geocoded offline to a coarse centre.
 * Returns null when neither resolves (e.g. an unknown free-text area and no device
 * position) — the caller then keeps the existing label-based matching instead of a radius.
 */
export function resolveDiscoveryCentre(input: {
  deviceCoordinates?: Coordinates | null;
  profileArea?: string;
}): DiscoveryGeoCentre | null {
  const device = input.deviceCoordinates
    ? coarsenCoordinates(input.deviceCoordinates.latitude, input.deviceCoordinates.longitude)
    : null;
  if (device) return { coordinates: device, source: "device" };
  const area = coarseCentreForArea(input.profileArea ?? "");
  if (area) return { coordinates: area, source: "area" };
  return null;
}

export type RadiusCandidate = Readonly<{
  /** The event's coarse centre if we could resolve one (stored approx coord or city geocode). */
  coordinates: Coordinates | null;
  /** The event's public city, for the label fallback when it has no coordinate. */
  city: string;
}>;

/**
 * Filter discovery candidates to those within the radius of the centre.
 *
 * Applied on already area-coarse coordinates only. When a candidate has no resolvable
 * coordinate we FALL BACK to matching its public city label against the centre's own
 * area label (passed as `centreCity`) — so an event in an area we cannot geocode is
 * still shown when it shares the member's city, exactly as the pre-radius behaviour
 * did. This keeps the radius purely additive: it can widen the feed (nearby cities)
 * but never hides an event the label match would have shown.
 */
export function filterWithinRadius<T extends RadiusCandidate>(
  candidates: readonly T[],
  centre: Coordinates,
  radiusKm: number,
  centreCity: string,
): T[] {
  const cityKey = normalizeAreaKey(centreCity);
  return candidates.filter((candidate) => {
    if (candidate.coordinates) return isWithinRadius(centre, candidate.coordinates, radiusKm);
    // No coordinate for this event — keep the honest label fallback.
    return cityKey !== "" && normalizeAreaKey(candidate.city) === cityKey;
  });
}

/**
 * Resolve an event's COARSE centre for radius matching: prefer its stored approximate
 * public coordinate (coarsened again, defensively), else geocode its public city
 * offline. Returns null when neither resolves — the label fallback then applies.
 * Never touches the precise venue.
 */
export function coarseCentreForEvent(event: {
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  city: string;
}): Coordinates | null {
  if (event.approximateLatitude !== null && event.approximateLongitude !== null) {
    const stored = coarsenCoordinates(event.approximateLatitude, event.approximateLongitude);
    if (stored) return stored;
  }
  return coarseCentreForArea(event.city);
}

/**
 * The end-to-end discovery radius filter over a list of events. Pure and generic so
 * it is unit-testable and identical wherever discovery runs. For each event we resolve
 * a coarse centre (stored approx coord or city geocode); an event with no resolvable
 * coordinate keeps the honest city-label fallback against `centreCity`. See
 * `filterWithinRadius` for the privacy/fallback contract.
 */
export function filterEventsWithinRadius<
  T extends { approximateLatitude: number | null; approximateLongitude: number | null; city: string },
>(events: readonly T[], centre: Coordinates, radiusKm: number, centreCity: string): T[] {
  const cityKey = normalizeAreaKey(centreCity);
  return events.filter((event) => {
    const coordinates = coarseCentreForEvent(event);
    if (coordinates) return isWithinRadius(centre, coordinates, radiusKm);
    return cityKey !== "" && normalizeAreaKey(event.city) === cityKey;
  });
}

/**
 * Parse a requested radius query value into one of the offered options, or null when
 * the member has not chosen a radius (the default: no distance filter, keep the
 * existing area-label behaviour). Anything unrecognised is treated as "no radius"
 * rather than silently snapping to a value the member did not pick.
 */
export function parseRadiusKm(value: string | null | undefined): RadiusKm | null {
  const parsed = Number((value ?? "").trim());
  return (RADIUS_OPTIONS_KM as readonly number[]).includes(parsed) ? (parsed as RadiusKm) : null;
}
