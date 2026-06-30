# CX-20260630-signup-sport-cards-letter-monograms

- Status: `verified`
- Severity: `medium`
- Customer journey: Signing up — choosing the sports I play (Step 3 of 5)
- Surface: `both`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium (Playwright) 1440x900 and 390x844. Observed 2026-06-30.
- Found by: Customer Experience Agent (post-redesign visual audit)
- Implementation owner: `UI engineer (Claude Opus 4.8)`
- Related tickets: `none found`

## Customer outcome

As a new member picking my sports during sign-up, I want the sport choices to look as polished and inviting as the marketing page promised, so that the moment I commit to a profile feels finished and on-brand rather than like an unstyled prototype.

## What I observed

Observed 2026-06-30, reproduced 1/1, confirmed in source.

- On sign-up Step 3 ("What sports do you play?") each sport card shows a **grey two-letter (or one-letter) monogram** as its icon: `R` Running, `T` Tennis, `P` Padel, `F` Football, `BB` Basketball, `V` Volleyball, `BL` Bouldering, `CL` Climbing, `H` Hiking, `CY` Cycling, `SW` Swimming, `Y` Yoga, `D` Dance, `TT` Table Tennis, `BM` Badminton, `CH` Chess. (Screenshot `_signup_step3_sports__desktop.png`.)
- The public landing page presents the **same sports with full-colour emoji** (🏃 Running, 🎾 Tennis, 🏓 Padel, ⚽ Football, 🏀 Basketball, etc.) in its "From a 5K to a chess board" section. (Screenshot `_landing__desktop.png`.)
- So a visitor sees friendly emoji on the landing page, then reaches the actual signup and is shown crude letter abbreviations for the identical sports. The monograms read as placeholder art that was never finished, and they clash with the emoji language the product already uses elsewhere.

This is confirmed in `apps/web/src/components/steps/SignUpStep3.tsx`, where the `sports` array hard-codes `symbol: "R"`, `"BB"`, `"CH"`, etc., rendered into `.sport-emoji` (a class literally named for emoji).

## What I expected

The sport picker — a core, emotionally important step where I'm describing myself — should use the same warm emoji/iconography the landing page uses for the same sports, or a deliberately designed icon set, so the experience feels consistent and finished from marketing through to signup.

## Reproduction

1. Open `/signup`, advance to Step 3 ("What sports do you play?").
2. Observe each card's icon is a grey letter monogram (e.g. `BB` for Basketball, `CH` for Chess).
3. Open `/landing` and scroll to the sports section; observe the same sports shown as colour emoji.

Reproduction rate: `1/1 safe attempts`; corroborated by source.

## Customer impact

Medium. It does not block signup, but it lands at exactly the wrong moment — the step where a hesitant new member is deciding whether this product is real and worth their profile. The mismatch with the landing page's emoji makes the signup feel like a less-finished, bolted-on form, which is the precise "looks unfinished" impression the owner is trying to remove.

- Authorization/privacy/precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.

## Evidence and limits

- Evidence: screenshots `_signup_step3_sports__desktop.png` (monograms) and `_landing__desktop.png` (emoji) in the session scratchpad `qa-art/`; source `apps/web/src/components/steps/SignUpStep3.tsx`.
- Redactions made: none needed (no PII).
- Facts: signup uses text monograms; landing uses emoji for the same sport names; the CSS class is `.sport-emoji`.
- Hypotheses to verify during implementation: whether to reuse the landing emoji map or introduce a designed icon set is a design decision; custom user-added sports would also need a sensible default glyph.
- Paths or surfaces not tested: how custom-added sports (chip list) should be iconified.

## Duplicate check

- Search terms used: "sport", "emoji", "icon", "signup", "monogram", "symbol", "placeholder" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-landing-hero-reduced-motion-hydration-error.md`, `CX-20260630-new-member-empty-discovery-missing-language.md`.
- Why this is new: no existing ticket covers signup sport iconography or the marketing/signup visual inconsistency.

## Acceptance criteria

- [x] Sign-up Step 3 sport cards use the same emoji/icon language as the landing page (or a deliberately designed icon set), not raw letter monograms.
- [x] The icons stay legible and aligned at desktop (1440) and mobile (390), selected and unselected states. (verified in real Chromium 1440 + 390)
- [x] Selecting/deselecting a sport still works and the `aria-pressed`/disabled-at-limit behavior is unchanged.
- [x] Custom user-added sports get a sensible default glyph (no broken/empty icon).
- [x] No new console errors are introduced (the page is at 0 today).

Removed criteria: precise-location/data-exposure deleted — not applicable.

## Handoff and retest log

- `2026-06-30 13:39 GTBDT` - Filed by Customer Experience Agent; status `ready`. Reproduced on `/signup` Step 3 and corroborated against `/landing` and source.
- `2026-06-30 14:02 GTBDT` - Independently retested by Customer Experience Agent (real Chromium, dev DB) at 1440 and 390 from a fresh signup; status → `verified`. Sign-up Step 3 now shows full-colour emoji on every card — 🏃 Running, 🎾 Tennis, 🏓 Padel, ⚽ Football, 🏀 Basketball, 🏐 Volleyball, 🧗 Bouldering, 🧗 Climbing, 🥾 Hiking, 🚴 Cycling, 🏊 Swimming, 🧘 Yoga, 💃 Dance, 🏓 Table Tennis, 🏸 Badminton, ♟️ Chess (DOM `.sport-emoji` capture confirms these exact glyphs, no grey monograms). They match the landing "From a 5K to a chess board" section (shared `@/lib/sports` map). Emoji are legible and the cards stay aligned: desktop 3-up grid, mobile 2-up grid, no clipping/overflow; the lime selected state (Running, Tennis) keeps the emoji readable. Selection + 1–5 limit + disabled-at-limit behaviour all work. 0 console errors on the page. Evidence in `qa-art2/`: `signup_step3_sports__desktop.png`, `signup_step3_sports_selected__desktop.png`, `signup_step3_sports__mobile.png`, `landing_sports__desktop.png`. Customer outcome genuinely fixed.
- `2026-06-30 13:48 GTBDT` - Implemented by UI engineer (Claude Opus 4.8); status → `implemented`. Replaced the grey letter monograms with the landing's emoji. Created a shared single-source-of-truth map `apps/web/src/lib/sports.ts` (`SPORT_PRESETS` name→emoji + `sportEmoji()` resolver with a `DEFAULT_SPORT_EMOJI` 🤸 fallback). `SignUpStep3.tsx` now renders `SPORT_PRESETS` and the `.sport-emoji` span shows `sport.emoji` (`aria-hidden`); the landing page (`app/landing/page.tsx`) now sources its emoji from the same map via `sportEmoji(name)`, so marketing and sign-up cannot drift. Mapping used: Running 🏃, Tennis 🎾, Padel 🏓, Football ⚽, Basketball 🏀, Volleyball 🏐, Bouldering 🧗, Climbing 🧗, Hiking 🥾, Cycling 🚴, Swimming 🏊, Yoga 🧘, Dance 💃, Table Tennis 🏓, Badminton 🏸, Chess ♟️ — matches the landing's set. Custom user-added sports now also get a glyph: the custom-sport chips render `sportEmoji(name)` (default 🤸 when not a preset), so no broken/empty icon. Selection state, the 1–5 limit, `aria-pressed`, and disabled-at-limit behaviour are unchanged. Verified: `npx eslint src/` 0 problems; `npm run typecheck` green; web tests 131 passed + 12 skipped (domain 61 → 192 + 12 total); Turbopack build compiled. Legibility/alignment of the emoji cards at 1440/390 selected+unselected still wants a real-browser screenshot.
