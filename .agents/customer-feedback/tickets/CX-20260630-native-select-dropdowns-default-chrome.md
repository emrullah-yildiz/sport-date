# CX-20260630-native-select-dropdowns-default-chrome

- Status: `ready`
- Severity: `low`
- Customer journey: Filtering discovery, sending feedback, and editing profile — anywhere a dropdown appears
- Surface: `both`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium (Playwright) 1440x900 and 390x844. Observed 2026-06-30.
- Found by: Customer Experience Agent (post-redesign visual audit)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As an adult using the filters, feedback form, and profile editor, I want the dropdowns to look like they were designed alongside the buttons and inputs, so the product reads as one finished, trustworthy system — the owner specifically called out "dropdown interface match."

## What I observed

Observed 2026-06-30, reproduced 2/2 (desktop + mobile).

- Every `<select>` in the app renders with the **default OS chevron and native chrome** (`appearance: auto`, no custom arrow / `background-image: none`). The custom text inputs and buttons around them have a deliberate look (rounded radii, brand focus rings, lime/ink fills), so the selects are the one control type that visibly falls back to browser default.
- Locations: `/discover` filter "WHEN" (`Next 7 days`) — the only filter that's a select, so it sits beside three custom text inputs and reads slightly off (screenshots `_discover__desktop.png`, `_discover__mobile.png`); `/feedback` two selects "What kind of feedback is this?" and "Where did it happen?" (bordered and rounded but still native arrow — screenshot `_feedback__desktop.png`); `/profile` "Edit your profile" selects (skill level / frequency).
- Secondary nit on the same surface: the `/discover` filter labels and the "WHEN" select render at ~10px, noticeably smaller than the rest of the type scale.

These are facts from computed styles and screenshots. The selects work; this is a visual-consistency/finish issue. The feedback selects are the closest to matching (they have a border + radius); the discover "WHEN" select is the most exposed because it sits in a row of otherwise-custom inputs.

## What I expected

Dropdowns should share the same border, radius, height, focus treatment, and ideally a custom chevron consistent with the design system, and use a readable font size in line with the type scale — so no control looks like an unstyled browser default.

## Reproduction

1. Open `/discover`; compare the "WHEN" select to the CITY/SPORT/LANGUAGE text inputs beside it (native arrow, ~10px text).
2. Open `/feedback`; note the two selects use the native chevron.
3. Open `/profile` → "Edit your profile"; note the skill-level/frequency selects are native.

Reproduction rate: `2/2 safe attempts` (desktop + mobile).

## Customer impact

Low. Nothing is blocked and the selects are usable and accessible. But the owner named dropdown styling specifically, and native selects are a classic "this looks unfinished" tell. Fixing them removes the last obviously-default control type and tightens the otherwise consistent redesign. The 10px discover-filter text is a minor readability nit folded in here because it lives on the same control row.

- Authorization/privacy/precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- Accessibility: a restyle must keep the native keyboard/AT behavior of `<select>`; if a fully custom widget is used it must remain keyboard- and screen-reader-operable.

## Evidence and limits

- Evidence: screenshots `_discover__desktop.png`, `_discover__mobile.png`, `_feedback__desktop.png` in the session scratchpad `qa-art/`; computed-style capture across all authed pages shows every `<select>` at `appearance: auto`, `background-image: none`, discover "WHEN" at `font-size: 10px`.
- Redactions made: synthetic `qa+...@sport-date.invalid` accounts only; no PII.
- Facts: all `<select>` controls are native-chrome; discover filter select/labels are ~10px; no console errors on any of these pages.
- Hypotheses to verify during implementation: a shared select style (custom chevron via background-image + `appearance: none`) is the lightest fix and keeps native behavior; a fully custom listbox is heavier and must re-earn accessibility. Bumping the discover filter font size should be checked against the 4-column filter layout so nothing wraps awkwardly.
- Paths or surfaces not tested: Safari/Firefox native select rendering (Chromium only); admin/moderation selects (out of the audited customer scope).

## Duplicate check

- Search terms used: "select", "dropdown", "filter", "chevron", "appearance", "native" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-landing-hero-reduced-motion-hydration-error.md`, `CX-20260630-new-member-empty-discovery-missing-language.md`, and the sibling `CX-20260630-native-date-inputs-unstyled-mismatch.md` (date inputs are a separate control type and separately fixable).
- Why this is new: no existing ticket covers `<select>` styling; kept distinct from the date-input ticket because the fix and the controls differ.

## Acceptance criteria

- [ ] All customer-facing `<select>` controls (discover WHEN, feedback type/area, profile edit skill/frequency) share the design system's border, radius, height, focus state, and a consistent chevron rather than the raw OS default.
- [ ] The `/discover` filter labels and select use a readable font size consistent with the type scale, without breaking the filter row layout at 1440 or 390.
- [ ] Keyboard and screen-reader operation of the selects is preserved.
- [ ] Desktop (1440) and mobile (390) render the restyled selects without overflow or clipping.
- [ ] No new console errors are introduced (these pages are at 0 today).

Removed criteria: precise-location/data-exposure deleted — not applicable.

## Handoff and retest log

- `2026-06-30 13:39 GTBDT` - Filed by Customer Experience Agent; status `ready`. Reproduced on `/discover`, `/feedback`, `/profile`, desktop + mobile.
