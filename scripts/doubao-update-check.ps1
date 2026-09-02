# doubao-update-check.ps1 - 检查豆包输入法 Windows 版更新
# 每周一自动运行（需手动创建计划任务，见下方说明）

$url = "https://shurufa.doubao.com/"
try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    if ($r.Content -match "Windows.*下载|Windows.*Download|立即下载") {
        $msg = "豆包输入法 Windows 版已发布正式版！请访问 $url 下载"
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($msg, "豆包输入法更新", "OK", "Information")
    } else {
        Write-Host "$(Get-Date) 官网仍显示敬请期待"
    }
} catch {
    Write-Host "$(Get-Date) 检查失败: $_"
}
