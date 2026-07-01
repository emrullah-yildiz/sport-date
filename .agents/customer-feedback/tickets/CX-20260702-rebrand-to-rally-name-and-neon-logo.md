# CX-20260702-rebrand-to-rally-name-and-neon-logo

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — owner delegated the name+logo decision ("You decide", 2026-07-02). Rename the product and ship a modern neon logo, centralized so it's a one-edit change later.
- Customer journey: brand / trust (cross-cutting)
- Surface: `web`
- Environment and viewport/device: all widths + metadata/favicon/emails
- Found by: Owner (delegated 2026-07-02)
- Implementation owner: `experience-build-agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-owner-decision-brand-name-and-logo` (decision — now made), `CX-20260701-brand-asset-swap-mechanism`, `CX-20260701-shareable-branded-motivational-card`, `docs/marketing/brand-refresh-proposal.md`, `docs/design-refresh-2026.md`

## Decision (made by the assistant under owner delegation)

- **Name = "Rally."** Rationale: energetic, memorable, sport-native (a rally = a tennis exchange AND people gathering), movement-first, NOT romance-locked (includes dating/friendship/group equally), fits the anthracite+neon energetic direction. Runner-up: "Meetmove" (more ownable/lower-collision) — kept on record if the owner wants to switch.
- **Trademark caveat (owner/legal):** "Rally" has real collision risk. A clearance check is required before any paid launch / external accounts — that is owner + qualified-counsel territory, not an agent action. The brand module below makes a later name change a single edit, so this is low-risk to adopt now for the beta.
- **Logo = neon "motion mark":** a compact rally-arc glyph in `--accent` neon green (`#3BEA7E`) + a bold compact "Rally" wordmark in `--text` on anthracite; glyph doubles as favicon/app icon. Static (reduced-motion safe).

## Implementation

- Create a single **brand module** (e.g. `packages/domain` or `apps/web/src/lib/brand.ts` + a `Brand`/`Logo` component) exporting the product NAME and the LOGO/wordmark (inline SVG). This is the single source of truth.
- Replace every hardcoded "Sport Date" string + the old logo/wordmark across the app with the brand module: all page navs (~14 sites), `layout.tsx` metadata `title`/template, the landing hero, auth/email content (`auth-email-content.ts`), the global-error page, the calm 404s, and any `favicon`. Verify with a grep that no stray "Sport Date" literal remains in member-facing surfaces (legal text may reference the legal entity separately — leave legal-entity names to the owner).
- New favicon/app icon from the glyph.
- On brand: neon green primary mark on anthracite; ensure WCAG AA; visible focus on the logo link; 44px target; responsive; reduced-motion safe.

## Acceptance criteria

- [x] The product is named "Rally" everywhere member-facing (navs, metadata/title, landing, emails, error/404, favicon); no stray "Sport Date" literal remains in member-facing surfaces (grep-verified).
- [x] Name + logo come from ONE brand module (`apps/web/src/lib/brand.tsx`) so a future change is a single edit.
- [x] A modern neon "Rally" logo/wordmark + glyph favicon (`icon.svg`); on the anthracite/neon theme; neon green (#3BEA7E) AA on anthracite; visible focus + 44px target on the logo link; responsive; static (reduced-motion safe).
- [x] No copy claims capabilities that don't exist; legal-entity references left for the owner (product name shown to members is "Rally").
- [x] Repository checks pass incl. production build. (No migration.)

## Handoff and retest log

- 2026-07-02 - Filed after owner delegated the name/logo decision; decision recorded (name "Rally", neon motion-mark). Status `ready`.
- 2026-07-02 - experience-build-agent picked up, set `in-progress`, recorded as implementation owner. Implementing single brand module + component and sweeping all member-facing "Sport Date" literals.
- 2026-07-02 - Implemented (commit `83e0a36`, pushed to origin/main). Added `apps/web/src/lib/brand.tsx` as the single source of truth (`BRAND_NAME="Rally"`, `BRAND_TITLE`, `BRAND_TAGLINE`, colors, static reduced-motion-safe `RallyGlyph` + `Wordmark` with a glyph-only/decorative variant). Swept every member-facing "Sport Date" literal → Rally across all page navs (discover/discover-event/profile/safety/feedback/hosting/hosting-loading/hosting-error/events-new/event-detail/room/moderation), landing hero+footer wordmark, `layout.tsx` metadata (title default + `%s — Rally` template), auth email content (`auth-email-content.ts`), global-error + moderation 404, legal/guideline/research pages, Plus billing surface + billing API error copy, and misc components. New neon glyph favicon at `apps/web/src/app/icon.svg` (replaces `favicon.ico`). Logo link: visible focus ring, 44px target, accessible name; neon green (#3BEA7E) on anthracite meets AA; static/reduced-motion safe. Updated tests asserting the old name. Grep confirms no stray member-facing "Sport Date" literal remains (only the brand module's own doc comment references the former name). Checks: typecheck PASS, lint PASS (0 errors), test PASS (400), production `npm run build` PASS. Verified on dev :3000 logged in as pooled host-A — landing/discover/profile nav/title read "Rally", favicon serves the neon glyph. No migration. Ready for independent retest. Legal-entity naming intentionally left to owner.
