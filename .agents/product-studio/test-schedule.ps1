$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'runner.ps1') -LibraryOnly
$script:count=0
function Assert-Schedule($Actual,$Expected,[string]$Case) {
    if ($Actual -ne $Expected) { throw "$Case expected $Expected, got $Actual" }
    $script:count++
}
function Assert-ScheduleThrows([scriptblock]$Action,[string]$Case) {
    $threw=$false; try { & $Action | Out-Null } catch { $threw=$true }
    Assert-Schedule $threw $true $Case
}
function At([string]$Time) { return [DateTimeOffset]::Parse($Time,[Globalization.CultureInfo]::InvariantCulture) }
$schedule=New-StudioSchedule
$morning=At '2026-09-25T06:00:00Z' # 09:00 Bucharest summer time.
$evening=At '2026-09-25T14:00:00Z'
$ledger=New-StudioLedger $schedule (At '2026-09-25T00:00:00Z')
$before=Get-StudioSlotDecision $schedule $ledger (At '2026-09-25T05:59:59Z')
Assert-Schedule $before.eligible $false 'Before morning slot'
Assert-Schedule $before.nextEligibleAt '2026-09-25T06:00:00.0000000Z' 'Bucharest summer offset'
Assert-Schedule (Get-StudioSlotDecision $schedule $ledger $morning).slotKey '2026-09-25/09:00' 'Morning opens exactly at nine'
$reserved=Reserve-StudioSlot $schedule $ledger $morning '20260925T060000Z'
Assert-Schedule (Get-StudioSlotDecision $schedule $reserved $morning).eligible $false 'Reserved slot cannot repeat after launch failure or restart'
Assert-Schedule (Get-StudioSlotDecision $schedule $reserved $morning).dailyStarts 1 'Failed start still costs one daily start'
Assert-Schedule (Get-StudioSlotDecision $schedule $reserved $morning).nextEligibleAt '2026-09-25T14:00:00.0000000Z' 'Next slot after morning consumption'
Assert-ScheduleThrows { Reserve-StudioSlot $schedule $reserved $morning '20260925T060001Z' } 'Duplicate reservation rejected'
Assert-Schedule (Get-StudioSlotDecision $schedule $reserved $evening).eligible $true 'Evening remains eligible after one start'
$full=Reserve-StudioSlot $schedule $reserved $evening '20260925T140000Z'
$fullDecision=Get-StudioSlotDecision $schedule $full (At '2026-09-25T20:00:00Z')
Assert-Schedule $fullDecision.dailyStarts 2 'Two daily starts recorded'
Assert-Schedule $fullDecision.eligible $false 'Daily limit blocks further work'
Assert-Schedule $fullDecision.nextEligibleAt '2026-09-26T06:00:00.0000000Z' 'Next eligibility is tomorrow'
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='fault'}) $true $false $fullDecision) 'scheduled_wait' 'Explicit resume never bypasses daily cap'
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='paused'}) $true $false $before) 'scheduled_wait' 'Explicit resume never bypasses schedule'
$late=Get-StudioSlotDecision $schedule $ledger (At '2026-09-25T18:00:00Z')
Assert-Schedule $late.slotKey '2026-09-25/17:00' 'Wake chooses latest due slot'
Assert-Schedule ($late.skippedSlotKeys -join ',') '2026-09-25/09:00' 'Missed earlier slot is skipped'
$woke=Reserve-StudioSlot $schedule $ledger (At '2026-09-25T18:00:00Z') '20260925T180000Z'
Assert-Schedule (Get-StudioSlotDecision $schedule $woke (At '2026-09-25T18:30:00Z')).eligible $false 'Wake cannot cause catch-up burst'
Assert-Schedule (Get-StudioSlotDecision $schedule $woke (At '2026-09-25T21:01:00Z')).dailyStarts 0 'Budget rolls over at Bucharest midnight'
Assert-Schedule (Get-StudioSlotDecision $schedule $woke (At '2026-09-25T21:01:00Z')).eligible $false 'Yesterday evening never catches up after midnight'
$tomorrow=Reserve-StudioSlot $schedule $woke (At '2026-09-26T06:00:00Z') '20260926T060000Z'
Assert-ScheduleThrows { Get-StudioSlotDecision $schedule $tomorrow (At '2026-09-25T20:00:00Z') } 'Backward date cannot reset budget'
foreach ($case in @(
    @('2026-03-28T00:00:00Z','2026-03-28T07:00:00.0000000Z'),
    @('2026-03-29T00:00:00Z','2026-03-29T06:00:00.0000000Z'),
    @('2026-10-24T00:00:00Z','2026-10-24T06:00:00.0000000Z'),
    @('2026-10-25T00:00:00Z','2026-10-25T07:00:00.0000000Z')
)) {
    $now=At $case[0];$fresh=New-StudioLedger $schedule $now
    Assert-Schedule (Get-StudioSlotDecision $schedule $fresh $now).nextEligibleAt $case[1] 'Bucharest DST boundary'
}
Assert-ScheduleThrows { Get-StudioSlotDecision $schedule $null $morning } 'Missing ledger fails closed'
$duplicate=$reserved | ConvertTo-Json -Depth 8 | ConvertFrom-Json
$duplicate.slots=@($duplicate.slots)+@($duplicate.slots)
Assert-ScheduleThrows { Get-StudioSlotDecision $schedule $duplicate $morning } 'Duplicate ledger fails closed'
$badConfig=[pscustomobject]@{schedule=[pscustomobject]@{timeZoneId='UTC';dailyStartTimes=@('09:00','17:00');maxCyclesPerDay=200}}
Assert-ScheduleThrows { Get-StudioSchedule $badConfig } 'Unapproved schedule/limit rejected'
$due=Get-StudioSlotDecision $schedule $ledger $morning
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='fault'}) $false $true $due) 'hold' 'Owner response cannot bypass fault latch'
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='owner_blocked'}) $false $false $due) 'hold' 'Unchanged owner decisions never start a model'
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='owner_blocked'}) $false $true $due) 'run' 'Changed scoped response can consume a due slot'
Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='owner_blocked'}) $false $true $fullDecision) 'scheduled_wait' 'Changed response cannot bypass daily cap'
$old=[pscustomobject]@{state='running';startedAt='2026-09-15T00:51:53Z';heartbeatAt='2026-09-15T00:54:34Z';runId='20260915T005153Z';worktree='retained'}
$repaired=Repair-InterruptedStudioState $old $morning
Assert-Schedule $repaired.state 'fault' 'Interrupted running status becomes truthful fault'
Assert-Schedule $repaired.phase 'interrupted' 'Interruption distinct from new model work'
Assert-Schedule $repaired.heartbeatAt $old.heartbeatAt 'Repair never fabricates a heartbeat'
Assert-Schedule $repaired.worktree 'retained' 'Interrupted worktree reference is preserved'
Assert-Schedule $repaired.lastStartedAt $old.startedAt 'Repair preserves prior start time'
Assert-Schedule $old.state 'running' 'Repair leaves original input unchanged'
$successful=Repair-InterruptedStudioState ([pscustomobject]@{state='completed';completedAt='2026-09-24T14:00:00Z'}) $morning
Assert-Schedule $successful.lastSucceededAt '2026-09-24T14:00:00Z' 'Historical success time survives idle checks'
$snapshot=[ordered]@{state='paused'}
Set-StudioScheduleSnapshot $snapshot $fullDecision $schedule
Assert-Schedule $snapshot.dailyStarts 2 'Status reports consumed budget separately from activity'
Assert-Schedule $snapshot.state 'paused' 'Schedule snapshot does not clear pause latch'
$testDir=Join-Path ([IO.Path]::GetTempPath()) ('studio-schedule-test-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($testDir) | Out-Null
try {
    $path=Join-Path $testDir 'ledger.json'
    Write-JsonAtomic $path $reserved
    $reloaded=Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    Assert-Schedule (Get-StudioSlotDecision $schedule $reloaded $morning).eligible $false 'Restart cannot reclaim a persisted failed-start reservation'
    Assert-Schedule (Get-StudioSlotDecision $schedule $reloaded $morning).dailyStarts 1 'Persisted consumption survives JSON roundtrip'
    Write-JsonAtomic $path $full
    $reloaded=Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    Assert-Schedule (Get-StudioActivationDisposition ([pscustomobject]@{state='fault'}) $true $false (Get-StudioSlotDecision $schedule $reloaded $evening)) 'scheduled_wait' 'Explicit resume after process restart still respects persisted daily cap'
} finally {
    if (Test-Path -LiteralPath (Join-Path $testDir 'ledger.json')) { Remove-Item -LiteralPath (Join-Path $testDir 'ledger.json') }
    [IO.Directory]::Delete($testDir)
}
Write-Output "$script:count schedule checks passed: daily slots/cap, failed reservation, resume limits, no catch-up, midnight/DST, malformed ledger, owner responses and interruption truth."
