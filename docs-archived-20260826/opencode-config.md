# OpenCode 配置规范

> 引用自 AGENTS.md，编辑 `opencode.jsonc` 时参考。平常无需读取。

## 配置分离说明

**重要**：OpenCode 有两套独立配置：

| 配置类型 | 位置 | 控制范围 |
|---------|------|---------|
| CLI/TUI 配置 | `opencode.jsonc` | 模型、fallback、权限、MCP、compaction 等 |
| 桌面客户端配置 | `%APPDATA%\ai.opencode.desktop\default.dat`（Electron Local Storage） | 声音、界面显示、通知设置等 |

`opencode.jsonc` 的 `notify_on_fallback` 只影响 CLI 的 fallback 通知，**不影响**桌面客户端的声音（Agent/Permissions/Errors 完成音）。桌面客户端的声音需通过界面 Settings → Sounds 单独配置。

## 权限规则

扩展权限匹配规则（`*` = 所有工具）：
- `permission["*"]` — 工具级默认动作
- `permission["bash"]` — bash 命令级动作（精确匹配或 glob）
- 插入顺序无关（opencode 取最后一个匹配规则）

当前安全规则：
- `*` → `allow`（所有工具允许）
- 危险 bash 命令 → `ask`（需确认）：`rm -rf`, `del /s /q`, `format`, `shutdown`, `taskkill /f`, `Remove-Item -Recurse`, `Clear-Content`

## MCP 超时基准

| 服务器 | 超时(ms) | 说明 |
|--------|---------|------|
| playwright | 60000 | 复杂页面渲染需长时间 |
| context7 | 30000 | 文档查询 |
| github | 默认(5000) | 远程服务器，快响应 |
| tavily | 15000 | 搜索服务 |
| exa | 30000 | 深度搜索 |
| firecrawl | 30000 | JS 渲染抓取/搜索 |

## 模型与 Agent 配置

| Agent | 模型 | 用途 |
|-------|------|------|
| plan | 用户动态选择 | 计划、识图分析 |
| build | 用户动态选择 | 代码实现、大上下文任务 |
| default | — | `build`（由 `default_agent` 指定）|

每个 agent 一次只用一个模型；任务从 plan 切到 build 由 agent 机制控制。手机端可在界面底部切换模型。

### compaction

当前配置（已恢复官方默认值）：

```jsonc
{
  "compaction": {
    "auto": true,      // 接近 token 上限时自动压缩历史
    "prune": true,     // 裁剪已完成工具调用结果
    "reserved": 20000, // 保留给回复的 token 预算（官方默认 20K）
    "tail_turns": 2    // 压缩时保留最近 N 轮不压缩（官方默认 2）
  },
  "tool_output": {
    "max_lines": 2000,   // 官方默认 2000
    "max_bytes": 51200   // 官方默认 51200
  }
}
```

- `tail_turns` 越大上下文越连贯但消耗越多；`prune` 保持开启。
- 加速手段：简单任务直接用 build（不走 plan 切换）；多独立任务一条消息并发派 `task`（并行）；长上下文任务不设超大 `tail_turns`。

**官方默认值参考**（来源：`https://opencode.ai/config.json` schema）：
- `compaction.reserved` 默认 `min(20000, maxOutputTokens)` —— 用户配置 `50000` 过度激进，已还原
- `compaction.tail_turns` 默认 `2` —— 用户配置 `5` 会保留更多历史、上下文增长更快，已还原
- `compaction.prune` 默认 `false`，开启后裁剪已完成工具输出
- `tool_output.max_lines` 默认 `2000`、`max_bytes` 默认 `51200` —— 用户配置 `200/8192` 过度裁剪，会丢文件内容，已还原
- 注意：模型标称上下文（如 1M）与实际可用不同，MiMo 实际 ~300K 起变慢、DeepSeek 实际 ~500K 起难回复；靠压配置不如控制子任务输出量（子任务只返回路径/关键发现/总结）

### Go 套餐模型故障排查

OpenCode 套餐模型报错时的排查链（当前分工：plan=`opencode-go/deepseek-v4-flash-vision-exp`、build=`opencode-go/mimo-v2.5`；fallback 到 `opencode/mimo-v2.5-free`）：

- **`Router.Unavailable` / "model only available hosted in China"**：DS V4 Flash GA 版只在中国托管，需在 Go 工作区开启"启用部署在中国的模型"（`https://opencode.ai/workspace/wrk_.../go`）。未开启 → 开启后重试。
- **开关已开仍报错**：查 DeepSeek 官方状态页 status.deepseek.com 是否有 `Degraded Performance`（国内 webfetch 直连失败，用 Exa 搜 `deepseek status outage` 拿快照）。
- **备用模型**：`opencode-go/deepseek-v4-pro`（非中国托管，正常）、`opencode-go/mimo-v2.5`（ZDR 且不在中国托管）。
- 已知 issue：anomalyco/opencode #39845、#39838、#39872、#40253。

### Zen vs Go 套餐

| 项目 | Zen | Go |
|------|-----|-----|
| 付费方式 | $20 余额按量付费 | $10/月订阅 |
| Base URL | `https://opencode.ai/zen/v1` | `https://opencode.ai/zen/go/v1` |
| 免费模型 | 有（7个 `-free` 后缀） | 无 |
| 模型列表 | `/zen/v1/models` | `/zen/go/v1/models` |
| chat/completions | `/zen/v1/chat/completions` | `/zen/go/v1/chat/completions` |

免费模型（截至 2026-08）：`mimo-v2.5-free`、`big-pickle`、`ox-alpha-free`、`nemotron-3-ultra-free`、`nemotron-3.5-lightning-free`

**已知服务端 bug**：Zen/Go 的 `chat/completions` 推理端点可能间歇性返回 500 Internal Server Error（[#35276](https://github.com/anomalyco/opencode/issues/35276)），但 `/models` 端点正常。症状为所有请求（无论模型、key、stream）均 500。诊断：`curl -s https://opencode.ai/zen/v1/chat/completions` 确认是服务端问题后，临时切换到 DeepSeek 官方 Anthropic 端点（`https://api.deepseek.com/anthropic`）。

**CC Switch 集成**：CC Switch 内置 OpenCode Go 预设使用 `https://opencode.ai/zen/go`（Go 端点）；若要使用 Zen 免费模型，需改 `ANTHROPIC_BASE_URL` 为 `https://opencode.ai/zen`（Zen 端点），模型改为对应的 `-free` 后缀模型。必须开启 Local Proxy（Zen 为 OpenAI 兼容格式，非 Anthropic 原生）。

## 插件系统

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

## 配置可移植性

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

## 实验功能

| 功能 | 状态 | 说明 |
|------|------|------|
| batch_tool | 启用 | 批量工具调用，提升多任务效率 |
