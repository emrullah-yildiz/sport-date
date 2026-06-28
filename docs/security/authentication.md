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

## Required before external registration

- Rate limiting at the edge or gateway, including IP and normalized-account controls.
- Email verification and resend throttling.
- Login, logout, session rotation, expiration cleanup, and password-reset flows.
- CSRF review for every state-changing cookie-authenticated endpoint.
- Effective Terms, Privacy Notice, and Safety Guidelines reviewed for the selected launch country.
- Abuse monitoring and an incident-response path.
- Integration tests against an isolated PostgreSQL database.

Until these gates are complete, the signup flow is a development preview and must not be promoted to real users.

