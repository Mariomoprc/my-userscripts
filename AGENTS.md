# OpenCode 全局配置

---

## 1 环境

| 项目 | 值 |
|------|-----|
| 系统 | Windows |
| 配置目录 | `C:\Users\pass\.config\opencode\` |
| 默认语言 | 中文回复（包括思考内容、推理过程、内部独白）。**思考/推理/CoT 必须全程中文**，禁止混入英文句子，仅代码注释按项目语言决定 |
| Language | **You MUST think and respond in Chinese (思考/推理/CoT 全程中文)**. English is only for code comments and proper nouns. |
| 网络代理 | **Tailscale Exit Node** → 软路由 OpenClash TUN 透明代理（MCP 直连走 Tailscale 隧道）。⚠️ 笔记本翻墙依赖 `198.19.0.0/16 → 192.168.3.100` 持久静态路由（fake-ip 流量送软路由，2026-09-01 起改为 198.19 段以避开 Tailscale utun 198.18.0.1/30 冲突），重建网络后需恢复（见 LRN-20260830-1169） |
| DNS | 笔记本 WLAN DNS = **192.168.3.100（软路由）**。⚠️ 主路由 DNS 安全过滤会屏蔽 `githubusercontent.com` 等域名 |
| OpenCode 快捷方式 | `wt.exe -w new-window -p "OpenCode"` 启动（进 WT，避免 conhost 窗口小/字体乱码） |
| 编码 | Windows GBK 下使用 `--json` 或 `$env:PYTHONIOENCODING="utf-8"` |
| 脚本兼容 | `scripts/sync-env-to-tray.ps1` 仅 **pwsh7** 可跑（PS5.1 解析 L82 报错），用 `pwsh -File` 调用 |

## 2 工具约定（手机端精简：搜索优先 MCP，国内直连/国外走代理 192.168.3.100:7893）

| 工具 | 代理 | 状态 |
|------|------|------|
| `webfetch` | 国外需代理 | ✅ 轻量抓取首选（静态/SSR） |
| `Playwright`（`playwright` headless） | 国外需代理 | ⚠️ 按需启用，隔离抓取/下载 blob |
| `Playwright-Edge`（`playwright-edge --extension --browser=msedge`） | 国外需代理 | ✅ 登录态首选（需用户已登录 Edge） |
| `browser-automation`（`different-ai` 技能，原语 `browser_*`） | 本地扩展，不走代理 | ✅ 登录态轻量替代，per-tab claim |
| `windows-mcp`（`Screenshot`/`Snapshot`/`App`/`Clipboard`） | 本地 UIA，不走代理 | ✅ 桌面/系统对话框/跨应用 |
| `Firecrawl`/`Exa`/`Tavily`/`Context7` | 见下 | 搜索降级链 |
| `Exa`/`Tavily`/`Context7` | 不需要 | ✅ Free |
| `gh CLI`/`curl.exe`/`npm` | 需 `HTTPS_PROXY` | ✅ |
| `LobeHub Market CLI`（`npx @lobehub/market-cli`） | 需 `HTTPS_PROXY` | ✅ 技能商店 33万（`lobehub.com/zh/skills`，`--locale zh-CN`，凭证 `~/.lobehub-market/credentials.json`） |

**直连国内**：opencode.ai/deepseek.com 等；**搜索***降级链*：Exa→Firecrawl→Tavily→websearch；**技能***搜索*：LobeHub `skills search --q 任务 --locale zh-CN --output json`（遇不会的任务先搜商店）；**GitHub** 优先 MCP；**敏感信息** 禁明文、走 `.env`。

**浏览器路由（按需选，勿全开，全开 token 50k+）：** 公开静态→`webfetch`；JS 重度无登录→`playwright`（临时 `enabled:true`）；需登录→`playwright-edge`（重）或 `browser-automation` 技能（轻量 claim）；桌面/Excel/弹窗→`windows-mcp`。

**工具选择表（主动用，勿等用户提示）：**

| 任务类型 | 首选工具 |
|---------|---------|
| 搜索最新信息/新闻/时效 | Exa → Firecrawl → Tavily → websearch（降级链） |
| 查库/框架/API 文档 | context7 |
| 抓取已知网页 | webfetch（静态）/ playwright-edge（登录态） |
| 浏览器自动化/表单 | playwright-edge / browser-automation |
| 桌面/系统/弹窗/Excel | windows-mcp |
| GitHub 操作 | github MCP |
| 技能搜索 | LobeHub `skills search --q 任务 --locale zh-CN` |
| 本地记忆检索 | `grep .learnings/` + `qmd-lite` |

## 3 执行规范

1. 遇问题先查 `.learnings/`，跨项目查 `AGENTS.md`
2. 边处理边修复工具异常，高成本则跳过
3. ≥3 步任务用 TodoWrite
4. **先搜再做**：`.learnings/` → AGENTS.md → **MCP 搜索（Exa/Firecrawl/Tavily）** → **技能商店（LobeHub `skills search --q 任务 --locale zh-CN --output json`，遇不会的任务先搜 `lobehub-skills-search-engine`）** → 3 次无果再实现；**强制 MCP、禁止跳过 websearch、降级链 Exa→Firecrawl→Tavily→websearch**；**先网后本**：**网络/时效相关任务**（查最新信息、外部 API、网站行为）必跑 MCP 降级链各≥1并带 `标题/URL/日期/热度` 验证；**本地/配置类任务**以 `grep .learnings/` + 本地 `read` 对比为主，无需强制跑网，避免重复造轮子
5. 仅用户要求时提交，提交前查 diff
6. **记忆**：`memory` 技能沉淀 `.learnings/`，遇错/纠正必记
7. **GitHub 安全**：<100 警告、100-1000 注意、>1000 可信，exe/msi 一律警告
8. **编码**：UTF-8 无 BOM，原生工具读写，禁 PS 直读中文，跨端用 scp
9. **上下文节约**：`read(offset,limit)` + `grep` 定位，长任务写 `HANDOFF.md`，单次 read≤200 行
10. **防重复**：重复≥2 次立即停止、一句话总结后直接动作；同主题检索≤2 次；禁止“让我确认意图/制定计划”循环；**工具调用防重复**：相同工具+相同参数执行 ≥2 次且输出无变化 → 证据已收敛，立即停止该命令；诊断类任务关键指标全部确认后必须停止，禁止“再确认一次”
11. 时效信息直接查最新（npm/gh/webfetch），不问用户
12. 回答前 `grep -ri 关键词 .learnings/`
13. **表达要求（ChatGPT 式）**：默认先用一句简洁中文讲清结论与下一步，技术细节后置或折叠；不堆术语、不绕弯。回复像 ChatGPT：自然、简洁、有温度，先结论后细节，主动给下一步建议；重要回复（方案/总结/解释）用 `humanizer` 技能润色，去除 AI 腔（过度排比、空洞升华、em dash 滥用）。
14. **选项交互**：结尾需要用户选择时，用 `question` 工具弹出可点击选项（推荐项放第一并标 `(推荐)`），禁止让用户手动输入 `123/A/B`。
15. **全自动维护**：OpenCode 已配置全自动——客户端每周日 03:00 自动升级（计划任务 `OpenCode Auto Upgrade`）、`superpowers` 技能每周自动 `npm update`、记忆自动沉淀（模型候选先落 `.learnings/pending/` 待确认后 promote）、`ERRORS.md` 迁移垃圾每周自动归档、`Recurrence-Count ≥3` 自动晋级 `AGENTS.md`、`session.idle` 自动备份 OneDrive。用户只需正常对话，无需手动维护。
16. **界面可视化**：任何涉及界面/DOM/样式/悬浮层/脚本注入的任务，Plan 阶段必须画出 `Before / After` 框图（ASCII/表格），标注位置、尺寸、颜色、交互与溢出处理，确认后再进 build；纯文本描述不算过关。
17. **自动验证（Codex 式）**：任务完成前必须运行验证命令（测试/lint/typecheck/build），**不通过不交差**；引用 `verification-before-completion` 技能——证据先于断言，禁止"应该能过/看起来没问题"式交差；无法验证时明确说明原因。
18. **技能自动触发（superpowers 全流程）**：复杂任务自动触发 `brainstorming`→`writing-plans`→`executing-plans`；修 bug 触发 `systematic-debugging`；实现功能触发 `test-driven-development`；完成前触发 `verification-before-completion`。涉及技能先加载对应 SKILL.md 再执行。

> 托盘/后台问题见 `opencode-maintenance` skill。手机端：回复精简、diff 折叠、操作前 `qmd-lite`。关联 `AGENTS.md:3.4` 先网后本。

> **A 方案说明（2026-09-02 体检校正）**：capture 通知静默由 `opencode-all-in-one.user.js`（v1.8.7+，`POST /session` 标记后 12s 静音窗口拦截 Audio/Notification）实现，仅覆盖 web 端；桌面客户端声音走 Settings → Sounds。CLI 侧不存在 `tui.json`，`patches/` 方案亦未落地——旧文“已按 B1 插件侧实现 + tui.json 全局静默”失实，已废弃。

## 4 会话管理

- 一个会话只做一个连贯工作单元；换任务开新会话
- **自动规划（Codex 式）**：复杂任务（≥3 步/多文件/跨系统/涉及外部 API）→ **自动先规划再执行**，无需用户提示：写 `.opencode/plans/` 计划 + TodoWrite 跟踪，确认后执行；简单任务（单文件/单步）直接做，不弹窗不打断
- 长任务先 plan agent 规划，再 build 执行
- 关键决策/产出即时落盘到对应文件
- 大改动前先备份相关配置

## 5 跨设备同步（已停用 2026-08-30）

> 软路由容器已删，`/etc/opencode/` 仅历史归档于 `/mnt/usb4-1/archive/*.tar.gz`。下表保留备查。

| 笔记本 `AGENTS.md`/`skills`/`plugins` | 软路由 `/etc/opencode/` | 已停用 |
|---|---|---|

**环境**：笔记本 Windows/x86_64；`<!-- laptop-only -->`/`router-only` 标记保留；`scope:router-only`/`laptop-only`/`cross-env`；≥3 次或 30 天重复 → 提为规则。

## 6 跨对话记忆（本地沉淀）

**架构**：`memory` 技能 → `.learnings/LEARNINGS.md`/`ERRORS.md` + `FEATURE_REQUESTS.md`；本地检索用 `qmd-lite`（`scripts/qmd-lite.js`，FTS5 标题加权+近期加权+rg 兜底，索引 `~/.cache/qmd-lite/index.json`，源 `.learnings/*.md + skills/*.md + AGENTS.md`）。原 opencode-mem（`nomic-embed-text-v1` 语义检索）已停用 2026-09-02，mcp-memory-service 已停用 2026-08-30。

| 存储 | 触发 | 检索 | 提升 |
|------|------|------|------|
| `.learnings/*.md` | 遇错/纠正/更优解必记 | `grep .learnings/` + `qmd-lite` | ≥3 次/30 天 → 提为规则 |

**规则**：问“以前记住”先查 `.learnings/` + `qmd-lite`；“记住 XX”→ `LEARNINGS.md`；`scope:router-only`/`laptop-only`/`cross-env`；禁写 key/token。

**pending 规则**：`.learnings/pending/` 只放记忆候选（`ERR-*`/`FEAT-*`/LRN 格式），任务前扫一次确认后 promote 到正式文件；**脚本/工具文件勿放 pending**（会被 `self-improvement.js` 的 promotePending 误 promote 进 LEARNINGS.md 污染记忆库），应放 `scripts/` 或 `backups/`。

**9.1.0 问前必查（严）**：任何“记忆/历史/以前/删过/记过/正常吗/有效吗”类提问，**必须先** `grep -ri "关键词" .learnings/` + `grep AGENTS.md` 再答；命中即引 `path:line` 并沿用，不足再走 `qmd-lite → MCP`。**禁止等用户纠正后才回查**；**严**：首答未查即视为违规，追加记 `[ERR-YYYYMMDD-XXX] 问前未查 | 漏 grep | 补引并自检` 到 `ERRORS.md`。

**备份**：`session.idle` 自动备份——本地 `~/.local/share/opencode/backups_local/` 保留 3 份全量 + OneDrive `tools/系统_清理_优化/OpenCode-编程助手/` 保留 1 份 latest 快照（`robocopy`，排除 node_modules/backups/.learnings.backup 等）；软路由已归档 `/mnt/usb4-1/archive/*.tar.gz`。

> ⚠️ `~/.opencode-mem/` 目录残留（含 `.auth-token` 敏感文件 + 历史日志），opencode-mem 已停用 2026-09-02，待清理（勿提交/勿同步）。

## 7 知识记录与检索

**原 docs/*.md 已全部迁入记忆库**（tag 带 `doc:文件名`），原文件归档于 `docs-archived-20260826/`。

**规则**：操作手册/配置记录优先记入 `.learnings/` 或 `AGENTS.md`；历史 `doc:` 条目归档于软路由 `/mnt/usb4-1/archive/mcp-memory-data-20260830.tar.gz`（原 memory.db），**禁止**再创建 `docs/*.md`。仅 AGENTS.md、skills/commands 例外。

**检索**：优先查 `.learnings/` 与 `AGENTS.md`；历史知识可解压软路由归档 tar 查原 memory.db（如需）。

## 8 模型与技能指引

**模型**：`opencode.jsonc:provider` 定义白名单（当前 5 个启用 provider：`opencode`/`opencode-go`/`opencode-go-2`/`openrouter`/`deepseek`，`github-copilot` disabled），模型在 web/TUI 界面手动切换，不硬编码固定 `model` 字段（LRN-20260810）。变更运行 `/模型` 自动评分+筛选。

**技能**：本地 11 个实技能 + 14 个 superpowers 原生经 `node_modules` 加载（已清 14 悬空 SYMLINK，`clash`/`steam` 已补 SKILL.md 复活），触发关键词见各 SKILL.md 的 `description` 首句：

| skill | 触发场景 |
|-------|---------|
| `opencode-maintenance` | opencode 卡顿/DB 膨胀/终端乱码/手机访问/Docker 卡 |
| `agent-reach` | 互联网能力路由（选 webfetch/Playwright/Firecrawl/Exa/Tavily） |
| `humanizer` | 文本人性化改写 |
| `tavo-card-craft` | Tavo/SillyTavern 角色卡、世界书、正则 |
| `tavo-operations` | Tavo 应用管理（角色/预设/插件/Discord） |
| `userscript` | 油猴脚本（Tampermonkey） |
| `steam-tools` | Steam 工具 |
| `clash-subscription-management` | Clash 订阅管理 |
| `memory` | 记忆技能：错误/纠正/知识沉淀与检索（`.learnings/`） |
| `lobehub-skills-search-engine` | 技能商店搜索（`lobehub.com/zh/skills`，`skills search --q 任务 --locale zh-CN`） |
| `browser-automation` | 浏览器自动化（`different-ai` 原语 `browser_*`，轻量 claim） |

> 涉及某领域时优先触发对应 skill；英文模型需额外注意中文 CoT（见第1节 Language）。手机端：技能触发保持精简，`grep` 优先，`qmd-lite` 兜底。

> **优化定版 2026-09-02**：25 Skill 全保留（11 实技能 +14 原生），建议 **按需 4 个**（`steam-tools`/`executing-plans`/`dispatching-parallel-agents`/`finishing-a-development-branch` 低频）、**暂不合并** `tavo-card-craft`/`tavo-operations`（省 679 行但增耦合风险）、已清 14 悬空 SYMLINK。

> ⚠️ `comfyui-mcp.py` 缺失（`opencode.jsonc` 引用但 git 未恢复，`enabled:false` 故不崩）；启用前需 `git show e28632e:scripts/comfyui-mcp.py > scripts/comfyui-mcp.py` 恢复。

## 9 错误自学习（越用越聪明）

### 9.1 主动记录规则（三个检查节点）

在对话中按以下时机**主动检查**并决定是否记录，**不要等用户提示**：

**1. 任务开始前（检索）**：
- `grep -ri "关键词" .learnings/` 检索相关历史记录
- 避免重复记录已知问题
- **硬性检查**：处理任何脚本/网站/工具类任务前，必须先 `grep -ri "关键词" .learnings/`（LEARNINGS.md + ERRORS.md），确认是否已有历史记录/已知坑。**禁止跳过此步直接开始**——否则会重复劳动、提出与历史记录冲突的方案（如 ERR-20260901-003）

**2. 任务进行中（判断）**：
遇到以下情况时，**主动判断是否记录**：

**值得记录（记）**：
- 错误修复耗时 > 5 分钟
- 用户纠正了你的方案
- 发现了文档未提及的 API 行为
- 找到了比现有方案更好的方法
- 遇到了之前没见过的错误类型

**可以跳过（不记）**：
- 简单的拼写/语法错误
- 一次性边缘情况，不会重复
- 已经有 AGENTS.md 规则覆盖的问题
- 已经在 `.learnings/` 中有完整记录的同一问题

**3. 任务结束后（复盘，自动执行）**：
- 回顾本次对话，是否有值得记录的内容
- 如果有，按 `memory` 技能格式写入 `.learnings/`
- 检查本次任务涉及的本地 skill 是否需要更新 → 直接更新 `skills/<name>/SKILL.md`
- 检查是否有配置问题（MCP 连不上、env 缺失、密钥明文等）→ 顺手修复
- 检查经验是否满足晋级条件（≥3 次/30 天内重复）→ 提升为 AGENTS.md 规则
- **无需运行 `/记住` 命令**（已由 `self-improvement.js` 插件自动注入指令 + 自动备份）

### 9.2 记录规范

- **遇错必记**：工具/脚本/编码/代理等错误，按 `memory` 技能格式写入 `.learnings/ERRORS.md`（`[ERR-YYYYMMDD-XXX]` + Pattern-Key）
- **自动避坑**：下次任务前 `grep` `.learnings/ERRORS.md` 相关关键词，执行前先读已记录的坑
- **晋级规则**：同一坑 ≥3 次（跨 ≥2 任务）或 30 天内重复 → 提升为 AGENTS.md 规则或新 skill
- **验证**：修复后下次同类任务检查是否复现，未复现则标记 `resolved`；复现则追加记录并考虑晋级
- **记录格式**：`[ERR-YYYYMMDD] 现象 | 根因 | 解法 | 避坑要点`，便于检索命中
