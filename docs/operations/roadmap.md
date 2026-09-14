# Outcome roadmap

## Active autonomous experience queue - September 14

Latest owner direction: reduce information density and keep instructions in dedicated destinations; explicitly no safety instructions on Profile. Implemented local Profile/Settings separation, dedicated Hosting Guide and compact shared footer. Continue simplifying contextual screens without hiding report/block actions or consent controls. See `docs/design/dedicated-page-responsibilities-2026-09-14.md`.

Prioritize a vivid, concise nearby-event experience. Discovery and event details now share sport posters, compact logistics and explicit request navigation. Discovery adds finite focus/grid browsing and compact filters; details place requesting before the map on mobile and fold the description behind About this plan. Next: verify retained host-edit work, prepare an exact integrated release candidate, then evaluate comprehension with unfamiliar adults under authorized recruitment. Signup keyboard work is complete in main; chat safety is verified in the isolated studio branch. See `docs/design/discovery-direction-2026-09-14.md`. These changes are local. The unattended CLI is fault-latched after a usage limit; do not infer active work from its scheduler. Personal-sender OAuth setup remains paused and does not block local product work.

## Current strategic question — owner clarification, 2026-09-14

Can we create a small, repeatable local sports experience that people choose again and eventually pay to improve? Prioritize the next decisive evidence: a real host commitment, actual attendance, return, then a voluntary paid-value test under approved pricing. Fix material safety/core-flow risks and measure this path; do not expand the backlog to keep agents occupied. The first user-count/date scenarios are revisable reference points. Team structure, tactics and product bets can change without asking the owner to assign tasks; explain material changes in HQ and preserve approval boundaries.

## Autonomous commercial operation — 2026-09-14

- [x] Adopt owner-delegated CEO contract, bounded parallel team and evidence-based 7/30-day targets.
- [x] Replace stale HQ activity claims with fresh-source reporting and a small authenticated owner decision queue.
- [x] Prepare five freshly verified organization contact routes and a complete host-validation packet; outreach awaits its scoped business decision.
- [x] Add anonymous main landing page-load counts without a migration or tracking demo choices.
- [x] Activate and verify the recurring local runner, isolated worktree and report delivery (successful independently verified cycles; live HQ readback September 14).
- [x] Restore live HQ publishing and decision access after owner credential rotation/redeployment.
- [ ] Establish a verified production user/activation/revenue baseline with staff/test exclusions.
- [ ] Revisit unattended decision email delivery after the support sender arrangement is verified; personal-sender OAuth setup paused.
- [ ] Validate host supply and first attended sessions before pursuing the 1,000-registration stretch target.

## Owner-requested design concept — 2026-09-14

- [x] Parallel product/UX evaluation and an interactive, responsive `/concept` preview: “Less small talk. More good company.” Existing KeepItUp identity; clearly fictional activity selection and host-request walkthrough. See `docs/design/2026-09-14-concept-review.md` for evidence and scope.
- [ ] Evaluate the concept with unfamiliar adults before claiming comprehension or conversion gains; external recruitment requires owner authorization.
- [x] Apply the owner-approved direction to the main `/landing` route, preserving authenticated navigation, guest sign-in, beta disclosure, legal links and anonymous real-CTA counts. Shared presentation keeps `/concept` available without its preview banner appearing on the main page.
- [ ] Apply the reviewed direction to discovery and signup in separate tested slices.

## Now: trustworthy account foundation

- [x] Private-beta signup UI and shared validation.
- [x] Opaque hashed session creation and explicit database migration.
- [x] Login, logout, server-side session lookup, rotation, and protected profile route.
- [x] Emit restrictive browser security headers across the web app.
- [x] Add app-layer rate limits to authentication and high-leverage mutation paths.
- [x] Gate 6 shared/distributed rate limiting: async `RateLimitStore` seam plus an env-gated Upstash Redis REST adapter (atomic pipeline `INCR`+`PEXPIRE`, no new dependency) that activates when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set and gracefully degrades to the behavior-identical in-memory limiter on any error (never to unlimited). Code-complete and unit-tested with mocked `fetch`; activates automatically once the owner provisions the Upstash store (a real-Upstash opt-in integration test is the remaining follow-up).
- [x] Email verification and password reset implemented with a tested single-use token core and an owner-approved, fail-closed Gmail API adapter shared by auth, join-request decisions, attendance reminders, and feedback updates; real sending activates only after owner-authorized OAuth secrets and sender-alias verification are added to Vercel.
- [x] Draft and implement account export, re-authenticated deletion request, request audit, consent boundary, and retention states.
- [x] Add opt-in real-SQL integration tests for the verification/reset token flows (single-use, sibling invalidation, expiry, reset session-revocation, IP-hash, enumeration neutrality).
- [x] Fix the audit-immutability vs `ON DELETE SET NULL` conflict that blocks hard-deleting a `users` row across four append-only audit tables (GDPR right-to-erasure); preserve append-only immutability while allowing the FK's system SET-NULL. Migration `019_audit_append_only_allows_user_nulling.sql` replaces each `ON UPDATE … DO INSTEAD NOTHING` rule with a `BEFORE UPDATE` trigger that blocks every application edit except the FK's non-null→NULL clearing of the listed user-reference column(s); the `ON DELETE … DO INSTEAD NOTHING` rules stay, keeping audit rows app-undeletable. Proven against real SQL (`audit-erasure.integration.test.ts`): a referenced user is now hard-deletable, the audit row survives with the user-ref nulled and all else unchanged, and application UPDATE/DELETE of audit rows are still rejected.

## Next: complete event loop

- [x] Define and test event lifecycle, capacity, adult age range, location, language, experience, blocking, cancellation, and visibility rules.
- [x] Implement authenticated profile editing with server-derived ownership and shared validation.
- [x] Implement host event creation with separate public event and private meeting-location persistence.
- [x] Replace free-text event directions with authenticated address autocomplete, explicit suggestion selection, and stored private pin coordinates.
- [x] Implement privacy-preserving discovery eligibility and city, sport, language, and time filters.
- [x] Implement request, accept, skip, third-skip decline, requester cancellation, and atomic seat-capacity invariants.
- [x] Notify requesters by email when a host approves their place or the request reaches final decline; keep intermediate skips private and exact meeting details inside the accepted event room.
- [x] Add server-authorized event rooms for hosts and accepted participants without open messaging.
- [x] Extend access/export/deletion coverage to events, join requests, accepted seats, and disclosed meeting details.
- [x] Extend access/export coverage to reporter-visible moderation decisions and appeals.
- [x] Extend access/export/deletion coverage again when messages are introduced. Account export returns the member's own sent event-room messages (`eventRoomMessagesSent`, scoped to `sender_user_id` — never other members' messages) and the deletion request deletes all messages the member sent; both are now pinned by hermetic route tests (`api/account/export/route.test.ts`, new `api/account/deletion/route.test.ts`), and the deletion route is additionally proven end-to-end against real SQL through the application path, including the migration-019 finalization interplay (opt-in `lib/account-deletion.integration.test.ts`).

## Then: safety and local launch

- [x] Implement block/report paths, immediate access revocation, and append-only moderation audit records before messaging.
- [x] Design operational response levels, evidence handling, decisions, appeals, staffing gates, and transparency measures.
- [x] Add a member Safety Center with report status, decision notices, deadline enforcement, and one structured appeal per case.
- [x] Add explicitly role-gated moderator queues, case transitions, and reporter-safe decision notices.
- [x] Add role-gated appeal outcomes with separation-of-review safeguards.
- [x] Add purpose-limited evidence references and case-access logging without accepting file uploads.
- [x] Research Bucharest and recommend a corridor plus two-sport validation wedge without treating it as the owner's final choice.
- [x] Build a local-only, noindex, non-collecting Bucharest research landing preview for owner review.
- [ ] Validate or reject the Aviatorilor-Herastrau / Aurel Vlaicu-Floreasca run-walk and padel wedge through interviews and host commitments.
- [ ] Interview prospective members and founding hosts; owner participation is required for real outreach.
- [ ] Validate positioning and landing conversion without fabricated social proof.
- [ ] Prepare final brand screen, social account packet, launch content, and measurement plan.

## Product energy: encounter-based progression

- [x] Define and test a progression model that rewards qualified self-confirmed attendance, useful reflection, and real hosted/joined events.
- [x] Implement a responsive web progress surface using real product records, with calm empty and recovery states.
- [x] Build an Expo interaction prototype for event reflection and the Movement Arc using the shared tested domain rules.
- [x] Implement and threat-model separate revocable native sessions with SecureStore, short access tokens, rotating refresh tokens, and reuse revocation.
- [x] Replace signed-in mobile demo state with native-authorized live approximate discovery, accepted/host room, reflection, and Movement Arc data.
- [x] Add native join requests and requester cancellation with shared capacity, compatibility, block, seat-removal, and conflict recovery.
- [x] Add native host decisions, blocking, and reporting with shared access revocation, audited reports, atomic seats, and maximum-three-skip recovery.
- [x] Add member-facing web/mobile device-session review and remote revocation without exposing credentials or installation identifiers.
- [x] Never reward swipes, skip decisions, rejection, report suppression, compulsive streaks, or time spent in the app. Guarded by an explicit regression suite (`packages/domain/src/progress-never-rewards.test.ts` and additions to `apps/web/src/lib/reflections.test.ts`): progression is a pure function of the attended-move count, the one qualification predicate accepts only `attended`, and inflating any prohibited signal leaves the arc unchanged versus baseline. Behaviour was not altered; none of the prohibited signals are even representable as inputs to the progression math.

## Product learning: customer perspective

- [x] Add a repository-local customer experience agent with privacy-safe ticket deduplication, parallel implementation handoff, and independent retesting.
- [x] Add authenticated web and mobile product-feedback submission with private member history and a clear Safety Center boundary.
- [ ] Add role-gated internal feedback triage only after an accountable owner, access policy, and retention period are approved.

## Launch gates

- Qualified European counsel reviews terms, privacy, consent, moderation, age assurance, and launch-country obligations. Reviewable draft artifacts now exist in `docs/legal/drafts/` (Privacy Notice, Terms of Service, consent/disclosure copy, and the Safety & Community Guidelines referenced by the Terms), grounded in the implemented data flows and clearly labelled DRAFT-for-counsel (the Safety & Community Guidelines additionally require a named safety owner); engaging counsel (owner Gate 2) and naming the safety owner (Gate 5) are still required to review and approve them.
- Security review covers authentication, authorization, location, media, messaging, abuse, secrets, and incident response.
- A real moderation owner and escalation channel exist.
- Production infrastructure, monitoring, backup, recovery, email, and domain ownership are approved.
- No external acquisition begins until safe event supply exists.
