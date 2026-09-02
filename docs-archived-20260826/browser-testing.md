# 浏览器测试流程

测试网页/脚本效果时，**不能用 Playwright 无头浏览器**（无登录状态、无扩展），使用以下方法：

## 方法一：PowerShell 截屏（推荐）
```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(1400, 900)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, [System.Drawing.Size]::new(1400, 900))
$bitmap.Save("C:\Users\pass\AppData\Local\Temp\opencode\screenshot.png")
$graphics.Dispose()
$bitmap.Dispose()
```

## 方法二：用户截图
直接让用户截图反馈，比自动化更可靠。

## 方法三：CDP 远程调试（需手动开启）
```powershell
# 启动 Edge 带调试端口
Start-Process "msedge" "--remote-debugging-port=9222"
# 然后用 Playwright 连接
```

**禁止**：
- 用 Playwright 无头浏览器测试需要登录的网站
- 用 CDP 测试时假设端口已开启（需先检查）
