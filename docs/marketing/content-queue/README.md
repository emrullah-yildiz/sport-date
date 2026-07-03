# Content queue — draft → approve → publish

The agent-run organic-content pipeline (owner-approved model, 2026-07-03). Every
public post is **drafted by agents here, approved by the owner, then published** on a
schedule. Nothing publishes without owner sign-off.

## States (per post)

- `draft` — agent wrote it; awaiting owner review.
- `approved` — owner okayed it (optionally with edits); ready to schedule.
- `scheduled` — queued in the scheduler/API for a date.
- `published` — live; keep the permalink + date.
- `parked` — deferred/rejected, with a one-line reason.

## How the owner reviews (fast)

For each post: read the caption, hashtags, and visual direction. Then either:
- write `APPROVED` (or `APPROVED with:` + your edits) on its status line, or
- `PARK:` + reason.
Agents pick up approved posts, produce the final creative to spec, and schedule them.

## Guardrails (from the marketing mandate)

- On-brand, honest, anti-dark-pattern voice — **never** claim traction, safety, or
  outcomes we can't prove; no fake scarcity/urgency; no attractiveness framing.
- Only mention **implemented** product controls (not roadmap features).
- Don't name a launch city until the owner selects one (Bucharest is a hypothesis).
- EU-aware: no data claims, no cold-contact CTAs; CTAs point to opt-in/beta only.

## Batches

- `2026-07-batch-01.md` — first 6 posts (from the launch packet's briefs), status `draft`.
