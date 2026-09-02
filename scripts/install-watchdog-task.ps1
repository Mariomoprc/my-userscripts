# install-watchdog-task.ps1
# Register OpenCode Health Watchdog as scheduled task (every 5 minutes) - v8 user-session stable (keeps SSH) - 3min needs admin, keep 5min for limited user
$ErrorActionPreference = "Stop"

$taskName = "OpenCode Health Watchdog"
$script = "C:\Users\pass\.config\opencode\scripts\serve-health-watchdog.ps1"
$exe = "powershell.exe"
$args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$action = New-ScheduledTaskAction -Execute $exe -Argument $args
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 9999)
$principal = New-ScheduledTaskPrincipal -UserId "pass" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Output "Task registered: $taskName"
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
