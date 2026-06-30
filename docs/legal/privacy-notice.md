# Privacy Notice — Sport Date

> **PUBLISHED — owner-approved as of 2026-06-30.** This is one of Sport Date's
> operational legal documents, finalized and approved by the product owner for use
> as the product's working privacy notice. It is **not** legal advice and has **not**
> been reviewed or approved by a qualified lawyer. Independent review by qualified
> EU data-protection counsel remains recommended before relying on it in a dispute,
> and a small number of facts only the owner can supply are still marked
> `[OWNER TO CONFIRM: …]` inline and collected at the end of this document. Where a
> question needs qualified legal judgement (lawful bases, the Article 9 position,
> retention durations, international transfers, DSA scope), the document states the
> owner's current working position and notes that counsel confirmation is still
> recommended.

## How to read this notice

- Every factual claim about *what data we hold and why* is grounded in the
  implemented schema (`apps/web/db/*.sql`), the access/export and deletion code,
  and the documented data flows. Where the product does not yet do something, the
  notice says so rather than inventing a capability.
- This notice does **not** restate the GDPR. It maps Sport Date's *actual*
  processing onto the structure a privacy notice needs, on an **EU / GDPR baseline**.
- It cross-references and must not contradict:
  `docs/legal/privacy-rights-preparation.md` (rights, product states, retention
  matrix), `docs/security/authentication.md` (auth/session/token data and the
  honest claim boundary on email verification), `docs/security/threat-model.md`,
  and `docs/safety/moderation-operations.md` (reports, evidence, audit).
- **Working assumptions used here.** Product name **"Sport Date"** (working name).
  **EU / GDPR baseline.** Launch geography **Bucharest, Romania** — this is the
  owner's current launch *hypothesis*, not a committed final choice; the supervisory
  authority and any national-law specifics depend on confirming it. Data-minimisation
  defaults described below are already implemented.

---

## 1. Who we are (controller)

Sport Date is operated by [OWNER TO CONFIRM: the legal entity name, registered
address, and company number of the controller]. If a Data Protection Officer is
appointed or required, their contact is [OWNER TO CONFIRM: DPO / EU representative
contact, if any — counsel-confirmable whether a DPO is mandatory for the expected
scale and processing].

- **Service:** Sport Date (working name), a service that helps adults meet through
  small, local, in-person sports activities.
- **Contact for privacy questions and rights requests:** [OWNER TO CONFIRM: a
  monitored privacy/contact email for data-subject requests]. This address must be
  real and monitored before the notice is relied on with real users —
  `docs/legal/privacy-rights-preparation.md` lists "a request inbox, responsible
  owner, due-date tracking" as a required-before-real-users operation.

## 2. Scope of this notice

This notice covers personal data we process when you create and use a Sport Date
account on the web app and the mobile app. It covers account data, the sports
activities ("events") you host or join, the safety tools (blocking, reporting),
optional product-update preferences, and the technical data needed to keep
accounts secure.

**Adults only.** The service is for adults. Registration validates that the date
of birth you provide makes you at least 18 (`date_of_birth` with adult-age
validation). We do not knowingly process the data of anyone under 18. The current
control is a **self-declared date of birth, not identity-document verification**,
and this notice does not imply stronger assurance than that. Any national
age-of-consent or age-verification obligations for the launch country remain
counsel-confirmable.

## 3. What personal data we process, why, and on what basis

The lawful basis stated for each purpose below is the owner's current **working
position** on an EU/GDPR baseline; confirmation by qualified counsel remains
recommended. Each is marked `[basis — counsel-confirmable]`.

### 3.1 Account and profile data

| Data | Source | Purpose | Working lawful basis |
| --- | --- | --- | --- |
| Email address | You, at signup | Authenticate you; send security mail (verification, password reset); operate the account | Performance of a contract `[basis — counsel-confirmable]` |
| Password (stored only as a bcrypt hash, cost 12 — never the plaintext) | You | Authenticate you | Performance of a contract `[basis — counsel-confirmable]` |
| First name, last name | You | Identify you to people you choose to meet | Performance of a contract `[basis — counsel-confirmable]` |
| Date of birth | You | Confirm you are an adult; enforce per-event age ranges | Performance of a contract + legal/safety obligation `[basis — counsel-confirmable]` |
| Home location text (e.g. a city/neighbourhood label), timezone | You | Show you locally relevant events; coordinate timing | Performance of a contract `[basis — counsel-confirmable]` |
| Short bio (≤200 chars) | You | Let others decide whether to meet you | Performance of a contract `[basis — counsel-confirmable]` |
| Languages | You | Match you to events in languages you share | Performance of a contract `[basis — counsel-confirmable]` |
| "Seeking" (dating / friendship / group) | You | Reflect what you are looking for; this is treated as a member-controlled preference, never as a consolation ranking | Performance of a contract `[basis — counsel-confirmable — and see note below]` |
| Sports, skill level, frequency | You | Match you to compatible activities | Performance of a contract `[basis — counsel-confirmable]` |

> **Special-category data note.** Sport Date is positioned around *dating,
> friendship, or group activity* without treating one as a lesser option
> (`seeking`), and members write free-text bios. A service that lets people seek
> dating, combined with free-text fields, can foreseeably reveal or allow
> inference of data that GDPR Article 9 treats as special category (e.g. sexual
> orientation). The product does **not** ask for, require, or structure
> special-category data, and free-text fields are length-bounded. Whether the
> *purpose* (facilitating dating) means an Article 9 condition (e.g. explicit
> consent) is required, and whether this notice and the consent flow must reflect
> that, is the single most important substantive legal question and is **flagged
> for qualified-counsel confirmation**, not resolved here.

### 3.2 Events you host or join

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Public event details (sport, title, description, time, duration, capacity, language, age range, experience levels, **public city/area label and approximate coordinates**) | Let eligible adults discover and decide to join | Stored in `events`. Discovery sees only the *approximate* area, never the exact venue. |
| **Private meeting location** (venue name, address, precise coordinates, arrival instructions) | Tell confirmed participants where to actually go | Stored separately in `event_private_locations`. **Only the host, accepted participants, or an explicitly authorised, audited moderation path can read it.** Public discovery never joins this table. This separation is a core safety control, not a convenience. |
| Join requests (your introduction text, status, skip count) | Let hosts decide; let you track and cancel your request | `join_requests`. A host's decision not to accept ("skip") is **not exposed to you as a running rejection count** — skip count is internal to the host queue. |
| Accepted seat (numbered seat, accepted time) | Confirm your place; enforce capacity | `event_participants`. |
| Private post-event reflection (did you attend; would you join again) | Your own private progress and our aggregate product learning | `event_reflections`. Visible only to you; "would join again" supports a private progress surface with **no leaderboard, no streak, and no public popularity metric**. |

Working basis for event processing: performance of a contract (operating the
service you signed up for) `[basis — counsel-confirmable]`. The precise-location
separation and the non-exposure of rejection counts are described here because
they materially affect what *other members* can learn about you.

### 3.3 Safety: blocking, reporting, moderation

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Blocks you create | Immediately stop contact and shared access | `user_blocks`. **We never tell the other person they were blocked, and never tell anyone who blocked whom** (`docs/safety/moderation-operations.md`). |
| Safety reports you submit (category, free-text details, the reported member/event) | Investigate abuse and protect members | `safety_reports`. |
| Moderation case records, decision notices, appeals, and an append-only audit log | Investigate fairly, explain decisions, allow one appeal, and keep a tamper-evident trail | `moderation_audit_log` is immutable (insert-only; update/delete are rejected at the database, except the system clearing of a deleted user's reference). Evidence is stored as **references only** — no uploaded files, no copied messages, no precise locations (`docs/safety/moderation-operations.md`). |

Working basis: **legitimate interests** in keeping members safe and the service
trustworthy, and, where applicable, **legal obligation** (e.g. illegal-content
handling). `[basis — counsel-confirmable; Digital Services Act applicability and any
national reporting/retention obligations remain a counsel decision — already flagged
in docs/safety/moderation-operations.md.]`

**Reports about you.** If someone reports you, we may process that report and the
reporter's account of events to investigate. We balance your right to understand a
decision that affects you against the reporter's safety: a decision notice gives
you a reason and the rule or basis applied, **without exposing the reporter's
private report or identity** where protecting them is necessary. `[How Article 15
access requests interact with reporter-protection is counsel-confirmable — the
export already excludes "internal case material requiring rights-of-others review".]`

### 3.4 Account security and technical data

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Browser session records (only a SHA-256 **hash** of an opaque token; expiry) | Keep you signed in securely on the web | `sessions`. The token itself lives only in your cookie; we store only its hash. Browser sessions last 7 days. |
| Mobile session records (hashes of access/refresh tokens, a **hashed** installation identifier, a device label you/your device provides, timestamps) | Keep you signed in securely in the app and let you review/revoke devices | `mobile_sessions`, `mobile_refresh_token_history`. We store only hashes of tokens and of the installation identifier, never the raw values. Mobile refresh credentials last 30 days. The installation identifier is replay friction, **not** hardware identity or proof of a trusted device (`docs/security/authentication.md`). |
| Email-verification and password-reset tokens (only a **hash** of the token; expiry; send count; an optional **SHA-256 hash of the requester's IP** on reset) | Confirm you control your inbox; let you reset a forgotten password | `email_verification_tokens`, `password_reset_tokens`. The raw token is only in the emailed link. On reset we store a *hash* of the requesting IP for abuse-debugging — **never the cleartext IP** — and nothing when the IP is unknown. The lawful basis and retention for `requested_ip_hash` is `[basis — counsel-confirmable]`; the threat model notes it is pseudonymisation, not anonymisation. |
| Account-status and data-request records (active / deletion-pending / restricted; request type and status; timestamps; resolution notes) | Operate the account lifecycle and handle your rights requests auditably | `data_requests`, `users.account_status`. |

Working basis: performance of a contract and our **legitimate interest** in the
security of the service `[basis — counsel-confirmable]`.

> **Honesty boundary on "email verified".** Confirming your email proves only that,
> at that moment, someone could read mail at that address and used the link before
> it expired (verification links work once and expire in 24 hours). It is **not**
> identity verification, age verification, a background check, or any safety
> guarantee, and we will not present it as such (`docs/security/authentication.md`,
> "Scope and honest claim boundary"). This notice and all product copy keep this
> boundary.

### 3.5 Optional product updates (separate, opt-in)

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Product-update opt-in flag, plus a history of preference changes with a recorded lawful-basis note | Send you optional, non-essential product updates **only if you choose** | `communication_preferences`, `communication_preference_events`. The default is **off** (`product_updates_opt_in DEFAULT FALSE`). |

**Accepting the Terms is not marketing consent.** Optional product updates are a
separate, specific, recorded, and withdrawable choice (this is implemented: the
opt-in defaults to false and every change is logged with its basis). Working basis:
**consent** `[consent wording, withdrawal-mechanism text, and any ePrivacy/national
e-marketing requirements remain counsel-confirmable.]`

### 3.6 Product feedback you choose to send

| Data | Purpose | Notes grounded in implementation |
| --- | --- | --- |
| Feedback tickets (category, surface, summary, details, the path you were on, optional expected/actual outcome, severity) | Diagnose and improve the experience | `feedback_tickets`. You can see your **own** feedback history only; there is **no cross-member staff triage queue** until a separate accountable owner, access policy, and retention period are approved (`docs/operations/decision-log.md`). The feedback form excludes a safety category and routes urgent or member-specific safety concerns to the Safety Center instead. |

Working basis: **legitimate interests** in improving the service `[basis — counsel-confirmable]`.

### 3.7 What we do **not** do

To keep this notice honest and bounded, and to avoid implying capabilities we have
not built:

- We do **not** run advertising, ad targeting, or profiling for advertising.
- We do **not** sell personal data.
- We do **not** make solely automated decisions producing legal or similarly
  significant effects about you. Automated priority routing of a safety report is
  *routing assistance only* and is never a finding or a sanction
  (`docs/safety/moderation-operations.md`). `[The Article 22 characterisation is
  counsel-confirmable.]`
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
- **Processors (service providers):** [OWNER TO CONFIRM: the production processor
  list and that a Data Processing Agreement is in place with each.] On the current
  working plan the hosting/database provider (Neon, EU region), the application host
  (Vercel, `fra1`/Frankfurt), the shared rate-limit store (Upstash, EU region), and
  the error-monitoring provider (Sentry, EU data region) act as processors once
  provisioned; the transactional email provider will be a processor once selected
  (owner Gate 4). Email delivery is currently **disabled by default** and
  provider-gated; no mail is sent to real inboxes today
  (`docs/security/authentication.md`). Each processor, what it processes, and where,
  must be confirmed before the notice is relied on with real users.
- **Authorities:** we may disclose data to authorities where the law requires it,
  and there is a separate, controlled law-enforcement/emergency request path
  referenced in `docs/safety/moderation-operations.md`; ordinary moderators do not
  improvise disclosures. `[The precise lawful-disclosure wording is counsel-confirmable.]`

## 5. International transfers

The current working posture (`docs/operations/owner-escalation.md`, Gate 1) is a
**single European-region managed stack** to keep data residency simple: the
hosting/database, application host, rate-limit store, and error monitoring are all
selected in EU regions. We do **not** assert "all data stays in the EU" as a
guarantee until the infrastructure is provisioned and confirmed. If any processor
transfers data outside the EEA, the transfer mechanism (e.g. adequacy decision or
appropriate safeguards) will be stated. `[The final transfer position is
owner/counsel-confirmable once the infrastructure decision lands.]`

## 6. How long we keep your data (retention)

Where the code fixes a duration, that operating default is stated below. Where the
code does not fix one, this section states the *end-of-purpose action* the product
already implements and marks the period as an operating default that is
owner/counsel-confirmable. **Final retention durations across the matrix remain a
counsel/owner decision** (`docs/legal/privacy-rights-preparation.md`, "Retention
decision matrix").

| Data | End-of-purpose behaviour (implemented) | Retention period |
| --- | --- | --- |
| Account / profile / sports | Erased after an approved deletion request completes | Kept while the account is active; erased on approved deletion. `[Operating default; window + exceptions owner/counsel-confirmable]` |
| Browser sessions | Deleted/revoked at logout, rotation, expiry, password reset, or account deletion; a cleanup job prunes expired records | Max **7 days** per session (implemented); pruned daily by the cleanup job. `[Cleanup cadence owner/counsel-confirmable]` |
| Mobile sessions / refresh history | Revoked at logout, rotation, spent-token reuse, expiry, or deletion; cleanup prunes spent/expired rows | Refresh credential lifetime **30 days** (implemented); access token 15 minutes. `[Cleanup cadence owner/counsel-confirmable]` |
| Verification / reset tokens | Single-use, short-lived, invalidated on use; cleanup prunes expired/consumed rows | Verification **24h**, reset **60m** (implemented); rows pruned after expiry/consumption. |
| `requested_ip_hash` (reset) | Pruned with the token row | Pruned with the reset-token row (≤ token lifetime). `[Basis + retention owner/counsel-confirmable — pseudonymised, not anonymised]` |
| Event participation | Minimise/aggregate/erase/restrict at end of purpose | Operating default: retained while relevant to the activity and a safety/dispute window, then minimised. `[Safety/dispute window owner/counsel-confirmable]` |
| Private reflections | Erase/aggregate/restrict | Operating default: kept for your own private progress; erased with the account. `[Period + analytics boundary owner/counsel-confirmable]` |
| Product feedback | Erased with the account, or after an approved shorter support window | Operating default: erased with the account. `[Shorter support window owner/counsel-confirmable]` |
| Reports / moderation audit | Restrict, then erase or irreversibly anonymise; audit log is immutable while retained | Operating default: retained for the safety/dispute and appeal window (appeals open **6 months** after a decision, implemented), then minimised/anonymised. `[Period + immutability-vs-erasure reconciliation owner/counsel-confirmable]` |
| Marketing/product-update consent | Opt-in and change history retained to prove a withdrawable choice; suppressed immediately on withdrawal | Operating default: change history retained as the consent record; suppression immediate on withdrawal. `[Minimal suppression-record retention owner/counsel-confirmable]` |
| Backups | Expire through backup rotation | `[OWNER TO CONFIRM: backup/recovery schedule once infrastructure is provisioned]` |

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

How to exercise them: contact us at [OWNER TO CONFIRM: the monitored
privacy/rights-request email]. We aim to respond without undue delay and generally
within one month, extendable for complex requests if we tell you in time (EDPB
guidance — `docs/legal/privacy-rights-preparation.md`). This inbox must be real and
monitored before the notice is relied on with real users.

## 8. Complaints to a supervisory authority

You can complain to a data-protection supervisory authority. On the current launch
**hypothesis** (Bucharest, Romania), the lead authority would be the Romanian
National Supervisory Authority for Personal Data Processing (ANSPDCP). This depends
on confirming the launch jurisdiction; `[the lead supervisory authority and its
contact details are owner/counsel-confirmable once the launch country is committed.]`

## 9. Security

We describe our security posture honestly and do not overstate it. We hash
passwords (bcrypt cost 12) and session/verification/reset tokens (SHA-256), store
no plaintext secrets, separate precise event locations behind authorisation, emit
restrictive browser security headers, and apply app-layer rate limits (with an
env-gated shared store for cross-replica enforcement). Some controls are still
development-stage: integration testing against a real database is opt-in, and
shared edge enforcement activates once the store is provisioned
(`docs/security/authentication.md`, `docs/operations/owner-escalation.md`). We will
not represent the service as production-secure to real users until those gates and a
security review are met. `[How much security detail belongs in a public notice
versus an internal record is counsel-confirmable.]`

## 10. Changes to this notice

We may update this notice. When we make a material change, we will notify members
and state from when the change takes effect. `[The exact change-notification
mechanism and notice period are owner/counsel-confirmable, consistent with the
Terms §8.]`

---

## Owner inputs still required to be litigation-ready

These are facts only the owner can supply; they are **not** invented above. They
must be confirmed before this notice is relied on in a dispute:

1. **Legal entity name, registered address, and company number** of the controller (§1).
2. **A monitored privacy/contact email for data-subject (rights) requests** (§1, §7).
3. **DPO / EU representative contact, if any** (§1).
4. **The production processor list and confirmation of a DPA with each** processor (§4).
5. **Backup/recovery schedule** once infrastructure is provisioned (§6).
6. **Final launch jurisdiction** (currently the Bucharest, Romania *hypothesis*),
   which fixes the supervisory authority (§8) and any national-law specifics.

In addition, the following remain **recommended for qualified-counsel confirmation**
(legal judgement, not owner facts): the Article 9 special-category position (§3.1);
every working lawful basis (§3); the Article 22 characterisation of safety-report
routing (§3.7); final retention durations and the immutability-vs-erasure
reconciliation (§6); the international-transfer position (§5); DSA applicability
(§3.3); and age-assurance adequacy of self-declared date of birth (§2).
