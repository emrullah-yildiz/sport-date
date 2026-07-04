# CX-20260704-interactive-onboarding-gender-orientation

- Status: `in-progress`
- Severity: `medium`
- Priority: `P1` — owner-requested (2026-07-04). A warm, one-thing-at-a-time onboarding lifts completion; gender + orientation are core to a credible dating product and to future matching.
- Customer journey: new member signs up → a friendly, interactive step-by-step flow (one focused question per screen) → completes a richer, dating-ready profile.
- Surface: signup wizard (`SignUpForm` + `steps/*` + `lib/sign-up-steps.ts`) + profile schema
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`

## Task

Redesign onboarding into a **more interactive, one-question-per-step** flow, and **add gender + sexual orientation** to the profile (GDPR-careful).

**Proposed step order** (one focused thing per screen; keep credentials LAST per the prior decision):
1. First name  2. Gender  3. Sexual orientation  4. Birthday (existing DOB/18+)  5. Sports you're into (existing)  6. Intentions (dating/friendship/community — existing)  7. Photos (existing photo upload — let them add at least one here, skippable)  8. Location/area (existing)  9. Account credentials (email/password — LAST, unchanged policy)  10. Review.
(Refine order sensibly; the spirit is granular + friendly, not a wall of fields.)

## Acceptance criteria

- **Interactive UX:** one focused question per screen with a clear progress indicator; **Back preserves all entered data** (store-backed, already the pattern); mobile-first, 44px targets, visible focus, reduced-motion parity. Warm, human microcopy.
- **Gender** — inclusive options: Woman / Man / Non-binary / Prefer to self-describe (free text) / Prefer not to say. Optional but encouraged.
- **Sexual orientation** — inclusive options: Straight / Gay / Lesbian / Bisexual / Pansexual / Asexual / Queer / Questioning / Prefer to self-describe / Prefer not to say. **Optional**, never required to finish signup.
- **GDPR special-category handling (sexual orientation is Article 9 data):** collect ONLY with a clear purpose + an explicit, unbundled opt-in ("used to help match you for dating — optional, change or delete anytime"); store carefully; it is NOT shown publicly by default and the member controls its visibility; fully editable + erasable (wire into the existing GDPR erasure/export). Gender handled with similar care. Surface this as a note for the EU-counsel review (HQ card #7) — do not treat counsel sign-off as blocking the build, but flag it.
- Photos step reuses the existing upload (pending-moderation applies); skippable, with a nudge to add one.
- **DB:** additive migration — `gender`, `gender_self_describe`, `sexual_orientation`, `orientation_self_describe`, plus per-field visibility/consent flags as needed. Nullable; no backfill assumptions.
- Existing signup still works; DOB 18+ + terms + password policy unchanged; update the sign-up-step tests for the new order/fields.
- typecheck/lint/test/prod build green; tests cover: optional sensitive fields (finish without them), consent required to store orientation, back-nav data retention, inclusive option sets, erasure/export include the new fields.
- **Docs updated** (profile data model + the special-category handling).

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).

## Guardrails

- Dignified + inclusive; sensitive fields optional; never gate participation or safety on them.
- Privacy: gender/orientation default to not-publicly-exposed; member controls visibility; special-category data minimised and consented.
- No dark patterns; don't pressure disclosure. Matching/discovery USE of these fields is a **follow-up ticket** — this one collects + stores + lets the member control them.

## Process

- Adds a migration → **commit but DO NOT PUSH** + report the number. `git pull --rebase` first. Full DoD. Don't touch `apps/web/public/*.html` or `docs/marketing/**`. Read `apps/web/AGENTS.md` + Next docs before app code.
