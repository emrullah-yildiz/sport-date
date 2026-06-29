import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { type EventCreationInput, validateEventCreation } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";
import { type EventUpdateField } from "@/lib/event-updates";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EditableEventSnapshotRow = {
  id: string;
  accepted_count: number;
  sport: string;
  title: string;
  description: string;
  starts_at: string;
  time_zone: string;
  duration_minutes: number;
  capacity: number;
  language: string;
  minimum_age: number;
  maximum_age: number;
  experience_levels: string[];
  public_city: string;
  public_country_code: string;
  public_area_label: string;
  public_approximate_latitude: number | null;
  public_approximate_longitude: number | null;
  venue_name: string;
  address: string;
  precise_latitude: number | null;
  precise_longitude: number | null;
  arrival_instructions: string | null;
};

function equalStringLists(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getChangedFields(current: EditableEventSnapshotRow, next: EventCreationInput): EventUpdateField[] {
  const changedFields: EventUpdateField[] = [];

  if (current.sport !== next.sport) changedFields.push("sport");
  if (current.title !== next.title) changedFields.push("title");
  if (current.description !== next.description) changedFields.push("description");
  if (new Date(current.starts_at).toISOString() !== next.startsAt.toISOString() || current.time_zone !== next.timeZone) changedFields.push("startsAt");
  if (current.duration_minutes !== next.durationMinutes) changedFields.push("durationMinutes");
  if (current.capacity !== next.capacity) changedFields.push("capacity");
  if (current.language !== next.language) changedFields.push("language");
  if (!equalStringLists(current.experience_levels, next.experienceLevels)) changedFields.push("experienceLevels");
  if (current.minimum_age !== next.participantAgeRange.minimum || current.maximum_age !== next.participantAgeRange.maximum) changedFields.push("participantAgeRange");

  if (
    current.public_city !== next.location.public.city
    || current.public_country_code !== next.location.public.countryCode
    || current.public_area_label !== next.location.public.areaLabel
    || current.public_approximate_latitude !== next.location.public.approximateLatitude
    || current.public_approximate_longitude !== next.location.public.approximateLongitude
  ) changedFields.push("publicLocation");

  if (
    current.venue_name !== next.location.private.venueName
    || current.address !== next.location.private.address
    || current.precise_latitude !== next.location.private.latitude
    || current.precise_longitude !== next.location.private.longitude
  ) changedFields.push("privateLocation");

  if ((current.arrival_instructions ?? "") !== (next.location.private.instructions ?? "")) changedFields.push("arrivalInstructions");

  return changedFields;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validateEventCreation(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  const event = validation.data;
  const sql = getDatabase();
  const currentRows = await sql`
    SELECT
      events.id,
      COALESCE((SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id), 0) AS accepted_count,
      events.sport, events.title, events.description, events.starts_at, events.time_zone, events.duration_minutes,
      events.capacity, events.language, events.minimum_age, events.maximum_age,
      events.experience_levels, events.public_city, events.public_country_code,
      events.public_area_label, events.public_approximate_latitude, events.public_approximate_longitude,
      private_location.venue_name, private_location.address, private_location.precise_latitude,
      private_location.precise_longitude, private_location.arrival_instructions
    FROM events
    JOIN event_private_locations AS private_location ON private_location.event_id = events.id
    WHERE events.id = ${eventId}::uuid
      AND events.host_user_id = ${host.id}
      AND events.status IN ('draft', 'published')
      AND events.starts_at > NOW()
    LIMIT 1
  ` as unknown as EditableEventSnapshotRow[];

  const current = currentRows[0];
  if (!current || event.capacity < current.accepted_count) {
    return NextResponse.json({ error: "Event cannot be updated. Check whether it has started, been cancelled, or already has more accepted participants than the new capacity allows." }, { status: 409 });
  }

  const experienceLevels = JSON.stringify(event.experienceLevels);
  const changedFields = getChangedFields(current, event);
  const changedFieldsJson = JSON.stringify(changedFields);
  const results = await sql.transaction((transaction) => [
    transaction`
      UPDATE events
      SET sport = ${event.sport},
          title = ${event.title},
          description = ${event.description},
          starts_at = ${event.startsAt.toISOString()}::timestamptz,
          time_zone = ${event.timeZone},
          duration_minutes = ${event.durationMinutes},
          capacity = ${event.capacity},
          language = ${event.language},
          minimum_age = ${event.participantAgeRange.minimum},
          maximum_age = ${event.participantAgeRange.maximum},
          experience_levels = ARRAY(SELECT jsonb_array_elements_text(${experienceLevels}::jsonb)),
          public_city = ${event.location.public.city},
          public_country_code = ${event.location.public.countryCode},
          public_area_label = ${event.location.public.areaLabel},
          public_approximate_latitude = ${event.location.public.approximateLatitude},
          public_approximate_longitude = ${event.location.public.approximateLongitude},
          updated_at = NOW()
      WHERE id = ${eventId}::uuid
        AND ${event.capacity} >= COALESCE((SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id), 0)
      RETURNING id
    `,
    transaction`
      UPDATE event_private_locations
      SET venue_name = ${event.location.private.venueName},
          address = ${event.location.private.address},
          precise_latitude = ${event.location.private.latitude},
          precise_longitude = ${event.location.private.longitude},
          arrival_instructions = ${event.location.private.instructions ?? null},
          updated_at = NOW()
      WHERE event_id = ${eventId}::uuid
      RETURNING event_id
    `,
    changedFields.length > 0
      ? transaction`
        INSERT INTO event_update_notices (id, event_id, actor_user_id, changed_fields)
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${eventId}::uuid,
          ${host.id},
          ARRAY(SELECT jsonb_array_elements_text(${changedFieldsJson}::jsonb))
        )
        RETURNING id
      `
      : transaction`SELECT ${eventId}::uuid AS id`,
  ]);

  if (results[0].length === 0 || results[1].length === 0) {
    return NextResponse.json({ error: "Event cannot be updated. Check whether it has started, been cancelled, or already has more accepted participants than the new capacity allows." }, { status: 409 });
  }

  return NextResponse.json({ success: true, eventId, message: "Event updated." });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const sql = getDatabase();
  const result = await sql`
    WITH cancelled_event AS (
      UPDATE events
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${eventId}::uuid
        AND host_user_id = ${host.id}
        AND status IN ('draft', 'published')
      RETURNING id
    ), removed_participants AS (
      DELETE FROM event_participants
      USING cancelled_event
      WHERE event_participants.event_id = cancelled_event.id
    ), cancelled_requests AS (
      UPDATE join_requests AS request
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      FROM cancelled_event
      WHERE request.event_id = cancelled_event.id
        AND request.status IN ('pending', 'accepted')
    )
    SELECT id FROM cancelled_event
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "Event cannot be cancelled." }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    eventId,
    status: "cancelled",
    message: "Event cancelled. Active requests, seats, and room access are now closed.",
  });
}
