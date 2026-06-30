# CX-20260630-new-member-empty-discovery-missing-language

- Status: `ready`
- Severity: `high`
- Customer journey: Onboarding into discovery (sign up, then find the first compatible event to join)
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium 1280x900, headless. Observed 2026-06-30.
- Found by: Customer Experience Agent (browser chaos explorer, `apps/web/qa/explore.mjs`)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a cautious adult who just finished signing up, I want to find a real, compatible event to join so that I have something concrete to show up for — instead of an empty discovery page that makes it look like nothing is happening near me.

## What I observed

Observed 2026-06-30, reproduced in the same run.

- I completed the full 5-step signup as a new member whose sport is Tennis, then went to `/discover`.
- Discovery showed **zero** events — the calm "A quiet court—for now." empty state — even though a compatible, open event existed: a Tennis event in my city, ages 18–99, language English, beginner+intermediate welcome, hosted by a different member, starting in a few days.
- The empty page gave **no hint** about why nothing matched or what I could do to change it. To a customer it simply reads as "there is nothing for me here."
- After I opened "Edit your profile" and added a language ("English"), then returned to `/discover`, the **exact same event appeared** and I could request a place. Adding the language was the only change.

The signup flow (5 steps: account, name/location, sports, bio/seeking, review) never asks for a language at any point, so every new member starts with an empty language list and an empty discovery feed until they discover the profile workaround on their own.

## What I expected

A member who has just signed up and whose sport matches an open, age-compatible event should be able to find that event — or, if a language really is required to match, the experience should either collect it during signup or tell me plainly in the empty state what to add to start seeing events. An empty discovery page should distinguish "nothing exists yet" from "your profile is missing something needed to match."

## Reproduction

1. Sign up as a new member through `/signup`, choosing Tennis (do not touch profile afterwards). Signup never offers a language field.
2. Have a second member host a broadly compatible Tennis event (city match, ages 18–99, language English, beginner+intermediate).
3. As the new member, open `/discover` (optionally filter sport = Tennis). Observe the empty state and zero cards.
4. Open `/profile` → "Edit your profile", add a language (e.g. "English"), save.
5. Return to `/discover`. The previously-hidden matching event now appears and can be requested.

Reproduction rate: `1/1 safe attempts` (the explorer verified the before/after within a single run)

## Customer impact

This is a silent dead end at the most important first moment. The product's core promise is "something real to do together," but a brand-new member is shown an empty court with no path forward, even when a perfect match exists. Many people will conclude the area is dead and leave, never realizing a single hidden field gated their entire discovery feed. It is a trust- and activation-eroding gap rather than a safety issue.

- Authorization/privacy/precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- This is an onboarding/matching expectation failure (a dead end), triage tier 4 leaning into tier 2 because it can fully block a member from joining anything.

## Evidence and limits

- Evidence: `apps/web/qa/artifacts/` screenshots `*-newmember-empty-discover.png` and `*-discovery-after-language*.png` from run `mqzwzendgh94` (gitignored; redacted of identifiers).
- Redactions made: synthetic `qa+...@sport-date.invalid` accounts only; no real PII; screenshots show approximate area labels only (no precise venue, which discovery never exposes).
- Facts:
  - Signup's 5 steps never collect a language.
  - New members start with an empty `languages` list (DB column default `'{}'` in `apps/web/db/001_initial.sql`).
  - `getDiscoverableEvents` in `apps/web/src/lib/events.ts` requires the member's `languages` to include the event's language (the `EXISTS (... UNNEST(candidate.languages) ...)` clause).
  - Adding a language in profile editing made the previously-hidden matching event appear.
- Hypotheses to verify during implementation: whether the intended fix is to collect a language during signup, default it sensibly, relax/soften the language match, or improve the empty-state copy to name the missing profile field. Any of these is an implementation decision for the owner.
- Paths or surfaces not tested: host-side acceptance of the join request, the event room, and reflection (these require host acceptance and a past event, which this UI pass did not drive). Mobile surface not tested.

## Duplicate check

- Search terms used: "discover", "language", "empty", "new member", "discoverable", "onboarding" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: only `README.md` present (empty queue).
- Why this is new: no existing ticket; this is the first filed customer finding.

## Acceptance criteria

- [ ] A newly signed-up member whose sport matches an open, age-compatible event can find that event in discovery, OR the empty state clearly explains what to add (e.g. a language) and links to where to add it.
- [ ] If a language is required for matching, it is either collected during signup with a sensible default, or its absence is surfaced as an explainable, recoverable state — not a silent empty feed.
- [ ] The discovery empty state distinguishes "no events exist yet" from "your profile is missing something needed to match."
- [ ] The wording uses human language (no internal/database terms) and tells the member exactly what to do next.
- [ ] No precise location or other sensitive data is exposed; approximate-area-only behavior is preserved.
- [ ] Relevant automated tests cover the new-member discovery path and repository checks pass.

## Handoff and retest log

- `2026-06-30` - Filed by Customer Experience Agent; status `ready`. Cause confirmed in-run (event hidden before adding a language, visible after).
