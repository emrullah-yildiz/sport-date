# CX-20260630-session-management-web-session-not-listed

- Status: `verified`
- Severity: `medium`
- Customer journey: Account security — reviewing and signing out my signed-in devices/sessions from the profile
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium (Playwright) 1280x900 and 390x844. Observed 2026-06-30.
- Found by: Customer Experience Agent (full end-to-end workflow pass, `apps/web/qa/full-flows.mjs`)
- Implementation owner: `Claude Opus 4.8 (1M context)`
- Related tickets: `none found`

## Customer outcome

As a cautious adult who signs in to Sport Date from a web browser, I want to see the sessions that currently have access to my account and be able to sign out a session I no longer trust (for example, a shared or public computer), so that I can recover control of my account without changing my password or contacting support.

## What I observed

Observed 2026-06-30, reproduced 2/2 (desktop 1280 and mobile 390), confirmed against the component source.

- On my profile there is an "Account security — Signed-in mobile devices" panel. While I am signed in *in this very browser*, it reads: "Review native sessions without exposing their access or refresh credentials." and then "No mobile device sessions yet." (Screenshot `04-sessions-web.png`.)
- There is nothing to review and no "Revoke" control, because the panel only lists **native/mobile app device sessions**. My current **web/browser session is invisible here and cannot be revoked** from this surface.
- The only session-ending control available to a web member is the top-of-page "Sign out" button, which ends *this* browser's session — it does not let me see or end a session on another browser/computer.
- The panel's own heading ("Signed-in mobile devices") and body ("Review native sessions") are honest about being mobile-only, but the surrounding hero copy promises "live controls for ... device sessions," which a web-only member reasonably reads as "all my sessions."

## What I expected

A signed-in web member should be able to see their active web session(s) listed in the same "Account security" panel and revoke any session other than (or including) the current one, with a clear confirmation. At minimum, when there are no mobile sessions, the panel should explain that web sessions are managed separately (and how), rather than showing an empty "No mobile device sessions yet" state that reads as "you have no active sessions" while the member is plainly signed in.

## Reproduction

1. Register or sign in as a web member and land on `/profile`.
2. Scroll to "Account security — Signed-in mobile devices".
3. Observe "No mobile device sessions yet" with no list and no revoke control, despite being actively signed in on the web.

Reproduction rate: `2/2 safe attempts`

## Customer impact

Practical: a web member who used a shared/public computer, or who suspects their session is compromised, has no self-service way to view or end that session from the account-security surface; their only lever is the local "Sign out" (which they may not have access to on the other machine) or a full password change. Emotional: the empty "no sessions" state during an active session is confusing and slightly undermines trust in the security tooling.

- Authorization/security: yes — this is about session lifecycle and the member's ability to revoke access. It is not a leak (no credentials are exposed; the mobile panel is explicitly redacted), but it is a missing recovery control on the web surface.
- Privacy: indirect (no precise location or sensitive data exposed by this gap).
- Data loss: no.

## Evidence and limits

- Evidence: screenshot `04-sessions-web.png` (redacted; profile of a synthetic `qa+...@sport-date.invalid` adult). Component: `apps/web/src/components/MobileSessionControls.tsx` (fetches `/api/account/mobile-sessions`, lists only native device sessions).
- Redactions made: synthetic email only; no real PII, tokens, or precise locations.
- Facts: the panel queries mobile/native sessions and shows "No mobile device sessions yet" for a web member; no web-session listing or revoke exists on this surface; logout ends only the current browser session.
- Hypotheses to verify during implementation: whether a per-session web-session model exists server-side to surface; whether the intended design is "web sessions are managed only via logout / password reset" (in which case the fix is copy/guidance, not a new list).
- Paths or surfaces not tested: revoking an actual *mobile* session (no native client available in this environment); multi-browser web-session revocation (no web-session list exists to exercise).

## Duplicate check

- Search terms used: "session", "device", "mobile-sessions", "revoke", "account security" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: landing-hero-reduced-motion, native-date-inputs, native-select-dropdowns, new-member-empty-discovery-missing-language, signup-sport-cards-letter-monograms.
- Why this is new: no existing ticket concerns session/device management or the web-session revocation gap.

## Acceptance criteria

- [x] A signed-in web member can see at least their current web session in the "Account security" panel (or is clearly told, without internal terminology, that web sessions are ended by signing out / resetting the password and why).
- [x] If web sessions are listed, the member can revoke a session and sees a confirmation; a revoked session can no longer access the account.
- [x] The empty state no longer implies "you have no active sessions" while the member is signed in.
- [x] The mobile and web layouts of the panel remain usable (verified at 390px and desktop). _(Customer-retested 2026-06-30: panel renders cleanly at 1280px and 390px with no horizontal overflow; "This device" badge, sign-out, and per-session "End session" controls all visible and usable.)_
- [x] Keyboard, screen-reader naming, and focus are correct for any new list/revoke controls.
- [x] No access or refresh credentials are exposed for any session.
- [x] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-06-30` - Filed by Customer Experience Agent; status `ready`.
- `2026-06-30` - Implemented by Claude Opus 4.8 (1M context). Status → `implemented`.
  - Built a web-session lib (`apps/web/src/lib/web-sessions.ts`): `getWebSessions(userId, currentToken?)` lists the member's ACTIVE (not-expired) rows from `sessions` returning only safe metadata — `id`, `createdAt`, `expiresAt`, `isCurrent`. It never selects or returns `token_hash`. `isCurrent` is computed server-side by hashing the request's auth cookie (`hashSessionToken`) and matching `token_hash` in SQL; the raw token never leaves the function and is never returned. `revokeWebSession(userId, sessionId, currentToken?)` hard-`DELETE`s the row scoped to `id = ... AND user_id = ${userId}` (own-sessions-only authorization), and returns `wasCurrent` so the caller can sign the member out.
  - Added API under `apps/web/src/app/api/account/web-sessions/`: `GET` (auth-gated list, `Cache-Control: no-store`) and `[id]` `DELETE` (revoke by UUID). DELETE mirrors the other account mutations: `isTrustedBrowserMutation` CSRF guard, `getCurrentUser` auth, UUID validation, 404 for a non-owned/missing id. Revoking the CURRENT session clears the `auth_token` cookie (`clearSessionCookie`) and returns `{ signedOut: true }` so the client redirects to `/login`.
  - UI: new `WebSessionControls` ("Signed-in browsers" panel) added to `/profile` above the mobile panel — lists this browser + others with sign-in/expiry dates, a "This device" badge, accessible per-row revoke buttons (`aria-label`, disabled-while-pending), a calm only-browser empty state, and a `role="status"` message. Revoking the current browser shows a calm confirmation then redirects to sign in. No tokens/ids are rendered.
  - Fixed the mislabel: the mobile panel's empty state now reads "No Sport Date mobile app is signed in to your account. Your browser sessions are managed above." instead of "No mobile device sessions yet." Mobile UI/behaviour otherwise unchanged.
  - Tests (DB mocked): `web-sessions.test.ts` (list returns only safe metadata + no token, isCurrent matched by hashed cookie, user/active scoping, revoke deletes scoped to owner, wasCurrent signal, not-revoked for another user's id) and route tests for `GET` (401, isCurrent, no token, no-store) and `[id] DELETE` (CSRF 403, 401, malformed-id 404, own-session revoke, non-owner 404, current-session sign-out clears cookie). 13 new tests.
  - Checks: `npx eslint src/` → 0; `npm run typecheck` → green; `npm test` → 144 passed / 12 skipped (3 new files, 13 new tests); `npm run build --workspace @sport-date/web` → compiled on Turbopack with both routes registered.
  - Left for QA retest: real-browser flow (log in → see this session → revoke another → it's gone → revoke current → signed out) and the 390px/desktop visual check.
- `2026-06-30 18:11 GTBDT` - Independently retested by Customer Experience Agent (QA owner) on the real dev server (`http://localhost:3000`, dev Neon branch, Chromium/Playwright). Status → `verified`. All five web-session checks PASS on a synthetic `qa+websess-...@sport-date.invalid` adult:
  1. **This-session listing** — After registering/landing on `/profile`, the new "Signed-in browsers" panel lists exactly this session with a "This device" badge and a "Signed in … · expires …" line. DOM scan of the panel HTML found NO uuid-like or 32+ hex-char token/id (`uuidInDom=false longHexInDom=false`). PASS.
  2. **Second session appears** — Logging in as the same member in a second browser context, then reloading context 1's panel, shows 2 rows with exactly one "This device" badge. PASS.
  3. **Revoke the OTHER (non-current) session — core security promise** — From context 1, ending the non-current row drops the panel to 1 row (still "This device"), and context 2's very next request to `/profile` redirects to `/login` (`ctx2 url after revoke = …/login`). The revoked session is genuinely locked out, not merely hidden. PASS.
  4. **Revoke the current session ("Sign out this browser")** — From context 1, signing out this browser shows a calm "This browser has been signed out. Redirecting to sign in…" message and redirects to `/login`; the auth cookie is cleared (a subsequent `/profile` request still lands on `/login`). PASS.
  5. **Mobile 390px + mislabel fix** — At 390px the web panel is usable with no horizontal overflow, and the mobile-session panel's empty state now reads "No Sport Date mobile app is signed in to your account. Your browser sessions are managed above." — the old misleading "No mobile device sessions yet." is gone. PASS.
  - Console/page/server signal: 0 console errors, 0 uncaught page errors, 0 HTTP ≥500 across all profile loads in the retest. Regression pass of the 10 core workflows (`apps/web/qa/full-flows.mjs`) returned 0 defects / 24 strengths / 0 console errors. Evidence: screenshots `01..06-*` in the QA retest scratchpad dir (redacted; synthetic adult only). All acceptance criteria now pass on the web surface (mobile-native revocation remains untestable without a native client, as originally noted).
