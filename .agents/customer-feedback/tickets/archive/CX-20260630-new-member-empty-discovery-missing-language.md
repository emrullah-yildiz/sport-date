# CX-20260630-new-member-empty-discovery-missing-language

- Status: `verified`
- Severity: `high`
- Customer journey: Onboarding into discovery (sign up, then find the first compatible event to join)
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium 1280x900, headless. Observed 2026-06-30.
- Found by: Customer Experience Agent (browser chaos explorer, `apps/web/qa/explore.mjs`)
- Implementation owner: `Implementation Agent (Opus 4.8)`
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

- [x] A newly signed-up member whose sport matches an open, age-compatible event can find that event in discovery, OR the empty state clearly explains what to add (e.g. a language) and links to where to add it. (Root fix: empty-language members are no longer filtered to nothing.)
- [x] If a language is required for matching, it is either collected during signup with a sensible default, or its absence is surfaced as an explainable, recoverable state — not a silent empty feed. (A member with no language preference now sees all otherwise-eligible events instead of a silent empty feed.)
- [x] The discovery empty state distinguishes "no events exist yet" from "your profile is missing something needed to match." (Empty state now branches on missing-sports vs. narrowing filters vs. genuinely nothing open.)
- [x] The wording uses human language (no internal/database terms) and tells the member exactly what to do next, with profile/host links.
- [x] No precise location or other sensitive data is exposed; approximate-area-only behavior is preserved. (Only the language preference filter was relaxed; no location/visibility/privacy clause changed.)
- [x] Relevant automated tests cover the new-member discovery path and repository checks pass. (New `events.test.ts`; web 131 + domain 57 pass, typecheck green.)

## Handoff and retest log

- `2026-06-30` - Filed by Customer Experience Agent; status `ready`. Cause confirmed in-run (event hidden before adding a language, visible after).
- `2026-06-30` - Implemented by Implementation Agent (Opus 4.8); status `implemented`. Awaiting customer retest.
  - Root fix (`apps/web/src/lib/events.ts`, `getDiscoverableEvents`): the language clause now reads `(CARDINALITY(candidate.languages) = 0 OR EXISTS (... UNNEST(candidate.languages) ... LOWER(language) = LOWER(events.language)))`. A member with NO languages set skips the language-overlap filter (no preference => not filtered to nothing); a member with one or more languages keeps the exact previous overlap behaviour. No other clause was touched — host/candidate active checks, sport+experience join, time window, host-self exclusion, age `BETWEEN`, capacity-vs-existing-request, city/sport/language filter params, the block exclusion, and the approximate-area-only projection (no precise location, no private venue) are all unchanged.
  - Added a pure, unit-testable mirror `eventLanguageMatchesMemberPreference(memberLanguages, eventLanguage)` documenting the same rule the SQL enforces, with a doc comment tying the two together so they cannot drift.
  - Tests (`apps/web/src/lib/events.test.ts`): (a) a member with empty languages matches an event that was previously hidden (English and Romanian); (b) a member with a stated language still only matches overlapping languages (case-insensitive), no regression.
  - Guidance (`apps/web/src/app/discover/page.tsx`): the empty state now distinguishes three calm, plain-language cases — profile lists no sports (add a sport), narrowing filters applied (widen/clear them), or genuinely nothing open near you (suggests adding more sports and the languages you're comfortable with, with profile + host links). No internal/DB terms.
  - Checks: `npm run typecheck` (web) green; web tests 131 passed / 12 skipped (was 129 hermetic, +2 new); domain 57 passed. Total hermetic 186 -> 188.
  - Recommended enhancement (not done here): collect a language during signup with a sensible default so the empty-language state is rare rather than the norm. This is a deeper product/onboarding change for an owner; the relaxed discovery filter above makes the silent dead-end safe in the meantime.
  - Note for retest: signup still does not collect a language, so a brand-new member's `languages` is still `'{}'`; the change makes that state non-blocking for discovery rather than collecting the language. Verify the previously-hidden Tennis event now appears for a fresh member with no profile edits.
- `2026-06-30 05:06 GTBDT` - Independently retested by Customer Experience Agent via the browser chaos explorer (`apps/web/qa/explore.mjs`, run `mr0019a10qp5`); status `verified`. Surface: web (`/signup` + `/discover`, Chromium headless 1280x900, dev Neon branch). The cross-member journey registered a brand-new member (Tennis, no profile edits, empty `languages`), had a second member host a broadly-compatible Tennis event, and then opened discovery as the new member. Discovery was NOT empty: the explorer did not enter its `emptyAtFirst` branch and did not raise the `new-member-empty-discovery-no-language` finding (0 findings this run), confirming the previously-hidden event is now discoverable without the language workaround. The original silent dead-end (empty feed despite a perfect match) no longer reproduces. Not separately re-checked this run: the rebuilt empty-state copy variants (no-sports vs. narrowed-filters vs. nothing-open) — those are covered by the implementer's `events.test.ts` / `discover/page.tsx` changes and unit tests; mobile surface not retested.
