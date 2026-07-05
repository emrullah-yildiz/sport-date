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

## Open hypotheses (from batch 05 — trend-forward, added 2026-07-05)

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-TREND-worldcup | World Cup-timed trend-jacks (knockout stage + final) beat evergreen posts on reach/shares | reach/shares delta vs closest evergreen post at similar time slot |
| H-TREND-emotionaltones | Riding the native "four tones" acting trend beats our original talking-head format | watch-through vs H-FORMAT-talkinghead baseline |
| H-TREND-dancetrend | Nostalgic/dreamy dance-trend format lifts saves+shares vs our standard Reel | saves+shares vs H-FORMAT-reel baseline |
| H-TREND-absurdistmeme | Absurdist-escalation meme structure beats our standard two-panel meme | shares-per-post vs H-FORMAT-meme baseline (P3 batch 02) |
| H-TREND-humaninterest | A verified wholesome real-world moment (theme-only) beats an invented scenario on shares/saves | shares+saves vs comparable non-trend carousel |
| H-FORMAT-microdrama | A serial/cliffhanger format converts one-off viewers into follows (Ep.1 viewers return for Ep.2) | Ep.1→Ep.2 audience overlap/return rate, follows-per-post |
| H-ANGLE-cozyauthentic | Deliberately unpolished/calm aesthetic beats polished/hype aesthetic | saves + sentiment vs polished-post baseline |
| H-TIME-middayweekday | Weekday lunch-break slot (~12:30 Bucharest) is a viable posting window | reach by post hour, new datapoint vs eve/weekend |

## Open hypotheses (from batch 06 — image-led + new pillars, added 2026-07-05)

**Owner directive:** every post must be image-led with a real photo of real people (not a
text-only card), and two new content pillars open: science facts tied to the product, and life
quotes tied to the product. This batch is also the first direct test of that directive against
the text/graphic-card batches already live (02–05).

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-DIRECTIVE-imageled | Real-photo posts beat text-only graphic-card posts on shares + saves | shares+saves delta vs comparable batch 02–05 posts at similar time slots |
| H-PILLAR-sciencefact | Verified, sourced science-fact posts win saves (people save credible facts) | saves-per-post vs meme/quote pillars |
| H-PILLAR-lifequote | Attributed inspirational quotes drive saves/shares as well as jokes do | saves+shares vs H-FORMAT-meme baseline |
| H-PILLAR-funnyphoto | A joke overlaid on a REAL photo out-shares an illustrated/graphic meme card | shares-per-post vs H-FORMAT-meme baseline (batch 02 P3, graphic meme) |
| H-TREND-midyear | Riding the natural "mid-year checkpoint" seasonal beat lifts reach/shares vs. a non-seasonal evergreen post at a similar slot | reach/shares delta, same method as H-TREND-worldcup |
| H-TREATMENT-overlayvscaption | Within image posts, quote/fact-overlay-on-photo vs. clean-photo-caption-led — which treatment wins saves/shares | saves+shares, overlay-treatment posts vs caption-led posts in the same batch |

## Open hypotheses (from batch 07 — feature-led, added 2026-07-05)

**Owner directive:** stop talking only about science/quotes/memes — show what the product itself
does. Six posts, each tied to one audit-verified implemented feature (location privacy, no open
browsing of people, dating/friendship/group intent, the 4-step flow, request-to-join capacity,
post-game feedback + "Movement Arc"). Core question: does feature-led content convert curiosity
into follows (and, longer-term, site visits) better than pure-relatable/science/quote content?

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-FEATURE-privacy | A serious explainer of the location-privacy design wins saves/shares as well as our science-fact posts | saves+shares vs H-PILLAR-sciencefact baseline (batch 06) |
| H-FEATURE-notswiping | Stating our actual anti-swiping mechanism out-performs generic dating-app jokes on follows | follows-per-post vs H-PILLAR-funnyphoto baseline (batch 06 P5) |
| H-FEATURE-intentions | Naming all three reasons people show up (dating/friendship/group) widens who feels invited and lifts follows from non-dating audiences | follows-per-post, qualitative comment sentiment |
| H-FEATURE-howitworks | A plain, literal "how it works" carousel beats abstract/trend carousels on saves | saves-per-post vs carousel posts in batch 03/04/05 |
| H-FEATURE-funnyreject | Framing "no" as "the game is full" (a real mechanic) out-shares general relatable jokes | shares-per-post vs H-FORMAT-meme / H-PILLAR-funnyphoto baselines |
| H-FEATURE-aftergame | Post-game reflection features ("Movement Arc") drive saves as bookmark-worthy content | saves-per-post vs H-PILLAR-lifequote baseline (batch 06) |
| H-CONTENT-featurevsrelatable | Feature-led content overall converts curiosity into follows/site-visits better than pure-relatable or pure-inspirational content | follows-per-post + link-in-bio click-through, batch 07 vs batches 02–06 combined |

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
- _2026-07-05_ — **Trend-forward batch shipped** (`content-queue/2026-07-batch-05.md`, 8 drafts,
  loaded as Buffer ideas). Owner directive: lead with real, currently-trending moments instead
  of generic evergreen content. Hypothesis: World Cup-timed and native viral-format trend-jacks
  (H-TREND-*) will show a measurable reach/share lift over the evergreen posts already live from
  batches 02–04, when compared at similar time slots. Screened and **rejected** one trending
  human-interest story (the viral "skyscraper proposal") because it's an active criminal case —
  fails the trend-jacking-playbook's no-crime/scandal rule regardless of its romantic framing;
  used a verified wholesome marathon-assist moment instead (theme-only, no names/footage). Two
  posts (P7 micro-drama serial, P8 cozy/authentic aesthetic) are explicit new experiments outside
  the trend-jack thesis — kept at ~20–25% of the batch per the standing rule. P1/P3/P4 need the
  AI-video tool (still not connected) and will sit `approved` + `awaiting-asset` once the owner
  signs off; P2/P5/P6/P7/P8 are image-only and can move to Buffer scheduling immediately on
  approval. Next review: compare batch-05 trend posts against batch 02–04 evergreen posts once
  both have ~2 weeks of live data, and fill the H-TREND-* rows above.
- _2026-07-05_ — **Image-led directive + two new pillars shipped**
  (`content-queue/2026-07-batch-06.md`, `social/ideas-batch-06.json`, 7 drafts). Owner directive:
  stop shipping text-only graphic cards — every post must carry a real photo of real people, and
  the batch must open two new pillars, science facts and life quotes, both tied back to the
  product. Used the six cleared Pexels photos already in `apps/web/public/brand/social/photos/`.
  Three science-fact posts (runner's-high/endocannabinoid correction, the Holt-Lunstad loneliness
  study, the Wiltermuth-Heath synchrony/trust study — all verified via WebSearch and cited by
  name, no invented statistics); three life-quote posts (one attributed public-domain quote,
  Helen Keller, plus two original KeepItUp lines); one explicit trend-jack riding the natural
  "mid-year checkpoint" seasonal beat (brand-safe per the trend-jacking playbook, expires
  2026-07-16). Deliberately mixed treatments across the batch — clean-photo/caption-led,
  quote-or-fact overlay with a dark scrim, and one blend — specifically so overlay-vs-caption can
  be measured, not assumed. Tone range covers funny (P4, P5), deep (P2, P3), and a funny/warm
  trend blend (P7). Added H-DIRECTIVE-imageled, H-PILLAR-sciencefact, H-PILLAR-lifequote,
  H-PILLAR-funnyphoto, H-TREND-midyear, and H-TREATMENT-overlayvscaption above. Next review:
  once this batch has live data, compare it directly against the text/graphic-card batches
  (02–05) on shares+saves to test the image-led directive itself, then prune whichever pillar or
  treatment underperforms.
- _2026-07-05_ — **Feature-led batch shipped** (`content-queue/2026-07-batch-07.md`,
  `social/ideas-batch-07.json`, 6 drafts). Owner directive: after two batches of
  science/quote/meme/trend content, produce a batch that talks about what the product itself
  does. Ran a 2026-07-05 code audit first and restricted every claim to features verified as
  actually implemented: location privacy (~10km fuzz until host accepts), no open browsing of
  people (profile visibility gated to host/requester or a shared accepted event), the
  dating/friendship/group intent field, the 4-step find→request→accept→play flow, request-to-join
  capacity (2–20 people), and post-game feedback + private "Movement Arc" reflection. Explicitly
  excluded: pricing/Rally Plus, email notifications, photo auto-moderation, any identity/photo
  verification claim, app-store download language, and any launch city — none of these are
  cleared for public copy. All six posts stay real-photo image-led (reusing the six cleared Pexels
  photos) and worldwide/early-access framed, per the standing rules. Tone mix: 1 deep (privacy), 1
  bold/manifesto (not-swiping), 1 warm/inclusive (intentions), 1 plain-practical carousel (how it
  works), 1 funny (request-to-join), 1 warm/reflective (after-game). Added H-FEATURE-* and the
  umbrella H-CONTENT-featurevsrelatable above. Next review: once this batch has ~2 weeks of live
  data, compare follows-per-post and saves against batches 02–06 combined to test whether
  feature-led content out-converts relatable/inspirational content, and prune whichever loses.
