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
- `2026-07-batch-02.md` — first growth-loop batch (cold-start hypotheses), status mixed.
- `2026-07-batch-03.md` — TikTok photo-mode activation + IG week 2, CEO-approved.
- `2026-07-batch-04.md` — global live-sport moments (theme-only), pending approval.
- `2026-07-batch-05.md` — trend-forward batch: World Cup knockout/final, July viral acting
  and dance-trend formats, absurdist meme, a verified human-interest moment, and a
  micro-drama serial, status `draft`. See its intro for the trend sources and the one
  trending story explicitly screened out and rejected (crime/scandal).
- `2026-07-batch-06.md` — image-led batch built entirely on real photos (no text-only cards),
  opening two new pillars: verified science facts and attributed life quotes, tied back to the
  product. Mix of funny, deep, and trend-jacked (mid-year checkpoint) posts, status `draft`.
- `2026-07-batch-07.md` — feature-led batch: 6 posts about what the KeepItUp product itself does
  (location privacy, no open browsing of people, dating/friendship/group intent, a 4-step how-it-
  works carousel, request-to-join capacity, and post-game feedback/"Movement Arc"), each traced to
  an audit-verified implemented feature only. Real-photo image-led throughout, status `draft`.
- `2026-07-batch-08.md` — pain-led "why KeepItUp" batch: 6 posts built directly around two named
  owner pains (organizing games in a group chat vs. one real event; paying for singles/mixer
  events vs. a free game), plus one science-tied "doing beats talking" post. No competitor named;
  WhatsApp named once, neutrally. Real-photo image-led throughout, status `draft`.
- `2026-07-batch-09.md` — revision batch answering the owner's 2026-07-05 full-queue review:
  5 denied posts fixed (new photos, full "branded poster look" — visible logo + wordmark + brand
  type blocks, not just a caption), 1 denied post replaced outright (a confusing "guess the era"
  format swapped for a plain, verified dating-history-vs-Gen-Z post), the exact 5-slide spec for
  an already-approved micro-drama post delivered for visual sign-off, and 2 new posts mutating the
  two posts the owner praised. Introduces the poster-look rule and 6 fresh Pexels photo candidates
  to stop reusing the same 6. Status `draft` except one item held `approved` pending slide sign-off.
