param([switch]$RegisterTask)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtime = Join-Path $PSScriptRoot 'runtime'
$worktree = Join-Path $runtime 'worktree'
$taskName = 'KeepItUp Product Studio'
# Registration is separate from starting: the owner/orchestrator verifies the prepared result first.
if (-not $RegisterTask) { throw 'Pass -RegisterTask to create the local task after reviewing README.md' }
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task already exists; inspect it rather than overwriting it' }
foreach ($name in @('config.json','status.json','schedule-ledger.json')) {
    if (Test-Path -LiteralPath (Join-Path $runtime $name)) { throw 'Existing runtime state must be preserved; recover the existing setup instead of reinstalling' }
}
$dirty = & git -C $repo status --porcelain
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Commit the verified operating contract, HQ helper and runtime before installing' }
if (-not (Test-Path (Join-Path $repo 'docs/operations/autonomous-operating-contract.md'))) { throw 'Operating contract is required' }
$npmRoot = (& npm.cmd root -g).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Global npm root unavailable' }
$binaries = @(Get-ChildItem -LiteralPath (Join-Path $npmRoot '@openai/codex') -Filter codex.exe -Recurse)
if ($binaries.Count -ne 1) { throw 'Expected one native Codex executable; inspect the CLI installation' }
$codex = $binaries[0].FullName
. (Join-Path $PSScriptRoot 'runner.ps1') -LibraryOnly
if (-not (Test-ChatGptLogin $codex)) { throw 'Existing ChatGPT login is required' }
[IO.Directory]::CreateDirectory($runtime) | Out-Null
if (-not (Test-Path -LiteralPath $worktree)) {
    & git -C $repo worktree add -b studio/autonomous $worktree HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Worktree creation failed; existing branches must be inspected, never reset automatically' }
}
$branch = & git -C $worktree branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'studio/autonomous') { throw 'Unexpected existing worktree branch' }
$schedule=New-StudioSchedule
$now=[DateTimeOffset]::UtcNow
$ledger=New-StudioLedger $schedule $now
$slot=Get-StudioSlotDecision $schedule $ledger $now
Write-JsonAtomic (Join-Path $runtime 'config.json') @{ sourceRoot=$repo; worktree=$worktree; codex=$codex; installedAt=$now.UtcDateTime.ToString('o'); schedule=$schedule; decisionEmailEnabled=$false }
Write-JsonAtomic (Join-Path $runtime 'schedule-ledger.json') $ledger
$initial=[ordered]@{ state='paused'; checkedAt=$now.UtcDateTime.ToString('o'); note='Installed; first reviewed cycle must be started with runner.ps1 -Resume';scheduleEnabled=$false;scheduleObservedAt=$now.UtcDateTime.ToString('o') }
Set-StudioScheduleSnapshot $initial $slot $schedule
Write-JsonAtomic (Join-Path $runtime 'status.json') $initial
$powershell = Join-Path $env:WINDIR 'System32/WindowsPowerShell/v1.0/powershell.exe'
$runner = Join-Path $PSScriptRoot 'runner.ps1'
$action = New-ScheduledTaskAction -Execute $powershell -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$runner+'"') -WorkingDirectory $repo
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$triggers = @((New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)), (New-ScheduledTaskTrigger -AtLogOn -User $user))
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
# IgnoreNew plus the OS-held file lock prevents task/manual overlap. No catch-up bursts or retries.
$settings = New-ScheduledTaskSettingsSet -Disable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 28) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description '09:00/17:00 Europe/Bucharest slots, max two starts/day; cheap 30-minute checks; no production push or external outreach' | Out-Null
Disable-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
Write-Output 'Registered disabled and logically paused. No cycle started. Review runtime/status.json and retained work before enabling and explicitly resuming.'
