# Consent & disclosure copy — DRAFT for counsel review

> **STATUS: DRAFT — requires qualified EU counsel review before any use.**
> This is compliance *preparation*: the actual member-facing wording for the
> consent and disclosure moments in the product, written so counsel can review
> real copy rather than abstractions. It is **not** approved, must **not** ship to
> users, and must **not** be treated as legal advice. Final wording, lawful-basis
> labelling, and whether each moment is "consent" versus another basis are
> counsel/owner decisions (root `AGENTS.md`, escalation policy).

## How to read this draft

- Each block below is proposed product copy for a specific moment, plus a short
  rationale and the open question for counsel.
- The copy follows the experience principles' **copy test** (`.agents/skills/
  run-product-studio/references/experience-principles.md`): sound like a
  thoughtful host — clear about logistics, calm about safety, lightly alive, and
  **never claim what cannot be proved**. No "find your perfect match", no safety
  guarantees, no implied verification.
- Copy is grounded in implemented flows and consistent with the Privacy Notice and
  Terms drafts in this folder. It uses the working name "Sport Date".
- `[COUNSEL: …]` / `[OWNER: …]` mark unresolved points. Where a real link/contact
  is required, it is bracketed because it does not exist yet.

---

## 1. Signup — Terms + Privacy acceptance

**Where:** the private-beta signup form, next to the create-account action.
**Implemented context:** the product records `accepted_terms_at` at signup; the
schema starts accounts at `email_verified = false`; this is a *contract +
privacy-information* moment, **not** a marketing-consent moment.

> **Proposed copy**
> By creating your account you agree to our [Terms]([COUNSEL: link]) and confirm
> you have read our [Privacy Notice]([COUNSEL: link]). Sport Date is for adults
> (18+). We don't verify other members' identity or background, so meet with the
> same care you'd use meeting anyone new.

**Rationale / honesty:** bundles the two things acceptance actually covers, states
the adult-only rule, and sets the no-verification expectation up front rather than
burying it. It deliberately does **not** ask for marketing consent here (that is a
separate, optional choice — §3) so that accepting Terms is not blanket consent
(Privacy Notice §3.5).

**[COUNSEL:** confirm the acceptance mechanism (e.g. unticked affirmative action
vs. statement), whether any pre-contract information or right-of-withdrawal notice
must appear here, and the exact "Terms"/"Privacy Notice" link text.**]**

---

## 2. Email verification — what it does and does not mean

**Where:** the email-verification request/confirmation surface and the verification
email body.
**Implemented context:** tokens are single-use, hashed, and expire in 24h;
verifying changes only `email_verified`/`email_verified_at` and revokes nothing
else; the documented honest-claim boundary is that verification proves inbox
control only (`docs/security/authentication.md`).

> **Proposed in-product copy (request)**
> Confirm your email so you can recover your account if you ever get locked out.
> We'll send a link that works once and expires in 24 hours.

> **Proposed email copy (subject + body, transactional only)**
> Subject: Confirm your email for Sport Date
> Body: Tap the link below to confirm this email address. It works once and expires
> in 24 hours. Confirming your email keeps your account recoverable — it does
> **not** verify anyone's identity, age, or safety, yours or anyone else's.
> [Confirm email]([canonical app link])
> If you didn't ask for this, you can ignore this email.

**Rationale / honesty:** states the *real* benefit (account recovery), the
single-use + expiry facts, and explicitly refuses to let "verified" imply identity
or safety. Keeps the email transactional.

**[COUNSEL:** confirm transactional-email wording, and that no marketing content
is mixed into a transactional message (ePrivacy/national e-marketing rules). Real
sending is also an owner gate (email provider, Gate 4) and is **disabled by
default** today — this copy is for when delivery is enabled.**]**

---

## 3. Optional product updates — separate marketing opt-in

**Where:** profile / preferences (a separate, optional control), **not** the
signup gate.
**Implemented context:** `communication_preferences.product_updates_opt_in`
defaults to **FALSE**; every change is logged with a lawful-basis note in
`communication_preference_events`. The default-off + recorded-change design is
already built to support a withdrawable, specific consent.

> **Proposed copy (opt-in control, default OFF)**
> ☐ Send me occasional Sport Date product updates by email.
> Optional. Off by default. This is separate from the security and event emails we
> need to send to run your account. You can turn it off anytime, and we'll stop.

> **Proposed copy (confirmation when turned on)**
> You're opted in to product updates. You can turn this off anytime in your
> preferences.

> **Proposed copy (when turned off)**
> You're opted out. We won't send product updates. You'll still get the essential
> security and event emails your account needs.

**Rationale / honesty:** specific, optional, granular, default-off, withdrawable,
and clearly distinguished from transactional mail — the conditions a valid consent
needs. Matches the implemented default and change-logging.

**[COUNSEL:** confirm this qualifies as valid GDPR consent and meets any
ePrivacy/national e-marketing requirements; confirm the withdrawal mechanism
wording and that the change log is the right consent record.**]**

---

## 4. Precise-location disclosure — at the moment it is revealed

**Where:** when a member is accepted to an event and the private meeting location
becomes visible.
**Implemented context:** `event_private_locations` is stored separately and shown
only to host/accepted participants; approximate area is all discovery ever sees.
This is a *disclosure* moment, not a consent checkbox, but the copy matters for
trust and safety.

> **Proposed copy (shown with the revealed location)**
> Here's where to meet. Only the host and accepted participants can see this exact
> location. Please keep it to yourself, and tell someone you trust where you're
> going.

**Rationale / honesty:** reinforces that exact location is need-to-know, nudges a
real safety behaviour (tell someone), and matches the precise-location separation
that is a core control (threat model; Privacy Notice §3.2). Makes "approximate is
visibly approximate" concrete (experience principles).

**[COUNSEL:** confirm there are no additional disclosure obligations at this point;
this is primarily a product-safety copy decision.**]**

---

## 5. Reporting — what happens when you report someone

**Where:** the safety report form (intake) and acknowledgement.
**Implemented context:** reports are stored, audited immutably, and handled under
the documented case workflow; the product must not promise a response time or
emergency intervention it cannot deliver (`docs/safety/moderation-operations.md`).

> **Proposed copy (intake notice)**
> Tell us what happened. We review reports and may restrict accounts or events to
> protect members. We can't provide emergency help — if you're in immediate danger,
> contact your local emergency services. We'll keep your report confidential from
> the person you're reporting.

> **Proposed copy (acknowledgement)**
> Thanks — your report is logged with a case reference. We review reports as part
> of keeping Sport Date safe. We won't tell the other person who reported them.

**Rationale / honesty:** sets honest expectations (no emergency service, no
promised SLA to users), states the confidentiality the product enforces, and points
to real emergency services. No safety guarantee.

**[COUNSEL:** confirm this aligns with any DSA notice-and-action acknowledgement
requirements if in scope, and that the "confidential from the reported person"
statement is consistent with that person's later right to a reasoned decision
(Privacy Notice §3.3).**]**

---

## 6. Account deletion — re-authentication and what deletion means

**Where:** the deletion-request confirmation step.
**Implemented context:** deletion requires password re-authentication, then
immediately locks the profile, revokes all sessions, cancels hosted events, closes
requests, and removes seats; the queue runs active → deletion-pending → restricted
→ deleted; **unconditional instant erasure is not promised** (Privacy Notice §6,
§7; decision log "Deletion is an auditable state transition").

> **Proposed copy (confirmation, with password re-entry)**
> Deleting your account signs you out everywhere, cancels events you're hosting,
> withdraws your pending and accepted requests, and starts removing your data.
> Some information may be kept where the law or a safety reason requires it, and
> we'll remove it when that reason ends. This can't be undone once it completes.
> Enter your password to confirm.

**Rationale / honesty:** describes exactly what the implemented flow does, is
honest that erasure is not unconditional/instant, and explains the re-auth. No
false "everything is gone immediately" claim.

**[COUNSEL:** confirm the retained-data wording matches the final lawful exceptions
and retention periods (still unset — Privacy Notice §6), and any required
deletion-confirmation/notification language.**]**

---

## 7. "Seeking" preference — dating / friendship / group

**Where:** the profile field where a member chooses what they're looking for.
**Implemented context:** `seeking` is a member-controlled enum; the experience
principle is that none of the three is a consolation prize. See the Privacy Notice
special-category flag (§3.1).

> **Proposed copy**
> What are you here for? Dating, friendship, or group activity — all equally
> welcome. You can change this anytime.

**Rationale / honesty:** keeps the three options equal (no ranking), and is
deliberately minimal because the field can touch special-category territory.

**[COUNSEL:** this is the field behind the Article 9 special-category flag in the
Privacy Notice §3.1. Confirm whether selecting "dating" needs any explicit-consent
treatment, and whether this copy should carry an additional notice.**]**

---

### Open items this draft hands to counsel (summary)

1. Signup acceptance mechanism + any pre-contract/withdrawal notice (§1).
2. Transactional-email wording and the marketing/transactional separation (§2, §3).
3. Whether the product-updates opt-in is valid consent and meets e-marketing rules,
   plus the consent record (§3).
4. DSA-aligned reporting acknowledgement vs. the reported person's later
   reasoned-decision right (§5).
5. Deletion retained-data wording vs. final lawful exceptions/retention (§6).
6. Article 9 treatment of the "seeking = dating" choice (§7).
7. Real, monitored links/contacts must exist before any of this copy ships
   (depends on owner Gates 1, 3, 4).
