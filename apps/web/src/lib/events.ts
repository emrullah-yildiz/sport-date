import "server-only";

import { getDatabase } from "@/lib/db";

export type HostEvent = Readonly<{
  id: string;
  sport: string;
  title: string;
  description: string;
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  capacity: number;
  language: string;
  minimumAge: number;
  maximumAge: number;
  experienceLevels: string[];
  status: string;
  publicLocation: { city: string; countryCode: string; areaLabel: string };
  privateLocation: { venueName: string; address: string; instructions: string | null };
}>;

export type DiscoveryFilters = Readonly<{
  city: string;
  sport: string;
  language: string;
  withinDays: 1 | 7 | 30;
}>;

export type DiscoveryEvent = Readonly<{
  id: string;
  sport: string;
  title: string;
  description: string;
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  capacity: number;
  language: string;
  minimumAge: number;
  maximumAge: number;
  experienceLevels: string[];
  hostFirstName: string;
  areaLabel: string;
  city: string;
  countryCode: string;
}>;

type HostEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[]; status: string;
  public_city: string; public_country_code: string; public_area_label: string;
  venue_name: string; address: string; arrival_instructions: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getHostEvent(eventId: string, hostId: string): Promise<HostEvent | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT events.*, private_location.venue_name, private_location.address, private_location.arrival_instructions
    FROM events
    JOIN event_private_locations AS private_location ON private_location.event_id = events.id
    WHERE events.id = ${eventId}::uuid AND events.host_user_id = ${hostId}
    LIMIT 1
  ` as unknown as HostEventRow[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id, sport: row.sport, title: row.title, description: row.description,
    startsAt: row.starts_at, timeZone: row.time_zone, durationMinutes: row.duration_minutes,
    capacity: row.capacity, language: row.language, minimumAge: row.minimum_age,
    maximumAge: row.maximum_age, experienceLevels: row.experience_levels, status: row.status,
    publicLocation: { city: row.public_city, countryCode: row.public_country_code, areaLabel: row.public_area_label },
    privateLocation: { venueName: row.venue_name, address: row.address, instructions: row.arrival_instructions },
  };
}

type DiscoveryEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[];
  host_first_name: string; public_area_label: string; public_city: string; public_country_code: string;
};

export async function getDiscoverableEvents(
  user: { id: string; age: number },
  filters: DiscoveryFilters,
): Promise<DiscoveryEvent[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      events.id, events.sport, events.title, events.description, events.starts_at,
      events.time_zone, events.duration_minutes, events.capacity, events.language,
      events.minimum_age, events.maximum_age, events.experience_levels,
      host.first_name AS host_first_name,
      events.public_area_label, events.public_city, events.public_country_code
    FROM events
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    JOIN user_sports AS compatible_sport
      ON compatible_sport.user_id = ${user.id}
      AND LOWER(compatible_sport.sport) = LOWER(events.sport)
      AND compatible_sport.skill_level = ANY(events.experience_levels)
    WHERE events.status = 'published'
      AND events.starts_at > NOW()
      AND events.starts_at <= NOW() + (${filters.withinDays} * INTERVAL '1 day')
      AND events.host_user_id <> ${user.id}
      AND ${user.age} BETWEEN events.minimum_age AND events.maximum_age
      AND (${filters.city} = '' OR LOWER(events.public_city) = LOWER(${filters.city}))
      AND (${filters.sport} = '' OR LOWER(events.sport) = LOWER(${filters.sport}))
      AND (${filters.language} = '' OR LOWER(events.language) = LOWER(${filters.language}))
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = ${user.id} AND blocked_user_id = events.host_user_id)
           OR (blocker_user_id = events.host_user_id AND blocked_user_id = ${user.id})
      )
    ORDER BY events.starts_at ASC
    LIMIT 100
  ` as unknown as DiscoveryEventRow[];

  return rows.map((row) => ({
    id: row.id, sport: row.sport, title: row.title, description: row.description,
    startsAt: row.starts_at, timeZone: row.time_zone, durationMinutes: row.duration_minutes,
    capacity: row.capacity, language: row.language, minimumAge: row.minimum_age,
    maximumAge: row.maximum_age, experienceLevels: row.experience_levels,
    hostFirstName: row.host_first_name, areaLabel: row.public_area_label,
    city: row.public_city, countryCode: row.public_country_code,
  }));
}

