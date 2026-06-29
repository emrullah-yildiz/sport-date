# Terms of Service — DRAFT for counsel review

> **STATUS: DRAFT — requires qualified EU counsel review before any use.**
> This is compliance *preparation* written by the product team, not legal advice
> and not approved terms. It exists to give counsel a grounded starting point. It
> must not be presented to users, accepted, or relied upon until counsel has
> reviewed, corrected, and approved it for the selected launch jurisdiction.
> Accepting legal terms and making legal representations are owner/counsel
> decisions (root `AGENTS.md`, escalation policy). The product team has **not**
> represented these as final or approved.

## How to read this draft

- This draft describes the service **as actually implemented**, so that the
  obligations and disclaimers match what the product does and does not do. Where a
  capability does not exist yet (e.g. open messaging, real email delivery, a named
  safety owner), the draft does not pretend it does.
- It is deliberately **consumer-fair and plain**. EU consumer-protection law
  constrains unfair terms; counsel must confirm enforceability, mandatory consumer
  rights (including any right of withdrawal for a digital service), and required
  pre-contract information for the launch jurisdiction.
- It cross-references and must not contradict the Privacy Notice draft
  (`./privacy-notice.draft.md`), the Safety/Community guidelines draft
  (`./safety-community-guidelines.draft.md`), and the safety operations doc
  (`docs/safety/moderation-operations.md`).
- `[COUNSEL: …]` / `[OWNER: …]` mark unresolved decisions.

---

## 1. Who these terms are between

These terms are an agreement between you and [OWNER/COUNSEL: insert the legal
entity once formed — same controller as the Privacy Notice; the entity does not
yet exist]. They govern your use of Sport Date (working name), a service that
helps adults arrange and attend small, local, in-person sports activities.

By creating an account you confirm you accept these terms and have read the
Privacy Notice. [COUNSEL: confirm the acceptance mechanism and that acceptance is
recorded — the product records `accepted_terms_at` at signup.]

## 2. Who can use Sport Date

- **You must be at least 18.** Registration checks that the date of birth you give
  makes you an adult. Creating an account on behalf of a minor, or providing a
  false date of birth, is not permitted. [COUNSEL: confirm age-assurance adequacy;
  the control is self-declared date of birth, not ID verification — kept consistent
  with the Privacy Notice §2.]
- You must provide accurate registration information and keep your account
  credentials secure.
- One person, one account, used by you. [COUNSEL: confirm.]

## 3. What Sport Date is — and what it is not

**What it is.** A tool to discover local sports events, request to join, host your
own, coordinate the logistics of meeting in person, and use safety controls
(blocking and reporting). You can indicate whether you are seeking dating,
friendship, or group activity, and these are treated as equal member-controlled
choices.

**What it is not — important honesty clauses.** These reflect the real product and
the mission's "never overstate safety" rule:

- **Sport Date does not verify members' identity, age, background, or
  trustworthiness.** Email verification (when enabled) proves only control of an
  inbox at a moment in time — it is **not** identity, age, or safety verification
  (Privacy Notice §3.4). You are meeting strangers; use your own judgement.
- **Sport Date does not guarantee safety, and does not promise emergency
  intervention or any specific response time to real users.** Internal response
  targets in `docs/safety/moderation-operations.md` are operational readiness
  targets, **not** public promises, and depend on staffing that is an owner gate.
- **Sport Date is not the organiser of members' events.** Hosts create and run
  their own activities. We are not a party to them, do not supervise them, and do
  not control venues, conditions, or other attendees. [COUNSEL: this
  intermediary/host-liability characterisation needs review, especially against
  any platform-liability or DSA obligations.]
- **There is no open member-to-member messaging at this stage.** Event "rooms"
  give authorised participants access to logistics, not a free-text inbox.

## 4. Your responsibilities

You agree to:

- be honest in your profile and in how you present yourself;
- treat other members with respect, before, during, and after meeting, and accept
  that **anyone may decline, leave, or not respond without owing you an
  explanation** — declining is not misconduct;
- follow the Safety & Community Guidelines (`./safety-community-guidelines.draft.md`);
- meet in sensible, public, or appropriate conditions and take responsibility for
  your own safety when meeting people in person;
- not misuse the safety tools (e.g. filing knowingly false reports to harass
  someone);
- not scrape, harvest, copy, or republish other members' profiles, photos (if
  added later), locations, or attendance;
- not attempt to identify, locate, surveil, stalk, or harass other members,
  including by trying to obtain a private meeting location you are not authorised
  to see;
- not use the service for anything illegal, or to promote, arrange, or carry out
  harm, harassment, hate, sexual misconduct, scams, or impersonation.

## 5. Hosting an event

If you host, you also agree to:

- describe the activity, location, capacity, age range, and conditions honestly;
- set the **public approximate area** for discovery and a separate **private exact
  location** revealed only to accepted participants — the product enforces this
  separation, and you must not defeat it by, for example, putting the exact address
  in the public description;
- make accept/decline decisions without harassment, and understand that not
  accepting a request is private to you (the product does not broadcast a
  member's rejection count);
- cancel responsibly and within any cancellation rules, recognising that people
  may have arranged their day around your event.

[COUNSEL: hosts who organise in-person gatherings may carry their own legal
duties/liability; confirm what, if anything, the terms should say about host
responsibility, insurance, and venue permissions, without us assuming the role of
organiser.]

## 6. Safety, moderation, blocking, and reporting

- You can **block** another member at any time. Blocking immediately stops contact
  and shared access. We do not tell the other person they were blocked.
- You can **report** safety concerns. We will handle reports under our safety
  process, which separates allegation, evidence, decision, and appeal, and keeps an
  immutable audit trail.
- We may, where justified and proportionate, restrict, suspend, or remove an
  account or content, or remove an event, for breaches of these terms or the
  guidelines, or to protect members. Where we make a decision that affects you, we
  aim to give you a meaningful reason and the rule or basis applied, and **one**
  structured appeal, **without exposing another person's private report**
  (`docs/safety/moderation-operations.md`).
- [COUNSEL: confirm Digital Services Act applicability and, if in scope, the
  required notice-and-action mechanism, statement-of-reasons content, internal
  complaint-handling, and out-of-court dispute provisions. This is already flagged
  as a counsel decision in the safety operations doc.]

## 7. Your content and data

- You keep your rights in what you contribute (profile text, event descriptions,
  introductions, reflections, feedback). You grant us a limited licence to host and
  display that content **only as needed to run the service** (e.g. showing your
  profile to members you choose to meet). [COUNSEL: confirm licence scope; keep it
  minimal — no advertising or resale, consistent with Privacy Notice §3.7.]
- How we handle personal data is described in the Privacy Notice
  (`./privacy-notice.draft.md`). Accepting these terms is **not** consent to
  marketing; optional product updates are a separate opt-in.

## 8. Availability, changes, and beta status

- Sport Date is, at this stage, an early/limited service. Features may change, and
  parts may be unavailable. [COUNSEL/OWNER: until the launch gates in
  `docs/operations/owner-escalation.md` are met, the service must not be promoted
  to real users as production-ready; align the "beta"/availability wording with the
  actual launch decision.]
- We may update these terms. [COUNSEL: draft the change-notification mechanism,
  notice period, and consumer-friendly handling of material changes, consistent
  with Privacy Notice §10.]

## 9. Ending your use

- You can stop using Sport Date and request deletion at any time. A deletion
  request immediately locks your profile and signs you out everywhere, then enters
  an auditable process; some data may be retained where a documented lawful or
  safety reason requires it (Privacy Notice §6, §7).
- We may end or restrict your access for a serious or repeated breach, or where
  necessary to protect members, applying the decision/appeal process in §6.
  [COUNSEL: confirm notice, proportionality, and any consumer-law constraints on
  termination.]

## 10. Liability

[COUNSEL: draft the liability section. The product team's honest input is that the
service:
- does not verify members and does not guarantee safety (§3);
- is not the organiser of members' in-person events (§3, §5);
- is an intermediary providing tools.
Counsel must set any limitation/exclusion of liability **within the bounds EU
consumer law allows** — mandatory consumer rights and liability for death/personal
injury caused by negligence, fraud, etc. cannot be excluded. Do not include a
sweeping "we are not liable for anything" clause; it would be unfair and
unenforceable.]

## 11. Governing law and disputes

[OWNER/COUNSEL: undetermined until the launch jurisdiction is chosen (Gate 3).
For EU consumers, mandatory consumer-protection rules and the right to bring
proceedings in their own jurisdiction generally cannot be removed by a choice-of-law
clause; counsel must draft accordingly.]

## 12. Contact

[OWNER: insert the real, monitored contact address — the same one referenced in
the Privacy Notice for rights requests must exist before these terms are
published.]

---

### Open items this draft hands to counsel (summary)

1. Legal entity, jurisdiction, governing law, and consumer-dispute provisions
   (Gates 1 & 3).
2. Enforceability under EU consumer-protection law (unfair-terms review), and any
   right of withdrawal / pre-contract information requirements.
3. The intermediary / host-liability characterisation (§3, §5) and the liability
   section (§10) — within mandatory-rights limits.
4. Digital Services Act applicability and the resulting notice-and-action,
   statement-of-reasons, and complaint-handling obligations (§6).
5. Age-assurance adequacy of self-declared date of birth (§2).
6. Content-licence scope (§7) — keep minimal, no advertising/resale.
7. Acceptance mechanism and change-notification mechanism (§1, §8).
8. Alignment of "beta"/availability wording with the actual launch decision and
   the launch gates.
