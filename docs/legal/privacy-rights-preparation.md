# European privacy rights preparation

This document is product and compliance preparation, not legal advice. A qualified lawyer must review the final policy, lawful bases, retention periods, notices, and operational procedure for the selected launch countries.

> **Finalized legal documents (2026-06-30).** The GDPR-baseline legal set in
> `docs/legal/` (Privacy Notice, Terms of Service, Safety & Community Guidelines, and
> consent/disclosure copy) turns this preparation into the product's **owner-approved
> operational** documents. They are headed "PUBLISHED — owner-approved as of
> 2026-06-30", are grounded in the data flows and retention matrix below, and must
> not contradict this document. They are **not** legal advice and have **not** been
> lawyer-reviewed; independent qualified-EU-counsel review remains recommended before
> relying on them in a dispute. Start at `docs/legal/README.md`. (The earlier
> `docs/legal/drafts/` versions are superseded and kept only for history.)

## Official baseline

The European Commission describes rights to information, access, rectification, erasure, restriction, portability, objection, and safeguards around automated decisions. Electronic access requests should generally receive a commonly used electronic form. Erasure is not absolute where processing remains necessary for specified legal reasons.

Sources:

- European Commission, "Information for individuals": https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- European Commission, "Do we always have to delete personal data if a person asks?": https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-citizens/do-we-always-have-delete-personal-data-if-person-asks_en
- European Data Protection Board, SME guide on responding to erasure requests: https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/how-do-i-respond-request-erasure_en

The EDPB says requests should be answered without undue delay and generally within one month, with a possible extension for complex requests if the person is informed in time. Verify the exact procedure and national considerations with counsel before launch.

## Product states

### Active

The member can authenticate, access their profile, request a machine-readable export, correct editable profile information, and start a deletion request.

### Deletion pending

The product immediately locks the profile and revokes all sessions. The request enters an auditable queue. No marketing, discovery, event, or messaging processing should continue. An operator must determine which data can be erased immediately and which, if any, must be restricted and retained for a documented lawful reason.

### Restricted

The account cannot participate in normal product processing. Storage and narrowly permitted processing may continue only under an approved reason. The data subject must be informed where required.

### Deleted or irreversibly anonymised

Direct account and profile identifiers are erased. Aggregated product statistics may remain only if anonymisation is irreversible; pseudonymised but re-identifiable data remains personal data.

## Implemented foundation

- JSON account export containing profile and sports data, excluding password hashes and session secrets.
- An audit record for completed access exports.
- Export coverage for hosted events, requests, accepted seats, and precise meeting details already disclosed to the member.
- Export coverage for safety reports, reporter-visible decision notices, appeals submitted, and member blocks created, excluding security secrets and internal case material requiring rights-of-others review.
- Export coverage for private attendance and willingness-to-join-again reflections, including whether each reflection qualified for the private Movement Arc.
- Export coverage for native device-session metadata such as device label, use time, expiry, and revocation, while excluding access and refresh tokens and hashes.
- Export coverage for product-experience feedback submitted from web or mobile; feedback ownership is session-derived and records are deleted with the owning account.
- Export coverage for separate optional product-update preference state and member-visible consent history.
- Password re-authentication before requesting deletion.
- Immediate transition to `deletion_pending` and revocation of every session.
- Immediate cancellation of hosted events, closure of pending/accepted requests, and removal of accepted seats when deletion is requested.
- Auditable data-request states for access, deletion, restriction, and rectification.

## Retention decision matrix

Final durations are deliberately unset until the launch country, infrastructure, threat model, tax/legal obligations, and moderation process are approved.

| Data | Active purpose | End-of-purpose action | Decision still required |
| --- | --- | --- | --- |
| Account/profile | Provide the member service | Erase after approved deletion request | Operational response window and exceptions |
| Sessions | Authenticate devices | Delete at logout/rotation/expiry | Automated cleanup frequency |
| Event participation | Coordinate and secure events | Minimise, aggregate, erase, or restrict | Safety and dispute window |
| Private event reflections | Personal progress and product outcome learning | Erase, aggregate, or restrict | Lawful basis, analytics boundary, and retention period |
| Product feedback | Diagnose and improve the member experience | Erase with the account or after an approved shorter support window | Lawful basis, access roles, and retention period |
| Messages | Participant coordination and safety | Erase or restrict | User expectations, report preservation, dispute window |
| Reports/audit | Investigate abuse and defend rights | Restrict, then erase or irreversibly anonymise | Lawful basis and retention period |
| Backups | Recovery and resilience | Expire through backup rotation | Provider and recovery schedule |
| Marketing consent | Send optional marketing | Suppress immediately on withdrawal | Provider and minimal suppression record |

## Consent and lawful basis boundary

Accepting product terms is not a blanket privacy or marketing consent. Marketing opt-in must be separate, optional, specific, recorded, and withdrawable. The lawful basis for each processing purpose must be recorded before production collection begins.

## Required operations before real users

- Identity verification proportionate to each rights request without collecting unnecessary ID documents.
- A request inbox, responsible owner, due-date tracking, recipient notification, and appeal/escalation process.
- Export coverage for future messages, consent history, relevant profiling, and any additional moderation records once those records exist.
- A deletion processor that handles dependencies, backups, vendors, recipients, safety exceptions, and completion notices.
- Privacy notice mapping purposes, lawful bases, recipients, transfers, retention criteria, rights, and complaint routes.
