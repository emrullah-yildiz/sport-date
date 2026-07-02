# CX-20260702-web-sessions-indistinguishable-no-device-hint-or-bulk-signout

- Status: `verified` (migration 030 applied to prod + dev 2026-07-02)
- Severity: `medium`
- Priority: `P2 medium` — (Reach 3 × Impact 4 × Confidence 4) / Effort 3 = 16 → P2. Reach 3: members who sign in from more than one browser/computer (shared laptop, work + home, a public machine) and later open Account security to tidy up — a real subset, especially the safety-conscious. Impact 4: this is a trust/security surface; when a member suspects a session on a device they no longer control, they cannot tell WHICH row is that device, so they either end the wrong one or, to be safe, must end everything one row at a time — friction at exactly the "I feel unsafe / I lost my laptop" moment. Confidence 4: observed live (17 identical rows) and confirmed in source that the `sessions` table stores no distinguishing attribute. Effort 3: needs a schema/column addition (coarse device/browser hint captured at sign-in) plus a bulk "sign out all other browsers" action — more than a CSS change. Not a hard safety floor (ending sessions already works), so P2 not P1.
- Customer journey: account & trust — reviewing and ending my signed-in browsers from Account security
- Surface: `web` (desktop + mobile; same `WebSessionControls` panel)
- Environment and viewport/device: `/profile` → "Account security · Signed-in browsers", dev server localhost:3000, Chromium at 1280. Signed in as a pooled synthetic adult. Observed 2026-07-02.
- Found by: user-simulator (account & trust journey pass)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260630-session-management-web-session-not-listed` (archived — delivered the list-and-revoke panel this ticket builds on; that ticket's scope was surfacing + single-session revoke, NOT distinguishing sessions or a bulk control), `CX-20260701-remember-me-optional-persistent-login` (archived — longer-lived sessions make the "which browser is this?" problem more likely, since revocable long sessions should be listed here). No open ticket covers session identifiability or bulk sign-out.

## Customer outcome

As a cautious adult member who has signed in from more than one place — including maybe a shared or public computer — I want to tell my signed-in browsers apart and end the ones I no longer trust in one clear action, so that when I worry a device is out of my control I can lock it out immediately without guessing which row is which.

## What I observed

The "Signed-in browsers" panel on `/profile` correctly lists my active browser sessions and lets me revoke each one (the current browser shows a "This device" badge and "Sign out this browser"; others show "End session"). But **every non-current session is labelled identically**: the only text is the generic strong label "Browser session" and a line "Signed in <date, time> · expires <date>". There is nothing else to tell them apart — no browser name, no operating system, no coarse "last active" or approximate city, no device nickname.

In this session the panel listed many active browser rows (17 in the QA pool), and beyond the single "This device" badge they were visually and semantically indistinguishable — a wall of "Browser session · Signed in <timestamp>". A member who wants to end "the session on the library computer from last Tuesday" has only the sign-in timestamp to go on, which they are unlikely to remember precisely.

There is also **no bulk control**: to end every other browser (the natural response to "I think my account is compromised" or "I forgot to sign out somewhere"), the member must click "End session" on each row individually. Confirmed in source that the `sessions` table stores only `id`, `token_hash`, `created_at`, `expires_at`, `user_id` — so today there is genuinely no attribute to distinguish sessions by, and no "sign out all other sessions" endpoint.

Not observed as broken (correct, keep): the list-and-revoke mechanics work well — revoking a session genuinely locks it out (verified in the prior session-management ticket), no token/id is exposed in the DOM, the current browser is clearly badged, the copy is calm ("End any browser session you no longer trust … without changing your password"), and revoking the current browser cleanly signs out and redirects. Not storing a fabricated device name it can't reliably derive is honest, not a bug — but a coarse, honestly-labelled hint would still help.

## What I expected

Each signed-in browser should carry at least a coarse, honest hint so I can recognise it — e.g. browser + OS family derived from the user-agent at sign-in ("Chrome on Windows"), and/or a "last active" time, presented as approximate and clearly best-effort (never precise location, never a fabricated exact device name). And there should be a single, clearly-labelled "Sign out all other browsers" action so that ending every session except the one I'm using is one confident click, not a row-by-row chore — the standard "secure my account" lever members expect from Google/Apple/etc. session screens.

## Reproduction

1. Sign in to the same account from two or more browsers/computers.
2. In any of them open `/profile` → "Account security · Signed-in browsers".
3. Observe every non-current row reads "Browser session · Signed in <timestamp> · expires <date>" with no other distinguishing detail; only the current row is badged "This device".
4. Try to identify and end one specific other device: the only differentiator is the sign-in timestamp.
5. Note there is no single control to end all other sessions at once — each must be revoked individually.

Reproduction rate: `1/1 safe attempt` (live) + source-confirmed (the `sessions` table has no device/agent/location column; no bulk-revoke endpoint exists).

## Customer impact

Practical: a member who needs to lock out a device they no longer control cannot reliably pick the right session, and must end them one at a time — precisely when speed and certainty matter most (lost/stolen device, shared computer, suspected compromise). Emotional: a security surface that you can't act on with confidence erodes the very trust it exists to build. Safety/security: indirect but real — this is the self-service lever for regaining control of an account; making it slow and ambiguous weakens it. Privacy: the fix must add only COARSE, honest signals (browser/OS family, approximate last-active) and must never introduce precise location or expose a raw token/id. No data-loss dimension. Accessibility: a bulk action and any new per-row hint must stay keyboard-operable with clear accessible names and a confirmation.

## Evidence and limits

- Evidence: live panel showed many active rows all labelled "Browser session · Signed in <timestamp> · expires <date>", one "This device" badge, per-row "End session" / "Sign out this browser" (which work). Source: `apps/web/src/components/WebSessionControls.tsx` renders only `createdAt`/`expiresAt`/`isCurrent`; `apps/web/src/lib/web-sessions.ts` `getWebSessions` selects only `id, created_at, expires_at, is_current` and the `sessions` table has no device/user-agent/location column; there is no bulk-revoke endpoint under `apps/web/src/app/api/account/web-sessions/`.
- Redactions made: session count noted but no token, id, precise location, or member data quoted; timestamps are synthetic QA data.
- Facts: sessions are distinguishable only by sign-in timestamp + the current-session badge; no bulk "end all other sessions" control exists.
- Hypotheses to verify during implementation: capture user-agent at session creation and derive a coarse "Browser on OS" label (store the derived hint, not the full UA string, to minimise data); add a "last active" timestamp (updated on use) as a friendlier anchor than sign-in time; add a single "Sign out all other browsers" action (server deletes all sessions for the user except the current token hash) with a calm confirmation; keep everything honest and coarse (no precise geolocation, no fabricated device names).
- Paths or surfaces not tested: the mobile-app device-session panel (separate `MobileSessionControls`); real cross-browser/cross-OS UA parsing; behaviour with a very large number of sessions after a bulk control exists.

## Duplicate check

- Search terms used: session, device, browser, revoke, sign out all, account security, distinguish, user-agent, last active.
- Tickets reviewed: active queue + archive session/account tickets (`session-management-web-session-not-listed`, `no-discoverable-sign-out-or-account-switch`, `remember-me-optional-persistent-login`, `login-rate-limited-state`).
- Why this is new: the archived `session-management-web-session-not-listed` ticket delivered the panel and per-session revoke; it did not address telling sessions apart or a bulk sign-out. This is an independently fixable follow-up enhancement on that surface.

## Acceptance criteria

- [ ] Each signed-in browser row carries at least one honest, coarse identifying hint beyond the sign-in timestamp (e.g. browser + OS family and/or a "last active" time), so a member can recognise a specific device; the current browser stays clearly badged.
- [ ] A single "Sign out all other browsers" (or equivalent) action ends every session except the current one in one confirmed step, with a calm confirmation and a `role="status"`/`role="alert"` announcement; the current session stays signed in.
- [ ] Revoking still genuinely locks out the ended session(s) (a revoked browser's next request redirects to `/login`), and no raw token or session id is ever rendered in the DOM.
- [ ] No precise location is introduced; any location/device hint is explicitly coarse and honest (no fabricated device names, no exact geolocation), and only minimal derived metadata is stored.
- [ ] Copy stays calm and non-alarming; the bulk action does not use fear/urgency dark patterns.
- [ ] Panel remains usable with no horizontal overflow at 375 and 1280; new controls are keyboard-operable, have accessible names, ≥44px touch targets, visible focus, and reduced-motion parity; hover affordance matches the role-coloured glow standard (destructive/red for sign-out actions).
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-simulator (account & trust journey pass); status `ready`. Live: many active browser rows indistinguishable beyond timestamp, one "This device" badge, working per-row revoke, no bulk control. Source-confirmed the `sessions` table stores no device/agent/location attribute and no bulk-revoke endpoint exists. Builds on the archived list-and-revoke ticket; self-contained (schema hint + bulk endpoint + UI). Live retest of the new hint + bulk action owed after implementation.
- 2026-07-02 - Picked up by experience-build-agent; status `in-progress`.
- 2026-07-02 - Implemented by experience-build-agent; status `implemented`. Commit `891ec8d` (local, NOT pushed — MIGRATION ADDED). Changed: added coarse device hint + coarse last-active + "This device" retained badge to the `/profile` signed-in-browsers panel (`WebSessionControls.tsx`), and a "Sign out all other browsers" bulk action (calm confirm, `role=status` success). New `lib/device-label.ts` derives a coarse "Browser on OS" label from the UA at login/register (`api/auth/login` + `api/auth/register` now store it). `lib/web-sessions.ts` selects the two new columns, adds `revokeOtherWebSessions` (deletes all-but-current; requires a valid current token or deletes nothing) and `touchWebSessionLastActive` (≈daily-throttled). New `DELETE /api/account/web-sessions` bulk endpoint (auth + same-origin/CSRF guard, scoped by user_id, never clears the current cookie). CSS: bulk controls added to `globals.css`, danger glow via shared `--glow-danger`, 44px, visible focus, reduced-motion safe. PRIVACY CHOICE: store ONLY the derived short browser+OS FAMILY label (no version/build/device-model, no raw UA, no IP, no location) + a coarse last-active; NULL for unrecognised UAs (falls back to generic "Browser session"). This is a trust affordance, not surveillance, and is too coarse to fingerprint. MIGRATION: `apps/web/db/030_session_device_hint.sql` — additive + nullable + backwards-compatible; columns read only by this opt-in panel (NULL-tolerant), not by any broadly-rendered path, so a missing column cannot cause a site-wide outage; apply to prod BEFORE serving this code. Tests added/updated: device-label parsing (coarse, no version/model/raw-UA leak, bounded length, null fallbacks); bulk revoke deletes all-but-current, never the current session, no-token => no delete; single revoke still works; auth + cross-site rejection on the bulk endpoint. Checks from `apps/web`: typecheck PASS, lint PASS (0 errors), test PASS (568 pass / 12 skipped), production build PASS. Live retest of the new hint + bulk action still owed to the Explorer.

- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. 891ec8d; migration 030 applied prod+dev). All 5 properties hold: (1) PRIVACY — device-label.ts matches only brand/family + OS-family tokens, returns "Browser on OS"/null, bounded 60, no version/build/model/IP/geo captured (curl/unknown→null; tests assert no digits/no SM-S911B/Build/AppleWebKit); migration 030 stores only device_label (CHECK len 1-60) + last_active_at, nullable/additive. (2) BULK SIGN-OUT SAFETY — revokeOtherWebSessions returns 0 before any DB call if current token hash empty; DELETE `WHERE user_id=$u AND token_hash<>$currentHash` structurally excludes the current session (full wipe impossible); route requires isTrustedBrowserMutation(403)+getCurrentUser(401)+present cookie(401) and never clears the current cookie; single-row revoke unchanged. (3) login+register INSERT matches migrated schema (device_label or NULL, last_active_at NOW()); no raw token/id in response bodies. (4) UI: "This device" badge + coarse last-active buckets (no precise time), null→"Browser session", two-step calm confirm, role=status, 44px, focus-visible, reduced-motion, bulk hover glow --glow-danger / cancel --glow-accent; no token/id text in DOM (key uses id but never rendered). (5) tests non-tautological (coarseness/disambiguation/no-leak; bulk all-but-current + no-token-no-query + empty; auth-required + cross-site 403 before DB + no-cookie 401 + cookie-never-cleared; GET lists even if last-active touch rejects). Checks the Tester ran itself: typecheck PASS, lint 0 errors, test 568 passed/12 skipped, prod build PASS. Orchestrator applied `verified` in main tree and archived.
