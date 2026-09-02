# sync-env-to-tray.ps1 - 以 opencode.jsonc 的 {env:VAR} 为唯一清单，同步 tray.cpp + serve.ps1 + serve-watchdog.ps1
# 用法: pwsh -File scripts/sync-env-to-tray.ps1 [-Check]
#   -Check  仅检查是否同步一致，不改文件（用于 CI / pre-commit）

param([switch]$Check)

$ErrorActionPreference = "Stop"
$root = "C:\Users\pass\.config\opencode"
$jsoncPath = Join-Path $root "opencode.jsonc"
$servePs1  = Join-Path $root "serve.ps1"
$watchdog  = Join-Path $root "scripts\serve-health-watchdog.ps1"
$watchdogLegacy = Join-Path $root "serve-watchdog.ps1"
$cppPath   = Join-Path $root "tools\opencode-tray\opencode-tray.cpp"

# 1. 解析 jsonc 的 {env:VAR}
$raw = Get-Content $jsoncPath -Raw -Encoding UTF8
$matches = [regex]::Matches($raw, '\{env:([A-Z0-9_]+)\}')
$vars = $matches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

# 排除 opencode 自身 env（非密钥代理类）
$exclude = @("OPENCODE_EXPERIMENTAL_EVENT_QUEUE_MAX", "OPENCODE_SNAPSHOT_DAYS")
$vars = $vars | Where-Object { $_ -notin $exclude }

# 额外必需变量（不在 jsonc {env:} 中，但 serve/tray 链路需要）
$extra = @("GITHUB_TOKEN", "DEEPSEEK_API_KEY", "PLAYWRIGHT_MCP_EXTENSION_TOKEN", "OPENCODE_SERVER_PASSWORD", "NO_PROXY")
foreach ($e in $extra) { if ($e -notin $vars) { $vars = @($vars) + @($e) | Sort-Object -Unique } }

Write-Host "[sync-env] vars from opencode.jsonc ($($vars.Count)): $($vars -join ', ')"

# 2. 检查 tray.cpp 的 USER_ENV_VARS[] 是否一致
$cpp = Get-Content $cppPath -Raw -Encoding UTF8
$cppBlock = [regex]::Match($cpp, 'USER_ENV_VARS\[\]\s*=\s*\{([^}]+)\}', [Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $cppBlock.Success) { Write-Error "USER_ENV_VARS block not found in $cppPath"; exit 1 }
$cppVars = [regex]::Matches($cppBlock.Groups[1].Value, 'L"([A-Z0-9_]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$cppDiff = Compare-Object $vars $cppVars | Out-String

# 3. 检查 serve.ps1 / serve-watchdog.ps1 的注入块
function Get-ScriptVars($path) {
    $t = Get-Content $path -Raw -Encoding UTF8
    [regex]::Matches($t, 'GetEnvironmentVariable\("([A-Z0-9_]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notin @("OPENCODE_EXPERIMENTAL_EVENT_QUEUE_MAX","OPENCODE_SNAPSHOT_DAYS","NODE_OPTIONS") } | Sort-Object -Unique
}
$serveVars = Get-ScriptVars $servePs1
# watchdog 观测模式：仅需 OPENCODE_SERVER_PASSWORD，允许子集（不强制全量同步）
$watchVars = @()
if (Test-Path $watchdog) { $watchVars = Get-ScriptVars $watchdog }
$serveDiff = Compare-Object $vars $serveVars | Out-String
# watchdog 仅校验是否包含必要键（HKCU 优先读取），缺其他键不算 MISMATCH
$watchMissing = @($vars | Where-Object { $_ -notin $watchVars -and $_ -eq "OPENCODE_SERVER_PASSWORD" })
$watchDiff = if ($watchMissing.Count -gt 0) { ($watchMissing | Out-String) } else { "" }

$allOk = (-not $cppDiff.Trim()) -and (-not $serveDiff.Trim()) -and (-not $watchDiff.Trim())

if ($Check) {
    if ($allOk) { Write-Host "[sync-env] OK - all 3 files in sync (watchdog observer subset)"; exit 0 }
    if ($cppDiff.Trim()) { Write-Host "[sync-env] MISMATCH tray.cpp:`n$cppDiff" }
    if ($serveDiff.Trim()) { Write-Host "[sync-env] MISMATCH serve.ps1:`n$serveDiff" }
    if ($watchDiff.Trim()) { Write-Host "[sync-env] MISMATCH serve-health-watchdog.ps1 (missing required OPENCODE_SERVER_PASSWORD):`n$watchDiff" }
    Write-Error "[sync-env] out of sync - run without -Check to fix"; exit 1
}

if ($allOk) { Write-Host "[sync-env] already in sync (watchdog observer), nothing to do"; exit 0 }

# 4. 同步 tray.cpp
if ($cppDiff.Trim()) {
    $newBlock = ($vars | ForEach-Object { "    L`"$_`"" }) -join ",`n"
    $newDecl = "static const wchar_t* USER_ENV_VARS[] = {`n$newBlock`n};"
    $cpp2 = [regex]::Replace($cpp, 'static const wchar_t\* USER_ENV_VARS\[\]\s*=\s*\{[^}]+\};', $newDecl, [Text.RegularExpressions.RegexOptions]::Singleline)
    Set-Content $cppPath $cpp2 -Encoding UTF8
    Write-Host "[sync-env] fixed $cppPath"
}

# 5. 同步 serve.ps1 / serve-watchdog.ps1 - 重建注入块
function Fix-Script($path) {
    $t = Get-Content $path -Raw -Encoding UTF8
    $inject = ($vars | ForEach-Object { "`$env:$_ = [Environment]::GetEnvironmentVariable(`"$_`", `"User`")" }) -join "`n"
    $inject += "`n`$env:NODE_OPTIONS = `"--max-old-space-size=4096`""
    # 替换连续的 $env:XXX = [Environment]::GetEnvironmentVariable(...) 块（保留 NODE_OPTIONS 之前的块）
    $pattern = '(\$env:[A-Z0-9_]+ = \[Environment\]::GetEnvironmentVariable\("[A-Z0-9_]+", "User"\)\r?\n)+\$env:NODE_OPTIONS = "--max-old-space-size=4096"'
    if ([regex]::IsMatch($t, $pattern)) {
        $t2 = [regex]::Replace($t, $pattern, $inject)
        Set-Content $path $t2 -Encoding UTF8
        Write-Host "[sync-env] fixed $path"
    } else {
        Write-Host "[sync-env] WARN pattern not matched in $path - manual fix needed"
    }
}
if ($serveDiff.Trim()) { Fix-Script $servePs1 }
# watchdog 观测模式：不强制注入全量 env，仅保证 HKCU 读取逻辑存在
if ($watchDiff.Trim()) {
    Write-Host "[sync-env] WARN watchdog missing OPENCODE_SERVER_PASSWORD read - manual check needed (observer mode allows subset)"
}

Write-Host "[sync-env] done"
