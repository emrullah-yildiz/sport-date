# Legal documents — Sport Date

> **These finalized documents are the canonical legal set as of 2026-06-30.** They
> are **PUBLISHED — owner-approved**, the product's operational legal documents. They
> are **not** legal advice and have **not** been reviewed or approved by a qualified
> lawyer; independent review by qualified EU counsel remains recommended before
> relying on them in a dispute. The earlier `drafts/` versions are superseded and
> kept only for history.

## The finalized set

| File | What it is |
| --- | --- |
| [`privacy-notice.md`](./privacy-notice.md) | Member-facing privacy notice, mapped onto the **actually implemented** data inventory (`apps/web/db/*.sql` schema, export/deletion code, auth/token data). |
| [`terms-of-service.md`](./terms-of-service.md) | Terms describing the service as built, with honest "we do not verify / do not guarantee safety / are not the event organiser" clauses. |
| [`safety-community-guidelines.md`](./safety-community-guidelines.md) | Member-facing safety & community guidelines: who the product is for, expected conduct, prohibited conduct, the safety tools that **actually exist** (block/report/evidence-without-uploads), the real report→decision→appeal lifecycle, and the honesty boundaries. |
| [`consent-copy.md`](./consent-copy.md) | The real member-facing copy for each consent/disclosure moment (signup acceptance, email verification, opt-in product updates, location disclosure, reporting, deletion, the "seeking" field). |

Supporting (unchanged): [`privacy-rights-preparation.md`](./privacy-rights-preparation.md)
— the rights, product states, and retention matrix the privacy notice is grounded in.

## What "owner-approved as of 2026-06-30" means and does not mean

- **Means:** the owner has reviewed and approved these as the product's working
  operational legal documents, on the resolved working assumptions below.
- **Does not mean:** that a lawyer reviewed or approved them, or that they are legal
  advice. The published header on each document is honest about this and notes that
  qualified-counsel review remains recommended before relying on them in a dispute.

## Resolved working assumptions

- Product name **"Sport Date"** (working name).
- **EU / GDPR baseline.**
- Launch geography **Bucharest, Romania** — the owner's current launch *hypothesis*,
  not a committed final choice; the supervisory authority, emergency number, and any
  national-law specifics depend on confirming it.
- **Data-minimisation defaults already implemented** (precise-location separation,
  hashed tokens, opt-in-off marketing, no file/message evidence uploads, no open
  messaging).
- Implemented retention behaviour is used where the code fixes a period (browser
  session 7 days, mobile refresh 30 days, email verification 24h, password reset 60m,
  appeal window 6 months); where the code does not fix one, the operating default is
  stated and marked owner/counsel-confirmable.

## Owner inputs still required to be litigation-ready

Each document carries its own "Owner inputs still required" list. Consolidated, the
facts only the owner can supply are:

1. **Legal entity name, registered address, and company number** of the controller.
2. **A monitored privacy/contact email for data-subject (rights) requests**, and the
   same/parallel **monitored safety/abuse contact** and member contact.
3. **DPO / EU representative contact, if any.**
4. **The production processor list and confirmation of a DPA with each.**
5. **A named safety/moderation owner and escalation rota** (owner Gate 5).
6. **Real Terms / Privacy Notice / app links** for the consent copy, and an
   **enabled email provider** (Gate 4) before verification mail sends.
7. **Final launch jurisdiction** (currently the Bucharest, Romania hypothesis), which
   fixes the supervisory authority, governing law, and the local emergency number.
8. **Backup/recovery schedule** once infrastructure is provisioned.

Beyond owner facts, qualified-counsel review remains **recommended** on the
substantive legal judgements flagged inline in each document (notably the Article 9
special-category position, lawful bases, retention durations, international transfers,
DSA scope, the liability section, and age-assurance adequacy).
