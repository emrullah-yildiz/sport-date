# CX-20260702-migrate-hardcoded-colors-moderation-remainder

- Status: `verified`
- Severity: `low`
- Priority: `P3 low` — staff-only surface, out of member navigation; not on any member journey. Finishes the token migration for completeness/consistency but has no member-facing impact.
- Customer journey: staff moderation (not member-facing)
- Surface: `web` (`/moderation`, `/moderation/reports/[reportId]`); shared CSS `apps/web/src/app/globals.css`
- Found by: experience-build-agent — carved out as the deferred remainder of `CX-20260702-migrate-hardcoded-colors-to-tokens` (2026-07-02)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-migrate-hardcoded-colors-to-tokens` (parent — migrated all member journeys)

## Customer outcome

Staff reviewing safety cases see the same coherent black+neon dark surfaces the rest of the app now uses, instead of the last remaining light-mode moderation panels.

## What I observed

The parent ticket migrated every member-facing surface (landing, signup, auth, profile, discover, hosting, event detail/room, safety report control, safety center, feedback, legal) onto the semantic tokens. Two residual groups were intentionally left OUT of that unit to keep it a clean, verifiable member-facing slice:

1. **Staff `/moderation` surfaces** (`globals.css` ~lines 663–667): `.moderation-page` (`background: #eeeae0`), `.moderation-case` (`white`), `.moderation-case blockquote` (`#fff7f4`), `.moderation-case-form input/select/textarea` (`white` + `color: var(--ink)`), `.moderation-appeal-review > blockquote` (`#f7fce8`), `.moderation-queue .moderation-case footer a` (`--ink` fill + `white`), `.evidence-reference-panel` (`#f8f7f2`), `.evidence-reference-list > article` / `.evidence-reference-form` (`white` + `--ink`). These are gated to authorized staff and never appear in member nav.

2. **Dead legacy landing CSS** (`globals.css` ~lines 155–194): the old `.hero`/`.nav`/`.brand`/`.event-stack`/`.phone-card`/`.event-card`/`.orbit`/`.steps`/`.safety`/`.discover-button` block. Confirmed unreferenced by any `.tsx` (the live landing uses `.landing-page`/`.hero-section`/`.preview-card`/`.step-card`/`.safety-card`). Contains `#fff`/`rgba(255,255,255,…)`/pastel-tint literals. Recommend DELETING this dead block rather than restyling it (verify no JSX/reference first).

## What I expected

Every `/moderation` panel resolves to `--surface`/`--surface-raised`, text to `--text`/`--text-muted`, borders to `--line`, inputs with visible dark borders/focus; neon fills carry `--bg` text. The dead legacy landing block is removed.

## Reproduction

1. As authorized staff, open `/moderation` and a `/moderation/reports/[reportId]` case detail.
2. Cards, evidence-reference panels, and form inputs render as light `#fff`/cream boxes on the otherwise-dark app.

Reproduction rate: `confirmed via source 2026-07-02 (grep of globals.css after parent migration; served CSS verified: only these selectors retain light fills)`

## Acceptance criteria

- [x] `.moderation-*` and `.evidence-reference-*` surfaces resolve to `--surface`/`--surface-raised` + `--text`/`--text-muted` + `--line`; inputs have visible dark borders/focus; neon fills carry `--bg` text. Coral/`--warn` only for the report blockquote urgency accent.
- [x] Every migrated pairing meets WCAG AA (ratios in `docs/design-refresh-2026.md` §1).
- [x] Dead legacy landing block (`.hero`/`.nav`/`.event-card`/`.steps`/`.safety`/`.phone-card`/`.discover-button`/`.orbit`, ~lines 155–194) is removed after confirming no live reference; no visual regression on the live landing page.
- [x] `npm run typecheck/lint/test/build --workspace @sport-date/web` pass.

## Handoff and retest log

- 2026-07-02 - Filed by experience-build-agent as the deferred, staff-only + dead-code remainder of `CX-20260702-migrate-hardcoded-colors-to-tokens`. Parent migrated all member journeys and verified (served CSS + AA ratios). Status `ready`.
- 2026-07-02 - Implemented by experience-build-agent (commit `4e6082a`, pushed to origin/main). Changed one file: `apps/web/src/app/globals.css`.
  - **Moderation migration.** Migrated every remaining `.moderation-*` / `.evidence-reference-*` surface off hardcoded light fills onto semantic tokens: `.moderation-page` `#eeeae0` → `--bg` (+`--text`); `.moderation-case` / `.evidence-reference-panel` / `.evidence-reference-form` `white`/`#f8f7f2` → `--surface` + `--line` border + `--text`; blockquotes (`#fff7f4`, `#f7fce8`), `dl>div`, badges, `.evidence-reference-list>article` → `--surface-raised` + `--text`; form `input/select/textarea` `white`+`var(--ink)` → `--surface-raised` + `--text` with a visible `--text-muted` border and a `--focus` (3px) ring; the two neon `--lime` submit buttons now carry `--bg` near-black text (were `--ink`/off-white on neon); footer "open case" link `var(--ink)`/`white` fill → `--surface-raised` + `--text` + `--line` + `--focus` ring. Form-container borders `rgba(23,36,29,…)` → `--line`. **Coral/`--warn` kept ONLY as the `.moderation-case blockquote` urgency left-border accent** (as specced). No new hex/literals introduced.
  - **Dead legacy landing block removed.** Deleted `.hero`/`.nav`/`.brand`/`.brand-mark`/`.button`(+`:hover`/`-small`)/`.hero h1`/`.hero-lede`/`.hero-actions`/`.microcopy`(dead variant)/`.event-stack`(+`::before`)/`.orbit`(`-one`/`-two`)/`.phone-card`/`.phone-topline`/`.event-card`/`.event-icon`/`.event-2`/`.event-3`/`.spots`/`.discover-button`/`.steps`(+`ol`/`li`/…)/`.safety`(+`.eyebrow`/`>p`) and their two `@media` rules (max-width:800px + reduced-motion). **Verified safe to delete:** repo-wide Grep of all `.tsx` found ZERO references to any of these bare classes; the live landing uses `.landing-page`/`.hero-section`/`.preview-card`/`.step-card`/`.safety-card` (all still present). **Two classes deliberately KEPT:** `.nav-links` (still used by the live landing nav in `landing/page.tsx`, and fully redefined in the LANDING PAGE block below) and `.shell` (out of this ticket's named scope). `.microcopy` and `.eyebrow` survive via their live definitions later in the file.
  - **AA (docs/design-refresh-2026.md §1, all text-on-solid; texture sits behind, unaffected):** `--text`/`--bg` 13.90 AAA · `--text`/`--surface` 12.51 AAA · `--text`/`--surface-raised` 10.54 AAA · `--bg`-on-`--accent`(green fill) 9.65 AAA. Non-text UI: input `--text-muted` border and `--line` hairlines clear the 3:1 UI-component floor; `--focus` green ring always visible on anthracite. Every migrated pairing meets AA (most AAA).
  - **Checks (all pass):** `npm run typecheck` ✓, `npm run lint` ✓ (only a pre-existing warning in the untracked `apps/web/qa/full-flows.mjs`, unrelated), `npm run test` ✓ (442 passed / 12 skipped), `npm run build` ✓ (prod `next build`, incl. `/moderation` and `/moderation/reports/[reportId]`). No DB migration in this unit. Status `implemented` — ready for independent retest.
- 2026-07-02 - VERIFIED (Tester, independent). Read every `.moderation-*` / `.evidence-reference-*` rule in globals.css (824–828): all fills resolve to `--bg`/`--surface`/`--surface-raised`, text `--text`/`--muted`, borders `--line`, form inputs use a visible `--text-muted` border + 3px `--focus` ring, both neon submit buttons carry `--bg` text on `--lime`, footer "open case" link is `--surface-raised`/`--text`/`--line`. NO hardcoded light fill remains in any named selector — the one suspicious `.evidence-reference-list code { background: var(--cream) }` resolves to `var(--cream) → var(--surface)` #272E34 (dark), not a light box. Coral/`--warn` appears ONLY as `.moderation-case blockquote` left-border accent (as specced). Dead-block deletion (globals.css:229–237 now a comment): repo-wide Grep for bare `.hero/.nav/.brand/.event-card/.phone-card/.discover-button/.orbit/.event-stack/.steps/.safety` found the only `.tsx` matches in `research/bucharest` — which uses CSS-MODULE-scoped `styles.hero`/`styles.nav`/`styles.brand` (locally hashed, unrelated to the deleted global bare classes), so zero live references. Kept classes confirmed present: `.nav-links` (line 238, used by live `landing/page.tsx`) and `.shell` (line 228). Live landing uses `.landing-page/.hero-section/.preview-card/.step-card/.safety-card` (in `landing/page.tsx`) — no regression from the deletion. AA (independently recomputed): text/surface 12.51, text/raised 10.54, muted/surface 6.42, muted/raised 5.41, bg-on-accent fill 9.65 — all ≥ AA (per docs §1). Repo checks (run once, `apps/web`): typecheck PASS, lint 0 errors (only pre-existing warnings, none from this ticket), test 442 passed/12 skipped, prod `next build` PASS (both `/moderation` and `/moderation/reports/[reportId]` compiled). Staff-gated surface not viewed live (no pooled staff account) — source + build verification complete and thorough; authorization gate confirmed intact. Status → `verified`.
