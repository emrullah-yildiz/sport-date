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
- Native sessions use separate random opaque credentials: a 15-minute access token and a rotating refresh token with a fixed 30-day family lifetime. Only SHA-256 hashes are stored.
- Native refresh rotation stores spent refresh hashes; reuse revokes the server-side session family.
- Native access requires the current access token and hashed installation UUID. Account deletion revokes all active native sessions immediately.
- The Expo client stores its installation UUID and token pair with SecureStore using device-only, unlocked-device accessibility, serializes refresh calls, and clears local credentials on refresh failure.
- Web and mobile device-management surfaces expose non-secret lifecycle metadata. Web can revoke any native device; mobile identifies itself and can revoke other devices, while current-device termination uses sign-out.
- Native login, refresh, logout, and a minimal authenticated member endpoint are implemented. Mobile routes never accept the browser session cookie as native authorization.

## Required before external registration

- Rate limiting at the edge or gateway, including IP and normalized-account controls.
- Email verification and resend throttling.
- Scheduled expired-session cleanup and password-reset flows.
- Scheduled cleanup for expired native sessions and spent-token history.
- CSRF review for every state-changing cookie-authenticated endpoint.
- Effective Terms, Privacy Notice, and Safety Guidelines reviewed for the selected launch country.
- Abuse monitoring and an incident-response path.
- Integration tests against an isolated PostgreSQL database.

Until these gates are complete, the signup flow is a development preview and must not be promoted to real users.

## Native-session limits

The installation UUID is not hardware identity, app attestation, or proof of an uncompromised device. The `X-Sport-Date-Client` header is a routing marker, not an authorization factor. Malware, a rooted device, or a compromised process may obtain both the installation UUID and token pair. Production mobile launch therefore still requires rate limiting, anomaly monitoring, app-integrity evaluation, device/session management, incident revocation, and database-backed integration tests.

SecureStore behavior differs by platform: Android removes values on uninstall, while iOS Keychain values may survive reinstall with the same bundle identifier. Server expiry and revocation remain authoritative; local deletion is not treated as proof that a credential is invalid.
