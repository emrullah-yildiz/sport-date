# CX-20260701-event-detail-facts-block-flat-hierarchy-unscannable

- Status: `verified`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 4 × Impact 3 × Confidence 5) / Effort 2 = 30 → P2. Presentational; the same inverted-hierarchy defect the verified feed-card ticket fixed, but on the *detail / shared-invitation* page. Not a safety/privacy/a11y floor, so held at P2.
- Customer journey: discovery → intent → trust check → commitment (the shared-link landing)
- Surface: `web`
- Environment and viewport/device: all widths; observed live at 1280 (markup) — the block reflows to 1fr at ≤750px
- Found by: Experience & Design Explorer (pass 18, event-detail × visual hierarchy / information & copy)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` (verified — same principle, the FEED cards; this is the DETAIL page and reuses that ticket's helper); `CX-20260701-in-app-page-headers-off-scale-headline-systemic` (the off-scale `<h1>` on this same page is that ticket's concern, not duplicated here)

## Customer outcome

As a member who just opened an event from a shared invitation link (or tapped a card), I want the two facts I actually decide on — **when it is** and **whether there's still a place** — to stand out at a glance, so I can quickly judge "is this for me?" without reading six equally-weighted lines.

## What I observed

On `/discover/events/[id]` (the page a shared invitation link lands on, and where a member confirms before requesting a place) the "facts" panel renders six facts with almost no hierarchy:

- Date/time is a `<strong>` but has **no size rule**, so it inherits body size and sits only marginally above the rest.
- The other five facts — duration, **places remaining**, language/level, age range, host — are ALL `.event-detail-facts span { font-size: 12px; color: var(--muted); }` with a flat 9px gap. Availability ("6 of 6 places remain") is visually identical to "Ages 18–99".
- Availability copy is the raw verbose "6 of 6 places remain" rather than the calm, honest, verified wording the feed uses ("6 places left" / "Last place" / "Fully booked").

This is the same inverted/flat hierarchy that `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` fixed on the feed cards (verified), left unaddressed on the detail page — so the feed now scans well but the destination the member commits from does not.

## What I expected

The detail facts panel should lead with an emphasised **date/time** and a clear, calm **availability** label, with the remaining meta (duration, language/level, ages, host) as clearly-secondary supporting text — mirroring the verified feed card and, ideally, reusing the same pure helper (`src/lib/discovery-card.ts`: `formatDiscoveryDate`, `formatAvailability`) so feed and detail can't drift in wording or privacy posture.

## Reproduction

1. Log in (any member with a compatible profile — a pooled QA account works).
2. Open any event from `/discover` or via its `/discover/events/[id]` link.
3. Observe the white "facts" panel in the hero: date/time barely larger than the five 12px muted spans; "places remaining" reads as the same weight/size as "Ages 18–99".

Reproduction rate: `confirmed live` (rendered markup + CSS inspected 2026-07-01 as pooled seeker-B; facts block = one `<strong>` at inherited size + five 12px `<span>`s).

## Customer impact

The shared-invitation page is the moment a member decides to commit to meeting a stranger. Flattening "when" and "availability" into a wall of same-size muted facts makes that decision slower and slightly more anxious, and the verbose "6 of 6 places remain" is less calm than the verified honest wording. No safety, privacy, authorization, or accessibility floor is involved — the approximate-area-only rule and the (separately-ticketed) off-scale `<h1>` are unchanged. Presentational scannability only.

## Evidence and limits

- Evidence: `apps/web/src/app/discover/events/[eventId]/page.tsx` (the `.event-detail-facts` `<strong>` + five `<span>` block); `apps/web/src/app/globals.css:592` (`.event-detail-facts span { font-size: 12px; color: var(--muted) }`, no `strong` size rule); live rendered markup `<div class="event-detail-facts"><strong>Thursday, 2 July 2026 at 20:00</strong><span>90 minutes</span><span>6 of 6 places remain</span><span>English · intermediate</span><span>Ages 18–99</span><span>Hosted by [redacted]</span></div>`.
- Redactions made: host first name redacted from evidence.
- Facts: date/time has no explicit font-size (inherits); all five other facts are 12px muted; availability uses raw "N of M places remain".
- Hypotheses to verify during implementation: whether reusing `formatDiscoveryDate` / `formatAvailability` from `discovery-card.ts` cleanly covers the detail panel (it is `server-only`-free and pure, so it should).
- Paths or surfaces not tested: the host-owned `/events/[id]` page (different template — `event.title` hero + host request queue); mobile screenshot not captured (block reflows to 1fr at ≤750px — verify no overflow after the change).

## Duplicate check

- Search terms used: `event-detail`, `detail-facts`, `places remain`, `availability`.
- Tickets reviewed: `discover-cards-inverted-hierarchy-unscannable-feed` (verified; scoped to `/discover` FEED cards, not the detail page), `in-app-page-headers-off-scale-headline-systemic` (covers this page's `<h1>` off-scale headline — deliberately not re-filed here), `event-detail-approximate-location-no-spatial-cue` and `event-detail-safety-emergency-microcopy-smallest-text` (different panels on the same page), `heading-subheading-vertical-rhythm` (spacing axis).
- Why this is new: no existing ticket addresses the `.event-detail-facts` hierarchy or the availability-copy inconsistency on the detail / shared-invitation page. The feed-card ticket is verified and scoped to the feed only.

## Acceptance criteria

- [x] On `/discover/events/[id]`, the date/time is the clearly-dominant fact and availability is a calm, prominent second, with duration / language / level / ages / host visibly secondary (smaller/muted).
- [x] Availability wording matches the verified feed helper's honest, non-scarcity phrasing ("N places left" / "Last place" / "Fully booked"); no coral/red urgency and no fabricated scarcity.
- [x] Approximate-area-only privacy is unchanged (no venue/street/precise location added to the facts block or its data).
- [x] The facts panel remains usable with no overflow at 1280 and 375px; AA contrast holds for the emphasised and secondary text.
- [x] Keyboard/screen-reader: the panel stays readable in a sensible order; if any semantic grouping is added it is correctly labelled (no new focus traps; targets unaffected as this is presentational).
- [x] Prefers-reduced-motion parity is preserved (no new motion introduced).
- [x] Prefer reusing the pure `src/lib/discovery-card.ts` helpers so feed and detail cannot drift in wording or privacy posture; if not reused, state why.
- [x] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (pass 18); status `ready`. Live-confirmed the flat facts block on `/discover/events/[id]` as pooled seeker-B; deduped against the verified feed-card ticket (feed only) and the systemic off-scale-headline ticket (this page's `<h1>`).
- 2026-07-02 - Implemented (Builder). Rebuilt the `.event-detail-facts` panel so it leads with a dominant two-line date/time (`--fs-h2`, time in `--accent`) and a calm, prominent availability pill, with duration / language+level / ages / host demoted to a clearly-secondary `<dl>` meta list below a hairline. REUSED the verified feed's pure helpers `formatDiscoveryDate` and `describeDiscoveryAvailability` from `src/lib/discovery-card.ts` so feed and detail can't drift: honest non-scarcity wording ("N places left" / "Last place" / "Fully booked"), no coral/red urgency, no fabricated scarcity; full state uses a calm muted style on `--surface-raised`. Approximate-area-only privacy unchanged (no venue/street). No new motion → reduced-motion parity holds. AA verified (contrast on `--surface` #272E34): accent date/time + pill 8.68, muted meta label 6.42, full pill on raised 5.41, meta values 12.51. No overflow at 1280 or 375px (baseline flex rows wrap; block still reflows to 1fr at ≤750px). Files: `apps/web/src/app/discover/events/[eventId]/page.tsx` (helper reuse + markup), `apps/web/src/app/globals.css` (hierarchy CSS replacing the flat `span` rule). Checks from `apps/web`: typecheck PASS, lint PASS (0 errors; 1 pre-existing warning in untracked `qa/full-flows.mjs`), test 442 PASS, prod `next build` PASS. No migration. Commit `72f3d97`, pushed to origin/main. Handing back for independent retest.
- 2026-07-02 - VERIFIED (Tester, independent). Source: both `discover/page.tsx` (feed) and `discover/events/[eventId]/page.tsx` (detail) import and call the SAME pure helpers `formatDiscoveryDate` + `describeDiscoveryAvailability` from `src/lib/discovery-card.ts` — confirmed can't drift. Detail CSS (globals.css:761–771): date/time day+time both `--fs-h2`/900 with time in `--accent` (dominant); availability is a calm pill (`rgba(59,234,126,.16)`/`--accent`), `.is-full` uses `--surface-raised`/`--muted` — NO coral/red anywhere; meta demoted to a 12–13px `<dl>` below a `--line` hairline. LIVE (logged in once as pooled seeker-B, `/discover/events/c19cfef3…`, HTTP 200): rendered facts block = `<span class="event-detail-when-day">Thu 2 Jul</span><span class="event-detail-when-time">18:00</span>` + `<p class="event-detail-availability">4 places left</p>` + secondary `<dl>` (Duration/Language & level/Ages/Host) — honest wording, no "N of M places remain", no coral class. Privacy: only "venue/exact" hits in the page are the approximate-area affirmation copy ("The exact venue is not included in this page") + safety copy — no address/street/precise leak added. AA (independently recomputed on `--surface` #272E34): accent date/time 8.68, pill accent-on-composited-pill 6.01, full-pill muted-on-raised 5.41, meta dt muted 6.42, meta dd text 12.51 — all ≥ AA. No new motion (reduced-motion parity holds). Repo checks (run once, `apps/web`): typecheck PASS, lint 0 errors (3 pre-existing warnings: 2 unused imports in `discover/page.tsx`, 1 in untracked `qa/full-flows.mjs` — none from this ticket), test 442 passed/12 skipped, prod `next build` PASS (`/discover/events/[eventId]` compiled). Status → `verified`.
