// Anonymous first-party click beacon — CLIENT helper (CX-20260706).
//
// Fire-and-forget: report that one allowlisted CTA was used, and NOTHING else.
// The payload is only the event name plus the current pathname (which the
// server immediately collapses to a coarse page class and discards). No
// cookies or storage are read or written here, no identifier is attached, and
// no third-party host is ever contacted — the beacon goes to our own origin.
//
// This function must NEVER throw and never block navigation: analytics
// failures are invisible to members by design. navigator.sendBeacon is the
// primary transport (it survives page unloads, e.g. right before a redirect);
// a keepalive fetch with credentials omitted is the fallback.

const ENDPOINT = "/api/metrics/click";

export function trackClick(event: string): void {
  try {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ event, path: window.location.pathname });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        if (navigator.sendBeacon(ENDPOINT, payload)) return;
      } catch {
        // Fall through to fetch below.
      }
    }
    if (typeof fetch === "function") {
      // credentials: "omit" — the request carries no cookie at all, so even the
      // transport is identity-free (the server never reads identity anyway).
      void fetch(ENDPOINT, {
        method: "POST",
        body: payload,
        keepalive: true,
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  } catch {
    // Never throws — a broken counter must never break a click.
  }
}
