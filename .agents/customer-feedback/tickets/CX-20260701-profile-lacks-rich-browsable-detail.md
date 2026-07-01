# CX-20260701-profile-lacks-rich-browsable-detail

- Status: `implemented`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 5 × Impact 4 × Confidence 3) / Effort 4 = 15. High value but broad; sequence after the host/discovery fixes and the photo data model.
- Customer journey: trust check
- Surface: `web`
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-01, "improve details about a person's profile as if it is a Tinder profile")
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-profile-photo-series-up-to-six`

## Customer outcome

As a member deciding whether to meet someone, I want a richer, browsable profile so that I can get a genuine sense of who they are before committing to a shared activity.

## What I observed

The profile is sparse: name, location, optional bio, a "seeking" word, and a sports list. It reads like an account record, not a person. There is little for another member to learn before deciding to join or accept.

## What I expected

A warmer, more complete profile a member can browse — alongside photos (separate ticket): a real intro, sport details with skill/frequency presented humanly, languages, what they're seeking (dating / friendship / group, none treated as a consolation prize), and a few light, optional prompts that reveal personality without enabling scraping or stalking.

## What I expected to avoid (guardrails)

Per experience principles: no attractiveness scores, no public popularity metrics, no infinite-swipe framing. "Tinder-like" here means *rich and humane*, not engagement-maximising or appearance-ranked. Show enough humanity to build trust without exposing people to harvesting or precise location.

## Reproduction

1. View a member profile. Note how little a stranger can learn.

Reproduction rate: `confirmed; content gap`

## Customer impact

Thin profiles weaken the trust check and make meeting strangers feel riskier and less appealing. No auth/privacy regression in the current state, but additions must respect privacy and anti-objectification rules.

## Acceptance criteria

- [ ] The profile presents a richer, well-organised set of humane details (intro, sports presented warmly, languages, seeking intent, optional prompts).
- [ ] Optional prompts are genuinely optional, editable, and removable; no field is mandatory beyond what's already required.
- [ ] Layout is browsable and on-brand at mobile and desktop; clear empty states for unfilled sections.
- [ ] No attractiveness/score/popularity mechanics; seeking options are presented as equals.
- [ ] No precise location or contact detail exposed; data minimised; accessibility (focus, naming, contrast, 44px) covered.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `in-progress`. Shipping richer humane presentation of existing fields (intro, sports, languages, seeking presented as equals) plus optional/editable/removable personality prompts stored via the existing profile update path (migration 020 adds a length-capped `personality_prompts` JSONB column).
- 2026-07-01 - experience-build-agent implemented (commit `29b4f06`). /profile reorganised into humane sections (Intro, Looking for with all seeking intents as equals, Languages chips, Account, On the field with human skill/frequency phrases, In their words); added optional/editable/removable personality prompts from a curated list (max 3, answer <= 140 chars) via migration 020 (`personality_prompts` JSONB), wired through getCurrentUser + mobile session + profile PATCH + GDPR export. Guardrails held: no scores/popularity, seeking presented as equals, no precise location/extra contact, on brand, 44px, no new motion, no overflow at 1280/375. Checks: typecheck pass, lint pass (only pre-existing warning in untracked qa/full-flows.mjs), web tests 177 pass/12 skipped, domain tests 64 pass (new prompt cases), migration applied + verified, profile view/edit confirmed logged in as pooled host-A at desktop and mobile. Prompts SHIPPED in this unit (no follow-up split). Ready for independent retest.
