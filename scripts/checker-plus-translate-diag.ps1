# Checker Plus 翻译失败 A档诊断脚本 (PowerShell 5.1, UTF-8)
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File checker-plus-translate-diag.ps1

$proxy = "http://192.168.3.100:7893"
$urls = @(
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=hello",
  "https://translate.googleapis.cn/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=hello"
)

Write-Host "=== 1. 系统代理 ===" -ForegroundColor Cyan
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" | Select-Object ProxyEnable,ProxyServer | Format-List

Write-Host "=== 2. 走代理 curl 测试 ===" -ForegroundColor Cyan
foreach ($u in $urls) {
  Write-Host "`n--> $u" -ForegroundColor Yellow
  $tmp = "$env:TEMP\gtrans_test.txt"
  curl.exe -x $proxy -m 10 -s -D - $u -o $tmp 2>&1 | Select-Object -First 10
  $body = Get-Content $tmp -ErrorAction SilentlyContinue | Select-Object -First 3
  if ($body) { Write-Host "Body: $body" }
  # 429 = 共享节点被限频, Sorry页面 = 触发反爬
}

Write-Host "`n=== 3. 直连测试(不走代理,应失败或429) ===" -ForegroundColor Cyan
curl.exe -m 8 -s -D - "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=hello" --noproxy "*" -o "$env:TEMP\gtrans_direct.txt" 2>&1 | Select-Object -First 10

Write-Host "`n=== 4. 结论 ===" -ForegroundColor Green
Write-Host "若走代理返回 '200 Connection established' 后跟 '429' 或 'Sorry...automated queries'"
Write-Host "-> 证明代理隧道正常, 但该代理节点IP已被Google限频(机场共享IP通病)"
Write-Host "-> A档解法: 在 Clash 切换节点(选冷门国家/低倍率节点)后重跑本脚本, 直到返回 200 且 Body 为 [[[""你好""]]] 格式"
Write-Host "-> 若所有节点均429 -> 走 B/C档: 改 translate.googleapis.cn 或自建 Worker"
