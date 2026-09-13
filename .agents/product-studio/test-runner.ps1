$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'runner.ps1') -LibraryOnly
function Assert-Equal($Actual, $Expected, [string]$Case) {
    if ($Actual -ne $Expected) { throw "$Case expected $Expected, got $Actual" }
}
foreach ($state in @('fault','paused','owner_blocked','running')) {
    Assert-Equal (Get-CycleDisposition ([pscustomobject]@{state=$state}) $false) 'hold' "Latch $state"
    Assert-Equal (Get-CycleDisposition ([pscustomobject]@{state=$state}) $true) 'run' "Explicit resume $state"
}
Assert-Equal (Get-CycleDisposition $null $false) 'run' 'Initial run'
Assert-Equal (Get-CycleDisposition ([pscustomobject]@{state='completed'}) $false) 'run' 'Next successful cycle'
$ok=[pscustomobject]@{status='completed';hqPublished=$true}
Assert-Equal (Get-ResultDisposition $ok 0 $false) 'completed' 'Verified published success'
Assert-Equal (Get-ResultDisposition $ok 1 $false) 'fault' 'Nonzero exit'
Assert-Equal (Get-ResultDisposition $ok 0 $true) 'fault' 'Uncommitted changes'
Assert-Equal (Get-ResultDisposition $null 0 $false) 'fault' 'Missing result'
Assert-Equal (Get-ResultDisposition ([pscustomobject]@{status='completed';hqPublished=$false}) 0 $false) 'fault' 'Unpublished report'
Assert-Equal (Get-ResultDisposition ([pscustomobject]@{status='completed';hqPublished=$false}) 0 $false $true) 'completed' 'Verified local fallback permits product work'
Assert-Equal (Get-ResultDisposition ([pscustomobject]@{status='invalid';hqPublished=$true}) 0 $false) 'fault' 'Invalid result'
Assert-Equal (Get-ResultDisposition ([pscustomobject]@{status='owner_blocked';hqPublished=$true}) 0 $false) 'owner_blocked' 'Owner hold'
$runnerSource=Get-Content -Raw (Join-Path $PSScriptRoot 'runner.ps1')
Assert-Equal ($runnerSource -match "'-c','sandbox_workspace_write.network_access=true','exec','-s','workspace-write'") $true 'Outbound network enabled without changing workspace sandbox'
$testDir=Join-Path ([IO.Path]::GetTempPath()) ('studio-runtime-test-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($testDir) | Out-Null
try {
    $status=Join-Path $testDir 'status.json'
    Write-JsonAtomic $status @{state='running'}
    Write-JsonAtomic $status @{state='completed'}
    Assert-Equal ((Get-Content -Raw $status | ConvertFrom-Json).state) 'completed' 'Atomic status replacement'
    $ready=Join-Path $testDir 'reader-ready'
    $readerShell=[PowerShell]::Create()
    try {
        $null=$readerShell.AddScript('param($path,$ready) $handle=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read); try { [IO.File]::WriteAllText($ready,"ready"); Start-Sleep -Milliseconds 600 } finally { $handle.Dispose() }').AddArgument($status).AddArgument($ready)
        $pending=$readerShell.BeginInvoke()
        $waitDeadline=[DateTime]::UtcNow.AddSeconds(5)
        while(-not (Test-Path $ready)) { if([DateTime]::UtcNow -ge $waitDeadline) { throw 'Reader fixture failed to start' }; Start-Sleep -Milliseconds 10 }
        $watch=[Diagnostics.Stopwatch]::StartNew()
        Write-JsonAtomic $status @{state='after-reader'}
        $watch.Stop()
        $null=$readerShell.EndInvoke($pending)
        Assert-Equal ((Get-Content -Raw $status | ConvertFrom-Json).state) 'after-reader' 'Reader sharing collision recovers without fault'
        Assert-Equal ($watch.ElapsedMilliseconds -ge 200) $true 'Writer genuinely waited for reader release'
    } finally { $readerShell.Dispose() }
    $readerShell=[PowerShell]::Create()
    try {
        $null=$readerShell.AddScript('param($path) $reads=0; for($i=0;$i -lt 200;$i++) { try {$raw=[IO.File]::ReadAllText($path)} catch {$exception=$_.Exception; while($exception.InnerException){$exception=$exception.InnerException}; if(($exception.HResult -band 65535) -eq 32){Start-Sleep -Milliseconds 1; continue}; throw}; $null=$raw | ConvertFrom-Json; $reads++; Start-Sleep -Milliseconds 1 }; $reads').AddArgument($status)
        $pending=$readerShell.BeginInvoke()
        for($index=0;$index -lt 100;$index++) { Write-JsonAtomic $status @{state='stress';sequence=$index} }
        $reads=$readerShell.EndInvoke($pending)
        Assert-Equal $readerShell.Streams.Error.Count 0 'Concurrent readers never see missing or partial JSON'
        Assert-Equal ([int]$reads[0] -gt 0) $true 'Concurrent reader completed real snapshot reads'
        Assert-Equal ((Get-Content -Raw $status | ConvertFrom-Json).sequence) 99 'Repeated atomic replacement retains final state'
    } finally { $readerShell.Dispose() }
    $nativeDenied=[Management.Automation.ErrorRecord]::new([ComponentModel.Win32Exception]::new(5),'fixture',[Management.Automation.ErrorCategory]::PermissionDenied,$null)
    Assert-Equal (Test-TransientFileSharing $nativeDenied $status) $true 'Busy-file access denial permits bounded retry after reader releases'
    try { [IO.File]::SetAttributes($status,[IO.FileAttributes]::ReadOnly); Assert-Equal (Test-TransientFileSharing $nativeDenied $status) $false 'Read-only destination fails without busy-file retry' }
    finally { [IO.File]::SetAttributes($status,[IO.FileAttributes]::Normal) }
    $persistentReader=[IO.File]::Open($status,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $boundedFailure=$false; $watch=[Diagnostics.Stopwatch]::StartNew()
    try { Write-JsonAtomic $status @{state='must-not-replace'} } catch { $boundedFailure=$true }
    finally { $watch.Stop(); $persistentReader.Dispose() }
    Assert-Equal $boundedFailure $true 'Persistent lock fails instead of claiming success'
    Assert-Equal ($watch.ElapsedMilliseconds -ge 1800 -and $watch.ElapsedMilliseconds -lt 5000) $true 'Persistent lock respects retry bound'
    Assert-Equal ((Get-Content -Raw $status | ConvertFrom-Json).state) 'stress' 'Failed replacement preserves prior complete status'
    $failure=[Management.Automation.ErrorRecord]::new([UnauthorizedAccessException]::new('DO_NOT_LOG_SECRET'),'fixture',[Management.Automation.ErrorCategory]::PermissionDenied,$null)
    Assert-Equal (Test-TransientFileSharing $failure) $false 'Real permission denial is never retried'
    $diagnostic=Get-SafeFailureDiagnostic $failure
    Assert-Equal (($diagnostic | ConvertTo-Json) -match 'DO_NOT_LOG_SECRET') $false 'Diagnostics exclude exception text'
    Assert-Equal $diagnostic.exceptionType 'System.UnauthorizedAccessException' 'Diagnostics retain structural exception type'
    $lockPath=Join-Path $testDir 'lock'
    $first=[IO.File]::Open($lockPath,'OpenOrCreate','ReadWrite','None')
    $rejected=$false
    try { $second=[IO.File]::Open($lockPath,'OpenOrCreate','ReadWrite','None'); $second.Dispose() } catch [IO.IOException] { $rejected=$true }
    $first.Dispose()
    Assert-Equal $rejected $true 'Concurrent supervisor excluded'
    $next=[IO.File]::Open($lockPath,'OpenOrCreate','ReadWrite','None'); $next.Dispose()
    # Parse both production scripts without executing or registering them.
    foreach ($script in @('runner.ps1','install.ps1')) {
        $parseErrors=$null; $tokens=$null
        [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $script), [ref]$tokens,[ref]$parseErrors) | Out-Null
        Assert-Equal $parseErrors.Count 0 "Syntax $script"
    }
    Write-Output '37 runtime checks passed: fault/owner/pause/interruption latch, exit/publication/local-fallback/dirty-tree guards, atomic rename and concurrent-reader recovery, bounded persistent-lock failure, safe diagnostics, exclusive lock, lock recovery, scoped network configuration and script syntax.'
} finally {
    # Delete only the explicit test files in the verified unique test directory; never recursive cleanup.
    foreach ($file in @('status.json','lock','reader-ready')) { $path=Join-Path $testDir $file; if (Test-Path $path) { Remove-Item -LiteralPath $path } }
    [IO.Directory]::Delete($testDir)
}
