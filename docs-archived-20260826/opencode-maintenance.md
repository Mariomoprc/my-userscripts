# OpenCode 维护手册

opencode 自身（非用户代码）的性能与存储排障。本手册与 skill `opencode-maintenance` 配合：skill 是速查流程，本文是完整操作细节。

## 背景：opencode.db 膨胀问题

opencode 用 **event sourcing** 持久化会话：`event` 表对每次消息/part 更新都写一条**完整快照**事件（`message.updated.1`、`message.part.updated.1`），从不压缩清理；SQLite 又关闭了 auto_vacuum，所以 `opencode.db` 无限增长。

- 本机实测：2026-06-26 创建 → 2026-08-05 达 **3.9GB**（每天 ~100MB）
- 体积分布：`event` 表 2.67GB（49 万行：`message.part.updated.1` 1502MB + `message.updated.1` 764MB）、`part` 表 1.2GB
- 后果：每次流式输出都往 3.9GB 的 DB 写全量快照 → 写放大、卡顿、**CPU 空闲也 20~35%**
- 官方状态：已知 issue [anomalyco/opencode#33356](https://github.com/anomalyco/opencode/issues/33356)，修复 PR #36710（event log compaction）**未合并**；官方修复前需手动清理

## 诊断命令

```powershell
# 1. 实例/进程检查（node 子进程按父进程分组，判断几套 MCP）
Get-CimInstance Win32_Process | Where-Object { $_.Name -match "opencode|node" } |
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine

# 2. DB 体积与缓存
Get-Item "$env:USERPROFILE\.local\share\opencode\opencode.db"
Get-ChildItem "$env:USERPROFILE\.local\share\opencode" -Recurse -File |
  Measure-Object Length -Sum

# 3. sqlite3 只读诊断（sqlite3.exe 在 Android SDK platform-tools）
$db = "$env:USERPROFILE\.local\share\opencode\opencode.db"
$sq = "C:\Users\pass\AppData\Local\Android\Sdk\platform-tools\sqlite3.exe"

# 表物理大小
& $sq -readonly $db "SELECT name,(SELECT sum(pgsize) FROM dbstat WHERE name=tbl.name)
  FROM sqlite_master tbl WHERE type='table' ORDER BY 2 DESC LIMIT 15;"

# event 按 type 分布（定位快照膨胀）
& $sq -readonly $db "SELECT type,count(*),round(sum(length(data))/1048576.0,1)||'MB'
  FROM event GROUP BY type ORDER BY sum(length(data)) DESC LIMIT 20;"

# session 占用 Top（注意 time_updated 是毫秒）
& $sq -readonly -header -column $db "SELECT substr(s.id,5,8) as id,
  (SELECT round(sum(length(e.data))/1048576.0,1) FROM event e WHERE e.aggregate_id=s.id) as evMB,
  (SELECT round(sum(length(p.data))/1048576.0,1) FROM part p WHERE p.session_id=s.id) as partMB
  FROM session s ORDER BY (SELECT sum(length(e.data)) FROM event e WHERE e.aggregate_id=s.id) DESC LIMIT 25;"
```

## 清理流程（已验证）

### 1. 在线备份（实例运行时即可）
```powershell
& $sq $db ".backup 'C:\path\opencode-backup.db'"
```

### 2. 删除旧 session（级联清理 event/part/message）
```powershell
opencode session list          # 查看会话与时间
opencode session delete <id>   # 逐条删除
```
- **级联删除**：删父 session 会连带删除子会话（parent_id 关联），因此批量循环时后出现的子会话会报 `Session not found` —— **这是正常现象**，不是失败
- 可用 PowerShell 循环批量删：先从 db 读出要删的 id 列表，循环 `opencode session delete`，`$LASTEXITCODE -ne 0` 且报 not found 的跳过即可

#### 批量删除加速：直接 SQL 事务（推荐）
逐条 `opencode session delete` 每次 fork Node 进程（开库→查→删→关），**几百条 = 几百次进程启动，极慢**。批量删直接 sqlite3 一条事务：

```powershell
& $sq $db @"
PRAGMA foreign_keys = ON;
BEGIN;
DELETE FROM part WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM message WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM session_context_epoch WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM session_input WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM session_message WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM session_share WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM todo WHERE session_id IN (SELECT id FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000);
DELETE FROM session WHERE time_updated < strftime('%s','2026-08-01')*1000;
COMMIT;
"@
```

通用原则：**批量操作优先直接写 DB 而非循环调 CLI**；事务包裹保证原子性。注意 `changes()` 只返回最后一条 DELETE 影响行数，非总数。

#### 孤儿 event 清理（删完 session 后必做）
直接 SQL 删 session 后，`event` 表对应事件**不会级联删除**（event 的 FK 指向 `event_sequence`，且 SQLite `PRAGMA foreign_keys` 默认 OFF），残留 15 万+ 条孤儿事件可占数 GB。判定与清理：

```powershell
# 孤儿数量（LEFT JOIN session IS NULL）
& $sq -readonly $db "SELECT COUNT(*) FROM event e LEFT JOIN session s ON e.aggregate_id = s.id WHERE s.id IS NULL;"

# 事务清理 + VACUUM 释放物理空间
& $sq $db @"
BEGIN;
DELETE FROM event WHERE aggregate_id IN (SELECT es.aggregate_id FROM event_sequence es LEFT JOIN session s ON es.aggregate_id = s.id WHERE s.id IS NULL);
DELETE FROM event_sequence WHERE aggregate_id IN (SELECT es.aggregate_id FROM event_sequence es LEFT JOIN session s ON es.aggregate_id = s.id WHERE s.id IS NULL);
COMMIT;
VACUUM;
"@
```

验证：`event_sequence` 行数应 = 现存 session 数；`PRAGMA integrity_check` = ok。实测 3.9GB → 714MB。

### 3. 在线压缩（不需要排他锁）
```powershell
& $sq $db "VACUUM INTO 'C:\path\opencode-compacted.db'"
```
- 3.9GB → 1.58GB 实测仅 **6.7 秒**
- 用 `VACUUM INTO` 而非 `VACUUM`：后者要排他锁，实例运行时会失败；前者基于读事务可在线执行

### 4. 替换数据库（必须退出 opencode）
实例占用 db 文件，不能原地覆盖。流程：
1. 退出所有 opencode
2. 备份原 db（`Copy-Item opencode.db opencode.db.pre-cleanup-<date>`）
3. 删除 `opencode.db-wal`、`opencode.db-shm`
4. 用压缩库覆盖 `opencode.db`
5. 重启 opencode（自动运行迁移，版本一致无碍）

可写成脚本自动执行（结束进程 → VACUUM INTO → 备份 → 替换 → 清理 wal/shm）。

> ⚠️ **脚本必须分离进程运行**（实测 2026-08-05）：脚本内 `Stop-Process -Name opencode` 会杀掉执行它的进程树——若由 opencode 会话内 bash 直接运行，会在替换步骤前中断（备份已生成、主库未替换）。须用 `Start-Process powershell.exe -WindowStyle Hidden` 启动分离进程（脚本杀掉 opencode 后仍存活）；`schtasks /Create` 分离任务在中文环境不可靠（报"系统找不到指定的文件"）。脚本需存 **UTF-8 BOM**，否则 PS 5.1 按 GBK 解析中文注释报 `ParserError`。分离进程的日志须写入文件（当前会话会被杀，看不到 stdout）。

清理后 **一并删除残留中间文件**：`%TEMP%\opencode\` 下 `opencode-backup-*.db`、`opencode-compacted-*.db`（可达 4GB+1.6GB）及 `opencode.db.pre-cleanup-*` 备份，实测释放约 5.7GB。db <1GB 时 VACUUM INTO 压缩收益有限（759→724MB），主要价值在删残留文件。

## Windows 默认终端与 CPU

conhost（默认老式控制台）用 **CPU 软渲染** ANSI 彩色文本；opencode TUI 流式输出逐 token 整屏刷新，conhost 下 CPU 开销极高。Windows Terminal 用 **GPU 渲染**（DirectWrite），同款 opencode 实测可降 ~35% CPU（[issue #11119](https://github.com/anomalyco/opencode/issues/11119) 中 iTerm2 45% → Ghostty 9.8%）。

设为 WT：
```powershell
$key = "HKCU:\Console\%%Startup"
Set-ItemProperty $key -Name DelegationConsole -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
Set-ItemProperty $key -Name DelegationTerminal -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
```
- CLSID `{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}` 从 `%ProgramFiles%\WindowsApps\Microsoft.WindowsTerminal_*\AppxManifest.xml` 的 `com.microsoft.windows.console.host` 扩展确认
- 全零 GUID `{00000000-...}` = conhost
- 修改后**注销/重启**才完全生效；新开终端立即生效
- **快捷方式坑**（实测 2026-08-05）：任务栏快捷方式 TargetPath 直接指向 `opencode.exe`（即使不经过 cmd.exe）双击**仍走 conhost**——窗口小（conhost 默认尺寸）+ Unicode block/braille 字形渲染成方块（logo 花）。正确做法：把 .lnk 的 TargetPath 改为 `wt.exe`、Arguments 改为 `-w new-window -p "OpenCode"`，前提是 WT settings.json（`%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`）`profiles.list` 中已有名为 OpenCode 的 profile（含 commandline/icon/startingDirectory），改后 `ConvertFrom-Json` 验证
- 任务栏固定快捷方式位置：`%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\`（桌面/开始菜单均无，勿全盘递归搜 `*.lnk` 会超时）；用 `WScript.Shell` COM 读 TargetPath/Arguments/IconLocation
- **字体**：用户偏好 OpenCode profile 保持默认字体 Cascadia Mono；logo 字形乱码的修复可装 Nerd Font（`winget install --id DEVCOM.JetBrainsMonoNerdFont`，装到 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`，family `JetBrainsMono Nerd Font`），但**改字体前必须先询问用户**

## 定期清理机制（脚本 + 计划任务，自动停用）

**背景**：opencode 无自动归档/删除机制；内置 `session archive` 只标记 `time_archived`，**不释放空间**（event 快照全留）。膨胀主因是 `message.updated.1`/`message.part.updated.1` 全量快照（issue [anomalyco/opencode#33356](https://github.com/anomalyco/opencode/issues/33356)，PR #36710 已关闭未合并）。

**脚本**：`scripts/opencode-db-cleanup.ps1`（UTF-8 BOM，PS 5.1 中文注释必需）
- 参数 `-RetentionDays 30`（默认）；日志 `%TEMP%\opencode\cleanup-opencode-db.log`
- 流程：①官方修复检测 ②备份 `.backup`（保留 3 份，目录 `~/.config/opencode/backups/`）③SQL 事务删 N 天前会话（part/message/context_epoch/input/message/share/todo + session）④孤儿 event 清理（event FK 指向 event_sequence 不级联）⑤opencode 未运行时 `VACUUM INTO`+校验+替换（运行中跳过）⑥清 TEMP 残留
- **官方修复自动停用**：第一步检测 `opencode db --help` 是否含 `compact-events`/`event-log-status`，含则 `Disable-ScheduledTask` + Toast 通知用户后退出（命令名已在 PR #36710 定型，比猜版本号可靠）

**计划任务**：`OpenCode DB Cleanup`，每月 1 号 04:00（COM `Schedule.Service` 注册）
- 注册命令：`schtasks /Create /TN ... /SC MONTHLY /D 1 /ST 04:00 /F`（PS 5.1 无 `New-ScheduledTaskTrigger -Monthly`；`schtasks /XML` 中文环境报 `(11,23):DaysOfMonth:1` 格式错，需用 `<DaysOfMonth><Day>1</Day></DaysOfMonth>` 格式）
- 验证：COM 读 `Definition.XmlText` 含 `ScheduleByMonth`+`<Day>1</Day>`
- 手动测试：`Start-ScheduledTask` 后 COM 读 `LastTaskResult`（0=成功）

**测试要点**：PS 5.1 `$ErrorActionPreference="Stop"` 下原生命令 stderr 抛 `NativeCommandError`，检测官方修复须用 `cmd /c "opencode db --help 2>&1"` + 局部 EAP 抑制

## 高 CPU 综合排查顺序

1. **实例数量**：多个 opencode 实例各带一套 MCP（playwright/edge/tavily/exa/context7 共 16 个 node 进程）、各占 ~1.5GB 内存，孤儿实例会残留（known issue #26836，usearch 死循环 100% CPU）→ 先 `taskkill` 清孤儿
2. **DB 体积**：>1GB 即按上文清理
3. **终端类型**：conhost → 设 WT
4. 三者可能**叠加**，需逐一排除

## 已知坑

| 坑 | 说明 |
|----|------|
| 时间戳是毫秒 | `time_updated < strftime('%s','date')*1000`，显示 `date(time_updated/1000,'unixepoch')`；直接用秒恒为空 |
| VACUUM vs VACUUM INTO | 前者要排他锁会失败，后者在线可跑 |
| 原地替换 | 实例占用 db，必须退出后替换 |
| session delete not found | 级联删除的正常现象，非失败 |
| WAL 合并不了 | VACUUM 后 `opencode.db-wal` 仍可能很大（如 883MB）——有 opencode 进程（含当前 TUI）持有连接不会自动 checkpoint，**重启后自动合并**，无需手动处理 |
| UTF-8 编码 | 无 BOM `.ps1` 被 PS 5.1 按 GBK 解析，中文注释报 `ParserError: 字符串缺少终止符` | 存 UTF-8 BOM 或用纯 ASCII/英文注释 |
| 自残进程 | 脚本内 `Stop-Process opencode` 级联杀死执行它的 bash 进程树，替换前中断 | `Start-Process powershell -WindowStyle Hidden` 分离运行，日志写文件 |
| 分离运行替代 | `schtasks /Create` 报"系统找不到指定的文件"（中文环境 /ST 值问题） | 用 `Start-Process` 更可靠 |
| 残留大文件 | 清理后 temp 残留 backup/compacted 中间文件数 GB + pre-cleanup 备份 | 清理后一并删除（实测释放 ~5.7GB） |
| 收益判断 | db <1GB 时 VACUUM INTO 压缩收益小（759→724MB） | 重点是删残留大文件，勿期待大幅缩小 |
| 快捷方式进 conhost | .lnk 直接指向控制台 exe（不经 cmd.exe 也进不了 WT），窗口小+字形乱码 | TargetPath 改 `wt.exe`、Arguments `-w new-window -p "OpenCode"`，profile 需先在 settings.json 定义 |
| 查字体命令 | `[System.Drawing.Text.InstalledFontCollection]` 报 TypeNotFound、`Get-ItemProperty \| Select-Object -ExpandProperty PSObject` 失败 | `Get-ChildItem C:\Windows\Fonts` / `%LOCALAPPDATA%\Microsoft\Windows\Fonts` 列字体文件 |
| 改字体未询问 | 为修字形装 Nerd Font 改字体，用户要求改回默认 | OpenCode profile 保持 Cascadia Mono，改字体前先询问 |
| WT 无法最小化启动 | .lnk WindowStyle=7、`start /min`、VBScript Run style=6 对 wt.exe 均无效 | 需系统托盘用 ConsoleSystemTray 等外部工具（LRN-20260807-107） |
| 火绒判 LNK→PS 隐藏为木马 | .lnk TargetPath 指向 `powershell.exe -WindowStyle Hidden` 触发 HEUR:Trojan/LNK.Agent.b | 永远不要用此模式，需隐藏窗口直接调目标程序（LRN-20260807-075，ERR-20260807-003） |
