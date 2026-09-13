# Main landing measurement — 2026-09-14

The main `/landing` route now mounts the existing anonymous `ClickTracking` component with the allowlisted `landing_viewed` page event. `/` redirects to that route. `/concept` does not mount the tracker, and fictional activity/intent choices remain untracked.

This fixes the missing top-of-funnel activity count using the same mechanism as `discover_viewed`. Migration 043 has no event-name database constraint, so this addition requires no database migration. The existing operational privacy note (`docs/legal/privacy-notice.md`, section 3.8) already describes fixed first-party button/page counters; no identifier, provider, retention change or new legal conclusion is introduced.

Only server date, fixed event name, coarse `/` page class and integer count reach the aggregate table. Main loads by guests and members use the identical payload. Session, identity, demo preferences, query strings and exact locations are not added to storage. Existing origin checks, rate limits, allowlist validation and fail-soft delivery remain unchanged.

Interpret the measure as **recorded main landing loads**, never unique visitors, registrations or customers. Repeated mounts/reloads can increment it repeatedly; development Strict Mode can replay effects. JavaScript-disabled visits, blocked/failed beacons and rate-limited requests may be missing. Staff/tests and bots are not excluded. Do not treat absence before release as zero traffic, backfill invented counts, or call CTA count divided by landing loads a person-level conversion rate.

The resulting count is a directional activity denominator for diagnosis. Reliable registration and retention targets still need trusted, fixture-excluded operational aggregates. Validation includes main/member/preview instrumentation boundaries, accepted repeated page events, extra-field stripping, existing click allowlist/storage/summary tests, and TypeScript. Production delivery and live counters require a separately authorized release; this work performs neither deployment nor production writes.
