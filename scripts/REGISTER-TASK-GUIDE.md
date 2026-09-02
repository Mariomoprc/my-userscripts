# OpenCode DB Backup 计划任务注册指南

## 问题
当前用户没有管理员权限，无法通过脚本自动注册计划任务。

## 手动注册步骤

### 方法 1：使用任务计划程序 GUI
1. 按 `Win + R`，输入 `taskschd.msc`，回车
2. 在左侧点击「任务计划程序库」
3. 右键 → 「创建任务」
4. 常规选项卡：
   - 名称：`OpenCode DB Backup`
   - 描述：`每周备份 opencode.db 对话历史数据库`
   - 安全选项：勾选「不管用户是否登录都要运行」
   - 勾选「以最高权限运行」（可选）
5. 触发器选项卡 → 新建：
   - 开始任务：「按预定计划」
   - 高级设置：勾选「重复任务间隔」，选择「1 周」
   - 勾选「星期日」
   - 开始时间：`04:00:00`
6. 操作选项卡 → 新建：
   - 操作：「启动程序」
   - 程序：`powershell.exe`
   - 添加参数：`-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\pass\.config\opencode\scripts\opencode-db-backup.ps1"`
7. 确定保存

### 方法 2：使用管理员 PowerShell
1. 右键点击「开始菜单」→「Windows PowerShell (管理员)」
2. 运行以下命令：

```powershell
$taskName = "OpenCode DB Backup"
$scriptPath = "C:\Users\pass\.config\opencode\scripts\opencode-db-backup.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 4am
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "每周备份 opencode.db 对话历史数据库" -Force
```

## 验证
注册成功后，运行以下命令验证：

```powershell
Get-ScheduledTask -TaskName "OpenCode DB Backup" | Select-Object TaskName, State
```

## 测试备份
手动运行备份脚本测试：

```powershell
& "C:\Users\pass\.config\opencode\scripts\opencode-db-backup.ps1"
```

## 备份位置
备份文件保存在：`C:\Users\pass\.config\opencode\backups\`
