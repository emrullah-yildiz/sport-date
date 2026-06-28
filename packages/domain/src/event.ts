export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type EventLocation = Readonly<{
  city: string;
  countryCode: string;
  approximateLatitude: number;
  approximateLongitude: number;
  privateMeetingPoint?: string;
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
  experienceLevels: readonly ExperienceLevel[];
  location: EventLocation;
}>;

export function publicEventLocation(
  location: EventLocation,
): Omit<EventLocation, "privateMeetingPoint"> {
  const { privateMeetingPoint: _privateMeetingPoint, ...publicLocation } = location;
  return publicLocation;
}

