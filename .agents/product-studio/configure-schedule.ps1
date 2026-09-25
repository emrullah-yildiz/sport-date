# Upgrade private schedule/state only. Never starts a model, enables a task, or sends a message.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'runner.ps1') -LibraryOnly
$task=Get-ScheduledTask -TaskName 'KeepItUp Product Studio' -ErrorAction SilentlyContinue
if ($task -and $task.State -ne 'Disabled') { throw 'Disable the task and inspect any running cycle before configuring its schedule' }
$runtime=Join-Path $PSScriptRoot 'runtime'
$configPath=Join-Path $runtime 'config.json'
$statusPath=Join-Path $runtime 'status.json'
$ledgerPath=Join-Path $runtime 'schedule-ledger.json'
$lock=[IO.File]::Open((Join-Path $runtime 'cycle.lock'),'OpenOrCreate','ReadWrite','None')
try {
    $config=Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $previous=Get-Content -Raw -LiteralPath $statusPath | ConvertFrom-Json
    $now=[DateTimeOffset]::UtcNow
    $schedule=New-StudioSchedule
    if (Test-Path -LiteralPath $ledgerPath) { $ledger=Get-Content -Raw -LiteralPath $ledgerPath | ConvertFrom-Json }
    else {
        if ($config.schedule) { throw 'Configured schedule ledger is missing; restore its preserved history instead of resetting the limit' }
        $ledger=New-StudioLedger $schedule $now
        if ($previous.startedAt) {
            $zone=[TimeZoneInfo]::FindSystemTimeZoneById($schedule.timeZoneId)
            $lastDate=[TimeZoneInfo]::ConvertTime([DateTimeOffset]::Parse($previous.startedAt),$zone).ToString('yyyy-MM-dd')
            if ($lastDate -eq $ledger.lastObservedLocalDate) {
                throw 'Legacy runtime already started today; migrate its start history explicitly before enabling new slots'
            }
        }
    }
    $slot=Get-StudioSlotDecision $schedule $ledger $now
    $state=Repair-InterruptedStudioState $previous $now
    $state.checkedAt=$now.UtcDateTime.ToString('o')
    Set-StudioScheduleSnapshot $state $slot $schedule
    $state.scheduleConfiguredAt=$state.checkedAt
    $state.scheduleEnabled=$false
    $state.scheduleObservedAt=$state.checkedAt
    $config | Add-Member -NotePropertyName schedule -NotePropertyValue $schedule -Force
    # Preserve exact pre-upgrade bytes privately before changing any runtime state.
    $backup=Join-Path $runtime ('schedule-backup-'+$now.UtcDateTime.ToString('yyyyMMddTHHmmssfffffffZ'))
    [IO.Directory]::CreateDirectory($backup) | Out-Null
    foreach ($name in @('config.json','status.json','schedule-ledger.json')) {
        $path=Join-Path $runtime $name
        if (Test-Path -LiteralPath $path) { Copy-Item -LiteralPath $path -Destination (Join-Path $backup $name) }
    }
    if ($task) {
        Export-ScheduledTask -TaskName $task.TaskName | Set-Content -LiteralPath (Join-Path $backup 'task.xml') -Encoding UTF8
        $logon=@($task.Triggers | Where-Object {$_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'})
        $checks=New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)
        Set-ScheduledTask -TaskName $task.TaskName -Trigger (@($checks)+$logon) | Out-Null
        Disable-ScheduledTask -TaskName $task.TaskName | Out-Null
    }
    Write-JsonAtomic $ledgerPath $ledger
    Write-JsonAtomic $configPath $config
    Write-JsonAtomic $statusPath $state
    [pscustomobject]@{configured=$true;state=$state.state;taskEnabled=$false;modelStarted=$false;dailyLimit=$slot.dailyLimit;nextEligibleAt=$slot.nextEligibleAt} | ConvertTo-Json
} finally { $lock.Dispose() }
