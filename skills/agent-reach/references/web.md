# 网页阅读

通用网页、RSS。优先使用 OpenCode 内置工具。

## 通用网页

OpenCode 内置多个网页读取工具：

| 工具 | 适用场景 | 说明 |
|-----|---------|------|
| `webfetch` | 快速抓取已知 URL | 默认首选，Markdown 格式 |
| `firecrawl_scrape` | JS 渲染/反爬页面（SPA/懒加载） | 云端渲染带 key，绕 IP 信誉限制；支持 json 结构化提取 |
| `firecrawl_search` | 搜索 + 自动抓正文全文 | search=2 credits/次，返回带 markdown 全文 |
| `exa_web_fetch_exa` | 批量抓取多个 URL | 支持多 URL 并行 |
| `playwright_browser_navigate` | 需要 JS 渲染的页面 | Firecrawl 配额耗尽时使用 |

## Jina Reader

```bash
# 读取任意网页内容为 Markdown
curl -s "https://r.jina.ai/URL"
```

## RSS

```bash
python3 -c "
import feedparser
for e in feedparser.parse('FEED_URL').entries[:5]:
    print(f'{e.title} — {e.link}')
"
```

## 选择指南

| 场景 | 推荐工具 |
|-----|---------|
| 快速抓取已知 URL | webfetch |
| JS 渲染/反爬页面 | firecrawl_scrape |
| 搜索 + 正文全文 | firecrawl_search |
| 批量抓取 | exa_web_fetch_exa |
| 需要 JS 渲染（Firecrawl 配额耗尽） | Playwright |
| RSS 订阅 | feedparser |
| 简单网页 | Jina Reader |

## Firecrawl 使用要点

- `FIRECRAWL_API_KEY` 在 `.env`，MCP 用 `{env:FIRECRAWL_API_KEY}` 引用
- 免费 1000 credits/月：search=2、scrape=1 credit/页
- 带 key 绕 IP 信誉限制（软路由出口 IP 信誉差被拒时尤其有用）
- JSON 结构化提取：`formats: ["json"]` + `jsonOptions.schema`（需带 `required` 数组）
- v1 `/extract` 已废弃，用 v2 `/scrape` 的 json format

## Steam Workshop（steamcommunity.com）

- **国内需代理**：Playwright 直连报 `net::ERR_CONNECTION_CLOSED`，必须 `--proxy http://127.0.0.1:7890`
- **Exa 免代理**：用 Exa 搜索可拿到 Workshop 标题/描述/ID，是查询 mod 的首选
- **给用户的打开方式**：Steam 客户端内搜 mod 名，或 `steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=XXX`
- **注意**：Workshop 页面显示 "incompatible with Project Zomboid" 是 PZ mod 常见标记，不代表真不兼容，需看具体描述

## 国内社区分享链接（小黑盒 xiaoheihe.cn 等）

- `api.xiaoheihe.cn/v3/bbs/app/api/web/share?...` 这类分享 API 用 curl/webfetch 直连返回 **404**，但用 Playwright 打开会自动重定向到真实帖子页
- **网页版评论可能少于 APP 版**：关键回复（如推荐 mod）可能只在 APP 端可见，需提示用户或查 APP 截图
- 抓取正文/评论区时用 Playwright 快照 + `browser_evaluate` 提取文本，注意 GBK 控制台显示问题用 Unicode 码点验证

## 长帖/图片抓取经验（小黑盒实测）

- **懒加载图片**：正文图用 `img.img-item` 选择器，真实 URL 在 `data-src`/`currentSrc`（`src` 是占位符）；需多次 `mouse.wheel` 滚动触发全部懒加载
- **大数据传输**：evaluate 返回 >20KB 会被工具截断 → 用 `encodeURIComponent(JSON.stringify(data))` 编码返回，PowerShell 端 `[System.Uri]::UnescapeDataString` 解码存 JSON
- **Playwright run_code_unsafe 限制**：环境无 `require`/`Buffer`/`TextEncoder`/`window`（非标准 Node），不能用 fs 写文件；写文件统一由 PowerShell 端处理
- **图片转文字（OCR）**：Windows 自带 `Windows.Media.Ocr` 零安装，`TryCreateFromUserProfileLanguages()` 中英文通用；单张约 1-3 秒，写 param 脚本分批跑
- **批量 mod ID**：优先找作者合集（Steam collection）拿准确 ID，用 OCR 名称 + 中文标题匹配，比逐张识别数字可靠；缺失项用 Exa 补
