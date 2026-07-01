# CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed

- Status: `verified`
- Severity: `medium`
- Priority: `P1 high` — (Reach 5 × Impact 4 × Confidence 4) / Effort 2 = 40. `/discover` is the member's core browse surface; every member hits this every session, and the current card hierarchy makes the primary decision (which event, when) slow to scan. Effort is CSS + light markup reorder, no data/query change.
- Customer journey: discovery (browse compatible events → pick one to open)
- Surface: `web` (mobile + desktop)
- Environment and viewport/device: dev server localhost:3000, Chromium headless, 1280×900 and 375×812. Observed 2026-07-01 with a signed-in synthetic adult; 19 discoverable invitations in the feed.
- Found by: experience-design-explorer (discover × visual-hierarchy pass)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (cross-cutting spacing, different fix), `CX-20260701-profile-action-strip-flat-no-hierarchy` (same "flat/undifferentiated" pattern on a different surface), `CX-20260630-new-member-empty-discovery-missing-language` (empty state, not the populated feed)

## Customer outcome

As a member browsing `/discover`, I want the feed to lead with the facts I actually decide on — what sport, where, and **when** — and to let one card stand apart from the next, so that I can scan a screen full of invitations quickly instead of reading every card in full.

## What I observed

With 19 compatible invitations rendered (2-column grid at 1280, single column at 375), the feed reads as a wall of visually identical white cards. Measured on the live card:

- **Visual weight is inverted vs. decision value.** The single largest element per card is the 32px ink **title** — a host free-text string that is frequently noisy or near-duplicated across cards ("Open tennis newcomers mr0r", "Open tennis newcomers mr0r", "PROBE tennis kq5p0", "A public rally mr14qx6n3sqr"). Meanwhile the **sport** and **area/city** — what a member scans and filters by — are the *smallest* text on the card (11px uppercase muted grey, tucked into the top corners), and the **date/time** ("Sun 5 Jul, 19:00") — the most decision-relevant fact — is just the first of five identical 11px cream pills, visually indistinguishable from "English", "beginner / intermediate", or "Ages 18–99".
- **No differentiation between cards.** Every card shares the identical treatment: white background, 32px title, muted description, one flat row of five 11px cream pills, one dark "See the invitation" button, and a fixed `min-height: 350px`. Nothing draws the eye to one card over another; scanning 19 near-identical cards requires reading each one.
- **The meta row has no internal hierarchy.** Date/time and **places-remaining** (availability — the fact that gently signals "act before it fills") are rendered with exactly the same weight as language, level, and age range. There is no way to glance and see "when" or "how full".
- **Low density / dead space.** The fixed 350px card height leaves visible empty gaps between the pill row and footer on short-description cards, so a member sees ~4 cards per viewport at 1280 and scrolls a long repetitive column on mobile (first card top ≈989px at 375, then a ~9,000px scroll for the full feed).

Observed facts only; no claim about real members. Reproduced across two viewports in one session.

## What I expected

A scannable feed where each card leads with sport + area and a visually emphasized **date/time**, availability is legible at a glance, and the host's free-text title is present but not the loudest element. Cards should have enough differentiation and density that a member can compare several invitations in one screen without reading each in full — while staying calm and non-manipulative (no artificial scarcity, no urgency coloring on availability beyond honest legibility).

## Reproduction

1. Sign in as a member with a sport + language that matches several open events.
2. Open `/discover` with a populated feed (several compatible invitations).
3. Try to answer, by scanning only: "Which of these is on Saturday evening and still has places?"
4. Observe that date/time and places-remaining carry no more visual weight than age range, and that the noisy title dominates each otherwise-identical card.

Reproduction rate: `2/2 viewports (1280, 375), single session`

## Customer impact

The primary browse surface is slow and tiring to scan, which is exactly the friction the product exists to remove ("something real to do" should be easy to find). A member comparing invitations must read full cards rather than glance. No authorization, privacy, or safety dimension — approximate-area-only display is preserved and must stay that way. Accessibility overlap: the inverted hierarchy also means the visually largest element is the least meaningful, which weakens the reading order for low-vision scanning.

## Evidence and limits

- Evidence: live measurement — title 32px ink; sport/area 11px muted; five meta pills all 11px on identical cream bg; card `min-height:350px`; 2-col grid 553px columns / 14px gap at 1280; 19 identical cards; screenshots of the full desktop and mobile feed (redacted — synthetic events, approximate area only).
- Redactions made: synthetic host names and test event titles only; no precise venue (feed shows approximate area by design, which is correct).
- Facts: card markup + `.discovery-card`/`.discovery-meta`/`.discovery-card-top` styles in `apps/web/src/app/discover/page.tsx` and `apps/web/src/app/globals.css` (line ~516).
- Hypotheses to verify during implementation: best emphasis for date/time (dedicated line vs. lead pill); whether to de-emphasize the free-text title relative to sport/area; whether density should increase (auto height + tighter min) without harming touch targets.
- Paths not tested: how the hierarchy reads with a single-card feed and with the member's own/requested cards ("View request" footer variant).

## Duplicate check

- Search terms used: discovery-card, discovery-grid, discover card hierarchy, scannable, meta pill, places remaining, date/time hierarchy.
- Tickets reviewed: full queue, especially the profile-action-strip-flat (same flatness pattern, different surface), heading-subheading-spacing (cross-cutting title/subtitle spacing), discover-filter-input-placeholders (filters, verified), new-member-empty-discovery (empty state).
- Why this is new: no existing ticket addresses the populated discovery-card/feed visual hierarchy or scannability. This is an independently fixable outcome (card layout + emphasis), separate from filter copy, empty-state copy, and cross-cutting heading spacing.

## Acceptance criteria

- [ ] Scanning only (no reading), a member can identify each card's **sport**, **area**, and **date/time** — date/time is visually emphasized relative to the other meta.
- [ ] Availability (places remaining) is legible at a glance, presented honestly and calmly — no artificial-scarcity styling, no manufactured urgency (anti-dark-pattern guardrail).
- [ ] The host free-text title is present but no longer the single loudest element competing with the scan-critical facts.
- [ ] Cards have enough differentiation/density that several invitations can be compared in one viewport without reading each in full; excess fixed dead space is reduced.
- [ ] Approximate-area-only display is preserved; no precise venue or address is exposed in the feed.
- [ ] Layout remains usable and non-overflowing at 375px and 1280px; touch targets (the invitation link/button) stay ≥44px; visible focus and sensible reading/tab order preserved.
- [ ] Reduced-motion parity maintained (no motion introduced that lacks a reduced-motion fallback).
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (discover × visual-hierarchy pass); status `ready`.
- 2026-07-01 - Picked up by experience-build-agent; status `in-progress` (implementation owner).
- 2026-07-01 - Implemented by experience-build-agent; status `implemented` (commit 2175f0c). Redesigned the discovery card into a fixed-order scan block (sport + approximate area, emphasised date/time, honest calm availability), demoted the host title to a supporting subheading, removed the fixed 350px height for higher density, and extracted the scan-critical formatting into a tested pure helper (src/lib/discovery-card.ts). Preserved approximate-area-only privacy and >=44px focus-visible footer target; no motion added. Checks: typecheck pass / lint clean for changed files (sole remaining warning is in untracked qa/full-flows.mjs, untouched) / test 164 passed. Drove the running dev server as a synthetic adult: 19-invitation feed renders with no overflow at 1280 and 375px, scan facts legible per card. Awaiting independent retest.
- 2026-07-01 - Independently retested by experience-design-explorer from the member scenario (fresh synthetic host published 5 varied-capacity tennis events; fresh synthetic member with matching sport+English browsed a 24-invitation feed) in real Chromium under `reducedMotion: reduce`, WITHOUT reading the diff first. Measured per card at BOTH 1280 and 375: date/time is the largest element (22px, e.g. "Thu 2 Jul 20:00"), sport is next (20px bold), approximate area 13px ("Floreasca, Bucharest"), host title demoted to a 17px supporting subheading, secondary meta (language/level/age) 11px — reading order now matches decision value. Availability reads honestly and calmly ("6 places left", "8 places left", "3 places left", "2 places left") in muted sage-green rgb(61,75,44) on a pale pill — NOT coral/red, no manufactured urgency (helper also yields calm "Last place"/"Fully booked"). Density improved: card height auto ≈314px (1280) / ≈335px (375), no fixed 350px dead space. Approximate-area-only preserved — venue/address leak check = false (no "Court 2"/address in any card). No horizontal overflow (scrollWidth==clientWidth) at either viewport; footer invitation link is exactly 44px tall; visible focus ring defined (`.discovery-card a:focus-visible` 3px ink outline); computed AA contrast passes (availability 8.28, area 5.08, sport 16.07, full-label 4.47). All acceptance criteria pass → status `verified`.
