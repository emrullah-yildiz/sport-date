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
- [ ] Implement request, accept, skip, third-skip decline, cancellation, and capacity invariants.
- [ ] Add event room authorization without real-time chat initially.
- [ ] Extend access/export/deletion coverage as event, request, room, report, and message data is introduced.

## Then: safety and local launch

- [ ] Implement block/report paths and moderation audit records before messaging.
- [ ] Design operational response levels, evidence handling, and appeals.
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
