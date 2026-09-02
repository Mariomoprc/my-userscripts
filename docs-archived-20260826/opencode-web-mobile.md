# OpenCode 手机局域网访问（Web/Serve）

通过 `opencode web` / `opencode serve` 把 opencode 服务暴露到局域网，用安卓/iOS 浏览器访问，可"添加到主屏幕"当 app 用。

**相关经验**：LRN-20260806-055/056/057/058，ERR-20260806-001/002，LRN-20260807-075/078/080，ERR-20260806-008。

## 1 启动命令

```powershell
opencode web --hostname 0.0.0.0 --port 4096
```

- 默认 hostname 是 `127.0.0.1`（仅本机），必须改 `0.0.0.0` 才能局域网访问；启动时会打印 Local / Network 两个地址
- `opencode web` 会**无条件**调用 `open()` 打开默认浏览器（源码 `packages/opencode/src/cli/cmd/web.ts`，无 flag/env 可关）
- 不想弹浏览器：用 `opencode serve --hostname 0.0.0.0 --port 4096`——**同样 serve 网页前端**（根路径返回 HTML），手机访问体验一致，密码保护也一致
- 端口可换，默认 `web` 随机端口，固定端口便于手机收藏

## 2 密码（必须）

web/serve 权限极大（读写文件、执行 shell），暴露到局域网后**必须设密码**，否则同 WiFi 任何人可访问。

```powershell
[Environment]::SetEnvironmentVariable('OPENCODE_SERVER_PASSWORD', '<强密码>', 'User')
```

- 用户级环境变量持久化，所有 `opencode web`/`serve` 自动启用 HTTP Basic Auth
- 用户名默认 `opencode`，可用 `OPENCODE_SERVER_USERNAME` 覆盖
- 验证（当前 shell 需设 `$env:OPENCODE_SERVER_PASSWORD`）：

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/health          # 401
curl.exe -s -u 'opencode:密码' -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/health  # 200
```

- 局限：局域网 http 明文传输，家庭可信 WiFi 可接受；更安全走 SSH 隧道 / Tailscale

## 3 任务栏/桌面快捷方式

### 3.1 新建 WT profile（关键，勿用 `--` 覆盖）

**WT 的 `-p "Profile" -- <commandline>` 覆盖 commandline 不生效**——profile 自带 commandline 优先（实测双击跑的是 profile 原命令，web 参数被忽略）。必须新建独立 profile：

在 `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` 的 `profiles.list` 追加：

```json
{
    "commandline": "C:\\Users\\pass\\AppData\\Roaming\\npm\\node_modules\\opencode-ai\\bin\\opencode.exe serve --hostname 0.0.0.0 --port 4096",
    "guid": "{a1b2c3d4-e5f6-7890-abcd-ef1234567891}",
    "hidden": false,
    "icon": "C:\\Users\\pass\\Documents\\OpenCode\\opencode.ico",
    "name": "OpenCode Web",
    "startingDirectory": "C:\\Users\\pass\\.config\\opencode"
}
```

- `commandline` 用 opencode.exe 绝对路径（npm 安装：`C:\Users\pass\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`）
- 改后 `ConvertFrom-Json` 验证 JSON；新窗口读最新配置，旧窗口需重开

### 3.2 创建 .lnk

```powershell
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("C:\Users\pass\.config\opencode\OpenCode Web.lnk")
$s.TargetPath = 'C:\Users\pass\AppData\Local\Microsoft\WindowsApps\wt.exe'
$s.Arguments = '-w new-window -p "OpenCode Web"'
$s.WorkingDirectory = 'C:\Users\pass\.config\opencode'
$s.IconLocation = 'C:\Users\pass\.config\opencode\opencode-web.ico,0'
$s.Save()
```

固定到任务栏：从文件夹把 .lnk 拖到任务栏，或用 `$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\` 下建副本。

### 3.3 最简方案（当前采用，LRN-20260807-080）

用户最终偏好"单纯打开服务，不弹浏览器、不联动 TUI"：
- profile commandline 直接写 `opencode.exe serve --hostname 0.0.0.0 --port 4096`（serve 不弹浏览器且提供网页前端）
- .lnk 只需 `wt.exe -w new-window -p "OpenCode Web"`，一个窗口显示服务日志，关窗即停
- **勿用** `.lnk → powershell.exe -WindowStyle Hidden -File xxx.ps1` 启动服务：火绒等杀软会判木马删除快捷方式和图标（LRN-20260807-075，**ERR-20260807-003 再次确认**）

### 3.4 托盘方案（已弃用，LRN-20260807-122/123，2026-08-25 移除）

> ⚠️ **2026-08-25 已移除**：托盘 NotifyIcon 在 Explorer 重启（sleep/wake）后经常消失，用户决定去掉。改用 3.5 桌面客户端方案。

历史方案：PowerShell 托盘脚本 + 计划任务，WinForms NotifyIcon + 右键菜单。已删除相关文件和计划任务。

### 3.5 Web Serve 自启动（当前采用，2026-08-25）

用户使用 OpenCode 桌面客户端（Electron 应用，路径 `@opencode-aidesktop\OpenCode.exe`），桌面客户端独立运行，web serve 通过计划任务开机自启。

**最终方案**：
```
opencode/
├── serve-hidden.vbs         ← VBS启动器（直接调用 opencode.exe，火绒不拦截）
└── .env                     ← 密码写在这里，opencode 自动读取
```

**计划任务**：`OpenCode Web Serve`
- 触发器：AtLogOn（开机自启）
- 操作：`wscript.exe serve-hidden.vbs`（隐藏窗口）
- 状态：Running

**重启后端**：需要重启系统（僵尸端口问题，LRN-20260814-179）

**已知坑**：
- VBS + PowerShell 隐藏窗口 → 火绒拦截（必须 VBS 直接调用 opencode.exe）
- 计划任务进程不继承用户环境变量 → 密码写 .env 文件
- 僵尸端口 → 只能重启系统释放

## 4 防火墙

首次 `0.0.0.0` 监听会弹 Windows 防火墙窗口，勾选"专用网络"→ 允许。之后同 WiFi 设备可访问。

**关键**：入站规则必须绑定**实际监听进程**。`opencode web/serve` 监听进程是 `opencode.exe`，若规则只给了旧版 `node.exe`，手机仍被拒（本机 200、外部不通，ERR-20260806-008）：

```powershell
Get-NetTCPConnection -LocalPort 4096 -State Listen   # 看 OwningProcess
Get-NetFirewallApplicationFilter | Where Program -match 'opencode|node' | Get-NetFirewallRule
# 为 opencode.exe 添加入站规则（需管理员：Start-Process -Verb RunAs 提权执行脚本）
New-NetFirewallRule -DisplayName "OpenCode Web Server" -Direction Inbound -Action Allow `
  -Program "C:\Users\pass\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe" `
  -Profile Private,Public -Protocol TCP -LocalPort 4096
```

## 5 手机使用

1. 手机连同一 WiFi
2. 浏览器打开 `http://<电脑局域网IP>:4096`（电脑 IP 用 `ipconfig` 查 IPv4）
3. 首次弹 Basic Auth 登录框：`opencode` / 密码
4. 建议浏览器"添加到主屏幕"生成图标
5. 不用时关掉启动的 WT 窗口即停止服务

## 5.1 手机原生 app（第三方，LRN-20260807-078）

官方无 app（#10288 未做）、PWA 被拒（#19174 not_planned）。第三方安卓客户端：

| app | ⭐ | 中文 | 锁屏保活 | 说明 |
|-----|-----|------|---------|------|
| `crim50n/oc-remote`（**用户实测选用**） | 123 | 简体中文（15 语言） | ✅ WakeLock+前台服务 | 原生 Kotlin，SSE 流式、多服务器、Termux 终端、MCP；连 serve 填 IP+端口+用户名+密码；APK 从 GitHub release 下载（SHA-256 校验）。网页版痛点（锁屏需刷新/复制失效）原生客户端全无 |
| `theblazehen/P4OC` | 86 | 无 | - | Google Play 上架最省事，终端风 UI，APK 仅 2.9MB |
| `Harness Remote`（原 opencode-remote-android） | 255 | 有繁中 | - | 仅完成提示音（非系统推送） |
| `alvarolorentedev/opencode-mobile` | - | 无（纯英文） | 有 expo-notifications/后台任务 | 功能全（语音/附件）；汉化流程见 `docs/opencode-mobile-localization.md` |

要系统级推送（锁屏弹通知）仍用 ntfy 插件方案（见 LRN-20260806-055/056 思路：监听 `session.idle` 推送）。

**注意**：网页版在局域网 `http://IP:4096` 下有两大限制（浏览器安全策略，非 opencode bug）：① 锁屏后台标签被冻结，SSE 断开不自动重连，需手动刷新；② `navigator.clipboard` 复制按钮仅 HTTPS 安全上下文可用，HTTP 下点了没反应。换原生客户端（如 oc-remote）可同时解决。

## 6 会话互通（Web/TUI）

- web/serve 与 TUI 共享同一 `opencode.db`：**历史会话互通**——TUI 跑完的会话手机端可见并可续聊，反之亦然
- **进行中会话不实时同步**（两端是不同 server 实例）
- 要同实例实时共享：`opencode web` 后本机执行 `opencode attach http://localhost:4096` 把 TUI 挂到同一后端

## 7 已知坑

- **僵尸端口 4096（需重启系统）**：`opencode serve` 进程若被非正常终止（如双托盘实例并发停止的竞态、或进程被 `Stop-Process` 硬杀 TerminateProcess），TCP socket 不被 OS 回收 → 端口显示 Listen 但 HTTP 永远无响应、本机 health 超时、CLOSE_WAIT 堆积、OwningProcess 进程不存在。**只能重启系统释放**（`scripts/opencode-tray.ps1` 已加单实例 Mutex 防重入 + **2026-08-15 起 Stop-OcService 先发 Ctrl+C 优雅关停**，常规重启已不会触发；但 NSSM 被杀、系统强制结束等硬终止仍可能）。识别：`netstat -ano | findstr :4096` 的 PID 任务管理器找不到 + `curl -m 5 http://127.0.0.1:4096/global/health` 超时
- **快捷方式自定义图标不显示**：.lnk `IconLocation` 指向独立 `.ico` 文件（PNG 压缩或 BMP 格式、可见目录均试过）在 Win11 不显示，回退目标默认图标；指向 PE（`shell32.dll`）正常。诊断：建 `TEST.lnk`（notepad + `shell32.dll,13`）对照。可靠方案：图标嵌入 .exe/.dll 再让 .lnk 指向（见 ERR-20260806-001）
- **图标缓存硬清理**：`ie4uinit -show`/`-ClearIconCache` 不够 → 结束 explorer → 删 `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db` → 重启 explorer
- **验证 ICO**：勿用 `System.Drawing.Icon.ToBitmap()`（对 PNG 压缩 ICO 抛异常，.NET 限制不代表文件坏），用 `Image.FromStream` 逐 entry 解码
- **火绒误报**：.lnk 指向 PowerShell 隐藏窗口执行脚本会被判木马删除（含图标）；启动服务用 .cmd 或 .lnk 直接指向应用（LRN-20260807-075）
- 运行中的旧服务占着端口：重启前先关旧窗口

## 8 外网访问（Tailscale 子网路由，LRN-20260807-113~116）

手机在外网（4G/5G/公司 WiFi）也能用 `http://192.168.3.53:4096` 访问 opencode，客户端地址零改动。

### 8.1 前置条件
- 笔记本已装 Tailscale 并登录（`tailscale status` 显示设备在线）
- 手机已装 Tailscale 客户端（Play / 官网 APK / F-Droid）并登录同一账号
- opencode serve 已在 `0.0.0.0:4096` 监听

### 8.2 笔记端配置（子网路由宣告）
```powershell
# 管理员 PowerShell
tailscale up --advertise-routes=192.168.3.0/24
# 验证
tailscale status --json | ConvertFrom-Json | Select -Expand Self | Select PrimaryRoutes
# 应显示 192.168.3.0/24
```

若 `tailscale up` 提权执行后 `PrimaryRoutes` 为空，用 .ps1 脚本文件方式重跑（ERR-20260806-011）。

### 8.3 管理后台批准路由
1. 打开 https://admin.tailscale.com/machines
2. 点笔记本名称进入详情页
3. **Subnets** 区块 → **Edit route settings** → 勾选 `192.168.3.0/24` → **Save**

### 8.4 手机端配置
- 打开 Tailscale app → 设置 → **Subnet routes** → 开启 **Use Tailscale subnets**（LRN-20260807-115）
- 手机 Tailscale 连接后，VPN 流量自动路由 `192.168.3.0/24` 到笔记本

### 8.5 验证
```powershell
# 本机验证
tailscale status  # 两台设备 active
# 手机端：关 WiFi 用流量访问 http://192.168.3.53:4096 → 应弹 Basic Auth
```

### 8.6 Tailscale 与 FlClash 共存（LRN-20260807-116）
- Android 同一时刻只能有一个活跃 VPN（VpnService 单槽位），Tailscale 和 FlClash 不能同时生效
- 实用方案：分时切换（翻墙开 FlClash / 连笔记本开 Tailscale）；或 Tailscale 开着 + 浏览器内代理并行
- Tailscale 默认 split-tunnel：只接管 tailnet 网段，其他 App 流量直连不挡

### 8.7 开源替代方案（LRN-20260807-114）
| 方案 | 特点 |
|------|------|
| ZeroTier | 开源 GPLv3，可自建 Moon，国内可用 |
| Headscale | 开源 Tailscale 控制服务器，软路由 Docker 可跑 |
| EasyTier | 国产 Rust 组网，去中心化，国内优化 |
| frp | 反代单服务，手机浏览器访问，软路由 Docker 跑 frps |

### 8.8 软路由 Exit Node + OpenClash（LRN-20260807-117~121，当前采用）

手机只装 Tailscale 一个 app，出门全 App 翻墙（走家里 OpenClash）+ 访问内网，手机/笔记本 FlClash 可卸载。

**流量路径**：手机 → Tailscale 隧道 → 软路由 tailscale0 → OpenClash(mihomo TUN utun) 透明代理 → 翻墙；访问 192.168.3.x 走更具体的子网路由（笔记本宣告）直连。

**部署步骤**：
1. 软路由 iStoreOS 装 `tailscale`（官方源 v1.80.3）+ `tailscale up --advertise-exit-node`；AuthURL 用 `tailscale status --json` 的 `AuthURL` 字段获取（busybox 无 timeout/nohup，`tailscale up` 会阻塞）
2. 浏览器授权（同账号）→ admin.tailscale.com 批准软路由 exit node
3. 手机 Tailscale → Use exit node=istoreos + **Allow LAN access 打开**（否则走 exit node 时内网不通）
4. 软路由启用 OpenClash（`uci set openclash.config.enable=1` + restart），确认 `utun` UP、规则劫持

**验证**：软路由 `ip -s link show tailscale0` RX 暴涨 = exit node 生效；mihomo 日志 `198.18.0.1 → www.google.com using 节点` = 翻墙通（Fake-IP 源）。

**DNS 警告消除**（LRN-20260807-118）：手机 Use Tailscale DNS **关闭**（admin 未配 Global nameserver 时手机无 resolver）+ 软路由 accept-dns=true。DNS 走系统经隧道 → 软路由 dnsmasq hijack → 上游 127.0.0.1#7874 mihomo 解析。

**已知坑**：
- tailscaled 不监听 100.100.100.100:53，DNS 应答由 dnsmasq hijack（nft `table inet dnsmasq` prerouting UDP 53 → 本地）承担
- 软路由 `tailscale set --accept-dns=false` 会使 100.100.100.100 SERVFAIL
- OpenClash API：`curl -H "Authorization: Bearer <secret>" http://192.168.3.100:9090/configs`，secret 在 `三合一.yaml`（LRN-20260807-121）；本机 127.0.0.1:9090 是 FlClash 勿混淆
- 软路由 busybox 无 `grep -P`/`timeout`/`nohup`；复杂命令用 base64 传（LRN-20260807-120）；SSH 输出含 emoji 需 `PYTHONIOENCODING=utf-8`（ERR-20260806-012）

### 9 软路由 opencode（Docker，LRN-20260807-126，已恢复）

> ✅ **已恢复**（2026-08-08）：手机远程访问需求恢复，**笔记本保持睡眠**，软路由 opencode 作为手机远程替代方案。此前曾移除（LRN-20260814-143），后因需求变化重新启用。数据目录 `/etc/opencode/` 一直保留，恢复只需重新 `docker run`，无需重建镜像。
>
> ✅ **已升级 1.18.21**（2026-08-22）：镜像重建为 `opencode-arm64:1.18.21-full`（含 ssh/scp/curl/git/python3/jq 全套工具）。容器内 SSH 到笔记本用 `data/ssh-backup/id_ed25519`（opencode-container 密钥），`/root/.ssh` 软链 + config 已配置。旧镜像 `1.18.15`/`1.18.16-keep`/`1.18.20` 保留可回退。**⚠️ 教训：重建镜像必须保留原 Dockerfile 的 apt 工具层，否则容器内 ssh/scp/curl 全丢，且 `/root/.ssh` 是容器内文件系统，`docker rm` 会清掉。**

**访问地址**：`http://100.97.187.104:4096`（Tailscale IP）或 `http://192.168.3.100:4096`，Basic Auth 同笔记本密码。

**部署**（软路由 iStoreOS ARM64/musl）：
1. GitHub 0.0.55 是静态编译可直跑（无 `--hostname`）；npm 1.18.15 需 glibc → 用 Docker
2. `docker pull node:20-slim`（直连 Docker Hub；daemon.json 代理 `127.0.0.1:7890` 会 EOF，需改 `{}` 直连）
3. Dockerfile：`COPY opencode /usr/local/bin/opencode` + `CMD ["opencode","serve","--hostname","0.0.0.0","--port","4096"]`
4. 运行：`docker run -d --name opencode --restart always -w /root -p 4096:4096 -v /etc/opencode:/root/.config/opencode -v /etc/opencode/data:/root/.local/share/opencode -e OPENCODE_SERVER_PASSWORD=<密码> opencode-arm64:1.18.15`（**必须加 `-w /root`**，否则默认 `/` 导致 inotify 监视整个根目录，网页卡顿、新建对话极慢，LRN-20260823-001）
5. auth.json（opencode-go key 复用笔记本，含 opencode 条目同 key）+ opencode.json（model: opencode-go/mimo-v2.5）
6. 重启容器后 auth 生效（首次模型调用报 `j.split` 错误，重启后正常）

**恢复命令**（2026-08-08，镜像和数据都保留在软路由）：
```bash
docker run -d --name opencode --restart always -w /root -p 4096:4096 \
  -v /etc/opencode:/root/.config/opencode \
  -v /etc/opencode/data:/root/.local/share/opencode \
  -e OPENCODE_SERVER_PASSWORD=<密码> \
  -e EXA_API_KEY=<key> \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=<token> \
  -e TAVILY_API_KEY=<key> \
  -e CONTEXT7_API_KEY=<key> \
   opencode-arm64:1.18.21
```
- 密码和 API key 从笔记本 User env 读取后 base64 经 `ssh_run.py` 传入（避免特殊字符转义）；不落盘
- `opencode.json` 的 MCP 用 `{env:XXX}` 占位符注入，**key 必须用 `-e` 传进容器**，否则 MCP 连接无认证
- CONTEXT7 key 笔记本上存在 `opencode.jsonc` 的 MCP env 明文里（`ctx7sk-...`），不在 User env——恢复时手动带上

**验证**：本机/Tailscale IP health 200；`opencode run -m opencode-go/mimo-v2.5 "OK"` 返回 OK。

**查看历史会话（LRN-20260810-001）**：Web UI 主页"最近会话"只显示**当前项目目录**下的会话（项目状态存浏览器 localStorage `opencode.global.dat:server`，非服务端）。若会话全在 `/` 根目录但主页显示"这里还没有内容"，用浏览器 Console 执行：
```js
localStorage.setItem('opencode.global.dat:server', JSON.stringify({list:[],projects:{local:[{worktree:'/',expanded:true}]},lastProject:{local:'/'},recentlyClosed:{}})); location.href='http://192.168.3.100:4096/Lw';
```
- `Lw` = 根目录 `/` 的 Base64URL 编码（路由格式 `/{base64url(directory)}/session/{sessionID}`）
- 或手动：侧边栏"添加项目"→ 搜索 `/` → 点"最近项目"分组里的 `/`（勿点子文件夹）
- API 验证某目录下有没有会话：`curl -u opencode:<密码> "http://192.168.3.100:4096/api/session?directory=<dir>&roots=true"`
- **注意**：该版本 `GET /api/project` 返回 SPA HTML 非 JSON；验证用 `/api/session`

**MCP 依赖坑（ERR-20260808-019）**：exa/context7/tavily 的 npm 包不随镜像安装，`npx -y` 首次启动需现场拉包，软路由网络下 30s 超时 → `opencode mcp list` 显示 failed。修复：容器内 `npm install -g exa-mcp-server @upstash/context7-mcp @mcptools/mcp-tavily`（npmmirror 镜像 40s）。⚠️ 全局包在容器**可写层**，`docker restart` 保留但 `docker rm + run` **会丢失**，重建后需重装。

### 10 经验文件同步（syncthing，LRN-20260808-144/147）

**当前状态（2026-08-25 更新）**：
- 记忆存储在 `.learnings/` 目录（Syncthing 跨设备同步），opencode-mem 插件已移除（thinking 模式不兼容 bug）
- `docs/`（含 superpowers/，folder `opencode-docs`）✅ **双向同步中**（2026-08-12 恢复：软路由旧残留 `.stversions/`/旧文件已清空重建，由笔记本推送全量 37 文件，双向写回验证通过）
- `AGENTS.md` ❌ 各自独立（笔记本完整版 vs 软路由精简版，两边指导不同）
- `opencode.json` / `auth.json` ❌ 各自独立

**配置（2026-08-25 当前有效）**：

| 内容 | 同步策略 |
|------|---------|
| `docs/`（含 superpowers/） | ✅ 双向（folder `opencode-docs`，type `sendreceive`） |
| `AGENTS.md` | ❌ 各自独立（笔记本完整版 vs 软路由精简版，两边指导不同） |
| `opencode.json` / `auth.json` | ❌ 各自独立 |

> 📌 **命名分离纪律**：两端各写各的前缀文件，syncthing 永不冲突——笔记本写 `MEMO.md`/`LEARNINGS.md`/`ERRORS.md`，软路由写 `ROUTER-MEMO.md`/`ROUTER-LEARNINGS.md`/`ROUTER-ERRORS.md`，检索时两端都查。

**历史停用（2026-08-09，已恢复）**：
> 曾因"笔记本是经验产生主力，软路由侧新增少"取消双向同步；软路由 syncthing 当时保留（手机照片备份 Photos Backup 仍依赖）。2026-08-12 决定恢复 docs 同步，详见上文当前状态。

**部署（REST API，`X-API-Key` 从 config.xml `<apikey>` 取）**：
1. 软路由 syncthing（`0.0.0.0:8384`，home `/mnt/usb4-1/syncthing`，user syncthing）；笔记本 syncthing v1.30.0（`C:\Users\pass\syncthing\...`）
2. 配对：软路由设备 ID `TM7K4YB-...`，笔记本 `LBXNFWG-...`；两端 `POST /rest/config/folders`（id `opencode-docs`/`opencode-learnings`，type `sendreceive`，devices 含双方 ID），`POST /rest/db/scan?folder=` 触发扫描，热加载无需重启
3. 软路由侧目录 `mkdir -p /etc/opencode/docs` 并 `chown syncthing:syncthing`（容器挂载目录，同步后 opencode 容器内自动可见）

**⚠️ 文件夹类型名注意（LRN-147）**：syncthing 的类型是 `sendonly`/`receiveonly`/`sendreceive`/`receiveencrypted`。**`send`/`receive` 是非法值，PUT 返回 200 但被忽略不生效**。

**托盘图标（LRN-147，已停用 2026-08-09）**：笔记本曾装 `Martchus.syncthingtray`（Syncthing Tray v2.1.3，winget），已卸载。项目活跃（2026-07 仍发版）。⚠️ **勿用 SyncTrayzor**：5 年没更新（2021），自带 syncthing v1.18 读不了新版 config（version 52>35）会启动失败。自启：HKCU Run 项 `syncthingtray` → 真实 exe 路径；syncthing.exe 自身也留 Run 项（`serve --no-browser --no-upgrade`）。

**验证**：笔记本写入 → 软路由收到；软路由写入 → 笔记本收到（双向传播）；新增/删除/更新均双向同步。

**已知坑**：笔记本进程级残留 `HTTP_PROXY=http://127.0.0.1:7890`（死端口）会让 curl/urllib 连软路由 8384 失败（000/ConnectionRefused）——Python 用 `ProxyHandler({})` 绕过，curl 加 `--noproxy "*"`。
