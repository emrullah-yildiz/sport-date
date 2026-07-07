# Daily standup — runbook (standup-scribe)

Owner directive (2026-07-05): every day at **06:00 Europe/Bucharest** an agent
standup runs, analyzes agent performance, keeps success metrics, proposes
fire/rehire calls, and publishes a report with **directions the owner approves
on the command centre** (`/hq.html`). This file is the authoritative spec; the
cloud routine `keepitup-daily-standup` executes it.

## Hard rules
- **Ground every claim in repo files or git history.** Never invent metrics,
  follower counts, or events. If data doesn't exist yet, say so.
- **Plain, simple English.** No jargon.
- **Propose, don't execute, personnel changes.** Fire/rehire/contract rewrites
  ship as directions for the owner; agent definition files are only changed by
  the CEO loop after the owner approves.
- Touch ONLY: `apps/web/public/standup/*.json`,
  `docs/operations/agent-performance.md`, and this file's log section. Never
  touch `apps/web/src/`, member-facing pages, or marketing content.

## Procedure

1. **Read state** (narrowly — sections, not whole trees):
   - `docs/operations/agent-performance.md` — metrics table, scorecards, fire/rehire log
   - `docs/operations/agent-state.md` — latest work cycles
   - `docs/marketing/content-queue/README.md` + the 2–3 newest batch files — queue state
   - `docs/marketing/growth-experiments.md` — hypotheses and results
   - `apps/web/public/standup/latest.json` — yesterday's standup (report follow-through)
   - `git log --oneline -30` — what actually shipped

2. **Score the agents** against the metrics table in `agent-performance.md`.
   Use the Matrix callsigns from that file's crew table (Morpheus, The
   Architect, Tank & Dozer, Seraph, Trinity, The Oracle, Smith — the owner is
   Neo) in the report's `agents[].name` fields, with the functional role in
   the note when clarity needs it.
   Evidence-based verdict per agent: keep / probation / fire / rehire-on-new-contract / hire.
   Append today's scorecard block to `agent-performance.md` (keep prior days).

3. **Write the report** to `apps/web/public/standup/YYYY-MM-DD.json` (today,
   UTC date) and copy it to `apps/web/public/standup/latest.json`. Shape:

```json
{
  "day": "YYYY-MM-DD",
  "generatedAt": "ISO timestamp",
  "headline": "one sentence",
  "summary": ["3-6 short paragraphs: what shipped, queue state, follow-through on yesterday's approved directions, blockers"],
  "agents": [{ "name": "", "status": "keep|probation|fired|rehired-v2|hired|idle-blocked", "metric": "", "note": "" }],
  "directions": [{ "id": "SD-YYYYMMDD-slug", "priority": "high|medium|low", "title": "", "detail": "", "recommendation": "" }]
}
```

   - Direction ids MUST match `SD-YYYYMMDD-slug` (lowercase slug; the HQ
     decision API rejects anything else).
   - 3–6 directions max. Each one is a real decision, not a status line.
   - Re-raise any still-unhandled owner blocker (video tool, prizes, keys) as a
     direction at most once per week — don't nag daily.

4. **Publish to HQ immediately** (owner directive 2026-07-07: the report must
   be on `/hq.html` the moment the standup finishes — no git push, no deploy
   wait). POST the report JSON to the production API:

   ```
   curl -sS -X POST https://keepitup.social/api/standup/report \
     -H "Authorization: Bearer $STANDUP_AGENT_SECRET" \
     -H "Content-Type: application/json" \
     --data @apps/web/public/standup/YYYY-MM-DD.json
   ```

   A `200 {"ok":true,...}` means the report is LIVE on `/hq.html` right now —
   the page reads the API first (table `standup_reports`, migration 044). The
   API validates the shape strictly (same contract as above) and 400s with the
   exact problem; fix and re-POST. Re-POSTing the same day replaces that day's
   report.

5. **Commit and push to `main`** with message
   `ops: daily standup YYYY-MM-DD (standup-scribe)` — the static JSON files
   are history + fallback (the page uses them if the API is ever down). Only
   the allowed files may be in the commit. If the push is refused (403 /
   read-only checkout), that is fine and expected — the API publish in step 4
   already delivered the report; the CEO loop commits the files later.
   - **If the API publish in step 4 ALSO failed: do NOT stop silently.**
     Print the COMPLETE report JSON as your final message, prefixed with the
     line `STANDUP-REPORT-FALLBACK (publish failed):` — the run log then
     carries the report so the CEO can publish it manually (the CEO loop can
     POST it with Bearer `SOCIAL_AGENT_SECRET`, which the endpoint also
     accepts). A silent failure means the owner gets no standup, which is the
     one unacceptable outcome (it happened on 2026-07-06, pre-API).

## How decisions flow back
The owner's approve/deny + notes are stored via `POST /api/standup/directions`
(owner-gated; table `standup_direction_decisions`, migration 041). The **local
CEO loop** reads them back with `GET /api/standup/directions` (Bearer
`SOCIAL_AGENT_SECRET`) and executes approved directions; outcomes land in
`agent-state.md` / the HQ log, which the next standup reads — closing the loop.
The cloud scribe holds exactly one secret: `STANDUP_AGENT_SECRET`, which can
only publish a standup report to the internal HQ page (nothing member-facing).
It never reads the DB.

## Ownership
- Routine: `keepitup-daily-standup`, cron `0 3 * * *` UTC (= 06:00 Bucharest in
  summer; 05:00 in winter — owner accepted; adjust the cron seasonally if it matters).
- Secret: `STANDUP_AGENT_SECRET` must be set in BOTH the web app's production
  env (Vercel) and the cloud routine's environment (owner action, one-time).
  The endpoint fails closed until it is set; until then step 4 falls back to
  the run-log print and the CEO loop publishes with `SOCIAL_AGENT_SECRET`.
- Scribe's own success metric (tracked in `agent-performance.md`): report live
  on HQ by 06:15, zero invented data, ≥1 owner-approved direction per week.
