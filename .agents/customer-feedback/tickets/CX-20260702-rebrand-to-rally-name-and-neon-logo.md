# CX-20260702-rebrand-to-rally-name-and-neon-logo

- Status: `ready`
- Severity: `high`
- Priority: `P1 high` — owner delegated the name+logo decision ("You decide", 2026-07-02). Rename the product and ship a modern neon logo, centralized so it's a one-edit change later.
- Customer journey: brand / trust (cross-cutting)
- Surface: `web`
- Environment and viewport/device: all widths + metadata/favicon/emails
- Found by: Owner (delegated 2026-07-02)
- Implementation owner: `unassigned`
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

- [ ] The product is named "Rally" everywhere member-facing (navs, metadata/title, landing, emails, error/404, favicon); no stray "Sport Date" literal remains in member-facing surfaces (grep-verified).
- [ ] Name + logo come from ONE brand module (single source of truth) so a future change is a single edit.
- [ ] A modern neon "Rally" logo/wordmark + glyph favicon; on the anthracite/neon theme; WCAG AA; focus/44px; responsive; reduced-motion safe.
- [ ] No copy claims capabilities that don't exist; legal-entity references (if any) left for the owner.
- [ ] Repository checks pass incl. production build. (No migration.)

## Handoff and retest log

- 2026-07-02 - Filed after owner delegated the name/logo decision; decision recorded (name "Rally", neon motion-mark). Status `ready`.
