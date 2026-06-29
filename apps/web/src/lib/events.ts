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

