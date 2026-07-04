import crypto from "node:crypto";

import { validateEventCreation } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { validateEventPostalCode, validateOptionalPinnedEventLocation } from "@/lib/directions";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const host = await getCurrentUser();
  if (!host) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

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

  // Structured precise address: the postal code is MANDATORY on create
  // (CX-20260704). venue name, street address, and city are already required by
  // the domain validator; the postal code lives on event_private_locations.
  const rawPostal = (((body as Record<string, unknown>)?.location as Record<string, unknown> | undefined)?.private as Record<string, unknown> | undefined)?.postalCode;
  const postal = validateEventPostalCode(rawPostal);
  if (!postal.valid) {
    return NextResponse.json({ error: postal.error, errors: [postal.error] }, { status: 400 });
  }
  const postalCode = postal.postalCode;

  const event = validation.data;
  // The precise pin is optional: absent coordinates (geocoder down or a manually
  // typed address) must not block creation — only a malformed supplied pin does.
  const pin = validateOptionalPinnedEventLocation(event.location.private.latitude, event.location.private.longitude);
  if (!pin.valid) return NextResponse.json({ error: pin.error, errors: [pin.error] }, { status: 400 });
  const eventId = crypto.randomUUID();
  const experienceLevels = JSON.stringify(event.experienceLevels);
  const sql = getDatabase();
  const results = await sql.transaction((transaction) => [
    transaction`
      INSERT INTO events (
        id, host_user_id, sport, title, description, starts_at, time_zone,
        duration_minutes, capacity, language, minimum_age, maximum_age,
        experience_levels, public_city, public_country_code, public_area_label,
        public_approximate_latitude, public_approximate_longitude, status
      )
      VALUES (
        ${eventId}::uuid, ${host.id}, ${event.sport}, ${event.title}, ${event.description},
        ${event.startsAt.toISOString()}::timestamptz, ${event.timeZone}, ${event.durationMinutes},
        ${event.capacity}, ${event.language}, ${event.participantAgeRange.minimum},
        ${event.participantAgeRange.maximum},
        ARRAY(SELECT jsonb_array_elements_text(${experienceLevels}::jsonb)),
        ${event.location.public.city}, ${event.location.public.countryCode},
        ${event.location.public.areaLabel}, ${event.location.public.approximateLatitude},
        ${event.location.public.approximateLongitude}, 'published'
      )
      RETURNING id
    `,
    transaction`
      INSERT INTO event_private_locations (
        event_id, venue_name, address, postal_code, precise_latitude, precise_longitude, arrival_instructions
      )
      VALUES (
        ${eventId}::uuid, ${event.location.private.venueName}, ${event.location.private.address}, ${postalCode},
        ${pin.latitude}, ${pin.longitude},
        ${event.location.private.instructions ?? null}
      )
    `,
  ]);

  if (results[0].length === 0) return NextResponse.json({ error: "Event could not be created." }, { status: 500 });
  return NextResponse.json({ success: true, eventId }, { status: 201 });
}
