# Agent Memory 深度研究 — 全网搜索版

> 生成：2026-09-02 · Plan 模式只读 · 触发：用户“深度研究 全网搜索”
> 合集：`Agent Memory – Top 5 AI Agent Skills · LobeHub` https://lobehub.com/skills/collection/memory （镜像 https://lobehub.com/zh/skills/collection/memory）
> 方法：AGENTS.md 3.4 先网后本 — Exa/Tavily/Firecrawl/websearch 各≥1 + 5×并行子代理深挖 + 本地只读校验（grep/read）
> 前序报告：`20260902-agent-memory-top5-eval.md`（仅评估对比）→ 本篇为**全网深度版**

---

## 0. 一句话结论

合集并非“5个独立记忆工具”，而是**一条连续统：自改进（事后记）→ 完整记忆（事中捕获+事后合）→ 主动化（事前预判）→ 自进化（跨周期变异）→ 混合检索（跨档召回）**；本地已自建第1环的 Windows 加固版，第2/5环有半成品（opencode-mem 向量库 + grep），缺的是**WAL/Working Buffer/心跳/RRF**这四根“胶水”。最经济的补齐不是照搬 5 包，而是**用 547MB 现有嵌入 + SQLite FTS5 复刻 qmd 混合管线，并补两份 Markdown 热文件（SESSION-STATE/RECENT_CONTEXT）打通 compaction 生存**，其余两环按月报节奏 opt-in。

---

## 1. 全网验证 — 合集 5 项的权威画像

> 5 技能均收录于 LobeHub Collection “Agent Memory”（发布 2026-08-25，由 LobeHub 精选，Firecrawl position 1 / websearch publish_date 2026-08-25 共同确认）

| # | 技能（LobeHub ID） | 作者 | 评分/安装 | 权威 URL | 版本/日期 | 一句话定位 |
|---|-------------------|------|-----------|----------|-----------|------------|
| 1 | `openclaw-skills-capability-evolver` | openclaw / autogame-17 | 4.1/5 · 1,594 installs（LobeHub）/ 5,099 downloads（ClawHub 原版） | https://lobehub.com/skills/openclaw-skills-capability-evolver · 镜像 `clawhub.ai/autogame-17/skills/capability-evolver` | v1.0.3 (LobeHub 2026-05-02) / v1.91.0 (ClawHub) | 自进化引擎：Grep 历史 → 基因/胶囊/事件 → 协议约束固化，可全网共享 |
| 2 | `openclaw-skills-self-improvement` | openclaw / pskoett | 4.9/5 · 1.7k | https://lobehub.com/skills/openclaw-skills-self-improvement · `github.com/pskoett/pskoett-ai-skills` | v4.1.0 本地已装 ↔ 上游 4.9 语义一致 | 6 场景捕获 learnings/errors，任务前 review，本地即 `skills/memory/SKILL.md` |
| 3 | `openclaw-skills-proactive-agent-3-1-0` | openclaw / halthelobster | 4.9/5 · 1.5k | https://lobehub.com/skills/openclaw-skills-proactive-agent-3-1-0 · `github.com/halthelobster/proactive-agent` | v3.1.0 Hal 原仓 | WAL + Working Buffer + Compaction Recovery + Autonomous Crons（Hal Stack） |
| 4 | `openclaw-skills-memory-complete` | openclaw / rosepuppy | 4.9/5 · 1.1k | https://lobehub.com/skills/openclaw-skills-memory-complete | v1.0.2 2026-08-17 | 完整记忆：行为协议+心跳捕获+关键词时衰检索+定期合并，含 SESSION-STATE/RECENT_CONTEXT |
| 5 | `openclaw-skills-qmd-memory` (qmd) | tobi / asabove | 4.6/5 · 216 | https://lobehub.com/skills/openclaw-skills-qmd-memory · `github.com/tobi/qmd` 29.4k★ | v2.8.3 npm `@tobilu/qmd` 2026-03-04 | Markdown 混合检索：BM25+向量+RRF k=60+LLM 重排，零服务 SQLite 单文件 |

**四源交叉验证摘要**

- **Firecrawl** `skills/collection/memory` → Top5 命中，description 与 websearch 完全一致；`capability-evolver` 搜到 `explainx.ai` 4.4/54、Composio “ClawHub 下载第一超第二名2倍”、ClawHub #95 Feishu 外泄安全告警
- **Tavily advanced** → capability-evolver Top1 5,099 downloads、proactive-agent Top1 聚合、qmd Top1 混合流水图
- **Exa** → market.lobehub 3 条权威页（capability-evolver 1,482 installs / proactive-agent / qmd 29.4k★）、VoltAgent awesome 1,000+ skills、TeleAI Awesome-Agent-Memory 论文地图
- **websearch** → LobeHub 合集 2026-08-25 + 12 条长文（Mem0/Zep/Letta/Cognee 2026 对比、AINative/ Firecrawl 向量库对比）

> 结论：合集 5 项为 LobeHub 从 333,623 技能中精选的**连续统子集**，其余如 `terminalskills/agent-memory`（10 installs）、`triple-memory`（LanceDB+Git-Notes）为互补而非替代。

---

## 2. 逐项深挖（SKILL.md 要点 + 本地 Gap + Windows 适配）

### 2.1 #1 capability-evolver — 自进化引擎

**SKILL.md 核心（NeverSight 镜像 v1.20.4 + ClawHub v1.91.0，76 文件）**
- 触发：`node index.js [--review|--loop]` / PCEC 每3h / 消息路由；输入 `memory/*.md + agents/*/sessions/*.jsonl + .env + git`
- 输出：`GEP Prompt → genes.json/capsules.json/events.jsonl` 三件套，`asset/submit|search` 语义检索 `signals: [log_error]`
- 模式：Standard/Review/Mad Dog Loop；策略 `EVOLVE_STRATEGY=balanced|innovate|harden|repair-only` 等 7 档
- 约束：GEP 协议 + A2A Proxy Mailbox `127.0.0.1:19820` → Hub `https://evomap.ai`（Agent 永不直连 Hub，仅本地 JSONL mailbox）+ 回滚 `EVOLVER_ROLLBACK_MODE=stash|hard|none`
- 生态：Capability Tree + PCEC + Anti-Degeneration Lock，确定性信号提取（hash/mutation/sanitization/selection/signalExtraction，164 单测）

**与本地 `Recurrence≥3 → AGENTS.md` 对比**

| 维度 | 本地 | evolver |
|------|------|---------|
| 触发 | ≥3次/30天才晋级（`session.idle` 串行 `autoPromote()`） | 失败即触发，稳定时 Forced Optimization 主动变异 |
| 粒度 | 文本规则 | 基因/胶囊/事件三级资产，可代码/记忆/配置多维固化 |
| 审计 | `ERR-YYYYMMDD` 手记 | `events.jsonl` 树状可回溯 |
| 网络 | 单机 | EvoMap 全网基因共享 |
| 安全 | 本地追加 | 协议约束+回滚+LLM 复审 |

**Windows 高危坑（必修）**
1. `src/gep/paths.js` 死循环：`path.dirname('C:\\')==='C:\\'` 恒成立 → `node index.js` hang；修 `if (parent===dir) break`
2. 硬回滚 `git clean -fd` 会清未跟踪改动 → 强制 `EVOLVER_ROLLBACK_MODE=stash`
3. `EVOLVER_REPO_ROOT` 必显式设；`node index.js run` 才显式执行（别用裸 `node index.js`）
4. 需 `git init` + Node22；GBK 用 `PYTHONIOENCODING=utf-8`
5. **安全**：原版 `@autogame-17` 被 ClawHub #95 标 `suspicious`（明文外泄 `.env/MEMORY.md` 至 Feishu ByteDance）；洁净替代 `kennyzir/capability-evolver-pro`（VirusTotal Benign）

**本地建议**：保留 Recurrence 门槛作人审，叠加 evolver 的确定性提取作预审；先修 paths.js 再开 `--loop`；EvoMap 代理走 `192.168.3.100:7893`，不走 Tailscale。

---

### 2.2 #3 proactive-agent — 主动化三件套（v3.1.0 Hal）

**架构（`workspace/`）：** `SESSION-STATE.md（RAM）+ HEARTBEAT.md + memory/YYYY-MM-DD.md + working-buffer.md（危险区）`

- **WAL Protocol（The Law）**：*Chat history is BUFFER, SESSION-STATE.md is RAM — ONLY place specific details are safe.* 扫描输入 6 类（Corrections/Proper nouns/Preferences/Decisions/Draft changes/Specific values）→ **STOP → WRITE SESSION-STATE → THEN Respond**。示例：`Use blue not red → 写 Theme: blue 再回话`。
- **Working Buffer Protocol**：60% context 阈值 → 清空重建；>60% 后每条消息追加 `Human原文 + Agent 1-2句摘要`；compaction 后先读 buffer 再抽关键；`Once 60%, EVERY exchange logged. No exceptions.`。文件化，故 compaction 后存活。
- **Compaction Recovery（6步）**：`<summary>`/truncated/“where were we” 自动触发 → 读 working-buffer → 读 SESSION-STATE → 读近两日 daily → 搜全源 → Extract & Clear → `Recovered from working buffer. Last task was X. Continue?`（禁止问 “what were we doing?”）。
- **Autonomous Crons**：`isolated agentTurn`（子 agent 自主做）vs `systemEvent`（发 prompt 给 main，易被忙时搁置）；v3.1 新增 Verify Implementation / Tool Migration Checklist / Unified Search / Security Hardening / Relentless Resourcefulness（10 尝后求助）/ ADL-VFM 评分。

**与本地 `plugins/self-improvement.js` 对比**

| 维度 | proactive-agent | 本地现状 |
|------|-----------------|----------|
| 事前捕获 | WAL 先写 RAM 再回 | 仅事后 `tool.execute.after` 错误捕获 |
| 危险区 | Working Buffer 文件全量日志 | 仅 `pending/` 细粒度待审 |
| 截断自愈 | 6 步自动恢复 | 无，需人 “continue” |
| 调度 | `isolated agentTurn` 真自治 + HEARTBEAT 四象限清单 | `session.idle` 伪 cron（依附主会话，周级节流） |
| 校验 | VBR + ADL/VFM | 无，易“只改文案不改机制” |

**补齐建议**：新增 `SESSION-STATE.md + working-buffer.md` 写入点；`session.idle` 外补 compaction 入口；将现有 `backup/upgrade/cleanup` 保留 `idle`，而巡检类用 Windows 计划任务（同 `OpenCode Auto Upgrade`）模拟 `isolated` 真自治；引入 `HEARTBEAT.md` 四象限对齐 `AGENTS.md:3.4/9`。

---

### 2.3 #4 memory-complete — 完整记忆协议

**触发器是输入，不是记忆**：用户给出具体细节 → 先写 SESSION-STATE 再答；问上下文前必 `python3 skills/memory/scripts/recall.py "query"`；实质对话后 `capture.py --facts "..." / --file`。

- **Heartbeat**：OpenClaw 网关默认 `30m`（未配退化 `1h`）；LobeHub 层在 `HEARTBEAT.md` 追加 `Memory Auto-Capture (EVERY HEARTBEAT)`：有实质对话→capture + 更新 RECENT_CONTEXT + 更新 SESSION-STATE，无则 `NO_REPLY`。
- **Recall**：`scripts/recall.py ["query"] [--recent N]` 纯关键词+时衰，非语义（LanceDB 待上线）；返回 score+snippet；坑：`--facts` 全标 `[note]` 不分类、`find_workspace()` 无 MEMORY.md 时误建 `~/clawd`、Windows 需 `PYTHONIOENCODING=utf-8`。
- **Consolidation**：`consolidate.py [--stats|--dry-run]` 找重复/过期，分类 `[decision]/[preference]/[todo]/[insight]/[important]/[note]`。
- **模板**：`SESSION-STATE.md`（Current Task/Immediate Context/Key Files/Last Updated）+ `RECENT_CONTEXT.md`（Last Session Highlights/Key Decisions/Open Threads）+ `MEMORY.md`（精炼长期）+ `memory/YYYY-MM-DD.md`（日日志）三层；进阶版加 `<50%/>60%/>85%` 三档 flush 协议。

**与本地对比**

| 维度 | memory-complete | 本地 `skills/memory` | opencode-mem |
|------|-----------------|----------------------|--------------|
| 定位 | 用户记忆（跨压缩） | 自改进日志 `.learnings/` | 语义记忆库 |
| 存储 | 4 文件三层 | 3 文件 `.learnings/` | SQLite + nomic 547MB @4747 |
| 触发 | WAL/heartbeat | 6 场景/自检 | Basic Auth POST |
| 检索 | recall 时衰 | Pattern-Key 计数 | hybrid 语义 |
| 维护 | consolidate | Recurrence≥3 → AGENTS.md | /api/stats |
| 状态 | 未安装 | ✅ 启用 | `127.0.0.1:4747` 需探活，`memory-plugin.js.disabled` |

**补齐建议**：三步 Quick Setup（拷模板→AGENTS.md 植入 PROTOCOL→HEARTBEAT.md 植入 Auto-Capture）与现有 `.learnings` 并存不冲突；Windows 注意 `python` vs `python3` 与 UTF-8。

---

### 2.4 #5 qmd — 混合检索标杆（tobi/qmd 29.4k★）

**SKILL.md 触发**：`Search local markdown knowledge bases, notes, docs, wikis with QMD. Use when users ask to find notes, retrieve documents, inspect a wiki, answer from indexed markdown, or set up QMD access.` 规则：本地文件可能含答案时必先 qmd 再 web_search。

**混合管线**
```
3×Query(原1+扩展2) 各并行 BM25(FTS5) + Vector → 6 列表 → RRF k=60 + Top bonus → Top30 → qwen3-reranker-0.6b → Position-Aware Blend (1-3 75/25, 4-10 60/40, 11+ 40/60)
→ qmd search 0.2s / vsearch 3s / query 混合最优
→ qmd get #id:line:ctx / multi-get --format md
```
- 结构化查询：`intent: + lex:/vec:/hyde:` 禁裸 query；`hyde` 为假想文档
- 索引：`qmd collection add ~/notes --name notes → qmd context add qmd://notes → qmd embed` 分块 900tok 15%重叠 → `~/.cache/qmd/index.sqlite + models/` + `qmd update/doctor/status`
- 模型：`embeddinggemma-300M-Q8_0(300M) + qwen3-reranker-0.6b-Q8_0(640M) + qmd-1.7B-Q4_K_M(1.1G)` 本地 GGUF via `node-llama-cpp`

**LobeHub 澄清**：`file-search.sh` 非 qmd 而属 `triple-memory`（LanceDB+Git-Notes+file-search）；qmd 无此脚本。

**vs 本地 grep**

| 能力 | grep -ri / rg | qmd hybrid |
|------|---------------|------------|
| 精确 | ★★★ 0.1s | FTS5 BM25 带排名 |
| 同义/改述 | ✗ | 向量+HyDE |
| 排序 | 无 | RRF+重排 |
| 基准 | — | bm25 0.50 / vector 0.70 / hybrid 1.00；LoCoMo Default 62% → Hybrid 88.5% (+26pt) |
| 中文口语 | 字面 | 跨表述召回 |

**Windows 轻量复刻可行**

- FTS5：`better-sqlite3` 自带 `porter unicode61`
- 向量：`sqlite-vec` 0.1MB 扩展 + `embeddinggemma-300M` 本地，<500MB，可 `node-llama-cpp` 跑
- 融合：纯 JS RRF k=60 + 原查询×2 + Top bonus，无 reranker 已达 90%（CPU 无 GPU 时 `skipRerank` 仅 1.2s）
- 增量：`hash+seq+pos` Chunk 表 + `qmd update` 监听 mtime
- 落地：`scripts/qmd-lite.js`：rg→FTS5→(可选)向量→RRF→返回 `path:line`，与现有 grep 接口兼容，成本低于 LanceDB/Chroma

**对比 LanceDB/Chroma**：qmd 用 SQLite 双扩展实现同等混合，零服务单文件；LanceDB 优势超大盘零拷贝，Chroma 优势 API 极简，均不适合 Windows 轻量离线。

---

### 2.5 #2 self-improvement — 已对齐项（本地加固）

- 合集 6 场景与本地 `SKILL.md:31` 一致，已通过 `self-improvement.js` 454 行 6 hooks 落地（system.transform 注入 + tool.execute.after/ session.error 捕获 + session.idle 4 任务串行：OneDrive 3 份 + 每周 npm update + 归档 migration + 晋级/过期自检）
- 本地独有：Pattern-Key 计数晋级 `Recurrence≥3`、Valid-Until/Source-Config 过期标 outdated、pending 暂存、tray env 12 变量注入、DB 30天归档
- **仅需**：每季度对齐上游 CHANGELOG（当前 v4.1.0 ↔ 上游 4.9 语义一致），无需新建

---

## 3. 全网前沿 — 三档记忆架构（2026 共识）

| 维度 | ① 零依赖 file (MEMORY.md / lore / desk-journal) | ② 轻量 SQLite+embeddings | ③ 企业 Vector DB (pgvector/Qdrant/Pinecone) |
|------|--------------------------------------------------|---------------------------|---------------------------------------------|
| 代表 | `lore` 纯 Markdown monorepo scopes、`tree-ring-memory`（recall/遗忘）、`desk-journal` 跨会话 — sickn33 / github awesome-copilot | **本地 `opencode-mem` (SQLite+nomic-embed-text-v1 547MB @4747)**、Chroma in-process | pgvector（免费扩展）、Qdrant（性能/过滤最强）、Pinecone serverless 7ms p99 ($70+/mo) |
| 成本 | 0 依赖 Git 可审，无语义 | 零云费离线隐私，单文件备份，需管 547MB 模型与 SQLite 句柄（历史 ghost socket LRN-026） | pgvector 最省，Pinecone 零运维但贵，Qdrant 自托管需监控 |
| 规模 | <1k 条 | <1M 向量舒适区（Chroma <1M） | 10M+ 多租户 |
| 检索 | 关键词/结构 | 语义+FTS 混合 | 高级过滤+水平扩展 |
| 最佳场景 | 团队规范/隐私极致 | **个人 coding agent 偏好记忆（T4 首推）** | 企业 500页 wiki / 100k 客服 |

**2026 Hybrid 最佳实践（T4/W1 + ACL AgeMem + arXiv Dual-Process）**

1. **分层写入**：MEMORY.md 存规范/偏好（人审），SQLite 存 episodics，大知识库再上向量库；AgeMem 把 ADD/UPDATE/DELETE/RETRIEVE/SUMMARY/FILTER 工具化让 LLM 自主决策
2. **存前抽取**：Mem0 教训 — 先 LLM 抽成“去重 fact + 时间戳”再嵌入，否则召回矛盾（“伦敦→东京”双 current）
3. **混合检索+时衰**：FTS5+向量融合，Qdrant 侧加 recency/importance 加权；本地可加 `importance/last_accessed` 列
4. **时序与遗忘一等公民**：抄 Zep 时序图边 + E2 “时序优先覆盖” + AgeMem FILTER/SUMMARY 实现 forgetting（W4 指出 benchmark 盲区）
5. **当生产系统运维**：flush checkpoints + working-set 控制 + session 索引 + 大清理后必 `sqlite3 .recover` 校验（本地 MIG-028 已踩）

**本地 `opencode-mem` 定位**

- **档位**：牢牢 ② 中位，比 ① 多离线语义，比 ③ 少分布式/时序图谱，与 T4 “个人助手首选 SQLite”一致，同级 Chroma 本地
- **优势**：零外部依赖 + 隐私本地，适配单人 <1M 偏好场景
- **短板**：无 Temporal Graph（Zep 强项）、无重要性衰减/自动遗忘（W4）、无 Dual-Process consolidation（E2 3 tokens/msg 增长）、曾有 SQLite 幽灵端口/句柄坑
- **结论**：单人 coding agent 性价比最优；团队长程科研需叠 memory layer（抽取-去重-融合）或外接 Qdrant/pgvector

---

## 4. 本地现状只读复核（2026-09-02）

| 文件 | 关键事实 |
|------|----------|
| `skills/memory/SKILL.md` v4.1.0 | 与合集 #2 同源，含 Pattern-Key Taxonomy、Recurrence 晋级到 AGENTS.md |
| `plugins/self-improvement.js` 454 行 | 6 hooks 全量：transform 注入 HANDOFF 续跑 + before 拦截 `rm -rf /` + after 29 模式错误脱敏 + idle 串行 backup/upgrade/cleanup/archive/validCheck/autoPromote |
| `.learnings/LEARNINGS.md` | 前 7 条 resolved + MIG-20260902 40+ 条归档，367 条已迁向量库，`pending/` 空 |
| `opencode-mem.jsonc` | `Xenova/nomic-embed-text-v1` 本地、`webServer 127.0.0.1:4747`、`openrouter/free` 10 memories / 3 chat inject、`autoCleanup 14天`、`dedup 0.85` |
| `AGENTS.md:1/3.4/6` | Windows/Tailscale/先网后本已固化；`scope:cross-env`；`opencode-mem 已停用 2026-09-02` 标记与 `~/.opencode-mem/data` 并存（需探活确认） |
| 约束 | GBK、PS5.1、`C:\Users\pass\.config\opencode`、禁止 PS 直读中文、UTF-8 无 BOM、代理 192.168.3.100:7893、OneDrive 3 份 |

---

## 5. Gap 重算（深度版）

| 合集 | 本地对应度（深度修正） | 关键缺口 | 适配成本 | 价值 |
|------|------------------------|----------|----------|------|
| #2 self-improvement | 100% | 无 | 0 | 基座 |
| #5 qmd | 0% → 复刻成本低 |缺 RRF+FTS5+可选向量管线，consolidation 链路不通 | 低（纯 JS + sqlite-vec） | **高** |
| #4 memory | 40% → 需补 WAL/heartbeat/双文件 | 缺 SESSION-STATE/RECENT_CONTEXT/HEARTBEAT 协议；heartbeat 30m 未实现 | 中 | **高** |
| #3 proactive | 15% → 需补 WAL+Buffer+Recovery | 缺先写再回、危险区文件化、截断 6 步自愈、isolated 真自治 | 中高 | 中 |
| #1 evolver | 20% → 安全风险高 | 缺基因三件套+确定性提取；原版有 Feishu 外泄 + Windows 死循环 | 高 | 中低（需 30 天数据） |

---

## 6. 优先级重排（深度后，仍只读不实施）

| 优先级 | 项 | 产出 | 工作量 | 风险 | 前置 |
|--------|----|------|--------|------|------|
| **P0** | qmd-lite 轻量移植 | `scripts/qmd-lite.js`（rg→FTS5→RRF→path:line）+ `better-sqlite3` FTS5 索引 + system.transform 检索提示；复用 nomic 嵌入作可选 vec | 0.5 天 | 低 | 无 |
| **P0** | memory 双文件热上下文 | `.learnings/SESSION-STATE.md` + `RECENT_CONTEXT.md` + AGENTS.md 植入 MEMORY PROTOCOL + HEARTBEAT.md 4 象限 | 0.5 天 | 低 | P0（被搜到） |
| **P1** | 心跳+consolidation | `self-improvement.js` 增 heartbeat 30m 真定时 + `consolidate.py` 去重/过期（借鉴 memory-complete 脚本，PS 适配） | 0.5 天 | 中（CPU） | P0 |
| **P2** | proactive 最小可用 | `working-buffer.md`（60% 阈值全量日志）+ WAL.md + Compaction 6 步 + 每周过期/待办提醒（opt-in，isolated 用计划任务模拟） | 1 天 | 中（防打扰） | P0+P1 |
| **P3** | evolver 月报 | 离线分析脚本（Pattern-Key 聚类+价值加权）+ 人工 review；强制 `paths.js fix + stash + --review` | 1 天 | 低（不自动 loop） | 30 天数据 |

**不推荐**：直接 `clawhub install @autogame-17/capability-evolver`（含 Feishu 外泄）或 `npx @lobehub/market-cli skills install` 5 包全装（OpenClaw/Linux 路径、hook 机制、GBK 不兼容）

---

## 7. 风险清单（深度新增）

- **安全**：evolver 原版 #95 外泄 `.env/MEMORY.md` 至 Feishu；LobeHub 1.0.3 重打包未见该代码但仍需 `clawhub inspect` 验 SKILL.md
- **Windows**：paths.js 死循环 + `git clean -fd` 硬回滚 + `python`/`python3` 歧义 + `UnicodeEncodeError`（check mark） + `198.19/16` 静态路由保护
- **DB/端口**：opencode-mem 547MB + 2GB 软路由 OOM 前科；幽灵 4096/4747 CLOSE_WAIT 需重启释 socket；SQLite 清理后必 `.recover` 校验（MIG-028）
- **打扰**：proactive 自主消息与 AGENTS.md:13 精简冲突，设 opt-in 且仅 `isLocalhost4096` 生效
- **评估盲区**：LongMemEval/LoCoMo 只测 recall 不测 write precision/遗忘/隐私（AutoMem W4），需自加 forgetting 指标

---

## 8. 验证清单（只读可执行）

- [ ] `grep -rh "Pattern-Key:" .learnings/ | sort -u` 预期 10+ 键（含 `infra.tray.env-sync` / `frontend.input-focus-check-miss`）
- [ ] `curl -i http://127.0.0.1:4747/api/health` 探活 opencode-mem（预期 200 免认证，/api/memories 需 Basic Auth `opencode:$OPENCODE_SERVER_PASSWORD`）
- [ ] `rg -n "SESSION-STATE|RECENT_CONTEXT|HEARTBEAT" skills/memory/` 确认当前缺失（预期 0 命中）
- [ ] `npm view @tobilu/qmd version` / `github.com/tobi/qmd` 29.4k★ 复核（预期 2.8.3）
- [ ] 若落 P0：`qmd-lite search "memory"` vs `grep -ri memory .learnings/` 召回对比（预期 +26pt，LoCoMo 基准）

---

## 9. 下一步分支（待拍板，仍 Plan 模式不改文件）

- **分支 A（推荐）**：切 Build 执行 P0 双项（qmd-lite + 双文件），0.5-1 天零侵入交付
- **分支 B**：维持现状，仅将本报告 + 前序 eval 归档 `LEARNINGS.md`（Pattern-Key: `memory.deep-research`），1 个月后复评
- **分支 C**：全量 P0→P3 约 3 天，新增 `scripts/qmd-lite.js` + `SESSION-STATE.md` + `working-buffer.md` + 离线月报

> 本深度报告已满足“深度研究 全网搜索”与 AGENTS.md 3.4 全链验证；切 Build 前无需再搜，五子代理证据已归档。

---

### 附：来源锚点索引

- 能力进化：`lobehub.com/skills/openclaw-skills-capability-evolver` · `clawhub.ai/autogame-17/skills/capability-evolver` v1.91.0 · `explainx.ai/skills/capability-evolver` 4.4/54 · `github.com/openclaw/clawhub/issues/95` 2026-02-02 · `NeverSight/skills_feed/.../SKILL.md` v1.20.4
- 主动化：`github.com/halthelobster/proactive-agent` v3.0.0 · `lobehub.com/skills/openclaw-skills-proactive-agent-3-1-0` v3.1.0 · `llmbase.ai/openclaw/proactive-agent` · `myclaw.ai/skills/proactive-agent`
- 完整记忆：`lobehub.com/skills/openclaw-skills-memory-complete` v1.0.2 · `playbooks.com/skills/openclaw/skills/memory-complete` · `docs.openclaw.ai/concepts/memory`
- 混合检索：`github.com/tobi/qmd` 29.4k★ 2.8.3 · `lobehub.com/skills/openclaw-skills-qmd-memory` · `openclaw/skills: ktpriyatham/triple-memory`
- 前沿：`ainative.studio/learn/best-vector-database` · `terminalskills.io/skills/agent-memory` · `digitalapplied.com/blog/vector-databases-for-ai-agents` · `openclaw-ai.net/en/blog/ai-agent-memory-systems-2026` 2026-04-16 · `mem0.ai/blog/vector-databases-and-memory-for-ai-agents` · `github.com/VoltAgent/awesome-agent-skills` · `github.com/TeleAI-UAGI/Awesome-Agent-Memory` · `particula.tech/blog/agent-memory-frameworks-tested-mem0-zep-letta-cognee-2026` 2026-06-04

