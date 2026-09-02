# Checker Plus 翻译 429 一键自检与切节点指引 (Build 产物)
# 关联: LRN-20260902-001, ProxyEnable=1, 192.168.3.100:7893, translate.googleapis.com -> ProxyGFWlist -> 🚀 节点选择

param(
  [string]$Proxy = "http://192.168.3.100:7893",
  [int]$TimeoutSec = 10
)

function Test-Translate {
  param($url)
  $tmp = "$env:TEMP\gtrans_fix.txt"
  $null = Remove-Item $tmp -ErrorAction SilentlyContinue
  $out = curl.exe -x $Proxy -m $TimeoutSec -s -D - $url -o $tmp 2>&1
  $headers = $out | Out-String
  $body = ""
  if (Test-Path $tmp) { $body = (Get-Content $tmp -Raw -ErrorAction SilentlyContinue) }
  # 判断
  $is429 = $headers -match "429"
  $isSorry = $body -match "Sorry|automated queries"
  $isOk = ($headers -match "200") -and ($body -match '\[\[\["') -and -not $is429 -and -not $isSorry
  return @{ Headers=$headers; Body=$body; Is429=$is429; IsSorry=$isSorry; IsOk=$isOk }
}

Write-Host "=== Checker Plus 翻译修复 - 谷歌分组切冷门节点 ===" -ForegroundColor Cyan
Write-Host "当前系统代理: $Proxy (WinINET ProxyEnable=1 已验证)" -ForegroundColor Gray
Write-Host "命中规则: translate.googleapis.com -> ProxyGFWlist -> 🚀 节点选择 -> 🚀 手动切换" -ForegroundColor Gray
Write-Host ""

# 1. 当前节点测活
$url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=hello"
Write-Host "[1/3] 测试当前节点..." -ForegroundColor Yellow
$r = Test-Translate $url
if ($r.IsOk) {
  Write-Host "✅ 当前节点可用! Body: $($r.Body.Substring(0,[Math]::Min(80,$r.Body.Length)))" -ForegroundColor Green
  Write-Host "→ 无需切节点，直接重启 Edge 复测 Checker 弹窗翻译即可" -ForegroundColor Green
  exit 0
} elseif ($r.Is429 -or $r.IsSorry) {
  Write-Host "❌ 当前节点被限频 (429/Sorry)" -ForegroundColor Red
  Write-Host $r.Headers.Split("`n") | Select-Object -First 6
} else {
  Write-Host "⚠️ 未知响应，Headers:" -ForegroundColor Yellow
  Write-Host $r.Headers.Split("`n") | Select-Object -First 8
}

Write-Host ""
Write-Host "[2/3] 请手动切节点指引" -ForegroundColor Yellow
Write-Host " 1) 浏览器打开 http://192.168.3.100:9090/ui (或 OpenClash 面板)" -ForegroundColor White
Write-Host " 2) 找到 '🚀 节点选择' -> 先切到 '🚀 手动切换' (固定, 避免 ♻️ 自动选择跳回热门)" -ForegroundColor White
Write-Host " 3) 在 '🚀 手动切换' 下依次尝试冷门节点，优先级: 🇸🇬狮城 > 🇰🇷韩国 > 🇨🇳台湾 > 🇯🇵日本 (避开 🇭🇰香港/🇺🇲美国热门池)" -ForegroundColor White
Write-Host " 4) 每切一次，切回本窗口按回车重测" -ForegroundColor White
Write-Host ""
Write-Host "按回车开始轮询测试 (切节点后回车)，Ctrl+C 退出..." -ForegroundColor Cyan
Read-Host

$count = 0
while ($true) {
  $count++
  Write-Host "`n--- 第 $count 次测试 $(Get-Date -Format HH:mm:ss) ---" -ForegroundColor Gray
  $r = Test-Translate $url
  if ($r.IsOk) {
    Write-Host "✅ 命中可用节点! Body: $($r.Body.Substring(0,[Math]::Min(100,$r.Body.Length)))" -ForegroundColor Green
    Write-Host "→ 保持当前节点，重启 Edge 后复测 Checker Plus 翻译 (F12 Network 过滤 translate 应 200)" -ForegroundColor Green
    break
  } elseif ($r.Is429) {
    Write-Host "❌ 仍 429 限频，继续换下一节点后回车" -ForegroundColor Red
  } elseif ($r.IsSorry) {
    Write-Host "❌ Sorry 反爬，换节点" -ForegroundColor Red
  } else {
    Write-Host "⚠️ 非预期响应" -ForegroundColor Yellow
    Write-Host $r.Headers.Split("`n") | Select-Object -First 6
  }
  Write-Host "切好下一节点后按回车重测..." -ForegroundColor Cyan
  Read-Host
}

Write-Host ""
Write-Host "[3/3] 固化建议" -ForegroundColor Yellow
Write-Host "- 翻译期间保持 '🚀 手动切换' 固定，别切回 '♻️ 自动选择' (自动测速会跳回限频节点)" -ForegroundColor White
Write-Host "- 若所有手动节点均 429，备选: B档改 translate.googleapis.cn 或自建 Worker (需改扩展 manifest)" -ForegroundColor White
