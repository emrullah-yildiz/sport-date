# Legal draft set — compliance preparation for counsel

> **STATUS: DRAFTS — every document here requires qualified EU counsel review
> before any use.** These are *compliance preparation* artifacts written by the
> product team so that engaging counsel starts from grounded, reviewable text
> instead of a blank page. They are **not** legal advice, **not** approved, and
> must **not** be published, shown to users, accepted, or relied upon until
> counsel has reviewed, corrected, and approved them for the selected launch
> jurisdiction.

This set exists to unblock **Gate 2 (EU counsel sign-off)** in
`docs/operations/owner-escalation.md`: it converts the prepared groundwork in
`docs/legal/privacy-rights-preparation.md` into the documents counsel actually
reviews. The product team has **not** crossed any escalation gate — drafting for
counsel is explicitly permitted; representing these as final or approved is not
(root `AGENTS.md`, `.agents/skills/run-product-studio/references/escalation-policy.md`).

## Contents

| File | What it is | Primary open questions for counsel |
| --- | --- | --- |
| `privacy-notice.draft.md` | Member-facing privacy notice, mapped onto the **actually implemented** data inventory (the `apps/web/db/*.sql` schema, the export/deletion code, the auth/token data) | Lawful bases; Article 9 special-category position for a dating-capable service; final retention durations; international transfers; processor list/DPAs; Article 22 characterisation of safety-report routing |
| `terms-of-service.draft.md` | Terms describing the service as built, with honest "we do not verify / do not guarantee safety / are not the event organiser" clauses | Consumer-law enforceability; intermediary/host-liability; DSA notice-and-action; liability within mandatory-rights limits; governing law |
| `consent-copy.draft.md` | The real member-facing copy for each consent/disclosure moment (signup acceptance, email verification, opt-in product updates, location disclosure, reporting, deletion, the "seeking" field) | Acceptance mechanism; valid consent + e-marketing rules; transactional/marketing separation; DSA acknowledgement; Article 9 for the "seeking = dating" choice |
| `safety-community-guidelines.draft.md` | Member-facing safety & community guidelines (referenced by the Terms draft §4/§6), describing who the product is for, expected conduct at real meetups, prohibited conduct, the safety tools that **actually exist** (block/report/evidence-without-uploads), the real report→decision→appeal lifecycle, what the product does **not** promise, and the emergency boundary | DSA notice-and-action mapping; jurisdiction-specific conduct/illegal-content definitions; the **named safety owner** (Gate 5) and any response-time commitment; emergency guidance per country; appeal-window confirmation; age-assurance adequacy |

## Design principles these drafts follow

1. **Grounded in implementation.** Every claim about what data we hold and what the
   product does is traceable to the schema, the export/deletion code, or a security
   doc. Where a capability does not exist (open messaging, real email delivery, a
   named safety owner, a live rights inbox), the drafts say so rather than implying
   it.
2. **Honest, never overstated.** No safety guarantees, no implied identity/age
   verification, no fabricated readiness. This matches the mission "never" list and
   the experience-principles copy test.
3. **Decisions left to counsel/owner are marked, not faked.** `[COUNSEL: …]` and
   `[OWNER: …]` markers flag the controller identity, jurisdiction, retention
   durations, lawful bases, transfers, and DSA scope — these are *not* invented.
   The safety guidelines add a `[SAFETY-OWNER: …]` marker for decisions that wait on
   the named safety owner (owner Gate 5), such as staffing the human review steps and
   any response-time commitment.
4. **Internally consistent and cross-referenced.** The three drafts and the
   existing `docs/legal/privacy-rights-preparation.md`,
   `docs/security/authentication.md`, `docs/security/threat-model.md`, and
   `docs/safety/moderation-operations.md` are cross-referenced and must not
   contradict each other.

## What counsel is being handed (the consolidated ask)

Each draft ends with an "Open items this draft hands to counsel" list. The biggest
cross-cutting decisions are:

- **Controller identity, launch jurisdiction, and supervisory authority** — depend
  on owner Gates 1 and 3 (entity formation, launch country). Until these land, the
  drafts cannot be finalised, but they are reviewable now on an assumption set.
- **Article 9 special-category position** for a service that facilitates dating and
  has free-text fields — the single most important substantive legal question.
- **Final retention durations** — deliberately unset across the retention matrix;
  the product already implements the *end-of-purpose actions*, counsel sets the
  periods.
- **DSA applicability** and the resulting notice-and-action / statement-of-reasons
  / complaint-handling obligations.
- **Operational prerequisites that must exist before publication:** a real,
  monitored rights-request inbox and privacy contact; selected processors with DPAs
  (hosting/database Gate 1, email Gate 4); and a named safety owner (Gate 5).
