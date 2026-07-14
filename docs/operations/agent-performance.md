# Agent performance — scorecards, fire/rehire log

## The crew (Matrix callsigns — owner directive 2026-07-06)

| Callsign | Agent | Why the name |
|---|---|---|
| **Morpheus** | CEO (Claude, main session) | Captain of the ship — recruits, directs, believes in the mission |
| **The Architect** | Planner (experience loop) | Designs the system and decides what gets built next |
| **Tank** & **Dozer** | Builder pool | The operators who construct everything the crew needs |
| **Seraph** | Tester / User-sim | "You do not truly know someone until you fight them" — nothing ships until Seraph has fought it |
| **Trinity** | social-media-growth | Fast, public-facing, does the impossible daily |
| **The Oracle** | standup-scribe | Meets you every morning with what's really going on and what to decide |
| **Smith** | photo-moderator | Relentlessly hunts rule-breaking content out of the system |

The owner is **Neo** — the one who chooses. Use these callsigns in standups,
scorecards, and HQ from now on (file/agent ids stay unchanged for tooling).

Owner directive (2026-07-05): every daily standup analyzes agent performance
against explicit success metrics, keeps score here, and **fires bad agents /
rehires better ones**. "Fire" = retire the agent's contract (its definition or
pipeline is withdrawn); "rehire" = a new, tightened contract that fixes the
failure. Verdicts must cite evidence (owner corrections, shipped output,
metrics), never vibes.

## Success metrics per agent

| Agent | Success metric | Target |
|---|---|---|
| social-media-growth | Follows-per-post + shares + saves; owner-corrections per batch (fewer = better); % of drafts approved without edits | ≥60% drafts approved unedited; corrections trending to 0; follower growth once data exists (1000 IG+TikTok is the standing goal) |
| Builder (experience loop) | Tickets shipped with full DoD (typecheck/lint/tests/prod build) per cycle; deploy breakage caused | 0 broken deploys; every ship verified |
| Tester / User-sim | Verified tickets per run; false-passes discovered later | 0 false-passes; runs don't collide with Builder (worktree isolation) |
| Visual-QA auditor | Confirmed findings per audit; false-positive rate | Majority of findings confirmed real |
| photo-moderator | Pending-photo queue cleared within 24h; wrong approvals/rejections | 0 wrong calls (blocked until owner sets MODERATION_AGENT_SECRET) |
| standup-scribe (new) | Standup published by 06:15 daily; directions actionable (owner approves ≥1 per week); zero invented data | Report live on HQ every morning |
| CEO (Claude) | Owner-gated items escalated correctly; guardrail violations; loop throughput | 0 guardrail violations; blockers surfaced same-day |

## Scorecard — standup 2026-07-05 (first review)

| Agent | Evidence | Verdict |
|---|---|---|
| **Text-card creative pipeline** (SVG quote/meme cards, batches 01–04) | Owner rejected the output style directly: "It is just text… use images, real people, objects." Zero owner-approved posts produced in its final batches. | **FIRED 2026-07-05.** Replaced by the real-photo + baked-composite pipeline (Pexels-licensed photography + sharp overlays), which the owner accepted same-day. Remaining unapproved text-card drafts proposed for parking (direction SD-20260705-park-textcards). |
| **social-media-growth v1** (contract of 2026-07-04) | Productive (7 batches, 40+ drafts; correctly screened out a crime-story trend-jack) but required 3 owner corrections in 2 days: geo-restricted copy, text-only creative, jargon/word-games ("6-a-side", "finish-line stranger-assist"). | **REHIRED on contract v2 (2026-07-05):** image-led with real photos mandatory, plain simple English rule, science-fact + life-quote pillars, trend-jack-first with no-crime screen, improve-on-owner-comment duty. Corrections-per-batch is now its tracked metric. |
| **Builder** (experience loop) | Shipped safety bundle, event invites, survey, interactive onboarding, Gmail delivery — all with full DoD, 994 tests green; no member-facing breakage. | **KEEP.** Strongest performer. |
| **Visual-QA auditor** | 9 off-style findings, confirmed and fixed. | **KEEP** (on-demand). |
| **Tester / User-sim** | Valuable verification, but hit session limits mid-run and once collided with Builder WIP (needed worktree-isolation rule). | **KEEP, on probation:** must run in an isolated worktree and own its build; next collision or false-pass triggers a contract rewrite. |
| **photo-moderator** | Hired 2026-07-04, has never run — blocked on owner setting `MODERATION_AGENT_SECRET`. | **KEEP (idle).** Can't be judged before it runs; not a performance failure. |
| **standup-scribe** | New hire (2026-07-05): daily 06:00 cloud routine publishing this report + directions to HQ. | **HIRED.** First unattended run: next 06:00. |
| **CEO (Claude)** | Self-review: caught own process failures (pushed once without full suite; */15 cron silently failing) and fixed both with standing rules. Guardrail violations: 0. | **KEEP.** Owner is the CEO's performance judge. |

## Fire/rehire log

| Date | Action | Who | Why | Replacement contract |
|---|---|---|---|---|
| 2026-07-05 | **Fired** | Text-card creative pipeline | Owner rejected text-only output; zero approved posts in final batches | Real-photo + baked-composite pipeline (photos in `apps/web/public/brand/social/photos/`, licensed + logged) |
| 2026-07-05 | **Rehired (contract v2)** | social-media-growth | 3 owner corrections in 2 days on copy/creative style | `.claude/agents/social-media-growth.md` rewritten: photo-led, plain English, new pillars, improve-on-comment duty |
| 2026-07-05 | **Hired** | standup-scribe | Owner wants a daily 06:00 standup + approvable directions on HQ | Cloud routine (see `docs/operations/standup-runbook.md`) |
| 2026-07-05 | **Probation** | Tester / User-sim | Build collision with Builder WIP; session-limit stalls | Worktree isolation mandatory; next failure → rewrite |
| 2026-07-14 | **Fired** | standup-scribe (The Oracle, cloud routine) | 4+ consecutive delivery misses; contract structurally dependent on an owner-side secret that never landed | Standup publishing folded into the CEO local loop (proven prod publish path); cloud routine to be deleted |
| 2026-07-14 | **Rehired (contract v3)** | social-media-growth (Trinity) | 38 clean publishes, 0 followers/0 engagement — v2 optimized volume over distribution | `.claude/agents/social-media-growth.md` amended: distribution-first, volume cap, prompt-formats paused, follower log, native A/B |
| 2026-07-14 | **Hired** | community-distribution (Link) | 0-follower accounts get no feed distribution; nobody owned daily outbound | `.claude/agents/community-distribution.md`: daily owner-executable distribution packs, ToS-clean |
| 2026-07-14 | **Promoted** | growth-pm (Niobe) | Only agent pointed at the actual user target; deliverable ready on time, blocked on execution | Sprint lead for the 5-users week; Trinity's content serves her funnel |

## Scorecard — standup 2026-07-06 (published by CEO; scribe delivery failed)

| Agent | Evidence | Verdict |
|---|---|---|
| **standup-scribe** | Fired on time (06:01), wrote its report, push refused with 403 — the cloud environment has read-only repo access; the report died in the sandbox and the owner got nothing. Not a judgment failure, but delivery IS the job. | **PROBATION.** Mitigations shipped: runbook now mandates printing the full report JSON in the run log when a push is refused (no more silent misses); owner direction SD-20260706-cloud-write requests write access. Two consecutive silent misses → contract rewrite (API-seed delivery). |
| **Builder pool** | 4 full-DoD builds in 24h: poster/share v1+v2, location map picker, click analytics — 1141 tests green, zero deploy breakage, strong judgment calls (ImageResponse over sharp; dark-ink contrast; QR decode verification). | **KEEP** — best performers on the roster. |
| **social-media-growth v2** | Batch 09 answered all 13 owner comments (incl. compliance pushback on the real-player-photo ask); batch 10 manifesto drafting with verified-stats discipline. | **KEEP.** Corrections trending down under contract v2. |
| **CEO** | Found the canonical-domain root cause (stale env vars); enforced no-defamation + rights lines under pressure; published this standup when the scribe couldn't. Miss: didn't verify the scribe's delivery path end-to-end before its first unattended run. | **KEEP**, with the miss logged. |

Review cadence: every daily standup re-scores; fire/rehire proposals ship as
directions the owner approves on `/hq.html`.

## Scorecard — standup 2026-07-08 (published by CEO; scribe delivery missed again)

| Agent | Evidence | Verdict |
|---|---|---|
| **The Oracle (standup-scribe)** | 06:07 run fired; report reached neither HQ nor git — second consecutive miss. Root cause is owner-side config (STANDUP_AGENT_SECRET not yet in the cloud env), not judgment: the API delivery path shipped 07-08 and is proven (CEO published through it twice). | **PROBATION continues.** Self-delivery expected the morning after SD-20260708-cloud-secret is done; a miss AFTER the secret lands → contract rewrite. |
| **Trinity (social-media-growth)** | Queue ran completely dry (owner found 0 pending on 07-08) — a miss against the never-empty mandate. Recovered same night: batch 12 (10 drafts, verified World Cup dates, fresh citations, no invented stats) seeded as pending. | **KEEP**, with the dry-queue miss logged; queue depth is now a watched metric. |
| **Niobe (growth-pm)** | First deliverable: 20/20 organizer DMs with every target double-verified against live second sources; two unverifiable candidates disclosed instead of guessed. | **KEEP.** Strong evidence discipline on the first assignment. |
| **Morpheus (CEO)** | Overnight loop: standup API shipped+proven in prod, honest marketing report (2 users / 0 followers) published, Google indexing structurally unblocked (domain flip + verification hook), both owner asks delivered, HQ kept current all night. Guardrail violations: 0. | **KEEP.** |

## Scorecard — 2026-07-14 (EMERGENCY REVIEW — owner unhappy, 5-users/week target missed)

Trigger: owner escalation 2026-07-14. Live Buffer audit shows 38 posts / 30d,
203 total IG reach, 0 recorded TikTok reach, **0 followers, 0 post-attributed
signups**; weekly target was 5 new users. The bottleneck is distribution +
blocked outreach, not content production. Verdicts below are structural, not
cosmetic.

| Agent | Evidence | Verdict |
|---|---|---|
| **Morpheus (CEO)** | Strategy error, owned: kept a content factory running at full volume into 0-follower accounts and reported "clean publishes" as progress; the one lever that can produce real users this week (Niobe's 20 double-verified organizer DMs, ready since 07-08) sat blocked 6 days without daily escalation; queue gap (07-15→07-23) formed on watch. Guardrail violations: 0, but the target (5 users/week) was missed on strategy, which is the CEO's job. | **KEEP is the owner's call, not mine.** Corrective plan shipped today (this review + acquisition sprint + contract rewrites). If the owner reads this as a firing offense, the succession artifact is this file + `ceo-charter.md`. |
| **The Oracle (standup-scribe)** | 4+ consecutive delivery misses (07-06 pre-API, 07-08, 07-09, 07-10; nothing since). Root cause is structural: the cloud contract depends on an owner-side secret (`STANDUP_AGENT_SECRET` in the routine env) that has not landed in 6 days and may never. A contract that cannot deliver without a standing unmet dependency is a bad contract, not bad luck. | **FIRED 2026-07-14.** Cloud routine contract retired. Standup publishing folds into the CEO local loop via the proven prod publish path (owner loses zero function; gains: no more secret-paste ask, no more silent misses). Rehire possible if cloud env write access ever lands. |
| **Trinity (social-media-growth v2)** | Flawless execution of the wrong priority: 38 clean publishes, verified citations, 0 Buffer errors — and 0 followers, 0 comments, 0 saves to show for it. Contract v2 optimizes publishing volume and format experiments; at 0 audience the experiments can't even be scored (median reach ≈ 1–5). Also: best-reach post (112) was posted natively, outside her pipeline; both mandated pillars (science-fact, life-quote) are 5 of the 6 zero-reach posts. | **REHIRED on contract v3 (2026-07-14):** distribution-first. Volume capped at ~4 posts/channel/week; every post ships with a distribution action; engagement-prompt formats paused until >100 followers; science/quote pillars down-weighted to ~1/batch until one earns nonzero reach; manual follower-count log added to every cycle; native-vs-Buffer A/B mandated. |
| **Niobe (growth-pm)** | The only agent whose work directly targets the 5-users metric, and it was ready on time (07-08, 20/20 double-verified DMs). Zero misses. Blocked entirely on owner execution. | **KEEP + PROMOTED to sprint lead** for the 2026-07-14 acquisition week. Owns the user count; Trinity's content now serves Niobe's funnel, not the other way around. |
| **Link (community-distribution)** | — | **HIRED 2026-07-14** (`.claude/agents/community-distribution.md`). Daily job: package outbound distribution the owner can execute in ≤20 min/day — ready-to-paste community posts (Reddit/Facebook groups/Discord), comment/follow target lists from brand accounts, directory submissions. ToS-clean, no automation, owner-executed. Niobe sets strategy; Link produces the daily ammunition. |
| **Tank & Dozer (builders)** | Idle since 07-10; nothing broken. Product is not this week's bottleneck — but signup activation will be the moment outreach lands. | **KEEP.** One standing ticket: verify the visit→signup funnel instrumentation end-to-end before outreach traffic arrives. |

## Scorecard — standup 2026-07-10 (published by CEO; scribe missed 07-09 AND 07-10)

| Agent | Evidence | Verdict |
|---|---|---|
| **The Oracle (standup-scribe)** | Third and fourth consecutive delivery misses (07-09, 07-10); the live HQ report sat on July 8 until the owner flagged it. Root cause unchanged and owner-side: STANDUP_AGENT_SECRET is verified live in the production web env but absent from the cloud routine's own environment. | **PROBATION continues.** Direction SD-20260710-cloud-secret re-raised (now 4 missed reports). Self-delivery expected the morning after the paste; a miss after that → contract rewrite. |
| **Trinity (social-media-growth)** | 8 clean publishes 07-09→07-10 including the opening-day pair (We Just Opened IG 09:04 + TikTok 09:10), zero Buffer errors, citations held. Batch 13 verdict: 6 approve / 2 deny (denials = taste data). | **KEEP.** Watch item: Buffer queue empty after tonight's 19:40 post until the 6 approved posts dispatch and batch 14 lands. |
| **Niobe (growth-pm)** | 20 double-verified organizer DMs ready since 07-08, still unsent (owner-executed by guardrail). No misses on her side. | **KEEP (waiting).** Next assignment starts when outreach replies arrive. |
| **Tank & Dozer (builders)** | Nothing shipped 07-09/07-10 — the local loop did not run. Last delivered work (batch-13 bakes, SEO unblock, standup API) all clean. | **KEEP.** Idle gap, not a performance failure. |
| **Morpheus (CEO)** | Miss logged: loop idle two days, HQ stale until owner flag — always-current directive violated. Correction: catch-up published to prod (API-verified live) + standing first-action rule: check the live report date before any other work. Guardrail violations: 0. | **KEEP**, with the miss logged. |
