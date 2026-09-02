# 搜索工具

Exa AI 搜索引擎。

## Exa AI 搜索

高质量 AI 搜索引擎，擅长技术和代码搜索。
通过 OpenCode 内置的 Exa MCP 工具调用。

### 使用场景

| 场景 | OpenCode 工具 |
|-----|------|
| 网页搜索 | `exa_web_search_exa` |
| 代码搜索 | `exa_web_search_exa` with code context |

### 特点

- 擅长英文内容和技术文档
- 支持代码上下文搜索
- 结果质量高

## 与其他搜索工具对比

| 工具 | 来源 | 适用场景 |
|-----|------|---------|
| Exa MCP | OpenCode 内置 | 英文/技术/代码搜索 |
| Tavily MCP | OpenCode 内置 | 通用搜索（目前配额耗尽）|
| Playwright | OpenCode 内置 | 需要 JS 渲染的页面 |
| webfetch | OpenCode 内置 | 快速抓取已知 URL |
| GitHub MCP | OpenCode 内置 | 仓库/代码搜索 |
| Exa HTTP API | 直连 | **MCP 工具未加载时的兜底**（见下）|

## Exa HTTP API 兜底（MCP 未加载时）

MCP 工具（`exa_web_search_exa` / `tavily_search`）可能因会话加载失败而未暴露，但配置和 API key 都在。此时直接用 HTTP API，效果相同：

**搜索**（PowerShell，Windows 下 `curl.exe` 内联 JSON 会丢引号，用 `Invoke-RestMethod`）：
```powershell
$body = '{"query":"关键词","numResults":8,"type":"neural","contents":{"text":true,"highlights":{"numSentences":6}}}'
$r = Invoke-RestMethod -Uri "https://api.exa.ai/search" -Headers @{"x-api-key"=$env:EXA_API_KEY} -Method Post -ContentType "application/json; charset=utf-8" -Body $body
$r.results | ForEach-Object { "[$($_.title)]`n$($_.url)`n$($_.text)" }
```
- `type:auto` + 中文关键词有时无结果 → 用 `type:neural` + `contents`
- `type:keyword` 适合精确术语

**抓取页面**（Jina Reader，国内可用免代理）：
```
https://r.jina.ai/<目标URL>
```
```powershell
$resp = Invoke-WebRequest -Uri "https://r.jina.ai/https://example.com/page" -Headers @{"User-Agent"="Mozilla/5.0"} -UseBasicParsing
```

**声称"工具不可用"前的检查链**：
1. 先 grep `opencode.jsonc` 确认 MCP 配置存在 + `enabled:true`
2. 确认 `EXA_API_KEY` / `TAVILY_API_KEY` 环境变量存在
3. 配置在但工具未加载 → 用上面的 HTTP API 兜底，而不是告知用户"不可用"

相关：LRN-20260809-160（HTTP API 兜底）、ERR-20260809-003（curl JSON 引号）、LRN-20260809-161（先查配置）

## 服务状态页 / 故障排查

排查某个 SaaS/API/服务"挂了/报错"时：

1. **搜 GitHub issues 确认是否已知问题**：`repo:org/repo 关键词`（GitHub MCP 或 Exa），如 `repo:anomalyco/opencode deepseek-v4-flash`。服务报错信息里的英文关键词（`Router.Unavailable`、`No endpoints found` 等）直接作为搜索词命中率高。
2. **服务官方状态页**：`<服务名> status outage` 用 Exa 搜，Exa 后端免代理，能拿到状态页快照（含 `Degraded Performance / 已定位原因 / Ongoing for X minutes` 等）。
3. **webfetch 状态页直连失败**（如 status.deepseek.com 在国内被墙报 Transport error）属正常，不要反复重试，改用第 2 步 Exa。
4. 判断是"配置/权限问题"还是"服务端故障"：先让用户核对对应产品工作区的权限/opt-in 开关（如 OpenCode Go 的"启用部署在中国的模型"），仍失败再判定为服务端故障。

