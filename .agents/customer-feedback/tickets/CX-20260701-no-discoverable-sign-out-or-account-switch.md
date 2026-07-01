# CX-20260701-no-discoverable-sign-out-or-account-switch

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 4 × Confidence 5) / Effort 2 = 50. Not being able to find sign-out makes members feel trapped and unsafe on a shared/family device — a trust and account-safety failure.
- Customer journey: account management / trust / re-entry
- Surface: `web`
- Environment and viewport/device: dev localhost:3000, all widths
- Found by: Owner (direct feedback 2026-07-01, "I do not see a place to sign out or switch accounts")
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-home-landing-not-auth-aware-appears-signed-out` (nav/logo behavior), `CX-20260701-remember-me-optional-persistent-login` (longer sessions make easy sign-out more important), session management (`WebSessionControls`)

## Customer outcome

As a signed-in member, I want an obvious way to sign out (and switch accounts) from anywhere in the app, so that I can protect my account — especially on a shared or borrowed device.

## What I observed

Sign-out exists only on `/profile` (the `LogoutButton` in the profile nav). Every other authenticated surface — `/discover`, `/hosting`, `/events/*`, `/events/new`, `/feedback`, `/safety` — renders a `profile-nav` with just the "Sport Date" logo and page-specific links, and **no sign-out control**. Since the in-app logo now routes to `/discover`, a member can be several clicks and non-obvious navigation away from any way to sign out. There is no account menu and no "switch account" option anywhere.

## What I expected

A consistent, discoverable account control on every signed-in surface — e.g. an account menu (or at least a visible "Sign out" plus a link to the profile) in the shared nav — reachable in ≤1 click from any page. "Switch account" should at minimum sign the member out and return them to `/login` (a full multi-account switcher can be a follow-up).

## Reproduction

1. Sign in (land on `/profile`), then go to `/discover` (or click the logo).
2. Try to sign out from `/discover` (or `/hosting`, `/events/*`).
3. There is no sign-out control — you must remember to navigate back to `/profile`.

Reproduction rate: `confirmed; LogoutButton is only referenced by profile/page.tsx`

## Customer impact

A member on a shared/family/borrowed device who cannot quickly sign out is a real safety and privacy exposure, and it erodes trust ("am I stuck logged in?"). No authorization regression, but a serious account-control discoverability gap.

## Acceptance criteria

- [ ] A signed-in member can sign out from every authenticated surface (discover, hosting, events, event room, create-event, feedback, safety, profile) in ≤1 click via a consistent, discoverable account affordance in the shared nav.
- [ ] A "switch account" affordance is present that at minimum signs out and returns to `/login` (note a true multi-account switcher as a follow-up if larger).
- [ ] The control is accessible: keyboard-reachable, screen-reader-named (e.g. an account menu with proper roles/labels), visible focus, ≥44px target; works reduced-motion; on brand; no overflow at 1280/375.
- [ ] Sign-out uses the existing `/api/auth/logout` flow and clears the session correctly (existing behavior preserved); does not weaken auth.
- [ ] Consider factoring a shared authenticated-nav/account component so future pages inherit it (avoid per-page drift).
- [ ] Repository checks pass (incl. production build).

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback + confirmed LogoutButton is only on /profile; status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `in-progress`. Factoring a shared `AccountMenu` client component (profile link + sign out + switch account) into the `profile-nav` across every authenticated surface.
- 2026-07-01 - experience-build-agent: implemented (commit 3a19549). New shared `AccountMenu` client component (accessible disclosure menu: Your profile / Switch account / Sign out) added to the `profile-nav` on /discover, /discover/events/[id], /hosting, /events/[id], /events/[id]/room, /events/new, /feedback, /safety, and /profile; retired the single-use `LogoutButton` in favour of it. Switch-account + sign-out both reuse `POST /api/auth/logout` then land on /login (true multi-account switcher noted as follow-up). Checks: typecheck + lint (0 errors) + test (305 passed, +6 new AccountMenu tests) + production build all pass. Verified against the running app as a pooled account: menu renders on /discover, /hosting, /profile, /feedback, /safety, /events/new and logout clears the session (/profile 307→/login). No migration; pushed to origin/main. Status `implemented` for independent retest. FOLLOW-UP: true multi-account switcher (keep multiple sessions and swap without re-login) — larger, deferred.
