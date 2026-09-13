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
    Write-Output '24 runtime checks passed: fault/owner/pause/interruption latch, exit/publication/local-fallback/dirty-tree guards, atomic status, exclusive lock, lock recovery, scoped network configuration and script syntax.'
} finally {
    # Delete only the explicit test files in the verified unique test directory; never recursive cleanup.
    foreach ($file in @('status.json','lock')) { $path=Join-Path $testDir $file; if (Test-Path $path) { Remove-Item -LiteralPath $path } }
    [IO.Directory]::Delete($testDir)
}
