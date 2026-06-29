# Moderator access operations

Moderator access is privileged production access, not an account setting. The application intentionally has no endpoint that grants, upgrades, or revokes staff roles.

## Access model

- `moderator` can view the minimized case queue and move non-final cases through allowed states.
- `safety_admin` currently has the same in-product case permissions and exists for future access administration and incident-command separation.
- Every page load and case mutation checks an active database role. A mutation checks again inside the same SQL statement that changes the case, closing the role-revocation race.
- Unauthorized people receive no staff queue. Exact event locations are never queried by the queue.
- A final decision requires a decision code, named policy or legal basis, and reporter-safe explanation. It is published to the member Safety Center with a six-month appeal window, subject to counsel review for the launch jurisdictions and service classification.
- Final cases cannot be edited through the current workflow.
- An appeal can be reviewed only by an active moderator other than the actor recorded on the original decision audit. The server enforces this again inside the locked appeal mutation.
- Queue views, sensitive case views, and evidence-reference creation are appended to an immutable access log with a defined purpose. The queue itself exposes metadata only.
- Evidence references are immutable opaque locators. The application does not accept evidence files or copied evidence content.

## Provisioning runbook

Before granting access, the owner must verify the staff member, approve least privilege, record training completion, require a strong unique password, and define an expiry or review date outside the product. Production access should use the hosting provider's audited database console or a reviewed one-time administrative script.

Provisioning must atomically insert both the active `user_roles` row and a matching `role_audit_log` grant event. Revocation must atomically set `revoked_at` and append a matching revoke event. Never edit or delete role audit records. The initial bootstrap grant may have a null actor only when the infrastructure owner records themselves and the bootstrap reason; later grants require an identified actor.

Do not paste production member IDs, credentials, connection strings, or grant commands into chat, source control, issue trackers, or social tools. Keep evidence of approval in the restricted operational system selected before launch.

## Access review

- Review active roles before beta launch and at least monthly while operating.
- Revoke immediately when duties change, employment ends, training expires, or compromise is suspected.
- Compare active roles to the append-only role audit and investigate mismatches.
- Review case-access logs for unexplained browsing, unusual volume, and access outside assigned duties.
- Test that a revoked session loses the queue and cannot mutate a case.
- Keep moderator and database-operator access separate where staffing permits.
- Maintain at least two trained moderators before enabling decisions so an appeal can receive a genuinely separate review.

No role should be provisioned until a named safety owner accepts responsibility for review quality, escalation, privacy, and appeals.
