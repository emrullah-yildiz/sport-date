# CX-20260704-policy-no-sexual-intent-events

- Status: `ready`
- Severity: `high`
- Priority: `P1` — owner-directive (2026-07-04, interpreted): **no sexual intent at events.** KeepItUp is for dating/friendship/community through activity — NOT sexual encounters/hookups. (Interpretation of an ambiguous instruction — confirm with owner if wrong.)
- Customer journey: a host creates an event / sets intentions → the product and guidelines make clear sexual/hookup-oriented events are not allowed → members can report ones that are → moderation acts.
- Surface: event-create intentions + community guidelines + report reasons + moderation queue
- Environment and viewport/device: web
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Related: `CX-20260704-feature-image-moderation-nudity-block` (same safety theme).

## Task

Make it explicit — in copy, in the intention options, in guidelines, and in moderation — that **events must not be sexual/hookup-oriented**, and give members a way to report ones that are.

## Acceptance criteria

- The event **intention** options (dating / friendship / community) contain NO sexual/hookup option, and copy makes clear romantic ≠ sexual-encounter; dating here means meeting a person, not arranging sex.
- **Community/hosting guidelines** (safety/hosting pages) state plainly: no events organised for sexual purposes; no sexual solicitation; this is not a hookup app. Honest, non-preachy tone.
- Event create shows a short reminder of the standard at the point of creation.
- A **report reason** for "sexual/inappropriate intent" exists on events and profiles, routing into the existing moderation queue; a hosting-guideline violation is actionable by moderation (hide/remove).
- No new dark patterns; keep it dignified. typecheck/lint/test/prod build green; tests cover the report-reason wiring + that no sexual intention option is selectable.
- Docs / guideline pages updated.

## Guardrails

- Dignified and inclusive: prohibiting *sexual-intent events* is about safety and product focus, not policing consenting adults' identities or dating in general. Dating (meeting a romantic partner) stays fully welcome.
- Enforcement via guidelines + reporting + moderation — not surveillance of private messages.

## Process

- Mostly copy + moderation wiring; migration unlikely. If needed → commit-not-push + report number. `git pull --rebase`. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
