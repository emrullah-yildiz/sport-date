# Decision log

## 2026-06-29 - Consolidate account-enumeration posture; floor the reset-request timing channel now, defer full constant-time to the edge gate

Unified the two previously separate enumeration defenses into one documented stance in `docs/security/authentication.md` ("Account-enumeration posture"): body-level neutrality is implemented and tested on every surface (login generic 401, reset-request single neutral 202 reused even for the 429, registration's duplicate-email signal accepted and rate-limited). On timing, login is already equalized by a *real* dummy-bcrypt comparison that dominates both the exists and missing paths, so it needs no change. The reset request has no natural dominant operation, so its insert path and no-op path differ in latency. Decided to add a bounded artificial-delay floor now (`RESET_REQUEST_MIN_DURATION_MS = 350ms` via `holdUntilMinimumDuration` in `auth-email.ts`), padding success *and* error outcomes (errors padded then re-thrown so the route still returns the identical neutral 202). Chose the floor over (a) doing nothing until the edge gate or (b) forcing true constant-time in-app: a floor is small, low-risk, infrastructure-free, and tested (`auth-email.test.ts` "enumeration timing floor" asserts both paths are held and the neutral return contract is unchanged), while a correct constant-time floor high enough to dominate every real insert cannot be tuned without the gated real-PostgreSQL instance. Documented honestly that a floor caps the observable minimum but is not a constant-time guarantee — full closure is deferred to shared edge/gateway rate limiting (owner/infra gate), which makes the large sample counts a timing attack needs impractical. Enumeration is reduced, not eliminated, until that gate lands. Suite 142 -> 144 (two floor tests); typecheck green.

## 2026-06-29 - Threat-model the verification/reset flows in authentication.md, citing tests not aspirations

Placed the verification/reset threat model in `docs/security/authentication.md` (not the design doc) because that file already carries the implemented authentication security posture; the design doc stays the provider-independent "what to build" and `threat-model.md` stays the product-wide harm catalogue, each cross-referenced rather than duplicated. Wrote every entry as threat -> control -> verification -> residual risk, and required each control to cite a concrete existing test (e.g. `auth-email.test.ts` "resets the password and revokes every browser and mobile session"; route test "returns the identical response whether or not the account exists") so the doc describes proven behavior, not intent. Recorded the verification/reset asymmetry deliberately: a reset revokes all browser+mobile sessions, verification revokes nothing, because verifying an inbox is not a credential change. Flagged three residual gates rather than smoothing them over: the reset-request response is constant-body but not constant-time (an enumeration timing channel that the edge rate-limit gate should close), the in-app throttles are per-process memory only, and `requested_ip_hash` is pseudonymisation (a reversible hash of a low-entropy IP), not anonymisation. Kept the honest-claim boundary explicit: verification proves inbox control only, never identity/age/safety. The reset token window (60m) was noted as sitting at the long end of the design's 30-60m recommendation rather than silently treated as canonical.

## 2026-06-29 - Cover verification/reset routes at the HTTP boundary, mocking the token core

The four verification/reset routes previously asserted only one pre-database guard branch each, and `email-verification/request` had no test. Added route-level tests that mock `@/lib/auth-email` to drive each domain state and assert the exact status/body mapping the routes own: 410 for expired links, 401 for unauthenticated verification requests, 403 for cross-site mutations, 503 on `DatabaseNotConfiguredError`, and a 429 once the per-user verification rate limit is exhausted. The password-reset request route is additionally checked for enumeration neutrality: existing accounts, missing accounts, a database failure, and an unexpected throw all return the identical neutral 202 body. The rate-limit module's in-memory store is reset between tests via `resetRateLimitStoreForTests` so throttling assertions stay deterministic. This is a deliberate boundary split: the core's persistence side effects are asserted in `auth-email.test.ts`; these tests own only the request parsing, guards, and status mapping. A real-SQL integration test still waits on the isolated PostgreSQL gate.

## 2026-06-29 - Test the auth-email security core directly, not just route guards

The email-verification and password-reset routes only had thin tests covering pre-database guard rejections (CSRF, malformed token, invalid email). The security-sensitive persistence rules in `apps/web/src/lib/auth-email.ts` had no direct coverage. Added a focused unit suite asserting single-use token consumption, expiry without side effects, sibling-token invalidation, IP-hash-not-cleartext on reset requests, and the critical reset boundary that a completed password reset deletes all browser sessions and revokes all mobile sessions. The database is mocked at `@/lib/db` with a tagged-template `sql` whose `transaction` statements are recorded so side effects can be asserted without a live PostgreSQL instance; integration-level coverage still depends on the isolated test database gate.

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

## 2026-06-29 - Throttle abuse before infrastructure is finalized

Do not wait for edge credentials to add all abuse controls. Add an app-layer baseline now for browser login/signup, mobile login/refresh, join-request creation, and safety-report creation, keyed by IP plus actor identity where possible. Keep the design honest: this reduces abuse pressure during development but does not replace shared production enforcement.

## 2026-06-29 - Product feedback is private and separate from safety reporting

Let authenticated members submit bounded product-experience feedback from web and mobile and see only their own history. Derive ownership from the authenticated session, exclude a safety category, warn against sensitive content, and route urgent or member-specific concerns to the Safety Center. Include feedback in account export and remove it with the owning account; do not expose a cross-member triage queue until a separately authorized staff boundary and retention policy exist.

## Open decisions

- Final product and company name.
- Launch country, city, neighborhoods, and initial sports.
- Whether the third host skip automatically declines or triggers another state.
- Initial relationship scope and how dating, friendship, and group intentions interact.
- Business model and launch budget.
