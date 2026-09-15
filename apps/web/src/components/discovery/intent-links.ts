import { parseAdvancedLanguages } from "@/lib/discovery-advanced-filters";
import { coarsenCoordinates } from "@/lib/discovery-geo";

export type DiscoveryIntentQuery = Record<string, string | string[] | undefined>;
export type DiscoveryIntentDays = 1 | 7 | 30;

export const DISCOVERY_TIME_CHOICES = [
  { days: 1, label: "Next 24 hours" },
  { days: 7, label: "Next 7 days" },
  { days: 30, label: "Next 30 days" },
] as const;

/** Change time only; the destination still runs all eligibility/Plus gates.
 * Copy only supported filters, never arbitrary query values or a precise pin. */
export function discoveryIntentHref(query: DiscoveryIntentQuery, days: DiscoveryIntentDays): string {
  const next = discoveryPreservedFilters(query);
  next.set("days", String(days));
  return `/discover?${next.toString()}`;
}

export function discoveryPreservedFilters(query: DiscoveryIntentQuery): URLSearchParams {
  const next = new URLSearchParams();
  const fields = { city: 100, sport: 60, language: 35, near: 3, radius: 3, schedule: 12 };
  for (const [key, maximum] of Object.entries(fields)) {
    const raw = query[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim().slice(0, maximum);
    if (value) next.set(key, value);
  }
  for (const language of parseAdvancedLanguages(query.languages)) next.append("languages", language);
  const coordinates = typeof query.lat === "string" && typeof query.lng === "string"
    ? coarsenCoordinates(query.lat, query.lng)
    : null;
  if (coordinates) {
    next.set("lat", String(coordinates.latitude));
    next.set("lng", String(coordinates.longitude));
  }
  return next;
}
