# Experience loop — pass log

Append-only. One line per pass. Format:

`- <ISO date> | <explore|build> | <surface × lens | action> | filed/updated/verified/implemented: <ids> | note: <one line>`

---

- 2026-06-30 | init | loop infrastructure created | note: explorer + build agent + orchestration contract authored; LOOP set to running
- 2026-06-30 | build | implemented CX-20260630-moderation-route-renders-unbranded-default-404 | checks: typecheck/lint/test pass | commit 28d0139 | note: branded moderation not-found.tsx (calm staff-only page, /profile + /discover CTAs); gate unchanged; +on-brand focus ring & reduced-motion parity for shared btn-primary/secondary
- 2026-06-30 | explore | pass 1 | landing × visual hierarchy & layout | filed: CX-20260630-landing-how-it-works-steps-misleading-color-hierarchy (P3) | updated: none | verified: CX-20260630-moderation-route-renders-unbranded-default-404, CX-20260630-landing-hero-reduced-motion-hydration-error | note: retested both implemented tickets via headless Chromium (moderation branded 404 signed-in non-moderator, no leak; landing 0 hydration errors under reduced-motion, now fully static) — both pass; new finding: "How it works" 3 step cards use white/lime/ink fills that break the equal 1→2→3 reading order and misuse lime (action color) decoratively
- 2026-06-30 | build | implemented CX-20260630-discover-filter-input-placeholders-truncated | checks: typecheck/lint/test pass | commit 9f2f53f | note: shortened SPORT/LANGUAGE filter placeholders to "Any in your profile"/"Any compatible" so hints read fully at 1920/1440/1024 (kept full hint in title attr); +text-overflow:ellipsis on filter inputs as affordance for long typed values; no grid/mobile change
