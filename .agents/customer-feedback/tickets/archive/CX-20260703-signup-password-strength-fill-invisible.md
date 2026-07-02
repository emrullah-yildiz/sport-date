# CX-20260703-signup-password-strength-fill-invisible

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — RICE (9 × 1.4 × 0.95) / 0.4 = 30. Reach 9 (every new member who types a password on signup step 1 sees the meter render), Impact 1.4 (a broken feedback element: the bar never fills, so the only working signal is the text word — mild confusion + an unfinished feel at a trust moment), Confidence 0.95 (the missing `background` is confirmed in CSS; nothing else colors the element), Effort 0.4 (one CSS declaration; optional strength-keyed color a few more). Not safety/privacy/auth-gated.
- Customer journey: Signing up — a first-time member sets a password on step 1 of the 5-step wizard and looks at the strength meter.
- Surface: `web` (all viewports)
- Environment and viewport/device: Source audit of `apps/web/src/components/steps/SignUpStep1.tsx` and `apps/web/src/app/globals.css`. Observed 2026-07-03.
- Found by: Experience & Design Explorer (signup × visual feedback)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a first-time member choosing a password, I want the strength meter's bar to visibly fill as my password gets stronger so that I get clear, at-a-glance feedback that the field is working and my password is strong enough.

## What I observed

Step 1 renders a password-strength meter with a track, a fill bar, and a text label:

- `apps/web/src/components/steps/SignUpStep1.tsx:32` — `<div className="strength-bar"><div className="strength-fill" style={{ width: \`${passwordStrength * 25}%\` }} /></div>` plus `<p className="strength-text">…</p>`.

The fill bar has **no color**. In CSS:

- `apps/web/src/app/globals.css:481` — `.strength-bar { height: 4px; background: var(--surface-raised); … }` (the track is `--surface-raised`).
- `apps/web/src/app/globals.css:483` — `.strength-fill { height: 100%; transition: width 300ms ease; }` — height + transition only, **no `background`**, and nothing else in the file targets `.strength-fill` (the JSX sets only inline `width`).

Because the fill has no fill color, it is the same as the empty space over the track: the bar reads as a permanently empty 4px track whose width change is invisible. The only feedback that actually renders is the word ("Very weak" … "Strong"). The visible bar — the primary affordance of a strength meter — communicates nothing.

Separately, `.strength-fill` animates `width 300ms ease` (`globals.css:483`) with no `prefers-reduced-motion` guard, unlike the sibling motion rules throughout this file.

## What I expected

The strength fill should render a visible color against the track and grow as strength increases, giving immediate visual feedback; the width animation should be suppressed under reduced motion, consistent with the rest of the stylesheet.

## Reproduction

1. Open `/signup`, step 1.
2. Type into the Password field (e.g. `abc`, then `Abcdefgh1234`).
3. Watch the strength meter: the text label changes, but the bar shows no visible colored fill at any strength.

Reproduction rate: `n/a (static source audit)` — deterministic from the CSS above (`.strength-fill` has no `background`).

## Customer impact

Cosmetic + comprehension: a broken-looking meter at a trust-sensitive moment (setting the password for a new account). No member is blocked — the text label and the min-length validation still work — but the primary visual signal is dead. No authorization, privacy, precise-location, safety, or data-loss dimension.

## Evidence and limits

- Evidence: `SignUpStep1.tsx:32` (fill sets only inline `width`); `globals.css:481` (track color), `globals.css:483` (`.strength-fill` with no `background`); repo-wide grep for `strength-fill` returns only these two sites.
- Redactions made: none (no PII; password values are illustrative).
- Facts:
  - `.strength-fill` has no background/gradient in CSS and no inline color in the JSX.
  - The track (`.strength-bar`) is `--surface-raised`, so a transparent fill is indistinguishable from the empty track.
  - The width transition has no reduced-motion guard.
- Hypotheses to verify during implementation: whether an earlier design intended a strength-keyed color (e.g. warn → accent). Minimum fix is a single visible fill color from a token; a strength-keyed ramp is an optional enhancement and must use existing tokens (this is a password meter, not a rating/score — do not introduce any popularity/attractiveness semantics).
- Paths or surfaces not tested: whether assistive tech should also expose strength (the meter has no ARIA role today — out of scope for this fill-visibility fix; the text label remains).

## Duplicate check

- Search terms used: "strength", "password", "strength-fill", "signup", "reduced-motion" across `.agents/customer-feedback/tickets/*.md` and `…/archive/*.md`.
- Tickets reviewed: `CX-20260703-reset-password-requirements-hidden-until-error.md` (reset-password requirements copy, different surface + concern), `CX-20260630-signup-redundant-double-headline-weak-focal-point.md`, `CX-20260630-signup-sport-cards-letter-monograms.md` (signup, different elements).
- Why this is new: no existing or archived ticket covers the password-strength meter fill having no color.

## Acceptance criteria

- [ ] At any strength ≥ 1, the strength fill renders a visible color against the `--surface-raised` track (the bar is no longer indistinguishable from an empty track), using existing tokens only.
- [ ] The fill width still reflects the four-factor strength (0–100%) and updates as the password changes.
- [ ] The `width` transition is disabled under `prefers-reduced-motion: reduce`, consistent with the other motion guards in `globals.css`.
- [ ] The text label ("Very weak"…"Strong") remains, and any fill color used meets AA contrast against the track.
- [ ] No rating/score/popularity semantics are introduced — the color communicates password strength only.
- [ ] The interface explains what happened without internal terminology. — n/a (no error state).
- [ ] Loading, empty, failure, retry behavior. — n/a (client-side meter).
- [ ] Mobile and web layouts remain usable. — verify the 4px bar renders identically at 375px.
- [ ] No precise location or other sensitive data is exposed. — n/a.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; gave `.strength-fill` a single on-brand `background: var(--accent)` (green ~7.3:1 vs the `--surface-raised` track — well past AA for a UI element) so the bar now fills proportionally to the inline width; color reinforces but is not the sole signal (the `.strength-text` word stays). Added `@media (prefers-reduced-motion: reduce) { .strength-fill { transition: none; } }` guard, matching sibling motion rules. No JSX/class changes (strength is inline width only; no per-level class, so single fill per ticket guidance — no rating/gamified semantics). Checks: typecheck ✓, lint ✓ (0 errors; only the 2 pre-existing warnings in qa/full-flows.mjs + member-profile.test.ts), test ✓ (755 passed / 12 skipped), production build ✓. Not driven in a live dev server this pass. status `implemented`.
- 2026-07-03 - Independently verified by orchestrator (source + repo checks): `.strength-fill` now has `background: var(--accent)` (globals.css:487) so the meter visibly fills proportionally to the inline `width` (SignUpStep1 `passwordStrength*25%`); accent #3BEA7E on track #313A41 ≈ 7.3:1, well above the 3:1 non-text-UI AA floor; the `.strength-text` word is untouched so colour is not the sole signal; the width transition is guarded under `@media (prefers-reduced-motion: reduce)` (globals.css:489), matching sibling reduced-motion rules; non-gamified single fill (no per-level rating semantics). typecheck/lint/755 tests/prod build pass (commit 3aaa5d6). Status `verified`.
