import "server-only";

import { getDatabase } from "@/lib/db";
import { type EventUpdateAttendanceIntent } from "@/lib/event-update-intents";
import { summarizeEventUpdate, type EventUpdateField, type EventUpdateNotice, type EventUpdateSeverity } from "@/lib/event-updates";

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
  minimumAge: number; maximumAge: number; experienceLevels: string[]; hostUserId: string; hostFirstName: string;
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
  host_user_id: string | number; host_first_name: string; public_area_label: string; public_city: string; public_country_code: string;
  accepted_count: number; request_id: string | null; request_status: DiscoveryRequest["status"] | null;
  request_skip_count: number | null;
};

export type HostJoinRequest = Readonly<{
  id: string; status: DiscoveryRequest["status"]; skipCount: number; introduction: string; requestedAt: string;
  requesterId: string;
  requester: { firstName: string; age: number; bio: string; languages: string[]; skillLevel: string };
}>;

type HostJoinRequestRow = {
  id: string; status: DiscoveryRequest["status"]; skip_count: number; introduction: string;
  requested_at: string; requester_user_id: string | number; first_name: string; age: number; bio: string; languages: string[]; skill_level: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Discovery language-preference rule.
 *
 * A member who has expressed at least one language preference only sees events
 * whose language overlaps with theirs. A member who has expressed NO language
 * preference (empty set — e.g. a brand-new member, since signup does not yet
 * collect a language) is treated as having no preference, so the language filter
 * is not applied to them and they are not silently filtered down to an empty
 * discovery feed. This mirrors the SQL language clause in `getDiscoverableEvents`
 * exactly so the two cannot drift; it relaxes only the language *preference*
 * filter and nothing else (blocks, age, capacity, time, sport, location all
 * remain enforced independently).
 */
export function eventLanguageMatchesMemberPreference(
  memberLanguages: readonly string[],
  eventLanguage: string,
): boolean {
  if (memberLanguages.length === 0) return true;
  return memberLanguages.some((language) => language.trim().toLowerCase() === eventLanguage.trim().toLowerCase());
}

/**
 * Discovery skill-matching rule (owner decision 2026-07-01).
 *
 * Skill levels are ordered beginner (1) < intermediate (2) < advanced (3). An
 * event lists the experience levels it welcomes (default `[beginner,
 * intermediate]`). Matching is INCLUSIVE UPWARD: a member matches an event when
 * their skill level is at least the EASIEST level the event welcomes — i.e. a
 * stronger player can always join an easier game. The previous rule required an
 * exact membership (`skill_level = ANY(experience_levels)`), which silently hid
 * every default event from an `advanced` member and gave them an empty discover
 * feed with no explanation (CX-20260701).
 *
 * What this does NOT do: it does not let an UNDER-qualified member into an event
 * (a beginner still does not match an `advanced`-only event — the host listed the
 * floor they want). It loosens ONLY the skill filter; age, location, language,
 * capacity, blocks, and host-exclusion gating are untouched and enforced
 * independently. This mirrors the SQL skill clause in `getDiscoverableEvents` and
 * the join gate in `createEventJoinRequest` exactly so discovery and the
 * request-to-join boundary can never drift (a member is never shown an event they
 * would be barred from joining).
 */
const SKILL_RANK: Readonly<Record<string, number>> = { beginner: 1, intermediate: 2, advanced: 3 };

export function memberSkillMatchesEvent(
  memberSkill: string,
  eventExperienceLevels: readonly string[],
): boolean {
  const memberRank = SKILL_RANK[memberSkill.trim().toLowerCase()];
  if (memberRank === undefined) return false;
  const welcomedRanks = eventExperienceLevels
    .map((level) => SKILL_RANK[level.trim().toLowerCase()])
    .filter((rank): rank is number => rank !== undefined);
  if (welcomedRanks.length === 0) return false;
  return memberRank >= Math.min(...welcomedRanks);
}

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
      events.host_user_id, host.first_name AS host_first_name,
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
      AND (CASE LOWER(compatible_sport.skill_level)
        WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 ELSE 0 END) >= (
        SELECT MIN(CASE LOWER(level)
          WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 ELSE 99 END)
        FROM UNNEST(events.experience_levels) AS level
      )
    LEFT JOIN join_requests AS member_request
      ON member_request.event_id = events.id AND member_request.requester_user_id = ${user.id}
    WHERE events.status = 'published'
      AND events.starts_at > NOW()
      AND events.starts_at <= NOW() + (${filters.withinDays} * INTERVAL '1 day')
      AND events.host_user_id <> ${user.id}
      AND (${eventId ?? ""} = '' OR events.id = NULLIF(${eventId ?? ""}, '')::uuid)
      AND ${user.age} BETWEEN events.minimum_age AND events.maximum_age
      AND (
        CARDINALITY(candidate.languages) = 0
        OR EXISTS (SELECT 1 FROM UNNEST(candidate.languages) AS language WHERE LOWER(language) = LOWER(events.language))
      )
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
    hostUserId: String(row.host_user_id), hostFirstName: row.host_first_name, areaLabel: row.public_area_label,
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
      request.requester_user_id,
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
    requesterId: String(row.requester_user_id),
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
  id: string; title: string; sport: string; startsAt: string; timeZone: string; hasEnded: boolean;
  venueName: string; address: string; instructions: string | null; isHost: boolean;
  viewerRequest: { id: string; status: DiscoveryRequest["status"] } | null;
  host: { userId: string; firstName: string };
  reflection: { attendance: "attended" | "left_early" | "did_not_attend"; wouldJoinAgain: "yes" | "no" | "prefer_not_to_say" } | null;
  latestUpdateId: string | null;
  latestCriticalUpdateId: string | null;
  viewerHasSeenLatestUpdate: boolean;
  viewerCriticalUpdateIntent: EventUpdateAttendanceIntent | null;
  criticalUpdateResponseCounts: Readonly<{ stillIn: number; unsure: number; cannotMake: number }>;
  updates: ReadonlyArray<EventUpdateNotice>;
  participants: ReadonlyArray<{ userId: string; firstName: string; skillLevel: string; seenLatestUpdate: boolean | null; criticalUpdateIntent: EventUpdateAttendanceIntent | null }>;
}>;

// Host-only aggregate coordination counts for a hosted event, surfaced on the
// `/hosting` hub so a host can see at a glance that people are waiting and how full
// the event is. These are *aggregate counts only* — never a requester's identity,
// skip count, or any other member's private data (privacy / anti-dark-pattern). The
// field is present only for events the viewer hosts (`isHost`), so a joined-event
// summary never carries another host's coordination numbers.
export type HostCoordination = Readonly<{
  pendingRequestCount: number; acceptedCount: number; capacity: number;
}>;

export type MemberEventSummary = Readonly<{
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  city: string; areaLabel: string; isHost: boolean; hasEnded: boolean;
  reflection: EventRoom["reflection"];
  hostCoordination: HostCoordination | null;
}>;

type EventRoomRow = {
  id: string; title: string; sport: string; starts_at: string; time_zone: string;
  venue_name: string; address: string; arrival_instructions: string | null; is_host: boolean;
  host_user_id: string | number; host_first_name: string;
  viewer_request_id: string | null; viewer_request_status: DiscoveryRequest["status"] | null;
  has_ended: boolean; attendance: NonNullable<EventRoom["reflection"]>["attendance"] | null;
  would_join_again: NonNullable<EventRoom["reflection"]>["wouldJoinAgain"] | null;
};

type EventUpdateNoticeRow = {
  id: string;
  severity: EventUpdateSeverity;
  changed_fields: EventUpdateField[];
  created_at: string;
};

export async function getEventRoom(eventId: string, userId: string): Promise<EventRoom | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rooms = await sql`
    SELECT events.id, events.title, events.sport, events.starts_at, events.time_zone,
      location.venue_name, location.address, location.arrival_instructions,
      events.host_user_id, host.first_name AS host_first_name,
      (events.host_user_id = ${userId}) AS is_host,
      viewer_request.id AS viewer_request_id, viewer_request.status AS viewer_request_status,
      (events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()) AS has_ended,
      reflection.attendance, reflection.would_join_again
    FROM events
    JOIN event_private_locations AS location ON location.event_id = events.id
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    LEFT JOIN event_reflections AS reflection ON reflection.event_id = events.id AND reflection.user_id = ${userId}
    LEFT JOIN join_requests AS viewer_request ON viewer_request.event_id = events.id AND viewer_request.requester_user_id = ${userId}
    WHERE events.id = ${eventId}::uuid AND events.status IN ('published', 'completed')
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

  const updates = await sql`
    SELECT id, severity, changed_fields, created_at
    FROM event_update_notices
    WHERE event_id = ${eventId}::uuid
    ORDER BY created_at DESC
    LIMIT 10
  ` as unknown as EventUpdateNoticeRow[];

  const latestUpdateId = updates[0]?.id ?? null;
  const latestCriticalUpdateId = updates[0]?.severity === "critical" ? updates[0].id : null;
  const participants = await sql`
    SELECT
      member.id AS user_id,
      member.first_name,
      sport.skill_level,
      ${latestUpdateId}::uuid IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM event_update_notice_receipts
          WHERE notice_id = ${latestUpdateId}::uuid AND viewer_user_id = member.id
        ) AS seen_latest_update,
      (
        SELECT response
        FROM event_update_attendance_intents
        WHERE notice_id = ${latestCriticalUpdateId}::uuid AND participant_user_id = member.id
        LIMIT 1
      ) AS critical_update_intent
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
  ` as unknown as Array<{ user_id: string | number; first_name: string; skill_level: string; seen_latest_update: boolean; critical_update_intent: EventUpdateAttendanceIntent | null }>;

  const criticalUpdateResponseCounts = participants.reduce(
    (counts, participant) => {
      if (participant.critical_update_intent === "still_in") counts.stillIn += 1;
      else if (participant.critical_update_intent === "unsure") counts.unsure += 1;
      else if (participant.critical_update_intent === "cannot_make") counts.cannotMake += 1;
      return counts;
    },
    { stillIn: 0, unsure: 0, cannotMake: 0 },
  );

  return {
    id: room.id, title: room.title, sport: room.sport, startsAt: room.starts_at,
    timeZone: room.time_zone, venueName: room.venue_name, address: room.address,
    instructions: room.arrival_instructions, isHost: room.is_host, hasEnded: room.has_ended,
    viewerRequest: room.viewer_request_id && room.viewer_request_status
      ? { id: room.viewer_request_id, status: room.viewer_request_status }
      : null,
    host: { userId: String(room.host_user_id), firstName: room.host_first_name },
    reflection: room.attendance && room.would_join_again
      ? { attendance: room.attendance, wouldJoinAgain: room.would_join_again }
      : null,
    latestUpdateId,
    latestCriticalUpdateId,
    viewerHasSeenLatestUpdate: room.is_host ? true : (latestUpdateId ? (participants.find((participant) => String(participant.user_id) === userId)?.seen_latest_update ?? false) : true),
    viewerCriticalUpdateIntent: latestCriticalUpdateId ? (participants.find((participant) => String(participant.user_id) === userId)?.critical_update_intent ?? null) : null,
    criticalUpdateResponseCounts,
    updates: updates.map((update) => ({
      id: update.id,
      severity: update.severity,
      changedFields: update.changed_fields,
      summary: summarizeEventUpdate(update.changed_fields),
      createdAt: update.created_at,
    })),
    participants: participants.map((participant) => ({
      userId: String(participant.user_id),
      firstName: participant.first_name,
      skillLevel: participant.skill_level,
      seenLatestUpdate: latestUpdateId ? participant.seen_latest_update : null,
      criticalUpdateIntent: latestCriticalUpdateId ? participant.critical_update_intent : null,
    })),
  };
}

export type HostedEventStatus = "upcoming" | "past";
export type HostedEvent = MemberEventSummary & { hostedStatus: HostedEventStatus };

// Pure derivation so the hosting page and its tests share one rule. The query
// (`getMemberEventSummaries`) returns the member's hosted *and* joined published
// or completed events; the hosting hub only owns the ones the member hosts, and
// splits them into upcoming vs past by the query's `hasEnded` flag. The query
// already orders not-ended before ended, then by start time descending, so the
// relative order within each bucket is preserved.
export function selectHostedEvents(summaries: ReadonlyArray<MemberEventSummary>): HostedEvent[] {
  return summaries
    .filter((summary) => summary.isHost)
    .map((summary) => ({ ...summary, hostedStatus: summary.hasEnded ? "past" : "upcoming" }));
}

// Pure copy derivation shared by the hosting card and its tests. Turns the host's
// own aggregate counts into calm, truthful labels — no scarcity/urgency pressure,
// no other member's identity. `pending` is the count of requests awaiting the
// host's decision; `filled`/`capacity` describe seats taken. Kept pure (no I/O) so
// the strings can be asserted directly.
export function summarizeHostCoordination(counts: HostCoordination): {
  pendingLabel: string; placesLabel: string; hasPending: boolean; isFull: boolean;
} {
  const { pendingRequestCount, acceptedCount, capacity } = counts;
  const isFull = capacity > 0 && acceptedCount >= capacity;
  return {
    hasPending: pendingRequestCount > 0,
    isFull,
    pendingLabel:
      pendingRequestCount === 0
        ? "No requests yet"
        : pendingRequestCount === 1
          ? "1 person waiting for your reply"
          : `${pendingRequestCount} people waiting for your reply`,
    placesLabel: isFull ? "All places filled" : `${acceptedCount} of ${capacity} places filled`,
  };
}

export async function getMemberEventSummaries(userId: string): Promise<MemberEventSummary[]> {
  const sql = getDatabase();
  // The two coordination subqueries (accepted seats, pending requests) count rows
  // in tables the host already owns; both are additive and read-only (no schema
  // change / no migration). They are computed for every row but only surfaced when
  // the viewer hosts the event — a joined-event row's counts are discarded below so
  // a member never learns another host's pending/capacity numbers.
  const rows = await sql`
    SELECT events.id, events.title, events.sport, events.starts_at, events.time_zone,
      events.public_city, events.public_area_label, events.capacity,
      (events.host_user_id = ${userId}) AS is_host,
      (events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()) AS has_ended,
      (SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id) AS accepted_count,
      (SELECT COUNT(*)::integer FROM join_requests WHERE event_id = events.id AND status = 'pending') AS pending_request_count,
      reflection.attendance, reflection.would_join_again
    FROM events
    LEFT JOIN event_reflections AS reflection ON reflection.event_id = events.id AND reflection.user_id = ${userId}
    WHERE events.status IN ('published', 'completed')
      AND (
        events.host_user_id = ${userId}
        OR EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = ${userId})
      )
    ORDER BY
      (events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()) ASC,
      events.starts_at DESC
    LIMIT 30
  ` as unknown as Array<{
    id: string; title: string; sport: string; starts_at: string; time_zone: string;
    public_city: string; public_area_label: string; capacity: number; is_host: boolean; has_ended: boolean;
    accepted_count: number; pending_request_count: number;
    attendance: NonNullable<EventRoom["reflection"]>["attendance"] | null;
    would_join_again: NonNullable<EventRoom["reflection"]>["wouldJoinAgain"] | null;
  }>;
  return rows.map((row) => ({
    id: row.id, title: row.title, sport: row.sport, startsAt: row.starts_at,
    timeZone: row.time_zone, city: row.public_city, areaLabel: row.public_area_label,
    isHost: row.is_host, hasEnded: row.has_ended,
    reflection: row.attendance && row.would_join_again
      ? { attendance: row.attendance, wouldJoinAgain: row.would_join_again }
      : null,
    // Only the host of an event may see its coordination counts.
    hostCoordination: row.is_host
      ? { pendingRequestCount: row.pending_request_count, acceptedCount: row.accepted_count, capacity: row.capacity }
      : null,
  }));
}
