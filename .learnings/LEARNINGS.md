# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260903-003] insight

**Logged**: 2026-09-03T07:10:00+08:00
**Priority**: high
**Status**: resolved
**Area**: userscript/opencode

### Summary
opencode-all-in-one.user.js v1.9.0 发布：参考 crim50n/oc-remote（Android 原生 OpenCode 客户端）新增 9 项能力，直接解决之前 web 页面「此页面没有响应」卡死问题

### Details
- 变更: v1.8.14 → v1.9.0，+533 行/-15 行
- 新增模块（P0 解决卡死 3 项）：LARGE_IMAGE_MODULE（大图懒加载/降采样 >200KB）、TOOL_FOLD_MODULE（长输出折叠 >50 行）、PASTE_COMPRESS_MODULE（粘贴压缩 1280px/WebP 0.8/<200KB）
- 新增模块（P1 体验 4 项）：SMART_SCROLL_MODULE（智能滚动）、REASONING_FOLD_MODULE（推理折叠）、CONNECTION_MODULE 指数退避（1s→30s）、TOKEN_USAGE_MODULE（用量胶囊）
- 新增模块（P2 2 项）：DRAFT_MODULE（草稿持久化）、CODE_WRAP_MODULE（代码换行切换）
- 参考源: `crim50n/oc-remote`（123★，MIT，Android Kotlin 客户端）
- 发布: `git push` 到 `Mariomoprc/my-userscripts`，Webhook 自动同步 Greasy Fork

### Suggested Action
- DOM 选择器需实测（TOOL_FOLD 的 `pre/code/[class*="output"]`、REASONING_FOLD 的 `[class*="reasoning"]`），build 阶段用 playwright-edge 检查
- 大图阈值 200KB / 粘贴压缩 1280px/200KB 已确认（用户选择推荐档）

### Metadata
- Source: conversation
- Tags: userscript, opencode, tampermonkey, oc-remote, large-image, tool-fold, smart-scroll, reasoning-fold, token-usage, draft, code-wrap, connection-reconnect
- Pattern-Key: userscript.opencode.all-in-one-v1.9.0-oc-remote
- Recurrence-Count: 1
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03
- Valid-Until: 2027-09-03
- Source-Config: opencode-all-in-one.user.js v1.9.0 / .opencode/plans/20260903-oc-remote-optimize.md

---

### Summary
web 页面「此页面没有响应」偶发根因（纠正）：**短会话 550 events 也卡，说明不是会话长短，是单条大 content（340KB base64 图片 + 75KB/45KB 长 tool 输出）的 markdown/图片渲染阻塞主线程**；playwright 无扩展也会超时，排除扩展主因；与 09-02 Electron DB 膨胀不同，本次 DB 325MB 正常、后端健康

### Details
- 现象: Edge 浏览器 `localhost:4096` 的 opencode web UI 偶发「此页面没有响应」，**新证据：盒盖会话 `ses_f9bc21a9fffeezBUPwdG7cvKAD` 仅 550 events / 34 messages / 27 万 tokens 却也卡住**（用户09-03 15:51 金沙截图2），推翻09-03 06:45“88.7 万超长会话主因”判断
- 取证: ① 后端健康（匿名 401 / 带认证 200，0.12s）排除 zombie；② `opencode.db` 325MB + WAL 4MB 正常，event 35312 条，`message.updated` 126MB + `message.part.updated` 67MB 全量快照仍在；③ 65 个会话 100% 30 天内活跃 → DB 清理 30 天保留当前无效；④ **盒盖会话最大 part `prt_0643de621002V3At79FgarUavF` 340KB `image/png` base64** + 75KB `tool read` + 45KB/42KB `tool bash` 的长输出，前端 markdown/图片解码阻塞主线程；⑤ playwright-edge 无扩展打开盒盖会话 **Snapshot 30s 超时 / console 1 errors** 复现卡死，排除扩展主因；⑥ Edge renderer 进程 33996 占 **4.5GB 内存**（大量 DOM/图片未释放）；⑦ 额外：Edge 装 Dark Reader/流畅阅读/Qshot `<all_urls>` 全站注入但非主因（playwright 无扩展也卡）
- 误判: 09-03 06:45 误判 88.7 万超长会话是主因，实际短会话也卡，应聚焦**单条大 content 渲染**与**前端列表渲染实现**（非虚拟化）；易误为 Electron，实际是 Edge（`Get-Process MainWindowTitle -eq "OpenCode"` 返回 msedge.exe）
- 修复: ① `opencode-all-in-one.user.js` MODEL_QUOTA MutationObserver 300ms 防抖 + 提前检查 `[data-option-key]`（`node --check` OK，已生效）；② 已执行 `Ctrl+R` 刷新用户实际标签页，刷新后 `windows_Snapshot` 显示盒盖会话正常渲染（跳转按钮/列表项目可见）
- 建议: 大图片粘贴前压缩/避免 300KB+ base64 入会话；长 tool 输出让模型截断；偶发卡住点「等待」或刷新；根本解需前端对长 content/图片做懒加载/虚拟化（opencode 源码层）

### Suggested Action
- 诊断分流固定套路：`curl /global/health` 200 排除后端 → `Get-Item opencode.db` MB 排除 DB 膨胀 → `Get-Process MainWindowTitle` 确认是 Edge 还是 Electron → 查超长会话 tokens（`curl /session/<id>` 的 tokens.input）→ playwright-edge 打开会话页看 main 是否空白
- 超长会话是渲染压力主因，`OPENCODE_EXPERIMENTAL_EVENT_QUEUE_MAX` 只限流队列不治渲染

### Metadata
- Source: conversation
- Tags: opencode, web, page-unresponsive, large-part, renderer, edge, userscript, image-base64
- Pattern-Key: opencode.web.unresponsive-large-part-render
- Recurrence-Count: 2
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03
- Valid-Until: 2027-09-03
- Source-Config: opencode.jsonc:101 EVENT_QUEUE_MAX=10000 / opencode-all-in-one.user.js MODEL_QUOTA

---

## [LRN-20260903-002] insight

**Logged**: 2026-09-03T06:45:00+08:00
**Priority**: high
**Status**: resolved
**Area**: opencode/web

### Summary
web 页面「此页面没有响应」偶发根因（纠正）：**短会话 550 events 也卡，不是会话长短，是单条大 content（340KB base64 图片 + 75KB/45KB 长 tool 输出）的渲染阻塞主线程**；playwright 无扩展也会超时，排除扩展主因；与 09-02 Electron DB 膨胀不同

### Details
- 现象: Edge 浏览器 `localhost:4096` 偶发「此页面没有响应」，**盒盖会话 `ses_f9bc21a9fffeezBUPwdG7cvKAD` 仅 550 events / 27 万 tokens 却也卡住**
- 取证: ① 后端健康（匿名 401 / 带认证 200，0.12s）排除 zombie；② `opencode.db` 325MB 正常；③ **最大 part 340KB `image/png` base64** + 75KB/45KB 长 tool 输出；④ playwright-edge **无扩展**打开会话页 **30s 超时**复现卡死 → 排除扩展主因
- 误判: 易误为超长会话主因（88.7 万 tokens），实际短会话也卡，应聚焦单条大 content 渲染
- 修复: 已加到 `opencode-all-in-one.user.js` v1.9.0（LARGE_IMAGE_MODULE + TOOL_FOLD_MODULE）

### Metadata
- Tags: opencode, web, page-unresponsive, large-part, image-base64, tool-output
- Pattern-Key: opencode.web.unresponsive-large-part-render
- Recurrence-Count: 2
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03
- Valid-Until: 2027-09-03
- Source-Config: opencode-all-in-one.user.js v1.9.0

---

## [LRN-20260903-001] insight

**Logged**: 2026-09-03T06:45:00+08:00
**Priority**: high
**Status**: resolved
**Area**: power/windows

### Summary
联想 ThinkBook S0 现代待机合盖变休眠：设置 UI 显示"睡眠"但注册表 6 项电源动作全为 1(休眠)，UI 不可信，注册表才是生效值

### Details
- 机器: ThinkBook 14 G8+ IPH (MTM 21VG), Win11 25H2 (26200.9278), S0 Modern Standby（S3 被 Device Guard/VBS 禁用）
- 现象: 合盖直接休眠（开盖要读 hiberfil 慢），设置 UI 显示"睡眠"但实际休眠
- 根因: `HKLM\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes\<GUID>\4f971e89-eebd-4455-a8de-9e59040e7347\` 下三键 AC/DC 全为 1(休眠)：LidAction `5ca83367-6e45-459f-a27b-476b1d01c936`、PowerButton `7648efa3-dd9c-4e3e-b566-50f929386280`、SleepButton `96996bc0-ad50-47ec-923b-6f41874dd9eb`；DefaultPowerSchemeValues 默认也是休眠（出厂/更新预设）
- 叠加机制: S0 睡眠后 `Hibernate from Sleep - Fixed Timeout`（事件42）自动转休眠；`ModernSleep\EnabledActions=0x7` 控制
- 时间线: 8/31 前纯 S0 浅睡（506/507 成对无 42 事件），9/1 起出现 42 事件（当天装 Logi Plugin Service + 首次 Application API 休眠 187 事件）
- 联想全家桶运行中（Vantage/Dispatcher/AI Turbo BatteryLife/SmartSense/LenovoProcessManagement），可能动态覆盖电源策略
- 修复: `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0`（×6 三键 AC/DC）+ `powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE 28800`（8h）+ `powercfg /SetActive SCHEME_CURRENT`
- 验证: 注册表复核三键 AC/DC=0x0，HIBERNATEIDLE AC=0x7080(28800s)；powercfg /q SUB_BUTTONS 只显示 UIBUTTON_ACTION，GUID 单独查询返回空（powercfg 显示限制），注册表 reg query 才是权威

### Suggested Action
- 排查"合盖变休眠"先查注册表 User\PowerSchemes 三键 AC/DCSettingIndex，别信设置 UI
- S0 机器合盖后 5-10 分钟自动转休眠是 Fixed Timeout 机制，需改 HIBERNATEIDLE 或接受
- 联想笔记本电源行为异常先怀疑 Vantage/Dispatcher 覆盖，改完 5 分钟后复核注册表防回写

### Metadata
- Source: conversation
- Tags: power, sleep, hibernate, modern-standby, lenovo, thinkbook, powercfg
- Pattern-Key: power.lid-hibernate-registry-mismatch
- Recurrence-Count: 1
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03
- Valid-Until: 2027-09-03
- Source-Config: HKLM\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes

---

## [LRN-20260902-002] insight

**Logged**: 2026-09-02T20:15:00+08:00
**Priority**: high
**Status**: resolved
**Area**: opencode/electron

### Summary
Electron `此页面没有响应` 根因是 opencode.db 膨胀至 928MB+WAL 847MB，主线程加载 71k events 阻塞 >5s

### Details
- 现象: OpenCode 桌面端弹窗 `此页面没有响应 | OpenCode [等待][退出页面]`，背景模型列表半可见（截图），`1个文件已更改 opencode.jsonc` 提示 watcher 触发
- 取证: `opencode.db` 974MB + `opencode.db-wal` 888MB 合计 1.77GB；`event` 71817 条，`message.updated` 384MB + `message.part.updated` 217MB（全量快照 bug #33356，`OPENCODE_EXPERIMENTAL_EVENT_QUEUE_MAX=10000` 已配但未根治存储）；`session` 108 个，Top5 占 25%（`ses_fa479...` 6670, `ses_fa082...` 5776 等）；`curl /global/health` 200 但 DB 读阻塞 renderer
- 误判: 易误为 4096 zombie 或网络，实为 renderer DB 读；`desktop-vs-web` 对比可分流（本例 desktop 卡但 `localhost:4096` 健康）
- 修复: 删 8 个大 session（`opencode session delete` 级联删 event，释放 42k events，108→61 sessions），`VACUUM INTO` 后 928→308MB（-67%），`PRAGMA wal_checkpoint(TRUNCATE)` 清 WAL，清 `GPUCache`；serve 内存 438→261MB；`verify-serve-env.ps1` ALL PASS，`integrity_check` ok
- 清理残留: 删 `opencode.db.pre-replace-*` 929MB 备份释放，保留 `pre-compact-488M` 作回滚；清 `TEMP\opencode` compacted/backup
- 自动化: 改造 `scripts/opencode-db-cleanup.ps1` 为唯一清理脚本（删 30 天前未更新 session 双条件 + 清孤儿 + VACUUM INTO 在线压缩 + DB>800MB 低峰才分离替换），停用空转的 `OpenCode DB Vacuum`（只 VACUUM 不删数据且与 tray 冲突），新建 `OpenCode DB Cleanup` 计划任务每周日 04:00 自动跑（Interactive+Limited，-RetentionDays 30），试跑 309.5M→309.5M 无过期会话，释放 TEMP 681M

### Suggested Action
- `opencode.db` >500MB 即告警，>1GB 必清；每月跑一次 `opencode session delete` + `VACUUM INTO`
- 诊断分流固定套路：`curl health` 200 则排除后端 → 查 `Get-Item opencode.db` MB → DevTools Performance 录 Long Task
- 避免频繁改 `opencode.jsonc` 触发 watcher 连环重载

### Metadata
- Source: conversation
- Tags: opencode, electron, page-unresponsive, db-bloat, event-sourcing
- Pattern-Key: opencode.electron.unresponsive-db-bloat
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02
- Valid-Until: 2027-09-02
- Source-Config: opencode.jsonc:101 EVENT_QUEUE_MAX=10000 / SKILL opencode-maintenance

---

## [LRN-20260902-001] insight

**Logged**: 2026-09-02T17:55:00+08:00
**Priority**: high
**Status**: resolved
**Area**: network/extension

### Summary
Checker Plus for Gmail 弹窗翻译失败非DNS/CSP问题，是共享代理IP被 Google 免费翻译接口限频(429/Sorry)

### Details
- 现象: Checker Plus v36.4 弹窗/预览内翻译按钮一直失败(用户选2), Options页 extension:// 中文正常
- 排查: WinINET ProxyEnable=1 ProxyServer=192.168.3.100:7893 正确(TUN模式), WinHTTP direct 预期不影响Chrome
- 取证: curl -x http://192.168.3.100:7893 https://translate.googleapis.com/... 返回 200 Connection established 后 429 Too Many Requests / Sorry automated queries, 直连同样429 -> 证明隧道正常, 但该机场节点IP已被Google限频(共享IP通病)
- 误判: 之前认为是 0.0.0.0 DNS 污染或 manifest host_permissions, 实为限频

### Suggested Action
- A档: Clash 切换冷门/低倍率节点后重测 curl 直到 Body 返回 [[["你好"]]]; Edge 重启后复测扩展
- B档: 若全节点429, 改请求域为 translate.googleapis.cn 或自建 Cloudflare Worker 转发
- 诊断脚本: .learnings/pending/checker-plus-translate-diag.ps1 (curl 双域对比)

### Metadata
- Source: conversation
- Tags: checker-plus, translate, proxy, 429, openclash
- Pattern-Key: extension.translate.rate-limited-shared-ip
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02
- Valid-Until: 2027-09-02
- Source-Config: HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings / 192.168.3.100:7893

---

## [LRN-20260901-001] best_practice

**Logged**: 2026-09-01T12:45:00Z
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
QUESTION_MODULE 数字键分支缺少 isCustomInputFocused 检查导致自定义输入框无法输入数字

### Details
在 `opencode-all-in-one.user.js` 的 QUESTION_MODULE（选项键盘导航模块）中：
- **数字键分支**（第 852-860 行）：直接 `preventDefault()` 阻止数字输入并点击对应选项，**未检查**焦点是否在自定义输入框内
- **Enter 分支**（第 864 行）：已正确检查 `isCustomInputFocused(e.target)`

导致用户在"自定义输入" textarea 里输入数字时，数字被脚本拦截并直接跳到对应选项，焦点跳出输入框。

**根因**：修复 Enter 分支时遗漏了数字键分支的同类检查。

### Suggested Action
任何处理键盘事件的分支，如果会影响输入控件（textarea/input），都必须先检查焦点是否在输入控件内，再决定是否拦截。

### Resolution
- **Resolved**: 2026-09-01T12:45:00Z
- **Commit**: c3a60bc
- **Notes**: 在数字键分支开头加 `if (isCustomInputFocused(e.target)) return;`，与 Enter 分支逻辑对齐。bump @version 至 1.7.9。

### Metadata
- Source: user_feedback
- Related Files: opencode-all-in-one.user.js
- Tags: bug-fix, keyboard-navigation, question-module
- See Also: LRN-20260830-003 (Enter 空内容提交修复)
- Pattern-Key: frontend.input-focus-check-miss
- Recurrence-Count: 2
- First-Seen: 2026-08-30
- Last-Seen: 2026-09-01

---

## [LRN-20260901-001] claude-code-third-party-vision-blocked

**Logged**: 2026-09-01T12:30:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
Claude Code 客户端对第三方模型（通过 ANTHROPIC_BASE_URL 接入）做图片输入白名单判断，只认 claude-* 官方模型 ID。即使后端模型（如 deepseek-v4-flash-vision-exp）支持视觉，客户端也会在请求发出前拦截，报 "Cannot read ... (this model does not support image input)"。这是 Anthropic 的设计限制，官方文档明确不支持非 Claude 模型路由。

### Details
- 用户 Claude Code 2.1.252 通过 DeepSeek Anthropic 兼容端点（https://api.deepseek.com/anthropic）接入，模型 deepseek-v4-flash-vision-exp
- opencode 的 models.json 确认该模型支持 image 模态（modalities.input: ["text", "image"]，attachment: true）
- Claude Code 客户端 hasVision() 只认 claude-* 前缀，deepseek-v4-flash-vision-exp 不在白名单 → 拦截
- 会话 cost=0 证明请求根本没发出
- 官方声明：code.claude.com/docs/en/llm-gateway - "Anthropic doesn't support routing Claude Code to non-Claude models through any gateway"

### 解决方案
将 Claude Code 模型从 deepseek-v4-flash-vision-exp 改为 deepseek-v4-flash（纯文本模型），接受 Claude Code 第三方 provider 不支持图片的限制。看图需求在 opencode 中使用 deepseek/deepseek-v4-flash-vision-exp。

### 配置位置
Claude Code 的模型配置在 ~/.claude/settings.json 的 env 字段：
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<key>",
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_MODEL": "deepseek-v4-flash"
  }
}
```

### Suggested Action
- Claude Code 第三方 provider 不支持图片，需图片时用 opencode + vision-exp
- 配置修改：编辑 ~/.claude/settings.json → 重启 Claude Code

### Metadata
- Source: conversation
- Tags: claude-code, third-party, vision, image-input, deepseek, config
- Pattern-Key: claude-code.third-party-vision-blocked
- Recurrence-Count: 1
- First-Seen: 2026-09-01
- Last-Seen: 2026-09-01

---

## [LRN-20260901-002] insight

**Logged**: 2026-09-01T12:45:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Playwright 无法测试 Tampermonkey 脚本，但可通过"等价逻辑注入法"验证关键逻辑

### Details
Playwright 是无头 Chromium，没有浏览器扩展支持，无法加载 Tampermonkey。

**等价逻辑注入法**：
1. 注入伪造的 DOM 结构（与真实 DOM 的 data-component/data-slot 属性一致）
2. 注入待测试的 keydown handler（与脚本逻辑相同）
3. 用 `page.keyboard.press()` 真实按键触发
4. 断言 DOM 状态（textarea 值、选项点击标记）

**验证结果**：
- Bug 版：textarea 聚焦时按数字键 → 选项被点击（复现成功）
- 修复版：textarea 聚焦时按数字键 → 选项不被点击，焦点保持（修复验证）

**注意**：旧的匿名 handler 无法 `removeEventListener`，需重新加载页面清除后再注入新 handler。

### Suggested Action
油猴脚本调试时，优先使用"等价逻辑注入法"，避免依赖真实 AI 调用触发弹窗。

### Metadata
- Source: conversation
- Tags: playwright, tampermonkey, testing, debugging
- Pattern-Key: testing.userscript-equivalent-injection
- Recurrence-Count: 1
- First-Seen: 2026-09-01

---

## [LRN-20260901-003] knowledge_gap

**Logged**: 2026-09-01T05:15:00.000Z
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
opencode-go-2 自定义 provider 用 @ai-sdk/openai-compatible 导致 muse-spark-1.2-contributor 500 错误，根因是该模型需要 /responses 端点（@ai-sdk/openai）而非 /chat/completions。

### Details
- 现象：opencode-go-2 选 muse-spark-1.2-contributor 报 Internal server error（500），同 provider 下 mimo-v2.5 / deepseek-v4-flash 正常
- 根因：自定义 provider 用 `@ai-sdk/openai-compatible` 把所有模型发到 `/chat/completions`，但 muse-spark 需要 `/responses` 端点（OpenAI Responses API，`@ai-sdk/openai`）
- 证据：官方文档 go.mdx 明确 muse-spark 用 `/responses` + `@ai-sdk/openai`；直接测试 `/responses` 端点返回 200
- opencode 内置 provider 通过 models.dev 的 model.provider.npm 字段自动处理此差异，自定义 provider 需手动指定

### Suggested Action
opencode 自定义 provider 时，检查 models.dev 中每个模型的 provider.npm 字段。若模型用不同于 provider 级的 SDK（如 muse-spark 用 @ai-sdk/openai），需在 model 配置中添加：
```jsonc
"provider": { "npm": "@ai-sdk/openai", "api": "https://opencode.ai/zen/go/v1" }
```

### Metadata
- Source: conversation
- Tags: opencode, provider, muse-spark, api-endpoint, config
- Pattern-Key: config.model-sdk-mismatch
- Recurrence-Count: 1
- First-Seen: 2026-09-01
- See Also: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/go.mdx

---

## [LRN-20260901-004] infra

**Logged**: 2026-09-01T15:45:00+08:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
opencode-tray.exe 是 4096 后端唯一守护进程，重启后 Missing API key 的预防需以 jsonc 的 {env:} 为单一清单

### Details
- 现象：重启 4096 后 opencode-go-2 Missing API key，根因是 tray CreateProcessW(..., NULL) 继承 tray 自身 env（开机快照），而 env 注入只在 serve.ps1
- 修复：tray.cpp 新增 InjectUserEnv()（StartServe 前从 HKCU\Environment 读 12 个变量注入，日志 InjectUserEnv: X/12），并建立两个脚本：
  - scripts/sync-env-to-tray.ps1 — 以 jsonc 的 {env:} 为唯一清单，校验/同步 tray.cpp 的 USER_ENV_VARS[] 与 serve.ps1/serve-watchdog.ps1 的注入块（.\sync-env-to-tray.ps1 -Check 用于 CI）
  - scripts/verify-serve-env.ps1 — 重启后自检（port/health/auth/config apiKey 非空/log 无 ERROR）
- 验证：pwsh -File scripts/sync-env-to-tray.ps1 -Check OK；pwsh -File scripts/verify-serve-env.ps1 ALL PASS；tray 日志 InjectUserEnv: 10/12；/config 返回 sk-p4i...

### Suggested Action
- 新增/修改 {env:VAR} 时必跑 sync-env-to-tray.ps1 → 重编译 tray（uild-tray.bat，需先杀 tray+serve 解锁 exe）→ erify-serve-env.ps1
- 重启 4096 后必跑 erify-serve-env.ps1；排查时先查 Get-CimInstance Win32_Process 的 ParentProcessId 是否为 opencode-tray
- 参见 ERR-20260901-004

### Metadata
- Source: conversation
- Tags: infra, tray, env, opencode
- Pattern-Key: infra.tray.env-sync
- Recurrence-Count: 1
- First-Seen: 2026-09-01
---
## [LRN-20260901-005] best_practice

**Logged**: 2026-09-01T13:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Tampermonkey 拖拽文字需 early capture + types 快判，否则 dragenter 时 getData 不可读导致误判为文件并弹出 OC 遮挡层

### Details
- 现象：opencode-all-in-one 1.8.2 精简版 DRAG 仅拦截 Files，文字拖拽仍显示"拖放文件以添加附件"虚线框
- 根因：Chrome 限制 dataTransfer.getData 仅在 drop 可读，dragenter 阶段调用 extractText 始终空，导致 isTextOnlyDrag 放行
- 修复：hasTextType(dt) 仅查 dt.types 是否含 text/plain|uri-list|html|text；onDragCheck 用 isTextTypesDrag 快判并 hideOverlay，onDrop 再用 getData 精判插入

### Suggested Action
所有 userscript 拖拽拦截，dragenter/dragover 用 types 快判，drop 再用 getData；isLocalhost4096 门控 + document-start 早期注册

### Metadata
- Source: user_feedback
- Related Files: opencode-all-in-one.user.js
- Tags: drag-drop, userscript, tampermonkey, overlay
- Pattern-Key: frontend.drag-types-fastcheck
- Recurrence-Count: 1
- First-Seen: 2026-09-01
- Last-Seen: 2026-09-01

---
## [LRN-20260901-006] best_practice

**Logged**: 2026-09-01T13:10:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
模型选择器额度旁国家/评分/训练标记需经 GO_MODULE 暴露 __getCountry/__getMeta，MODEL_QUOTA 直接查 MODEL_META.country

### Details
- 现象：下拉仅显示 37,800/月 52分，无国家；面板 GO_MODULE.renderPanel 已有 (中国)/(美国)，下拉未同步
- 修复：GO_MODULE 新增 __getCountry/__getMeta，MODEL_QUOTA 拼 tag.innerHTML = quota + (country) + scoreColor + 训练⚠
- 校验：Playwright 模拟 DataTransfer + 额度 map 验证 DeepSeek(中国)52分 / Muse Spark(美国)57分⚠ 正确

### Suggested Action
涉及 MODEL_META 的展示统一走 GO_MODULE 暴露接口，避免直接访问内部 map 导致不一致；新增字段时同步面板与下拉

### Metadata
- Source: conversation
- Related Files: opencode-all-in-one.user.js
- Tags: model-meta, quota-display, go-module
- Pattern-Key: frontend.model-meta-expose
- Recurrence-Count: 1
- First-Seen: 2026-09-01
- Last-Seen: 2026-09-01

---
## [LRN-20260901-007] insight

**Logged**: 2026-09-01T13:20:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
localhost:4096 后端断连需主动探活：fetch 包装 + 5s HEAD 轮询 + title 闪烁，不自动 reload 避免丢草稿

### Details
- 需求：opencode serve 重启时 oc web 无提示；用户期望掉线/重连 toast
- 实现：CONNECTION_MODULE 劫持 window.fetch 计数 failCount≥2 判断开，探活 HEAD / 成功清零，online/offline 监听，toast + document.title = ● 掉线 -
- 约束：仅 isLocalhost4096 生效，4096 端口限定 via @include；不自动 reload

### Suggested Action
后续同类"后端探活"需求复用此模式：劫持 fetch + 轮询 HEAD + 阈值2 + title 提示；仅 localhost:4096 门控避免污染 192.168

### Metadata
- Source: user_feedback
- Related Files: opencode-all-in-one.user.js
- Tags: connection-probe, opencode, fetch-wrap
- Pattern-Key: infra.connection-probe
- Recurrence-Count: 1
- First-Seen: 2026-09-01
- Last-Seen: 2026-09-01

---


---

## [MIG-20260902] 800?200 ??? opencode-mem (??????, ? discussion/learning/bug-fix/fact ??200)

### [001] bug-fix | opencode-mem,authentication,migration,sqlite
## Request
用户继续之前的会话，需要将 `.learnings/` 目录下的 367 条记忆导入到 opencode-mem（一个运行在 127.0.0.1:4747 的 SQLite 记忆系统，带 547MB 嵌入模型）。

## Outcome
排查并修复了 opencode-mem 的认证问题。发现 API 使用 Basic Auth（用户名 `opencode`，密码来自 `OPENCODE_SERVER_PASSWORD` 环境变量，值为 `n5jU*KqG5#B9YHT#`），而非 Bearer token。修改了 `C:\Users\pass\.config\opencode\scripts\migrate-learnings.mjs` 迁移脚本，将认证方式从 Bearer 改为 Basic Auth。通过 `curl.exe` 测试确认 `/api/health` 免认证但 memory API 需要认证。最终通过 Basic Auth 成功向 `POST /api/memories` 导入记忆。涉及文件：`migrate-learnings.mjs`、opencode-mem 插件（位于 `C:\Users\pass\.cache\opencode\packages\opencode-mem\node_modules\opencode-mem\`）。

### [002] bug-fix | userscript,danmaku,xgplayer,debugging
## Request
用户报告人人视频（mh.yichengwlkj.com）弹幕字号异常（约50-60px，远超正常值），要求修复脚本。

## Outcome
通过 Playwright 实际访问站点 + 下载分析打包 JS 进行诊断：
- 站点播放器是 xgplayer（西瓜播放器），视频原始分辨率 960×540
- 弹幕引擎是独立的 `window["danmu.js"]` 库
- 弹幕字号计算核心代码在 `67715380.js`（@1451779）：弹幕字号 = 基准字号 × 视频显示宽度/1920（横屏）或 ×高度/1080（竖屏 scale>120）
- 默认字号：横屏 `baseSizeX:49`（按 1920 宽），竖屏 `baseSizeY:28`（按 1080 高）
- 排查了增强包去广告 CSS 是否误伤弹幕层、`openfpcdn.io` 是否被误拦（火山引擎 veplayer CDN）
- 发现播放器是内嵌火山引擎 veplayer SDK，弹幕有「极小/适中/极大」字号设置
- 诊断尚未完成（弹幕层未实际渲染复现），正在追查 `danmu.js` 加载来源和 setFontSize 持久化逻辑

Tags: userscript, danmaku, xgplayer, debugging

### [003] bug-fix | userscript,danmaku,playwright,debugging
## Request
用户报告"人人视频增强包"用户脚本在网页全屏时弹幕字号异常，要求修复脚本。

## Outcome
通过 Playwright 诊断 mh.yichengwlkj.com 播放器弹幕结构：弹幕容器为 `#danmaku`，占播放器顶部 20%，正常字号 14px。关键发现：纯净浏览器下网页全屏弹幕正常（14px），说明问题由本地某个脚本导致。排查本地 userscript 仓库（`C:\Users\pass\AppData\Local\Temp\opencode\my-userscripts`），发现只有"双击全屏"脚本涉及弹幕。最终通过 OpenCLI 连接用户真实 Edge 浏览器（profile "rr"）实地检查真实脚本环境下的弹幕 DOM，定位真凶。涉及文件：`人人视频增强包.user.js`、`rrmj-doubleclick-fullscreen.user.js`。诊断过程中确认弹幕开关为 `#barrage-input`，播放器为 xgplayer 结构。

Tags: userscript, danmaku, playwright, debugging

### [004] bug-fix | userscript,danmaku,debugging,playwright
## Request
继续诊断"人人视频增强包"用户脚本在网页全屏时弹幕字号异常的 bug 修复工作。

## Outcome
通过 OpenCLI 连接用户真实 Edge 浏览器（profile "rr"）继续实地诊断。确认非全屏和网页全屏下弹幕字号均为 14px 正常，排除了网页全屏触发字号异常的问题。检查了 localStorage 中的 `barrageConfig`（fontsize:100，配置正常）。随后下载了播放器弹幕引擎 chunk 文件（`5642-169b5afe2b84c7c8.js`，来自 cdn.rrmj.plus/c-next/mapp），用 rg 搜索 `fontsize`、`fontSize`、`lineHeight` 相关源码，定位弹幕字号计算逻辑，试图找出字号异常的根因。诊断仍在进行中，尚未最终定位并修复脚本。

Tags: userscript, danmaku, debugging, playwright

Tags: userscript, danmaku, debugging, playwright

### [005] bug-fix | userscript,video-player,bug-fix,playwright
## Request
用户反馈"人人视频增强包"用户脚本导致视频播放中暂停后中间转圈一直不恢复的问题。

## Outcome
通过 opencli 连接用户真实 Edge 浏览器（profile "rr"）实地复现并定位根因：
1. 增强包 pauseOnWake 功能的 2 秒防误播逻辑——切走标签/唤醒回来视频被强制暂停，且 2 秒内点播放会被再次按停（"点了没反应"）
2. 暂停久了 CDN 签名 URL 过期/连接断开 → 恢复播放时一直 buffering → loading 圈永远转

修复（增强包 v2.6，文件 `人人视频增强包.user.js`）：
- 删除 2 秒防误播逻辑，点播放立即恢复
- 新增"播放卡死自愈"模块：转圈 8 秒不恢复 → 自动重载视频源并跳回原进度；仍卡 → 自动刷新页面（有续播不丢进度），10 分钟内最多触发 2 次防死循环
- 菜单新增"播放卡死自愈"开关（默认开）

已通过 git push 到 GitHub，webhook 自动同步 Greasy Fork，Tampermonkey 更新到 2.6 生效。自愈逻辑行为验证通过：卡死 3 秒后自动软恢复，视频继续播放，计数正常。

Tags: userscript, video-player, bug-fix, playwright

### [006] bug-fix | rdp,local-account,powershell
用户尝试使用 Outlook 邮箱（mario.mo.prc@outlook.com）和多个应用密码登录 RDP 均失败，决定改用本地账号登录。AI 响应中正在重新执行创建本地账号的 PowerShell 脚本（写入 C:\Users\pass\AppData\Local\Temp\opencode\create-rdp-result.txt），并提示用户注意 UAC 确认框。这是 RDP 登录配置的排障过程，涉及本地账号创建与登录方式切换。

Tags: rdp, local-account, powershell

### [007] bug-fix | opencode-mem,sync,troubleshooting,networking
## Request
会话恢复，继续修复 opencode-mem 局域网同步问题。策略：软路由 IO 不稳，最少 ssh 次数——一次查完状态，能通就立刻跑同步+配 cron，然后软路由侧收工，剩余工作全在笔记本做。

## Outcome
确认软路由容器模型加载成功（warmed up），容器正常。尝试运行同步脚本验证双向同步，但同步连笔记本失败。随后检查笔记本 API 是否还在监听局域网（4747 端口），使用 curl 带 token 测试笔记本 API 连通性（token: 8a1218eba2a02c6e20f17ed9aa44d89a90b8ae4a9d150e5040169ec8acc04c37）。使用 scp 将 quick-check.sh 传到软路由、ssh 执行 docker exec 运行同步脚本。同步失败疑似笔记本侧 API 未监听或防火墙拦截，正在排查笔记本 API 局域网访问状态。

Tags: opencode-mem, sync, troubleshooting, networking

Tags: opencode-mem, sync, troubleshooting, networking

### [008] bug-fix | opencode-mem,sync,troubleshooting,resource-monitoring
## Request
排查 opencode-mem 局域网同步失败问题，怀疑是软路由资源不足（内存/模型加载）或温度过高导致。策略：一次 ssh 查完内存、模型位置、温度状态。

## Outcome
编写 res-check.sh 脚本（检查 /proc/meminfo、模型位置、温度），通过 scp 传到软路由并 ssh 执行，一次性收集软路由资源状态，用于判断同步失败是否由资源不足或过热引起。这是 opencode-mem 局域网同步排障的延续。

Tags: opencode-mem, sync, troubleshooting, resource-monitoring

### [009] bug-fix | opencode-mem,oom,soft-router,embedding
## Request
趁软路由暂时恢复稳定，立即修复 opencode-mem 局域网同步问题。

## Outcome
制定并执行软路由稳定性修复计划：核心问题是 523MB embedding 模型 + 2GB RAM + 1.9GB root 分区（86% 满）导致 OOM 内核冻结。修复步骤包括：(1) 删除软路由上 `/etc/opencode/opencode-mem-data/.cache/` 的 523MB embedding 模型文件（OOM 根源）；(2) 修改 `/etc/opencode/opencode-mem.jsonc` 配置远程 embedding API（如 SiliconFlow）替代本地模型，使 embedding 计算云端化、软路由零负载；(3) 验证同步脚本 `/etc/opencode/scripts/sync-memories.mjs` 连通性并配置 cron 每 15 分钟同步；(4) 笔记本本地执行 docs 迁移（migrate-docs.mjs 拆分 22 个 docs/*.md + LOG.md 按 ## 拆分 POST 到 opencode-mem，归档到 docs-archived-20260826/）；(5) scp 新 AGENTS.md 到软路由并归档其 docs/。

确立软路由操作铁律：操作前必须检查 /proc

### [010] bug-fix | soft-router,oom,docker,opencode-mem
继续执行软路由稳定性修复计划。软路由再次挂起（SSH 超时），采取止血措施：停止 opencode 容器释放内存（docker stop -t 2 opencode），并 ping 检查软路由连通性。核心问题仍是 523MB embedding 模型 + 2GB RAM 导致 OOM 内核冻结。修复计划包括删除本地 embedding 模型、改用远程 embedding API（SiliconFlow）、配置 cron 每 15 分钟同步。

Tags: soft-router, oom, docker, opencode-mem

### [011] bug-fix | soft-router,oom,docker,opencode-mem
## Request
软路由再次挂起（SSH 超时），用户拔电源恢复后要求立即修复软路由，优先处理稳定性问题。

## Outcome
执行软路由急救流程：1) 停止 opencode 容器（Exited 137，被强杀）；2) 删除 523MB embedding 模型缓存（磁盘占用 86%→59%）；3) 移除 opencode-mem 插件（防止再次加载模型）；4) 更新 opencode.json 配置（去掉插件）；5) 重启 opencode 容器并监控内存。核心问题仍是 523MB embedding 模型 + 2GB RAM 导致 OOM 内核冻结，已通过删除本地模型、改用远程 embedding API（SiliconFlow）方案解决。

Tags: soft-router, oom, docker, opencode-mem

Tags: soft-router, oom, docker, opencode-mem

### [012] bug-fix | network-diagnosis,proxy-config,userscript,openclash
## Request
用户报告 Greasy Fork 导入页无法加载 `raw.githubusercontent.com` 上的 `opencode-paste-image.user.js` 脚本，报错 "Failed to fetch (could not connect)"。

## Outcome
诊断网络连通性问题：`github.com`（git push）走 TUN 代理成功，但 `raw.githubusercontent.com` 直连秒失败（DNS 污染，未被 OpenClash 分流规则接管）。结论是 OpenClash 分流规则覆盖了 `github.com` 但漏了 `raw.githubusercontent.com`。给出两条解决方案：① 立即手动在 Violentmonkey 面板编辑脚本粘贴本地文件内容（`C:\Users\pass\AppData\Local\Temp\opencode\my-userscripts\opencode-paste-image.user.js`），绕过 GF 导入页；② 根治方案是在软路由 OpenClash 给 `*.githubusercontent.com` 加代理规则（与 `github.com` 同组），GF 服务器在海外不受本地网络影响。使用 curl 和 git config 命令验证了代理配置。

### [013] bug-fix | userscript,greasyfork,video-player,bug-fix
## Request
用户要求：① 将 `rrmj-doubleclick-fullscreen.user.js` 的脚本名从「人人视频双击全屏」改为「视频双击全屏」；② 排查 Greasy Fork 脚本「人人视频增强包」(587504) 视频暂停后继续播放时画面卡住不动几秒但弹幕正常的问题。

## Outcome
两个问题均已处理并 push 提交 `13b12cf`（webhook 自动同步 Greasy Fork）。

**1. 改名**：`rrmj-doubleclick-fullscreen.user.js` 的 `@name` 从「人人视频双击全屏」改为「视频双击全屏」（bump 到 v8.1），README 同步更新。注意：脚本名变更后浏览器已装旧版会被 Violentmonkey 视为新脚本，需手动删旧版再更新。

**2. 卡顿根因与修复**（增强包 v2.7）：
- 根因：暂停久了 CDN 断流、播放器缓冲被清空，点播放必须重新拉流缓冲——这是网站/移动端 H5 固有行为。弹幕引擎是独立 rAF 时钟不跟视频走，所以画面冻结时弹幕照常飘。
- 脚本放大问题：「播放卡死自愈」（stallHeal）在 `waiting` 事件后 8 秒没缓过来就执行 `video.load()` 整个重载视频源（重连+metadata+seek+再缓冲），把「卡几秒」放大成「卡

### [014] bug-fix | openclash,dns-debugging,network-troubleshooting
## Request
用户选择修复软路由 OpenClash 分流规则，解决 raw.githubusercontent.com 无法访问的问题（GF 上传步骤需手动登录，先处理可自动化的部分）。

## Outcome
通过 SSH 诊断软路由（192.168.3.100）OpenClash 配置和本机 DNS 链路，发现：
1. OpenClash 规则已存在（`DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择`），分流规则不是根因
2. 真凶是本机 DNS 将 `raw.githubusercontent.com` 解析为 `0.0.0.0`（AdGuard 类屏蔽 DNS 的标志性响应），流量根本没走到 Clash
3. 软路由侧 dnsmasq 正常返回 fake-ip `198.18.0.6`，无 github 屏蔽条目
4. 笔记本系统 DNS 是 192.168.3.1（主路由）而非软路由，Tailscale DNS 未接管
5. 笔记本发出的 DNS 查询在路径上被干扰（TCP 53 被 RST、UDP 超时），系统里的 0.0.0.0 可能是缓存的历史污染结果
6. 最后执行了清 DNS 缓存（Clear-DnsClientCache）并重新解析验证真实状态

涉及文件/命令：`/etc/openclash/custom/`

### [015] bug-fix | dns,network,windows,bug-fix
## Request
诊断并修复笔记本无法通过 Greasy Fork 拉取 raw.githubusercontent.com 脚本的问题（GF 导入 raw URL 加载失败）。

## Outcome
根因：主路由 192.168.3.1 的 DNS 安全过滤将 githubusercontent.com 判定为恶意软件托管域并返回 0.0.0.0（OpenClash 规则已配置但流量未到达）。修复：通过 UAC 提权 PowerShell 执行 `Set-DnsClientServerAddress -InterfaceAlias "WLAN" -ServerAddresses "192.168.3.100"` 将笔记本 WLAN DNS 从 3.1 切换到软路由 3.100。验证通过：raw.githubusercontent.com 解析为 fake-ip 198.18.0.6 进入 Clash 分流，HTTPS 拉取返回 200。回滚命令：`Set-DnsClientServerAddress -InterfaceAlias "WLAN" -ServerAddresses "192.168.3.1"`。权衡：软路由宕机时笔记本 DNS 会断，与全屋依赖软路由代理架构一致。

Tags: dns, network, windows, bug-fix

### [016] bug-fix | userscript,bug-fix,video-player,git-rebase
## Request
1. 将 userscript `rrmj-doubleclick-fullscreen.user.js` 改名为「视频双击全屏」
2. 排查「人人视频增强包」中视频暂停后继续播放画面卡住几秒但弹幕正常的问题

## Outcome
**改名**：`git mv rrmj-doubleclick-fullscreen.user.js 视频双击全屏.user.js`，同步更新 @name 元数据与 README 链接，版本升至 v8.1。

**卡顿根因**：增强包 v2.6 的「播放卡死自愈」功能（stallHeal）用固定 8 秒计时器，暂停恢复/seek 后正常缓冲触发 waiting 事件，到点就执行 `video.load()` 全量重载源，导致已缓冲数据全丢、解码器重置、重新拉流再 seek，画面冻结数秒。弹幕正常是因为弹幕是独立 JS 渲染层，不依赖视频解码管线。

**修复（v2.7）**：重写 stallHeal 逻辑，不再用固定超时，改为监控 `currentTime` 是否推进——时间在走就不是卡死；真死锁先 `play()` 重试（无损），无效才 `load()`。暂停恢复/seek 的正常缓冲不再被误杀。

**冲突处理**：远端有并行提交 `13b12cf`（已改 @name 并给 stallHeal 加 16 秒宽限但未改文件名），

### [017] bug-fix | opencli,browser-automation,opencode-web,debugging
## Request
用户报告 Ctrl+V 粘贴图片时出现 base64 字符串残留，说明 opencode web 的 drop 原生通道未生效，兜底通道在运行。需要调试 opencode web 页面找出 drop 失效原因。

## Outcome
通过 opencli 桥接 Edge 浏览器调试 opencode web 页面（localhost:4096）。发现 opencode 服务返回 401——开启了密码保护（`OPENCODE_SERVER_PASSWORD` 环境变量）。密码存储在用户环境变量中，正在确认认证格式并准备带凭据重新打开页面。涉及命令：`opencli browser tab list`、`opencli browser open`、`opencli browser state`、`netstat -ano`、`curl.exe` 验证 HTTP 状态码、`[System.Environment]::GetEnvironmentVariable` 读取用户环境变量。

Tags: opencli, browser-automation, opencode-web, debugging

Tags: opencli, browser-automation, opencode-web, debugging

### [018] bug-fix | opencode,model-provider,connection-issue,free-tier
## Request
用户询问为什么 opencode 上的 Ox Alpha Free (Unlimited) 模型总是出现连接问题，特别是晚上。

## Outcome
通过分析日志（`~/.local/share/opencode/log/opencode.log`）确认错误为 `Endpoint is unavailable`（上游端点不可用），发生在 OpenCode 服务端路由层，与用户本地网络无关。夜间分布高频（02时83次、03时15次、07时13次）。原因：Ox Alpha 是 OpenCode 8/20 推出的免费"隐身模型"（疑似智谱 GLM-5 系列），免费窗口约一周（8/27 截止），共享容量池在夜间全球高峰时容量不足导致端点不可用。同类免费模型 mimo-v2.5-free 也出现 Rate limit exceeded。建议：夜间避开 Ox Alpha，切换 opencode-go/deepseek-v4-flash 或 mimo-v2.5；免费窗口截止后该模型大概率转付费或下线。

Tags: opencode, model-provider, connection-issue, free-tier

### [019] bug-fix | userscript,tampermonkey,opencode,bug-fix
## Request
用户反馈 opencode Web 粘贴图片的 Tampermonkey 用户脚本（v2.0）在 Ctrl+V 粘贴图片时走了 base64 兜底通道（输入框出现 `![paste.png](data:...)` 文本），而非原生附件 drop 通道。需要调试 drop 原生通道为何未生效并修复。

## Outcome
通过 opencli browser eval 在 opencode V2 页面（`http://localhost:4096/server/.../session/ses_fc23789a...`）调试，确认关键事实：
1. opencode V2 输入框是 `contenteditable="true"` 的 DIV（非 textarea），且仅在进入会话页后渲染（欢迎页 /new-session 无输入框）
2. dispatch drop 到 `[contenteditable=true]` 元素 → 100ms 内文件名出现在 DOM（有效）
3. dispatch drop 到 `document.body` → 无效（不触发附件）
4. 脚本 v2.0 的 MutationObserver 只检测 `addedNodes.textContent` → 检测不到文件名（文件名可能在新增节点的属性里，如 img alt/title

### [020] bug-fix | tampermonkey,opencode,userscript,bug-fix,git
## Request
继续调试 opencode Web 粘贴图片的 Tampermonkey 用户脚本（v2.0）问题，并推送 v2.1 修复版本。

## Outcome
完成 rebase（使用非交互编辑器 `git -c core.editor=true rebase --continue` 解决 Vim 卡住问题）并推送 v2.1（commit `d148200`）到 main 分支，webhook 自动同步 Greasy Fork，Violentmonkey 会自动更新。v2.1 修复内容：
1. **等待输入框渲染**：opencode V2 输入框是 `contenteditable` div，可能延迟渲染。旧脚本在输入框未出现时把 drop 发到 `body`（实测无效），现在最多等 2 秒，输入框出现后再伪造 drop
2. **附件检测升级**：旧脚本只查新增节点的 `textContent`（实测检测不到），现在同时监听 `attributes` 变化 + 检查新增节点的属性，超时延长到 1500ms

用户需等 Violentmonkey 更新后刷新 opencode web 页面实测 Ctrl+V，观察 toast 是绿色「✓ 已附加为原生附件」还是橙色「⚠ 回退 base64」。

Tags: tampermonkey, opencode, users

### [021] bug-fix | tampermonkey,opencode,mutation-observer,bug-fix
## Request
继续调试 opencode Web 粘贴图片 Tampermonkey 用户脚本，v2.1 仍出现"字符"问题（图片被当作文本字符处理）。

## Outcome
分析 v2.1 检测仍失败的两个可能原因并开始编写 v2.2：
1. **缺 characterData 监听**：文件名可能出现在已有节点的 textContent（text 节点变化），而 MutationObserver 只监听了 childList+attributes，缺少 characterData
2. **findInput 应优先 contenteditable**：V2 输入框是 contenteditable div，应优先匹配而非普通输入框

调试过程中发现 opencli 浏览器会话频繁断开（tab list 空），调试工具不可靠。已确认之前测试用了假图片文件（内容 'x'），opencode 可能对非真实图片处理不同，需用真实 PNG（canvas 生成）重新测试 drop 通道。开始编写 v2.2 脚本（写入 Tampermonkey 用户脚本文件）。

Tags: tampermonkey, opencode, mutation-observer, bug-fix

### [022] bug-fix | tampermonkey,userscript,mutation-observer,shadow-dom
## Request
继续调试 opencode Web 粘贴图片 Tampermonkey 用户脚本。v2.2 仍走 base64 兜底（toast 显示「⚠ 原生附件通道无效 → ✓ base64 已插入 1024x890」），用户确认附件 chip 已出现但脚本仍回退 base64。

## Outcome
定位根因：附件 chip 渲染在输入框组件容器里（可能在 Shadow DOM 或输入框外部区域），脚本的 MutationObserver 只观察 `document.body` 且只查文件名，看不到 chip 的添加。推送 v2.3（commit `0c70226`），核心改动：
1. **检测逻辑彻底换掉**：不再依赖文件名出现在哪，改为检测「输入框组件容器新增元素」——附件 chip 添加必然在输入框组件区域新增元素
2. **覆盖 Shadow DOM**：同时观察组件容器内所有 shadow root（chip 可能渲染在 shadow 里）
3. **排除输入框自身**：输入框内部内容变化（打字）不算成功，只有输入框外部新增元素才算附件 chip
4. 超时延长到 3 秒

用户需等 Violentmonkey 更新后刷新 opencode web 实测，观察 toast 颜色（绿色=成功原生附件，橙色=回退 base64）。

Tags: tampermo

### [023] bug-fix | tampermonkey,opencode,bug-fix,model-config
opencode Web 粘贴图片 Tampermonkey 用户脚本 v2.3 调试成功。用户确认附件 chip 正常添加，不再回退 base64。后续报错 `Cannot read ... this model does not support image input` 被定位为模型问题而非脚本问题——当前会话使用的模型 `mimo-v2.5` 不支持图片输入。解决方案：在 opencode 中切换模型到 `opencode-go/deepseek-v4-flash-vision-exp`（支持识图）即可正常看图。脚本任务完成，无需再修改。

Tags: tampermonkey, opencode, bug-fix, model-config

### [024] bug-fix | opencode,configuration,bug-fix,command-design,sync-id:mem_1787782291854_q4cginlb3
用户询问为什么AI在重复读取文件，并希望避免这种情况。分析了重复读取文件的原因（探索阶段反复确认同一批文件、工具调用参数格式出错后盲目重试），并提出了避免方法（一次读取后记住关键信息、检查参数格式、改用`grep`和`read(offset)`）。确认了OpenCode支持通过`provider.<id>.blacklist`/`whitelist`隐藏模型，并继续讨论`/模型`命令的实现。

Tags: opencode, configuration, bug-fix, command-design

### [025] bug-fix | sqlite-recovery,opencode,windows-scheduled-task,bug-fix,sync-id:mem_1787759034973_kg2fd099a
## 2026-08-26 笔记本 opencode 事故修复（续）

在已有记忆基础上完成三层叠加问题的完整修复：

### 1. 数据库恢复（已完成）
- 用官方 sqlite3.exe（sqlite.org 2026 目录下载，Android SDK 版无 .recover）跑 `.recover` 恢复损坏的 opencode.db
- 恢复结果：quick_check=ok，part 15686 / message 3899 / event 56399 / session 49（比损坏库多恢复崩溃瞬间数据）
- 损坏库备份为 `opencode.db.corrupt-20260826`，新库（392MB）替换主库，删除 wal/shm

### 2. 配置修复（新发现）
- serve 启动报 `Config file at C:\Users\pass\.config\opencode\opencode.jsonc is not valid JSON(C)`
- 根因：崩溃会话编辑时把换行写成了 `\n` 字面量（第 131 行 `},\n  "instructions"`），导致 JSONC 解析失败
- 修复：edit 工具把 `\n` 字面量替换为真实换行，node 验证 JSONC_VALID

### 3. 僵尸端口 4096（新发现与解决）
- 幽灵 PID

### [026] bug-fix | opencode,troubleshooting,sqlite,windows-ghost-socket,sync-id:mem_1787756115187_yxfwrhwyk
## Request
用户报告软路由和笔记本上的 OpenCode Web 界面同时出现间歇性卡死、状态变红、几分钟后自动恢复的问题，持续多天。用户提醒不要完全相信之前的诊断（之前结论是"上游 API 故障、无需修复"）。

## Outcome
彻底重新排查后确认两边根因完全不同但现象相同：

**笔记本（192.168.3.53）**：opencode serve（PID 17248）进程已死但残留 socket 占用 4096/4747 端口（52 个 CLOSE_WAIT 堆积，Windows 幽灵 socket，句柄被继承未释放）。HTTP 访问超时无响应，日志 21:52 停止写入。卡死诱因是 13:34/13:51 大量 `SQLiteError: disk I/O error`（读 message 表失败）——之前清理数据库（1.63GB→389MB）后 serve 持旧句柄，磁盘 I/O 错误阻塞事件循环导致不响应，磁盘恢复后自动恢复。`taskkill /F /PID 17248` 报"找不到进程"确认进程已死。计划任务 serve-hidden.vbs 检测到 4096 被占用后走备用端口 4097 但也没响应。

**软路由（192.168.3.100）**：serve 活着（4096 返回 401），但容器内存限制 900MB（宿主机仅 2GB），open

### [027] bug-fix | opencode,web-ui,mcp,troubleshooting,sync-id:mem_1787756105562_ze0iphwwv
## Request
用户报告软路由和笔记本电脑上的 OpenCode Web 界面（以及 Windows 桌面版）都会出现突然卡住、无法切换标签、无法发送消息、状态变红，几分钟后自动恢复的问题。该问题持续数天，多次修复未果。

## Outcome
开始排查问题，检查了两边 OpenCode 的配置（/etc/opencode/opencode.json、/root/.config/opencode/）、日志目录（~/.local/share/opencode/log/）以及主机信息。问题表现为 Web 界面和桌面版同时卡死、状态变红后自动恢复，疑似与 MCP 服务状态或网络/资源问题相关，但尚未定位根因。当前处于排查阶段，尚未完成修复。

Tags: opencode, web-ui, mcp, troubleshooting

Tags: opencode, web-ui, mcp, troubleshooting

### [028] bug-fix | sqlite,database-recovery,opencode,bug-fix,sync-id:mem_1787753557697_y6e0vuhyx
## Request
继续处理 Windows 笔记本 OpenCode Web Serve 数据库损坏问题，需要恢复损坏的 SQLite 数据库。

## Outcome
确认根因：今天 21:02 清理数据库后未重启进程，导致 SQLite 报 disk I/O error，part 表（消息内容载体）和 event 表损坏，TUI 历史记录消失。正在使用 .recover 命令恢复数据，但笔记本自带 sqlite3.exe（Android SDK 裁剪版）不支持 .recover。尝试从 sqlite.org 下载官方完整版 sqlite3.exe 时版本号猜错返回 404，已从下载页确认正确文件名 sqlite-tools-win-x64-3530400.zip，下一步重新下载后 scp 到笔记本执行 .recover 恢复数据。

Tags: sqlite, database-recovery, opencode, bug-fix

### [029] bug-fix | sqlite,database-recovery,windows,troubleshooting,sync-id:mem_1787753534925_9j12bu3dn
## Request
继续处理 Windows 笔记本 OpenCode Web Serve 数据库损坏问题。用户报告 TUI 中多个对话历史记录消失，任务只执行到一半，需要恢复损坏的 SQLite 数据库。

## Outcome
通过 SSH 到 pass@192.168.3.53 深入排查 opencode.db 损坏问题。使用 Android SDK 自带 sqlite3.exe 运行 PRAGMA quick_check 发现 79 处错误，损坏集中在文件末尾 page 95000-95137 区域，涉及 Tree 15/27/49/28。通过 sqlite_master 定位：Tree 27 = part 表（消息内容载体）、Tree 15 = event 表、Tree 49 = part_session_idx 索引、Tree 28 = part 表 autoindex。message 表（3884 条）和 session 表（48 条）完好，part/event 表损坏导致 TUI 历史记录显示不出来。

尝试使用 .recover 命令恢复，但发现 Android SDK 的 sqlite3.exe 是 Google 裁剪版（3.50.6 版本但 .help 中无 recover/dump 命令），不支持 .recover。改用下载官方 sqlite-tools-

### [030] bug-fix | windows,schtasks,sqlite,troubleshooting,sync-id:mem_1787752716467_bpc18trl1
## Request
继续处理 Windows 笔记本上的 OpenCode Web Serve 服务故障排查。TUI 进程已全部退出，但端口 4096 仍被幽灵 PID 17248 占用，计划任务（schtasks）End 成功但 Run 被拒，需要按计划顺序先修复数据库再启动 serve。

## Outcome
通过 SSH 到 pass@192.168.3.53 执行了系列排查：taskkill 幽灵 PID 17248、netstat 复查端口 4096 监听状态、schtasks /End 与 /Run 操作计划任务 "OpenCode Web Serve"（Run 被拒后 sleep 5 重试）、schtasks /Query 检查任务状态。发现 GBK 编码导致 grep 中文失败，改用原始输出查看。确认任务配置正常，按计划应先修数据库再起 serve。探测到笔记本上 Android SDK 自带 sqlite3.exe 可用，并运行了数据库完整性检查。

Tags: windows, schtasks, sqlite, ssh, troubleshooting

Tags: windows, schtasks, sqlite, troubleshooting

### [031] bug-fix | sqlite,opencode,bug-fix,database,sync-id:mem_1787752483618_hrjzaostj
## Request
用户要求继续之前的任务：优先修复笔记本 opencode 数据库写入崩溃问题，而非设置模型 fallback。崩溃表现为对话报错：`Failed query: insert into "part" ... on conflict ("part"."id") do update set "time_updated" = ?, "data" = ?`，涉及 tool 类型 part 记录（bash 工具，callID `01a03e46f3dc33f1a0e78a80bd33ba16`）。

## Outcome
基于此前诊断（根因：清理 opencode.db 1.63GB→389MB 后，3 个 TUI 进程继续持旧句柄运行，SQLite 报 `disk I/O error`），生成修复文档，指导恢复 "OpenRouter" 会话。修复方向为处理 SQLite 磁盘 I/O 错误导致的 part 表写入失败，而非配置模型 fallback。涉及表：`part`（id/message_id/session_id/time_created/time_updated/data），写入操作使用 `on conflict do update` upsert 语义。会话继续推进该修复方案。

Tags: sqlite, opencode, bug-fix, databa

### [032] bug-fix | sqlite,opencode,bug-fix,database,sync-id:mem_1787752284028_it1etr3fi
## Request
用户要求先不设置 fallback，优先修复笔记本 opencode 数据库写入崩溃问题。崩溃表现为对话报错：`Failed query: insert into "part" ... on conflict ("part"."id") do update set "time_updated" = ?, "data" = ?`，涉及 tool 类型 part 记录（bash 工具，callID `01a03e46f3dc33f1a0e78a80bd33ba16`）。

## Outcome
基于此前诊断（根因：清理 opencode.db 1.63GB→389MB 后，3 个 TUI 进程继续持旧句柄运行，SQLite 报 `disk I/O error`），生成修复文档，指导恢复 "OpenRouter" 会话。修复方向为处理 SQLite 磁盘 I/O 错误导致的 part 表写入失败，而非配置模型 fallback。涉及表：`part`（id/message_id/session_id/time_created/time_updated/data），写入操作为 upsert（on conflict do update）。

Tags: sqlite, opencode, bug-fix, database

### [033] bug-fix | sqlite,bug-fix,openrouter,opencode,sync-id:mem_1787752174497_bd50x4l21
## Request
用户要求按 openrouter.ai/discover 的免费路由正确配置 fallback，同时修复笔记本 opencode 数据库写入崩溃问题。

## Outcome
诊断确认根因链：清理 opencode.db（1.63GB→389MB）后，3 个 TUI 进程继续持旧句柄运行，SQLite 报 `disk I/O error`（非锁、非磁盘满），导致会话读写全挂 + share 同步失败 → 分享页空白。

对照 openrouter.ai/discover 免费榜：Nemotron 3 Ultra/Lightning/Super、Laguna S 2.1 都有 `:free` ID 可用；榜首 Ox Alpha 只有付费 ID（无 `:free` 后缀），不适合做免费兜底。

Quickstart 确认接入方式无变化（key + Bearer 即可），discover 页面确认官方免费路由器 ID 就是 `openrouter/free`（opencode 中为 `openrouter/openrouter/free`，对话里加的 ID 正确）。

决策点：① 是否杀掉全部 opencode.exe → 修复数据库 → 重启 web serve；② 免费路由选择。已明确两个决策，正在写最终计划。

Tags: sqlite, bug-fix, o

### [034] bug-fix | opencode,sqlite,openrouter,bug-fix,sync-id:mem_1787751985705_rrmcexops
## Request
用户咨询 OpenRouter 充值额度与免费路由使用方式。opencode 分析后确认 $10 充值已解锁 1000 次/天免费模型（永久生效，余额归零也保留），免费模型不扣余额。将免费路由 openrouter/openrouter/free 加入 opencode.jsonc 的 fallback_models 层（主力 → zen 免费 → OpenRouter 免费路由）。随后尝试同步配置到软路由时，笔记本上的 plan 会话在执行 `ssh router "grep ... auth.json"` 时崩溃。

## Outcome
发现崩溃根因：opencode 往 SQLite 写 part 记录失败（`insert into "part" ... on conflict do update` upsert 报错），导致会话崩掉、分享页面 message/part 全空。诊断过程中确认：笔记本 ~/.ssh 下有 id_router/id_router.pub 密钥及 ssh config（软路由用 root + id_router 别名 router 访问），软路由配置位于 /etc/opencode/opencode.json（model: opencode/mimo-v2.5, small_model: opencode/mimo-v2.5

### [035] bug-fix | opencode,debugging,api,spa,sync-id:mem_1787751586016_5n63lpqfg
## Request
用户要求修复一个 OpenCode 分享页面的问题，提供了分享链接 https://opncd.ai/share/nZbvUFbq（标题为 "OpenRouter" 的 plan 会话）。

## Outcome
- 直接抓取分享页面失败（SPA 应用），改用 Exa 抓取也失败。
- 用 curl 抓取 HTML 源码发现内嵌了 SSR 数据，但该会话的 `message: {}` 和 `part: {}` 均为空——分享页面无消息内容。
- 尝试通过 API 端点获取消息（如 `/api/session/ses_fc1e9c0cdffe0n1uhznZbvUFbq/message`、`/session/ses_fc1e9c0cdf...`）未成功。
- 下载前端 JS 资源（`/_build/assets/_shareID_-DWAMvja_.js`）分析 share 数据的 API 端点，正在查找正确的数据接口。

Tags: opencode, debugging, api, spa

### [036] bug-fix | opencode-web,ssh,powershell,zombie-port,sync-id:mem_1787751318590_91mv5il75
## Request
在笔记本 PowerShell 中完成两件事：① 启动 4096 后端（计划任务 "OpenCode Web Serve"）；② 登记容器 SSH 公钥以便从软路由直接管理笔记本。

## Outcome
- 4096 后端：任务本就在运行，端口已监听（Test-NetConnection 返回 True）。
- SSH 公钥：用户级 `~/.ssh/authorized_keys` 写入成功；`C:\ProgramData\ssh\administrators_authorized_keys` 因非管理员 shell 被拒，改用 `Start-Process powershell -Verb RunAs` 提权写入成功，ACL 收紧为 SYSTEM+Administrators（注意：`-RedirectStandardOutput` 与 `-Verb RunAs` 不兼容，需用提权子进程写临时文件再读取验证）。
- 后续诊断发现 4096 端口为"僵尸端口"：本机 HTTP 返回 000，PID 17248 查不到进程（socket 监听但进程已死），计划任务状态卡在 Running 导致 `schtasks /run` 拒绝启动新实例。发现 3 个存活的 opencode.exe 残留进程（43324/47260/48668）为裸命令行 TUI 会话（2

### [037] bug-fix | opencode-web,image-paste,tampermonkey,bug-fix,sync-id:mem_1787750704165_rddrr7tgv
用户问模型能否识图，确认模型有视觉能力但前提是图片走原生图像通道。本次图片被当作 base64 文本（`![paste.png](data:image/png;base64,...)`）塞进消息，说明 opencode web 端粘贴时 drop 原生附件通道未生效，走了 base64 兜底通道。这与之前调试过的 Tampermonkey 脚本 v2.0 解决的问题相关（该脚本用于修复 web 端图片粘贴问题），但兜底通道又被触发了。结论：要么直接复制截图文字，要么需重新修复 web 端图片粘贴的原生附件通道问题。

Tags: opencode-web, image-paste, tampermonkey, bug-fix

### [038] bug-fix | git,userscript,playback-optimization,bug-fix
- **StallHeal Logic**: Rewritten in commit `72ae719` to use "currentTime progression" for stall detection, avoiding false positives during normal buffering. GF is synchronized to v2.7.
- **Double-Click Fullscreen Renaming**: Addressed in the same commit.
- **OpenCode-Paste-Image**: Updated to v2.4 (commit `3f7f741`), dropping base64 support and adding manual drag-drop prompts for failed drops.

Tags: git, userscript, playback-optimization, bug-fix

### [039] bug-fix | powershell,encoding,windows-shell,bug-fix,sync-id:mem_1787784589192_a7w7kjllm
用户反馈开始菜单中的快捷方式名称 "OpenCode4096" 后面出现乱码，要求修复。修复了快捷方式名称乱码问题。问题原因是 PowerShell 5.1 将 UTF-8 无 BOM 脚本按 GBK 读取，导致中文"后端"被错误解码为乱码字符。通过使用 Unicode 码点（`[char]0x540E` + `[char]0x7AEF`）构造文件名，避免编码问题，并重新创建快捷方式。验证后文件名正确显示为 "OpenCode 4096 后端.lnk"。

Tags: powershell, encoding, windows-shell, bug-fix

### [040] bug-fix | bug-fix,configuration,web-ui,api
用户反馈重启后未看到变化，请求诊断问题。诊断发现Web界面模型选择器使用了未过滤的`provider.list`（全量6807个模型），而TUI使用了已过滤的`config.providers`（42个模型）。修复方案是在`opencode.jsonc`的`experimental`段添加policies，deny所有provider并allow配置的5个provider。确认了`GET /provider`端点的行为以及policies的过滤逻辑。

Tags: bug-fix, configuration, web-ui, api

### [041] bug-fix | process-management,tcp-ports,powershell,debugging
用户反馈重启后端后端口4096仍被残留占用，导致服务无法正常运行，需要手动清理。通过一系列PowerShell和命令行工具（如`netstat`、`taskkill`、`Get-NetTCPConnection`等）诊断并尝试清理残留的TCP连接和端口占用。发现端口4096被大量`CLOSE_WAIT`连接占用，但由于缺乏管理员权限，无法直接清理，最终等待TCP表自动清理。

Tags: process-management, tcp-ports, powershell, debugging

### [042] bug-fix | port-management,debugging,model-configuration,system-restart
The conversation involved troubleshooting a zombie socket issue on port 4096 caused by a dead process (`56248`) with `CLOSE_WAIT` state. The solution required a system restart to release the port, as manual cleanup was not possible. Additionally, the OpenRouter whitelist was updated to include 52 models (17 free, 22 cost-effective, 12 `~latest`, and auto), and policies were configured to restrict provider access. Tools like PowerShell (`Get-NetTCPConnection`) and `rg` were used for debugging and configuration validation.

Tags: port-management, debugging, model-configuration, system-restart

### [043] bug-fix | bug-fix,networking,configuration,process-management,sync-id:mem_1787794217159_m0vsjas2v
Diagnosed the root cause as DNS Fake-IP hijacking of Tailscale domains by OpenClash on the router. The fix involves adding Tailscale domains to the Fake-IP filter list in OpenClash's configuration (`/etc/openclash/config/二合一.yaml`). Additionally, resolved the OpenCodeTray error by terminating duplicate processes (`taskkill /PID 8436 /F && taskkill /PID 5348 /F`). Verified connectivity and DNS resolution post-fix.

Tags: bug-fix, networking, configuration, process-management

### [044] bug-fix | tailscale,dns,routing,windows,sync-id:mem_1787796618664_8s774l1eh
Diagnosed and resolved issues related to Tailscale connectivity, DNS resolution, and network routing on a Windows laptop and a soft router (iStoreOS). Fixed DNS format in Mihomo, adjusted Tailscale routing preferences, and verified dnsmasq and Clash configurations. Cleaned up residual Syncthing processes and directories.

Tags: tailscale, dns, routing, windows

### [045] bug-fix | bug-fix,process-management,windows,cleanup,sync-id:mem_1787796341091_gak9u1ihf
用户询问笔记本电脑托盘中仍然显示“sync think dray”的问题，尽管已经卸载了Syncthing，但在卸载程序中找不到其卸载位置。诊断发现残留的Syncthing进程和托盘图标，位于`C:\Users\pass\syncthing\`和`C:\Users\pass\syncthingtray\`。通过检查启动项和计划任务，发现隐藏的自启机制`SyncthingTrayLauncher`计划任务。清理方案包括删除相关目录和计划任务。

Tags: bug-fix, process-management, windows, cleanup

### [046] bug-fix | c++,windows-tray,process-management,build-fix
## Request
Continue fixing the opencode-tray Windows tray application. The user had previously reported a Syncthing tray icon issue (resolved), and now work continues on the opencode-tray project itself.

## Outcome
Modified `C:\Users\pass\.config\opencode\tools\opencode-tray\opencode-tray.cpp`:
1. Refactored `StartServe()` to self-heal when a zombie port is detected instead of giving up (fixed a missing closing brace in the `if (g_serveProcess)` block).
2. Added a health-check timer and startup timer.
3. Verified compilation with `build-tray.bat` (calls vcvars64, VS2022 BuildTools available).

### [047] bug-fix | opencode-mem,thinking-mode,bug-fix,configuration
## Request
用户要求测试主模型是否可用,提到上次说要关闭思考模式,官方有 bug。

## Outcome
确认了 Issue #253 "Thinking mode does not support this tool_choice" 正是该 bug。根本原因是 `opencode-go/deepseek-v4-flash` 的 thinking 模式不支持 forced `tool_choice`,属于 OpenCode/provider 兼容性问题,非 opencode-mem 自身 bug。制定了测试计划:修改 `opencode-mem.jsonc` 将 `memoryProvider/memoryModel/memoryApiUrl/memoryApiKey` 替换为 `opencodeProvider: "opencode-go"` + `opencodeModel: "inherit"`,重启后观察 `~/.opencode-mem/opencode-mem.log` 是否有 402 或 thinking mode 错误。失败备选方案:改用 `mimo-v2.5-free` 模型,或关闭 auto-capture(`autoCaptureEnabled: false`)。

Tags: opencode-mem, thinking-mode, bug-fi

### [048] bug-fix | mcp,opencode,bug-fix,api-key
## Request
继续排查软路由（192.168.3.100）上 opencode MCP 服务器无法正常工作的问题，特别是 tavily 和 firecrawl 报 "No API key provided" 错误。

## Outcome
通过本地编写测试脚本（test-mcp.js）并用 scp 传输到软路由执行，诊断出问题根因：context7 和 playwright MCP 服务器运行正常，但 tavily 和 firecrawl 无法获取 API key。原因是 opencode 0.0.55 版本中 `{env:TAVILY_API_KEY}` 环境变量插值机制可能不生效，导致 MCP 子进程拿不到密钥。解决方案是编辑 `/etc/opencode` 配置文件（opencode-router-orig.json），将 env 部分中的插值变量替换为 .env 文件中的实际 API key 值。

Tags: mcp, opencode, bug-fix, api-key

### [049] bug-fix | opencode,mcp,environment-variables,bug-fix
## Request
继续排查软路由（192.168.3.100）上 opencode MCP 服务器无法工作的问题，tavily/firecrawl 报 "No API key provided" 错误。

## Outcome
定位到根本原因：opencode v0.0.55 启动 MCP 子进程时没有正确传递 `env` 配置中的环境变量。解决方案是创建 3 个包装脚本（`/usr/local/bin/mcp-{tavily,firecrawl,context7}.sh`），在脚本内直接 `export` API key 环境变量（TAVILY_API_KEY、FIRECRAWL_API_KEY、CONTEXT7_API_KEY），然后更新 `/etc/opencode/opencode.json` 将 MCP 服务器的 command 指向包装脚本，并将超时时间从 15-30 秒增加到 60 秒。重启 opencode serve 后，MCP 服务器采用懒加载机制（仅在会话首次使用时初始化）。通过 JSON-RPC initialize 测试确认包装脚本能正确传递环境变量。serve API 需要 Bearer token 或 x-opencode-password 认证（密码 n5jU*KqG5#B9YHT#）。

Tags: opencode, mcp, environ

### [050] bug-fix | opencode-tray,windows-startup,task-scheduler,bug-fix
## Request
排查电脑开机时弹出“OpenCodeTray is already running”互斥锁报错的问题。

## Outcome
通过 PowerShell 检查进程和自启项，定位到注册表自启（`HKCU\...\Run\OpenCodeTray`）与计划任务（`OpenCode Web Serve`）同时自启导致托盘重复运行，建议停用计划任务仅保留注册表自启。

Tags: opencode-tray, windows-startup, task-scheduler, bug-fix

### [051] bug-fix | opencode-tray,windows-startup,task-scheduler,bug-fix,icon-loading
分析了OpenCodeTray启动冲突和图标显示问题。根本原因：注册表自启（HKCU...Run...OpenCodeTray）与计划任务（OpenCode Web Serve）同时触发导致托盘重复运行。图标问题源于DrawStatusDot中强制把16x16图标拉伸到256x256再显示，导致dot在大图上几乎不可见。修复方案：在DrawStatusDot中强制在16x16内存DC上绘制base icon，确保工作在16x16坐标系。相关文件：opencode-tray.cpp

Tags: opencode-tray, windows-startup, task-scheduler, bug-fix, icon-loading

### [052] bug-fix | icon-rendering,opencode-tray,bug-fix,windows-startup
Fixed OpenCodeTray icon rendering issue by forcing 16x16 canvas size instead of 256x256, correcting composited icon creation, and ensuring proper background fill with PatBlt. The tray is now running correctly with green indicator dots.

Tags: icon-rendering, opencode-tray, bug-fix, windows-startup

### [053] bug-fix | opencode,windows,junction,file-selector
## Request
用户反馈 opencode Web 版添加项目时搜索框只显示部分字段，无法看到并点入 `C:\Users\pass\.config\opencode` 文件夹（点开后显示为空文件）。

## Outcome
定位根因：Windows 将 `.config` 设为隐藏目录，Web 文件选择器默认过滤隐藏/点开头目录导致显示为空。修复措施：通过 PowerShell 创建可见 Junction 入口 `C:\Users\pass\opencode-config` → `C:\Users\pass\.config\opencode`（已验证 LinkType: Junction）；同时确认 `GET /project` 已注册 `C:\Users\pass\.config\opencode` 项目（托盘 serve 的工作目录自动注册）。后续改用 `https://laptop-0fat5c1b.tail06935.ts.net`（tailscale serve → 127.0.0.1:4096）登录替代内网 `http://192.168.3.53:4096`，因 HTTPS 下 Auth 缓存稳定、SSE 断连可重连复用 sessionID，解决了"在对话中"卡住的异常。

Tags: opencode, windows, junction, file-sele

### [054] bug-fix | rdp,windows,troubleshooting,registry,tailscale
## Request
排查 Windows 11 使用 Microsoft 账户（MicrosoftAccount\mario.mo.prc@outlook.com）进行 RDP（Tailscale 隧道）连接仍报"密码无效"（错误码 1326）的问题，即使用户已关闭"无密码"选项并重新缓存了新密码。

## Outcome
进行只读诊断，确认已排除密码前缀错误（MicrosoftAccount\ 前缀正确）、加密密码已缓存、隧道连通（laptop-…ts.net → 127.0.0.1:3389）等已知因素。定位根因为 Remote Desktop Users 组为空（net localgroup 已验证）及疑似 fDenyTSConnections 注册表键/SeRemoteInteractiveLogonRight 策略未开通，导致即使密码正确也被判无效。提出验证命令（reg query HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server /v fDenyTSConnections、net localgroup "Remote Desktop Users"）及对应修复方案（net localgroup "Remote Desktop Users" "MicrosoftAccount\mario.mo.prc@outloo

### [055] bug-fix | windows-rdp,tailscale,microsoft-account,bug-fix
## Request
Fix Windows 11 RDP "invalid password" error (code 1326) when connecting via Tailscale tunnel with a Microsoft account (MicrosoftAccount\mario.mo.prc@outlook.com), after the user disabled the passwordless option and re-cached the new password.

## Outcome
Diagnosed via read-only checks (verified correct MicrosoftAccount\ prefix, cached encrypted credentials, and tunnel reachability laptop-0fat5c1b.tail06935.ts.net -> 127.0.0.1:3389), pinpointing the root cause as an empty "Remote Desktop Users" group plus a likely fDenyTSConnections restriction. Fixed by setting HKLM\SYSTEM\CurrentCo

### [056] bug-fix | userscript,tampermonkey,encoding,bug-fix
## Request
用户反馈油猴脚本安装链接显示"安装"而非"升级"，要求修复 Tampermonkey 无法识别为已装脚本升级的问题。

## Outcome
诊断出根因：`人人视频增强包.user.js` 的 `@name:2`/`@description:5` 因 GBK→UTF-8 误存含 `�`（U+FFFD），导致 `@name` 与本地已装脚本字符串不等，Tampermonkey 按 `@name+@namespace` 判同一性失败而显示"安装"。修复计划：全文件 utf8NoBOM 重存恢复正确中文、对齐 `@name`/`@namespace http://tampermonkey.net/`、`@version` bump 到 2.9.3 强制触发升级，用 `node --check` + `file --mime` 验证无 `�` 后 push，再点 raw 链接应显示"升级"。

Tags: userscript, tampermonkey, encoding, bug-fix

### [057] bug-fix | userscript,tampermonkey,bug-fix,github
## Request
Continue fixing the `人人视频增强包` userscript header mojibake so Tampermonkey detects it as an upgrade instead of a new install.

## Outcome
Fixed mojibake in `人人视频增强包.user.js` header (`@name`/`@description` contained U+FFFD replacement chars `�`, breaking Tampermonkey's `@name+@namespace` identity check so it appeared as a new install), rewrote the full Chinese strings, bumped `@version` 2.9.2 → 2.9.3 to force upgrade detection, verified with `node --check` (EXIT 0), and pushed commit `1644251` to the `Mariomoprc/my-userscripts` repo. Upgrade now triggers on the same raw GitHub URL.

Ta

### [058] bug-fix | userscript,tampermonkey,bug-fix,audio-silencing
修复 opencode web（localhost:4096）油猴脚本 capture 提示音未静音问题并发布 v1.8.7。此前 v1.8.6 的 6 秒静音窗口 hook 未生效（`Audio.play`/body.textContent 检测方案失败），本次改为：`POST /session` 带 `opencode-mem capture / internal` 时标记 `window.__oc_lastCaptureAt`，此后 12 秒内 hook 拦截 `Audio.play`、`AudioContext.resume/createOscillator` 及 `Notification`，全部静默；正常对话超出窗口不受影响，仍隐藏 capture 卡片列表项。修改文件 `C:\Users\pass\.config\opencode\opencode-all-in-one.user.js`（版本号/描述更新、新增静音窗口逻辑），已复制同步至 `my-userscripts` 仓库并推送，验证方式：Tampermonkey 重装+硬刷新 → Console 应出现 `MEM silence: capture fetch detected` 与 `Audio.play suppressed`。

Tags: userscript, tampermonkey, bug-fix

### [059] bug-fix | notification,opencode-mem,timing,suppression
Conversation identified that opencode-mem capture notifications weren't being suppressed due to a 3-second timing filter being too strict - capture records were deleted immediately after recording, causing Web notifications to appear after the filter window elapsed. The fix suppresses all 'opencode-mem capture' notifications regardless of timing while keeping normal 'Reply ready' notifications unaffected.

Tags: notification, opencode-mem, timing, suppression

### [060] bug-fix | windows-proxy,network-troubleshooting,opencode,server-authentication
修复 OpenCode 502 连接错误和代理配置问题，包括系统代理设置、localhost 直连配置及服务器身份验证。

Tags: windows-proxy, network-troubleshooting, opencode, server-authentication

### [061] bug-fix | windows,proxy-configuration,edge-browser,registry,localhost
Fixed Windows proxy configuration causing 502 errors on localhost:4096. Modified HKCU ProxyBypass registry key, terminated all msedge.exe processes, and restarted Edge browser. After fix, accessing localhost:4096 prompts for opencode credentials (username: opencode, password: n5jU*KqG5#B9YHT#) instead of returning 502 error. edge://apps OpenCode application also works correctly.

Tags: windows, proxy-configuration, edge-browser, registry, localhost

### [062] discussion | 内网穿透,远程桌面,tailscale,zerotier
## Request
用户询问使用内网穿透软件替代复杂远程方式的方案，用于从华为手机远程连接Windows笔记本电脑。

## Outcome
推荐了两种内网穿透+Windows RDP方案：
1. **Tailscale + Windows RDP（首选）**：免费版支持100台设备，华为手机有官方App，自动P2P直连，无需公网IP。步骤：笔记本和手机安装Tailscale登录同一账号组网，手机用微软官方"Windows App"输入虚拟IP连接。
2. **ZeroTier + Windows RDP（备选）**：免费版支持10台设备，国内打洞成功率一般可能走中继。

前提条件：笔记本需Windows专业版（家庭版不支持远程桌面），需设置Windows登录密码。

Tags: 内网穿透, 远程桌面, tailscale, zerotier

### [063] discussion | 运维工具,ssh,堡垒机,内网穿透
## Request
用户询问运维大佬们常用的远程管理工具和方案。

## Outcome
介绍了运维工程师的完整工具栈，分为四层：
1. **SSH终端**：MobaXterm（Windows运维首选）、Tabby、Termius、Windows Terminal+SSH
2. **批量运维/堡垒机**：JumpServer（开源堡垒机，国内最常用）、orion-visor、Ansible、Shell/Fabric脚本
3. **内网穿透**：Tailscale（最简单零配置）、ZeroTier（P2P组网）、FRP（自建性能最好）、WireGuard（最快需手动配置）
4. **远程桌面**：Windows RDP（系统自带最稳定）、Parsec（低延迟）、Apache Guacamole（Web端）、RustDesk（开源免费）

核心观点：Linux运维基本不用远程桌面，SSH足够；批量管理用Ansible/堡垒机；远程访问内网用Tailscale/ZeroTier组网不暴露端口。针对用户情况推荐Tailscale + Windows RDP方案。

Tags: 运维工具, ssh, 堡垒机, 内网穿透

### [064] discussion | tailscale,remote-desktop,vpn,windows
## Request
用户请求提供远程管理工具的具体下载链接。

## Outcome
提供了Tailscale（Windows客户端官网下载链接、华为应用市场）和微软Windows App远程桌面客户端（华为应用市场/Google Play链接）的具体下载地址，并补充了从笔记本到华为手机的完整配置步骤：安装Tailscale并登录同一账号、开启Windows远程桌面、在手机Windows App中添加笔记本的Tailscale IP（100.x.x.x）进行连接。

Tags: tailscale, remote-desktop, vpn, windows

### [065] discussion | remote-desktop,android,huawei,app-market
## Request
用户反馈华为应用市场搜不到微软远程桌面（Windows App），需要替代方案。

## Outcome
提供了华为应用市场可用的远程桌面替代方案：向日葵（国内老牌，免费版够用）、AnyDesk（个人免费、轻量）、TeamViewer（经典老牌）。并给出最简单方案：笔记本电脑装向日葵客户端 + 华为手机装向日葵控制端，同一账号登录连接；或Tailscale做内网穿透 + 向日葵做远程桌面的组合方案。

Tags: remote-desktop, android, huawei, app-market

### [066] discussion | opencode-mem,sync,sqlite,architecture
用户询问 opencode-mem 记忆库在笔记本与软路由之间的稳定、无风险的同步方案。AI 通过查证官方 README 确认 opencode-mem 使用 SQLite + WAL 模式，文件级双向同步（如 Syncthing）会导致数据库损坏，官方仅支持 export/import JSON 作为跨机方案。

推荐方案：应用层增量同步——两边 SQLite 各自独立、永不同步文件，通过 API 按记忆 ID 去重、幂等推送增量（每条记忆带 sync-id tag 实现幂等）。稳定性保证：数据库零接触不损坏、重复推送自动跳过、两边同时新增无冲突、最坏情况漏同步重跑即补。语义限制：新增自动双向同步，删除和修改不传播。

需用户确认两个选项：同步通道（A. API 直连推荐，软路由 Web UI 绑 0.0.0.0 + 随机 token；B. Syncthing 中转 export/import JSON）和同步频率（每小时/每天/仅手动）。

Tags: opencode-mem, sync, sqlite, architecture

### [067] discussion | opencode-mem,sync,sqlite,architecture
## Request
用户确认 opencode-mem 记忆同步方案选项：通道 A（API 直连）、频率每小时（询问能否更快）、并询问稳定性。

## Outcome
确认技术细节后给出完整方案：
1. **频率可更快**：同步脚本很轻（两次 API 拉列表 + 推增量，几秒完成，幂等可重跑），建议 cron `*/15` 分钟一次，5 分钟也可行。
2. **稳定性确认**：数据库文件零接触（只走 API 传 JSON）不可能损坏；笔记本 opencode 未开/网络断/软路由重启时本轮跳过下轮自动补；脚本崩溃/重复跑因 `sync-id` tag 幂等设计无害；两边同时新增各自推送无冲突；唯一长期风险是 opencode-mem 大版本升级改 API。
3. **实施计划（通道 A 微调）**：检查发现软路由容器是 bridge 网络且未映射 4747 端口，暴露需重建容器+重装 MCP npm 包（成本高），改为零重建方案：
   - 笔记本 `opencode-mem.jsonc` 加 `webServerHost: "0.0.0.0"` + 随机 `webServerApiToken`，重启 opencode
   - 写 `sync-memories.mjs` 脚本（软路由容器内跑）：双向拉全量记忆 → 按 `sync-id` tag 算差集 → POST 对方缺失项

### [068] discussion | docs管理,记忆库,agents.md,架构决策
## Request
用户询问 AGENTS.md 中引用的 21 个 docs/*.md 分类文档（如 router.md、scrcpy.md、opencode-web-mobile.md）是否可以直接记入记忆插件数据库，从而不再需要在全局 MD 中维护这些文档。

## Outcome
分析了 docs 手册与记忆条目的性质差异：docs 是长文档（完整步骤/配置代码块，适合遇到问题读全文），记忆条目是短经验（自动注入最多 3 条语义近似命中）。结论是长手册塞进记忆库会因注入条数限制而命中率低、代码块不完整。但确认迁移的 382 条记忆中很多已是 docs 的浓缩版（如 LRN-20260808-144 是 opencode-web-mobile.md 的摘要），提出逐个评估清理方案：内容已被记忆覆盖的 docs 直接删、独特长手册（router.md、clash.md）保留、同步清理 AGENTS.md 引用表和 skills 引用。同时提醒防火墙 UAC 弹窗被取消，记忆同步还差最后一步未完成。

Tags: docs管理, 记忆库, agents.md, 架构决策

### [069] discussion | docs迁移,记忆库,架构决策,migration
## Request
用户继续上一轮讨论，确认将 docs/*.md 分类文档全部迁入记忆插件数据库，并完成记忆同步、Syncthing 收尾、软路由侧同步等 4 个需求的执行计划。

## Outcome
完成完整执行计划制定（Plan 模式），包含 4 个需求：
1. **docs 迁移**：22 个 docs/*.md（~190KB）按 `##` 章节拆成 80~120 条记忆条目，格式 `[DOC-文件名] 章节标题`，tags 带 `doc` + `doc:文件名`；迁移后归档到 `docs-archived-20260826/`；`docs/superpowers/` 保留原位不迁不删。清理 9 处引用（AGENTS.md 引用表 + 7 skills + 1 command）。
2. **记忆同步收尾**：防火墙规则（需用户配合 UAC 或手动跑 netsh 命令开放 4747 端口给 192.168.3.0/24 和 100.64.0.0/10）、手动同步验证、软路由 cron 每 15 分钟定时。
3. **Syncthing 收尾**：更新 AGENTS.md 中 Syncthing 描述改为 API 同步。
4. **软路由侧同步**：新 AGENTS.md scp 过去，软路由 `/etc/opencode/docs/` 残留归档。

执行顺序：防火墙→同步

### [070] discussion | opencode-mem,embedding,软路由,docs迁移
## Request
用户询问四个问题：opencode-mem 能否批处理、FM 影视 APK 位置、docs 迁移任务为何暂停、软路由能否配置记忆插件。

## Outcome
完成调研并给出完整方案：
1. opencode-mem 支持 Web API 循环 POST 批处理（此前迁移 382 条记忆已验证）
2. FM 影视 APK 位于软路由 `/etc/opencode/FM影视TV端-64位_v5.6.1_正式版.apk`（89.8MB，8月24日存放）
3. docs 迁移因软路由反复死机搁置，属笔记本本地任务可随时恢复
4. 软路由配置记忆插件需用"远程 embedding"模式：本地模型需 +523MB 内存已证死机，改用 `embeddingApiUrl`（OpenAI 兼容接口，如 SiliconFlow `BAAI/bge-m3` 免费模型）实现 +0MB 内存开销；插件本身仅占几十 MB，配合 900MB 容器硬顶 + mem-watchdog 双保险不会死机

执行计划分三部分：A. docs 迁移（22 个 md 文件按 ## 章节拆 80-120 条，写 migrate-docs.mjs，归档到 docs-archived-20260826/，更新 AGENTS.md）；B. 软路由恢复记忆插件（需用户提供 SiliconFlow key，改 o

### [071] discussion | opencode-mem,ollama,embeddings,architecture
## Request
用户询问 B 方案中 SiliconFlow/Kimi 是否免费稳定，以及能否改用笔记本上本地模型（500MB 的 nomic-embed-text）的 API 来替代第三方 API。

## Outcome
确认方案可行并定稿 B 方案架构：
1. opencode-mem 源码确认**没有**自带 embeddings 端点，但笔记本装 Ollama（免费开源）后可暴露标准 OpenAI 兼容 API
2. 关键发现：Ollama 的 `nomic-embed-text` 与 opencode-mem 使用的 `Xenova/nomic-embed-text-v1` 是同一模型，768 维向量空间完全一致，兼容性优于任何第三方
3. SiliconFlow 的 bge-m3 虽标注永久免费但依赖外网第三方，不可控
4. 定稿架构：软路由 opencode-mem 通过 HTTP 调用笔记本 Ollama API（`http://192.168.3.53:11434/v1/embeddings`），软路由 +0MB 内存开销，笔记本 ~500MB（32GB 无压力）
5. 唯一限制：笔记本关机时软路由记忆暂不可用（只报错不死机，watchdog 兜底）
6. 执行计划：删除 APK（释放 90MB）→ 笔记本部署 Ollama（winget 安装、`OLLA

### [072] discussion | siliconflow,opencode,api-config
用户询问 SiliconFlow 16 元代金券的使用建议。讨论了 bge-m3 embedding 是免费模型不扣费，代金券只能用于付费模型。推荐用法：①接入 opencode 当备用模型（DeepSeek-V3 或 Qwen2.5-72B-Instruct）；②测试 DeepSeek-R1 推理模型；③跑批量翻译/总结任务用便宜模型。注意事项包括查有效期、确认扣费顺序、API key 直接生效无需重新配置。建议将 DeepSeek-V3 加入 opencode 模型列表作为 Plan 备用模型。

Tags: siliconflow, opencode, api-config

### [073] discussion | siliconflow,billing,api-config
用户询问 SiliconFlow 16 元代金券是否需要充值才能抵扣。回答：不需要预充值，代金券在调用付费模型时自动抵扣，免费模型（如 bge-m3）不计费不受影响，16 元额度用完后才扣真实余额。建议到控制台费用中心确认有效期（通常 30-90 天）和适用范围（部分活动券可能限定特定模型）。若券无模型限制，可将 DeepSeek-V3 配置进 opencode 作为备用模型自然消耗额度。

Tags: siliconflow, billing, api-config

### [074] discussion | siliconflow,opencode,model-config,cost-optimization
## Request
User asked whether the SiliconFlow model list (shown in a screenshot) contains free models, and whether they could be used to reduce API costs.

## Outcome
Identified free models on SiliconFlow: `THUDM/GLM-Z1-9B-0414` (free reasoning model, suitable for small_model/fallback), `tencent/Hunyuan-MT-7B` (free translation), plus free OCR (`PaddlePaddle/PaddleOCR-VL-1.5`), ASR (`FunAudioLLM/SenseVoiceSmall`, `Qwen/Qwen3-ASR-1.7B`), and image generation (`Kwai-Kolors/Kolors`). Proposed a zero-cost configuration: switch `small_model` to `siliconflow-cn/THUDM/GLM-Z1-9B-0414` in `opencode.jso

### [075] discussion | autohotkey,window-management,opencli,browser-automation
## Request
用户反馈 OpenClaw 插件调用浏览器时，弹出的 Edge 窗口大小随机且遮挡前台程序，希望固定窗口位置——显示在屏幕左侧 2/3、垂直全高（类似 Windows Snap 分屏效果），且仍需显示在前台以便手动操作。

## Outcome
调研发现 OpenCLI 本身只有 `--window foreground/background` 参数，无窗口位置/大小配置项——Browser Bridge 复用正在运行的 Edge 浏览器，窗口尺寸由 Edge 随机决定。确认用户机器已安装 AutoHotkey v2 和 PowerToys（FancyZones 未启用）。提出方案：编写 AutoHotkey v2 常驻脚本，监听新出现的 Edge 窗口并自动吸附到屏幕左侧 2/3、垂直全高，比例写在脚本顶部变量便于调整（3/5、1/2 等），可开机自启。已向用户确认生效范围（是否包括手动打开的 Edge 窗口）。涉及命令：`opencli --help`、`opencli browser --help`、检查 AutoHotkey 安装路径及版本。

Tags: autohotkey, window-management, opencli, browser-automation

### [076] discussion | openrouter,model-routing,llm-config
## Request
用户询问 OpenRouter 各路由器（免费型号路由器、帕累托码路由器、融合路由器、自动路由/汽车路由器）中哪些适合他的使用场景（opencode coding agent + Go 套餐主力 + 需要兜底）。

## Outcome
给出针对性路由选择建议：推荐"免费型号路由器"作为第二兜底（充 $10 解锁 1000 次/天，日常指定具体免费模型如 `z-ai/glm-5.2:free`）；"帕累托码路由器"用于偶尔攻坚更强编码模型（按 Artificial Analysis 排名路由，需配 `max_price` 上限防超支）；"融合（Fusion）"多模型并行讨论适合难题会诊但 token 消耗数倍，不宜日常用；明确避开"自动路由/汽车路由器"——官方文档确认 `openrouter/auto:free` 加 `:free` 后缀并不限制在免费模型，有用户被扣费案例。最终规划三层 fallback：Go 套餐主力 → zen 免费兜底 → OpenRouter 免费池（指定模型）。

Tags: openrouter, model-routing, llm-config

### [077] discussion | opencode,base64,image-input,script
## 请求
用户询问脚本中为何保留 base64 文本粘贴方式，因为当前模型（mimo-v2.5）无法识别 base64 图片内容。

## 结果
解释了 base64 兜底机制与 drop 附件在模型层面等价（opencode 会将 `![paste.png](data:...)` 转为 provider-native image input），当前无法看图是因为 mimo-v2.5 不支持图片输入（报 `does not support image input`），与 base64 无关。保留 base64 的理由：(1) drop 通道依赖 opencode 前端行为，版本更新可能失效；(2) 旧版 opencode 或输入框未渲染时 base64 是唯一传图方式。提出优化建议：drop 失败回退 base64 时增加 toast 提示「当前模型可能不支持图片，建议切 vision 模型」（如 deepseek-v4-flash-vision-exp），避免用户误以为脚本故障。尚未实施，等待用户确认。

Tags: opencode, base64, image-input, script

### [078] discussion | opencode,model-config,configuration,sync-id:mem_1787755680191_lzmft22w5
## Request
用户询问 OpenCode 配置中 `model` 和 `small_model` 两个键是否需要固定模型配置，以及不固定的后果。

## Outcome
确认了 OpenCode 官方行为（文档 + issue #8609）：
- **`model` 不固定**：按优先级自动选（`--model` 参数 → 配置 → 上次使用模型 → 内部优先级第一个），可能导致会话间模型不一致、丢失 Go 套餐额度，建议保留固定
- **`small_model` 不固定**：官方默认自动从当前 provider 选更便宜模型，否则 fallback 到主模型，这是官方推荐做法（旧版本曾有隐私问题静默用 opencode nano 模型，已在 commit 7d7837e 修复）
- 结论：两边配置保持现状，`model` 固定 Go 套餐模型，`small_model` 固定为免费模型（`opencode/mimo-v2.5-free`），符合官方"显式配置更可控"的常规做法

Tags: opencode, model-config, configuration

### [079] discussion | api,model-recommendation,translation
用户询问简约模型使用的硅基流动API推荐哪个模型。推荐了多个免费模型，包括Qwen/Qwen2.5-7B-Instruct、meta-llama/Meta-Llama-3.1-8B-Instruct等，并提供了API地址和文档链接。

Tags: api, model-recommendation, translation

### [080] discussion | windows,shortcut,autostart,opencode-tray
## Request
用户询问开始菜单和文件夹里的"OpenCode 4096 后端"快捷方式是否还有用。

## Outcome
通过 PowerShell 检查了快捷方式（C:\Users\pass\AppData\Roaming\Microsoft\Windows\Start Menu 等位置），确认该快捷方式指向 opencode-tray.exe（托盘程序，非 serve 本身）。托盘负责自动拉起 serve。决定保留该快捷方式作为 autostart 失效时的兜底手动启动入口。同时确认主任务进度：新 opencode-tray.exe 已编译（193024 字节）、autostart 已写入 HKCU Run 注册表、计划任务已删除、PID 31476 僵尸 socket 记录在 log，等待重启清理 4096 端口句柄。

Tags: windows, shortcut, autostart, opencode-tray

### [081] discussion | opencode,configuration,tray-icon,provider
## Request
用户询问托盘图标状态指示方案中"复用主模型"是否可行，即是否可以直接复用 opencode 主模型配置来驱动托盘图标状态。

## Outcome
开始检查 opencode 主模型配置文件（`~/...`），确认当前主模型和 provider 列表，以验证 `opencodeProvider` 模式是否支持复用主模型来驱动托盘图标状态指示。这是对之前托盘图标红/绿状态指示方案的延伸讨论，涉及配置读取与模型复用可行性验证。

Tags: opencode, configuration, tray-icon, provider

Tags: opencode, configuration, tray-icon, provider

### [082] discussion | opencode-mem,deepseek,provider-migration
## Request
Korisnik je pitao je li DeepSeek službeni model ponovno dostupan nakon prethodnog 402 (nedostatnog stanja) pogreške, te je raspravljen plan migracije memorijskog dodatka na opencodeProvider način rada.

## Outcome
Potvrđeno da DeepSeek službeni `deepseek-chat` trenutno radi (stanje još nije iscrpljeno), ali je upozoreno da će se 402 pogreška ponovno pojaviti. Analizirane su dvije opcije: A) zadržati trenutno stanje s DeepSeek službenim modelom dok se stanje ne iscrpi, ili B) unaprijed migrirati na `opencodeProvider` način rada koji ponovno koristi glavni model i ne zahtijeva zaseban

### [083] discussion | tray-icon,gdi,ui
## Request
用户询问重启后为何需要改动,并讨论托盘图标红/绿状态叠加方案。

## Outcome
澄清重启后不需要任何改动——`opencode-tray.cpp` 的4处修复、编译好的 `opencode-tray.exe`(193024字节)和 autostart 注册表均已持久化,重启仅用于清除 31476 僵尸 socket 让 4096 端口重新 bind。讨论了托盘图标红/绿状态 overlay 方案:现有 `opencode.ico`(1453字节,停止状态)和 `opencode-web.ico`(370070字节,运行状态)可能已有颜色区分;若需右下角叠加红/绿点,需准备新 .ico 文件并修改 `LoadTrayIcon` 函数支持 GDI 叠加绘制后重编译。该改动为纯 UI 改进,不影响核心逻辑。

Tags: tray-icon, gdi, ui

### [084] discussion | opencode-mem,configuration,model-config
## Request
用户询问 opencode-mem 的 `opencodeModel` 配置项行为：当前对话用什么模型，auto-capture 是否就用什么模型，以及如何设置的建议。

## Outcome
确认 `"opencodeModel": "inherit"` 行为：auto-capture 通过 `chat.params` hook 复用当前会话的 provider/model，profile learning 等非消息绑定路径回退到 `model.json` 最近使用的模型。建议保持 `inherit`（自动跟随当前会话模型，无需额外 API key，不消耗额外余额），唯一风险是 thinking mode 模型偶尔 JSON 解析失败但可自动恢复；若失败频率变高可改硬编码 `mimo-v2.5-free`。这是配置决策讨论，无代码变更。

Tags: opencode-mem, configuration, model-config

### [085] fact | doc,doc:browser-testing,doc-id:browser-testing:root
[DOC-browser-testing] 概览

# 浏览器测试流程

测试网页/脚本效果时，**不能用 Playwright 无头浏览器**（无登录状态、无扩展），使用以下方法：

### [086] fact | doc,doc:browser-testing,doc-id:browser-testing:方法一powershell-截屏推荐
[DOC-browser-testing] 方法一：PowerShell 截屏（推荐）

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(1400, 900)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, [System.Drawing.Size]::new(1400, 900))
$bitmap.Save("C:\Users\pass\AppData\Local\Temp\opencode\screenshot.png")
$graphics.Dispose()
$bitmap.Dispose()
```

### [087] fact | doc,doc:browser-testing,doc-id:browser-testing:方法三cdp-远程调试需手动开启
[DOC-browser-testing] 方法三：CDP 远程调试（需手动开启）

```powershell
# 启动 Edge 带调试端口
Start-Process "msedge" "--remote-debugging-port=9222"
# 然后用 Playwright 连接
```

**禁止**：
- 用 Playwright 无头浏览器测试需要登录的网站
- 用 CDP 测试时假设端口已开启（需先检查）

### [088] fact | doc,doc:clash,doc-id:clash:root
[DOC-clash] 概览

# FlClash 配置指南

FlClash v0.8.93，基于 clash-meta 内核。

### [089] fact | doc,doc:clash,doc-id:clash:安装路径
[DOC-clash] 安装路径

| 项目 | 路径 |
|------|------|
| 程序文件 | `C:\Program Files\FlClash\` |
| 主配置目录 | `%USERPROFILE%\.config\clash\` |
| Profiles 数据 | `%APPDATA%\com.follow\clash\profiles\` |

### [090] fact | doc,doc:clash,doc-id:clash:主配置目录-userprofileconfigclash
[DOC-clash] 主配置目录 `%USERPROFILE%\.config\clash\`

| 文件/目录 | 用途 |
|-----------|------|
| `config.yaml` | 内核基础配置（端口、secret） |
| `profiles/1777887752042.yml` | 默认启动的订阅配置 |
| `profiles/list.yml` | 订阅列表及分组选择状态 |
| `start_flclash.bat` | 手动启动内核 |
| `Country.mmdb` | GeoIP 数据库 |
| `cfw-settings.yaml` | FlClash 界面设置 |
| `cache.db` | 缓存 |
| `service/` | Windows 服务 |

### [091] fact | doc,doc:clash,doc-id:clash:profiles-数据目录-appdatacomfollowclashprofi
[DOC-clash] Profiles 数据目录 `%APPDATA%\com.follow\clash\profiles\`

FlClash GUI 管理的配置文件，文件名为数字 ID。

| 文件 | 名称（在 UI 中） | 说明 |
|------|-------------------|------|
| `320141250697105408.yaml` | 魔戒 | 单订阅 |
| `320141415218679808.yaml` | XFLTD(没有AI优化节点) | 单订阅 |
| `323413412883206144.yaml` | 三合一 通用 | proxy-providers 合并订阅 |
| `333064163368636416.yaml` | 精靈學院 | 单订阅 |

### 结构说明

**proxy-providers 模式（三合一）：**
```yaml
proxy-providers:
  provider1:    # XFLTD
    type: http
    url: "订阅地址"
  provider3:    # 魔戒
    type: http
    url: "订阅地址"
  provider5:    # 精靈學院
    type: http
    url: "订阅地址"

proxy-groups:

### [092] fact | doc,doc:clash,doc-id:clash:端口
[DOC-clash] 端口

| 端口 | 用途 |
|------|------|
| 7890 | HTTP/SOCKS5 混合代理 |
| 7891 | SOCKS5 代理 |
| 1053 | DNS |
| 9090 | 外部控制 API |

### [093] fact | doc,doc:clash,doc-id:clash:常用操作
[DOC-clash] 常用操作

### 手动重载配置
在 FlClash GUI 中切换到配置再切回，或重启 FlClash。

### 查看当前选中组
查看 `list.yml` 的 `selected` 字段。

### 从合并配置移除一个机场
1. 定位到 profiles 目录
2. 编辑对应的 .yaml 文件
3. 删除对应 provider 定义
4. 删除对应代理组引用
5. 从各故障转移组中移除引用
6. 在 FlClash 中重载配置

### 直接切换配置文件
`start_flclash.bat` 命令行中通过 `-f` 参数指定配置文件。

### [094] fact | doc,doc:clash,doc-id:clash:常见问题排查
[DOC-clash] 常见问题排查

### Android Edge Copilot 不可用（PC 正常）

**症状**：同一 FlClash 配置在 PC 上可以正常使用 Edge Copilot，但在 Android 手机上 Google 能访问、Copilot 报网络错误。

**根因**：Android Edge 检测到中国区域，使用 `cn.bing.com` 域名访问 Copilot。如果配置中有 `DOMAIN,cn.bing.com,DIRECT` 规则，Copilot 的请求会被直连，而其后端 API 需访问微软海外服务器。

**解决方案**：在覆写脚本中修复路由规则：
```javascript
// 将 cn.bing.com DIRECT 改为走代理
config["rules"] = config["rules"].map(r =>
  r === "DOMAIN,cn.bing.com,DIRECT" ? "DOMAIN,cn.bing.com,XFLTD" : r
);
// 添加 Copilot 核心 API 域名走代理
config["rules"].unshift(
  "DOMAIN-SUFFIX,copilot.microsoft.com,XFLTD",
  "DOMAIN-SUFFIX,edgeservices.bing.com,X

### [095] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:root
[DOC-comfyui-image-gen] 概览

# ComfyUI 本地生图（Intel Arc 核显）

笔记本（Intel Core Ultra X7 358H + Arc B390 iGPU + 32GB 共享内存）的本地生图方案。

### [096] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:环境
[DOC-comfyui-image-gen] 环境

| 项 | 值 |
|---|---|
| ComfyUI | `C:\Users\pass\ComfyUI`（手动部署，非一键脚本） |
| Python | uv 缓存的 3.11（`uv python install 3.11`） |
| PyTorch | `--pre torch --index-url https://download.pytorch.org/whl/nightly/xpu` |
| 启动 | `START_ComfyUI.bat`（`--bf16-unet --async-offload --disable-smart-memory` + `SYCL_CACHE_PERSISTENT=1`） |
| 端口 | 8188 |
| 网页前端 | `scripts/image-web.py` → http://localhost:8090 |
| 生图脚本 | `scripts/generate-image.py`（中文描述→出图） |
| 提示词工具 | `scripts/sd-prompt.py`（中文想法→SDXL英文提示词，本地14B无审查） |

**显存实测**（2026-08-14）：生图峰值仅 **2.14GB**（SDXL GGUF Q4 按需 CPU-offload 加载）。与本地

### [097] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:模型
[DOC-comfyui-image-gen] 模型

- **Juggernaut XL v9 GGUF** Q4_K：`models/unet/juggernaut-xl-v9-Q4_K.gguf`（2.76GB，offgrid-ai 仓库）
- SDXL 需配齐：unet(GGUF) + clip_l + sdxl_clip_g（DualCLIPLoader type=sdxl）+ sdxl_vae
- 下载源：offgrid-ai/juggernaut-xl-v9-GGUF、HyperX-Sentience/SDXL-GGUF、stabilityai/sdxl-vae

### [098] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:核显硬限制重要
[DOC-comfyui-image-gen] 核显硬限制（重要）

1. **只兼容 GGUF + bf16**：fp16 模型在核显上 fp32 推理全黑图；GGUF + `--bf16-unet` 正常
2. **IP-Adapter 彻底黑图**（无解）：GGUF/fp16、bf16/fp32 都纯黑。IPAdapter_plus 无法强制 CPU
3. **inpaint 不可靠**：mask 重绘区生成新人物/纯背景，接缝生硬，无法保持同一个人
4. **img2img denoise >0.4 可能黑图**：低 denoise(0.35) 稳定

### [099] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:保脸方案换衣换场景脸不变
[DOC-comfyui-image-gen] 保脸方案（换衣/换场景脸不变）

**最终方案：img2img 换衣 + ReActor 换脸**（换衣和保脸分离）：
1. img2img 高 denoise 换衣/换场景（脸随便，参考图当底图 + 匹配原图比例）
2. ReActor 把参考图人脸交换到生成图

**img2img 保脸（不用 ReActor 时）**：
- denoise 0.35 + 匹配参考图比例（竖图 768x1152，避免 crop:center 裁脸）
- 人脸相似度 85-95%，换装弱

### [100] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:代理下载
[DOC-comfyui-image-gen] 代理下载

- HF 下载模型：**本机 FlClash 代理 `http://127.0.0.1:7890`**（xf 机场），软路由代理 SSL 不稳
- 软路由 OpenClash：只做透明代理，下载大文件不稳

### [101] fact | doc,doc:comfyui-image-gen,doc-id:comfyui-image-gen:常见坑
[DOC-comfyui-image-gen] 常见坑

- pip install 装错 python：ComfyUI 用 uv 缓存的 3.11，用 `Get-CimInstance Win32_Process` 查实际 python，装依赖用 `--break-system-packages`
- 中文文件名参考图：LoadImage 可能不支持，先复制为英文名
- 参考图全身竖构图：img2img 必须匹配比例，否则方形裁剪掉脸

相关经验：LRN-20260813-001/002/003、ERR-20260813-001/002/003

### [102] fact | doc,doc:discord,doc-id:discord:root
[DOC-discord] 概览

# Discord User Token 操作

- **小号用户名**：slime00260
- **User Token**：通过 Edge 浏览器从 Discord API 请求的 Authorization 头获取
- **获取方式**：连接 Edge 浏览器 → 网络请求 → 提取 Authorization 头
- **服务器**：Tavo 社区（ID: 1356606095207960616）
- **用途**：读取频道消息、搜索内容、查看公告
- **调用方式**：`curl -H "Authorization: {token}" https://discord.com/api/v10/...`
- **注意**：User Token 违反 Discord ToS，仅用小号读取，不做写入操作

### [103] fact | doc,doc:google-voice,doc-id:google-voice:root
[DOC-google-voice] 概览

# Google Voice 账号信息（Discord 登录用）

- **邮箱**：{env:GOOGLE_VOICE_EMAIL}
- **密码**：{env:GOOGLE_VOICE_PASSWORD}
- **2FA密钥**：{env:GOOGLE_VOICE_2FA}
- **电话号码**：{env:GOOGLE_VOICE_PHONE}
- **登录教程**：https://taohaome.org/177.html
- **使用限制**：必须美国IP、禁止发短信、延迟48h改密、质保24h

### [104] fact | doc,doc:leinao-community,doc-id:leinao-community:root
[DOC-leinao-community] 概览

# 类脑社区（类脑ΟΔΥΣΣΕΙΑ）加入指南

- **社区**：类脑 ΟΔΥΣΣΕΙΑ —— 全球最大中文 SillyTavern（AI 酒馆）Discord 社区
- **分站**：旅程 ΟΡΙΖΟΝΤΑΣ —— 新角色卡发布频道
- **服务器 ID**：类脑 `1134557553011998840`，旅程 `1291925535324110879`
- **用途**：角色卡发布/教程分享/破限更新/酒馆使用交流
- **官方教程站**：https://down-3ud.pages.dev/（"类脑新版宝宝教程"，常用资源以站内为准）

### [105] fact | doc,doc:leinao-community,doc-id:leinao-community:邀请码
[DOC-leinao-community] 邀请码

| 邀请码 | 类型 | 状态（2026-08-01 验证） |
|--------|------|--------------------------|
| `odysseia` | 类脑主站 vanity 永久码 | ✅ 有效，expires_at=null |
| `ftFV2TCKEx` | 类脑主站分享码 | ✅ 有效，expires_at=null |
| `elysianhorizon` | 旅程分站 vanity 永久码 | ✅ 有效，expires_at=null |
| `6kdVgVgcRx` | 类脑旧分享码 | ❌ 已过期 |

加入方式：Discord 点"＋ → 加入服务器"，粘贴 `https://discord.gg/{code}` 或直接输入邀请码。

### [106] fact | doc,doc:leinao-community,doc-id:leinao-community:加入流程
[DOC-leinao-community] 加入流程

1. **加服务器**：粘贴上面任一生效邀请码
2. **答题验证**：在"新人验证频道"答题（社区规则题），必须全部答对
3. **等待解锁**：验证通过后等待约 **8 天**，才会转正用户组、解锁角色卡下载等频道
4. **解锁前**看不到下载区是正常的，勿误判为邀请问题

### [107] fact | doc,doc:leinao-community,doc-id:leinao-community:常见问题
[DOC-leinao-community] 常见问题

- **邀请"过期"进不去？** 永久码不会过期。先验证再换：
  ```bash
  curl.exe -s "https://discord.com/api/v10/invites/odysseia"
  ```
  200 + `expires_at:null` = 有效。进不去的常见原因是 **IP 风控**：类脑疑似屏蔽美国 IP，换**香港 IP/节点**即可加入；换节点仍"无法接受邀请"则是账号被风控，需换账号或等解封。
- **加入后被封？** 大概率是 IP 问题，换干净 IP（香港）重试。
- **看不到角色卡频道？** 答题全对 + 等约 8 天缓冲期后才转正解锁。
- **答题答不对？** 规则题需仔细阅读频道置顶的社区规则。
- **卡区满了？** 新卡已迁移到分站"旅程"（`elysianhorizon`），加入后同样需答题。
- **不要**相信售卖"代注册/成品号"的商家，谨防上当。

### [108] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:root
[DOC-opencli-agent-reach] 概览

# OpenCLI & Agent Reach

- **OpenCLI 来源**：https://github.com/jackwener/opencli
- **Agent Reach 来源**：https://github.com/Panniantong/Agent-Reach
- **OpenCLI 安装路径**：npm global (`npm install -g @jackwener/opencli`)
- **Agent Reach skill 路径**：`~/.config/opencode/skills/agent-reach/`
- **OpenCLI 版本**：v1.8.6（2026-07-27）
- **用途**：让 AI Agent 通过真实浏览器（Edge/Chrome）操作已登录的社交平台

### [109] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:架构
[DOC-opencli-agent-reach] 架构

```
用户请求（"帮我搜小红书"）
    ↓
Agent Reach SKILL.md（路由层）
    ├── 平台判断 → 路由到对应后端
    ├── 零配置：Exa / GitHub / V2EX / B站基础 / YouTube / RSS
    └── 需登录态：小红书 / Reddit / Facebook / Instagram / Twitter
              ↓
OpenCLI CLI（执行层）
    ├── browser 命令 → Browser Bridge 扩展 → 浏览器
    └── 独立 CLI 命令 → 直接调用平台 API
```

### [110] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:安装
[DOC-opencli-agent-reach] 安装

### 1. 安装 OpenCLI CLI

需要 Node.js >= 18。

```powershell
npm install -g @jackwener/opencli
```

安装后 daemon 自动启动，默认端口 19825。

### 2. 安装 Browser Bridge 扩展

**Chrome Web Store：**
搜索 "OpenCLI" 安装即可，Edge 也可以安装 Chrome Web Store 的扩展。

**手动安装：**
从 https://github.com/jackwener/opencli/releases 下载 `opencli-extension-v{version}.zip`，解压后：
1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载解压的扩展文件夹

### 3. 验证连接

```powershell
opencli doctor
```

期望输出：
```
[OK] Daemon: running on port XXXXX (vX.X.X)
[OK] Extension: connected (profile: xxxxxxxx)
[OK] Connectivity: passed
```

### 4. 安装

### [111] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:可用平台
[DOC-opencli-agent-reach] 可用平台

| 平台 | 访问方式 | 登录需求 |
|------|---------|---------|
| Exa 搜索 | MCP 工具 | 无（API Key） |
| GitHub | gh CLI / MCP | 无（已认证） |
| V2EX | 公开 API | 无 |
| B站 | bili-cli（若无则走 OpenCLI browser） | 无需登录（基础搜索） |
| YouTube | yt-dlp | 无 |
| RSS | curl | 无 |
| 小红书 | `opencli xiaohongshu` | Edge 登录态 |
| Reddit | `opencli reddit` | Edge 登录态 |
| Facebook | `opencli facebook` | Edge 登录态 |
| Instagram | `opencli instagram` | Edge 登录态 |
| Twitter/X | `opencli browser` 或 twitter-cli | Edge 登录态（browser）或 Cookie（CLI） |

### [112] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:关键命令
[DOC-opencli-agent-reach] 关键命令

```powershell
# 诊断
opencli doctor

# 重启 daemon（扩展会自动重连）
opencli daemon restart

# 查看已注册命令
opencli list

# 社交媒体（复用 Edge 登录态）
opencli xiaohongshu search "query" -f yaml
opencli reddit search "query" -f yaml
opencli facebook search "query" -f yaml
opencli hackernews top --limit 5
opencli bilibili hot --limit 5
```

### [113] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:steam-workshop-订阅2026-08-08-实测见-lrn-2026
[DOC-opencli-agent-reach] Steam Workshop 订阅（2026-08-08 实测，见 LRN-20260808-132/134/135）

用 OpenCLI 浏览器（Edge 登录态）订阅 PZ/游戏 Workshop mod 的完整流程：

```powershell
# 1. 导航到 mod 详情页
opencli browser <session> open "https://steamcommunity.com/sharedfiles/filedetails/?id=<ID>"

# 2. 检查订阅状态（class 含 "toggled" = 已订阅）
#    用 eval 读按钮 onclick 确认函数签名
#    onclick="SubscribeItem( '<id>', '108600' )"

# 3. 订阅：opencli click 的合成点击不触发 Steam 的 onclick，必须 eval 调用
#    eval 代码：() => { SubscribeItem('<id>', '108600'); return 'called'; }

# 4. 有必需依赖的 mod：点击后弹"额外必需物品"框，必须再点"全部订阅"
#    按钮是 div.btn_blue_steamui（DIV 非 a/button

### [114] fact | doc,doc:opencli-agent-reach,doc-id:opencli-agent-reach:注意事项
[DOC-opencli-agent-reach] 注意事项

- 使用 OpenCLI browser 命令时，平台必须已在浏览器中登录
- daemon 自动启动，无需手动管理
- 切换 Edge 浏览器时无需重复配置
- Agent Reach skill 中引用的 `agent-reach doctor` 命令（Python CLI）在 OpenCode 环境中未安装，请使用 `opencli doctor` 替代

### [115] fact | doc,doc:opencode-config,doc-id:opencode-config:root
[DOC-opencode-config] 概览

# OpenCode 配置规范

> 引用自 AGENTS.md，编辑 `opencode.jsonc` 时参考。平常无需读取。

### [116] fact | doc,doc:opencode-config,doc-id:opencode-config:配置分离说明
[DOC-opencode-config] 配置分离说明

**重要**：OpenCode 有两套独立配置：

| 配置类型 | 位置 | 控制范围 |
|---------|------|---------|
| CLI/TUI 配置 | `opencode.jsonc` | 模型、fallback、权限、MCP、compaction 等 |
| 桌面客户端配置 | `%APPDATA%\ai.opencode.desktop\default.dat`（Electron Local Storage） | 声音、界面显示、通知设置等 |

`opencode.jsonc` 的 `notify_on_fallback` 只影响 CLI 的 fallback 通知，**不影响**桌面客户端的声音（Agent/Permissions/Errors 完成音）。桌面客户端的声音需通过界面 Settings → Sounds 单独配置。

### [117] fact | doc,doc:opencode-config,doc-id:opencode-config:权限规则
[DOC-opencode-config] 权限规则

扩展权限匹配规则（`*` = 所有工具）：
- `permission["*"]` — 工具级默认动作
- `permission["bash"]` — bash 命令级动作（精确匹配或 glob）
- 插入顺序无关（opencode 取最后一个匹配规则）

当前安全规则：
- `*` → `allow`（所有工具允许）
- 危险 bash 命令 → `ask`（需确认）：`rm -rf`, `del /s /q`, `format`, `shutdown`, `taskkill /f`, `Remove-Item -Recurse`, `Clear-Content`

### [118] fact | doc,doc:opencode-config,doc-id:opencode-config:mcp-超时基准
[DOC-opencode-config] MCP 超时基准

| 服务器 | 超时(ms) | 说明 |
|--------|---------|------|
| playwright | 60000 | 复杂页面渲染需长时间 |
| context7 | 30000 | 文档查询 |
| github | 默认(5000) | 远程服务器，快响应 |
| tavily | 15000 | 搜索服务 |
| exa | 30000 | 深度搜索 |
| firecrawl | 30000 | JS 渲染抓取/搜索 |

### [119] fact | doc,doc:opencode-config,doc-id:opencode-config:模型与-agent-配置
[DOC-opencode-config] 模型与 Agent 配置

| Agent | 模型 | 用途 |
|-------|------|------|
| plan | 用户动态选择 | 计划、识图分析 |
| build | 用户动态选择 | 代码实现、大上下文任务 |
| default | — | `build`（由 `default_agent` 指定）|

每个 agent 一次只用一个模型；任务从 plan 切到 build 由 agent 机制控制。手机端可在界面底部切换模型。

### compaction

当前配置（2026-09-02 体检校正，为自定义省上下文值，非官方默认）：

```jsonc
{
  "compaction": {
    "auto": true,       // 接近 token 上限时自动压缩历史
    "prune": true,      // 裁剪已完成工具调用结果
    "reserved": 12000   // 保留给回复的 token 预算（自定义值，非官方默认 20K）
    // "tail_turns": 2  未显式配置（用官方默认）
  },
  "tool_output": {
    "max_lines": 1000,  // 自定义上限（非官方默认 2000）
    "max_bytes": 16384  // 自定义上限（非官方默认 51200）

### [120] fact | doc,doc:opencode-config,doc-id:opencode-config:插件系统
[DOC-opencode-config] 插件系统

Plugin 使用 `@opencode-ai/plugin` API，通过 `opencode.jsonc` 的 `plugin` 字段注册。支持三种来源：

```jsonc
{
  "plugin": [
    "./plugin/backup.ts",       // 本地 TS 文件（opencode 内置 transpile）
    "/abs/path/to/plugin.js",   // 绝对路径 JS 文件
    "~/.config/opencode/node_modules/pkg"  // npm 包路径（~ 展开为 HOME）
  ]
}
```

TS 插件无需手动编译，opencode 在加载时自动处理。

**npm 包插件安装**：先用 `npm install` 装到配置目录，再用 `~/.config/opencode/node_modules/pkg` 引用。Windows 上 git-backed plugin spec（`plugin@git+https://...`）可能因 Bun 找不到 git.exe 失败，推荐 npm 本地安装方式。

### [121] fact | doc,doc:opencode-config,doc-id:opencode-config:配置可移植性
[DOC-opencode-config] 配置可移植性

`~/.config/opencode/` 目录可跨设备迁移。迁移步骤：

1. 复制整个配置目录（排除 `node_modules`、`.git`）
2. 新设备安装 Node.js
3. 执行 `npm install` 重装依赖
4. 修改 `opencode.jsonc` 中的硬编码路径（用户名、目录等）
5. 配置 `.env`（API keys 等敏感信息）
6. 重启 opencode

**注意**：
- `.env` 含 API keys，不应放入 OneDrive 等云同步，应单独加密处理
- `projects/` 体量大且可从仓库恢复，一般无需备份
- 环境变量引用的键（如 `{env:TAVILY_API_KEY}`）需在新设备设为系统环境变量（`.env` 对 MCP 服务器不生效）
- `"shell"` 配置项在 OpenCode 1.18.5 Windows 上有 bug，可能造成 Go sidecar 崩溃，不建议使用

### [122] fact | doc,doc:opencode-config,doc-id:opencode-config:实验功能
[DOC-opencode-config] 实验功能

| 功能 | 状态 | 说明 |
|------|------|------|
| batch_tool | 启用 | 批量工具调用，提升多任务效率 |

### [123] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:root
[DOC-opencode-icon-conversion] 概览

# OpenCode 品牌图标转换（SVG → 透明 ICO）

从 opencode.ai/brand 获取品牌素材并生成**透明背景**多尺寸 .ico 的流程。

**相关经验**：LRN-20260807-081/082/083，ERR-20260806-009/010。

### [124] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:1-关键原则
[DOC-opencode-icon-conversion] 1 关键原则

- **取 SVG 源，勿用 PNG 预览**：品牌页的 PNG 预览带背景色（浅灰 `#F1F0F0` / 深色 `#252121`），直接转 ICO 会带背景色块；SVG 才是透明矢量源（LRN-20260807-081）
- 参考现有 `opencode-multi.ico`：6 条目（16/32/48/64/128/256）、32bpp PNG 压缩、透明背景

### [125] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:2-获取-svg
[DOC-opencode-icon-conversion] 2 获取 SVG

品牌页 SVG 按钮是 JS 动态生成 blob URL 下载，静态 HTML 无 `.svg` asset 链接。用 Playwright：

1. 打开 `https://opencode.ai/brand`
2. 逐个点击各资产的 SVG 按钮，捕获 `download` 事件取 URL（文件自动落到 `.playwright-mcp\`）

```
btn.click() + page.waitForEvent('download') → download.url() / suggestedFilename()
```

### [126] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:3-svg--透明-pngedge-headless
[DOC-opencode-icon-conversion] 3 SVG → 透明 PNG（Edge headless）

SVG 内联 HTML（data URI base64 + img flex 居中），Edge headless 截图，`--default-background-color=00000000` 使背景透明：

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $edge --headless=new --disable-gpu --hide-scrollbars --window-size=512,512 `
  --default-background-color=00000000 --screenshot="out.png" "file:///C:/path/render.html"
```

要点：
- viewBox 可能用单引号（`viewBox='0 0 240 300'`），正则需匹配 `['"]`
- 渲染后验证四角 alpha=0 确认透明
- **截图与后续读取分离**：Edge headless 在脚本内调用后立即读文件可能报 NotFound（异步落盘/实例复用），拆成独立脚本执行（ERR-20260806-01

### [127] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:4-png--6-尺寸-ico
[DOC-opencode-icon-conversion] 4 PNG → 6 尺寸 ICO

System.Drawing 从 512 透明 PNG 缩放到 16~256，PNG 压缩 entries + ICO header（同 opencode-multi 格式）：

```powershell
# 每个尺寸：Bitmap(size,size) → DrawImage(512源,0,0,size,size) → Save PNG bytes
# ICO header：reserved(2)+type(2)+count(2) + 每条目(16B) + PNG 数据
```

### [128] fact | doc,doc:opencode-icon-conversion,doc-id:opencode-icon-conversion:5-已知坑
[DOC-opencode-icon-conversion] 5 已知坑

- `.ps1` 含中文路径必须存 **UTF-8 BOM**，否则 PS 5.1 按 GBK 解析乱码 → `DirectoryNotFoundException`（ERR-20260806-009）
- Playwright `run_code_unsafe` 无 Node API（`require`/`fs`/`setTimeout` 均无），文件 IO 回落本地脚本（LRN-20260807-083）

### [129] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:root
[DOC-opencode-maintenance] 概览

# OpenCode 维护手册

opencode 自身（非用户代码）的性能与存储排障。本手册与 skill `opencode-maintenance` 配合：skill 是速查流程，本文是完整操作细节。

### [130] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:背景opencodedb-膨胀问题
[DOC-opencode-maintenance] 背景：opencode.db 膨胀问题

opencode 用 **event sourcing** 持久化会话：`event` 表对每次消息/part 更新都写一条**完整快照**事件（`message.updated.1`、`message.part.updated.1`），从不压缩清理；SQLite 又关闭了 auto_vacuum，所以 `opencode.db` 无限增长。

- 本机实测：2026-06-26 创建 → 2026-08-05 达 **3.9GB**（每天 ~100MB）
- 体积分布：`event` 表 2.67GB（49 万行：`message.part.updated.1` 1502MB + `message.updated.1` 764MB）、`part` 表 1.2GB
- 后果：每次流式输出都往 3.9GB 的 DB 写全量快照 → 写放大、卡顿、**CPU 空闲也 20~35%**
- 官方状态：已知 issue [anomalyco/opencode#33356](https://github.com/anomalyco/opencode/issues/33356)，修复 PR #36710（event log compaction）**未合并**；官方修复前需手动清理

### [131] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:诊断命令
[DOC-opencode-maintenance] 诊断命令

```powershell
# 1. 实例/进程检查（node 子进程按父进程分组，判断几套 MCP）
Get-CimInstance Win32_Process | Where-Object { $_.Name -match "opencode|node" } |
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine

# 2. DB 体积与缓存
Get-Item "$env:USERPROFILE\.local\share\opencode\opencode.db"
Get-ChildItem "$env:USERPROFILE\.local\share\opencode" -Recurse -File |
  Measure-Object Length -Sum

# 3. sqlite3 只读诊断（sqlite3.exe 在 Android SDK platform-tools）
$db = "$env:USERPROFILE\.local\share\opencode\opencode.db"
$sq = "C:\Users\pass\AppData\Local\Android\Sdk\platform-tools\sql

### [132] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:清理流程已验证
[DOC-opencode-maintenance] 清理流程（已验证）

### 1. 在线备份（实例运行时即可）
```powershell
& $sq $db ".backup 'C:\path\opencode-backup.db'"
```

### 2. 删除旧 session（级联清理 event/part/message）
```powershell
opencode session list          # 查看会话与时间
opencode session delete <id>   # 逐条删除
```
- **级联删除**：删父 session 会连带删除子会话（parent_id 关联），因此批量循环时后出现的子会话会报 `Session not found` —— **这是正常现象**，不是失败
- 可用 PowerShell 循环批量删：先从 db 读出要删的 id 列表，循环 `opencode session delete`，`$LASTEXITCODE -ne 0` 且报 not found 的跳过即可

#### 批量删除加速：直接 SQL 事务（推荐）
逐条 `opencode session delete` 每次 fork Node 进程（开库→查→删→关），**几百条 = 几百次进程启动，极慢**。批量删直接 sqlite3 一条事务

### [133] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:windows-默认终端与-cpu
[DOC-opencode-maintenance] Windows 默认终端与 CPU

conhost（默认老式控制台）用 **CPU 软渲染** ANSI 彩色文本；opencode TUI 流式输出逐 token 整屏刷新，conhost 下 CPU 开销极高。Windows Terminal 用 **GPU 渲染**（DirectWrite），同款 opencode 实测可降 ~35% CPU（[issue #11119](https://github.com/anomalyco/opencode/issues/11119) 中 iTerm2 45% → Ghostty 9.8%）。

设为 WT：
```powershell
$key = "HKCU:\Console\%%Startup"
Set-ItemProperty $key -Name DelegationConsole -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
Set-ItemProperty $key -Name DelegationTerminal -Value "{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}"
```
- CLSID `{2EACA947-7F5F-4CFA-BA87-8F7FBEEFBE69}` 从

### [134] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:定期清理机制脚本--计划任务自动停用
[DOC-opencode-maintenance] 定期清理机制（脚本 + 计划任务，自动停用）

**背景**：opencode 无自动归档/删除机制；内置 `session archive` 只标记 `time_archived`，**不释放空间**（event 快照全留）。膨胀主因是 `message.updated.1`/`message.part.updated.1` 全量快照（issue [anomalyco/opencode#33356](https://github.com/anomalyco/opencode/issues/33356)，PR #36710 已关闭未合并）。

**脚本**：`scripts/opencode-db-cleanup.ps1`（UTF-8 BOM，PS 5.1 中文注释必需）
- 参数 `-RetentionDays 30`（默认）；日志 `%TEMP%\opencode\cleanup-opencode-db.log`
- 流程：①官方修复检测 ②备份 `.backup`（保留 3 份，目录 `~/.config/opencode/backups/`）③SQL 事务删 N 天前会话（part/message/context_epoch/input/message/share/todo + session）④孤儿 event 清理（

### [135] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:高-cpu-综合排查顺序
[DOC-opencode-maintenance] 高 CPU 综合排查顺序

1. **实例数量**：多个 opencode 实例各带一套 MCP（playwright/edge/tavily/exa/context7 共 16 个 node 进程）、各占 ~1.5GB 内存，孤儿实例会残留（known issue #26836，usearch 死循环 100% CPU）→ 先 `taskkill` 清孤儿
2. **DB 体积**：>1GB 即按上文清理
3. **终端类型**：conhost → 设 WT
4. 三者可能**叠加**，需逐一排除

### [136] fact | doc,doc:opencode-maintenance,doc-id:opencode-maintenance:已知坑
[DOC-opencode-maintenance] 已知坑

| 坑 | 说明 |
|----|------|
| 时间戳是毫秒 | `time_updated < strftime('%s','date')*1000`，显示 `date(time_updated/1000,'unixepoch')`；直接用秒恒为空 |
| VACUUM vs VACUUM INTO | 前者要排他锁会失败，后者在线可跑 |
| 原地替换 | 实例占用 db，必须退出后替换 |
| session delete not found | 级联删除的正常现象，非失败 |
| WAL 合并不了 | VACUUM 后 `opencode.db-wal` 仍可能很大（如 883MB）——有 opencode 进程（含当前 TUI）持有连接不会自动 checkpoint，**重启后自动合并**，无需手动处理 |
| UTF-8 编码 | 无 BOM `.ps1` 被 PS 5.1 按 GBK 解析，中文注释报 `ParserError: 字符串缺少终止符` | 存 UTF-8 BOM 或用纯 ASCII/英文注释 |
| 自残进程 | 脚本内 `Stop-Process opencode` 级联杀死执行它的 bash 进程树，替换前中断 | `Start-Process powershell -Window

### [137] fact | doc,doc:opencode-mobile-localization,doc-id:opencode-mobile-localization:root
[DOC-opencode-mobile-localization] 概览

# OpenCode-Mobile 汉化构建流程

第三方安卓客户端 `alvarolorentedev/opencode-mobile`（Expo/React Native，连自建 opencode serve）的汉化与本地构建流程。官方无中文（无 i18n 库），用词典直接替换 UI 字符串。

**相关经验**：LRN-20260807-076/077/079，ERR-20260806-003/004/005/006。

### [138] fact | doc,doc:opencode-mobile-localization,doc-id:opencode-mobile-localization:1-环境要求
[DOC-opencode-mobile-localization] 1 环境要求

- Node ≥ 20、npm
- Android Studio（自带 JBR JDK）+ Android SDK：`ANDROID_HOME=C:\Users\pass\AppData\Local\Android\Sdk`，`JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
- 手机开 USB 调试，`adb devices` 可见
- **项目必须放短路径**（如 `C:\oc-mobile`），放 `%TEMP%` 深路径触发 CMake 260 字符限制（ERR-20260806-003）

### [139] fact | doc,doc:opencode-mobile-localization,doc-id:opencode-mobile-localization:2-完整流程
[DOC-opencode-mobile-localization] 2 完整流程

### 2.1 获取源码

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7890"
git clone https://github.com/alvarolorentedev/opencode-mobile.git C:\oc-mobile
```

### 2.2 安装依赖（严格按 lock）

```powershell
npm ci --no-audit --no-fund     # 勿用 npm install，不校验已有文件完整性（ERR-20260806-005）
```

### 2.3 提取并翻译字符串

用 Python 脚本（示例在 `C:\Users\pass\AppData\Local\Temp\opencode\extract_all.py`）提取：
- JSX 文本节点 `>Text<`
- 引号字符串 `"Text"` / `'Text'`（排除 import、URL、icon 名、testID 等）

构建翻译词典后替换，**词典键必须覆盖三种写法**（JSX 文本 `>x<`、双引号 `"x"`、单引号 `'x'`），否则漏网（LRN-20260807-077）。短英文词（Server/Delete 等）单引

### [140] fact | doc,doc:opencode-mobile-localization,doc-id:opencode-mobile-localization:3-关键坑速查
[DOC-opencode-mobile-localization] 3 关键坑速查

| 症状 | 原因 | 处理 |
|------|------|------|
| CMake "Filename longer than 260" | 项目在长路径 | 移到盘符短路径（ERR-20260806-003） |
| 装后打开是 expo 英文启动器 | debug 是 dev client | 构建 release（ERR-20260806-004） |
| 改源码后 bundle 不更新 | Metro 缓存 | 删 `.expo`+`node_modules/.cache`+Temp `metro-*`，用字符串字面量 marker 验证（LRN-20260807-079） |
| 源码有中文但 bundle 搜不到 | Hermes 存 UTF-16 | 用 `utf-16-le` 编码搜索（LRN-20260807-076） |
| 移动目录后文件缺失 | Move-Item 中断 | `git checkout -- $(git ls-files --deleted)` 恢复 + `npm ci`（ERR-20260806-005） |

### [141] fact | doc,doc:opencode-mobile-localization,doc-id:opencode-mobile-localization:4-app-升级后重新汉化
[DOC-opencode-mobile-localization] 4 app 升级后重新汉化

源码升级后汉化会丢失，重跑 2.3 词典替换 + 2.4~2.6 构建安装即可（词典和提取脚本按需重建）。

### [142] fact | doc,doc:opencode-snapshot-recovery,doc-id:opencode-snapshot-recovery:root
[DOC-opencode-snapshot-recovery] 概览

# opencode Snapshot 文件恢复

- **来源**：opencode 内置文件快照（无外部来源）
- **安装路径**：`C:\Users\pass\.local\share\opencode\snapshot\<snapshotid>\<repoid>\`
- **版本**：随 opencode 版本更新
- **用途**：工作区文件被误改/破坏（编码损坏、误删、错误覆盖）时，从快照 git 对象库恢复原始内容。**适用于不在 git 仓库内的文件**（untracked）。

### [143] fact | doc,doc:opencode-snapshot-recovery,doc-id:opencode-snapshot-recovery:背景
[DOC-opencode-snapshot-recovery] 背景

opencode 对工作区文件做快照，目录结构：

```
C:\Users\pass\.local\share\opencode\snapshot\
└── <snapshotid>\                    # 按工作区哈希
    └── <repoid>\                    # git 对象库：有 objects/ + index，无 refs（无提交历史）
```

用 `git` 命令可读取：`index` 记录 路径→blob 映射，`objects/` 和 `pack` 保存 blob 内容（含历史版本）。

### [144] fact | doc,doc:opencode-snapshot-recovery,doc-id:opencode-snapshot-recovery:恢复步骤
[DOC-opencode-snapshot-recovery] 恢复步骤

```powershell
# 1. 定位 snapshot 仓库（找 <snapshotid>\<repoid> 两层）
$gitdir = (Get-ChildItem "C:\Users\pass\.local\share\opencode\snapshot\*\*\HEAD" | Where-Object { (Get-Content $_.FullName -Raw) -match "ref:" } | Select-Object -First 1).Directory.FullName

# 2. 设 GIT_DIR，找目标文件路径对应的 blob
$env:GIT_DIR = $gitdir
git ls-files --stage | Select-String "project-zomboid"

# 3. 导出 blob（⚠️ 必须用 cmd /c 重定向，PowerShell 的 > 会把二进制转文本）
cmd /c "git cat-file blob <blobhash> > C:\Users\pass\AppData\Local\Temp\opencode\recovered.bin"

# 4. 找历史版本：按 blob 大小过滤（如原文件 34867B vs 损坏 3488

### [145] fact | doc,doc:opencode-snapshot-recovery,doc-id:opencode-snapshot-recovery:常见问题
[DOC-opencode-snapshot-recovery] 常见问题

- **PowerShell `>` 重定向损坏二进制**：`git cat-file blob` 输出是原始字节，PS `>` 会按文本转码（产生 UTF-16 BOM）。必须 `cmd /c "..."`。
- **文件不在 index 中 / 找不到路径**：index 记录的是最近状态；历史 blob 需用 `--batch-all-objects --batch-check` 按大小/内容人工定位。
- **恢复后验证**：用 Read 工具读恢复文件确认中文/编码正常，字节数应与原文件一致。
- **配合编码教训**：编辑非 git 的 UTF-8 中文文件，先检测 BOM（`EF BB BF`），用 Python（`utf-8-sig`）或 edit 工具链，勿用 PowerShell GB2312 编码转换（见 `.learnings/ERRORS.md` 中编码相关条目）。

### [146] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:root
[DOC-opencode-web-mobile] 概览

# OpenCode 手机局域网访问（Web/Serve）

通过 `opencode web` / `opencode serve` 把 opencode 服务暴露到局域网，用安卓/iOS 浏览器访问，可"添加到主屏幕"当 app 用。

**相关经验**：LRN-20260806-055/056/057/058，ERR-20260806-001/002，LRN-20260807-075/078/080，ERR-20260806-008。

### [147] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:1-启动命令
[DOC-opencode-web-mobile] 1 启动命令

```powershell
opencode web --hostname 0.0.0.0 --port 4096
```

- 默认 hostname 是 `127.0.0.1`（仅本机），必须改 `0.0.0.0` 才能局域网访问；启动时会打印 Local / Network 两个地址
- `opencode web` 会**无条件**调用 `open()` 打开默认浏览器（源码 `packages/opencode/src/cli/cmd/web.ts`，无 flag/env 可关）
- 不想弹浏览器：用 `opencode serve --hostname 0.0.0.0 --port 4096`——**同样 serve 网页前端**（根路径返回 HTML），手机访问体验一致，密码保护也一致
- 端口可换，默认 `web` 随机端口，固定端口便于手机收藏

### [148] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:2-密码必须
[DOC-opencode-web-mobile] 2 密码（必须）

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

- 局限：局域网 http 明文传输，家庭可信 WiFi

### [149] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:3-任务栏桌面快捷方式
[DOC-opencode-web-mobile] 3 任务栏/桌面快捷方式

### 3.1 新建 WT profile（关键，勿用 `--` 覆盖）

**WT 的 `-p "Profile" -- <commandline>` 覆盖 commandline 不生效**——profile 自带 commandline 优先（实测双击跑的是 profile 原命令，web 参数被忽略）。必须新建独立 profile：

在 `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` 的 `profiles.list` 追加：

```json
{
    "commandline": "C:\\Users\\pass\\AppData\\Roaming\\npm\\node_modules\\opencode-ai\\bin\\opencode.exe serve --hostname 0.0.0.0 --port 4096",
    "guid": "{a1b2c3d4-e5f6-7890-abcd-ef1234567891}",
    "hidden": false,
    "icon": "C:\\Users\\pass\\Documents\\O

### [150] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:4-防火墙
[DOC-opencode-web-mobile] 4 防火墙

首次 `0.0.0.0` 监听会弹 Windows 防火墙窗口，勾选"专用网络"→ 允许。之后同 WiFi 设备可访问。

**关键**：入站规则必须绑定**实际监听进程**。`opencode web/serve` 监听进程是 `opencode.exe`，若规则只给了旧版 `node.exe`，手机仍被拒（本机 200、外部不通，ERR-20260806-008）：

```powershell
Get-NetTCPConnection -LocalPort 4096 -State Listen   # 看 OwningProcess
Get-NetFirewallApplicationFilter | Where Program -match 'opencode|node' | Get-NetFirewallRule
# 为 opencode.exe 添加入站规则（需管理员：Start-Process -Verb RunAs 提权执行脚本）
New-NetFirewallRule -DisplayName "OpenCode Web Server" -Direction Inbound -Action Allow `
  -Program "C:\Users\pass\AppData\Roaming\npm\n

### [151] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:5-手机使用
[DOC-opencode-web-mobile] 5 手机使用

1. 手机连同一 WiFi
2. 浏览器打开 `http://<电脑局域网IP>:4096`（电脑 IP 用 `ipconfig` 查 IPv4）
3. 首次弹 Basic Auth 登录框：`opencode` / 密码
4. 建议浏览器"添加到主屏幕"生成图标
5. 不用时关掉启动的 WT 窗口即停止服务

### [152] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:51-手机原生-app第三方lrn-20260807-078
[DOC-opencode-web-mobile] 5.1 手机原生 app（第三方，LRN-20260807-078）

官方无 app（#10288 未做）、PWA 被拒（#19174 not_planned）。第三方安卓客户端：

| app | ⭐ | 中文 | 锁屏保活 | 说明 |
|-----|-----|------|---------|------|
| `crim50n/oc-remote`（**用户实测选用**） | 123 | 简体中文（15 语言） | ✅ WakeLock+前台服务 | 原生 Kotlin，SSE 流式、多服务器、Termux 终端、MCP；连 serve 填 IP+端口+用户名+密码；APK 从 GitHub release 下载（SHA-256 校验）。网页版痛点（锁屏需刷新/复制失效）原生客户端全无 |
| `theblazehen/P4OC` | 86 | 无 | - | Google Play 上架最省事，终端风 UI，APK 仅 2.9MB |
| `Harness Remote`（原 opencode-remote-android） | 255 | 有繁中 | - | 仅完成提示音（非系统推送） |
| `alvarolorentedev/opencode-mobile` | - | 无（纯英文） | 有 expo-noti

### [153] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:6-会话互通webtui
[DOC-opencode-web-mobile] 6 会话互通（Web/TUI）

- web/serve 与 TUI 共享同一 `opencode.db`：**历史会话互通**——TUI 跑完的会话手机端可见并可续聊，反之亦然
- **进行中会话不实时同步**（两端是不同 server 实例）
- 要同实例实时共享：`opencode web` 后本机执行 `opencode attach http://localhost:4096` 把 TUI 挂到同一后端

### [154] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:7-已知坑
[DOC-opencode-web-mobile] 7 已知坑

- **僵尸端口 4096（需重启系统）**：`opencode serve` 进程若被非正常终止（如双托盘实例并发停止的竞态、或进程被 `Stop-Process` 硬杀 TerminateProcess），TCP socket 不被 OS 回收 → 端口显示 Listen 但 HTTP 永远无响应、本机 health 超时、CLOSE_WAIT 堆积、OwningProcess 进程不存在。**只能重启系统释放**（`scripts/opencode-tray.ps1` 已加单实例 Mutex 防重入 + **2026-08-15 起 Stop-OcService 先发 Ctrl+C 优雅关停**，常规重启已不会触发；但 NSSM 被杀、系统强制结束等硬终止仍可能）。识别：`netstat -ano | findstr :4096` 的 PID 任务管理器找不到 + `curl -m 5 http://127.0.0.1:4096/global/health` 超时
- **快捷方式自定义图标不显示**：.lnk `IconLocation` 指向独立 `.ico` 文件（PNG 压缩或 BMP 格式、可见目录均试过）在 Win11 不显示，回退目标默认图标；指向 PE（`shell32.dll`）正常。诊断：建

### [155] fact | doc,doc:opencode-web-mobile,doc-id:opencode-web-mobile:8-外网访问tailscale-子网路由lrn-20260807-113116
[DOC-opencode-web-mobile] 8 外网访问（Tailscale 子网路由，LRN-20260807-113~116）

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

###

### [156] fact | doc,doc:project-zomboid,doc-id:project-zomboid:root
[DOC-project-zomboid] 概览

# Project Zomboid（僵尸毁灭工程）配置指南

- **来源**：Steam，appid 108600
- **安装路径**：`C:\Steam\steamapps\common\ProjectZomboid`
- **版本**：Build 42.20.0（B42，正版，无破解）
- **用户配置目录**：`C:\Users\pass\Zomboid`
- **Workshop mod 目录**：`C:\Steam\steamapps\workshop\content\108600`
- **用途**：PZ B42 大 Mod 合集（低配向）的安装/配置/性能优化完整备忘

### [157] fact | doc,doc:project-zomboid,doc-id:project-zomboid:合集
[DOC-project-zomboid] 合集

- 早期使用：「无聊的栀子」合集（id=3489328697）→ 因 100 mod 合集取消订阅后 default.txt 残留 128 个失效引用，已清理
- **mod 推荐来源**：小黑盒《僵毁B42.14 自用MOD推荐》帖子（作者合集《丸布了》id=3678446773，86 个 mod），已整理为带创意工坊链接的 HTML 清单
- **合集订阅机制**：Steam 合集是快照式订阅，作者后续新增 mod **不会自动订阅**，需回合集页重新订阅（取消再订阅）同步
- 一个 Workshop item 可含多个 mod.info（主 mod + 分支/附加 mod），100 个 item ≠ 100 个 mod id
- **default.txt 由游戏自动维护**：游戏内勾选会自动写回，日常不用手动改；只有三种情况需手改：换 mod 集合（清残留）、被自动排序覆盖、想让新档默认带某些 mod

### [158] fact | doc,doc:project-zomboid,doc-id:project-zomboid:当前启用-modb42202-单人
[DOC-project-zomboid] 当前启用 mod（B42.20.2 单人）

`default.txt` 现 **31 个 mod**（2026-08-10 清理重写），顺序即加载顺序：
`ModLoadOrderSorter_b42, ModManager, NeatUI_Framework, B42Trans_CN, AutoAll, myspatialrefuge, RebalancedPropMoving, AutoEverything, AutoLoot, better-auto-mechanics, CleanHotBar, CombatText, EreFBIOpenUpDoor, ModernStatus, NoWeightB42, RainCleansBlood, simpleLockpicking, STA_PryOpen, TheShortcut, twistminimap, PinyinSearch_B42, CompanionDogs, B42ModTrans_CN, JumboTreeIndoorFix, LazoloDynamicBackpackUpgrades, LKB42, LTWB42, MoreDamagedObjects, myspatialrefuge_shop, Navigator, OpenAllContainers`

>

### [159] fact | doc,doc:project-zomboid,doc-id:project-zomboid:配置
[DOC-project-zomboid] 配置

### 0. 2026-08-05 收藏 mod 对齐 + 性能优化（备份：*.bak-20260805*）

- **JVM 内存**：应用 Multi-CPU 优化 json（`ProjectZomboid64.json` + `.bat` 两处均改）`-Xmx12288m`（12G）、`-Xms4096m`、ParallelGC、删 AlwaysPreTouch、保留 B42 必需 `--enable-native-access`/`--add-exports`
- **启用 5 个收藏 mod**：PZ_Map（AI 地图数据）、LTWB42（传奇战术武器）、CleanUI（需 NeatUI_Framework，自带 AutoLoot 兼容保护）、OpenAllContainers（B42 版 id=OpenAllContainers，非 OpenAllContainers1）、errorMagnifier（需前置 ChuckleberryFinnAlertSystem 3077900375）→ default.txt 共 39 个 mod
- **options.ini 收紧**：`uiRenderOffscreen=false`、`usePhysicsHitReaction=false`、`water=0`、`rend

### [160] fact | doc,doc:project-zomboid,doc-id:project-zomboid:翻译与-ui-崩溃排查2026-08-05critical
[DOC-project-zomboid] 翻译与 UI 崩溃排查（2026-08-05，critical）

- **裸 `%` 崩 UI（LRN-20260805-044）**：PZ `getText` 用 Java `String.format` 解析翻译值，裸 `%`（尤其结尾）抛 `UnknownFormatConversionException`。主菜单崩查 UI.json（如 `UI_BloodDecals1='10%'` 末尾 `%`）；沙盒设置崩查 Sandbox.json；HUD 崩查 IG_UI.json。修复裸 `%`→`%%`，**所有版本目录都要改**（42/42.20/42.21/common）
- **Steam 清理未订阅下载（ERR-20260805-015）**：workshop 目录只保留已订阅 item，DBU/NoWeight/AutoLoot 曾被清。default.txt 引用的 mod 需确认存在，否则引用 nil 全局表崩

### [161] fact | doc,doc:project-zomboid,doc-id:project-zomboid:小地图b42
[DOC-project-zomboid] 小地图（B42）

- 原版自带，需**创建世界时**在自定义沙盒（Custom Sandbox）开启 **Allow World Map** + **Allow Mini-Map**
- Apocalypse / Extinction / Six Months Later 预设默认关闭；已有存档不能中途开启，需新建世界
- 想更好看可装 TwisTonFire - minimap（3572564421）

### [162] fact | doc,doc:project-zomboid,doc-id:project-zomboid:视野--缩放
[DOC-project-zomboid] 视野 / 缩放

- Options → Display 缩放范围默认 50%~200%，可勾选 **缩放 250%**（原版上限）看得更远
- 拉太远掉帧（核显机器慎用）；还不够可装 Customisable Zoom（3405048727）

### [163] fact | doc,doc:project-zomboid,doc-id:project-zomboid:性能优化-modb42
[DOC-project-zomboid] 性能优化 mod（B42）

- **Every Texture Optimized**（id=3119788162，作者 maceleet，**已订阅**）：压缩全部游戏纹理（11300 文件），**纯纹理替换无 Lua**；三档：Well Balanced（id=**ETO_B**，均衡，作者推荐）/ Maximum Performance（id=**ETO_P**，Steam Deck/笔记本/低端）**二选一**；订阅含两版本。**放 mod 列表最顶部**（让其他 mod 覆盖它）。要求 B42.20+；比游戏内置纹理压缩效果更好且可叠加。⚠️ B42.19.1 beta 不可用
- **Multi-Cpu Enhance**（id=3459875383，作者 4Zeta）：优化 JVM 内存/GC 减少卡顿。需手动替换 `ProjectZomboid64.json`，**必须先备份原文件**，且替换后要保留 B42 必需的 `--enable-native-access` 与 `--add-exports` 参数（直接覆盖可能启动崩溃）；32G 内存建议 `-Xmx12288m`（12G）（本机已应用此配置）
- **Auto Loot**（id=3392699932，作者 Tchernobill）：自动拾取附近容器/尸体物品

### [164] fact | doc,doc:project-zomboid,doc-id:project-zomboid:容量--负重囤囤鼠
[DOC-project-zomboid] 容量 / 负重（囤囤鼠）

- **B42 硬编码限制**：家具容量上限 ~100、背包 ~50、角色负重硬限 50kg——纯沙盒设置无法完全突破
- **Customizable Containers**（2719850086）：沙盒调各类容器容量/减重（WeightReduction→Weightless 100% 减重），依赖 `daneLibrary`（3715021740）；配置项多，加载较慢；可选子模块 Capacity Limit Bypass 需**手动覆盖**游戏 Java 文件（mods 菜单禁用是对的）
- **No Weight**（2606989930）：所有物品 0 重量，永不超重不掉血，任意模式生效零配置；⚠️ 篝火燃料失效 bug
- **Container Capacity Limit Bypass**（3686252520）：无视容器重量上限，能捡起超 50kg 容器；超重受伤保留
- **无限负重/容量三件套**（LRN-20260805-034）：**NoWeightB42**（重量=0）+ **Dynamic Backpack Upgrades**（2996978365，纯 Lua 突破 50 格子，B42.20+ 版本子目录，最稳）+ AutoLoot **Instant Loot**（Loot

### [165] fact | doc,doc:project-zomboid,doc-id:project-zomboid:游牧玩法房车
[DOC-project-zomboid] 游牧玩法（房车）

- **Project RV Interior**（3543229299）：200+ 车进内舱居住；内舱是**空房间**需自己装修，进舱后几秒生成发电机（车有电才激活）；上方法：普通车**车尾按 V**，房车/巴士**坐驾驶座按 V**，出舱右键地面
- **Vanvival**（3547444619，B42.20 MP）：开局送车+钥匙+油+物资+清僵尸；选 RV Owner/Van Survivor 特质；动态发现车辆，找不到 RV 回退普通车
- **Bicycle!**（3461415167，190k）：B42.15+ 专属，SP 有"骑上后掉落"bug
- **Braven's Bicycles**（2988491347，476k，**已订阅**）：经典成熟，B42 支持，bug 少；id=`BB_Bicycles`，**必需依赖 Braven's Utilities**（2850135071，id=`BB_Utils`）——订阅时会弹"额外必需物品"确认框，须点"全部订阅"。自行车较难找（不在已探索区生成）。多人可用
- **骑马 Horse Mod**（3661336777，241k，**已订阅**）：B42.20，4 品种马（美式四分之一/花马/阿帕卢萨/纯血马）+ 马具制作；标题 "MP SOON"

### [166] fact | doc,doc:project-zomboid,doc-id:project-zomboid:本地自制-mod--补丁zomboidmods非-workshop
[DOC-project-zomboid] 本地自制 mod / 补丁（Zomboid\mods\，非 Workshop）

> 这些是自定义 mod，**不在 Workshop**（不会因订阅更新被覆盖），目录在 `C:\Users\pass\Zomboid\mods\`。
> 出问题先看 `console.txt` 里是否有对应 mod 名的报错：搜下表的「日志关键词」。
> 特征：id 全大写或带 PATCH/B42 后缀；日志前缀 `[MOD名]` 是自定义 mod 自己打的，`LOG : Mod loading X` 是加载日志。

| mod | 类型 | 依赖 | 功能 | 日志关键词 |
|---|---|---|---|---|
| **AutoLightsProximity** | 自制 | 无 | 感应灯：玩家靠近自动开灯，离开延时关灯，全天感应；Options→Mods 调半径/延时 | `AutoLightsProximity` / `ALP` |
| **AutoCloseWindowsProximity** | 自制 | 无 | 离开延时自动关窗（ToggleWindow），靠近拉帘功能默认关闭（autoCurtain=false，窗+门通用） | `AutoCloseWindowsProximity` / `ACWP` |
| **AutoEatB4

### [167] fact | doc,doc:project-zomboid,doc-id:project-zomboid:避难所-my-spatial-refugemyspatialrefuge-363
[DOC-project-zomboid] 避难所 My Spatial Refuge（myspatialrefuge 3632195933）

- **机制**：避难所是地图外 (1000,1000) 的真实世界空间，每玩家独立一格，有真实墙/地板，mod 只保护边界墙和圣遗物；初始 3x3，杀僵尸掉 Zombie Cores（MagicalCore）升级到最大 19x19
- **进出**：按住 Q（社交菜单）进入/退出避难所
- **放家具三法**：1) 外面右键家具"移动"拾取带进传送落地 2) 带木板/钉子现场建造 3) 用已装的商店扩展（myspatialrefuge_shop 3711250417）核心买建材/工具/武器
- **传送携带**：物品无限制，只按负重比例罚传送时间（超重最多罚 300s）
- **注意**：避难所无电力需发电机；升级数据在 mod 的 `upgrades.yaml`（可改/加升级）；作者已停止开发但开源（github.com/nuclearthinking/myspatialrefuge），允许 fork
- **搜索效率低/房间小**：先攒核心扩到 5x5+ 再布置；货架床放不下时优先升级空间

### 商店扩展 mod（myspatialrefuge_shop 3711250417，2026-08-05 有本地补丁）

- **功能*

### [168] fact | doc,doc:project-zomboid,doc-id:project-zomboid:自动化-modb4220
[DOC-project-zomboid] 自动化 mod（B42.20）

- **Better Auto Mechanics**（3635856965）：一键训练机械技能，42.20+ 明确支持
- **Auto Forage**（3478924012）：自动行走+觅食，B42 专用
- **Karas Fully Automatic Fishing**（3642554378）：全自动钓鱼，42.13+
- **Project Cook**（3490188370）：烹饪 UI，42.10-42.20；需 NeatUI_Framework；⚠️ MP 主机有 bug 单人正常
- **Auto Reload**（3389448389，135k）：一键自动训练换弹速度（自动装弹/退弹循环）
- **AutoEatB42**（本地 mod）：自动吃背包最合适食物（B41 AutoEat 移植）

### 自动开关灯/窗/窗帘（B42 调研结论，2026-08）

- ⚠️ **AutoLights [B42]**（3737087835）是**时间式**（日落/定时开关灯），不适用游牧/不固定基地玩法；**2026 已被 Steam 移除**且作者不活跃 → 自写 **AutoLightsProximity**（感应式，人在附近亮）是唯一方案，无原版替代
- **自动开门/关门：FBI

### [169] fact | doc,doc:project-zomboid,doc-id:project-zomboid:热门-mod-推荐b422026-08-实测订阅数
[DOC-project-zomboid] 热门 mod 推荐（B42，2026-08 实测订阅数）

> 数据来自 Steam 详情页抓取（Playwright + innerText 正则，见 steam-tools skill）。⚠️ = 评论区有报错/兼容性风险。**推荐 mod 前必须先读评论区确认 B42 可用。**

### 自动化练技能（按订阅数）

| mod | 订阅 | 功能 | 链接 |
|---|---|---|---|
| **Better Auto Mechanics** | 258,470 | 一键训练机械 + 批量拆车件 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3635856965) |
| **Auto Tailoring** | 182,479 | 自动训练裁缝 + 补洞 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3388183573) |
| **Auto Cook** | 115,883 | 自动烹饪 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3388721641) |
| **

### [170] fact | doc,doc:project-zomboid,doc-id:project-zomboid:触控板--纯键盘操作b42-原版设置无需-mod
[DOC-project-zomboid] 触控板 / 纯键盘操作（B42 原版设置，无需 mod）

笔记本电脑只用触控板（单指=左键、双指=右键）时的原版解决方案（Options → Key Bindings）：

| 痛点 | 原版设置 | 说明 |
|------|---------|------|
| 无法"按住右键瞄准+点左键攻击" | **Toggle LCONTROL key to Aim**（默认关） | 按一下 Ctrl 进瞄准模式（角色面向鼠标、可防御/探视野），再按退出 |
| 移动需按住 Shift 加速 | **Toggle Run to Jog** / **Toggle Sprint to Sprint** | 按一次保持奔跑，不用按住 |

- Aim 键 = 左 Ctrl 或 RMB（按住），功能等价
- 触控板做不到"按住+点击"组合，但单指/双指点击都可以
- 曾计划自研 TouchPad Combat mod（一键攻击等 24 项），确认原版全覆盖后放弃

### 无鼠标/触控板增强 mod（B42，2026-08 调研）

原版键盘覆盖已足（WASD、E 交互、Y Walk To、Tab 建造、Ctrl 瞄准、Space 近战、I/B/L/H/J/M 面板、1-8 快捷栏、V 车辆径向、F2-F6 时间），真正缺的是"点地移动替代"和"右键

### [171] fact | doc,doc:project-zomboid,doc-id:project-zomboid:传送--消音器--弓箭
[DOC-project-zomboid] 传送 / 消音器 / 弓箭

- **传送**：传送石碑 Waystone（2900928983）523 评热门但 **B42.13+ 已坏**；纯传送用 TP Mod（3596782504，F10 坐标传送，冷门但适配）；热门传送功能多在 Cheat Menu/Debug 菜单里
- **消音器**：B42 原版**没有**（pzfans 确认）；需 mod——Gunworks 生态的 GoM - Guns of Marz（3722134990，需前置 Gunworks Framework 3722064198）或 Simple Suppressor（3682106012，支持到 42.15）
- **弓箭**：**Archery Nexus**（3617854007，83k，**已订阅**）：B42 原版无弓，此 mod 补全——箭袋(16箭)/弓袋/定制动画/原始制作风/瞄准+装填技能；id=`ArcheryNexus`；⚠️ 42.19 评论有"装备弓时砍树报错"，B42.20 需实测。修复版 Archery Nexus [Fixed]（3731579266，42.19 SP 正常但订阅少）；JM3_ArcheryMP（3721635668，现代弓弩合集，勿与单机版混用）

### [172] fact | doc,doc:project-zomboid,doc-id:project-zomboid:批量-mod-清单整理小黑盒帖子创意工坊链接
[DOC-project-zomboid] 批量 mod 清单整理（小黑盒帖子→创意工坊链接）

抓小黑盒 mod 推荐帖整理成带跳转链接清单的流程：
1. Playwright 滚动加载帖子全部懒加载图片（`img.img-item`，真实 URL 在 `data-src`）
2. evaluate 提取文字+图片，`encodeURIComponent` 编码返回（避免 >20KB 截断），PowerShell 解码存 JSON
3. Windows 自带 OCR（`Windows.Media.Ocr`）识别图片里的 mod 英文名，零安装
4. **优先找作者合集拿准确 ID**（如《丸布了》86 项），用 OCR 名+中文标题匹配；缺失项 Exa 搜索补全
5. 生成 HTML：每个 mod = 中文标题(链接) + 描述 + 图片；输出 `mod推荐清单.html`

### [173] fact | doc,doc:project-zomboid,doc-id:project-zomboid:显示模式
[DOC-project-zomboid] 显示模式

| 需求 | 设置 |
|------|------|
| 独占全屏 | `fullScreen=true`（切换窗口麻烦） |
| 无边窗口全屏（推荐） | `fullScreen=false` + `borderless=true` + 分辨率=桌面物理像素 |
| 窗口化 | `fullScreen=false` + `borderless=false` |

**DPI 坑**：本机 Windows DPI 缩放 200%（物理 3072×1920 → 逻辑 1536×960）。渲染分辨率要用**物理像素**才能填满屏幕。任务栏可见需窗口高度减任务栏物理高度，但游戏启动可能自动改回桌面分辨率。

### [174] fact | doc,doc:project-zomboid,doc-id:project-zomboid:字体b42
[DOC-project-zomboid] 字体（B42）

- 全局字体：固定像素档 **16/19/26/33/38px** 或「随窗口高度缩放」（游戏内 Options → UI → Fonts）
- 4K/高分辨率字小 → 固定 **38px** 最有效
- `options.ini` 的 `fontSize=6` 是 **B41 遗留字段**，不控制 B42 全局字体，改了无效
- 子字体独立档位：右键菜单 / 容器(背包) / 说明

### [175] fact | doc,doc:project-zomboid,doc-id:project-zomboid:日志
[DOC-project-zomboid] 日志

- `C:\Users\pass\Zomboid\console.txt`：启动日志，含分辨率、mod 加载、错误
- `C:\Users\pass\Zomboid\Logs\`：DebugLog 分次记录

### [176] fact | doc,doc:project-zomboid,doc-id:project-zomboid:常见问题
[DOC-project-zomboid] 常见问题

- **鼠标不跟手**：关 `uiRenderOffscreen` + `frameRate=60`；仍延迟多半是核显实际帧率不足
- **字小**：游戏内字体固定 38px（改 options.ini 的 fontSize 无效）
- **加载慢/卡**：先看 VSGirlBody 类高覆盖 mod 数量（一个变体就 2000+ XML overrides），可禁用多余变体；再查 console.txt
- **窗口只占 1/4**：渲染分辨率固定像素 + DPI 200% 缩放所致，用物理像素 + borderless
- **合集作者加 mod 后没看到**：Steam 合集快照机制，需重新订阅
- **tiledef fileNumber N used by more than one mod**：日志不含 mod 名；递归扫描所有 mod.info 的 `tiledef=文件名 起始编号` 行找编号重叠。案例：UsefulBarrelsMP 两个文件都 8188 → 改 patch 文件为 8180。⚠️ 改 workshop 内 mod.info 会被 mod 更新覆盖，建议同步向作者反馈
- **切窗口输入法跳中文**：微软拼音默认模式注册表 `HKCU\Software\Microsoft\InputMetho

### [177] fact | doc,doc:project-zomboid,doc-id:project-zomboid:出生点--搜枪b4220
[DOC-project-zomboid] 出生点 / 搜枪（B42.20）

- 路易斯维尔**不是出生点**（特殊区域，需自驾前往）
- **山谷站**：贴路易斯维尔南部，沿迪克西高速公路北上直达 → 搜枪效率最高
- **三月岭**：附近军事设施（检查站/训练营）枪多，尸群凶
- **罗斯伍德**：警察局武器库 + 出门枪店，新手安全
- **欧文顿**：镇上有枪店
- 路易斯维尔枪点：LVPD 总部、枪店 ×2、军事检查站

### [178] fact | doc,doc:project-zomboid,doc-id:project-zomboid:ai-mod-生态b422026-08-调研
[DOC-project-zomboid] AI mod 生态（B42，2026-08 调研）

B42 **目前无"开箱即用 LLM 智能队友 mod"**，生态分四类：

| 类型 | 代表 | 说明 |
|------|------|------|
| MCP（mod 开发） | wink-/pz-mcp-server（pzmcp） | search_vanilla / generate_script / validate_script / analyze_mod，面向开发者非游戏内操作 |
| RCON/远程 | Zomboid_Server_Manager_Docker、pz-crcon | 广播/传送/给物品/玩家管理，**仅 Dedicated Server 生效**，单机 SP 用不了 |
| AI NPC 对话 | zomboid-gpt-companion（GitHub，半成品/B41）、NPC Chat with Me!（3667458787 框架底座）、Pat's NPC - Project Remnants（3738362476，B42.19 alpha 实体队友需 Java agent，对话脚本式非 LLM） | 实体队友可用但对话非真 AI；PZ AI agent 是学术项目 |
| 外部 DM | project-zomboid-ai-compani

### [179] fact | doc,doc:project-zomboid,doc-id:project-zomboid:对话上下文自动读取用户问-pz-问题前先做
[DOC-project-zomboid] 对话上下文自动读取（用户问 PZ 问题前先做）

用户无需每次解释 mod/出生点/地图。收到 PZ 相关问题时，自动读取：

1. `C:\Users\pass\Zomboid\latestSave.ini`：两行 = 当前存档时间戳 + 模式（如 `Rising`、`Apocalypse`、`Sandbox`）
2. `Saves\<模式>\<时间戳>\players.db`（SQLite，只读打开 `sqlite3.connect("file:"+db+"?mode=ro", uri=True)`）：
   - `localPlayers` 表：name / wx,wy（世界格）/ x,y,z（精确坐标）/ isDead
   - `data` BLOB 二进制含技能/背包/mod 数据（Fitness、Strength、Axe、AutoLoot 开关、MSR 传送点等）
3. 同目录 `mods.txt`：本存档实际启用的 mod 列表（与 default.txt 可不同）
4. `InGameMap.ini`：`WorldMap.CenterX/Y` 世界坐标（地图中心，非玩家位置）
5. **游戏运行时实时数据**（优先于 players.db 坐标，文件新鲜度=最近修改时间）：
   - `Lua\PZ_Map\data.t

### [180] fact | doc,doc:project-zomboid,doc-id:project-zomboid:存档结构--实时只读外部-ai-队友技术基础
[DOC-project-zomboid] 存档结构 / 实时只读（外部 AI 队友技术基础）

- 存档路径：`Saves\<模式>\<时间戳>\`（如 `Saves\Apocalypse\2026-08-03_18-52-42`），核心 `.bin` + SQLite `.db` + 明文 `.lua`
- **players.db**（SQLite）：表 `localPlayers`（id/name/wx/wy 世界格/x/y/z 精确坐标/worldversion/data BLOB/isDead）——`sqlite3.connect(r"file:"+db+"?mode=ro", uri=True)` 只读打开，**游戏运行时可并发读**；data BLOB 含背包/状态为二进制需解析
- **vehicles.db**（SQLite）：车辆数据
- **WorldDictionaryReadable.lua**：全物品/配方明文字典（~1.1MB）
- **latestSave.ini**：指向当前活动存档（两行：时间戳 + 模式）
- **console.txt**：实时日志（报错/事件/mod 行为）
- **AutoEverything 分类结构（2026-08-05 重排）**：9 大分类——自动进食/自动饮水/自动开灯（原感应灯）/自动关窗/自动拾取（含子分组

### [181] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:root
[DOC-rimsort-todds] 概览

# RimSort & todds（RimWorld Mod 管理器 / DDS 贴图转换）

- **来源**：https://github.com/RimSort/RimSort （开源，含 todds 工具）
- **安装路径**：`C:\Users\pass\AppData\Local\Temp\opencode\rimsort\extracted\RimSort\`
- **版本**：RimSort v1.10.2（内含 todds 0.4.1）
- **用途**：RimWorld Mod 排序 + 把 Mod 贴图转 DDS 压缩，大幅降低加载内存占用

### [182] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:背景为什么需要-dds
[DOC-rimsort-todds] 背景：为什么需要 DDS

RimWorld 加载 Mod 时把 PNG 贴图解码为未压缩像素，占用大量内存。转 DDS（BC7 压缩）后：
- 加载内存显著下降（实测 10GB → 5~6GB）
- 加载更快，画质几乎无损失
- **前提**：Mod 合集需包含 **Graphics Settings+**（负责加载 DDS），否则显示大红叉

### [183] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:安装
[DOC-rimsort-todds] 安装

RimSort 是便携版，解压即用，无需安装。下载时**走代理 + 美国节点**（GitHub CDN 在美国，实测快 10 倍）：
```bash
# 切换 FlClash 到美国节点（用 Python 脚本，curl 传 emoji 会 400）
# 然后下载
curl -s -L -x http://127.0.0.1:7890 -o rimsort.zip \
  "https://github.com/RimSort/RimSort/releases/download/v1.10.2/RimSort-v1.10.2-Windows_x86_64.zip"
Expand-Archive rimsort.zip -DestinationPath <目标目录> -Force
```

### [184] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:配置
[DOC-rimsort-todds] 配置

首次使用需设置：
- RimWorld 游戏目录：`C:\Steam\steamapps\common\RimWorld`
- Mods 目录：`C:\Steam\steamapps\workshop\content\294100`
- 下载 Steam 数据库 + 社区规则（RimSort 设置向导自动完成，需联网）

### [185] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:dds-转换命令行全自动
[DOC-rimsort-todds] DDS 转换（命令行全自动）

**关键**：用 RimSort 自带的 `todds\todds.exe`（独立版 todds.exe 缺 Intel 运行时 DLL 无法运行），且**必须 cd 到其所在目录**再调用。

**⚠️ todds 0.4.1 CLI flags 全部失效**：实测该版本**所有命令行参数均被忽略**（`-f/-q/-ms/-fs/-o/-th` 等，传无效参数也静默 exit=0），只按默认参数编码：**BC7 + 质量6 + 自动 mipmap**。恰好默认格式就是 BC7，直接裸调即可：

```bash
cd /d "C:\Users\pass\AppData\Local\Temp\opencode\rimsort\extracted\RimSort\todds"
todds.exe "<Mods目录>" "<Mods目录>"
```

- input 和 output **都指向 Mod 目录** → 原地生成 `.dds`，保留 PNG 作后备
- 21845 张 PNG 约 6 分钟（默认全核并行）
- About/ 目录的 Preview.png 也会被转成 DDS（封面图，游戏不加载，无害）
- **非 4 倍数尺寸坑**：BC7 是 4x4 块压缩，宽/高必须是 4 的倍数。源 PNG 为

### [186] fact | doc,doc:rimsort-todds,doc-id:rimsort-todds:常见问题
[DOC-rimsort-todds] 常见问题

- **独立版 todds.exe 启动 exit=1 无输出**：缺少 Intel tbb/OpenCL 等 8 个 DLL。改用 RimSort 自带版并 `cd /d` 到其目录
- **转换后内存没降**：确认合集里有 Graphics Settings+；游戏需重启
- **游戏内大红叉/紫块**：Graphics Settings+ 未启用，或某个 Mod 的 DDS 损坏（用 `-cl` clean 回退该 Mod）
- **报错 "Cannot load compressed texture with non multiple of 4 dimensions ... BC7"**：源贴图尺寸非 4 倍数（BC7 要求 4 倍数），Unity 拒绝加载，GraphicsSetter 每次启动警告并回退 PNG。修复：用 System.Drawing 把坏 PNG 补位到下一个 4 倍数（`[int][Math]::Ceiling(w/4)*4`，Ceiling 返回 double 需强转 int，否则 Bitmap 报"参数无效"），>1024 的先等比缩到 1024；另存临时目录后 todds 裸调编码，再复制 DDS 覆盖原文件。判定坏文件：读 DDS 头部第 12/16 字节的宽/高取模 4
- **验证转换是

### [187] fact | doc,doc:rimworld,doc-id:rimworld:root
[DOC-rimworld] 概览

# RimWorld（边缘世界）配置指南

- **安装路径**：`C:\Steam\steamapps\common\RimWorld`
- **版本**：1.6.4871（正版本体 + 破解 DLC）
- **Workshop Mod 目录**：`C:\Steam\steamapps\workshop\content\294100`
- **Mods 目录**：`C:\Steam\steamapps\common\RimWorld\Mods`（Junction 指向 Workshop）
- **用途**：RimWorld 破解 DLC + Mod 集成的整体配置备忘

### [188] fact | doc,doc:rimworld,doc-id:rimworld:破解-dlc
[DOC-rimworld] 破解 DLC

- 来源：`https://h.juij.fun/game/rimworld-边缘世界/`，5 个 DLC 数据复制到 Steam Data 目录
- **判定补丁**：`steam_api64.dll` 大文件（11MB）= 解锁补丁版，小文件（295KB）= 原版
- 替换补丁 DLL 后 DLC 全部识别

### [189] fact | doc,doc:rimworld,doc-id:rimworld:workshop-mod-集成junction-方案
[DOC-rimworld] Workshop Mod 集成（Junction 方案）

破解 `steam_api64.dll` 会破坏 SteamUGC API，游戏不再自动读 Workshop，只认 `Mods\` 目录。

换合集流程（免管理员，用 Junction 而非硬链接）：
```powershell
# 删旧建新，把 Mods 链接到 Workshop
New-Item -ItemType Junction -Path "C:\Steam\steamapps\common\RimWorld\Mods" -Target "C:\Steam\steamapps\workshop\content\294100"
# 验证两目录内项数相等
```
- DDS 写在 Workshop 源目录，Junction 无需重建
- 当前合集：多种族轻量版 [2.0]（id=3724074964，409 Mod，已下架但已收藏），用户选择内置自动排序

### [190] fact | doc,doc:rimworld,doc-id:rimworld:贴图-dds-转换降内存
[DOC-rimworld] 贴图 DDS 转换（降内存）

详见 [`docs/rimsort-todds.md`](rimsort-todds.md)。要点：
- 用 RimSort 自带 todds 裸调（CLI flags 全部失效）
- BC7 要求宽高为 4 倍数，非 4 倍数贴图需先用 System.Drawing 补位

### [191] fact | doc,doc:rimworld,doc-id:rimworld:常见问题
[DOC-rimworld] 常见问题

- **教程提示卡住不推进**（如「请在种植区内选择「水稻」」）：Learning Helper 在大 Mod 包下检测失效，操作实际已成功（看种植区面板确认）。点提示条 × 或按 Esc 跳过，纯引导不影响游戏
- **种植后殖民者不去种**：检查工作选项卡是否勾选「种植」、管制是否允许进入该区域、优先级是否够高
- **DLC 不识别**：确认 `steam_api64.dll` 是 11MB 补丁版（295KB 是原版）
- **游戏不识别 Workshop Mod**：破解 DLL 破坏集成，需重建 Mods Junction 到 Workshop

### [192] fact | doc,doc:router,doc-id:router:基本信息
[DOC-router] 基本信息

| 项目 | 值 |
|------|-----|
| 系统 | iStoreOS 24.10.6 (OpenWrt) |
| 设备型号 | Lunzn FastRhino R66S |
| 内核 | 6.6.127 |
| 内网地址 | `{env:ROUTER_IP}` |
| 管理后台 | `{env:ROUTER_URL}` |
| 用户名 | `{env:ROUTER_USER}` |
| 密码 | `{env:ROUTER_PASS}` |
| 远程域名 | `https://istore-028b1bbc6847-30.kooldns.cn:443` (DDNSTO) |
| SSH 端口 | 22 |

### [193] fact | doc,doc:router,doc-id:router:ssh-连接
[DOC-router] SSH 连接

| 项目 | 值 |
|------|-----|
| 内网连接 | `ssh router`（走 `~/.ssh/config`，免密用 `id_router` 密钥）|
| 等效全写 | `ssh -i ~/.ssh/id_router {env:ROUTER_USER}@{env:ROUTER_IP} -p 22` |
| 密码 | `{env:ROUTER_PASS}`（免密已配好，仅作兜底） |
| 说明 | 内网直连；外网需穿透（DDNSTO/ZeroTier）后连接 |

### [194] fact | doc,doc:router,doc-id:router:存储
[DOC-router] 存储

| 挂载点 | 容量 | 路径 |
|--------|------|------|
| 系统盘 (mmcblk0) | 29.7 GiB | 使用率 17% |
| 外接硬盘 (WD Elements 2621) | 1.8 TiB | `/mnt/usb4-1` (使用率 13%) |

### [195] fact | doc,doc:router,doc-id:router:运行服务
[DOC-router] 运行服务

| 服务 | 状态 |
|------|------|
| OpenClash (mihomo) | ✅ 运行中（TUN 模式，Fake-IP，7890/7891/7892/7893/9090；核心 **Mihomo v1.19.29 稳定版**，2026-08-11 从 alpha 切换，旧核心备份 `/root/clash_meta.alpha.bak`） |
| Tailscale | ✅ 运行中（v1.82.5，subnet router 广告 192.168.3.0/24，exit node） |
| zram swap | ✅ 已启用 512MB（lzo 压缩，`system.@system[0].zram_enabled=1` / `zram_size_mb=512`） |
| Syncthing | ✅ 运行中（照片备份到 `/mnt/usb4-1/photos-backup`，端口 8384/22000） |
| SAMBA | ✅ 已启用 → `smb://{env:ROUTER_IP}/op` |
| WEBDAV | ✅ 已启用 |
| Aria2 | ✅ 已启用 → `http://{env:ROUTER_IP}/ariang` |
| Docker | ✅ 运行中 (根目录: `/mnt/usb4-1/docker`

### [196] fact | doc,doc:router,doc-id:router:docker-容器opencode远程唤醒管理入口
[DOC-router] Docker 容器：opencode（远程唤醒/管理入口）

| 项目 | 值 |
|------|-----|
| 容器名 | `opencode` |
| 镜像 | `opencode-arm64:1.18.21-full`（含 ssh/scp/curl/git/python3/jq 全套工具） |
| 端口映射 | `0.0.0.0:4096->4096/tcp` |
| HTTP 访问 | `http://192.168.3.100:4096`（返回 401，需 opencode serve 密码认证） |
| 容器内工具 | 有 `ssh`、`curl`；**无 `etherwake`**（在宿主机） |
| 宿主 WOL 工具 | `/usr/bin/etherwake`（发 WOL 魔术包用） |
| 工作目录 | `/root`（**必须**加 `-w /root`，否则默认 `/` 导致 inotify 监视整个根目录，网页卡顿） |

> ⚠️ **USB 硬盘掉盘教训（2026-08-12）**：两个 USB 口同时接 WD 硬盘 + 平板会**供电不足**导致硬盘掉盘（SCSI `Unit Not Ready`/ASC 0x44）。且内核 USB autosuspend 默认 2s 会让空闲硬盘休眠卡死。
> - **平板用完即拔*

### [197] fact | doc,doc:router,doc-id:router:docker-特殊说明
[DOC-router] Docker 特殊说明

### 代理配置（拉取外网镜像）

国内拉取 `ghcr.io` 镜像极慢（超时/几KB），需配置 Docker daemon 代理：

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "proxies": {
    "http-proxy": "http://127.0.0.1:7890",
    "https-proxy": "http://127.0.0.1:7890"
  }
}
EOF
/etc/init.d/dockerd restart
```

或使用 DaoCloud 镜像加速（免代理）：
- `ghcr.m.daocloud.io/org/repo:tag`

### 环境限制

iStoreOS 基于 OpenWrt，默认无 Python/Node/PHP，只有 BusyBox。通过 SSH 部署脚本时优先用 shell + curl。

### SSH 执行命令注意

Windows 通过 plink.exe 传递复杂 shell 命令时引号易丢失，推荐 base64 编码脚本后传输：

```powershell
$script = 'ifconfig -a'
$b64 = [Convert]::ToBas

### [198] fact | doc,doc:router,doc-id:router:openclash-自定义规则
[DOC-router] OpenClash 自定义规则

**文件**：`/etc/openclash/custom/openclash_custom_rules.list`（YAML 格式）
**启用**：`uci set openclash.config.enable_custom_clash_rules=1`（默认关闭）
**生效**：删 `/tmp/openclash.change` + 重启 OpenClash（完整模式合并规则）

### 当前生效规则

```yaml
# 内网直连（必须在最前面，防 OpenClash TUN 拦截 localhost）
- IP-CIDR,127.0.0.0/8,🎯 全球直连
- IP-CIDR,172.16.0.0/12,🎯 全球直连
- IP-CIDR,192.168.0.0/16,🎯 全球直连
- IP-CIDR,10.0.0.0/8,🎯 全球直连
# Syncthing
- PROCESS-NAME,syncthing,DIRECT
- PROCESS-NAME,syncthin,DIRECT
- DST-PORT,22000,DIRECT
- DST-PORT,8384,DIRECT
- DST-PORT,21027,DIRECT
- DOMAIN-KEYWORD,syncthing,DIRECT
- DOMAIN-SU

### [199] fact | doc,doc:router,doc-id:router:tailscale-修复局域网路由劫持
[DOC-router] Tailscale 修复（局域网路由劫持）

Tailscale subnet router 广告 192.168.3.0/24 会在 `table 52` 添加路由，劫持本机局域网访问。三重保险修复（LRN-20260808-135）：

```bash
# rc.local
ip rule del from all to 192.168.3.0/24 lookup main pref 100 2>/dev/null
ip rule add from all to 192.168.3.0/24 lookup main pref 100

# /etc/tailscale/up.sh（tailscale up 后执行）
# /etc/openclash/custom/openclash_custom_firewall_rules.sh（OpenClash 启动时执行）
# 同上规则，三处持久化
```

### [200] fact | doc,doc:router,doc-id:router:openclash-配置管理
[DOC-router] OpenClash 配置管理

- **源配置**：`/etc/openclash/config/二合一.yaml`（OpenClash 每次重启/订阅更新时从此生成）
- **根目录配置**：`/etc/openclash/二合一.yaml`（mihomo 实际加载，由源配置 + yml_change.sh 生成）
- **快速模式**：`/tmp/openclash.change` 控制，删该文件强制完整模式（完整模式才执行 overwrite/自定义规则）
- **provider 文件**：`/etc/openclash/proxy_provider/Provider_*.yaml`（http 类型自动更新，file 类型本地缓存）
- **proxy认证**：`authentication: Clash:vOknt8m0`（7890/7893 代理需认证）

## [LRN-20260902-image-support-correction] correction

**Logged**: 2026-09-02T15:30:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
`opencode-go-2` ? `muse-spark-1.2-contributor` / `mimo-v2.5` ?? `opencode.jsonc:82-83` ?? image?????? `vision-exp`

### Details
- ????2026-09-01 ???`Muse Spark / MiMo ? image ??????????? deepseek-v4-flash-vision-exp`
- ???`opencode.jsonc:82-83` ?? `opencode-go-2.muse-spark-1.2-contributor` ? `mimo-v2.5` ? `attachment:true` + `modalities:{input:["text","image"]}`?Plan/Build ??????
- ????? Valid-Until ???? validCheck ??? outdated

### Suggested Action
?? `Plan ??/??OCR` ??? `muse-spark-1.2-contributor` ?????????? vision-exp ??

### Metadata
- Source: conversation
- Source-Config: go2-image-v2
- Valid-Until: 2026-10-02
- Pattern-Key: config.image-support-mismatch
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02
- See Also: LRN-20260901-001

---

## [LRN-20260902-config-deep-check] fact

**Logged**: 2026-09-02T18:40:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
opencode 配置深度检查（只读体检）：核心配置健康，发现 6 项文档漂移/失效残留/杂物，已处置 4 项。

### Details
- **校验通过**：`opencode.jsonc` 与 4096 后端 `/config` 实载一致；9 个 MCP 7 enabled（playwright/comfyui 按计划 disabled）；4 个 provider 白名单正常；14 superpowers + 11 本地 skill frontmatter name 全匹配；env 三方同步 `sync-env-to-tray.ps1`（pwsh7）`OK - all 3 files in sync`（13 key）
- **发现并修复**：
  1. AGENTS.md:57 A方案说明失实（声称 tui.json:attention.enabled=false + patches/ 已实现，实际两文件均不存在）→ 改写为真实机制（油猴 v1.8.7 12s 静音窗口）
  2. LEARNINGS[119] compaction 记"官方默认 20000/2000" 与 jsonc 实际 `reserved:12000`/`tool_output 1000/16K` 不符 → 同步为实际值
  3. 失效配置归档：`opencode-mem.jsonc`/`.disabled`/`.bak`/`memory-plugin.json`（opencode-mem 已停用 09-02，防误启泄露 router 端点）→ `backups/retired-20260902/`
  4. 根目录杂物 32 个（exe/obj/png/log/0B 垃圾）→ `backups/retired-20260902/`
- **观察项**：4096 后端 `model=` 空属正常（web/TUI 手动切）；tray `InjectUserEnv 11/13` 因 User env 无 HTTP(S)_PROXY（走 TUN 透明代理，符合设计）

### Suggested Action
- `sync-env-to-tray.ps1` 仅 pwsh7 可跑（PS5.1 L82 解析报错），文件头应标注版本要求
- `comfyui-mcp.py` 缺失（jsonc 引用但 git 未恢复），启用前需 `git show e28632e` 恢复

### Metadata
- Source: conversation
- Source-Config: opencode.jsonc
- Valid-Until: 2026-12-02
- Pattern-Key: config.deep-check
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

### [LRN-20260902-XXX] AGENTS.md 规则进化（ChatGPT+Codex 式）

### Summary
按用户需求「优化 opencode 朝 ChatGPT + Codex 进化」，对 AGENTS.md 做 3 处规则强化（仅加规则，不硬编码 model，不新增 agent）。

### Details
1. **自动规划（Codex 式）**：会话管理新增——复杂任务（≥3 步/多文件/跨系统/外部 API）自动先规划再执行（写 .opencode/plans/ + TodoWrite），简单任务直接做不弹窗
2. **表达要求（ChatGPT 式）**：强化第13条——先结论后细节、自然简洁有温度、主动给下一步建议、重要回复用 humanizer 润色去 AI 腔
3. **工具选择表**：第2节新增 8 行工具选择表（搜索→Exa/Firecrawl/Tavily、文档→context7、抓取→webfetch/playwright-edge、桌面→windows-mcp、GitHub→github MCP、技能→LobeHub、记忆→grep+qmd-lite），主动用勿等提示

### 决策
- 痛点3「模型自动选」用户明确**不需要**，保持手动切模型（LRN-20260810 决策不变）
- 备份：AGENTS.md.bak-evolve-20260902-*

### Metadata
- Source: conversation
- Source-Config: AGENTS.md
- Valid-Until: 2026-12-02
- Pattern-Key: agents.md.evolve
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

### [LRN-20260902-XXX] AGENTS.md 规则进化 2（自动验证 + 技能自动触发）

### Summary
「继续进化」第二轮：用户选择 C+D（自动验证 + 技能自动触发），在 AGENTS.md 第3节执行规范新增第17、18条。

### Details
- **第17条 自动验证（Codex 式）**：任务完成前必须运行验证命令（测试/lint/typecheck/build），不通过不交差；引用 erification-before-completion 技能（证据先于断言，禁"应该能过"式交差）；无法验证时说明原因
- **第18条 技能自动触发（superpowers 全流程）**：复杂任务自动触发 rainstorming→writing-plans→executing-plans；修 bug 触发 systematic-debugging；实现功能触发 	est-driven-development；完成前触发 erification-before-completion；涉及技能先加载 SKILL.md

### 决策
- 用户未选 A（自定义 subagent）+ B（自定义命令），本轮只做规则强化
- 备份：AGENTS.md.bak-evolve2-20260902-*

### Metadata
- Source: conversation
- Source-Config: AGENTS.md
- Valid-Until: 2026-12-02
- Pattern-Key: agents.md.evolve2
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

### [LRN-20260902-XXX] plan/build agent 加 prompt 引导

### Summary
「继续进化」第三轮：为 plan/build agent 添加 prompt 引导文件，结构化规划与执行流程。

### Details
- 新建 prompts/plan.txt：引导 plan agent 结构化规划（目标/现状/步骤/风险/验证/涉及文件），先理解需求→探索现状→写 .opencode/plans/ + TodoWrite
- 新建 prompts/build.txt：引导 build agent 执行（按计划→TodoWrite 跟踪→每步验证→报告带证据），证据先于断言
- opencode.jsonc agent 段加 prompt: "{file:./prompts/plan.txt}" / "{file:./prompts/build.txt}"
- 验证：node 解析 JSONC OK，prompt 字段生效

### 决策
- MCP 不新增（用户未选），技能保持 25 个现状
- 备份：opencode.jsonc.bak-prompt-20260902-*

### Metadata
- Source: conversation
- Source-Config: opencode.jsonc + prompts/
- Valid-Until: 2026-12-02
- Pattern-Key: agent.prompt
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

### [LRN-20260902-XXX] hooks 自动化插件

### Summary
「继续完善」：新建 plugins/hooks-automation.js，实现 3 个 hooks 自动化（压缩前写 HANDOFF / 注入最近记忆 / 步骤失败记录）。

### Details
- **session.next.compaction.started**：压缩前自动写 .opencode/plans/HANDOFF.md（时间+会话ID+续跑提示），防上下文丢失重做
- **experimental.chat.system.transform**：每次请求注入最近 5 条 .learnings/ 标题级摘要（<recent-memory>），让新会话自动有记忆
- **session.next.step.failed**：步骤失败自动记录 ERRORS.md（去重+脱敏+Pattern-Key: runtime.step-failed），补充 tool.execute.after 未覆盖场景
- opencode.jsonc plugin 数组加第 3 个插件，验证 JSONC + JS 语法 OK

### 决策
- 与 self-improvement.js 分离（专注 hooks），避免单文件过大
- 备份：opencode.jsonc.bak-hooks-20260902-*

### Metadata
- Source: conversation
- Source-Config: plugins/hooks-automation.js + opencode.jsonc
- Valid-Until: 2026-12-02
- Pattern-Key: hooks.automation
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

## [LRN-20260903-004] knowledge_gap

**Logged**: 2026-09-03T23:30:00+08:00
**Priority**: high
**Status**: pending
**Area**: config

### Summary
skills CLI（`npx skills add`）对 OpenCode 的路径映射问题：安装到 `~/.agents/skills/` 而非 `~/.config/opencode/skills/`，需手动迁移

### Details
- 安装命令：`npx skills add anthropics/skills --skill frontend-design -a opencode -g -y --copy`
- 安装输出显示路径：`~\.agents\skills\frontend-design`
- 实际落盘位置：`C:\Users\pass\.agents\skills\frontend-design`
- opencode 期望路径：`C:\Users\pass\.config\opencode\skills\frontend-design`
- skills CLI README 声称 OpenCode 全局路径是 `~/.config/opencode/skills/`，但实际行为不符
- 解决方案：安装后手动 `Copy-Item -Recurse` 从 `~/.agents/skills/` 到 `~/.config/opencode/skills/`

### Suggested Action
安装 skills CLI 后，检查实际安装路径；若落在 `~/.agents/skills/`，手动复制到 `~/.config/opencode/skills/`

### Metadata
- Source: conversation
- Valid-Until: 2026-10-03
- Related Files: C:\Users\pass\.config\opencode\skills\
- Tags: skills-cli, opencode, path-mapping
- Pattern-Key: config.skill-cli-path
- Recurrence-Count: 1
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03

---

## [LRN-20260903-005] insight

**Logged**: 2026-09-03T23:30:00+08:00
**Priority**: low
**Status**: pending
**Area**: config

### Summary
find-skills（vercel-labs/skills）与 lobehub-skills-search-engine 触发词重叠但生态不同，可共存互补

### Details
- **find-skills**（vercel-labs/skills，290 万安装）：触发词 "how do I do X"、"find a skill for X"、"is there a skill that can..."，搜索 Skills.sh 生态（`npx skills add` 来源）
- **lobehub-skills-search-engine**（本地）：触发词 "task you don't know how to do"、"search marketplace"，搜索 LobeHub 商店（`lobehub.com/zh/skills`）
- 两者都是"找 skill"功能，但搜索的生态不同
- 建议保留两者，在 AGENTS.md 工具选择表中注明分工

### Suggested Action
在 AGENTS.md 第 2 节工具约定中补充：find-skills 搜 Skills.sh 生态，lobehub-skills-search-engine 搜 LobeHub 商店；遇"找 skill"需求时，优先问用户搜索哪个生态

### Metadata
- Source: conversation
- Valid-Until: 2026-10-03
- Related Files: C:\Users\pass\.config\opencode\skills\find-skills\SKILL.md, C:\Users\pass\.config\opencode\skills\lobehub-skills-search-engine\SKILL.md
- Tags: skill-search, trigger-conflict, ecosystem
- Pattern-Key: config.skill-trigger-overlap
- Recurrence-Count: 1
- First-Seen: 2026-09-03
- Last-Seen: 2026-09-03

---

### [LRN-20260902-XXX] opencode 配置完善 7 项（清理/恢复/入库/实测）

### Summary
2026-09-02 完成 opencode 配置目录 7 项完善：opencode-mem 残留归档、comfyui-mcp.py 恢复、git 核心配置入库、代理实测、docs 归档、备份整理、空目录清理。

### Details
- **opencode-mem 残留**：`~/.opencode-mem/`（839MB，含 .auth-token）→ `backups/retired-20260902/opencode-mem/`；`.learnings-archived-20260902/opencode-mem-backup`（832MB）→ `backups/retired-20260902/opencode-mem-backup/`，空目录删除
- **comfyui-mcp.py**：`git show e28632e:scripts/comfyui-mcp.py` 恢复（27.9KB），保持 enabled:false
- **git 入库**：181 文件（AGENTS.md/opencode.jsonc/scripts/skills/plugins/prompts/commands/.learnings/.opencode/plans）提交 f1b48dc；memory-plugin.js.disabled 归档提交 88a89a3
- **代理实测**：playwright-edge 无 HTTPS_PROXY 时抓 github.com 成功（TUN 透明代理覆盖），空 `{env:HTTPS_PROXY}` 引用无害，保留
- **docs 归档**：docs/superpowers → docs-archived-20260826/，.stfolder 删除，docs/ 空目录删除
- **备份整理**：1335MB 旧 db 删除（新备份 integrity ok），9 个 .bak → backups/bak-archive-20260902/
- **空目录**：patches/、hooks/ 删除

### 教训
- git 仓库原本只跟踪用户脚本（9 文件），核心配置全 untracked——配置应入库保护
- 删除旧 db 前必须验证新备份 integrity_check
- jsonc 验证脚本要正确处理字符串内 `//`（URL），简单正则误删会报错

### Metadata
- Source: conversation
- Source-Config: opencode.jsonc + AGENTS.md + git
- Valid-Until: 2026-12-02
- Pattern-Key: opencode.maintenance.cleanup
- Recurrence-Count: 1
- First-Seen: 2026-09-02
- Last-Seen: 2026-09-02

---

## [LRN-20260903-006] 2026-09-03 已以 skills.sh 为主、awesome-opencode 校验，LobeHub 降为归档（市场检索结果少且无 OpenCode 全量标注）

- LobeHub 市场已从 AGENTS.md 工具约定/工具选择表/先搜再做链路移除，保留于历史归档 .learnings/ 与 .opencode/plans/ 中
- 日常检索：主用 skills.sh（npx skills find <关键词> / https://skills.sh/agent/opencode），校验用 awesome-opencode（10k★）

- Source: conversation
- Valid-Until: 2026-10-03

## [LRN-20260903-XXX] opencode-all-in-one v1.9.1 草稿串台 + ESC 提速修复

**Logged**: 2026-09-03T04:06:19.331Z
**Valid-Until**: 2026-12-31
**Source-Config**: opencode-all-in-one.user.js v1.9.1

### 问题 1：草稿串台（DRAFT_MODULE 竞态）
- **现象**：双会话 tab 共享同一 contenteditable 输入框 + 单条 pathname，2s 轮询 `saveDraft` 把右侧文本写进旧会话 key，切回左侧时恢复出右侧文本
- **根因**：`saveDraft` 用 `currentSession || getSessionId()` 但 `currentSession` 只在 `restoreDraft` 更新；轮询无输入监听、无发送清空、无切换前保存
- **修复**：① input 事件 350ms 防抖驱动保存（替代 2s 轮询）；② `handleSwitch` 切 tab 先存旧 sid 再取新 sid；③ 发送（Enter/按钮/POST /session 成功）后 `removeItem`；④ 恢复前比对当前文本非空则跳过防覆盖；⑤ `getSessionId` 增加 href/searchParams/data-session-id 多级 fallback

### 问题 2：ESC 慢中断
- **现象**：按 ESC 要等半天才停
- **根因**：① CONNECTION_MODULE 的 fetch 包装器未透传 signal，AbortError 被计入 failCount 误判掉线；② 6 个 MutationObserver 在流式渲染时同步扫描 pre/code/img 阻塞主线程，keydown 派发延迟
- **修复**：① fetch wrapper 透传 `init.signal`，abort 时直接 throw 不计 failCount；② LARGE_IMAGE/TOOL_FOLD/REASONING_FOLD/CODE_WRAP 4 个 Observer 改批量节流（120-180ms setTimeout 合并处理，pending 上限 40）

### 验证（headless Chromium 实测 ALL_PASS）
- 草稿隔离：A 输入→切 B 清空→B 输入独立→切回 A 恢复 ✅
- ESC：事件不被拦截 + fetch abort 透传（AbortError 不误判掉线）✅
- 节流：30 个 pre 批量插入无长任务，ESC 仍即时响应 ✅

### 坑（见 ERR-20260903-D7K）
- PowerShell Set-Content 写 UTF-8 中文 JS 会损坏文件 → 一律用 node 写
- 恢复优先 backups_local/（比 git HEAD 新）

---

## [LRN-20260904-001] 安装链接交付前必须核对一致性

**Logged**: 2026-09-03T04:50:05.689Z
**Valid-Until**: 2027-12-31
**Source-Config**: AGENTS.md:13.1 + verification-before-completion

### 规则
交付前必先核对（未验不发），但对外只呈现 2 行收敛结果：
```
✅ 已核对 v1.9.x 代码一致（本地/镜像同版）

[OC多合一脚本 v1.9.x](https://github.com/Mariomoprc/my-userscripts/raw/main/opencode-all-in-one.user.js)
```
- 内部核对链（不对外展开）：1) `node --check` 2) 本地/镜像 @version 一致 3) GitHub raw 200 4) 需要时隐形浏览器/截图
- 对外不贴本地路径 `C:\\...`，不说“按新规则”，需展开时折叠至 `验证：node --check 双过 + GitHub 200`

### 背景
2026-09-04 v1.9.2 交付时用户截图显示 Tampermonkey 安装页为“重新安装（代码一致） 1.9.2”，用户要求“像这种你给我之前先核对一下”并将“链接可点”定为通用规则（已落 AGENTS.md:13.1）。本次将“先核对”固化为记忆，避免以后未验证就给旧版/错误链接。

### 关联
- AGENTS.md:13.1 链接可点（通用）：裸露 URL 或 `[文字](url)`，勿包代码块；本地路径除外
- AGENTS.md:17 自动验证（Codex 式）：证据先于断言

---
