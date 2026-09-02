# OpenCode DB 定期清理脚本
# 功能：删除 N 天前未更新的会话、清理孤儿 event、压缩 DB、清理 TEMP 残留中间文件
# 特性：官方修复（opencode db compact-events）落地后自动停用自身计划任务并通知
# 用法：powershell -ExecutionPolicy Bypass -File opencode-db-cleanup.ps1 [-RetentionDays 30]
# 注意：本文件必须存 UTF-8 BOM，否则 PS 5.1 按 GBK 解析中文注释报 ParserError

param(
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

$SQLITE3 = "C:\Users\pass\AppData\Local\Android\Sdk\platform-tools\sqlite3.exe"
$DB_PATH = "$env:USERPROFILE\.local\share\opencode\opencode.db"
$DB_DIR = Split-Path $DB_PATH
$TASK_NAME = "OpenCode DB Cleanup"
$BACKUP_DIR = "$env:USERPROFILE\.config\opencode\backups"
$LOG_FILE = "$env:TEMP\opencode\cleanup-opencode-db.log"
$MAX_BACKUPS = 3

# ---------- 工具函数 ----------

function Write-Log {
    param([string]$Message)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $LOG_FILE -Value $line -Encoding UTF8
    Write-Host $line
}

function Send-Toast {
    param([string]$Title, [string]$Message)
    try {
        $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
        $null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
        $xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
        $xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$Title</text><text>$Message</text></binding></visual></toast>")
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("OpenCode DB Cleanup")
        $notifier.Show([Windows.UI.Notifications.ToastNotification]::new($xml))
    } catch {
        Write-Log "Toast 通知失败(忽略): $($_.Exception.Message)"
    }
}

function Test-OfficialFixPresent {
    # 官方修复落地标志：opencode db 出现 compact-events / event-log-status 子命令
    # 注意：PS 5.1 中 $ErrorActionPreference=Stop 时，原生命令 stderr 会抛 NativeCommandError，
    # 需用 cmd 包装 + 局部 ErrorActionPreference 抑制，避免脚本在检测处崩溃
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $help = & cmd /c "opencode db --help 2>&1" | Out-String
    } catch {
        $help = ""
    }
    $ErrorActionPreference = $oldEAP
    return ($help -match "compact-events" -or $help -match "event-log-status")
}

function Test-OpencodeRunning {
    return [bool](Get-Process -Name "opencode", "OpenCode" -ErrorAction SilentlyContinue)
}

function Get-CutoffMs {
    param([int]$Days)
    return [int64]((Get-Date).AddDays(-$Days) - (Get-Date "1970-01-01")).TotalMilliseconds
}

# ---------- 官方修复检测 + 自动停用 ----------

if (Test-OfficialFixPresent) {
    Write-Log "检测到官方修复已落地 (opencode db compact-events 可用)，自建清理不再需要。停用计划任务 $TASK_NAME"
    try {
        Disable-ScheduledTask -TaskName $TASK_NAME -ErrorAction Stop
        Send-Toast -Title "OpenCode 官方修复已落地" -Message "opencode db compact-events 已可用，自建清理计划任务已停用。"
        Write-Log "计划任务 $TASK_NAME 已停用"
    } catch {
        Write-Log "停用计划任务失败: $($_.Exception.Message)"
    }
    exit 0
}

Write-Log "===== OpenCode DB 清理开始 (保留 $RetentionDays 天) ====="

# ---------- 安全检查 ----------

$ocRunning = Test-OpencodeRunning
Write-Log "opencode 运行状态: $(if ($ocRunning) {'运行中'} else {'未运行'})"

if (-not (Test-Path $DB_PATH)) {
    Write-Log "错误: DB 不存在 $DB_PATH"
    exit 1
}
if (-not (Test-Path $SQLITE3)) {
    $alt = (Get-Command sqlite3 -ErrorAction SilentlyContinue).Source
    if ($alt -and (Test-Path $alt)) { $SQLITE3 = $alt; Write-Log "sqlite3 回退到 PATH: $SQLITE3" }
    else { Write-Log "错误: sqlite3 不存在 $SQLITE3"; exit 1 }
}

# 备份目录
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}
# 日志目录
$logDir = Split-Path $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$sizeBefore = (Get-Item $DB_PATH).Length / 1MB

# ---------- 1. 在线备份 ----------

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BACKUP_DIR "opencode-backup-$stamp.db"
Write-Log "备份到 $backupFile"
& $SQLITE3 $DB_PATH ".backup '$backupFile'"
if ($LASTEXITCODE -ne 0) {
    Write-Log "备份失败，中止清理"
    exit 1
}
Write-Log "备份完成"

# 清理旧备份，保留最近 $MAX_BACKUPS 份
Get-ChildItem $BACKUP_DIR -Filter "opencode-backup-*.db" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $MAX_BACKUPS |
    ForEach-Object {
        Write-Log "删除旧备份: $($_.Name)"
        Remove-Item $_.FullName -Force
    }

# ---------- 2. 删除 N 天前未更新的会话（SQL 事务批量） ----------

$cutoffMs = Get-CutoffMs -Days $RetentionDays
$cutoffDate = (Get-Date).AddDays(-$RetentionDays).ToString("yyyy-MM-dd")
Write-Log "删除 $cutoffDate 之前未更新的会话 (cutoff=$cutoffMs)"

$delCount = & $SQLITE3 $DB_PATH "SELECT COUNT(*) FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs;"
Write-Log "待删除会话数: $delCount (time_updated & time_created < $cutoffDate)"

if ($delCount -gt 0) {
    & $SQLITE3 $DB_PATH @"
PRAGMA foreign_keys = ON;
BEGIN;
DELETE FROM part WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM message WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM session_context_epoch WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM session_input WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM session_message WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM session_share WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM todo WHERE session_id IN (SELECT id FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs);
DELETE FROM session WHERE time_updated < $cutoffMs AND time_created < $cutoffMs;
COMMIT;
"@
    if ($LASTEXITCODE -ne 0) {
        Write-Log "删除会话失败，中止"
        exit 1
    }
    Write-Log "会话删除完成"
} else {
    Write-Log "无过期会话可删"
}

# ---------- 3. 清理孤儿 event ----------

$orphan = & $SQLITE3 -readonly $DB_PATH "SELECT COUNT(*) FROM event e LEFT JOIN session s ON e.aggregate_id = s.id WHERE s.id IS NULL;"
Write-Log "孤儿 event 数量: $orphan"

if ($orphan -gt 0) {
    & $SQLITE3 $DB_PATH @"
BEGIN;
DELETE FROM event WHERE aggregate_id IN (SELECT es.aggregate_id FROM event_sequence es LEFT JOIN session s ON es.aggregate_id = s.id WHERE s.id IS NULL);
DELETE FROM event_sequence WHERE aggregate_id IN (SELECT es.aggregate_id FROM event_sequence es LEFT JOIN session s ON es.aggregate_id = s.id WHERE s.id IS NULL);
COMMIT;
"@
    if ($LASTEXITCODE -ne 0) {
        Write-Log "孤儿清理失败，中止"
        exit 1
    }
    Write-Log "孤儿 event 清理完成"
}

# ---------- 4. 在线压缩（VACUUM INTO，无需排他锁）+ 条件替换 ----------

$compacted = "$env:TEMP\opencode\opencode-compacted-$stamp.db"
Write-Log "VACUUM INTO 在线压缩到 $compacted"
& $SQLITE3 $DB_PATH "VACUUM INTO '$compacted'"
if ($LASTEXITCODE -ne 0) {
    Write-Log "VACUUM INTO 失败，跳过替换（SQL 删除已生效）"
} else {
    $check = & $SQLITE3 -readonly $compacted "PRAGMA integrity_check;"
    if ($check -ne "ok") {
        Write-Log "压缩库校验失败 (integrity_check=$check)，不替换"
        Remove-Item $compacted -Force -ErrorAction SilentlyContinue
    } else {
        $origSize = (Get-Item $DB_PATH).Length / 1MB
        $compactSize = (Get-Item $compacted).Length / 1MB
        Write-Log "压缩完成: $([math]::Round($origSize,1)) MB -> $([math]::Round($compactSize,1)) MB (节省 $([math]::Round($origSize-$compactSize,1)) MB)"
        $isLowPeak = (Get-Date).Hour -in 3,4,5
        $needReplace = $compactSize -lt ($origSize - 50) -and $origSize -gt 800
        if ($needReplace -and $isLowPeak -and -not $ocRunning) {
            Write-Log "低峰且 opencode 空闲，直接替换"
            $preCleanup = Join-Path $DB_DIR "opencode.db.pre-cleanup-$stamp"
            Copy-Item $DB_PATH $preCleanup -Force
            Remove-Item "$DB_PATH-wal" -Force -ErrorAction SilentlyContinue
            Remove-Item "$DB_PATH-shm" -Force -ErrorAction SilentlyContinue
            Copy-Item $compacted $DB_PATH -Force
            Remove-Item $compacted -Force
            Write-Log "DB 替换完成 (原库备份: $preCleanup)"
        } elseif ($needReplace -and $isLowPeak -and $ocRunning) {
            Write-Log "DB>800MB 且低峰但 opencode 运行中，分离进程替换（中断<10s）"
            $replaceScript = "C:\Users\pass\.config\opencode\scripts\replace-db-compacted.ps1"
            Copy-Item $compacted "$env:USERPROFILE\.local\share\opencode\opencode.compacted.db" -Force
            Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$replaceScript`"" | Out-Null
            Write-Log "已启动分离替换进程，opencode 4096 将短暂中断后由 tray 自动拉起"
        } else {
            Write-Log "无需立即替换（节省不足50MB或非低峰），保留副本供下次: $compacted"
        }
    }
}

# ---------- 5. 清理 TEMP 残留中间文件 ----------

$tempDir = "$env:TEMP\opencode"
$patterns = @("opencode-backup-*.db", "opencode-compacted*.db", "opencode.db.bak*", "opencode.db.pre-cleanup-*")
$freed = 0
foreach ($p in $patterns) {
    Get-ChildItem $tempDir -Filter $p -File -ErrorAction SilentlyContinue | ForEach-Object {
        $mb = $_.Length / 1MB
        Write-Log "删除残留: $($_.Name) ($([math]::Round($mb,1)) MB)"
        Remove-Item $_.FullName -Force
        $freed += $mb
    }
}
Write-Log "TEMP 残留清理释放: $([math]::Round($freed,1)) MB"

# ---------- 汇总 ----------

$sizeAfter = (Get-Item $DB_PATH).Length / 1MB
$sessNow = & $SQLITE3 -readonly $DB_PATH "SELECT COUNT(*) FROM session;"
$seqNow = & $SQLITE3 -readonly $DB_PATH "SELECT COUNT(*) FROM event_sequence;"
Write-Log "===== 完成：DB $([math]::Round($sizeBefore,1)) MB → $([math]::Round($sizeAfter,1)) MB | 会话 $sessNow | event_sequence $seqNow ====="
