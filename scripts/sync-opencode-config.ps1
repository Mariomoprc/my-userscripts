# OpenCode 配置同步脚本
# 在 pass 用户会话中执行

$ErrorActionPreference = "Stop"

# 配置路径
$笔记本配置 = "C:\Users\pass\.config\opencode\opencode.jsonc"
$临时JSON = "C:\Users\pass\.temp\opencode-sync.json"
$软路由配置 = "/etc/opencode/opencode.json"

Write-Host "=== OpenCode 配置同步 ===" -ForegroundColor Cyan

# 1. 检查笔记本配置是否存在
if (-not (Test-Path $笔记本配置)) {
    Write-Host "错误: 笔记本配置文件不存在: $笔记本配置" -ForegroundColor Red
    exit 1
}

# 2. 创建临时目录
$tempDir = "C:\Users\pass\.temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# 3. 读取 JSONC 并转换为 JSON
Write-Host "转换 JSONC 到 JSON..." -ForegroundColor Yellow
$内容 = Get-Content $笔记本配置 -Raw

# 移除单行注释 (// ...)
$内容 = $内容 -replace '//[^\n]*', ''

# 移除多行注释 (/* ... */)
$内容 = $内容 -replace '/\*[\s\S]*?\*/', ''

# 移除尾随逗号 (,} 或 ,])
$内容 = $内容 -replace ',\s*([}\]])', '$1'

try {
    $json = $内容 | ConvertFrom-Json
    $json | ConvertTo-Json -Depth 20 | Set-Content $临时JSON -Encoding UTF8
    Write-Host "JSON 转换成功: $临时JSON" -ForegroundColor Green
} catch {
    Write-Host "错误: JSON 解析失败 - $_" -ForegroundColor Red
    exit 1
}

# 4. 显示差异预览
Write-Host "`n=== 配置差异预览 ===" -ForegroundColor Cyan
Write-Host "笔记本配置: $笔记本配置"
Write-Host "临时 JSON: $临时JSON"

# 5. 同步到软路由
Write-Host "`n同步到软路由..." -ForegroundColor Yellow
try {
    # 使用 scp 复制配置
    scp -r $临时JSON "root@192.168.3.100:${软路由配置}"
    Write-Host "配置已同步到软路由: 192.168.3.100:$软路由配置" -ForegroundColor Green
} catch {
    Write-Host "错误: SCP 同步失败 - $_" -ForegroundColor Red
    Write-Host "请手动执行: scp `"$临时JSON`" root@192.168.3.100:$软路由配置" -ForegroundColor Yellow
}

# 6. 重启软路由 opencode 容器
Write-Host "`n重启软路由 opencode 容器..." -ForegroundColor Yellow
try {
    ssh router "docker restart opencode"
    Write-Host "容器已重启" -ForegroundColor Green
} catch {
    Write-Host "错误: 重启失败 - $_" -ForegroundColor Red
    Write-Host "请手动执行: ssh router 'docker restart opencode'" -ForegroundColor Yellow
}

# 7. 验证配置
Write-Host "`n验证配置..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 检查健康状态
try {
    $health = curl.exe -s "http://192.168.3.100:4096/global/health"
    if ($health -match "OK|healthy|200") {
        Write-Host "软路由 opencode 健康状态: 正常" -ForegroundColor Green
    } else {
        Write-Host "软路由 opencode 健康状态: $health" -ForegroundColor Yellow
    }
} catch {
    Write-Host "警告: 无法获取健康状态 - $_" -ForegroundColor Yellow
}

# 8. 清理临时文件
Write-Host "`n清理临时文件..." -ForegroundColor Yellow
Remove-Item $临时JSON -Force -ErrorAction SilentlyContinue

Write-Host "`n=== 同步完成 ===" -ForegroundColor Cyan
Write-Host "笔记本配置已更新，软路由配置已同步" -ForegroundColor Green
Write-Host "如需验证，请访问: http://192.168.3.100:4096" -ForegroundColor Cyan
