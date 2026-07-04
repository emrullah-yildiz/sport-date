import "server-only";

import { getDatabase } from "@/lib/db";
import { listApprovedProfilePhotos, type ProfilePhoto } from "@/lib/photos";
import type { SessionUser } from "@/lib/session";

// A member's profile as it appears to ANOTHER member (never self-view). This is a
// deliberately trimmed, privacy-safe projection of the humane profile: it carries
// exactly the fields that are safe to show to someone doing a trust check, and
// carries NONE of the account/private fields. Specifically it OMITS: email and any
// other contact detail, precise/meeting location (only the free-text approximate
// `location` a member wrote for themselves is included, same as discovery uses),
// email-verification state, membership/entitlement state, reliability standing, and
// any received-rating aggregate. There is no score, ranking, or popularity field —
// by construction it cannot leak one because it is not selected here.
export type ViewableMemberProfile = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  location: string;
  bio: string;
  languages: readonly string[];
  seeking: SessionUser["seeking"];
  sports: SessionUser["sports"];
  prompts: SessionUser["prompts"];
  // Photos are ALSO block-gated at serve time by /api/photos/[id]; we only surface
  // the ids here after the same block check has already passed for this pairing, so
  // a blocked viewer never even receives a photo id to request.
  photos: readonly ProfilePhoto[];
  // WHY the viewer is allowed to see this profile, so the UI can explain it honestly.
  // "shared-event" = they hold accepted seats together (or the viewer is an accepted
  // participant in the target's event). "pending-request" = the ONLY link is a
  // host→requester join_request still awaiting the host's decision — the two do NOT
  // yet share an event, so the copy must not claim they do.
  relationship: MemberProfileRelationship;
}>;

export type MemberProfileRelationship = "shared-event" | "pending-request";

// Pure, honest label for why this profile is visible. Kept as a separate exported
// function (not inlined in the page) so the wording is unit-testable and stays in
// lockstep with the relationship discriminant the query derives.
export function memberProfileRelationshipLabel(relationship: MemberProfileRelationship): string {
  return relationship === "shared-event"
    ? "You can see this because you share an event"
    : "You can see this because they asked to join one of your events";
}

type ViewableProfileRow = {
  id: string | number;
  first_name: string;
  last_name: string;
  age: number;
  location: string;
  bio: string;
  languages: string[];
  seeking: SessionUser["seeking"];
  prompts: Array<{ prompt: string; answer: string }> | null;
  sports: Array<{
    name: string;
    skillLevel: SessionUser["sports"][number]["skillLevel"];
    frequency: SessionUser["sports"][number]["frequency"];
  }>;
  shares_accepted_event: boolean;
};

// Ids are bigint in this schema, so a target id must be all-digits to be a real
// user id. Reject anything else early (no query, definitely no enumeration handle).
const NUMERIC_ID_PATTERN = /^[0-9]+$/;

// The single authorization boundary for member-to-member profile viewing. Returns
// the privacy-safe profile ONLY when a legitimate, already-existing relationship
// links the viewer and the target AND no block exists in either direction; returns
// null otherwise. The route turns null into a 404 (never 403 — we do not confirm the
// target exists to an unrelated viewer, and there is no public index to enumerate).
//
// The qualifying relationships — deliberately narrow, matching the same tables the
// host queue, event room, and peer-feedback gates already use:
//   1. HOST → REQUESTER: the viewer hosts an event the target has requested a place
//      in (pending or accepted join_request).
//   2. ACCEPTED PARTICIPANT → HOST: the viewer holds an accepted seat in an event
//      the target hosts.
//   3. ACCEPTED PARTICIPANT → ACCEPTED CO-PARTICIPANT: the viewer and the target both
//      hold accepted seats (event_participants rows) in the same event.
// Accepted seats live in event_participants (a seat is only created on host accept,
// see decideEventJoinRequest), so "accepted" is expressed as an event_participants
// membership throughout. Nothing else qualifies.
export async function getViewableMemberProfile(
  viewerId: string,
  targetId: string,
): Promise<ViewableMemberProfile | null> {
  // A member never reaches their own detailed profile through this route; that is
  // /profile (self-view). Guard first so a self-relationship can never be mistaken
  // for a qualifying one.
  if (String(viewerId) === String(targetId)) return null;
  if (!NUMERIC_ID_PATTERN.test(String(targetId))) return null;

  const sql = getDatabase();
  const rows = (await sql`
    SELECT
      target.id, target.first_name, target.last_name,
      DATE_PART('year', AGE(CURRENT_DATE, target.date_of_birth))::integer AS age,
      target.location, target.bio, target.languages, target.seeking,
      target.personality_prompts AS prompts,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name', user_sports.sport,
            'skillLevel', user_sports.skill_level,
            'frequency', user_sports.frequency
          ) ORDER BY user_sports.created_at
        ) FILTER (WHERE user_sports.id IS NOT NULL),
        '[]'::jsonb
      ) AS sports,
      -- TRUE when the pair actually share an event: an ACCEPTED host→requester
      -- request (relationship 1, accepted), the viewer holding an accepted seat in
      -- the target's event (2), or accepted co-participation (3). FALSE means the
      -- only qualifying link is a still-pending request, so the copy must say
      -- "asked to join", not "you share an event".
      (
        EXISTS (
          SELECT 1 FROM events
          JOIN join_requests ON join_requests.event_id = events.id
          WHERE events.host_user_id = ${viewerId}
            AND join_requests.requester_user_id = target.id
            AND join_requests.status = 'accepted'
        )
        OR EXISTS (
          SELECT 1 FROM events
          JOIN event_participants ON event_participants.event_id = events.id
          WHERE events.host_user_id = target.id
            AND event_participants.user_id = ${viewerId}
        )
        OR EXISTS (
          SELECT 1
          FROM event_participants AS viewer_seat
          JOIN event_participants AS target_seat
            ON target_seat.event_id = viewer_seat.event_id
          WHERE viewer_seat.user_id = ${viewerId}
            AND target_seat.user_id = target.id
        )
      ) AS shares_accepted_event
    FROM users AS target
    LEFT JOIN user_sports ON user_sports.user_id = target.id
    WHERE target.id = ${targetId}
      AND target.account_status = 'active'
      -- No block in EITHER direction. If either party blocked the other the profile
      -- is not viewable at all (and the photo serve route enforces the same, so no
      -- photo renders). Mirrors the block check used by chat, discovery, peer
      -- feedback, and the photo serve route.
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = ${viewerId} AND blocked_user_id = target.id)
           OR (blocker_user_id = target.id AND blocked_user_id = ${viewerId})
      )
      -- At least one qualifying, already-existing relationship must link them.
      AND (
        -- 1. Viewer HOSTS an event the target has REQUESTED (pending/accepted).
        EXISTS (
          SELECT 1 FROM events
          JOIN join_requests ON join_requests.event_id = events.id
          WHERE events.host_user_id = ${viewerId}
            AND join_requests.requester_user_id = target.id
            AND join_requests.status IN ('pending', 'accepted')
        )
        -- 2. Viewer holds an ACCEPTED SEAT in an event the target HOSTS.
        OR EXISTS (
          SELECT 1 FROM events
          JOIN event_participants ON event_participants.event_id = events.id
          WHERE events.host_user_id = target.id
            AND event_participants.user_id = ${viewerId}
        )
        -- 3. Viewer and target both hold ACCEPTED SEATS in the SAME event
        --    (accepted co-participants).
        OR EXISTS (
          SELECT 1
          FROM event_participants AS viewer_seat
          JOIN event_participants AS target_seat
            ON target_seat.event_id = viewer_seat.event_id
          WHERE viewer_seat.user_id = ${viewerId}
            AND target_seat.user_id = target.id
        )
      )
    GROUP BY target.id
    LIMIT 1
  `) as unknown as ViewableProfileRow[];

  const row = rows[0];
  if (!row) return null;

  // The block check above has already passed for this pairing, so it is safe to load
  // (and later serve) this member's photos to the viewer. Only APPROVED photos are
  // surfaced to another member — pending (awaiting image screening) and rejected
  // photos are held and never shown (CX-20260704-feature-image-moderation).
  const photos = await listApprovedProfilePhotos(String(row.id));

  return {
    id: String(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    age: row.age,
    location: row.location,
    bio: row.bio,
    languages: row.languages,
    seeking: row.seeking,
    sports: row.sports,
    prompts: Array.isArray(row.prompts) ? row.prompts : [],
    photos,
    relationship: row.shares_accepted_event ? "shared-event" : "pending-request",
  };
}
