# Archived migrated entries 2026-09-02

## [ERR-20260827-001] error

**Logged**: 2026-08-27T12:15:55.625359Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
[ERR-20260801-004] background-convert-process-cpu-hog

### Error
```
[ERR-20260801-004] background-convert-process-cpu-hog

```

### Context
- Source: mcp-memory-service migration
- Tags: error,todds,background-process,cpu,monitoring,windows,migrated
- Original Hash: 4abb226a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-27
- Last-Seen: 2026-08-27

---

## [ERR-20260827-002] error

**Logged**: 2026-08-27T12:15:55.627229Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
[ERR-20260801-005] system-drawing-bitmap-ctor-invalid-parameter

### Error
```
[ERR-20260801-005] system-drawing-bitmap-ctor-invalid-parameter

```

### Context
- Source: mcp-memory-service migration
- Tags: error,powershell,system.drawing,bitmap,double,cast,gdi,migrated
- Original Hash: 735eca4f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-27
- Last-Seen: 2026-08-27

---

## [ERR-20260827-003] error

**Logged**: 2026-08-27T12:15:55.639265Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
[ERR-20260801-003] todds-standalone-exe-missing-dll

### Error
```
[ERR-20260801-003] todds-standalone-exe-missing-dll

```

### Context
- Source: mcp-memory-service migration
- Tags: error,todds,dds,rimsort,dll,runtime,windows,migrated
- Original Hash: eb1129ee

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-27
- Last-Seen: 2026-08-27

---


... total 85 blocks archived ...
# Archived migrated entries 2026-09-02

## [ERR-20260828-086] error

**Logged**: 2026-08-28T00:47:49.982082Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**Plan 模式说明：当前是只读模式，所有修改被禁止。下面是基于现状的诊断和建议计划。**  ---  ## 现状摘要（重启后）  | 项 | 状态 | |---|---| | `opencode-web` 服务 | ✅ Running（PID 12164）| 0 --port 4096` | | `OpenCode 4096 Tray` 计划任务 | ⚠️ **Running**（这是问题来源...

### Error
```
**Plan 模式说明：当前是只读模式，所有修改被禁止。下面是基于现状的诊断和建议计划。**

---

## 现状摘要（重启后）

| 项 | 状态 |
|---|---|
| `opencode-web` 服务 | ✅ Running（PID 12164）|
0 --port 4096` |
| `OpenCode 4096 Tray` 计划任务 | ⚠️ **Running**（这是问题来源：托盘程序在运行中，触发"already running"弹窗）|
| `OpenCode Web Serve` 计划任务 | ✅ Disabled（旧的已禁用）|

---

## 问题根源

exe`，该 exe 内部仍保留「单实例锁」（mutex），并检测到托盘已存在而拒绝继续。但因为一些历史原因（可能是上次托盘未正常退出导致 mutex 残留 / 任务触发逻辑里有死锁），新启动的进程直接弹窗"OpenCodeTray is already running"并退出。

与此同时，**NSSM 服务已经接管 serve**，端口 4096 正常监听。这意味着 serve 本身已经工作正常，问题只在托盘层。

---

## 建议下一步计划

**不要立即改任何东西，先确认问题边界**：

**手动结束"OpenCode 4096 Tray"任务**（重启后首次登录）
   - 在任务计划程序里右键 → 结束 → 或 `Stop-ScheduledTask -TaskName "OpenCode 4096 Tray"`
   - 观察是否会再次弹窗（若是，那 tray exe 自身有 bug，锁住了；此时只能用 Disable 任务根治）

**长期根治方案**（即原 Task 6/7 计划）
cpp` 移除「自己启动 serve」逻辑，只保留托盘 UI（点击"打开 Web"按钮 → 用 `START_OPENCODE=1` 或浏览器跳转 4096）
exe` → 重装"OpenCode 4096 Tray"任务，并加 `Stop-ScheduledTask` 自身在启动前清理（避免多实例锁冲突）
   - **Task 8（灰度）**：用 `OPENCODE_TRAY_DISABLE=1` env 灰度，先观察一周稳定性再彻底切换

**服务层验证**（可选）
1:4096/` 验证 web 响应
log` 日志确认 serve 状态

---

## 需要您确认

由于在 plan 模式我无法执行任何修改。请问：

**您希望我下一步执行哪一项？**
   - (A) 仅停止托盘任务 + 验证服务（最小动作，不动代码）
   - (B) 直接进入 cpp 重构（Task 6 → 7 → 8），彻底解决
   - (C) 暂缓托盘问题，先观察 NSSM 服务几天稳定性

**当前托盘"already running"弹窗**：是每次登录都弹一次，还是只弹一次？
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2420febc

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-087] error

**Logged**: 2026-08-28T01:17:41.155675Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
ico` 不存在（日志显示 `LoadImageW failed`，回退到默认图标）。已从 `opencode-red.

### Error
```
ico` 不存在（日志显示 `LoadImageW failed`，回退到默认图标）。已从 `opencode-red.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c7d91305

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-088] error

**Logged**: 2026-08-28T02:03:10.401419Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
好问题。直接答：**不会**，但要看你怎么定义"卡"。  ---  ## 答案：方案 1 不会引入新卡顿，但要看清"卡"的根因  ### 为什么"间歇性卡住"大概率**不是** NSSM 的锅  回看今天的根因分析： - NSSM 模式下，watchdog 每 5 分钟 `healthy` 全绿（log 时间戳 09:13–09:58 全是 healthy，无 restart） exe serve...

### Error
```
好问题。直接答：**不会**，但要看你怎么定义"卡"。

---

## 答案：方案 1 不会引入新卡顿，但要看清"卡"的根因

### 为什么"间歇性卡住"大概率**不是** NSSM 的锅

回看今天的根因分析：
- NSSM 模式下，watchdog 每 5 分钟 `healthy` 全绿（log 时间戳 09:13–09:58 全是 healthy，无 restart）
exe serve 1 个、上下文稳定
- **NSSM 本身是 thin wrapper，只在服务异常退出时介入，正常情况不触碰进程**

所以"web 页面卡住"如果之前发生过，**真正的元凶在更下面**（按记忆库 LRN-20260825-001 等条目候选）：

| 嫌疑 | 影响 | 方案 1 是否缓解 |
|------|------|----------------|
db` event 表膨胀（已知 bug #33356） | 列表渲染、打开会话慢 | 不直接影响，方案 1 不改 |
5 单步 77–97s（你的当前主模型） | 客户端以为"卡住" | 不影响 |
| 多会话并发排队 | 同上 | 不影响 |
exe | 进程反复拉起 | **方案 1 间接缓解**：计划任务比 NSSM 更易被白名单，权限隔离更小 |
exe` 桌面那个无命令行） | 长会话后慢 | **方案 1 缓解**：分开 4096 端口，桌面端不再常驻监控 |
| 1090/4096 端口冲突 | 间歇断连 | **方案 1 中性** |

### 方案 1 的稳定性优势

| 维度 | NSSM 模式（当前） | 计划任务模式（方案 1 后） |
|------|------------------|--------------------------|
| 进程上下文 | `LocalSystem`（高权限，易触发 UAC/火绒） | 用户上下文（低权限，干净） |
| 启动方式 | SCM（Service Control Manager）走慢路径 | Task Scheduler 直接拉起 |
| 与桌面交互 | 跨会话，需要 Session 0 隔离 → 容易引出 GUI 弹窗 | 同会话，无隔离问题 |
| 日志/调试 | `nssm status` / `nssm dump`（要管理员） | PowerShell `Get-ScheduledTask` / 任务历史（免管理员） |
| 进程意外退出 | NSSM 自动重启（**有利**，但"快速重启"反而可能掩盖真正问题） | 计划任务可配 `<RestartOnFailure>`，**默认不重启**，需要明确配 |
| **多实例冲突** | 容易（`opencode serve` 端口冲突时 NSSM 行为不直观） | 更容易诊断（计划任务状态一眼可见） |

### 方案 1 唯一需要补的稳定性措施

为防止**端口泄漏 / 僵尸进程**，计划任务必须配：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 6861f59d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-089] error

**Logged**: 2026-08-28T04:31:10.043803Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
PID 32208 is a broken serve started without parameters.

### Error
```
PID 32208 is a broken serve started without parameters.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5c3cb40e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-090] configuration

**Logged**: 2026-08-28T05:01:46.342748Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Here's a concise summary of what's been done and what remains:  ## Completed **NSSM service** `opencode-web` — running, auto-start, healthy (port 4096) exe subprocess → no blue flash), right-click: 打开...

### Error
```
Here's a concise summary of what's been done and what remains:

## Completed
**NSSM service** `opencode-web` — running, auto-start, healthy (port 4096)
exe subprocess → no blue flash), right-click: 打开网页/服务管理/启动/停止/重启/开机自启/退出
**Health watchdog** (`OpenCode Health Watchdog`) — scheduled every 5 min, Service API based
**Old task** `OpenCode Web Serve` — disabled
**Port conflict resolved** — zombie cleared after reboot
100:8000
)

## Remaining Issue — Plugin Array
jsonc` (line 85-89) has broken entries:
ts` → **file doesn't exist** (False)
- `opencode-mem` → **npm package not installed** (False)
config/opencode/node_modules/superpowers` → installed
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 8757877f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-091] fix

**Logged**: 2026-08-28T05:19:48.152492Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Now I have a comprehensive understanding of the architecture. Here is my complete analysis:  ---  ## Analysis: TUI vs Web UI Configuration Loading in OpenCode  ### Architecture Summary  opencode uses...

### Error
```
Now I have a comprehensive understanding of the architecture.
Here is my complete analysis:

---

## Analysis: TUI vs Web UI Configuration Loading in OpenCode

### Architecture Summary

opencode uses a **client-server architecture**:
- **Backend** (`packages/opencode/src/`): TypeScript server that loads all config, MCP servers, commands, plugins, and skills
- **TUI** (`packages/tui/`): Go terminal client that communicates with the backend
- **Web GUI** (`packages/app/`): SolidJS browser app that communicates with the same backend
- Both TUI and Web GUI consume the **same server-side services** through the same HTTP API

---

Custom Commands (`commands/` directory)

**How they are loaded (shared backend):**

ts`) loads commands from three sources:
Built-in commands: `init`, `review`
json`
md` directories

ts`) searches both `command/` and `commands/` directories:
**Web GUI fetches commands the same way:**

**Root cause of missing commands on Web:**

The problem is **timing/initialization**:

The web GUI's `bootstrapDirectory()` loads commands as part of a lazy async bootstrap sequence (inside `runAll(slow)` with many concurrent tasks)
Commands depend on `InstanceState` being fully initialized, which involves scanning all config directories, resolving plugin specs, and loading npm dependencies
The web GUI may show commands before the bootstrap completes, or the bootstrap may fail silently
tsx` re-loads commands when MCP status changes, but there is no equivalent "re-load commands when ready" mechanism

**Workaround to fix:**
---

Plugin Loading Differences

**How plugins are loaded (shared backend):**

ts`:
) -- these are built-in
plugin_origins` (derived from the `plugin:` config key)
{ts,js}`

**The `file:///` path issue on Web:**

jsonc`, plugins are specified as:
Stores status as `connected`, `failed`, `disabled`, `needs_auth`, etc.
If the token is invalid, expired, or missing, the connection fails and the server shows `failed` status.
The web GUI may filter out failed servers from display, while the TUI shows all configured servers.
| Custom commands missing on Web | **Known bug / timing issue** | Move command definitions into `opencode.
**Why TUI shows 6 (with github) but Web shows 5 (without github):**

The difference is likely one of:

This is especially likely if:
   - The env var is set in the TUI terminal session but not exported system-wide
   - The web server was started via NSSM service or a different shell that lacks the env var
   - The env var is set in the Windows User environment but the web process was started from a different context

**How to diagnose:**
- Check the web server's environment for `GITHUB_PERSONAL_ACCESS_TOKEN`
- Check `opencode mcp status` from both contexts
- The MCP status is exposed at `/instance/mcp` API endpoint -- both UIs query the same endpoint

---

### Summary: What Can Be Fixed vs What is Inherent

| Issue | Type | Fix |
|-------|------|-----|
jsonc` `command:` key, or wait for opencode to fix the laz

[...truncated from original 3409 chars...]
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 526a72eb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-092] error

**Logged**: 2026-08-28T05:20:03.161841Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
| 自定义命令缺失 | Web GUI 初始化时序 bug（GitHub #17048） | ✅ 内联到 `opencode.

### Error
```
| 自定义命令缺失 | Web GUI 初始化时序 bug（GitHub #17048） | ✅ 内联到 `opencode.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: cb495bc8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-093] fix

**Logged**: 2026-08-28T07:04:41.260968Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
The user indicated that they do not want you to execute yet -- you MUST NOT make any edits (with the exception of the plan file mentioned below), run any non-readonly tools (including changing configs...

### Error
```
The user indicated that they do not want you to execute yet -- you MUST NOT make any edits (with the exception of the plan file mentioned below), run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system.
Goal: Gain a comprehensive understanding of the user's request by reading through code and asking them questions.
Critical: In this phase you should only use the explore subagent type.
This is critical - your turn should only end with either asking the user a question or calling plan_exit.
**Important:** Use question tool to clarify requirements/approach, use plan_exit to request plan approval.
<system-reminder>
## Plan File Info:
## Plan Workflow

### Phase 1: Initial Understanding
Focus on understanding the user's request and the code associated with their request

- Quality over quantity - 3 agents maximum, but you should try to use the minimum number of agents necessary (usually just 1)
Example: One agent searches for existing implementations, another explores related components, a third investigates testing patterns

### Phase 2: Design
**Guidelines:**
- **Default**: Launch at least 1 Plan agent for most tasks - it helps validate your understanding and consider alternatives
- **Skip agents**: Only for truly trivial tasks (typo fixes, single-line changes, simple renames)

Examples of when to use multiple agents:
- The task touches multiple parts of the codebase
- It's a large refactor or architectural change
- There are many edge cases to consider
- You'd benefit from exploring different approaches

Example perspectives by task type:
- New feature: simplicity vs performance vs maintainability
- Bug fix: root cause vs workaround vs prevention
- Refactoring: minimal change vs clean architecture

In the agent prompt:
- Provide comprehensive background context from Phase 1 exploration including filenames and code path traces
- Describe requirements and constraints
- Request a detailed implementation plan

### Phase 3: Review
Read the critical files identified by agents to deepen your understanding
Ensure that the plans align with the user's original request
Use question tool to clarify any remaining questions with the user

### Phase 4: Final Plan
- Include only your recommended approach, not all alternatives
- Ensure that the plan file is concise enough to scan quickly, but detailed enough to execute effectively
- Include the paths of critical files to be modified
- Include a verification section describing how to test the changes end-to-end (run the code, use MCP tools, run tests)

### Phase 5: Call plan_exit tool
</system-reminder>
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f3ecc840

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-094] error

**Logged**: 2026-08-28T07:08:24.775960Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
How to merge web-discovered models with opencode models --verbose output? ## Current Architecture  It currently: Runs `opencode models --verbose` to get model metadata from providers mjs` which scores...

### Error
```
How to merge web-discovered models with opencode models --verbose output?
## Current Architecture

It currently:
Runs `opencode models --verbose` to get model metadata from providers
mjs` which scores and filters
jsonc` provider whitelist

mjs`):
- Reads stdin (opencode models --verbose output)
}`
- Free models identified by `-free` or `:free` in ID
- Keeps free Top 3, vision Top 5, overall Top 6 per provider

## Problem
It cannot discover:
- New free models added to OpenRouter that aren't in opencode's cache
- Free models whose IDs don't contain `-free`/`:free`
- Recently delisted free models (stale data)

## Goal
## Constraints
- The command template runs in a shell (PowerShell on Windows)
- Available tools in the shell: node, curl, webfetch (not available in shell, only in opencode agent context)
- The `/模型` command runs as an opencode command - it has access to bash tool
ai/collections/free-models`
ai/api/v1/models` (but may need auth)
- The scoring script needs model metadata (cost, context, capabilities) to work

## Design Questions
node script with fetch)
Please design a detailed implementation plan considering:
- Minimal changes to existing architecture
- The command template is markdown that gets executed as a prompt
js (can be extended)
- Error handling for web fetch failures
- UTF-8 handling (Windows GBK environment)
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5553cd9e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-095] configuration

**Logged**: 2026-08-28T10:31:15.116887Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Host key verification failed。ssh config 里 `StrictHostKeyChecking no` 但可能没生效（config 里 Host 匹配的是 `192.

### Error
```
Host key verification failed。ssh config 里 `StrictHostKeyChecking no` 但可能没生效（config 里 Host 匹配的是 `192.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3e38113f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-096] configuration

**Logged**: 2026-08-28T10:45:40.562711Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
---  ## 备份机制现状全面分析报告  ### 一、当前所有备份机制清单  sh) | 项目 | 详情 | |------|------| git、stversions、bak | gz`（USB 外接盘） | | **频率** | cron `0 4 * * *`（每日凌晨 4:00） | | **保留份数** | 最近 7 份 | | **自动化程度** | 全自动（cron + shel...

### Error
```
---

## 备份机制现状全面分析报告

### 一、当前所有备份机制清单

sh)
| 项目 | 详情 |
|------|------|
git、stversions、bak |
gz`（USB 外接盘） |
| **频率** | cron `0 4 * * *`（每日凌晨 4:00） |
| **保留份数** | 最近 7 份 |
| **自动化程度** | 全自动（cron + shell 脚本） |
ssh/id_router` 连接挂起），无法确认 cron 是否在运行、备份文件是否存在 |

mcp-memory-service 内置备份
| 项目 | 详情 |
|------|------|
db`) |
| **备份到哪里** | `/mnt/usb4-1/mcp-memory/backups/`（同磁盘子目录） |
| **频率** | 启动时 + 定时（具体调度策略未查明，SSH 不可达） |
| **自动化程度** | 全自动（mcp-memory-service 内置调度器） |
| **当前状态** | API 健康 (`{"status":"healthy"}`)，服务正常运行；备份目录内容未验证 |

ps1)
| 项目 | 详情 |
|------|------|
db（对话历史数据库，当前约 745MB） |
db` |
| **频率** | 计划任务（每月 1 号 04:00） |
| **保留份数** | 最近 3 份 |
| **自动化程度** | 脚本设计为自动（计划任务），**但当前计划任务不存在** |
| **当前状态** | **已失效** — 计划任务 "OpenCode DB Cleanup" 未找到。脚本内有官方修复检测逻辑（检测 `opencode db compact-events`），若检测到会自动停用自身。可能已因官方修复落地而自动停用，也可能从未成功注册 |
db`（747MB），均为 2026-08-15 创建 |

ts 插件 (OneDrive 云备份) — **已失效**
| 项目 | 详情 |
|------|------|
config/opencode/` 下配置文件（顶层文件 + agents + commands + plugins + skills + docs + learnings + self-improving） |
| **备份到哪里** | `~/OneDrive/tools/系统_清理_优化/OpenCode-编程助手/backup_*`（OneDrive 云盘） |
| **频率** | 每次会话结束 |
| **自动化程度** | 原设计为全自动（opencode 插件） |
ts`，但实际无法调用 |

Syncthing 跨设备同步 — **已停用**
| 项目 | 详情 |
|------|------|
learnings/` 和 `docs/`（笔记本⇄软路由双向），后改为单向，最终完全停用 |
| **当前状态** | **已停用** — 笔记本 Syncthing 已卸载（winget uninstall），软路由 syncthing 服务仍在运行但仅保留手机照片备份 folder（`/mnt/usb4-1/photos-backup`，receiveonly）|
| **照片备份** | 手机 → 软路由单向（Photos Backup），状态取决于手机是否在同步 |
md/skills/commands 等改用 SCP 手动同步 |

---

### 二、各机制可靠性与自动化评估

| 机制 | 自动化 | 可靠性 | 风险等级 | 说明 |
|------|--------|--------|----------|------|
sh | ✅ 全自动 | ⚠️ 中 | **中** | cron 方案成熟，但当前无法验证运行状态（SSH 超时）。USB 外接盘有物理损坏/断开风险 |
| mcp-memory-service 内置备份 | ✅ 全自动 | ⚠️ 中 | **中** | API 健康，服务正常；但备份调度器的触发机制、保留策略、实际执行频率均未验证 |
ps1 | ❌ 计划任务丢失 | ❌ 低 | **高** | 脚本本身完好，但无触发机制。DB 文件 745MB 无定期清理/备份保护 |
ts (OneDrive) | ❌ 文件丢失 | ❌ 失效 | **高** | 核心备份机制完全失效，无云备份层 |
| Syncthing | ❌ 已卸载 | N/A | **低** | 已完全停用，不再承担同步职责 |

---

### 三、发现的问题与风险点

#### 高风险（需立即处理）

ts 插件丢失，无 OneDrive 云备份层**
ts 也丢失）
md、skills/、commands/、plugins/ 等）**没有任何云备份**
   - 如果笔记本硬盘故障，所有配置将不可恢复
ts`，执行会失败

db 无定期备份保护**
   - 745MB 的对话历史数据库无自动备份机制
   - 唯一的 `backups/` 目录中文件来自 2026-08-15（超过两周前），之后无新备份
   - 数据库损坏风险（历史上已发生过 `disk I/O error` + 79 处页损坏事件）仍然存在
   - DB 清理计划任务已消失，可能因官方修复检测自动停用，也可能从未生效

**软路由备份状态完全未知**
100` 连接挂起（密钥认证可能有问题，或路由器不可达）
sh 脚本是否存在、备份文件是否存在
   - 路由器侧的 `/mnt/usb4-1/Backup/` 内容无法远程检查

#### 中风险

**mcp-memory-service 备份调度器未验证**
md 文档声称有"启动时 + 定时"备份，但从未实际验证过备份目录内容
   - 如果备份从未执行，762+ 条迁移记忆将无备份保护

**Syncthing 停用后，两端配置不再同步**
md/skills/commands 后，软路由侧不会自动更新
   - 当前依赖手动 SCP 同步，容易遗漏
md 中的"跨设备配置同步"表格仍描述了同步规则，但实际执行依赖人工

mjs）状态不明**
   - 记忆中有方案记录（cron 每 15 分钟 API 增量同步），但当前实际运行状态未验证
   - 如果软路由侧的 cron 未运行，两端记忆库可能已分叉

#### 低风险

**现有 DB 备份可能损坏**
db` 两个文件均为 747MB，创建时间相差不到 2 分钟
   - 如果这是清理脚本同一运行中的两次备份，其中一份可能是清理前的、另一份是清理后的
   - 长时间未轮换，超过保留策略（MAX_BACKUPS=3）但文件仍存在（可能是手动保存）

**`/更新` 命令流程断链**
ts`，但该插件不存在
   - 实际执行时会静默跳过或报错，升级过程无备份保护

---

### 四、总结

| 维度 | 状态 |
|------|------|
ts 丢失） |
|

[...truncated from original 3183 chars...]
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 1a117b5b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-097] error

**Logged**: 2026-08-28T11:35:44.605251Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Using systematic-debugging to trace the error message "This model is not available in your country.

### Error
```
Using systematic-debugging to trace the error message "This model is not available in your country.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: a526acd0

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-098] error

**Logged**: 2026-08-28T11:38:34.060865Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Let me look at the actual opencode source code to find where this error is handled and displayed.

### Error
```
Let me look at the actual opencode source code to find where this error is handled and displayed.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c038f918

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-099] error

**Logged**: 2026-08-28T12:10:05.777461Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Let me search for the error message in the playwright-core package.

### Error
```
Let me search for the error message in the playwright-core package.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 0c9939fb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-100] error

**Logged**: 2026-08-28T13:24:33.215857Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
我成功获取了"订阅链接导入与使用全指南"的完整内容。这是非常有价值的教程文档。让我继续获取其他教程文档。让我先返回教程列表，然后查看其他教程。  让我先记录这个教程的关键内容，然后继续研究其他教程。  **教程 1：订阅链接导入与使用全指南（2026年8月20日）**  关键内容： **协议升级**：节点已全面升级至最新的 **AnyTLS 协议** **停止使用 Clash for Window...

### Error
```
我成功获取了"订阅链接导入与使用全指南"的完整内容。这是非常有价值的教程文档。让我继续获取其他教程文档。让我先返回教程列表，然后查看其他教程。

让我先记录这个教程的关键内容，然后继续研究其他教程。

**教程 1：订阅链接导入与使用全指南（2026年8月20日）**

关键内容：
**协议升级**：节点已全面升级至最新的 **AnyTLS 协议**
**停止使用 Clash for Windows (CFW)**：CFW 已停止维护，不支持 AnyTLS 协议
**各平台最低版本要求**：
1+（必须内置 Meta/Mihomo 内核）
1+（支持 Intel 和 M 芯片）
1+（必须是 Meta/Mihomo 核心）
84+（低于此版本无法识别 AnyTLS）
11+（备用软件）
**订阅链接 10 分钟临时机制**：订阅链接从网页刷新/复制起仅有 10 分钟有效期
**403 错误解决**：刷新网页获取最新链接并立即在 10 分钟内完成导入
**"不显示节点"解决**：在订阅链接末尾添加 `&flag=clash-verge`，或在客户端 User-Agent 填写 `clash-verge`
**Network Error 解决**：更新订阅前先关闭代理开关，切换 WiFi 或手机流量
**节点全部超时解决**：系统时间校准（精确到秒）、模式选择（规则模式）、内核更新
**系统代理没效果**：管理员权限运行、开启虚拟网卡模式（TUN）

让我返回教程列表，查看其他教程。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 00c5659d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-101] error

**Logged**: 2026-08-28T13:53:30.928635Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
The error toast can stay red since it's an error notification.

### Error
```
The error toast can stay red since it's an error notification.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b70ebf70

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-102] error

**Logged**: 2026-08-28T13:57:40.053398Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
图标文件已更新（518-528 字节，21:54:14）。托盘日志没有图标加载错误（`LoadImageW failed` 未出现），说明新图标被正确加载。  但注意到一个问题：僵尸端口检测日志**每 5 秒刷一次**（21:57:05, 21:57:10, 21:57:15, 21:57:20），会刷屏。我需要优化：只在状态变化时记录，或者限制频率。  另外服务状态是 Paused（之前尝试启动...

### Error
```
图标文件已更新（518-528 字节，21:54:14）。托盘日志没有图标加载错误（`LoadImageW failed` 未出现），说明新图标被正确加载。

但注意到一个问题：僵尸端口检测日志**每 5 秒刷一次**（21:57:05, 21:57:10, 21:57:15, 21:57:20），会刷屏。我需要优化：只在状态变化时记录，或者限制频率。

另外服务状态是 Paused（之前尝试启动失败留下的状态）。让我先优化日志刷屏问题，然后处理服务状态。

先优化 `ProbeStatus()` 的僵尸端口日志——只在首次检测到时记录，避免每 5 秒刷屏。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 755fc127

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-103] error

**Logged**: 2026-08-28T14:21:28.265118Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
1` 事件 1025MB**（event-sourcing 全量快照 bug），4 个 opencode 是**同一 WT 窗口的 4 个 tab**（非孤儿）。查 session 分布定位大占用者。

### Error
```
1` 事件 1025MB**（event-sourcing 全量快照 bug），4 个 opencode 是**同一 WT 窗口的 4 个 tab**（非孤儿）。查 session 分布定位大占用者。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 858b2517

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-104] error

**Logged**: 2026-08-28T14:21:45.620161Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
图标文件已更新（674-681 字节，22:20:41），托盘日志无 `LoadImageW failed` 错误，说明新图标加载成功。  但注意到服务状态又变成 Paused 了（之前我停到 STOPPED，但可能 NSSM 自动重启又尝试启动失败）。让我确认并处理。  由于当前服务状态是 Paused（僵尸端口导致），且用户需要重启电脑才能释放端口，我应该把服务停到干净状态。让我用 `nssm...

### Error
```
图标文件已更新（674-681 字节，22:20:41），托盘日志无 `LoadImageW failed` 错误，说明新图标加载成功。

但注意到服务状态又变成 Paused 了（之前我停到 STOPPED，但可能 NSSM 自动重启又尝试启动失败）。让我确认并处理。

由于当前服务状态是 Paused（僵尸端口导致），且用户需要重启电脑才能释放端口，我应该把服务停到干净状态。让我用 `nssm stop` 停止。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 1faa2faf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-105] error

**Logged**: 2026-08-28T14:22:06.433530Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
诊断完成，根因明确了。  ## 资源占用分析  4GB（主因，造成 CPU 高）** 1` 事件 1025MB —— 这是已知 bug（event-sourcing 每次更新存**全量快照**） Ilakc`（308MB） - 后果：**4 个实例实时 CPU 都烧到 22-45%**，即使 idle（无对话也在写 event）  4 个 opencode tab 并存（同一个 WT 窗口）**...

### Error
```
诊断完成，根因明确了。

## 资源占用分析

4GB（主因，造成 CPU 高）**
1` 事件 1025MB —— 这是已知 bug（event-sourcing 每次更新存**全量快照**）
Ilakc`（308MB）
- 后果：**4 个实例实时 CPU 都烧到 22-45%**，即使 idle（无对话也在写 event）

4 个 opencode tab 并存（同一个 WT 窗口）**
8GB**
- 非孤儿进程，是 4 个标签页

5GB，已用约 18GB。

## 修复方案

**清理 DB**（对症）：删掉 2 个大 session → 级联删 event → 释放 ~1GB + 实例 idle CPU 应明显下降。需退出所有 opencode 后替换 DB（会短暂关闭当前会话，用分离脚本执行）。
**关掉不需要的 opencode tab**：释放 ~2-3GB 内存。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 008cfd6d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-106] error

**Logged**: 2026-08-28T23:04:32.136822Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
- 不含敏感信息的复杂 Bug 定位   - 需要多轮工具调用的任务   - 大型重构与测试修复   - 你希望优先获得更强推理结果的难题    ai/models/comparisons/muse-spark-1-2-vs-mimo-v2-5-0424)

### Error
```
- 不含敏感信息的复杂 Bug 定位  
- 需要多轮工具调用的任务  
- 大型重构与测试修复  
- 你希望优先获得更强推理结果的难题  

ai/models/comparisons/muse-spark-1-2-vs-mimo-v2-5-0424)
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: cf4a6324

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260828-107] error

**Logged**: 2026-08-28T23:15:26.936181Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
调查完成。以下是各候选数据源的完整评估报告。  ---  # 数据源调查报告：OpenCode Go 模型面板实时数据  ## 结论先行  intelligence_index`（能力评分，165/398 模型），公开无需密钥、CORS 全放开、浏览器可 fetch。  ---  OpenRouter `/api/v1/models` ⭐ 推荐（两个数据一站式）  | 项目 | 值 | |----...

### Error
```
调查完成。以下是各候选数据源的完整评估报告。

---

# 数据源调查报告：OpenCode Go 模型面板实时数据

## 结论先行

intelligence_index`（能力评分，165/398 模型），公开无需密钥、CORS 全放开、浏览器可 fetch。

---

OpenRouter `/api/v1/models` ⭐ 推荐（两个数据一站式）

| 项目 | 值 |
|------|-----|
ai/api/v1/models` |
| 可用性 | ✅ 200 OK，公开，无鉴权，657KB JSON |
| CORS | ✅ `Access-Control-Allow-Origin: *`（OPTIONS 预检返回 204 + ACAO + `Allow-Methods: GET`）— **浏览器 fetch 可用** |
| 模型数 | 398 |

]}`），每个模型字段：

| 字段 | 说明 |
|------|------|
| `id` / `canonical_slug` / `name` | 如 `deepseek/deepseek-v4-pro-0813` |
| **`context_length`** | ✅ **全部 398 个模型都有**（如 1048576） |
intelligence_index`** | ✅ **能力评分**（165 个被 AA 评估过的模型有），同对象还有 `coding_index`、`agentic_index` |
| `pricing` | prompt/completion/input_cache_read（USD/Token） |
| `top_provider` | 含 `context_length` + `max_completion_tokens` |
| `architecture` | 输入/输出模态、tokenizer |
| `reasoning` | 是否强制推理、支持 effort 级别 |

**Go 模型覆盖实测**（opencode zen 列表 33 个中抽查 15 个）：
- 15/15 找到 OpenRouter 对应模型（含 `context_length`）
9
2-contributor`

⚠️ **注意**：OpenRouter ID 带 provider 前缀和版本后缀（如 `deepseek/deepseek-v4-pro-0813`），与 opencode 裸 ID（`deepseek-v4-pro`）不同，需要模糊匹配映射表。

---

Artificial Analysis（能力评分官方源）

网站 HTML JSON-LD（免密钥、CORS 放开、但仅 Top-N）✅ 可作补充

| 项目 | 值 |
|------|-----|
ai/models` |
37MB HTML |
| CORS | ✅ `Access-Control-Allow-Origin: *` |

org Dataset），无需任何 JS 执行即可解析：
2）
- **"Artificial Analysis Intelligence Index"**：Top-20，键 `intelligenceIndex`
6 = 500000）

txt` 是自定义二进制压缩，不可用。

**局限**：只覆盖页面上展示的 Top-20 榜单模型，非全量（全量约 177-591 个）。

官方 API（全量、需密钥、CORS 阻断）⚠️ 仅服务端可用

| 项目 | 值 |
|------|-----|
ai/api/v2/language/models/free`（旧版 `/api/v2/data/llms/models`） |
| 可用性 | 免密钥返回 **401**；需注册免费账号拿 `x-api-key`（约 100-1000 请求/天，需署名） |
| CORS | ❌ OPTIONS 预检返回 204 **无 ACAO** → **浏览器 fetch 被阻断**；官方文档明确要求 key 只放服务端 |
artificial_analysis_intelligence_index` / `coding_index` / `agentic_index`、`pricing`、`performance`；全量 ~591 模型（3 页 × 200） |

⚠️ **免费档不含 context window**（官方文档列为 Pro 专属字段）。

---

OpenCode 自身数据源

ai/zen/go/v1/models` ✅ 权威模型清单（无数据）

| 项目 | 值 |
|------|-----|
| 可用性 | ✅ 200，公开，OpenAI 兼容格式 |
| CORS | ❌ 响应头无 `Access-Control-Allow-Origin` |
6` 等） |
| 字段 | 每模型仅 `id`、`object`、`created`、`owned_by` — **无 context_length、无能力信息** |

价值：作为面板要显示的**模型清单**（哪些模型需要查数据）。

json` ❌ 只是 JSON Schema（非数据）

| 项目 | 值 |
|------|-----|
| 可用性 | ✅ 200，JSON Schema (draft 2020-12)，38KB |
| CORS | ❌ 无 ACAO |
output` |

context`，但这是 schema 不是实时数据。

json`、`/api/models`、`/zen/go/v1/models/{id}`。

---

其他候选

| 来源 | 结果 |
|------|------|
dev | 根页面 200（1201 模型，每小时同步），但 `/api` 404，JS chunk 无 API URL → 纯客户端拉取，**无公开 JSON 端点**；模型详情页 JSON-LD 仅 SoftwareApplication 描述（无数字） |
ai) | `/api/models` → 301 重定向 → 403 `{"error":"Route not allowed"}`，**无公开 API** |

---

## 推荐落地方案

| 数据 | 首选来源 | 备选 |
|------|---------|------|
| 上下文窗口 | **OpenRouter** `context_length`（全量、CORS ✅） | AA 网站 JSON-LD Context Window 块（Top-20） |
intelligence_index`（165 模型） | AA 网站 JSON-LD Intelligence 块；或服务端代理 AA API 全量 |
ai/zen/go/v1/models`（服务端读取，CORS 阻断） | 硬编码 33 个 ID |

**实现要点**：
ai/api/v1/models')` 直接可用，`Access-Control-A

[...truncated from original 3231 chars...]
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f59029be

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-28
- Last-Seen: 2026-08-28

---


## [ERR-20260829-108] error

**Logged**: 2026-08-29T00:43:19.595997Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
确认：托盘进程 PID 6148 存在，但**没有任何窗口**（窗口数 0，FindWindow 返回 0）。这说明托盘进程在启动时窗口创建失败，或者窗口被销毁了。  让我检查托盘代码的启动逻辑，理解窗口创建失败的原因。关键在 `wWinMain` 里。

### Error
```
确认：托盘进程 PID 6148 存在，但**没有任何窗口**（窗口数 0，FindWindow 返回 0）。这说明托盘进程在启动时窗口创建失败，或者窗口被销毁了。

让我检查托盘代码的启动逻辑，理解窗口创建失败的原因。关键在 `wWinMain` 里。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3e52cebf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-109] error

**Logged**: 2026-08-29T00:45:07.849163Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
窗口创建成功了！托盘进程 PID 26676 有 1 个窗口（HWND 721338）。`FindWindow("OpenCodeTrayWnd")` 返回 0 是因为窗口类名匹配问题（可能窗口类名带前缀），但 EnumWindows 确认窗口存在。  现在托盘图标应该正常显示了。让我确认托盘图标是否在任务栏。

### Error
```
窗口创建成功了！托盘进程 PID 26676 有 1 个窗口（HWND 721338）。`FindWindow("OpenCodeTrayWnd")` 返回 0 是因为窗口类名匹配问题（可能窗口类名带前缀），但 EnumWindows 确认窗口存在。

现在托盘图标应该正常显示了。让我确认托盘图标是否在任务栏。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b81244df

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-110] error

**Logged**: 2026-08-29T00:45:47.309323Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
托盘进程正常、窗口已创建，但图标还是看不到。让我深入检查托盘图标注册是否成功，以及 Explorer 的托盘区域状态。  先检查托盘进程是否真的调用了 `Shell_NotifyIconW`，以及是否有多个托盘实例或 Explorer 托盘缓存问题。

### Error
```
托盘进程正常、窗口已创建，但图标还是看不到。让我深入检查托盘图标注册是否成功，以及 Explorer 的托盘区域状态。

先检查托盘进程是否真的调用了 `Shell_NotifyIconW`，以及是否有多个托盘实例或 Explorer 托盘缓存问题。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e2e0a087

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-111] error

**Logged**: 2026-08-29T00:47:01.534621Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
托盘进程正常响应，TrayNotify 存在。让我用更直接的方式检查托盘图标是否真的注册了——通过检查托盘进程是否成功调用了 `Shell_NotifyIconW`。  由于无法直接查询 Shell_NotifyIcon 状态，让我尝试一个不同的方法：检查托盘图标是否在任务栏的溢出区。用户可能需要点击任务栏右下角的 **^** 箭头展开隐藏图标。  不过，让我先确认一个可能的问题：**托盘图标可能...

### Error
```
托盘进程正常响应，TrayNotify 存在。让我用更直接的方式检查托盘图标是否真的注册了——通过检查托盘进程是否成功调用了 `Shell_NotifyIconW`。

由于无法直接查询 Shell_NotifyIcon 状态，让我尝试一个不同的方法：检查托盘图标是否在任务栏的溢出区。用户可能需要点击任务栏右下角的 **^** 箭头展开隐藏图标。

不过，让我先确认一个可能的问题：**托盘图标可能被 Windows 的"通知区域图标"设置隐藏了**。让我检查并尝试强制显示。

实际上，最可靠的验证方式是：托盘进程的 `Shell_NotifyIconW(NIM_ADD)` 是否成功。让我在代码层面确认——检查 `AddTrayIcon()` 的返回值。

让我先看看当前代码里 `AddTrayIcon()` 是否检查了返回值。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: a1c7de18

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-112] error

**Logged**: 2026-08-29T00:47:08.646496Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
`AddTrayIcon()` 没有检查 `Shell_NotifyIconW` 的返回值。让我添加返回值检查，并记录日志，这样能确认图标是否真的注册成功。  同时，我怀疑问题可能是：**托盘图标注册成功，但被 Windows 隐藏了**（在溢出区）。让我先添加日志确认注册状态，然后处理显示问题。  先修改 `AddTrayIcon()` 检查返回值。

### Error
```
`AddTrayIcon()` 没有检查 `Shell_NotifyIconW` 的返回值。让我添加返回值检查，并记录日志，这样能确认图标是否真的注册成功。

同时，我怀疑问题可能是：**托盘图标注册成功，但被 Windows 隐藏了**（在溢出区）。让我先添加日志确认注册状态，然后处理显示问题。

先修改 `AddTrayIcon()` 检查返回值。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 821918cd

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-113] error

**Logged**: 2026-08-29T00:47:34.669448Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
错误码 2147500037 = 0x80004005 = **E_FAIL（未指定的错误）**。`Shell_NotifyIconW` 调用失败，图标没有注册到系统托盘。  这就是为什么看不到图标——**`Shell_NotifyIconW` 本身失败了**，不是图标被隐藏。  E_FAIL 的常见原因： hWnd` 指向的窗口无效 **Explorer 托盘区域未就绪**：Explorer 刚...

### Error
```
错误码 2147500037 = 0x80004005 = **E_FAIL（未指定的错误）**。`Shell_NotifyIconW` 调用失败，图标没有注册到系统托盘。

这就是为什么看不到图标——**`Shell_NotifyIconW` 本身失败了**，不是图标被隐藏。

E_FAIL 的常见原因：
hWnd` 指向的窗口无效
**Explorer 托盘区域未就绪**：Explorer 刚重启，托盘区域还没初始化
hIcon` 无效

hIcon`。窗口句柄之前确认存在（HWND 721338），但那是旧进程。新进程（PID 26676 已杀，现在是新 PID）需要重新确认。

让我检查新托盘进程的窗口和图标加载。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 96b9dd45

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-114] error

**Logged**: 2026-08-29T00:47:44.676794Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
新托盘进程 PID 28280，`Shell_NotifyIconW NIM_ADD failed err=2147500037`（E_FAIL）。  关键发现：**Explorer 重启后（08:46:27），托盘图标重建也失败了**。这说明问题不是开机时序，而是 `Shell_NotifyIconW` 持续失败。  E_FAIL (0x80004005) 在 `Shell_NotifyIcon...

### Error
```
新托盘进程 PID 28280，`Shell_NotifyIconW NIM_ADD failed err=2147500037`（E_FAIL）。

关键发现：**Explorer 重启后（08:46:27），托盘图标重建也失败了**。这说明问题不是开机时序，而是 `Shell_NotifyIconW` 持续失败。

E_FAIL (0x80004005) 在 `Shell_NotifyIconW` 中通常意味着：
hWnd` 指向的窗口已销毁）
hIcon` 无效）

让我检查新进程的窗口是否创建成功。之前 `CreateWindowW` 检查了返回值，如果失败会退出。但日志显示 `tray started`，说明窗口创建成功了。

让我确认新进程的窗口句柄。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: a927bb14

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-115] error

**Logged**: 2026-08-29T00:47:54.676656Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
hWnd` 是有效的。  hIcon`。让我检查图标加载。`LoadTrayIcon(0)` 加载灰色图标（state=0）。让我确认图标文件能否被 `LoadImageW` 正确加载。  之前日志没有 `LoadImageW failed`，说明图标加载成功。但让我确认新图标（674-681 字节）能否被 `LoadImageW` 正确读取。  让我用 PowerShell 模拟 `LoadIm...

### Error
```
hWnd` 是有效的。

hIcon`。让我检查图标加载。`LoadTrayIcon(0)` 加载灰色图标（state=0）。让我确认图标文件能否被 `LoadImageW` 正确加载。

之前日志没有 `LoadImageW failed`，说明图标加载成功。但让我确认新图标（674-681 字节）能否被 `LoadImageW` 正确读取。

让我用 PowerShell 模拟 `LoadImageW` 加载图标，确认图标文件有效。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 467e5b80

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-116] error

**Logged**: 2026-08-29T00:48:05.798154Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
hIcon` 也是有效的。  那 `Shell_NotifyIconW` 为什么返回 E_FAIL？让我重新审视。E_FAIL (0x80004005) 在 `Shell_NotifyIconW` 中，除了无效句柄外，还有一个常见原因：  cbSize` 设置错误**。当前代码：

### Error
```
hIcon` 也是有效的。

那 `Shell_NotifyIconW` 为什么返回 E_FAIL？让我重新审视。E_FAIL (0x80004005) 在 `Shell_NotifyIconW` 中，除了无效句柄外，还有一个常见原因：

cbSize` 设置错误**。当前代码：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: fae75307

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-117] error

**Logged**: 2026-08-29T00:48:13.236598Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
`g_nid` 是 `NOTIFYICONDATAW` 类型，`cbSize = sizeof(g_nid)`。这个在大多数情况下是正确的。  让我重新思考。E_FAIL 的另一个可能原因：**托盘图标已经存在（重复注册）**。如果之前有个托盘实例注册了图标但没清理，新实例注册会失败。  但当前只有一个托盘进程（PID 28280）。让我检查是否有多余的托盘图标残留。  实际上，让我重新审视整个问...

### Error
```
`g_nid` 是 `NOTIFYICONDATAW` 类型，`cbSize = sizeof(g_nid)`。这个在大多数情况下是正确的。

让我重新思考。E_FAIL 的另一个可能原因：**托盘图标已经存在（重复注册）**。如果之前有个托盘实例注册了图标但没清理，新实例注册会失败。

但当前只有一个托盘进程（PID 28280）。让我检查是否有多余的托盘图标残留。

实际上，让我重新审视整个问题。之前（重启前）托盘图标是能显示的（用户看到过绿色/红色）。重启后 `Shell_NotifyIconW` 开始失败。

关键区别：**重启后 Explorer 的托盘区域可能处于异常状态**。让我尝试完全重启 Explorer 并重新注册托盘。

不过，更可能的原因是：**`Shell_NotifyIconW` 在 Explorer 刚启动时调用会失败**。虽然我们等待了 Explorer PID 非 0，但 Explorer 的托盘区域（Shell_TrayWnd）可能还没完全初始化。

让我修改代码：`AddTrayIcon()` 失败时重试（延迟几秒后重试几次）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 67b8cb6c

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-118] error

**Logged**: 2026-08-29T00:48:19.844972Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
让我修改 `AddTrayIcon()` 添加重试逻辑：失败时延迟 2 秒重试，最多 5 次。同时，`UpdateTrayIcon()` 里的 `NIM_MODIFY` 也应该检查。  先修改 `AddTrayIcon()` 添加重试。

### Error
```
让我修改 `AddTrayIcon()` 添加重试逻辑：失败时延迟 2 秒重试，最多 5 次。同时，`UpdateTrayIcon()` 里的 `NIM_MODIFY` 也应该检查。

先修改 `AddTrayIcon()` 添加重试。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 0295416c

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-119] error

**Logged**: 2026-08-29T00:48:51.822286Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
重试 5 次全部失败（E_FAIL）。这不是时序问题，而是**持续性的 `Shell_NotifyIconW` 失败**。  E_FAIL (0x80004005) 持续失败，窗口有效、图标有效，那问题一定出在 `g_nid` 结构体的某个字段。  让我仔细检查 `NOTIFYICONDATAW` 结构。关键点：**`cbSize` 的值**。在 Windows 10/11 上，`NOTIFYIC...

### Error
```
重试 5 次全部失败（E_FAIL）。这不是时序问题，而是**持续性的 `Shell_NotifyIconW` 失败**。

E_FAIL (0x80004005) 持续失败，窗口有效、图标有效，那问题一定出在 `g_nid` 结构体的某个字段。

让我仔细检查 `NOTIFYICONDATAW` 结构。关键点：**`cbSize` 的值**。在 Windows 10/11 上，`NOTIFYICONDATAW` 结构体大小是固定的，但 `sizeof(g_nid)` 取决于编译时的结构体定义。

让我检查编译时用的 `NOTIFYICONDATAW` 大小。Windows SDK 中 `NOTIFYICONDATAW` 的 `cbSize` 应该用 `NOTIFYICONDATAW_V3_SIZE` (0x3A8) 或 `NOTIFYICONDATAW_V2_SIZE` (0x3A0)。

让我确认编译时 `sizeof(NOTIFYICONDATAW)` 的值。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e5bf9927

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-120] error

**Logged**: 2026-08-29T00:48:59.317989Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
我的 C# 结构体定义有误（Guid 字段导致布局问题）。让我用更简单的方式确认——直接看 C++ 代码里 `cbSize` 的设置，以及 Windows SDK 中 `NOTIFYICONDATAW` 的标准大小。  实际上，关键问题可能是：**`cbSize = sizeof(g_nid)` 在编译时计算，但如果编译用的 SDK 版本较新，`NOTIFYICONDATAW` 结构体可能包含 `...

### Error
```
我的 C# 结构体定义有误（Guid 字段导致布局问题）。让我用更简单的方式确认——直接看 C++ 代码里 `cbSize` 的设置，以及 Windows SDK 中 `NOTIFYICONDATAW` 的标准大小。

实际上，关键问题可能是：**`cbSize = sizeof(g_nid)` 在编译时计算，但如果编译用的 SDK 版本较新，`NOTIFYICONDATAW` 结构体可能包含 `hBalloonIcon` 字段（V3），大小是 936 字节。而 `Shell_NotifyIconW` 期望的 `cbSize` 应该是 `NOTIFYICONDATAW_V3_SIZE` (936) 或更小。**

让我检查编译时实际用的 `cbSize`。让我看 build 命令和 SDK 版本。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7aa5f584

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-121] error

**Logged**: 2026-08-29T00:50:17.538901Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
实际上，让我先确认一个更可能的原因。E_FAIL 持续失败，窗口有效、图标有效。让我检查 `g_nid. SDK 的 Include 目录不存在（只有 UnionMetadata）。这说明编译用的 SDK 可能在别处，或者 VS BuildTools 自带 SDK。  让我换个思路。与其纠结 `cbSize`，不如直接测试：用 `NOTIFYICONDATAW_V3_SIZE` (936) 显式设...

### Error
```
实际上，让我先确认一个更可能的原因。E_FAIL 持续失败，窗口有效、图标有效。让我检查 `g_nid.
SDK 的 Include 目录不存在（只有 UnionMetadata）。这说明编译用的 SDK 可能在别处，或者 VS BuildTools 自带 SDK。

让我换个思路。与其纠结 `cbSize`，不如直接测试：用 `NOTIFYICONDATAW_V3_SIZE` (936) 显式设置 `cbSize`，看是否能解决 E_FAIL。

uCallbackMessage`。

`uCallbackMessage = WM_TRAYICON` = `WM_APP + 1` = 0x8001。这个值应该没问题。

让我重新审视：**问题可能出在 `Shell_NotifyIconW` 的调用方式**。让我写一个独立的测试程序，用不同的 `cbSize` 值测试 `Shell_NotifyIconW`。

不过，更快的验证方式：让我检查是否 `cbSize` 设置过大。`sizeof(NOTIFYICONDATAW)` 在最新 SDK 中是 936 字节（V3）。如果编译时用了更新的 SDK，`cbSize` 可能是 936，而运行时的 Explorer 期望更小的值。

让我修改代码，显式设置 `cbSize = NOTIFYICONDATAW_V3_SIZE` (936)，并测试。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5200fdf4

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-122] error

**Logged**: 2026-08-29T00:50:25.042911Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
让我直接测试 `Shell_NotifyIconW` 的 `cbSize` 问题。写一个小的 C++ 测试程序，用不同的 `cbSize` 值测试。  不过，更快的办法：让我先检查当前编译的 exe 里 `cbSize` 实际是多少。用 dumpbin 或直接看代码逻辑。  实际上，让我重新思考。`cbSize = sizeof(g_nid)` 在编译时确定。如果编译用的 SDK 定义 `NOTI...

### Error
```
让我直接测试 `Shell_NotifyIconW` 的 `cbSize` 问题。写一个小的 C++ 测试程序，用不同的 `cbSize` 值测试。

不过，更快的办法：让我先检查当前编译的 exe 里 `cbSize` 实际是多少。用 dumpbin 或直接看代码逻辑。

实际上，让我重新思考。`cbSize = sizeof(g_nid)` 在编译时确定。如果编译用的 SDK 定义 `NOTIFYICONDATAW` 为 V3（含 hBalloonIcon），大小是 936。但 `Shell_NotifyIconW` 在 Windows 10/11 上接受 V3 大小。

hWnd` 的窗口消息循环没有运行**。虽然窗口创建了，但如果消息循环没跑，`Shell_NotifyIconW` 可能失败。

但日志显示 `tray started`，说明消息循环已启动。

让我直接写一个最小测试程序，验证 `Shell_NotifyIconW` 在当前系统上是否工作。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 63dee53a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-123] error

**Logged**: 2026-08-29T00:51:02.257487Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
关键发现！测试程序也失败了，而且 `cbSize=976`（不是 936 或 928）。这说明：  **`Shell_NotifyIconW` 在当前系统上持续失败**（E_FAIL），连最简单的测试程序都失败 `cbSize=976` 是编译时 `sizeof(NOTIFYICONDATAW)` 的值（比标准 V3 的 936 大 40 字节） 即使显式设置 `cbSize=936` 或 `92...

### Error
```
关键发现！测试程序也失败了，而且 `cbSize=976`（不是 936 或 928）。这说明：

**`Shell_NotifyIconW` 在当前系统上持续失败**（E_FAIL），连最简单的测试程序都失败
`cbSize=976` 是编译时 `sizeof(NOTIFYICONDATAW)` 的值（比标准 V3 的 936 大 40 字节）
即使显式设置 `cbSize=936` 或 `928` 也失败

这说明问题**不在托盘代码**，而是**系统级问题**——`Shell_NotifyIconW` 在当前 Explorer 会话中整体失败。

这通常意味着：
**Explorer 的托盘区域（Shell_TrayWnd）异常**
**Explorer 进程损坏**（需要重启 Explorer 或注销登录）

让我检查 Explorer 的托盘窗口状态。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 074019e4

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-124] error

**Logged**: 2026-08-29T00:51:19.910248Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
确认了！**Explorer 进程（PID 10328）没有任何窗口**（窗口数 0，MainWindowHandle 0）。Explorer 处于异常状态——进程在运行但任务栏/桌面窗口都没创建。  这就是为什么： - 任务栏不存在（Shell_TrayWnd = 0） - 托盘区域不存在（TrayNotifyWnd = 0） - `Shell_NotifyIconW` 全部失败（E_FAIL）...

### Error
```
确认了！**Explorer 进程（PID 10328）没有任何窗口**（窗口数 0，MainWindowHandle 0）。Explorer 处于异常状态——进程在运行但任务栏/桌面窗口都没创建。

这就是为什么：
- 任务栏不存在（Shell_TrayWnd = 0）
- 托盘区域不存在（TrayNotifyWnd = 0）
- `Shell_NotifyIconW` 全部失败（E_FAIL）

**Explorer 需要完全重启**。之前我用 `Stop-Process` 重启，但新 Explorer 也没正常初始化。可能需要：
完全杀掉 Explorer，等几秒，再启动
或者注销/重新登录

让我先尝试完全重启 Explorer。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4b6baed8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-125] error

**Logged**: 2026-08-29T00:51:47.355961Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
托盘检测到 Explorer 重启（10328 → 24168）并尝试重建图标，但 `Shell_NotifyIconW` 仍然失败（E_FAIL）。不过这次 Explorer 的任务栏已正常创建（Shell_TrayWnd 存在）。  问题可能是：托盘在 Explorer 重启后立即重建图标，但 Explorer 的托盘区域（TrayNotifyWnd）还没完全就绪。让我检查 TrayNotif...

### Error
```
托盘检测到 Explorer 重启（10328 → 24168）并尝试重建图标，但 `Shell_NotifyIconW` 仍然失败（E_FAIL）。不过这次 Explorer 的任务栏已正常创建（Shell_TrayWnd 存在）。

问题可能是：托盘在 Explorer 重启后立即重建图标，但 Explorer 的托盘区域（TrayNotifyWnd）还没完全就绪。让我检查 TrayNotifyWnd 是否已创建。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ead494e6

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-126] error

**Logged**: 2026-08-29T00:52:31.563568Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Explorer 进程（PID 24168）还在，但 Shell_TrayWnd 又消失了。这说明 Explorer 的任务栏窗口不稳定——可能 Explorer 在反复崩溃重启，或者任务栏创建失败。  让我检查 Explorer 是否在反复重启（通过事件日志或进程创建时间）。

### Error
```
Explorer 进程（PID 24168）还在，但 Shell_TrayWnd 又消失了。这说明 Explorer 的任务栏窗口不稳定——可能 Explorer 在反复崩溃重启，或者任务栏创建失败。

让我检查 Explorer 是否在反复重启（通过事件日志或进程创建时间）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c3f1bb0c

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-127] error

**Logged**: 2026-08-29T00:53:06.113944Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Explorer 进程无窗口的问题，最可靠的解决方法是**注销并重新登录**。但在此之前，让我尝试一个更温和的方法：用 `taskkill /f /im explorer.

### Error
```
Explorer 进程无窗口的问题，最可靠的解决方法是**注销并重新登录**。但在此之前，让我尝试一个更温和的方法：用 `taskkill /f /im explorer.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 990ab460

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-128] error

**Logged**: 2026-08-29T00:53:54.068539Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
exe` 没有成功启动 Explorer。  这说明 Explorer 启动失败。让我检查原因——可能是 Explorer 启动时崩溃，或者被系统阻止。  让我尝试用完整路径启动 Explorer，并检查错误。

### Error
```
exe` 没有成功启动 Explorer。

这说明 Explorer 启动失败。让我检查原因——可能是 Explorer 启动时崩溃，或者被系统阻止。

让我尝试用完整路径启动 Explorer，并检查错误。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: db2c0efb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-129] error

**Logged**: 2026-08-29T00:54:11.870262Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
exe` 启动成功了！Explorer 进程（PID 5524）运行，**Shell_TrayWnd 存在**（HWND 2556156，IsWindow=True）！  exe（或解析到了错误位置）。用完整路径就正常了。  现在任务栏已创建，托盘图标应该能注册了。让我检查托盘进程是否自动重建了图标。

### Error
```
exe` 启动成功了！Explorer 进程（PID 5524）运行，**Shell_TrayWnd 存在**（HWND 2556156，IsWindow=True）！

exe（或解析到了错误位置）。用完整路径就正常了。

现在任务栏已创建，托盘图标应该能注册了。让我检查托盘进程是否自动重建了图标。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e7ea3375

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-130] error

**Logged**: 2026-08-29T00:54:51.765540Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
问题严重了——**Shell_TrayWnd 又变成 0 了**！刚才（08:53:48）还是 2556156，现在又没了。而且托盘日志没有新增记录（新托盘 PID 26752 启动后没有写日志？）。  这说明 **Explorer 又崩溃了**。Explorer 反复崩溃，任务栏窗口反复消失。这是系统级问题。  让我检查 Explorer 进程状态和崩溃情况。

### Error
```
问题严重了——**Shell_TrayWnd 又变成 0 了**！刚才（08:53:48）还是 2556156，现在又没了。而且托盘日志没有新增记录（新托盘 PID 26752 启动后没有写日志？）。

这说明 **Explorer 又崩溃了**。Explorer 反复崩溃，任务栏窗口反复消失。这是系统级问题。

让我检查 Explorer 进程状态和崩溃情况。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 9cad8fa7

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-131] error

**Logged**: 2026-08-29T00:54:59.232929Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**Explorer 反复崩溃**！事件日志显示 4 次 Application Error（8:47:39, 8:51:30, 8:53:26, 8:53:59），Explorer 进程反复崩溃重启。当前 Explorer 进程甚至不存在了。  这就是根本原因：**Explorer 持续崩溃**，导致： 任务栏/托盘区域反复消失 `Shell_NotifyIconW` 全部失败 托盘图标无法显示...

### Error
```
**Explorer 反复崩溃**！事件日志显示 4 次 Application Error（8:47:39, 8:51:30, 8:53:26, 8:53:59），Explorer 进程反复崩溃重启。当前 Explorer 进程甚至不存在了。

这就是根本原因：**Explorer 持续崩溃**，导致：
任务栏/托盘区域反复消失
`Shell_NotifyIconW` 全部失败
托盘图标无法显示

让我查看崩溃详情，确定崩溃原因。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ac164cfc

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-132] error

**Logged**: 2026-08-29T00:55:24.393268Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Explorer 启动了（PID 6244），Shell_TrayWnd 存在（HWND 1114442）。但之前 Explorer 会反复崩溃，所以需要观察它是否稳定。  让我等待几秒，确认 Explorer 是否稳定，然后检查托盘图标是否注册成功。

### Error
```
Explorer 启动了（PID 6244），Shell_TrayWnd 存在（HWND 1114442）。但之前 Explorer 会反复崩溃，所以需要观察它是否稳定。

让我等待几秒，确认 Explorer 是否稳定，然后检查托盘图标是否注册成功。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 79167c9f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-133] error

**Logged**: 2026-08-29T00:55:48.357296Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
确认了：**Explorer 又崩溃了**（15 秒后 Explorer 进程消失，Shell_TrayWnd 变 0）。Explorer 反复崩溃，无法稳定运行。  dll` 崩溃（0xc000027b），Windows 11 的已知问题。**必须注销并重新登录**才能恢复 Explorer 的正常状态。  让我总结当前情况并告知用户。

### Error
```
确认了：**Explorer 又崩溃了**（15 秒后 Explorer 进程消失，Shell_TrayWnd 变 0）。Explorer 反复崩溃，无法稳定运行。

dll` 崩溃（0xc000027b），Windows 11 的已知问题。**必须注销并重新登录**才能恢复 Explorer 的正常状态。

让我总结当前情况并告知用户。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: da4f5c28

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-134] error

**Logged**: 2026-08-29T00:55:53.317056Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**托盘图标不显示的根本原因**：**Explorer 反复崩溃**（`Windows. 诊断完成。总结：  dll` 崩溃，异常码 0xc000027b）。事件日志显示 4 次崩溃（8:47, 8:51, 8:53, 8:53）。  Explorer 崩溃导致： - 任务栏（`Shell_TrayWnd`）反复消失 - 托盘区域（`TrayNotifyWnd`）不存在 - `Shell_Noti...

### Error
```
**托盘图标不显示的根本原因**：**Explorer 反复崩溃**（`Windows.
诊断完成。总结：

dll` 崩溃，异常码 0xc000027b）。事件日志显示 4 次崩溃（8:47, 8:51, 8:53, 8:53）。

Explorer 崩溃导致：
- 任务栏（`Shell_TrayWnd`）反复消失
- 托盘区域（`TrayNotifyWnd`）不存在
- `Shell_NotifyIconW` 全部失败（E_FAIL）→ 托盘图标无法注册

**这不是托盘代码的问题**，是 Windows 11 系统级 Explorer 崩溃。

**已做的托盘代码加固**（防止未来问题）：
等待 Explorer 就绪再创建窗口
检查 `RegisterClassW`/`CreateWindowW` 返回值
`Shell_NotifyIconW` 失败时重试 5 次×2s
Explorer 重启时自动重建图标

**你需要做的**：**注销并重新登录**（或重启电脑），重置 Explorer 会话。登录后 Explorer 恢复正常，托盘图标会自动显示（绿色，带圆形状态点）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5baa4474

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-135] error

**Logged**: 2026-08-29T00:58:13.126606Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
启动序列正常：`AddTrayIcon()`（注册图标，设标志）→ `ProbeStatus()` → `UpdateTrayIcon()`（修改图标）。如果 `AddTrayIcon()` 失败，`UpdateTrayIcon()` 会尝试注册，定时器也会持续重试。  现在重新编译并测试。先杀掉当前托盘进程。

### Error
```
启动序列正常：`AddTrayIcon()`（注册图标，设标志）→ `ProbeStatus()` → `UpdateTrayIcon()`（修改图标）。如果 `AddTrayIcon()` 失败，`UpdateTrayIcon()` 会尝试注册，定时器也会持续重试。

现在重新编译并测试。先杀掉当前托盘进程。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b9afa5b1

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-136] error

**Logged**: 2026-08-29T00:58:46.208241Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
托盘启动，`Shell_NotifyIconW NIM_ADD failed (will retry)`——因为 Explorer 刚启动，托盘区域还没就绪。现在等待定时器重试（每 5 秒），看是否能注册成功。

### Error
```
托盘启动，`Shell_NotifyIconW NIM_ADD failed (will retry)`——因为 Explorer 刚启动，托盘区域还没就绪。现在等待定时器重试（每 5 秒），看是否能注册成功。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2a2b17c8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-137] error

**Logged**: 2026-08-29T00:59:11.031057Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Explorer 又崩溃了（进程消失，Shell_TrayWnd=0）。托盘日志没有新增重试记录——因为 `EnsureTrayIcon()` 只在 `! g_trayIconAdded` 时重试，但日志里没有 `NIM_ADD OK (retry)` 也没有新的 failed 记录。  等等，日志里 08:58:25 之后没有新的记录。这说明 `EnsureTrayIcon()` 没有触发重试，...

### Error
```
Explorer 又崩溃了（进程消失，Shell_TrayWnd=0）。托盘日志没有新增重试记录——因为 `EnsureTrayIcon()` 只在 `!
g_trayIconAdded` 时重试，但日志里没有 `NIM_ADD OK (retry)` 也没有新的 failed 记录。

等等，日志里 08:58:25 之后没有新的记录。这说明 `EnsureTrayIcon()` 没有触发重试，或者重试成功了但没记录？不对，成功会记录 `NIM_ADD OK (retry)`。

让我检查——可能 `EnsureTrayIcon()` 在定时器里被调用了，但 Explorer 崩溃导致 `Shell_NotifyIconW` 一直失败，而失败时不记录日志（`EnsureTrayIcon` 只在成功时记录）。这是对的——避免刷屏。

但问题是：**Explorer 反复崩溃**，托盘无法注册图标。这是系统级问题，重启电脑后应该能解决。

让我确认托盘进程还在运行，且 `EnsureTrayIcon` 逻辑正确。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 1f05fa6a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-138] error

**Logged**: 2026-08-29T00:59:57.624951Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
代码逻辑正确。让我确认 `EnsureTrayIcon` 的完整实现，以及 `CheckExplorer` 在 Explorer 崩溃后 PID 变为 0 时的处理。  = g_lastExplorerPid` 时重建图标。如果 Explorer 崩溃（pid=0），`g_lastExplorerPid` 保持旧值，当 Explorer 重新启动（pid 变化）时会触发重建。但如果 Explore...

### Error
```
代码逻辑正确。让我确认 `EnsureTrayIcon` 的完整实现，以及 `CheckExplorer` 在 Explorer 崩溃后 PID 变为 0 时的处理。

= g_lastExplorerPid` 时重建图标。如果 Explorer 崩溃（pid=0），`g_lastExplorerPid` 保持旧值，当 Explorer 重新启动（pid 变化）时会触发重建。但如果 Explorer 崩溃后 `g_lastExplorerPid` 还是旧值，而新 Explorer PID 恰好相同（不太可能），就不会触发。

更关键的是：`EnsureTrayIcon()` 每 5 秒重试，只要 Explorer 托盘区域就绪，图标就会注册。这个逻辑是健壮的。

让我确认 `EnsureTrayIcon` 完整实现。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 6e7edcba

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-139] error

**Logged**: 2026-08-29T01:09:11.796466Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
重要发现！**8月29日（今天）安装了 3 个 Windows 更新**： - KB5120998（8/29） - KB5122385（8/29） - KB5120997（8/28）  系统启动时间是 8:32:38（今天），说明用户重启电脑后安装了这些更新（或更新在重启时应用）。  让我检查这些更新的具体内容和 Explorer 崩溃的关联。

### Error
```
重要发现！**8月29日（今天）安装了 3 个 Windows 更新**：
- KB5120998（8/29）
- KB5122385（8/29）
- KB5120997（8/28）

系统启动时间是 8:32:38（今天），说明用户重启电脑后安装了这些更新（或更新在重启时应用）。

让我检查这些更新的具体内容和 Explorer 崩溃的关联。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: a5f46b32

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-140] error

**Logged**: 2026-08-29T01:09:22.554214Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**结论：高度相关！** 这三个更新（KB5120998、KB5122385、KB5120997）是 8/28-8/29 安装的，其中两个在重启时应用。Explorer 崩溃（Windows. 确认了！**KB5120998 和 KB5122385 在 8:29 8:32:58 安装完成**（需要重启），而系统启动时间是 8:32:38——**更新在重启时应用**。  时间线： - 8/28 15...

### Error
```
**结论：高度相关！** 这三个更新（KB5120998、KB5122385、KB5120997）是 8/28-8/29 安装的，其中两个在重启时应用。Explorer 崩溃（Windows.
确认了！**KB5120998 和 KB5122385 在 8:29 8:32:58 安装完成**（需要重启），而系统启动时间是 8:32:38——**更新在重启时应用**。

时间线：
- 8/28 15:24：KB5120998 开始安装（Staged）
- 8/28 15:18：KB5120997 安装完成
- 8/29 8:29-8:32：KB5120998 + KB5122385 在重启时安装完成
- 8/29 8:32:38：系统启动
dll）

dll）很可能与这些更新有关——特别是 KB5120998（可能是累积更新，包含 Explorer/XAML 相关改动）。

让我确认这些更新的类型（累积更新/安全更新）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ac5a8d77

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-141] error

**Logged**: 2026-08-29T01:24:14.817592Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
这是 Tailscale Android 客户端的 **App split tunneling**（分流）页面。  **两种模式：**  **Excluding（排除模式）** — 当前默认。勾选的 App **不走 Tailscale**，直接用本地网络。 **Including（包含模式）** — 点击 "Switch to including" 切换。勾选的 App **才走 Tailsca...

### Error
```
这是 Tailscale Android 客户端的 **App split tunneling**（分流）页面。

**两种模式：**

**Excluding（排除模式）** — 当前默认。勾选的 App **不走 Tailscale**，直接用本地网络。
**Including（包含模式）** — 点击 "Switch to including" 切换。勾选的 App **才走 Tailscale**。

**你的场景（笔记本 + 软路由 Exit Node）建议：**

- 如果你希望手机上**所有流量都走 Tailscale**（通过软路由代理），不需要勾选任何 App，保持 Excluding 模式且 Excluded apps 为 0 即可。
- 如果某些 App 走 Tailscale 有问题（比如国内 App 访问慢），可以把它们勾选到 Excluded apps 里，让它们直连。

**你想实现什么效果？** 比如：
- 全部走 Tailscale → 不用勾选任何 App
- 部分 App 走代理、部分直连 → 在当前页面勾选需要直连的 App
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 167d2cdb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-142] error

**Logged**: 2026-08-29T01:36:41.269823Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
这说明 Explorer 又处于"进程在但任务栏没创建"的异常状态。之前用完整路径 `C:\Windows\explorer. 重要发现！日志显示 **09:28:20 `Shell_NotifyIconW NIM_ADD OK (retry)`** —— 托盘图标曾经注册成功过！但之后 Explorer 又崩溃了（09:35:03 时 Shell_TrayWnd=0）。  当前状态： - Exp...

### Error
```
这说明 Explorer 又处于"进程在但任务栏没创建"的异常状态。之前用完整路径 `C:\Windows\explorer.
重要发现！日志显示 **09:28:20 `Shell_NotifyIconW NIM_ADD OK (retry)`** —— 托盘图标曾经注册成功过！但之后 Explorer 又崩溃了（09:35:03 时 Shell_TrayWnd=0）。

当前状态：
- Explorer 进程 PID 11096 在运行（9:28:12 启动）
- 但 Shell_TrayWnd=0（任务栏没创建）
- 托盘进程 PID 15136 在运行

exe` 启动能恢复任务栏，但 Explorer 会再次崩溃。

让我检查 Explorer 是否稳定，以及崩溃频率。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f2702ff1

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-143] error

**Logged**: 2026-08-29T01:36:48.440692Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
关键发现： - **最近 30 分钟没有新的 Explorer 崩溃事件**（之前 8:47-8:59 崩溃了 7 次，但 9:28 之后稳定了） 4） - 但窗口数 0（任务栏没创建）  Explorer 进程稳定了（不再崩溃），但任务栏窗口没创建。这可能是因为 Explorer 启动时加载了损坏的状态。  让我尝试用完整路径重启 Explorer，看能否恢复任务栏（不重启电脑）。

### Error
```
关键发现：
- **最近 30 分钟没有新的 Explorer 崩溃事件**（之前 8:47-8:59 崩溃了 7 次，但 9:28 之后稳定了）
4）
- 但窗口数 0（任务栏没创建）

Explorer 进程稳定了（不再崩溃），但任务栏窗口没创建。这可能是因为 Explorer 启动时加载了损坏的状态。

让我尝试用完整路径重启 Explorer，看能否恢复任务栏（不重启电脑）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: d78356ac

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-144] error

**Logged**: 2026-08-29T01:39:53.336400Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
xml` 不存在（没有挂起的重启）。这意味着卸载可能不可行（卸载包已被清理）。  让我重新评估。当前情况： Explorer 反复崩溃（KB5120998 更新导致） 托盘图标无法显示（因为 Explorer 崩溃） 不重启电脑的话，Explorer 无法稳定  **关键问题**：用户不想重启，但 Explorer 崩溃是系统级的，不重启很难解决。  不过，让我检查一个可能性：**Explorer...

### Error
```
xml` 不存在（没有挂起的重启）。这意味着卸载可能不可行（卸载包已被清理）。

让我重新评估。当前情况：
Explorer 反复崩溃（KB5120998 更新导致）
托盘图标无法显示（因为 Explorer 崩溃）
不重启电脑的话，Explorer 无法稳定

**关键问题**：用户不想重启，但 Explorer 崩溃是系统级的，不重启很难解决。

不过，让我检查一个可能性：**Explorer 崩溃是否只在特定条件下发生**。之前 9:28-9:35 之间 Explorer 稳定了 7 分钟（托盘图标还注册成功了）。也许 Explorer 崩溃是间歇性的，不是持续崩溃。

让我重新启动 Explorer 并观察它能否稳定运行一段时间。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 499e4072

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-145] error

**Logged**: 2026-08-29T01:47:52.699960Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
exe 完全没有运行**（任务栏的宿主进程）。这就是天气小组件不显示的直接原因。之前停止Widgets进程时explorer也崩溃了。  现在启动explorer到pass用户的交互式会话。

### Error
```
exe 完全没有运行**（任务栏的宿主进程）。这就是天气小组件不显示的直接原因。之前停止Widgets进程时explorer也崩溃了。

现在启动explorer到pass用户的交互式会话。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4eef3ce3

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-146] error

**Logged**: 2026-08-29T01:48:05.674359Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
用 `-ForceApplicationShutdown` 参数注册成功了（没有报错）！3 个 XAML 包都重新注册完成。  现在需要重启 SiHost 让 Immersive Shell 重新加载这些包。让我杀掉 SiHost 和 Explorer，然后重启。

### Error
```
用 `-ForceApplicationShutdown` 参数注册成功了（没有报错）！3 个 XAML 包都重新注册完成。

现在需要重启 SiHost 让 Immersive Shell 重新加载这些包。让我杀掉 SiHost 和 Explorer，然后重启。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 0b017f8c

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-147] error

**Logged**: 2026-08-29T01:48:26.855984Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Shell_TrayWnd 存在了（HWND 590286）！Explorer 进程 PID 10508 和 2988 在运行。让我观察 Explorer 是否稳定（等待 30 秒，看是否还会崩溃）。

### Error
```
Shell_TrayWnd 存在了（HWND 590286）！Explorer 进程 PID 10508 和 2988 在运行。让我观察 Explorer 是否稳定（等待 30 秒，看是否还会崩溃）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: de828931

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-148] error

**Logged**: 2026-08-29T01:48:57.875197Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
搜索结果确认：本次任务核心内容已被 memory-plugin 自动捕获（`TaskbarSn=1` 写入决策 + Session Summary 完整总结 + 多条 Explorer 崩溃 error 记录）。  让我检查是否有遗漏的关键技巧，以及是否已有相关 doc 条目。

### Error
```
搜索结果确认：本次任务核心内容已被 memory-plugin 自动捕获（`TaskbarSn=1` 写入决策 + Session Summary 完整总结 + 多条 Explorer 崩溃 error 记录）。

让我检查是否有遗漏的关键技巧，以及是否已有相关 doc 条目。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 185a363d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-149] error

**Logged**: 2026-08-29T01:49:05.702470Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Explorer 又崩溃了（30 秒后 Shell_TrayWnd=0，进程 PID 10508 还在但窗口没了）。重新注册 XAML 包没有完全解决问题。  不过，日志显示托盘检测到了 Explorer 重启（`explorer restarted (13628 -> 10508)`）并尝试重建图标，但 `Shell_NotifyIconW` 仍失败。  让我检查 Explorer 是否真的还在...

### Error
```
Explorer 又崩溃了（30 秒后 Shell_TrayWnd=0，进程 PID 10508 还在但窗口没了）。重新注册 XAML 包没有完全解决问题。

不过，日志显示托盘检测到了 Explorer 重启（`explorer restarted (13628 -> 10508)`）并尝试重建图标，但 `Shell_NotifyIconW` 仍失败。

让我检查 Explorer 是否真的还在崩溃，还是只是任务栏窗口没创建。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4adce76b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-150] error

**Logged**: 2026-08-29T01:55:27.357050Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
确认了：**"DeepSeek 重复话题"问题未被记录到记忆库**，这正是需要 `/记住` 自动处理的场景。让我检查 opencode 模型配置，看是否支持参数调整（temperature/frequency_penalty）。

### Error
```
确认了：**"DeepSeek 重复话题"问题未被记录到记忆库**，这正是需要 `/记住` 自动处理的场景。让我检查 opencode 模型配置，看是否支持参数调整（temperature/frequency_penalty）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 01e716db

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-151] error

**Logged**: 2026-08-29T01:56:19.859977Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
只有一个 Explorer 进程（PID 10508），且窗口数为 0。但用户说任务栏出现了。  可能用户看到的是**桌面壁纸**（Explorer 崩溃后桌面还在），或者用户看到的任务栏是**之前残留的**。让我直接问用户确认，或者检查是否有其他方式。  实际上，让我重新理解。用户说"任务栏已经出现了"——可能用户手动重启了 Explorer，或者系统自动恢复了。但我的检查显示 Explorer...

### Error
```
只有一个 Explorer 进程（PID 10508），且窗口数为 0。但用户说任务栏出现了。

可能用户看到的是**桌面壁纸**（Explorer 崩溃后桌面还在），或者用户看到的任务栏是**之前残留的**。让我直接问用户确认，或者检查是否有其他方式。

实际上，让我重新理解。用户说"任务栏已经出现了"——可能用户手动重启了 Explorer，或者系统自动恢复了。但我的检查显示 Explorer 窗口数为 0。

让我再等等看，也许 Explorer 正在初始化中。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ff69c13f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-152] error

**Logged**: 2026-08-29T01:56:40.348874Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
我的检查仍然显示 Shell_TrayWnd=0。但用户说任务栏出现了。这可能是： 用户看到的是**另一个用户会话**的任务栏（比如通过远程桌面） 或者用户看到的任务栏是**残留的视觉**（Explorer 崩溃前的画面）  让我直接问用户确认当前状态，避免误判。

### Error
```
我的检查仍然显示 Shell_TrayWnd=0。但用户说任务栏出现了。这可能是：
用户看到的是**另一个用户会话**的任务栏（比如通过远程桌面）
或者用户看到的任务栏是**残留的视觉**（Explorer 崩溃前的画面）

让我直接问用户确认当前状态，避免误判。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: da1b2cc4

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-153] error

**Logged**: 2026-08-29T02:00:53.208797Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
LRN-20260829-002 已添加。现在检查本地自建 skill 是否需要更新。本次任务涉及 **opencode-maintenance** skill（托盘维护、Explorer 崩溃、僵尸端口）。  让我读取当前 skill 内容，判断是否需要补充本次经验。

### Error
```
LRN-20260829-002 已添加。现在检查本地自建 skill 是否需要更新。本次任务涉及 **opencode-maintenance** skill（托盘维护、Explorer 崩溃、僵尸端口）。

让我读取当前 skill 内容，判断是否需要补充本次经验。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3b24e436

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-154] error

**Logged**: 2026-08-29T02:01:12.715772Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
skill 内容已读。本次任务的经验（DACL 权限、Session 0、僵尸端口、Explorer 崩溃、图标生成）**应该补充到 opencode-maintenance skill** 的"后台服务托盘化模式"部分。让我更新 skill。

### Error
```
skill 内容已读。本次任务的经验（DACL 权限、Session 0、僵尸端口、Explorer 崩溃、图标生成）**应该补充到 opencode-maintenance skill** 的"后台服务托盘化模式"部分。让我更新 skill。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 88e0c23f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-155] error

**Logged**: 2026-08-29T02:02:44.128525Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
QUESTION_MODULE 已存在但 Enter 处理有 bug：捕获阶段 `preventDefault` 阻止了选项 button 的默认 click（选中），直接提交空答案 → 显示"无答案"。这正是用户遇到的问题。让我确认 footer 按钮的 data-slot 结构。

### Error
```
QUESTION_MODULE 已存在但 Enter 处理有 bug：捕获阶段 `preventDefault` 阻止了选项 button 的默认 click（选中），直接提交空答案 → 显示"无答案"。这正是用户遇到的问题。让我确认 footer 按钮的 data-slot 结构。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2189ec43

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-156] error

**Logged**: 2026-08-29T02:08:02.049706Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
这是一个纯研究任务。先检查是否有适用的技能——浏览可用技能列表，没有与"API 文档研究"直接匹配的技能（brainstorming 针对创造性开发、systematic-debugging 针对 bug 排查），且用户明确要求不写代码，因此直接开始研究。  我先并行抓取 OpenRouter 官方文档和搜索 opencode 套餐信息。

### Error
```
这是一个纯研究任务。先检查是否有适用的技能——浏览可用技能列表，没有与"API 文档研究"直接匹配的技能（brainstorming 针对创造性开发、systematic-debugging 针对 bug 排查），且用户明确要求不写代码，因此直接开始研究。

我先并行抓取 OpenRouter 官方文档和搜索 opencode 套餐信息。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 44509580

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-157] configuration

**Logged**: 2026-08-29T02:10:01.962216Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
scp 无法解析 `router` 主机名（SYSTEM 账户读不到 pass 用户的 SSH config）。这是 SYSTEM 会话的权限隔离问题。  100 + 密码方式。先测试 ssh 是否能通过 config 连接。

### Error
```
scp 无法解析 `router` 主机名（SYSTEM 账户读不到 pass 用户的 SSH config）。这是 SYSTEM 会话的权限隔离问题。

100 + 密码方式。先测试 ssh 是否能通过 config 连接。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: a33693f8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-158] error

**Logged**: 2026-08-29T02:10:23.915717Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
md 的一个**配置错误**——同步命令写错了用户。  md 的同步命令，并添加本次任务的通用规则。

### Error
```
md 的一个**配置错误**——同步命令写错了用户。

md 的同步命令，并添加本次任务的通用规则。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c96cab3a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-159] error

**Logged**: 2026-08-29T02:11:54.113747Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
记忆揭示了 SSH 失败的真相：**当前 opencode 以 SYSTEM 账户运行**，读不到 pass 用户的 SSH 配置和密钥（权限隔离），而 TrafficMonitor 作为 pass 用户桌面程序运行时 SSH 免密是可用的。最后补测一个关键点：OpenWrt 24.

### Error
```
记忆揭示了 SSH 失败的真相：**当前 opencode 以 SYSTEM 账户运行**，读不到 pass 用户的 SSH 配置和密钥（权限隔离），而 TrafficMonitor 作为 pass 用户桌面程序运行时 SSH 免密是可用的。最后补测一个关键点：OpenWrt 24.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7e26a113

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-160] error

**Logged**: 2026-08-29T02:12:37.739523Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Parse error 说明请求格式不对——新版 OpenWrt ubus 的 params 是 4 元素格式 `[session, object, method, args, timeout]`，我发的是旧格式。用新版格式重试。

### Error
```
Parse error 说明请求格式不对——新版 OpenWrt ubus 的 params 是 4 元素格式 `[session, object, method, args, timeout]`，我发的是旧格式。用新版格式重试。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ebef7c96

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-161] configuration

**Logged**: 2026-08-29T03:02:28.659133Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
你需要为 TrafficMonitor 实现 RouterStatusPlugin 插件，路径 C:\Users\pass\dev\TrafficMonitorPlugins\RouterStatusPlugin\  已创建： hpp vcxproj (v143, Unicode, x64, winhttp/crypt32/gdiplus) - AILimitPlugin 已完成可参考 C:\Us...

### Error
```
你需要为 TrafficMonitor 实现 RouterStatusPlugin 插件，路径 C:\Users\pass\dev\TrafficMonitorPlugins\RouterStatusPlugin\

已创建：
hpp
vcxproj (v143, Unicode, x64, winhttp/crypt32/gdiplus)
- AILimitPlugin 已完成可参考 C:\Users\pass\dev\TrafficMonitorPlugins\AILimitPlugin\ 源码结构

x 实现 RouterStatusPlugin：

需求：
- 显示项上下双排等宽 84px@96DPI：ClashTop(HK-01 上排) ClashBottom(45ms [rule] 下排) + SysTop(58°C) SysBottom(12% 45%)，另可选分项 ClashMode/ClashConn/SysCpu/Mem/Temp
- 显示模式三选一：进度条 / 简约文字(上下无进度条) / 环形(复刻 iStoreOS 圆环 GDI+ DrawArc)
8s插值 或 200/100/50ms定时器，电池自动降帧
- 数据：Mihomo 9090 (GET /configs 拿mode, GET /proxies 拿now+delay, GET /connections 计数) + ubus (POST /ubus login→system info→file read thermal)
- 配置：Host/Port/Secret/Root密码/间隔/模式/标签可改/宽度/双击URL
- 双击进 yacd/LuCI/概览页，选项对话框完整

需创建文件：
h (IDD_ROUTER_OPTIONS 101)
rc (分组，Mihomo/软路由，Host/Port/Secret/密码/CheckBox/Radio/Edit/Spin/测试)
cpp (复用 AILimitPlugin 的 Utils 逻辑，包含 Utf8/Base64/DPAPI/Ini/分割)
cpp (复用 WinHTTP Get/Post)
cpp (class CRouterConfig {wstring host;int port;wstring secret, rootPass;int intervalSec;bool enableSys;bool showClashTop/Bottom,showClashMode,showClashConn,showSysTop/Bottom,showSysCpu/Mem/Temp;int displayMode,colorMode,animMode;bool batteryAuto;int widthPx;wstring clashTopLabel,clashBottomLabel,sysTopLabel,sysBottomLabel;wstring sysTopMode,sysBottomMode; wstring clashUrl, sysUrl; int delayGreen,delayYellow; void Load/Save; } DPAPI加密 SecretEnc/RootPassEnc)
delay)
},3000]} 和 system info/file read, 用 HttpClient Post)
cpp (IPluginItem 实现，84px, 三模式绘制，同 AILimit 动画插值，双击对应 URL)
cpp (DialogBoxParam, 测试按钮分别调 Mihomo / ubus login)
cpp (class CRouterPlugin : ITMPlugin 单例，成员 ITrafficMonitor* m_app, config, MihomoData, SysData, 各Item对象, tooltip, tick, 实现 GetItem/DataRequired(interval30s, 串行调 Mihomo+ubus, 失败隔离, session过期重登), GetInfo, OnInitialize, ShowOptionsDialog, GetTooltipInfo, OnExtenedInfo)
cpp

细节：
- HttpPost 需设置 Content-Type: application/json
- Ubus login 返回 result 为 session id (int或string)
- 温度 file read 返回需解析 /sys/class/thermal 数字 /1000
- CPU 用 load[0]/nproc*100 近似，或后续用 file read /proc
- 所有 Item DrawItemEx 用 IPluginDrawer, 支持 dark_mode, 单色/三段色

请直接写入所有文件并确保能编译通过（MSBuild Release|x64）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ae423deb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-162] configuration

**Logged**: 2026-08-29T03:14:46.711939Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
dll` 238KB → 已拷至 `…\TrafficMonitor\plugins\`，`dumpbin` 均导出 `TMPluginGetInstance`，`LoadLibrary` 成功，TrafficMonitor 重启后模块列表已加载，无崩溃，`config. 构建完成，已部署并验证：  0）： ini` 已追加 `go_top/go_bottom/or_top/clash_top/c...

### Error
```
dll` 238KB → 已拷至 `…\TrafficMonitor\plugins\`，`dumpbin` 均导出 `TMPluginGetInstance`，`LoadLibrary` 成功，TrafficMonitor 重启后模块列表已加载，无崩溃，`config.
构建完成，已部署并验证：

0）：
ini` 已追加 `go_top/go_bottom/or_top/clash_top/clash_bottom/sys_top/sys_bottom` 等 10 项到任务栏

**效果**（按你 6 点定版）：
8s插值` 或 `200/100/50ms` + 电池自动降帧
- 软路由：`Clash HK-01` / `45ms [rule]` 双排 84px 等宽，`Sys 58°C` / `12% 45%`；9 项可选、文字说明均可在选项中改、双击进 `9090/ui` 或 LuCI

sln:1`
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4931e18a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-163] error

**Logged**: 2026-08-29T03:57:11.470542Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
ini` **从未被创建**——说明插件从未保存过配置。`plugin_display_item` 虽然包含 `go_top`，但可能 TrafficMonitor 的插件加载机制有问题。让我检查 DLL 是否正确导出，以及 TrafficMonitor 实际如何处理插件。

### Error
```
ini` **从未被创建**——说明插件从未保存过配置。`plugin_display_item` 虽然包含 `go_top`，但可能 TrafficMonitor 的插件加载机制有问题。让我检查 DLL 是否正确导出，以及 TrafficMonitor 实际如何处理插件。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 119d5b70

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-164] error

**Logged**: 2026-08-29T03:57:21.780796Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**根因找到了！** `GetProcAddress("TMPluginGetInstance")` 返回 0 —— 导出函数根本不存在！TrafficMonitor 加载 DLL 但找不到入口点，所以整个插件被跳过。

### Error
```
**根因找到了！** `GetProcAddress("TMPluginGetInstance")` 返回 0 —— 导出函数根本不存在！TrafficMonitor 加载 DLL 但找不到入口点，所以整个插件被跳过。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: fcec750d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-165] error

**Logged**: 2026-08-29T04:24:17.522020Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
对，空是**预期**——刚修 `DPAPI 183` 解密失败，把坏的 `AILimitPlugin. ini` 删了，所以对话框现在 `Go 密钥1/2` 为空（如你截图）。  com` 那个 Key（之前测出 `0% (weekly)` 的那个），点 `测试1` 看到 `Go1 剩余 100%` 即成功，`确定` 后会以当前用户重新加密写入，新 `ini` 之后就不会再丢了。

### Error
```
对，空是**预期**——刚修 `DPAPI 183` 解密失败，把坏的 `AILimitPlugin.
ini` 删了，所以对话框现在 `Go 密钥1/2` 为空（如你截图）。

com` 那个 Key（之前测出 `0% (weekly)` 的那个），点 `测试1` 看到 `Go1 剩余 100%` 即成功，`确定` 后会以当前用户重新加密写入，新 `ini` 之后就不会再丢了。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: aaefb4ef

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-166] configuration

**Logged**: 2026-08-29T05:07:16.017398Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
探索软路由端的 OpenCode 配置和跨设备同步机制。  md 中关于"跨设备配置同步"和"环境差异"的所有内容 100"、"router"、"scp"、"同步"、"/etc/opencode" 的文件和配置 jsonc 中是否有环境判断、同步相关配置 搜索所有 skills 和 plugins 中涉及软路由、Docker、跨设备的内容 检查是否有同步脚本（如 scp、rsync 相关脚本） m...

### Error
```
探索软路由端的 OpenCode 配置和跨设备同步机制。

md 中关于"跨设备配置同步"和"环境差异"的所有内容
100"、"router"、"scp"、"同步"、"/etc/opencode" 的文件和配置
jsonc 中是否有环境判断、同步相关配置
搜索所有 skills 和 plugins 中涉及软路由、Docker、跨设备的内容
检查是否有同步脚本（如 scp、rsync 相关脚本）
md 中关于 Tailscale、代理、DNS 的配置
js 文件中提到 "laptop-only"、"router-only"、"cross-env" 的内容

config\opencode。
返回详细的发现，包括文件路径、关键内容、以及发现的潜在问题或冗余。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 78b69817

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-167] configuration

**Logged**: 2026-08-29T05:07:53.724017Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**稳定：** `GoKey1/2/OR` 解密失败回退明文（已修 `dec empty` 分支），网络/限流/空 Key 均灰字/红条占位不崩；配置 `EI_CONFIG_DIR` 时序已重载，下次存取正常；`应用` 与 `获取/打开` 已生效（`aicodewith. **已 polish 并重部署（`AILimit 190464 / Router 238592`）：**  **美观：** 任...

### Error
```
**稳定：** `GoKey1/2/OR` 解密失败回退明文（已修 `dec empty` 分支），网络/限流/空 Key 均灰字/红条占位不崩；配置 `EI_CONFIG_DIR` 时序已重载，下次存取正常；`应用` 与 `获取/打开` 已生效（`aicodewith.
**已 polish 并重部署（`AILimit 190464 / Router 238592`）：**

**美观：** 任务栏改为**底部 3px 细条**（不遮文字、暗色 `#444` / 亮 `#E8E8E8` 背景），文字上下留 `h-3` 不重叠；空状态 ` -- ` 灰色、限流满红、暗/亮自适应；双排 90/84px 等宽对齐不变

ai/keys` / `9090/ui`）

ini` 已清空，**重填 Key 点 `测试1` 看到 `剩余 100%` 后点 `应用` 即可**，暗主题切一下看细条是否跟随。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 9e910d56

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-168] configuration

**Logged**: 2026-08-29T05:21:29.188360Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
探索 OpenCode 错误自学习与记忆沉淀机制。工作目录 C:\Users\pass\. config\opencode。  重点研究：  js 的完整错误捕获逻辑：    - detectValuableContent 中 error pattern 的正则（约402-404行）    - analyzeSessionMessages 中如何提取 insights/errors    - ha...

### Error
```
探索 OpenCode 错误自学习与记忆沉淀机制。工作目录 C:\Users\pass\.
config\opencode。

重点研究：

js 的完整错误捕获逻辑：
   - detectValuableContent 中 error pattern 的正则（约402-404行）
   - analyzeSessionMessages 中如何提取 insights/errors
   - handleMessagePart 如何处理错误消息
   - sessionEnd 如何汇总错误
md 的第五章"重复问题检测"和第三章"Promotion"规则
md 的 Promotion 规则（§5末尾）和执行规范中与错误相关的条目
搜索所有包含"error"、"错误"、"坑"、"学习"、"自学习"、"避开"、"下次"的记忆和文档
json 的 harvest 配置（当前 disabled），看是否可用于错误自学习
搜索 docs-archived/ 中是否有错误案例记录
分析：当前从"遇到错误"到"下次避开"的链路是否完整，缺哪几环

返回详细发现，重点是：当前错误自学习的完整链路分析和缺口。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 477c5e57

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-169] error

**Logged**: 2026-08-29T05:57:58.712102Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
setAttribute = origSetAttr` 在该 `SOURCE` 实例上永久遮蔽原型，后续对此元素的任何 `setAttribute('src', adUrl)` 都直达原生实现，不再走拦截分支。若站点复用同一个 `<source>` 反复改 `src`（常见于 xgplayer 切源），第二次广告 URL 将漏拦。应改为 `origSetAttr. ### 🔴 Bug - `res...

### Error
```
setAttribute = origSetAttr` 在该 `SOURCE` 实例上永久遮蔽原型，后续对此元素的任何 `setAttribute('src', adUrl)` 都直达原生实现，不再走拦截分支。若站点复用同一个 `<source>` 反复改 `src`（常见于 xgplayer 切源），第二次广告 URL 将漏拦。应改为 `origSetAttr.
### 🔴 Bug - `resumeIfNeeded` 的 `pauseOnWake` 抑制为死代码 `人人视频增强包.
### 🟡 Bug - `scheduleResume` 默认 `wasPlaying=true` 导致暂停态被误续播 `人人视频增强包.
play()` 仍会执行。与 `134` 行 `pauseOnWake` 模块期望的“唤醒后保持暂停”冲突：用户切回标签被暂停后，3s 内广告触发仍会把视频拉起。

removeItem('rrmv_paused_once'); return; }` 或至少 `return`。

js:543`
### 🟡 Bug - `hideLoading` 永久写 `display:none !
,'ad-dom')`→暂停视频被自动 `play()`。

!userPaused`。

js:498`

important`，但从未在窗口期后移除。合法缓冲（如网络抖动）的 loading 之后也会一直隐藏，用户看不到转圈，误以为卡死。应仅打 `data-rrmv-ad="hide"` 标签或定时清理内联样式。

js:572`
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 05f4d2cd

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-170] error

**Logged**: 2026-08-29T05:58:32.327439Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
8`，无未提交变更故审最近提交）**  **🔴 Bug** call(this,'data-rrmv-ad','hide')` - `518` `pauseOnWake` 抑制死代码：仅解析 `rrmv_paused_once` 无 `return`，仍 `play()` 拉起  **🟡 Bug** paused` important` 不清理，合法缓冲 loading 被长期隐藏 src` 主视...

### Error
```
8`，无未提交变更故审最近提交）**

**🔴 Bug**
call(this,'data-rrmv-ad','hide')`
- `518` `pauseOnWake` 抑制死代码：仅解析 `rrmv_paused_once` 无 `return`，仍 `play()` 拉起

**🟡 Bug**
paused`
important` 不清理，合法缓冲 loading 被长期隐藏
src` 主视频判定依赖 `mainV`/`closest`，document-start 时易误判非主导致黑屏

**🟠 结构/性能**
- 双 MutationObserver 逻辑重复，高频 `isAdElement` + `hideLoading`
- `hideAdTips:394` + `stealthCleanup 2s` 全量 `querySelectorAll('*')`/`source[src]` 热点，需剪枝

> 已做对：`__rrmv_lastAdBlockAt` 3s 互斥避免 `stallHeal` 误判，`src` 拦截改 `scheduleResume` 方向正确

*（本次审的是 `人人视频` 脚本，与当前 TrafficMonitor 双插件主线无关）*

**继续执行主线：** TrafficMonitor 双插件已 `4倍电池间隔 + 细条圆角 + 429退避 + /proc/stat` 重部署完成（`AILimit 190k / Router 240k`），待你重填 `Go 密钥` 后验证任务栏 `Go 100%`。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: cc6fb916

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-171] error

**Logged**: 2026-08-29T06:58:16.076025Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
`PortAudioError: Error opening InputStream: Unanticipated host error 'Undefined external error. 若 1-3 仍 `MME error 1`，CapsWriter 此 MME 后端在你这台同样不可用（和 PushToTalk 一样），走 **Win+H（你刚问的，有 NPU 但中文小声仍一般）** 或 *...

### Error
```
`PortAudioError: Error opening InputStream: Unanticipated host error 'Undefined external error.
若 1-3 仍 `MME error 1`，CapsWriter 此 MME 后端在你这台同样不可用（和 PushToTalk 一样），走 **Win+H（你刚问的，有 NPU 但中文小声仍一般）** 或 **换回云端 VoxType/豆包** 才是小声最稳。
你截图两处报错，已定位：

`服务端未连接，无法发送` + 端口 6016 不通**  
**必须你手动顺序双击：**
exe`

' [MME error 1]`**  
**三步修（按顺序试，1步通就停）：**

**关独占+改格式**：右下角音量 → 声音 → 录制 → `麦克风(Realtek)` → 属性 → 高级 → **16位 16000Hz**（CapsWriter 固定 16k）→ **取消勾选"允许独占"** + 关闭所有增强 → 确定
00s 失败一致）
**关占用**：关掉微信/浏览器占用麦克风的页面，再试
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: d4282710

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-172] error

**Logged**: 2026-08-29T06:58:56.190641Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
6s），卡在 `MME error 1` 就说明你这台 Realtek SST 离线 MME/WASAPI 都不兼容，直接切云端 VoxType/豆包最省事。

### Error
```
6s），卡在 `MME error 1` 就说明你这台 Realtek SST 离线 MME/WASAPI 都不兼容，直接切云端 VoxType/豆包最省事。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ff620553

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-173] configuration

**Logged**: 2026-08-29T07:09:47.121504Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
该类型的 `FromString()` 和 `Contains()` 如何实现？ `LoadConfig` 和 `LoadPlugins` 的调用顺序（在 CTrafficMonitorApp::InitInstance 中），确认 `plugin_display_item. 如果 github_get_file_contents 返回内容太大，用 github_search_code 搜索关键词...

### Error
```
该类型的 `FromString()` 和 `Contains()` 如何实现？
`LoadConfig` 和 `LoadPlugins` 的调用顺序（在 CTrafficMonitorApp::InitInstance 中），确认 `plugin_display_item.
如果 github_get_file_contents 返回内容太大，用 github_search_code 搜索关键词定位文件，再针对性读取。
需要研究的关键问题：
（不是 DisplayItemSet，那个只支持内置枚举）搜索 `plugin_display_item` 成员声明，找到它的类型（可能是 PluginDisplayItemSet 或类似）
搜索 `IsTaksbarItemDisplayed` 或 `IsItemDisplayed` 的实现，看它对插件项的判断逻辑
FromString` 解析时插件项是否已加载
`CalculateWindowSize` 中 `IsTaksbarItemDisplayed` 的调用

请用 GitHub MCP 的 github_get_file_contents 读取以下文件（owner=zhongyang219, repo=TrafficMonitor）：
h（找 m_taskbar_data 声明和 TaskbarData 类型）
FromString 调用上下文）
cpp（找 IsTaksbarItemDisplayed / CalculateWindowSize）
h（找 GetItemById 声明）
- 任何包含 PluginDisplayItemSet 或 plugin_display_item 成员定义的文件

请返回：
- `plugin_display_item` 的确切类型和定义位置
- `FromString`/`Contains` 的完整实现逻辑（特别是插件项如何匹配）
- 插件项显示在任务栏的完整条件链
- 为什么我们的插件项（go_top 等已在 plugin_display_item 中）可能不显示的具体原因
ini 的什么字段，或插件需要实现什么接口）
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: fee17a99

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-174] error

**Logged**: 2026-08-29T07:14:55.111215Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**Plan Mode 只读评估 — 下次重启大概率正常，僵尸已降为偶发**  **已堵的 3 个必现坑：** `Throttle 1500→3000` `nssm get` 已生效，给 `CLOSE_WAIT` 排空窗口 jsonc:47 EVENT_QUEUE_MAX=10000` 堵 `AsyncQueue` 无界→`CLOSE_WAIT 22条` 堆积根因 cpp:134/591` `Op...

### Error
```
**Plan Mode 只读评估 — 下次重启大概率正常，僵尸已降为偶发**

**已堵的 3 个必现坑：**
`Throttle 1500→3000` `nssm get` 已生效，给 `CLOSE_WAIT` 排空窗口
jsonc:47 EVENT_QUEUE_MAX=10000` 堵 `AsyncQueue` 无界→`CLOSE_WAIT 22条` 堆积根因
cpp:134/591` `OpenProcess ACCESS_DENIED→快照二次确认` + `httpOk` 真健康，`15:13:34 reachable=1 zombie=0` 已自愈，此前“重启仍红”是误判现已根除；`RestartThreadProc` 异步不再 70s 卡死

**残余偶发风险（极低）：**
- 关机时 `Services` 20s 超时强杀 `LocalSystem` 的 `opencode`，仍可能留 1 次内核残留（Windows 机制，非代码可 100% 消），但 `NSSM` 下次开机 `Throttling` 会 3s 后重拉，`Watchdog` `zombie skip` 不再空转刷 `CRITICAL`

**下次重启验证清单（只读自检，不改）：**
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7641d801

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-175] error

**Logged**: 2026-08-29T07:22:52.289953Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**根因复盘** `C:\Program Files\WindowsApps\MicrosoftWindows. db` / 重注册) 已在 `Plan Mode` 下暂停，未执行 — 既然已恢复就不必再清。 你现在看到图标正常的话就不用再操作了，需要我截图复核的话切回 `Build Mode` 我再截任务栏验证。 0_x64__cw5n1h2txyewy:1`： 0`，进程 `Widgets /...

### Error
```
**根因复盘** `C:\Program Files\WindowsApps\MicrosoftWindows.
db` / 重注册) 已在 `Plan Mode` 下暂停，未执行 — 既然已恢复就不必再清。
你现在看到图标正常的话就不用再操作了，需要我截图复核的话切回 `Build Mode` 我再截任务栏验证。
0_x64__cw5n1h2txyewy:1`：
0`，进程 `Widgets / WidgetService` 都正常，非设置被关
05`，典型是 `Widgets 的 EBWebView 缓存` 卡死，`CDN 图标资源` 没渲染出来，不是代理/字体问题
* `taskkill Widgets + WidgetService -> 重启 Explorer` 后缓存重建，图标即恢复

**后续避坑：**
* 26200 是 `Canary` 预览版，`WebExperience` 偶发此问题，复现时直接 `任务管理器结束 Widgets` 即可，无需重装
* 若频繁复现再考虑 `Store 更新 Windows Web Experience Pack` 或清 `EBWebView` 缓存
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4de75de2

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-176] configuration

**Logged**: 2026-08-29T07:25:47.603936Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
天气图标空白就是 `25H2 正式版` 下 `Widgets EBWebView 缓存` 偶发卡死的常规坑，`L1 重启` 已根治，无需重装或退回。 已验证，你这台就是 **`25H2 正式版`**，不是预览：  * `注册表 Flighting`：`HKLM\SOFTWARE\Microsoft\WindowsSelfHost\Applicability` 只有 `WNSUri`，无 `Ring...

### Error
```
天气图标空白就是 `25H2 正式版` 下 `Widgets EBWebView 缓存` 偶发卡死的常规坑，`L1 重启` 已根治，无需重装或退回。
已验证，你这台就是 **`25H2 正式版`**，不是预览：

* `注册表 Flighting`：`HKLM\SOFTWARE\Microsoft\WindowsSelfHost\Applicability` 只有 `WNSUri`，无 `Ring/BranchName`，`UIUsage=0`，`FlightSettings` 不存在 — **从未加入 Insider**，和你截图 `入门` 状态一致 `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion:1`
240331-1435 / Branch: ge_release / CurrentBuild: 26200 / UBR: 9278 / DisplayVersion: 25H2` — `25H2 正式版` 就是 `26100` 基线 + 启用包升到 `26200`，保留 `ge_release` 分支名，不是预览专属
* `Widgets` 已恢复：`Widgets 18052 / WidgetService 10732` 双进程正常
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f8b75704

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-177] error

**Logged**: 2026-08-29T07:27:26.676077Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
[ERR-20260829] Windows 11 Build 26200 ??? Insider Canary ??? | ??:?? CurrentBuild=26200 ??????,??? 25H2 ????????? 26200 | ??:???? HKLM\SOFTWARE\Microsoft\WindowsSelfHost\Applicability ???? + UI\Select...

### Error
```
[ERR-20260829] Windows 11 Build 26200 ??? Insider Canary ??? | ??:?? CurrentBuild=26200 ??????,??? 25H2 ????????? 26200 | ??:???? HKLM\SOFTWARE\Microsoft\WindowsSelfHost\Applicability ???? + UI\Selection.Ring/BranchName + BuildLabEx ge_release ??,???????????????? | ??:??? 26200 ??? reg query Applicability + get BuildLabEx/DisplayVersion,??? Flighting ??,????????

????:????????????,L1 taskkill Widgets.exe/WidgetService.exe + ?? explorer ???,?? EBWebView ????
```

### Context
- Source: mcp-memory-service migration
- Tags: error,pitfall,learning,windows,widgets,26200,25h2,scope:cross-env
- Original Hash: 6716bb1a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-178] error

**Logged**: 2026-08-29T07:28:16.186445Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
cpp 的 LoadPlugins 完整实现，确认 DLL 加载失败的 5 种状态（PS_DISABLE / PS_MUDULE_LOAD_FAILED / PS_FUNCTION_GET_FAILED / PS_VERSION_NOT_SUPPORT 等）对应的日志与错误码，并说明如何通过本机 plugins 目录、LoadLibrary 依赖（如 msvcp140. FromString 的调...

### Error
```
cpp 的 LoadPlugins 完整实现，确认 DLL 加载失败的 5 种状态（PS_DISABLE / PS_MUDULE_LOAD_FAILED / PS_FUNCTION_GET_FAILED / PS_VERSION_NOT_SUPPORT 等）对应的日志与错误码，并说明如何通过本机 plugins 目录、LoadLibrary 依赖（如 msvcp140.
FromString 的调用位置，确认是否存在“先加载插件后读配置”导致的匹配丢失。
返回：每个文件的行号与关键代码片段、加载失败的判定条件、以及本机应检查的 3 个验证点（文件是否存在、是否被禁用、GetLastError）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 1bf4e404

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-179] error

**Logged**: 2026-08-29T07:39:19.010359Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
js` 只有 `正则命中才实时分条 + 会话结束才汇总`，所以 `Windows Widgets` 这类**通用系统排障**（无 `记住/配置修改/坑` 关键词）就会感觉“漏记”。 ### 效果对比  | 维度 | 改前 | 改后 (C) | |------|------|----------| | **自动行为** | 不变 | **不变** — 仍靠 `正则+汇总`，不增加噪音 | | **人...

### Error
```
js` 只有 `正则命中才实时分条 + 会话结束才汇总`，所以 `Windows Widgets` 这类**通用系统排障**（无 `记住/配置修改/坑` 关键词）就会感觉“漏记”。
### 效果对比

| 维度 | 改前 | 改后 (C) |
|------|------|----------|
| **自动行为** | 不变 | **不变** — 仍靠 `正则+汇总`，不增加噪音 |
| **人工流程** | `/记住` 看似可选，漏了才发现 | **明确为必做** — 执行分层已定义 `§一 记忆检查 必做`，文档补一句让心智一致 |
” → 困惑 | “哦，这类任务本就要手动补” → 预期对齐，下次主动喊 `/记住` |
jsonc`，无需同步软路由 |

### 和 A/B 的差别
* **A 维持现状**：和 C 行为完全一致，但**不写进文档** — 下次同样困惑
* **B 扩正则**：行为改变 — `Widgets/25H2/任务栏` 也能触发实时分条，但会把所有闲聊都记进去，记忆库变脏
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4956b87b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-180] error

**Logged**: 2026-08-29T08:08:16.136640Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
exe`/`CTF TIP`）占用，`MoveFileEx` 重启删除标记失败（返回 False），需重启。

### Error
```
exe`/`CTF TIP`）占用，`MoveFileEx` 重启删除标记失败（返回 False），需重启。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3ee96acb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-181] error

**Logged**: 2026-08-29T09:49:18.091496Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
- `IsTaksbarItemDisplayed` 完整实现（对插件项 `PluginItem()! 返回：每个文件的关键代码片段（含行号）、`StringSet` 与 `DisplayItemSet` 的区别、`Contains` 匹配的确切条件、`CalculateWindowSize` 双重过滤的精确逻辑、`DataRequired` 调用条件、以及"GetItem 被调用但任务栏不显示"...

### Error
```
- `IsTaksbarItemDisplayed` 完整实现（对插件项 `PluginItem()!
返回：每个文件的关键代码片段（含行号）、`StringSet` 与 `DisplayItemSet` 的区别、`Contains` 匹配的确切条件、`CalculateWindowSize` 双重过滤的精确逻辑、`DataRequired` 调用条件、以及"GetItem 被调用但任务栏不显示"的最可能根因（结合 width=0 / Contains 失败 / item_order 缺失 / DataRequired 未调 四种假设逐一分析）。
用 github_get_file_contents (owner=zhongyang219, repo=TrafficMonitor) 读取以下文件，逐行摘录关键代码：

cpp**：
   - `StringSet` 类定义（成员、Contains/FromString/ToString 声明）
   - `StringSet::FromString` 完整实现（是否 trim、大小写、空串处理）
   - `StringSet::Contains` 完整实现（比较方式）
   - `CCommon::StringSplit` 实现（分隔符、trim）

cpp**：
   - `CalculateWindowSize` 完整实现（第一重 item_widths 计算、第二重 item_order 交集、IsCustomDraw 分支的宽度来源）
   - 插件项绘制调用 `DrawItemEx`/`DrawItem` 的条件

cpp**：
Contains(GetItemId())`）
   - `DataRequired` 的调用时机（主程序定时器，是否只在任务栏窗口显示时调用）
FromString` 的调用与 `LoadPlugins` 的顺序

h/cpp**：
   - `ItemOrder` 类、`GetAllDisplayItemsWithOrder` 实现
   - `NormalizeItemOrder` 如何补齐新插件项索引

cpp**：
   - `LoadPlugins` 中 `GetItem` 遍历与 `m_all_display_items_with_plugins` 构建
   - `GetItemById` 实现
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 61110eed

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-182] configuration

**Logged**: 2026-08-29T10:00:55.702233Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**根因**：TrafficMonitor 调了 `GetItem` 和 `GetInfo` 但**从未调 `OnInitialize` 和 `OnExtenedInfo(EI_CONFIG_DIR)`**。 **下一步**：在 `GetAPIVersion` 和 `OnInitialize` 加诊断日志，看宿主是否调了 `GetAPIVersion`（检查返回值是否满足版本阈值），并确认 `On...

### Error
```
**根因**：TrafficMonitor 调了 `GetItem` 和 `GetInfo` 但**从未调 `OnInitialize` 和 `OnExtenedInfo(EI_CONFIG_DIR)`**。
**下一步**：在 `GetAPIVersion` 和 `OnInitialize` 加诊断日志，看宿主是否调了 `GetAPIVersion`（检查返回值是否满足版本阈值），并确认 `OnInitialize` 到底被跳过的原因。
日志揭示关键事实：

**`OnInitialize` 从未被调用** — 没有任何日志显示 `OnInitialize`
**`GetItemId` 只有 `go_top/go_bottom/go2_top/go2_bottom`** — 缺少 `or_top/or_bottom`，说明 RouterStatusPlugin 的项未被查询
**`OnExtenedInfo` 持续调用 `0/1/2`** — 这是 `EI_LABEL_TEXT_COLOR(0)=14803425`/`EI_VALUE_TEXT_COLOR(1)=14803425`/`EI_DRAW_TASKBAR_WND(2)=1` — 全是 RouterStatusPlugin 接收的颜色和绘制开关
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 327edbce

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-183] error

**Logged**: 2026-08-29T10:02:18.710380Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
核心问题：`OnInitialize` 从未被调用（日志确认），`m_app` 永远 null。

### Error
```
核心问题：`OnInitialize` 从未被调用（日志确认），`m_app` 永远 null。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b3f01955

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-184] error

**Logged**: 2026-08-29T10:02:52.847672Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
cpp:90-93` 中 `OnInitialize` **确实被调用**（`version >= 7` 时），但我们的日志里没有——可能是旧日志（700KB+）淹没了新条目，或 `GetAPIVersion` 返回值有问题。

### Error
```
cpp:90-93` 中 `OnInitialize` **确实被调用**（`version >= 7` 时），但我们的日志里没有——可能是旧日志（700KB+）淹没了新条目，或 `GetAPIVersion` 返回值有问题。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3708d074

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-185] error

**Logged**: 2026-08-29T10:03:33.359918Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
核心问题：  xgplayer-loading` 显示 **我们只管 3 秒**：`hideLoading` 在 `AD_RESUME_WINDOW(3s)` 外不打标，但 xgplayer 状态机卡住会持续 re-add `xgplayer-isloading` xgplayer-loading` 完全不受 CSS 控制

### Error
```
核心问题：

xgplayer-loading` 显示
**我们只管 3 秒**：`hideLoading` 在 `AD_RESUME_WINDOW(3s)` 外不打标，但 xgplayer 状态机卡住会持续 re-add `xgplayer-isloading`
xgplayer-loading` 完全不受 CSS 控制
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 944cb636

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-186] error

**Logged**: 2026-08-29T10:05:11.854147Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
可能是 `GetItemWidth` 问题（`m_pDC` 传入 HDC 的路径）。

### Error
```
可能是 `GetItemWidth` 问题（`m_pDC` 传入 HDC 的路径）。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2993bfcb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-187] error

**Logged**: 2026-08-29T10:12:56.692084Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
没有广告脚本拦截时直接设 `src` 不会出现 loading——问题出在**脚本拦截 src 后 xgplayer 的状态机**。

### Error
```
没有广告脚本拦截时直接设 `src` 不会出现 loading——问题出在**脚本拦截 src 后 xgplayer 的状态机**。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b5163c82

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-188] error

**Logged**: 2026-08-29T10:21:48.880899Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**根因确认**：`GetItemId=0`——宿主 `CalculateWindowSize` 从未走到 `Contains` 检查。 问题在**宿主的 `AllDisplayItemsWithPlugins` 构建**：CTOR 的 `EnsureItems` 创建了 items，但 `RebuildItemList` 没有正确填充 `m_items`（因为 CTOR 中 `m_go1Top`...

### Error
```
**根因确认**：`GetItemId=0`——宿主 `CalculateWindowSize` 从未走到 `Contains` 检查。
问题在**宿主的 `AllDisplayItemsWithPlugins` 构建**：CTOR 的 `EnsureItems` 创建了 items，但 `RebuildItemList` 没有正确填充 `m_items`（因为 CTOR 中 `m_go1Top` 等为 nullptr）。
**根因**：CTOR 中 `EnsureItems()` 创建了 `m_go1Top` 等，但 `m_items` 仍然为空（因为 `RebuildItemList` 依赖 `m_go1Top` 已创建，而此时它们刚被创建但 `m_items` 没有被填充）。
实际上，问题更根本：**CTOR 中 `m_go1Top` 等在 CTOR 之后才创建，但 CTOR 时 `m_go1Top` 为空**。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 28ce8b02

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-189] error

**Logged**: 2026-08-29T10:22:07.599730Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**蓝色圆圈真机根因** — 用 Chromium 连上 `mh.

### Error
```
**蓝色圆圈真机根因** — 用 Chromium 连上 `mh.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 9e19aa26

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-190] error

**Logged**: 2026-08-29T10:22:21.400605Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**CT 时序问题**：CTOR 调 `EnsureItems()` 创建 `m_go1Top`，但 `RebuildItemList()` 中 `m_go1Top` 还是 nullptr（因为 `EnsureItems` 里 `m_go1Top` 是在 `EnsureItems()` 结束后才赋值）。 **实际上**：CTOR 中 `EnsureItems()` 确实创建了 `m_go1Top`...

### Error
```
**CT 时序问题**：CTOR 调 `EnsureItems()` 创建 `m_go1Top`，但 `RebuildItemList()` 中 `m_go1Top` 还是 nullptr（因为 `EnsureItems` 里 `m_go1Top` 是在 `EnsureItems()` 结束后才赋值）。
**实际上**：CTOR 中 `EnsureItems()` 确实创建了 `m_go1Top`，但 `m_items` 是在 CTOR 之后才被填充。
**根因**：CTOR 中 `m_go1Top` 被创建了（`EnsureItems size=0` 是创建前的日志），然后 `RebuildItemList` 检查 `if (m_go1Top)` 应该为 true。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 9d43accf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-191] error

**Logged**: 2026-08-29T10:23:35.184928Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
真正的问题是 **宿主的 `AllDisplayItemsWithPlugins` 不包含我们的项**。 让我确认：在 `OnInitialize` 之后立即检查 `AllDisplayItemsWithPlugins` 的内容：

### Error
```
真正的问题是 **宿主的 `AllDisplayItemsWithPlugins` 不包含我们的项**。
让我确认：在 `OnInitialize` 之后立即检查 `AllDisplayItemsWithPlugins` 的内容：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 51887f38

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-192] error

**Logged**: 2026-08-29T10:26:11.694259Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**最后诊断**：尝试非自绘模式——让宿主用 `GetItemValueText` 画，确认是否是自绘路径问题。

### Error
```
**最后诊断**：尝试非自绘模式——让宿主用 `GetItemValueText` 画，确认是否是自绘路径问题。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 08d0351e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-193] error

**Logged**: 2026-08-29T10:28:39.319763Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
但关键事实：`GetItemId=0`，`DrawItem=0`——即使 `IsCustomDraw=false` 也**不画**。 问题一定是 `AllDisplayItemsWithPlugins` 不包含我们的项。

### Error
```
但关键事实：`GetItemId=0`，`DrawItem=0`——即使 `IsCustomDraw=false` 也**不画**。
问题一定是 `AllDisplayItemsWithPlugins` 不包含我们的项。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 88388bcd

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-194] error

**Logged**: 2026-08-29T10:40:21.614732Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
让我用**最终测试**：设 `IsCustomDraw=false`（纯文本模式），部署后截任务栏。 如果 `--` 或 `Go 100%` 出现在任务栏，说明 `CalculateWindowSize` 正常但自绘路径有问题；如果仍不出现，说明 `AllDisplayItemsWithPlugins` 缺项。

### Error
```
让我用**最终测试**：设 `IsCustomDraw=false`（纯文本模式），部署后截任务栏。
如果 `--` 或 `Go 100%` 出现在任务栏，说明 `CalculateWindowSize` 正常但自绘路径有问题；如果仍不出现，说明 `AllDisplayItemsWithPlugins` 缺项。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 72d85977

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-195] error

**Logged**: 2026-08-29T10:41:21.925978Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
现在已有 `IsCustomDraw=false`（纯文本模式），干净部署无诊断日志。 如果任务栏仍无变化，问题不在自绘路径而在**宿主不认为这些项应该显示**。 如果列表中有但任务栏不显示，就是宿主的 `CalculateWindowSize` 有 bug 或配置路径不匹配。 这时需要你在 **任务栏窗口设置 → 显示设置** 里确认： 列表中是否有 `Go Top`/`Go Bot`/`Go2...

### Error
```
现在已有 `IsCustomDraw=false`（纯文本模式），干净部署无诊断日志。
如果任务栏仍无变化，问题不在自绘路径而在**宿主不认为这些项应该显示**。
如果列表中有但任务栏不显示，就是宿主的 `CalculateWindowSize` 有 bug 或配置路径不匹配。
这时需要你在 **任务栏窗口设置 → 显示设置** 里确认：
列表中是否有 `Go Top`/`Go Bot`/`Go2 Top`/`Go2 Bot`/`OR Top`/`OR Bot`
这些项是否已打勾
打勾后点 **确定**，看任务栏是否变化
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: d5a634cf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-196] error

**Logged**: 2026-08-29T10:44:27.496549Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
（只截任务栏 40px 高的条带——点开始菜单右边那个黑色空白区域）  同时让我查 `item_order` 是否有问题——可能宿主用旧的索引映射找不到我们的项：

### Error
```
（只截任务栏 40px 高的条带——点开始菜单右边那个黑色空白区域）

同时让我查 `item_order` 是否有问题——可能宿主用旧的索引映射找不到我们的项：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: d86dbbb5

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-197] error

**Logged**: 2026-08-29T10:46:25.251915Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
`NormalizeItemOrder` 不会添加不存在的项。 但 `GetItemId=0` 且 `DrawItemEx=0`——说明 `CalculateWindowSize` 有问题。

### Error
```
`NormalizeItemOrder` 不会添加不存在的项。
但 `GetItemId=0` 且 `DrawItemEx=0`——说明 `CalculateWindowSize` 有问题。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: cf5d4f5e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-198] error

**Logged**: 2026-08-29T10:48:35.723754Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
核心 bug 确认：`value_width` 存在 `IPluginItem*` key，但用 `CommonDisplayItem` key 取。

### Error
```
核心 bug 确认：`value_width` 存在 `IPluginItem*` key，但用 `CommonDisplayItem` key 取。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f90ffe59

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-199] error

**Logged**: 2026-08-29T10:50:06.635399Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
日志确认一切正确（`TMPluginGetInstance call=1`，`GetItem 0-5` 返回 `go_top` 等）。 **核心问题**：`operator<` 用 `GetItemIndex` 比较——如果 `GetItemIndex` 返回 -1（项不在 `m_plugins`），所有插件项被视为"相等"，`std::map` 行为异常。 让我验证 `GetItemIndex`...

### Error
```
日志确认一切正确（`TMPluginGetInstance call=1`，`GetItem 0-5` 返回 `go_top` 等）。
**核心问题**：`operator<` 用 `GetItemIndex` 比较——如果 `GetItemIndex` 返回 -1（项不在 `m_plugins`），所有插件项被视为"相等"，`std::map` 行为异常。
让我验证 `GetItemIndex` 对我们的项是否返回有效值——通过 `OnInitialize` 中直接调用：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2daa4abf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-200] error

**Logged**: 2026-08-29T10:54:04.858308Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**问题是 NPU Voice Clarity（语音焦点）独占了麦克风。

### Error
```
**问题是 NPU Voice Clarity（语音焦点）独占了麦克风。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 67e3af36

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-201] error

**Logged**: 2026-08-29T10:57:09.736723Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
看到两个问题：  **音频增强 仍显示 "Windows Studio Effects Voice Clarity"** → 需要改成 **"无"**（这是独占麦克风的根因） **语音焦点 已关** ✓

### Error
```
看到两个问题：

**音频增强 仍显示 "Windows Studio Effects Voice Clarity"** → 需要改成 **"无"**（这是独占麦克风的根因）
**语音焦点 已关** ✓
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 8c6b2b03

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-202] error

**Logged**: 2026-08-29T11:01:57.789606Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
但更根本的问题：任务栏显示了 **所有 GoItem**（Go Top/Go2 Top/Go2 Bottom/OR 等），而不是只显示用户勾选的项。 这是因为 `IsTaksbarItemDisplayed` 的 `operator<` 问题导致过滤失败。

### Error
```
但更根本的问题：任务栏显示了 **所有 GoItem**（Go Top/Go2 Top/Go2 Bottom/OR 等），而不是只显示用户勾选的项。
这是因为 `IsTaksbarItemDisplayed` 的 `operator<` 问题导致过滤失败。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: df823f93

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-203] error

**Logged**: 2026-08-29T11:08:54.123950Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
说明 JSON 解析失败或 `percent` 字段未被正确读取。

### Error
```
说明 JSON 解析失败或 `percent` 字段未被正确读取。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5c4c7743

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-204] error

**Logged**: 2026-08-29T11:12:00.182798Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
看到了，截图确认 **音频增强 仍显示 "Windows Studio Effects Voice Clarity"**，这就是问题所在。

### Error
```
看到了，截图确认 **音频增强 仍显示 "Windows Studio Effects Voice Clarity"**，这就是问题所在。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 00609a48

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-205] error

**Logged**: 2026-08-29T11:12:41.648763Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
** 这和之前 PushToTalk 的 `0x8000FFFF`、CapsWriter 的 `MME error 1` 是同一类问题 — 你这台 X1 Carbon Gen 14 的 **Intel Smart Sound Technology + Realtek** 音频栈对 Tauri/Rust/cpal 应用不兼容，无论怎么改设置都打不开。 这就是你这台机器的极限了，不是软件问题，是硬件音...

### Error
```
** 这和之前 PushToTalk 的 `0x8000FFFF`、CapsWriter 的 `MME error 1` 是同一类问题 — 你这台 X1 Carbon Gen 14 的 **Intel Smart Sound Technology + Realtek** 音频栈对 Tauri/Rust/cpal 应用不兼容，无论怎么改设置都打不开。
这就是你这台机器的极限了，不是软件问题，是硬件音频栈兼容性。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: dcfe6f43

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-206] error

**Logged**: 2026-08-29T11:18:32.334362Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
dll` 被系统锁住没删干净，现在安装器检测到目录存在+文件被占，静默失败了。 **先重启 → 再手动双击 `C:\Users\pass\AppData\Local\Temp\opencode\doubao2\extracted\DoubaoIME_Installer_0.

### Error
```
dll` 被系统锁住没删干净，现在安装器检测到目录存在+文件被占，静默失败了。
**先重启 → 再手动双击 `C:\Users\pass\AppData\Local\Temp\opencode\doubao2\extracted\DoubaoIME_Installer_0.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5d43868f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-207] error

**Logged**: 2026-08-29T11:27:20.616205Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
3 个问题一次修：  `--` 是 Go2（没配置 key），从 `plugin_display_item` 中删除 Go2 项 Go 上下重复 → 只保留上排（月剩余） OR 余额 0 → API 返回的 `remaining` 字段未正确解析

### Error
```
3 个问题一次修：

`--` 是 Go2（没配置 key），从 `plugin_display_item` 中删除 Go2 项
Go 上下重复 → 只保留上排（月剩余）
OR 余额 0 → API 返回的 `remaining` 字段未正确解析
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f23735f8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-208] error

**Logged**: 2026-08-29T11:28:44.567190Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**  | 工具 | 音频增强 Voice Clarity | 原因 | |---|---|---| | **豆包输入法** | **保持开启** ✓ | 走 TSF 输入法框架，不受 Studio Effects 独占影响，NPU 降噪反而帮助识别 | | doubao-murmur / PushToTalk / CapsWriter | 必须关闭 | 走 cpal/WASAPI 直接开麦克风，...

### Error
```
**

| 工具 | 音频增强 Voice Clarity | 原因 |
|---|---|---|
| **豆包输入法** | **保持开启** ✓ | 走 TSF 输入法框架，不受 Studio Effects 独占影响，NPU 降噪反而帮助识别 |
| doubao-murmur / PushToTalk / CapsWriter | 必须关闭 | 走 cpal/WASAPI 直接开麦克风，Voice Clarity 独占导致打开失败 |
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 8196161f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-209] error

**Logged**: 2026-08-29T11:41:08.815940Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
看到任务栏了： - Go 上 `19%` / 下 `19% weekly` — **旧 DLL 还在运行**（应该是 `62%`/`30d`） - OR 上 `$0` — OR key 可能无效或 `remaining` 解析有问题  让我同时排查两个问题——先测 OpenRouter API 确认 key 有效：

### Error
```
看到任务栏了：
- Go 上 `19%` / 下 `19% weekly` — **旧 DLL 还在运行**（应该是 `62%`/`30d`）
- OR 上 `$0` — OR key 可能无效或 `remaining` 解析有问题

让我同时排查两个问题——先测 OpenRouter API 确认 key 有效：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 19fbd4ac

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-210] error

**Logged**: 2026-08-29T11:42:29.033843Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
DPAPI 解密在 Services 会话失败（不同用户上下文）。 OR key 在 TrafficMonitor 的 Console 会话中可解密，但 `$0` 说明解密也失败了。

### Error
```
DPAPI 解密在 Services 会话失败（不同用户上下文）。
OR key 在 TrafficMonitor 的 Console 会话中可解密，但 `$0` 说明解密也失败了。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 443c32c5

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-211] error

**Logged**: 2026-08-29T11:52:26.260636Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
两个问题：  让我改成： - 初始显示 `● Go`（加载中） - fetch 完成后更新为模型名 - **点击开关时重新 fetch**，保证数据最新 5 +1`（+1 表示还有一个）

### Error
```
两个问题：

让我改成：
- 初始显示 `● Go`（加载中）
- fetch 完成后更新为模型名
- **点击开关时重新 fetch**，保证数据最新
5 +1`（+1 表示还有一个）
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e7280c3d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-212] error

**Logged**: 2026-08-29T12:02:10.567783Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
问题在解析——`FetchOr` 返回 `OK` 但 `usage=0.

### Error
```
问题在解析——`FetchOr` 返回 `OK` 但 `usage=0.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c546654e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-213] error

**Logged**: 2026-08-29T12:37:00.882177Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
问题：**旧 TM 进程（OneDrive 原目录）还在运行**，新 DLL 没被加载。

### Error
```
问题：**旧 TM 进程（OneDrive 原目录）还在运行**，新 DLL 没被加载。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 868cca67

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-214] error

**Logged**: 2026-08-29T13:23:06.504087Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**根因确认**：`plugin_display_item` **不含** `go2_top`/`go2_bottom`！ 问题：`plugin_display_item` 是宿主的静态保存配置，Go2 启用后宿主没有自动追加到列表。

### Error
```
**根因确认**：`plugin_display_item` **不含** `go2_top`/`go2_bottom`！
问题：`plugin_display_item` 是宿主的静态保存配置，Go2 启用后宿主没有自动追加到列表。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5b3af739

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-215] error

**Logged**: 2026-08-29T21:58:20.550228Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
你能帮我从软路由 OpenClash 配置里找到那个 Go API key 吗？ Go2 显示的问题我已经修了（自动追加到 `plugin_display_item`），现在重启后应该能看到。 有两种方式： **在软路由 LuCI** → 服务 → OpenClash → 外部控制配置 → 看是否有 `provider` 或自定义规则里的 API key **或者直接告诉我那个 Go API ke...

### Error
```
你能帮我从软路由 OpenClash 配置里找到那个 Go API key 吗？
Go2 显示的问题我已经修了（自动追加到 `plugin_display_item`），现在重启后应该能看到。
有两种方式：
**在软路由 LuCI** → 服务 → OpenClash → 外部控制配置 → 看是否有 `provider` 或自定义规则里的 API key
**或者直接告诉我那个 Go API key**（`sk-` 开头的），我直接写入 Go2 设置
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: fdcd8840

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-216] error

**Logged**: 2026-08-29T22:16:58.628030Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
请直接告诉我任务栏上现在显示的具体内容和布局问题（比如哪些项排在前面、哪些在后面、间距如何、文字是否有截断等），我来调整。

### Error
```
请直接告诉我任务栏上现在显示的具体内容和布局问题（比如哪些项排在前面、哪些在后面、间距如何、文字是否有截断等），我来调整。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 03f366cf

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-217] error

**Logged**: 2026-08-29T22:23:31.870024Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
如果没有显示，请按 F12 打开 Console，看看有没有 `[OC All-in-One]` 开头的日志，或者有什么红色报错。

### Error
```
如果没有显示，请按 F12 打开 Console，看看有没有 `[OC All-in-One]` 开头的日志，或者有什么红色报错。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ce44871b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-218] error

**Logged**: 2026-08-29T22:30:06.522279Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
如果没看到，请按 F12 → Console，把 `[OC All-in-One]` 开头的日志发给我，我好定位问题。

### Error
```
如果没看到，请按 F12 → Console，把 `[OC All-in-One]` 开头的日志发给我，我好定位问题。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 327ed60f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-219] error

**Logged**: 2026-08-29T22:32:53.036041Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
请切换到**控制台**标签（不是"问题"标签），然后筛选输入 `[OC All-in-One]`，看看有没有日志输出。

### Error
```
请切换到**控制台**标签（不是"问题"标签），然后筛选输入 `[OC All-in-One]`，看看有没有日志输出。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: b37d7be8

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-220] error

**Logged**: 2026-08-29T22:33:55.235620Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
找到了两个关键问题：  **`norm is not defined`**：`norm()` 函数定义在 `GO_MODULE` 内部，`MODEL_QUOTA` 模块访问不到 **`Quota map loaded: 0 models`**：数据没加载到

### Error
```
找到了两个关键问题：

**`norm is not defined`**：`norm()` 函数定义在 `GO_MODULE` 内部，`MODEL_QUOTA` 模块访问不到
**`Quota map loaded: 0 models`**：数据没加载到
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e919c6a1

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-221] error

**Logged**: 2026-08-29T22:47:04.975671Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
明白，Go1/Go2/OR 保持，问题是**软路由插件布局混乱**。

### Error
```
明白，Go1/Go2/OR 保持，问题是**软路由插件布局混乱**。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 32b34bad

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-222] error

**Logged**: 2026-08-29T22:51:41.854827Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
playwright-edge 连接超时，可能是 Playwright 扩展没有连接上。

### Error
```
playwright-edge 连接超时，可能是 Playwright 扩展没有连接上。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 9128aa9a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-223] error

**Logged**: 2026-08-29T22:53:20.111195Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
需要在 opencode 的配置里启动 Playwright MCP 时加上 `--extension` 参数和 token。 但这不是脚本的问题，是 Playwright MCP 的配置问题。 我们还是直接用你之前的方式（F12 看 Console）来验证吧。

### Error
```
需要在 opencode 的配置里启动 Playwright MCP 时加上 `--extension` 参数和 token。
但这不是脚本的问题，是 Playwright MCP 的配置问题。
我们还是直接用你之前的方式（F12 看 Console）来验证吧。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 2523e19e

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-224] error

**Logged**: 2026-08-29T22:55:53.866534Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
配置已经正确了（`--extension` flag + token 都对）。 问题是 Playwright MCP 服务端没有启动或没有连接上 Edge 扩展。

### Error
```
配置已经正确了（`--extension` flag + token 都对）。
问题是 Playwright MCP 服务端没有启动或没有连接上 Edge 扩展。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 37a0ba41

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-225] error

**Logged**: 2026-08-29T23:03:23.576065Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
这是两个不同的问题：  **Clash 节点不对**：`FetchProxies` 没找到 `now` 字段，回退到 DIRECT **SYS 文本截断**：`CPU 100% MEM 49` 被宽度限制截断  快速检查 `FetchProxies` 的返回：

### Error
```
这是两个不同的问题：

**Clash 节点不对**：`FetchProxies` 没找到 `now` 字段，回退到 DIRECT
**SYS 文本截断**：`CPU 100% MEM 49` 被宽度限制截断

快速检查 `FetchProxies` 的返回：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f6f7a277

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-226] error

**Logged**: 2026-08-29T23:09:26.728781Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
问题：标签和值混在一起，`DIREC` 截断，`0ms rule` 无意义。

### Error
```
问题：标签和值混在一起，`DIREC` 截断，`0ms rule` 无意义。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: f46f1f1a

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-227] error

**Logged**: 2026-08-29T23:10:29.129217Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
需要查找： 任何包含 "playwright" 关键词的文件 检查日志文件中是否有 playwright 相关的错误 查看是否有 playwright 的 npm 依赖或安装脚本 json 中是否有 playwright 相关配置

### Error
```
需要查找：
任何包含 "playwright" 关键词的文件
检查日志文件中是否有 playwright 相关的错误
查看是否有 playwright 的 npm 依赖或安装脚本
json 中是否有 playwright 相关配置
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 3cb91980

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-228] error

**Logged**: 2026-08-29T23:16:56.978603Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
发现了问题线索： Edge 浏览器正在运行（PID 6504） env` 文件中有 `PLAYWRIGHT_MCP_EXTENSION_TOKEN` 但 `HTTPS_PROXY` 和 `HTTP_PROXY` 环境变量未定义（可能影响连接） 调用工具返回 "Request timed out"

### Error
```
发现了问题线索：
Edge 浏览器正在运行（PID 6504）
env` 文件中有 `PLAYWRIGHT_MCP_EXTENSION_TOKEN`
但 `HTTPS_PROXY` 和 `HTTP_PROXY` 环境变量未定义（可能影响连接）
调用工具返回 "Request timed out"
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: c003254b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-229] error

**Logged**: 2026-08-29T23:19:03.858744Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
好问题，让我从实用性角度设计：  **Clash（OpenClash）- 上排**： - 显示**代理模式**（`rule`/`global`/`direct`）—— 最核心信息，一眼知道走不走代理 - 下排显示**连接数**（`12conn`）—— 有活跃连接=正在走代理，没连接=直连 - 有代理节点时额外显示**节点+延迟**（如 `HK-01 45ms`），直连时只显示 `rule`/`12...

### Error
```
好问题，让我从实用性角度设计：

**Clash（OpenClash）- 上排**：
- 显示**代理模式**（`rule`/`global`/`direct`）—— 最核心信息，一眼知道走不走代理
- 下排显示**连接数**（`12conn`）—— 有活跃连接=正在走代理，没连接=直连
- 有代理节点时额外显示**节点+延迟**（如 `HK-01 45ms`），直连时只显示 `rule`/`12conn`

**软路由 - 下排**：
- 显示**温度 + CPU + 内存**合并为一行（`49° 50/100`）
- 温度最重要（过热会降速），CPU/内存辅助判断负载
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: bafa6532

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-230] error

**Logged**: 2026-08-29T23:22:41.512414Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
错误：`无法加载文件 C:\Program Files\nodejs\npx.

### Error
```
错误：`无法加载文件 C:\Program Files\nodejs\npx.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: adfbb418

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-231] configuration

**Logged**: 2026-08-29T23:25:47.761389Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**能做到的**：OpenClash 的订阅配置文件（`/etc/openclash/config/*. **做不到的（全自动）**：从当前的 Services 会话 SSH 不到软路由（超时）。 需要你**帮忙做一次**：在软路由终端或 LuCI 里执行一条命令，把订阅 URL 给我。 把输出贴给我，之后我就能**全自动**查余额了——插件启动时自动读配置、自动请求订阅接口、自动显示剩余流量和到...

### Error
```
**能做到的**：OpenClash 的订阅配置文件（`/etc/openclash/config/*.
**做不到的（全自动）**：从当前的 Services 会话 SSH 不到软路由（超时）。
需要你**帮忙做一次**：在软路由终端或 LuCI 里执行一条命令，把订阅 URL 给我。
把输出贴给我，之后我就能**全自动**查余额了——插件启动时自动读配置、自动请求订阅接口、自动显示剩余流量和到期时间。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 20ea84ee

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260829-232] error

**Logged**: 2026-08-29T23:41:11.935387Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
要读 OpenClash 的订阅配置文件，只能从**你的桌面终端**执行一次命令，把订阅 URL 贴给我。 回看之前的操作： "` → **失败**（超时/编码乱码） "` → **失败** 100:8000`（mcp-memory）

### Error
```
要读 OpenClash 的订阅配置文件，只能从**你的桌面终端**执行一次命令，把订阅 URL 贴给我。
回看之前的操作：
"` → **失败**（超时/编码乱码）
"` → **失败**
100:8000`（mcp-memory）
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 44826bfe

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-29
- Last-Seen: 2026-08-29

---


## [ERR-20260830-233] error

**Logged**: 2026-08-30T00:12:03.846379Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
在 plan mode 下我只分析：  **当前状态**： \pass` ✓ - `Status` = `Stopped` ✗（启动失败） - `LsaOpenPolicy()` 错误 → 密码不匹配或权限不足  **你需要在桌面 PowerShell 执行**（完整路径）： 如果还是失败，说明密码不对——你 Windows 登录密码不是 `31415926` 吗？ 或者 NSSM 需要管理员权限...

### Error
```
在 plan mode 下我只分析：

**当前状态**：
\pass` ✓
- `Status` = `Stopped` ✗（启动失败）
- `LsaOpenPolicy()` 错误 → 密码不匹配或权限不足

**你需要在桌面 PowerShell 执行**（完整路径）：
如果还是失败，说明密码不对——你 Windows 登录密码不是 `31415926` 吗？
或者 NSSM 需要管理员权限运行：右键 PowerShell → **以管理员身份运行** → 再执行上面的命令。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 62ad5507

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-234] error

**Logged**: 2026-08-30T00:12:49.265530Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
opencode-web: START: 由于登录失败而无法启动服务。

### Error
```
opencode-web: START: 由于登录失败而无法启动服务。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 379930fc

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-235] error

**Logged**: 2026-08-30T00:45:54.612040Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
这也解释了之前 doubao-murmur/PushToTalk 报错的原因 — 它们走的是 WASAPI 直连，绕过了 Intel 驱动的 AGC 增益链路，直接拿到的是**未经放大**的原始弱信号，所以打不开麦克风。 搜完了，你这个发现非常对，原因很简单：  **"设备默认效果" = Intel 驱动的 AGC（自动增益），Voice Clarity = AI 降噪，两者逻辑相反：**  |...

### Error
```
这也解释了之前 doubao-murmur/PushToTalk 报错的原因 — 它们走的是 WASAPI 直连，绕过了 Intel 驱动的 AGC 增益链路，直接拿到的是**未经放大**的原始弱信号，所以打不开麦克风。
搜完了，你这个发现非常对，原因很简单：

**"设备默认效果" = Intel 驱动的 AGC（自动增益），Voice Clarity = AI 降噪，两者逻辑相反：**

| | 设备默认效果 (你现在用的) | Windows Studio Effects Voice Clarity |
|---|---|---|
| **原理** | **放大**所有声音（AGC 自动增益） | **压制**所有噪音（AI 降噪） |
| **小声处理** | 把小声**放大** → 豆包能收到 | 把小声当噪音**压掉** → 豆包收不到 |
| **远距离** | 远处弱信号被放大 → 能触发 | 弱信号被抑制 → 无反应 |
| **噪音** | 一起放大（键盘/风扇也变响） | 噪音被滤掉（干净） |
| **适合** | **你要的小声远距离** ✓ | 视频会议/嘈杂环境 |

** 你现在的截图就是最优解：
- 音频增强 = **设备默认效果**（AGC 增益，小声远距离最佳）
- 输入音量 = 100
- 格式 = 2通道 24位 48000Hz
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 325dfeeb

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-236] error

**Logged**: 2026-08-30T01:16:32.780731Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**下一步诊断**：查看日志确认 `DataRequired` 是否为 Go2 拉取了数据，以及 Clash/SYS 是否有数据。 - `100` = Go1（可能是 weekly 限流→`100-maxPercent`→0→显示0→或 rate-limited→显示100%） - `---` = Go2 无数据（key 解密失败或 API 未拉取） - `$10` = OR 余额 ✓ - **缺...

### Error
```
**下一步诊断**：查看日志确认 `DataRequired` 是否为 Go2 拉取了数据，以及 Clash/SYS 是否有数据。
- `100` = Go1（可能是 weekly 限流→`100-maxPercent`→0→显示0→或 rate-limited→显示100%）
- `---` = Go2 无数据（key 解密失败或 API 未拉取）
- `$10` = OR 余额 ✓
- **缺少标签**（Go/OR 没显示）
- **Clash/SYS 数据缺失**（没看到 `C50 M48 54°`）
01 56` 混入
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 5f7ad8be

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-237] error

**Logged**: 2026-08-30T01:20:32.180473Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
2 已推送，GitHub Raw 确认 `@version 2. 2 修了什么（用你的 Edge 真机抓到的根因）：** rrmv-ad-active`，漏了上层容器） rrmv-ad-active` 的 spinner/loading 覆盖规则 - `setAdActive` 现在同时给三个层级容器加 class  **重装安装：** js

### Error
```
2 已推送，GitHub Raw 确认 `@version 2.
2 修了什么（用你的 Edge 真机抓到的根因）：**
rrmv-ad-active`，漏了上层容器）
rrmv-ad-active` 的 spinner/loading 覆盖规则
- `setAdActive` 现在同时给三个层级容器加 class

**重装安装：**
js
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: aa334a05

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-238] error

**Logged**: 2026-08-30T01:52:02.004896Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**当前状态总结**： - TM 运行中（PID 25024），你看到 `59% -- $10` = 新 DLL 已加载 log` 空 → `DllMain` 没执行或写入失败 - `modules=0` → 安全软件阻止模块枚举 - 我无法从终端 `taskkill` TM（HipsDaemon 保护）  **启动后我立即做的**： log` 确认 DLL 加载 读 PID 日志确认数据获取 截...

### Error
```
**当前状态总结**：
- TM 运行中（PID 25024），你看到 `59% -- $10` = 新 DLL 已加载
log` 空 → `DllMain` 没执行或写入失败
- `modules=0` → 安全软件阻止模块枚举
- 我无法从终端 `taskkill` TM（HipsDaemon 保护）

**启动后我立即做的**：
log` 确认 DLL 加载
读 PID 日志确认数据获取
截屏验证任务栏显示
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 0a53ad4b

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-239] error

**Logged**: 2026-08-30T01:53:03.673838Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
问题只是：现在有两个 TM 实例，你只需要关掉这个"已经在运行"的对话框（点 **退出程序(X)** 关掉旧实例），任务栏就会切换到新实例。

### Error
```
问题只是：现在有两个 TM 实例，你只需要关掉这个"已经在运行"的对话框（点 **退出程序(X)** 关掉旧实例），任务栏就会切换到新实例。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7f2f13ed

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-240] error

**Logged**: 2026-08-30T02:20:41.137644Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
The `C100` suggests proc/stat returned 100% (router genuinely busy) OR proc/stat failed and load approximation gave 100%.

### Error
```
The `C100` suggests proc/stat returned 100% (router genuinely busy) OR proc/stat failed and load approximation gave 100%.
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7703926f

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-241] error

**Logged**: 2026-08-30T02:23:50.929822Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
两个问题：  **上下不对齐** — 内置项（上传/下载/CPU/内存）混在插件项中间，宽度不同 **软路由数值不变** — 数据没更新（可能是 ubus 连接失败或 `/proc/stat` 差分卡住）  让我检查当前配置和 ubus 连接状态：

### Error
```
两个问题：

**上下不对齐** — 内置项（上传/下载/CPU/内存）混在插件项中间，宽度不同
**软路由数值不变** — 数据没更新（可能是 ubus 连接失败或 `/proc/stat` 差分卡住）

让我检查当前配置和 ubus 连接状态：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 7bcf6435

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-242] error

**Logged**: 2026-08-30T02:24:18.932161Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
**问题1**：`tbar_display_item = 15`（内置掩码）+ `item_order` 混入了 0-13（内置项）。 **问题2**：`/proc/stat` 差分用 static 变量，5s 轮询时第一次差分为0，后续应该正常。

### Error
```
**问题1**：`tbar_display_item = 15`（内置掩码）+ `item_order` 混入了 0-13（内置项）。
**问题2**：`/proc/stat` 差分用 static 变量，5s 轮询时第一次差分为0，后续应该正常。
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 782d5e2d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-243] fix

**Logged**: 2026-08-30T02:29:33.677626Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
The user wants to understand how other platforms handle self-improvement, self-iteration, auto-memory, and error avoidance, then get recommendations for optimizing OpenCode's memory. ## Goal  ## Instr...

### Error
```
The user wants to understand how other platforms handle self-improvement, self-iteration, auto-memory, and error avoidance, then get recommendations for optimizing OpenCode's memory.
## Goal

## Instructions

- **Primary focus**: Memory system research and comparison (not code changes)
md §1)
- **Research scope**: Hermes Agent (user saw a post praising it), plus mainstream platforms (Claude Code, Cursor, Windsurf, Cline/Roo, Aider, Continue, OpenHands, Cody)
- **Output goal**: Concrete recommendations for OpenCode memory improvements
- **Plan mode**: Can only read/search, cannot edit files yet

## Discoveries

com/NousResearch/hermes-agent, 238K stars)
), L2 (session search via SQLite FTS5)
- **Frozen snapshot**: Memory injected at session start, immutable during session → protects LLM prefix cache
- **Bounded memory is a feature**: Forces agent to learn "forgetting and merging" - capacity is intelligence
- **Nudge system**: Turn counters trigger background review agent (fork) that writes to memory/skills asynchronously, zero latency impact
- **Skills system**: Auto-create from experience, patch (not rewrite) on subsequent use, progressive disclosure (name+summary in system prompt, full text on demand)
- **Self-evolution pipeline**: DSPy + GEPA for offline prompt evolution, ~$2-10 per run
- **Honcho**: Dialectic reasoning for user modeling (observe→reason→inject per turn)
- **No vector DB in core**: FTS5 for cheap broad recall + LLM semantic refinement
- **Security**: Prompt injection scanning before memory write

### Current OpenCode Memory
100:8000
js: regex detection + session-end aggregation
- Error self-learning: auto-inject error memories at session start
- Memory backup: daily + cross-device sync

## Accomplished

**Hermes research**: Detailed analysis of 4-layer memory, bounded philosophy, nudge→background review, skills system, GEPA evolution pipeline
md + Hindsight wrapper), Continue (rules), OpenHands (dual-layer memory + safety model), Cody (no native memory)
**OpenCode analysis**: mcp-memory-service + memory-plugin structure understood

## Remaining Tasks

**Present research findings**: Show comparison table, highlight Hermes unique mechanisms, identify gaps in OpenCode
)
**Create improvement plan**: Concrete recommendations for OpenCode memory system
**After plan approval**: Implement changes (memory-plugin updates, config changes, skill updates)

## Relevant files / directories

js`: Auto-capture plugin
jsonc`: Memory provider config
jsonc`: MCP memory service config
md`: §6 memory rules, §9 error self-learning
env`: OPENCODE_SERVER_PASSWORD, GITHUB_PERSONAL_ACCESS_TOKEN
md`: opencode maintenance skill
js`: Userscript (previous work)

## Agent Verification State

- **Current Agent**: Claude Code (Plan mode - read-only)
- **Verification Progress**: N/A (research phase, no code changes yet)
- **Pending Verifications**: None
- **Previous Rejections**: None
- **Acceptance Status**: N/A

## Delegated Agent Sessions

| session: `ses_faf8

[...truncated from original 3091 chars...]
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e2c595c0

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-244] error

**Logged**: 2026-08-30T02:32:43.635549Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
OpenCode 已有 `skills/` 目录（用户创建的技能文件）。 复用现有 `skills/` 目录**：经验作为 SKILL. 先确认几个关键问题：  ---  **问题 1：优先级**  有界记忆**：给记忆加硬容量限制，逼 Agent 学会遗忘和合并 后台自省**：会话结束后 fork 后台 Agent 复盘，提取技能/教训 Skills 系统**：经验沉淀为可复用的技能文件 安全扫...

### Error
```
OpenCode 已有 `skills/` 目录（用户创建的技能文件）。
复用现有 `skills/` 目录**：经验作为 SKILL.
先确认几个关键问题：

---

**问题 1：优先级**

有界记忆**：给记忆加硬容量限制，逼 Agent 学会遗忘和合并
后台自省**：会话结束后 fork 后台 Agent 复盘，提取技能/教训
Skills 系统**：经验沉淀为可复用的技能文件
安全扫描**：写入前扫描 prompt injection、凭据外泄
全部一起做**：按依赖顺序依次实现

**问题 2：有界记忆容量**

2000-3000 字符**（类似 Hermes，强制精炼）
5000-8000 字符**（宽松一些，适合 OpenCode 的多场景）
不设限制**（保持当前行为，但可能越来越臃肿）

**问题 3：Skills 系统**

md 的补充
新建 `hermes-skills/` 目录**：分离"用户技能"和"Agent 自学技能"
不新建，只在记忆库中标记为 skill**：保持简单

---
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: ff4c0730

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-245] error

**Logged**: 2026-08-30T03:10:36.460330Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
15&page_size=100` 分页拉取 1448 条，写入 `mem_export_full. md`：`tags` 含 `error`/`pitfall` 的条目转为 `ERR-... **验证**：`grep -c "^\#\# \[LRN" . 是否按 `page/page_size` 全量重导并覆盖之前的 10 条迁移？ 确认问题：  - **总数 1448 条**，`page=1&...

### Error
```
15&page_size=100` 分页拉取 1448 条，写入 `mem_export_full.
md`：`tags` 含 `error`/`pitfall` 的条目转为 `ERR-...
**验证**：`grep -c "^\#\# \[LRN" .
是否按 `page/page_size` 全量重导并覆盖之前的 10 条迁移？
确认问题：

- **总数 1448 条**，`page=1&page_size=100` 可正确分页（`has_more=true`）
- 之前用 `limit/offset` 仅拿到 10 条（接口忽略该参数，默认 `page_size=10`），导致迁移遗漏 1438 条

**Plan 模式不执行写入，先给出补救规划（待你确认后退出 Plan 模式落地）：**

json`（含 `content_hash` 去重）
**分类落盘**：
md`：按 `tags` 区分 `learning/correction/best_practice`，每条按 `LRN-YYYYMMDD-XXX` 格式写入
` 格式
   - 条目含 `key/token/password` 的跳过落盘（安全过滤）
   - 超长内容按技能建议的 `maxContentLength` 截断并保留 `Original-Hash`
learnings`
md` 与 `wc -l` 计数校验 1448 条是否落盘完成

需要你确认：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: 4b9f09d2

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---


## [ERR-20260830-246] error

**Logged**: 2026-08-30T03:26:27.611009Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
现在我清楚了截图中的三个问题：  ` (句号)，需要改显示格式 **数据太挤**：12 项（8 插件 + 4 内置）堆在任务栏一行 **Go 轮播**：go_top 需要定时切换显示"额度剩余"和"恢复时间倒计时"  让我查看数据结构确认 Go 轮播的实现基础：

### Error
```
现在我清楚了截图中的三个问题：

` (句号)，需要改显示格式
**数据太挤**：12 项（8 插件 + 4 内置）堆在任务栏一行
**Go 轮播**：go_top 需要定时切换显示"额度剩余"和"恢复时间倒计时"

让我查看数据结构确认 Go 轮播的实现基础：
```

### Context
- Source: mcp-memory-service migration
- Tags: auto-capture,error,opencode
- Original Hash: e803bc7d

### Suggested Fix
已迁移至本地 .learnings，后续按需提升至 AGENTS.md

### Metadata
- Reproducible: unknown
- Related Files: N/A
- Pattern-Key: migration.migrated-entry
- Recurrence-Count: 1
- First-Seen: 2026-08-30
- Last-Seen: 2026-08-30

---

