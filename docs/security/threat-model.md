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

## Native session threats and controls

- Token theft: use separate short access and rotating refresh credentials, store only hashes server-side, and keep native values in SecureStore rather than ordinary app storage.
- Refresh replay: retain spent refresh hashes until family expiry and revoke the family when reuse is detected.
- Cross-device replay: bind access and refresh to a generated installation UUID, while explicitly not claiming hardware attestation.
- Session persistence after device loss or iOS reinstall: keep a fixed server expiry, account-deletion revocation, logout revocation, and a planned member device-management surface.
- Token exfiltration through configuration: permit only relative `/api/mobile/` paths in authenticated fetches and require an HTTPS `EXPO_PUBLIC_API_URL` outside local development. Public Expo environment values must never contain secrets.
- Residual risk: a compromised device process can steal both binding and tokens; production requires anomaly detection, rate limiting, app-integrity review, and an incident-revocation procedure.
- Native discovery receives approximate locations only. Exact room logistics use the existing host/accepted-participant authorization and are fetched only for the selected event-day view; they are not persisted by the application client.
- Native blocking/reporting and host decisions reuse the same server actions as web. Client state never grants a seat, verifies a report relationship, or decides whether exact room access survives a block.
