# 学习记录

纠正、洞察和知识差距，用于持续改进。
**类别**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260624-001] MCP环境变量配置

**Logged**: 2026-06-24
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
MCP服务器的环境变量配置需要使用`environment`字段（不是`env`），且支持`{env:VAR_NAME}`语法引用系统环境变量。

### Details
1. OpenCode MCP配置中，传递环境变量给MCP进程的正确字段名是`environment`，不是`env`
2. 支持`{env:VAR_NAME}`语法引用系统环境变量（~/.bashrc中定义的）
3. 示例：
```json
"github": {
  "type": "local",
  "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
  "environment": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

### Suggested Action
- 密钥不要明文写在配置文件里，用`{env:VAR_NAME}`引用系统环境变量
- 系统环境变量在`~/.bashrc`或`~/.profile`中定义

### Metadata
- Source: user_feedback
- Tags: mcp, environment, config, security
- Pattern-Key: mcp-env-config

---

## [LRN-20260629-001] Suggestion Chips ToolPkg 架构与智能体系

**Logged**: 2026-06-29
**Priority**: high
**Status**: resolved
**Area**: plugin, ai-chips

### Summary
Operit Suggestion Chips ToolPkg (`com.operit.suggestion_chips.toolpkg`) 的完整智能架构文档。文件：`/tmp/opencode/suggestion_chips_new_main.js`（309行 63KB）。包路径：`/tmp/opencode/pkg/`。

### 构建命令
```bash
cd /tmp/opencode/pkg && cp ../suggestion_chips_new_main.js ./main.js && rm -f package.zip && zip -r package.zip . -x ".*" && adb push package.zip /sdcard/Android/data/com.ai.assistance.operit/files/packages/com.operit.suggestion_chips.toolpkg && adb shell am force-stop com.ai.assistance.operit
```

### 架构：维感知 + 6函数生成 + 3层过滤

**感知层：**
1. `extractEntities(fullReply)` — LRU缓存(30条)，提取6类实体（files/funcs/errors/tests/configs/apis/urls/steps）+ 7种语言 + 4种错误类型 + 3种结构检测
2. `detectIntent(fullReply)` — LRU缓存(50条 30s TTL)，情绪(error/warning/success/grateful/long_explain) + 4阶段(suggestion/step_by_step/completed/troubleshooting) + 10话题(code/api_call/security/docs/config/file/search/data/plugin/general)

**辅助函数：**
- `_testCmd(lang)` / `_lintCmd(lang)` / `_formatCmd(lang)` — 语言特定命令
- `_errorSuggestions(entities, lang)` — 统一错误建议（funcs+errType优先链）
- `LANG_CMDS` — python/js/ts/java/go/rust/ruby 的 test/lint/format/install 命令映射

**生成层（6函数，全部实体+语言感知）：**
1. `generateQuickActions` — TypeError→检查类型定义、API→测试API、步骤→查看所有步骤
2. `generateDevWorkflowSuggestions` — 使用hasCodeContent()+_errorSuggestions()
3. `generateContextSuggestions` — 10话题分支（api_call→测试API、security→扫描安全、docs→生成文档）
4. `_ctxByEntities` — 实体优先级链：error>func>api>step>file>test>config>url>code
5. `getDefault` — 实体+语言感知兜底
6. `generateComboOptions` — 实体化组合（测试所有API、按顺序执行）

**smartExtract（8种方法）：**
1. `<suggestions>` 标签解析
2. 8种选项模式（A/B/C、1/2/3、方案、js对比、冒号分隔）
3. `• ` 开头行
4. `【建议N】` 格式
5. 编号列表
6. "接下来/然后/之后" 动作指令
7. "你可以/需要/应该" 建议短语

**排序层`sortByPrefs`：**
- 点击偏好学习（30天半衰期时间衰减）
- 意图链式记忆 `_INTENT_CHAIN`（2条链：修复→测试、运行→查看...，5分钟激活窗口）
- 情绪/阶段/话题排序加分

**过滤层：**
- `semanticDedupe` — 跨粒度去重（"运行测试" vs "运行xxx.test.js"）
- `finalizeItems` — 实体质量过滤 + 轮转防重(`_lastShownItems`) + 多样性选择（连续相同动词跳过）
- `RX_INVALID` — 优化黑名单（已移除误过滤项：运行测试/测试配置/查看配置等）

**输出层：**
- `_translateChips` / `_translateChip` / `_isEnglishReply` — 81条翻译映射 + 模式匹配 + 回复>40%拉丁字符自动切换英文

### Package结构
```
pkg/
├── main.js          ← suggestion_chips_new_main.js 的副本
├── manifest.json
├── packages/
│   └── suggestion_config.js (227行 配置UI)
└── ui/
    └── suggestion_chips.ui.js (181行 compose_dsl UI)
```

### 关键教训
1. **extractEntities 必须LRU缓存** — 被6+函数调用，不缓存会重复执行20+正则
2. **_pushUnique 不能遗漏定义** — 多处调用但曾缺失函数定义（严重bug）
3. **编辑时注意函数边界** — 曾因编辑丢失整个EN_CHIP_MAP+翻译函数块（~80行），需在编辑后做完整性检查
4. **黑名单需定期审视** — RX_INVALID 曾误过滤合法建议（运行测试→测试配置/查看配置），需移除

### Metadata
- Source: development_session
- Tags: suggestion-chips, operit, plugin, ai, entity-extraction, intent-detection, multilingual
- Pattern-Key: suggestion-chips-architecture

---

## [LRN-20260630-001] OpenCode 技能插件批量更新

**Logged**: 2026-06-30
**Priority**: medium
**Status**: resolved
**Area**: skill, plugin, maintenance

### Summary
批量更新了OpenCode 技能插件和 ACP 包，并创建了自动更新插件。

### 更新记录
| 技能/插件 | 版本变更 | 来源 |
|-----------|---------|------|
| self-improving-agent | 3.0.23 → 3.0.24 | npm |
| mcp-builder | (新建) 1.1.0 | npm |
| stop-slop | (新建) 1.0.0 | npm |
| find-skills, skill-vetter, tavily | 1.0.0 | 已是最新 |
| clash-subscription-management, configuration, planning, operit-plugin-dev | — | SkillHub 不存在 |

### 自动更新插件
- **文件**: `~/.config/opencode/plugin/auto-updater.ts`
- **功能**: 监听 `session.created` 事件，启动时延迟3秒检查更新
- **策略**: 只更新补丁/小版本，大版本需手动确认
- **注册**: 已添加到 `opencode.jsonc` 的 plugin 数组

### SkillHub API
- 搜索: `https://lightmake.site/api/v1/search?q=<keyword>&limit=10`
- 下载: `https://lightmake.site/api/v1/download?slug=<slug>`
- 下载返回 tar.gz 格式，需解压提取 SKILL.md

### Metadata
- Source: maintenance_session
- Tags: skill, plugin, update, npm, skillhub, auto-updater
- Pattern-Key: skill-batch-update

---

## [LRN-20260701-001] OpenCode 对话在任务完成前断开

**Logged**: 2026-07-01
**Priority**: high
**Status**: resolved
**Area**: config, conversation-continuity

### Summary
OpenCode 对话在任务完成前断开，模型停止执行并询问"需要我做什么"。根因是多个因素叠加。

### 根因分析
1. **Plan 模式 vs Build 模式**：用户在 Plan agent 中执行任务，Plan agent 允许提问（`question: allow`），模型自然倾向于分析完后停下。Build agent 的 `question: deny` 不会停下来提问。
2. **`doom_loop` 触发**：两个 agent 的 `doom_loop` 都是 `"ask"`，模型重复类似操作时会触发提问。
3. **`compaction.auto: false`**：自动压缩关闭，上下文溢出时无自动处理。
4. **`turnProtection.turns: 3`**：只保护最近 3 轮，早期关键信息被剪。
5. **MiMo V2.5 Free 模型特性**：免费模型天生倾向于做完一批操作后停下询问。
6. **`nudgeForce: "soft"` + `iterationNudgeThreshold: 10`**：提醒频率低且力度弱。

### 修补方案（三层防线）
| 配置项 | 改前 | 改后 | 文件 |
|--------|------|------|------|
| AGENTS.md 自主执行规则 | 无保护 | `<protect>` 包裹 | AGENTS.md:27-29 |
| `compaction.auto` | false | true | opencode.jsonc |

### 关键教训
1. **Plan agent 适合分析，Build agent 适合执行** — 日常任务用 Build 模式
2. **多层防线比单一配置更可靠** — 同时调整 compaction + turnProtection + nudge + AGENTS.md
3. **`doom_loop: ask` 可能误判** — 模型做相似但不同的操作时可能被误判为循环
4. **免费模型有固有局限** — 输出 token 限制可能导致中途截断

### Metadata
- Source: user_feedback
- Tags: conversation-break, plan-mode, build-mode, compaction, turn-protection, nudge, doom-loop
- Pattern-Key: conversation-continuity-fix

---

## [LRN-20260701-002] OpenCode compaction 配置优化

**Logged**: 2026-07-01
**Priority**: high
**Status**: resolved
**Area**: config, compaction

### Summary
OpenCode 对话在任务完成前断开，错误信息显示上下文超过模型 1M 限制（1.1M tokens），且压缩本身也因超限而失败。通过优化 compaction 配置解决。

### 根因分析
1. **上下文溢出**：MiMo V2.5 Free 的 1M 上下文窗口被超过（请求1109221 tokens）
2. **压缩失败**：OpenCode 尝试压缩，但对话本身已超过模型限制，压缩调用也超限
3. **ACP 已移除**：之前移除了 ACP 插件，没有主动上下文管理

### 修补方案
修改 `~/.config/opencode/opencode.jsonc` 的 `compaction` 配置：
```jsonc
"compaction": {
  "auto": true,
  "prune": true,
  "reserved": 200000
}
```

| 配置项 | 改前 | 改后 | 说明 |
|--------|------|------|------|
| `auto` | true | true | 保持不变 |
| `prune` | false (默认) | true | 裁剪旧工具输出，减少上下文膨胀 |
| `reserved` | 未设置 | 200000 | 提前 20 万 token 触发压缩，留缓冲区 |

### 关键教训
1. **工具输出是上下文膨胀的主要来源** — bash 结果、文件读取等会快速填满上下文
2. **`prune: true` 可有效减缓膨胀** — 自动裁剪旧的工具输出
3. **`reserved` 参数控制压缩触发时机** — 值越大，压缩触发越早，留更多缓冲区避免溢出
4. **压缩本身也需要调用模型** — 如果上下文已超限，压缩也会失败，必须提前触发
5. **OpenCode 原生压缩配置有限** — 比 ACP 简单但功能也少，适合不需要复杂上下文管理的场景

### Metadata
- Source: debug_session
- Tags: compaction, prune, reserved, context-overflow, tool-output
- Pattern-Key: compaction-config-optimize

---

## [LRN-20260701-003] [已过时] DCP 插件安装与智能上下文管理

**Logged**: 2026-07-01
**Priority**: low
**Status**: deprecated
**Area**: plugin, context-management

> **注意**: DCP 插件已移除，现使用 OpenCode 原生 compaction。此条目保留供参考。

### Summary
安装了DCP (Dynamic Context Pruning) 插件，提供智能上下文压缩和清理功能，与 OpenCode 原生压缩互补。

### 安装过程
1. 运行 `opencode plugin @tarquinen/opencode-dcp@latest --global`
2. 插件自动添加到 `opencode.jsonc` 的 plugin 数组
3. 创建 `~/.config/opencode/dcp.jsonc` 配置文件

### 关键教训
1. **DCP 和 ACP 是不同插件** — DCP 是原版，ACP 是硬化分支
2. **弱模型选 DCP** — MiMo V2.5 Free 等轻量模型兼容性更好
3. **强模型选 ACP** — Claude/GPT-4o 等强模型功能更强大
4. **双重保护** — DCP + OpenCode 原生压缩互补
5. **Per-model 配置** — 可以为不同模型设置不同的压缩阈值

### Metadata
- Source: installation_session
- Tags: dcp, plugin, context-management, compression, pruning, deprecated
- Pattern-Key: dcp-installation

---

## [LRN-20260702-001] WSL 代理配置与 OpenCode Provider 错误

**Logged**: 2026-07-02
**Priority**: high
**Status**: resolved
**Area**: config, proxy, wsl

### Summary
OpenCode 出现 "Error from provider: Provider returned error" 错误，根因是 WSL 中 `~/.bashrc` 的代理配置存在三处互相覆盖，且 NO_PROXY 缺少 IPv6 localhost `::1`。

### 根因分析
1. **三处代理定义互相覆盖**：`~/.bashrc` 中第 132-138、144、146-163 三处定义代理变量，最终生效的是最后一处（auto detection 块）
2. **NO_PROXY 缺少 `::1`**：最终生效值为 `localhost,127.0.0.1,.local`，缺少 IPv6 localhost
3. **auto detection 块在交互检查之后**：`~/.bashrc` 第 10-13 行有非交互式 shell 的 `return`，auto detection 块在第 137 行之后，非交互式 shell 中不会执行
4. **OpenCode config 不支持 proxy 字段**：schema 的 `additionalProperties: false`，无法在配置文件中设置代理

### 修补方案
1. **清理三处代理定义为一处**：删除重复定义
2. **将代理配置移到交互检查之前**：放在 API keys 旁边（第 5-7 行之后），确保非交互式 shell 也能获取代理
3. **添加 `::1` 到 NO_PROXY**：`NO_PROXY=localhost,127.0.0.1,::1,.local`

### 关键教训
1. **`~/.bashrc` 中的非交互检查是常见陷阱**：`case $- in *i*) ;; *) return;; esac` 会导致后续配置对非交互式 shell 不生效
2. **需要非交互式生效的配置（如代理、密钥）必须放在交互检查之前**
3. **OpenCode 只通过环境变量读取代理配置**：不支持配置文件中的 proxy 字段
4. **多处定义同名变量会互相覆盖**：应保持单一定义，避免混淆
5. **IPv6 localhost `::1` 也应加入 NO_PROXY**：防止代理路由环路

### Metadata
- Source: debug_session
- Tags: proxy, wsl, bashrc, no-proxy, ipv6, provider-error
- Pattern-Key: wsl-proxy-fix

---

## [LRN-20260703-001] Windows 任务栏与开始菜单快捷方式独立修复

**Logged**: 2026-07-03
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
任务栏和开始菜单的 OpenCode 快捷方式是两个独立文件，需分别修复。原 TaskBar 快捷方式指向有 bug 的 .NET launcher，应直接指向 npm 安装的 opencode.cmd。

### Details
1. **两个独立快捷方式**：
   - TaskBar: `%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\OpenCode.lnk`
   - Start Menu: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\OpenCode.lnk`
2. **原 TaskBar 问题**：指向 `C:\Users\pass\Documents\OpenCode\opencode-launcher.exe`（4KB .NET 包装器），启动时报 `Win32Exception: 目录名称无效`
3. **原 Start Menu 问题**：指向不存在的 `C:\Users\pass\.opencode\opencode.bat`
4. **修复方式**：两个快捷方式都改为 TargetPath -> `opencode.cmd`，WorkingDirectory -> 项目目录

### Suggested Action
- 修复快捷方式时，需同时检查 TaskBar 和 Start Menu 两个位置
- opencode 正确启动命令：`C:\Users\pass\AppData\Roaming\npm\opencode.cmd`
- 可在项目目录备份快捷方式副本方便管理

### Metadata
- Source: user_feedback
- Related Files: C:\Users\pass\AppData\Roaming\npm\opencode.cmd
- Tags: windows, shortcut, taskbar, start-menu, opencode
- Pattern-Key: windows-shortcut-fix

---

## [LRN-20260704-001] 双 Playwright MCP 浏览器切换配置

**Logged**: 2026-07-04
**Priority**: high
**Status**: resolved
**Area**: mcp, playwright, browser

### Summary
配置双 Playwright MCP 实现默认安全隔离 + 按需控制真实浏览器。

### 配置详情
opencode.jsonc 中同时启用两个 Playwright MCP：
- `playwright`：`--browser=chrome --headless`（独立 Chromium，无窗口无声音，安全隔离）
- `playwright-edge`：`--extension --browser msedge`（通过 Chrome Extension 连接真实 Edge）

### 关键发现
1. `--extension` 模式需要安装 Playwright MCP Bridge Chrome 扩展
2. `--channel msedge` 不是有效参数，应使用 `--browser msedge`
3. `--extension` + `--browser msedge` 可以组合使用，连接 Edge 浏览器
4. 扩展安装在 Edge 中（从 Chrome Web Store 安装，Edge 兼容）
5. MCP 工具按服务器名命名空间隔离：`playwright_browser_*` vs `playwright-edge_browser_*`
6. 两个 MCP 实例可同时运行，互不冲突（使用不同浏览器进程）

### 使用流程
- 日常：AI 使用 `playwright` 工具操作独立浏览器
- 用户说"连接我的浏览器"：AI 切换到 `playwright-edge` 工具
- `playwright-edge` 会列出 Edge 所有标签页，用户选择目标标签
- 操作完成后自动切回 `playwright`

### 安全说明
- 独立浏览器无登录态，AI 无法访问用户 cookies/密码
- 真实 Edge 需用户主动要求才连接
- 每次连接需用户选择标签页

### Metadata
- Source: setup_session
- Tags: playwright, mcp, browser, extension, edge, security, dual-browser
- Pattern-Key: dual-playwright-mcp-setup

---

## [LRN-20260704-002] 备份插件重写与稳定性修复

**Logged**: 2026-07-04
**Priority**: high
**Status**: resolved
**Area**: plugin, backup, stability

### Summary
重写 backup.ts，修复多个严重 bug 并新增增量检测、内容校验等功能。

### 修复的 Bug
1. **DB_PATH 路径错误**：从 `AppData\Local\opencode` 改为 `.local\share\opencode`
2. **backupSkills() 从未实际复制**：只有日志打印，无 robocopy 复制逻辑
3. **robocopy 退出码 0-7 为成功**：旧代码在 robocopy 返回"已复制"时抛异常，导致整个备份中断
4. **symlinkSync 需要管理员权限**：改用 robocopy 复制 latest/ 目录

### 新增功能
- **增量检测**：manifest.json 记录文件 hash + 时间戳，对比后决定是否备份
- **30 分钟最小间隔**：防止频繁退出产生重复备份
- **备份 CLAUDE.md**：全局 CLAUDE.md 加入备份
- **备份 learnings/**：独立目录，方便查找
- **备份 plugins/**：backup.ts + auto-updater.ts
- **保留 3 份**（原 5 份），自动轮转

### 关键教训
1. **robocopy 退出码特殊**：0-7 都是成功（0=无变化，1=已复制，2=额外文件...），>7 才是错误
2. **Windows symlink 需要权限**：普通用户无法创建 symlink，应用 robocopy 复制替代
3. **进程内 setTimeout 不可靠**：进程被 kill 时不会执行，但配置文件备份场景可接受
4. **增量检测用 hash + 时间双保险**：单靠 hash 可能误判（文件被改回原值），加时间间隔更稳
5. **session.start/session.end 不存在**：OpenCode 插件 API 无此事件，是 feature request（#5409, #28695）。正确事件：`session.idle`（AI 回复完成）和 `session.created`（新会话创建）

### Metadata
- Source: maintenance_session
- Tags: backup, plugin, robocopy, hash, incremental, stability
- Pattern-Key: backup-plugin-rewrite

---

## [LRN-20260705-006] insight

**Logged**: 2026-07-05
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
OpenCode 工作区文件夹整理完成

### Details
清理 C:\Users\pass\Documents\OpenCode 文件夹：
- 删除：screenshots/, ui-config/, shortcuts/, suggestion-chips-plugin/, tampermonkey/, wsl.localhost/, my-source.json, operit-international-growth-strategy.md, opencode-launcher.exe
- 删除工作区重复的 .learnings/ 和 skills/（全局已有）
- 最终保留：opencode.ico + OpenCode.lnk

### Metadata
- Source: user_feedback
- Tags: cleanup, workspace
- Pattern-Key: workspace.cleanup

---

## [LRN-20260705-007] correction

**Logged**: 2026-07-05
**Priority**: high
**Status**: resolved
**Area**: workflow

### Summary
完成任务后不要反复问"要不要优化"，直接做

### Details
用户纠正：每次完成任务后问"要不要优化这个优化那个"很烦人。应该：
- 完成主任务时顺手把相关优化做了
- 只在有多种方案或不可逆操作时才确认
- 其他情况直接执行，不要中途停下来问确认

### Suggested Action
遵循 AGENTS.md 的"自主执行"原则，减少不必要的确认环节。

### Metadata
- Source: user_feedback
- Tags: workflow, behavior
- Pattern-Key: workflow.reduce-confirmation-questions

---

## [LRN-20260706-001] correction

**Logged**: 2026-07-06
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
删除 self-improve.js 插件，消除并发写入和自动建议膨胀的根因

### Details
self-improve.js 插件的自动事件处理（session.idle 生成建议、message.part.updated 检测纠正）是 LEARNINGS.md 膨胀和重复条目的根本原因。多个会话并发触发写入，且生成的代码质量建议是静态的。

### 解决方案
1. 从 opencode.jsonc 移除 self-improve.js 插件
2. 保留 self-improving-agent skill（AI 手动记录指令）
3. 保留 backup.ts、auto-updater.ts 插件
4. 调整 compaction.reserved：100000→200000

### Metadata
- Source: maintenance_session
- Tags: cleanup, plugin, concurrency, compaction
- Pattern-Key: remove-self-improve-plugin

---

### [2026-07-07] correction (weight: 8)

[浏览器] 连接用户浏览器时不要擅自开新标签页。用户说"连接我的浏览器"应该只 list 现有标签并切换，不能打开新 tab 或导航到新 URL。已写入 AGENTS.md 作为规则。

---

### [2026-07-08] correction (weight: 8)

[Playwright浏览器进程管理] Playwright 报错 "Browser is already in use" 时，不能通过 taskkill 杀掉所有 chrome.exe 和 msedge.exe 来释放锁，这会强制关闭用户正在使用的 Edge 浏览器。应该只杀 Playwright 自己的 chrome 进程，不要杀 msedge.exe。已写入 AGENTS.md 作为规则。

---

### [2026-07-08] correction (weight: 7)

[构建验证过度] verification-before-completion 技能要求"运行验证命令并确认输出"，但被我过度解读为"反复确认直到放心"。一次验证通过即为通过，不要重复执行同一命令。已写入 AGENTS.md 工作流约定作为通用规则。

---

### [2026-07-08] observation (weight: 6)

[Android 子模块] git clone 大型 Android 项目时必须加 --recursive，否则原生模块（terminal/mnn/llama/ncnn 等）目录为空，导致编译报错 "No matching variant"。修复需要 git submodule update --init --recursive，但大仓库（ncnn~150MB, llama.cpp~100MB）拉取很慢。

---

### [2026-07-08] observation (weight: 6)

[Android 启动闪烁修复] setTheme() 在 onCreate 中调用无法影响 starting window（系统在任何代码执行前已创建）。SplashScreen API 是唯一可靠方案。修了 4 轮（紫→白→黑→还是闪）后放弃，ROI 太低。对于原项目 UI 闪烁问题，应优先评估是否影响用户体验再决定是否修复。

---

### [2026-07-08] correction (weight: 7)

[大型项目改动评估] 修改 Android 原项目前应评估：① git submodule 数量和大小 ② build.gradle 中的 fileTree 依赖（.aar/.so 文件是否存在）③ NDK/CMake 要求 ④ 原生模块数量。如果环境配置本身就很困难，应该先解决环境问题再做功能开发，或者直接在自己的独立项目中开发而非修改原项目。

---

## [LRN-20260708-001] best_practice

**Logged**: 2026-07-08
**Priority**: high
**Status**: resolved
**Area**: config, clash, proxy

### Summary
三合一 FlClash 配置全面优化：地区分组 fallback 模式、自动选择过滤、Google 分组合并、规则优化。

### Details
1. **Provider 调整**：provider1 从三合一 HTTP 改为 XFLTD (type: file)，移除三合一订阅 URL
2. **地区分组 fallback**：5 个地区分组（港/美/日/新/台）从 url-test 改为 fallback，use: [provider1, provider2, provider3] 定义优先级
3. **命名约定**：地区分组用"(故障转移)"后缀，机场分组保持"(自动/手动)"
4. **自动选择过滤**：通过覆写脚本动态修改 filter，只保留 5 个热门地区
5. **Google 分组**：合并 FCM 到更广泛的 Google 分组
6. **规则优化**：Telegram/PikPak/ProxyLite 从手动切换移到自动选择
7. **新增 rule-provider**：china_media (国内流媒体) → 直连
8. **去广告移除**：删除去广告分组，靠浏览器插件替代
9. **覆写脚本精简**：226 行 → 25 行

### Key Learnings
- fallback + use: 比 include-all-providers 更适合地区分组（显式优先级）
- 覆写脚本动态修改 filter 比改 YAML 更灵活
- FCM 可以合并到更广泛的 Google 分组
- Telegram/PikPak/ProxyLite 应走自动选择，不是手动切换
- china_media rule-provider 对国内流媒体覆盖好

### Metadata
- Source: optimization_session
- Related Files: 323413412883206144.yaml, 323404916661948416.js
- Tags: clash, flclash, proxy, config, fallback, filter, optimization
- Pattern-Key: three-airport-optimization

---

