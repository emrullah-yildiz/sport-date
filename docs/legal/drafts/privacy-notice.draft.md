# Privacy Notice — DRAFT for counsel review

> **STATUS: DRAFT — requires qualified EU counsel review before any use.**
> This document is compliance *preparation*, not legal advice and not an approved
> privacy notice. It is written by the product team to give counsel a grounded,
> reviewable starting point instead of a blank page. Nothing here is a binding
> representation, and it must not be published, shown to users, or relied upon
> until counsel has reviewed, corrected, and approved it for the selected launch
> jurisdiction. Final retention periods, lawful bases, the controller identity,
> the supervisory-authority reference, and the international-transfer position are
> deliberately left as decisions for counsel and the owner (see the bracketed
> `[COUNSEL: …]` and `[OWNER: …]` markers throughout).

## How to read this draft

- Every factual claim about *what data we hold and why* is grounded in the
  implemented schema (`apps/web/db/*.sql`), the access/export and deletion code,
  and the documented data flows. Where the product does not yet do something, the
  draft says so rather than inventing a capability.
- This draft does **not** restate the GDPR. It maps Sport Date's *actual*
  processing onto the structure a privacy notice needs.
- It cross-references and must not contradict:
  `docs/legal/privacy-rights-preparation.md` (rights, product states, retention
  matrix), `docs/security/authentication.md` (auth/session/token data and the
  honest claim boundary on email verification), `docs/security/threat-model.md`,
  and `docs/safety/moderation-operations.md` (reports, evidence, audit).
- "Sport Date" is a working name and the launch country/city are unconfirmed
  (owner Gate 3). Brackets mark every place that depends on those decisions.

---

## 1. Who we are (controller)

[OWNER/COUNSEL: the legal entity does not yet exist. Insert the controller's
legal name, registered address, and company number once the entity is formed,
and the launch jurisdiction once confirmed (owner Gate 3). If a Data Protection
Officer is appointed or required, insert their contact here; counsel should
advise whether a DPO is mandatory for the expected scale and processing.]

- **Service:** Sport Date (working name), a service that helps adults meet through
  small, local, in-person sports activities.
- **Contact for privacy questions and rights requests:** [OWNER: insert the
  monitored privacy contact address. The product currently has *no* live request
  inbox — `docs/legal/privacy-rights-preparation.md` lists "a request inbox,
  responsible owner, due-date tracking" as a required-before-real-users operation.
  This contact must be real before this notice is published.]

## 2. Scope of this notice

This notice covers personal data we process when you create and use a Sport Date
account on the web app and the mobile app. It covers account data, the sports
activities ("events") you host or join, the safety tools (blocking, reporting),
optional product-update preferences, and the technical data needed to keep
accounts secure.

**Adults only.** The service is for adults. Registration validates that the date
of birth you provide makes you at least 18 (`date_of_birth` with adult-age
validation). We do not knowingly process the data of anyone under 18.
[COUNSEL: confirm the age-assurance position and any national age-of-consent or
age-verification obligations for the launch country; the current control is a
self-declared date of birth, not identity-document verification, and the notice
must not imply stronger assurance than that.]

## 3. What personal data we process, why, and on what basis

The lawful basis for each purpose below is a **proposal for counsel to confirm**.
Where this draft suggests "contract", "legitimate interests", or "consent", treat
it as a recommendation, not a determination. `[COUNSEL: confirm basis]` marks
each one.

### 3.1 Account and profile data

| Data | Source | Purpose | Proposed lawful basis |
| --- | --- | --- | --- |
| Email address | You, at signup | Authenticate you; send security mail (verification, password reset); operate the account | Performance of a contract `[COUNSEL: confirm basis]` |
| Password (stored only as a bcrypt hash, cost 12 — never the plaintext) | You | Authenticate you | Performance of a contract `[COUNSEL: confirm basis]` |
| First name, last name | You | Identify you to people you choose to meet | Performance of a contract `[COUNSEL: confirm basis]` |
| Date of birth | You | Confirm you are an adult; enforce per-event age ranges | Performance of a contract + legal/safety obligation `[COUNSEL: confirm basis]` |
| Home location text (e.g. a city/neighbourhood label), timezone | You | Show you locally relevant events; coordinate timing | Performance of a contract `[COUNSEL: confirm basis]` |
| Short bio (≤200 chars) | You | Let others decide whether to meet you | Performance of a contract `[COUNSEL: confirm basis]` |
| Languages | You | Match you to events in languages you share | Performance of a contract `[COUNSEL: confirm basis]` |
| "Seeking" (dating / friendship / group) | You | Reflect what you are looking for; this is treated as a member-controlled preference, never as a consolation ranking | Performance of a contract `[COUNSEL: confirm basis — and see note below]` |
| Sports, skill level, frequency | You | Match you to compatible activities | Performance of a contract `[COUNSEL: confirm basis]` |

> **Special-category data note for counsel.** Sport Date is positioned around
> *dating, friendship, or group activity* without treating one as a lesser option
> (`seeking`), and members write free-text bios. A service that lets people seek
> dating, combined with free-text fields, can foreseeably reveal or allow
> inference of data that GDPR Article 9 treats as special category (e.g. sexual
> orientation). The product does **not** ask for, require, or structure
> special-category data, and free-text fields are length-bounded, but counsel must
> determine whether the *purpose* (facilitating dating) means an Article 9
> condition (e.g. explicit consent) is required, and whether the privacy notice
> and consent flow must reflect that. This is flagged, not resolved, here.

### 3.2 Events you host or join

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Public event details (sport, title, description, time, duration, capacity, language, age range, experience levels, **public city/area label and approximate coordinates**) | Let eligible adults discover and decide to join | Stored in `events`. Discovery sees only the *approximate* area, never the exact venue. |
| **Private meeting location** (venue name, address, precise coordinates, arrival instructions) | Tell confirmed participants where to actually go | Stored separately in `event_private_locations`. **Only the host, accepted participants, or an explicitly authorised, audited moderation path can read it.** Public discovery never joins this table. This separation is a core safety control, not a convenience. |
| Join requests (your introduction text, status, skip count) | Let hosts decide; let you track and cancel your request | `join_requests`. A host's decision not to accept ("skip") is **not exposed to you as a running rejection count** — skip count is internal to the host queue. |
| Accepted seat (numbered seat, accepted time) | Confirm your place; enforce capacity | `event_participants`. |
| Private post-event reflection (did you attend; would you join again) | Your own private progress and our aggregate product learning | `event_reflections`. Visible only to you; "would join again" supports a private progress surface with **no leaderboard, no streak, and no public popularity metric**. |

Proposed basis for event processing: performance of a contract (operating the
service you signed up for) `[COUNSEL: confirm basis]`. The precise-location
separation and the non-exposure of rejection counts are described here because
they materially affect what *other members* can learn about you.

### 3.3 Safety: blocking, reporting, moderation

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Blocks you create | Immediately stop contact and shared access | `user_blocks`. **We never tell the other person they were blocked, and never tell anyone who blocked whom** (`docs/safety/moderation-operations.md`). |
| Safety reports you submit (category, free-text details, the reported member/event) | Investigate abuse and protect members | `safety_reports`. |
| Moderation case records, decision notices, appeals, and an append-only audit log | Investigate fairly, explain decisions, allow one appeal, and keep a tamper-evident trail | `moderation_audit_log` is immutable (insert-only; update/delete are rejected at the database). Evidence is stored as **references only** — no uploaded files, no copied messages, no precise locations (`docs/safety/moderation-operations.md`). |

Proposed basis: **legitimate interests** in keeping members safe and the service
trustworthy, and, where applicable, **legal obligation** (e.g. illegal-content
handling). `[COUNSEL: confirm basis, and determine Digital Services Act
applicability and any national reporting/retention obligations — already flagged
in docs/safety/moderation-operations.md as a counsel decision.]`

**Reports about you.** If someone reports you, we may process that report and the
reporter's account of events to investigate. We balance your right to understand a
decision that affects you against the reporter's safety: a decision notice gives
you a reason and the rule or basis applied, **without exposing the reporter's
private report or identity** where protecting them is necessary. `[COUNSEL: confirm
how Article 15 access requests interact with reporter-protection — the export
already excludes "internal case material requiring rights-of-others review".]`

### 3.4 Account security and technical data

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Browser session records (only a SHA-256 **hash** of an opaque token; expiry) | Keep you signed in securely on the web | `sessions`. The token itself lives only in your cookie; we store only its hash. |
| Mobile session records (hashes of access/refresh tokens, a **hashed** installation identifier, a device label you/your device provides, timestamps) | Keep you signed in securely in the app and let you review/revoke devices | `mobile_sessions`, `mobile_refresh_token_history`. We store only hashes of tokens and of the installation identifier, never the raw values. The installation identifier is replay friction, **not** hardware identity or proof of a trusted device (`docs/security/authentication.md`). |
| Email-verification and password-reset tokens (only a **hash** of the token; expiry; send count; an optional **SHA-256 hash of the requester's IP** on reset) | Confirm you control your inbox; let you reset a forgotten password | `email_verification_tokens`, `password_reset_tokens`. The raw token is only in the emailed link. On reset we store a *hash* of the requesting IP for abuse-debugging — **never the cleartext IP** — and nothing when the IP is unknown. `[COUNSEL: confirm the lawful basis and retention for requested_ip_hash; the threat model notes it is pseudonymisation, not anonymisation.]` |
| Account-status and data-request records (active / deletion-pending / restricted; request type and status; timestamps; resolution notes) | Operate the account lifecycle and handle your rights requests auditably | `data_requests`, `users.account_status`. |

Proposed basis: performance of a contract and our **legitimate interest** in the
security of the service `[COUNSEL: confirm basis]`.

> **Honesty boundary on "email verified".** Confirming your email proves only that,
> at that moment, someone could read mail at that address and used the link before
> it expired. It is **not** identity verification, age verification, a
> background check, or any safety guarantee, and we will not present it as such
> (`docs/security/authentication.md`, "Scope and honest claim boundary"). The
> privacy notice and all product copy must keep this boundary.

### 3.5 Optional product updates (separate, opt-in)

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Product-update opt-in flag, plus a history of preference changes with a recorded lawful-basis note | Send you optional, non-essential product updates **only if you choose** | `communication_preferences`, `communication_preference_events`. The default is **off** (`product_updates_opt_in DEFAULT FALSE`). |

**Accepting the Terms is not marketing consent.** Optional product updates are a
separate, specific, recorded, and withdrawable choice (this is implemented: the
opt-in defaults to false and every change is logged with its basis). Proposed
basis: **consent** `[COUNSEL: confirm consent wording, the withdrawal mechanism
text, and whether ePrivacy/national e-marketing rules add requirements.]`

### 3.6 Product feedback you choose to send

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Feedback tickets (category, surface, summary, details, the path you were on, optional expected/actual outcome, severity) | Diagnose and improve the experience | `feedback_tickets`. You can see your **own** feedback history only; there is **no cross-member staff triage queue** until a separate accountable owner, access policy, and retention period are approved (`docs/operations/decision-log.md`). The feedback form excludes a safety category and routes urgent or member-specific safety concerns to the Safety Center instead. |

Proposed basis: **legitimate interests** in improving the service `[COUNSEL: confirm basis]`.

### 3.7 What we do **not** do

To keep this notice honest and bounded, and to avoid implying capabilities we have
not built:

- We do **not** run advertising, ad targeting, or profiling for advertising.
- We do **not** sell personal data.
- We do **not** make solely automated decisions producing legal or similarly
  significant effects about you. Automated priority routing of a safety report is
  *routing assistance only* and is never a finding or a sanction
  (`docs/safety/moderation-operations.md`). `[COUNSEL: confirm this characterisation
  for Article 22.]`
- We do **not** collect identity documents, biometrics, government ID, or
  continuous/background location through ordinary use. (Approximate home location
  is a text label you type; event locations are venue details a host enters.)
- We do **not** accept uploaded files or copied message content into the
  moderation evidence store.
- There is **no open member-to-member messaging** at this stage; event rooms are
  server-authorised access to logistics, not a free-text inbox, and broad
  messaging is held until staffed human safety operations exist
  (`docs/operations/decision-log.md`).

## 4. Who can see your data

- **Other members:** see only what discovery and the event flow expose — your
  profile fields, your introduction on a request, and (for the host and accepted
  participants) the private meeting location. They never see your email, your
  exact home address (we hold a text label, not a precise home location), your
  blocks, your reports, your reflections, your device list, or your feedback.
- **Hosts/participants of an event:** see the private meeting location for that
  event because attending requires it.
- **Our safety/moderation staff:** access case data on a purpose-limited, audited
  basis (metadata-first queues; case-specific access; immutable access logging).
  A named accountable safety owner is an **owner gate** that is not yet satisfied
  (`docs/operations/owner-escalation.md`, Gate 5).
- **Processors (service providers):** [OWNER/COUNSEL: none are engaged yet. The
  hosting/database provider (Gate 1) and the transactional email provider (Gate 4)
  will be processors once selected. Before this notice is published, list each
  processor, what they process, where, and confirm a Data Processing Agreement is
  in place. Email delivery is currently **disabled by default** and provider-gated;
  no mail is sent to real inboxes today — `docs/security/authentication.md`.]
- **Authorities:** [COUNSEL: describe lawful disclosure to authorities and the
  separate law-enforcement/emergency request path referenced in
  `docs/safety/moderation-operations.md`; ordinary moderators do not improvise
  disclosures.]

## 5. International transfers

[OWNER/COUNSEL: undetermined. The recommended posture
(`docs/operations/owner-escalation.md`, Gate 1) is a single European-region
managed stack to keep data residency simple before review. State the actual
hosting region and, if any processor transfers data outside the EEA, the transfer
mechanism (e.g. adequacy decision or appropriate safeguards). Do not assert
"all data stays in the EU" until the infrastructure decision makes it true.]

## 6. How long we keep your data (retention)

**Final retention durations are deliberately not yet set.** They depend on the
launch country, the threat model, tax/legal obligations, and the moderation
process, and are a counsel/owner decision
(`docs/legal/privacy-rights-preparation.md`, "Retention decision matrix"). This
section states the *end-of-purpose action* the product already implements and
marks each period as a counsel decision.

| Data | End-of-purpose behaviour (implemented) | Retention period |
| --- | --- | --- |
| Account / profile / sports | Erased after an approved deletion request completes | `[COUNSEL: set window + exceptions]` |
| Browser & mobile sessions | Deleted/revoked at logout, rotation, expiry, password reset, or account deletion; a cleanup job prunes expired/spent records | `[COUNSEL: confirm cleanup cadence is acceptable]` |
| Verification / reset tokens | Single-use, short-lived (verification 24h, reset 60m), invalidated on use; cleanup prunes expired/consumed rows | `[COUNSEL: confirm]` |
| `requested_ip_hash` (reset) | Pruned with the token row | `[COUNSEL: confirm basis + retention — pseudonymised, not anonymised]` |
| Event participation | Minimise/aggregate/erase/restrict at end of purpose | `[COUNSEL: set safety/dispute window]` |
| Private reflections | Erase/aggregate/restrict | `[COUNSEL: set period + analytics boundary]` |
| Product feedback | Erased with the account, or after an approved shorter support window | `[COUNSEL: set period]` |
| Reports / moderation audit | Restrict, then erase or irreversibly anonymise; audit log is immutable while retained | `[COUNSEL: set period; reconcile immutability with erasure rights]` |
| Marketing/product-update consent | Opt-in and change history retained to prove a withdrawable choice; suppressed immediately on withdrawal | `[COUNSEL: set minimal suppression-record retention]` |
| Backups | Expire through backup rotation | `[OWNER/COUNSEL: depends on provider/recovery schedule once Gate 1 lands]` |

## 7. Your rights

You have the rights described by EU data-protection law — to be **informed**, to
**access** your data, to **rectify** it, to **erase** it, to **restrict** or
**object** to processing, to **data portability**, and not to be subject to solely
automated significant decisions — subject to the conditions and exceptions in the
law. Erasure in particular is **not absolute** where we must keep certain data for
a documented lawful reason (e.g. a safety or legal-obligation reason);
`docs/legal/privacy-rights-preparation.md` records this and cites the EU sources.

What the product **already implements** toward these rights:

- **Access / portability:** a machine-readable JSON export of your profile and
  sports data, your hosted events and disclosed meeting details, your requests and
  accepted seats, your reports/decision-notices/appeals/blocks (excluding security
  secrets and internal case material requiring rights-of-others review), your
  private reflections, your device-session metadata (excluding tokens/hashes), your
  product feedback, and your product-update preference and consent history. A
  completed export is itself audited.
- **Rectification:** you can edit editable profile fields with server-derived
  ownership and shared validation.
- **Erasure / restriction:** a re-authenticated deletion request immediately locks
  the profile, revokes every session, cancels hosted events, closes pending/accepted
  requests, removes accepted seats, and enters an auditable queue (active →
  deletion-pending → restricted → deleted/anonymised). **We do not promise
  unconditional instant erasure** — a deletion processor that handles dependencies,
  backups, vendors, recipients, and safety/legal exceptions is a documented
  pre-launch operation, not yet complete.
- **Objection / consent withdrawal:** product updates are opt-in and withdrawable
  with a recorded change history.

How to exercise them: [OWNER: insert the real, monitored request contact and the
response-time commitment. Counsel: EDPB guidance is "without undue delay and
generally within one month, extendable for complex requests if the person is
informed" — `docs/legal/privacy-rights-preparation.md`. The product currently has
no live request inbox; it must exist before this notice is published.]

## 8. Complaints to a supervisory authority

You can complain to a data-protection supervisory authority.
[OWNER/COUNSEL: name the lead supervisory authority for the launch jurisdiction
once Gate 3 is decided, with its contact details.]

## 9. Security

We describe our security posture honestly and do not overstate it. We hash
passwords (bcrypt cost 12) and session/verification/reset tokens (SHA-256), store
no plaintext secrets, separate precise event locations behind authorisation, emit
restrictive browser security headers, and apply app-layer rate limits. Some
controls are still development-stage: rate limiting is currently per-process and a
shared edge layer is a launch gate; integration testing against a real database is
a launch gate (`docs/security/authentication.md`,
`docs/operations/owner-escalation.md`). We will not represent the service as
production-secure to real users until those gates and a security review are met.
`[COUNSEL: confirm how much security detail belongs in a public notice versus an
internal record.]`

## 10. Changes to this notice

[Standard clause to be drafted by counsel: how we notify members of material
changes and from when changes take effect.]

---

### Open items this draft hands to counsel (summary)

1. Controller identity, DPO question, launch jurisdiction, and supervisory
   authority (depends on owner Gates 1 & 3).
2. **Special-category data position** for a dating-capable service with free-text
   fields (Article 9) — flagged in §3.1.
3. Confirmation of every proposed lawful basis in §3.
4. Final retention durations and the immutability-vs-erasure reconciliation for the
   moderation audit log (§6).
5. International-transfer position once hosting is chosen (§5).
6. Processor list + DPAs for hosting/database (Gate 1) and email (Gate 4) (§4).
7. Article 22 characterisation of automated safety-report routing (§3.7).
8. Age-assurance adequacy of self-declared date of birth (§2).
9. `requested_ip_hash` lawful basis and retention (§3.4, §6).
10. A real, monitored rights-request inbox and response-time commitment must exist
    before publication (§1, §7).
