export type LocationSuggestion = Readonly<{
  id: string;
  label: string;
  address: string;
  postalCode: string;
  city: string;
  // Coarse sub-city area (neighbourhood/district) when the provider returns one.
  // Drives the public "City + district" discovery area (areaLabel = district || city).
  // Empty string when absent — the derivation then falls back to city.
  district: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}>;

// The coarse, PUBLIC area derived from a selected pin (CX-20260705). It is the ONLY
// location data the discoverable event carries pre-acceptance, so by construction it
// holds nothing but coarse components — never the street address or precise coords.
export type DerivedPublicArea = Readonly<{
  city: string;
  countryCode: string;
  areaLabel: string;
  postalCode: string;
}>;

/**
 * Derive the coarse public area from a chosen suggestion. Public discovery area =
 * City + district: prefer the sub-city `district`, fall back to `city` when the
 * provider returned none. The precise street address and latitude/longitude are
 * deliberately NOT part of the result — they stay on the private pin until a join
 * request is accepted. (`postalCode` rides with the private pin; it is derived here
 * only so the create/edit forms can forward it to the private-location record.)
 */
export function derivePublicAreaFromSuggestion(suggestion: LocationSuggestion): DerivedPublicArea {
  return {
    city: suggestion.city,
    countryCode: suggestion.countryCode,
    areaLabel: suggestion.district || suggestion.city,
    postalCode: suggestion.postalCode,
  };
}

// ——— Map-pick / reverse-geocode helpers (CX-20260706-event-location-map-picker) ———

/**
 * Decimals kept on a map-picked coordinate (6 ≈ 0.1 m). A raw Leaflet tap yields
 * float noise like 44.42683719482421 — rounding normalises what we store and what
 * we send to the reverse geocoder without losing any usable precision.
 */
export const PIN_COORDINATE_DECIMALS = 6;

/** Round a map-picked coordinate to the canonical pin precision. */
export function roundPinCoordinate(value: number): number {
  const factor = 10 ** PIN_COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Parse and validate a latitude/longitude query-parameter pair. Returns null for
 * anything missing, non-numeric, or out of range — the reverse proxy rejects those
 * before any provider call. Values are rounded to the canonical pin precision.
 */
export function parseCoordinatePair(
  latitudeRaw: string | null,
  longitudeRaw: string | null,
): { latitude: number; longitude: number } | null {
  if (!latitudeRaw?.trim() || !longitudeRaw?.trim()) return null;
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude: roundPinCoordinate(latitude), longitude: roundPinCoordinate(longitude) };
}

/**
 * Re-anchor a suggestion on the exact spot the host picked on the map. The
 * reverse geocoder describes the NEAREST known object, whose own coordinates can
 * sit metres away from the tapped point — but the host's tap is the intent
 * (fine-tuning "which entrance / which court"), so the pin keeps the tapped
 * coordinates and only the address text/coarse fields come from the geocoder.
 */
export function pinnedSuggestion(
  suggestion: LocationSuggestion,
  latitude: number,
  longitude: number,
): LocationSuggestion {
  return { ...suggestion, id: `pin:${latitude}:${longitude}`, latitude, longitude };
}

/**
 * Parse a Photon /reverse payload (same GeoJSON shape as forward search) into the
 * single best data-minimized suggestion, or null when the point resolves to
 * nothing addressable (open field, mid-lake…). Reuses `parsePhotonSuggestions`,
 * so the projection drops every provider extra exactly like the forward path.
 */
export function parsePhotonReverseSuggestion(payload: unknown): LocationSuggestion | null {
  return parsePhotonSuggestions(payload)[0] ?? null;
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePhotonSuggestions(payload: unknown): LocationSuggestion[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { features?: unknown }).features)) return [];
  const suggestions: LocationSuggestion[] = [];
  for (const raw of (payload as { features: PhotonFeature[] }).features.slice(0, 6)) {
    const properties = raw?.properties ?? {};
    const coordinates = raw?.geometry?.coordinates;
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) continue;

    const name = text(properties.name);
    const street = text(properties.street);
    const houseNumber = text(properties.housenumber);
    const address = [street, houseNumber].filter(Boolean).join(" ") || name;
    const postalCode = text(properties.postcode);
    const city = text(properties.city) || text(properties.locality) || text(properties.county);
    // Coarse sub-city area for the public "City + district" discovery label. Photon
    // exposes this as `district`; some results only carry `locality`, so fall back to
    // that. Left empty when neither is present (derivation then falls back to city).
    const district = text(properties.district) || text(properties.locality);
    const country = text(properties.country);
    const countryCode = text(properties.countrycode).toUpperCase();
    const label = [name && name !== address ? name : "", address, postalCode, city, country].filter(Boolean).join(", ");
    if (!label || !address) continue;
    const sourceId = [text(properties.osm_type), String(properties.osm_id ?? ""), latitude, longitude].join(":");
    suggestions.push({ id: sourceId, label, address, postalCode, city, district, countryCode, latitude, longitude });
  }
  return suggestions;
}
