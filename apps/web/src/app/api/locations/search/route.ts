import { NextResponse } from "next/server";

import { parsePhotonSuggestions } from "@/lib/location-search";
import { enforceRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const limited = await enforceRateLimit("location-search", [
    { name: "user", limit: 60, windowMs: 60_000, key: String(user.id) },
    { name: "ip", limit: 90, windowMs: 60_000, key: getRequestIp(request) },
  ], "Too many location searches. Wait a moment and try again.");
  if (limited) return limited;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 160);
  const countryCode = (url.searchParams.get("countryCode") ?? "").trim().toUpperCase();
  if (query.length < 3) return NextResponse.json({ suggestions: [] });
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return NextResponse.json({ error: "Country code must use two letters." }, { status: 400 });

  const providerBase = (process.env.LOCATION_SEARCH_BASE_URL || "https://photon.komoot.io").replace(/\/+$/, "");
  const providerUrl = new URL(`${providerBase}/api`);
  providerUrl.searchParams.set("q", query);
  providerUrl.searchParams.set("limit", "6");
  if (countryCode) providerUrl.searchParams.set("countrycode", countryCode);

  try {
    const response = await fetch(providerUrl, {
      headers: { Accept: "application/geo+json, application/json", "User-Agent": "SportDate/1.0 location-search" },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Location provider responded ${response.status}`);
    return NextResponse.json({ suggestions: parsePhotonSuggestions(await response.json()) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Location search is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
