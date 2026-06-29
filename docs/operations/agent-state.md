# Agent state

## Current outcome

Consolidated the account-enumeration posture and tightened the one surface that could be tightened without infrastructure. Added a single "Account-enumeration posture" section to `docs/security/authentication.md` covering: body-level neutrality on every surface (login generic 401, reset-request single neutral 202 reused for the 429, registration's accepted duplicate-email signal); the timing dimension per surface (login already equalized by a *real* dummy-bcrypt comparison that dominates both paths; reset request has no natural dominant operation); and the explicit decision to add a bounded timing floor now and defer full constant-time to the edge gate. Implemented the floor: `RESET_REQUEST_MIN_DURATION_MS = 350ms` held via a `holdUntilMinimumDuration` helper in `apps/web/src/lib/auth-email.ts`, padding both success and error outcomes (errors padded then re-thrown so the route still returns the identical neutral 202), with tests asserting both the exists and no-op paths are held to the floor and that the neutral return contract is unchanged. Documented honestly that a floor reduces but does not eliminate the channel; shared edge/gateway rate limiting closes it. Typecheck green; suite 142 -> 144 (95 -> 97 web, 47 domain). Then authored `docs/operations/owner-escalation.md`: a single decision packet bundling every owner-only launch gate (production infrastructure, EU counsel, brand/launch country, email provider, safety/moderation owner, shared edge rate limiting, isolated PostgreSQL test DB), each in the escalation format (decision · recommendation · two alternatives · consequence of delay · exact action), ordered by leverage, with a summary table and a pointer from this file's Owner blockers section. After this cycle, the remaining now-bucket work is owner/counsel/infrastructure gated; the only codeable items left (integration tests, edge limiter) are each blocked on a specific gate in that packet.

## Completed and verified

- Established and validated the autonomous Product Studio operating system.
- Completed the account, event, discovery, request, and authorized room loops.
- Extended account export to hosted events, join requests, accepted seats, and precise locations already disclosed.
- Deletion requests now immediately cancel hosted events, close active requests, remove accepted seats, revoke room/location access, and revoke sessions.
- Added member blocking, structured safety reports, immediate shared-access revocation, and append-only moderation audit records.
- Added safety-report and block coverage to account export.
- Documented response priorities, evidence handling, appeals, staffing gates, and EU Digital Services Act preparation boundaries.
- Added a private member Safety Center with report states, reporter-safe decision notices, deadline enforcement, and one structured appeal per case.
- Extended account export to decision notices and member-submitted appeals.
- Added live-role-gated staff queues and case transitions with no self-promotion endpoint, no precise-location query, and revocation rechecks inside mutations.
- Added final decision notices with a named rule or legal basis, immutable audit events, and a six-month appeal window.
- Documented privileged role provisioning, revocation, and access review requirements.
- Added role-gated appeal review and reporter-visible outcomes, with database-enforced separation from the original decision-maker.
- Replaced sensitive moderation queue cards with metadata-only triage and audited case-specific access.
- Added immutable, purpose-limited evidence references with no file or copied-content ingestion and explicit retention-review dates.
- Added immutable access events for queue views, case views, and evidence-reference creation.
- Added private post-event attendance and willingness-to-join-again reflection for hosts with real participants and accepted members.
- Added a responsive private Movement Arc with five bounded stages, no leaderboard or streaks, and progress derived only from qualified self-confirmed attendance.
- Extended account export to private event reflections and documented the privacy, abuse, correction, and measurement boundaries.
- Added a clearly labelled Expo event-day interaction prototype with discovery, private reflection, and a shared-rule Movement Arc.
- Verified Expo SDK 56 configuration, mobile TypeScript, and a 571-module Android Hermes production bundle.
- Reviewed and documented the remaining moderate Expo build-chain advisories; no high or critical audit findings are present.
- Added separate native session families with 15-minute access tokens, fixed 30-day rotating refresh tokens, installation binding, spent-token reuse revocation, and account-deletion revocation.
- Added SecureStore-backed native credential handling, HTTPS/path restrictions, serialized refresh, optional live login, logout, and authenticated member restoration.
- Extended account export with native device-session metadata and documented remaining device-compromise and attestation risks.
- Verified Expo SDK 56 configuration and a 581-module Android Hermes bundle after native auth integration.
- Added native-authorized live approximate discovery, authorized hosted/accepted event selection, exact room access, private reflection, and live Movement Arc data.
- Added explicit mobile loading, empty, retry, stale access, lost room access, and reflection submission states.
- Verified a 582-module Android Hermes bundle after live product-data integration.
- Added native join requests and pending/accepted cancellation through shared web/mobile server mutations, including capacity, compatibility, mutual-block, seat-removal, destructive confirmation, and conflict refresh.
- Verified the Android Hermes bundle after native request mutation integration.
- Added shared web/native block and structured-report actions with immediate request, seat, room, and exact-location revocation.
- Added native host pending-request cards and shared accept/skip decisions with atomic numbered seats and third-skip decline.
- Added independently focusable mobile safety controls, emergency limitations, conflict refresh, and reporting for discovered hosts, pending requesters, room hosts, and other participants.
- Verified the production web build and Android Hermes bundle after native safety and host-decision integration.
- Added web/mobile device-session review with active, expired, current, and revoked states plus remote revocation without credential or installation-identifier exposure.
- Researched Bucharest local sport supply and recommended an Aviatorilor-Herastrau to Aurel Vlaicu-Floreasca validation corridor with run/run-walk and four-person indoor padel.
- Documented evidence limits, bouldering fallback, founding-host requirements, phased validation thresholds, kill criteria, and behavior-led member and host interview scripts.
- Prepared bilingual member and host recruitment copy, channel-specific organic drafts, privacy-aware form fields, campaign tags, decision signals, and a publication checklist without contacting or publishing to anyone.
- Added a local-only, noindex, non-collecting Bucharest research landing preview for owner review and verified that the mobile layout no longer overflows the viewport.
- Added tested app-wide browser response hardening with CSP, frame denial, referrer policy, nosniff, COOP/CORP, permissions policy, and production HSTS, then verified the headers from a running production build.
- Added tested app-layer rate limiting for browser login/signup, mobile login/refresh, join-request creation, and safety-report creation, including `429` retry metadata and a workspace Vitest config for alias-aware server-route tests.
- Added a repository-local Customer Experience Agent with privacy-safe ticket deduplication, separate parallel implementation ownership, and independent customer-perspective retesting.
- Added authenticated web and mobile product-feedback submission, private member-only history, shared bounded validation, explicit Safety Center routing, and account-export/deletion coverage.
- Verified the production web build and Android Hermes bundle after device-management integration.
- Implemented scheduled cleanup for expired browser sessions, spent mobile sessions, and outdated refresh-token history (`apps/web/src/lib/session-cleanup.mjs` with tests).
- Scaffolded email-verification and password-reset: dedicated request/confirm routes, a provider-gated delivery adapter (disabled by default, optional console simulation), bilingual-ready email drafts, single-use hashed tokens, and account-deletion token revocation, all wired into web pages and the profile surface.
- Added a direct unit suite for the verification/reset core: single-use consumption, expiry with no side effects, sibling-token invalidation, already-verified handling, requester-IP hashing instead of cleartext, and the reset boundary that deletes all browser sessions and revokes all mobile sessions.
- Added direct HTTP-route coverage for all four verification/reset routes (including `email-verification/request`, which previously had no test): success, already-verified, expired (410), invalid, validation-error, 503 unavailable, 401 unauthenticated, 403 cross-site, 429 rate-limit exhaustion, and password-reset enumeration neutrality across existing/missing accounts and database failure.
- Documented the verification/reset threat model in `docs/security/authentication.md`: per-threat control, cited test verification, and residual risk for token entropy/hashing, single-use + sibling invalidation, expiry windows, enumeration neutrality, the reset session-revocation boundary, requester-IP hashing, per-flow throttles, and the default-disabled provider-gated delivery seam; honest-claim boundary and owner/counsel/integration gates flagged.
- Consolidated the account-enumeration posture in `docs/security/authentication.md` and added a tested bounded timing floor to the unauthenticated password-reset request path, collapsing the common-case insert-vs-no-op latency difference while deferring full constant-time closure to the shared edge rate-limit gate.
- One hundred forty-four tests pass (97 web + 47 domain); all workspaces type-check.
- Authored `docs/operations/owner-escalation.md`, a consolidated owner decision packet covering every launch gate in the escalation format, leverage-ordered, so the owner can unblock multiple roadmap items in one sitting.

## Next three outcomes

1. Add an end-to-end (or DB-integration) test of the verification/reset persistence against an isolated PostgreSQL instance once the test-database gate is met, so token single-use, sibling invalidation, and session revocation are asserted against real SQL rather than recorded statements. (Engineering gate: an isolated PostgreSQL test instance must exist — Gate 7 in the escalation packet; autonomous once it does.)
2. Implement shared edge/gateway rate limiting once production infrastructure and its backing store exist (Gates 1 and 6 in the escalation packet); this also closes the residual reset-request enumeration timing channel that the in-app floor only reduces.
3. Await owner decisions on `docs/operations/owner-escalation.md`. Most remaining now-bucket roadmap items are owner/counsel/infrastructure gated rather than codeable; the codeable items left (integration tests, edge limiter) are each blocked on a specific gate above.

## Owner blockers

- See `docs/operations/owner-escalation.md` for the consolidated decision packet bundling every owner-only launch gate (infrastructure, EU counsel, brand/country, email provider, safety owner, edge rate limiting, isolated test DB), each in the escalation format and ordered by leverage.
- Choose or approve research toward the first launch country and city before real outreach.
- Provide or authorize infrastructure credentials only when production services are selected.
- Approve final brand and personally create or authorize external social accounts before publication.
- Qualified European counsel must approve final retention periods, lawful bases, privacy notices, and deletion exceptions.
- Name trained safety owners and an escalation rota before critical-response targets or member messaging can go live.

## Active assumptions and risks

- "Sport Date" is a working name; Bucharest is a research hypothesis.
- Third skip currently means automatic decline and awaits confirmation.
- Deletion finalization and vendor/backup propagation remain operational launch gates.
- Shared edge or gateway rate limiting is still an operational launch gate even though the in-app baseline now exists.
- Product feedback has no cross-member staff queue until access ownership and retention are approved; coding agents use the separate repository-local feedback queue.
- End-to-end feedback rejection and accessibility behavior still needs an isolated signed-in fixture plus physical-device or browser assistive-technology testing.
- Database-level integration tests still require an isolated PostgreSQL test instance.
- No social, safety, verification, or traction claims may exceed implemented evidence.
