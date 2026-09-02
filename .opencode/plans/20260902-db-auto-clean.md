# 自动化定期清理 opencode.db — Plan

## 目标
让 `opencode.db` 常驻 <500MB，消除「此页面没有响应」复发：每周日 04:00 自动删过期会话 + 清孤儿 event + 在线压缩，无需手动干预。

## 现状（证据）

| 项 | 证据 | 结论 |
|---|---|---|
| 已有清理脚本 | `scripts/opencode-db-cleanup.ps1`（231 行）功能完整：删 30 天前未更新 session（SQL 事务含 part/message/context_epoch/input/message/share/todo）→ 清孤儿 event → opencode 未运行才 VACUUM INTO 替换 → 清 TEMP → 官方修复检测自动停用 | **从未被调度**：`$TASK_NAME="OpenCode DB Cleanup"` 与实际任务名不匹配 |
| 实际在跑的任务 | `OpenCode DB Vacuum`（每周日 04:00，Interactive+Limited）指向 `opencode-db-vacuum.ps1`（59 行） | **只 VACUUM 不删数据**：event 只增不删，DB 24 天涨回 1.77GB；且 `Stop-Service opencode-web` 目标服务已 Disabled（`Get-Service` 返回 Stopped/Disabled），`python3` 直连 `VACUUM` 在 serve 持锁时必失败——**任务基本空转** |
| 架构现状 | `opencode-web` 服务 Disabled（NSSM 退役，tray 主管 serve，`20260902-4096-backend-health-fix.md` 方案 A）；serve PID 29968 由 tray 34348 拉起 | 清理脚本不能依赖 NSSM 服务，替换需走 tray 自动拉起 |
| 替换脚本 | `scripts/replace-db-compacted.ps1`（43 行）：integrity 校验 → 杀 serve/tray → 删 wal/shm → 备份 → 替换 → `Start-ScheduledTask "OpenCode 4096 Tray"` 拉起 | 可复用为「压缩替换」步骤 |
| 工具链 | `sqlite3`（PATH 内，Android SDK 版）可用——本次手动 `VACUUM INTO` 3.4s + `integrity_check ok`；`python3 3.14.4` 存在 | 依赖满足 |

### 关键约束
- 删 session 用**直接 SQL**（cleanup.ps1 现有方案）在 serve 运行时 WAL 并发 OK（本次手动删 8 个 session 已验证）；`PRAGMA foreign_keys=ON` 必须保留
- `VACUUM INTO` 在线可做（不需排他锁，SKILL.md:44）；**替换**才需停服
- 脚本必须 UTF-8 BOM（PS5.1 GBK 解析中文注释报错，SKILL.md:139）
- 计划任务用用户上下文（Interactive+Limited），DB 在用户目录

## 方案设计

### 流程 Before / After

```
Before（现状，空转）:
  每周日 04:00
    └─ OpenCode DB Vacuum ── Stop-Service opencode-web(已Disabled,空)
                            └─ python3 VACUUM(serve持锁→database is locked,失败)
                            └─ 不删 session → event 只增不删
  结果: DB 24天涨回 1.77GB → Electron 未响应复发

After（修复后，有效）:
  每周日 04:00
    └─ OpenCode DB Cleanup（新任务，指向 cleanup.ps1）
        ├─ 1. 在线备份 .backup（保留3份）
        ├─ 2. 删 30 天前未更新 session（SQL 事务, WAL 并发 OK）★主收益
        ├─ 3. 清孤儿 event（event_sequence 无 FK 需显式删）
        ├─ 4. VACUUM INTO 在线生成 compacted 副本（不需排他锁）
        │     └─ 若 DB > 800MB → Start-Process 分离进程跑 replace-db-compacted.ps1
        │           （杀 serve → 替换 → tray 自动拉起, 中断<10s）
        ├─ 5. 清 TEMP 残留
        └─ 6. 官方修复检测 → 落地则自动停用自身
  结果: DB 常驻 <500MB, event 不膨胀, 未响应不复发
```

### 脚本改动点（`scripts/opencode-db-cleanup.ps1`）

| 行/段 | 现状 | 改为 |
|-------|------|------|
| L16 `$TASK_NAME` | `"OpenCode DB Cleanup"` | 保持（新建任务同名） |
| L184-209 压缩替换分支 | 仅 `opencode 未运行` 才替换（几乎不触发） | ① 删 session 后**无条件** `VACUUM INTO` 生成 compacted 副本（在线）；② 若 `DB > 800MB` 且当前时间 03:00-06:00，`Start-Process powershell -WindowStyle Hidden -File replace-db-compacted.ps1` 分离替换；③ 否则仅记录副本路径，留待下次 |
| L13 `$SQLITE3` | Android SDK 路径 | 保持（已验证 VACUUM INTO 可用）；加 `Test-Path` 兜底回退 PATH 内 `sqlite3` |
| L137 待删统计 | `SELECT COUNT(*) FROM session WHERE time_updated < cutoff` | 加 `time_created` 双条件：`time_updated < cutoff AND time_created < cutoff`（避免误删刚创建但未更新的会话） |
| 日志 | `$env:TEMP\opencode\cleanup-opencode-db.log` | 保持；追加 DB 大小前后对比行 |

### 计划任务改动

| 任务 | 动作 | 说明 |
|------|------|------|
| `OpenCode DB Vacuum` | **停用**（Disable） | 空转 + 与 tray 架构冲突，保留脚本可回滚 |
| `OpenCode DB Cleanup` | **新建**：每周日 04:00，Interactive+Limited，`powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File scripts/opencode-db-cleanup.ps1 -RetentionDays 30` | 主清理任务 |

## 步骤

1. **备份现状**：`Copy-Item scripts/opencode-db-cleanup.ps1 scripts/opencode-db-cleanup.ps1.bak-20260902`；记录当前 DB 大小/会话数快照
2. **改 cleanup.ps1**：按上表 4 处改动（UTF-8 BOM 保存）
3. **停用旧任务**：`Disable-ScheduledTask -TaskName "OpenCode DB Vacuum"`
4. **注册新任务**：`Register-ScheduledTask -TaskName "OpenCode DB Cleanup"`（每周日 04:00，AtLogOn 兜底可选）
5. **手动试跑**：`powershell -File scripts/opencode-db-cleanup.ps1 -RetentionDays 30`（真实执行，观察删 session 数 + DB 大小变化 + 日志）
6. **验证**：见下
7. **沉淀**：更新 `SKILL.md` 清理流程（自动化替代手动）、`LEARNINGS.md` 记录

## 风险与对策

| 风险 | 对策 |
|------|------|
| 删 session 时 serve 在跑，SQL 与 serve 写入冲突 | WAL 模式多进程并发 OK（本次手动删 8 个已验证）；`PRAGMA foreign_keys=ON` + 事务保证一致性 |
| 误删活跃/刚建会话 | 双条件 `time_updated AND time_created < cutoff`；保留 30 天 |
| 替换中断 4096（杀 serve） | 仅 DB>800MB 且凌晨低峰才替换；`replace-db-compacted.ps1` 已含 tray 自动拉起 + 端口兜底 |
| `VACUUM INTO` 副本残留占磁盘 | 替换成功后删除副本；TEMP 清理段已覆盖 `opencode-compacted*.db` |
| 官方修复落地后脚本冗余 | cleanup.ps1 已有 `Test-OfficialFixPresent` 自动停用自身任务 |
| 计划任务权限不足 | Interactive+Limited 用户上下文，DB 在用户目录，无需提权 |

## 验证方式

- **手动试跑**：`cleanup.ps1 -RetentionDays 30` 输出日志含「会话删除完成」「孤儿清理完成」「DB X MB → Y MB」，`integrity_check ok`
- **任务注册**：`Get-ScheduledTask "OpenCode DB Cleanup"` State=Ready，触发器每周日 04:00；`OpenCode DB Vacuum` State=Disabled
- **DB 健康**：`Get-Item opencode.db` <500MB；`sqlite3 "PRAGMA integrity_check"` = ok
- **服务健康**：`curl -u opencode:$PW http://127.0.0.1:4096/global/health` 200；`verify-serve-env.ps1` ALL PASS
- **回归**：手动 `Start-ScheduledTask "OpenCode DB Cleanup"` 跑一次，确认不中断当前会话（serve 存活）

## 涉及文件

| 文件 | 动作 |
|------|------|
| `scripts/opencode-db-cleanup.ps1` | 修改（4 处） |
| `scripts/opencode-db-cleanup.ps1.bak-20260902` | 新建（备份） |
| 计划任务 `OpenCode DB Cleanup` | 新建 |
| 计划任务 `OpenCode DB Vacuum` | 停用 |
| `skills/opencode-maintenance/SKILL.md` | 更新清理流程（自动化） |
| `.learnings/LEARNINGS.md` | 追加记录 |
| `.opencode/plans/20260902-db-auto-clean.md` | 本计划 |