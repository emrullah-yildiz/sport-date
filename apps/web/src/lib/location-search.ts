export type LocationSuggestion = Readonly<{
  id: string;
  label: string;
  address: string;
  postalCode: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}>;

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
    const country = text(properties.country);
    const countryCode = text(properties.countrycode).toUpperCase();
    const label = [name && name !== address ? name : "", address, postalCode, city, country].filter(Boolean).join(", ");
    if (!label || !address) continue;
    const sourceId = [text(properties.osm_type), String(properties.osm_id ?? ""), latitude, longitude].join(":");
    suggestions.push({ id: sourceId, label, address, postalCode, city, countryCode, latitude, longitude });
  }
  return suggestions;
}
