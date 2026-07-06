# CX-20260706-research-page-denies-product-exists

- Status: `ready`
- Severity: `high`
- Priority: `P1` — the live survey page tells interested people there is nothing to join, while the product is in open beta; every survey visitor is a lost signup
- Customer journey: an interested person lands on `/research` (from the landing "Take the 2-min survey" CTA or a shared link) → reads the intro → is told "there is no service to join yet" → leaves believing KeepItUp doesn't exist yet
- Surface: `web` — live `/research`
- Environment and viewport/device: any; verified on live production HTML (2026-07-06)
- Found by: Seraph user-sim daily pass (live fetch of https://www.keepitup.social/research)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-research-self-hosted-market-survey` (created this page and mandated the kit intro verbatim — correct at the time; the "no service yet" claim has since become false)

## Customer outcome

As someone curious enough to answer a survey about meeting people through sport, I want to be told the truth about what exists, so I can go try it. In user voice: "I clicked the survey from your own homepage that says 'open beta, free for everyone, right now' — and the survey says 'It is not a sign-up and there is no service to join yet.' So does the app exist or not?"

## What I observed (live, 2026-07-06)

https://www.keepitup.social/research intro reads: "This is a short, anonymous research survey about how adults currently find people to be active with. **It is not a sign-up and there is no service to join yet.**"

The landing page simultaneously says: "KeepItUp is in open beta — no invite, no payment, open to any adult (18+)."

The original honesty rationale (never quote the survey as demand, don't make it a growth funnel) remains right — but "there is no service to join yet" is now simply false and actively turns away the warmest possible visitors.

## What I expected

The intro stays honest and non-recruiting about the survey itself ("not a sign-up", anonymous, skippable, answers never used as traction claims) while stating the current truth, e.g. "This survey is separate from the KeepItUp open beta — answering is not a sign-up." Optionally one quiet link back to the product AFTER submission, so research answers stay unbiased.

## Reproduction

1. Open https://www.keepitup.social/ and note the "Open beta" band + "Take the 2-min survey" CTA.
2. Open https://www.keepitup.social/research and read the intro paragraph.

Reproduction rate: 2/2 live fetches.

## Customer impact

Direct conversion loss (survey visitors told nothing exists) and a credibility contradiction with the landing page. No privacy/safety exposure. The research-integrity guardrails (anonymous, no demand-quoting) must be preserved.

## Duplicate check

- Search terms used: "research", "survey", "no service", "not a sign-up".
- Tickets reviewed: `CX-20260704-research-self-hosted-market-survey` (the page's source ticket — mandated the then-true intro; updating that closed work item is wrong, so a new ticket).
- Why this is new: the falsehood arose from the product changing (open beta) after the survey shipped.

## Acceptance criteria

- [ ] Live `/research` no longer claims "there is no service to join yet" (or any equivalent).
- [ ] The survey's honesty properties are preserved: clearly not a sign-up, anonymous, skippable, no answer used as demand/traction, contact consent unchanged.
- [ ] Copy reviewed against the survey-kit intent (research not biased toward the product; any product link appears only after submission, if at all).
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass, live-site fetch); status `ready`.
