# CX-20260701-owner-decision-brand-name-and-logo

- Status: `blocked-owner`
- Severity: `high`
- Priority: `P1` — foundational brand/identity decision that gates any rename or logo swap across the app; not member-buildable until decided. (Brand identity is never below P1 as an owner gate; RICE not applicable to a pure decision.)
- Customer journey: (brand/company identity — no member surface until decided)
- Surface: `both` (eventual)
- Environment and viewport/device: n/a
- Found by: Experience & Design Explorer (owner growth-intake pass, 2026-07-01) — owner-requested "brand: logo & name" direction; exploration in `docs/marketing/brand-refresh-proposal.md`
- Implementation owner: `owner`
- Related tickets: `CX-20260701-brand-asset-swap-mechanism` (`ready` — the buildable swap mechanism, no rename performed), `CX-20260701-shareable-branded-motivational-card` (consumes the eventual brand assets)

## Decision needed

Decide whether to **keep the name "Sport Date"** or **rename**, and choose the **logo/wordmark
direction**. Per `references/escalation-policy.md`, final brand and company identity are **owner
decisions**. No rename or logo swap has been performed. Full exploration —
keep-or-rename analysis, 6 name candidates with rationale, and 3 logo directions (incl. a buildable
inline SVG wordmark concept on the design-system palette) — is in
`docs/marketing/brand-refresh-proposal.md`.

## Recommendation

**Explore a rename toward a distinctive, movement-first name that isn't romance-locked**, and pair it
with the **"Motion mark" logo direction (Direction A)**. Rationale:
- "Date" skews purely romantic, which contradicts the vision's explicit stance that friendship,
  dating, and community coexist and that framing friendship as failure is a non-goal.
- "Sport" + "Date" are generic, hard-to-own words with real **distinctiveness, SEO, and
  trademark-collision** concerns (flagged in the proposal as risks to investigate with counsel, **not**
  legal conclusions).
- A distinctive, movement-first name (e.g. the proposal's **Meetmove** / **Movemate** front-runners)
  keeps the "meet through movement" promise, includes all intentions, and is more defensible.

"Sport Date" is a serviceable working name and is fine to operate under during research; the rename can
be decided deliberately (test 2-3 finalists in the member survey first).

## Two meaningful alternatives

- **A) Keep "Sport Date" as-is.** Lowest effort, instantly legible category, no migration. Rejected as
  the recommendation because it keeps the romance-only read, low distinctiveness, and the SEO/trademark
  fragility — but it is a legitimate owner choice if brevity/clarity is valued over defensibility.
- **B) Keep "Sport Date" but refresh only the logo/wordmark** (new mark, same name). Middle path: sheds
  a dated look without a rename migration; does not address the "date"-skew or distinctiveness concerns.

## Consequence of delay

The brand-asset-swap mechanism (`CX-20260701-brand-asset-swap-mechanism`) can and should be built
regardless, so no engineering is blocked. But no rename/logo can ship, and the survey/forum outreach
(`CX-20260701-owner-action-run-surveys-and-forum-outreach`) shouldn't launch a *branded* account until
the final name/handle is picked. Delay simply defers those two.

## Exact action requested

1. Decide: **keep "Sport Date"** or **rename** (and if renaming, pick a name from the shortlist or
   propose one), after running trademark/domain/handle/SEO checks the proposal flags.
2. Pick a **logo/wordmark direction** (A "Motion mark" recommended; B "Two dots"; C "Wordmark-only").
3. Record the decision on this ticket so the swap mechanism can be populated with the final assets.

## Acceptance criteria

- [ ] Owner records the name decision (keep or the chosen new name).
- [ ] Owner records the chosen logo/wordmark direction.
- [ ] Decision is captured on this ticket and referenced by `CX-20260701-brand-asset-swap-mechanism` so the swap can be executed once assets are final; this ticket updated to reflect the decision.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer with recommendation and `docs/marketing/brand-refresh-proposal.md`; status `blocked-owner` (awaiting owner decision).
