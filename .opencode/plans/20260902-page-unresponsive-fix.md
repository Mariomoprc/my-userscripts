# 修复「此页面没有响应」— Plan

## 目标
消除 OpenCode 窗口（Electron/Chromium）的 `Page Unresponsive` 弹窗导致的页面冻结，使主线程阻塞 <2s，点「等待」不再复现；若偶发则自动恢复且不丢草稿。

## 现状

| 项 | 证据 | 结论 |
|---|---|---|
| 截图现象 | `[Image 1]` 顶部 `OpenCode` 窗口内嵌 `此页面没有响应 | OpenCode | [等待][退出页面]` 遮罩，背景仍在渲染模型列表 `mimo-v2.5-free 38` / `ling-3.0-flash 38` / `big-pickle 35` 等，底部 input `随便问点什么…` 可见 | Chromium renderer 主线程 >5s 未响应触发的通用未响应对话框，非特定 JS 报错 |
| 配置基线 | `opencode.jsonc:101` `OPENCODE_EXPERIMENTAL_EVENT_QUEUE_MAX=10000` 已配；`102` `OPENCODE_SNAPSHOT_DAYS=3`；`107-109` watcher 已忽略 `*.db*`/`node_modules` 等 | 事件风暴根因（`docs/superpowers/specs/2026-08-27-tray-4096-stability-design.md:53` 15% `message.part.delta` 事件风暴 → 卡 1-10 分钟）已做一阶缓解，但未彻底验证 |
| DB 膨胀史 | `skills/opencode-maintenance/SKILL.md:9` `opencode.db` event-sourcing 只增不删 bug #33356，` .learnings-archived-20260826/ROUTER-LEARNINGS.md:148-151` 曾 933MB→3.9GB idle 20-35% CPU | 若 DB >1GB，列表渲染/打开会话会同步拖慢 renderer，可能二次触发未响应 |
| 守护架构 | `skills/opencode-maintenance/SKILL.md:102-125` `tools/opencode-tray/opencode-tray.cpp` + `scripts/serve-health-watchdog.ps1` 双守护；`docs/superpowers/specs/2026-08-27-tray-4096-stability-design.md:52` 25% 僵尸 socket | 4096 zombie 会让 Web 层 `GET /global/health` 5s 超时堆积，间接让前端轮询/探活（`CONNECTION_MODULE` 5s HEAD）积压回调 |
| 客户端分离 | `AGENTS.md:73` `A 方案说明` 桌面客户端声音走 `Settings→Sounds` 与 `opencode-all-in-one.user.js` 捕获静默分离；`SKILL.md:155` 桌面客户端配置在 `%APPDATA%\ai.opencode.desktop\default.dat` | 此弹窗来自 Electron 桌面端，非 `localhost:4096` 网页层；修 `opencode.jsonc` 不直接修 Electron renderer 卡 |
| 已有计划 | `.opencode/plans/20260902-4096-backend-health-fix.md:21` 双守护冲突、watchdog 刷 `Stopped` 日志 | 本次未响应若为 renderer 阻塞，与后端健康检查无关，需独立归因，避免把后端 watchdog 当解法 |

### 关键约束（引用 path:line）
- 只读期不得改文件（`plan mode ACTIVE`），计划先落 `.opencode/plans/**` 再经确认进 build（`opencode.jsonc:31-49` plan 限域允许写 `.opencode/plans/**`）
- 编码/脚本兼容 `AGENTS.md:16-17` `opencode.jsonc` UTF-8 无 BOM，`scripts/sync-env-to-tray.ps1` 仅 `pwsh7` 可跑
- 代理 `AGENTS.md:13` 198.19.0.0/16→192.168.3.100，取证时外网 fetch 走代理，本地探活不走代理

## 界面可视化 — Before / After（必须）

```
Before（当前截图状态，冻结）:
┌─ OpenCode ────────────────────────────── ─ □ ×┐
│ ┌─ 此页面没有响应 ────────────────────┐ │
│ │  OpenCode                           │ │
│ │  [灰色遮罩，背后列表半可见]          │ │
│ │              [ 等待 ] [退出页面]     │ │
│ └─────────────────────────────────────┘ │
│ 模型数量!  mimo-v2.5-free 38 ⚠[训练] 69 t/s │
│          ling-3.0-flash 38   -          │
│          big-pickle 35 ⚠[训练] -        │
│ 1个文件已更改 opencode.jsonc  +2 -2  >   │
│ [随便问点什么… / @ 可添加上下文 ] [↑]   │
│ 交互: 点击等待 → 主线程仍堵 → 2-5s 后再次弹；退出页面 → 丢草稿 │
└─────────────────────────────────────────┘
尺寸: 弹窗 ~520×180 居中遮罩；背后列表可滚动但无响应；颜色 #2b2b2b 背景 + 白字按钮

After（修复后，流畅）:
┌─ OpenCode ────────────────────────────── ─ □ ×┐
│ 模型数量!  mimo-v2.5-free 38 ⚠[训练] 69 t/s │
│          ling-3.0-flash 38   -          │
│          big-pickle 35 ⚠[训练] -        │
│ 1个文件已更改 opencode.jsonc  +2 -2  >   │
│ ┌─ 轻量加载占位（可选）─────────────┐  │
│ │  ○ 正在加载模型列表…  [取消]       │  │
│ └──────────────────────────────────────┘  │
│ [随便问点什么… / @ 可添加上下文 ] [↑]   │
│ 交互: 列表分帧渲染/虚拟列表，输入框始终可打字；后端探活 `CONNECTION_MODULE` 失败仅 toast `✗ 后端已断开` + title `● 掉线`，不阻塞主线程，不自动 reload（`SKILL.md:128`） │
└─────────────────────────────────────────┘
溢出处理: 模型列表>100项时虚拟滚动（windowing），高度固定 40vh，超出滚动，不一次性渲染 398 项（OpenRouter 全量）
```

## 步骤（分步列出，每步做什么、产出什么）

### Step 1 — 复现与只读取证（不改文件）
- 做：问用户「何时触发」并做只读快照：① `Get-Item ~\.local\share\opencode\opencode.db | % Length` 看是否 >1GB；② `Get-CimInstance Win32_Process | ? Name -match opencode|electron` 看实例数与 CPU/内存；③ `Get-NetTCPConnection -LocalPort 4096 -State Listen` 是否僵尸；④ `code --status` / 任务管理器 GPU 进程；⑤ 打开 `chrome://process-internals` 或 `edge://process-internals` 看 renderer CPU。
- 产出：`health-snapshot.md`（DB大小、进程列表、端口状态、触发前操作：如改 `opencode.jsonc` 后立即卡？）
- 判定分叉：DB 大+idle CPU高→走 Step 2A；DB 小但切换模型列表时卡→走 2B；仅 Electron 桌面端卡而 `localhost:4096` 网页不卡→走 2C。

### Step 2A — DB 膨胀路径（若命中）
- 做：只读 `sqlite3 opencode.db "SELECT name,(SELECT sum(pgsize) FROM dbstat WHERE name=tbl.name) FROM sqlite_master WHERE type='table' ORDER BY 2 DESC;"` 与 `SELECT type,count(*),round(sum(length(data))/1048576,1) FROM event GROUP BY type ORDER BY 3 DESC;` 定位大 session（参照 `SKILL.md:31-34`）。
- 产出：大占用 session 列表（id / title / event MB）
- 下游：进入 Step 3 清理方案选型。

### Step 2B — 前端渲染阻塞路径（高概率：模型列表/文件变更）
- 做：复核 `opencode.jsonc:65-97` provider 白名单（含 6+3+3+…）与截图中 Go 套餐 `deepseek-v4-flash(51.8)+mimo-v2.5(38)+muse-spark(34.4)` 的榜单渲染；检查 `1个文件已更改 opencode.jsonc +2 -2` 的 watcher 是否触发频繁重载（`opencode.jsonc:107 watcher.ignore` 已排除 `*.db*` 但未排除频繁写 `opencode.jsonc` 本身）。
- 产出：火焰图/Performance 录制（Edge DevTools → Performance → Record 5s，重现卡顿时主线程 Long Task >50ms 列表）
- 下游：进入 Step 3 渲染优化。

### Step 2C — Electron 桌面端专属
- 做：确认版本 `opencode --version` + Electron 版，查 `%APPDATA%\ai.opencode.desktop\default.dat` 是否过大；对比 `localhost:4096` 网页是否同样未响应（`curl.exe -u opencode:$PW http://127.0.0.1:4096/global/health -i`）。
- 产出：`desktop-vs-web` 对比结论

### Step 3 — 修复方案选型（不改代码，仅定案）
- 方案 A（推荐，低风险）：**观测+限流+分帧** — 保持 `EVENT_QUEUE_MAX=10000`，前端模型列表改虚拟列表/分页，watcher 对 `opencode.jsonc` 加防抖（300ms），`CONNECTION_MODULE` 探活保持 5s 但失败不阻塞 UI（已有 `SKILL.md:128` 不 reload）。
- 方案 B（备选，中风险）：**DB 清理** — 按 `SKILL.md:40-46` 清理流程：`.backup`→`opencode session delete` 批量删旧 session→`VACUUM INTO`→分离进程替换（`Start-Process powershell -WindowStyle Hidden`，避免杀自身）。适用于 DB>1GB 且 Step2A 命中。
- 方案 C（托底）：**桌面端重装/回滚** — 清 `%APPDATA%\ai.opencode.desktop\Cache` + 重装 OpenCode Desktop，`opencode.jsonc` 回退到上一个 git 快照（`git diff opencode.jsonc`）。
- 产出：Decision Log，明确采用 A/B/C 之一

### Step 4 — Build 执行（需用户确认后）
- 按选型落地：
  - A：改前端渲染（若为 web 版则改 `packages/app` 列表组件；若为桌面版则改对应 Electron renderer）；加防抖；加 `PerformanceObserver` 长任务告警。
  - B：执行清理脚本（分离进程，日志落 `tool-output/clean-*.log`），替换后 `PRAGMA integrity_check`。
  - C：执行重装/缓存清理。
- 产出：代码/脚本变更 + 日志

### Step 5 — 验证（Verification Before Completion，必跑）
- 命令：
  ```powershell
  Get-Item "$env:USERPROFILE\.local\share\opencode\opencode.db" | Select Length,LastWriteTime
  Get-CimInstance Win32_Process | ? Name -match "opencode|OpenCode" | Select ProcessId,ParentProcessId,WorkingSetSize,PercentProcessorTime
  curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/health
  curl.exe -s -u "opencode:$env:OPENCODE_SERVER_PASSWORD" http://127.0.0.1:4096/global/health
  pwsh -File scripts/verify-serve-env.ps1   # 预期 ALL PASS
  ```
- 交互：连续操作 10 分钟（切换模型、改 `opencode.jsonc`、输入框打字）不再弹 `此页面没有响应`；若弹，点 `等待` 1s 内恢复且不丢草稿。
- 性能：DevTools Performance 无 >200ms Long Task；任务管理器 OpenCode 进程 idle CPU <5%。

### Step 6 — 沉淀
- 按 `memory` skill 写 `.learnings/ERRORS.md` 或 `LEARNINGS.md`：现象 | 根因（DB/渲染/Electron）| 解法 | 避坑（`EVENT_QUEUE_MAX` 已配但未覆盖渲染层）。
- 若命中 ≥3 次，提 `AGENTS.md` 规则（`Recurrence-Count≥3` 晋级）。

## 风险与对策

| 风险 | 对策 |
|------|------|
| 误把后端僵尸端口当 renderer 卡，深修 serve 无效 | Step1 先做 `desktop-vs-web` 对比 + `curl /global/health`，后端健康则不碰 serve/tray |
| 清理 DB 时 `Stop-Process opencode` 杀死执行自身的会话，替换中断 | 用 `Start-Process powershell -WindowStyle Hidden -File clean.ps1` 分离进程（`SKILL.md:45` 已有坑），日志写文件；`schtasks /Create` 分离不可靠 |
| 虚拟列表改动影响搜索/筛选 | 保持数据源不变，仅视口渲染；加 `qmd-lite` 标题加权检索兜底（`AGENTS.md:94`） |
| watcher 防抖导致配置热更新延迟 | 防抖 300ms，仅对 `opencode.jsonc` 生效，不影响 `*.db*`（已在 ignore） |
| Electron 缓存清不掉仍卡 | 兜底重装 + 删 `%APPDATA%\ai.opencode.desktop\Cache` + `%LOCALAPPDATA%\opencode\Cache` |

## 验证方式（如何确认完成）

- **自动化**：`pwsh -File scripts/verify-serve-env.ps1` ALL PASS；`health-watchdog.log` 连续 30min 无 `Stopped, starting` 刷屏（沿用 `20260902-4096-backend-health-fix.md:82`）。
- **手动**：复现路径（改 `opencode.jsonc`→切模型→打字）10min 无弹窗；Performance 录制无 Long Task；任务管理器 idle CPU 达标。
- **回归**：`git diff` 仅改预期文件，`npm run build` / `opencode --version` 正常（若改前端则 `pnpm typecheck`）。

## 涉及文件（新建/修改/删除清单）

| 文件 | 动作 | 说明 |
|------|------|------|
| `.opencode/plans/20260902-page-unresponsive-fix.md` | 新建 | 本计划 |
| `opencode.jsonc` | 可能修改 | watcher.ignore 加防抖说明或 `opencode.jsonc` 本身防抖（若选 A）；`env` 已有 `EVENT_QUEUE_MAX` 不动 |
| `skills/opencode-maintenance/SKILL.md` | 可能追加 | 补充「Electron 未响应」诊断小节（renderer vs serve 分流） |
| `tools/opencode-tray/opencode-tray.cpp` | 不改 | 仅观测，僵尸检测逻辑沿用 |
| `scripts/verify-serve-env.ps1` / `scripts/serve-health-watchdog.ps1` | 不改/只读验证 | 若 Step1 排除后端则不动 |
| `~/.local/share/opencode/opencode.db` (+ `-wal`/`-shm`) | 可能替换 | 仅 Step2A 命中时走 B 清理流程 |
| `%APPDATA%\ai.opencode.desktop\default.dat` / `Cache` | 可能清理 | 仅 Step2C 命中时 |
| `.learnings/ERRORS.md` 或 `LEARNINGS.md` | 追加 | 沉淀本次根因 |

## 待确认（Question）

- 此弹窗是 **每次改 `opencode.jsonc` 后必现** 还是 **偶发**？是否只在 Electron 桌面端出现，`http://localhost:4096` 网页是否同样卡？
- 期望优先 **A 轻量渲染优化** 还是 **B 直接 DB 清理**？（若 DB 已 >1GB，建议 A+B 组合）
- 是否接受「模型列表虚拟滚动」带来的滚动条样式变化？

