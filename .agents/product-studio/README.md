# Autonomous product-studio runtime

This is a real, local Windows supervisor, not a claim that a chat keeps working after it ends. It requires this computer awake, the current user logged in, network access, and valid existing ChatGPT authentication/usage. It cannot guarantee uninterrupted service or sales. It never starts paid API fallback.

The scheduler wakes every 30 minutes and at logon. One cycle can work for at most 25 minutes, with an OS-held exclusive file lock and a 10-second heartbeat. Scheduler `IgnoreNew` is a second overlap guard. A retained `running` status after a crash latches closed on the next invocation. Auth, exit, verification, dirty-tree and malformed-result failures also latch closed. Reporting succeeds through verified live publication or a committed, freshly timestamped static fallback; missing credentials alone do not block useful product work. Failed cycles never retry until explicit resume. Owner-blocked cycles cheaply poll the existing HQ helper without invoking a model; a changed response for a current decision or restored reporting credentials wakes one new cycle. Only a private digest is retained in runtime status; unchanged/unrelated decisions do not launch work. Fault/paused states still require deliberate resume.

Work happens only in the retained `studio/autonomous` Git worktree under ignored `runtime/worktree`. Main is not automatically merged or pushed. The runtime uses configured model settings without overrides, `workspace-write` sandbox and `never` approval; sandbox failures are recorded, never bypassed. Native CLI `--worktree` was evaluated but requires a disabled experimental feature and cannot combine with `--ephemeral`; ordinary Git worktrees provide stable isolation instead.

The operating contract and authorized HQ helper must be committed first. Install from the repository root:

```powershell
powershell -NoProfile -File .agents/product-studio/test-runner.ps1
node --test .agents/product-studio/reporting.test.mjs
powershell -NoProfile -File .agents/product-studio/install.ps1 -RegisterTask
```

Installation creates the schedule in a logically paused state; it does not launch a cycle. After reviewing config, worktree, credentials and HQ delivery, start one hidden bounded cycle:

```powershell
$runner=(Resolve-Path .agents/product-studio/runner.ps1).Path
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$runner+'" -Resume')
```

Inspect `.agents/product-studio/runtime/status.json` for local truth: `running` means heartbeat must be fresh (under 60 seconds); `completed` means the last cycle passed and the next scheduled trigger may run; `fault` and `paused` require deliberate resume; `owner_blocked` monitors scoped HQ responses. A stale heartbeat is not proof of work. Ignore `checkedAt` as activity evidence: paused scheduler checks update it without calling the model. Run stdout/stderr and result remain local in the ignored runtime directory. They may contain workspace details and must never be published wholesale. `STUDIO_SOURCE_ROOT` lets the authorized reporting helper access existing protected environment configuration without copying it into the isolated checkout. After a clean successful cycle, the supervisor validates report fields/statuses/size/freshness and its exact match to Git HEAD, then atomically mirrors only `apps/web/public/standup/latest.json` to the main checkout. That authorized reporting exception updates local HQ without merging app changes. It may leave this one report modified in main; preserve it during later integration.

Pause future triggers with `Disable-ScheduledTask -TaskName 'KeepItUp Product Studio'`. This does not interrupt an existing coherent cycle. After that cycle exits, `powershell -NoProfile -File .agents/product-studio/runner.ps1 -Pause` persists the pause. To resume, first inspect/fix the isolated tree and failure, enable the schedule and run the hidden `-Resume` command. Never remove locks, reset branches or delete unfinished work to make a failure disappear.

To update the isolated branch with newly approved main changes, pause and wait for the lock owner to finish, inspect both trees, and merge/review manually. Do not silently reset it. Local commits need independent integration review and separate production authorization.

Validation: authenticated read-only CLI smoke returned `RUNTIME_SMOKE_OK` on 2026-09-14 (existing ChatGPT session; no tool use, no project changes). Runtime unit checks cover latching, dirty-tree/failure/publication boundaries, atomic status replacement, exclusive locking/recovery, and PowerShell syntax. A successful smoke is not evidence that a mutating scheduled cycle or remote HQ reporting works; verify the first actual cycle before claiming continuous operation.
