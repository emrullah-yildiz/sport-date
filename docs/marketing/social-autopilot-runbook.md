# Social autopilot — per-cycle runbook

How the `social-media-growth` agent runs the KeepItUp socials **by itself**, waiting
only on the owner's approval. This is mechanism-agnostic: it works whether the cycle
is fired by the experience-loop, a scheduled routine, or a manual `@social-media-growth`
run. Owner authorized hands-off operation on **2026-07-04**.

## The contract (what "autopilot" means here)

- **The owner's only job is to approve.** Everything else — drafting, creative,
  scheduling, measuring, pruning, replenishing the queue — runs automatically.
- **Approved → scheduled, automatically.** When a post is marked `APPROVED`, the next
  cycle produces its creative and schedules it in Buffer. No re-asking.
- **The queue never runs dry.** When drafts awaiting approval drop below ~4, the agent
  auto-generates the next batch so the owner always has something to approve.
- **Nothing un-approved ever goes live.** Hard rule. Un-approved content is only ever a
  Buffer *idea* / repo `draft`.

## Each cycle, in order

### 1. Fulfil approvals (highest priority)
- Read every file in `content-queue/`. Collect posts whose status line is `APPROVED`
  or `APPROVED with: …` and whose status is not yet `scheduled`/`published`.
- For each approved post:
  1. Produce the final creative (step 2).
  2. Schedule in Buffer: `list_channels` → exact `channelId` → `create_post` with the
     approved caption/hashtags and the post's target day/time (addToQueue or a dated
     schedule). Apply any `APPROVED with:` edits first.
  3. Update the post's status to `scheduled` and record the Buffer post id + date.
- **Never** schedule a post that isn't `APPROVED`.

### 2. Produce the creative
- **Image formats** — memes, carousels, quote/stat cards, IG & TikTok **photo-mode**
  slideshows: the agent builds these end-to-end from brand assets in
  `apps/web/public/brand/`. No human step.
- **Video formats** — Reels / TikToks / Shorts: feed the script into the
  owner-provisioned AI-video tool (`ai-video-tool-setup.md`), retrieve the rendered
  MP4, attach it, then schedule.
  - If the AI-video tool **isn't connected yet**: leave the post `approved` +
    `awaiting-asset`, keep its shot-by-shot brief ready, and continue. Don't block the
    cycle on it.
  - AI-generated video must be flagged with the platform's **AI-content label**
    (EU AI Act + Meta/TikTok AI-disclosure). Keep faceless AI video to a share of the
    mix — lean on photo-mode + real footage for reach.

### 3. Replenish the draft queue
- Count un-approved `draft` posts across `content-queue/`.
- If **< ~4**, generate the next batch (`YYYY-MM-batch-NN.md`): a fresh mix of formats
  and mechanics (curiosity hook, meme, seasonal, comment-to-win, tag-a-friend, and —
  only once unblocked — a giveaway), each with full spec + a hypothesis. Load them as
  Buffer **ideas** (`create_idea`), status `draft`.
- Bias new batches toward the formats/times currently winning (step 4), keeping ~20%
  as new experiments.

### 4. Measure + prune (once there's data)
- When ≥ ~2 weeks of live posts exist, pull `get_aggregated_post_metrics` +
  `list_posts(includeMetrics)` per channel.
- Rank posts by **follows-per-post + shares + saves**. Fill the scorecard and append a
  dated decision to `growth-experiments.md`: what got cut, what's being scaled, what's
  next.

### 5. Status note
- Leave a short readout: scheduled today, new drafts awaiting approval, anything
  blocked (e.g. giveaway prize, missing video tool). Then stop until the next cycle.

## How the owner approves (unchanged, fast)
On each post's status line in the batch file write `APPROVED`, `APPROVED with: <edits>`,
or `PARK: <reason>`. That's the only required human action.

## What still needs a human / owner (hard boundaries)
- Provisioning + paying for the AI-video tool and any other paid tool.
- Confirming a **real, deliverable prize** + a T&C page before any giveaway runs.
- Connecting Buffer (browser OAuth) in whatever environment the cycle runs in — the
  scheduling step needs a live Buffer connection. In a pure headless/cloud run without
  Buffer, the agent still does drafting, creative prep, briefs, and repo/log updates,
  and defers the Buffer scheduling to the next connected cycle.
- Final say on brand, pricing, and launch geography (per the loop guardrails).

## Where the cycle is fired
Marketing is a growth track of the owner's non-stop experience loop
(`.agents/experience-loop/`). Options to trigger this runbook each cycle:
- fold a "social" tick into the existing loop, or
- a scheduled routine (`/schedule`) — reliable for the drafting/measuring/briefs work;
  the Buffer-scheduling step needs Buffer reachable in that run, or
- on demand: `@social-media-growth run the autopilot cycle`.
