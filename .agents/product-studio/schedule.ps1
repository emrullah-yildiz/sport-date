# Pure scheduling rules. The caller holds cycle.lock while reading/reserving the ledger.
function Get-StudioSchedule($Config) {
    $schedule=$Config.schedule
    if (-not $schedule -or $schedule.timeZoneId -ne 'GTB Standard Time' -or
        (@($schedule.dailyStartTimes) -join ',') -ne '09:00,17:00' -or $schedule.maxCyclesPerDay -ne 2) {
        throw 'Missing or unsupported studio schedule; configure the approved two daily slots'
    }
    $null=[TimeZoneInfo]::FindSystemTimeZoneById($schedule.timeZoneId)
    return $schedule
}

function New-StudioSchedule {
    return [pscustomobject]@{timeZoneId='GTB Standard Time';dailyStartTimes=@('09:00','17:00');maxCyclesPerDay=2}
}

function New-StudioLedger($Schedule, [DateTimeOffset]$Now) {
    $zone=[TimeZoneInfo]::FindSystemTimeZoneById($Schedule.timeZoneId)
    return [pscustomobject]@{version=1;timeZoneId=$Schedule.timeZoneId;lastObservedLocalDate=[TimeZoneInfo]::ConvertTime($Now,$zone).ToString('yyyy-MM-dd');slots=@()}
}

function Get-StudioSlotUtc([string]$Date, [string]$Time, $Zone) {
    $local=[DateTime]::SpecifyKind([DateTime]::ParseExact(($Date+' '+$Time),'yyyy-MM-dd HH:mm',[Globalization.CultureInfo]::InvariantCulture),[DateTimeKind]::Unspecified)
    return [TimeZoneInfo]::ConvertTimeToUtc($local,$Zone)
}

function Get-StudioSlotDecision($Schedule, $Ledger, [DateTimeOffset]$Now) {
    $null=Get-StudioSchedule ([pscustomobject]@{schedule=$Schedule})
    $zone=[TimeZoneInfo]::FindSystemTimeZoneById($Schedule.timeZoneId)
    $local=[TimeZoneInfo]::ConvertTime($Now,$zone)
    $date=$local.ToString('yyyy-MM-dd')
    if (-not $Ledger -or $Ledger.version -ne 1 -or $Ledger.timeZoneId -ne $Schedule.timeZoneId -or
        $null -eq $Ledger.slots -or $Ledger.lastObservedLocalDate -notmatch '^\d{4}-\d{2}-\d{2}$' -or $date -lt $Ledger.lastObservedLocalDate) {
        throw 'Invalid schedule ledger or backward local-date change; inspect before resuming'
    }
    $null=[DateTime]::ParseExact($Ledger.lastObservedLocalDate,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture)
    $seen=@{}
    foreach ($slot in @($Ledger.slots)) {
        if ($slot.key -notmatch '^\d{4}-\d{2}-\d{2}/(09:00|17:00)$' -or $slot.state -notin @('reserved','skipped') -or $seen.ContainsKey($slot.key)) {
            throw 'Malformed or duplicate schedule slot'
        }
        $slotDate=$slot.key.Substring(0,10)
        $null=[DateTime]::ParseExact($slotDate,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture)
        if ($slotDate -gt $Ledger.lastObservedLocalDate) { throw 'Schedule ledger contains an unexplained future slot' }
        if ($slot.state -eq 'reserved' -and ($slot.runId -notmatch '^\d{8}T\d{6}Z$' -or -not $slot.reservedAt)) { throw 'Incomplete slot reservation' }
        if ($slot.state -eq 'reserved') { $null=[DateTimeOffset]::Parse($slot.reservedAt,[Globalization.CultureInfo]::InvariantCulture) }
        $seen[$slot.key]=$slot.state
    }
    $dailyStarts=@($Ledger.slots | Where-Object {$_.key.StartsWith($date+'/') -and $_.state -eq 'reserved'}).Count
    $due=@($Schedule.dailyStartTimes | Where-Object {(Get-StudioSlotUtc $date $_ $zone) -le $Now.UtcDateTime})
    $latest=if ($due.Count) { $date+'/'+$due[-1] } else { $null }
    $eligible=$latest -and -not $seen.ContainsKey($latest) -and $dailyStarts -lt $Schedule.maxCyclesPerDay
    $next=$null
    if ($eligible) { $next=(Get-StudioSlotUtc $date $due[-1] $zone).ToString('o') }
    else {
        foreach ($time in $Schedule.dailyStartTimes) {
            $at=Get-StudioSlotUtc $date $time $zone
            if ($dailyStarts -lt $Schedule.maxCyclesPerDay -and $at -gt $Now.UtcDateTime -and -not $seen.ContainsKey($date+'/'+$time)) { $next=$at.ToString('o'); break }
        }
        if (-not $next) { $next=(Get-StudioSlotUtc $local.AddDays(1).ToString('yyyy-MM-dd') $Schedule.dailyStartTimes[0] $zone).ToString('o') }
    }
    $skipped=@($due | ForEach-Object {$date+'/'+$_} | Where-Object {$_ -ne $latest -and -not $seen.ContainsKey($_)})
    return [pscustomobject]@{eligible=[bool]$eligible;slotKey=$(if($eligible){$latest}else{$null});localDate=$date;dailyStarts=$dailyStarts;dailyLimit=$Schedule.maxCyclesPerDay;nextEligibleAt=$next;skippedSlotKeys=$skipped}
}

function Reserve-StudioSlot($Schedule, $Ledger, [DateTimeOffset]$Now, [string]$RunId) {
    $decision=Get-StudioSlotDecision $Schedule $Ledger $Now
    if (-not $decision.eligible -or $RunId -notmatch '^\d{8}T\d{6}Z$') { throw 'No eligible model-start slot' }
    $slots=@($Ledger.slots)
    foreach ($key in $decision.skippedSlotKeys) { $slots += [pscustomobject]@{key=$key;state='skipped'} }
    $slots += [pscustomobject]@{key=$decision.slotKey;state='reserved';runId=$RunId;reservedAt=$Now.UtcDateTime.ToString('o')}
    return [pscustomobject]@{version=1;timeZoneId=$Schedule.timeZoneId;lastObservedLocalDate=$decision.localDate;slots=$slots}
}

function Get-StudioActivationDisposition($Previous, [bool]$ResumeRequested, [bool]$OwnerResponse, $Slot) {
    $ownerWake=$Previous -and $Previous.state -eq 'owner_blocked' -and $OwnerResponse
    if ((Get-CycleDisposition $Previous ($ResumeRequested -or $ownerWake)) -eq 'hold') { return 'hold' }
    if (-not $Slot.eligible) { return 'scheduled_wait' }
    return 'run'
}

function ConvertTo-StudioState($Previous) {
    $copy=[ordered]@{}
    if ($Previous) { foreach ($property in $Previous.PSObject.Properties) { $copy[$property.Name]=$property.Value } }
    return $copy
}

function Repair-InterruptedStudioState($Previous, [DateTimeOffset]$Now) {
    $state=ConvertTo-StudioState $Previous
    # Only call after acquiring cycle.lock. Even a recent heartbeat with no lock owner
    # is an interrupted supervisor, never permission to start a replacement child.
    if ($state.state -eq 'running') {
        $state.state='fault'; $state.phase='interrupted'; $state.lastFailedAt=$Now.UtcDateTime.ToString('o')
        $state.failedAt=$state.lastFailedAt; $state.interruptedAt=$state.lastFailedAt
        $state.note='Previous supervisor no longer owns the cycle lock; unfinished work retained. Inspect possible child processes and worktree before explicit resume.'
    }
    if ($state.startedAt -and -not $state.lastStartedAt) { $state.lastStartedAt=$state.startedAt }
    if ($Previous -and $Previous.state -in @('completed','owner_blocked') -and $Previous.completedAt -and -not $state.lastSucceededAt) { $state.lastSucceededAt=$Previous.completedAt }
    if ($state.failedAt -and -not $state.lastFailedAt) { $state.lastFailedAt=$state.failedAt }
    return $state
}

function Set-StudioScheduleSnapshot($State, $Slot, $Schedule) {
    $State.scheduleTimeZone=$Schedule.timeZoneId
    $State.scheduleLocalDate=$Slot.localDate
    $State.dailyStarts=$Slot.dailyStarts
    $State.dailyLimit=$Slot.dailyLimit
    $State.nextEligibleAt=$Slot.nextEligibleAt
}
