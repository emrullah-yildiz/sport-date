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

Provider-independent design for email verification and password reset lives in `docs/security/email-verification-reset-design.md`.

## Current rate-limit boundary

The implemented limiter is an in-app baseline, not a full production abuse-control perimeter. It does not yet use a shared backing store, global edge counter, ASN reputation, CAPTCHA, anomaly scoring, or operator controls. Production launch still requires shared enforcement after infrastructure selection so abuse controls remain effective across replicas and restarts.

The cleanup command expects the current schema to exist. If a target database is behind, run `npm run db:migrate --workspace @sport-date/web` before using `npm run db:cleanup-sessions --workspace @sport-date/web`.

## Native-session limits

The installation UUID is not hardware identity, app attestation, or proof of an uncompromised device. The `X-Sport-Date-Client` header is a routing marker, not an authorization factor. Malware, a rooted device, or a compromised process may obtain both the installation UUID and token pair. Production mobile launch therefore still requires rate limiting, anomaly monitoring, app-integrity evaluation, device/session management, incident revocation, and database-backed integration tests.

SecureStore behavior differs by platform: Android removes values on uninstall, while iOS Keychain values may survive reinstall with the same bundle identifier. Server expiry and revocation remain authoritative; local deletion is not treated as proof that a credential is invalid.
