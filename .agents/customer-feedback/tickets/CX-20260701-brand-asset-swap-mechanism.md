# CX-20260701-brand-asset-swap-mechanism

- Status: `implemented`
- Severity: `low`
- Priority: `P3` — (Reach 5 × Impact 2 × Confidence 4) / Effort 2 = 20. Invisible-to-members refactor / polish; no member-facing change now, but it de-risks the eventual brand decision. No safety/privacy/auth dimension.
- Customer journey: (internal foundation — enables a future brand change without member-facing churn)
- Surface: `web`
- Environment and viewport/device: all widths (no visual change expected)
- Found by: Experience & Design Explorer (owner growth-intake pass, 2026-07-01) — the buildable *mechanism* for the owner brand decision
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-owner-decision-brand-name-and-logo` (`blocked-owner` — the decision this prepares for; **do not rename** until that lands), `CX-20260701-shareable-branded-motivational-card` (should consume this module)

## Customer outcome

As a member, I want the product name and logo to be consistent everywhere and to update cleanly if the
brand ever changes, so that I never see a half-renamed app or a mismatched old/new logo. (Internally:
so a future owner-approved brand change is one edit, not fourteen.)

## What I observed

The product name "Sport Date" and the logo are rendered **inline in 14+ places** with **no centralized
brand module**. Each page nav hard-codes a `logo` link containing the literal text "Sport Date"; the
landing nav also adds a `<span className="logo-mark">S</span>` mark. The name also appears in
`apps/web/src/app/layout.tsx` metadata and per-page titles, and there's a root `favicon.ico`. A future
brand change would require touching every one of these by hand, risking a partial rename.

## What I expected

A single source of truth for brand: a small **brand module/component** (e.g. `apps/web/src/lib/brand.ts`
exporting `productName`, `productTagline`, and a `<BrandLogo />` / `<BrandWordmark />` component with the
mark + name) that every nav, the layout metadata, and future features (e.g. the shareable card) import.
Changing the name or logo in that one module updates the whole app. **This ticket performs no rename**
— it centralizes the *current* "Sport Date" name and the existing "S" mark so a future owner-approved
change (per the `blocked-owner` decision ticket) is a one-place swap.

## Reproduction

1. Grep the repo for the literal "Sport Date" and the `logo`/`logo-mark` class.
2. Observe it is duplicated across ~14 page components plus layout metadata, with no shared brand module.

Reproduction rate: `confirmed by source (14+ inline nav logos; layout.tsx metadata; no central brand module)`

## Customer impact

Practical: today, low member impact (branding is consistent by copy-paste). The value is **de-risking
the future brand change**: without this, an owner rename/logo swap is error-prone and likely to ship a
partially-renamed app (a real trust papercut). Emotional: none now. No auth/privacy/safety dimension.

- Authorization/security: no. Privacy: no. Data loss: no.

## Evidence and limits

- Evidence (source): 14+ inline nav logos — `landing/page.tsx` (adds `<span className="logo-mark">S</span>` + "Sport Date"), `discover/page.tsx`, `discover/events/[eventId]/page.tsx`, `events/new/page.tsx`, `events/[eventId]/page.tsx`, `events/[eventId]/room/page.tsx`, `hosting/page.tsx`, `hosting/error.tsx`, `hosting/loading.tsx`, `profile/page.tsx`, `safety/page.tsx`, `feedback/page.tsx`, `moderation/page.tsx`, `moderation/reports/[reportId]/page.tsx`; `app/layout.tsx` metadata ("Sport Date — Meet through movement") + per-page titles; root `app/favicon.ico`. No centralized brand module today.
- Redactions: none needed.
- Facts: name + mark are duplicated inline in 14+ places plus metadata; no shared module.
- Hypotheses to verify during implementation: whether page titles are best derived from a `productName` constant + a `titleFor(page)` helper; whether the favicon/app-icon can also reference the same source (or is documented as the one manual asset to swap); confirming no visual/DOM change results (same rendered markup/classes) so this is a pure refactor.
- Paths not tested: none (refactor; verify by snapshot/visual parity).

## Duplicate check

- Search terms used: "brand", "logo", "wordmark", "swap", "Sport Date", "logo-mark", "brand module" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260701-owner-decision-brand-name-and-logo` (the decision — not the mechanism); no existing ticket centralizes brand assets.
- Why this is new: no ticket addresses centralizing the name/logo into one module.

## Acceptance criteria

- [ ] A single brand module/component is the source of truth for the product **name** and **logo/wordmark** (and tagline), consumed by every nav that currently hard-codes them and by layout/metadata titles.
- [ ] **No rename and no logo change is performed** — the current name "Sport Date" and the existing "S" mark are centralized unchanged; the rendered output (text, classes, layout) is visually identical to before (parity verified).
- [ ] Changing the name/logo in the one module would propagate everywhere it is consumed (demonstrated by a test or a documented single-edit point); the favicon/app-icon is either driven from the same source or documented as the single remaining manual asset.
- [ ] The shareable-card feature and any future brand-dependent feature can import this module rather than hard-coding assets.
- [ ] No member-facing regression: navs, titles, and metadata render as before on web and at 375px; keyboard/focus/contrast unchanged.
- [ ] Relevant automated tests pass (lint, typecheck, build, test), including a parity/snapshot check that the refactor changed no rendered branding.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner growth-intake pass); status `ready`.
- 2026-07-02 - Experience Build Agent picked up; status `in-progress`. Found the rename-to-Rally pass (commit 83e0a36) already centralized name/wordmark/tagline/colors into `lib/brand.tsx` and wired navs/footer/layout metadata/landing/share-card to it. Remaining DoD work: document the favicon (`app/icon.svg`) as the single manual asset that mirrors the brand mark, and add a non-tautological test proving (a) components consume the brand module and (b) the favicon stays in sync with the brand tokens so drift is caught.
- 2026-07-02 - Implemented (commit `2e5dec4`). **What was centralized:** the last scattered copies of the brand *mark geometry*. Extracted the rally-arc glyph paths (arc, return, dot, stroke width) into a single exported `RALLY_GLYPH_PATHS` constant in `src/lib/brand.tsx`; both the in-app `<RallyGlyph/>` and the shareable motivational card (`lib/motivational-card.ts`) now draw from it instead of hand-copied path strings. Name/tagline/title/colors were already centralized there and consumed by navs, footer, layout metadata, landing, auth email, error chrome, and the share card. **Single documented swap point:** `src/lib/brand.tsx` carries a "HOW TO SWAP THE BRAND" block naming every knob — name/tagline (`BRAND_NAME`/`BRAND_TAGLINE`), colors (`BRAND_ACCENT`/`BRAND_TEXT`/`BRAND_BG`, kept in sync with globals.css tokens), and mark geometry (`RALLY_GLYPH_PATHS`). **To swap:** edit those constants; everything member-facing updates. The ONE remaining manual asset is `src/app/icon.svg` (favicon/app icon) — Next serves it as a raw file so it can't import the module; it hand-mirrors the mark and now carries a comment pointing back at the source of truth. **Appearance unchanged:** no rename, no logo change, no DOM/class change; the extracted glyph paths are byte-identical to the originals (test renders `<RallyGlyph/>` and asserts the exact paths). **Tests:** added `src/lib/brand.test.tsx` (16 assertions) — a non-tautology proving consumers stay in sync: it renders `<RallyGlyph/>`/`<Wordmark/>` and reads `app/icon.svg` from disk, asserting the favicon still uses `BRAND_ACCENT`/`BRAND_BG` and the exact `RALLY_GLYPH_PATHS`; a mark/color change that forgets the favicon fails CI. Existing motivational-card test still asserts the card consumes `BRAND_NAME`/`BRAND_ACCENT`. **Checks (apps/web):** typecheck ✓, lint ✓ (0 errors), test ✓ (675 pass incl. ethical-guardrails 54), production build ✓ (icon.svg serves static). No migration. Status → `implemented` (Explorer to retest).
