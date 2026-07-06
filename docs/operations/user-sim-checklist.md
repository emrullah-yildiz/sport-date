# Seraph's daily user-sim checklist (experience loop)

Owner directive (2026-07-06): the experience loop runs **every day** and includes
a user's-eyes pass. Seraph walks the product like a real member would, checks the
list below, and **speaks as a user** — findings phrased the way a member would
complain, then converted into tickets. The owner's own examples set the bar:
*"too much text" · "very plain website" · "more interaction" · "a little 3D
tennis game" · "pop quizzes on how to approach someone."*

## A. Essential workflows (walk them, don't assume)
1. Land → understand what this is in 10 seconds → Create profile
2. Signup end-to-end (every step; do errors explain themselves?)
3. Discover → filter → open an event → request a place
4. Host: create event (map pin, address, publish) → poster → share
5. Host: accept/decline a request → room chat → event update
6. Post-event: peer feedback, reflection, Movement Arc
7. Safety: block, report, and find the safety pages
8. Account: photos, profile edit, export, deletion
9. Public invite `/e/{id}` + poster + QR as a stranger sees them

## B. Pages & styles
- Every member-visible page: consistent brand (anthracite/#3BEA7E/off-white),
  no off-style elements, no misaligned fields/boxes (the owner has caught two —
  form rows and status text contrast — assume more exist)
- Mobile 390px + desktop; dark backgrounds never swallow text; focus states
- Empty states: warm and honest, never a dead end

## C. Explanations & text density ("too much text" check)
- Any wall of text a member must read to proceed → finding. Prefer one calm
  sentence + progressive disclosure
- Every term a newcomer can't know (request, approximate area, Movement Arc)
  explained at first touch, briefly
- Copy rules: plain English, no jargon, worldwide/GDPR framing, no "Europe-first"

## D. Delight & interaction backlog (the "very plain website" check)
Seraph proposes — the owner approves via tickets/directions. Seeded by the
owner's own asks (2026-07-06), each to be filed as a proper ticket with
acceptance criteria when its turn comes:
- **Interactive engagement mechanics** — e.g. streak-free "your Tuesday plan"
  nudge, tap-to-reveal cards, playful hover/motion touches (honest, no dark
  patterns, no addiction mechanics — engagement through usefulness and joy)
- **A little 3D/mini game** — e.g. a tiny in-browser tennis/keepy-uppy moment on
  the landing page or empty states (the existing WarmUpGame is the seed; a
  lightweight 3D or physics touch is the ambition). Must stay fast + accessible.
- **Pop quizzes: how to approach someone respectfully** — short, warm quizzes on
  reading a profile and opening a conversation, adapted to the profile's stated
  gender/intent. HARD GUARDRAILS: respectful-communication coaching only —
  consent-first, never pickup-artist tactics, never stereotyping, works for all
  genders and intents (dating/friendship/group), reviewed against the safety
  guidelines before shipping.
- Anything else Seraph observes real products doing that fits trust-first

## E. Output format (every daily pass)
1. Findings list, each phrased as USER VOICE ("I landed on Discover and had no
   idea what 'approximate area' meant") + severity (P0 broken / P1 friction /
   P2 polish / P3 delight idea)
2. Confirmed findings → tickets in `.agents/customer-feedback/tickets/`
   (CX-YYYYMMDD-slug, with acceptance criteria); duplicates checked first
3. A 5-line summary into the ledger (`agent-state.md`) and available to the
   Oracle's next standup
4. If repo write/push is unavailable (cloud), print the FULL findings list in
   the run log prefixed `USER-SIM-FALLBACK:` — a silent pass is a failed pass

Cadence: daily (cloud routine `keepitup-experience-loop`), plus in-session ticks
whenever Morpheus is active. Builder ticks pick up the P0/P1 findings the next
day at the latest.
