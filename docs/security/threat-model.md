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
- Metadata-only moderation queues, purpose-labelled immutable case-access logs, and case-specific access before report narratives or identities are returned.
- Immutable evidence references that reject copied content, token-bearing URLs, and arbitrary retention intervals; file uploads remain disabled.
- Short retention windows where possible, encrypted transport and storage, secret rotation, and dependency scanning.

## Residual moderation risks

- Database operators can still bypass application authorization; production database access needs provider audit, least privilege, and recurring review.
- An opaque evidence locator can still be sensitive if staff encode personal data into it. Training, access review, and monitoring remain required.
- Retention-review dates trigger review, not automatic deletion. Counsel and the safety owner must approve final retention and preservation rules before launch.
- Case access logs are themselves personal data and require a defined retention period and restricted review process.
