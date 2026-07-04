# CX-20260704-discovery-not-gated-by-profile-sport

- Status: `in-progress`
- Severity: `high`
- Priority: `P0` — owner-confirmed defect (2026-07-04): a member cannot discover events for sports they haven't added to their profile. Verified against prod: account 35 (Bucharest, age 31) does NOT see the Bucharest Tennis event solely because Tennis isn't in its profile. This silently hides most events from most members — kills discovery/liquidity.
- Customer journey: a member opens Discover → should see all compatible local events (any sport) → today only sees events whose sport is already in their profile.
- Surface: `getDiscoverableEvents` in `lib/events.ts` (shared by web `/discover` + `/api/events/discover` + mobile discover)
- Environment and viewport/device: web + mobile
- Found by: Owner (2026-07-04) — "to see the events, they do not need to have that skill in their profile."
- Implementation owner: `agent`

## Task

Remove the **mandatory profile-sport gate** from the discovery FEED so events are visible regardless of whether the viewer has that sport in their profile.

- In `getDiscoverableEvents`, drop the required `JOIN user_sports ... LOWER(sport)=LOWER(events.sport) AND <skill compat>` that currently HIDES events for sports the member hasn't added.
- Keep the **explicit** sport filter working: when the member picks a specific sport in the Discover filter, apply it; when they don't, show **all sports** (subject to the other filters).
- **Skill level:** do NOT hide an event because the member lacks a compatible skill for a sport they haven't listed. Skill compatibility may remain as informational, or only apply when the member has explicitly set that sport — but it must never be the reason an event is invisible. (Confirm the simplest correct behavior; the owner's intent is "don't require the sport/skill to SEE it.")
- Update the Discover UI copy: "SPORT — Any in your profile" → "Any sport" (or similar) so the default clearly means all sports.
- Preserve ALL other feed rules unchanged: published, future & within window, **not the host**, **age within [minimum_age, maximum_age]**, language compatibility, not full, city/area match, not blocked.

## Acceptance criteria

- A Bucharest member WITHOUT Tennis sees a published, in-window Bucharest Tennis event they're age-eligible for (the exact prod repro: account 35 would now see event `c5442954…`).
- The explicit sport filter still narrows to one sport when chosen.
- Age / area / date / host-exclusion / full / block / language gates all still apply (add/keep tests).
- Web and mobile discover stay in sync (shared lib).
- typecheck/lint/test/prod build green; update the discovery-filter tests that asserted the profile-sport JOIN.
- Docs updated if the discovery rules are documented.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent). Removing the mandatory sport/skill `JOIN user_sports` from the discovery FEED per the ticket. To preserve the documented shown⟺joinable invariant ("a member is never shown an event they would then be barred from requesting"), I am ALSO removing the identical sport/skill JOIN from the join gate (`createEventJoinRequest`) — otherwise a member would see the Tennis event but be barred from requesting it, re-introducing the exact P0 one tap later. All other gates (published, future/in-window, not-host, age, language, capacity, city, blocks) are unchanged in BOTH. Flagging in case the owner wanted visibility-only.

## Guardrails

- Don't weaken privacy or safety gates; this only relaxes the sport-in-profile *visibility* requirement.
- No dark patterns; keep discovery honest and calm.

## Process

- Likely no migration. If one is needed → commit-not-push + report number. `git pull --rebase` first. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
