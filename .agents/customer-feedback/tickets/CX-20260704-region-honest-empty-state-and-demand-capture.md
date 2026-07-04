# CX-20260704-region-honest-empty-state-and-demand-capture

- Status: `implemented`
- Severity: `medium`
- Priority: `P2` — pre-launch, anyone (any country, incl. non-launch EU + US) can sign up but finds no events. Turn the dead-end into honest expectation-setting + a demand signal instead of churn.
- Customer journey: a new member (or a curious US/other-region visitor) signs up → discovery has no events near them → today that's a silent empty void → should be a warm "we're not in your area yet, you're on the early list" moment that also captures where they'd play.
- Surface: discover empty state + (optional) a light post-signup region acknowledgement
- Environment and viewport/device: web, mobile-first
- Found by: Owner question (2026-07-04) "can't a USA user enroll?" — they can; there is no geo gate (confirmed: no country check in register route / middleware / signup; only 18+ + terms).
- Implementation owner: `agent`

## Task

Make the no-events-nearby experience honest and useful for ANY region:

- **Discover empty state:** when a member has no events in their area, show a warm, honest message — "KeepItUp isn't live in your area yet. You're on the early list." — NOT a fake or distant event. Offer: (a) a way to tell us where they'd play / what sport (feeds city prioritization; can reuse the /research survey or a light inline capture), (b) a link to browse how it works. No dark patterns, no fake scarcity, no invented nearby activity.
- **Demand capture:** record (privacy-safe, approximate area only) the region interest so the CEO/growth loop can see where demand concentrates — reuse the survey pipeline or a minimal signal; do NOT introduce new PII.
- Do **not** hard-block signup by country — open enrollment stays; this is about honest expectations, not gating.

## Acceptance criteria

- A member in a region with zero events sees the honest empty state (not a spinner, not a fake event, not an error).
- The "tell us where you'd play" path works logged-in and is privacy-safe (approximate area; no exact address; no new sensitive PII).
- Copy claims nothing untrue (we are pre-launch everywhere); consistent with "Europe first" without implying US is unsupported forever.
- Mobile-first, 44px targets, a11y; typecheck/lint/test/prod build green; tests cover the empty-state branch.

## Guardrails

- Honest, anti-dark-pattern; no fabricated demand or events. Privacy-by-design.
- Legal/jurisdiction for serving non-EU members at scale ties to the EU-counsel owner item (HQ card #7) — this ticket does not resolve that; it only fixes the in-product experience.

## Why (CEO note)

We shouldn't throw away out-of-region interest by blocking it — we should convert it into a map of where to launch next. Every "wrong city" signup becomes a data point instead of a bounce.

## Handoff log

- 2026-07-04 | build | picked up, set `in-progress`, recorded as implementation owner. New `RegionInterestSignal` client component replaces the two "own-area empty" discover branches (near-me-default + no-narrowing-filters default) with an honest pre-launch note ("KeepItUp isn't live near {area} yet — Europe first — you're here early; events appear as hosts start them"), a one-tap privacy-safe demand signal (posts ONLY the member's already-stored approximate area into the EXISTING anonymous research pipeline via `q8_area` — no new PII, no new table/migration, anonymous/unlinked row), plus "Tell us where you'd play" (/research) and "See how it works" (/landing). No geo gate added; no fabricated events/scarcity. Kept the honest Search-everywhere / Host-the-first-one CTAs. New component test (4 cases) covers the empty-state branch, the no-area degrade, and the anti-dark-pattern tripwire.
- 2026-07-04 | build | implemented, set `implemented`. Commit 6d836fd (PUSHED to main, no migration). Files: apps/web/src/components/RegionInterestSignal.tsx (new) + RegionInterestSignal.test.tsx (new), apps/web/src/app/discover/page.tsx, apps/web/src/app/globals.css. Checks: web typecheck clean; lint 0 errors (only pre-existing warnings in untouched files); web test 985 pass/12 skip; production build green. Note for retest: (1) the one-tap demand signal writes an anonymous research row with only q8_area = the member's approximate profile area — verify against the running app that an out-of-region member (e.g. seeker-D Cluj with no local events, or search-everywhere-empty) sees the honest note + one-tap works + shows the "Thanks — noted" state, and that a member with NO stored area sees the generic copy with the one-tap hidden (only /research + /landing links). (2) Demand signals land in the SAME research-responses table as the public survey — the growth loop should read q8_area frequency for the region-demand map; area-only rows are valid survey submissions. (3) Optional post-signup region acknowledgement was intentionally NOT built (ticket marked it optional) to keep scope tight. (4) Semantically I chose NOT to also capture "which sport" because the reused survey schema has no clean sport field and stuffing it into an unrelated question would pollute the dataset — area is captured reliably; a dedicated sport-demand field would need its own (future) storage decision.
