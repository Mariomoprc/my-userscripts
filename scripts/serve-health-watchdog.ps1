# serve-health-watchdog.ps1 - 观测模式（默认只日志不拉起）
# tray 为主守护，NSSM 已退役；watchdog 5min 观测 + 配置/DB 自检 + /config apiKey 校验
# 用法: pwsh -File serve-health-watchdog.ps1 [-EnableAutoFix]  # 加开关才允许 Start/Restart-Service
param([switch]$EnableAutoFix)

$ErrorActionPreference = "SilentlyContinue"
$healthUrl = "http://127.0.0.1:4096/global/health"
$configUrl = "http://127.0.0.1:4096/config"
$svc = "opencode-web"
$log = "C:\Users\pass\.config\opencode\health-watchdog.log"
$waitAfterRestart = 15
$waitBetweenRetries = 10
$maxRetries = 3
$configFile = "C:\Users\pass\.config\opencode\opencode.jsonc"
$configBak = "C:\Users\pass\.config\opencode\opencode.jsonc.bak-20260902"
$dbFile = "C:\Users\pass\.local\share\opencode\opencode.db"
$closeWaitThreshold = 25

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts - $msg" | Out-File -FilePath $log -Append -Encoding utf8
    # 日志轮转：>10MB 截尾保留末尾 8MB
    try {
        $fi = Get-Item $log -ErrorAction SilentlyContinue
        if ($fi -and $fi.Length -gt 10MB) {
            $tmp = "$log.tmp"
            Get-Content $log -Tail 8000 | Set-Content $tmp -Encoding utf8
            Move-Item $tmp $log -Force
            "$ts - log rotated (was $($fi.Length) bytes)" | Out-File -FilePath $log -Append -Encoding utf8
        }
    } catch {}
}

# 0. Config validation
function Test-Config {
    try {
        $out = & opencode debug config 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $out -match "autoupdate") { return $true }
    } catch {}
    return $false
}
function Test-DbIntegrity {
    try {
        $py = @"
import sqlite3
db = r"$dbFile"
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute("PRAGMA integrity_check")
r = cur.fetchone()
con.close()
print(r[0] if r else "error")
"@
        $res = $py | python3 2>&1 | Select-Object -First 1
        return ($res -match "ok")
    } catch { return $false }
}

if (-not (Test-Config)) {
    Write-Log "config invalid, rolling back to backup"
    if (Test-Path $configBak) {
        Copy-Item $configBak $configFile -Force
        Write-Log "config restored from backup"
    }
}
if (-not (Test-DbIntegrity)) {
    Write-Log "db integrity check failed, attempting repair"
    try {
        $py2 = @"
import sqlite3
db = r"$dbFile"
con = sqlite3.connect(db)
con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
con.execute("VACUUM")
con.close()
print("repaired")
"@
        $py2 | python3 2>&1 | ForEach-Object { Write-Log "db repair: $_" }
    } catch { Write-Log "db repair failed: $_" }
}

# 1. 读取密码：优先 HKCU\Environment（tray 同源），回退 User env，UTF8 编码
$pw = $null
try {
    $pw = (Get-ItemProperty "HKCU:\Environment" -ErrorAction SilentlyContinue).OPENCODE_SERVER_PASSWORD
} catch {}
if (-not $pw) { $pw = [Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD","User") }
if (-not $pw) {
    Write-Log "WARN: OPENCODE_SERVER_PASSWORD not set in HKCU\Environment"
    $pw = ""
}
$credB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("opencode:$pw"))

# 2. 服务状态观测（不再自动拉起，除非 -EnableAutoFix）
$svcObj = Get-Service -Name $svc -ErrorAction SilentlyContinue
if (-not $svcObj) {
    Write-Log "service '$svc' not installed (tray-managed, expected after 2026-09-02)"
} else {
    $svcStatus = $svcObj.Status.ToString()
    # 收集端口/PID信息用于关联
    $listen = Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    $listenPid = if ($listen) { $listen.OwningProcess } else { 0 }
    $procAlive = $false
    if ($listenPid) { $procAlive = [bool](Get-Process -Id $listenPid -ErrorAction SilentlyContinue) }
    $cw = (Get-NetTCPConnection -LocalPort 4096 -State CloseWait -ErrorAction SilentlyContinue | Measure-Object).Count

    if ($svcStatus -ne "Running") {
        # 区分：服务 Stopped 但端口健康（tray 在管） vs 真正僵尸/空闲
        $portOpen = [bool](Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue)
        if ($portOpen -and $procAlive) {
            # 托盘在管，服务 Stopped 属预期（退役后），仅观测不拉起
            if ($cw -gt $closeWaitThreshold) { Write-Log "observe: service $svcStatus but port 4096 LISTEN pid=$listenPid alive, $cw CLOSE_WAIT (> $closeWaitThreshold)" }
            # 不自动 Start-Service，避免与 tray 争用
            if ($EnableAutoFix) {
                Write-Log "observe+autofix: service $svcStatus, starting (EnableAutoFix)"
                Start-Service -Name $svc -ErrorAction SilentlyContinue
                Start-Sleep $waitAfterRestart
            }
        } else {
            # 真正无 LISTEN 或僵尸
            if ($listenPid -and -not $procAlive) {
                Write-Log "zombie detected: port 4096 held by dead PID $listenPid, skip start (reboot may be needed)"
            } elseif ($cw -gt $closeWaitThreshold) {
                Write-Log "warn: $cw CLOSE_WAIT on 4096 (possible SSE leak) service=$svcStatus"
            }
            if ($EnableAutoFix) {
                Write-Log "service status=$svcStatus, starting (EnableAutoFix)"
                Start-Service -Name $svc -ErrorAction SilentlyContinue
                Start-Sleep $waitAfterRestart
            } else {
                Write-Log "observe: service $svcStatus, portOpen=$portOpen pid=$listenPid alive=$procAlive (no autofix)"
            }
        }
    } else {
        # Running 时也检查 CLOSE_WAIT 阈值（提升至25，节流）
        if ($cw -gt $closeWaitThreshold) { Write-Log "warn: $cw CLOSE_WAIT on 4096 (possible SSE leak)" }
    }
}

# 3. 健康检查（显式 -Proxy $null 避免走 HTTP_PROXY，UTF8 Basic）
$healthy = $false
try {
    $r = Invoke-WebRequest -Uri $healthUrl -Headers @{Authorization="Basic $credB64"} -UseBasicParsing -TimeoutSec 10 -Proxy $null
    if ($r.StatusCode -eq 200) { $healthy = $true }
} catch {
    Write-Log "health check failed: $($_.Exception.Message)"
}

# 4. /config apiKey 校验（与 verify-serve-env 一致）
if ($healthy) {
    try {
        $rc = Invoke-WebRequest -Uri $configUrl -Headers @{Authorization="Basic $credB64"} -UseBasicParsing -TimeoutSec 10 -Proxy $null
        $cfg = $rc.Content | ConvertFrom-Json
        $apiKey = $cfg.provider."opencode-go-2".options.apiKey
        if (-not $apiKey) { Write-Log "warn: opencode-go-2 apiKey empty (env not injected? check tray InjectUserEnv)" }
        elseif ($apiKey -like "{env:*") { Write-Log "warn: opencode-go-2 apiKey not resolved: $apiKey" }
    } catch {
        Write-Log "config check failed: $($_.Exception.Message)"
    }
}

if ($healthy) {
    Write-Log "healthy"
    exit 0
}

# 5. 非健康分支：观测为主，仅 EnableAutoFix 才重启
try {
    $zCheck = Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($zCheck) {
        $zp = $zCheck.OwningProcess
        if (-not (Get-Process -Id $zp -ErrorAction SilentlyContinue)) {
            Write-Log "zombie detected before restart (dead PID $zp), skip restart"
            exit 0
        }
    }
} catch {}
if (-not $EnableAutoFix) {
    Write-Log "unhealthy but autofix disabled (tray will handle restart)"
    exit 0
}
Write-Log "unhealthy, restarting service (EnableAutoFix)"
Restart-Service -Name $svc -Force -ErrorAction SilentlyContinue
Start-Sleep $waitAfterRestart

for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep $waitBetweenRetries
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -Headers @{Authorization="Basic $credB64"} -UseBasicParsing -TimeoutSec 10 -Proxy $null
        if ($r.StatusCode -eq 200) {
            Write-Log "recovered after restart (attempt $i)"
            exit 0
        }
    } catch {}
    Write-Log "retry $i failed"
}
Write-Log "CRITICAL: service still unhealthy after $maxRetries retries"
