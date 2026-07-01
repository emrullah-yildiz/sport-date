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

## Added evidence (profile surface, measured — refreshed after /profile rebuild)

**Superseded note:** the original profile-hero measurements below (eyebrow→h1 = 0px, h1→lede = 0px, selector `.profile-hero > div > p:last-child`) were captured *before* the /profile rebuild (commits `40e53ec` name-forward hero + `29b4f06` humane sections). That structure no longer exists — the hero now runs eyebrow → h1 (member name) → `.profile-hero-meta` line → lede paragraph. Re-measured 2026-07-01 (dev localhost:3000, 1280px, signed-in pooled host-A):

- Hero eyebrow ("Your private beta profile")→`h1`: **8px** (h1 `margin-top: 8px`). Improved from the previous 0px — no longer pinned.
- Hero `h1`→`.profile-hero-meta`: **14px**; `.profile-hero-meta`→lede paragraph: **14px** (both `margin-top: 14px`). The previous 0px cramping is gone.
- **Remaining inconsistency (the still-open core of this ticket):** the same page's panels use `panel-label`→`h2` = **24px**, so the hero rhythm (8/14px) and the panel rhythm (24px) still disagree on one screen. The systemic point holds: there is no shared heading→sub-text spacing token, so each block sets its own gap.

So the profile hero is no longer *cramped*, but the cross-block *inconsistency* this ticket targets remains. The fix should still introduce a shared heading→sub-text spacing token and reconcile the hero and panel rhythms (and the other listed surfaces) rather than per-page nudges. Current selectors on the profile: `.profile-hero .eyebrow`, `.profile-hero h1`, `.profile-hero-meta`, and the hero lede paragraph, plus `.profile-panel .panel-label`→`h2`, in `apps/web/src/app/globals.css`. Re-audit landing/discover/event-detail for their current gaps before implementing (the old absolute numbers there may also have drifted).

<details><summary>Original (pre-rebuild) measurements, retained for history</summary>

- Hero eyebrow ("YOUR PRIVATE BETA PROFILE"): `margin-bottom: 0px`; hero `h1`: `margin-top: 0px` → measured gap eyebrow→h1 = **0px**.
- Hero `h1`→lede paragraph: both `margin` = 0 → measured gap = **0px**.
- Panels used `panel-label`→`h2` = 24px. Selectors: `.profile-hero .eyebrow`, `.profile-hero h1`, `.profile-hero > div > p:last-child` (~globals.css lines 467–468).

</details>

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready`.
- 2026-07-01 - Experience & Design Explorer added measured profile-hero evidence (eyebrow→h1 = 0px, h1→lede = 0px, vs 24px panel rhythm on the same page); status stays `ready`.
- 2026-07-01 - Experience & Design Explorer **refreshed** the profile evidence after the /profile rebuild (40e53ec + 29b4f06): the hero cramping is resolved (eyebrow→h1 now 8px, h1→meta→lede now 14px each), but the hero-vs-panel *inconsistency* (8/14px vs 24px on one page) — the systemic core of this ticket — remains. Old 0px numbers + `> div > p:last-child` selector marked superseded; not a duplicate. Status stays `ready`.
