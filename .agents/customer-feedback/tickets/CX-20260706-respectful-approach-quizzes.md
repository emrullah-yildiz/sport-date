# CX-20260706-respectful-approach-quizzes

- Status: `ready`
- Severity: `low`
- Priority: `P3` — delight (owner-seeded, 2026-07-06, via the daily user-sim checklist section D: "pop quizzes on how to approach someone")
- Customer journey: a member is about to send their first join request or first event-room message → a short, warm, optional quiz teaches them to read the profile in front of them and open respectfully → the first contact lands well for both people
- Surface: `web` — member surfaces around first contact (profile view / join-request compose / event room), plus optionally a standalone "warm-up your manners" card
- Environment and viewport/device: mobile-first 390px + desktop
- Found by: Seraph user-sim (owner seed converted to ticket)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-interactive-onboarding-gender-orientation` (profile fields this adapts to), `CX-20260704-policy-no-sexual-intent-events` (policy line the coaching must reinforce), `CX-20260704-interactive-sporty-experience-microgames` (brand line). No existing quiz ticket found.

## Customer outcome

As a member about to contact someone for the first time, I want a short, warm pop-quiz that teaches me to actually read their profile (their stated intent, their boundaries) and open a conversation respectfully, so my first message is welcome rather than awkward or pushy. In user voice: "I don't know what to say in a join request. Something quick that shows me a good opener versus a cringe one — using THEIR actual profile as the lesson — would make me way less nervous."

## HARD GUARDRAILS (non-negotiable — the ticket fails review if any is violated)

1. **Consent-first coaching ONLY.** Every lesson teaches reading and respecting signals, taking "no" (including silence and a skip) gracefully, and never pressuring for contact info, meeting changes, or off-platform chat. The quiz must never teach persistence, "plowing through" hesitation, or reframing a no.
2. **No pickup-artist tactics.** No negging, no scarcity/status games, no "techniques" framing, no scripts optimized to extract a yes. Correct answers are the honest, warm, low-pressure options.
3. **No stereotyping.** Coaching NEVER assumes behavior, preferences, or communication style from gender, orientation, or any demographic ("women want X", "men should Y" is an automatic fail). Adaptation (see below) personalizes to the individual profile's *stated* fields, not to generalizations about groups.
4. **Inclusive of all genders and all three intents.** Content must work equally for dating, friendship, and group/community intents, and for members of every gender (including self-described). Friendship/group openers get the same care as dating openers — this is not a dating-tips feature wearing a quiz costume.
5. **Privacy/consent boundary on adaptation.** Gender/orientation are optional, consent-stamped, visibility-gated fields (`apps/web/src/lib/sensitive-profile.ts` — deliberately excluded from `getCurrentUser()`). The quiz may adapt ONLY to what the profiled member chose to make visible (their shown intent/connection preference, shown gender, stated sports/level); it must never query, infer, or hint at hidden fields, and must degrade gracefully when nothing sensitive is visible.
6. **Safety-guidelines review required.** Before shipping, all quiz content is reviewed against `docs/legal/safety-community-guidelines.md` (incl. the no-sexual-intent policy: dating means meeting a person, not arranging sex) and the review is recorded in the handoff log.
7. **Optional, never a gate.** The quiz never blocks sending a request or message, never scores members publicly, and stores no per-member "manners score". No streaks, no compulsion mechanics.

## Task

1. **Content system**: a small set (start: ~3 quizzes × 3-4 questions) of scenario questions built on a rendered example profile ("Alex, padel, intermediate, open to friendship"): "Which opener fits what Alex actually said they're here for?" — 3 options, one warm/correct, distractors that are *plausibly tempting* (too forward, ignores their intent, generic copy-paste), each with a one-line kind explanation. Tone: warm coach, never scolding.
2. **Adaptation**: question set varies by the example profile's stated intent (dating / friendship / group) and respectfully handles visible gender (e.g. using correct pronouns in scenarios) per guardrail 5. All three intents shipped from day one.
3. **Placement**: an optional entry point near first contact (profile view or join-request compose) plus dismissible; reuse the existing quiz-free UI language (cards, springy press states, reduced-motion parity).

## Acceptance criteria

- [ ] All 7 hard guardrails demonstrably honored; reviewer can cite the safety-guidelines review entry in the handoff log.
- [ ] Quizzes exist for all three intents and read correctly for all gender presentations incl. self-described; a content tripwire test scans for banned framings (negging/persistence/stereotype patterns).
- [ ] Adaptation consumes only visibility-consented profile fields; a boundary test proves hidden gender/orientation never influence rendered content.
- [ ] Fully optional and dismissible; sending a request/message is never gated; nothing persisted beyond an ephemeral "seen/dismissed" flag.
- [ ] Keyboard + touch accessible, ≥44px targets, reduced-motion parity, works at 390px.
- [ ] typecheck / lint / tests / prod build green.

## Duplicate check

- Search terms used: "quiz", "approach", "opener", "coaching", "respectful".
- Tickets reviewed: full tickets dir + archive grep for "quiz" — no hits; `CX-20260704-interactive-onboarding-gender-orientation` covers collecting the fields, not coaching.
- Why this is new: no existing ticket covers respectful-approach education.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass; owner seed 2026-07-06 with hard guardrails); status `ready`.
