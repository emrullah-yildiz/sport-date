# CX-20260701-empty-states-lack-warmth-and-next-step

- Status: `in-progress`
- Severity: `medium`
- Priority: `P0` — (Reach 5 × Impact 3 × Confidence 4) / Effort 2 = 30. Empty states are the first thing early members see; warmth here shapes trust and retention cheaply.
- Customer journey: discovery (and hosting, profile)
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (b6)
- Implementation owner: `Experience Build Agent (Opus 4.8)`
- Related tickets: `CX-20260630-new-member-empty-discovery-missing-language` (narrow: a specific missing-language string on empty discovery; this ticket is the broader warmth-and-next-step pass across surfaces)

## Customer outcome

As an early member in a low-liquidity launch city, I want empty states across discover, hosting,
and profile to feel calm, warm, and encouraging — telling me clearly what to do next — so that an
empty screen feels like an invitation, not a broken or dead product.

## What I observed

Empty states across the core surfaces read as absence or error rather than a warm, specific "here's
what to do next." In an early launch city, empty discovery is the *common* case, so these screens
disproportionately shape first impressions. (A prior ticket fixed one missing-language string on
empty discovery; the broader tone/next-step pass is not covered.)

## What I expected

Every empty state (no events yet in your area, no hosted events yet, unfilled profile sections)
should be calm, on-brand, and specific: acknowledge the state warmly, explain why it might be empty,
and offer one clear next action (e.g. host the first event, widen filters, complete your profile).
No error styling for a normal empty state; no fake "others are joining" scarcity.

## Reproduction

1. As a brand-new member in a city with no events, open discover, hosting, and profile.
2. Note empty states that feel like absence/error rather than a warm invitation with a next step.

Reproduction rate: `confirmed; UX/tone gap across surfaces`

## Customer impact

Empty states are the first real impression during launch; cold or error-flavoured empties make a
product feel dead and untrustworthy, suppressing the very supply/attendance the loop needs. No
auth/privacy dimension; must not fabricate traction ("people near you", counts) that doesn't exist.

## Duplicate check

- Search terms: empty, no events, next step, encourage, warmth.
- Tickets reviewed: full queue; the existing empty-discovery ticket is a single missing-language
  string, not the cross-surface warmth-and-next-step treatment.
- Why new: broader tone + actionable-next-step pass across discover/hosting/profile empties.

## Acceptance criteria

- [ ] Discover, hosting, and profile empty states are warm, on-brand, and each offer one clear next action.
- [ ] Empty is visually distinct from error; a normal empty state is never styled as a failure.
- [ ] Copy fabricates no traction, counts, or "others near you" claims that are not real.
- [ ] Loading vs empty vs error are correctly distinguished on each surface.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-01 - Picked up by Experience Build Agent (Opus 4.8); status `in-progress`.
