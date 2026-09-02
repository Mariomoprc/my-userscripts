# 职场招聘

LinkedIn。通过 OpenCode 内置的 Playwright-edge 访问。

## LinkedIn

LinkedIn 需要登录态，使用 Playwright-edge（复用 Edge 浏览器登录态）。

```
# 方案：使用 Playwright-edge 导航到 LinkedIn
playwright-edge_browser_navigate(url: "https://www.linkedin.com/in/username")

# 或使用 webfetch 抓取公开资料
webfetch("https://www.linkedin.com/in/username")
```

### 备选方案

```bash
# Jina Reader 抓取公开页面
curl -s "https://r.jina.ai/https://linkedin.com/in/username"
```

> LinkedIn 限制严格，建议使用 Playwright-edge 配合已登录的 Edge 浏览器访问。
