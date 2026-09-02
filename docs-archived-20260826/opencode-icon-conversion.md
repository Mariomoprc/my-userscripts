# OpenCode 品牌图标转换（SVG → 透明 ICO）

从 opencode.ai/brand 获取品牌素材并生成**透明背景**多尺寸 .ico 的流程。

**相关经验**：LRN-20260807-081/082/083，ERR-20260806-009/010。

## 1 关键原则

- **取 SVG 源，勿用 PNG 预览**：品牌页的 PNG 预览带背景色（浅灰 `#F1F0F0` / 深色 `#252121`），直接转 ICO 会带背景色块；SVG 才是透明矢量源（LRN-20260807-081）
- 参考现有 `opencode-multi.ico`：6 条目（16/32/48/64/128/256）、32bpp PNG 压缩、透明背景

## 2 获取 SVG

品牌页 SVG 按钮是 JS 动态生成 blob URL 下载，静态 HTML 无 `.svg` asset 链接。用 Playwright：

1. 打开 `https://opencode.ai/brand`
2. 逐个点击各资产的 SVG 按钮，捕获 `download` 事件取 URL（文件自动落到 `.playwright-mcp\`）

```
btn.click() + page.waitForEvent('download') → download.url() / suggestedFilename()
```

## 3 SVG → 透明 PNG（Edge headless）

SVG 内联 HTML（data URI base64 + img flex 居中），Edge headless 截图，`--default-background-color=00000000` 使背景透明：

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $edge --headless=new --disable-gpu --hide-scrollbars --window-size=512,512 `
  --default-background-color=00000000 --screenshot="out.png" "file:///C:/path/render.html"
```

要点：
- viewBox 可能用单引号（`viewBox='0 0 240 300'`），正则需匹配 `['"]`
- 渲染后验证四角 alpha=0 确认透明
- **截图与后续读取分离**：Edge headless 在脚本内调用后立即读文件可能报 NotFound（异步落盘/实例复用），拆成独立脚本执行（ERR-20260806-010）

## 4 PNG → 6 尺寸 ICO

System.Drawing 从 512 透明 PNG 缩放到 16~256，PNG 压缩 entries + ICO header（同 opencode-multi 格式）：

```powershell
# 每个尺寸：Bitmap(size,size) → DrawImage(512源,0,0,size,size) → Save PNG bytes
# ICO header：reserved(2)+type(2)+count(2) + 每条目(16B) + PNG 数据
```

## 5 已知坑

- `.ps1` 含中文路径必须存 **UTF-8 BOM**，否则 PS 5.1 按 GBK 解析乱码 → `DirectoryNotFoundException`（ERR-20260806-009）
- Playwright `run_code_unsafe` 无 Node API（`require`/`fs`/`setTimeout` 均无），文件 IO 回落本地脚本（LRN-20260807-083）
