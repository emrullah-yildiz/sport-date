param([switch]$Resume, [switch]$Pause, [switch]$LibraryOnly)
$ErrorActionPreference = 'Stop'

function Get-CycleDisposition($Previous, [bool]$ResumeRequested) {
    if ($ResumeRequested) { return 'run' }
    if ($Previous -and $Previous.state -in @('fault', 'owner_blocked', 'paused', 'running')) { return 'hold' }
    return 'run'
}

function Get-ResultDisposition($Result, [int]$ExitCode, [bool]$Dirty, [bool]$LocalReportVerified = $false) {
    if ($ExitCode -ne 0) { return 'fault' }
    if ($Dirty) { return 'fault' }
    if (-not $Result -or $Result.status -notin @('completed', 'owner_blocked', 'fault')) { return 'fault' }
    if ($Result.hqPublished -ne $true -and -not $LocalReportVerified) { return 'fault' }
    return $Result.status
}

function Test-ChatGptLogin([string]$Codex) {
    # Codex prints successful status on stderr; Windows PowerShell otherwise treats it as terminating.
    $ErrorActionPreference='Continue'
    $auth = & $Codex login status 2>&1 | Out-String
    return ($LASTEXITCODE -eq 0 -and $auth -match 'Logged in using ChatGPT')
}

function Get-HQSignal($Config) {
    $ErrorActionPreference='Continue'
    $raw = & node (Join-Path $PSScriptRoot 'reporting.mjs') monitor $Config.sourceRoot $Config.worktree 2>$null | Out-String
    if ($LASTEXITCODE -ne 0) { return $null }
    try { return $raw | ConvertFrom-Json } catch { return $null }
}

function Write-JsonAtomic([string]$Path, $Value) {
    $temp = "$Path.$PID.tmp"
    [IO.File]::WriteAllText($temp, ($Value | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temp, $Path, [NullString]::Value) }
    else { [IO.File]::Move($temp, $Path) }
}

if ($LibraryOnly) { return }
$runtime = Join-Path $PSScriptRoot 'runtime'
[IO.Directory]::CreateDirectory($runtime) | Out-Null
$lock = $null
try { $lock = [IO.File]::Open((Join-Path $runtime 'cycle.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
catch [IO.IOException] { exit 0 } # Another supervisor owns the cycle; do not overwrite its status.
$statusPath = Join-Path $runtime 'status.json'
$state = [ordered]@{ state='fault'; checkedAt=[DateTime]::UtcNow.ToString('o'); note='Runner has not started'; supervisorPid=$PID }
$child = $null
try {
    $previous = if (Test-Path $statusPath) { Get-Content -Raw $statusPath | ConvertFrom-Json } else { $null }
    if ($Pause) { $state.state='paused'; $state.note='Explicitly paused'; Write-JsonAtomic $statusPath $state; exit 0 }
    $config = Get-Content -Raw (Join-Path $runtime 'config.json') | ConvertFrom-Json
    $signal=$null
    $ownerResponse=$false
    if ($previous -and $previous.state -eq 'owner_blocked' -and -not $Resume) {
        $signal=Get-HQSignal $config
        $ownerResponse=($signal -and $signal.available -and $previous.decisionDigest -and $signal.digest -ne $previous.decisionDigest)
        if ($signal) { $previous | Add-Member -NotePropertyName decisionDigest -NotePropertyValue $signal.digest -Force }
    }
    if ((Get-CycleDisposition $previous ($Resume.IsPresent -or $ownerResponse)) -eq 'hold') {
        $previous.checkedAt=[DateTime]::UtcNow.ToString('o')
        Write-JsonAtomic $statusPath $previous
        exit 0
    }
    $worktree = [IO.Path]::GetFullPath($config.worktree)
    if (-not (Test-Path -LiteralPath (Join-Path $worktree '.git'))) { throw 'Isolated worktree missing' }
    $branch = & git -C $worktree branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'studio/autonomous') { throw 'Isolated branch mismatch' }
    $dirty = & git -C $worktree status --porcelain
    if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Isolated worktree has unfinished changes; review before resuming' }
    if (-not (Test-Path (Join-Path $worktree 'docs/operations/autonomous-operating-contract.md'))) { throw 'Operating contract missing from worktree' }
    # Auth status exposes account mode only. Never read the auth file or permit API-key fallback.
    $env:OPENAI_API_KEY=$null
    $env:CODEX_API_KEY=$null
    $env:STUDIO_SOURCE_ROOT=$config.sourceRoot
    if (-not (Test-ChatGptLogin $config.codex)) { throw 'Existing ChatGPT authentication unavailable' }
    if (-not $signal) { $signal=Get-HQSignal $config }
    $runId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
    $runDir = Join-Path $runtime $runId
    [IO.Directory]::CreateDirectory($runDir) | Out-Null
    $output = Join-Path $runDir 'result.json'
    $prompt = Join-Path $PSScriptRoot 'cycle-prompt.md'
    $schema = Join-Path $PSScriptRoot 'result-schema.json'
    # Each argument is fixed or a trusted local path; never interpolate model/remote text into a shell.
    $arguments = @('-a','never','exec','-s','workspace-write','-C',('"'+$worktree+'"'),'--color','never','--output-schema',('"'+$schema+'"'),'-o',('"'+$output+'"'),'-')
    $state = [ordered]@{ state='running'; startedAt=[DateTime]::UtcNow.ToString('o'); heartbeatAt=[DateTime]::UtcNow.ToString('o'); checkedAt=[DateTime]::UtcNow.ToString('o'); supervisorPid=$PID; runId=$runId; worktree=$worktree; decisionDigest=$signal.digest; note='Bounded local cycle; no production publishing authorized' }
    Write-JsonAtomic $statusPath $state
    $child = Start-Process -FilePath $config.codex -ArgumentList $arguments -WorkingDirectory $worktree -WindowStyle Hidden -RedirectStandardInput $prompt -RedirectStandardOutput (Join-Path $runDir 'stdout.log') -RedirectStandardError (Join-Path $runDir 'stderr.log') -PassThru
    $null=$child.Handle # Retain the native process handle so ExitCode remains available after exit.
    $deadline = [DateTime]::UtcNow.AddMinutes(25)
    while (-not $child.WaitForExit(10000)) {
        if ([DateTime]::UtcNow -ge $deadline) {
            & taskkill.exe /PID $child.Id /T /F *> $null
            throw 'Cycle exceeded 25 minutes; process tree terminated; review worktree before resume'
        }
        $state.heartbeatAt=[DateTime]::UtcNow.ToString('o')
        $state.checkedAt=$state.heartbeatAt
        Write-JsonAtomic $statusPath $state
    }
    $child.WaitForExit()
    $exitCode = $child.ExitCode
    $result = if (Test-Path $output) { Get-Content -Raw $output | ConvertFrom-Json } else { $null }
    $dirty = & git -C $worktree status --porcelain
    $gitFailed=$LASTEXITCODE -ne 0
    $localReportVerified=$false
    if ($result -and $result.localReportSaved -eq $true -and $result.status -in @('completed','owner_blocked') -and $exitCode -eq 0 -and -not $dirty -and -not $gitFailed) {
        # Sole main-checkout write exception: exact committed, schema-validated, fresh HQ report.
        $mirroredRaw=& node (Join-Path $PSScriptRoot 'reporting.mjs') mirror $worktree $config.sourceRoot $state.startedAt | Out-String
        if ($LASTEXITCODE -ne 0) { throw 'Local HQ mirror refused report' }
        $localReportVerified=($mirroredRaw | ConvertFrom-Json).mirrored -eq $true
    }
    $liveVerified=$false
    if ($result -and $result.hqPublished -eq $true -and $exitCode -eq 0 -and -not $dirty -and -not $gitFailed) {
        $liveRaw=& node (Join-Path $PSScriptRoot 'reporting.mjs') verify-live $worktree $state.startedAt | Out-String
        if ($LASTEXITCODE -eq 0) { $liveVerified=($liveRaw | ConvertFrom-Json).verified -eq $true }
    }
    if ($result) { $result.hqPublished=$liveVerified }
    $state.state=Get-ResultDisposition $result $exitCode ([bool]$dirty -or $gitFailed) $localReportVerified
    $state.note=if ($state.state -eq 'fault') { 'Cycle or verification/publication failed; inspect retained local run logs and worktree before explicit resume' } else { $result.summary }
    if ($localReportVerified -and -not $liveVerified) { $state.note += ' HQ report is local-only; independent live readback was not verified.' }
    $state['completedAt']=[DateTime]::UtcNow.ToString('o')
    $state['exitCode']=$exitCode
    $state['hqPublished']=$liveVerified
    $state['localReportVerified']=$localReportVerified
    Write-JsonAtomic $statusPath $state
} catch {
    $state.state='fault'
    # Exception text may contain provider output: store only a bounded local diagnostic category.
    $state.note='Supervisor failure; inspect local configuration/worktree/auth and explicitly resume after fixing it'
    $state['failedAt']=[DateTime]::UtcNow.ToString('o')
    Write-JsonAtomic $statusPath $state
    exit 1
} finally {
    if ($child -and -not $child.HasExited) { & taskkill.exe /PID $child.Id /T /F *> $null }
    if ($lock) { $lock.Dispose() }
}
