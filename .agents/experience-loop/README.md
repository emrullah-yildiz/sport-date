# Experience loop (continuous explore → build → verify)

A never-ending studio loop that drives Sport Date toward the best possible modern,
human, trustworthy experience. Two agents, one queue.

```
        ┌─────────────────────────────────────────────┐
        ▼                                             │
  Explorer  ──files prioritized tickets──►  Ticket queue  ──►  Build Agent
  (.agents/experience-design-explorer.md)   (.agents/customer-   (.agents/
   one surface × one lens per pass           feedback/tickets/)   experience-build-agent.md)
   retests `implemented` → `verified`              ▲             implements top P0→P3
        │                                          │             ticket, checks, commits
        └──────────── restarts, goes deeper ───────┴──── marks `implemented` ──┘
```

## Roles

- **Explorer** — `.agents/experience-design-explorer.md`. Observes, gets inspired by
  best-in-class 3D/gamified/award sites, reasons from the member's journey, files
  **prioritized** tickets (Reach×Impact×Confidence/Effort → P0–P3), and independently
  retests implemented tickets. Never implements.
- **Build Agent** — `.agents/experience-build-agent.md`. Pulls the highest-priority
  `ready` ticket, implements on brand with full state coverage, runs
  typecheck/lint/test, commits one verified unit per ticket, marks it `implemented`.
  Never pushes/deploys.

## Ticket lifecycle

`draft → ready → in-progress → implemented → verified`
(`blocked-owner` for escalation-only decisions; reopened to `ready` if retest fails.)

## One orchestrator tick

1. **Build pass** — run the Build Agent. It implements + commits the single
   highest-priority `ready` ticket, or reports "queue drained."
2. **Explore pass** — run the Explorer on the next (surface × lens) cell. It first
   retests any `implemented` tickets (→ `verified`), then files new prioritized
   tickets. A new `ready` ticket means the next Build pass has work — this is how a
   "new ticket submit launches the builder."
3. **Log** — both agents append to `LOG.md`. Advance the rotation and tick again.

Seeding bias: while the backlog is thin, weight ticks toward the Explorer to build a
rich prioritized backlog across surfaces and lenses; once there's depth, alternate
build and explore so quality keeps pace with discovery.

Growth mode: when no defects or owner items remain, the Explorer shifts from fixing to
growing — new features, a monetization & pricing proposal (research-backed; final
pricing/brand/launch stay owner decisions and are filed `blocked-owner`), and
continuous ease-of-use + positive-vibe polish. See the "Growth tracks" section in
`.agents/experience-design-explorer.md`. Safety features are never paywalled; growth
never overrides the anti-dark-pattern guardrails.

## Running it

Started live, self-paced, from the launching session via the `/loop` skill. It runs
continuously and does not stop on its own.

Prerequisite for real UI testing: a dev server + dev database
(`npm run dev --workspace @sport-date/web`, with `NEON_DATABASE_URL` exported — see
`apps/web/qa/README.md`). The browser explorer (`npm run qa:explore`) and direct page
reads both feed the Explorer's observations.

## STOP / PAUSE

The loop stops only when the owner says so. To stop it:

- Tell the running session **"stop the experience loop"** (the loop checks this file
  each tick), **or**
- Set the switch below to `stopped` and commit:

```
LOOP: running
```

While `LOOP: stopped`, the orchestrator finishes any in-flight commit, writes a final
LOG line, and halts without starting a new tick.

## Files

- `LOG.md` — append-only timeline of every pass (explore + build).
- Tickets live in `.agents/customer-feedback/tickets/` (shared `CX-` queue).
