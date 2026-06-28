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

## Required before external registration

- Rate limiting at the edge or gateway, including IP and normalized-account controls.
- Email verification and resend throttling.
- Scheduled expired-session cleanup and password-reset flows.
- CSRF review for every state-changing cookie-authenticated endpoint.
- Effective Terms, Privacy Notice, and Safety Guidelines reviewed for the selected launch country.
- Abuse monitoring and an incident-response path.
- Integration tests against an isolated PostgreSQL database.

Until these gates are complete, the signup flow is a development preview and must not be promoted to real users.
