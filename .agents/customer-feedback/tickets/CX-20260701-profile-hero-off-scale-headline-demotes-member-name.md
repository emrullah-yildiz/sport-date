# CX-20260701-profile-hero-off-scale-headline-demotes-member-name

- Status: `in-progress`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 4 × Impact 3 × Confidence 4) / Effort 2 = 24. Every signed-in member sees their own profile; the typography currently makes a generic marketing sentence the loudest thing on *their* page while their actual name is demoted, and the hero headline ignores the shared type scale (a fidelity/consistency defect the owner's "richer, more engaging profile" push will magnify). Cheap, token-driven fix. Not a safety/privacy/auth/accessibility floor, so P2.
- Customer journey: reflection / identity (a member viewing and tending their own profile)
- Surface: `web` (desktop + mobile; same component/CSS)
- Environment and viewport/device: `/profile`, `apps/web/src/app/globals.css` (~lines 46, 138, 185, 464–479); design tokens in `:root` (lines 13–24). Source-measured 2026-07-01; live rendering not re-measured this pass (signup registration rate-limited, so no synthetic account could be signed in — clamp/token values below are exact from source).
- Found by: experience-design-explorer (profile × typography pass)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (same hero, *spacing* not *type scale* — complementary, not a duplicate), `CX-20260701-profile-action-strip-flat-no-hierarchy` (same page, the pill strip not the headings), `CX-20260701-profile-lacks-rich-browsable-detail` (owner request for richer profile content), `CX-20260630-signup-redundant-double-headline-weak-focal-point` (headline focal-point pattern on a different surface)

## Customer outcome

As a member looking at my own profile, I want the page's typography to make *my identity* — my name and my movement — the clear protagonist, using the same consistent, trustworthy type scale as the rest of the app, so my profile feels like a considered space that is about me rather than a marketing banner with my details tucked underneath.

## What I observed

Two independent typographic defects on `/profile`, both readable in source:

1. **The hero headline ignores the product's shared type scale and is set in a bespoke, oversized, over-tight face.** The design system defines a fluid scale in `:root`: `--fs-h1: clamp(36px, 5vw, 60px)`, and the global heading rule (`h1,h2,h3,h4,.display`) sets `letter-spacing: -.02em; line-height: 1.05`. But `.profile-hero h1` overrides all three: `font-size: clamp(48px, 7vw, 82px); line-height: .96; letter-spacing: -.065em` (globals.css:468). So the profile headline renders up to **82px** (vs the scale's 60px h1 ceiling) with **more than 3× tighter tracking** (`-.065em` vs `-.02em`) and a sub-1 line-height — the single most off-scale heading in the app. At 82px with `-.065em` tracking the headline sentence "{firstName}, ready when the right game appears." packs tightly; a longer first name or the wrapped sentence risks crowded descenders/ascenders (the same crowding the spacing ticket notes at 0px gaps).

2. **The member's own name is typographically demoted below a generic marketing sentence.** The hero h1 is *not* the member's name — it is the fixed sentence above. The member's actual name ("{firstName} {lastName}") lives in the "About" panel as `.profile-panel h2`, hard-pinned to **28px flat** (globals.css:471) — which is also off-scale: the token `--fs-h2` is `clamp(28px, 3.6vw, 44px)`, so panel headings sit permanently at the scale's *floor* and never scale up. Result: on the member's own profile, a 48–82px marketing voice dominates while their identity reads at a static 28px, the same size as every utility section heading ("Connection", "Your movement").

Supporting observations (same pass):
- **Two competing small-caps label styles.** `.eyebrow` is defined twice (globals.css:138 = 12px / weight 900 / `.14em` / #496253, and again at :185 = 12px / weight 700 / `.14em` / `--ink-soft`), so the eyebrow's weight and color depend on cascade/source order. Separately `.panel-label` is 11px / 900 / `.12em` — a near-duplicate micro-label at a slightly different size, tracking, and (via `!important`) color. The profile therefore mixes two subtly different small-caps label systems.
- **The sports meta is below the small-text token floor.** `.profile-sport span` (skill · frequency — the concrete substance of "Your movement") is `font-size: 12px`, under the `--fs-small: 14px` token. The most meaningful per-sport detail is set smaller than the design system's smallest defined step.

No authorization, privacy, or precise-location dimension (this is the member's own record). Observed via source; one reasoning pass.

## What I expected

- The profile hero headline should use the shared `--fs-h1` scale (or a single deliberately-registered display step), with the product's standard heading tracking/line-height, so it is consistent with every other h1 and cannot crowd at large sizes.
- The member's **name** should be the typographic protagonist of their own profile — at least as prominent as (ideally more than) the marketing sentence — rather than demoted to a floor-pinned 28px panel heading equal to utility sections.
- Micro-labels (eyebrow / panel-label) should resolve to **one** small-caps label token (single size, weight, tracking, color) with no source-order dependency.
- Body/meta sizes should sit on the defined scale (no sub-`--fs-small` 12px for meaningful content).

## Reproduction

1. Sign in and open `/profile`.
2. Note that the largest text is the fixed sentence "…ready when the right game appears.", not your name.
3. Find your name in the "About" panel — it is markedly smaller (28px) than the hero sentence and the same size as "Connection"/"Your movement" headings.
4. Inspect computed styles: hero `h1` font-size resolves up to 82px with letter-spacing `-.065em`; compare to any other page's h1 (≤60px, `-.02em`) — they do not match.

Reproduction rate: `deterministic from source (CSS constants); live render not re-measured this pass due to signup rate-limit`

## Customer impact

The profile is the one surface that should feel *about the member*. Leading it with an oversized, off-scale marketing sentence while the member's name is demoted undercuts that sense of ownership and dignity, and the bespoke 82px/`-.065em` treatment is a visible break from the otherwise consistent, trustworthy type system — exactly the kind of inconsistency the owner's "richer, more engaging profile" direction will amplify if not fixed at the scale level. No safety, privacy, authorization, or data-loss dimension. Accessibility note: extreme negative tracking at large sizes can reduce legibility for low-vision members, but this is a readability polish concern, not a hard a11y floor, so severity stays medium.

## Evidence and limits

- Evidence: source constants — `:root` type scale (`--fs-h1: clamp(36px,5vw,60px)`, `--fs-h2: clamp(28px,3.6vw,44px)`, `--fs-small: 14px`); global heading rule `letter-spacing:-.02em; line-height:1.05` (globals.css:46); `.profile-hero h1 { font-size: clamp(48px,7vw,82px); line-height:.96; letter-spacing:-.065em }` (globals.css:468); `.profile-panel h2 { font-size: 28px }` (globals.css:471); duplicate `.eyebrow` at globals.css:138 and :185; `.profile-sport span { font-size:12px }` (globals.css:478). Profile markup in `apps/web/src/app/profile/page.tsx` (hero h1 = fixed sentence; member name = panel h2).
- Redactions made: none needed (no member data, no synthetic account signed in; source only).
- Facts: the four measurements above are exact CSS constants, not renderings.
- Hypotheses to verify during implementation: whether to promote the member's name into the hero (making it the h1) vs. keep the sentence and re-rank sizes; the exact display step to register for the profile hero if a larger-than-`--fs-h1` display size is genuinely wanted (add ONE token, don't hand-roll a clamp); which of the two `.eyebrow` definitions is authoritative.
- Paths or surfaces not tested: live rendered pixel sizes at 375/1280 (signup rate-limited this pass — could not sign in); long-name / i18n wrapping behavior of the hero sentence at 82px; the edit-profile form's own type (out of scope for this ticket).

## Duplicate check

- Search terms used: profile, hero, h1, type scale, font-size, typography, clamp, letter-spacing, name, panel h2, eyebrow, panel-label, 28px, 82px.
- Tickets reviewed: full queue — especially heading-subheading-vertical-rhythm (same hero but *spacing*/margins, explicitly not type size or scale fidelity), profile-action-strip-flat (the pill row, not headings), profile-lacks-rich-browsable-detail (content richness, not type), signup-double-headline (headline focal point on signup).
- Why this is new: no existing ticket addresses the profile hero's departure from the shared type scale, the demotion of the member's name below a marketing sentence, the duplicate eyebrow definitions, or the sub-token meta size. Independently fixable via tokens/CSS; separable from the spacing ticket (they can ship together but are distinct outcomes).

## Acceptance criteria

- [ ] The profile hero headline uses the shared type scale (`--fs-h1`, or a single named display token added to `:root`) and the product's standard heading `letter-spacing`/`line-height` — no bespoke per-selector `clamp()`/`-.065em`/`.96` on `.profile-hero h1`.
- [ ] The member's **name** is the typographic protagonist of their own profile: rendered at least as prominent as the hero sentence (a member can tell at a glance the page is about *them*), not demoted to a size equal to utility section headings.
- [ ] Panel headings (`.profile-panel h2`) sit on the `--fs-h2` scale rather than pinned flat at the floor.
- [ ] Small-caps micro-labels resolve to a single token: one size, weight, tracking, and color for eyebrow/panel-label, with no reliance on CSS source order (the duplicate `.eyebrow` definition is removed or reconciled).
- [ ] Meaningful profile meta (e.g. sport skill · frequency) is no smaller than `--fs-small` (14px).
- [ ] No overflow or crowded descenders at 375px and 1280px, including a long first name and the wrapped hero sentence; contrast remains AA.
- [ ] On-brand (Ink/Cream/Lime/Coral/Sage), reduced-motion unaffected, focus/keyboard unaffected.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (profile × typography pass); status `ready`. Source-measured; live pixel re-measurement deferred (signup registration rate-limited this pass).
- 2026-07-01 - experience-build-agent picked up; status `in-progress`. Implementing: promote member name to hero h1 on `--fs-h1`, demote marketing sentence to subordinate lede, de-duplicate `.eyebrow`, bring panel h2 onto `--fs-h2` and sports meta onto `--fs-small`.
