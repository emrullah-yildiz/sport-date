# CX-20260702-migrate-hardcoded-colors-moderation-remainder

- Status: `ready`
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

- [ ] `.moderation-*` and `.evidence-reference-*` surfaces resolve to `--surface`/`--surface-raised` + `--text`/`--text-muted` + `--line`; inputs have visible dark borders/focus; neon fills carry `--bg` text. Coral/`--warn` only for the report blockquote urgency accent.
- [ ] Every migrated pairing meets WCAG AA (ratios in `docs/design-refresh-2026.md` §1).
- [ ] Dead legacy landing block (`.hero`/`.nav`/`.event-card`/`.steps`/`.safety`/`.phone-card`/`.discover-button`/`.orbit`, ~lines 155–194) is removed after confirming no live reference; no visual regression on the live landing page.
- [ ] `npm run typecheck/lint/test/build --workspace @sport-date/web` pass.

## Handoff and retest log

- 2026-07-02 - Filed by experience-build-agent as the deferred, staff-only + dead-code remainder of `CX-20260702-migrate-hardcoded-colors-to-tokens`. Parent migrated all member journeys and verified (served CSS + AA ratios). Status `ready`.
