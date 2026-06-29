# Decision log

## 2026-06-29 - Product operating principle

Optimize for safe completed encounters and willingness to meet again, not swipes or screen time.

## 2026-06-29 - Autonomous operating model

Use the repo-scoped `$run-product-studio` skill as the durable product-lead workflow. Keep external publishing, spending, production, credentials, platform terms, and legal sign-off under owner control.

## 2026-06-29 - Database-backed browser sessions

Use random opaque session cookies with only SHA-256 hashes stored in PostgreSQL. Resolve authorization server-side on every protected boundary. Login rotates a browser's previous session and logout revokes it. Reassess a maintained authentication library before production because custom authentication increases long-term security responsibility.

## 2026-06-29 - Deletion is an auditable state transition

A deletion request immediately locks the profile and revokes sessions, then enters an auditable queue. Do not promise unconditional instant erasure: determine and document applicable legal or safety exceptions, vendor propagation, backup expiry, and completion before launch. Terms acceptance is not treated as blanket privacy or marketing consent.

## 2026-06-29 - Precise event locations use a separate persistence boundary

Store discoverable event fields and exact meeting locations in separate tables. Public discovery queries must not join the private table. Only host, accepted-participant, or explicitly authorized audited moderation paths may retrieve precise meeting data.

## 2026-06-29 - Mutual blocks disappear from discovery without explanation

Exclude an event when either the requester or host has blocked the other. Return no block-specific reason or placeholder card, preventing discovery behavior from revealing the relationship.

## 2026-06-29 - Event capacity is enforced with unique numbered seats

Accepting a request atomically claims the lowest available numbered seat under unique database constraints. Concurrent accept attempts cannot create more participant rows than the event capacity; a losing conflict leaves the request pending instead of overfilling the event.

## 2026-06-29 - Open messaging waits for human safety operations

Do not enable member messaging merely because room authorization exists. Require accessible reporting, immediate blocking, append-only case audit, evidence policy, staffed critical escalation, decision notices, and appeals first. Automated priority routes cases but never constitutes a finding.

## 2026-06-29 - Appeal reviewers must be independent

An active moderator cannot review an appeal against a decision they issued. Enforce separation in the queue and again inside the locked database mutation. Preserve the original decision and publish the appeal outcome separately instead of rewriting history.

## 2026-06-29 - Gamification rewards real encounters, not app consumption

Use progression to make reliable participation, good hosting, completed movement, reflection, and meeting again feel tangible. Do not award points for profile browsing, requests sent, host skips, rejection, reports avoided, daily login streaks, or time on screen. Progress must be derived from trustworthy product records and must never pressure a member to attend an unsafe event.

## 2026-06-29 - Mobile prototypes must declare when they are not synced

Keep the Expo interaction prototype visibly labelled until secure native session transport and live API integration exist. Do not let polished local state imply a real account, persisted reflection, or production readiness. Native clients must not copy browser-cookie assumptions.

## 2026-06-29 - Native sessions use a separate rotating credential family

Do not share browser cookies with native clients. Issue a short opaque access token and a rotating fixed-lifetime refresh token, store only hashes, bind the family to an installation UUID, and revoke on spent-token reuse. Treat installation headers as replay friction rather than hardware attestation.

## 2026-06-29 - Native discovery stays read-only until mutation parity exists

Live mobile discovery may expose the same approximate compatible-event data as web, but request controls wait for native-authorized capacity conflicts, cancellation, blocking, reporting, and retry recovery. Polished buttons must not imply a safe mutation path before the server boundary exists.

Native request and cancellation controls became eligible once they reused the web server mutation, refreshed authoritative state after conflicts, and warned before an accepted-place cancellation revoked exact room access. Host decisions and safety controls passed their own parity gate in the following slice.

## 2026-06-29 - Web and native safety mutations share one server action

Block, report, request, cancel, accept, and skip behavior must not fork by client. Browser and native routes authenticate differently but call the same authorization and database actions, preserving immediate access revocation, report relationship checks, numbered-seat capacity, and maximum-three-skip behavior.

## 2026-06-29 - Current mobile device exits through sign-out

Mobile device management can remotely revoke other sessions but cannot revoke the session authorizing its own request; current-device termination uses the logout path so the server revocation and SecureStore deletion run together. Web may revoke any native session for account recovery.

## 2026-06-29 - Validate a corridor before claiming a city

Treat Bucharest as a research hypothesis. First test the Aviatorilor-Herastrau to Aurel Vlaicu-Floreasca corridor with recurring beginner-friendly run/run-walk and four-person indoor padel formats. Running tests low-friction demand; padel tests the bounded social encounter. Keep bouldering as the replacement if padel economics fail. Do not add neighborhoods, sports, or paid acquisition before four credible hosts and repeated event supply exist.

## 2026-06-29 - Harden the web surface before external traffic

Emit one restrictive header policy across every web route instead of relying on route-by-route discipline. Deny framing, keep a self-only baseline CSP, disable unnecessary browser capabilities, prefer strict cross-origin isolation headers, and add HSTS only in production.

## Open decisions

- Final product and company name.
- Launch country, city, neighborhoods, and initial sports.
- Whether the third host skip automatically declines or triggers another state.
- Initial relationship scope and how dating, friendship, and group intentions interact.
- Business model and launch budget.
