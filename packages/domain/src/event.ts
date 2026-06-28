export const MIN_EVENT_CAPACITY = 2 as const;
export const MAX_EVENT_CAPACITY = 20 as const;

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type ApproximateEventLocation = Readonly<{
  city: string;
  countryCode: string;
  areaLabel: string;
  approximateLatitude: number;
  approximateLongitude: number;
}>;

export type PrivateMeetingLocation = Readonly<{
  venueName: string;
  address: string;
  latitude: number;
  longitude: number;
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
  startsAt: Date;
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

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

export function validateEventForPublishing(event: SportEvent, now = new Date()): readonly string[] {
  const errors: string[] = [];
  if (event.status !== "draft") errors.push("Only draft events can be published.");
  if (!event.title.trim() || event.title.trim().length > 100) errors.push("Event title must contain 1 to 100 characters.");
  if (!event.sport.trim() || event.sport.trim().length > 60) errors.push("Sport must contain 1 to 60 characters.");
  if (event.startsAt.getTime() <= now.getTime()) errors.push("Event must start in the future.");
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
