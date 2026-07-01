# CX-20260701-remember-me-optional-persistent-login

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 4) / Effort 2 = 24. Convenience that reduces return friction; a missing convenience, not an emergency. Because it touches auth, the security guardrails below are non-negotiable and any security regression would be P1.
- Customer journey: return visit → login → coordination (staying signed in between sessions)
- Surface: `web` (mobile-web same code path)
- Environment and viewport/device: all widths; `/login`
- Found by: Experience & Design Explorer (owner growth-intake pass, 2026-07-01) — owner-requested "convenience & retention" direction
- Implementation owner: `unassigned`
- Related tickets: `CX-20260630-session-management-web-session-not-listed` (`verified` — the session-management surface this must integrate with), `CX-20260701-login-rate-limited-state-no-recovery-guidance`

## Customer outcome

As a member who trusts my own device and returns to Sport Date often, I want to opt in to staying
signed in for longer via a "Remember me" choice at login, so that I don't have to re-authenticate
every week — while still being able to see and revoke that longer session at any time, and without it
ever being on by default (so a shared/public computer is never silently kept signed in).

## What I observed

At login there is no "Remember me" option. Web sessions currently last a fixed 7 days
(`SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000` in `apps/web/src/lib/auth.ts`) with no member choice.
A frequent returning member must sign in again after expiry with no way to opt into a longer-lived
session; there is no per-member control over session lifetime.

## What I expected

An **opt-in** "Remember me" checkbox at login, **OFF by default**. When a member checks it, the created
session gets a longer expiry (e.g. ~30 days) instead of the default; when unchecked, behavior is exactly
as today. The longer session is a normal, **revocable** web session that appears in the existing
"Signed-in browsers" panel (`WebSessionControls`) and can be ended there. The cookie keeps the same
security posture — `httpOnly`, `secure` in production, `sameSite`, server-side hashed token — with the
*only* difference being the expiry, and only on opt-in.

## Reproduction

1. Go to `/login`.
2. Observe there is no "Remember me" option; sessions are a fixed 7-day length with no choice.

Reproduction rate: `confirmed by source (apps/web/src/app/api/auth/login/route.ts, lib/auth.ts, lib/session.ts)`

## Customer impact

Practical: frequent members re-authenticate more often than they need to on their own trusted devices,
adding return friction. Emotional: small repeated papercut on the return journey. Because it touches
authentication, this ticket is **security-sensitive**: it must not weaken auth, must default to the
shorter session (protecting shared/public devices), and must keep the longer session fully revocable.

- Authorization/security: yes — session lifetime. Guardrails below are binding; a longer default or a
  weakened cookie would be a P1 regression.
- Privacy: indirect. Data loss: no.

## Evidence and limits

- Evidence (source):
  - `apps/web/src/lib/auth.ts` — `createSession()` returns `expiresAt = now + SESSION_DURATION_MS` (7 days), fixed.
  - `apps/web/src/lib/session.ts` — `setSessionCookie(response, session)` sets `httpOnly`, `secure` (prod), `sameSite: "lax"`, `expires: session.expiresAt`; `AUTH_COOKIE_NAME = "auth_token"`.
  - `apps/web/src/app/api/auth/login/route.ts` — verifies password, `createSession()`, `INSERT INTO sessions (...) VALUES (..., expires_at)`, `setSessionCookie`.
  - `apps/web/src/lib/web-sessions.ts` + `apps/web/src/components/WebSessionControls.tsx` — the existing list/revoke surface a remembered session must show up in and be revocable from (it already lists active sessions by `expiresAt`, so a longer session surfaces automatically).
- Redactions: none needed (no PII).
- Facts: no "Remember me" exists; fixed 7-day expiry; cookie is already httpOnly/secure/sameSite; a revocable web-session list already exists.
- Hypotheses to verify during implementation: exact "remember" duration (recommend ~30 days — confirm with owner if a longer window is wanted); whether the login form is a server action or `POST /api/auth/login` (thread the boolean through whichever it is); whether cookie `maxAge`/`expires` must be widened in the same opt-in branch so the browser retains the cookie for the longer window.
- Paths not tested: native/mobile app login (out of scope; this is the web session path).

## Duplicate check

- Search terms used: "remember me", "remember", "session duration", "expiry", "persistent", "stay signed in", "SESSION_DURATION" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-session-management-web-session-not-listed` (adds the list/revoke panel — complementary, not this), `CX-20260701-login-rate-limited-state-no-recovery-guidance` (login recovery, unrelated).
- Why this is new: no existing ticket introduces an opt-in longer-lived login session; this depends on the shipped session-management panel but is a distinct feature.

## Acceptance criteria

- [ ] A member sees a clearly-labeled "Remember me" (or "Keep me signed in on this device") control at `/login` that is **unchecked/OFF by default**.
- [ ] Leaving it unchecked produces exactly today's behavior (default ~7-day session); checking it produces a **longer** session expiry (e.g. ~30 days) — the *only* difference is the expiry window.
- [ ] The remembered session is **listed** in the existing "Signed-in browsers" panel and can be **revoked** there; revoking it signs that browser out on its next request, same as any other session.
- [ ] The auth cookie remains `httpOnly`, `secure` (in production), `sameSite`, with a server-side hashed token; no token/id is exposed to client JS; opt-in never downgrades any of these attributes.
- [ ] Copy is honest and host-like: it tells the member this keeps them signed in longer *on this device* and reminds them not to use it on shared/public computers; it does not overclaim security.
- [ ] Keyboard operable and screen-reader labeled (real checkbox with a `<label>`), visible focus, 44px target; layout usable at 375px and desktop; reduced-motion unaffected.
- [ ] Automated tests cover: default-off yields the short expiry; opt-in yields the long expiry; cookie attributes unchanged in both branches; remembered session appears in `getWebSessions` and is revocable; and a regression test asserting the default is never the long duration.
- [ ] Relevant repository checks pass (lint, typecheck, build, test).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner growth-intake pass); status `ready`.
