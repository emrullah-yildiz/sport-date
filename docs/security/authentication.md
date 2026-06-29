# Authentication security status

## Implemented

- Shared client/server validation with strict length and enum boundaries.
- Adult age validation using calendar dates.
- Password hashes using bcrypt with cost 12.
- Random 256-bit opaque session tokens; only SHA-256 token hashes are stored.
- HttpOnly, SameSite=Lax cookies, with Secure enabled in production.
- Atomic account, sports, and session creation.
- Accounts start with `email_verified = false`.
- Database schema is applied explicitly with `npm run db:migrate --workspace @sport-date/web`.
- Login uses a generic credential error and a dummy password hash to reduce account-enumeration timing differences.
- Login rotates an existing browser session; logout revokes the server record and expires the cookie.
- The private profile page resolves the user from a live, unexpired, server-side session.
- Cookie-authenticated mutation endpoints reject cross-site browser fetch metadata and mismatched Origin headers.
- The web app emits restrictive browser security headers for every route: CSP, frame denial, referrer policy, nosniff, COOP/CORP, permissions policy, and production HSTS.
- The web app applies app-layer fixed-window throttles to browser login/signup, mobile login/refresh, join-request creation, and safety-report creation using IP-plus-identity buckets and `429` responses with retry metadata.
- Native sessions use separate random opaque credentials: a 15-minute access token and a rotating refresh token with a fixed 30-day family lifetime. Only SHA-256 hashes are stored.
- Native refresh rotation stores spent refresh hashes; reuse revokes the server-side session family.
- Native access requires the current access token and hashed installation UUID. Account deletion revokes all active native sessions immediately.
- The Expo client stores its installation UUID and token pair with SecureStore using device-only, unlocked-device accessibility, serializes refresh calls, and clears local credentials on refresh failure.
- Web and mobile device-management surfaces expose non-secret lifecycle metadata. Web can revoke any native device; mobile identifies itself and can revoke other devices, while current-device termination uses sign-out.
- Native login, refresh, logout, and a minimal authenticated member endpoint are implemented. Mobile routes never accept the browser session cookie as native authorization.
- A runnable cleanup command removes expired browser sessions, expired mobile session families, spent refresh-token history, expired email-verification tokens, and expired or consumed password-reset tokens; `--dry-run` reports counts before deletion.
- Provider-independent email-verification and password-reset scaffolding now exists: token tables, token hashing, confirm routes, browser completion pages, reset-driven session revocation, resend/request throttles, neutral unauthenticated reset-request responses, provider-ready delivery drafts with canonical auth links, and a disabled-by-default delivery adapter seam with a development-only console transport. External sending remains disabled until an approved email provider is configured.

## Required before external registration

- Shared rate limiting at the edge or gateway, including IP and normalized-account controls that survive process restarts and scale beyond one app instance.
- Email verification and resend throttling.
- Scheduled password-reset flows.
- Production scheduling for the session-cleanup job after infrastructure ownership is approved.
- CSRF review for every state-changing cookie-authenticated endpoint.
- Effective Terms, Privacy Notice, and Safety Guidelines reviewed for the selected launch country.
- Abuse monitoring and an incident-response path.
- Integration tests against an isolated PostgreSQL database.

Until these gates are complete, the signup flow is a development preview and must not be promoted to real users.

Provider-independent design for email verification and password reset lives in `docs/security/email-verification-reset-design.md`. The threat model for the implemented flows is in the "Email verification and password reset threat model" section below.

## Current rate-limit boundary

The implemented limiter is an in-app baseline, not a full production abuse-control perimeter. It does not yet use a shared backing store, global edge counter, ASN reputation, CAPTCHA, anomaly scoring, or operator controls. Production launch still requires shared enforcement after infrastructure selection so abuse controls remain effective across replicas and restarts.

The cleanup command expects the current schema to exist. If a target database is behind, run `npm run db:migrate --workspace @sport-date/web` before using `npm run db:cleanup-sessions --workspace @sport-date/web`.

## Native-session limits

The installation UUID is not hardware identity, app attestation, or proof of an uncompromised device. The `X-Sport-Date-Client` header is a routing marker, not an authorization factor. Malware, a rooted device, or a compromised process may obtain both the installation UUID and token pair. Production mobile launch therefore still requires rate limiting, anomaly monitoring, app-integrity evaluation, device/session management, incident revocation, and database-backed integration tests.

SecureStore behavior differs by platform: Android removes values on uninstall, while iOS Keychain values may survive reinstall with the same bundle identifier. Server expiry and revocation remain authoritative; local deletion is not treated as proof that a credential is invalid.

## Email verification and password reset threat model

This section threat-models the implemented flows. It complements the provider-independent design in `docs/security/email-verification-reset-design.md` and the product-wide harms in `docs/security/threat-model.md`; it does not restate them. The code under analysis is `apps/web/src/lib/auth-email.ts`, the token primitives in `apps/web/src/lib/auth.ts`, the delivery seam in `apps/web/src/lib/auth-email-delivery.ts` and `apps/web/src/lib/auth-email-content.ts`, the per-flow throttles in `apps/web/src/lib/rate-limit.ts`, and the four routes under `apps/web/src/app/api/auth/{email-verification,password-reset}/{request,confirm}/route.ts`.

### Scope and honest claim boundary

A completed email verification proves one thing only: at the moment of confirmation, the requester could read mail at that inbox and submitted the link before it expired. It is **not** identity, age, payment, background-check, host-trust, moderation, or safety verification, and product copy must keep `Email verified` in an account-security sense only. Verifying email does not change profile visibility, moderation role, movement progression, discovery ranking, or host privileges; the confirm transaction touches only the token rows and `users.email_verified`/`email_verified_at`. Overstating this boundary is itself a safety risk and is prohibited by the mission "never" list.

### Token forgery or guessing

- **Threat:** an attacker guesses, brute-forces, or forges a verification or reset link to take over an account or mark an inbox verified.
- **Control:** tokens are random opaque secrets generated server-side with 32 bytes (256 bits) of CSPRNG entropy (`crypto.randomBytes(32).toString("base64url")` in `createOpaqueToken`), namespaced by a flow prefix (`sdv_` for verification, `sdp_` for reset) and validated against a fixed-length pattern (`^sdv_[A-Za-z0-9_-]{43}$` / `^sdp_…`) before any database work. Only the SHA-256 hex hash is stored (`hashSessionToken`); the raw token exists only in the email link, never in storage or JSON responses.
- **Verified by:** `auth-email.test.ts` "rejects malformed tokens before touching the database" asserts an invalid token returns `invalid` and `getDatabase` is never called, for both flows. Route tests "rejects invalid tokens" assert the 400 mapping. Entropy and the hash-not-plaintext property are exercised through `auth.test.ts` token-shape coverage and the IP-hash test below.
- **Residual risk:** brute force against the confirm endpoint is bounded only by the in-app per-token/per-IP throttle (see below), which is per-process memory today. A shared edge counter is still required before external registration. There is no integration test proving the unique `token_hash` constraint against real PostgreSQL — tracked under the isolated-test-database gate.

### Single-use enforcement and sibling invalidation

- **Threat:** a leaked or replayed link is used twice, or multiple live links for one user create parallel takeover windows.
- **Control:** confirmation reads the token row, rejects it if `consumed_at` is set (verification → `already_verified`, reset → `invalid`) or `invalidated_reason` is set (→ `invalid`), and otherwise consumes it inside a single `sql.transaction`. The same transaction sets the sibling tokens for that user to `invalidated_reason = 'verified_elsewhere'` (verification) or `'password_reset_completed'` (reset). Issuing/requesting a new token first sets prior live tokens to `'resend_replaced'`, keeping one active token per user.
- **Verified by:** `auth-email.test.ts` "verifies a fresh token, marks the user verified, and invalidates sibling tokens" asserts the transaction contains `consumed_at`, `SET email_verified = TRUE`, and `verified_elsewhere`; "does not re-verify an already consumed token" asserts a consumed token yields `already_verified` with **zero** transaction statements. The reset equivalents are covered by the reset-revocation test below. Route tests "acknowledges an already-verified token without re-running side effects" confirm the boundary at the HTTP layer.
- **Residual risk:** consume-and-invalidate atomicity depends on the transaction; the recorded-statement tests prove the statements are issued but not that PostgreSQL serializes two concurrent confirms — again the integration-database gate.

### Expiry windows

- **Threat:** an old link recovered from an inbox, log, or proxy is replayed long after issuance.
- **Control:** verification tokens expire 24 hours after issuance (`EMAIL_VERIFICATION_DURATION_MS = 24h`); password reset tokens expire 60 minutes after issuance (`PASSWORD_RESET_DURATION_MS = 60m`) — the shorter window matches the higher blast radius of a reset. Confirmation compares `expires_at` to `now` and returns `expired` **before** any write, so an expired token has no side effect.
- **Verified by:** `auth-email.test.ts` "reports an expired token without consuming it" and "reports an expired reset token without rotating the password" both assert `state: "expired"` and `transactionStatements` length 0. Route tests "returns 410 for an expired token" / "returns 410 for an expired reset token" assert the HTTP 410 mapping.
- **Residual risk:** the reset window (60 minutes) sits at the long end of the 30–60 minute design recommendation; if abuse data later argues for a shorter window it is a one-constant change. No clock-skew handling beyond server time.

### Account enumeration via the reset request

- **Threat:** an attacker uses the unauthenticated reset-request endpoint as an oracle to learn whether an email has an account, is deletion-pending, is verified, or was throttled.
- **Control:** `POST /api/auth/password-reset/request` returns one fixed 202 body (`GENERIC_SUCCESS_MESSAGE`) for every outcome — account exists, account missing, database not configured, and unexpected throw all map to the identical neutral response. Token creation runs inside an SQL `WITH target_user AS (… WHERE account_status = 'active')` that simply inserts nothing when no active user matches, so timing and response are independent of existence. The verification-request route is authenticated and so is not an enumeration oracle; it returns `already_verified` only to the already-authenticated owner.
- **Verified by:** route test "returns the identical response whether or not the account exists (enumeration neutrality)" plus "stays neutral even when the database is not configured" and "stays neutral even when token preparation throws unexpectedly".
- **Residual risk:** the database branch is constant-response but is only *floored*, not constant-time — see the consolidated "Account-enumeration posture" section below for the unified stance across login and reset, the bounded timing floor now applied to this path, and what remains deferred to the edge gate.

### Reset → full session revocation boundary

- **Threat:** an attacker who reset a victim's password (or a victim recovering from takeover) leaves the adversary's existing browser or mobile sessions alive.
- **Control:** a completed reset runs, in one transaction, the password-hash rotation **and** `DELETE FROM sessions WHERE user_id = …` (all browser sessions) **and** `UPDATE mobile_sessions SET revoked_at = NOW() … WHERE revoked_at IS NULL` (all mobile session families). Every device must re-authenticate; account data, reports, blocks, events, and appeals are preserved. The confirm route message tells the member other devices were signed out.
- **Verified by:** `auth-email.test.ts` "resets the password and revokes every browser and mobile session" asserts the transaction contains `password_hash`, `DELETE FROM sessions`, `UPDATE mobile_sessions`, and `revoked_at`. Route test "completes a reset and tells the member other devices were signed out" confirms the user-facing copy and 200 mapping.
- **Residual risk:** revocation is asserted at the recorded-statement level, not against live SQL; an integration test against PostgreSQL is the tracked follow-up. Verification confirmation deliberately does **not** revoke sessions — verifying an inbox is not a credential change — which is correct but worth restating so the asymmetry is not mistaken for a gap.

### Requester-IP handling on reset

- **Threat:** storing the reset requester's IP in clear text creates a standing privacy liability and a correlation vector across the abuse-debug field.
- **Control:** the reset insert stores `requested_ip_hash = hashSessionToken(requestIp)` (SHA-256), never the raw IP, and stores `NULL` when the IP is `"unknown"`. The cleartext IP never reaches the database.
- **Verified by:** `auth-email.test.ts` "hashes the requester IP rather than persisting it in clear text" asserts the bound values contain the expected hash and **not** the raw IP; "stores no IP hash when the requester IP is unknown" asserts `NULL`.
- **Residual risk:** a hash of an IPv4 address is low-entropy and reversible by brute force, so it is pseudonymisation, not anonymisation. Retention of this field and its lawful basis still require counsel review (owner/legal gate); the cleanup command already prunes expired/consumed token rows.

### Abuse: resend flooding, mailbox bombing, and confirm brute force

- **Threat:** an attacker floods a victim's inbox with verification/reset mail, or brute-forces the confirm endpoints.
- **Control:** dedicated per-flow throttles return 429 with `Retry-After` and `X-RateLimit-Policy`, taking the most blocking rule:
  - verification request: 3/hour per IP, 3/hour per user, 6/24h per user (`verificationRequestRateLimitRules`);
  - reset request: 3/hour per normalized email, 10/hour per IP (`passwordResetRequestRateLimitRules`);
  - confirm (both flows): 5/hour per token, 10/hour per IP (`authTokenConfirmRateLimitRules`).
  The reset-request 429 reuses the **same neutral success message** so throttling does not become an enumeration signal.
- **Verified by:** route test "returns 429 once the per-user request rate limit is exhausted" (verification); the rate-limit primitives' own suite covers window/`Retry-After`/policy-header behavior. Enumeration-neutral throttling is consistent with the neutral-response reset tests above.
- **Residual risk:** the limiter is per-process in-memory only — it does not survive restarts or coordinate across replicas, and has no ASN reputation, CAPTCHA, or anomaly scoring. Shared edge/gateway enforcement is a launch gate (already tracked in "Current rate-limit boundary" and the threat model).

### Provider-gated, default-disabled delivery seam

- **Threat:** scaffolding accidentally sends real email to real inboxes before an EU-reviewed provider and owner authorization exist, or leaks raw tokens through delivery payloads/logs.
- **Control:** delivery is disabled unless `EMAIL_DELIVERY_ENABLED === "true"` **and** `EMAIL_DELIVERY_PROVIDER === "console"` (`resolveAuthEmailProvider`); the only non-disabled transport is a development console simulation that logs the action URL, never an external send. Link composition uses one canonical configured origin (`APP_BASE_URL`/`NEXT_PUBLIC_APP_URL`/`SITE_URL`), not attacker-controllable request headers, so a forged `Host` cannot redirect a verification/reset link. Request routes never return the raw token in JSON even when delivery is unconfigured.
- **Verified by:** `auth-email.test.ts` "creates a token and leaves delivery unconfigured when no provider exists" asserts `delivery.state === "unconfigured"` and a null draft; `auth-email-delivery.test.ts` and `auth-email-content.test.ts` cover provider gating and canonical-origin link composition.
- **Residual risk / owner gate:** **selecting and enabling a real transactional email provider is an owner-and-counsel decision** (EU privacy/contractual review, suppression handling, transactional-only templates) and must not be enabled autonomously. Until then no real verification/reset mail can be delivered, so both flows are testable end-to-end only via the console simulation.

### Tracked follow-ups and gates

- **Isolated PostgreSQL integration test (engineering gate, autonomous once a test DB exists):** assert token single-use, sibling invalidation, and the reset session-revocation deletes/revokes against real SQL rather than recorded statements.
- **Shared edge/gateway rate limiting (infrastructure/owner gate):** replace per-process throttles so resend/confirm abuse controls survive restarts and scale across replicas; this also hardens the residual reset-request timing channel.
- **Email provider selection and enablement (owner + counsel gate):** required before any real delivery; keep the adapter the single seam.
- **Retention and lawful basis for `requested_ip_hash` and token audit rows (counsel gate):** confirm before launch.

## Account-enumeration posture

This is the single consolidated stance for account enumeration across every authentication surface. It supersedes the per-surface notes above for the question "can an outsider learn whether an email has an account?" Three surfaces can leak account existence: login, the unauthenticated password-reset request, and registration. Verification request is authenticated and only ever answers its own owner, so it is not an enumeration oracle.

### What we defend at the body level, everywhere

Response *content* never distinguishes "account exists" from "account does not exist":

- **Login** returns one generic `Email or password is incorrect.` (401) for an unknown email, a wrong password, and a non-active account alike (`apps/web/src/app/api/auth/login/route.ts`). It never says "no such account".
- **Reset request** returns one fixed neutral 202 body (`GENERIC_SUCCESS_MESSAGE`) for account-exists, account-missing, database-not-configured, and unexpected-throw, and reuses that same body for the 429 throttle response so throttling is not itself a signal (`apps/web/src/app/api/auth/password-reset/request/route.ts`). The SQL is written as `INSERT ... SELECT ... FROM target_user` so the no-match case simply inserts nothing rather than branching.
- **Registration** rejects a duplicate email, which is an unavoidable existence signal for any system that enforces unique accounts; this is accepted and bounded by registration rate limits rather than hidden, because a usable signup flow must tell a person their email is already taken.

Body-level neutrality is the primary, fully-implemented defense and is covered by tests (login generic-error tests; reset-request enumeration-neutrality tests including the database-failure and unexpected-throw cases).

### Where a timing channel remains, and how each surface treats it

Body neutrality does not by itself equalize *latency*. The two surfaces handle the timing dimension differently because their dominant cost differs:

- **Login is equalized by a real dummy-hash comparison.** When no user row is found, login still runs `verifyPassword` against a constant `DUMMY_PASSWORD_HASH` (bcrypt cost 12, ~hundreds of ms). Because that bcrypt comparison dominates the request and runs on both the exists and missing paths, the exists/missing latency difference is collapsed by genuine equivalent work, not an artificial sleep. This is the strongest form of the defense and needs no change.
- **Reset request has no natural dominant operation**, so the insert path (account exists → a row is written) and the no-op path (no match → nothing written) differ in latency. As of this cycle the reset-request path is held to a **bounded artificial-delay floor** (`RESET_REQUEST_MIN_DURATION_MS`, 350ms) in `requestPasswordResetTokenForEmail` via the `holdUntilMinimumDuration` helper. Success and error outcomes are both padded (errors are padded, then re-thrown so the route still maps them to the identical neutral 202), so the *common-case* difference between the insert and no-op paths — and a fast database-not-configured rejection — falls below one observable floor.

### Explicit decision: floor now, full constant-time deferred to the edge gate

We deliberately chose a **bounded floor now** over either (a) doing nothing until the edge gate, or (b) attempting true constant-time padding in-app:

- A floor is a small, low-risk, well-tested change that meaningfully reduces the common-case timing channel without needing any infrastructure. It is the honest middle option and is verified by `auth-email.test.ts` ("enumeration timing floor") asserting both the exists and no-op paths are held to the floor *and* that the neutral return contract is unchanged.
- A floor is **not** a constant-time guarantee. It caps the observable *minimum*; work that legitimately exceeds the floor (a slow database, a slow provider send once delivery is enabled) still varies, and a determined attacker with many samples and a low-noise network path could still extract signal. Choosing a floor high enough to dominate every real-world insert is environment-dependent and cannot be tuned correctly without the real PostgreSQL instance (itself a gated dependency), so forcing a "true" constant-time implementation now would be guesswork that risks both correctness and a degraded experience for real members.
- **Full closure is deferred to shared edge/gateway rate limiting** (an owner/infrastructure gate). Per-IP/per-account limits that survive restarts and coordinate across replicas make the large sample counts a timing attack needs impractical, which is the proportionate place to finish the job. Until that gate lands, the residual is: body-neutral everywhere, login timing-equalized by real work, reset-request timing-floored as a partial mitigation, registration existence-signal accepted and rate-limited.

This posture must not be overstated in product copy or to the owner: enumeration is *reduced*, not eliminated, until the edge gate is in place.
