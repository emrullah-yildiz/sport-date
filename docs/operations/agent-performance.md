# Agent performance — scorecards, fire/rehire log

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

## Scorecard — standup 2026-07-06 (published by CEO; scribe delivery failed)

| Agent | Evidence | Verdict |
|---|---|---|
| **standup-scribe** | Fired on time (06:01), wrote its report, push refused with 403 — the cloud environment has read-only repo access; the report died in the sandbox and the owner got nothing. Not a judgment failure, but delivery IS the job. | **PROBATION.** Mitigations shipped: runbook now mandates printing the full report JSON in the run log when a push is refused (no more silent misses); owner direction SD-20260706-cloud-write requests write access. Two consecutive silent misses → contract rewrite (API-seed delivery). |
| **Builder pool** | 4 full-DoD builds in 24h: poster/share v1+v2, location map picker, click analytics — 1141 tests green, zero deploy breakage, strong judgment calls (ImageResponse over sharp; dark-ink contrast; QR decode verification). | **KEEP** — best performers on the roster. |
| **social-media-growth v2** | Batch 09 answered all 13 owner comments (incl. compliance pushback on the real-player-photo ask); batch 10 manifesto drafting with verified-stats discipline. | **KEEP.** Corrections trending down under contract v2. |
| **CEO** | Found the canonical-domain root cause (stale env vars); enforced no-defamation + rights lines under pressure; published this standup when the scribe couldn't. Miss: didn't verify the scribe's delivery path end-to-end before its first unattended run. | **KEEP**, with the miss logged. |

Review cadence: every daily standup re-scores; fire/rehire proposals ship as
directions the owner approves on `/hq.html`.
