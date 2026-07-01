# CX-20260701-discover-advanced-skill-silently-excludes-events

- Status: `verified`
- Severity: `high`
- Priority: `P1 high` — (Reach 4 × Impact 5 × Confidence 4) / Effort 2 = 40, raised to P1: a member can see an empty product through no fault of their own and conclude "there's nothing here."
- Customer journey: discovery
- Surface: `web` (matching logic shared with mobile)
- Environment and viewport/device: dev server localhost:3000
- Found by: Owner (direct feedback 2026-07-01, "I cannot find events published by others"); discovery re-tested live
- Implementation owner: `Experience Build Agent`
- Related tickets: `none found`

## Customer outcome

As a member browsing for a game, I want discovery to show me events I could realistically join so that I don't see an empty page and assume the product is dead.

## What I observed

Discovery works in the common case (a member with `intermediate` skill saw 18 events). But the matching query joins on `skill_level = ANY(experience_levels)` (`getDiscoverableEvents`, `apps/web/src/lib/events.ts:98`/`:131`), and events default to `experienceLevels = [beginner, intermediate]`. A member whose sport skill level is `advanced` therefore matches **no** default event and sees an empty or sparse discover feed with no explanation — a plausible cause of the owner's "I cannot find events" report.

## What I expected

Skill matching should not silently hide all events from more experienced members. Either advanced members should still see beginner/intermediate events (a stronger player can usually join an easier game), or hosts should be able to welcome advanced players, or discovery should explain why results are limited and offer a way to widen them.

## Reproduction

1. Register a member whose sport skill level is `advanced`.
2. Open `/discover` in an area with only default-level events.
3. Observe few or zero results with no explanation.

Reproduction rate: `logic-confirmed via code + live default-path test; advanced-path inferred`

## Customer impact

A member is shown an empty product through a silent filter, eroding trust and retention at the most important first moment. No privacy/auth regression, but a discovery-fairness and clarity failure.

## Evidence and limits

- Evidence: `events.ts:98`–`:131` skill join; default `experienceLevels=[beginner,intermediate]`; live test confirmed intermediate sees events.
- Hypotheses to verify: confirm the advanced-member empty result live; decide the right product rule (inclusive matching vs. host opt-in vs. explained narrowing) — may warrant a brief owner/design note.
- Paths not tested: advanced-skill account end to end.

## Acceptance criteria

- [ ] An advanced-skill member in an area with default-level events does not see an unexplained empty feed.
- [ ] The chosen rule is documented (decision-log) and covered by a test in the matching layer.
- [ ] Where results are intentionally narrowed, the UI explains why and offers a way to broaden.
- [ ] No member is shown an event they are barred from; safety/age/location gating unchanged.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback + matching-logic audit; status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Owner decision applied: INCLUSIVE skill matching (a member matches an event when their skill level is at least the easiest level the event welcomes, so a stronger player can join an easier game). Loosening only the skill-overlap filter; all other gating (age/location/language/capacity/blocks/host-exclusion) unchanged.
- 2026-07-01 - Independently retested by Experience & Design Explorer from the original member scenario (no implementer explanation relied on); status `verified`. Registered a HOST member who published a DEFAULT-level tennis event (experience-level checkboxes left untouched — live-confirmed 2 checked = beginner+intermediate; age 18–99, English, Bucharest). Registered a second member and upgraded their Tennis skill to `advanced` via profile edit (persisted: "Tennis Advanced · Weekly") plus set language English. Opened `/discover` as the advanced member: the default-level event now appears in the feed (this-run event present=true among 19 cards) — previously an empty/sparse feed. Nothing barred by age/location/language leaked in (the advanced member satisfies every remaining gate). Opened the event detail: the join box is present and "Request a place" reached the `pending` state, so the join gate matches the feed (no drift — no event is shown that the member is then barred from requesting). Unit tests in apps/web/src/lib/events.test.ts ("discovery skill matching") pass (11/11) and the SQL in getDiscoverableEvents + createEventJoinRequest mirrors the tested `memberSkillMatchesEvent` helper exactly (rank >= MIN welcomed rank). All acceptance criteria pass. Temp retest script removed; untracked apps/web/qa/full-flows.mjs untouched.
- 2026-07-01 - Implemented; status `implemented`. Replaced the exact-match `skill_level = ANY(experience_levels)` clause with an inclusive `member_rank >= MIN(welcomed_rank)` comparison in BOTH `getDiscoverableEvents` (apps/web/src/lib/events.ts) AND `createEventJoinRequest` (apps/web/src/lib/join-requests.ts) so the discover feed and the join gate cannot drift (no event is shown that the member would then be barred from requesting). Added pure mirror helper `memberSkillMatchesEvent` + 6 unit tests in events.test.ts (advanced sees default beginner/intermediate event; beginner/intermediate unchanged; stronger-into-easier matches; under-qualified still excluded; case/whitespace-insensitive; unknown skill rejected). Decision recorded in docs/operations/decision-log.md. Discover empty-state for legitimately-narrow (active filters) results already explains and offers to clear filters — no new narrowing added. Checks: typecheck PASS, lint PASS (0 errors; sole warning is in untouched user file apps/web/qa/full-flows.mjs), test PASS (153 passed | 12 skipped). Live advanced-skill end-to-end registration not scripted (heavy DB/session setup); rule proven at the deciding layer via unit tests, SQL mirrors the tested helper exactly. Awaiting independent retest.
