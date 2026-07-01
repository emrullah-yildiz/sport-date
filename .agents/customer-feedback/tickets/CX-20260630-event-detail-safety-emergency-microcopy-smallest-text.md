# CX-20260630-event-detail-safety-emergency-microcopy-smallest-text

- Status: `verified`
- Implementation owner: Experience Build Agent
- Severity: `medium`
- Priority: `P1 high` — Reach 4 (every member who opens the safety panel on any event detail, room, or host-request card — the shared `ReportSafetyControls`) × Impact 3 (the *most* safety-critical sentence on the page, the emergency-services guidance, is rendered as the *smallest, lowest-contrast* text on the page; a member acting under stress or with low vision may miss exactly the line that matters most) × Confidence 5 (computed font sizes measured live: emergency 11px, block-consequence + summary 12px, against a 17px body base) / Effort 2 (raise font-size / weight on a few `.safety-*` rules; no logic change). RICE math is (4×3×5)/2 = 30 (P2-range), **but the standing guardrail — safety, privacy, and accessibility content is never ranked below P1 — governs here.** This is simultaneously safety-critical content (the emergency-services guidance) and an accessibility legibility failure (11px is below comfortable reading size), so it is floored to **P1** regardless of RICE. Effort is tiny (CSS font-size/weight on a few `.safety-*` rules, no logic change) and the fix improves all three surfaces at once, so it is also the cheapest P1 available. Components: `apps/web/src/app/globals.css` (`.safety-controls summary`, `.safety-emergency`, `.safety-message`, `.safety-quick-action p`), shared component `apps/web/src/components/ReportSafetyControls.tsx`.

- Customer journey: Trust check before committing — a cautious member opens "Safety options for {host}" on an event detail page to understand how to block, report, or get help before requesting a place.
- Surface: `both` (renders on event detail, event room, and host request cards via the shared `ReportSafetyControls`)
- Environment and viewport/device: Local dev server (`http://localhost:3000`), Chromium headless, observed at 390px (expanded panel) and confirmed via computed styles. Observed 2026-06-30.
- Found by: Experience & Design Explorer (event detail / join × trust & safety surface)
- Related tickets: `none found` (no existing ticket covers safety-control legibility or the emergency microcopy)

## Customer outcome

As a cautious adult member checking my safety options before I commit to meeting a stranger, I want the safety guidance — especially the "if anyone is in immediate danger" line and the consequences of blocking — to be at least as legible as the rest of the page, so that I can read and act on it quickly, including under stress or with reduced vision.

## What I observed

On the event detail page, expanding "Safety options for {host}" reveals a genuinely useful panel: an immediate **Block** action with a plain-language consequence note, a categorized report form, an "also block immediately" choice, and an emergency-services reminder. The controls work and the copy is calm and honest.

But the type sizing inverts the importance order. Measured live (computed `font-size`, body base is **17px**):

- `.safety-emergency` ("If anyone is in immediate danger, move somewhere safe and contact local emergency services.") = **11px** — the single most safety-critical sentence on the page is the **smallest** text on the page (~65% of body).
- `.safety-quick-action p` (the block-consequence explanation: "Blocking immediately removes shared requests, places, room access, and exact-location access…") = **12px**.
- `.safety-controls summary` ("Safety options for {host}") = **12px**.
- `.safety-message` (post-submit confirmation) = **11px**.

So the emergency line and the irreversible-block warning — the two pieces of text a member most needs to read correctly — are rendered smaller than everything around them. On a 390px screen the emergency line sits at the very bottom in small coral text, easy to skim past.

Confirmed in source: `globals.css` sets `.safety-emergency,.safety-message { font-size: 11px }`, `.safety-controls summary { font-size: 12px }`, and `.safety-quick-action p { font-size: 12px }`.

## What I expected

Safety-critical microcopy should be among the *more* legible text on the page, not the least. The emergency line and the block-consequence note should be at least ~14px (ideally body-adjacent) with adequate weight/contrast, so a member reading under time pressure or with low vision can take them in at a glance. The disclosure summary should be comfortably tappable/readable too.

## Reproduction

1. Sign up as a new adult, set a language, and open any event from `/discover`.
2. On the event detail page, expand "Safety options for {host}".
3. Note the emergency-services line at the bottom and the block-consequence note are visibly smaller than the body copy above them.
4. Inspect computed styles: emergency/message = 11px, summary/quick-action = 12px, body = 17px.

Reproduction rate: `2/2 safe attempts` (measured at 390px; sizes are viewport-independent CSS).

## Customer impact

Trust + accessibility. The product's safety promise depends on a member being able to *read* how to protect themselves. Rendering the emergency guidance and the irreversible-block warning as the smallest text undercuts that promise, especially for low-vision members or anyone acting quickly. No data is exposed; this is a legibility/accessibility weakness on safety content, not a functional safety failure.

- Authorization / privacy / precise-location: not involved (controls function correctly; the issue is text size).
- Accessibility: yes — safety-critical text below comfortable reading size; WCAG favors not relying on the smallest type for the most important guidance.
- Safety: indirect — the guidance is present and correct, but its prominence does not match its importance.

## Evidence and limits

- Evidence: expanded safety panel screenshot at 390px (`scratchpad/retest-shots/safety-expanded-390.png`, gitignored; no member PII — synthetic adult, host first name only) and computed `font-size` readout (emergency 11px, quickP 12px, summary 12px, body 17px).
- Redactions made: host shown only by synthetic first name; no addresses, tokens, or report narratives.
- Facts:
  - Body base font-size is 17px; `.safety-emergency`/`.safety-message` are 11px; `.safety-controls summary` and `.safety-quick-action p` are 12px.
  - The emergency line is the smallest, lowest-prominence text on the event detail page.
- Hypotheses to verify during implementation:
  - Raising these to ~14px+ with adequate contrast does not break the panel layout at 390/750px (the `@media (max-width:650px)` quick-action stacking should still hold).
  - Same `.safety-*` rules render in the event room and on host request cards, so the fix improves all three surfaces at once — confirm no regression there.
- Paths or surfaces not tested: did not run an automated contrast audit; did not test with an actual screen reader or OS text-zoom.

## Duplicate check

- Search terms used: "safety", "emergency", "11px", "12px", "safety-controls", "event detail", "approximate", "location" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-session-management-web-session-not-listed.md` (account security, different surface), `CX-20260630-new-member-empty-discovery-missing-language.md` (discovery match, different surface). Neither touches safety-control legibility.
- Why this is new: no existing ticket covers the `ReportSafetyControls` panel or the emergency/block microcopy sizing.

## Acceptance criteria

- [x] On the event detail page (and anywhere `ReportSafetyControls` renders), the emergency-services line and the block-consequence note are at least ~14px with adequate weight/contrast, no longer the smallest text on the page.
- [x] The "Safety options for {host}" disclosure summary is comfortably readable and tappable (≥44px touch target preserved on mobile).
- [x] The change holds at 390px and 750px without overflow or layout breakage, and reduced-motion behavior is unaffected.
- [x] The same improvement is visible on the event room and host request-card instances of the safety panel (shared component), with no regression.
- [x] No sensitive data is exposed (n/a — visual sizing only).
- [x] Relevant repository checks pass (`npm run typecheck`, lint, `npm test`).

## Handoff and retest log

- `2026-06-30` - Filed by Experience & Design Explorer (event detail / join × trust & safety surface); status `ready`. Measured emergency=11px / block-note=12px / summary=12px against a 17px body base; safety-critical text is the smallest on the page. Accessibility-on-safety finding, P2.
- `2026-07-01` - Taken `in-progress` by Experience Build Agent (owner). Raising the safety microcopy sizes on the shared `.safety-*` rules in `globals.css`.
- `2026-07-01` - Implemented by Experience Build Agent (commit `5f84fd3`, pushed to origin/main; no migration). Raised the shared `.safety-*` rules in `globals.css`: `.safety-emergency` 11px→16px w600 with a thin coral left-border accent; `.safety-quick-action p` 12px→15px w600; `.safety-controls summary` 12px→15px + min-height:44px flex-centered touch target; `.safety-message` 11px→15px. Safety text is no longer the smallest on the page (base 17px). Wording/tone/behavior unchanged — legibility only. Contrast AA-safe (8.4:1 / 6.2:1 / 8.9:1). Verified served CSS via dev server; mobile stacking (max-width:650px) and reduced-motion untouched, no overflow at 375/1280. Checks: typecheck pass, lint pass (only pre-existing untouched `qa/full-flows.mjs` warning), test 319 passed/12 skipped, production build pass. Ready for independent retest across event detail, event room, and host-request cards.
- `2026-07-01` - **Verified** by Tester (independent retest). LIVE on the dev server, logged in ONCE as pooled `host-A`: opened a real `/discover/events/{id}` detail page; the shared `ReportSafetyControls` panel renders (emergency `<p>`, "Safety options for" summary, "immediate danger" copy). Confirmed against the *served* compiled CSS (fetched `/_next/static/.../*.css`, not just source): `.safety-emergency` = 16px / 600 with a `3px solid var(--coral)` left-border accent; `.safety-controls summary` = 15px + `min-height:44px` (align-items:center) touch target; `.safety-quick-action p` = 15px / 600; `.safety-emergency,.safety-message` base = 15px — none are the smallest text now (body base 17px). AA contrast computed: emergency/summary/message #713b31 on #fff7f4 = 8.37:1; quick-action #6e4b40 on #ffe2d6 = 6.23:1 (both > AA 4.5). Shared component confirmed rendering on event detail, discover event detail, event room (host + each non-self participant), and host-request cards (grep of `ReportSafetyControls` usages) — one fix, all surfaces, no regression. Wording/tone/behavior unchanged (component copy identical). Repo checks: typecheck pass, lint pass (sole warning is the untouched `qa/full-flows.mjs`), test 319 pass / 12 skip, production build pass. Note: summary weight is 900 (heavier than the ticket's ~600 target — strictly more legible, not a defect). All criteria met.
- `2026-07-01` - Reprioritized P2 → **P1** by Planner. RICE score (30) is unchanged, but the safety-and-accessibility-never-below-P1 guardrail governs: this is emergency safety guidance rendered below comfortable reading size, which is exactly the class of content the floor exists to protect. Named as the single next ticket to build (lowest-effort P1, shared component fixes all three surfaces). Kept `ready`.
