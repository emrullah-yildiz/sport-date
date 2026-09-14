# Department priorities

Departments own outcomes across cycles. They are not continuously running processes. The coordinator dispatches bounded assignments to available agents, reviews evidence, then gives the next useful task. Use current HQ assignments to distinguish Working, Checking, Prepared, Completed, Queued and Blocked. Never infer work from a department name or registered schedule.

| Department | Outcome | Current priority | Completion evidence | Next independent task |
| --- | --- | --- | --- | --- |
| Product Design | Understand and confidently use the core flow | Review Profile/Settings; repair discovered friction | Actual UI, scoped regressions and browser checks | Event-day recovery and host-edit usability |
| Engineering & Delivery | Verified changes ready for release | Recover retained host editing; integrate reviewed work | Tests, typecheck, build, exact candidate revision | Prepare scoped release decision and rollback plan |
| Growth & Marketing | Real local supply and attended sessions | Reuse approved host pilot; define the next evidence-producing experiment | Host commitment, accepted requests, attendance and repeat evidence | Refine onboarding from actual objections; no invented conversion |
| Social & Creative | Explain the product truthfully | One discovery-to-request demo based on implemented UI | Script, storyboard, caption/accessibility text and release prerequisites | Produce approved asset; public distribution needs scoped authorization |
| CEO & Operations | Highest-value work gets done | Rank and dispatch work; review deliverables and publish HQ | Fresh named assignments, verified outcomes and narrow decisions | Reprioritize from evidence after each coherent slice |

## Dispatch rules

1. Read current agent-state, roadmap, owner decisions and available-agent/runtime status. Completed artifacts and stale status do not establish active work.
2. Give priority to a core-flow defect or delivery blocker, then evidence of host supply/attendance, then explanatory creative. Do not generate more campaigns while the first one lacks distribution or real supply.
3. With four active slots, keep the coordinator plus at most three independent specialists. Reuse completed agents when available. Give each explicit file ownership and acceptance criteria.
4. When a specialist completes, inspect its result and assign the next justified task. If publication or business approval blocks it, move to another useful independent task. A prepared campaign is not published; a draft is not customer evidence.
5. Publish HQ at assignment changes and handoff, with actual names, task, timestamp, next checkpoint and blocker. Preserve unresolved owner directions. Do not label a stopped or unavailable worker as active.
6. Every bounded cycle leaves a verified handoff. A quota/auth/process fault preserves unfinished work and stops expensive retries. Do not buy credits or activate a paid fallback automatically.

## Current execution constraint

September 15 update: owner reports 82% usage remaining and authorizes continuation. Treat the old quota rejection as historical. Coordinator is recovering the dirty worktree before an explicit bounded resume; consult current HQ/runtime for the observed restart result. No claim that current capacity is exhausted should be derived solely from the old log.

The existing recurring CLI worker remains fault-latched after its recorded usage-limit failure. Active conversation agents can perform their assigned work; they are not an unattended service after the conversation ends. Restoring the recurring worker requires available model capacity and an explicit inspected resume. Continuous operation cannot be promised while that dependency is unavailable. The existing local scheduler also requires an awake, logged-in, connected PC.
