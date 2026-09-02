# start-dev.ps1 - 启动本地开发服务器并打开浏览器
# 用法: .\start-dev.ps1 [-ScriptName "script.user.js"] [-Port 8080]

param(
    [string]$ScriptName = "discord-responsive.user.js",
    [int]$Port = 8080
)

# 检查脚本文件是否存在
$scriptPath = Join-Path $PSScriptRoot $ScriptName
if (-not (Test-Path $scriptPath)) {
    Write-Host "错误: 脚本文件 '$ScriptName' 不存在于 $PSScriptRoot" -ForegroundColor Red
    Write-Host "可用脚本文件:" -ForegroundColor Yellow
    Get-ChildItem -Path $PSScriptRoot -Filter "*.user.js" | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

# 启动 http-server（后台运行）
Write-Host "启动本地服务器 (端口 $Port)..." -ForegroundColor Green
$serverArgs = "-c-1 -p $Port"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx http-server $serverArgs" -WindowStyle Minimized

# 等待服务器启动
Write-Host "等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 构建 URL
$url = "http://localhost:$Port/$ScriptName"
Write-Host "打开浏览器访问: $url" -ForegroundColor Cyan

# 打开浏览器
Start-Process $url

Write-Host "服务器已在后台运行。" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止服务器。" -ForegroundColor Yellow
Write-Host "按任意键关闭此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")