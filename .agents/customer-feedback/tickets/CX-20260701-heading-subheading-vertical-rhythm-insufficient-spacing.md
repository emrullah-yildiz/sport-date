# CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing

- Status: `ready`
- Severity: `low`
- Priority: `P3 polish` — (Reach 5 × Impact 2 × Confidence 4) / Effort 2 = 20. Broad, cheap, systemic readability win.
- Customer journey: cross-cutting (all surfaces)
- Surface: `web`
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-01, "make sure there is enough space between titles and subtitles")
- Implementation owner: `unassigned`
- Related tickets: `CX-20260630-signup-redundant-double-headline-weak-focal-point` (related heading hierarchy)

## Customer outcome

As any member reading the site, I want clear breathing room between titles and the text beneath them so that the page feels calm and easy to scan rather than cramped.

## What I observed

Titles and their subtitles/eyebrows/supporting copy sit too close in several places, weakening hierarchy and making sections feel dense. This is a systemic spacing/vertical-rhythm issue rather than a single-page bug.

## What I expected

A consistent, deliberate spacing scale between headings and their adjacent sub-text, applied via shared design-system tokens so the rhythm is uniform across surfaces.

## Reproduction

1. Visit landing, profile, discover, event detail.
2. Observe heading-to-subtext spacing; compare across pages for consistency.

Reproduction rate: `observable across multiple surfaces`

## Customer impact

Cramped hierarchy lowers perceived quality and scannability for everyone. No safety/privacy/auth dimension, but a broad legibility and polish gain.

## Acceptance criteria

- [ ] Heading → adjacent sub-text spacing uses a consistent design-system scale across landing, profile, discover, and event detail.
- [ ] The change is token/utility-driven (not per-page one-offs) so future surfaces inherit it.
- [ ] Contrast, focus, and responsive behaviour at mobile and desktop remain correct; no overflow introduced.
- [ ] On-brand (Ink/Cream/Lime/Coral/Sage); reduced-motion unaffected.
- [ ] Repository checks pass.

## Added evidence (profile surface, measured)

During a profile × visual-hierarchy pass (2026-07-01, dev localhost:3000, 1280px, signed-in synthetic adult), computed-style measurement on `/profile` quantified the cramping this ticket describes:

- Hero eyebrow ("YOUR PRIVATE BETA PROFILE"): `margin-bottom: 0px`; hero `h1`: `margin-top: 0px` → measured gap eyebrow→h1 = **0px**. The uppercase eyebrow sits directly on the h1's ~79px line-box with no breathing room.
- Hero `h1`→lede paragraph: both `margin` = 0 → measured gap = **0px**; the supporting sentence is pinned to the descenders of the headline.
- By contrast the three panels below use `panel-label`→`h2` = 24px, so the rhythm is also *inconsistent* between the hero and the panels on the same page.

This confirms the systemic nature: the fix should introduce a shared heading→sub-text spacing token and apply it to the profile hero (eyebrow→h1→lede) so it matches the panel rhythm, not a per-page nudge. Selectors: `.profile-hero .eyebrow`, `.profile-hero h1`, `.profile-hero > div > p:last-child` in `apps/web/src/app/globals.css` (~lines 467–468).

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready`.
- 2026-07-01 - Experience & Design Explorer added measured profile-hero evidence (eyebrow→h1 = 0px, h1→lede = 0px, vs 24px panel rhythm on the same page); status stays `ready`.
