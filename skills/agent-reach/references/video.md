# 视频/播客

YouTube、B站、小宇宙播客的字幕和转录。

## YouTube (yt-dlp)

### 获取视频元数据

```bash
yt-dlp --dump-json "URL"
```

### 下载字幕

```bash
# 下载字幕 (不下载视频)
yt-dlp --write-sub --write-auto-sub --sub-lang "zh-Hans,zh,en" --skip-download -o "/tmp/%(id)s" "URL"

# 然后读取 .vtt 文件
cat /tmp/VIDEO_ID.*.vtt
```

### 搜索视频

```bash
yt-dlp --dump-json "ytsearch5:query"
```

## B站 / Bilibili

### 基础搜索（无需登录）

```bash
# 网页抓取
webfetch "https://search.bilibili.com/all?keyword=query"
```

### 登录态操作（评论、弹幕、下载等）

使用 Playwright Extension（`playwright-extension` 命名空间）访问：

```bash
# 搜索视频
browser_navigate(url="https://search.bilibili.com/all?keyword=query")
browser_snapshot()

# 视频详情页
browser_navigate(url="https://www.bilibili.com/video/BVxxx")
browser_snapshot()
```

> 不要用 yt-dlp 读 B站（风控已全面 412 拦截）。

## 小宇宙播客

暂未配置小宇宙转录工具。如需播客转录可告知用户。

## 选择指南

| 场景 | 推荐工具 |
|-----|---------|
| YouTube 字幕 | yt-dlp |
| B站视频搜索/详情 | webfetch / Playwright Extension |
| B站字幕 | Playwright Extension |
