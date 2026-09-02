$ErrorActionPreference='Stop'
$log="$env:TEMP\opencode\replace-db-$(Get-Date -Format yyyyMMdd-HHmmss).log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
function L($m){ $m | Tee-Object -FilePath $log -Append | Write-Host }
L "=== replace-db-compacted start $(Get-Date) ==="
$db="$env:USERPROFILE\.local\share\opencode\opencode.db"
$new="$env:USERPROFILE\.local\share\opencode\opencode.compacted.db"
$bak="$env:USERPROFILE\.local\share\opencode\opencode.db.pre-compact-$(Get-Date -Format yyyyMMdd-HHmmss)"
try {
  if(!(Test-Path $new)){ throw "compacted not found: $new" }
  L "compacted size $((Get-Item $new).Length) vs orig $((Get-Item $db).Length)"
  & sqlite3 $new "PRAGMA integrity_check;" 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  if($LASTEXITCODE -ne 0){ throw "integrity failed" }
  L "stopping tray/serve gently..."
  try { Get-NetTCPConnection -LocalPort 4096 -ErrorAction SilentlyContinue | ForEach-Object { try{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; L "stopped $($_.OwningProcess)" }catch{} } } catch {}
  Start-Sleep 2
  # also stop any opencode TUI that holds db (except this script's parent)
  $myPid=$PID
  Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'opencode.exe' } | ForEach-Object {
    if($_.ProcessId -ne $myPid){ try{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; L "killed opencode $($_.ProcessId)" }catch{} }
  }
  Start-Sleep 2
  if(Test-Path "$db-wal"){ Remove-Item "$db-wal" -Force -ErrorAction SilentlyContinue; L "removed wal" }
  if(Test-Path "$db-shm"){ Remove-Item "$db-shm" -Force -ErrorAction SilentlyContinue; L "removed shm" }
  Copy-Item $db $bak -Force; L "backup -> $bak"
  Move-Item $new $db -Force; L "moved compacted -> db"
  L "new db size $((Get-Item $db).Length) MB=$([math]::Round((Get-Item $db).Length/1MB,1))"
  & sqlite3 $db "PRAGMA integrity_check;" 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  L "restarting tray via scheduled task..."
  try { Start-ScheduledTask -TaskName "OpenCode 4096 Tray" -ErrorAction SilentlyContinue; L "scheduled task started" } catch { L "task start failed $_" }
  # fallback: start serve directly if tray not running
  Start-Sleep 3
  $c=Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue
  if(!$c){
    L "port not listening, starting serve..."
    $trayPid=(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'opencode-tray.exe' } | Select -First 1).ProcessId
    if($trayPid){ L "tray exists $trayPid, it should start serve" } else {
      Start-Process -FilePath "C:\Users\pass\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe" -ArgumentList "serve --hostname 0.0.0.0 --port 4096" -WindowStyle Hidden
      L "started serve standalone"
    }
  } else { L "port listening OwningProcess $($c.OwningProcess)" }
  L "=== done ==="
} catch { L "ERROR $_"; exit 1 }
