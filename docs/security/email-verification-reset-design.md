# Email verification and password reset design

This document is implementation preparation, not legal advice. It defines the product and security boundary to build before an email provider is selected.

## Why this exists

The current product creates accounts with `email_verified = false` and allows development-only sign-in. Before external registration, the service needs:

- email verification that proves inbox control without overstating identity or safety;
- password reset that restores access without leaking whether an account exists;
- resend and recovery throttles that fit the existing abuse model; and
- export, deletion, retention, and audit behavior that do not depend on provider-specific assumptions.

## Product truth

Email verification means only one thing: the member could receive mail at that inbox and completed the verification step before the token expired.

It must not imply:

- identity verification;
- age verification;
- payment verification;
- background checks;
- host trustworthiness;
- moderation clearance; or
- safety certification.

Product copy should say `Email verified` only in an account-security sense.

## Data model boundary

Add separate single-purpose tables instead of overloading the `users` table:

### Email verification tokens

- `id` UUID primary key
- `user_id` foreign key to `users`
- `email` snapshot used for delivery and audit comparison
- `token_hash` unique SHA-256 hash of a random opaque token
- `expires_at`
- `consumed_at` nullable
- `created_at`
- `last_sent_at`
- `send_count`
- `invalidated_reason` nullable

Rules:

- store only the token hash, never the raw token;
- keep only one active token per user/email pair;
- invalidating a prior token on resend is preferred to multiple live tokens;
- consuming a token sets `users.email_verified = true` and writes `email_verified_at`.

### Password reset tokens

- `id` UUID primary key
- `user_id` foreign key to `users`
- `token_hash` unique SHA-256 hash of a random opaque token
- `expires_at`
- `consumed_at` nullable
- `created_at`
- `last_sent_at`
- `send_count`
- `invalidated_reason` nullable
- `requested_ip_hash` optional hashed abuse/debug field if counsel approves

Rules:

- only one active reset token per user at a time;
- resetting the password invalidates all active browser sessions and all active mobile sessions;
- consuming a reset token rotates the password hash and marks all other active reset tokens invalid.

## Token properties

- Use random opaque tokens generated server-side with at least 256 bits of entropy.
- Put only the raw opaque token in the email link.
- Hash tokens with the existing SHA-256 helper before storage.
- Verification token lifetime: 24 hours recommended.
- Password reset token lifetime: 30 to 60 minutes recommended.
- Every token must be single-use.

## Route design

Provider-independent routes:

### Browser

- `POST /api/auth/email-verification/request`
  - authenticated
  - creates or rotates the verification token
  - returns a neutral success message
- `POST /api/auth/email-verification/confirm`
  - accepts raw token
  - marks the account verified or returns an expired/invalid response
- `POST /api/auth/password-reset/request`
  - unauthenticated
  - accepts email
  - always returns the same success message whether the account exists or not
- `POST /api/auth/password-reset/confirm`
  - accepts raw token and new password
  - rotates password and revokes sessions

### Mobile

Keep the reset request and confirm endpoints shared with web. Native can open a browser handoff or use the same API directly later, but the token model must stay shared.

## Response behavior

### Verification request

- If already verified, return success and do not send repeatedly.
- If not verified, create or rotate the token and queue delivery.
- Response body should not expose send counts or whether the address changed recently.

### Verification confirm

Possible outcomes:

- verified now;
- already verified;
- token invalid;
- token expired.

Do not auto-sign-in an unauthenticated browser solely because a verification link was clicked.

### Password reset request

Always return a neutral success message such as:
`If an account exists for that email, we have sent password reset instructions.`

Do not reveal:

- whether the address exists;
- whether the account is deletion-pending;
- whether the address is verified; or
- whether delivery was throttled.

### Password reset confirm

- Validate the token and new password using the same password rules as registration.
- On success:
  - update password hash;
  - revoke browser sessions;
  - revoke mobile sessions;
  - invalidate active reset tokens;
  - append an audit event.

## Abuse controls

Add dedicated policies on top of the existing in-app baseline:

- password reset request:
  - by normalized email
  - by IP
- verification resend:
  - by user id
  - by IP
- token confirmation:
  - by token family
  - by IP

Recommended boundaries:

- verification resend: at most 3 sends per hour, 6 per 24 hours
- password reset request: at most 3 sends per hour per email, 10 per hour per IP
- confirm endpoints: low attempt count before forcing a cool-down

The same neutral success response should be preserved when a request is throttled.

## Session and account effects

### When email is verified

- set `email_verified = true`
- record `email_verified_at`
- invalidate any outstanding verification token

Do not change:

- profile visibility rules
- moderation role
- movement progression
- discovery ranking
- host privileges

### When password is reset

- revoke all browser sessions
- revoke all mobile sessions
- preserve account data, reports, blocks, events, and appeals
- require fresh login on every device

## UI states

### Sign-up completion

After registration:

- keep the existing honest message that verification is not yet active in production;
- once implemented, show:
  - pending verification state
  - resend action with cooldown
  - change-email path only after a separate design review

### Profile security

Show:

- `Email verified`
- or `Email verification pending`
- last verification email sent time if useful
- resend button when allowed

### Forgot password

Add a dedicated entry from login, not from safety or moderation surfaces.

### Reset complete

Tell the member that other signed-in devices were signed out.

## Email content boundary

Verification email:

- say why the member received it
- include expiry
- include ignore-this-email instruction
- no marketing content

Password reset email:

- say a reset was requested
- include expiry
- say no changes happen unless the link is completed
- include ignore-this-email instruction
- no marketing content

Implementation note:

- email-link composition should use one canonical public origin from environment configuration, not request headers;
- the adapter boundary should receive structured payloads containing `to`, `subject`, `text`, `html`, expiry, and the exact action URL for `/verify-email` or `/reset-password`;
- request routes must not expose raw tokens in JSON responses even when delivery remains unconfigured.

## Audit and export

Include in audit:

- verification token issued
- verification completed
- reset requested
- reset completed
- resend throttled

Include in account export:

- `emailVerified`
- `emailVerifiedAt` once it exists
- password reset completion timestamps only if counsel approves and if doing so does not weaken security review practice

Do not export:

- raw tokens
- token hashes
- provider message ids unless explicitly required

## Deletion and retention

- deleting an account must invalidate outstanding verification and reset tokens immediately;
- expired or consumed tokens should be removed by the same maintenance pattern used for session residue;
- retention for token audit rows and provider delivery metadata still requires counsel review.

## Provider selection contract

Any eventual email provider must support:

- transactional-only templates;
- link-based verification and reset delivery;
- per-message metadata or tags for audit correlation;
- suppression handling;
- EU-acceptable contractual/privacy review by counsel.

The product integration should keep provider logic behind one adapter so domain rules, throttles, token rotation, and audit logic remain local to the app.

## Implementation order once approved

1. Add token tables and audit fields.
2. Add provider-independent token creation, hashing, consumption, and invalidation helpers.
3. Add request/confirm routes with neutral responses and throttles.
4. Add browser UI states for resend and forgot password.
5. Extend account export/deletion coverage.
6. Add cleanup for expired/consumed auth tokens.
7. Only then connect an approved provider adapter.
