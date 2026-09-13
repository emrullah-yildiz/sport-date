param([switch]$RegisterTask)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtime = Join-Path $PSScriptRoot 'runtime'
$worktree = Join-Path $runtime 'worktree'
$taskName = 'KeepItUp Product Studio'
# Registration is separate from starting: the owner/orchestrator verifies the prepared result first.
if (-not $RegisterTask) { throw 'Pass -RegisterTask to create the local task after reviewing README.md' }
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task already exists; inspect it rather than overwriting it' }
$dirty = & git -C $repo status --porcelain
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Commit the verified operating contract, HQ helper and runtime before installing' }
if (-not (Test-Path (Join-Path $repo 'docs/operations/autonomous-operating-contract.md'))) { throw 'Operating contract is required' }
$npmRoot = (& npm root -g).Trim()
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
@{ sourceRoot=$repo; worktree=$worktree; codex=$codex; installedAt=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $runtime 'config.json')
@{ state='paused'; checkedAt=[DateTime]::UtcNow.ToString('o'); note='Installed; first reviewed cycle must be started with runner.ps1 -Resume' } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $runtime 'status.json')
$powershell = Join-Path $env:WINDIR 'System32/WindowsPowerShell/v1.0/powershell.exe'
$runner = Join-Path $PSScriptRoot 'runner.ps1'
$action = New-ScheduledTaskAction -Execute $powershell -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$runner+'"') -WorkingDirectory $repo
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$triggers = @((New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)), (New-ScheduledTaskTrigger -AtLogOn -User $user))
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
# IgnoreNew plus the OS-held file lock prevents task/manual overlap. No catch-up bursts or retries.
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 28) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Bounded local product-studio cycles; pause/fault latch; no production push or external outreach' | Select-Object TaskName,State
Write-Output 'Registered in paused state. No cycle started. Review runtime/status.json before explicit resume.'
