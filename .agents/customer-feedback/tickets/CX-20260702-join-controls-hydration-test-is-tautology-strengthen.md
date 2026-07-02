# CX-20260702-join-controls-hydration-test-is-tautology-strengthen

- Status: `implemented`
- Severity: `low`
- Priority: `P3` — (Reach 2 × Impact 2 × Confidence 5) / Effort 2 = 10. Test-quality/regression-safety only; no member-facing impact. The reduced-motion hydration bug itself is fixed and verified (`ada3e8d`); this hardens the guard so a future reintroduction is actually caught.
- Customer journey: n/a (engineering test coverage)
- Surface: `web` — `apps/web/src/components/JoinRequestControls.test.tsx`
- Found by: Tester (four-agent loop) while verifying `CX-20260702-join-controls-reduced-motion-hydration-mismatch`, 2026-07-02
- Related tickets: `CX-20260702-join-controls-reduced-motion-hydration-mismatch` (verified/archived — the real fix this test is meant to guard)

## What I observed

The regression test added with the hydration fix (`JoinRequestControls.test.tsx`) uses `renderToStaticMarkup` and asserts the server pass emits no motion inline `transform`/`opacity`. The Tester demonstrated it is effectively a **tautology in the vitest/jsdom environment**: forcing the motion branch back on (simulating the un-fixed bug) still passes, because under jsdom `useReducedMotion()` is falsy and framer-motion v12 inside `AnimatePresence initial={false}` emits no inline `opacity`/`transform` on first mount regardless of the `mounted` gate. So the assertion cannot fail on a real regression of this component.

(The Tester confirmed framer-motion CAN emit such styles in isolation — a bare `motion.div` reduced-motion variant → `style="opacity:1"`; inside `AnimatePresence initial={false}` → `style="opacity:1;transform:none"`, the exact reported mismatch string — but the component's actual full-variant path doesn't trip the current assertions in this env.)

## What I expected

A regression test that would actually FAIL if the `mounted`/`useSyncExternalStore` gate were removed (i.e. if the pre-mount plain-`<div>` branch were reverted to rendering the `motion.div` on the server pass).

## Acceptance criteria

- [ ] The test fails when the mount-gate is removed (bug reintroduced) and passes with the fix in place — verified by temporarily reverting the gate locally.
- [ ] Approach options (implementer's call): assert the pre-mount `Panel` branch renders a plain `<div>` with no motion props directly (unit-test the branch), OR mock `matchMedia`/`useReducedMotion` to force the reduced-motion motion path so a missing gate would emit `opacity`/`transform` and be caught, OR assert on the mounted-vs-unmounted render difference.
- [ ] No change to app behaviour; repository checks pass.

## Duplicate check

- Search terms: `JoinRequestControls.test`, `renderToStaticMarkup`, hydration test, tautology.
- Tickets reviewed: the hydration fix ticket (verified) — this is its explicitly-recommended test-strengthening follow-up, not a re-report of the bug.

## Handoff and retest log

- 2026-07-02 - Filed by the Tester as a non-blocking follow-up while verifying the hydration fix (which is sound); status `ready`.
- 2026-07-02 - Builder implemented (`55f6197`). WHAT WAS TAUTOLOGICAL: the two `not.toMatch(transform|opacity)` assertions on the `renderToStaticMarkup` output gave false confidence — (a) a "no motion inline style" assertion can't tell "the mount gate works" from "framer-motion happened to emit nothing here", and (b) under the vitest `node` environment `useReducedMotion()` is falsy, so the reduced-motion `panelMotion` branch — the exact setting the mismatch was reported under — was never exercised. HOW STRENGTHENED: added (1) a positive control that renders the ungated `motion.div` on the same server path and asserts it DOES emit `opacity`/`transform` inline style in both motion settings (so the "no style" assertions are demonstrably fallible, not vacuous); (2) a `vi.mock` of `framer-motion.useReducedMotion` to drive the reduced-motion branch and assert the gated server render stays plain; (3) a byte-identical-across-motion-settings assertion — a direct statement of the gate's guarantee that SSR is motion-independent. MUTATION THAT NOW FAILS IT: reverting the `mounted` gate in `Panel` (so it renders `motion.div` on the server pass) fails 4 of the 5 tests — including the reduced-motion and byte-identical cases the old test lacked; verified locally by disabling the gate then restoring. Test-only change; `JoinRequestControls` behaviour untouched (confirmed no component diff). Checks: typecheck green, lint 0 errors, vitest 711 passed / 12 skipped (incl ethical-guardrails), next production build compiled + 56 pages generated. No migration; pushed to origin/main. Status `implemented` for independent Tester retest.
