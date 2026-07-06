# CX-20260706-safety-center-emergency-line-duplicated

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — polish on a safety-critical page; the duplicated sentence reads as a rendering bug exactly where the product is trying to earn trust
- Customer journey: a signed-out visitor opens the Safety center to judge whether this product takes safety seriously → the same emergency sentence appears twice back-to-back → the page reads broken/careless
- Surface: `web` — live `/safety-guidelines` (signed-out view)
- Environment and viewport/device: any; verified on live production HTML (2026-07-06)
- Found by: Seraph user-sim daily pass (live fetch of https://www.keepitup.social/safety-guidelines)
- Implementation owner: `unassigned`
- Related tickets: archive `CX-20260701-safety-center-report-tracker-only-no-proactive-guidance-link` (added the guest guidance; likely introduced the overlap), `CX-20260630-event-detail-safety-emergency-microcopy-smallest-text` (different surface)

## Customer outcome

As a visitor evaluating safety before signing up, I want the Safety center to read as carefully crafted, so I can believe the safety story. In user voice: "It literally says 'If anyone is in immediate danger, contact local emergency services first — this service is not an emergency responder.' and then, immediately under it, 'This service is not an emergency responder. If anyone is in immediate danger, contact local emergency services.' Twice in a row. Did someone paste it twice?"

## What I observed (live, 2026-07-06)

In the live HTML, two adjacent asides render the same message back-to-back:
- `<p class="safety-guest-report-emergency">If anyone is in immediate danger, contact local emergency services first — this service is not an emergency responder.</p></aside>`
- immediately followed by `<aside class="safety-emergency-card"><strong>This service is not an emergency responder.</strong><span>If anyone is in immediate danger, contact local emergency services.</span></aside>`

Both are visible (neither is visually-hidden), so the signed-out reader sees the identical guidance twice consecutively.

## What I expected

The emergency guidance appears once, prominently. If the guest reporting card needs its own emergency note, it should not sit directly adjacent to the standalone emergency card saying the same thing.

## Reproduction

1. Open https://www.keepitup.social/safety-guidelines signed out.
2. Read the "Reporting & your cases" card and the block immediately after it.

Reproduction rate: 1/1 live fetch (both blocks present in served HTML).

## Customer impact

Credibility polish on the highest-trust page; no functional or safety information is missing (the guidance itself is correct — just doubled). Safety-content change, so keep the message intact in exactly one place.

## Duplicate check

- Search terms used: "emergency responder", "safety center", "duplicate".
- Tickets reviewed: archive `CX-20260701-safety-center-report-tracker-only-no-proactive-guidance-link` (closed; added the guest card), `CX-20260630-...-emergency-microcopy-smallest-text` (event detail font size, different page).
- Why this is new: no ticket covers the duplication on `/safety-guidelines`.

## Acceptance criteria

- [ ] The signed-out Safety center shows the emergency guidance exactly once (content unchanged in substance).
- [ ] The signed-in variant re-checked for the same duplication.
- [ ] A test pins that the emergency guidance renders once on the page.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass, live-site fetch); status `ready`.
