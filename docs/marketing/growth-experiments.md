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

## Open hypotheses (from batch 08 — pain-led "why KeepItUp", added 2026-07-05)

**Owner directive:** the posts must explain more WHY people should use KeepItUp. Built around two
named real-life pains: (1) people organize games in a group chat and it turns into unread
messages, dead polls, no venue, no game; (2) people pay for singles/mixer events to stand around
with a drink. Each post answers "why KeepItUp" against one of these pains, or (P5) reframes both
through a sourced science fact about doing vs. talking. No competitor or specific event company is
named (WhatsApp named once, neutrally and kindly, per owner clearance).

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-PAIN-groupchat | Naming the exact group-chat-organizing chaos, then the fix, drives more follows than a general relatable joke | follows-per-post vs H-PILLAR-funnyphoto / H-FEATURE-funnyreject baselines |
| H-PAIN-paidmingle | Cheekily naming the paid-mixer experience (without mocking it) out-converts a generic dating-app joke | follows-per-post vs H-FEATURE-notswiping baseline |
| H-PAIN-costcompare | A plain, honest numbers comparison (ticket price vs. free) out-saves a joke or feature explainer | saves-per-post vs batch 06/07 average |
| H-PAIN-orgsplit | A visual before/after ("there vs. here") of organizing a game beats a text-only explanation on saves | saves-per-post vs H-FEATURE-howitworks baseline (batch 07 P4) |
| H-PAIN-doingvstalking | A sourced, honestly-framed "doing beats talking" fact, tied to both pains, wins saves as well as our pure science-fact posts | saves-per-post vs H-PILLAR-sciencefact baseline (batch 06) |
| H-PAIN-freeexplainer | The plainest "here's what you get, for free" post beats a longer feature-by-feature explainer on shares | shares-per-post vs H-FEATURE-howitworks / H-CONTENT-featurevsrelatable baselines |
| H-CONTENT-painvsfeature | Pain-based "why us" content converts curiosity into follows/saves/shares better than feature-led (batch 07) or pure relatable/science/quote content (batches 02–06) | follows-per-post + saves + shares, batch 08 vs batch 07 vs batches 02–06 combined |

## Open hypotheses (from batch 09 — owner-review revisions + poster-look rule, added 2026-07-06)

**Owner directive:** a full 2026-07-05 night review of the queue denied five posts (each with a
specific fix) and praised two winners. Batch 09 answers every comment and introduces a new
standing creative rule: **branded poster look** — every image must carry a visible KeepItUp logo
mark + wordmark + branded text blocks (anthracite/`#3BEA7E`/off-white), not a bare photo with a
caption. Four posts (P1-P4) are direct same-joke/same-pillar pairs against an already-shipped
prior version specifically to isolate this variable.

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-BRAND-posterlook | Visible logo + full poster branding lifts saves and profile-visit/link clicks vs. our prior treatments (clean-photo caption-led, or overlay-with-scrim but no visible logo) | saves-per-post + profile-visit clicks, batch 09 P1-P4 vs. their exact prior versions (batch 06 P4/P5, batch 07 P3/P6) at the same time slot |
| H-PILLAR-datinghistory | A verified, plain then-vs-now comparison (1965 computer dating vs. Gen Z today) beats an abstract guessing-game carousel on comprehension and saves | saves-per-post + qualitative comment clarity vs. the denied "Guess Which Era" concept (never shipped, so also compare vs. batch 02/03 carousel baseline) |
| H-TREND-anonymized | A verified-but-unnamed World-Cup human-interest post (no real name/photo, per trend-jacking-playbook rule 2) performs comparably to our earlier team/theme-only World Cup posts | reach/shares/saves vs. H-TREND-worldcup baseline (batch 05 P1/P2) |

Batch 09 also retests `H-PILLAR-sciencefact` (P9, a new citation — Cohen et al. 2009 "rowers'
high" — with poster branding for the first time) and `H-FEATURE-howitworks` (P10, single-poster
format vs. the praised 4-slide carousel, same content) as format/treatment mutations of two
posts the owner explicitly praised, rather than pure repeats.

## Open hypotheses (from batch 10 — the manifesto, added 2026-07-06)

**Owner directive:** a daring, society-challenging batch, openly critical of the dating-app
industry as a category (no competitor named). Flagship: a 9-slide manifesto carousel on romance
scams, fake profiles, pay-to-match economics, and engagement-optimized dating, carrying the
origin story (built by someone fed up with the apps) and closing on "free, not a subscription."
Two supporting posts: a serious scam/fake-profile fact card, and a cheeky "have a good time" post
as a control point for tone.

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-TONE-daring | Confrontational, industry-critical manifesto content out-shares (not just out-likes) our warm/funny baseline | shares+saves+follows-per-post vs. batch 06-09 average at a comparable evening slot |

**Tooling caveat logged here, not just in the batch file:** batch 10 was drafted during a sustained
WebSearch/WebFetch outage (repeated 529 errors, including on a trivial test query). Three
factual slides in P1 and the citation in P2 are marked `[VERIFY]` in
`content-queue/2026-07-batch-10.md` and `social/ideas-batch-10.json` — the qualitative claims are
well-established (FTC names romance scams its costliest tracked fraud category; fake/bot dating
profiles are a documented problem; the largest dating companies report billions in yearly
revenue), but exact digits were deliberately left unstated rather than guessed. **Do not schedule
P1/P2 until someone re-runs those searches and confirms or corrects the wording** — this is a
harder gate than the normal draft→approve flow for this batch specifically.

## Open hypotheses (batch 11 — "what you can actually DO with KeepItUp", added 2026-07-06)

**Owner directive:** stop letting people assume "dating app" is the whole story. Flagship 8-slide
carousel reframes KeepItUp as one place for dating, finding a regular crew, organizing any small
group activity (free-text, not a fixed sport list), keeping every hosted/joined game in one list,
and the core "outside the box" loop — post a plan you already have, let people nearby ask to join,
you decide who comes. Plus one supporting checklist post. Scheduled to anchor opening week
(2026-07-10).

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-ANGLE-usecases | Naming the full breadth of use cases (dating + friendship + organize-anything + your-week-in-one-place + post-and-let-strangers-ask) widens who follows/shares vs. our single-feature or single-pain posts | follows-per-post + shares vs. batch 07 (feature-led) and batch 08 (pain-led) averages |

## Open hypotheses (batch 12 — opening week + World Cup semifinal window, added 2026-07-08)

**Context:** the approval queue was empty (67 prior ideas decided: 30 approved, 33 denied) so this
batch is 10 fresh drafts, no owner comments to answer. Two World Cup trend posts (semifinal week
July 14-15, post-final Monday July 20 — dates verified 2026-07-08), two opening-day posts for
Friday 2026-07-10 (honest "we just opened," no invented traction, no launch city), one new
science-fact citation (Blue Zones/Okinawan moai), one new life-quote attribution (Nelson Mandela,
Laureus 2000), a why-us pain mutation of the approved "The Match That Wasn't" pattern, a second
manifesto ("Vol. 2," a new angle — paradox of choice — per the owner's "one per week, new angle"
instruction), a funny-with-identity post built on the pattern the owner has approved twice (state
the product before the joke), and one new-bet engagement mechanic ("finish the sentence").

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-TREND-fanfriendship | A verified wholesome fan-connection theme (strangers across colors becoming friends, framed generically with no real names/countries) out-shares our earlier theme-only "edge of your seat" World Cup posts | shares+saves vs. batch 02/05 World Cup posts at a comparable slot |
| H-TIME-mondaymorning | The "Monday after the trend ends" slot (08:00) is a viable posting window that sustains reach after the trend itself has peaked | reach by post hour, new datapoint vs. existing morning/evening slots |
| H-ANGLE-honestlaunch | A plain, no-hype "we opened today" announcement out-performs our identity-anchor carousels that don't reference the launch moment, on follows + saves | follows-per-post + saves vs. batch 11 P1 (The Reframe) |
| H-MECHANIC-finishsentence | An open-ended "finish the sentence" comment prompt out-comments our comment-to-win and tag-a-friend mechanics and surfaces useful demand signal (cities/sports/blockers named in answers) | comment count + qualitative signal vs. H-MECHANIC-commenttowin / H-MECHANIC-tagafriend baselines |

This batch also retests `H-TREND-worldcup` (semifinal + post-final window, now with two live
comparison batches already shipped), `H-FEATURE-howitworks` (third format test — single-poster,
opening-day framed), `H-PILLAR-sciencefact` (new citation, friendship-use-case angle instead of
pain-tolerance/bonding-hormone), `H-PILLAR-lifequote` (new attribution, a historically weighty
public figure instead of the softer Helen Keller/bell hooks quotes already used), `H-PAIN-
groupchat` (narrative mutation of the approved "Match That Wasn't" pattern, applied to group plans
instead of dating), `H-TONE-daring` (Vol. 2 of the manifesto pillar — tests whether Vol. 1's
performance was the pillar working or a novelty effect), and `H-PILLAR-funnyphoto` (does the
identity-first funny pattern the owner has approved twice keep winning over the thin-meme pattern
denied twice).

## Open hypotheses (batch 13 — identity-substance, no trend-jacks, added 2026-07-08)

**Context:** the owner decided the full batch-12 queue the morning of 2026-07-08: 7 approved
(Manifesto Vol. 2, We Just Opened, How KeepItUp Works opening-day poster, Sport Has The Power To
Unite/Mandela, The Longest-Living People/Blue Zones moai, We Replaced Small Talk With A Small
Game, Finish The Sentence), 3 denied (both World Cup trend-jacks, and The Plan That Wasn't). This
batch reads that signal literally: zero event/news trend-jacks, full weight on identity-first
product explainers, verified science/quotes, and manifesto tone — the four things that just won.
Also formally adopts two owner-standing phrases into copy going forward: "organize or join games
near you" (not just "find"), and "you're in an environment with people who enjoy doing the same
activity."

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-FEATURE-intentpicker | Naming the intent picker (dating/friends/crew, one tap) as its own concrete explainer wins more saves/follows than the broader "use-case breadth" carousel (batch 11) | saves+follows vs. batch 11 P1 |
| H-FEATURE-privacyplain | A plainer, opening-week-anchored version of the location-privacy explainer out-saves the original "serious explainer" tone | saves-per-post vs. batch 07 P1 |
| H-MECHANIC-thisorthat | A binary "this or that" comment prompt out-comments the open-ended "finish the sentence" format and gives a cleaner signal on which pain point resonates more | comment count + qualitative signal vs. H-MECHANIC-finishsentence (batch 12 P10) |
| H-MECHANIC-ugcinvite | A no-prize, ToS-compliant UGC invite ("show us your first game") generates real reposts/tags during opening week, and opening-weekend timing specifically lifts participation | repost/tag count, follows-per-post, vs. a control run with no launch-moment framing |
| H-TIME-sundayevening | Sunday 18:00 is a viable posting window for product-explainer content | reach by post hour, new datapoint |
| H-TIME-satafternoon | Saturday 15:00 is a viable posting window | reach by post hour, new datapoint |
| H-TIME-sundaymidday | Sunday 12:00 is a viable posting window for opening-weekend/UGC content | reach by post hour, new datapoint |

This batch also retests `H-TONE-daring` (Manifesto Vol. 3 — third install, new angle: the Harvard
Study of Adult Development vs. the attention economy, rather than Vol. 1's industry critique or
Vol. 2's paradox of choice), `H-PILLAR-sciencefact` (new citation — Kraus, Huang & Keltner 2010 NBA
touch/cooperation study, a trust-building angle rather than longevity or pain-tolerance),
`H-PILLAR-lifequote` (new attribution — JFK's 1960 "physical fitness" line, verified genuine; the
popular "Plato" exercise quote was checked this session and rejected as an untraceable modern
paraphrase, so it was not used), and `H-PILLAR-funnyphoto` (third test of the identity-first funny
pattern, now three-for-three owner-approved, at a new 18:00 Tuesday slot to test the "funny peaks
earlier" theory from batch 12).

**Pruned this round:** `H-TREND-worldcup` and its batch-12 children `H-TREND-fanfriendship` /
`H-TIME-mondaymorning` — both World Cup trend-jack posts were denied by the owner before ever going
live, 2 for 2 across their only real test (batch 12). This is a taste signal, not performance data
(the posts never ran), but it's a strong and explicit one: event/news trend-jacking is off the menu
until further notice. No trend-jack posts are in batch 13, and none are planned until the owner
signals otherwise. `H-PAIN-groupchat`'s narrative-pain mutation ("The Plan That Wasn't") was also
denied — logged as a data point against that specific framing (group-chat-pain-as-narrative), not
against the pain pillar overall, since earlier "why KeepItUp" pain posts (batch 08) were never
denied.

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
- _2026-07-05_ — **Pain-led "why KeepItUp" batch shipped** (`content-queue/2026-07-batch-08.md`,
  `social/ideas-batch-08.json`, 6 drafts). Owner directive: stop assuming people already get why
  KeepItUp is different — build directly around two named pains: (1) organizing games in a group
  chat (unread messages, dead polls, no venue, no game — WhatsApp named once, neutrally and kindly,
  as owner-cleared) and (2) paying for singles/mixer events to stand around with a drink. Five
  posts answer one pain directly (P1, P4 → pain #1; P2, P3 → pain #2); P6 answers both at once with
  a plain "it's free, here's what you get" explainer. P5 reframes both pains through a verified,
  honestly-framed science citation (Aron et al. 2000, shared novel activity vs. talking — correctly
  noted as originally studied in couples, mechanism generalized, not overclaimed as tested on
  strangers). No competitor or specific event company named anywhere. Tone mix: funny (P1), cheeky
  (P2), honest/plain (P3), satisfying-contrast carousel (P4), deep (P5), plain/warm (P6). Reused
  the six existing Pexels photos; overlay posts (P1, P3, P4, P5) point `assets` at the **base
  photo** with overlay text specified in `imageConcept` and marked "to be baked" — no composite
  files invented, per the owner's 2026-07-05 instruction. Added H-PAIN-* and the umbrella
  H-CONTENT-painvsfeature above. Next review: once this batch has ~2 weeks of live data, compare
  follows-per-post, saves, and shares against batch 07 (feature-led) and batches 02–06
  (relatable/science/quote/trend) combined to test whether pain-based positioning is the strongest
  lever of the three, and prune whichever approach loses.
- _2026-07-06_ — **Owner review revisions shipped** (`content-queue/2026-07-batch-09.md`,
  `social/ideas-batch-09.json`, 10 drafts, 1 already-approved slide-spec for sign-off). The owner
  reviewed the full queue the night of 2026-07-05 and denied five posts, each with a specific fix,
  and praised two winners. Answered every comment: P1-P4 re-shot with fresh photos (never
  reusing the same six again) and full poster branding (visible KeepItUp logo mark + wordmark —
  the missing ingredient the owner called out on all four denials); P5 drops the "Guess Which Era"
  abstract format entirely for a plain, verified then-vs-now history post (1965 computer dating vs.
  Gen Z's real-life-group trend today, both facts checked via WebSearch); P6 fixes the "5 Stages"
  carousel to count up from Step 1 instead of down from Stage 5; P7 answers the goalkeeper-story
  request but hits a hard compliance wall — `trend-jacking-playbook.md` rule 2 bars using a real
  player's name or photo without rights, so it rides the verified 2026 World Cup keeper
  redemption-story theme with original illustrated art and no name, exactly matching the
  playbook's own worked example; P8 delivers the full 5-slide chat-mockup spec for the
  already-approved micro-drama Episode 1, held for the owner's explicit visual sign-off before
  scheduling; P9 and P10 mutate the two posts the owner praised (a new science citation — Cohen
  et al. 2009 "rowers' high" — and a single-poster remix of the praised 4-step carousel) instead
  of just repeating them. Sourced 6 new Pexels photos (basketball, padel, volleyball, cyclists,
  park fitness group, badminton) to end the photo reuse the owner flagged; not yet downloaded —
  table is in the batch file for the next process step to fetch + license + bake composites, same
  handoff pattern as batch 08. Added H-BRAND-posterlook, H-PILLAR-datinghistory, and
  H-TREND-anonymized above. Next review: once P1-P4 have live data, compare directly against their
  pre-poster-look prior versions (same joke/photo pillar, same time slot) to confirm or kill the
  poster-branding hypothesis before applying it retroactively to older evergreen posts.
- _2026-07-06_ — **Manifesto batch shipped** (`content-queue/2026-07-batch-10.md`,
  `social/ideas-batch-10.json`, 3 drafts). Owner directive: a daring, society-challenging batch,
  openly critical of the dating-app industry as a category (no competitor named or defamed) —
  romance scams, fake profiles, pay-to-match economics, and engagement-optimized dating, plus the
  origin story (KeepItUp built by someone fed up with the apps, not a funded trend-chase) and a
  "free, not a subscription" close. Flagship is a 9-slide manifesto carousel (6 text-card slides +
  3 real-photo slides — padel for the origin story, a bridge-jog for the "crossing over to free"
  beat, laughing beach-volleyball for the final CTA); two supporting posts: a serious scam/
  fake-profile fact card, and a cheeky "45-minute profile photo" post as a tone control point.
  Used one correctly-attributed public quote (bell hooks, *All About Love*, 2000) and one original
  KeepItUp line, clearly labeled. **Drafted during a sustained WebSearch/WebFetch outage** (~20
  retries, all 529 errors, including a trivial test query) — three factual slides are marked
  `[VERIFY]` rather than stating a guessed digit; qualitative claims are well-established, exact
  numbers are gated behind a live source-check before scheduling (see the new hypothesis section
  above and the batch file's "numbers-check gate"). Added `H-TONE-daring`. Next review: once the
  outage clears, re-run the three flagged searches, correct/confirm the wording, then treat this
  batch like any other pending the owner's approval; once live, compare shares+saves+follows
  against the batch 06-09 warm/funny baseline to test whether daring tone out-shares warmth.
- _2026-07-06_ — **"What you can actually do" batch shipped** (`content-queue/2026-07-batch-11.md`,
  `social/ideas-batch-11.json`, 2 drafts). Owner directive: stop letting people assume "dating app"
  is the whole story — show the breadth: dating, finding a regular crew, organizing any small group
  activity (activity is free text, sport is the heart of it but not the limit — verified against
  `CreateEventForm.tsx`'s plain-text sport field and `StepSports.tsx`'s "add your own"), every
  hosted/joined game in one list (`/hosting`, framed honestly, not a general calendar-sync claim),
  and the "outside the box" superpower: publish a plan you already have, people nearby ask to join,
  you decide who comes. Flagship 8-slide carousel (all real-photo, poster-branded, no two slides
  reusing a photo) plus a supporting checklist card. Explicitly excluded any payment/ticketing
  claim — group-event payment links are a real backlog item (`CX-20260706-group-event-payment-
  links`) waiting on Stripe, not implemented, so the concert/gig slide organizes only the meetup (a
  walk, a pre-show run), never a ticket. P1 is scheduled as the opening-week anchor post
  (2026-07-10, the company's opening day). Added `H-ANGLE-usecases` above. Next review: once this
  batch has live data, compare follows-per-post + shares against batch 07 (feature-led) and batch
  08 (pain-led) to test whether breadth-of-use-cases content converts better than single-feature or
  single-pain content.
- _2026-07-08_ — **Opening-week + World Cup semifinal batch shipped**
  (`content-queue/2026-07-batch-12.md`, `social/ideas-batch-12.json`, 10 drafts). Queue was empty
  (67 prior ideas decided: 30 approved, 33 denied) so this batch has no owner comments to answer —
  it's a fresh readout of the pillars that have already won (identity/manifesto/use-case-breadth/
  narrative-pain content) plus two live moments: the World Cup semifinal window (July 14-15) and
  post-final Monday (July 20), both dates verified 2026-07-08 against ESPN/Olympics.com/Al
  Jazeera/Sky Sports, both riding the wholesome fan-connection theme only (no real names, photos,
  countries, teams, or crests, per the trend-jacking playbook); and opening day itself, Friday
  2026-07-10 — an honest "we just opened" announcement plus a how-it-works poster, no invented
  traction, no launch city. Added one new science-fact citation (Blue Zones/Okinawan moai
  longevity research, tied to the friendship use case) and one new life-quote attribution (Nelson
  Mandela, Laureus World Sports Awards, 2000) to keep those two pillars from going stale on repeat
  citations. P7 mutates the owner-approved "The Match That Wasn't" pattern onto a group-plan pain
  instead of a dating match; P8 is "The Manifesto, Vol. 2" — a genuinely new angle (Barry
  Schwartz's paradox of choice, verified 2026-07-08, honestly caveated as having mixed replication)
  rather than a repeat of Vol. 1's scam/fake-profile critique, per the owner's "one manifesto per
  week, new angle" instruction; P9 follows the identity-first funny pattern the owner has approved
  twice (state the product, then land the joke) rather than the thin-meme pattern denied twice; P10
  is the batch's ~20% new-bet slot, a "finish the sentence" comment mechanic not yet run in this
  queue. Added H-TREND-fanfriendship, H-TIME-mondaymorning, H-ANGLE-honestlaunch, and
  H-MECHANIC-finishsentence above; also retests H-TREND-worldcup, H-FEATURE-howitworks,
  H-PILLAR-sciencefact, H-PILLAR-lifequote, H-PAIN-groupchat, H-TONE-daring, and
  H-PILLAR-funnyphoto. Flagged: the 12-photo library is now reused hard across four consecutive
  batches (one photo, basketball-friends, repeats within this batch) — recommend sourcing 4-6 new
  Pexels photos before batch 13. Next review: once this batch has live data, compare the two World
  Cup posts against batches 02/05's earlier World Cup posts, and compare the two opening-day posts
  against batch 11 P1 (the pre-opening identity anchor) to see whether the actual launch moment
  outperforms a generic identity post.
- _2026-07-08_ — **Owner decided the full batch-12 queue.** 7 approved: The Manifesto Vol. 2
  (paradox of choice), We Just Opened, How KeepItUp Works (opening-day poster), Sport Has The Power
  To Unite (Mandela), The Longest-Living People (Blue Zones moai), We Replaced Small Talk With A
  Small Game, Finish The Sentence. 3 denied: both World Cup trend-jacks ("Strangers, Different
  Colors, Same Game" and "Monday, The World Stops Watching Together") and "The Plan That Wasn't."
  Read plainly: identity-first substance, verified science/quotes, plain product explainers, and
  manifesto tone won; event trend-jacks lost 2 for 2 on their only real test. **Pruned:**
  event/news trend-jacking (`H-TREND-worldcup` and children) — no trend-jack posts until the owner
  signals otherwise. Two owner edit-comments adopted as standing style: say "organize or join games
  near you" (not just "find"), and lean on "you're in an environment with people who enjoy doing
  the same activity."
- _2026-07-08_ — **Identity-substance batch shipped, no trend-jacks**
  (`content-queue/2026-07-batch-13.md`, `social/ideas-batch-13.json`, 8 drafts). Direct response to
  the same-day owner decisions above: 2 product explainers on new angles (the intent picker —
  dating/friends/crew, one tap; location privacy in plain, opening-week-anchored words), 1
  manifesto Vol. 3 (new verified angle — the Harvard Study of Adult Development vs. the attention
  economy, replacing Vol. 1's industry critique and Vol. 2's paradox of choice), 1 new science-fact
  citation (Kraus, Huang & Keltner 2010, NBA touch/cooperation study — trust-building angle,
  distinct from every prior science citation used in batches 06-12), 1 new life-quote attribution
  (JFK, "The Soft American," Sports Illustrated, 1960 — verified genuine; the popular "Plato"
  exercise quote was checked this session and rejected as an untraceable modern paraphrase, so a
  misattribution was avoided), 1 funny-with-identity post (third test of the pattern the owner has
  now approved three times), 1 new comment mechanic ("this or that," binary, distinct from
  comment-to-win/tag-a-friend/finish-the-sentence), and 1 new-bet UGC invite for opening weekend
  ("show us your first game," no prize, fully clear of the still-blocked P7 giveaway mechanic).
  Reused the existing 12-photo library (no new sourcing this round) but deliberately skipped
  `basketball-friends` (used twice in batch 12) and `padel-match` (venue branding visible); flagged
  again that the library needs a refresh before batch 14. Added H-FEATURE-intentpicker,
  H-FEATURE-privacyplain, H-MECHANIC-thisorthat, H-MECHANIC-ugcinvite, H-TIME-sundayevening,
  H-TIME-satafternoon, and H-TIME-sundaymidday above; retests H-TONE-daring, H-PILLAR-sciencefact,
  H-PILLAR-lifequote, and H-PILLAR-funnyphoto. Next review: once this batch has live data, compare
  the two product explainers against batch 07 (feature-led) and batch 11 (breadth) baselines, and
  check whether Manifesto Vol. 3 sustains the shares/saves/follows lift of Vol. 1 and Vol. 2 or
  whether the pillar is starting to flatten on its third install.

## CONTRACT v3 — distribution-first (2026-07-14)

**The audit that triggered this:** 38 posts shipped in 30 days (batches 02-13) produced **203
total IG reach, 0 recorded TikTok reach, 0 followers, 0 likes/comments/saves**, across every
pillar and format tested so far. Read plainly: **content production was never the bottleneck -
distribution was.** Volume didn't move the north-star metric once, at any cadence tried. (Full
diagnosis and this week's outreach-led sprint: `docs/marketing/sprint-2026-07-14.md`, led by
Niobe.)

**Prunes, with the numbers that justify each one:**

| Pruned | Number that justifies it |
|--------|---------------------------|
| Volume above ~4 posts/channel/week | 38 posts / 30 days produced 0 followers - more volume at the old cadence has a 100% failure rate on the north-star metric so far; capping volume forces distribution effort per post instead of raw output |
| Engagement-prompt mechanics (comment-to-win, this-or-that, finish-the-sentence, tag-a-friend, UGC invites) | **0 comments** recorded across every prompt post run to date (H-MECHANIC-commenttowin, H-MECHANIC-tagafriend, H-MECHANIC-thisorthat, H-MECHANIC-finishsentence, H-MECHANIC-ugcinvite) - the mechanic assumes an existing audience to prompt, and there isn't one yet |
| Science-fact + life-quote pillars, down-weighted to 1 combined per batch | **5 of the 6 all-time zero-reach posts** were science-fact or life-quote pillar posts - the pillars aren't earning the reach needed to justify their prior full weight; they stay in rotation (evidence-based, on-brand) but capped until one proves it can earn nonzero reach |
| Posting without a stated distribution action | 0 followers on 38 posts that all relied on algorithmic/organic reach alone with no human-driven distribution step - every post now requires one |

**New standing rules (override anything in this file's earlier sections that conflicts, until the
accounts pass 100 followers combined):** max ~4 posts/channel/week; every post ships with a named
distribution action; engagement-prompt formats paused (revisit >100 followers); science-fact +
life-quote pillars capped at 1 combined per batch; follower counts logged every cycle in
`docs/marketing/follower-log.md`; each batch designates one approved post POST NATIVELY (owner)
against a Buffer-scheduled twin; Niobe's (growth-pm) weekly content needs, when named, outrank this
agent's own batch ideas.

## Open hypotheses (batch 14 - distribution-first, closing the 07-16 to 07-22 gap, added 2026-07-14)

**Context:** the 2026-07-14 Buffer audit found the approved/scheduled queue runs dry after
2026-07-15 and doesn't pick back up until 07-23 (IG) / 07-24 (TikTok) - an 8-9 day dead zone right
as contract v3 takes effect. This batch is 8 drafts (4 IG + 4 TikTok) covering 07-16 to 07-22 at
the new ~4/week/channel cap, weighted to the two things most likely to move a still-at-zero
audience: the funny-with-identity pattern (3-for-3 owner-approved before this contract) and plain
product explainers, plus exactly 1 science fact (new citation, Zajonc 1968 mere-exposure effect -
not a repeat of any prior science citation) and 1 manifesto (Vol. 4, a genuinely new verified
angle - Ray Oldenburg's "third place" concept, *The Great Good Place*, 1989, distinct from Vol.
1's industry critique, Vol. 2's paradox of choice, and Vol. 3's Harvard Study of Adult
Development). Zero life-quote posts this batch (the science/quote cap is 1 combined, spent on the
science fact). Zero engagement-prompt mechanics, zero event/news trend-jacks - both remain off per
contract v3 rule 3 and the standing 2026-07-08 trend-jack prune. Every post carries a Distribution
line (niche hashtags or a named community/outreach tie-in, per contract v3 rule 2). P1 and P2 are
a **designed** native-vs-Buffer A/B pair - same funny-identity pattern, same photo mood, same
time-of-day, only the publish channel differs - with P1 marked **POST NATIVELY (owner)**.
Cross-checked against Niobe's `sprint-2026-07-14.md`: no specific content request has surfaced yet
from her outreach tracks, so nothing outranked this batch's own plan this round.

| ID | Hypothesis | How we'll judge it |
|----|-----------|--------------------|
| H-DISTRIBUTION-nativevsbuffer | A native, owner-posted publish out-reaches an otherwise-identical Buffer-scheduled post | reach delta, P1 (native) vs. P2 (Buffer), same pattern/time-of-day |
| H-ANGLE-directaddress | A plain, joke-free, direct-address hook (no punchline, no prompt) out-saves both the funny-identity pattern and the fact/quote pillars | saves-per-post, P8 vs. batch 14's own P1/P2/P5 (funny) and P3 (science) |
| H-TIME-wedmidday | Wednesday midday (12:00) is a viable posting window, alongside the already-tested Sunday midday slot | reach by post hour, new datapoint vs. H-TIME-sundaymidday (batch 13) |

This batch also retests `H-PILLAR-funnyphoto` (4th and 5th installs, P1/P2/P5 - now including the
first TikTok-native test of the pattern via P5), `H-PILLAR-sciencefact` (new citation, familiarity/
liking angle rather than trust, touch, longevity, or pain-tolerance), `H-TONE-daring` (Manifesto
Vol. 4, 4th install - flagged: **per contract v3, the manifesto pillar's continued full-batch slot
depends on this or Vol. 3 finally earning nonzero reach; if Vol. 4 also lands at zero, the pillar
gets cut down to occasional/retest-only status, not a standing weekly slot**), and the "plain
product explainer" family generally (P6/P7, single-sentence mutations testing whether shorter
copy out-saves the longer carousel/numbers-comparison versions from batches 07/08/11).

**Photo library:** sixth consecutive batch without new sourcing (batches 09-14). 9 of the 10
non-flagged photos used, each exactly once, no repeats within the batch (`basketball-friends` and
`padel-match` stay excluded per the standing flags). Only `park-fitness-group` is left untouched.
**This is now a hard blocker for "vary the imagery" going into batch 15** - recommend the owner or
Niobe provision 4-6 new Pexels photos before the next batch.

**Composite bake status:** this session had no shell/build tool available to run
`bake-social-composites.mjs`, so the 8 planned composite PNGs (`b14p*.png`) are specified but not
baked. Buffer ideas attach the **base real photos** directly so the approval page still renders
real imagery now; the next cycle with build access should bake the composites and swap the
Buffer-idea media over to them before scheduling.

- _2026-07-14_ - **Contract v3 (distribution-first) adopted; batch 14 shipped**
  (`content-queue/2026-07-batch-14.md`, `social/ideas-batch-14.json`, 8 drafts, seeded as Buffer
  ideas `6a558a201e697bf7ddc3a7f3` through `6a558a3ae5dc4db857a080d3`). Triggered by the 2026-07-14
  audit (38 posts / 30 days / 203 IG reach / 0 TikTok reach / 0 followers / 0 engagement) and the
  same-day Buffer queue audit (07-16 to 07-22/07-23 scheduling gap). Pruned: volume above ~4/week/
  channel, all engagement-prompt mechanics, and science/quote pillars down to 1 combined slot per
  batch - see the prune table above for the exact numbers behind each cut. Added
  H-DISTRIBUTION-nativevsbuffer, H-ANGLE-directaddress, and H-TIME-wedmidday. Next review: once
  this batch has ~2 weeks of live data (and `follower-log.md` has at least two readings), compare
  P1 vs. P2 for the native-vs-Buffer question first - it's the single highest-leverage open
  question this contract exists to answer - then fold in the usual pillar/format/time analysis.

## Weekly growth memo — 2026-07-14 (emergency acquisition sprint)

**Target vs actual (week of 07-07 → 07-14):** target was 5 new registered
users. Actual, honestly stated: **~2 users total** as of the 2026-07-10
standup — the only registration number in the repo record. This session has
no live read of `/api/metrics/summary` for a current 07-14 count; that is a
filed gap (see `sprint-2026-07-14.md`), not an invented number. Social side:
38 posts published in 30 days, 203 total IG reach, 0 recorded TikTok reach,
0 followers, 0 post-attributed signups (2026-07-14 Buffer audit).

**Diagnosis:** distribution is zero, not content. 0-follower accounts get no
organic feed distribution regardless of post quality — every post is
essentially unseen. The one channel that reaches real humans directly (20
double-verified organizer DMs, ready since 07-08) sat unsent for 6 days,
blocked purely on execution, not on readiness. Funnel-stage read: no
visits → this is a distribution problem, not a landing-page or activation
problem (we don't have enough traffic yet to diagnose those stages).

**This week's single experiment:** owner-executed direct outreach — the 20
organizer DMs (`docs/marketing/outreach/2026-07-08-organizer-dms.md`,
re-verified fresh 2026-07-14, sent 5/day starting today) plus daily
distribution packs from the newly-hired community-distribution agent Link
(`.claude/agents/community-distribution.md`). Content (Trinity) is capped at
~4 posts/channel this week and required to carry a distribution action —
support, not the lead bet. Full plan: `docs/marketing/sprint-2026-07-14.md`.

**Killed/kept:** killed nothing new in content this round (Trinity's v2→v3
contract rewrite already logged in `agent-performance.md` 2026-07-14 covers
that). Kept: all 20 organizer DM targets (freshness spot-check of 5/20
passed, no removals). New: Link hired specifically because nobody owned
daily outbound distribution.

**What would falsify this bet:** by Friday 2026-07-17, if 0 of the 20 DMs
have any reply AND 0 signups are attributable to outreach, the channel
itself (not just this message) is in question — next step would be revising
the DM script and getting one honest "why didn't you reply" data point
before sending the rest, per the kill/keep criteria in
`sprint-2026-07-14.md`. By Sunday 07-19, fewer than 5 total new users is
logged as a sprint miss with the specific bottleneck named from whatever
data is actually available.
