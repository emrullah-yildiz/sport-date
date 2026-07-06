# CX-20260706-legal-pages-still-say-private-beta

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — direct contradiction of the standing owner correction (public copy = open worldwide / early access, NEVER "private beta"), live on the public site today
- Customer journey: a cautious visitor reads the landing ("Open beta — no invite, no payment, open to any adult") → clicks Terms/Trust to verify before signing up → the Terms page tells them the opposite
- Surface: `web` — live `/terms` (primary), `/trust` + `/privacy` + `/safety-guidelines` cross-link labels ("Terms preview" family is fine; the "private beta / private preview" wording is not)
- Environment and viewport/device: any; verified on live production HTML (2026-07-06)
- Found by: Seraph user-sim daily pass (live fetch of https://www.keepitup.social/terms)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-landing-conversion-pack` (fixed the LANDING hero "Private beta" badge only), `CX-20260704-worldwide-usable-europe-first-approach` (fixed Europe-first framing; did not touch "private beta"), archive `CX-20260701-private-beta-term-unexplained-no-tooltip` (explainer, superseded)

## Customer outcome

As a cautious visitor doing due diligence before signing up, I want the Terms page to describe the same product the landing page just sold me, so I can trust the site. In user voice: "The homepage says 'Open beta — free for everyone, no invite needed.' Then the Terms say 'The current experience is a private beta, not a generally available public service.' Which one is lying? If the legal page and the homepage disagree on something this basic, why would I trust either?"

## What I observed (live, 2026-07-06)

On https://www.keepitup.social/terms:
- Intro: "It is the current truthful product boundary for the **private preview** until launch-country legal review is complete."
- "Who this preview is for": "The current experience is a **private beta**, not a generally available public service."
- Section heading: "**Private beta** boundaries".

Meanwhile the live landing page says: "Open beta — Free for everyone, right now. KeepItUp is in open beta — no invite, no payment, open to any adult (18+) … usable worldwide."

This is exactly the phrasing the owner has repeatedly corrected (public copy must never say "private beta"); the landing/hero was fixed, but the terms page was missed.

## What I expected

All public legal/trust pages use the same honest open framing as the landing: open beta / early preview, no invite, open worldwide to adults 18+, with the genuinely-true preview limits (no final legal review, limited features) stated without the words "private beta"/"private preview".

## Reproduction

1. Open https://www.keepitup.social/ — read the "Open beta" band.
2. Open https://www.keepitup.social/terms — read "Who this preview is for" and "Private beta boundaries".

Reproduction rate: 2/2 live fetches.

## Customer impact

Trust/credibility damage at the exact moment a careful adult is verifying us; also contradicts the owner's standing copy mandate. No privacy/safety/data exposure involved.

## Duplicate check

- Search terms used: "private beta", "private preview", "terms" across tickets + archive.
- Tickets reviewed: `CX-20260704-landing-conversion-pack` (landing badge only, implemented), archive `CX-20260701-private-beta-term-unexplained-no-tooltip` (archived; asked for an explainer, not the copy alignment), `CX-20260704-worldwide-usable-europe-first-approach` (Europe framing only).
- Why this is new: no open ticket covers the terms/legal pages' "private beta" wording.

## Acceptance criteria

- [x] Live `/terms` contains no "private beta" or "private preview" phrasing; the open-beta/early-preview framing matches the landing (open worldwide, adults 18+, no invite). *(pending deploy)*
- [x] `/trust`, `/privacy`, `/safety-guidelines` re-checked for the same phrase family; all consistent (no occurrences existed outside `/terms`; now tripwired).
- [x] Nothing untrue is added — preview limits (no final legal review, constrained features) remain stated plainly.
- [x] Tripwire test extended: public pages must not contain "private beta" (mirroring the existing worldwide-framing tripwires).
- [x] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass, live-site fetch); status `ready`.
- `2026-07-06` - Implemented by Tank (Builder). `/terms` reworded: intro "private preview" → "open beta", "Who this preview is for" bullet now states the open beta honestly (no invite/payment, worldwide, adults, early product not a finished service), "Private beta boundaries" → "Open beta boundaries". Swept `/trust`, `/privacy`, `SafetyGuidelines` — clean. New tripwire `apps/web/src/app/terms/page.test.tsx` renders all four surfaces and fails on `private beta`/`private preview`/"not a generally available public service", plus pins the open-beta terms framing. Repo-wide sweep also caught the mobile app's signed-in banner ("LIVE PRIVATE BETA DATA" → "LIVE OPEN BETA DATA" in `apps/mobile/App.tsx`; mobile typecheck green). Web typecheck/lint/full vitest (1162 passed)/prod build green. Status `ready` → `implemented`; live-site AC verifiable after next deploy.
