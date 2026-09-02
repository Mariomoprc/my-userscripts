# Agent Memory Top 5 合集 — 仅评估对比报告

> 生成：2026-09-02 · Plan 模式只读 · 来源：`Agent Memory – Top 5 AI Agent Skills · LobeHub.url`
> 用户选择：**仅评估对比**（不改代码，先出 gap 分析 + 优先级）
> 合集地址：https://lobehub.com/skills/collection/memory （亦 https://lobehub.com/zh/skills/collection/memory）

---

## 0. 一句话结论

本地已完整实现合集中 **1/5（self-improvement）**，另有 **opencode-mem 向量记忆** 覆盖部分能力；剩余 4 项（capability-evolver / proactive-agent / memory完整版 / qmd）为增量增强，按 **qmd → memory完整版（SESSION-STATE/RECENT_CONTEXT）→ proactive-agent → capability-evolver** 的 ROI 排序最划算，且全部可做 Windows/GBK/Tailscale 适配的轻量移植，无需照搬 OpenClaw 原实现。

---

## 1. 合集全貌（先网后本验证）

> 执行规范 3.4：已跑 MCP 降级链各≥1（标题/URL/日期/热度）

| # | 技能 | 作者 | 评分/热度 | URL | 日期 |
|---|------|------|-----------|-----|------|
| 1 | **capability-evolver** — 自进化引擎，分析 runtime history 按协议约束提 skill 改进 | openclaw | 4.1 / 76 installs | https://lobehub.com/skills/capability-evolver | 2026-08-25 |
| 2 | **self-improvement** — 捕获 learnings/errors/corrections，持续改进（失败/纠正/缺能力/API失败/知识过时/更优解 + 任务前 review） | openclaw | 4.9 / 1.7k installs | https://lobehub.com/skills/self-improvement | 2026-08-25 |
| 3 | **proactive-agent** — 主动伙伴，WAL Protocol + Working Buffer + Autonomous Crons（Hal Stack） | openclaw | 4.9 / 1.5k installs | https://lobehub.com/skills/proactive-agent | 2026-08-25 |
| 4 | **memory** — 完整记忆系统：行为协议（何时存）+ 心跳自动捕获 + 关键词搜索 + 维护合并，含 SESSION-STATE.md / RECENT_CONTEXT.md，抗 compaction | openclaw | 4.9 / 1.1k installs | https://lobehub.com/skills/memory | 2026-08-25 |
| 5 | **qmd** — Markdown 知识库/笔记/文档的混合搜索 | tobi | 4.6 / 216 installs | https://lobehub.com/skills/qmd | 2026-08-25 |

**合集描述原文**（websearch 摘录，2026-08-25）：
> *Agent Memory is a small collection about continuity. It gives agents ways to record useful experiences, search prior knowledge, evolve capabilities, and become more proactive without turning every conversation into a blank slate. The skills cover several memory levels. The complete memory system defines when and how to save behavioral knowledge. Self-improvement captures failures, corrections, and user preferences. Capability-evolver looks for repeated runtime patterns and proposes skill improvements. Proactive-agent turns saved context into anticipatory help. QMD adds search over Markdown knowledge bases, notes, and docs.*

**Exa/Tavily/Firecrawl 侧验证**：
- Exa: `terminalskills-skills-agent-memory` (Agent Memory file-based→SQLite→Chroma/Pinecone), `triple-memory` (LanceDB+Git-Notes+file-search), `agent-memory-systems` (短期/长期/认知架构) —— 与合集互补，热度 4-10 installs，说明合集 5 项为精选子集。
- Tavily: 提炼 5 技能列表与描述已对齐合集。
- Firecrawl: `https://lobehub.com/skills/collection/memory` 命中 Top5，description 一致；`https://lobehub.com/skills` 列出 Agent Memory 入口。

---

## 2. 本地现状（只读探查）

| 维度 | 现状 | 文件/证据 |
|------|------|-----------|
| **self-improvement 基座** | ✅ 已完整实现，且为 OpenCode 定制版 | `skills/memory/SKILL.md` v4.1.0（即合集 #2），`plugins/self-improvement.js` 454 行实现 6 hooks：system.transform 注入提醒 + tool.execute.after 错误检测 + session.error 兜底 + session.idle 备份/升级/清理/晋级；`LEARNINGS.md` / `ERRORS.md` / `FEATURE_REQUESTS.md` 三件套完整，含 Pattern-Key/Recurrence-Count 晋级到 AGENTS.md |
| **向量记忆** | ✅ 已有，但与合集 #4 部分重叠、稳定性有历史坑 | `opencode-mem.jsonc`：`embeddingModel Xenova/nomic-embed-text-v1` 本地 547MB，`autoCaptureEnabled:true`，`opencodeProvider: openrouter/free`，`webServer 127.0.0.1:4747`；历史 MIG-20260830 等记录了 OOM（软路由 2GB+523MB 模型）、认证 Basic Auth、thinking 模式 tool_choice 冲突等已修复 |
| **.learnings 规模** | 367 条已迁 opencode-mem，多次归档；pending 空 | `LEARNINGS.md` 705 行可见 + archived 大量迁移条目；`pending/` 0 文件 |
| **缺失：SESSION-STATE / RECENT_CONTEXT** | ❌ 无 | 合集 #4 的热上下文（SESSION-STATE.md）与自动更新 highlights（RECENT_CONTEXT.md）本地无对应文件，靠 session.idle 备份而非心跳 |
| **缺失：心跳捕获** | ❌ 无 | 合集 #4 heartbeat-enforced auto-capture，本地仅 tool.execute.after + session.error/idle，非轮询心跳 |
| **缺失：qmd 搜索** | ❌ 无 | 合集 #5 的 Markdown 混合搜索，本地仅 `grep -ri` + `read(offset)`，无 QMD/LanceDB 语义检索 |
| **缺失：proactive-agent** | ❌ 无 | WAL/Working Buffer/Autonomous Crons 本地无，`self-improvement.js` 的 autoUpgrade/autoCleanup/autoPromote 是弱版定时任务，非主动 anticipatory |
| **缺失：capability-evolver** | ❌ 无 | 合集 #1 的 runtime history 分析→协议约束进化，本地仅 `Recurrence≥3 → AGENTS.md` 单阈值晋级，无历史模式挖掘 |

**本地独特约束**（合集未覆盖，需适配）：
- Windows GBK + PowerShell 5.1 + 路径 `C:\Users\pass\.config\opencode`（禁止 PS 直读中文，UTF-8 无 BOM）
- Tailscale Exit Node 198.19.0.0/16 → 192.168.3.100，WLAN DNS 192.168.3.100（主路由屏蔽 githubusercontent.com）
- 代理分流：国外走 192.168.3.100:7893，MCP 直连走 Tailscale 隧道
- 已配置全自动维护：周日 03:00 升级、superpowers 周更、OneDrive 3 份备份、ERRORS 迁移垃圾周归档

---

## 3. Gap 矩阵（合集 5 项 × 本地）

| 合集技能 | 本地对应度 | Gap 详情 | 适配成本 | 价值 |
|----------|-----------|----------|----------|------|
| **#2 self-improvement** | **100%** | 已是同一技能（openclaw 4.9），本地还多了 Windows 适配（GBK 脱敏、OneDrive 备份、tray env 同步、DB 膨胀防护） | 0 | 基座，无需动；仅需定期同步上游 CHANGELOG（当前 4.1.0 vs 上游 4.9 描述对齐） |
| **#5 qmd** | **0%** | 无 Markdown 混合搜索；现有 `grep` 无法语义召回 daily notes → MEMORY.md 的 consolidation 链路不通 | 低 | 高 — 直接提升「查笔记/找决策/答 what did we discuss」命中率，且与现有 `grep .learnings/` 互补 |
| **#4 memory 完整版** | **~40%** | 有向量存储但缺行为协议细化、心跳、SESSION-STATE、RECENT_CONTEXT、consolidation 定时合并 | 中 | 高 — 抗 compaction、跨会话热上下文不断档，正好补本地 opencode-mem 不稳定时的文件兜底 |
| **#3 proactive-agent** | **~15%** | 仅有 session.idle 的弱定时，无 WAL/Working Buffer/Autonomous Crons 的主动预判 | 中高 | 中 — 适合「每周巡检/待办预提醒」场景，但需防打扰（AGENTS.md:13 精简原则） |
| **#1 capability-evolver** | **~20%** | 仅有 Recurrence≥3 自动晋级，无 runtime history 挖掘与协议约束进化 | 高 | 中低 — 需历史数据够多才有收益，当前可先用现有晋级跑一段时间再评估 |

---

## 4. 详细对比（每项落点）

### 4.1 self-improvement（已对齐）
- 合集触发 6 场景与本地 `SKILL.md:31` 一致，已通过 `self-improvement.js` 落地。
- 本地增强：`auto-detected Pattern-Key: runtime.error` + 脱敏 + 去重 + Valid-Until/Source-Config 过期自检 + pending 暂存，都是上游未提的 Windows 加固。
- **建议**：仅做版本对齐检查（每季度 `grep -ri Pattern-Key .learnings/` + 对比上游 releases），无需新建。

### 4.2 qmd（最优先补）
- **合集能力**：搜索 Markdown 知识库/笔记/文档，关键词+语义混合，脚本 `file-search.sh` 索引 MEMORY.md/workspace docs。
- **本地可复用**：`opencode-mem` 已有 `Xenova/nomic-embed-text-v1` 本地 embedding（547MB），无需新模型；`scripts/file-search.sh` 可直接移植为 `scripts/qmd-search.ps1`（Windows 适配：rg + sqlite FTS5 + 向量 cosine）。
- **Gap**：当前查历史靠 `grep -ri 关键词 .learnings/`，对「决策/偏好」的语义召回弱，consolidation（daily → MEMORY.md）无自动化。
- **轻量方案**：不引 LanceDB/Chroma，先用 `qmd` 思路：① `memory/*.md` + `.learnings/*.md` + `AGENTS.md` 建 FTS5 + 向量索引；② 提供 `qmd:search("query")` 命令；③ 注入到 `system.transform` 的检索提醒。

### 4.3 memory 完整版（次优先补）
- **合集能力**：行为协议（何时存）+ 心跳自动捕获 + 关键词搜索 + 维护合并，含 SESSION-STATE.md（热上下文）+ RECENT_CONTEXT.md（自动 highlights）。
- **本地现状**：`opencode-mem` 的 autoCapture 已类似「心跳」，但频率/触发不透明；无文件级热上下文，compaction 时靠 DB。
- **轻量方案**：新增两个文件（不依赖 DB）：
  - `.learnings/SESSION-STATE.md` — 当前任务的 Working Buffer（目标/进度/待办/关键决策），由 `system.transform` 在每次请求前注入，`session.idle` 更新。
  - `.learnings/RECENT_CONTEXT.md` — 最近 N 天 highlights 自动汇总（类似 opencode-mem 的 session summary 但文件化，可被 qmd 搜到）。
  - 心跳：复用 `session.idle` + 可选 5min `setInterval`（仅当 opencode web 存活时），避免另起常驻进程。
  - 协议细化：在 `AGENTS.md` 补「何时存」清单（纠正/新约定/坑/偏好 → 立即存；大任务收尾 → 汇总存）。

### 4.4 proactive-agent（按需）
- **合集能力**：WAL Protocol + Working Buffer + Autonomous Crons，变 task-follower 为 proactive partner。
- **本地可映射**：`Working Buffer` ≈ SESSION-STATE.md；`Autonomous Crons` ≈ `session.idle` 的 autoUpgrade/autoCleanup 已有一半；`WAL` 可简化为 `.learnings/WAL.md` 追加式日志。
- **谨慎点**：主动打扰与 AGENTS.md:13「精简」冲突，需 opt-in 且仅在 `isLocalhost4096` + 显式待办时触发；初期可只做「每周一次待办/过期 Valid-Until 提醒」，不做自主发消息。

### 4.5 capability-evolver（最后）
- **合集能力**：分析 runtime history → 识别改进 → 协议约束进化。
- **本地可映射**：已有 `autoPromote`（Recurrence≥3）是简化版进化；进阶需聚类 `.learnings/` 的 Pattern-Key 时序 + 成功率，产出 skill 补丁建议。
- **建议**：先跑 1 个月积累 30+ 新条目后再评估，避免过早引入分析噪音；可先以「月报」形式人工 review，再决定是否自动化。

---

## 5. 优先级与路线（仅评估，不实施）

| 优先级 | 项 | 产出 | 工作量 | 风险 | 前置 |
|--------|----|------|--------|------|------|
| **P0** | qmd 轻量移植 | `scripts/qmd-search.ps1` + 索引 + `system.transform` 检索提示 | 0.5 天 | 低 | 无 |
| **P0** | memory 完整版补文件化热上下文 | `SESSION-STATE.md` + `RECENT_CONTEXT.md` + 行为协议写入 AGENTS.md | 0.5 天 | 低 | P0 qmd（被搜到） |
| **P1** | 心跳/consolidation 加固 | `self-improvement.js` 增 `heartbeat` 与 daily→MEMORY 合并定时 | 0.5 天 | 中（需防 CPU） | P0 |
| **P2** | proactive-agent 最小可用 | `WAL.md` + 每周待办/过期提醒（opt-in） | 1 天 | 中（防打扰） | P0+P1 |
| **P3** | capability-evolver 月报 | 离线分析脚本 + 人工 review 流程 | 1 天 | 低 | 积累 30 天数据 |

**不推荐**：直接 `npm i` 上游 5 个技能包（为 OpenClaw/Claude Code 设计，含 `clawdhub install`、Linux 路径、hook 机制，与本地 Windows/Tailscale/GBK 不兼容，需重写）。

---

## 6. 验证方案（只做评估时的只读验证）

- [ ] `grep -rh "Pattern-Key:" .learnings/ | sort -u` 统计现有去重键覆盖度（预期 10+ 键，含 `infra.tray.env-sync` 等）
- [ ] `read opencode-mem.jsonc` 确认 4747 端口仅本机 + openrouter/free 可用性（`curl -i http://127.0.0.1:4747/api/health`）
- [ ] `webfetch https://lobehub.com/skills/collection/memory` 二次确认合集 5 项未变更（当前已 404→用 websearch/Firecrawl 兜底验证通过）
- [ ] 若后续落盘 P0，需 `qmd:search("memory")` 与 `grep` 对比召回率（预期语义召回 +30%）

---

## 7. 风险与取舍

- **重复造轮子风险**：已按 AGENTS.md 3.4 先网后本验证，本地 `grep` + `opencode-mem` 未覆盖 qmd/SESSION-STATE 场景，故非重复。
- **DB 膨胀**：opencode-mem 本地 embedding 547MB 已有 OOM 历史（软路由 2GB 案例），P0 优先用文件 FTS5 而非再引 LanceDB，避免二次 OOM。
- **打扰风险**：proactive/capability 的自主行为与「精简一句结论」原则冲突，故设为 P2/P3 且 opt-in。
- **维护成本**：全自动已覆盖（OneDrive 备份/周更/归档/晋级），新增项需接入同一 `session.idle` 节流，避免常驻进程。

---

## 8. 下一步分支（待用户拍板）

- **分支 A（推荐）**：切 Build 模式执行 P0（qmd + SESSION-STATE/RECENT_CONTEXT），0.5-1 天交付，零侵入。
- **分支 B**：维持现状，仅将本报告归档 `.learnings/LEARNINGS.md`（`Pattern-Key: memory.collection-eval`），1 个月后复评。
- **分支 C**：全量对齐 5 项（P0→P3），约 3 天，需新增 2 个 skill 目录与 1 个脚本。

> 本报告已满足「先网后本」与「仅评估对比」要求；切 Build 前无需再搜。确认分支后直接按对应章节落盘即可。

