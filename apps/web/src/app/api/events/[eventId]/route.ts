import { NextResponse } from "next/server";

import { validateEventCreation } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const experienceLevels = JSON.stringify(event.experienceLevels);
  const sql = getDatabase();
  const results = await sql.transaction((transaction) => [
    transaction`
      WITH editable_event AS (
        SELECT events.id, COALESCE((SELECT COUNT(*)::integer FROM event_participants WHERE event_id = events.id), 0) AS accepted_count
        FROM events
        WHERE events.id = ${eventId}::uuid
          AND events.host_user_id = ${host.id}
          AND events.status IN ('draft', 'published')
          AND events.starts_at > NOW()
      )
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
      FROM editable_event
      WHERE events.id = editable_event.id
        AND ${event.capacity} >= editable_event.accepted_count
      RETURNING events.id
    `,
    transaction`
      UPDATE event_private_locations
      SET venue_name = ${event.location.private.venueName},
          address = ${event.location.private.address},
          precise_latitude = ${event.location.private.latitude},
          precise_longitude = ${event.location.private.longitude},
          arrival_instructions = ${event.location.private.instructions ?? null}
      WHERE event_id = ${eventId}::uuid
        AND EXISTS (
          SELECT 1 FROM events
          WHERE events.id = ${eventId}::uuid
            AND events.host_user_id = ${host.id}
            AND events.status IN ('draft', 'published')
            AND events.starts_at > NOW()
        )
      RETURNING event_id
    `,
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
