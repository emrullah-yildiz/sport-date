# CX-20260704-growth-invite-a-friend-to-event

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — ethical word-of-mouth loop; grows local density (the Phase-2 liquidity lever) without paid spend. Depends on nothing owner-gated.
- Customer journey: a member joining/attending an event invites a specific friend to come along → friend lands on the public invite (see `CX-20260704-growth-shareable-event-invite-og-image`) → joins → density compounds.
- Surface: event detail (member view) — an "Invite a friend" action
- Environment and viewport/device: web, all
- Found by: Acting CEO (growth review, 2026-07-04)
- Implementation owner: `agent`
- Related tickets: `CX-20260704-growth-shareable-event-invite-og-image` (build that first — this reuses its public invite link)

## Task

Add a lightweight **"Invite a friend"** action on an event so a member can share that event's public invite link (native share sheet / copy link). Optional: attribute a join back to the inviter for a simple, non-gamed "you brought a friend" acknowledgement.

## Acceptance criteria

- Member can invite via the OS share sheet or copy-link on an event they can see.
- Shared link is the public invite from the related ticket (approximate-area only, no PII).
- If attribution is included: store inviter→joiner at most as a private count; **never** publicly rank members, never show "who invited whom" to others.
- Works on mobile web; 44px touch targets (matches the loop's existing a11y bar).

## Guardrails (hard — anti-dark-pattern)

- **No incentivized spam:** do NOT reward volume of invites, no "invite 10 friends to unlock" mechanics, no address-book scraping, no auto-DMs.
- No leaderboards, no popularity/attractiveness signals.
- Purely a convenience to bring a known friend to a real game — not a viral-coefficient hack.

## Why (CEO note)

The strongest, most honest growth for a local-density product is "bring a friend you'd actually play with." It's Phase-2 liquidity built the right way — and it keeps us clear of the manipulative referral patterns our brand explicitly rejects.
