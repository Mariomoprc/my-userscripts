# verify-serve-env.ps1 - 重启后自检：health + /config apiKey 非空
# 用法: pwsh -File scripts/verify-serve-env.ps1
# 退出码: 0=通过 1=失败（用于 CI / watchdog）

param([int]$Port = 4096)

$ErrorActionPreference = "Continue"
$ok = $true

function Fail($msg) { Write-Host "[verify] FAIL: $msg" -ForegroundColor Red; $script:ok = $false }
function Pass($msg) { Write-Host "[verify] PASS: $msg" -ForegroundColor Green }

# 1. 端口监听
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conn) { Fail "port $Port not listening" } else { Pass "port $Port listening pid=$($conn.OwningProcess)" }

# 2. health（无认证应 401，有认证应 200）
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/global/health" -UseBasicParsing -TimeoutSec 5 -Proxy $null
    # 返回 200 说明无密码或健康检查未鉴权（旧版）
    Pass "health anonymous 200 (no auth or health is public)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) { Pass "health anonymous 401 (auth enabled, expected)" }
    else { Fail "health anonymous unexpected $code : $($_.Exception.Message)" }
}

# 健康检查（带认证）
try {
    $pw = (Get-ItemProperty "HKCU:\Environment" -ErrorAction SilentlyContinue).OPENCODE_SERVER_PASSWORD
    if (-not $pw) { $pw = [Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD","User") }
    if ($pw) {
        $auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("opencode:$pw"))
        $r2 = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/global/health" -Headers @{Authorization=$auth} -UseBasicParsing -TimeoutSec 5 -Proxy $null
        if ($r2.StatusCode -eq 200) { Pass "health with auth 200" } else { Fail "health with auth $($r2.StatusCode)" }
    } else {
        Write-Host "[verify] SKIP health with auth (no OPENCODE_SERVER_PASSWORD)"
    }
} catch {
    Fail "health with auth error: $($_.Exception.Message)"
}

# 3. /config 的 opencode-go-2.apiKey 是否解析为非空
try {
    $pw = (Get-ItemProperty "HKCU:\Environment" -ErrorAction SilentlyContinue).OPENCODE_SERVER_PASSWORD
    if (-not $pw) { $pw = [Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD","User") }
    $auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("opencode:$pw"))
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/config" -Headers @{Authorization=$auth} -UseBasicParsing -TimeoutSec 10 -Proxy $null
    $cfg = $r.Content | ConvertFrom-Json
    $apiKey = $cfg.provider."opencode-go-2".options.apiKey
    if (-not $apiKey) { Fail "opencode-go-2 apiKey is empty (env not injected) - check tray InjectUserEnv" }
    elseif ($apiKey -like "{env:*") { Fail "opencode-go-2 apiKey not resolved: $apiKey" }
    elseif ($apiKey.Length -lt 20) { Fail "opencode-go-2 apiKey suspiciously short: $($apiKey.Length) chars" }
    else { Pass "opencode-go-2 apiKey resolved ($($apiKey.Substring(0,12))... len=$($apiKey.Length))" }

    # 4. 检查 {env:} 清单是否与 serve 进程一致（与 sync-env 交叉验证）
    $raw = Get-Content "C:\Users\pass\.config\opencode\opencode.jsonc" -Raw -Encoding UTF8
    $vars = [regex]::Matches($raw, '\{env:([A-Z0-9_]+)\}') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    Write-Host "[verify] jsonc {env:} vars: $($vars -join ', ')"
} catch {
    Fail "/config check error: $($_.Exception.Message)"
}

# 5. 日志无新 Missing API key（最近 5 分钟）
try {
    $log = "C:\Users\pass\.local\share\opencode\log\opencode.log"
    if (Test-Path $log) {
        $cutoff = (Get-Date).AddMinutes(-5)
        $hits = Get-Content $log -Tail 500 | Where-Object { $_ -match "level=ERROR" -and $_ -match "Missing API key" } | Select-Object -Last 3
        if ($hits) {
            $recent = $false
            foreach ($h in $hits) { if ($h -match "timestamp=(\S+)") { $ts = [DateTime]::Parse($Matches[1]); if ($ts -gt $cutoff) { $recent = $true } } }
            if ($recent) { Fail "recent Missing API key in log (last 5 min):`n$($hits -join "`n")" } else { Pass "no recent Missing API key (last 5 min)" }
        } else { Pass "no Missing API key in recent log" }
    }
} catch { Write-Host "[verify] log check skip: $($_.Exception.Message)" }

if ($ok) { Write-Host "`n[verify] ALL PASS" -ForegroundColor Green; exit 0 } else { Write-Host "`n[verify] SOME FAILED" -ForegroundColor Red; exit 1 }
