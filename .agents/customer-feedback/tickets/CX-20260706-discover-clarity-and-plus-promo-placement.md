# CX-20260706-discover-clarity-and-plus-promo-placement

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — unexplained terms on the core browsing surface plus a promo wedged into the task path
- Customer journey: member opens Discover → tries to understand filters and eligibility → scrolls past a Plus promo to reach results
- Surface: `web` — `/discover`
- Environment and viewport/device: mobile 390px + desktop
- Found by: Seraph user-sim daily pass (code walk of `apps/web/src/app/discover/page.tsx`)
- Implementation owner: `unassigned`
- Related tickets: archive `CX-20260630-discover-filter-input-placeholders-truncated` (placeholder truncation only — different problem, closed)

## Findings (user voice)

1. **P2 — "eligible to join" unexplained.** "Discover says some events I'm 'eligible to join' — eligible how? Based on what?" (`discover/page.tsx:139,149`). Explain the term at first touch in one short phrase (profile sports/languages/level match) or replace with self-explanatory wording.
2. **P2 — "Any compatible" language jargon.** The language filter's "Any compatible" phrasing assumes the member knows the compatibility rule (`discover/page.tsx:155`). Say what it means ("languages you share") in plain words.
3. **P2 — Plus promo interrupts the task.** "I'm trying to find a game and there's an upsell box between the filters and the results." For free members the Plus promo sits mid-task (`discover/page.tsx:174-179`). Move it below results or to a non-blocking slot; never between a filter action and its outcome.
4. **P2 (verify) — 390px filter overflow risk.** The filter form renders 5 fields (7 with Plus) (`discover/page.tsx:152-173`); verify no horizontal overflow or cramped targets at 390px and fix if present.

## Acceptance criteria

- [ ] "Eligible" and language-filter wording understandable to a newcomer without prior knowledge (checklist C: every term explained at first touch, briefly — no wall of text).
- [ ] Plus promo no longer sits between filters and results for free members; discovery task flow uninterrupted; promo remains honest and dismissible where placed.
- [ ] Filters verified usable at 390px with no horizontal scroll.
- [ ] typecheck / lint / tests / prod build green.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass); status `ready`.
