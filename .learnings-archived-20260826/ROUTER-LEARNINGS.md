# 软路由经验（ROUTER-LEARNINGS）

> 本文件由**软路由 OpenClash 环境**产生，经 syncthing 同步到笔记本。每条经验带 `Env: softrouter-openclash` 标记，与笔记本端 `LEARNINGS.md` 区分。
> 每条经验同时标 `Scope: router-only | laptop-only | cross-env`（适用范围）：含软路由专属命令→router-only；通用原则→cross-env。
> 编号格式：`LRN-YYYYMMDD-NNN`（RNN 在 ROUTER 文件内自增），勿与笔记本共用编号段冲突。

---

## [LRN-20260808-021] scraping-tool-matrix-headless-environment

**Logged**: 2026-08-08T22:30:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

### Summary
软路由无浏览器（playwright 已禁用），实测各抓取工具对三类目标（静态页 / SSR 站 / JS渲染+反爬站如知乎）的真实表现，形成分级抓取策略。

### 实测矩阵（2026-08-08）
| 方案 | 静态页 | SSR 站 | JS/反爬站(知乎) | 结论 |
|------|--------|--------|----------------|------|
| `curl`+浏览器 UA | ✅ | ✅ nextjs.org 全文416KB | ❌ 只拿空壳 | 零成本首选，能直抓就直抓 |
| `tavily_extract basic` | ✅ | — | ❌ | 抓 JS 站必须 advanced |
| `tavily_extract advanced` | ✅ | — | ✅ 全文+回答 | **专治 JS/反爬站**（消耗 credits） |
| `exa_web_fetch` | ✅ | — | ❌ 超时(CRAWL_LIVECRAWL_TIMEOUT) | 只适合静态页 |
| `r.jina.ai` | ❌ 401 | ❌ 401 | ❌ 401 | 出口 AS30058 被拉黑 |
| Wayback | — | — | ❌ 429 | IP 限流 |
| allorigins 等 CORS 代理 | — | — | ❌ 522 | 纯转发不渲染 JS |
| `tavily search/QNA` | — | — | ✅ 缓存片段 | 降级方案 |

### 关键结论
1. 分级策略：curl 探测 → SSR/静态直抓（零成本）→ JS/反爬站走 `tavily extract advanced` → 降级用搜索缓存 → 最后交笔记本
2. `tavily extract` 不带 advanced 对 JS 站无效（basic 只拿到导航壳）
3. SSR 站（Next.js/Nuxt）curl 直接拿全文，别浪费时间上渲染服务
4. 对付 JS 渲染的完整办法清单见 AGENTS.md「搜索与抓取工具规划」

### Metadata
- Source: test
- Tags: scraping, headless, tavily, curl, ssr, anti-bot
- Related Doc: AGENTS.md（搜索与抓取工具规划）

---

## [LRN-20260808-022] firecrawl-free-key-bypasses-egress-ip-block

**Logged**: 2026-08-08T22:35:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

### Summary
软路由出口 IP（AS30058，山东机房）信誉差，导致**一切无 key 按 IP 信誉限流**的免费渲染服务被拒。**解法：注册账号带 key**，服务按账号而非 IP 限流——Firecrawl 免费 key 实测成功绕开（抓知乎完整正文 6KB markdown）。

### 实测过程
```
Firecrawl Keyless（无 Authorization 头）→ 403 "your IP address looks suspicious"
Firecrawl 免费 key（Authorization: Bearer fc-xxx）→ 200，成功返回知乎全文 markdown
r.jina.ai 匿名 → 401 AuthenticationRequiredError (AS30058 bad reputation)
anybrowse 首次调用 → 402 "Free tier limit reached (50 scrapes/day)"（公共池被他人耗尽）
```

### 结论
1. **带 key 的免费账号按账号限流**，可绕开按 IP 信誉的拦截——这是软路由"坏出口 IP"环境的通用解法
2. Firecrawl 免费层：**每月 1,000 credits 自动恢复**（官方 FAQ 确认），scrape=1 credit/页；已配 MCP + curl 备用通道（key 存 `/root/.firecrawl_key`，600 权限，MCP 经 bash 注入进程环境变量，opencode.json 无明文）
3. anybrowse 免费层是**公共 IP 池共享**，额度随时可能"已用完"——不可作主力
4. r.jina.ai 免费 key 一次性 1,000 万 token（用完需购买，不按月恢复），需注册才能用，列为可选备用
5. Cloudflare Worker 自建（fetch 10万/天 + Browser Rendering 仅10分钟/天，`CF-Worker` 头不可移除）已调研，待搭建

### Metadata
- Source: test
- Tags: firecrawl, egress-ip, reputation, api-key, scraping, keyless
- Related Doc: AGENTS.md（搜索与抓取工具规划 / 根因说明）

---

## [LRN-20260809-001] gemini-image-mcp-houtini-config

**Logged**: 2026-08-09T05:05:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash

### Summary
软路由 opencode 配置 Gemini 生图 MCP，选用 `@houtini/gemini-mcp`（npm 2.6.1，Node≥18，容器 v20 兼容），实测 13 工具正常加载（generate_image / edit_image / gemini_chat / generate_svg 等）。

### 关键点
- **选型**：`mcp-image`(shinpr) 要求 Node≥22，容器 v20 不可用；`@houtini/gemini-mcp` 要求 ≥18，兼容。默认模型 `gemini-3-pro-image-preview`（Nano Banana Pro）。
- **key 存储**：key 写入 `/root/.gemini_key`（chmod 600），config 用 `bash -c "export GEMINI_API_KEY=\"$(cat /root/.gemini_key)\"; exec gemini-mcp"` 注入（见 ERR-20260809-001：`{file:...}` 插值在 local MCP env 不生效）。
- **选型更新**：`mcp-image`(shinpr) 需 Node22 弃用；`@houtini/gemini-mcp` 全局安装 `npm i -g`，bin 命令 `gemini-mcp`，避免 npx 首次拉包慢。
- **实测陷阱**：生图模型免费额度全部 limit 0（429），文本模型正常 → **生图必须绑定 billing**（AI Studio → Dashboard → Usage & Billing → Set up Billing，按张计费 flash ~$0.067/1024px）。图片模型 429 检测：`generate_content_free_tier_requests limit: 0`。
- **该 MCP 仅支持模型**：`gemini-3-pro-image-preview` / `gemini-2.5-flash-image` / `nano-banana-pro-preview`（`gemini-3.1-flash-image` 等会报 Invalid model）。

### 命令备忘
- 直接生图（免费额度为 0 时会 429）：`generate_image` 参数 `{prompt, model:"gemini-2.5-flash-image"|"gemini-3-pro-image-preview", aspectRatio:"1:1"|"16:9"|"9:16"|"3:4"|"4:3", imageSize:"1K"|"2K"|"4K"}`
- 本地包路径：`~/.npm/_npx/2bf381d866603738/node_modules/@houtini/gemini-mcp/dist/cli.js`

## LRN-20260809-001: Tailscale relay 导致笔记本 OpenCode 响应慢
**日期**：2026-08-09
**环境**：softrouter-openclash
**问题描述**：笔记本 OpenCode 回复慢（MIMO/DeepSeek 模型）
**根因**：
- 笔记本通过 Tailscale relay（旧金山 sfo，256ms延迟）连接软路由
- 笔记本在局域网内却走了远程通道，绕了半圈地球
- 关闭穿透软件后，走局域网直连，速度恢复正常（0.8-1.0s）
**解决方案**：
- 保持 OpenClash 自定义规则：opencode.ai/deepseek.com 走 🎯 全球直连
- 笔记本在局域网内应关闭 Tailscale 或配置为直连
- Tailscale 适用于手机远程访问，不适用于局域网内设备
**实测数据**：
- opencode.ai 直连：0.8-1.0s（连接3ms）
- opencode.ai 走 Tailscale relay：>1.2s + 不稳定
**关键经验**：网络问题优先排查物理链路，不要只关注代理规则

## LRN-20260809-002: Tailscale 域名被 OpenClash fake-ip 污染导致 DERP 走代理
**日期**：2026-08-09
**环境**：softrouter-openclash
**问题**：Tailscale DERP/controlplane 域名（*.tailscale.com）被 OpenClash fake-ip 模式解析为 198.18.0.x 假 IP，流量走"漏网之鱼"→ 代理节点 → 绕远/不稳定
**发现**：`nslookup controlplane.tailscale.com 127.0.0.1:7874` 返回 198.18.0.x；DERP 连接在 connections 里显示走"🐟 漏网之鱼"
**修复**：
1. `/etc/openclash/custom/openclash_custom_fake_filter.list` 添加：
   - `+*.tailscale.com` / `+*.tailscale.io` / `+*.headscale.net`（fake-ip 过滤，返回真实IP）
2. `/etc/openclash/custom/openclash_custom_rules.list` 添加：
   - `DOMAIN-SUFFIX,tailscale.com,🎯 全球直连` / `tailscale.io` / `headscale.net`
   - `DST-PORT,41641,DIRECT`
3. `/etc/init.d/openclash restart`
**验证**：`controlplane/derp3h/log.tailscale.com` 全部走 `DIRECT > 🎯 全球直连`
**经验**：OpenClash 旁路由 + Tailscale 必须把 tailscale 域名加 fake-ip-filter + 直连规则，否则 DERP 流量被代理劫持

## LRN-20260809-003: 笔记本 opencode DeepSeek 报错排查（Windows + 多代理软件）
**日期**：2026-08-09
**环境**：softrouter-openclash + Windows 笔记本
**问题**：笔记本 opencode 用 opencode-go/deepseek-v4-flash 对话一直报 API 错误重试，软路由同样模型正常
**排查过程**：
1. 笔记本开了 SSH，发现装有 Tailscale + Clash for Windows + FlClash 多套代理软件
2. 日志显示当天 246 次 stream error（`Connect Timeout` / `other side closed`），07:41 后停止
3. 用 cmd（非 PowerShell）测试笔记本 GET/POST opencode.ai API 均 200 正常
4. 注意：PowerShell 引号转义会把 `-H "Authorization"` 头吞掉，导致误报 AuthError/500——测试必须用 cmd 或文件方式
**根因**：笔记本多套代理软件（Tailscale/Clash/FlClash）干扰网络路径，在穿透软件开启时段 opencode.ai 连接超时
**验证方法**：SSH 到 Windows 笔记本（pass@192.168.3.53，密钥已配）
**经验**：
- Windows PowerShell 里 curl 传 header 易被转义破坏，排障优先用 cmd 或 scp 文件方式
- 笔记本本地 opencode 监听 4096，软路由是备份实例
- 诊断"软路由正常但笔记本报错"时，先确认笔记本是否装了独立代理软件（Clash/Tailscale），TUN 叠加会劫持流量

## LRN-20260809-004: 笔记本 opencode.db 膨胀清理（Windows 端，SSH 远程操作）
**日期**：2026-08-09
**环境**：softrouter-openclash → SSH 到 Windows 笔记本
**背景**：笔记本 opencode 使用中 CPU 高，根因是 opencode.db 膨胀（event sourcing 只增不删，官方 PR #36710 未合并）
**排查关键**：
- 历史会话确认：DB 3.9GB 时空闲 CPU 20-35%
- 当前 DB 933MB，删除 322MB 的 PZ mod 会话后 VACUUM 到 378MB（回收 61%）
- 单超大会话（322MB/68k事件）即使不打开也拖慢全局读写（索引维护+WAL checkpoint）
**删除要点**（直接 SQL 必须清全表）：
- 除 event/part/message/session 外，还需清 event_sequence、todo、session_share、session_context_epoch、session_input、session_message
- 用 VACUUM INTO 生成压缩副本（无需排他锁，在线可做），验证后停服替换
- 替换后必须用计划任务重启（opencode-tray.ps1 管理 serve，需正确环境变量 OPENCODE_SERVER_PASSWORD）
**防复发**：长会话及时归档开新会话（compact 只压缩上下文窗口不清理 event 历史）；定期删超大会话

## [LRN-20260809-005] notebook-opencode-db-corrupt-recovery-safe-flow

**Logged**: 2026-08-09T18:35:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

**背景**：笔记本 opencode.db 在 LRN-20260809-004 清理后替换出损坏库（ERR-20260809-001），本次从软路由 SSH 远程安全恢复成功，验证完整流程

**关键结论**：
- opencode 1.18.x 数据在 `%LOCALAPPDATA%`… 实际为 `C:\Users\<user>\.local\share\opencode\opencode.db`（SQLite + WAL），非旧版文件目录结构
- **恢复选库原则**：优先 integrity `ok` 且含事故前完整历史的最近快照（本次选 `pre-cleanup-mod-20260809` 378MB/20会话），而不是"最新"（最新 compacted3 已删过头且损坏）
- **事件表结构**（SQL 删除必须全清）：
  - `event.aggregate_id` FK → `event_sequence.aggregate_id`（CASCADE）；但 event_sequence **无 FK 指向 session**，删 session 不会自动删事件 → 必须先 `DELETE FROM event_sequence WHERE aggregate_id=?` 再删 session
  - `message`/`part`/`todo`/`session_message`/`session_input`/`session_context_epoch` 均 FK session 且 schema 标注 ON DELETE CASCADE，**但 Python sqlite3 默认 `PRAGMA foreign_keys=OFF`，级联不生效**！删 session 后 message/part/event 全是孤儿，库不缩小、`PRAGMA foreign_key_check` 报违例。必须显式按 `session_id` 逐表 `DELETE`，再删 `event_sequence`/`event`（按 `aggregate_id`），最后删 session
  - part 同时有 message_id 与 session_id，靠 message_id 级联（孤儿 part 也可能因 message 被删而残留，用 `DELETE FROM part WHERE message_id NOT IN (SELECT id FROM message)` 兜底）
- **安全替换流程**（远程 Windows）：
  1. 现场保全：复制 db/wal/shm → `*.corrupt-snapshot-*`
  2. 停服：`Get-Process -Name OpenCode | Stop-Process -Force`（确认无残留）
  3. 复制备份 → 独立工作副本，副本上做清理/删会话
  4. `PRAGMA integrity_check` + `VACUUM` + 再 integrity，验证 ok
  5. 替换：删旧 db/wal/shm → Move 工作副本为 opencode.db
  6. 计划任务 `OpenCode Web Tray` 重启 → 验证 `HTTP 4096` 返回 401（up, need auth）
- PowerShell 远程执行易转义出错：用 `-EncodedCommand`（UTF-16LE base64）传整段脚本最稳，避免 `$_` 被外层 bash 展开
- Windows 无 sqlite3 时用 Python（笔记本有 3.14）直接操作 sqlite，scp 脚本上去跑
- 大量事件会话（如 OpenWrt 3.9 万事件）是体积主因；378MB 里删 8 个临时会话后体积几乎不变（删除占比小），真正瘦身需处理超大会话（需用户确认）

**防复发**：清理数据库 = 删会话或 VACUUM 后**必须替换前验证 integrity + 停净进程**；批量备份保留至少 2 个完整快照再动手

**归档历史会话**（2026-08-09 实操验证，接 LRN-004/005）：
- opencode 会话"归档"= 给 `session.time_archived` 写时间戳（毫秒），会话从默认列表隐藏但数据全保留，随时可置 NULL 取消归档
- 归档不减小库体积（数据仍在）；用户要"瘦身"需删会话 + VACUUM，归档只是让列表干净
- 操作：停服 → `UPDATE session SET time_archived=<now_ms> WHERE time_archived IS NULL AND id NOT IN (保留的当前会话)` → 重启 serve
- 保留当前活跃会话（title 匹配，如"安装Termux"），其余全归档；事前 `Copy-Item opencode.db → *.pre-archive-*` 存档
- 用户端新建会话与软路由远程操作并存：操作前先 `status` 查询会话的 time_created/time_archived，避免误归档用户正在用的会话

**删除归档会话瘦身**（2026-08-09 实操验证，361MB → 1.19MB）：
- 归档 ≠ 瘦身；真正瘦身 = 删归档会话数据 + VACUUM。本次删 12 归档会话（OpenWrt 3.9万事件 + oc配置等）后 event 从 58k 减到 341，库 8MB；再清孤儿后 1.19MB
- **删除顺序（必须显式，靠 FK 级联必翻车）**：
  1. `DELETE FROM part WHERE session_id IN (…)`
  2. `DELETE FROM message WHERE session_id IN (…)`
  3. `DELETE FROM todo/session_message/session_input/session_context_epoch/session_share WHERE session_id IN (…)`
  4. `DELETE FROM event WHERE aggregate_id IN (…)`（或先删 event_sequence 再按残留清）
  5. `DELETE FROM event_sequence WHERE aggregate_id IN (…)`
  6. `DELETE FROM session WHERE id IN (…)`
- 孤儿兜底（清历史遗留）：`DELETE FROM message/part/todo WHERE session_id NOT IN (SELECT id FROM session)`；`DELETE FROM part WHERE message_id NOT IN (SELECT id FROM message)`；`DELETE FROM event WHERE aggregate_id NOT IN (SELECT aggregate_id FROM event_sequence)`
- **验证金标准**：`PRAGMA integrity_check` + `PRAGMA foreign_key_check`（后者才查 FK 孤儿，integrity 只查 btree 不查 FK）双 0 才算干净
- 删除前保留 1 个完整备份（`opencode.db.pre-archive-20260809` 361MB）作退路，旧 pre-cleanup/compacted/backup 系列（约 7GB）确认后清除

### Metadata
- Source: lesson
- Tags: opencode-db, sqlite, recovery, remote-windows, sql, vacuum, archive, foreign-key

---

## [LRN-20260809-006] tablet-termux-openssh-via-laptop-adb

**Logged**: 2026-08-09T19:00:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

**背景**：华为平板（MatePad DBY-W09，鸿蒙4.0/Android12）通过数据线连笔记本，笔记本经 adb 控制平板上的 Termux，从软路由远程配置 OpenSSH 成功（SSH 到平板 192.168.3.21:8022）

**链路**：软路由容器 → SSH → 笔记本 Windows(pass) → adb → 平板(DBY-W09, 192.168.3.21) → Termux(0.118.3)

**关键结论**：
- 笔记本 adb 在 `C:\Users\pass\AppData\Local\Android\Sdk\platform-tools\adb.exe`，`adb devices` 认平板
- **Termux 的 RUN_COMMAND intent 以 shell(2000) 用户运行，无法访问 /data/data/com.termux/（Permission denied），配不了 Termux**；只能靠 UI 模拟输入
- **adb input text 注入命令**（鸿蒙可行，关键技巧）：
  - PowerShell 传参给 adb.exe 时双引号会被吃掉 → 用**无引号 + 反斜杠转义**：`input text echo%sTEST\>/sdcard/x.txt`
  - `%s` = 空格，`\>` = `>`，`\&\&` = `&&`，`\$PREFIX` = 字面 `$PREFIX`（bash 里展开）
  - 验证：命令结果写 `/sdcard/xxx.txt` → `adb pull` 读（Termux 写 /sdcard 需先 `pm grant com.termux android.permission.{READ,WRITE}_EXTERNAL_STORAGE`）
  - 鸿蒙 `input` 工具常报 `Failed transaction (2147483646)`（tap/keycombination），但 `input text` 注入可用
  - 终端画面验证：`adb shell screencap -p /sdcard/x.png` + `adb pull` + 容器 tesseract OCR（装 `tesseract-ocr tesseract-ocr-chi-sim`）
- **Termux 首次 pkg 前必须换源**：默认/termux-change-repo 选的镜像不可靠（选到 ravidwivedi.in 印度源下载失败）。直接用清华源：`echo deb https://mirrors.tuna.tsinghua.edu.cn/termux/termux-packages-24 stable main > $PREFIX/etc/apt/sources.list`（URL 验证 HTTP 200，中科大该路径 404）
- **termux-change-repo 残留进程会阻塞终端 + 覆盖 sources.list** → `adb shell am force-stop com.termux` 干净重启后再操作
- 装好 openssh 后：`mkdir -p ~/.ssh`，公钥文件先 `adb push` 到 /sdcard 再 `cat /sdcard/key.pub >> ~/.ssh/authorized_keys`（避免长 pubkey 经 input text 截断），`chmod 600`，`sshd` 启动监听 8022
- **SSH 通道一旦建立，后续所有配置走 SSH（比模拟输入可靠百倍）**：`ssh -p 8022 -i /root/.ssh/tablet_termux u0_a417@192.168.3.21`
- Termux SSH 用户 = `u0_a417`（whoami），HOME=/data/data/com.termux/files/home
- 保活：`termux-wake-lock` + `cmd appops set com.termux RUN_IN_BACKGROUND allow` + `dumpsys deviceidle whitelist +com.termux`；鸿蒙私有"应用启动管理"（手机管家）杀后台需用户手动设置或接受按需唤醒
- 密钥：容器 `/root/.ssh/tablet_termux`（私钥）+ `.pub`（公钥，已进平板 authorized_keys）

**待办/注意**：重启平板或 Termux 后需重新启动 sshd（可装 Termux:Boot 开机自启）；平板 IP 192.168.3.21 可能随 DHCP 变化，长期用建议 DHCP 保留或查 IP

### Metadata
- Source: lesson
- Tags: termux, openssh, adb, huawei-tablet, remote-control, input-text
- Reproducible: yes

---

## [LRN-20260809-007] tablet-headless-chromium-search-service

**Logged**: 2026-08-09T20:15:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

**背景**：接 LRN-006，把平板(192.168.3.21:8022)配成软路由的"真实浏览器搜索工具"，headless Chromium 149 + CDP，软路由容器直接调用

**安装 chromium 的坑**：
- Termux 0.118 chromium 在 x11-repo：`pkg install -y x11-repo && pkg install -y chromium`
- **ffmpeg postinst 失败 `cannot locate symbol __from_chars_floating_point... referenced by libplacebo.so`** = libc++ 版本太老 → 跑 `pkg upgrade`（会升级 libc++/libplacebo 修复）
- **pkg upgrade 后台(nohup)遇 conffile 提示卡死**（openssl.cnf，stdin EOF 中断）→ 用 `dpkg --force-confold --force-confdef --configure -a` 非交互重配
- chromium 二进制是 `$PREFIX/bin/chromium-browser`(launcher)，headless 用 **`$PREFIX/bin/headless_shell`** 最干净

**CDP 架构**：
- `headless_shell --headless --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=$HOME/.chromium-data about:blank &`
- CDP 默认绑 127.0.0.1，**`--remote-debugging-address=0.0.0.0` 在 headless_shell 无效**
- 用 **socat 转发**：`socat TCP-LISTEN:9223,bind=0.0.0.0,fork,reuseaddr TCP:127.0.0.1:9222 &`（不能用同端口 9222，地址重叠报 Address already in use）
- 容器访问 `http://192.168.3.21:9223/json/version` 即 CDP；`PUT /json/new?url=...` 建页、`PUT /json/close/<id>` 关页

**搜索工具（容器 `/root/cdp_tool.py`）**：
- `python3 /root/cdp_tool.py search "关键词"` → Bing(cn.bing.com) 结构化结果；`fetch <url>` → 标题+正文(JS 渲染可抓)；`list`
- CDP 每次**新建独立页面用完关闭**（避免 pick_page 选中卡住的页导致超时）；容器 python 装 `python3-websockets`(apt)
- cn.bing.com 选择器：`#b_results li h2 a[href]`（h2 内取标题），国内版可用

**稳定性与自启**：
- 息屏冻结仍存在（即便设了鸿蒙应用启动管理白名单，SSH/CDP 间歇断；TCP 是 refused 而非 timeout=进程冻结非断网）
- 重启平板后需跑 `bash oc_start.sh`（已部署平板 $HOME）：重启 headless_shell + socat（pkill 先清旧进程）
- 待改进：Termux:Boot 开机自启（未做）

**Termux:Boot 开机自启**（2026-08-09 完成）：
- **鸿蒙装 APK 的坑**：`termux-open`/`am start VIEW file://`/用户文件管理全部报"解析包时出现问题"——**鸿蒙安装器不接受 file:// URI**（`unable to resolve Intent`），文件本身完好（aapt badging 正常，minSdk21/targetSdk28）。**只有 adb install 能装**（数据线直连）。之前用户文件管理手动装也失败，同因
- debug 版（GitHub `+github.debug.apk`）和 F-Droid 正式版（`com.termux.boot_1000.apk`）都能 `adb install -r -t` 成功
- 配置：`~/.termux/boot/oc_boot.sh`（调用 oc_start.sh）→ 开机自动起 chromium+socat
- 保活：`cmd appops set com.termux.boot RUN_IN_BACKGROUND allow` + `dumpsys deviceidle whitelist +com.termux.boot`；鸿蒙"应用启动管理"仍建议手动允许 Termux 和 Termux:Boot 自启动
- 验证：`bash oc_start.sh` 后容器 `curl 192.168.3.21:9223/json/version` 返回 HeadlessChrome，`cdp_tool.py search` 端到端可用
- **oc_start.sh 必须含 sshd**（`pgrep -x sshd >/dev/null 2>&1 || sshd`），否则重启后 SSH 管理通道会断（本次遗漏，靠 adb 模拟输入 `sshd` 补启后修正）
- **重启实测通过**（2026-08-09 用户重启平板）：chromium headless + socat + sshd 全部开机自启成功，IP 不变(192.168.3.21)，SSH/CDP/搜索端到端全通
- 偶发：cdp_tool search 偶尔标题空（Bing 动态渲染差异），重试或换查询词即恢复，非架构问题

### Metadata
- Source: lesson
- Tags: termux, chromium, headless, cdp, search, tablet, socat
- Reproducible: yes

---

## [LRN-20260809-008] tablet-usb-router-adb-keepalive-ip-bind-ocr-images

**Logged**: 2026-08-09T21:30:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

**背景**：接 LRN-006/007 平板搜索节点，本次收尾：平板 USB 直连软路由、adb 双通道、授权/开发者模式持久性、主路由 IP 绑定、以及 opencode 图片 OCR 读取方法

**平板 USB 直连软路由**：
- 软路由仅 2 个 USB 口：**1-1=华为平板 DBY-W09**(vendor 12d1)、**4-1=WD Elements 移动硬盘**(vendor 1058，挂载 /mnt/usb4-1)，无冲突
- 软路由宿主已装 adb（`/usr/bin/adb`），`adb devices` 直接识别平板（usb:1-1），状态 `device`（已授权）
- **adb 授权持久性**：用户点"始终允许"后，软路由 adb 公钥写入平板 `/data/misc/adb/adb_keys`，**重启后仍有效无需重新确认**；只有"撤销 USB 调试授权"或换新 adb 主机才需重新授权
- **开发者模式 + USB 调试重启后保持**（持久化系统开关，重启不重置；系统升级/恢复出厂才会重置）
- 平板 USB 连软路由后 = 第二管理通道（adb 走 USB，SSH/CDP 走 WiFi），adb 可装 APK/改设置/诊断/模拟输入，即使 WiFi 冻结也能用 adb 恢复

**主路由 DHCP 静态绑定**：
- 用户在主路由(192.168.3.1)把平板 MAC `62:2C:92:28:23:89` 绑定 IP **192.168.3.21**（与笔记本、软路由一起在绑定列表），IP 永不变化，搜索工具地址稳定

**opencode 图片 OCR 读取（重要新能力）**：
- 用户上传的图片以 **base64 data URI 存在 SQLite 的 part 表**（`type='file'`，字段 `url="data:image/webp;base64,..."`），不在文件系统
- 提取方法（只读管道，不落盘）：`python3 -c "...SELECT url FROM part WHERE json_extract(data,'$.type')='file'..." | base64解码 | tesseract stdin stdout -l chi_sim+eng`
- 容器已装 tesseract-ocr + chi_sim，能识别中文截图；webp 直接支持
- 模型不支持图片输入，但**可通过 OCR 间接读取用户发的截图**（如错误弹窗、设置界面）

**稳定性现状**：重启后自启全通过，IP 绑定后地址稳定，USB adb 常驻可兜底恢复；24h 长期息屏在线未做完整观察（用户选择先放着，若偶发冻结可 adb 唤醒或 `bash oc_start.sh`）

### Metadata
- Source: lesson
- Tags: tablet, usb, adb, keepalive, ip-bind, ocr, images
- Reproducible: yes

---

## [LRN-20260809-009] tablet-chromium-openclash-proxy-bypass

**Logged**: 2026-08-09T22:50:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

**背景**：把平板 headless Chromium 挂上软路由 OpenClash 代理，扩展搜索能力到海外站（方案 A：只影响搜索工具，其他 app 不动）。

**结论：平板流量默认不走代理**：平板连主路由 WiFi「mo」，网关 192.168.3.1，HTTP 代理 NONE，直连海外被墙（google 000、github 8s）。OpenClash 7890(HTTP)/7891(SOCKS5) allow-lan 已开但**带 Basic 认证**（uci `openclash.@authentication[0]`，Clash/vOknt8m0），无凭据访问 407。

**关键坑：Chromium 的 `--proxy-server` 不支持 URL 内嵌认证**（`http://user:pass@host:port` 的 userinfo 被忽略/解析异常），所有请求被 407 拒绝（连 example.com 都 chrome-error）。curl 可内嵌认证但 Chromium 不行。**解法：关闭 OpenClash 代理认证**（`uci set openclash.@authentication[0].enabled='0'` + commit + `/etc/init.d/openclash restart`，备份在 `/root/openclash.uci.bak.20260809224251`）。家庭内网风险可接受。

**最终方案（国内直连 + 海外走代理）**：
- 平板 `oc_start.sh` 的 headless_shell 加：
  `--proxy-server=http://192.168.3.100:7890 --proxy-bypass-list=*.bing.com;*.cn;*.baidu.com;*.qq.com;*.taobao.com;*.jd.com;*.163.com;*.weibo.com;192.168.*;localhost`
- **bypass-list 必须**：海外机房代理 IP 会让 Google/Bing 触发"unusual traffic"验证码（google /sorry 页、Bing"请解决难题"）。cn.bing.com 是 *.bing.com 子域，走 bypass 直连恢复国内正常搜索；`*.cn` 覆盖大部分国内站
- 验证结果：cn.bing.com search 直连正常返回结果；google.com 走代理可达（首页抓取成功，但搜索页仍会触发验证码——出口 IP 信誉问题，站可达即可）
- `oc_start.sh` 同时被 Termux:Boot 开机自启调用，重启平板自动生效

**运维注意**：
- 若以后想恢复 OpenClash 认证：Chromium 无命令行认证方案（headless 无对话框），需换思路（如 chromium 前置剥认证代理或改走 TUN）
- 重启平板后若 CDP 9223 连不上（Connection refused），多为 socat 没起来，`setsid bash oc_start.sh </dev/null >/dev/null 2>&1 &` 后台重启即可（直接 `bash oc_start.sh` 后台 chromium 会挂住 SSH 会话致超时）

### Metadata
- Source: lesson
- Tags: tablet, chromium, proxy, openclash, authentication, bypass-list, google, bing
- Reproducible: yes

---

## [LRN-20260810-001] webui-session-list-project-cache-mismatch

**Logged**: 2026-08-10T07:45:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

### Summary
软路由 opencode Web UI（`http://192.168.3.100:4096`）主页"最近会话"为空，即使数据库里有 37 条历史会话。根因：**Web UI 会话列表只显示"当前项目目录"（浏览器 localStorage 的 `lastProject`）下的会话**，而全部会话都在 `/` 根目录，浏览器缓存的旧项目（opencode/root/tmp 等）指向错误目录。原生客户端（如 OC Remote）无此问题，因为它直接调 `/api/session` 列出全部会话。

### 关键结论
1. **Web UI 会话 = 按项目目录过滤**：主页请求 `GET /api/session?limit=5000&order=desc`（不带 directory）返回全部会话，但前端按当前 project 的 worktree 再过滤 → 只有 worktree 匹配 `session.location.directory` 的才显示
2. **项目状态存浏览器 localStorage**：key `opencode.global.dat:server`，结构 `{list:[],projects:{local:[{worktree:"/",expanded:true}]},lastProject:{local:"/"},"recentlyClosed":{}}`。**侧边栏项目列表来自浏览器缓存，不是服务端**（服务端 `/api/project` 在该版本返回 SPA HTML，非 JSON）
3. **目录编码**：URL 路由 `/{base64url(directory)}/session/{sessionID}`。Base64URL = UTF-8 → Base64 → `+`→`-`、`/`→`_`、去 `=`。根目录 `/` → `Lw`；`/root` → `L3Jvb3Q`。完整列表 URL：`http://192.168.3.100:4096/Lw`
4. **直接访问 `/Lw` 会被重定向到 new-session**（`/` 目录无 `.opencode`/git 标记，Web UI 判定非有效项目）→ 需先设 localStorage 再点"主页"按钮
5. **API 验证快捷方法**（无需浏览器）：`curl -u opencode:<密码> "http://192.168.3.100:4096/api/session?directory=/&roots=true&limit=3"` → 返回 JSON；`directory=/root` → 空。用这个判断"该目录下有没有会话"

### 修复方法（浏览器 Console 一行）
```js
localStorage.setItem('opencode.global.dat:server', JSON.stringify({list:[],projects:{local:[{worktree:'/',expanded:true}]},lastProject:{local:'/'},recentlyClosed:{}})); location.href='http://192.168.3.100:4096/Lw';
```
或手动：侧边栏"添加项目"→ 搜索框输 `/` → 点"最近项目"分组里的 `/`（勿点下面 dev/etc/tmp 子文件夹）。

### 附带发现
- 软路由 opencode 跑 Docker 容器（`opencode-arm64:1.18.15`），数据在 host `/etc/opencode/data/opencode.db`（挂载到容器 `/root/.local/share/opencode/`）
- 软路由无 `sqlite3`/`python3`/`node`，查库方法：`scp` 拉 db 到本机用 sqlite3 查，或 `strings <db> | grep`
- Basic Auth：用户名 `opencode`，密码在容器 env `OPENCODE_SERVER_PASSWORD`
- OpenCLI 可用真实 Edge 浏览器操作：`opencli browser oc open <url>`、`eval` 注入 localStorage、`click N`、`state`（详见 docs/opencli-agent-reach.md）
- `GET /api/project` 在该版本返回 SPA HTML（非 JSON），勿用 curl 验证项目列表；用 `/api/session` 验证会话

### Metadata
- Source: lesson
- Tags: opencode, webui, session, project, localStorage, base64url, docker, api
- Related Doc: docs/opencode-web-mobile.md（已更新 §9 查看历史会话）
- Reproducible: yes

---

## [LRN-20260810-002] syncthing-laptop-tray-migration-synctrayzor

**Logged**: 2026-08-10T08:00:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
完成笔记本 Syncthing 从命令行/计划任务方式迁移到 **SyncTrayzor 托盘 GUI**，并打通软路由↔笔记本 `.learnings` 双向同步（folder `opencode-learnings`，两端 syncthing v1.30.0）。

### 关键事实
- 笔记本：Windows 11，SSH `pass@192.168.3.53`（密钥免密），opencode 配置 `C:\Users\pass\.config\opencode\`
- 笔记本 Tailscale `100.71.42.119`，与软路由 syncthing 经 Tailscale 直连（22000）
- **用户上次用的"托盘同步软件"就是 SyncTrayzor**（内置 syncthing v1.18.1，历史日志可见 v1.18.1 反复报 config 版本过高）
- 软路由 syncthing 数据：`/mnt/usb4-1/syncthing`，GUI/API `0.0.0.0:8384`，apikey 在 config.xml

### 同步架构（已落地）
- 单 folder `opencode-learnings` 双向（sendreceive）：软路由 `/etc/opencode/.learnings`（容器挂载 `/root/.config/opencode/.learnings`）⇄ 笔记本 `C:\Users\pass\.config\opencode\.learnings`
- 命名分离写入者：软路由只写 `ROUTER-*.md`，笔记本写 `LEARNINGS/ERRORS/FEATURE_REQUESTS/TAVO` 等；`.stignore` 排除 `.stversions`/`.sync-conflict-*`
- 两端 syncthing **必须同版本 v1.30.0**（config version 37；v1.18.1 只支持 ≤35）

### 关键坑（全部实测）
1. **SyncTrayzor 实际运行的 syncthing.exe 副本在 `%APPDATA%\SyncTrayzor\syncthing.exe`**，不是安装目录 `C:\Program Files\SyncTrayzor\syncthing.exe`！替换安装目录无效。替换 `%APPDATA%` 副本才生效
2. **SyncTrayzor 内置 syncthing 太老（v1.18.1）**，读不了新版 config（version 37>35）→ 启动即崩。解法：用同版本 v1.30.0 覆盖副本
3. **SSH 会话启动的进程在会话结束后被杀**（Windows OpenSSH job object）：Start-Process 启动的 syncthing/SyncTrayzor 都活不过 SSH 断开。**必须用 Task Scheduler**（`Register-ScheduledTask` + `Start-ScheduledTask`，ONLOGON 触发器）启动，进程在 Console 会话持续
4. `schtasks /Create` 命令行方式启动任务不牢靠，PowerShell 原生 `Register-ScheduledTask` cmdlet 更稳
5. SyncTrayzor 首次启动自动注册开机自启（注册表 Run：`SyncTrayzor.exe -minimized`），无需手动配自启
6. 首次合并同步会产生 `.sync-conflict-*` 副本（两端旧文件版本号不同）→ 已手动清理，`.stignore` 已排除后续
7. 笔记本 syncthing GUI 默认 `127.0.0.1:8384`，远程管理需改 `0.0.0.0:8384` + 防火墙放行（`netsh advfirewall`）；Tailscale IP 22 端口默认被防火墙挡，SSH 走局域网 IP

### 远程操作链路（软路由→笔记本）
- 传输文件：宿主 `/mnt/usb4-1` 未挂载进容器 → 用宿主 `cp` 到 `/etc/opencode/.tmp`（挂载点）→ 容器 SCP 到笔记本
- 笔记本 syncthing API 远程管理：`curl -H "X-API-Key: <apikey>" http://192.168.3.53:8384/rest/...`（apikey 在笔记本 `%LOCALAPPDATA%\Syncthing\config.xml`）
- PowerShell 脚本经 SCP 传输后 `powershell -ExecutionPolicy Bypass -File` 执行，避免 ssh 多层引号转义

### Metadata
- Source: conversation
- Tags: syncthing, synctrayzor, windows, ssh, tailscale, sync, learnings, opencode
- Related Doc: AGENTS.md（经验记录规范·同步机制）
- Reproducible: yes

---

## [LRN-20260810-003] syncthingtray-not-synctrayzor-laptop-tray

**Logged**: 2026-08-10T08:15:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: laptop-only

### Summary
**纠正 LRN-20260810-002 的选型错误**：用户笔记本真正用的托盘同步软件是 **syncthingtray**（Martchus/syncthingtray，持续活跃更新），**不是 SyncTrayzor**（已停更 5 年，v1.1.29/2021-08-07）。本次已卸载 SyncTrayzor，改用 syncthingtray v2.1.3 并复用用户 8 月 8 日遗留的旧配置。

### 判定依据
- 笔记本 `%APPDATA%\syncthingtray.ini` 时间戳 **2026-08-08**（用户上次使用），内容 `v=2.1.3`、locale `zh_CN`、连接 `http://127.0.0.1:8384` —— 用户上次装的就是 syncthingtray
- SyncTrayzor 最后 release 2021-08-07（停更），内置 syncthing v1.18.1；syncthingtray 最新 2026-07-09（每月发版）—— 符合用户"一直在更新"的描述

### syncthingtray 配置要点（Windows，全部实测）
1. **便携版**：`syncthingtray-<ver>-x86_64-w64-mingw32.exe.zip` 解压即用（syncthingtray.exe 95MB），**无需安装**
2. **配置**：`%APPDATA%\syncthingtray.ini`（QSettings INI 格式，`[General] v=版本号`）。关键键：
   - `connections\1\syncthingUrl=http://127.0.0.1:8384`、`connections\1\apiKey=@ByteArray(<apikey>)`（须与 syncthing config.xml 当前 apikey 一致）
   - `[startup] syncthingPath=<外部 syncthing 绝对路径>`（可指独立下载的 syncthing.exe，版本与软路由一致 v1.30.0）、`syncthingArgs="serve --no-browser --logflags=3"`、`syncthingAutostart=true`、`considerLauncherForReconnect=true`
   - 用 launcher 启动外部 syncthing 时，config 目录仍为 syncthing 默认 `%LOCALAPPDATA%\Syncthing`（复用现有 device ID/folder）
3. **SSH 会话杀进程**：syncthingtray 同样会被 Windows OpenSSH 会话终止 → 用 `Register-ScheduledTask`（AtLogOn）保活，进程在 Console 会话持续
4. syncthingtray 启动的 syncthing 监听 `0.0.0.0:8384`（可远程 API 管理）
5. scp 传输的 exe 无 Mark-of-the-Web，SmartScreen 不拦截（GitHub 直下 zip 解压需留意）

### Metadata
- Source: conversation
- Tags: syncthingtray, synctrayzor, syncthing, windows, tray, laptop
- Related Doc: AGENTS.md（同步机制）
- Reproducible: yes

---

## [LRN-20260810-004] windows-openssh-host-key-rebuilt-host-key-verification-failed

**Logged**: 2026-08-10T08:30:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
SSH 到笔记本（`pass@192.168.3.53`）报 `Host key verification failed`，排查确认是 **Windows OpenSSH host key 被整体重建**（2026-08-09 16:13），known_hosts 存的是旧 key 导致拒绝。清 known_hosts 重接受即恢复。

### 关键认知
1. **SSH 是短连接，不是常驻**：每次 `ssh 命令` 都是建连→握手→执行→断开，用完即断，不保持在线。所以"先前连过"≠"现在能连"，连不上先确认**目标机是否在线**（睡眠/关机就是连不上，与 SSH 无关）
2. **host key 变化 = OpenSSH 身份重建**：host key 是 sshd 服务器身份（`C:\ProgramData\ssh\ssh_host_*_key`），正常重启用不变；**整体重建**（时间戳看全部 key 同时更新）常见于 Windows 组件更新/OpenSSH 修复重装/系统还原。已知重建时间：**2026-08-09 16:13**
3. 指纹（ED25519）：`SHA256:W0nvXeqjy1hw3/mcf00NSoGND+H9Lz5XLM9Jl8FILHo`（system@LAPTOP-0FAT5C1B），已记录到 AGENTS.md

### 排查/修复步骤（全流程实测）
```bash
# 1. 确认笔记本在线（不在线先 etherwake 唤醒）
ip neigh | grep -i 74:d7:13
# 2. 报 host key 错误时：查看笔记本 host key 是否重建（时间戳）
ssh pass@192.168.3.53 "powershell -NoProfile -Command \"Get-ChildItem C:\ProgramData\ssh\ssh_host_*key* | Select Name,LastWriteTime\""
# 3. 修复：清旧记录 + 重新接受
ssh-keygen -R 192.168.3.53
ssh -o StrictHostKeyChecking=accept-new pass@192.168.3.53 "echo ok"
# 4. 校验新指纹
ssh-keygen -lf /root/.ssh/known_hosts   # 应含 SHA256:W0nvXeqjy1hw3/mcf00NSoGND+H9Lz5XLM9Jl8FILHo
```

### Metadata
- Source: conversation
- Tags: ssh, openssh, host-key, windows, laptop, troubleshooting
- Related Doc: AGENTS.md（SSH 连接笔记本）
- Reproducible: yes

## [LRN-20260810-023] cross-device-memo-system

**Logged**: 2026-08-10T01:30:00+08:00
**Priority**: medium
**Status**: done
**Area**: config
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
实现跨对话/跨设备备忘录：两端 AGENTS.md 加「记忆检索 + 即时备忘」规则，`.learnings/` 下新增 ROUTER-MEMO.md（软路由）与 MEMO.md（笔记本），经 syncthing 双向同步实现跨会话问答。

### Details
- 用户本想要 Obsidian 笔记软件，经分析其真实诉求是"直接问 AI 就能答"而非"自己翻看"→ 放弃 Obsidian，纯 MD 方案
- 关键机制：AGENTS.md 每会话自动注入（instructions），规则写进去即全会话生效；.learnings syncthing 双向同步 → 两端 AI 读同一份记忆
- 防冲突：软路由只写 ROUTER-MEMO.md，笔记本只写 MEMO.md（命名分离=写入者分离）
- 检索纪律：回答"以前记住/之前设置"类问题时必须先 grep 两端记忆文件，禁止凭空猜测
- 笔记本 AGENTS.md 经 scp 传回（UTF-8 无 BOM），原文件已备份 AGENTS.md.bak-memo

### Suggested Action
- 笔记本端若缺 /记住 命令的备忘分支可后续对齐
- 若规则不够强制（AI 偶尔不查），可把 .learnings 加入 opencode.json instructions 直接注入（增 token，暂缓）

### Metadata
- Source: conversation
- Tags: memo, cross-device, memory, AGENTS, syncthing
- Related Doc: AGENTS.md（两端）

## [LRN-20260810-024] memo-auto-capture

**Logged**: 2026-08-10T01:45:00+08:00
**Priority**: medium
**Status**: done
**Area**: config
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
备忘录升级为"自动记录"模式：对话中出现配置变更/决策/偏好/账号/IP 等有长期价值信息时，AI 立即主动写入本端 MEMO 文件，无需用户说"记住"。

### Details
- 用户反馈"更希望自动记录"→ 把 AGENTS.md「即时备忘规则」升级为「自动记录规则」+ 触发场景表（记什么/不记什么）
- 触发场景：配置修改/服务变更/重要决策/用户偏好/长期事实→记；临时琐事/纯问答→不记
- 写入格式保持一行式带标签（#配置 #决策 #偏好 #服务 #账号），同主题追加新条目保留历史
- 本次对话产出已自动记录 4 条（决策/机制/gowebdav 配置/备份），并验证同步到笔记本
- 两端 AGENTS.md + 两端 MEMO.md 均已更新，规则一致

### Suggested Action
- 持续观察自动记录是否触发及时；若偶发漏记，可在 /记住 命令收尾时增加"复查本次对话有无应记未记"步骤

### Metadata
- Source: conversation
- Tags: memo, auto-capture, AGENTS, cross-device
- Related Doc: AGENTS.md（两端）

---

## [LRN-20260810-025] doubao-win-monitor-mimo-vision

**Logged**: 2026-08-10T09:58:00+08:00
**Priority**: high
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
豆包输入法 Windows 版监控已建(firecrawl monitor + 邮箱提醒)，识图方案确认 opencode-go/mimo-v2.5 可用。

### Details
1. **豆包监控**：firecrawl_monitor_create 监控 https://shurufa.doubao.com/，每天 1 次，页面出现"Windows版下载"时发邮件到 mario.mo.prc@foxmail.com。Monitor ID: 019fe964-cd37-77dd-bbc6-c24ab4d8240a。邮箱需点确认链接激活(notification status: confirmed)。
2. **识图方案**：当前默认模型 deepseek-v4-flash 不支持图片输入，发图报错"this model does not support image input"。用户确认 Gemini API 免费无额度需付费，去掉该方案。改为 opencode-go/mimo-v2.5(官方文档确认支持 input: [text, image]，issue #29956 实测 vision 可用)。操作：手机 web 新会话选 mimo-v2.5 再上传图片。
3. **关键发现**：报错 "Cannot read XXX (this model does not support image input)" 是 opencode 在客户端层面拒绝读取附件，不是文件上传失败。换支持图片的模型即可解决。

### Suggested Action
- 遇到图片输入报错时，先确认当前模型是否支持 vision，再考虑换模型或用 MCP/外部 OCR
- firecrawl monitor 邮箱通知需用户点确认链接才能激活，建完后提醒用户查邮箱

### Metadata
- Source: conversation
- Tags: firecrawl-monitor, mimo, vision, doubao, ocr, doubao-ime
- Related Skill: configuration
- Related Doc: AGENTS.md (工具可用性)

---

## [LRN-20260810-026] mimo-v25-vision-supported-on-opencode-go

**Logged**: 2026-08-10T09:58:00+08:00
**Priority**: medium
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
opencode-go/mimo-v2.5 支持图片输入(vision)，是软路由无浏览器环境下的轻量识图方案。

### Details
- opencode-go provider 下 mimo-v2.5 模型支持 input: [text, image]（MiMo 官方文档确认）
- issue #29956 实测数据点：mimo-v2.5 在 opencode-go 上 vision 可用（直接对话 + read 工具均可）
- issue #28614 提到 custom provider 下 mimo-v2.5 的 vision 被错误阻止，但 opencode-go 内置模型不受影响
- mimo-v2.5-pro 不支持图片（仅 text），不要混淆
- 当前 opencode-go 模型列表中 mimo-v2.5 可用：`opencode-go/mimo-v2.5`

### Suggested Action
需要轻量识图时，直接用 opencode-go/mimo-v2.5，无需外部 API（Gemini/OCR）

### Metadata
- Source: conversation
- Tags: mimo, vision, opencode-go, model, multimodal
- Related Skill: configuration
- Related Doc: AGENTS.md (工具可用性)

---

## [LRN-20260810-027] firecrawl-monitor-email-confirmation-required

**Logged**: 2026-08-10T09:58:00+08:00
**Priority**: medium
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
firecrawl_monitor_create 的邮箱通知需用户点确认链接激活，否则不会发送邮件。

### Details
- 创建 monitor 时设置 email 参数后，Firecrawl 会发一封确认邮件到该邮箱
- 邮件订阅状态为 pending，需用户点击确认链接后变为 confirmed
- 未确认状态下，monitor 会正常运行但 notificationStatus 中 attempted=false
- 确认后 notificationStatus 中 pendingRecipients 会变为 0，recipients 正常

### Suggested Action
建完 firecrawl monitor 后，提醒用户去邮箱点确认链接。可以用 firecrawl_monitor_get 检查 emailRecipientSubscriptions[0].status 是否为 confirmed

### Metadata
- Source: conversation
- Tags: firecrawl, monitor, email, confirmation
- Related Skill: configuration
- Related Doc: AGENTS.md (工具可用性)

## [LRN-20260810-028] tailscale-exitnode-routes-hijack-lan

**Logged**: 2026-08-10T18:35:00+08:00
**Priority**: high
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
Windows 笔记本 Tailscale 设置 `RouteAll: true` + `ExitNode: istoreos` 时，会把内网 `192.168.3.0/24` 整段也路由进隧道（metric 0 抢过 WLAN 直连 256），导致：luci 后台连不上、外网断、但隧道自身 ping 通、部分端口（如 4096）因隧道回环恰好可达。手机正常是因为 Android Tailscale 不接管同网段直连。

### Details
- 症状：电脑 Tailscale 连不上软路由后台（手机可以）、外网断、内网加载中，同时 OpenCode 桌面客户端卡住
- 根因链：`0.0.0.0/0 → Tailscale`（exit node 全流量） + `192.168.3.0/24 → Tailscale`（RouteAll 子网路由）双劫持
- 验证方法：`ping -S <WLAN本机IP> 192.168.3.1` 绕过隧道路由直测 WLAN，通（1ms）即证明 WLAN 正常、问题在隧道路由
- 修复：`tailscale set --exit-node= --accept-routes=false`，立即生效，路由表恢复 WLAN 直连
- 复验：192.168.3.0/24 回 WLAN 直连、luci:80 通、baidu.com:443 通
- OpenCode 桌面客户端卡住是**次生问题**：在网络断时启动，卡在 `Failed to fetch models.dev` 超时 + MCP（github/tavily/exa/firecrawl）全连不上，网络恢复后不自愈，需 `Stop-Process -Name OpenCode` 重启

### Suggested Action
- 笔记本上 exit node / RouteAll 用于外出时翻墙，但在**家内网场景**会自伤：建议平时关掉，或只在不在家时临时开
- 桌面客户端若启动时网络异常导致卡死，先修网络再重启客户端

### Metadata
- Source: conversation
- Tags: tailscale, exit-node, routall, 网络排障, opencode-client
- Related Doc: AGENTS.md (SSH 连接笔记本)

## [LRN-20260810-029] tailscale-exitnode-broken-under-openclash

**Logged**: 2026-08-10T19:05:00+08:00
**Priority**: high
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
笔记本用软路由(istoreos)做 Tailscale exit node 翻墙**不通**：TCP 数据面有时通有时不通、UDP/DNS 完全挂（netcheck UDP:false）。根因是软路由 OpenClash(fake-ip-tun) 接管了 exit node 流量但转发黑洞。手机"开着 exit node 没事"是因为 Android 访问内网后台走本地网段直连，根本不进隧道。

### Details
- 测试配置：`tailscale set --exit-node=istoreos --accept-routes=false`（只开 exit node，关 RouteAll）
- 结果：内网 luci:80 通（192.168.3.0/24 走 WLAN 直连 ✅）、外网不通（baidu curl 000、TCP 223.5.5.5:53 不稳定、UDP DNS 全超时）
- tcpdump tailscale0 抓到零星 TCP 回包，但笔记本 UDP 53 完全没进隧道
- 软路由侧 nslookup 223.5.5.5 正常（UDP 通）→ 问题在 exit node 转发路径（OpenClash fake-ip-tun 与 tailscale 冲突），不在软路由自身外网
- 手机"没事"的真相：Android Tailscale 默认放行当前 Wi-Fi 本地网段直连，访问 192.168.3.100 后台走 WLAN 直连不进隧道，与 exit node 无关
- 最终方案：笔记本纯直连（`--exit-node= --accept-routes=false`），在家不需要 exit node，一切正常

### Suggested Action
- 笔记本在家内网：保持 exit node 关闭、RouteAll 关闭，纯直连最稳
- 外出需要翻墙时再临时开 exit node，若也不通则用其他翻墙手段（笔记本自带 OpenClash/Clash Verge 等），软路由 exit node 在此网络环境不可靠
- 手机访问内网后台与其 exit node 设置无关（本地网段直连），用户无需担心

### Metadata
- Source: conversation
- Tags: tailscale, exit-node, openclash, fake-ip-tun, 网络排障
- Related Doc: AGENTS.md (SSH 连接笔记本)

## [LRN-20260810-030] tailscale-exitnode-fix-disable-magicdns-restart

**Logged**: 2026-08-10T19:40:00+08:00
**Priority**: high
**Status**: done
**Env**: softrouter-openclash
**Scope**: cross-env

### Summary
笔记本用软路由做 Tailscale exit node 翻墙失败的解法找到了：**关闭 MagicDNS（`--accept-dns=false`）+ 重启 Tailscale 服务**。关键坑：改完 prefs 后 exit node 路由不会立即生效（Find-NetRoute 仍走 WLAN、istoreos 状态 idle、`0.0.0.0/1` 路由缺失），**必须重启服务**才会安装 `/1` 高优先级路由让流量进隧道。且 exit node 首次走 relay(DERP) 而非直连也正常，不影响连通。

### Details
- 最终成功配置：`tailscale set --accept-dns=false --exit-node=istoreos --accept-routes=false` + `Restart-Service Tailscale`
- 关闭 MagicDNS 后 DNS 走 WLAN 网关 192.168.3.1（nslookup 正常），绕开与 OpenClash fake-ip-tun 的 DNS 冲突（此冲突曾导致 UDP/DNS 全挂、TCP 时通时不通、UDP 包不进隧道）
- 重启服务前症状：tailscale status 显示 istoreos "idle; exit node"、Get-NetRoute 无 `0.0.0.0/1`/`128.0.0.0/1`、Find-NetRoute 1.1.1.1 走 WLAN、tailscale0 零抓包
- 重启后症状：istoreos "active; exit node"（首次走 relay "sin" 后转 direct）、/1 路由出现、Find-NetRoute 走 Tailscale、外网全通
- 验证全通：luci:80、baidu:443、google:443(HTTP200)、youtube:443、8.8.8.8:53、api.ipify.org 出口 IP 67.159.52.12（非本地，翻墙生效）
- 手机对比结论：手机 Android VpnService 模式无此问题；Windows 端的关键是"关 MagicDNS + 重启服务"

### Suggested Action
- 笔记本要用软路由 exit node 翻墙：`tailscale set --accept-dns=false --exit-node=istoreos --accept-routes=false` 然后 **必须重启 Tailscale 服务**
- 若以后又出现外网不通但配置看起来对：先看 tailscale status 是否 "active; exit node"，不是就重启服务
- 在家不需要翻墙时：`--exit-node= --accept-routes=false` 恢复直连（MagicDNS 可保持关闭，DNS 用 192.168.3.1 无碍）

### Metadata
- Source: conversation
- Tags: tailscale, exit-node, magicdns, restart-service, openclash, 网络排障
- Related Doc: AGENTS.md (SSH 连接笔记本)

---

## [LRN-20260811-031] reference-laptop-session-improve-router-config

**Logged**: 2026-08-11T12:00:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash
**Area**: config

### Summary
参考笔记本会话（ses_011c3908cffeBluktlhoSnHSm3，Windows-MCP+记忆治理+备份修复）对软路由 opencode 配置做了 4 项强化。

### Details
1. **宿主备份脚本** `/root/opencode-backup.sh`：tar 打包 `/etc/opencode`，排除 auth.json/data/node_modules/.git/stversions/bak，输出到 `/mnt/usb4-1/Backup/opencode-config-<时间>.tar.gz`，保留 7 份；cron `0 4 * * *` 每日备份（避开 03:00 系统重启）
2. **executor 子代理** `agents/executor.md`：ds-flash 执行者，多步任务委托，遇图委托 image-reader，禁止写记忆文件；opencode.json 加 `subagent_depth: 2`
3. **AGENTS.md「记忆库治理」** 4 条：>300KB 归档 50% 旧条目到 archive/、Promotion（≥3次/跨任务→AGENTS.md/docs）、每月 review、skill 抽取
4. **记住.md** 加 promotion/治理/抽取/统计反馈环节

### 关键教训
- 备份必须显式排除 `auth.json`/`.env`/`data/`（API key 明文风险），且 tar 的 `--exclude` 用**相对路径**（`opencode/auth.json`）而非绝对路径，否则排除失效
- 容器内配置目录与宿主 `/etc/opencode` 同步，备份在宿主侧执行（脚本写在宿主 /root/）
- 软路由不移植笔记本的 backup.ts（Windows/OneDrive robocopy 专用），用宿主 cron+tar 等价方案，不占容器内存

### Metadata
- Source: conversation
- Tags: backup, executor, memory-governance, config
- Related Doc: AGENTS.md「记忆库治理」章节

---

## [LRN-20260811-032] laptop-architecture-reversal-executor-removed

**Logged**: 2026-08-11T14:10:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash
**Area**: config

### Summary
笔记本会话（共享版，含更新至 1786427925501）对早先架构做了**反悔**：主模型从 mimo-v2.5 改回 deepseek-v4-flash、**删除 executor 子代理**、保留 subagent_depth:2、backup.ts 排除 syncthing 元数据。软路由据此对齐。

### Details
- **反悔原因**：executor 与 ds 主模型同模型（deepseek-v4-flash），无模型差异化价值；主模型本就是执行型，长任务直接执行即可，去掉更简单
- **保留** subagent_depth:2：防嵌套子代理导致上下文膨胀（主→子→孙 1 层余量）
- **mimo 主模型被否**：太慢（作为常驻主对话模型不划算），仅保留为 image-reader 看图用途
- 软路由动作：删除 `agents/executor.md`（仅剩 image-reader.md）、保留 subagent_depth:2、备份脚本补 `.stfolder/.stignore/.stversions` 排除
- **教训**：参考跨端会话时须读**最新完整版**（共享链接比早期片段新 2.4h），架构决定可能反转；先确认最终结论再对齐

### Metadata
- Source: conversation
- Tags: executor, architecture, subagent-depth, backup
- Related Doc: AGENTS.md

---

## [LRN-20260811-033] container-rebuild-toolchain-loss-and-recovery

**Logged**: 2026-08-11T14:40:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: infra

### Summary
软路由 opencode 容器重建事故：docker run 重建中途中断导致容器打炸，工具链丢失（ssh/curl/git/python3/docker-entrypoint.sh），笔记本 OC 通过重建镜像 + apt 补装 + SSH 密钥软链恢复。

### Details
- **事故链**：① 升级二进制 1.18.16（mv 替换成功）；② 想注入实验性 env → docker stop/rm/run 重建，命令中断 → 容器打炸 4096 失联；③ 笔记本 OC 用 docker start 先恢复，后重建完整镜像
- **根因**：原容器工具链是 Dockerfile apt 装的（node:20-slim 基础镜像不带），重建后全丢；docker-entrypoint.sh（恢复 SSH 密钥逻辑）也在镜像层丢失
- **恢复方案**（笔记本 OC 执行）：新镜像 opencode-arm64:1.18.16-full = node:20-slim + release linux-arm64 二进制 + apt 装 openssh-client/curl/git/python3 + `/root/.ssh` 软链到 `data/ssh-backup/id_ed25519`（挂载卷持久）+ 重建容器
- **关键教训**：
  1. **容器内非挂载层文件（/usr/local/bin、/docker-entrypoint.sh、/root/.ssh）都会随重建丢失**，须 commit 镜像或依赖挂载卷
  2. SSH 密钥放挂载卷（data/ssh-backup）软链回 /root/.ssh 是最稳方案（笔记本 OC 首创）
  3. 重建容器前必须完整备份 docker run 参数（env/挂载/端口/资源限制），一次性成脚本，避免中途中断
  4. `docker run` 重建有窗口期风险（stop→rm→run 之间无服务），高可用做法是 `docker run --name 新名` 起来后再删旧的
  5. **openccode 1.18.16 不自动加载 `~/.config/opencode/.env`**（二进制无 dotenv），实验性变量须 `docker run -e` 注入

### Metadata
- Source: conversation
- Tags: container, recovery, ssh, docker, infra
- Related Doc: AGENTS.md


## [LRN-20260812-001] opencode-container-dual-binary-version-trap

**Logged**: 2026-08-12T11:20:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
容器内 opencode 存在两个二进制：`/usr/bin/opencode` 是 0.0.55 旧版（PATH 优先），实际运行的是 `/usr/local/bin/opencode` 1.18.16（与笔记本同版）。诊断/命令须用绝对路径或 docker exec 确认。

### Details
- ssh 进容器后 `opencode --version` 显示 0.0.55 → 误判软路由 opencode 版本极老，插件机制可能不兼容，浪费排查时间
- 真相：`docker inspect opencode` 显示镜像 `opencode-arm64:1.18.16-full`，entrypoint `[opencode serve ...]`；容器内 `which opencode` = `/usr/local/bin/opencode` 1.18.16
- `opencode agent list` 用绝对路径 `/usr/local/bin/opencode agent list` 才返回正常（相对路径走 0.0.55 报 `agent coder not found`）
- 版本一致 → 笔记本已验证的插件/agent 机制直接适用，识图插件部署无兼容性疑虑

### Suggested Action
- 容器内诊断一律 `docker exec opencode /usr/local/bin/opencode ...`
- 判断版本别用 PATH 内二进制，以 `docker inspect` 镜像 + `/usr/local/bin` 为准

### Metadata
- Source: conversation
- Tags: opencode, docker, version, diagnosis
- Related Doc: AGENTS.md

## [LRN-20260812-002] router-container-no-python3-node-for-text-processing

**Logged**: 2026-08-12T11:20:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
软路由 opencode 容器（node:20-slim）**无 python3**（`which python python3` 均无），但有 node（opencode 本体就是 node/bun 运行）。文本处理（编码检查、JSON 处理、文件编辑）一律用 node 或 sed/awk，不要用 python。

### Details
- AGENTS.md 工具表写 `python3 | ✅` 有误导——那是宿主能力，容器内无 python3
- 编码审计工具落地为 `scripts/encoding-audit.js`（纯 node 内置 fs，无依赖，含严格 UTF-8 校验），经 scp 传到 `/etc/opencode/scripts/`，容器内 `/root/.config/opencode/scripts/` 可见
- `docker exec opencode node /root/.config/opencode/scripts/encoding-audit.js --check-only` 运行正常（INVALID: 0）
- 中文/含特殊字符的远端操作：本地写 .sh 脚本 → scp → `sh /tmp/xxx.sh` 执行（ssh 内联中文必炸）

### Suggested Action
- 容器内文本处理默认 node；无 node 场景用 sed/awk（UTF-8 字节安全）
- 修正 AGENTS.md 工具表中 python3 的说明为"宿主有，容器无"

### Metadata
- Source: conversation
- Tags: container, python, node, encoding, tooling
- Related Doc: AGENTS.md

---

## [LRN-20260814-001] win-port-zombie-socket-after-force-kill

**Logged**: 2026-08-14T08:00:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: laptop-only

### Summary
笔记本 opencode serve（4096）被 `Stop-Process -Force` 强杀后，进程虽死但内核 TCP socket 不释放（僵尸 socket），导致端口被"已不存在的 PID"永久占用；tray 脚本又对端口占用无条件 skip 启动，形成死锁，只能重启笔记本恢复。

### 事故链（2026-08-14 实测）
1. `opencode-tray.ps1` 的 `Stop-OcService` 用 `Stop-Process -Force` 强杀 opencode（node）进程 → 进程死亡但 TCP socket 残留内核（孤儿 LISTENING socket）
2. 之后每次 `Start-OcService` 检测到 4096 有监听就**无条件 skip start**（不校验占用 PID 是否还活着）
3. 死锁：端口被幽灵 PID 占着 → 永远 skip → 手机 OC Remote 一直"正在连接" → 只有重启系统能解
4. 验证细节：`tasklist /fi "pid eq 21480"` 查不到进程、SYSTEM 权限 `taskkill /F` 也杀不掉、curl 完全无响应（HTTP 000 / CLOSE_WAIT 堆积）——确诊僵尸 socket
5. 历史 `ERR-20260812-003` 只修了"按端口杀进程"，没修"强杀方式 + 启动僵尸检测"，故换形态复发

### 修复方案（改 `opencode-tray.ps1`）
1. **优雅停止优先**：`Stop-OcService` 先 `Stop-Process`（不带 -Force）→ 轮询 10 秒确认端口释放 → 仍未释放才 -Force 补杀 + 2 秒复查 → 仍被死 PID 占用则日志 `zombie socket, system reboot REQUIRED`
2. **启动校验存活**：`Start-OcService` 查到占用后逐个 `Get-Process` 校验 PID；存活才 skip，已死（僵尸）则日志警示不再静默跳过
3. **关键验证**：不带 -Force 优雅停止后，4096 端口 **1 秒内正常释放**（node 进程响应正常终止信号）

### 经验教训
- **Windows 上 node 进程 `Stop-Process -Force` 强杀 → 高概率留僵尸 socket**；优先用不带 -Force 的优雅停止
- 端口占用判断**必须校验 PID 是否存活**，不能只看"端口有监听就认为服务在跑"
- tray 守护脚本"防冲突 skip"逻辑遇到僵尸 socket 反而成了护着它不放，需僵尸检测兜底
- 手机 OC Remote 连不上但局域网 IP 通 → 先查服务进程是否假死/僵尸，再查网络
- 改笔记本端脚本流程：scp 经 `Downloads` 中转避免路径转义 → 远端 SHA256 比对 → PowerShell `Parser::ParseFile` 语法检查 → 计划任务 Stop→Start 重启（对 Running 任务 Start 不生效，须先 Stop）

### Metadata
- Source: conversation
- Tags: windows, port, zombie-socket, tray, opencode-serve, 4096, process
- Related: ERR-20260812-003（笔记本 ERROR.md）

---

## [LRN-20260814-002] win-zombie-socket-get-nettcpconnection-misjudge

**Logged**: 2026-08-14T08:50:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: laptop-only

### Summary
第一次修复（LRN-20260814-001）后同一天再次复发：用户手动点托盘"Restart Service"后 4096 服务消失。新根因是 `Get-NetTCPConnection` 对僵尸 socket 返回的 `OwningProcess` 不可靠（可能返回已死 PID 甚至调用进程自己的 PID），导致托盘脚本把僵尸误判为"live PID 在跑"而永久 skip 启动。

### 第二次事故链（2026-08-14 实测）
1. 14:28 用户点托盘 Restart → Stop-OcService 优雅停止 opencode（PID 32344）
2. 手机挂着多个 CLOSE_WAIT 连接时，进程死后 socket 残留 → 僵尸 socket 占 4096
3. 新 Start-OcService 用 `Get-NetTCPConnection -LocalPort 4096 -State Listen` 检测 → 返回 `OwningProcess=11684` 或 `42496`（42496 是托盘自己 powershell 的 PID！）→ `Get-Process` 校验碰巧命中存在进程 → 误判 live → skip start
4. 实际僵尸 socket 在几分钟内被 OS 自动回收（实测 `TcpListener` bind 成功=端口已空），但脚本已错过
5. 另确认：Windows 上 `Stop-Process`（即使不带 -Force）对 node 原生进程其实是 TerminateProcess 强杀，优雅停止是假象；无活动连接时恰好能释放，有 CLOSE_WAIT 连接时留僵尸

### 修复（opencode-tray.ps1 二次重写）
1. **改用 `netstat -ano` 解析真实监听 PID**（`Get-NetTCPConnection` 对僵尸不可靠），再用 `Get-Process` + `ProcessName -eq 'opencode'` 精确确认 → 新增 `Get-OcListener` 函数
2. **Start-OcService**：端口被非 opencode 进程占时**不 skip**，等待 5×10s 让 OS 回收僵尸后重试；启动后 3s 验证新 PID 是否真绑定（`verified ... bound 4096` 日志）
3. **Stop-OcService**：用 Get-OcListener 杀真实 opencode 进程，等最多 20s 确认端口释放，未释放则记 WARN（不阻塞）
4. **Restart 菜单改后台线程**（`[System.Threading.Thread]`），避免 Stop 后等待僵尸回收时 UI 冻结

### 经验教训
- **`Get-NetTCPConnection` 的 OwningProcess 对僵尸 socket 不可信**（返回随机/错误 PID，甚至自己进程），判断"谁在监听"用 `netstat -ano` + 进程名校验最可靠
- **僵尸 socket 会被 Windows 几分钟内自动回收**，Start 前等待+重试即可自动恢复，无需重启系统（LRN-001 的"必须重启"结论被推翻）
- `Stop-Process` 对 node 就是强杀；要避免僵尸得靠 Start 的等待重试兜底，而非指望优雅停止
- 后台线程里 Start-Process 起的子进程会随线程/父脚本退出被终止——测试脚本验证用，正式服务必须由常驻托盘/计划任务托管
- 同一问题两天复发两次，根因是**第一次只治症状（按 PID 校验）没治根（检测手段本身不可靠）**；二次修复改检测源头 + 等待重试，逻辑闭环

### Metadata
- Source: conversation
- Tags: windows, port, zombie-socket, Get-NetTCPConnection, netstat, tray, opencode-serve, 4096
- Related: LRN-20260814-001, ERR-20260812-003

---

## [LRN-20260823-001] docker-opencode-workdir-slash-causes-slow

**Logged**: 2026-08-23T02:10:00+08:00
**Priority**: high
**Status**: done
**Area**: infra

### Summary
软路由 Docker 容器启动 opencode 时未指定 `-w`（工作目录），默认为 `/`（根目录），导致 inotify 文件监视器扫描整个根目录，网页卡顿、新建对话极慢。

### Details
- Docker run 命令没有 `-w` 参数 → 容器工作目录默认 `/`
- opencode 启动时用 inotify 监视工作目录的文件变化
- 工作目录为 `/` 时，inotify 会监视整个文件系统（overlayfs、tmpfs、procfs、docker overlay 等所有挂载点）
- 日志报错：`failed to initialize fff: Can not run certain FFF features in a file system root or home directories`
- 表现：Web UI 打开卡顿，新建对话需要很长时间（初始化 + inotify 扫描开销）
- 修复：`docker run` 加 `-w /root`，工作目录改为 `/root`
- 验证：`/proc/1/cwd -> /root`，session 创建正常，health check 通过

### Suggested Action
1. Docker 启动 opencode 必须加 `-w /root`（或具体项目目录），**禁止**使用默认 `/`
2. 重建容器：`docker stop opencode && docker rm opencode && docker run -d --name opencode ... -w /root opencode-arm64:xxx opencode serve ...`
3. 已修复：容器 `aca14989d0fa` 已用 `-w /root` 重建

### Metadata
- Source: conversation
- Tags: docker, inotify, workdir, opencode, soft-router, performance
- Related Skill: opencode-maintenance
- Related Doc: docs/router.md

---

## [LRN-20260826-022] openclash-start-fail-auto-disable

**Logged**: 2026-08-26T09:30:00+08:00
**Priority**: critical
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
OpenClash 的 `start_fail()` 函数在启动失败时会执行 `uci set enable=0` + `uci commit`，**永久性地把 OpenClash 禁用**。这意味着任何一次启动失败（Ruby依赖、配置校验、网络时序）都会导致 OpenClash 死掉且下次开机也不会再尝试。

### 根因
`/etc/init.d/openclash` 第330行 `start_fail()` 中：
- `uci -q set openclash.config.enable=0` → 永久禁用
- `exit 0` → 静默退出，无告警
- 无重试机制

### 修复
修改 `/etc/init.d/openclash` 的 `start_fail()` 函数：
1. `enable=0` 改为 `enable=1`（保留启用状态，下次开机仍会尝试）
2. 添加 `logger -p err` 日志记录
3. `exit 0` 改为 `exit 1`（明确表示失败）
4. 已备份原文件为 `/etc/init.d/openclash.bak.202608260928`

### 警告
- OpenClash **升级会覆盖** `/etc/init.d/openclash`，升级后需重新应用此补丁
- 此修改不影响 OpenClash 正常启动，只影响失败路径

### Metadata
- Source: conversation
- Tags: openclash, start_fail, enable, boot, procd
- Related Doc: docs/router.md

---

## [LRN-20260826-023] istoreos-daily-reboot-timeset

**Logged**: 2026-08-26T09:30:00+08:00
**Priority**: high
**Status**: acknowledged
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
iStoreOS 内置 `timeset` 保活机制，通过 cron 在**每天凌晨 03:00 强制重启软路由**。crontab 条目：`00 03 * * * /usr/libexec/timeset/handler reboot`。

### 影响
- 每天 03:00 所有服务重启，包括 OpenClash、Docker 容器、Tailscale
- 若 OpenClash 启动失败（见 LRN-20260826-022），整个代理链路断掉直到手动修复
- `/tmp` 是 tmpfs，重启后所有临时日志清空

### 处理
- **保留**此定时重启（防断电丢配置的保活机制）
- 已通过修改 `start_fail()`（LRN-20260826-022）和添加看门狗（LRN-20260826-024）兜底

### Metadata
- Source: conversation
- Tags: istoreos, timeset, cron, reboot, daily
- Related Doc: docs/router.md

---

## [LRN-20260826-024] openclash-watchdog-added

**Logged**: 2026-08-26T09:30:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
为 OpenClash 添加了独立的 cron 看门狗脚本 `/root/openclash-watchdog.sh`，作为第二层保护：
1. 检查 clash 主进程是否存活
2. 检查 Google 连通性（TUN 模式异常时进程在但流量不通）
3. 挂了就自动 `/etc/init.d/openclash restart`

### 实现
- 脚本：`/root/openclash-watchdog.sh`（chmod +x）
- cron：`*/5 * * * *` 每5分钟执行
- 日志：`/tmp/openclash-watchdog.log`
- 防重入：30秒内不重复拉起（LOCKFILE 机制）
- 现有 `lightpanda-watchdog` 采用同样模式

### 验证
- 手动 kill clash 进程 → 看门狗检测并自动拉起 → Google 恢复 200
- OpenClash 自带 watchdog 也能拉起 → 两层保护互为冗余

### Metadata
- Source: conversation
- Tags: openclash, watchdog, cron, health-check, self-healing
- Related Doc: docs/router.md

---

## [LRN-20260826-025] softrouter-full-health-audit

**Logged**: 2026-08-26T11:00:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Scope**: router-only

### Summary
趁 OpenClash 停摆修复之机做全面健康审计，发现并处理 7 项问题。

### 已修复
1. **Docker 垃圾**：删除 exited lightpanda 容器 + `docker image prune -a -f` 释放 **6.07GB**（镜像 6.6GB→551MB）
2. **Syncthing v6 DNS 噪声**：`listenAddress` 从 `default` 改为 `tcp://0.0.0.0:22000`（IPv4-only 监听）。注：`discovery-announce-v6` 的 warning 仍每5分钟出现（Syncthing 客户端内置 v6 announce 行为，无配置可关），无害可忽略
3. **Sniffer TLS 错误**：XFLTD.yaml sniffer 段添加 `skip-ip: 172.65.0.0/16`（Cloudflare 段）
4. **温度监控**：`/root/temp-watchdog.sh` + cron `*/30 * * * *`，>75°C 告警到 syslog 和 /tmp/temp-watchdog.log
5. **故障节点**：坏节点（0af4430.cnrcz.cn ×15）只在未激活的 XFLTD.yaml，当前生效 二合一.yaml 无坏节点；已改名 `XFLTD.yaml.disabled-badnodes` 防误用

### 无需修复
- **OpenAI 421**：临时性边缘节点拒绝，复测 api.openai.com=401（无 key 正常响应）、chatgpt.com=403（Cloudflare 拦 curl UA），链路通畅
- **手机 noh-an00 离线**：手机端 Tailscale app 未运行，需用户手机端操作

### 审计时健康基线（2026-08-26）
- CPU 温度 59-67°C 波动（R66S 正常偏高）；内存 792MB/2GB；overlay 59%；USB 14%
- Tailscale NAT 类型 UPnP，DERP 最近新加坡 116ms，笔记本直连 2-3ms
- DNS 无泄漏（fake-ip 正常，直连查询返回真实 IP、OpenClash 返回 198.18.x）

### Metadata
- Source: conversation
- Tags: health-audit, docker-prune, syncthing, sniffer, temperature, openclash
- Related Doc: docs/router.md
