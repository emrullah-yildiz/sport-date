# Growth experiments log

The measurement half of the growth loop: **publish varied formats → measure →
prune the losers → double down on winners → keep ~20% new bets.** This file is how
"eliminate what doesn't work" becomes data, not vibes.

**North-star metric:** net-new followers (IG / TikTok / YouTube).
**Ranking metrics (what we optimise for):** follows-per-post, shares, saves — *then*
comments, reach, watch-through. Raw likes are a tiebreaker only.

**Analysis cadence:** every ~2 weeks, pull `get_aggregated_post_metrics` + `list_posts`
(includeMetrics) per channel, fill the scorecard, then prune/scale for the next batch.

---

## Current state — 2026-07-04

**Cold start.** 0 posts of history across all 3 channels, so there is nothing to prune
yet. Batch 02 (`content-queue/2026-07-batch-02.md`) is the first data-generating batch.
Every time/format in it is a **hypothesis**, listed below. Do not treat any as proven.

## Open hypotheses (from batch 02)

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-FORMAT-reel | Curiosity-hook Reels drive the most follows on IG | follows-per-post vs meme/graphic |
| H-FORMAT-talkinghead | Original talking-head wins watch-time on TikTok | avg watch-through, follows |
| H-FORMAT-meme | Memes get the most shares (cheap reach) | shares-per-post |
| H-ANGLE-curiosity | Open-loop hooks beat plain-info hooks | saves + watch-through |
| H-ANGLE-seasonal | Seasonal/festive framing lifts reach | reach vs non-seasonal |
| H-MECHANIC-commenttowin | "City + sport" prompt drives comments + maps demand | comment count, city tally |
| H-MECHANIC-tagafriend | Friend-tags are our cheapest non-follower reach | reach-from-tags, new followers |
| H-MECHANIC-giveaway | Follow-gated giveaway spikes followers (watch retention after) | follow delta during + 2wk retention |
| H-TIME-eveweekday | Weekday 18:00–21:00 (Bucharest) beats other slots | reach by post hour |
| H-TIME-weekendam | Weekend mornings win for outdoor-sport content | reach by post hour |

## Scorecard (fill after batch 02 goes live)

| Post | Platform | Format | Posted (day/time) | Reach | Saves | Shares | Comments | New follows | Verdict |
|------|----------|--------|-------------------|-------|-------|--------|----------|-------------|---------|
| P1 | IG | Reel | | | | | | | pending |
| P2 | TikTok | Talking-head | | | | | | | pending |
| P3 | IG | Meme | | | | | | | pending |
| P4 | IG | Reel (seasonal) | | | | | | | pending |
| P5 | IG | Comment-to-win | | | | | | | pending |
| P6 | TikTok | Tag-a-friend | | | | | | | pending |
| P7 | IG | Giveaway | | | | | | | pending |
| P8 | YouTube | Short | | | | | | | pending |

## Decisions log (append each analysis round)

- _2026-07-04_ — Cold start; no prunes yet. Shipped batch 02 to generate baseline data.
  Next review target: ~2 weeks after first posts go live.
- _2026-07-04_ — **Started without video** (owner). Video posts (P1/P2/P4/P6/P8) paused as
  `awaiting-asset` pending the AI-video tool. Produced + auto-scheduled the two IMAGE posts:
  P5 comment-to-win (Buffer `6a4846fb9dd66bf2fd48d9db`, 07-04 06:00 Bucharest) and P3 meme
  (Buffer `6a4847079dd66bf2fd48da44`, 07-04 22:15 Bucharest). Both Instagram, auto-publish.
  These two are the first live datapoints — measure follows/saves/shares/comments once out.
  Queue now thin on approved image content → next autopilot cycle should replenish with more
  no-video formats (carousels, quote cards, photo-mode) for owner approval.
