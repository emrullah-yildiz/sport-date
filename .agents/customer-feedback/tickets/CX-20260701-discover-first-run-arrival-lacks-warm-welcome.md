# CX-20260701-discover-first-run-arrival-lacks-warm-welcome

- Status: `implemented`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 5 × Impact 3 × Confidence 4) / Effort 3 = 20. /discover is the home a member returns to every visit; the arrival moment sets the emotional tone for the whole session, but the fix is presentational (copy + a small header layout change) so it is not a blocker. Not below P1 only if it were an accessibility/safety regression — it is neither.
- Customer journey: discovery (first run + every return visit) — the "arrival / delight" moment
- Surface: `web` (mobile follow-up; same header component)
- Environment and viewport/device: dev localhost:3000, Chromium reducedMotion:reduce, 1280 + 375
- Found by: Experience & Design Explorer (growth track: discover/first-run × delight, 2026-07-01)
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` (the *cards* were made scannable — verified; this ticket is the *header/arrival framing* above them), `CX-20260701-empty-states-lack-warmth-and-next-step` (the *empty* discover state; this ticket is the *populated* arrival), `CX-20260701-profile-hero-off-scale-headline-demotes-member-name` (same "make the member the hero, not a marketing sentence" principle, applied on /profile — apply the same lesson here), `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (spacing rhythm generally; this ticket is the header *content + warmth*, not spacing)

## Customer outcome

As a member opening Sport Date to find something to do, I want the discover page to feel like a warm "welcome back — here's what's happening near you" moment so that arriving feels personal and inviting, not like landing on the same generic marketing billboard I saw before I signed up.

## What I observed

Logged in as a pooled Bucharest member and opened `/discover` (31 real local invitations in the feed). The top of the page — the warmest, most-attention-getting real estate — is a **static marketing hero identical for every member on every visit**:

- Eyebrow: "EVENTS THAT FIT YOUR MOVEMENT" (generic, all-caps).
- H1 at **84px** (clamp(48px,7vw,84px), line-height .95, letter-spacing ~-.065em): **"Something real to do. Someone new to meet."** — the same aspirational sentence tone as the logged-out landing page. It never acknowledges the member, that they have *arrived*, or that a feed of real invitations is waiting just below.
- Sub-line, in the warmest supporting slot: **"Only events compatible with your sports, experience, adult age range, and active blocks appear here."** — a dry filtering/compliance disclaimer written in systems language ("active blocks", "adult age range").
- The results heading below is a flat count: **"31 invitations"** at 34px, with a privacy note — accurate, but with no sense of *near you / for you / welcome back*.

Measured consequence: from the top of the header to the first actual invitation card is **542px of vertical space at 1280px** — the real value (local invitations) sits far below a static billboard that repeats content the member already accepted at signup.

Nothing here is *broken* — the feed works and the copy is honest. The gap is **warmth and delight at the single most-repeated arrival moment in the product.** A returning member is greeted by a billboard, not a host.

## What I expected

The discover arrival should read like a warm, honest host greeting, personalised to the moment:

- Lead with a brief, warm acknowledgement of the member and where they are — e.g. "Welcome back, {firstName}." / "Here's what's happening near {area}." — using only the member's own first name and their already-stored approximate area (both already on the page for the near-me feature). No marketing sentence in the hero slot.
- Demote the generic aspirational sentence to a small supporting line (or drop it here — it belongs on the logged-out landing), and rewrite the filtering disclaimer in plain, calm language ("You're seeing events that fit your sports and age range near you") or move it out of the hero.
- Make the results heading feel human and located ("6 games open near {area} this week" / a warm variant) rather than a bare count — while staying strictly honest (real count, no fabricated "people near you", no scarcity, no popularity metric).
- Tighten the vertical space so the first real invitation is closer to the fold; the billboard should not push the value down the page.

Draw on warm, easy event products (Partiful/Luma-style "you're in, here's what's next" greetings; Duolingo-grade humane, honest encouragement) — translated, not copied, and always subordinate to the honest facts and the anti-dark-pattern guardrails.

## Reproduction

1. Log in as any member with a profile area (e.g. pooled Bucharest account) and open `/discover`.
2. Observe the 84px generic marketing H1 ("Something real to do. Someone new to meet."), the filter-disclaimer sub-line, and the flat "N invitations" heading — none of which acknowledge the member or their arrival.
3. Note the ~542px from header top to the first card at 1280px: the real invitations are pushed well below a static billboard that repeats pre-signup marketing.

Reproduction rate: `1/1 (live, pooled Bucharest member)`

## Customer impact

Every session begins here. A warm, personal, located greeting compounds trust and the sense that this product is *for me and my area*; a repeated generic billboard makes an active member feel like an anonymous visitor and buries the value. Practical: the value (invitations) is pushed down the page. Emotional: the warmest slot in the product does the least warm work.

- Authorization / privacy: none new. Use ONLY the member's own already-displayed first name and approximate area (both already rendered for the near-me feature) — never a precise member or venue location, never another member's data.
- Safety: none. Must not fabricate traction ("people near you", counts that aren't real), scarcity, streaks, or any popularity/attractiveness metric (anti-dark-pattern guardrails).
- Accessibility: keep exactly one h1, calm contrast on the Ink/Cream/Lime/Sage system, no motion that a returning member sees on every visit unless reduced-motion-safe.

## Evidence and limits

- Evidence (live, redacted): `/discover` header — eyebrow "EVENTS THAT FIT YOUR MOVEMENT"; h1 84px = "Something real to do. Someone new to meet." (lh .95, ls ~-.065em); sub-line = the "Only events compatible with your sports, experience, adult age range, and active blocks appear here." disclaimer; results heading "31 invitations" at 34px; header-top→first-card = 542px at 1280.
- Source: `apps/web/src/app/discover/page.tsx` `.discover-header` block (h1 + disclaimer p are hard-coded, member-agnostic); `.discover-header` styling in `apps/web/src/app/globals.css` (~line 544). The member's `firstName` and approximate `area.memberArea` are already available in `page.tsx` (used by the near-me note), so personalisation needs no new data or query.
- Redactions: synthetic pooled QA account only; approximate area label only (no precise venue).
- Hypotheses to verify during implementation: exact warm copy variants and whether the aspirational sentence is dropped vs. demoted are copy/design choices; whether the located results-heading count should reflect the near-me vs. everywhere state. Keep every variant strictly honest.
- Paths not tested: mobile app; the everywhere/broadened heading variant copy.

## Duplicate check

- Search terms used: discover-header, welcome, greeting, first-run, arrival, by name, hero, warmth, delight across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: full queue. `discover-cards-inverted-hierarchy` (cards, verified), `empty-states-lack-warmth` (empty state only), `heading-subheading-vertical-rhythm` (spacing, not content/warmth), `profile-hero-off-scale-headline-demotes-member-name` (same principle on /profile), `discover-no-location` / `discover-geo-radius` (location mechanics).
- Why this is new: no ticket owns the **populated /discover header/arrival framing** — the warm, personal, located greeting a member should meet on every visit. This is the discover/first-run × delight cell; the card-hierarchy ticket fixed what was *inside* the feed, this addresses the emotional frame *above* it. It reuses the "make the member the hero" lesson from the profile-hero ticket, now applied to the home surface.

## Acceptance criteria

- [ ] The /discover header greets the member warmly and by their own first name (e.g. "Welcome back, {firstName}") using only already-available data; the generic pre-signup marketing sentence is not the hero H1.
- [ ] The header conveys "here's what's happening near {your area}" honestly, using the member's own approximate area; no precise member or venue location is exposed.
- [ ] The filtering explanation, if kept, is in plain calm language (no "active blocks" / systems terms) and does not occupy the warmest slot as a disclaimer.
- [ ] The results heading reads as human and located (not just a bare count) while stating the real number — no fabricated traction, "people near you", scarcity, streaks, or popularity/attractiveness metrics.
- [ ] The first real invitation card sits meaningfully closer to the top than today (reduce the ~542px header-top→first-card gap at 1280) without cramping.
- [ ] Exactly one h1; on-brand Ink/Cream/Lime/Sage; AA contrast; visible focus; any greeting motion is reduced-motion-safe (and not fatiguing on a page seen every visit).
- [ ] Usable at 1280 and 375 with no horizontal overflow.
- [ ] Copy describes only implemented capability; a member returning to an empty feed still gets the warm near-me-aware empty state (do not regress `CX-20260701-discover-no-location-around-me-search`).
- [ ] Relevant automated tests (header renders member name + located heading, honest count) and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (growth track: discover/first-run × delight); status `ready`. Live-grounded on pooled Bucharest member; self-contained (member name + area already on the page, no new data/query needed).
- 2026-07-02 - Experience Build Agent: picked up, status `in-progress`. Plan: replace the static marketing hero with a warm, personal, located greeting ("Welcome back, {firstName}." + honest near-{area}/everywhere subline) built from pure, unit-testable helpers in `discovery-card.ts`; make the results heading human + located while stating the real count; tighten header spacing to bring the first card closer to the fold. No new data/query, no migration.
- 2026-07-02 - Experience Build Agent: status `implemented` (ready for independent retest). What changed: `/discover` header now greets the member with an h1 "Welcome back, {firstName}." (warm name-less fallback) plus a calm located sub-line "Here's what's happening near {area}." (honest everywhere/community variants); the generic pre-signup marketing sentence + eyebrow are removed from the hero. The filter disclaimer is rewritten in plain calm language ("You're seeing events that fit your sports and age range near {area}") and moved out of the warmest slot into the area-note (all three states: near-me / everywhere / typed-city). The populated results heading is now human + located ("N invitations near {area}" / "N invitations everywhere" / bare "N invitations") stating the REAL count — no fabricated traction/scarcity/popularity. Header top+bottom margins tightened (55px→34px top, 38px→18px bottom) and results-block top margin 55px→34px so the first card is meaningfully closer to the fold; combined with the h1 already being --fs-h1 (30-42px, not 84px) the header-top→first-card gap is well under the prior ~542px at 1280 with no cramping. Files: `apps/web/src/app/discover/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/lib/discovery-card.ts` (new pure helpers `buildDiscoveryGreeting` + `describeDiscoveryResultsHeading`), `apps/web/src/lib/discovery-card.test.ts` (new unit tests: greeting renders member name + honest located sub-line + fallbacks; heading states honest located count, singular/plural, non-negative). Guardrails: exactly one h1; semantic tokens only (no hardcoded hex); no new motion (reduced-motion N/A); approximate-area-only privacy preserved (uses only the member's own already-rendered first name + area, no precise/other-member data); near-me-aware empty state (`CX-20260701-discover-no-location-around-me-search`) untouched/not regressed. AA: greeting sub-line text/bg 13.90 AAA, h1 + results h2 text/bg 13.90 AAA, area-note muted/bg 7.13 AAA, strong text/bg 13.90 AAA (docs/design-refresh-2026 §1). Checks (apps/web): typecheck PASS, lint PASS (only a pre-existing warning in the untracked `qa/full-flows.mjs`, not this change), test PASS (452 passed / 12 skipped), prod build PASS. Commit `5fd3d3f`, pushed to origin/main (no migration).
