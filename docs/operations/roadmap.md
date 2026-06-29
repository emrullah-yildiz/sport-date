# Outcome roadmap

## Now: trustworthy account foundation

- [x] Private-beta signup UI and shared validation.
- [x] Opaque hashed session creation and explicit database migration.
- [x] Login, logout, server-side session lookup, rotation, and protected profile route.
- [ ] Email verification and password reset design; implementation requires an approved email provider.
- [x] Draft and implement account export, re-authenticated deletion request, request audit, consent boundary, and retention states.

## Next: complete event loop

- [x] Define and test event lifecycle, capacity, adult age range, location, language, experience, blocking, cancellation, and visibility rules.
- [x] Implement authenticated profile editing with server-derived ownership and shared validation.
- [x] Implement host event creation with separate public event and private meeting-location persistence.
- [x] Implement privacy-preserving discovery eligibility and city, sport, language, and time filters.
- [x] Implement request, accept, skip, third-skip decline, requester cancellation, and atomic seat-capacity invariants.
- [x] Add server-authorized event rooms for hosts and accepted participants without open messaging.
- [x] Extend access/export/deletion coverage to events, join requests, accepted seats, and disclosed meeting details.
- [x] Extend access/export coverage to reporter-visible moderation decisions and appeals.
- [ ] Extend access/export/deletion coverage again when messages are introduced.

## Then: safety and local launch

- [x] Implement block/report paths, immediate access revocation, and append-only moderation audit records before messaging.
- [x] Design operational response levels, evidence handling, decisions, appeals, staffing gates, and transparency measures.
- [x] Add a member Safety Center with report status, decision notices, deadline enforcement, and one structured appeal per case.
- [ ] Add explicitly role-gated moderator queues, case transitions, decision notices, and appeal outcomes.
- [ ] Research and choose one launch city and two or three sports.
- [ ] Interview prospective members and founding hosts; owner participation is required for real outreach.
- [ ] Validate positioning and landing conversion without fabricated social proof.
- [ ] Prepare final brand screen, social account packet, launch content, and measurement plan.

## Launch gates

- Qualified European counsel reviews terms, privacy, consent, moderation, age assurance, and launch-country obligations.
- Security review covers authentication, authorization, location, media, messaging, abuse, secrets, and incident response.
- A real moderation owner and escalation channel exist.
- Production infrastructure, monitoring, backup, recovery, email, and domain ownership are approved.
- No external acquisition begins until safe event supply exists.
