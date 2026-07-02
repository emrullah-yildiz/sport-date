# CX-20260703-discover-card-request-status-raw-enum

- Status: `verified`
- Priority: `P2` — RICE (5 reach × 0.5 impact × 1.0 confidence) / 0.25 effort = 10.0. High score on a tiny, systemic copy fix.
- Severity: `low`
- Customer journey: Browsing the discover feed after having already requested / been declined / cancelled a place on an event.
- Surface: `web`
- Environment and viewport/device: `/discover` feed card footer, all viewports (1280 + 375). Source-based audit, 2026-07-03.
- Found by: experience-design-explorer (source audit)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` (archived) redesigned the card but its handoff explicitly lists "the member's own/requested cards ('View request' footer variant)" as a path NOT tested — this ticket covers exactly that variant.

## Customer outcome

As a member who has already interacted with an event, I want the feed card to describe my request in the same warm plain language used everywhere else, so that I am not shown a raw internal status word that reads like leaked database jargon.

## What I observed

On the discovery feed card footer, a member who has a request on the event sees a label built directly from the raw status enum:

`apps/web/src/app/discover/page.tsx:223`
```
<footer><span>{event.request ? `Request: ${event.request.status}` : `Hosted by ${event.hostFirstName}`}</span>...
```

`event.request.status` is the raw union `"pending" | "accepted" | "declined" | "cancelled"` (`apps/web/src/lib/events.ts:17`). So the member reads, verbatim, one of:

- `Request: pending`
- `Request: accepted`
- `Request: declined`
- `Request: cancelled`

These are lower-case internal state tokens rendered mid-sentence. This is inconsistent with the humane, sentence-cased copy the same product uses for these exact states on the event page (`JoinRequestControls.tsx`: "Your request is with the host.", "You have a place.", "Not this game.", "Request cancelled."). The `declined` and `cancelled` values in particular read as blunt and slightly punitive in a bare `Request: declined` pill.

## What I expected

The footer should describe the member's relationship to the event in the same plain, calm register used elsewhere (e.g. "Awaiting the host", "You're in", "Not this time", "Request cancelled"), routed through a shared pure helper so feed wording cannot drift from the event-page wording. No raw enum token should ever reach a member.

## Reproduction

1. As a member, request a place on a discoverable event (or have one declined/cancelled).
2. Return to `/discover`.
3. Read that event's card footer — it shows `Request: <raw status>`.

Reproduction rate: `4/4 safe attempts` (one per status value; deterministic from source).

## Customer impact

Practical: minor — the member still understands roughly what it means. Emotional/trust: a raw lower-case `Request: declined` pill on the primary browse surface reads as unpolished and slightly cold, undercutting the product's warm, non-punitive tone (the same status is softened everywhere else). No authorization, privacy, safety, accessibility, or data-loss dimension.

## Evidence and limits

- Evidence: `apps/web/src/app/discover/page.tsx:223`; enum source `apps/web/src/lib/events.ts:17`; contrast/humane precedent `apps/web/src/components/JoinRequestControls.tsx:202-263`.
- Redactions made: none needed (no personal data).
- Facts: the footer string interpolates the raw status enum with no mapping.
- Hypotheses to verify during implementation: confirm the same four statuses are the only values reaching this branch; confirm the paired CTA label ("View request") still reads sensibly alongside the new phrasing.
- Paths or surfaces not tested: none additional — this is the untested footer variant flagged by the inverted-hierarchy ticket.

## Duplicate check

- Search terms used: `Request:`, `request.status`, `footer.*status`, `raw enum`, `discover card status`, across `tickets/` and `tickets/archive/`.
- Tickets reviewed: `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` (redesigned card layout, explicitly did NOT test the requested-card footer variant), `CX-20260702-feedback-history-page-value-capitalized-distorts-member-text` (different surface, opposite concern — capitalising member free text).
- Why this is new, or which existing ticket was updated: no open or archived ticket addresses the discover-card footer request-status label. The layout ticket that touched this footer explicitly left this variant untested.

## Acceptance criteria

- [ ] The discover card footer describes each request state ("pending"/"accepted"/"declined"/"cancelled") in plain sentence-case language, never the raw enum token.
- [ ] The wording is produced by a shared pure helper (unit-tested) so feed copy cannot drift from the event-page join-state copy.
- [ ] The paired footer CTA remains coherent with the new label; focus ring and >=44px target are unchanged.
- [ ] ~~The original customer can complete or safely leave the journey.~~ N/A — display-only, no journey blocked.
- [ ] ~~Loading, empty, failure, and retry behavior.~~ N/A — static server-rendered label.
- [ ] ~~No precise location or other sensitive data is exposed.~~ N/A — no location/sensitive data in this label.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; added shared pure helper `joinRequestStateHeadline(status)` in `lib/join-request-policy.ts` returning the exact humane, sentence-case event-page headlines ("Your request is with the host." / "You have a place." / "Not this game." / "Request cancelled."), with a calm generic fallback ("You have a request.") for any unknown/future enum value so no raw token or `undefined` can leak. The `/discover` card footer (`app/discover/page.tsx:224`) now renders that helper instead of `Request: ${status}`, and `JoinRequestControls` sources its four panel headlines from the same helper so feed and event-page copy cannot drift. Added a unit test for the helper (all four states + raw-enum-leak guard + unknown-value fallback); "View request" CTA, 44px target, and focus ring unchanged. Checks: typecheck OK; lint 0 errors / 2 pre-existing warnings (qa/full-flows.mjs, member-profile.test.ts — not mine); test 736 passed / 12 skipped; production build compiled successfully. Status `implemented`.
- 2026-07-03 - Independently verified by orchestrator (source + repo checks): no raw `Request: <enum>` render remains on discover (grep clean); both discover card and JoinRequestControls render the single shared `joinRequestStateHeadline` helper (byte-identical copy, cannot drift); unknown/future enum degrades to a calm generic (no token/undefined leak); non-tautological unit test asserts exact strings + no-raw-enum + sentence-case + fallback; typecheck/lint/736 tests/prod build all pass (commit 6ddb11a). Status `verified`.
