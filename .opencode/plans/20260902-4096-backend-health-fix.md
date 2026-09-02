# 4096 后端检查修复 — Plan

## 背景
- 用户指令：`4096后端检查 修复`
- 4096 = `opencode serve --hostname 0.0.0.0 --port 4096` 唯一后端入口（Web UI / TUI / 移动端 / Tailscale 都走它）
- 现状已收集（只读探查）：
  - `serve.ps1:14-15` 注入 13 个 `{env:}` + `NODE_OPTIONS=4096` 并 `& opencode.exe serve`
  - `tools/opencode-tray/opencode-tray.cpp` v7 托盘直管 serve（15s Probe：IsPortOpen + WinHttp GET /global/health + BasicAuth），WatchThread 15s 熔断3次，RestartThread 等端口释放
  - `scripts/serve-health-watchdog.ps1` 仍以 NSSM 服务 `opencode-web` 为对象（5min 定时），Test-Config + Test-DbIntegrity + Get-Service/Start-Service + health check (`127.0.0.1:4096/global/health` 10s)
  - `scripts/verify-serve-env.ps1` 5步自检：端口/匿名401/带认证200/`/config` apiKey/`Missing API key` 5min
  - `health-watchdog.log:671-` 显示 2026-08-30 起每5min `service status=Stopped, starting` → 15s 后 `healthy` 循环（>800 次），说明服务未稳态 Running，watchdog 误判或双守护冲突
  - `check-health.ps1:20` Tailscale IP 硬编码 `100.71.42.119`，与当前 tailnet 可能不一致

## 目标（修复完成标准）
- `curl -u opencode:$PW http://127.0.0.1:4096/global/health` 200，匿名 401，`/config` 的 `opencode-go-2.options.apiKey` 非空且非 `{env:}`
- 托盘与 watchdog 单一守护责任，无双杀/双启，无 `Stopped` 刷屏；托盘图标颜色准确（绿/黄/红/灰）
- 僵尸端口不再需重启电脑：IsZombiePid + 端口等待 + 日志节流
- 三处 `{env:}` 清单单一来源，`sync-env-to-tray.ps1 -Check` 为 0

## 问题诊断（证据）
1. **双守护冲突**：NSSM `opencode-web` 与 C++ tray 同争 4096。watchdog 以 NSSM 为真，tray 自管进程；NSSM Paused/Stopped 时 tray 已拉起，但 watchdog 仍 `Start-Service` 造成 15s 重启噪音。`health-watchdog.log:699-` 显示 `Stopped, starting` 几乎固定 5min 触发。
2. **服务状态误判**：watchdog 仅看 `Get-Service.Status != Running` 就起服务，未校验端口实际健康；Paused 僵尸时 Start-Service 必失败，旧版无僵尸预检会刷 CRITICAL。
3. **健康检查实现差异**：watchdog 用 `ASCII.GetBytes` 拼 Basic，verify/tray 用 `UTF8`；含非ASCII密码会 401。超时 10s vs tray 5s 不一致。
4. **环境注入分叉**：NSSM `install-nssm-opencode.ps1:76-77` 用 `;` 拼 `AppEnvironmentExtra`，含分号值被截断风险；注入清单与 `sync-env-to-tray` 的 13 变量不完全对齐（watchdog 未参与 sync）。
5. **CLOSE_WAIT 泄漏误报/漏报**：watchdog `>10 CLOSE_WAIT` 即 warn，但 tray 无此指标；SSE 长连残留 12-20 条被持续 warn 刷屏（`health-watchdog.log:970-`）。
6. **硬编码漂移**：`check-health.ps1` Tailscale IP 写死，换网段后永远 Error，掩盖真 health。

## 方案（推荐 A，备选 B）
- **A. 单守护收敛（推荐）**：明确 `tray 为主、NSSM 退役、watchdog 转为观测/告警`。改动最小、符合现有 tray v7 直管现状，回滚只需重装 NSSM。
- **B. 双守护保留**：NSSM 保持，tray 仅做 UI，watchdog 负责拉起。需修 NSSM 优雅停（AppStopMethodConsole）+ DACL + 联调，复杂度高、已踩坑多。

采用 **A**。

## 设计

### 架构 After
```
Before (双守护):
  NSSM opencode-web ─┐
                      ├─争用─ 4096 ─ mobile/TUI/Web
  opencode-tray ──────┘
  watchdog(5min) → Get-Service → Restart-Service → health

After (单守护):
  opencode-tray (唯一拉起) ── 4096 ── mobile/TUI/Web
  watchdog(5min) → 只读观测：Test-Config/DB + GET /global/health + /config apiKey
                   + 端口/PID 校验（不主动 Start-Service，仅日志+可选 ntfy）
  verify-serve-env.ps1 → 重启后自检（port/health/config/log）
  NSSM 服务 Disabled/Removed（保留脚本可回滚）
```

### 界面可视化（托盘图标）
| 状态 | Before | After | 颜色 | 尺寸/位置 | 交互 |
|------|--------|-------|------|-----------|------|
| 运行中 | 绿点常亮（但 watchdog 刷 Stopped 日志误导） | 绿 `opencode-green.ico` 16x16 右下托盘 | 绿 #2ecc71 | 16x16 托盘区 | 双击→http://127.0.0.1:4096 |
| 启动中/重启中 | 无黄态，watchdog 无提示 | 黄 `opencode-yellow.ico` + tooltip “重启中” | 黄 #f1c40f | 同上 | 右键菜单“重启服务”转菊花 1.2s |
| 已停止 | 灰/红混用 | 红 `opencode-red.ico` + tooltip “已停止 PID 0” | 红 #e74c3c | 同上 | 右键“重启服务”可拉起 |
| 僵尸 | 日志每15s刷 zombie | 托盘红 + 日志节流（状态变更才写） | 红闪 | - | WatchThread 等 10s 再试，超3次提示需重启电脑 |

### 关键文件与改动
| 文件 | 改动 |
|------|------|
| `tools/opencode-tray/opencode-tray.cpp:131-165` | InjectUserEnv 已 OK；追加日志节流（status changed 才写）、CLOSE_WAIT 计数写入 tooltip（可选）、IsZombiePid 已 OK |
| `scripts/serve-health-watchdog.ps1` | **重构为观测模式**：去掉 `Start-Service/Restart-Service` 主动拉起分支；保留：① Test-Config/DB ② Get-NetTCPConnection 僵尸检测（沿用 tray 的 IsZombiePid 逻辑：OpenProcess+exitCode）③ `Invoke-WebRequest /global/health` 带 UTF8 Basic ④ `/config` apiKey 非空校验 ⑤ CLOSE_WAIT 阈值调至 25 且仅状态变更日志；新增 `--EnableAutoFix` 开关才允许自愈（默认 off） |
| `scripts/verify-serve-env.ps1` | 统一密码读取：优先 HKCU\Environment，回退 User env；Basic 用 UTF8（与 tray 一致）；新增 Tailscale IP 自动发现（`tailscale ip -4`）替代硬编码 |
| `scripts/sync-env-to-tray.ps1` | 纳入 watchdog 为第4同步对象（解析 `GetEnvironmentVariable` 清单），`Check` 失败才提示；`serve.ps1` 注入块保持为单一模板 |
| `serve.ps1` | 无逻辑改，仅确保与 sync 同步；`NODE_OPTIONS` 保持 `4096`（内存非端口，别与健康检查混淆） |
| `check-health.ps1` | Tailscale IP 改为动态探测：`(tailscale ip -4).Trim()` 回退 100.x 硬编码；三段 health 统一 5s 超时 + 状态码打印 |
| `scripts/install-nssm-opencode.ps1` | 保留但标记 `Deprecated - tray 主管后仅回滚用`；若执行则 `sc config opencode-web start= disabled` |
| `health-watchdog.log` | 日志轮转：追加 `AppRotateBytes` 类似逻辑（>10MB 截尾），避免无限增长 |

## 实现步骤（build 阶段分 4 批）
1. **基线校验**（只读）：跑 `pwsh -File scripts/sync-env-to-tray.ps1 -Check`、`pwsh -File scripts/verify-serve-env.ps1`、`Get-Service opencode-web`、`Get-NetTCPConnection -LocalPort 4096`、`curl.exe -u opencode:$PW http://127.0.0.1:4096/global/health -i` 录快照
2. **watchdog 观测化**：重写 `serve-health-watchdog.ps1`（保留备份 `*.bak-20260902-observability`），新增 param `[switch]$EnableAutoFix`，默认只日志；健康检查改 UTF8 Basic，CLOSE_WAIT 阈值 25，僵尸检测复用托盘判定
3. **verify/check 统一**：修 `verify-serve-env.ps1`（UTF8 Basic + Tailscale 自动发现 + HKCU 优先）、`check-health.ps1`（动态 IP）、`sync-env-to-tray.ps1` 纳入 watchdog
4. **NSSM 退役**：`sc.exe config opencode-web start= disabled`（需提权）或 `nssm remove`（二选一，默认 disable 保留回滚），计划任务 `OpenCode Health Watchdog` 保持 5min 但改为观测日志；托盘 `build-tray.bat` 重编（若改 cpp 日志节流）

## 验证（Verification Before Completion）
- `pwsh -File scripts/sync-env-to-tray.ps1 -Check` → `OK - all 4 files in sync`
- `pwsh -File scripts/verify-serve-env.ps1` → `ALL PASS`（port/anonymous 401/auth 200/apiKey resolved/no Missing key）
- `pwsh -File scripts\check-health.ps1` → Local/LAN/Tailscale 三段均 200
- 连续 30min `health-watchdog.log` 无 `service status=Stopped, starting` 刷屏，仅 `healthy` 或偶发 `warn CLOSE_WAIT`
- 托盘：杀 `opencode.exe` 进程 → 15s 内自动拉起（熔断3次内），图标绿→黄→绿；僵尸模拟（`taskkill` 后端口仍 LISTEN）→ 日志 `zombie detected ... will retry next Watch` 且不死循环
- 回滚：`nssm install` 脚本可一键重建服务，watchdog 加 `-EnableAutoFix` 还原自愈

## 风险与回滚
| 风险 | 缓解 |
|------|------|
| watchdog 改观测后，serve 真崩无人拉起 | tray WatchThread 仍 15s 熔断拉起；watchdog 保留 `-EnableAutoFix` 开关可临时切回 |
| NSSM disable 后开机不自启 | 托盘已设 HKCU Run 自启（`OnAutoStart`），计划任务 `OpenCode 4096 Tray` AtLogOn 兜底 |
| UTF8 Basic 改动导致旧密码含特殊字符失败 | verify 同时试 ASCII/UTF8 双解，日志打印 `auth len` 便于比对 |

## 待确认（Question）
- 是否接受 **A 单守护（tray 主管+NSSM退役）** 为默认？若需保留 NSSM，则 watchdog 保持主动拉起，tray 仅 UI。
- Tailscale IP 是否固定 100.71.42.119？若是则保留硬编码，否则改动态探测。
- 是否需要把 CLOSE_WAIT 阈值从 10 调至 25 并做日志节流？
