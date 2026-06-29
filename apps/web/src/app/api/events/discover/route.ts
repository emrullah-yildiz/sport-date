import { NextResponse } from "next/server";

import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parameters = new URL(request.url).searchParams;
  const requestedDays = Number(parameters.get("days") ?? 7);
  const withinDays: DiscoveryFilters["withinDays"] = requestedDays === 1 || requestedDays === 30 ? requestedDays : 7;
  const filters: DiscoveryFilters = {
    city: (parameters.get("city") ?? "").trim().slice(0, 100),
    sport: (parameters.get("sport") ?? "").trim().slice(0, 60),
    language: (parameters.get("language") ?? "").trim().slice(0, 35),
    withinDays,
  };
  const events = await getDiscoverableEvents(user, filters);
  return NextResponse.json({ events, filters }, { headers: { "Cache-Control": "private, no-store" } });
}

