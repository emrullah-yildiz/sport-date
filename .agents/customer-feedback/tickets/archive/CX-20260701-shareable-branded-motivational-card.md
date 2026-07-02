# CX-20260701-shareable-branded-motivational-card

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 3) / Effort 3 = 12. Warm, organic word-of-mouth; nice-to-have, member-initiated only. Guardrails below (privacy, honesty, consent) are binding.
- Customer journey: reflection → sharing (member choosing to share a positive sport-moment outward)
- Surface: `web` (mobile-web is the primary target for Story sharing)
- Environment and viewport/device: all widths; mobile-web priority (Instagram Story aspect ratio)
- Found by: Experience & Design Explorer (owner growth-intake pass, 2026-07-01) — owner-requested "shareable motivational moments" direction
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-humane-milestone-moments` (a natural place to offer the card), `CX-20260701-warm-post-event-positive-vibe-moment` (`verified`), `CX-20260701-brand-asset-swap-mechanism` (the brand module this card should consume)

## Customer outcome

As a member who feels good after moving with people, I want a one-tap way to create a warm,
sport-positive shareable card (Instagram-Story friendly) carrying a nice line plus the Sport Date
name/logo, so that I can share the good feeling if *I* choose to — without the app ever auto-posting,
exposing anyone else, or leaking private details.

## What I observed

There is no member-initiated shareable card. The only sharing today is
`apps/web/src/components/ShareEventLink.tsx`, which copies an event's public invitation link via
`navigator.clipboard` (approximate area only). There is no canvas/`toDataURL` image generation and no
Web Share API usage anywhere in the codebase. So a member who wants to share a warm, on-brand
"I moved today" moment to a Story has nothing to do it with.

## What I expected

A **member-initiated**, one-tap "Share" action that generates a card **client-side** (canvas or SVG),
sized for an Instagram Story (**9:16**, e.g. 1080×1920), with a warm sport-positive line + the Sport
Date name/logo drawn from the brand module. It uses the **Web Share API** (`navigator.share` /
`navigator.canShare` with a file) where available, and offers a **download fallback** (PNG) where it
isn't. The member sees a preview and shares only if they tap; nothing is posted automatically.

## What I expected to avoid (guardrails)

- **Member-initiated only; no auto-post.** The card is generated and shared only on an explicit tap;
  the app never posts on the member's behalf and never opens a share sheet unprompted.
- **No other members, no private data, no precise location.** The card contains only the member's own
  positive line + brand — never another member's name/photo, never an exact address or precise
  coordinates, never private safety/report content. (If any event context is used, it is generic and
  no more specific than the already-public approximate area — prefer no location at all.)
- **Honest copy.** A warm sport-positive line with no unprovable claims (no "safest", no "verified", no
  fake member counts, no "everyone's joining"); nothing the positioning "Language to avoid" list bans.
- **On-brand & accessible.** On-palette (Ink/Cream/Lime/Coral/Sage), legible; the share control is
  keyboard-operable, screen-reader labeled, 44px, visible focus; works with reduced-motion (a static
  card is inherently reduced-motion safe — no required animation).
- **Consumes the brand assets.** The name/logo on the card come from the centralized brand module
  (`CX-20260701-brand-asset-swap-mechanism`) so that if the owner changes the logo/name, the card
  updates automatically — no hard-coded logo baked only into this feature.

## Reproduction

1. Finish/reflect on an event (or reach a milestone).
2. Observe there is no way to generate or share a branded motivational card; only an event-link copy exists.

Reproduction rate: `confirmed by source (components/ShareEventLink.tsx; no canvas/navigator.share in codebase)`

## Customer impact

Practical: gives members a warm, honest way to spread the word organically if they want to — the
vision's "organic word-of-mouth", not a growth-hack. Emotional: lets the member celebrate their own
real moment. Privacy is the key risk vector; the guardrails above keep it member-controlled and
leak-free.

- Authorization/security: no. Privacy: **central concern** — must expose no other member and no precise
  location. Data loss: no.

## Evidence and limits

- Evidence (source): `apps/web/src/components/ShareEventLink.tsx` (clipboard copy, approximate-area only — the existing sharing pattern to mirror for privacy discipline); no `navigator.share`/canvas/`toDataURL` anywhere; framer-motion + `useReducedMotion` available (`JoinRequestControls.tsx`); brand currently inline (see brand-asset-swap ticket) — the card must consume the future central module.
- Redactions: none needed.
- Facts: no shareable card, no Web Share API, no image generation today; a privacy-careful share pattern already exists to follow.
- Hypotheses to verify during implementation: canvas vs. inline-SVG-to-PNG for crispest 1080×1920 output and font rendering; `navigator.canShare({ files })` support detection + PNG download fallback; the small set of warm honest lines (no unprovable claims — confirm the copy set); where the entry point lives (post-event afterglow / milestone moment / profile) — member-initiated in all cases.
- Paths not tested: real device share sheets (verify Web Share on a real mobile browser during implementation; provide the download fallback for desktop/unsupported).

## Duplicate check

- Search terms used: "share", "shareable", "card", "instagram", "story", "web share", "canvas", "download", "motivational" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: existing sharing is only `ShareEventLink` (event-link copy — different intent, no image/card); no ticket proposes a generated shareable image card.
- Why this is new: no existing ticket covers a client-generated branded shareable card or Web Share API usage.

## Acceptance criteria

- [ ] A member can, in one tap, generate a warm sport-positive **shareable card** at Instagram-Story aspect ratio (9:16), carrying a warm line + the Sport Date name/logo, generated **client-side** (canvas/SVG).
- [ ] Sharing is **member-initiated only** — nothing is posted automatically; the Web Share API is invoked only on the member's tap, with a **download (PNG) fallback** where Web Share/file-share is unavailable.
- [ ] The card contains **no other member**, **no private data**, and **no precise location** (no exact address/coordinates); any location reference is no more specific than the already-public approximate area, and preferably none.
- [ ] Copy is **honest** (no unprovable claims; nothing on the positioning "Language to avoid" list) and **on-brand** (Ink/Cream/Lime/Coral/Sage, legible at Story size).
- [ ] The card **consumes the centralized brand module** (name + logo) so a future logo/name change updates the card automatically — no logo hard-coded only here.
- [ ] The share control is **accessible**: keyboard-operable, screen-reader labeled, 44px target, visible focus; the flow **works with reduced-motion** (no required animation; static card is fine).
- [ ] Mobile-web (primary) and desktop layouts both work; on desktop/unsupported, the download fallback is offered and clearly labeled.
- [ ] Relevant automated tests pass, including: card generation produces the correct aspect ratio; no member/PII/location fields are ever included in the card payload; Web-Share-vs-download branch selection; and a copy-honesty guard (no banned claim strings).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner growth-intake pass); status `ready`.
- 2026-07-02 - Implemented (build agent; commit `efe3168`, pushed origin/main; no migration). CONTENTS: a member-initiated, opt-in `ShareMotivationalCard` shown after an event ends (in the event room, beside `PostEventAfterglow` when `room.hasEnded`) — a static 9:16 (1080×1920, Instagram-Story) card carrying ONE curated warm line + the Rally brand (rally-arc glyph, wordmark, neon accent + tagline), drawn from the centralized brand module (`lib/brand.tsx`), so a future logo/name change updates it automatically. BRAND/PALETTE: anthracite `--bg` + neon `--accent` (#3BEA7E) + off-white `--text` (measured AA/AAA); no external fonts/images (system sans) so it rasterizes identically offline. SHARE MECHANISM: the SVG is rasterized to PNG client-side via canvas, then shared through the Web Share API with a file (`navigator.share`/`canShare({files})`) where supported, with a graceful PNG-DOWNLOAD fallback otherwise — never a dead button; a pure `decideShareStrategy` picks web-share → download → calm "unavailable"; a user-cancelled share (AbortError) returns quietly to idle; rasterization failure fails closed calmly (message + preview stays). HUMANE/NO-METRICS/NO-PII: the card carries ONLY a curated line + brand, plus the member's OWN first name IF they tick the default-OFF opt-in — no other member, no photo, no location, no count/score/streak/stat (the `MotivationalCardData` type has no such fields; the first name is sanitized to strip emails/handles/URLs and length-capped). Copy is a small curated rotation (no free text) and passes an honesty guard (no unprovable safety/verification/traction claims, no mechanic words). It is an offer, never a nag: no "share to unlock", no counter, no pressure, no auto-post (share only on explicit tap; there is no `useEffect`). ENTRY POINT: the post-event afterglow moment in `/events/[eventId]/room` — calm and member-initiated, without turning the success moment into an engagement loop. A11Y: real 44px focusable button with the global focus ring + screen-reader label, keyboard-operable opt-in, polite live status; static card is inherently reduced-motion safe. TESTS: `lib/motivational-card.test.ts` + `components/ShareMotivationalCard.test.tsx` (30 new) — deterministic curated selection, 9:16 aspect ratio, no-PII/stats payload, first-name sanitization, honesty guard, Web-Share-vs-download branch, no-auto-post source tripwire. CHECKS (apps/web): typecheck PASS, lint 0 errors (2 pre-existing unrelated warnings), 625 unit tests PASS / 12 skipped, production `next build` PASS. Files: `lib/motivational-card.ts`(+test), `components/ShareMotivationalCard.tsx`(+test), `app/events/[eventId]/room/page.tsx`, `app/globals.css`. Ready for independent retest (Explorer) — verify the real Web Share sheet on a mobile browser and the desktop download fallback.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. efe3168). All humane guardrails hold: MotivationalCardData = only {line, optional firstName} — NO count/score/streak/rank/level/badge/leaderboard field (banned tokens appear only in BANNED_CLAIM_PATTERNS); ethical-energy-guardrails suite green. NO PII (no other member/photo/location/email/handle; firstName useState(false) default-OFF, sanitized [^\p{L}\p{M} '-] capped 24; curated lines only). OFFER NOT NAG (no useEffect → share only on tap; no share-to-unlock/counter; honesty guard auditCardCopy asserted). Share-fallback never dead (decideShareStrategy web-share→download→calm unavailable; AbortError quiet; raster-fail fails closed). 9:16 1080x1920, AAA text, brand from lib/brand.tsx (rename-safe), no external fonts/images. a11y: 44px button + global focus ring + aria-label, opt-in checkbox, role=status live region, static reduced-motion-safe, responsive ≤750px. Entry: room/page.tsx afterglow gated on hasEnded, passes member's OWN firstName. 30 tests non-tautological. Checks the Tester ran: typecheck PASS, lint 0 errors, test 625 passed/12 skipped (targeted 68 incl ethical-guardrails), prod build PASS. One manual check remains: the real mobile Web Share sheet on device. Orchestrator archived.
