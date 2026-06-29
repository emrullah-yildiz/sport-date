# Safety & Community Guidelines — DRAFT for review

> **STATUS: DRAFT — requires qualified EU counsel + a named safety owner review
> before any use.** This is compliance and safety *preparation* written by the
> product team, not legal advice and not an approved or published policy. It
> exists to close the dangling reference from the Terms draft
> (`./terms-of-service.draft.md` §4, §6) and to give counsel and the eventual
> safety owner a grounded starting point. It must **not** be presented to users,
> accepted, or relied upon until counsel has reviewed it for the selected launch
> jurisdiction *and* a named safety owner (owner Gate 5) has accepted
> responsibility for the operations it describes. Accepting legal terms, making
> safety representations, and committing response times are owner/counsel
> decisions (root `AGENTS.md`, `.agents/skills/run-product-studio/references/escalation-policy.md`).
> The product team has **not** represented these as final or approved.

## How to read this draft

- This document describes the safety tools and the report-handling process **as
  actually implemented**, so that what we tell members matches what the product
  does and does not do. Where a capability does not exist yet (open messaging, a
  named safety owner, real-time human on-call coverage, committed response times,
  identity/age verification), this draft says so rather than implying it.
- It is written to the experience-principles **copy test** (`.agents/skills/run-product-studio/references/experience-principles.md`):
  clear about logistics, calm about safety, lightly alive, and it **deletes every
  claim that cannot be proved**. There are no safety guarantees and no implied
  verification anywhere in this document.
- It cross-references and must not contradict the Terms draft
  (`./terms-of-service.draft.md`), the Privacy Notice draft
  (`./privacy-notice.draft.md`), the consent/disclosure copy
  (`./consent-copy.draft.md`), and the operations docs
  `docs/safety/moderation-operations.md` and `docs/safety/moderator-access.md`.
  Those operations docs are the authoritative internal source; this is the
  member-facing expression of them.
- `[COUNSEL: …]`, `[OWNER: …]`, and `[SAFETY-OWNER: …]` mark decisions that are
  **not yet made**. They are not invented here — final jurisdiction-specific
  obligations, the named safety owner, and any response-time commitments are
  deliberately left open.

---

## 1. Who Sport Date is for

Sport Date is for **adults — you must be at least 18 to use it.** Registration
checks that the date of birth you give makes you an adult. Creating an account for
someone under 18, or giving a false date of birth, is not allowed and is grounds
for removal.

This is a self-declared check, not identity-document verification (§7, Terms §2,
Privacy Notice §2). If you ever suspect a member is under 18, report it — suspected
underage participation is one of the most serious things you can tell us (§4, §5).

Sport Date helps adults arrange and attend small, local, in-person sports
activities, and to meet people through them — for dating, friendship, or group
activity, treated as equal choices, never as a ranking. The point of the product is
a real meeting around a real activity, not screen time.

[COUNSEL: confirm the age-assurance position and any national
age-of-consent/age-verification obligations for the launch country; do not let this
document imply stronger assurance than self-declared date of birth provides — kept
consistent with Terms §2 and Privacy Notice §2.]

## 2. What we expect at a real-world sports meetup

Sport Date sends people to meet **in person**, outdoors and at venues, often for the
first time. The conduct that matters most happens off-screen. We expect you to:

- **Show up as who you said you are.** Be the person in your profile. Be honest
  about your experience level so an activity stays safe for everyone in it.
- **Treat everyone with respect — before, during, and after.** That includes
  accepting that **anyone may decline, leave early, change their mind, or not
  respond, without owing you an explanation.** Declining is never misconduct, and
  we do not show anyone a running count of how often they have been declined
  (Terms §4, §5; experience principles).
- **Keep it consensual and comfortable.** Read the room. Unwanted pursuit,
  pressure, or sexual attention is not welcome. "No", silence, and leaving all mean
  the same thing.
- **Look after the basics of your own safety.** Meet in sensible, public, or
  appropriate conditions for the sport. Tell someone you trust where you are going —
  the product reminds you of this when an exact location is revealed
  (consent copy §4). Sport Date is a tool to help you meet; it is not a chaperone,
  a guardian, or a substitute for your own judgement (§7).
- **Respect the activity, the venue, and the people around you** who are not part of
  your event.

## 3. Prohibited conduct

The following are not allowed, on the platform or at meetups arranged through it.
This list mirrors what the report categories and the Terms cover; it is not meant to
be exhaustive of every wrong, and counsel/safety-owner may add jurisdiction-specific
items.

- **Violence, threats of violence, or intimidation.**
- **Stalking, surveillance, or persistent unwanted contact**, including trying to
  find, follow, or identify someone outside the product, or trying to obtain a
  private meeting location you have not been authorised to see.
- **Sexual misconduct** — non-consensual sexual contact, coercion, sexual
  harassment, or sending sexual content to someone who has not invited it.
- **Hate** — attacks, slurs, or harassment targeting who someone is.
- **Harassment** — repeated, targeted, or degrading behaviour toward another member.
- **Endangering people at an event** — running an activity in unsafe conditions,
  misrepresenting its difficulty or risk, or putting attendees at avoidable risk.
- **Scams, fraud, or solicitation** — using Sport Date to extract money, sell, or
  recruit rather than to meet for sport.
- **Impersonation** — pretending to be someone else, or running a fake or deceptive
  profile.
- **Involving minors** — any participation by, or attempt to involve, someone under
  18.
- **Abusing the safety tools** — filing knowingly false reports to harass or silence
  someone, or weaponising blocking and reporting in bad faith.
- **Attacking other members' privacy** — scraping, harvesting, copying, or
  republishing profiles, photos (if added later), locations, or attendance; or
  trying to identify, locate, surveil, or contact someone off-platform without their
  agreement.
- **Anything illegal**, or using the service to promote, arrange, or carry out harm.

These map onto the structured report categories the product actually records (§5):
harassment, hate, sexual misconduct, violence threat, stalking, scam, impersonation,
suspected underage, unsafe event, no-show, and other.

[COUNSEL: confirm whether any of these need jurisdiction-specific definition (e.g.
the legal threshold for a "threat", or national rules on hate speech), and which
categories may be "illegal content" triggering specific Digital Services Act
notice-and-action handling if the service is in scope — already flagged in
`docs/safety/moderation-operations.md`.]

## 4. The safety tools that actually exist, and how they work

Sport Date keeps its safety promises small and real. Here is exactly what you can do
today.

### Blocking

You can **block** another member at any time, from the surfaces where you encounter
them (a discovered host, a pending requester, a room host, another participant).
Blocking takes effect **immediately**:

- it **stops contact and shared access** between you and that member — pending and
  accepted requests, accepted seats, event-room access, and any precise-location
  access that depended on the relationship are revoked at once;
- it is **mutual in effect for discovery**: an event disappears from discovery when
  either person has blocked the other, with **no reason or placeholder shown**, so
  the block is not revealed through the product's behaviour;
- **we never tell the other person they were blocked, and never tell anyone who
  blocked whom** (`docs/safety/moderation-operations.md`; Privacy Notice §3.3).

Blocking is yours to use without justifying it to anyone.

### Reporting

You can **report** a safety concern using a **structured report** — you choose a
category and describe what happened in your own words (the product requires enough
detail to be useful and caps the length). You can report a member, an event, or
both. When you submit a report:

- it is **stored and acknowledged with a case reference**;
- it is kept **confidential from the person you are reporting** — we do not tell them
  who reported them (consent copy §5; Privacy Notice §3.3);
- if you also blocked the person, the access revocation above applies immediately,
  before anyone reviews anything — **we contain risk before debating intent**.

**Reporting is not an emergency channel.** Sport Date cannot send help. If you are in
immediate danger, contact your local emergency services. The report form and
acknowledgement state this every time (consent copy §5; §8 below).

### Evidence — what we keep, and what we do *not* take

The product preserves the **text you submit** and a small set of **immutable
references** (a source type, a sensitivity flag, a human-readable label, an opaque
locator, why it is being preserved, and a retention-review date). It deliberately
does **not** accept **uploaded files, copied messages, screenshots, credentials,
token-bearing links, or precise locations** into the moderation evidence store
(`docs/safety/moderation-operations.md`; Privacy Notice §3.7). Please do not paste
sensitive material into a report expecting it to be stored as evidence — it is not
the channel for that, and secure attachment handling is a deliberate
not-yet-built decision, not an oversight.

### What there is *not* (yet)

- **There is no open member-to-member messaging.** Event "rooms" give authorised
  participants access to logistics — they are **not** a free-text inbox. Broad
  messaging is intentionally held until staffed human safety operations exist
  (`docs/operations/decision-log.md`; Terms §3; Privacy Notice §3.7).
- There is no in-product "panic button", live location sharing, or emergency
  dispatch, and we do not imply one.

## 5. What happens after you report — the real lifecycle

This is the process the product implements, stated plainly. It is grounded in
`docs/safety/moderation-operations.md` and `docs/safety/moderator-access.md`; it is
the member-facing summary, not a separate set of promises.

1. **We acknowledge it** and give you a **case reference**, and we remind you of the
   emergency limitation (we cannot provide emergency help).
2. **We contain risk first.** Any block you requested is applied immediately, and the
   shared requests, seats, room access, and precise-location access tied to it are
   removed — *before* any judgement about who is right.
3. **We triage it.** Reports carry an internal priority used **only to order review**
   — it is routing assistance, never a finding or a punishment. The most serious
   categories (violence threats, stalking, suspected underage) are routed for the
   fastest human review; sexual-misconduct, hate, and unsafe-event reports next;
   other conduct after that.
4. **We look into it**, keeping the reporter's account, the system records, and the
   reported person's response separate, and noting what is corroborated and what is
   unknown.
5. **We decide.** A decision is one of: **no action, a warning, removing an event,
   restricting a feature, a temporary suspension, permanent removal, or external
   escalation** — these are the exact outcomes the product records.
6. **We tell the people affected.** A member affected by a decision sees it in a
   private **Safety Center**, with the **rule or basis** applied and a meaningful
   reason — **without exposing the reporter's private report or identity** where
   protecting them is necessary (Privacy Notice §3.3). Reporters see a
   reporter-safe summary of the outcome of their report.
7. **You can appeal — once.** Each case allows **one structured appeal** per affected
   person. An appeal is reviewed by **someone other than the person who made the
   original decision** (the product enforces this separation in the database, not
   just by policy — `docs/safety/moderator-access.md`), and the outcome is recorded
   as **upheld, modified, or reversed** and shown back to you. The appeal window is
   currently set at **six months** in the product, subject to counsel review for the
   launch jurisdiction.
8. **Everything is auditable.** Every state change appends to an **append-only
   moderation audit log** that the application can never edit or delete, so a case's
   history cannot be quietly rewritten.

**An appeal never automatically restores contact between blocked members.** Your
block stands unless you choose otherwise.

[SAFETY-OWNER: the named safety owner and escalation rota (owner Gate 5) do not yet
exist. Until they do, the *human* steps above — triage, investigation, decision,
appeal review, and any committed turnaround — are not staffed, and no response-time
commitment can be made to members. The internal priority targets in
`docs/safety/moderation-operations.md` (e.g. 15 minutes for critical) are
**readiness targets, not public promises** and must not appear in member-facing copy
until a named owner accepts them.]

[COUNSEL: confirm Digital Services Act applicability and, if in scope, the required
notice-and-action acknowledgement, statement-of-reasons content, internal
complaint-handling, and out-of-court dispute provisions, and how they map onto the
lifecycle above — already flagged in `docs/safety/moderation-operations.md` and
Terms §6.]

## 6. If you are the one reported

Being reported does not by itself mean you did something wrong. We look into reports
rather than acting on accusation alone. If a decision affects you, you will get a
meaningful reason and the rule or basis we applied, and **one** chance to appeal it
to a different reviewer (§5). We balance your right to understand a decision against
the need to protect a reporter's safety, so a notice may give you the substance of
the concern without revealing who raised it or their private account
(Privacy Notice §3.3).

[COUNSEL: confirm how this reporter-protection balance interacts with the reported
person's rights (e.g. a data-access request, or a DSA statement of reasons if in
scope). The data export already excludes "internal case material requiring
rights-of-others review" — Privacy Notice §3.3, §7.]

## 7. What Sport Date does **not** promise

These are the honesty boundaries. They are the same ones in the Terms and Privacy
Notice, repeated here because this is the document members are most likely to read
about safety.

- **We do not verify identity, age, background, or trustworthiness.** Email
  verification, when enabled, proves only that someone could read mail at an address
  at a moment in time — it is **not** identity, age, or safety verification
  (Terms §3; Privacy Notice §3.4; consent copy §2). You are meeting strangers.
- **We do not guarantee your safety**, and we cannot promise to prevent harm. The
  safety tools reduce risk and help you act; they are not a guarantee.
- **We are not the organiser of members' events.** Hosts create and run their own
  activities. We are not a party to them, do not supervise them, and do not control
  venues, conditions, or who attends (Terms §3, §5). We are not a chaperone or a
  guardian.
- **We cannot provide emergency help**, and we do not promise emergency intervention
  or any specific response time to members (§5, §8).
- **We hold human safety operations, named safety staff, and open messaging until
  they genuinely exist.** We will not pretend any of them is in place before it is
  (owner Gate 5; `docs/operations/decision-log.md`).

We would rather under-promise here than imply protection we cannot deliver.

## 8. Emergencies — what to do, and our boundary

**If you or someone else is in immediate danger, contact your local emergency
services right away.** Sport Date is not an emergency service, has no way to dispatch
help, and cannot intervene in real time. The report form and acknowledgement state
this each time you use them (consent copy §5).

After you are safe, you can still report what happened through the product so we can
act on the account or event, and you should keep any evidence you have in case the
authorities need it (note that, today, the product does not accept uploaded files or
copied content as evidence — §4).

[COUNSEL/SAFETY-OWNER: provide the correct emergency guidance for the launch country
(e.g. the local emergency number and any country-specific reporting routes for
specific harms), and the separate, controlled path for law-enforcement or emergency
requests that `docs/safety/moderation-operations.md` requires — ordinary moderators
must not improvise disclosures. Do not insert a specific emergency number until the
launch country is confirmed (owner Gate 3).]

## 9. Changes to these guidelines

[COUNSEL: draft how members are notified of material changes and when changes take
effect, consistent with the Terms (§8) and Privacy Notice (§10) change-notification
clauses.]

## 10. Contact

[OWNER: insert the real, monitored safety/abuse contact — the same operational
prerequisite as the rights-request inbox in the Privacy Notice (§1, §7). No
member-facing safety contact exists yet; one must exist before these guidelines are
published.]

---

### Open items this draft hands to counsel / the safety owner (summary)

1. **Named safety owner and escalation rota** (owner Gate 5): until named, the human
   review/appeal steps in §5 are unstaffed and no response-time commitment can be
   made (§5, §7).
2. **Digital Services Act applicability** and the resulting notice-and-action,
   statement-of-reasons, complaint-handling, and out-of-court dispute obligations
   mapped onto the lifecycle (§3, §5, §6).
3. **Jurisdiction-specific definitions** of prohibited conduct and which categories
   constitute "illegal content" (§3).
4. **Age-assurance adequacy** of self-declared date of birth and any national
   age-verification obligations (§1).
5. **Reporter-protection vs. reported-person rights** balance, including data-access
   and statement-of-reasons interactions (§5, §6).
6. **Emergency guidance** — the correct local emergency number and any
   country-specific harm-reporting routes, plus the controlled law-enforcement /
   emergency disclosure path (§8), pending the launch country (owner Gate 3).
7. **Appeal window** — the product currently uses six months; confirm it for the
   launch jurisdiction (§5).
8. **Real, monitored safety/abuse contact** must exist before publication (§10).
9. **Change-notification mechanism**, consistent with the Terms and Privacy Notice
   (§9).
