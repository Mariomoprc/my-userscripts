$ErrorActionPreference="Stop"
$log="C:\Users\pass\.config\opencode\tool-output\replace-db.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
function L($m){ $t=Get-Date -Format "yyyy-MM-dd HH:mm:ss"; "$t $m" | Tee-Object -FilePath $log -Append | Write-Host }
L "=== replace-db start ==="
$db="$env:USERPROFILE\.local\share\opencode\opencode.db"
$new="$env:USERPROFILE\.local\share\opencode\opencode.compacted2.db"
$bak="$env:USERPROFILE\.local\share\opencode\opencode.db.pre-replace-$(Get-Date -Format yyyyMMdd-HHmmss)"
try{
  if(-not (Test-Path $new)){ throw "compacted2 not found $new" }
  & sqlite3 $new "PRAGMA integrity_check;" 2>&1 | ForEach-Object { L "integrity: $_" }
  L "stopping tray and serve..."
  Get-CimInstance Win32_Process | Where-Object { $_.Name -match "opencode" -and $_.Name -ne "opencode-tray.exe" } | ForEach-Object {
    try{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; L "killed $($_.ProcessId) $($_.Name)" }catch{ L "kill fail $($_.ProcessId) $_" }
  }
  Start-Sleep 2
  $tray=Get-Process opencode-tray -ErrorAction SilentlyContinue
  if($tray){ try{ Stop-Process -Id $tray.Id -Force; L "killed tray $($tray.Id)" }catch{}; Start-Sleep 1 }
  Get-NetTCPConnection -LocalPort 4096 -ErrorAction SilentlyContinue | ForEach-Object { L "port still $_" }
  Start-Sleep 2
  if(Test-Path $db){ Copy-Item $db $bak; L "backup to $bak $((Get-Item $bak).Length/1MB)MB" }
  Remove-Item "$db-wal","$db-shm" -Force -ErrorAction SilentlyContinue
  Remove-Item $db -Force -ErrorAction SilentlyContinue
  Move-Item $new $db -Force
  L "moved compacted -> db size $((Get-Item $db).Length/1MB)MB"
  & sqlite3 $db "PRAGMA integrity_check;" 2>&1 | ForEach-Object { L "post integrity: $_" }
  L "restarting tray task..."
  Start-ScheduledTask -TaskName "OpenCode 4096 Tray" -ErrorAction SilentlyContinue
  Start-Sleep 4
  Get-CimInstance Win32_Process | Where-Object { $_.Name -match "opencode" } | ForEach-Object { L "proc $($_.ProcessId) $($_.Name) parent $($_.ParentProcessId)" }
  $pw=[System.Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD","User")
  $b64=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("opencode:$pw"))
  try{ $r=Invoke-WebRequest -Uri http://127.0.0.1:4096/global/health -Headers @{Authorization="Basic $b64"} -UseBasicParsing -TimeoutSec 8; L "health $($r.StatusCode) $($r.Content.Substring(0,100))" }catch{ L "health err $_" }
  L "=== done ==="
}catch{ L "ERROR $_"; L $_.ScriptStackTrace; exit 1 }
