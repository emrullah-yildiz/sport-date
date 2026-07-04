import "server-only";

import { getDatabase } from "@/lib/db";
import { coarsenCoordinates } from "@/lib/discovery-geo";
import { publicEventInviteFromRow, type PublicEventInvite, type PublicEventInviteRow } from "@/lib/public-event-invite";
import { type EventUpdateAttendanceIntent } from "@/lib/event-update-intents";
import { summarizeEventUpdate, type EventUpdateField, type EventUpdateNotice, type EventUpdateSeverity } from "@/lib/event-updates";

export type HostEvent = Readonly<{
  id: string; sport: string; title: string; description: string; startsAt: string;
  timeZone: string; durationMinutes: number; capacity: number; language: string;
  minimumAge: number; maximumAge: number; experienceLevels: string[]; status: string;
  publicLocation: { city: string; countryCode: string; areaLabel: string };
  privateLocation: { venueName: string; address: string; postalCode: string | null; latitude: number | null; longitude: number | null; instructions: string | null };
}>;

export type DiscoveryFilters = Readonly<{ city: string; sport: string; language: string; withinDays: 1 | 7 | 30 }>;
export type DiscoveryRequest = { id: string; status: "pending" | "accepted" | "declined" | "cancelled"; skipCount: number };
export type DiscoveryEvent = Readonly<{
  id: string; sport: string; title: string; description: string; startsAt: string;
  timeZone: string; durationMinutes: number; capacity: number; language: string;
  minimumAge: number; maximumAge: number; experienceLevels: string[]; hostUserId: string; hostFirstName: string;
  areaLabel: string; city: string; countryCode: string; acceptedCount: number;
  placesRemaining: number; request: DiscoveryRequest | null;
  // Approximate PUBLIC coordinate only (stored coarse column, or null when unset).
  // Never a precise venue — that lives in event_private_locations and is not joined
  // here. Used solely to power the distance/radius filter, and coarsened again before
  // any comparison (CX-20260701-discover-geo-radius-and-use-my-location).
  approximateLatitude: number | null; approximateLongitude: number | null;
}>;

// A single event's PUBLIC invitation as seen on the direct `/discover/events/{id}`
// view. It carries the same approximate-only fields as a feed card, plus whether
// the viewer is the host — so the page can offer the host a "manage it" affordance
// instead of a "Request a place" box on their own event. Unlike the feed
// (`getDiscoverableEvents`), this direct view is NOT gated by host-exclusion or the
// age/skill/language/capacity compatibility filters (those gate the feed, not a
// directly-opened invitation link — CX-20260701-view-public-invitation-404s). The
// hard guards are preserved: only `published` events render, mutual-block still
// hides blocked parties from each other, and the precise venue is never included.
// Why a directly-opened invitation is (not) requestable for THIS viewer. The feed
// pre-filters these out, but a directly-opened /discover/events/{id} link can land
// on an event the join gate (createEventJoinRequest) would reject, so the direct
// view computes the reason and the CTA renders a clear disabled state instead of a
// silent no-op (CX-20260704 core-loop-hardening item 1). "eligible" = requestable.
export type JoinEligibility = "eligible" | "age" | "language" | "full" | "past";
export type DiscoveryEventView = DiscoveryEvent & { viewerIsHost: boolean; eligibility: JoinEligibility };

// Pure mirror of the createEventJoinRequest guards that can silently bar a
// non-host viewer on a published, non-blocked event: the event already started,
// the viewer's age is outside the welcomed range, their language doesn't overlap,
// or it is full with no live request of their own. Host-exclusion and block are
// handled elsewhere (viewerIsHost / the query's block guard).
export function computeJoinEligibility(input: {
  startsAt: string; minimumAge: number; maximumAge: number; viewerAge: number;
  memberLanguages: readonly string[]; eventLanguage: string;
  acceptedCount: number; capacity: number; hasLiveRequest: boolean;
}, now: Date = new Date()): JoinEligibility {
  if (new Date(input.startsAt).getTime() <= now.getTime()) return "past";
  if (input.viewerAge < input.minimumAge || input.viewerAge > input.maximumAge) return "age";
  if (!eventLanguageMatchesMemberPreference(input.memberLanguages, input.eventLanguage)) return "language";
  if (!input.hasLiveRequest && input.acceptedCount >= input.capacity) return "full";
  return "eligible";
}

type HostEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[]; status: string;
  public_city: string; public_country_code: string; public_area_label: string;
  venue_name: string; address: string; postal_code: string | null;
  precise_latitude: number | null; precise_longitude: number | null; arrival_instructions: string | null;
};

type DiscoveryEventRow = {
  id: string; sport: string; title: string; description: string; starts_at: string;
  time_zone: string; duration_minutes: number; capacity: number; language: string;
  minimum_age: number; maximum_age: number; experience_levels: string[];
  host_user_id: string | number; host_first_name: string; public_area_label: string; public_city: string; public_country_code: string;
  public_approximate_latitude: number | null; public_approximate_longitude: number | null;
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
 * Project a row's stored approximate PUBLIC coordinate into the response, coarsened to
 * the area grid so no finer-than-grid precision can ever ship to a client — defence in
 * depth, independent of what precision the column happens to hold
 * (CX-20260702-event-approx-coord-not-recoarsened-on-write-or-response). `null` in →
 * `null` out (unset stays unset); an out-of-range/garbage pair degrades to `null`
 * rather than leaking a bogus point. The PRECISE venue is a separate field
 * (`event_private_locations`) and is untouched by this — it is never joined here.
 */
export function coarseApproximateForResponse(
  latitude: number | null,
  longitude: number | null,
): { approximateLatitude: number | null; approximateLongitude: number | null } {
  const coarse = coarsenCoordinates(latitude, longitude);
  return {
    approximateLatitude: coarse ? coarse.latitude : null,
    approximateLongitude: coarse ? coarse.longitude : null,
  };
}

/**
 * Discovery language-preference rule.
 *
 * A member who has expressed at least one language preference only sees events
 * whose language overlaps with theirs. A member who has expressed NO language
 * preference (empty set — e.g. a brand-new member, since signup does not yet
 * collect a language) is treated as having no preference, so the language filter
 * is not applied to them and they are not silently filtered down to an empty
 * discovery feed. This mirrors the SQL language clause in `getDiscoverableEvents`
 * AND the join gate in `createEventJoinRequest` exactly so the two cannot drift
 * (a member is never shown an event in discovery they would then be barred from
 * requesting — CX-20260701); it relaxes only the language *preference* filter and
 * nothing else (blocks, age, capacity, time, sport, skill, location all remain
 * enforced independently).
 */
export function eventLanguageMatchesMemberPreference(
  memberLanguages: readonly string[],
  eventLanguage: string,
): boolean {
  if (memberLanguages.length === 0) return true;
  return memberLanguages.some((language) => language.trim().toLowerCase() === eventLanguage.trim().toLowerCase());
}

/**
 * Skill-matching rule — INFORMATIONAL ONLY as of
 * CX-20260704-discovery-not-gated-by-profile-sport (owner directive 2026-07-04).
 *
 * Skill levels are ordered beginner (1) < intermediate (2) < advanced (3), and a
 * member matches an event INCLUSIVE UPWARD (at least the easiest level the event
 * welcomes). This pure helper is retained for optional informational use (e.g. a
 * "this is above your listed level" hint), but it is NO LONGER a visibility or
 * join gate: discovery and `createEventJoinRequest` no longer require the viewer
 * to have the event's sport (or a compatible skill) in their profile, so a member
 * can see AND request any otherwise-eligible local event. All the real gates
 * (published/future, host-exclusion, age, language, capacity, blocks) live in the
 * SQL of those two functions and are unchanged.
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
    SELECT events.*, private_location.venue_name, private_location.address, private_location.postal_code,
      private_location.precise_latitude, private_location.precise_longitude, private_location.arrival_instructions
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
    privateLocation: { venueName: row.venue_name, address: row.address, postalCode: row.postal_code, latitude: row.precise_latitude, longitude: row.precise_longitude, instructions: row.arrival_instructions },
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
      events.public_approximate_latitude, events.public_approximate_longitude,
      (SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id) AS accepted_count,
      member_request.id AS request_id, member_request.status AS request_status,
      member_request.skip_count AS request_skip_count
    FROM events
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    JOIN users AS candidate ON candidate.id = ${user.id} AND candidate.account_status = 'active'
    -- NOTE (CX-20260704-discovery-not-gated-by-profile-sport, owner directive):
    -- discovery no longer requires the viewer to have the event sport (or a
    -- compatible skill) in their profile. The mandatory user_sports JOIN that hid
    -- every event for a sport the member had not listed is removed, so all
    -- compatible local events are visible regardless of profile sports. Sport is
    -- now only the EXPLICIT filter in the WHERE clause below. The join gate in
    -- createEventJoinRequest is relaxed identically, so a member is still never
    -- shown an event they would then be barred from requesting.
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
        -- Keep a FULL event visible only to a member who still holds a LIVE
        -- request/place on it (so their own pending/accepted state renders). A
        -- member who cancelled or was declined has no re-requestable spot on a full
        -- event, so it should drop out of their feed rather than dangle a doomed
        -- "Request a place" (CX-20260704 core-loop-hardening item 4).
        OR member_request.status IN ('pending', 'accepted')
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
    ...coarseApproximateForResponse(row.public_approximate_latitude, row.public_approximate_longitude),
    request: row.request_id ? { id: row.request_id, status: row.request_status!, skipCount: row.request_skip_count ?? 0 } : null,
  }));
}

/**
 * A single event's PUBLIC invitation for a directly-opened `/discover/events/{id}`
 * view (the "View the public invitation" CTA, and any shared invitation link).
 *
 * Split from the FEED query (`getDiscoverableEvents`) on purpose (CX-20260701):
 * the feed EXCLUDES the viewer's own events (`host_user_id <> user.id`) and applies
 * the age/skill/language/capacity compatibility filters so the feed only surfaces
 * events a member could join. Those are FEED-ranking rules, not access control — a
 * host opening their own just-published event, or a recipient opening a shared
 * link, was being turned into a 404 by them. This direct view instead returns the
 * event to any PERMITTED authenticated viewer (including the host), so the page can
 * render a read-only preview and decide the right action from `viewerIsHost` /
 * `request`.
 *
 * The HARD guards are preserved and mirror the other single-event reads
 * (`getEventRoom`, `getAcceptedEventLocation`): only a `published` event renders
 * (never draft/cancelled/completed), mutual-block still hides blocked parties from
 * each other, and ONLY the approximate public location columns are selected — the
 * precise venue lives in `event_private_locations` and is never joined here, so it
 * cannot leak before an accepted join.
 */
export async function getDiscoverableEvent(user: { id: string; age: number }, eventId: string): Promise<DiscoveryEventView | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      events.id, events.sport, events.title, events.description, events.starts_at,
      events.time_zone, events.duration_minutes, events.capacity, events.language,
      events.minimum_age, events.maximum_age, events.experience_levels,
      events.host_user_id, host.first_name AS host_first_name,
      events.public_area_label, events.public_city, events.public_country_code,
      events.public_approximate_latitude, events.public_approximate_longitude,
      (SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id) AS accepted_count,
      member_request.id AS request_id, member_request.status AS request_status,
      member_request.skip_count AS request_skip_count,
      candidate.languages AS member_languages
    FROM events
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    JOIN users AS candidate ON candidate.id = ${user.id} AND candidate.account_status = 'active'
    LEFT JOIN join_requests AS member_request
      ON member_request.event_id = events.id AND member_request.requester_user_id = ${user.id}
    WHERE events.id = ${eventId}::uuid
      AND events.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = ${user.id} AND blocked_user_id = events.host_user_id)
           OR (blocker_user_id = events.host_user_id AND blocked_user_id = ${user.id})
      )
    LIMIT 1
  ` as unknown as Array<DiscoveryEventRow & { member_languages: string[] | null }>;

  const row = rows[0];
  if (!row) return null;
  const viewerIsHost = String(row.host_user_id) === String(user.id);
  const hasLiveRequest = row.request_status === "pending" || row.request_status === "accepted";
  return {
    id: row.id, sport: row.sport, title: row.title, description: row.description,
    startsAt: row.starts_at, timeZone: row.time_zone, durationMinutes: row.duration_minutes,
    capacity: row.capacity, language: row.language, minimumAge: row.minimum_age,
    maximumAge: row.maximum_age, experienceLevels: row.experience_levels,
    hostUserId: String(row.host_user_id), hostFirstName: row.host_first_name, areaLabel: row.public_area_label,
    city: row.public_city, countryCode: row.public_country_code, acceptedCount: row.accepted_count,
    placesRemaining: Math.max(0, row.capacity - row.accepted_count),
    ...coarseApproximateForResponse(row.public_approximate_latitude, row.public_approximate_longitude),
    request: row.request_id ? { id: row.request_id, status: row.request_status!, skipCount: row.request_skip_count ?? 0 } : null,
    viewerIsHost,
    // The host never requests a place (they manage the event), so eligibility is
    // irrelevant to them; compute it for every non-host viewer so the CTA is honest.
    eligibility: viewerIsHost ? "eligible" : computeJoinEligibility({
      startsAt: row.starts_at, minimumAge: row.minimum_age, maximumAge: row.maximum_age, viewerAge: user.age,
      memberLanguages: row.member_languages ?? [], eventLanguage: row.language,
      acceptedCount: row.accepted_count, capacity: row.capacity, hasLiveRequest,
    }),
  };
}

/**
 * The UNAUTHENTICATED public share view of an event (`/e/{id}` and its OG image —
 * CX-20260704-growth-shareable-event-invite-og-image). This is the only event read
 * with NO viewer, so it selects strictly LESS than any authenticated view:
 *
 * - Only a `published` event by an active host renders; draft/cancelled/completed
 *   (and any unknown id) return null → the route 404s with zero data leaked.
 * - The SELECT is an explicit allowlist of structured, discovery-safe columns:
 *   sport, welcomed levels, language, approximate area label/city/country, start
 *   time + timezone + duration, capacity and the accepted count. It never joins
 *   `event_private_locations`, and it deliberately omits the host-authored free
 *   text (`title`, `description`) and every person (host name, participants) —
 *   free text can contain the venue, and an unauthenticated page must not become
 *   a scraping surface for either locations or people.
 * - Defence in depth: the row is additionally passed through
 *   `publicEventInviteFromRow`, whose output type structurally cannot carry a
 *   venue, address, coordinate, or name (see public-event-invite.ts).
 */
export async function getPublicEventInvite(eventId: string): Promise<PublicEventInvite | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT
      events.id, events.sport, events.experience_levels, events.language,
      events.public_area_label, events.public_city, events.public_country_code,
      events.starts_at, events.time_zone, events.duration_minutes, events.capacity,
      (SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id) AS accepted_count
    FROM events
    JOIN users AS host ON host.id = events.host_user_id AND host.account_status = 'active'
    WHERE events.id = ${eventId}::uuid
      AND events.status = 'published'
    LIMIT 1
  ` as unknown as PublicEventInviteRow[];
  const row = rows[0];
  if (!row) return null;
  return publicEventInviteFromRow(row);
}

export async function getHostJoinRequests(eventId: string, hostId: string): Promise<HostJoinRequest[]> {
  if (!UUID_PATTERN.test(eventId)) return [];
  const sql = getDatabase();
  const rows = await sql`
    SELECT request.id, request.status, request.skip_count, request.introduction, request.requested_at,
      request.requester_user_id,
      requester.first_name, DATE_PART('year', AGE(CURRENT_DATE, requester.date_of_birth))::integer AS age,
      requester.bio, requester.languages, COALESCE(sport.skill_level, 'not listed') AS skill_level
    FROM join_requests AS request
    JOIN events ON events.id = request.event_id AND events.host_user_id = ${hostId}
    JOIN users AS requester ON requester.id = request.requester_user_id
    -- A member may request an event without listing that sport in their profile.
    -- The optional sport row enriches the card but must never hide the request.
    LEFT JOIN user_sports AS sport ON sport.user_id = requester.id AND LOWER(sport.sport) = LOWER(events.sport)
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

export type AcceptedMeetingLocation = Readonly<{
  venueName: string; address: string; postalCode: string | null;
  latitude: number | null; longitude: number | null; instructions: string | null;
}>;

export async function getAcceptedEventLocation(
  eventId: string,
  userId: string,
): Promise<AcceptedMeetingLocation | null> {
  if (!UUID_PATTERN.test(eventId)) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT private_location.venue_name, private_location.address, private_location.postal_code,
      private_location.precise_latitude, private_location.precise_longitude, private_location.arrival_instructions
    FROM event_participants AS participant
    JOIN event_private_locations AS private_location ON private_location.event_id = participant.event_id
    JOIN events ON events.id = participant.event_id AND events.status = 'published'
    WHERE participant.event_id = ${eventId}::uuid AND participant.user_id = ${userId}
    LIMIT 1
  ` as unknown as Array<{ venue_name: string; address: string; postal_code: string | null; precise_latitude: number | null; precise_longitude: number | null; arrival_instructions: string | null }>;
  const row = rows[0];
  return row
    ? { venueName: row.venue_name, address: row.address, postalCode: row.postal_code, latitude: row.precise_latitude, longitude: row.precise_longitude, instructions: row.arrival_instructions }
    : null;
}

export type EventRoom = Readonly<{
  id: string; title: string; sport: string; startsAt: string; timeZone: string; hasEnded: boolean;
  durationMinutes: number; areaLabel: string; experienceLevels: string[];
  venueName: string; address: string; postalCode: string | null;
  latitude: number | null; longitude: number | null; instructions: string | null; isHost: boolean;
  // True when this accepted, published, still-upcoming event is the viewer's ONLY
  // event participation — i.e. their first time attending. Derived from existing
  // `event_participants` rows (no schema change); used only to decide whether to
  // surface the first-timer preparation card, never to gate access.
  viewerIsFirstTimer: boolean;
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
  duration_minutes: number; public_area_label: string; experience_levels: string[];
  venue_name: string; address: string; postal_code: string | null;
  precise_latitude: number | null; precise_longitude: number | null; arrival_instructions: string | null; is_host: boolean;
  host_user_id: string | number; host_first_name: string;
  viewer_request_id: string | null; viewer_request_status: DiscoveryRequest["status"] | null;
  has_ended: boolean; attendance: NonNullable<EventRoom["reflection"]>["attendance"] | null;
  would_join_again: NonNullable<EventRoom["reflection"]>["wouldJoinAgain"] | null;
  viewer_other_event_count: number;
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
      events.duration_minutes, events.public_area_label, events.experience_levels,
      location.venue_name, location.address, location.postal_code,
      location.precise_latitude, location.precise_longitude, location.arrival_instructions,
      events.host_user_id, host.first_name AS host_first_name,
      (events.host_user_id = ${userId}) AS is_host,
      viewer_request.id AS viewer_request_id, viewer_request.status AS viewer_request_status,
      (events.starts_at + (events.duration_minutes * INTERVAL '1 minute') <= NOW()) AS has_ended,
      reflection.attendance, reflection.would_join_again,
      -- Count the viewer's participation in ANY OTHER event (past or upcoming). Zero
      -- means this accepted event is their only one, so they are a first-timer. Reads
      -- existing event_participants rows only — no schema change.
      (
        SELECT COUNT(*)::integer FROM event_participants AS other_participation
        WHERE other_participation.user_id = ${userId}
          AND other_participation.event_id <> events.id
      ) AS viewer_other_event_count
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
      COALESCE(sport.skill_level, 'not listed') AS skill_level,
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
    LEFT JOIN user_sports AS sport ON sport.user_id = member.id AND LOWER(sport.sport) = LOWER(events.sport)
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
    timeZone: room.time_zone, durationMinutes: room.duration_minutes,
    areaLabel: room.public_area_label, experienceLevels: room.experience_levels,
    venueName: room.venue_name, address: room.address, postalCode: room.postal_code,
    latitude: room.precise_latitude, longitude: room.precise_longitude,
    instructions: room.arrival_instructions, isHost: room.is_host, hasEnded: room.has_ended,
    // A member is a first-timer when they host nothing here and this is their only
    // event participation. The preparation card layers on top of this — the page
    // still independently checks accepted/not-ended before showing it.
    viewerIsFirstTimer: !room.is_host && room.viewer_other_event_count === 0,
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

// Pure copy derivation for the PRIVATE host-side reflection/outcome shown on a PAST
// hosted card (CX-20260701-hosting-past-events-no-reflection-or-outcome). It closes
// the host's arc with a warm, honest acknowledgement — "you made this happen" — and
// either invites a calm optional reflection when none is recorded, or quietly mirrors
// the host's OWN recorded outcome when one exists.
//
// Humane guardrails (the point of the feature):
//  - Honest + derived: it reflects ONLY the host's own `event.reflection` row (joined
//    on the viewer's user id). It invents no attendance figure, shows no participant
//    identity, and carries no count/streak/score/rank/badge/leaderboard/popularity.
//  - Private: this is the host's own view of their own event; nothing here is shown to
//    or about any other participant.
//  - Non-punitive: a `left_early` / `did_not_attend` / "would not host again" outcome
//    reads with dignity and no blame — hosting is generous however it went.
//  - Non-pressuring: an acknowledgement, not a nag to host more. When nothing is
//    recorded it offers (never demands) the same private reflection the room already
//    owns; skipping it changes nothing.
export type HostReflectionOutcome = Readonly<{
  heading: string;
  body: string;
  /** True only when the host has recorded their own reflection for this event. */
  recorded: boolean;
  /** Present only when unrecorded: the calm, optional invitation label. */
  reflectPrompt: string | null;
}>;

export function summarizeHostReflection(reflection: MemberEventSummary["reflection"]): HostReflectionOutcome {
  // Attendance-agnostic on purpose: this line renders for every past hosted event,
  // including ones nobody joined. Claiming "people showed up" would be a fabricated
  // attendance figure — false for an empty event and self-contradicting next to a
  // `did_not_attend` note — so we credit only the thing that is always true: the host
  // made the plan real. (Mirrors PostEventAfterglow's honest, turnout-agnostic voice.)
  const acknowledgement = "You hosted this. You made the plan real.";

  if (!reflection) {
    return {
      heading: "You made this happen",
      body: acknowledgement,
      recorded: false,
      // Optional and clearly the host's choice — the write path lives in the room.
      reflectPrompt: "How did it go? Add a private note (optional)",
    };
  }

  // The host recorded their own reflection — mirror it quietly and kindly, using only
  // the host's own words. Attendance is the host's self-report about their OWN
  // presence, not any participant's.
  const attendanceNote =
    reflection.attendance === "attended"
      ? "You marked this as happened — you were there for it."
      : reflection.attendance === "left_early"
        ? "You noted you left this one early. That is completely fine — hosting it still mattered."
        : "You noted this one didn't come together for you. That happens, and it takes nothing away from making the plan real.";

  const wouldAgainNote =
    reflection.wouldJoinAgain === "yes"
      ? " You'd gather this group again."
      : reflection.wouldJoinAgain === "no"
        ? " You'd rather not run this exact one again — good to know for next time."
        : "";

  return {
    heading: "You made this happen",
    body: `${acknowledgement} ${attendanceNote}${wouldAgainNote}`,
    recorded: true,
    reflectPrompt: null,
  };
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
