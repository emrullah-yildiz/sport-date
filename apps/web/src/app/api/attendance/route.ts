import { NextResponse } from "next/server";

import { cancelAttendanceByToken, confirmAttendanceByToken, type AttendanceActionResult } from "@/lib/attendance-confirmations";
import { attendanceActionRateLimitRules, enforceRateLimit } from "@/lib/rate-limit";

// Public, token-authorized attendance confirm/cancel (no login) —
// CX-20260704-feature-event-attendance-confirmation. The signed single-purpose
// token IS the capability: it maps to exactly one membership's confirmation row,
// so the worst case of a link reaching the wrong inbox is that person acting on
// that one membership — never enumeration or another member's data. Because the
// token is the auth, this is intentionally NOT behind the same-origin browser
// guard (the click legitimately arrives from an email client).
//
// Accepts a form POST (the no-JS fallback on the confirm/cancel page) or the
// enhanced client fetch; both send url-encoded { eventId, token }. With
// `Accept: application/json` it answers JSON; otherwise it 303-redirects back to
// the landing page so a no-JS submit lands on a human result screen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resultToStatus(result: AttendanceActionResult): number {
  if (result === "confirmed" || result === "cancelled") return 200;
  if (result === "expired") return 410; // Gone — the event has started
  return 404; // invalid / already-cancelled: never disclose more
}

export async function POST(request: Request) {
  let form: URLSearchParams;
  try {
    const raw = await request.text();
    form = new URLSearchParams(raw);
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const eventId = form.get("eventId") ?? "";
  const token = form.get("token") ?? "";
  const action = form.get("action") ?? "";
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");

  if (!UUID_PATTERN.test(eventId) || token.length < 16 || (action !== "confirm" && action !== "cancel")) {
    if (wantsJson) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    return NextResponse.redirect(new URL(`/e/${UUID_PATTERN.test(eventId) ? eventId : ""}`, request.url), 303);
  }

  // Bounded per-IP + per-token rate limit on this un-authenticated endpoint. The
  // token's entropy already blocks enumeration; this caps abuse and repeated
  // replays of a `?t=` token exposed via referrer/history/logs. Enforced only for
  // a well-formed request so garbage never consumes a legitimate token's budget.
  const limited = await enforceRateLimit(
    "attendance",
    attendanceActionRateLimitRules(request, token),
    "Too many attendance actions in a short period. Please wait a moment and try again.",
  );
  if (limited) {
    if (wantsJson) return limited;
    // No-JS fallback: land back on the confirm/cancel page, which re-reads state.
    const url = new URL(`/e/${eventId}/${action}`, request.url);
    url.searchParams.set("t", token);
    url.searchParams.set("state", "invalid");
    return NextResponse.redirect(url, 303);
  }

  const result = action === "confirm"
    ? await confirmAttendanceByToken(eventId, token, new Date())
    : await cancelAttendanceByToken(eventId, token, new Date());

  if (wantsJson) {
    return NextResponse.json({ result }, { status: resultToStatus(result), headers: { "Cache-Control": "no-store" } });
  }
  // No-JS fallback: land on the same page, which re-reads the (now updated) state.
  const url = new URL(`/e/${eventId}/${action}`, request.url);
  url.searchParams.set("t", token);
  url.searchParams.set("state", result);
  return NextResponse.redirect(url, 303);
}
