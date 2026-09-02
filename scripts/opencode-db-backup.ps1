# opencode-db-backup.ps1
# 备份 opencode.db 对话历史数据库

$ErrorActionPreference = 'Stop'

$DB_PATH = "$env:USERPROFILE\.local\share\opencode\opencode.db"
$BACKUP_DIR = "$env:USERPROFILE\.config\opencode\backups"
$MAX_BACKUPS = 3
$LOG_FILE = "$env:TEMP\opencode\db-backup.log"

if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

if (-not (Test-Path $DB_PATH)) {
    Write-Host "错误：数据库文件不存在: $DB_PATH"
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "$BACKUP_DIR\opencode-backup-$timestamp.db"

Copy-Item $DB_PATH $backupFile -Force

$backupSize = (Get-Item $backupFile).Length
Write-Host "备份成功: $backupFile ($([math]::Round($backupSize/1MB, 2)) MB)"

$backups = Get-ChildItem "$BACKUP_DIR\opencode-backup-*.db" | Sort-Object CreationTime -Descending
if ($backups.Count -gt $MAX_BACKUPS) {
    $toDelete = $backups | Select-Object -Skip $MAX_BACKUPS
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        Write-Host "删除旧备份: $($old.Name)"
    }
}

$remaining = (Get-ChildItem "$BACKUP_DIR\opencode-backup-*.db").Count
Write-Host "当前备份数: $remaining/$MAX_BACKUPS"
