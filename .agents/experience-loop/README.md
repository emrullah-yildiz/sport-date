# Experience loop (continuous plan → build → test → use)

A never-ending studio loop that drives Sport Date toward the best possible modern,
human, trustworthy experience. **Four agents, one queue.**

```
   Planner ──► Builder ──► Tester ──► User-simulator ──┐
  (plans &    (implements  (verifies   (drives real     │
   prioritizes top ticket,  implemented journeys,       │
   the queue)  commits+push) → verified) files issues)  │
       ▲                                                │
       └──────────── shared CX- ticket queue ◄──────────┘
        .agents/customer-feedback/tickets/
```

## Roles (each is its own agent definition)

- **Planner** — `.agents/experience-loop/planner.md`. Grooms + prioritizes the backlog,
  breaks goals into buildable tickets, names the single next thing to build, keeps
  `docs/operations/agent-state.md` current. Never codes or tests.
- **Builder** — `.agents/experience-build-agent.md`. Implements the top `ready` ticket on
  brand with full state coverage; runs typecheck/lint/test **and a production `npm run
  build`**; commits **and pushes** one verified unit (a unit that adds a DB migration is
  committed but left for the orchestrator to push + migrate prod). Marks `implemented`.
- **Tester** — `.agents/experience-loop/tester.md`. Independent quality gate: proves each
  `implemented` ticket against its acceptance criteria (repo checks + live/pooled login +
  guardrails + release/schema safety) → `verified`, or reopens `ready` with evidence.
- **User-simulator** — `.agents/experience-loop/user-simulator.md`. Drives complete
  real-member journeys in the browser, watches for breakage/confusion, and files
  prioritized issue tickets. This is how new work enters the queue.

The Explorer (`.agents/experience-design-explorer.md`) is retained as the shared reference
for surfaces, lenses, growth tracks, guardrails, and the "Release & deploy safety" lens
that Tester and User-simulator both use.

## Ticket lifecycle

`draft → ready → in-progress → implemented → verified → (archived)`
(`blocked-owner` for escalation-only decisions; reopened to `ready` if a test/journey fails.)

Completed tickets (`verified`/`superseded`) are moved to
`.agents/customer-feedback/tickets/archive/` to keep the active queue small — agents scan
only the non-recursive active glob `tickets/CX-*.md`, but still dedup new tickets against
the archive (see `archive/README.md`).

## One orchestrator tick (four phases, SEQUENTIAL — never concurrent)

1. **Plan** — run the Planner. It grooms/prioritizes and names the next ticket to build.
2. **Build** — run the Builder on that ticket. Implements, verifies (incl. prod build),
   commits, and pushes (migration units → orchestrator pushes + migrates prod).
3. **Test** — run the Tester on the just-`implemented` ticket → `verified` or reopen.
4. **Use** — run the User-simulator on the next real journey; it files new prioritized
   tickets, which feed the next Plan phase.

Run the four phases in order so they don't race on the queue, `LOG.md`, or git. After the
Build (and Test) phase the orchestrator bookkeeps and pushes to `origin/main` (owner
directive: **commit and push always**; migration units get prod-migrated first).

Seeding bias: while the backlog is thin, weight ticks toward the Planner + User-simulator
to build a rich prioritized backlog; once there's depth, keep all four phases each tick so
quality and discovery keep pace with delivery.

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
