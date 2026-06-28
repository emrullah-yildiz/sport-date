# Decision log

## 2026-06-29 — Product operating principle

Optimize for safe completed encounters and willingness to meet again, not swipes or screen time.

## 2026-06-29 — Autonomous operating model

Use the repo-scoped `$run-product-studio` skill as the durable product-lead workflow. Keep external publishing, spending, production, credentials, platform terms, and legal sign-off under owner control.

## 2026-06-29 — Database-backed browser sessions

Use random opaque session cookies with only SHA-256 hashes stored in PostgreSQL. Resolve authorization server-side on every protected boundary. Login rotates a browser's previous session and logout revokes it. Reassess a maintained authentication library before production because custom authentication increases long-term security responsibility.

## 2026-06-29 — Deletion is an auditable state transition

A deletion request immediately locks the profile and revokes sessions, then enters an auditable queue. Do not promise unconditional instant erasure: determine and document applicable legal or safety exceptions, vendor propagation, backup expiry, and completion before launch. Terms acceptance is not treated as blanket privacy or marketing consent.

## Open decisions

- Final product and company name.
- Launch country, city, neighborhoods, and initial sports.
- Whether the third host skip automatically declines or triggers another state.
- Initial relationship scope and how dating, friendship, and group intentions interact.
- Business model and launch budget.
