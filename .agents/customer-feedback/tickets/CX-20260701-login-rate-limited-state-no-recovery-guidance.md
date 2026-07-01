# CX-20260701-login-rate-limited-state-no-recovery-guidance

- Status: `ready`
- Severity: `high`
- Priority: `P1 high` — (Reach 4 × Impact 3 × Confidence 5) / Effort 2 = 30. Reach is broad: any member who mistypes their password a few times, and — because the browser-auth limit is **10 attempts / 15 min per IP** (`rate-limit.ts:292`) — members who share a public IP (office, campus, café, CGNAT mobile carrier) can collectively trip it and lock each other out of *signing in at all*. Impact is a confused member stuck at the front door with no timeline and no clear next step; Confidence is direct live observation. Effort is small (surface the `retry-after` the API already returns, disable the button during the cool-down, point at recovery). This is a **recovery / lockout dead-end on the entry journey** (a member cannot re-enter or is not told how), which the journey standard treats as first-class — hence P1 despite not being an auth/privacy floor. Not a security regression (the limit itself is correct and stays).
- Customer journey: coordination / re-entry (a returning member signing in) — specifically the rejection + recovery states of login
- Surface: `web` (desktop + mobile; same component)
- Environment and viewport/device: `/login`, live dev server localhost:3000, real Chromium at 1280×860 and 375×860. Observed 2026-07-01. The 429 state was reproduced live (the shared browser-auth IP window was exhausted, so a submit returned the real rate-limited response); the wrong-credentials and success states were read from source.
- Found by: experience-design-explorer (login × completeness-of-states pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (the `window.location`-style hard navigation anti-pattern, fixed there for join/commitment; login success still uses `window.location.assign` — noted here as a secondary observation, not the primary fix), `CX-20260630-signup-redundant-double-headline-weak-focal-point` (adjacent auth surface, different lens). No existing ticket covers login state coverage or the rate-limited recovery state.

## Customer outcome

As a returning member who just failed to sign in a few times (or who is on a shared/office/mobile-carrier IP that hit the limit for me), I want the app to tell me clearly *what happened, how long I have to wait, and what I can do right now to recover* — so I am not stranded at the front door re-clicking a button that silently keeps failing and, worse, keeps extending my own lockout.

## What I observed

Walking the login journey's states (`LoginForm.tsx` + `api/auth/login/route.ts` + `rate-limit.ts`), the ordinary states are handled but the **rate-limited / lockout recovery state is a dead-end**:

1. **The rate-limited message gives no duration and no recovery route.** After too many attempts the form shows, in a correct `role="alert"`: *"Too many login attempts. Please wait before trying again."* (captured live at 1280 and 375px). The member is told to wait but not *how long*. The API actually **knows** the exact wait — `enforceRateLimit` sets a `retry-after` header (I measured `retry-after: 518` — ~8.6 min — on a sibling auth call this pass), but `LoginForm`'s `fetch` reads only `result.error` and discards the header, so the precise, reassuring "try again in about 9 minutes" is thrown away.

2. **The "Sign in" button stays enabled during the lockout.** After the 429, `submitDisabled = false` — the button re-enables immediately. A stuck member's natural move is to click again; each click is another failed request that (because the limiter bumps the window on every attempt) can *push the reset further out*. The UI actively invites the member to worsen their own lockout.

3. **The one useful recovery — "Forgot your password?" — is not surfaced in the error.** It exists lower in the card (good), but when the member is failing on the password the error block doesn't point them to it. For a rate-limited member, resetting the password is often the fastest real path back in (and it runs on a *separate* limiter), yet the lockout copy is silent about it.

4. **Secondary (same journey, not the primary fix): success is a hard navigation with no confirmation.** On 200 the form calls `window.location.assign("/profile")` — a full-document navigation (blank flash), the same hard-reload pattern the join-commitment ticket just moved away from elsewhere. There's no persisted "Signing you in…" success state through the transition. Flagging for consistency; the lockout-recovery gap above is the load-bearing issue.

Not observed as broken (correct, keep): the loading state ("Signing in…" + disabled); `role="alert"` on errors; anti-enumeration (a suspended/unknown account returns the same 401 *"Email or password is incorrect."* as a wrong password — do **not** change this); `autocomplete="email"` / `"current-password"`; the 503 "Login is not connected yet." copy; no horizontal overflow at 375 or 1280.

## What I expected

The rejection/lockout state should let the member *recover with dignity*: tell them roughly how long to wait (from the `retry-after` the server already returns), stop them from making it worse (disable submit for the cool-down, ideally with a live countdown), and point them at the fastest real recovery (password reset / support) — calm, honest, no blame. Success should ideally resolve without a jarring full-document blank, matching the in-place pattern adopted for the join commitment.

## Reproduction

1. Go to `/login`.
2. Submit a wrong password repeatedly (or arrive from an IP that has already hit 10 browser-auth attempts in the last 15 minutes).
3. Observe the error: *"Too many login attempts. Please wait before trying again."* — no wait duration, and the **"Sign in" button is still clickable**.
4. Click "Sign in" again: it fails again with the same message; the underlying window can be pushed further out by repeated attempts.
5. Note there is no in-error prompt toward "Forgot your password?" even though that is the most reliable way back in for a locked-out member.

Reproduction rate: `1/1 live (429 state reproduced this pass at 1280 & 375; button-enabled + no-duration confirmed in DOM; success/hard-nav read from source)`

## Customer impact

The front door is where a returning member re-enters the relationship with the product. Being told only "wait" with no timeline, while the button keeps inviting failing clicks that can extend the wait, is a frustrating, slightly punitive dead-end — exactly when the product should feel most reassuring and in-control. On shared/office/carrier-NAT IPs the 10/15-min IP cap means one busy network can lock out an innocent member who never mistyped anything, making the missing "here's how long / here's the reset link" guidance more than a convenience. Accessibility: the message is already announced via `role="alert"` (good), but a live countdown/disabled state must remain screen-reader-friendly and not create a focus trap. No privacy/authorization regression — the limiter and anti-enumeration behaviour must stay exactly as they are; this ticket only improves how the *existing* rejection is explained and recovered from.

## Evidence and limits

- Evidence: live DOM capture at 1280 & 375 — `errorText = "Too many login attempts. Please wait before trying again."`, `errorRole = "alert"`, `submitDisabled = false` after the 429; redacted screenshots of the rate-limited card at both widths (no member data — synthetic `nobody@sport-date.invalid` + a bogus password). Source: `LoginForm.tsx` reads only `result.error` (discards `retry-after`) and never disables the button on a 429; `window.location.assign("/profile")` on success; `api/auth/login/route.ts` returns the 429 via `enforceRateLimit(..., "Too many login attempts. Please wait before trying again.")` and 401 *"Email or password is incorrect."* for wrong/suspended/unknown; `rate-limit.ts:292` = `browser-auth-ip` limit 10 / 15 min, `:293` = `browser-auth-email` limit 5 / 15 min; `enforceRateLimit` computes `retryAfterSeconds` and sets the `retry-after` header (measured 518s live on a sibling call).
- Redactions made: synthetic email + fake password only; no real credentials, no PII.
- Facts: the button-enabled-after-429, the missing duration, and the discarded `retry-after` header are all confirmed (DOM + source). The exact 518s value is from a sibling auth call this pass, illustrating that a precise wait is available to surface.
- Hypotheses to verify during implementation: best presentation of the cool-down (a live mm:ss countdown vs. a static "try again in about N minutes" derived from `retry-after`); whether to also gently elevate "Forgot your password?" only in the rate-limited/failed state or always; whether to convert success to a router push + in-place "Signing you in…" (secondary, can be its own change).
- Paths or surfaces not tested with a real screen reader: the announcement is structurally correct (`role="alert"`), but end-to-end AT was not run; the mobile `/api/mobile/auth` path (separate limiter/UI) is out of scope for this web ticket.

## Duplicate check

- Search terms used: login, auth, rate limit, 429, retry-after, too many, lockout, recover, sign in, forgot password.
- Tickets reviewed: full queue (28 files). Nearest neighbours: `join-request-commitment-hard-reload` (shares only the `window.location` hard-nav observation, which is secondary here), `signup-redundant-double-headline` (adjacent auth surface, visual-hierarchy lens), `session-management-web-session-not-listed` (post-login sessions, not the login state machine).
- Why this is new: no ticket addresses login-journey state coverage — specifically the rate-limited recovery state (no duration, button stays enabled, no recovery prompt). Independently fixable in `LoginForm` (+ optionally reading the header) without touching the limiter or auth logic.

## Acceptance criteria

- [ ] When login is rejected for rate-limiting (429), the member is told approximately how long to wait, derived from the server's `retry-after` (e.g. a calm "Too many attempts — you can try again in about 9 minutes," or a live countdown). No raw seconds dump, no blame language.
- [ ] During the cool-down the "Sign in" button is disabled (or submits are otherwise prevented) so repeated failing clicks cannot extend the member's own lockout; it re-enables when the window elapses.
- [ ] The rate-limited / repeated-failure state surfaces the fastest real recovery route (e.g. emphasise "Forgot your password?", which runs on a separate limiter), so a locked-out member has a clear next step rather than only "wait."
- [ ] The message stays announced to assistive tech (keep `role="alert"`/live region); any countdown remains screen-reader-tolerable and creates no focus trap; touch targets stay ≥44px; layout holds at 375 and 1280.
- [ ] Anti-enumeration is preserved exactly: suspended/unknown/wrong-password still return the same generic "Email or password is incorrect." and are indistinguishable; the rate-limit thresholds and the limiter are unchanged (no weakening of auth).
- [ ] Contrast of the error block remains AA (coral-on-tint error text meets AA at its size).
- [ ] (Optional / may be split out) Successful login resolves without a full-document blank navigation, matching the in-place pattern used elsewhere, with a persisted "Signing you in…" state through the transition.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (login × completeness-of-states pass); status `ready`. Rate-limited state reproduced live at 1280 & 375 (button-enabled + no-duration confirmed in DOM); success/hard-nav and anti-enumeration read from source. Self-contained for an implementer.
