// Plus-gated advanced discovery filters
// (CX-20260701-plus-perks-advanced-discovery-filters).
//
// This is the first real Plus PERK: a convenience layer that lets a member narrow
// discovery more finely — a finer distance radius, a schedule / time-of-day, and a
// multi-language selection. It is a *convenience* only, chosen by the member to
// narrow AT THEIR OWN REQUEST. It never widens eligibility, never bypasses any
// safety/fairness gate (age, approximate-location/city, language eligibility,
// capacity, mutual-block, host-exclusion — all enforced upstream in
// `getDiscoverableEvents` / the geo radius), and is never a compatibility /
// attractiveness / popularity score.
//
// GATING: whether these filters APPLY is decided by ONE entitlement check
// (`isPlus(user)` / `canUse(user, "advanced-discovery-filters")`) at the surface.
// `resolveAdvancedFilters` takes that boolean and FAILS CLOSED: when the member is
// not confirmed Plus, every advanced facet resolves to inactive, so a free member's
// discovery is byte-for-byte the existing baseline (all free filters, all eligible
// events, nothing silently excluded). A member who lapses from Plus simply stops
// having the advanced facets applied — no broken state.
//
// Kept free of `server-only` / DB / React imports so the matching rules and the
// gating fail-closed behaviour are exhaustively unit-testable and identical wherever
// discovery runs.

import { RADIUS_OPTIONS_KM, type RadiusKm } from "./discovery-geo";

/**
 * Finer distance bands offered ONLY to Plus members, on top of the free
 * {@link RADIUS_OPTIONS_KM} (`5 / 25 / 100`). These interleave tighter and
 * mid-range options so a Plus member can dial the radius in more precisely. They
 * deepen the existing free radius capability — they never replace or gate it.
 */
export const PLUS_RADIUS_OPTIONS_KM = [2, 10, 50] as const;
export type PlusRadiusKm = (typeof PLUS_RADIUS_OPTIONS_KM)[number];

/**
 * The complete radius option set a Plus member sees, sorted ascending: the free
 * bands plus the finer Plus bands, de-duplicated. Free members only ever see
 * {@link RADIUS_OPTIONS_KM}.
 */
export const ALL_RADIUS_OPTIONS_KM: readonly number[] = Array.from(
  new Set<number>([...RADIUS_OPTIONS_KM, ...PLUS_RADIUS_OPTIONS_KM]),
).sort((a, b) => a - b);

/**
 * Schedule / time-of-day windows a Plus member can narrow to. Each names a band of
 * local start hours (in the EVENT's own time zone) or a weekend constraint. A
 * member picks at most one; "any" (or an unrecognised value) means no schedule
 * narrowing. These are convenience windows only — they never affect eligibility.
 */
export const SCHEDULE_WINDOWS = ["morning", "afternoon", "evening", "weekend"] as const;
export type ScheduleWindow = (typeof SCHEDULE_WINDOWS)[number];

/** Local-hour bounds [startInclusive, endExclusive) for each time-of-day window. */
const TIME_OF_DAY_HOURS: Readonly<Record<Exclude<ScheduleWindow, "weekend">, readonly [number, number]>> = {
  morning: [5, 12],
  afternoon: [12, 17],
  evening: [17, 23],
};

export type AdvancedFilters = Readonly<{
  /** A finer Plus-only radius, if the member picked one AND it is a valid Plus band. */
  radiusKm: RadiusKm | PlusRadiusKm | null;
  /** The schedule window the member picked, or null for "any". */
  schedule: ScheduleWindow | null;
  /** Extra languages (beyond the single free `language` filter) to also accept. */
  languages: readonly string[];
  /** True when at least one advanced facet is active (used only for honest UI copy). */
  anyActive: boolean;
}>;

/** The always-inactive result. Reused so a free / fail-closed member is unambiguous. */
export const NO_ADVANCED_FILTERS: AdvancedFilters = {
  radiusKm: null,
  schedule: null,
  languages: [],
  anyActive: false,
};

/**
 * Parse a schedule query value into a known window, or null. Unrecognised / "any" /
 * blank all mean "no schedule narrowing" (never snap to a value the member did not
 * pick).
 */
export function parseScheduleWindow(value: string | null | undefined): ScheduleWindow | null {
  const key = (value ?? "").trim().toLowerCase();
  return (SCHEDULE_WINDOWS as readonly string[]).includes(key) ? (key as ScheduleWindow) : null;
}

/**
 * Parse a Plus-tier radius value into one of the FULL option set (free ∪ Plus), or
 * null. A free-only value stays valid here; the caller decides whether the finer
 * bands are permitted via the Plus gate. Unrecognised → null.
 */
export function parsePlusRadiusKm(value: string | null | undefined): RadiusKm | PlusRadiusKm | null {
  const parsed = Number((value ?? "").trim());
  return ALL_RADIUS_OPTIONS_KM.includes(parsed) ? (parsed as RadiusKm | PlusRadiusKm) : null;
}

/**
 * Parse a multi-language selection. Accepts a comma-separated string or an array
 * (repeated query params), trims/bounds each entry, drops blanks, de-duplicates
 * case-insensitively, and caps the count so a crafted query can't blow up the match.
 */
export function parseAdvancedLanguages(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const trimmed = String(entry ?? "").trim().slice(0, 35);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * Resolve the advanced filters for a request. THIS IS THE GATE: `plus` is the single
 * already-computed entitlement boolean (`isPlus(user)` / `canUse(...)`). When it is
 * false — free, expired, unknown, or an unconfirmable entitlement — we FAIL CLOSED
 * and return {@link NO_ADVANCED_FILTERS}, so none of the advanced facets apply and
 * the member gets the full baseline discovery. Only when `plus` is true do we honour
 * the member's advanced selections.
 */
export function resolveAdvancedFilters(
  plus: boolean,
  raw: {
    radius?: string | null;
    schedule?: string | null;
    languages?: string | string[] | null;
  },
): AdvancedFilters {
  if (!plus) return NO_ADVANCED_FILTERS;
  const radiusKm = parsePlusRadiusKm(raw.radius);
  const schedule = parseScheduleWindow(raw.schedule);
  const languages = parseAdvancedLanguages(raw.languages);
  const anyActive = radiusKm !== null || schedule !== null || languages.length > 0;
  return { radiusKm, schedule, languages, anyActive };
}

/**
 * Does an event's start fall inside the chosen schedule window? Uses the EVENT's own
 * IANA time zone so "evening" means evening where the event is, not the server's UTC.
 * A null window (member picked "any") matches everything. Falls back to matching
 * (never hiding) an event whose start / zone we cannot parse — the schedule facet is
 * a convenience narrowing, so an unparseable edge case errs toward INCLUDING the
 * event, never silently excluding it.
 */
export function eventMatchesSchedule(
  event: { startsAt: string; timeZone: string },
  window: ScheduleWindow | null,
): boolean {
  if (!window) return true;
  const parts = localHourAndWeekday(event.startsAt, event.timeZone);
  if (!parts) return true; // unparseable -> never hide
  if (window === "weekend") return parts.weekday === "Sat" || parts.weekday === "Sun";
  const [startHour, endHour] = TIME_OF_DAY_HOURS[window];
  return parts.hour >= startHour && parts.hour < endHour;
}

/**
 * Does an event's language satisfy the multi-language selection? The advanced
 * selection only NARROWS at the member's request: when they picked extra languages,
 * an event matches if its language is any of the picked ones (case-insensitive). An
 * empty selection matches everything (no narrowing). This never widens eligibility —
 * a member is still only shown events they were already eligible for upstream (the
 * SQL language-eligibility gate on their profile languages is unchanged); this facet
 * only lets a Plus member further restrict which of those they browse.
 */
export function eventMatchesLanguages(
  event: { language: string },
  languages: readonly string[],
): boolean {
  if (languages.length === 0) return true;
  const eventKey = (event.language ?? "").trim().toLowerCase();
  return languages.some((language) => language.trim().toLowerCase() === eventKey);
}

/**
 * Apply the in-process advanced facets (schedule + multi-language) to an already
 * eligibility-filtered, already radius-filtered event list. Pure and additive: it
 * only removes events the member explicitly narrowed away. The distance radius is
 * applied separately (it needs the geo centre) — this covers the two facets that
 * operate purely on the event row.
 */
export function applyAdvancedFilters<T extends { startsAt: string; timeZone: string; language: string }>(
  events: readonly T[],
  filters: AdvancedFilters,
): T[] {
  if (!filters.schedule && filters.languages.length === 0) return [...events];
  return events.filter(
    (event) => eventMatchesSchedule(event, filters.schedule) && eventMatchesLanguages(event, filters.languages),
  );
}

/**
 * Resolve an ISO instant to the local hour (0–23) and short weekday name in the
 * given IANA time zone, or null when either the instant or the zone is invalid.
 * Uses Intl only (no dependency); the caller treats null as "don't hide".
 */
function localHourAndWeekday(startsAt: string, timeZone: string): { hour: number; weekday: string } | null {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      hour: "numeric",
      hour12: false,
      weekday: "short",
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((part) => part.type === "hour")?.value;
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    // Intl can render midnight as "24" in some engines; normalise to 0.
    const hour = hourPart === undefined ? NaN : Number(hourPart) % 24;
    if (!Number.isFinite(hour)) return null;
    return { hour, weekday };
  } catch {
    return null; // invalid time zone -> don't hide
  }
}
