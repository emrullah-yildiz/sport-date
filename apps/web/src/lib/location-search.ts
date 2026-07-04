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
