# 社交媒体 & 社区

小红书、Twitter/X、B站、V2EX、Reddit、Facebook、Instagram、Discord。

**需要登录态的社交平台**：使用 Playwright Extension 工具（`playwright-extension` 命名空间），复用 Edge 浏览器的登录态。使用前确认 Edge 中已登录目标平台。

**示例：浏览小红书首页**
1. `browser_navigate(url="https://www.xiaohongshu.com")` 导航
2. `browser_snapshot()` 获取页面结构
3. 通过 element ref 交互：`browser_click(target="e5")`、`browser_type(target="e10", text="query")`
4. 提取数据可使用 `browser_evaluate(function="() => document.title")`

## 小红书 / XiaoHongShu

通过 Playwright Extension 访问，复用 Edge 中的小红书登录态。

```bash
# 1. 导航到小红书
browser_navigate(url="https://www.xiaohongshu.com")

# 2. 搜索：在搜索框输入关键词
browser_snapshot()  # 找到搜索框 ref
browser_type(target="e10", text="query", submit=true)

# 3. 读取页面内容
browser_snapshot()  # 获取搜索结果
```

### 注意事项

- 要求 Edge 打开且已登录小红书
- 小红书有反爬机制，避免高频请求，每次操作间隔 2-3 秒
- 建议只读操作，不执行发帖/评论/点赞

## Twitter/X

通过 Playwright Extension 访问，复用 Edge 中的 Twitter 登录态。

```bash
# 搜索推文
browser_navigate(url="https://x.com/search?q=query")
browser_snapshot()

# 读取推文内容
browser_navigate(url="https://x.com/USERNAME/status/TWEET_ID")
browser_snapshot()
```

## B站 / Bilibili

```bash
# 基础搜索无需登录
webfetch "https://search.bilibili.com/all?keyword=query"

# 登录态操作（评论、收藏、关注）
browser_navigate(url="https://search.bilibili.com/all?keyword=query")
browser_snapshot()
```

## V2EX

V2EX 有公开 API，无需登录即可访问。

```bash
# 热门话题
curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"

# 节点话题
curl -s "https://www.v2ex.com/api/topics/show.json?node_name=python"
```

## Reddit

通过 Playwright Extension 访问，复用 Edge 中的 Reddit 登录态。

```bash
browser_navigate(url="https://www.reddit.com/search/?q=query")
browser_snapshot()

# 访问 subreddit
browser_navigate(url="https://www.reddit.com/r/subreddit/")
browser_snapshot()
```

## Facebook

通过 Playwright Extension 访问，复用 Edge 中的 Facebook 登录态。

```bash
# 搜索
browser_navigate(url="https://www.facebook.com/search/top/?q=query")
browser_snapshot()

# 用户主页
browser_navigate(url="https://www.facebook.com/username")
browser_snapshot()
```

## Instagram

通过 Playwright Extension 访问，复用 Edge 中的 Instagram 登录态。

```bash
# 搜索
browser_navigate(url="https://www.instagram.com/explore/tags/keyword/")
browser_snapshot()

# 用户主页
browser_navigate(url="https://www.instagram.com/username/")
browser_snapshot()
```

## Discord

Discord 通过公开 API 访问服务器/邀请信息，无需登录。

```bash
# 验证邀请码
curl -s "https://discord.com/api/v10/invites/INVITE_CODE?with_counts=true"

# 获取服务器信息
curl -s -H "Authorization: Bot YOUR_BOT_TOKEN" "https://discord.com/api/v10/guilds/GUILD_ID"
```

**注意**：Discord 用户/频道消息需要用户 token（高风险操作），建议通过 Playwright Extension 复用 Edge 登录态访问。
