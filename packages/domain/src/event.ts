export const MIN_EVENT_CAPACITY = 2 as const;
export const MAX_EVENT_CAPACITY = 20 as const;

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type ApproximateEventLocation = Readonly<{
  city: string;
  countryCode: string;
  areaLabel: string;
  approximateLatitude: number | null;
  approximateLongitude: number | null;
}>;

export type PrivateMeetingLocation = Readonly<{
  venueName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  instructions?: string;
}>;

export type EventLocation = Readonly<{
  public: ApproximateEventLocation;
  private: PrivateMeetingLocation;
}>;

export type SportEvent = Readonly<{
  id: string;
  hostId: string;
  sport: string;
  title: string;
  description: string;
  startsAt: Date;
  timeZone: string;
  durationMinutes: number;
  capacity: number;
  language: string;
  participantAgeRange: Readonly<{ minimum: number; maximum: number }>;
  experienceLevels: readonly ExperienceLevel[];
  location: EventLocation;
  status: EventStatus;
}>;

export type EventCandidate = Readonly<{
  userId: string;
  age: number;
  languages: readonly string[];
  sports: ReadonlyArray<{ name: string; experienceLevel: ExperienceLevel }>;
}>;

export type EventAccessContext = Readonly<{
  acceptedMemberIds: readonly string[];
  hostBlockedMemberIds: readonly string[];
  requesterHasBlockedHost: boolean;
}>;

export type EventEligibilityReason =
  | "not_available"
  | "event_started"
  | "event_full"
  | "host_cannot_request"
  | "adults_only"
  | "age_mismatch"
  | "sport_mismatch"
  | "experience_mismatch"
  | "language_mismatch";

export type EventEligibility = Readonly<{
  eligible: boolean;
  reasons: readonly EventEligibilityReason[];
}>;

export type EventLocationViewer =
  | { kind: "public" }
  | { kind: "member"; userId: string; participation: "none" | "pending" | "accepted" }
  | { kind: "host"; userId: string }
  | { kind: "moderator"; canAccessPreciseLocation: boolean };

export type VisibleEventLocation =
  | { visibility: "approximate"; location: ApproximateEventLocation }
  | { visibility: "precise"; location: EventLocation };

export class InvalidEventTransition extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEventTransition";
  }
}

export type EventCreationInput = Omit<SportEvent, "id" | "hostId" | "status">;
export type EventCreationValidation =
  | { valid: true; data: EventCreationInput }
  | { valid: false; errors: readonly string[] };

function optionalCoordinate(value: unknown, minimum: number, maximum: number): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum ? coordinate : undefined;
}

/**
 * The approximate PUBLIC coordinate is a discovery/spatial cue only, never a precise
 * point. It must never be stored or emitted finer than the ~10km (0.1°) area grid the
 * rest of the geo system enforces (mirrors `COARSE_GRID_DEGREES` /
 * `coarsenCoordinate` in the web app's `lib/discovery-geo.ts`). We snap it HERE, at the
 * write boundary, so the value persisted for `public_approximate_latitude/longitude`
 * can only ever name a coarse cell centre — a precise venue can never leak through the
 * approximate field even if the caller supplies a precise number
 * (CX-20260702-event-approx-coord-not-recoarsened-on-write-or-response).
 *
 * This deliberately does NOT touch the PRIVATE precise venue coordinate — that is a
 * separate field revealed only post-acceptance and must keep full precision.
 */
export const APPROXIMATE_COORDINATE_GRID_DEGREES = 0.1 as const;

export function coarsenApproximateCoordinate(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const snapped = Math.round(value / APPROXIMATE_COORDINATE_GRID_DEGREES) * APPROXIMATE_COORDINATE_GRID_DEGREES;
  // Fix floating error to a stable number of decimals so 0.1 cells compare cleanly.
  return Number(snapped.toFixed(4));
}

export function validateEventCreation(raw: unknown, now = new Date()): EventCreationValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Event details are required."] };
  const input = raw as Record<string, unknown>;
  const location = input.location && typeof input.location === "object" ? input.location as Record<string, unknown> : {};
  const publicLocation = location.public && typeof location.public === "object" ? location.public as Record<string, unknown> : {};
  const privateLocation = location.private && typeof location.private === "object" ? location.private as Record<string, unknown> : {};
  const levels = Array.isArray(input.experienceLevels)
    ? input.experienceLevels.filter((level): level is ExperienceLevel => level === "beginner" || level === "intermediate" || level === "advanced")
    : [];
  const startsAt = typeof input.startsAt === "string" || input.startsAt instanceof Date ? new Date(input.startsAt) : new Date(Number.NaN);
  const capacity = Number(input.capacity);
  const durationMinutes = Number(input.durationMinutes);
  const minimumAge = Number((input.participantAgeRange as Record<string, unknown> | undefined)?.minimum);
  const maximumAge = Number((input.participantAgeRange as Record<string, unknown> | undefined)?.maximum);
  const approximateLatitude = optionalCoordinate(publicLocation.approximateLatitude, -90, 90);
  const approximateLongitude = optionalCoordinate(publicLocation.approximateLongitude, -180, 180);
  const latitude = optionalCoordinate(privateLocation.latitude, -90, 90);
  const longitude = optionalCoordinate(privateLocation.longitude, -180, 180);
  const publicCity = typeof publicLocation.city === "string" ? publicLocation.city.trim() : "";
  const errors: string[] = [];

  if (Number.isNaN(startsAt.getTime())) errors.push("Choose a valid event start time.");
  if (approximateLatitude === undefined || approximateLongitude === undefined || latitude === undefined || longitude === undefined) errors.push("Coordinates must use valid latitude and longitude ranges.");
  if (new Set(levels).size !== levels.length || levels.length !== (Array.isArray(input.experienceLevels) ? input.experienceLevels.length : 0)) errors.push("Choose valid experience levels without duplicates.");

  const data: EventCreationInput = {
    sport: typeof input.sport === "string" ? input.sport.trim() : "",
    title: typeof input.title === "string" ? input.title.trim() : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    startsAt,
    timeZone: typeof input.timeZone === "string" ? input.timeZone.trim() : "",
    durationMinutes,
    capacity,
    language: typeof input.language === "string" ? input.language.trim() : "",
    participantAgeRange: { minimum: minimumAge, maximum: maximumAge },
    experienceLevels: levels,
    location: {
      public: {
        city: publicCity,
        countryCode: typeof publicLocation.countryCode === "string" ? publicLocation.countryCode.trim().toUpperCase() : "",
        // The public area label is DERIVED from the selected pin (city + district)
        // (CX-20260705). It is no longer typed by hand, so default it to the city
        // when absent — discovery always has a non-empty coarse area, and a pin that
        // resolves only to a city still publishes.
        areaLabel: (typeof publicLocation.areaLabel === "string" ? publicLocation.areaLabel.trim() : "") || publicCity,
        // Coarsen the approximate PUBLIC coordinate to the area grid at the write
        // boundary so a precise value can never be persisted/emitted for the
        // discovery field. `approximateLatitude`/`approximateLongitude` are still the
        // validated (in-range, non-`undefined`) values here; `undefined` (out of
        // range) short-circuits to the error branch above and never reaches storage.
        approximateLatitude: coarsenApproximateCoordinate(approximateLatitude ?? null),
        approximateLongitude: coarsenApproximateCoordinate(approximateLongitude ?? null),
      },
      private: {
        venueName: typeof privateLocation.venueName === "string" ? privateLocation.venueName.trim() : "",
        address: typeof privateLocation.address === "string" ? privateLocation.address.trim() : "",
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        instructions: typeof privateLocation.instructions === "string" ? privateLocation.instructions.trim() : undefined,
      },
    },
  };

  const draft: SportEvent = { ...data, id: "validation", hostId: "validation", status: "draft" };
  errors.push(...validateEventForPublishing(draft, now));
  if (!/^[A-Z]{2}$/.test(data.location.public.countryCode)) errors.push("Country code must contain two letters.");
  if (data.location.public.city.length < 1 || data.location.public.city.length > 100) errors.push("Choose a valid city.");
  if (data.location.private.venueName.length < 1 || data.location.private.venueName.length > 120) errors.push("Choose a valid venue name.");
  if ((data.location.private.instructions?.length ?? 0) > 500) errors.push("Arrival instructions must be 500 characters or fewer.");
  return errors.length > 0 ? { valid: false, errors: [...new Set(errors)] } : { valid: true, data };
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

export function validateEventForPublishing(event: SportEvent, now = new Date()): readonly string[] {
  const errors: string[] = [];
  if (event.status !== "draft") errors.push("Only draft events can be published.");
  if (!event.title.trim() || event.title.trim().length > 100) errors.push("Event title must contain 1 to 100 characters.");
  if (!event.sport.trim() || event.sport.trim().length > 60) errors.push("Sport must contain 1 to 60 characters.");
  if (event.description.trim().length < 20 || event.description.trim().length > 1000) errors.push("Event description must contain 20 to 1000 characters.");
  if (event.startsAt.getTime() <= now.getTime()) errors.push("Event must start in the future.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: event.timeZone }).format(now);
  } catch {
    errors.push("Choose a valid IANA time zone.");
  }
  if (event.durationMinutes < 15 || event.durationMinutes > 480) errors.push("Event duration must be between 15 and 480 minutes.");
  if (event.capacity < MIN_EVENT_CAPACITY || event.capacity > MAX_EVENT_CAPACITY) errors.push(`Event capacity must be between ${MIN_EVENT_CAPACITY} and ${MAX_EVENT_CAPACITY}.`);
  if (event.experienceLevels.length === 0) errors.push("Select at least one experience level.");
  if (!event.language.trim() || event.language.length > 35) errors.push("Choose a valid event language.");
  if (
    !Number.isInteger(event.participantAgeRange.minimum) ||
    !Number.isInteger(event.participantAgeRange.maximum) ||
    event.participantAgeRange.minimum < 18 ||
    event.participantAgeRange.maximum > 100 ||
    event.participantAgeRange.minimum > event.participantAgeRange.maximum
  ) errors.push("Participant age range must be between 18 and 100.");
  if (!event.location.public.areaLabel.trim()) errors.push("Add an approximate public area.");
  if (!event.location.private.address.trim()) errors.push("Add a private meeting address.");
  return errors;
}

export function publishEvent(event: SportEvent, now = new Date()): SportEvent {
  const errors = validateEventForPublishing(event, now);
  if (errors.length > 0) throw new InvalidEventTransition(errors[0]);
  return { ...event, status: "published" };
}

export function cancelEvent(event: SportEvent): SportEvent {
  if (event.status === "cancelled" || event.status === "completed") {
    throw new InvalidEventTransition(`Cannot cancel an event with status ${event.status}.`);
  }
  return { ...event, status: "cancelled" };
}

export function completeEvent(event: SportEvent, now = new Date()): SportEvent {
  if (event.status !== "published") {
    throw new InvalidEventTransition("Only published events can be completed.");
  }
  const endsAt = event.startsAt.getTime() + event.durationMinutes * 60_000;
  if (endsAt > now.getTime()) throw new InvalidEventTransition("An event cannot be completed before it ends.");
  return { ...event, status: "completed" };
}

export function assessEventEligibility(
  event: SportEvent,
  candidate: EventCandidate,
  access: EventAccessContext,
  now = new Date(),
): EventEligibility {
  const reasons: EventEligibilityReason[] = [];
  if (
    event.status !== "published" ||
    access.hostBlockedMemberIds.includes(candidate.userId) ||
    access.requesterHasBlockedHost
  ) reasons.push("not_available");
  if (event.startsAt.getTime() <= now.getTime()) reasons.push("event_started");
  if (access.acceptedMemberIds.length >= event.capacity) reasons.push("event_full");
  if (candidate.userId === event.hostId) reasons.push("host_cannot_request");
  if (candidate.age < 18) reasons.push("adults_only");
  else if (candidate.age < event.participantAgeRange.minimum || candidate.age > event.participantAgeRange.maximum) reasons.push("age_mismatch");

  const sport = candidate.sports.find((item) => normalized(item.name) === normalized(event.sport));
  if (!sport) reasons.push("sport_mismatch");
  else if (!event.experienceLevels.includes(sport.experienceLevel)) reasons.push("experience_mismatch");
  if (!candidate.languages.some((language) => normalized(language) === normalized(event.language))) reasons.push("language_mismatch");

  return { eligible: reasons.length === 0, reasons };
}

export function publicEventLocation(location: EventLocation): ApproximateEventLocation {
  return location.public;
}

export function eventLocationForViewer(
  event: SportEvent,
  viewer: EventLocationViewer,
): VisibleEventLocation {
  const precise =
    (viewer.kind === "host" && viewer.userId === event.hostId) ||
    (viewer.kind === "member" && viewer.participation === "accepted") ||
    (viewer.kind === "moderator" && viewer.canAccessPreciseLocation);
  return precise
    ? { visibility: "precise", location: event.location }
    : { visibility: "approximate", location: event.location.public };
}
