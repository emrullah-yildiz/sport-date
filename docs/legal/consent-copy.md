# Consent & disclosure copy — Sport Date

> **PUBLISHED — owner-approved as of 2026-06-30.** This is Sport Date's operational
> consent and disclosure copy — the actual member-facing wording for each
> consent/disclosure moment in the product, finalized and approved by the product
> owner. It is **not** legal advice and has **not** been reviewed or approved by a
> qualified lawyer. Independent review by qualified EU counsel remains recommended
> before relying on it in a dispute, particularly on the consent-validity and
> e-marketing points. A small number of links/contacts only the owner can supply are
> marked `[OWNER TO CONFIRM: …]` inline and collected at the end; this copy cannot
> ship to real users until those links/contacts are real (and, for email, until the
> owner enables a provider — Gate 4).

## How to read this document

- Each block below is the member-facing product copy for a specific moment, plus a
  short rationale and any open question still recommended for counsel.
- The copy follows the experience-principles **copy test**: sound like a thoughtful
  host — clear about logistics, calm about safety, lightly alive, and **never claim
  what cannot be proved**. No "find your perfect match", no safety guarantees, no
  implied verification.
- Copy is grounded in implemented flows and consistent with the Privacy Notice
  (`./privacy-notice.md`), the Terms (`./terms-of-service.md`), and the Safety &
  Community Guidelines (`./safety-community-guidelines.md`). It uses the working name
  **"Sport Date"** on an **EU/GDPR baseline**; launch geography **Bucharest, Romania**
  is the owner's current *hypothesis*, not a committed choice.

---

## 1. Signup — Terms + Privacy acceptance

**Where:** the signup form, next to the create-account action.
**Implemented context:** the product records `accepted_terms_at` at signup; the
schema starts accounts at `email_verified = false`; this is a *contract +
privacy-information* moment, **not** a marketing-consent moment.

> **Copy**
> By creating your account you agree to our [Terms]([OWNER TO CONFIRM: Terms link])
> and confirm you have read our [Privacy Notice]([OWNER TO CONFIRM: Privacy Notice
> link]). Sport Date is for adults (18+). We don't verify other members' identity or
> background, so meet with the same care you'd use meeting anyone new.

**Rationale / honesty:** bundles the two things acceptance actually covers, states
the adult-only rule, and sets the no-verification expectation up front rather than
burying it. It deliberately does **not** ask for marketing consent here (that is a
separate, optional choice — §3) so that accepting Terms is not blanket consent
(Privacy Notice §3.5).

`[The acceptance mechanism (e.g. unticked affirmative action vs. statement), whether
any pre-contract information or right-of-withdrawal notice must appear here, and the
exact "Terms"/"Privacy Notice" link text, are counsel-confirmable.]`

---

## 2. Email verification — what it does and does not mean

**Where:** the email-verification request/confirmation surface and the verification
email body.
**Implemented context:** tokens are single-use, hashed, and expire in 24h;
verifying changes only `email_verified`/`email_verified_at` and revokes nothing
else; the documented honest-claim boundary is that verification proves inbox
control only (`docs/security/authentication.md`).

> **In-product copy (request)**
> Confirm your email so you can recover your account if you ever get locked out.
> We'll send a link that works once and expires in 24 hours.

> **Email copy (subject + body, transactional only)**
> Subject: Confirm your email for Sport Date
> Body: Tap the link below to confirm this email address. It works once and expires
> in 24 hours. Confirming your email keeps your account recoverable — it does
> **not** verify anyone's identity, age, or safety, yours or anyone else's.
> [Confirm email]([OWNER TO CONFIRM: canonical app link])
> If you didn't ask for this, you can ignore this email.

**Rationale / honesty:** states the *real* benefit (account recovery), the
single-use + expiry facts, and explicitly refuses to let "verified" imply identity
or safety. Keeps the email transactional.

`[Transactional-email wording, and that no marketing content is mixed into a
transactional message (ePrivacy/national e-marketing rules), are counsel-confirmable.
Real sending is also an owner gate (email provider, Gate 4) and is disabled by
default today — this copy is for when delivery is enabled.]`

---

## 3. Optional product updates — separate marketing opt-in

**Where:** profile / preferences (a separate, optional control), **not** the
signup gate.
**Implemented context:** `communication_preferences.product_updates_opt_in`
defaults to **FALSE**; every change is logged with a lawful-basis note in
`communication_preference_events`. The default-off + recorded-change design is
already built to support a withdrawable, specific consent.

> **Copy (opt-in control, default OFF)**
> ☐ Send me occasional Sport Date product updates by email.
> Optional. Off by default. This is separate from the security and event emails we
> need to send to run your account. You can turn it off anytime, and we'll stop.

> **Copy (confirmation when turned on)**
> You're opted in to product updates. You can turn this off anytime in your
> preferences.

> **Copy (when turned off)**
> You're opted out. We won't send product updates. You'll still get the essential
> security and event emails your account needs.

**Rationale / honesty:** specific, optional, granular, default-off, withdrawable,
and clearly distinguished from transactional mail — the conditions a valid consent
needs. Matches the implemented default and change-logging.

`[Whether this qualifies as valid GDPR consent and meets any ePrivacy/national
e-marketing requirements, the withdrawal-mechanism wording, and whether the change
log is the right consent record, are counsel-confirmable.]`

---

## 4. Precise-location disclosure — at the moment it is revealed

**Where:** when a member is accepted to an event and the private meeting location
becomes visible.
**Implemented context:** `event_private_locations` is stored separately and shown
only to host/accepted participants; approximate area is all discovery ever sees.
This is a *disclosure* moment, not a consent checkbox, but the copy matters for
trust and safety.

> **Copy (shown with the revealed location)**
> Here's where to meet. Only the host and accepted participants can see this exact
> location. Please keep it to yourself, and tell someone you trust where you're
> going.

**Rationale / honesty:** reinforces that exact location is need-to-know, nudges a
real safety behaviour (tell someone), and matches the precise-location separation
that is a core control (threat model; Privacy Notice §3.2).

`[Whether there are additional disclosure obligations at this point is
counsel-confirmable; this is primarily a product-safety copy decision.]`

---

## 5. Reporting — what happens when you report someone

**Where:** the safety report form (intake) and acknowledgement.
**Implemented context:** reports are stored, audited immutably, and handled under
the documented case workflow; the product must not promise a response time or
emergency intervention it cannot deliver (`docs/safety/moderation-operations.md`).

> **Copy (intake notice)**
> Tell us what happened. We review reports and may restrict accounts or events to
> protect members. We can't provide emergency help — if you're in immediate danger,
> contact your local emergency services. We'll keep your report confidential from
> the person you're reporting.

> **Copy (acknowledgement)**
> Thanks — your report is logged with a case reference. We review reports as part
> of keeping Sport Date safe. We won't tell the other person who reported them.

**Rationale / honesty:** sets honest expectations (no emergency service, no
promised SLA to users), states the confidentiality the product enforces, and points
to real emergency services. No safety guarantee.

`[Whether this aligns with any DSA notice-and-action acknowledgement requirements if
in scope, and that "confidential from the reported person" is consistent with that
person's later right to a reasoned decision (Privacy Notice §3.3), are
counsel-confirmable.]`

---

## 6. Account deletion — re-authentication and what deletion means

**Where:** the deletion-request confirmation step.
**Implemented context:** deletion requires password re-authentication, then
immediately locks the profile, revokes all sessions, cancels hosted events, closes
requests, and removes seats; the queue runs active → deletion-pending → restricted
→ deleted; **unconditional instant erasure is not promised** (Privacy Notice §6,
§7; decision log "Deletion is an auditable state transition").

> **Copy (confirmation, with password re-entry)**
> Deleting your account signs you out everywhere, cancels events you're hosting,
> withdraws your pending and accepted requests, and starts removing your data.
> Some information may be kept where the law or a safety reason requires it, and
> we'll remove it when that reason ends. This can't be undone once it completes.
> Enter your password to confirm.

**Rationale / honesty:** describes exactly what the implemented flow does, is
honest that erasure is not unconditional/instant, and explains the re-auth. No
false "everything is gone immediately" claim.

`[Whether the retained-data wording matches the final lawful exceptions and
retention periods (Privacy Notice §6), and any required deletion-confirmation/
notification language, are counsel-confirmable.]`

---

## 7. "Seeking" preference — dating / friendship / group

**Where:** the profile field where a member chooses what they're looking for.
**Implemented context:** `seeking` is a member-controlled enum; the experience
principle is that none of the three is a consolation prize. See the Privacy Notice
special-category flag (§3.1).

> **Copy**
> What are you here for? Dating, friendship, or group activity — all equally
> welcome. You can change this anytime.

**Rationale / honesty:** keeps the three options equal (no ranking), and is
deliberately minimal because the field can touch special-category territory.

`[This is the field behind the Article 9 special-category flag in the Privacy Notice
§3.1. Whether selecting "dating" needs any explicit-consent treatment, and whether
this copy should carry an additional notice, are counsel-confirmable.]`

---

## Owner inputs still required before this copy ships

These are facts only the owner can supply; they are **not** invented above:

1. **Real Terms and Privacy Notice links** for the signup copy (§1).
2. **The canonical app link** for the verification email (§2).
3. **The launch jurisdiction** (currently the Bucharest, Romania *hypothesis*),
   which fixes the correct local emergency reference behind the reporting copy (§5)
   and any country-specific wording.
4. **An enabled, owner-approved email provider** (Gate 4) before the verification
   email (§2) sends to real inboxes — delivery is disabled by default today.

In addition, the following remain **recommended for qualified-counsel confirmation**
(legal judgement, not owner facts): the signup acceptance mechanism and any
pre-contract/withdrawal notice (§1); transactional/marketing email separation (§2,
§3); whether the product-updates opt-in is valid consent and meets e-marketing rules
(§3); the DSA-aligned reporting acknowledgement vs. the reported person's
reasoned-decision right (§5); deletion retained-data wording vs. final lawful
exceptions (§6); and the Article 9 treatment of the "seeking = dating" choice (§7).
