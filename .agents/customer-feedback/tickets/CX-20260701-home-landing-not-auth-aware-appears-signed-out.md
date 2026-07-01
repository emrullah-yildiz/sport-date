# CX-20260701-home-landing-not-auth-aware-appears-signed-out

- Status: `in-progress`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 5 × Confidence 5) / Effort 2 = 62. A member who believes they've been signed out and can't get back into the app is a severe trust/retention failure. Effort low (page already renders; add session awareness).
- Customer journey: re-entry / navigation / trust
- Surface: `web`
- Environment and viewport/device: dev localhost:3000, all widths
- Found by: Owner (direct feedback 2026-07-01, "after I sign in and click on home page, I am being signed out")
- Implementation owner: `Experience Build Agent`
- Related tickets: `none found`

## Customer outcome

As a signed-in member, when I go to the home page I want to see that I'm still signed in and have an obvious way back into the app, so that I trust my account is intact and can keep using it.

## What I observed

After signing in, clicking the "Sport Date" logo (which links to `/landing`) or navigating home lands on the marketing page, which shows a "Sign in" button and no signed-in state and no link into the app (`/discover`, `/profile`, `/hosting`). It is indistinguishable from being logged out. Verified in code: `landing/page.tsx` never calls `getCurrentUser` and only ever renders a `/login` CTA; the in-app nav logo points at `/landing`.

## What I expected

The session is actually intact (7-day cookie; visiting `/landing` does not clear it — confirmed: no cookie-clearing `Set-Cookie`, `SESSION_DURATION_MS = 7 days`). So home should recognize my session and show a signed-in path — e.g. "Enter Sport Date → /discover" and/or a link to my profile — instead of only "Sign in". I should never be stranded on a logged-out-looking page while actually logged in.

## Reproduction

1. Sign in. You land on `/profile`.
2. Click the "Sport Date" logo (→ `/landing`) or go to `/`.
3. Observe the marketing page with a "Sign in" button and no way back into the app; it looks like you were signed out.

Reproduction rate: `architectural — reproduces for every signed-in member (login round-trip live check blocked by IP rate limit at time of filing; cookie-persistence + non-auth-aware landing confirmed at source)`

## Customer impact

A member reasonably concludes their account logged them out or broke, and has no path back into the product from home — a direct hit to trust and retention at a moment that should be reassuring. No actual authorization/data loss (session persists), but the *perceived* loss is the harm.

## Evidence and limits

- Evidence: `landing/page.tsx` has no `getCurrentUser`, only a `/login` link; nav logos link to `/landing`; `auth.ts SESSION_DURATION_MS = 7*24h`; `session.ts` clear only on logout (expires epoch); GET `/landing` returns no clearing cookie.
- Hypotheses to verify during implementation: confirm live (with a fresh, non-rate-limited login) that the cookie persists across `/landing` and a protected page still returns 200 — then the fix is purely making home auth-aware.
- Paths not tested live: the full login→landing→protected round-trip (blocked by signup/login IP rate limit at filing time).

## Acceptance criteria

- [x] When a valid session exists, the home/landing page reflects the signed-in state and offers an obvious path into the app (e.g. "Enter Sport Date"/Discover and/or Profile) in place of (or alongside) "Sign in".
- [x] A signed-in member is never stranded: from home they can reach the app in ≤1 click.
- [x] Logged-out visitors still see the normal marketing page + "Sign in".
- [x] Consider pointing the in-app nav logo at the app home (e.g. `/discover` or `/profile`) rather than the marketing landing, so returning members stay in-app.
- [x] Session is confirmed intact across the home visit (no regression to auth); accessibility (focus, naming, 44px), on-brand, no overflow at mobile + desktop.
- [x] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback + source diagnosis (perceived logout: session intact, landing not auth-aware); status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Making `/landing` auth-aware and repointing in-app logos.
