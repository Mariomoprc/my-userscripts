# restore.ps1
# OpenCode 配置恢复脚本
# 支持从三种来源恢复：OneDrive 云备份、本地备份、软路由备份

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("onedrive", "local", "router")]
    [string]$Source = "onedrive",

    [Parameter(Mandatory=$false)]
    [string]$BackupName,

    [Parameter(Mandatory=$false)]
    [switch]$List,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# 配置
$CONFIG_DIR = "$env:USERPROFILE\.config\opencode"
$ONEDRIVE_DIR = "$env:USERPROFILE\OneDrive\tools\系统_清理_优化\OpenCode-编程助手"
$LOCAL_BACKUP_DIR = "$CONFIG_DIR\backups"
$RESTORE_LOG = "$env:TEMP\opencode\restore.log"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp $msg" | Tee-Object -FilePath $RESTORE_LOG -Append
}

function Get-OneDriveBackups {
    if (-not (Test-Path $ONEDRIVE_DIR)) {
        return @()
    }
    Get-ChildItem $ONEDRIVE_DIR -Directory -Filter "backup_*" |
        Sort-Object LastWriteTime -Descending |
        Select-Object Name, LastWriteTime
}

function Get-LocalBackups {
    if (-not (Test-Path $LOCAL_BACKUP_DIR)) {
        return @()
    }
    Get-ChildItem "$LOCAL_BACKUP_DIR\opencode-backup-*.db" |
        Sort-Object CreationTime -Descending |
        Select-Object Name, CreationTime, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}
}

function Get-RouterBackups {
    # 需要 SSH 连接
    $sshScript = "ls -la /mnt/usb4-1/Backup/opencode-config-*.tar.gz 2>/dev/null | tail -5"
    $result = & "C:\Windows\TEMP\opencode\ssh_exec.js" $sshScript 2>&1
    return $result
}

function Restore-OneDrive($backupDir) {
    $configDir = Join-Path $backupDir "config"
    if (-not (Test-Path $configDir)) {
        Log "错误：备份目录中没有 config 文件夹"
        return $false
    }

    Log "从 OneDrive 备份恢复: $backupDir"

    # 备份当前配置
    $backupCurrent = "$CONFIG_DIR.bak-pre-restore-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $CONFIG_DIR $backupCurrent -Recurse -Force
    Log "当前配置已备份到: $backupCurrent"

    # 恢复配置
    $items = Get-ChildItem $configDir
    foreach ($item in $items) {
        $dest = Join-Path $CONFIG_DIR $item.Name
        if ($item.PSIsContainer) {
            Copy-Item $item.FullName $dest -Recurse -Force
        } else {
            Copy-Item $item.FullName $dest -Force
        }
        Log "恢复: $($item.Name)"
    }

    return $true
}

function Restore-Local($backupFile) {
    Log "从本地备份恢复: $backupFile"

    $dbPath = "$env:USERPROFILE\.local\share\opencode\opencode.db"
    $backupCurrent = "$dbPath.bak-pre-restore-$(Get-Date -Format yyyyMMdd-HHmmss)"

    if (Test-Path $dbPath) {
        Copy-Item $dbPath $backupCurrent -Force
        Log "当前数据库已备份到: $backupCurrent"
    }

    Copy-Item $backupFile $dbPath -Force
    Log "数据库已恢复"

    return $true
}

# 主逻辑
Log "=== OpenCode 恢复脚本启动 ==="
Log "来源: $Source"

if ($List) {
    Write-Host "`n=== OneDrive 备份 ===" -ForegroundColor Cyan
    $onedriveBackups = Get-OneDriveBackups
    if ($onedriveBackups) {
        $onedriveBackups | Format-Table -AutoSize
    } else {
        Write-Host "无可用备份"
    }

    Write-Host "`n=== 本地备份 ===" -ForegroundColor Cyan
    $localBackups = Get-LocalBackups
    if ($localBackups) {
        $localBackups | Format-Table -AutoSize
    } else {
        Write-Host "无可用备份"
    }

    Write-Host "`n=== 软路由备份 ===" -ForegroundColor Cyan
    Get-RouterBackups

    exit 0
}

# 恢复逻辑
$success = $false

switch ($Source) {
    "onedrive" {
        $backups = Get-OneDriveBackups
        if (-not $backups) {
            Log "错误：没有找到 OneDrive 备份"
            exit 1
        }

        if ($BackupName) {
            $selected = $backups | Where-Object { $_.Name -eq $BackupName }
        } else {
            $selected = $backups | Select-Object -First 1
        }

        if (-not $selected) {
            Log "错误：没有找到指定的备份: $BackupName"
            exit 1
        }

        $backupDir = Join-Path $ONEDRIVE_DIR $selected.Name
        if ($DryRun) {
            Log "[DryRun] 将从恢复: $backupDir"
        } else {
            $success = Restore-OneDrive $backupDir
        }
    }

    "local" {
        $backups = Get-LocalBackups
        if (-not $backups) {
            Log "错误：没有找到本地备份"
            exit 1
        }

        if ($BackupName) {
            $selected = $backups | Where-Object { $_.Name -eq $BackupName }
        } else {
            $selected = $backups | Select-Object -First 1
        }

        if (-not $selected) {
            Log "错误：没有找到指定的备份: $BackupName"
            exit 1
        }

        $backupFile = Join-Path $LOCAL_BACKUP_DIR $selected.Name
        if ($DryRun) {
            Log "[DryRun] 将从恢复: $backupFile"
        } else {
            $success = Restore-Local $backupFile
        }
    }

    "router" {
        Log "软路由恢复需要手动操作："
        Log "1. ssh 到软路由"
        Log "2. 解压备份: tar -xzf /mnt/usb4-1/Backup/opencode-config-*.tar.gz -C /tmp/"
        Log "3. 复制配置: cp -r /tmp/opencode/* /etc/opencode/"
        Log "4. 重启容器: docker restart opencode"
    }
}

if ($success) {
    Log "=== 恢复完成 ==="
    Log "请重启 opencode 使配置生效"
} elseif ($Source -ne "router") {
    Log "=== 恢复失败 ==="
    exit 1
}
