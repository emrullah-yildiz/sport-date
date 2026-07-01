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
