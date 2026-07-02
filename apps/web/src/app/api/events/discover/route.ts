import { NextResponse } from "next/server";

import { resolveDiscoveryArea } from "@/lib/discovery-card";
import { coarsenCoordinates, filterEventsWithinRadius, parseRadiusKm, resolveDiscoveryCentre } from "@/lib/discovery-geo";
import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parameters = new URL(request.url).searchParams;
  const requestedDays = Number(parameters.get("days") ?? 7);
  const withinDays: DiscoveryFilters["withinDays"] = requestedDays === 1 || requestedDays === 30 ? requestedDays : 7;
  // Centre discovery on the member's profile area by default (same rule as the
  // /discover page): an explicit `city` overrides it, `near=all` broadens to
  // everywhere. Uses only the member's own approximate area — no precise location.
  const searchEverywhere = (parameters.get("near") ?? "").trim().toLowerCase() === "all";
  const requestedCity = (parameters.get("city") ?? "").trim().slice(0, 100);
  const area = resolveDiscoveryArea(user.location, requestedCity, searchEverywhere);

  // Opt-in distance-radius filter, matching the /discover page rule exactly (so web and
  // the future mobile client stay in sync). A COARSE centre is resolved from an opt-in
  // client-coarsened device position (`lat`/`lng`, used for this request only, never
  // stored) or the member's profile area geocoded offline; matching is by real distance
  // on coarsened coordinates only, never a precise member or venue point.
  const requestedRadiusKm = parseRadiusKm(parameters.get("radius"));
  const deviceCoordinates = coarsenCoordinates(parameters.get("lat"), parameters.get("lng"));
  const geoCentre = requestedRadiusKm ? resolveDiscoveryCentre({ deviceCoordinates, profileArea: user.location }) : null;
  const radiusActive = Boolean(requestedRadiusKm && geoCentre);

  const filters: DiscoveryFilters = {
    city: radiusActive && !requestedCity ? "" : area.effectiveCity,
    sport: (parameters.get("sport") ?? "").trim().slice(0, 60),
    language: (parameters.get("language") ?? "").trim().slice(0, 35),
    withinDays,
  };
  const fetched = await getDiscoverableEvents(user, filters);
  const events =
    radiusActive && geoCentre
      ? filterEventsWithinRadius(fetched, geoCentre.coordinates, requestedRadiusKm!, requestedCity || area.memberArea)
      : fetched;
  return NextResponse.json(
    {
      events,
      filters,
      nearMe: { active: area.isNearMeDefault, area: area.memberArea },
      // Only ever report the coarse radius and centre SOURCE — never a coordinate — so
      // the response cannot leak a member's position.
      radius: radiusActive ? { km: requestedRadiusKm, centreSource: geoCentre!.source } : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

