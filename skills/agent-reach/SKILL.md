---
name: agent-reach
description: "互联网能力路由器（OpenCode 适配），15 平台统一选后端（Exa/gh/yt-dlp/Playwright-Edge），需声明平台+重试链"
---

# Skill: agent-reach

# Agent Reach — 互联网能力路由器（OpenCode 适配版）

15 平台、多后端。**本 skill 存在时必须用它访问这些平台，不要自己发明方案。**

## 常驻规则（全程适用）

1. **浏览器控制统一用 Playwright Extension**：需要登录态的浏览器任务通过 `playwright-extension` MCP 工具（复用 Edge 已有登录态），不再使用 OpenCLI。
2. **声明你在用什么**：开始干活前说一句「使用 agent-reach 的 X 平台 / Y 后端」。
3. **失败按 references 里的重试链处理**，不要瞎猜命令。
4. **全网调研类任务**：组合多平台（OpenCode 内置的 Exa/Tavily 搜索 + Playwright Extension 访问需要登录的平台），并行收集再汇总。

## 后端选择策略

| 平台 | 首选后端 | 说明 |
|------|---------|------|
| 通用网页搜索 | Exa MCP（内置） | OpenCode 已有 Exa 工具 |
| GitHub 代码搜索 | gh CLI / GitHub MCP | 已配置 |
| V2EX | 公开 API（curl） | 无需登录 |
| YouTube | yt-dlp / webfetch | 无需登录 |
| RSS | curl / webfetch | 无需登录 |
| 小红书 | Playwright Extension + Edge 登录态 | 需 Edge 已登录 |
| Twitter/X | Playwright Extension + Edge 登录态 | 需 Edge 已登录 |
| B站 | Playwright Extension 或 webfetch | 基础搜索无需登录 |
| Reddit | Playwright Extension + Edge 登录态 | 需 Edge 已登录 |
| Facebook | Playwright Extension + Edge 登录态 | 需 Edge 已登录 |
| Instagram | Playwright Extension + Edge 登录态 | 需 Edge 已登录 |
| Discord 邀请/服务器信息 | Discord API（curl） | 无需登录，验证邀请用 `/api/v10/invites/{code}` |
| LinkedIn | webfetch / Playwright Extension | 需登录 |

## 零配置快速命令

```bash
# 通用网页阅读
curl -s "https://r.jina.ai/URL"

# GitHub 搜索
gh search repos "query" --sort stars --limit 10

# YouTube 字幕
yt-dlp --write-sub --skip-download -o "/tmp/%(id)s" "URL"

# V2EX 热门
curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"
```

## 浏览器控制（Playwright Extension）

需要登录态的浏览器任务使用 Playwright Extension，步骤：

1. 确认 Edge 已安装 **Playwright MCP Bridge** 扩展
2. 使用 `playwright-extension` 命名空间的 MCP 工具：`browser_navigate`、`browser_snapshot`、`browser_click`、`browser_type` 等
3. 首次调用时 Edge 会弹出授权对话框 → 选择要控制的标签页 → 允许

**典型流程：**
```bash
# 1. 导航到目标页面
browser_navigate(url="https://example.com")

# 2. 获取页面快照（无障碍树）
browser_snapshot()

# 3. 找到元素引用后点击/输入
browser_click(target="e5")
browser_type(target="e10", text="search query")
```

## 工作区规则

**不要在 agent workspace 创建文件。** 使用临时目录存放临时输出。

## 详细文档

根据用户需求，阅读对应的详细文档：

- [搜索工具](references/search.md) — Exa AI 搜索
- [社交媒体](references/social.md) — 小红书, Twitter, B站, V2EX, Reddit, Facebook, Instagram, Discord（浏览器访问 + API 方案）
- [职场招聘](references/career.md) — LinkedIn
- [开发工具](references/dev.md) — GitHub CLI
- [网页阅读](references/web.md) — Jina Reader, RSS
- [视频播客](references/video.md) — YouTube, B站, 小宇宙

Base directory for this skill: C:\Users\pass\.config\opencode\skills\agent-reach
Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
Note: file list is sampled.

<skill_files>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\web.md</file>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\video.md</file>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\social.md</file>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\search.md</file>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\dev.md</file>
<file>C:\Users\pass\.config\opencode\skills\agent-reach\references\career.md</file>
</skill_files>
