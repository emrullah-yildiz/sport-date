import { NextResponse } from "next/server";

import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getMobileSession } from "@/lib/mobile-session";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("withinDays") ?? "7");
  const withinDays: DiscoveryFilters["withinDays"] = days === 1 || days === 30 ? days : 7;
  const bounded = (name: string, maximum: number) => (url.searchParams.get(name) ?? "").trim().slice(0, maximum);
  const events = await getDiscoverableEvents({ id: session.user.id, age: session.user.age }, {
    city: bounded("city", 100), sport: bounded("sport", 60), language: bounded("language", 35), withinDays,
  });
  return NextResponse.json({ events: events.slice(0, 50) }, { headers: { "Cache-Control": "no-store" } });
}

