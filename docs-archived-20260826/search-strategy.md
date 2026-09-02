# 搜索策略

> 引用自 AGENTS.md，供搜索时参考。非搜索任务无需读取此文件。

## 原则

多源搜索，逐级降级，禁止用 emoji 替代真实内容。

## 本地代码搜索（项目内）

```
首选  → rg（ripgrep，需安装）
        ├── Windows：`winget install BurntSushi.ripgrep.MSVC`
        ├── macOS：`brew install ripgrep`
        └── Linux：`sudo apt install ripgrep`

降级  → Select-String（Windows 原生，仅限 rg 不可用时）
        ├── 不支持 PCRE2 正则
        └── 大文件性能差
```

## 搜索降级链（严格按顺序）

```
首选  → webfetch（快速抓取已知 URL）
        ├── 国内站：直连（baidu.com 等）
        └── 国外站：走 Tailscale Exit Node / 软路由 TUN 透明代理
        ⚠️ 注意：知乎等站点有反爬机制，可能返回 403

降级1 → Firecrawl（云端 JS 渲染，带 key 绕 IP 信誉限制）
        ├── 需要 JS 渲染的页面（SPA/懒加载）
        ├── 反爬/被 IP 信誉拉黑的站点（知乎、Reddit 等）
        ├── 搜索 + 自动抓正文全文（/v2/search）
        └── 结构化提取（/v2/scrape + json format）
        ⚠️ 免费 1000 credits/月：search=2、scrape=1 credit/页；FIRECRAWL_API_KEY 在 .env

降级2 → Playwright（内置 headless Chromium，无痕通用搜索）
        ├── 通用网页搜索（Bing/Google）
        └── 无需登录态的场景（Firecrawl 配额耗尽时）

降级3 → Exa（需系统环境变量 EXA_API_KEY）
        ├── 深度分析/需要引用的场景
        └── 代码/技术文档搜索
        ⚠️ 需 `EXA_API_KEY` 设为系统环境变量（仅 `.env` 不够），设好后重启 opencode

补充  → Tavily / Context7（可用但额度有限，遇不可用时自动跳过）
        ├── Tavily：1,000 credits/月，超额返回 432
        └── Context7：1,000 calls/月，超额后每天补 20 bonus
```

**重要**：不要跳过 webfetch 直接使用 Exa 或 Tavily。必须按降级链顺序尝试。Firecrawl 是 JS 渲染/反爬场景首选，优先于本地 Playwright。

### Playwright 搜索引擎说明

- **Chromium （内置）**：Bing 搜索正常；Google 因反爬会返回 429，遇此情况自动切 Bing 或降级到 Exa
- 需要登录态的站点（小红书/Reddit/Twitter 等）用 OpenCLI（见 `docs/opencli-agent-reach.md`）

## 搜索技巧

- 商品图片：优先搜商品英文名/国际站，中文搜不到换英文
- 技术文档：webfetch/Firecrawl > Playwright > Exa > Tavily/Context7
- GitHub 相关：优先 GitHub MCP/搜索工具

### 服务状态页 / 故障排查

排查某个服务"挂了/报错"时，按以下顺序：

1. **GitHub issues 已知问题**：报错信息里的英文关键词（`Router.Unavailable`、`No endpoints found` 等）作为搜索词，配合 `repo:org/repo` 范围搜，命中率高
2. **Exa 搜状态页快照**：`<服务名> status outage` —— Exa 后端免代理，能拿到 status 页内容（`Degraded Performance` / `Ongoing for X minutes`）
3. **webfetch 状态页直连失败**（如 status.deepseek.com 国内被墙报 Transport error）属正常，别反复重试，改走第 2 步
4. 先排除配置/权限问题（产品工作区的 opt-in 开关，如 OpenCode Go 的"启用部署在中国的模型"），再判定服务端故障

## 搜索工具预检

搜索前检查工具可用性（快速判断不用等失败）：

| 检查项 | 命令/方法 | 说明 |
|--------|----------|------|
| Firecrawl key 是否配置 | `$env:FIRECRAWL_API_KEY` 或查 `.env` | 配置在 `.env`；免费 1000 credits/月，scrape 后检查 credits |
| Exa key 是否配置 | `[Environment]::GetEnvironmentVariable("EXA_API_KEY","User")` | 仅 `.env` 不够&#xFF0C;需系统环境变量&#xFF0C;设好重启 opencode |
| Tavily 是否可用 | 调用 tavily_search，HTTP 432 即配额耗尽 | 约 8/1 月度重置 |
| Context7 是否可用 | 调用 context7_query-docs，失败即配额耗尽 | 约 8/1 月度重置 |
| Playwright 是否可用 | 若启动时报错 `--isolated`，改用 Edge 或 webfetch | 检查 Chromium 是否被占用 |
| 代理是否生效 | `curl.exe -x http://127.0.0.1:7890 -I https://github.com` | 国外站需代理 |
| rg 是否可用 | `rg --version` | Windows 用 `winget install BurntSushi.ripgrep.MSVC` |

## 搜索工具选择

| 工具 | 适用场景 | 可用状态 | 备注 |
|------|---------|---------|------|
| webfetch | 快速抓取已知 URL，国内外站 | ✅ 可用 | 首选；国内站直连，国外站需代理 |
| Firecrawl | JS 渲染/反爬页面、搜索+正文 | ✅ 可用 | 云端渲染带 key，绕 IP 信誉限制；1000 credits/月 |
| Playwright | 通用浏览器搜索，无痕场景 | ✅ 可用 | 内置 headless Chromium；Firecrawl 配额耗尽时用 |
| OpenCLI | 需登录态的真实浏览器（Edge） | ✅ 可用 | 小红书/Reddit/Twitter 等；Browser Bridge 复用登录态 |
| Exa | 深度分析、代码/文档搜索 | ✅ 可用 | `EXA_API_KEY` 已设系统环境变量；`.env` 不够，`{env:EXA_API_KEY}` 需读进程环境 |
| Tavily | 快速搜索、网页内容提取 | ✅ 可用 | Free 1,000 credits/月，超额后报 432 |
| Context7 | 库/框架/SDK 文档查询 | ✅ 可用 | Free 1,000 calls/月，超额后阻断 |

### 图片搜索降级链

1. webfetch 抓取含图片的页面 → 提取 img src
2. Firecrawl scrape（JS 渲染/懒加载图片：真实 URL 在 `data-src`/`currentSrc`）→ 提取 img src
3. Playwright 浏览器搜索（Google/Bing 图片搜索）→ 截图或提取 img src
4. 目标站内搜索（商品页、评测站）
5. 换关键词重试（英文名/品牌名/型号）
6. 仅在用户明确接受时才用占位符

### 图片转文字（OCR，零安装）

从图片里提取文字（mod 名、商品名、界面文字等）时，用 Windows 自带 OCR：

```powershell
# PowerShell 调用 Windows.Media.Ocr（Win10+ 自带，无需安装）
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
# 需 Await 异步封装（AsTask MakeGenericMethod），单张约 1-3 秒
```

- 中文/英文通用，`TryCreateFromLanguage("zh-Hans")` 优先，无中文包回退 UserProfile
- 批量处理写 `param([string]$ImgPath)` 脚本分批跑，结果 tab 分隔存 UTF-8
- 对游戏截图/网页截图（英文/中文标题）识别质量好；对创意工坊页截图能识别 mod 名
- 识别出的名称可用于后续搜索（如匹配 Steam 合集 ID）

### 批量获取 mod/物品 ID 技巧

抓大量 Steam mod 清单时，**优先找作者合集（collection）拿准确 ID**，比逐张 OCR 图片可靠：
- OCR 识别出的数字 ID 不可靠（易乱码）；用 OCR 名称 + 中文标题做关键词匹配合集条目
- 合集含准确 Workshop ID 列表（一次拿全部）
- 缺失项用 Exa 搜索补全（`steam community sharedfiles` 关键词）

### Exa 搜索类型

| 类型 | 适用场景 | 特点 |
|------|---------|------|
| `fast` | 快速事实查询、简单问题 | 延迟低，成本低 |
| `auto` | 通用搜索（默认） | 平衡速度与质量 |
| `deep` | 深度研究、需要引用 | 带引用的综合回答，成本最高 |

---

# 软路由专用：搜索与抓取工具规划（无浏览器环境）

> 引用自 AGENTS.md，软路由（iStoreOS 容器）专用。笔记本端内容见上方各节。

**软路由无浏览器（playwright 已禁用），抓取靠工具链分级。先判断站点类型，再选工具；先零成本（webfetch/curl），后消耗 credits（tavily/firecrawl）。**

## 定位原则：平板 CDP = 分级兜底，非日常主力

- **日常主力**用 API 类（exa 零成本 + tavily/firecrawl 额度制）：秒回、并行、不依赖外部设备
- **平板 CDP 做兜底而非日常**，原因：①依赖平板(192.168.3.21)在线，可能关机/休眠，不可作为软路由自治链路的主干；②慢（起浏览器渲染 10~60s）；③单次单页，批量效率低
- **其独特价值**（API 类给不了）：真实浏览器 JS 全渲染、反爬穿透最强、**无限量零成本**（不耗 credits）、走 OpenClash 可访问被墙站
- 触发场景：API 类全部失败 / 云端渲染失败 / 额度耗尽 / 需抓被墙海外站 / 大批量抓取需无限量通道

## 分级决策流程

1. **抓已知 URL**：`webfetch`（轻量首选）→ `curl`+浏览器 UA（探测/SSR 站/API 直调）→ 判定正文可直取
2. **JS 渲染/反爬站**（curl 只拿空壳）：`tavily extract` **必须带 `{"extractDepth":"advanced"}`**（basic 无效，实测 LRN-20260808-021）→ `firecrawl scrape`（备用，同为云端渲染）
3. **平板真实浏览器兜底**（tavily/firecrawl 云端渲染失败，或需抓被墙海外站如 Google/Wikipedia）：`python3 /root/cdp_tool.py fetch <url>` / `search <词>`——走平板(192.168.3.21:9223) headless Chromium，**国内站直连、被墙站自动走 OpenClash 代理**（见 LRN-20260809-009）
4. **降级拿片段**：`tavily search/QNA` 搜索缓存摘要；Wayback 快照（`web.archive.org/web/2/<URL>`，限流时冷却重试）
5. **查资料/概念**：`exa search`（语义搜索首选）→ `tavily search`
6. **编程库文档**：`context7`；**代码/仓库/issue**：`github`
7. **需登录/顶级反爬/付费墙**：列清单交笔记本浏览器

## curl 抓取技巧（零成本）

```bash
# 必须带浏览器 UA + Accept-Language，否则不少站直接拒
curl -sL -m 25 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept-Language: zh-CN,zh;q=0.9" <URL>
```

- SSR 站（Next.js/Nuxt 等）curl 直接有全文（实测 nextjs.org 416KB）；CSR 站先检查 HTML 内 `__NEXT_DATA__`/`__INITIAL_STATE__` 再解析

## Firecrawl 备用通道（curl 直调，MCP 偶发失败时用）

```bash
curl -s -X POST "https://api.firecrawl.dev/v2/scrape" \
  -H "Authorization: Bearer $(cat /root/.firecrawl_key)" -H "Content-Type: application/json" \
  -d '{"url":"<目标URL>","formats":["markdown"]}'
```

- 返回 JSON，正文在 `.data.markdown`；免费 1,000 credits/月，scrape=1 credit/页，search=2/10条

## 额度管理与边界

| 服务 | 额度 | 恢复 | 策略 |
|------|------|------|------|
| webfetch / curl | 无 | — | 首选，零成本 |
| exa | 订阅 key | — | 查资料主力 |
| context7 | 免费额度 | — | 仅库文档 |
| **tavily** | 1,000 credits/月 | **每月 1 号** | extract 慎用，省 credits |
| **firecrawl** | 1,000 credits/月 | 每月 | scrape 1/页，抓取补充 |

- 额度耗尽（429/402）记录到 ROUTER-ERRORS.md；tavily 下月 1 号自动恢复
- **已知不可用**（勿浪费时间）：r.jina.ai（出口 AS30058 被拉黑，401）、Firecrawl 无 key keyless（同 IP 403）、anybrowse（公共 IP 池已满）、wayback（IP 限流）、allorigins 类 CORS 代理（不渲染 JS）、exa fetch（反爬站超时）

## 根因说明

软路由出口 IP（AS30058，山东机房）**信誉差**，导致一切"无 key 按 IP 信誉限流"的免费渲染服务拒绝（r.jina.ai / Firecrawl keyless）。**解法：注册账号带 key，按账号限流即可绕开**——Firecrawl 免费 key 实测成功（LRN-20260808-021）。Cloudflare Worker 自建方案（fetch 10万/天 + Browser Rendering 仅 10 分钟/天，`CF-Worker` 头不可移除）已调研待搭建，见 ROUTER-LEARNINGS.md。
