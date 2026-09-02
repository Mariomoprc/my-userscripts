# opencode-db-vacuum.ps1
# 每周日 04:00 自动 VACUUM opencode.db + 清理 lost_and_found 孤儿
$ErrorActionPreference = "SilentlyContinue"
$db = "C:\Users\pass\.local\share\opencode\opencode.db"
$log = "C:\Users\pass\.config\opencode\db-vacuum.log"
$svc = "opencode-web"

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts - $msg" | Out-File -FilePath $log -Append -Encoding utf8
}

# 1. 停服务（VACUUM 需独占锁）
$svcObj = Get-Service -Name $svc -ErrorAction SilentlyContinue
if ($svcObj -and $svcObj.Status -eq "Running") {
    Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    Write-Log "service stopped for vacuum"
}

# 2. 清理 lost_and_found 孤儿（保留最近 7 天）
try {
    $py = @"
import sqlite3, time
db = r"$db"
con = sqlite3.connect(db)
cur = con.cursor()
# 清理 lost_and_found 中 7 天前的孤儿
cur.execute("DELETE FROM lost_and_found WHERE created_at < ?", (int(time.time()) - 7*86400,))
con.commit()
print("lost_and_found cleaned:", cur.rowcount)
con.close()
"@
    $py | python3 2>&1 | ForEach-Object { Write-Log "cleanup: $_" }
} catch { Write-Log "cleanup err: $_" }

# 3. VACUUM
try {
    $py2 = @"
import sqlite3
db = r"$db"
con = sqlite3.connect(db)
con.execute("VACUUM")
con.close()
print("vacuum done")
"@
    $py2 | python3 2>&1 | ForEach-Object { Write-Log "vacuum: $_" }
} catch { Write-Log "vacuum err: $_" }

# 4. 重启服务
if ($svcObj) {
    Start-Service -Name $svc -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 10
    Write-Log "service restarted"
}

# 5. 记录大小
$size = [math]::Round((Get-Item $db).Length / 1MB, 1)
Write-Log "db size after: ${size}MB"
