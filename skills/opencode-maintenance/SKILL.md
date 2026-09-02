---
name: opencode-maintenance
description: "Use when diagnosing opencode 自身性能/存储问题：卡顿、启动慢、CPU 占用高、内存大、磁盘膨胀（opencode.db 体积异常、event 表无限增长），需要清理 opencode 会话/数据库（session delete、VACUUM）、检查残留 opencode 实例，或设置 Windows 默认终端（conhost→Windows Terminal），或快捷方式双击启动 opencode 落到 conhost 老式黑窗口/窗口小、Unicode 字形乱码（logo 渲染成方块），或 opencode web/serve 手机局域网访问（opencode web、OPenCode Web、局域网、手机访问、0.0.0.0、OPENCODE_SERVER_PASSWORD），或快捷方式自定义图标不显示，或 Docker 容器内 opencode 卡顿/新建对话慢（工作目录/inotify 问题）。Also when user mentions opencode 维护、opencode 数据库、opencode 清理、opencode 卡、opencode CPU 占用高、opencode.db、opencode 快捷方式、opencode 字体乱码、opencode 手机、opencode 网页、opencode Docker、软路由 opencode。"
metadata:
---

# OpenCode 维护

opencode 自身（非用户代码）的性能/存储排障。核心问题：`opencode.db`（SQLite）event-sourcing 膨胀——已知 bug（anomalyco/opencode #33356，修复 PR #36710 未合并），会**反复出现**（每天 ~100MB），需定期清理。

详细操作手册见记忆库（检索 tag `doc:opencode-maintenance`），本 SKILL 为速查流程。

## 快速定位

| 症状 | 首要嫌疑 | 验证 |
|------|---------|------|
| idle 也 20%+ CPU、流式输出卡 | DB 膨胀（event 表全量快照） | 看 `opencode.db` 大小 |
| 磁盘占用数 GB 在 `~\.local\share\opencode\opencode.db` | 同上 | `dbstat` 查 event/part 表 |
| 终端是老式黑窗口 | 默认终端是 conhost | `HKCU:\Console\%%Startup` |
| 快捷方式打开是黑窗口/窗口小/字形乱码 | .lnk 直接指向控制台 exe（conhost） | 查 `%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\*.lnk` 的 TargetPath |
| 16+ node 进程、多实例 | 残留孤儿实例 | 按 ParentProcessId 分组 |
| 快捷方式自定义图标不显示 | Windows 独立 .ico 作 lnk 图标源失效 | 建 TEST.lnk + `shell32.dll` 对照（ERR-20260806-001） |
| 手机局域网访问 opencode | web/serve + `--hostname 0.0.0.0` + 密码 | curl `/global/health` 无密码 401/带密码 200 |
| Docker 容器内网页卡、新建对话慢 | 工作目录为 `/`（默认），inotify 监视整个根目录 | `docker exec opencode ls -la /proc/1/cwd` 看指向 |
| 客户端回复慢、长时间"思考中" | 模型本身慢（mimo-v2.5 每步 77~97s vs flash 3s）或并发会话排队 | 日志 `stream`→`loop` 时间差；`rg "modelID=mimo-v2.5" log` 看调用分布 |
| Electron/Web 页面 `此页面没有响应`/`Page Unresponsive` | DB 膨胀致列表/会话加载阻塞主线程（>1GB 时高频）或 watcher 频繁重载；与后端 4096 zombie 区分 | 先 `desktop-vs-web` 对比：`curl /global/health` 健康则为 renderer 卡；再 `Get-Item opencode.db` 看 MB，DevTools Performance 录 Long Task |

## 诊断流程

1. **实例检查**：`Get-CimInstance Win32_Process | Where-Object { $_.Name -match "opencode|node" }` 按父进程分组；node 子进程链路指向哪个 opencode PID。多实例先 `taskkill /PID <id> /T /F` 清孤儿（known issue #26836 孤儿 100% CPU）。
2. **DB 体积**：`Get-Item "$env:USERPROFILE\.local\share\opencode\opencode.db"`。正常 <500MB，>1GB 即膨胀。
3. **表分布**（只读 sqlite3）：
   ```
   SELECT name,(SELECT sum(pgsize) FROM dbstat WHERE name=tbl.name) FROM sqlite_master tbl WHERE type='table' ORDER BY 2 DESC;
   SELECT type,count(*),round(sum(length(data))/1048576.0,1) FROM event GROUP BY type ORDER BY sum(length(data)) DESC;
   ```
4. **session 定位**：按 `event/part/message` 关联 session 聚合，找出大占用者。
5. **终端设置**：`Get-ItemProperty "HKCU:\Console\%%Startup"` 看 `DelegationConsole/DelegationTerminal`（全零 = conhost）。
6. **回复慢/卡"思考中"**：先确认问题范围（笔记本客户端 vs 软路由、慢 vs 无响应）。看日志 `~\.local\share\opencode\log\opencode.log` 中同一 session 的 `message=stream`（发起调用）→ 下一步 `message=loop` 的时间差：>60s 是模型服务端慢（mimo-v2.5 实测 77~97s/步），3s 左右是正常（flash）。多会话并发调同一慢模型会加剧排队。模型名错误会直接报 `ProviderModelNotFoundError`（如配置了不存在的模型 ID）。
7. **页面未响应（Electron `此页面没有响应`）分流**：① `curl -u opencode:$PW http://127.0.0.1:4096/global/health` 若 200 则排除后端 zombie，判定为 renderer 阻塞；② `Get-Item opencode.db` 若 >500MB 按清理流程删大 session（本 SKILL 清理流程）；③ `1个文件已更改` 频繁时查 watcher 是否对 `opencode.jsonc` 频繁触发（改配置频率过高会连带重载）；④ 若仅桌面端卡而 `http://localhost:4096` 流畅，则清 `%APPDATA%\ai.opencode.desktop\GPUCache`/`Cache` 或重装桌面端。

## 清理流程

**已自动化**：`OpenCode DB Cleanup` 计划任务每周日 04:00 自动执行 `scripts/opencode-db-cleanup.ps1 -RetentionDays 30`，无需手动。旧 `OpenCode DB Vacuum` 已停用（只 VACUUM 不删数据，已废弃）。

脚本逻辑（`opencode-db-cleanup.ps1`）：
1. **在线备份**：`sqlite3 db ".backup 'backup.db'"`（保留 3 份）
2. **删旧 session**：SQL 事务批量删 `time_updated < cutoff AND time_created < cutoff`（30 天前，含 part/message/context_epoch/input/message/share/todo/session，`PRAGMA foreign_keys=ON`；WAL 并发下 serve 在跑也可在线删）
3. **清孤儿 event**：`event_sequence` 无 FK 需显式删 `event`→`event_sequence`
4. **在线压缩**：`VACUUM INTO 'compacted.db'`（**不需要排他锁**，可边跑边压）；若 `DB>800MB` 且低峰 03-06 点则分离进程替换（`replace-db-compacted.ps1`，杀 serve→替换→tray 自动拉起，中断<10s），否则保留副本
5. **清 TEMP**：`$TEMP\opencode\opencode-compacted*.db` 等（可达数 GB）

**手动流程**（备用，无自动化时）：
1. **在线备份**：同上
2. **删旧 session**：`opencode session delete <id>` 循环批量删（**级联删** event/part/message；父删子也删，报 `Session not found` 正常）
3. **在线压缩**：同上
4. **替换**：退出所有 opencode → 备份原 db → 删 `opencode.db-wal/-shm` → 用 new.db 覆盖。替换脚本必须用 `Start-Process powershell -WindowStyle Hidden` **分离进程**运行——否则杀自身进程树中断；`schtasks /Create` 分离不可靠。脚本存 UTF-8 BOM。
5. **预防**：官方修复 PR #36710 落地前靠自动化兜底；关注该 PR，落地后脚本自动检测 `opencode db compact-events` 并停用自身任务。

## 设置 Windows 默认终端为 WT

```powershell
$key = "HKCU:\Console\%%Startup"
Set-ItemProperty $key -Name DelegationConsole -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
Set-ItemProperty $key -Name DelegationTerminal -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
```
CLSID 从 WT 的 AppxManifest.xml（`com.microsoft.windows.console.host`）确认。改后需注销/重启完全生效。作用：conhost CPU 软渲染 → WT GPU 渲染，TUI 高频刷新时 CPU 显著下降（issue #11119 实测降 35%）。

## 快捷方式启动到 conhost 的修复

系统默认终端已设 WT 后，若 `.lnk` 快捷方式 TargetPath 直接指向控制台 exe（如 `opencode.exe`），双击仍走 conhost——窗口小（conhost 默认尺寸）+ block/braille 字形渲染成方块（Unicode 乱码，logo 花）。修复：

1. **找快捷方式**：按顺序查任务栏固定（`%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\`）→ 桌面 → 开始菜单；勿全盘递归搜 `*.lnk`（超时）。用 `WScript.Shell` COM 读 TargetPath/Arguments/IconLocation。
2. **改快捷方式**：TargetPath = `wt.exe`，Arguments = `-w new-window -p "OpenCode"`，WorkingDirectory/IconLocation 保留。
3. **前提**：WT settings.json（`%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`）`profiles.list` 中已有名为 OpenCode 的 profile（含 commandline/icon/startingDirectory），`-p "OpenCode"` 才能命中；改后 `ConvertFrom-Json` 验证 JSON。
4. **验证**：`Get-CimInstance Win32_Process` 出现新的 WindowsTerminal.exe 而非 conhost。

## opencode Web/Serve 局域网访问（手机）

完整指南见记忆库（检索 tag `doc:opencode-web-mobile`），速查：

1. **启动**：`opencode web --hostname 0.0.0.0 --port 4096`（默认 `127.0.0.1` 只允许本机；`web` 会弹浏览器，`serve` 不弹但同样 serve 网页前端——源码 `cmd/web.ts` 无条件 `open()`，无 flag 可关）
2. **密码**：用户级环境变量 `OPENCODE_SERVER_PASSWORD`（`[Environment]::SetEnvironmentVariable(...,'User')`），`web`/`serve` 均启用 Basic Auth（用户名默认 `opencode`）。验证：`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/health`（无密码 401 / 带密码 200）
3. **快捷方式**：WT settings.json 新建独立 profile（commandline 写死完整命令，勿用 `-p` + `--` 覆盖——profile commandline 优先，LRN-20260806-058）；.lnk 用 `wt.exe -w new-window -p "OpenCode Web"`，WorkingDirectory 设 `~/.config/opencode`
4. **防火墙**：首次 `0.0.0.0` 监听弹窗需勾选"专用网络"；规则要按**实际监听进程**添加——`opencode web/serve` 监听进程是 `opencode.exe`，旧规则可能只给了 `node.exe` 导致手机被拒（本机 200 但外部不通），用 `Get-NetTCPConnection -LocalPort 4096 -State Listen` 查进程、`Get-NetFirewallApplicationFilter` 核对规则，`New-NetFirewallRule` 需管理员（ERR-20260806-008/007）
5. **会话互通**：web/TUI 共享同一 `opencode.db`，历史会话互通但不实时同步；要同实例共享用 `opencode attach http://localhost:4096`
6. **手机 app**：官方无 app/PWA（#10288/#19174）；第三方 `opencode-mobile`（纯英文、含通知/语音）、`Harness Remote`（繁中、完成提示音非推送）（LRN-20260807-078）
7. **服务快捷方式最简化**：profile commandline 直接写 `opencode.exe serve --hostname 0.0.0.0 --port 4096`，.lnk 用 `wt.exe -w new-window -p "profile名"`；勿用 .lnk→powershell 隐藏窗口（火绒误报删文件，LRN-20260807-075/080）
8. **历史会话显示为空**（LRN-20260810-001）：Web UI 主页"最近会话"按**当前项目目录**过滤（项目状态存浏览器 localStorage `opencode.global.dat:server`，非服务端）。会话全在 `/` 根目录但主页空 → Console 执行 `localStorage.setItem('opencode.global.dat:server', JSON.stringify({list:[],projects:{local:[{worktree:'/',expanded:true}]},lastProject:{local:'/'},recentlyClosed:{}})); location.href='http://<host>:4096/Lw'`（`Lw`=根目录 Base64URL）。验证：`curl -u opencode:<密码> "http://<host>:4096/api/session?directory=/"` 返回 JSON、`directory=/root` 返回空。该版本 `/api/project` 返回 SPA HTML 非 JSON，勿用其验证

## 快捷方式自定义图标不显示

Windows 11 的 .lnk `IconLocation` 指向**独立 .ico 文件**（PNG 压缩或 BMP 格式、可见目录、删 iconcache 均试过）图标不显示，回退目标默认图标；指向 PE 文件（`shell32.dll`）正常（ERR-20260806-001）。诊断与对策：

1. **对照排除**：建 `TEST.lnk`（target=notepad.exe，Icon=`shell32.dll,13`）——若正常则问题在独立 .ico 源，不在目录/缓存
2. **可靠方案**：把图标嵌入 .exe/.dll（PE 资源）再让 .lnk 指向；或接受默认图标
3. **图标缓存硬清理**：`ie4uinit -show`/`-ClearIconCache` 不够 → 结束 explorer → 删 `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db` → 重启 explorer（LRN-20260806-059）
4. **验证 ICO 有效性**勿用 `System.Drawing.Icon.ToBitmap()`（对 PNG 压缩 ICO 抛异常，.NET 限制不代表文件坏）；用 `Image.FromStream` 逐 entry 解码（ERR-20260806-002）

## 全局规则下沉：托盘与服务（原 AGENTS.md 第3节 细则）

以下两条原属 AGENTS.md 执行规范，因过于具体（Windows 排障细节）已下沉至本 skill。AGENTS.md 仅保留索引。

### 托盘/后台 GUI 程序必须在用户会话（Session 1）运行

从 SYSTEM 上下文 `Start-Process` 启动的 GUI 程序在 Session 0，`Shell_NotifyIconW` 无法在任务栏显示图标（E_FAIL）。必须用计划任务（Interactive + 用户账户）启动。诊断：`Get-CimInstance Win32_Process` 查 SessionId 应为 1（LRN-20260829-001）

### 非管理员控制 Windows 服务需改 DACL

NSSM 等服务默认 DACL 只给交互用户查询权限，非提权进程 `OpenServiceW` 请求 START/STOP 被拒（err=5）。修复：`sc.exe sdset <服务> "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)"`（给 IU 加 RP/WP/DT），并追加到服务安装脚本防重装失效（LRN-20260829-001）

## 后台服务托盘化模式（opencode 4096）

opencode web/serve 的托盘守护模式（LRN-20260812-004，脚本 `scripts/opencode-tray.ps1`）：

1. **启动必须用计划任务**（`Register-ScheduledTask`，AtLogOn + Interactive + `-Force`）：父进程是 svchost，彻底独立于终端。用 `Start-Process`/WMI 启动的脚本父进程是调用者（如 OpenCode.exe），**关掉那个终端会连带杀掉服务和托盘**（本次踩坑根因）
2. **计划任务 Arguments 必须含 `-WindowStyle Hidden`**：否则每次拉起弹空白 PowerShell 窗口（ERR-20260812-001）
3. **服务启动 `Start-Process` 必须带 `-WorkingDirectory` 到用户目录**：否则计划任务在 system32 起、服务写密钥文件报 PermissionError（ERR-20260812-002）
4. **退出/停止服务必须按端口杀**：`Get-NetTCPConnection -LocalPort <port> -State Listen` → `Stop-Process -Id $_.OwningProcess`，不能只杀自己 `Start-Process` 的句柄——否则孤儿服务残留后台"退出不了"（ERR-20260812-003）
5. **托盘 Exit 菜单** = 停服务 + `Application.Exit()`；重启菜单 = Stop + Start
6. **验证**：`Get-CimInstance Win32_Process` 查托盘脚本父进程应为 svchost；查无可见窗口（`MainWindowHandle -eq 0`）
7. **多实例清理**：按命令行匹配（`$_.CommandLine -match "tray"`）杀到只剩计划任务那个，避免多个托盘图标
8. **自隐藏窗口**：托盘脚本开头用 `ShowWindow(GetConsoleWindow(), 0)` 隐藏自身控制台（`Add-Type` Win32 P/Invoke），无论启动方式都不弹终端窗口；`.cmd` 启动器（`start "" /min powershell -File ...`）可避开火绒对 `.lnk→powershell hidden` 的误报
9. **火绒误报**：`.lnk` 直接指向 powershell.exe 会被火绒判木马删快捷方式；指向 `.cmd` 启动器则正常（LRN-20260807-075）
10. **Explorer 重启检测**：睡眠/唤醒后 Explorer 会重启，导致 NotifyIcon 消失。脚本每5秒检查 explorer.exe PID，变化时自动重建 NotifyIcon（LRN-20260822-001）

### C++ 托盘（opencode-tray.exe）维护要点（LRN-20260829-001）

当前托盘是 C++ 版（`tools/opencode-tray/opencode-tray.cpp`），serve 由 NSSM 服务 `opencode-web` 托管，托盘只做状态监控 + SCM 服务控制：

1. **服务控制权限（DACL）**：NSSM 服务默认 DACL 只给交互用户(IU)查询权限，托盘（未提权）`OpenServiceW` 请求 START/STOP 被拒（日志 `OpenService failed err=5`）。修复：`sc.exe sdset opencode-web "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)"`（给 IU 加 RP/WP/DT）。已追加到 `install-nssm-opencode.ps1` 防重装后失效
2. **托盘进程必须在 Session 1（用户会话）运行**：从 SYSTEM 上下文 `Start-Process` 启动 → 进程在 Session 0，`Shell_NotifyIconW` 无法在 Session 1 任务栏显示图标（日志 `NIM_ADD failed err=2147500037`=E_FAIL）。必须用计划任务（Interactive, pass 用户）启动。诊断：`Get-CimInstance Win32_Process` 查托盘进程 SessionId 应为 1
3. **CreateWindowW 返回值必须检查**：开机自启时 Explorer 未就绪，`CreateWindowW` 失败返回 NULL，但代码继续进入消息循环 → 进程"假运行"（无窗口无图标，计划任务卡 Running）。修复：检查 `RegisterClassW`/`CreateWindowW` 返回值，失败退出；启动时等待 Explorer 就绪（轮询 `GetExplorerPid()` 最多 30s）；`Shell_NotifyIconW` 失败时 `EnsureTrayIcon()` 每 5s 重试
4. **僵尸端口**：服务被硬杀后 4096 端口出现"LISTEN 但 PID 已死"的内核级僵尸 socket，只能重启电脑释放。托盘代码加 `IsZombiePort()` 检测（`OpenProcess` 失败或 `GetExitCodeProcess != STILL_ACTIVE`），检测到弹窗提示重启
5. **重启服务竞态**：`RestartServiceByName()` 必须 stop 后轮询 `QueryServiceStatus` 直到 `SERVICE_STOPPED`（最多 30s）再 start，不能固定 Sleep(3000)——否则服务还在 STOP_PENDING 时 start 造成竞态（服务卡 PAUSED）
6. **图标生成**：托盘图标（`icons/opencode-*.ico`）用 `gen-tray-icons.ps1`（Python PIL）从 256x256 源图标缩放 + 右下角实心圆点生成。**勿用抗锯齿/alpha_composite**（16x16 下颜色被背景吃掉偏黄）；勿用底色变色（太丑）。浅灰底 + 深色 logo + 右下角实心圆点（绿=运行/红=停止）

## 后端连接监测（4096 探活）

`opencode-all-in-one 1.8.3+` 的 `CONNECTION_MODULE`（仅 `localhost:4096`）：
- 劫持 `window.fetch` 计数 `failCount≥2` 判断开 → `toast ✗ 后端已断开 + title ● 掉线`，`HEAD /` 5s 轮询成功清零 → `✓ 后端已重连`
- 监听 `online/offline`，`failCount` 在 `ok||status<500` 时重置，避免 `192.168` 等其他端口被污染（`isLocalhost4096` 门控）
- 不自动 `location.reload`，避免丢输入框草稿

## 常见坑

- `session.time_created/time_updated` 是**毫秒**时间戳：过滤乘 `*1000`、显示用 `/1000`，否则 SQL 恒空（ERR-20260805-003）
- `VACUUM`（非 INTO）需要排他锁，会话占用 DB 时会失败；用 `VACUUM INTO` 在线压缩更稳
- 操作中的 opencode 实例占着 db 文件，**不能原地替换**，必须退出后替换
- `opencode.db` 3.9GB 时 VACUUM INTO 仅需数秒（比预期快得多），可放心执行
- `.ps1` 存 UTF-8 **无 BOM** 时，PowerShell 5.1 按 GBK 解析中文注释 → `ParserError: 字符串缺少终止符`；存 UTF-8 BOM 或注释用纯 ASCII/英文
- 清理脚本若在 opencode 会话内直接运行，`Stop-Process -Name opencode` 会杀死执行它的进程树 → 替换步骤中断；改用 `Start-Process powershell -WindowStyle Hidden` 分离运行，日志写文件
- `schtasks /Create` 分离任务可能报"系统找不到指定的文件"，`Start-Process` 分离进程更可靠
- 清理后 `%TEMP%\opencode\` 残留 `opencode-backup-*.db` / `opencode-compacted-*.db`（可达数 GB）及 `opencode.db.pre-cleanup-*` 备份，须一并删除（实测释放 ~5.7GB）
- db <1GB 时 VACUUM INTO 收益有限（759→724MB），主要价值在删除残留大文件
- 查已安装字体勿用 `[System.Drawing.Text.InstalledFontCollection]`（TypeNotFound）或 `Get-ItemProperty ... | Select-Object -ExpandProperty PSObject`（找不到属性）；改用 `Get-ChildItem` 列 `C:\Windows\Fonts` 与 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`（ERR-20260805-005）
- Nerd Font 安装：`winget install --id DEVCOM.JetBrainsMonoNerdFont --silent`，装到用户字体目录 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`，family 为 `JetBrainsMono Nerd Font`
- **用户偏好**：OpenCode 的 WT profile 保持默认字体（Cascadia Mono），即使 Nerd Font 能修复 logo 字形也不要未经询问就改终端字体（LRN-20260805-020）
- WT 快捷方式 `-p "Profile" -- <commandline>` 覆盖 commandline **不生效**（profile commandline 优先），要带参数启动需新建独立 profile（LRN-20260806-058）
- 独立 `.ico` 文件作 .lnk `IconLocation` 图标源在 Win11 解析失败（PE 内嵌才行）；诊断用 `shell32.dll` 对照（ERR-20260806-001）
- 图标缓存硬清理：结束 explorer → 删 `iconcache_*.db` → 重启 explorer，`ie4uinit` 两参数常不够（LRN-20260806-059）
- **火绒误报**：.lnk 指向 `powershell.exe -WindowStyle Hidden -File xxx.ps1` 会被火绒判木马删除（连带图标）；快捷方式启动服务直接指向应用或 .cmd（服务窗口用 `/min` 勿隐藏）（LRN-20260807-075）
- **服务快捷方式**：别做脚本/TUI 联动等过度设计；profile 写死命令 + .lnk 指向 wt 最稳（LRN-20260807-080）
- 防火墙规则按**实际监听进程**（opencode.exe）添加，勿依赖旧的 node.exe 规则（ERR-20260806-008）
- **睡眠/唤醒后托盘图标消失**：Explorer 重启导致 NotifyIcon 被销毁，但进程还在跑。已添加 Explorer PID 检测 + 自动重建逻辑（2026-08-22）
- **Docker 容器工作目录为 `/`**：`docker run` 未加 `-w` 时默认 `/`，opencode 用 inotify 监视根目录，整个文件系统（overlayfs/tmpfs/procfs）都在监视范围 → 网页卡、新建对话极慢。日志报 `fff init failed: Can not run certain FFF features in a file system root`。修复：`docker run ... -w /root`（LRN-20260823-001）
- **桌面客户端声音配置独立于 opencode.jsonc**：CLI 的 `notify_on_fallback` 不影响桌面客户端的声音通知。桌面客户端的 sounds 设置存储在 `%APPDATA%\ai.opencode.desktop\default.dat`（二进制），需通过界面 Settings → Sounds 修改。配置分离：CLI 配置在 `opencode.jsonc`，客户端配置在 Electron Local Storage（LRN-20260825-001）
- **KB5120998 预览更新导致 Explorer 反复崩溃**（LRN-20260829-002）：2026-08-29 安装 KB5120998（26200.9278）后 Explorer 反复崩溃（`Windows.UI.Xaml.dll` 0xc000027b），任务栏/托盘反复消失，`Shell_NotifyIconW` 全部 E_FAIL。根因（微软 KB5072911）：XAML 依赖包未及时注册。尝试：重新注册 3 个 XAML 包（`Add-AppxPackage -Register -ForceApplicationShutdown`）→ 无效；卸载 KB5120998 → 卸载包已清理失败。**服务本身正常**（端口可达），只有 Explorer/托盘受影响；不重启电脑无法彻底解决。托盘代码已加固（`EnsureTrayIcon` 每 5s 重试 + Explorer 重启检测），重启后自动恢复
