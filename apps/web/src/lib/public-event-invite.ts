// The PUBLIC, UNAUTHENTICATED shareable event invite (`/e/{id}`) — pure derivations
// (CX-20260704-growth-shareable-event-invite-og-image).
//
// PRIVACY IS THE CONTROLLING CONSTRAINT. This surface renders WITHOUT auth, so it is
// the most scrapeable view in the product. It therefore carries strictly LESS than
// the authenticated discovery view — only structured, discovery-safe facts:
//
//   sport · welcomed levels · language · approximate area (label + city) ·
//   date/time (in the event's own timezone) · duration · honest places-left.
//
// Deliberately EXCLUDED, by construction (the type cannot hold them):
//   - the exact meeting point / venue / address / precise coordinates (never
//     public before an accepted join — the product's core privacy guarantee);
//   - ALL host-authored free text (title, description, arrival instructions):
//     hosts sometimes type the venue into these, so on an unauthenticated page
//     they are a location-leak vector. The invite headline is derived from
//     structured fields instead ("Tennis in Floreasca, Bucharest").
//   - any person: no host name, no participant names, no ages — nothing for a
//     scraper to link to a human.
//   - even the coarse approximate coordinate: the public page shows the area as
//     TEXT only; it has no map, so it does not need any coordinate at all.
//
// `publicEventInviteFromRow` is the single choke point that turns a DB row into
// the public payload: it copies an explicit allowlist of fields and never spreads
// the row, so an accidentally-widened SELECT still cannot leak extra columns.
//
// No fake scarcity: availability reuses the same honest wording as discovery
// (`describeDiscoveryAvailability`) — "Last place" only when one genuinely
// remains, "Fully booked" stated plainly.
//
// Kept free of `server-only` / DB / React imports so the whole privacy boundary is
// unit-testable in the node test environment (same pattern as approximate-location).

import { describeDiscoveryAvailability, formatDiscoveryArea, formatDiscoveryDate } from "@/lib/discovery-card";

/** The complete public payload. Nothing outside this type ever reaches the page/OG. */
export type PublicEventInvite = Readonly<{
  id: string;
  sport: string;
  experienceLevels: readonly string[];
  language: string;
  areaLabel: string;
  city: string;
  countryCode: string;
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  capacity: number;
  acceptedCount: number;
}>;

/** The raw row shape the public-invite query selects (snake_case, allowlist only). */
export type PublicEventInviteRow = Readonly<{
  id: string;
  sport: string;
  experience_levels: string[];
  language: string;
  public_area_label: string;
  public_city: string;
  public_country_code: string;
  /** The Postgres driver may return an ISO string or a JS Date. */
  starts_at: string | Date;
  time_zone: string;
  duration_minutes: number;
  capacity: number;
  accepted_count: number;
}>;

/**
 * The single row → public payload choke point. Copies EXACTLY the allowlisted
 * fields — never `...row` — so even if the SQL were ever widened (or the driver
 * returned extra columns), no venue, address, coordinate, name, or free text
 * could ride along into the unauthenticated response.
 */
export function publicEventInviteFromRow(row: PublicEventInviteRow): PublicEventInvite {
  return {
    id: String(row.id),
    sport: String(row.sport),
    experienceLevels: (row.experience_levels ?? []).map((level) => String(level)),
    language: String(row.language),
    areaLabel: String(row.public_area_label),
    city: String(row.public_city),
    countryCode: String(row.public_country_code),
    // The driver may hand back a Date; normalise to an ISO instant string.
    startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : String(row.starts_at),
    timeZone: String(row.time_zone),
    durationMinutes: Number(row.duration_minutes),
    capacity: Number(row.capacity),
    acceptedCount: Number(row.accepted_count),
  };
}

/**
 * Clamp a public string for the OG image / meta text so an unusually long area
 * label can't blow the layout. Ellipsis, never truncation mid-guarantee copy.
 */
export function clampPublicText(value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/** "beginner / intermediate" → "Beginner / intermediate" (one calm label). */
export function describeInviteLevels(experienceLevels: readonly string[]): string {
  const levels = experienceLevels.map((level) => level.trim().toLowerCase()).filter(Boolean);
  if (levels.length === 0) return "All levels";
  if (levels.length === 3) return "All levels";
  const joined = levels.join(" / ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export type PublicInviteDescription = Readonly<{
  /** Derived, structured headline — never host free text. E.g. "Tennis in Floreasca, Bucharest". */
  headline: string;
  /** "Floreasca, Bucharest" (area label + city, deduplicated). */
  area: string;
  /** Two-line scannable when: "Sun 5 Jul" / "19:00" + ISO instant for <time>. */
  when: ReturnType<typeof formatDiscoveryDate>;
  /** Honest availability, same wording as discovery — no fake scarcity. */
  availability: ReturnType<typeof describeDiscoveryAvailability>;
  /** "Beginner / intermediate" or "All levels". */
  levels: string;
  /** True once the start instant has passed (the invite is no longer joinable). */
  hasStarted: boolean;
  /** <title> label for the page (brand suffix is added by the layout template). */
  metaTitle: string;
  /** og:description / twitter:description / meta description. */
  metaDescription: string;
  /** Accessible text equivalent of the OG card image. */
  ogAlt: string;
}>;

/**
 * Every string the public page, its meta tags, and the OG image render is derived
 * HERE from the allowlisted invite — so testing this function's output covers the
 * complete public wording surface for location leaks and fake scarcity.
 */
export function describePublicInvite(invite: PublicEventInvite, now: Date = new Date()): PublicInviteDescription {
  const area = formatDiscoveryArea(invite.areaLabel, invite.city);
  const headline = `${invite.sport} in ${area}`;
  const when = formatDiscoveryDate(invite.startsAt, invite.timeZone);
  const availability = describeDiscoveryAvailability(invite.capacity - invite.acceptedCount);
  const levels = describeInviteLevels(invite.experienceLevels);
  const startInstant = new Date(invite.startsAt).getTime();
  const hasStarted = Number.isFinite(startInstant) ? startInstant <= now.getTime() : false;

  const whenText = when.day && when.time ? `${when.day}, ${when.time}` : "";
  const facts = [whenText, levels, `${invite.durationMinutes} minutes`, availability.label].filter(Boolean).join(" · ");

  return {
    headline,
    area,
    when,
    availability,
    levels,
    hasStarted,
    metaTitle: headline,
    // Honest and privacy-forward: the description itself states the guarantee.
    metaDescription: `${facts}. Approximate area only — the exact meeting point is shared after the host accepts your request.`,
    ogAlt: `${headline}${whenText ? ` — ${whenText}` : ""}. ${availability.label}. Approximate area only; the exact meeting point stays private until the host accepts.`,
  };
}
