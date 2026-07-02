import { NextResponse } from "next/server";

import { applyAdvancedFilters, resolveAdvancedFilters } from "@/lib/discovery-advanced-filters";
import { isPlus } from "@/lib/entitlements";
import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getMobileSession } from "@/lib/mobile-session";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("withinDays") ?? "7");
  const withinDays: DiscoveryFilters["withinDays"] = days === 1 || days === 30 ? days : 7;
  const bounded = (name: string, maximum: number) => (url.searchParams.get(name) ?? "").trim().slice(0, maximum);
  // Plus perk gate (CX-20260701-plus-perks-advanced-discovery-filters), same rule as
  // web so mobile stays in sync. Fails closed to FREE (no advanced facets). The mobile
  // client doesn't offer the geo radius here, so only the schedule + multi-language
  // facets apply — both narrow purely on the event row.
  const plus = isPlus(session.user);
  const advanced = resolveAdvancedFilters(plus, {
    schedule: url.searchParams.get("schedule"),
    languages: url.searchParams.getAll("languages"),
  });
  const fetched = await getDiscoverableEvents({ id: session.user.id, age: session.user.age }, {
    city: bounded("city", 100), sport: bounded("sport", 60), language: bounded("language", 35), withinDays,
  });
  const events = applyAdvancedFilters(fetched, advanced);
  return NextResponse.json(
    { events: events.slice(0, 50), plus, advanced: { schedule: advanced.schedule, languages: advanced.languages } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

