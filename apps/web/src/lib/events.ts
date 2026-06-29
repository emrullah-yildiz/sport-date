import "server-only";

import { getDatabase } from "@/lib/db";

export type HostEvent = Readonly<{
  id: string; sport: string; title: string; description: string; startsAt: string;
  timeZone: string; durationMinutes: number; capacity: number; language: string;
  minimumAge: number; maximumAge: number; experienceLevels: string[]; status: string;
  publicLocation: { city: string; countryCode: string; areaLabel: string };
  privateLocation: { venueName: string; address: string; instructions: string | null };
}>;

export type DiscoveryFilters = Readonly<{ city: string; sport: string; language: string; withinDays: 1 | 7 | 30 }>;
export type DiscoveryRequest = { id: string; status: "pending" | "accepted" | "declined" | "cancelled"; skipCount: number };
export type DiscoveryEvent = Readonly<{
  id: string; sport: string; title: string; description: string; startsAt: string;
  timeZone: string; durationMinutes: number; capacity: number; language: string;
  minimumAge: number; maximumAge: number; experienceLevels: string[]; hostFirstName: string;
  areaLabel: string; city: string; countryCode: string; acceptedCount: number;
  placesRemaining: number; request: DiscoveryRequest | null;
}>;

type HostEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[]; status: string;
  public_city: string; public_country_code: string; public_area_label: string;
  venue_name: string; address: string; arrival_instructions: string | null;
};

type DiscoveryEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[];
  host_first_name: string; public_area_label: string; public_city: string; public_country_code: string;
  accepted_count: number; request_id: string | null; request_status: DiscoveryRequest["status"] | null;
  request_skip_count: number | null;
};

export type HostJoinRequest = Readonly<{
  id: string; status: DiscoveryRequest["status"]; skipCount: number; introduction: string; requestedAt: string;
  requester: { firstName: string; age: number; bio: string; languages: string[]; skillLevel: string };
}>;

type HostJoinRequestRow = {
  id: string; status: DiscoveryRequest["status"]; skip_count: number; introduction: string;
  requested_at: string; first_name: string; age: number; bio: string; languages: string[]; skill_level: string;
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

export async function getDiscoverableEvents(
  user: { id: string; age: number },
  filters: DiscoveryFilters,
  eventId?: string,
): Promise<DiscoveryEvent[]> {
  if (eventId && !UUID_PATTERN.test(eventId)) return [];
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      events.id, events.sport, events.title, events.description, events.starts_at,
      events.time_zone, events.duration_minutes, events.capacity, events.language,
      events.minimum_age, events.maximum_age, events.experience_levels,
      host.first_name AS host_first_name,
      events.public_area_label, events.public_city, events.public_country_code,
      (SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id) AS accepted_count,
      member_request.id AS request_id, member_request.status AS request_status,
      member_request.skip_count AS request_skip_count
    FROM events
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    JOIN users AS candidate ON candidate.id = ${user.id} AND candidate.account_status = 'active'
    JOIN user_sports AS compatible_sport
      ON compatible_sport.user_id = ${user.id}
      AND LOWER(compatible_sport.sport) = LOWER(events.sport)
      AND compatible_sport.skill_level = ANY(events.experience_levels)
    LEFT JOIN join_requests AS member_request
      ON member_request.event_id = events.id AND member_request.requester_user_id = ${user.id}
    WHERE events.status = 'published'
      AND events.starts_at > NOW()
      AND events.starts_at <= NOW() + (${filters.withinDays} * INTERVAL '1 day')
      AND events.host_user_id <> ${user.id}
      AND (${eventId ?? ""} = '' OR events.id = NULLIF(${eventId ?? ""}, '')::uuid)
      AND ${user.age} BETWEEN events.minimum_age AND events.maximum_age
      AND EXISTS (SELECT 1 FROM UNNEST(candidate.languages) AS language WHERE LOWER(language) = LOWER(events.language))
      AND (
        (SELECT COUNT(*) FROM event_participants WHERE event_id = events.id) < events.capacity
        OR member_request.id IS NOT NULL
      )
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
    city: row.public_city, countryCode: row.public_country_code, acceptedCount: row.accepted_count,
    placesRemaining: Math.max(0, row.capacity - row.accepted_count),
    request: row.request_id ? { id: row.request_id, status: row.request_status!, skipCount: row.request_skip_count ?? 0 } : null,
  }));
}

export async function getDiscoverableEvent(user: { id: string; age: number }, eventId: string): Promise<DiscoveryEvent | null> {
  return (await getDiscoverableEvents(user, { city: "", sport: "", language: "", withinDays: 30 }, eventId))[0] ?? null;
}

export async function getHostJoinRequests(eventId: string, hostId: string): Promise<HostJoinRequest[]> {
  if (!UUID_PATTERN.test(eventId)) return [];
  const sql = getDatabase();
  const rows = await sql`
    SELECT request.id, request.status, request.skip_count, request.introduction, request.requested_at,
      requester.first_name, DATE_PART('year', AGE(CURRENT_DATE, requester.date_of_birth))::integer AS age,
      requester.bio, requester.languages, sport.skill_level
    FROM join_requests AS request
    JOIN events ON events.id = request.event_id AND events.host_user_id = ${hostId}
    JOIN users AS requester ON requester.id = request.requester_user_id
    JOIN user_sports AS sport ON sport.user_id = requester.id AND LOWER(sport.sport) = LOWER(events.sport)
    WHERE request.event_id = ${eventId}::uuid
    ORDER BY CASE request.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, request.updated_at DESC
  ` as unknown as HostJoinRequestRow[];
  return rows.map((row) => ({
    id: row.id, status: row.status, skipCount: row.skip_count, introduction: row.introduction,
    requestedAt: row.requested_at,
    requester: { firstName: row.first_name, age: row.age, bio: row.bio, languages: row.languages, skillLevel: row.skill_level },
  }));
}

export async function getAcceptedEventLocation(
  eventId: string,
  userId: string,
): Promise<{ venueName: string; address: string; instructions: string | null } | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT private_location.venue_name, private_location.address, private_location.arrival_instructions
    FROM event_participants AS participant
    JOIN event_private_locations AS private_location ON private_location.event_id = participant.event_id
    JOIN events ON events.id = participant.event_id AND events.status = 'published'
    WHERE participant.event_id = ${eventId}::uuid AND participant.user_id = ${userId}
    LIMIT 1
  ` as unknown as Array<{ venue_name: string; address: string; arrival_instructions: string | null }>;
  return rows[0] ? { venueName: rows[0].venue_name, address: rows[0].address, instructions: rows[0].arrival_instructions } : null;
}

export type EventRoom = Readonly<{
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  venueName: string; address: string; instructions: string | null; isHost: boolean;
  participants: ReadonlyArray<{ firstName: string; skillLevel: string }>;
}>;

type EventRoomRow = {
  id: string; title: string; sport: string; starts_at: string; time_zone: string;
  venue_name: string; address: string; arrival_instructions: string | null; is_host: boolean;
};

export async function getEventRoom(eventId: string, userId: string): Promise<EventRoom | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rooms = await sql`
    SELECT events.id, events.title, events.sport, events.starts_at, events.time_zone,
      location.venue_name, location.address, location.arrival_instructions,
      (events.host_user_id = ${userId}) AS is_host
    FROM events
    JOIN event_private_locations AS location ON location.event_id = events.id
    WHERE events.id = ${eventId}::uuid AND events.status = 'published'
      AND (
        events.host_user_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = events.id AND user_id = ${userId}
        )
      )
      AND (
        events.host_user_id = ${userId}
        OR NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = ${userId} AND blocked_user_id = events.host_user_id)
             OR (blocker_user_id = events.host_user_id AND blocked_user_id = ${userId})
        )
      )
    LIMIT 1
  ` as unknown as EventRoomRow[];
  const room = rooms[0];
  if (!room) return null;

  const participants = await sql`
    SELECT member.first_name, sport.skill_level
    FROM event_participants AS participant
    JOIN users AS member ON member.id = participant.user_id AND member.account_status = 'active'
    JOIN events ON events.id = participant.event_id
    JOIN user_sports AS sport ON sport.user_id = member.id AND LOWER(sport.sport) = LOWER(events.sport)
    WHERE participant.event_id = ${eventId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = events.host_user_id AND blocked_user_id = member.id)
           OR (blocker_user_id = ${userId} AND blocked_user_id = member.id)
           OR (blocker_user_id = member.id AND blocked_user_id = ${userId})
      )
    ORDER BY participant.seat_number
  ` as unknown as Array<{ first_name: string; skill_level: string }>;
  return {
    id: room.id, title: room.title, sport: room.sport, startsAt: room.starts_at,
    timeZone: room.time_zone, venueName: room.venue_name, address: room.address,
    instructions: room.arrival_instructions, isHost: room.is_host,
    participants: participants.map((participant) => ({ firstName: participant.first_name, skillLevel: participant.skill_level })),
  };
}
