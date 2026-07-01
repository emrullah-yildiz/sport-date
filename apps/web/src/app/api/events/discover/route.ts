import { NextResponse } from "next/server";

import { resolveDiscoveryArea } from "@/lib/discovery-card";
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
  const area = resolveDiscoveryArea(user.location, (parameters.get("city") ?? "").trim().slice(0, 100), searchEverywhere);
  const filters: DiscoveryFilters = {
    city: area.effectiveCity,
    sport: (parameters.get("sport") ?? "").trim().slice(0, 60),
    language: (parameters.get("language") ?? "").trim().slice(0, 35),
    withinDays,
  };
  const events = await getDiscoverableEvents(user, filters);
  return NextResponse.json({ events, filters, nearMe: { active: area.isNearMeDefault, area: area.memberArea } }, { headers: { "Cache-Control": "private, no-store" } });
}

