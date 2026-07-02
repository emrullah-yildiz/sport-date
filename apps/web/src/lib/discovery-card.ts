// Pure presentation helpers for the /discover feed cards.
//
// The discovery card leads with the facts a member actually decides on — sport +
// approximate area, and *when* — so a screen of invitations can be scanned rather
// than read in full (CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed).
//
// Kept free of `server-only` and any DB/React import so the scan-critical rules
// (date/time split, honest availability wording, approximate-area-only location)
// are unit-testable in the node test environment.

export type DiscoveryCardFacts = Readonly<{
  sport: string;
  timeZone: string;
  areaLabel: string;
  city: string;
  placesRemaining: number;
  capacity: number;
  startsAt: string;
}>;

export type DiscoveryDateParts = Readonly<{ day: string; time: string }>;

/**
 * Split the event start into a scannable two-line date/time: a short calendar day
 * ("Sun 5 Jul") and the clock time ("19:00"), both rendered in the event's own
 * timezone so the "when" is unambiguous. Emphasised as the primary scan fact.
 */
export function formatDiscoveryDate(startsAt: string, timeZone: string): DiscoveryDateParts {
  const date = new Date(startsAt);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
  return { day, time };
}

/**
 * The approximate location shown publicly on the feed — area label plus city only.
 * Precise venue/address is never part of a discovery card and is not accepted here,
 * preserving the "approximate area until an accepted join" privacy rule.
 */
export function formatDiscoveryArea(areaLabel: string, city: string): string {
  const area = areaLabel.trim();
  const town = city.trim();
  if (area && town && area.toLowerCase() !== town.toLowerCase()) return `${area}, ${town}`;
  return area || town;
}

/**
 * Resolve which city discovery should search, centring the feed on the member's
 * own area by DEFAULT (CX-20260701-discover-no-location-around-me-search).
 *
 * Today the member's location is a single free-text string (often just a city, e.g.
 * "Bucharest" / "Cluj-Napoca") and there are no member coordinates, so "near me" is
 * implemented as "in my area": when the member has NOT typed a city and has NOT
 * asked to broaden ("everywhere"), we default the effective city filter to their
 * profile area rather than leaving it empty — so a member who does not know or type
 * the exact city still sees what is happening around them.
 *
 * Privacy: this only ever uses the member's own already-stored approximate area and
 * the event's approximate public city. It exposes no precise member or venue
 * location and adds no device geolocation. A one-tap "everywhere" broaden keeps the
 * member in control and never traps them in an empty local feed.
 *
 * Precedence: an explicit typed `requestedCity` always wins (the member is
 * deliberately searching a specific place); `everywhere` clears the area default
 * (broaden). Only when neither is set do we fall back to the profile area.
 */
export type ResolvedDiscoveryArea = Readonly<{
  /** The city string to hand to the discovery query ("" means search everywhere). */
  effectiveCity: string;
  /** True when we applied the profile-area default (member typed nothing, not broadened). */
  isNearMeDefault: boolean;
  /** The member's own approximate area, trimmed — for "near <area>" framing; may be "". */
  memberArea: string;
}>;

export function resolveDiscoveryArea(
  profileLocation: string,
  requestedCity: string,
  everywhere: boolean,
): ResolvedDiscoveryArea {
  const memberArea = (profileLocation ?? "").trim();
  const typedCity = (requestedCity ?? "").trim();
  if (typedCity) return { effectiveCity: typedCity, isNearMeDefault: false, memberArea };
  if (everywhere) return { effectiveCity: "", isNearMeDefault: false, memberArea };
  if (memberArea) return { effectiveCity: memberArea, isNearMeDefault: true, memberArea };
  return { effectiveCity: "", isNearMeDefault: false, memberArea };
}

/**
 * The warm, personal arrival greeting shown at the top of /discover
 * (CX-20260701-discover-first-run-arrival-lacks-warm-welcome). The single most
 * repeated moment in the product should read like an honest host greeting — not the
 * static pre-signup marketing billboard every member saw before joining.
 *
 * Built ONLY from the member's own already-available data: their first name and their
 * stored approximate profile area (the same area used for the near-me feed). No new
 * data, no query, no precise member/venue location, and — critically — no fabricated
 * traction, scarcity, streaks, or popularity metrics. When we have no first name we
 * fall back to a warm, name-less welcome rather than an awkward empty slot.
 */
export type DiscoveryGreeting = Readonly<{
  /** The h1 greeting, e.g. "Welcome back, Ana." — always a complete, human sentence. */
  heading: string;
  /** A calm located/orienting sub-line, e.g. "Here's what's happening near Bucharest." */
  subheading: string;
}>;

export function buildDiscoveryGreeting(
  firstName: string,
  memberArea: string,
  options: { searchEverywhere?: boolean } = {},
): DiscoveryGreeting {
  const name = (firstName ?? "").trim();
  const area = (memberArea ?? "").trim();
  const heading = name ? `Welcome back, ${name}.` : "Welcome back.";
  // Honest orientation: name the member's own area when we have it and we're centred
  // on it; when broadened to everywhere, or when we have no area, keep it warm and true
  // without implying a location we don't have.
  const subheading = options.searchEverywhere
    ? "Here's what's happening across every area."
    : area
      ? `Here's what's happening near ${area}.`
      : "Here's what's happening in the community.";
  return { heading, subheading };
}

/**
 * A human, located results heading for the populated feed
 * (CX-20260701-discover-first-run-arrival-lacks-warm-welcome). It states the REAL
 * count — no fabricated "people near you", scarcity, or popularity metric — but frames
 * it as "N open near {area}" / "N open everywhere" rather than a bare "N invitations",
 * so arriving feels located and for-me. The empty state is owned separately (the warm
 * near-me-aware empty copy in page.tsx); this only shapes the count >= 1 heading.
 */
export function describeDiscoveryResultsHeading(input: {
  count: number;
  memberArea: string;
  isNearMeDefault: boolean;
  searchEverywhere: boolean;
}): string {
  const count = Math.max(0, Math.trunc(input.count));
  const noun = count === 1 ? "invitation" : "invitations";
  const area = (input.memberArea ?? "").trim();
  if (input.isNearMeDefault && area) return `${count} ${noun} near ${area}`;
  if (input.searchEverywhere) return `${count} ${noun} everywhere`;
  return `${count} ${noun}`;
}

export type DiscoveryAvailability = Readonly<{
  /** Short, glanceable label, e.g. "3 places left" / "Last place" / "Fully booked". */
  label: string;
  /** True only when there is genuinely nothing left — used for a calm muted style, never scarcity red. */
  isFull: boolean;
}>;

/**
 * Honest, calm availability wording. States the real remaining count with no
 * manufactured urgency and no artificial-scarcity styling: "Last place" is a plain
 * fact (one place genuinely remains), not a pressure tactic. When full we say so
 * plainly rather than hiding it.
 */
export function describeDiscoveryAvailability(placesRemaining: number): DiscoveryAvailability {
  const remaining = Math.max(0, Math.trunc(placesRemaining));
  if (remaining <= 0) return { label: "Fully booked", isFull: true };
  if (remaining === 1) return { label: "Last place", isFull: false };
  return { label: `${remaining} places left`, isFull: false };
}
