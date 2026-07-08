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
