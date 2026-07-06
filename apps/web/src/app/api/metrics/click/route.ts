import { NextResponse } from "next/server";

import {
  classifyClickPath,
  isClickMetricEvent,
  recordClickMetric,
} from "@/lib/click-metrics";
import { clickMetricRateLimitRules, enforceRateLimit } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";

// Anonymous first-party click beacon (CX-20260706). Same-origin only, no auth
// and DELIBERATELY no identity: this handler never reads the session, cookies,
// or any identity-bearing header (the tests tripwire this), so nothing here can
// link a click to a person even by accident. The payload is reduced to two
// allowlisted values — an event name and a coarse page class — before storage;
// every other field is dropped. The rate limiter hashes the caller's IP into a
// transient counter (the shared limiter pattern); the IP is never stored in any
// metrics row.
//
// Fails soft on purpose: analytics must never affect member UX. The client
// fires-and-forgets (sendBeacon / keepalive fetch, never awaited by UI code),
// and a storage failure here answers 204 like a success — there is nothing a
// visitor could or should do about a broken counter.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: noStore });
  }

  const limited = await enforceRateLimit(
    "click-metric",
    clickMetricRateLimitRules(request),
    "Too many requests.",
  );
  if (limited) return limited;

  // navigator.sendBeacon sends the JSON string as text/plain — parse the body
  // as JSON regardless of the declared content type.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: noStore });
  }
  const payload = (body && typeof body === "object" ? body : {}) as { event?: unknown; path?: unknown };

  // Fixed allowlist — anything else is rejected, so free text (and with it any
  // smuggled identifier) can never reach the events column.
  if (!isClickMetricEvent(payload.event)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400, headers: noStore });
  }
  // The raw path is collapsed to a coarse page class and then discarded; every
  // other payload field is ignored entirely.
  const pathClass = classifyClickPath(payload.path);

  try {
    await recordClickMetric(payload.event, pathClass);
  } catch (error) {
    // Fail soft: a missing database or a write hiccup must never surface to a
    // visitor as an error — the beacon is best-effort by design.
    console.error("Click metric write failed:", error);
  }
  return new NextResponse(null, { status: 204, headers: noStore });
}
