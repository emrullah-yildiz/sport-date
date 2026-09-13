# KeepItUp concept: Pick a game. Meet your people.

Date: 2026-09-14. Status: build-ready design proposal grounded in repository inspection, with a companion interactive preview being implemented at `/concept`; not user-tested, deployed, or a final brand decision. KeepItUp is the existing interface name. This proposal does not choose launch geography, pricing, or a new audience.

The current deliverable is an isolated concept preview, not replacement of the live landing or authenticated journeys. Its scope is sport and intention selection, an example invitation and details, a simulated request/pending state, explicit simulated host acceptance, fictional meeting details, and cancellation/reset. The production journey and state matrix below specify later design work; they are not claims that those screens were redesigned in this cycle. Consult the work-cycle verification record for which preview interactions and browser checks actually passed.

## Product judgment

The strongest product idea is already present: a real activity gives adults an easy reason to meet. The underlying event loop is substantially more complete than the first impression communicates. The design opportunity is to make that loop tangible before asking someone to build a profile.

The experience should feel like a friendly invitation to play. A visitor should be able to explain it as: **“An app for adults to find a small local sports activity, ask the host to join, and meet people for dating, friendship, or community.”** This is the primary design outcome. Fun supports that understanding.

### Evidence and interpretation

| Repository evidence | Design interpretation | Priority |
| --- | --- | --- |
| `docs/marketing/owner-taste-rules.md` records an outside lead saying the product is unclear after seeing Instagram and the deck. | Category comprehension is an observed problem, not a hypothetical aesthetic issue. The feedback is one report, not representative research. | P0 |
| `apps/web/src/app/landing/page.tsx` leads with a profile CTA; its explanatory steps start with profile creation. | Users must imagine the value while evaluating an account commitment. Show an example of the encounter first. | P0 |
| The same landing has a hardcoded “Near you this week / 4 events” panel with named neighbourhoods and available spots; the panel is `aria-hidden`. | Fictional supply resembles live inventory visually, while assistive technology receives none of the demonstration. Replace with an explicitly labelled, accessible example. | P0 |
| The landing already names dating, friendship, and community; events and precise-location protection are implemented elsewhere. | Preserve those strengths and explain the host-acceptance boundary concretely. | P0 |
| `WarmUpGame` provides an optional tap game separate from the event-selection mechanic. | It supplies energy but does not by itself teach the product. Prioritise playful product interaction in the hero; keep detached games secondary. | P1 |
| Discovery has extensive location, schedule, language, entitlement, and eligibility handling. | Complexity belongs behind progressive disclosure, with a short summary of active choices and calm empty-state recovery. | P1 |
| The shared navigation is Discover / Host / Safety plus Account. | Test whether members can find accepted plans quickly before proposing navigation migration. “Host” is less explicit than “Your events” for attendees. | P2 |

This is a source-and-document evaluation. It does not establish visual rendering quality, usability success rates, or actual local event supply.

## Core concept and first-screen copy

Keep the adopted anthracite, green-action, blue-information system. Use generous space, a confident short headline, court-like linework, and one large tactile activity card. Keep sports equipment illustrations abstract; no invented member portraits, public popularity badges, ratings, or safety seals.

**Eyebrow:** Local sports. Real people. Adults 18+.

**Headline:** Pick a game. Meet your people.

**Description:** KeepItUp helps adults meet through small local sports activities — for dating, friendship, or community. Find a game, ask the host to join, and get the meeting details when they accept.

**Primary visitor action:** Create a profile.

**Secondary visitor action:** Try an example.

**Returning-member action:** Find an activity. Preserve sign-in and current account awareness.

**Supply qualifier:** Activities depend on hosts in your area.

The demo should sit alongside the definition, not behind registration. Do not label an account link “Browse nearby games” if it immediately opens signup. A future public browse mode would require its own authorization and disclosure review.

## The interactive object: a little plan you can try

A “Try an example” activity card provides a complete, finite demonstration. It has a persistent **“Interactive example · not a real event”** label. No network request, account mutation, precise coordinates, stored preferences, or telemetry containing selected intent is required.

1. **Choose a sport and intention.** A small set of real buttons selects example sports. A separate selector offers Dating, Friendship, and Community with equal visual weight. The whole card changes coherently: title, level, duration, and what to expect. Switching is reversible and resets the simulated request state. Selections are local example choices, not saved profile preferences or an assertion of real compatibility. Do not imply these are the approved launch sports.
2. **Read the invitation.** Example: “Easy run + a chat”, “Example Saturday · 09:00”, “Easy pace · 45 minutes”, “Approximate area”, “Dating, friendship, or community”. All logistics are visibly fictional. “Walk breaks welcome” lowers performance pressure without promising every real host offers it.
3. **Try asking to join.** Button: “Try a join request”. State: “Example request sent. In the real app, the host decides.” Offer “Show an accepted example” explicitly; no automatic acceptance animation that suggests a real request is always accepted.
4. **See an accepted state.** “Example: you're in.” Explain “Accepted participants can open the event room for meeting details and coordination.” Prefer “Meeting details would appear here”; if the preview includes a fictional meeting point, label it fictional and do not use a real street address, map pin, or coordinates.
5. **Leave with one next step.** “Ready for a real activity?” → “Create a profile” or “Find an activity”, according to session state. “Reset example” remains available. No countdown, timer, score, random prize, or replay pressure.

Fictional demo acceptance is an educational state, not evidence of real availability. The same disclosure must survive screenshots, every state, mobile layout, and screen-reader navigation.

### Interaction and responsive specification

- Desktop: two-column hero, definition left and activity example right; explanatory steps immediately underneath. At smaller widths, use one column in reading order: definition, actions, demo, steps.
- At 360px width, all essential copy and controls remain in normal document flow. Never force a fixed-height hero or conceal controls under a sticky footer. Test 320px and 200% zoom.
- Use native buttons and visible labels. Sport selections expose `aria-pressed`; use a radio group instead if implementing native radio inputs. Do not mix the two patterns.
- A concise polite live region announces changed request state once. Keep focus on the triggering control when it remains; move it to the new state heading only when that control is removed. Do not announce the entire card after every change.
- Every touch target is at least 44px in each dimension. Text on neon uses the existing dark foreground token. Focus and selected state are visible without relying solely on colour.
- Optional 150–220ms transform/opacity transitions can suggest a card settling onto a court. Reduced-motion users receive immediate equivalent state changes; no information depends on motion or speed.
- No drag-only control, hover-only explanation, autoplay audio, continuous confetti, or timer challenge. Keep script small and use existing dependencies.
- With JavaScript unavailable, retain the product definition, static clearly marked example, complete steps, sign-in, and signup links.

## Complete journey and next-screen design

| Stage | Member question | Design answer and action |
| --- | --- | --- |
| Understand | “Is this dating, a club, or booking?” | Direct definition, three equal intentions, interactive activity example, host-request explanation. |
| Join | “Why do you need this information?” | Explain each required field at collection; distinguish optional enrichment. Defer optional questions, but do not silently change compatibility or adult-access rules. |
| Discover | “What could I actually do?” | Lead with small event cards showing sport, time, level, duration when known, approximate area, intention, and honest cost information when recorded. Keep advanced filters collapsed and chosen filters visible. |
| Decide | “Will I fit, and what happens next?” | Event detail shows expectations and host information that existing access rules permit. “Request a place” says the host must accept before exact details unlock. |
| Wait | “Am I going?” | “Waiting for the host” plus cancellation. No promise of response time unless supported by policy. Never reveal skip counts or other applicants. |
| Prepare | “Where and when?” | Accepted room prioritises actual time, authorized meeting details, coordination, leave action, and safety access. Avoid precision in notifications or public previews. |
| Participate | “What if plans change or I feel unsafe?” | Current event state, cancellation or updated plan, exit/report/block controls, and honest emergency limitations. |
| Reflect | “Was this worthwhile?” | Private feedback with optional reflection; report/block always available. Never demand a positive rating or continued contact to finish. |
| Return | “What next?” | Another suitable activity or hosting invitation, without a streak or loss warning. Any future reconnect action requires mutual consent and explicit scope. |

“Meet your people” is an emotional invitation, not a compatibility guarantee. Do not add unsupported “perfect match”, “verified host”, “safe community”, attendance totals, testimonials, identity assurance, or legal compliance claims.

## Required state matrix

This matrix is a specification for production screens as they are revised. The hero implementation only needs the separately marked example states above; it must not imply the full production redesign is delivered.

| State | Member copy | Available recovery / boundary |
| --- | --- | --- |
| Loading | “Finding activities…” | Stable card-sized placeholders; do not briefly show zero supply. |
| No local activities | “No activities in this area yet.” | Change area or host an activity. Never fill the result set with examples that look real. |
| Filters return none | “No activities match these choices.” | Show active filters and explicit clear/widen action. Never broaden silently. |
| Network error | “We couldn't load activities.” | Retry; preserve filters. Do not imply the member has no matches. |
| Unauthenticated request | “Create a profile to request a place.” | Signup and sign-in with an honest return path only if implemented. |
| Request pending | “Waiting for the host.” | Cancel request; exact meeting details remain unavailable. |
| Accepted | “You're in.” | Open authorized event room; no public address or map preview. |
| Declined | “This request wasn't accepted.” | Return to activities. No reason speculation, ranking, or skip count. |
| Request withdrawn | “Your request is cancelled.” | Back to activities; re-request only if domain rules permit. |
| Filled during request | “That place is no longer available.” | Refresh current availability. Server truth overrides a stale card. |
| Event cancelled | “This activity is cancelled.” | Back to activities; remove misleading arrival instructions. |
| Host changes plan | “The plan has changed.” | Show authorized current details and a clear way to leave; do not silently preserve an old address. |
| Access revoked / blocked | “This event room is no longer available.” | Exit to activities and reach Safety Center; do not disclose another member's block action or identity. |
| Report submitted | “Your report was submitted.” | View own report status, leave, or block as supported. No invented response-time promise. |
| Session expires | “Sign in to continue.” | Hide sensitive room content and recover through authentication. |
| Completed | “How did it go?” | Optional private reflection and visible safety actions; no public participation score. |

## Evaluation and evidence needed

These are proposed acceptance targets, not measured outcomes. Conduct local prototype checks first. Recruiting participants or contacting external people remains a separate authorized outreach task.

1. **Five-second comprehension:** show the first screen to five unfamiliar adults. At least four describe local sports plus meeting people, and at least four understand that joining requires a host decision. Ask “What is this?” before prompting about features.
2. **Example honesty:** all five identify the card as an example, not available inventory; none believe its acceptance creates a real reservation. Any confusion blocks release of that treatment.
3. **First useful action:** at least four can use the example and locate the real signup or discovery route without assistance. Record errors and interpretation, not just completion speed.
4. **Privacy understanding:** all five correctly identify that exact meeting details unlock only after authorization. Any assumption that locations are public triggers a copy/layout review.
5. **Intent clarity:** at least four recognise dating, friendship, and community as equally valid uses. Avoid asking for their own intentions during this exercise.
6. **Interaction verification:** keyboard-only completion; announced transitions; no mobile overflow; 200% zoom; visible focus; reduced-motion equivalence; session-aware CTA destinations; persistent example labels after every state.
7. **Production funnel follow-up:** use existing aggregate, allowlisted event counters only where meaningful. Compare landing-to-signup and discovery-to-request alongside accepted attendance and safety outcomes. Do not optimise demo replays or time spent. Do not log location, intention, selected people, report text, or private messages into analytics.

Five people can reveal severe confusion but cannot establish statistically reliable conversion improvement. Do not present these acceptance targets as proof of market fit.

## Delivery sequence

1. Implement and visually verify the comprehension-first `/concept` preview and finite interactive example. Keep clear boundaries between the local example and real signup/discovery links. Test state transitions, example labelling, keyboard semantics, and sensitive-data absence. Use the reviewed concept to inform a later live-landing change that removes ambiguous fictional inventory and preserves current auth-aware behaviour.
2. Review discovery and event detail as one journey, including empty supply and host decision. Prototype a simpler filter surface against real field availability before changing product rules.
3. Review accepted-plan retrieval on mobile, then the room and post-event reflection. Test cancellations, blocked access, stale room data, and dignified rejection with isolated fixtures.

The first slice is intentionally achievable without new providers, member data collection, production changes, or a new identity. Final confidence requires rendered UI inspection and real usability evidence in addition to this specification.
