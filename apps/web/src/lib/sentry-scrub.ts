// Privacy/PII scrubbing shared by every Sentry runtime (server, edge, client).
//
// This is a privacy-first EU dating product: events sent to Sentry MUST NOT
// carry member PII. The DSN is read from process.env elsewhere; this module
// only sanitises an outgoing event. It is intentionally dependency-free and
// pure so it can run identically in the Node, Edge, and browser runtimes.
//
// What it strips, regardless of `sendDefaultPii`:
//   - request bodies / `data` (free-text fields, messages, profile data),
//   - `Cookie` and `Authorization` headers (session + bearer credentials),
//   - URL query strings (tokens, emails, ids leak via query),
//   - any email address or IP address found anywhere in the event payload.
//
// It also redacts the top-level `user` object and any `server_name` (can embed
// a host/identity). The function never throws — on any error it drops the whole
// event (returns null) rather than risk sending unscrubbed data.

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// IPv4 and a permissive IPv6 (hex groups separated by colons). Conservative on
// purpose: better to over-redact a number that looks like an address than leak.
const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
// Matches IPv6 including `::`-compressed forms (`2001:db8::1`, `::1`). Requires
// either a `::` compression marker or 3+ colon-separated hex groups, so plain
// `HH:MM`-style time strings are not falsely redacted. Permissive within those
// shapes on purpose — over-redacting a real address is safer than leaking one.
const IPV6_RE =
  /(?:[A-F0-9]{1,4}:){2,}(?::?[A-F0-9]{1,4})+|(?:[A-F0-9]{1,4}:){1,7}:|::(?:[A-F0-9]{1,4}:){0,6}[A-F0-9]{1,4}|::/gi;

const SENSITIVE_HEADERS = new Set(["cookie", "authorization", "set-cookie", "x-forwarded-for", "x-real-ip"]);

const REDACTED = "[redacted]";

function scrubString(value: string): string {
  return value
    .replace(EMAIL_RE, REDACTED)
    .replace(IPV4_RE, REDACTED)
    .replace(IPV6_RE, REDACTED);
}

// Recursively scrub email/IP text out of arbitrary JSON-ish structures with a
// bounded depth so a pathological event can't cause unbounded work.
function deepScrub(value: unknown, depth: number): unknown {
  if (depth > 8) return REDACTED;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => deepScrub(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = deepScrub(inner, depth + 1);
    }
    return out;
  }
  return value;
}

type SentryRequest = {
  data?: unknown;
  query_string?: unknown;
  cookies?: unknown;
  headers?: Record<string, unknown>;
  url?: unknown;
  env?: unknown;
};

// Structural view of the parts of a Sentry event we touch. Kept loose on
// purpose: `scrubEvent` is generic so it returns the SDK's own event type
// (e.g. `ErrorEvent`) unchanged, which is what `beforeSend` expects.
type ScrubbableEvent = {
  request?: SentryRequest;
  user?: unknown;
  server_name?: unknown;
  contexts?: unknown;
  extra?: unknown;
  tags?: unknown;
  breadcrumbs?: unknown;
  message?: unknown;
  exception?: unknown;
};

/**
 * Scrub an outgoing Sentry event in place (returns the same object). Used as
 * `beforeSend` for the captured-error pipeline. Returns `null` if scrubbing
 * fails, which tells the SDK to drop the event rather than send it unsanitised.
 *
 * Generic over the concrete SDK event type so the `beforeSend` contract
 * (`ErrorEvent -> ErrorEvent | null`) is preserved.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T | null {
  try {
    // Operate through an untyped alias so we can delete/reassign fields without
    // fighting the concrete SDK event type; it's the same object reference.
    const e = event as Record<string, unknown>;

    // Always drop user identity (id/email/ip_address/username live here).
    delete e.user;
    delete e.server_name;

    const request = e.request as SentryRequest | undefined;
    if (request && typeof request === "object") {
      const req = request as Record<string, unknown>;
      // Strip request bodies / data, query strings, and cookies wholesale.
      delete req.data;
      delete req.query_string;
      delete req.cookies;
      delete req.env;

      // Remove the query string from the captured URL but keep the path.
      if (typeof req.url === "string") {
        const queryIndex = req.url.indexOf("?");
        const pathOnly = queryIndex >= 0 ? req.url.slice(0, queryIndex) : req.url;
        req.url = scrubString(pathOnly);
      }

      // Drop sensitive headers; scrub the survivors for email/IP.
      if (req.headers && typeof req.headers === "object") {
        const headers: Record<string, unknown> = {};
        for (const [name, headerValue] of Object.entries(req.headers as Record<string, unknown>)) {
          if (SENSITIVE_HEADERS.has(name.toLowerCase())) continue;
          headers[name] = typeof headerValue === "string" ? scrubString(headerValue) : headerValue;
        }
        req.headers = headers;
      }
    }

    // Deep-scrub email/IP from every remaining free-form region of the event.
    if (e.extra !== undefined) e.extra = deepScrub(e.extra, 0);
    if (e.tags !== undefined) e.tags = deepScrub(e.tags, 0);
    if (e.contexts !== undefined) e.contexts = deepScrub(e.contexts, 0);
    if (e.breadcrumbs !== undefined) e.breadcrumbs = deepScrub(e.breadcrumbs, 0);
    if (typeof e.message === "string") e.message = scrubString(e.message);
    if (e.exception !== undefined) e.exception = deepScrub(e.exception, 0);

    return event;
  } catch {
    // Never send a partially-scrubbed event — dropping is the safe default.
    return null;
  }
}
