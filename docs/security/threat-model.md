# Initial threat model

## Highest-risk harms

- Stalking or physical harm enabled by precise location disclosure.
- Harassment, impersonation, scams, spam, and coercion.
- Account takeover and unauthorized access to rooms or event details.
- Discriminatory discovery or advertising behavior.
- Scraping of profiles, photos, preferences, and event attendance.
- Abuse reports that are lost, exposed, or handled without auditability.

## Baseline controls

- Approximate location before acceptance; precise meeting details only for authorized participants.
- Server-side authorization for every profile, event, request, room, and moderation operation.
- Rate limits and abuse detection around discovery, requests, messaging, and authentication.
- Blocking and reporting available throughout the core journey.
- Immutable audit records for moderation and privileged actions.
- Short retention windows where possible, encrypted transport and storage, secret rotation, and dependency scanning.

