import { NextResponse } from "next/server";

import { parseCoordinatePair, parsePhotonReverseSuggestion } from "@/lib/location-search";
import { enforceRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

// Reverse geocode for the host map picker (CX-20260706-event-location-map-picker).
// EXACTLY the same data-minimization contract as the forward /api/locations/search
// proxy: authenticated members only, rate-limited, and the upstream provider sees
// ONLY the pin coordinates — no member identity, no cookies, and no client IP
// (the server makes the outbound call itself; nothing from the inbound request is
// forwarded). Responses are never cached.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const limited = await enforceRateLimit("location-reverse", [
    { name: "user", limit: 60, windowMs: 60_000, key: String(user.id) },
    { name: "ip", limit: 90, windowMs: 60_000, key: getRequestIp(request) },
  ], "Too many map look-ups. Wait a moment and try again.");
  if (limited) return limited;

  const url = new URL(request.url);
  const pin = parseCoordinatePair(url.searchParams.get("latitude"), url.searchParams.get("longitude"));
  if (!pin) return NextResponse.json({ error: "A valid latitude and longitude are required." }, { status: 400 });

  const providerBase = (process.env.LOCATION_SEARCH_BASE_URL || "https://photon.komoot.io").replace(/\/+$/, "");
  const providerUrl = new URL(`${providerBase}/reverse`);
  providerUrl.searchParams.set("lat", String(pin.latitude));
  providerUrl.searchParams.set("lon", String(pin.longitude));
  providerUrl.searchParams.set("limit", "1");

  try {
    const response = await fetch(providerUrl, {
      headers: { Accept: "application/geo+json, application/json", "User-Agent": "SportDate/1.0 location-reverse" },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Location provider responded ${response.status}`);
    // `suggestion` is null when the point resolves to nothing addressable — the
    // client keeps the tapped coordinates and leaves the address text untouched.
    return NextResponse.json(
      { suggestion: parsePhotonReverseSuggestion(await response.json()) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    // The pin the host tapped is already set client-side; only the address
    // refresh degrades. Same graceful 503 contract as the forward search.
    return NextResponse.json({ error: "Address lookup is temporarily unavailable — your pin is still set." }, { status: 503 });
  }
}
