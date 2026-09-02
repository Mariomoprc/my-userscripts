# DEPRECATED 2026-09-02: opencode 4096 已切单守护（tray 主管），NSSM 退役仅回滚用
# 新架构：opencode-tray.exe 15s WatchThread 自愈 + watchdog 观测模式（不自动拉起）
# 此脚本保留用于回滚：需提权执行，装回服务后需同步改 watchdog 为 EnableAutoFix
# Reinstall opencode serve NSSM service as LocalSystem with explicit env injection
# Fix: CloudAP (Microsoft account) cannot be used as service logon (error 1069)
# Run with elevation.

$ErrorActionPreference = "Stop"
$LogFile = "C:\Users\pass\AppData\Local\Temp\opencode\nssm-install2.log"
function Log([string]$m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -FilePath $LogFile -Append -Encoding utf8 }

Log "=== nssm reinstall (LocalSystem) start ==="

$nssm = "C:\Users\pass\AppData\Local\Microsoft\WinGet\Links\nssm.exe"
$ocExe = "C:\Users\pass\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe"
$svc = "opencode-web"
$workDir = "C:\Users\pass\.config\opencode"
$outLog = "C:\Users\pass\AppData\Local\Temp\opencode\opencode-web.out.log"
$errLog = "C:\Users\pass\AppData\Local\Temp\opencode\opencode-web.err.log"

# remove old service
$existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
if ($existing) {
    & $nssm stop $svc 2>$null | Out-Null
    & $nssm remove $svc confirm 2>$null | Out-Null
    Start-Sleep 2
    Log "old service removed"
}

& $nssm install $svc $ocExe
& $nssm set $svc AppParameters "serve --hostname 0.0.0.0 --port 4096"
& $nssm set $svc AppDirectory $workDir
& $nssm set $svc AppStdout $outLog
& $nssm set $svc AppStderr $errLog
& $nssm set $svc AppRotateFiles 1
& $nssm set $svc AppRotateBytes 10485760
& $nssm set $svc AppExit Default Restart
& $nssm set $svc AppThrottle 3000
& $nssm set $svc AppRestartDelay 3000
& $nssm set $svc Start SERVICE_AUTO_START
Log "base config done"

# --- 优雅关闭: stop 时发 Ctrl+Break 给 serve,触发 graceful shutdown ---
# (Default 是 PostMessage(WM_CLOSE),serve 收不到,直接 TerminateProcess,导致 socket 残留)
& $nssm set $svc AppStopMethodConsole 1
& $nssm set $svc AppStopMethodSkip 0
# 给 serve 更多时间优雅退出(关闭 SSE 连接),避免被强制杀导致僵尸 socket
& $nssm set $svc AppStopMethodDelay 10000
Log "graceful stop configured (AppStopMethodConsole=1, delay=10s)"

# run as LocalSystem (avoids CloudAP logon issue), inject user env explicitly
& $nssm set $svc ObjectName LocalSystem
Log "ObjectName set to LocalSystem"

# build env injection string (KEY=value;KEY2=value2...)
$parts = @()
$parts += "USERPROFILE=C:\Users\pass"
$parts += "HOME=C:\Users\pass"
$parts += "USERNAME=pass"
$parts += "APPDATA=C:\Users\pass\AppData\Roaming"
$parts += "LOCALAPPDATA=C:\Users\pass\AppData\Local"

$pw = [Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD", "User")
if ($pw) {
    $parts += "OPENCODE_SERVER_PASSWORD=$pw"
    Log "OPENCODE_SERVER_PASSWORD injected"
} else {
    Log "WARN: OPENCODE_SERVER_PASSWORD missing"
}
foreach ($n in @("GITHUB_PERSONAL_ACCESS_TOKEN","GITHUB_TOKEN")) {
    $v = [Environment]::GetEnvironmentVariable($n, "User")
    if ($v) { $parts += "$n=$v"; Log "$n injected" }
}
foreach ($n in @("EXA_API_KEY","TAVILY_API_KEY","CONTEXT7_API_KEY","FIRECRAWL_API_KEY")) {
    $v = [Environment]::GetEnvironmentVariable($n, "User")
    if ($v) { $parts += "$n=$v"; Log "$n injected" }
}

$envStr = $parts -join ";"
& $nssm set $svc AppEnvironmentExtra $envStr
Log "AppEnvironmentExtra set"

# --- 给交互用户(IU)加 START/STOP 权限,让托盘(未提权)能控制服务 ---
# 默认 NSSM 服务 DACL 只给 IU 查询权限,托盘 OpenServiceW 请求 START/STOP 被拒(err=5)
# 重装服务会重置 DACL,故每次安装后重设
$svcSddl = "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)"
& sc.exe sdset $svc $svcSddl | Out-Null
Log "service DACL updated (IU granted START/STOP)"

& $nssm dump $svc | Out-File -FilePath $LogFile -Append -Encoding utf8

Log "=== nssm reinstall done ==="
