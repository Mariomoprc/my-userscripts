### 插件开发实战指南（基于剧情选择器开发经验）

#### 完整开发流程
1. 创建插件文件夹，编写 `manifest.json` + HTML 片段
2. `tavo_plugin_package(files: [{path:"...", text:"..."}], includeZipBase64: true)` → 打包并获取 zipBase64
3. `tavo_plugin_install(zipBase64: "...")` → 安装到手机测试
4. `tavo_plugin_set_enabled(id: "...", enabled: true)` → 启用
5. 重启聊天页面加载新插件
6. 如果插件不显示，检查用户是否开启：**设置 → 聊天设置 → 高级渲染**

**调试技巧**：`.tpg` 本质是 zip 文件，改 `.zip` 扩展名即可解压查看内容。

#### ⚠️ 编码注意事项（中文必读）

**问题**：Windows 系统默认编码 GBK，`Set-Content` 写入含中文的文件时如果没有指定 `-Encoding utf8`，中文会变成 GBK 编码。打包进 .tpg 后，在 Tavo（UTF-8 环境）或 GitHub（UTF-8）上显示为问号。

**正确的文件写入方式**：

```powershell
# ✅ 正确：显式指定 UTF-8 无 BOM
Set-Content -Path manifest.json -Value $jsonString -Encoding utf8 -NoNewline

# ✅ 或使用 .NET 方法
[System.IO.File]::WriteAllText("manifest.json", $jsonString, [System.Text.Encoding]::UTF8)

# ❌ 错误：默认 GBK 编码
Set-Content -Path manifest.json -Value $jsonString
```

**其他注意点**：
1. **HTML 文件中使用实际 UTF-8 字符**，不要用 `\uXXXX` 转义序列（`tavo_plugin_package` 的 JsonEscape 会双重转义）
2. **emoji 用 surrogate pair**：`[char]0xD83C + [char]0xDFB2`，不是 `\uD83C\uDFB2`
3. **验证编码**：打包前用 `[System.IO.File]::ReadAllBytes("file.json")` 检查十六进制，确认中文字节的 UTF-8 编码正确（如 `剧情` = E5 89 A7 E6 83 85）
4. **Compress-Archive** 不支持 `.tpg` 扩展名，需先 `.zip` 再 `Copy-Item` 改后缀
5. **7-Zip 可直接输出 .tpg**（推荐）：`& 'C:\Program Files\7-Zip\7z.exe' a -tzip output.tpg file1 file2` — 一步到位，无需二次改名
6. **`Invoke-RestMethod` 返回的对象**用 `ConvertTo-Json -Depth 10` 再写入，而不是直接 `Set-Content`

**发布流程**（⚠️ 必须先本地测试通过再推 GitHub）：
1. 本地修改源码（`manifest.json` + `cyoa.html` / `panel2.html` 等）
2. 手动打包 `.tpg`（`7z a -tzip output.tpg file1 file2` 或 `Compress-Archive` → 改 `.tpg`）
3. MCP `tavo_plugin_install` 安装到手机 → 测试功能
4. **测试通过后**，才推源码到 GitHub main 分支
5. 用 `gh release create/upload` 创建 Release 并上传 `.tpg`
6. GitHub Release 链接发 Discord（详见发布流程部分）

**原因**：先推 GitHub 再测试，Release 可能包含有问题的版本。必须本地验证通过再推送。

#### ⚠️ MCP 安装必读：zipPath 不可用

**问题**：Tavo MCP `tavo_plugin_install` 的 `zipPath` 参数在本地开发时无效。

```json
// ❌ 不工作：Android 设备无法访问 Windows 路径
{ "zipPath": "C:\\Users\\...\\plugin.tpg" }
// → PathNotFoundException: Cannot open file (errno = 2)

// ✅ 必须用 zipBase64 传文件内容
{ "zipBase64": "UEsDBBQAAAAIA..." }
```

**正确做法**（Windows PowerShell）：
```powershell
$base64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("plugin.tpg"))
# 将 $base64 传入 zipBase64 参数
```

#### 常见 Bug 模式：缓存优先于模式判断

**问题**：在 HTML 片段插件的 `togglePanel()` 函数中，如果先检查缓存再检查当前模式/风格，会导致缓存命中时永远无法显示系统类页面（如系统提示）。

```javascript
// ❌ 错误顺序：缓存优先
if (cachedItems && !stale) {
  renderOptions(cachedItems);  // 永远命中，后面 sys 分支走不到
} else if (currentStyle === 'sys') {
  showSystemPrompts();
}

// ✅ 正确顺序：先检查特殊模式
if (currentStyle === 'sys') {
  showSystemPrompts();  // 系统提示优先渲染
} else if (cachedItems && !stale) {
  renderOptions(cachedItems);
}
```

**原则**：任何有缓存 + 特殊模式的 UI，必须先将特殊模式检查前置。

#### 提示词设计原则：跨卡兼容

**问题**：插件提示词中硬编码特定世界书机制（好感度系统、NSFW 阶段、角色敏感点）会使插件只适用于单张角色卡。

```javascript
// ❌ 卡专属：绑定某张卡的世界书
'...参考好感度系统，触碰敏感点可大幅提升好感度...'

// ✅ 跨卡通用：使用条件句式
'...如果上下文中有攻略路线或好感度条件，优先生成满足这些条件的选项...'
```

**原则**：插件提示词应当是无状态的、跨角色卡通用的。用「如果有...则...」的条件句式，而不是直接引用特定机制。

**注意（MCP 安装关键）**：MCP `tavo_plugin_install` 的 `htmlFragments` 丢失**不是 MCP bug**，而是 manifest 格式问题。Tavo 的 manifest parser **只识别 `contributes.htmlFragments`**（带 `contributes` 包装），顶层的 `htmlFragments` 字段会被忽略。

```jsonc
// ❌ 错误：顶层 htmlFragments → MCP 安装会丢弃
{ "id": "...", "htmlFragments": [...] }

// ✅ 正确：contributes.htmlFragments → MCP 安装完整保留
{ "id": "...", "contributes": { "htmlFragments": [...] } }
```

如果已安装插件的 `features` 和 `htmlFragments` 都是空数组，说明 manifest 格式不对。用正确格式重新打包安装即可，无需等官方修复。

#### manifest.json 关键格式

##### specVersion 2（Tavo 0.93.0+ 推荐）
```json
{
  "specVersion": 2,
  "id": "com.author.plugin-name",
  "name": "显示名称",
  "version": "1.0.0",
  "description": "插件简介",
  "localization": { "defaultLocale": "zh-CN" },
  "minAppVersion": "0.93.0",
  "permissions": ["input", "message", "generate", "variable", "file", "network"],
  "entry": "actions.js",
  "contributes": {
    "sidebar": [
      { "id": "dashboard", "label": "信息面板", "icon": "📊" }
    ],
    "inputActions": [
      { "id": "insert-template", "label": "插入模板" }
    ],
    "htmlFragments": [
      { "id": "main", "src": "fragments/index.html", "mount": "/chat/body/end" }
    ],
    "settings": {
      "schema": [
        { "key": "enabled", "type": "switch", "label": "启用", "default": true }
      ]
    }
  }
}
```

##### specVersion 1（兼容旧版 Tavo 0.91.0+）
```json
{
  "id": "com.author.plugin-name",
  "name": "显示名称",
  "version": "1.0.0",
  "specVersion": 1,
  "description": "插件简介",
  "minAppVersion": "0.91.0",
  "permissions": ["input", "message", "generate", "variable", "file", "network"],
  "scripts": { "actions": "actions.js" },
  "contributes": {
    "htmlFragments": [
      { "id": "main", "src": "index.html", "mount": "/chat/body/end" }
    ],
    "settings": {
      "schema": [
        { "key": "enabled", "type": "switch", "label": "启用", "default": true }
      ]
    }
  }
}
```

**关键字段说明**：

| 字段 | 说明 | 必须 |
|------|------|------|
| `id` | 唯一标识（反向域名格式） | ✅ |
| `specVersion` | 插件规范版本。v1（旧版）、**v2（0.93.0+ 新版，推荐）** | ✅ |
| `version` | **v2 强制 SemVer**（`major.minor.patch`），`-patch` 后缀非法；v1 任意非空字符串即可 | ✅ |
| `localization` | **v2 必需**，至少声明 `defaultLocale`；可选的 `resources` 映射语言包文件 | v2 ✅ |
| `entry` | 入口脚本路径（替代旧版 `scripts.actions`） | 有 sidebar/inputActions 时必填 |
| `minAppVersion` | 最低 Tavo 版本要求。**v2 强制校验**，低于此版本拒绝安装 | 插件推荐 |
| `author` | 作者名称（显示在插件详情页） | 可选 |
| `description` | 简短描述（显示在插件列表/详情页） | 可选 |
| `cover` | 封面图片路径（相对路径，显示在插件详情页） | 可选 |
| `permissions` | 所需权限数组 | 功能相关时必填 |
| `contributes.sidebar` | 侧边栏按钮列表（需配合 entry） | 可选 |
| `contributes.inputActions` | 输入框动作列表（工具栏/右键菜单） | 可选 |
| `contributes.htmlFragments` | HTML 片段列表 | 有 UI 时必填 |
| `contributes.settings.schema` | 设置面板配置 | 可选 |

**注意:** 
- `entry` 是 v0.91.0+ 的新字段，替代 `scripts.actions`。同时存在时 `entry` 优先。
- **i18n（v2 新增）**：`name`、`description`、`inputActions.label`、`sidebar.label`、`settings.label` 等字符串字段支持 `{ "$t": "locale.key" }` 语法实现国际化。需配合 `localization.resources` 中的语言包文件使用。
- **版本兼容**：Tavo 0.92.x 及以下**不支持 specVersion 2**。升级到 0.93.0 方可使用 v2 插件。

**.tpg 文件格式**：本质是标准 zip 文件。将扩展名改为 `.zip` 即可用解压工具打开查看。内部结构：
```
plugin.tpg
├── manifest.json        # 插件描述文件（必需）
├── actions.js           # 后台脚本（可选）
├── fragments/           # HTML 片段目录
│   ├── bootstrap.html
│   └── message-tail.html
├── assets/              # 资源目录（可选）
│   └── bridge-regex.json
└── ui/                  # UI 文件目录（可选）
    └── panel.html
```

### 插件发布流程

**GitHub 仓库**: `https://github.com/Mariomoprc/tavo-plugins`

发布新版本时应使用 GitHub Release，不再手动上传到 Discord：

1. 更新 `manifest.json` 中的 `version` 字段（**必须递增版本号**，如 `1.9.8` → `1.9.9`，禁止加 `-patch` 后缀）
2. 用 MCP `tavo_plugin_package` 打包 `.tpg` 文件（MCP 离线时手动 `Compress-Archive` zip 后改 `.tpg`）
3. 将源码推送到 GitHub（`plugins/<plugin-id>/` 目录）
4. 用 `gh` CLI 创建 GitHub Release：
   ```powershell
   $env:HTTPS_PROXY = "http://127.0.0.1:7890"
   gh release create "<plugin-id>-v<semver>" --repo "Mariomoprc/tavo-plugins" `
     --title "[插件名] v版本号" --notes "变更说明"
   gh release upload "<plugin-id>-v<semver>" "path/to/file.tpg" `
     --repo "Mariomoprc/tavo-plugins"
   ```
5. 更新 README 中的版本表
6. 更新 GitHub README.md 插件列表中的版本号和下载链接
7. 仅在 Discord 发布简短更新说明 + GitHub Release 链接

#### HTML 片段开发要点
- **必须动态创建 DOM**: 所有元素通过 `doc.createElement()` + `doc.body.appendChild()` 添加
- **doc 降级**: `var doc = window.top ? window.top.document : document; if (!doc || !doc.body) { doc = document; }` — 不能 `return`
- **高级渲染必需**: 插件 HTML 片段需要用户开启 **设置 → 聊天设置 → 高级渲染**，否则无法显示（0.91.0+）
- **样式注入**: `var s = doc.createElement('style'); s.textContent = '...'; doc.head.appendChild(s);`
- **Unicode 规避**: HTML 文件中所有中文和 emoji 必须使用**实际 UTF-8 字符**，绝不使用 `\uXXXX` 转义序列（`tavo_plugin_package` 的 JsonEscape 会双重转义）
- **正则规避**: JS 正则中的 `\s` `\S` `\/` 会被 JsonEscape 双重转义，用 `string.split()` 代替正则解析
- **MutationObserver**: 监听 DOM 变化以重新注入元素（Tavo 可能重建 DOM）
- **按钮顺序管理**: 多个插件注入工具栏时，`appendChild` 依赖加载顺序不可靠。用 `insertBefore(btn, targetBtn.nextSibling)` 插入指定位置，`compareDocumentPosition` 动态修正顺序
- **事件委托**: 大量相同元素（如可点击名字）用父元素 `addEventListener` 处理子元素点击，避免每个元素单独绑 handler
- **异步 API 注意**: `tavo.input.get()` 是 async 返回 Promise，必须 `await`；`tavo.input.set()` 替换整个输入框，需先 `get()` 再 `set(cur + name)` 追加
- **clipboard 不可靠**: 安卓 webview 中 `execCommand('copy')` 仅首次有效，后续复制可能不生效。用 `tavo.input.set()` 直接填输入框更可靠

#### 内容渲染最佳实践
- **可点击名字**: 用 `<div>` + `innerHTML` 替代 `<pre>` + `textContent`，名字包裹 `<span class="rel-name" data-name="xxx">`，CSS 蓝色虚线底表示可点击
- **名字提取**: 正则 `## 名字（角色）` > AI 提取 > 回退 `ch.name`。AI 可能提取到非角色名（情绪词、描述词）
- **多角色卡 vs 单角色卡**: 多角色卡有 `## 名字（角色）` 结构，正则可靠；单角色卡无此结构，需 `ch.name` 回退
- **JSON 返回保护**: `tavo.generate()` 可能返回非 JSON 纯文本，用 `indexOf('{')` + `lastIndexOf('}')` 截取 JSON 部分
- **空数组 truthy 陷阱**: `[] || func` 取到 `[]` 不 fallback，正确写法 `(arr && arr.length > 0) ? arr : func`
- **响应式面板**: 固定宽度 `380px` 在小屏幕溢出，用 `width:min(380px,100vw)`；内容容器加 `overflow:hidden;word-break:break-word;max-width:100%`
- **AI 超时平衡**: 消息数×字数 = 上下文量，8×150=1200字 + 35s 超时是可行平衡
- **读秒计时器**: `setInterval` 每 500ms 更新 `#timer` 元素显示耗时。使用模块级 `genTimer` 变量管理，`clearInterval` 在 await 后、catch 中、失败 return 前都要清理。关闭面板时也应清理，防止重复 timer 导致闪烁
- **计时器起始值**: 用 `Math.ceil` 替代 `Math.floor`，初始值从 1 开始（`<span>1</span>s`），避免显示 0s
- **自适应消息数**: AI 分析类功能不要硬编码消息数。用 `tavo.set/get` 存储用户偏好，分析失败时自动重试不同数量（如 6→10→2），成功后保存最优值
- **上下文累积**: 增量分析时将上次结果拼入 prompt，让 AI 在旧基础上追加新内容，分析越来越丰富：
  ```js
  var oldCtx = state.storyline ? ('上次分析:' + state.storyline.summary + '\\n') : '';
  var prompt = oldCtx + '[任务]参考上次分析追加新剧情...';
  ```
- **设置存储**: 插件设置不要依赖 `tavo.plugin.config.get()`（htmlFragments 中不可用），改用 `tavo.get/set(key, value, 'global')` 实现跨聊天持久化
- **Error 边界**: 每个 async 操作加 try/catch，用户操作加 try/catch，显示 toast/retry 按钮而非崩溃
- **花括号平衡验证**: 用字符串替换修改 JS 插件代码后，必须验证 `{` 和 `}` 数量一致，否则整个 `<script>` 因语法错误不执行（injectBtn 也会失效）
- **busy 锁优化**: 单纯 `busy=false` 不够，旧 `doGen()` 的 finally 可能覆盖新状态。用 `genSeq` 计数器 + `curSeq !== genSeq` 丢弃过期结果
- **选项缓存**: 生成后用变量缓存选项列表，关闭重开直接显示缓存（秒出），无需每次调 AI
- **缓存失效**: 缓存选项时记录消息数（`tavo.message.find([]).length`），打开时对比，有新消息则自动重新生成
- **可拖动面板**: `position:fixed` 面板每次打开居中（`pn.style.left/top`），拖动时用 `offsetLeft/offsetTop` 实时计算，不记忆位置（更简单）
- **拖动事件处理**: `mousedown/touchstart` 记录起始坐标 → `mousemove/touchmove` 实时更新 `left/top`（`passive:false` 防触控滚动） → `mouseup/touchend` 清理事件监听

#### AI 输出标签格式（社区通用）

| 标签 | 格式 | 用途 | 示例 |
|------|------|------|------|
| `<recap>` | `<recap>内容</recap>` | 微信模块传递聊天内容 | `<recap>用户和角色的对话摘要</recap>` |
| `<scene>` | `<scene id="xxx">描述</scene>` | 生图模块传递场景描述 | `<scene id="raven_001">花园中的对话</scene>` |
| `<update>` | `<update>变量更新</update>` | 小手机状态更新 | `<update>{"mp_statusbar":"HP:100"}</update>` |
| `<suggestion>` | `<suggestion>选项</suggestion>` | 剧情选择器生成选项 | `<suggestion>探索花园</suggestion>` |
| `<story>` | `<story>内容</story>` | 渡鸦生图故事渲染 | `<story data-siko="1">场景描述</story>` |
| `<char-def>` | `<char-def name="名字">定义</char-def>` | 渡鸦生图角色DNA | `<char-def name="张三">tags: 1girl</char-def>` |

**注意**：AI 输出的标签必须用英文标签名，中文标签会导致格式错误。正则需要用 `([\s\S]+?)` 捕获内容。

#### manifest 贡献类型参考

基于 `fsj-official-release`（第五季果汁 v3.1.0）和 `com.tizenry.duya-shengtu`（渡鸦生图 v7.3.0）的 manifest 源码：

```json
{
  "id": "com.author.plugin-id",
  "name": "插件名",
  "version": "1.0.0",
  "specVersion": 1,
  "author": "作者名",
  "description": "描述",
  "minAppVersion": "0.91.0",
  "permissions": ["input", "message", "generate", "variable", "file", "network"],
  "scripts": {
    "actions": "actions.js"
  },
  "contributes": {
    "sidebar": [
      { "id": "dashboard", "label": "信息面板", "icon": "📊" },
      { "id": "settings", "label": "设置", "icon": "⚙️" }
    ],
    "inputActions": [
      { "id": "insert-template", "label": "插入模板" }
    ],
    "htmlFragments": [
      { "id": "bootstrap", "src": "fragments/bootstrap.html", "mount": "/chat/body/end" },
      { "id": "message-bridge", "src": "fragments/message-tail.html", "mount": "/messages/end?role=character&position=last" }
    ],
    "settings": {
      "schema": [
        { "type": "info", "text": "说明文字", "icon": "info" },
        { "type": "divider" },
        { "key": "enabled", "type": "switch", "label": "启用", "default": true },
        { "key": "api_key", "type": "text", "label": "API Key", "default": "" },
        { "key": "model", "type": "select", "label": "模型", "default": "nai", "options": ["nai", "openai"] },
        { "key": "prompt", "type": "textarea", "label": "提示词", "default": "" }
      ]
    }
  }
}
```

| 贡献类型 | 说明 | 用途 |
|---------|------|------|
| `sidebar` | 侧边栏按钮 | `actions.js` 中用 `onSidebarAction` 监听 |
| `inputActions` | 输入框动作 | 工具栏/右键菜单，用 `onInputAction` 监听 |
| `htmlFragments` | HTML 片段 | 挂载到 DOM 指定位置 |
| `settings.schema` | 设置面板 | 自动生成设置 UI，支持 7 种字段类型 |
| `scripts.actions` | 后台脚本 | 无 UI 逻辑，页面加载即运行 |

**关键规则**：
- `entry`（或旧版 `scripts.actions`）在页面加载时运行，适合注册事件
- ⚠️ **`entry.js` 只会在有 `sidebar` 或 `inputActions` 贡献时执行**。若仅有 `htmlFragments`，`entry.js` 不会被加载
- `htmlFragments` 的 JS 在挂载到 DOM 后运行，是插件功能的主要入口
- `sidebar` 和 `inputActions` 必须配合 `entry` 使用
- 不声明 `permissions` 仍可调用部分 API（可能受限）
- ⚠️ **htmlFragment（iframe 环境）限制**：
  - 不可在 `window.top.document` 上注册全局事件监听器（`mousemove`、`mouseup` 等），会导致整个插件不加载
  - 不可在 `mousedown`/`touchstart` 上调用 `e.preventDefault()`
  - 如需拖拽功能，用 `entry.js` + `inputActions` 在主页面上下文实现
  - 修改插件文件时优先用 `edit` 增量修改，避免用 `write` 重写整个文件（可能改变编码）

#### ⚠️ 滚动保护（Scroll Guard）反模式

**不要**在 htmlFragment（iframe）中实现 scroll 保护逻辑。Tavo 插件尝试阻止生成完成后自动滚动到底部的功能在**经过 7 轮迭代修复后确认不可靠**。

**失效原因（按影响从大到小）：**

| 问题 | 说明 |
|------|------|
| **iframe 离屏节流** | htmlFragment 在 iframe 中运行，用户滚动阅读旧消息时 iframe 离屏，`requestAnimationFrame` 被节流到 ~1fps，`setInterval`/`setTimeout` 延迟严重 |
| **`generation:prepare` 时机太晚** | Tavo 渲染用户消息并滚动到底部后才触发 `generation:prepare`，此时 scrollTop 已是 0，无法保存用户阅读位置 |
| **`input:beforeSend` 需 `"input"` 权限** | `input:beforeSend` 是唯一早于 Tavo 渲染的 hook，但需要 manifests 中 `"permissions": ["input"]` |
| **用户可能在发送后才滚动** | `input:beforeSend` 在发送瞬间保存位置，但用户可能在生成过程中滚动到别处，需 scroll 事件监听动态切换 |
| **`scrollIntoView` 绕过 `scrollTo` patch** | Tavo 使用 `lastMessage.scrollIntoView()` 滚动到底部，`Element.prototype.scrollTo` 的 patch 无法拦截 |
| **500ms 窗口过后无法区分滚动来源** | `lastUserSignal` 过期后，无法区分用户手动滚动和程序化滚动 |

**如果仍要尝试，必须满足以下条件（仍不保证可靠）：**

1. **逻辑放在 entry.js 中**（主窗口执行），htmlFragment 仅显示 UI 按钮
2. `manifest.json` 必须有 `"permissions": ["input", "generate"]`
3. 在 `input:beforeSend` hook 中捕获 scroll position（早于 Tavo 渲染）
4. 在 scroll 事件监听器中检测生成期间的用户滚动，动态切换到 hold 模式
5. 同时 patch 两个原型方法：
```js
var _origST = Element.prototype.scrollTo;
Element.prototype.scrollTo = function () {
  if (/* hold mode */ && /* target near bottom */) return;
  return _origST.apply(this, arguments);
};
var _origSIV = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (opts) {
  if (/* hold mode */ && /* element inside protected container */) return;
  return _origSIV.apply(this, opts);
};
```
6. 在 `generation:success` 和 `message:added` 时激活 3.5s 保护窗口（`beginFinalizationGuard`）
7. `scrollTop` 的直接赋值（`element.scrollTop = 0`）在 prototype 层无法可靠 patch

**最终警告：** 即使满足上述所有条件，Tavo 的 Flutter WebView 可能通过原生滚动机制（Flutter ScrollController）完全绕过 DOM 层。滚动保护插件在 Tavo 中**无法可靠实现**。

### Release .tpg vs 仓库源码差异

**⚡重要：GitHub 仓库源码与 Release .tpg 文件内容可能不一致。**

- Release 的 .tpg 文件包含更新后的代码（如 `#rel-bar` CSS）
- GitHub 仓库源码可能是旧版本，缺失部分样式/功能
- **始终以 Release 的 .tpg 文件作为修改基准**
- 从 GitHub Releases 下载 `.tpg` 文件解压后修改

### 缓存持久化

**缓存不应存储在 `chars[]._summary` 上，应使用独立字段：**

```javascript
// 在 state 上独立存储
state._cachedSummary = summary;

// 读取时优先读独立缓存，其次 chars
var cached = state._cachedSummary || (state.chars[0] && state.chars[0]._summary);
```

原因：`state.chars` 可能在轮询间隔或 `loadData()` 中被重建（`state.chars = []`），导致 `chars[]._summary` 丢失。

### AI 输出解析链

AI 输出可能是 JSON、Markdown 或纯文本，使用多级回退解析：

```
JSON.parse() → 提取 {} 中的 JSON → Markdown 解析 → 原始文本显示
```

```javascript
function formatSummary(result, dur) {
  var text = result.trim();
  try { return jsonToHtml(JSON.parse(text), dur); } catch(e) {}
  var m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return jsonToHtml(JSON.parse(m[0]), dur); } catch(e) {} }
  return mdToHtml(text, dur);
}
```

### `write` 工具编码警告

**⚡使用 `write` 工具保存插件 HTML 文件会改变文件编码！**

- GitHub 原始 panel2.html：27515 字节
- `write` 工具保存后：29309 字节（多 1794 字节）
- Unicode 转义序列被展开为原始 UTF-8 字符
- 行数增加（插入额外换行）

**规则**：
1. ✅ 用 `edit` 做增量修改（不改变编码）
2. ❌ 不用 `write` 重写整个 HTML 文件
3. ✅ 需要新文件时，从 GitHub Release 下载 .tpg 解压后使用
4. ✅ 安装前 `node --check` 验证 JS 语法
5. ✅ 安装后用 `tavo_plugin_get_runtime_contributions` 验证代码

### Debug 方法论

**遇到 bug 时不要轻易归咎于外部系统，先检查自己的代码：**

1. **找工作版本对比**：如果另一个进程的同样修改能工作，问题一定在你的代码
2. **文件级别 diff**：`fc`（Windows）或 `diff`（Linux/macOS）对比工作版和你的版本
3. **逐个回退**：一个改动一个改动回退测试，找到具体哪处修改导致问题
4. **确认基线一致**：确保你的基线文件与工作版本相同（Release 的 .tpg 而非仓库源码）

**反例**：本会话中我修改后按钮消失，第一时间怀疑 Tavo/MCP 损坏，但实际根因是用了 GitHub 仓库源码（缺按钮 CSS）而非 Release .tpg 做基线。

**正例**：用 `diff` / `Compare-Object` 对比工作版 .tpg 和 GitHub 源码，立即发现 CSS 缺失。

#### 插件事件钩子（v0.91.0+）

插件可以通过 `tavo.plugin.on(event, handler)` 注册事件钩子。需在 `entry` 中注册（HTML 片段无法注册）。

##### Chat/Message 通知

| 事件 | 触发时机 |
|------|---------|
| `chat:opened` | 当前聊天打开时 |
| `chat:closed` | 离开或切换到其他聊天时 |
| `chat:updated` | 聊天元数据变更（标题/角色/人物/预设/世界书/记忆/背景） |
| `chat:changed` | chat:updated 的兼容别名 |
| `message:added` | 消息保存到聊天后触发（流式生成完成时，非每 token） |
| `message:updated` | 已保存消息的内容或元数据变更 |
| `message:deleted` | 消息从聊天中移除 |
| `message:changed` | umbrella 事件，以上三者之后统一触发 |

**事件对象字段**：`type`（事件类型）、`pluginId`、`at`（ISO 时间戳）。聊天事件含 `chatId`、`chat`；消息事件含 `chatId`、`change`、`message`。

```js
// entry.js
tavo.plugin.on('chat:opened', async (event) => {
  console.log('opened', event.chat?.name || event.chatId);
});
tavo.plugin.on('message:changed', async (event) => {
  console.log(event.type, event.change, event.message?.id, event.at);
});
```

##### 生成生命周期钩子

需要声明权限 `"permissions": ["generate"]`。仅在 entry 中注册，HTML 片段不可用。

| 事件 | 时机 | event.text 可变 |
|------|------|:---:|
| `generation:prepare` | 模型请求开始前 | ✅ 修改最后一次用户消息 |
| `generation:success` | 生成完成后、保存到聊天前 | ✅ 修改 AI 回复（非空才生效） |
| `generation:error` | 生成失败时 | ❌ event.error.code/message |
| `generation:cancelled` | 生成取消时 | ❌ event.partial（是否已有部分内容） |

```js
tavo.plugin.on('generation:prepare', async (event) => {
  event.text = '[Model-only context]\n' + event.text;
});
tavo.plugin.on('generation:success', async (event) => {
  event.text = event.text.trim();
});
tavo.plugin.on('generation:error', async (event) => {
  console.error(event.error.code, event.error.message);
});
tavo.plugin.on('generation:cancelled', async (event) => {
  console.log('stopped', event.partial);
});
```

**注意**: 每个 handler 限时 5 秒，超时/异常会忽略变更继续生成。覆盖 `reply`、`groupReply`、`continuation`、`othersContinuation`、`regeneration`，不包括图片/语音/纯 JSAPI 生成。

##### 输入发送钩子

需要声明权限 `"permissions": ["input"]`。

- `input:beforeSend` — 发送前拦截，可调用 `event.cancel(reason?)` 取消
- `input:afterSend` — Tavo 接受输入后通知（不等模型生成）

```js
tavo.plugin.on('input:beforeSend', async (event) => {
  event.text = event.text.trim();
  if (!event.text.includes(':')) event.cancel('请添加说话人名称');
});
tavo.plugin.on('input:afterSend', async (event) => {
  console.log('accepted input:', event.text);
});
```

**注意**: `input:beforeSend` 在宏和斜杠命令解析前运行。`text` 是唯一可变字段。handler 限时 5 秒，超时/异常忽略变更。

#### 工具栏按钮注入
```js
// 注入到 Tavo 底部工具栏（刷新/继续/灵感旁边）
var bars = doc.querySelectorAll('.tav-action-bar');
var bar = null;
for (var i = 0; i < bars.length; i++) {
  if (bars[i].children.length >= 3 && bars[i].querySelector('button')) {
    bar = bars[i];  // 筛选底部主工具栏（3+按钮）
  }
}
var btn = doc.createElement('button');
btn.className = 'tav-action-bar-button';
btn.textContent = '🎲';
bar.appendChild(btn);
```

#### 插件分享格式（Discord #🧩丨插件分享 频道）
- **标题**: `[插件] 名称 | 用途/平台`
- **内容**: 插件用途 + 来源作者 + 安装方式 + 注意事项
- **推荐**: 只发 GitHub Release 链接，详细说明放在 Release Notes 中
- **必须**: 标来源、写说明、说风险
- **禁止**: 无来源转载、付费/破解、恶意代码、诱导输入 Token

## 插件开发进阶（基于社区热门插件源码研究）

### 社区热门插件架构模式

基于 Discord #🧩丨插件分享 频道研究 + 已安装插件源码逆向分析。数据截至 2026-07-18。

#### 架构趋势：正则+插件混合

社区主流插件从纯正则演进到「正则做识别/渲染 + 插件做面板/逻辑」的混合架构：

| 层 | 职责 | 工具 | 示例 |
|----|------|------|------|
| 识别层 | 从 AI 输出中提取结构化数据 | 正则 | `<scene>`、`<update>` 标签解析 |
| 渲染层 | 在聊天中注入可视化元素 | 正则 (JSR) | 图片显示、状态栏 |
| 逻辑层 | 面板交互、设置管理、API 调用 | 插件 (HTML) | 生图面板、记忆系统、语音合成 |
| 持久层 | 跨聊天存储数据 | 插件 (variable/file) | 图库、配置、缓存 |

#### 热门插件功能分类

| 分类 | 代表插件 | 作者 | 热度 | 核心 API 依赖 | ID |
|------|---------|------|------|--------------|-----|
| 🧠 记忆系统 | 第五季果汁记忆插件 | 第五季果汁 | 🔥🔥🔥 55msg 23👍 | variable + file + generate + network | `fsj-official-release` |
| 🖼 生图 | 渡鸦生图插件 | 渡鸦4455 | 🔥🔥🔥 128msg 19🤙 | network + file | `com.tizenry.duya-shengtu` |
| 📱 状态管理 | 小手机/模块化小手机 | ray | 🔥🔥🔥 195msg 16👍 | variable + 正则桥接 | `com.user.app-simulator` |
| 🧠 记忆摘要 | ST Port - Summaryception | clowuds | 🔥🔥 74msg 13🔥 | generate + message + variable | `com.clowuds.summaryception` |
| 📖 故事追踪 | Deep Story Reforged Lite | Jeppster | 🔥🔥 73msg 5❤️ | generate + message + variable | `com.jeppster.deepstory` |
| 🎭 状态管理 | 清露终端V1.0 | 清露 | 🔥🔥 18msg 25👍 | variable + 正则桥接 | `com.luna-miniphone` |
| 🎮 互动选项 | 剧情选择器 | slime | 🔥 20msg 11👍 | generate + input | `com.cyoa.choices` |
| 🔊 TTS/语音 | 渡鸦语音馆 | 渡鸦4455 | 🔥 15msg 8👍 | network + message + Workers | — |
| 📖 角色信息 | 角色资料面板 | slime | 🔸 3msg 3👍 | character + chat + generate | `com.relationship.panel` |
| 🎨 内心独白 | Unspoken Thoughts | strawberrykitty | 🔸 9msg 4💖 | generate + variable | `com.strawberrykitty.unspokenthoughts` |
| 💞 情感追踪 | CCT - Relationship Tracker | clowuds | 🔸 11msg 5❤️ | generate + message + variable | `com.clowuds.cct-relation` |
| 🌤️ 场景装饰 | Scenekeeper | strawberrykitty | 🔸 4msg 2💖 | variable + generate | `com.strawberrykitty.scenekeeper` |

### 小手机插件模块化架构（ray）

基于 Discord 帖子 `1526647413291352214` 研究。小手机是社区最活跃的插件（156消息 12👍 + 106消息 7👍），采用模块化架构，5个独立模块协同工作。

#### 模块架构

```
小手机插件 (com.luna-miniphone)
├── 联系人模块 — 角色绑定、头像管理、关键词触发
├── 微信模块 — 私聊/群聊、<recap> 标签内容传递
├── 朋友圈模块 — 角色动态发布、公私平台切换
├── 微博模块 — 一键发帖、AI 回复+图片生成
└── 图库模块 — 图片保存、删除、来源选择
```

#### 模块 1：联系人模块

**功能**：选择角色 → 绑定到联系人列表 → 关键词触发特定角色

**实现要点**：
- 角色头像标注（标注哪个模块创建）
- 关键词触发：只有角色在列表中时才触发对应功能
- 群聊：选择多个联系人创建群组

**关键词触发模式**：
```
用户输入包含关键词 → 正则匹配 → 查找联系人列表 → 确定目标角色 → 生成回复
```

#### 模块 2：微信模块

**功能**：模拟微信私聊/群聊，角色通过 API 获取聊天内容

**核心格式** — `<recap>` 标签：
```
AI 输出：<recap>聊天内容摘要</recap>
正则捕获：<recap>([\s\S]+?)</recap>
插件处理：将内容保存到联系人，角色"知道"微信发生了什么
```

**工作流程**：
1. AI 生成回复时输出 `<recap>` 标签包裹的聊天内容
2. 正则从 AI 输出中提取 `<recap>` 内容
3. 插件将内容保存到对应联系人
4. 角色在后续对话中可以引用微信内容

#### 模块 3：朋友圈模块

**功能**：角色发布动态，支持公私平台切换

**实现要点**：
- 不同设置控制是否允许发布
- 发布内容发送到 API，角色知道自己的朋友圈动态
- 支持查看、点赞、评论

#### 模块 4：微博模块

**功能**：一键发帖，AI 生成回复+图片

**图片生成集成模式**：
```
1. 用户点击发帖按钮
2. 调用 API 获取 AI 回复（含显示文本）
3. 自动生成图片（使用配置的图片 API）
4. 将图片和文本一起显示
5. 同一对话可以重复生成（不同回复）
```

**图片 API 格式**（三道竖线分隔）：
```
提示词标签要用英文
用 ||| 字符分隔不同部分
格式错误时会报错
```

#### 模块 5：图库模块

**功能**：保存生成的图片，支持查看/删除/来源选择

**实现要点**：
- 生成的图片自动保存到图库
- 支持删除聊天记录时保留图片
- 选择图片来源（本地图/网络图）
- 无 API 密钥时禁用图片生成功能

#### 社区常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 格式错误 | 提示词标签用中文 | 改用英文标签 |
| 分隔符错误 | 未用 `\|\|\|` 分隔 | 使用三道竖线格式 |
| 密钥不能粘贴 | 输入框限制 | 检查输入框权限 |
| NSFW 选项显示 | 分级过滤未配置 | 部署时有 NSFW 选项选择 |
| 楼层显示缺失 | 插件未实现 | 需要手动输入或等待更新 |
| 微信图片报错 | 格式不正确 | 确保标签英文+分隔符正确 |

### HTML 片段实战模式（从源码提取）

以下模式来自已安装插件 `com.cyoa.choices` 和 `com.relationship.panel` 的实际源码分析。

#### 模式 1：DOM 访问降级

```js
// 插件运行在 iframe 中，需要访问顶层文档
var doc = window.top ? window.top.document : document;
if (!doc || !doc.body) { doc = document; }
// 注意：不能 return，必须继续执行
```

#### 模式 2：工具栏按钮注入

```js
// findActionBar：两层回退，适配 Tavo 重建 UI 后子元素不足的情况
function findActionBar() {
  var bars = doc.querySelectorAll('.tav-action-bar');
  for (var i = 0; i < bars.length; i++) {
    if (bars[i].children.length >= 2 && bars[i].querySelector('button')) return bars[i];
  }
  for (var i = 0; i < bars.length; i++) {
    if (bars[i].isConnected) return bars[i];
  }
  return null;
}

function injectBtn() {
  var bar = findActionBar();
  if (!bar) return false;
  var existing = doc.getElementById('my-plugin-tb');
  if (existing) {
    if (existing.isConnected && doc.contains(existing)) return true;
    existing.remove();
  }
  var btn = doc.createElement('button');
  btn.id = 'my-plugin-tb';
  btn.className = 'tav-action-bar-button';
  btn.textContent = '🎯';
  btn.title = '插件名';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();  // 必须阻止冒泡，否则触发 Tavo 默认行为
    toggle();
  });
  bar.appendChild(btn);
  return true;
}

// 初始注入 + 延迟重试
injectBtn();
setTimeout(injectBtn, 500);
setTimeout(injectBtn, 1000);
setTimeout(injectBtn, 2000);

// MutationObserver 检测 DOM 变化
var injectTimer = null;
var observer = new MutationObserver(function() {
  if (injectTimer) clearTimeout(injectTimer);
  injectTimer = setTimeout(injectBtn, 100);
});
observer.observe(doc.body, { childList: true, subtree: true });

// 定期检查（2s 兜底）
setInterval(injectBtn, 2000);

// requestAnimationFrame 每帧检查（最可靠，推荐）
function checkButton() {
  injectBtn();
  requestAnimationFrame(checkButton);
}
requestAnimationFrame(checkButton);
```

#### 模式 3：多插件按钮顺序管理

```js
// 用 compareDocumentPosition 动态修正顺序
var existing = doc.getElementById('my-plugin-tb');
var otherBtn = doc.getElementById('other-plugin-tb');
if (existing && otherBtn &&
    existing.compareDocumentPosition(otherBtn) & Node.DOCUMENT_POSITION_FOLLOWING) {
  otherBtn.parentNode.insertBefore(existing, otherBtn.nextSibling);
}
```

#### 模式 4：浮动面板（居中+拖动）

```css
/* CSS：纯居中，不依赖 JS 计算，跨设备自适应 */
div#my-pn {
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
```

```js
// 每次打开面板时清除 inline 样式，恢复 CSS 居中
function showPanel() {
  pn.style.left = '';
  pn.style.top = '';
  pn.style.transform = '';
  // ... 构建面板内容
}

// 拖动：按下时用 getBoundingClientRect() 将 CSS 居中转为绝对定位
function enableDrag(handle) {
  handle.style.cursor = 'move';
  handle.addEventListener('mousedown', function(e) {
    var rect = pn.getBoundingClientRect();
    pn.style.left = rect.left + 'px';
    pn.style.top = rect.top + 'px';
    pn.style.transform = 'none';
    var startX = e.clientX, startY = e.clientY;
    var origL = rect.left, origT = rect.top;
    function onMove(cx, cy) {
      pn.style.left = Math.max(0, Math.min(window.innerWidth - pn.offsetWidth, origL + cx - startX)) + 'px';
      pn.style.top = Math.max(20, Math.min(window.innerHeight - pn.offsetHeight, origT + cy - startY)) + 'px';
    }
    function onEnd() {
      document.removeEventListener('mousemove', mMove);
      document.removeEventListener('mouseup', mUp);
    }
    var mMove = function(ev) { ev.preventDefault(); onMove(ev.clientX, ev.clientY); };
    var mUp = function() { onEnd(); };
    document.addEventListener('mousemove', mMove);
    document.addEventListener('mouseup', mUp);
  });
}

// 键盘适配：弹出时 bake 定位，收起时恢复 CSS 居中
function adaptKeyboard() {
  var vv = window.visualViewport;
  if (!vv) return;
  var isKB = vv.height < window.innerHeight * 0.75;
  if (isKB) {
    if (!pn.style.left && !pn.style.top) {
      var rect = pn.getBoundingClientRect();
      pn.style.left = rect.left + 'px';
      pn.style.top = rect.top + 'px';
      pn.style.transform = 'none';
    }
    // 防止键盘遮挡
    var maxT = Math.max(10, vv.height - pn.offsetHeight - 8);
    if (parseInt(pn.style.top) > maxT) pn.style.top = maxT + 'px';
  } else {
    pn.style.left = '';
    pn.style.top = '';
    pn.style.transform = '';
  }
}
```

#### 模式 5：AI 生成 + 并发安全

```js
var genSeq = 0;  // 计数器防并发

async function doGenerate() {
  ++genSeq;
  var curSeq = genSeq;  // 捕获当前序列号
  busy = true;

  // 读秒计时器
  var startTime = Date.now();
  var timer = setInterval(function() {
    var el = doc.getElementById('timer');
    if (el) el.textContent = Math.floor((Date.now() - startTime) / 1000);
  }, 500);

  try {
    var result = await tavo.generate(PROMPT, { context: true });
    clearInterval(timer);

    // 关键：如果序列号已变，说明有新请求，丢弃本次结果
    if (curSeq !== genSeq) { busy = false; return; }

    // 处理结果...
  } catch(e) {
    clearInterval(timer);
    // 显示错误...
  } finally {
    busy = false;
  }
}
```

#### 模式 6：选项缓存 + 智能刷新

```js
var cachedItems = null;
var cachedMsgCount = 0;

// 生成后缓存（用 count() 比 find([]) 更可靠）
cachedItems = items;
cachedMsgCount = await tavo.message.count();

// 打开时检查是否过期
if (cachedItems && cachedItems.length > 0) {
  var stale = (await tavo.message.count() !== cachedMsgCount);
  if (!stale) {
    renderOptions(cachedItems);  // 秒出，无需调 AI
    return;
  }
}
doGenerate();  // 有新消息，重新生成
```

**注意**：用 `tavo.message.count()` 替代 `tavo.message.find([])`，因为 `count()` 返回纯数字，不需要处理数组/对象判断，更稳定。

#### 模式 7：事件委托处理动态元素

```js
// 不要给每个子元素单独绑 click，用父元素委托
pn.addEventListener('click', function(e) {
  var t = e.target;
  // 处理按钮点击
  if (t.classList && t.classList.contains('my-btn')) {
    e.stopPropagation();
    handleAction(t.getAttribute('data-value'));
  }
  // 处理名字点击
  if (t.classList && t.classList.contains('rel-name')) {
    e.stopPropagation();
    copyName(t.getAttribute('data-name'));
  }
});
```

#### 模式 8：Toast 通知

```js
function showToast(msg) {
  var t = doc.createElement('div');
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
    'background:rgba(99,102,241,.9);color:#fff;padding:8px 16px;border-radius:20px;' +
    'font-size:12px;z-index:99999999;pointer-events:none;' +
    'animation:toast-fade 1.5s ease forwards';
  t.textContent = msg;
  doc.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 1500);
}
// 配合 CSS @keyframes toast-fade { 0%,70%{opacity:1} 100%{opacity:0} }
```

#### 模式 9：异步超时包装

```js
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('超时')); }, ms);
    })
  ]);
}

// 使用
var msgs = await withTimeout(tavo.message.find([]), 5000);
var result = await withTimeout(tavo.generate(prompt, {context: false}), 35000);
```

#### 模式 10：JSON 返回保护

```js
// tavo.generate() 可能返回非 JSON 纯文本或 markdown 包裹的 JSON
var result = await tavo.generate(prompt, {context: false});
result = result.trim();

// 去除 markdown 代码块包裹
var bt = '\x60\x60\x60';
if (result.indexOf(bt) === 0) {
  result = result.replace(/^\x60\x60\x60[a-zA-Z]*\n?/, '').replace(/\x60\x60\x60$/, '');
}

// 截取 JSON 部分
var jsonStart = result.indexOf('{');
var jsonEnd = result.lastIndexOf('}');
if (jsonStart >= 0 && jsonEnd > jsonStart) {
  result = result.substring(jsonStart, jsonEnd + 1);
}
var data = JSON.parse(result);
```

### manifest.json 权限声明

根据社区插件研究，常见权限及其用途：

| 权限 | 用途 | 需要的插件类型 |
|------|------|--------------|
| `variable` | `tavo.get/set` 跨聊天持久存储 | 几乎所有插件 |
| `network` | 调用外部 API（生图/TTS/向量） | 生图、语音、记忆 |
| `file` | 本地文件读写（图库/数据落盘） | 生图、记忆 |
| `message` | `tavo.message.find` 读取聊天消息 | 语音（抓对白）、记忆、分析 |
| 无 | 纯 UI 面板，不读写数据 | 简单展示类 |

### HTML 片段挂载点

| mount 路径 | 位置 | 用途 |
|-----------|------|------|
| `/chat/head/start` | 聊天页顶部开头 | 全局信息栏 |
| `/chat/head/end` | 聊天页顶部末尾 | 控制条 |
| `/chat/body/start` | 聊天消息列表开头 | 顶部信息栏 |
| `/chat/body/end` | 聊天消息列表末尾 | 浮动面板、选项渲染 |
| `/messages/start` | 每条消息开头 | 消息装饰 |
| `/messages/end` | 每条消息末尾 | 消息装饰 |
| `/messages/start?role=user` | 用户消息开头 | 用户消息装饰 |
| `/messages/end?role=character` | 角色消息末尾 | 角色消息装饰 |
| `/messages/end?position=last` | 最新消息末尾 | 尾巴装饰 |
| `/messages/end?role=character&position=last` | 最新角色回复尾部 | 消息桥接，自动处理最新 AI 回复 |
| `/sidebar` | 侧边栏 | 信息面板、设置面板 |

### 高级开发模式（基于社区插件源码研究）

以下模式来自 `fsj-official-release`（第五季果汁 v3.1.0）和 `com.tizenry.duya-shengtu`（渡鸦生图 v7.3.0）的实际源码分析。

#### 模式 A：actions.js 后台脚本 + 侧边栏

**适用场景**：需要侧边栏面板、输入框动作的复杂插件。

**actions.js**（在 `manifest.json` `scripts.actions` 中声明）：
```js
// actions.js — 页面加载即运行，注册侧边栏和输入框事件
(function() {
  function showPanel(id) {
    // 通过全局函数与 HTML 片段通信
    var shell = window.__MY_PLUGIN_SHELL__;
    if (shell && typeof shell.showPanel === 'function') {
      shell.showPanel(id);
    }
  }

  // 注册侧边栏动作
  tavo.plugin.onSidebarAction('dashboard', async function() {
    showPanel('dashboard');
  });
  tavo.plugin.onSidebarAction('settings', async function() {
    showPanel('settings');
  });

  // 注册输入框动作（右键菜单/工具栏）
  tavo.plugin.onInputAction('insert-template', async function() {
    tavo.input.append('模板内容');
    tavo.utils.toast('已插入模板');
  });
})();
```

**bootstrap.html**（HTML 片段，挂载到 `/chat/body/end`）：
```js
(function() {
  var topDoc;
  try { topDoc = window.top.document; if (!topDoc.body) throw Error(); }
  catch(e) { topDoc = document; }

  // 等待面板容器存在
  function waitForContainer(cb, tries) {
    var el = topDoc.getElementById('my-panel');
    if (el) return cb(el);
    if (tries > 40) return;
    setTimeout(function() { waitForContainer(cb, (tries||0)+1); }, 200);
  }

  // 注册到全局命名空间，供 actions.js 调用
  var shell = window.__MY_PLUGIN_SHELL__ = window.__MY_PLUGIN_SHELL__ || {};
  shell.showPanel = function(id) {
    waitForContainer(function(container) {
      // 切换面板显示
      container.style.display = container.style.display === 'flex' ? 'none' : 'flex';
      // 加载对应面板内容...
    });
  };
})();
```

#### 模式 B：消息尾部桥接 /messages/end

**适用场景**：每次 AI 回复后自动触发处理逻辑（记忆存储、内容分析、自动更新等）。

**manifest.json** 声明：
```json
{
  "contributes": {
    "htmlFragments": [
      {
        "id": "message-bridge",
        "src": "fragments/message-tail.html",
        "mount": "/messages/end?role=character&position=last"
      }
    ]
  }
}
```

**message-tail.html**：
```html
<script>
(function() {
  var tries = 0;
  function run() {
    tries++;
    var W;
    try { W = window.top || window; } catch(e) { W = window; }
    var TV = W.tavo;
    var core = W.__MY_MEMO__ && W.__MY_MEMO__.core;

    if (!TV || !core || typeof core.processMemo !== 'function') {
      if (tries < 50) setTimeout(run, 150);
      return;
    }

    Promise.resolve().then(async function() {
      // 获取当前 AI 回复消息
      var msg = null;
      try { msg = await TV.message.current(); } catch(e) {}
      if (!msg) {
        try {
          var arr = await TV.message.find(-1, { role: 'character' });
          msg = Array.isArray(arr) ? arr[0] : arr;
        } catch(e) {}
      }
      if (msg) await core.processMemo(msg);
    }).catch(function(e) {
      console.warn('[message bridge]', e);
    });
  }
  run();
})();
</script>
```

**工作原理**：
1. 每次角色回复后，`message-tail.html` 自动执行
2. `tavo.message.current()` 获取当前回复消息
3. 回调失败则用 `tavo.message.find(-1, {role:'character'})` 兜底
4. 处理后通过全局命名空间与主面板通信

#### 模式 C：waitForPanel + 模块化初始化

**适用场景**：有多个独立模块的复杂插件（小手机风格）。

```js
// 每个模块独立初始化，等待主面板容器存在
var MODULE_READY = false;

function waitForPanel(callback, attempts) {
  attempts = attempts || 0;
  var panel = topDoc.getElementById('vp-mini-panel');  // 主面板容器
  if (panel) { callback(panel); return; }
  if (attempts > 30) return;
  setTimeout(function() { waitForPanel(callback, attempts + 1); }, 200);
}

// 模块防重复初始化
if (window.__myModuleInited) return;
window.__myModuleInited = true;

waitForPanel(function(panel) {
  // 创建模块容器
  var container = topDoc.getElementById('my-module-container');
  if (!container) {
    container = topDoc.createElement('div');
    container.id = 'my-module-container';
    container.style.cssText = 'display:none;flex:1;flex-direction:column';
    var grid = topDoc.getElementById('app-grid-container');
    if (grid) grid.appendChild(container);
  }
  // 渲染 UI...
});
```

#### 模式 D：settings.schema 高级类型

**适用场景**：需要复杂设置界面的插件。

| schema 类型 | 说明 | 示例 |
|------------|------|------|
| `info` | 纯说明文字 | `{type:"info", text:"帮助信息", icon:"info"}` |
| `divider` | 分隔线 | `{type:"divider"}` |
| `break` | 分组分隔（不渲染可见控件，开始新设置组） | `{type:"break"}` |
| `switch` | 开关 | `{key:"enabled", type:"switch", label:"启用", default:true}` |
| `text` | 单行文本 | `{key:"api_key", type:"text", label:"API Key", default:""}` |
| `textarea` | 多行文本 | `{key:"prompt", type:"textarea", label:"提示词", default:""}` |
| `select` | 下拉选择 | `{key:"model", type:"select", label:"模型", options:["nai","openai"]}` |
| `slider` | 滑块选择 | `{key:"strength", type:"slider", label:"强度", min:0, max:1, step:0.1, default:0.5}` |

设置值通过 `tavo.plugin.config.get('key')` 同步读取（返回已保存的用户值，回退到 schema 的 default）。获取全部设置使用 `tavo.plugin.config.all()` 返回浅拷贝。

#### 模式 E：完整 API 覆写模式

**适用场景**：需要接管 Tavo 默认 API 调用的插件（如自定义对话/生图 API）。

```js
// 覆写 tavo.generate 实现外部 API 代理
if (!window.__apiWrapped) {
  window.__apiWrapped = true;
  var origGenerate = tavo.generate;
  var apiSettings = tavo.get('api_settings', 'global') || {};

  tavo.generate = async function(prompt, options) {
    if (apiSettings.chatUrl && apiSettings.chatKey) {
      try {
        var resp = await fetch(apiSettings.chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiSettings.chatKey
          },
          body: JSON.stringify({
            model: apiSettings.chatModel || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        var data = await resp.json();
        if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
        if (data.content) return data.content;
        if (data.text) return data.text;
        throw Error('格式异常');
      } catch(e) {
        console.warn('外部API失败，回退', e);
        tavo.utils.toast('外部API失败，已回退');
      }
    }
    // 失败时回退到原始 API
    return origGenerate(prompt, options);
  };
}
```

#### 模式 F：桥接正则资源打包

**适用场景**：插件需要配套正则脚本。

可以在 `assets/` 目录存放 JSON 格式的正则脚本（兼容 SillyTavern regex 格式），并打包进 .tpg：

```json
{
  "scriptName": "插件桥接正则",
  "findRegex": "<scene\\b[^>]*\\bid=[\"']([^\"']+)[\"'][^>]*>([\\s\\S]*?)</scene>",
  "replaceString": "<div class=\"bridge\">$1</div>",
  "placement": [2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false
}
```

安装插件后，需要单独通过 MCP `tavo_regex_import` 导入这些正则。

#### 模式 G：AI 生成速度优化 — 正则+变量替代方案

**核心问题**：`tavo.generate()` 触发完整 LLM 调用（2-30秒），对于结构化数据（角色面板、状态栏、统计数据）完全不需要。

**社区通用优化策略**：

| 方法 | 速度 | 适用场景 | 需要 AI？ |
|------|------|----------|:---------:|
| `tavo.get/set` 变量 | 毫秒级 | 角色状态、属性、背包、技能 | ❌ |
| 世界书常量条目 + `{{getvar}}` 宏 | 毫秒级 | AI 可读的模板信息 | ❌ |
| 正则 `<tag>` 标签解析 | 毫秒级 | 从 AI 输出提取结构化数据 | ❌（AI只输出标签） |
| EJS 条件模板 | 毫秒级 | 条件逻辑、循环、格式化 | ❌ |
| HTML片段 + 变量读取 | 毫秒级 | 直接渲染 UI 面板 | ❌ |
| 缓存 + 消息数失效检测 | 秒出 | 摘要、分析结果复用 | 一次生成多次复用 |
| 增量分析（旧结果+新消息） | 减少50%+ token | 故事线、记忆总结 | ✅（但更轻量） |
| `/messages/end` 桥接自动触发 | 无轮询开销 | 每次AI回复后自动处理 | ✅（不额外调用） |

**社区实战模式**：

**1. 变量驱动面板（小手机/清露终端模式）**

AI 输出结构化标签 → 正则解析 → 变量存储 → 插件渲染，全程只需一次 AI 输出标签：

```
AI 输出：...正文...<update>{"hp":85,"mp":50,"inventory":["剑","药水"]}</update>
正则解析：<update>([\s\S]+?)</update> → JSON.parse
变量存储：tavo.set('hp', 85, 'chat')
插件渲染：document.getElementById('hp-bar').textContent = tavo.get('hp', 'chat')
```

**2. 世界书常量模板（Deep Story Reforged模式）**

创建 constant 类型世界书条目，AI 每次都能读到格式化数据：

```
entry content:
{{getvar::dsr_context}}
场景: {{getvar::scene}}
世界状态: {{getvar::world_state}}
人物关系: {{getvar::relationships}}
```

在插件中用 `tavo.set` 更新变量，世界书自动注入上下文，无需每次 generate。

**3. 角色卡信息零AI读取**

角色卡静态字段（description/personality/scenario/first_mes）用 `tavo.character.get(id)` 直接读取：

```js
var ch = await tavo.character.get(characterId);
// ch.name, ch.description, ch.personality, ch.scenario — 毫秒级，无需 AI
```

世界书内容同理用 `tavo.lorebook.get(id)` 读取。

**4. 缓存+失效检测（剧情选择器模式）**

```js
var cachedItems = tavo.get('cached_analysis', 'chat');
var cachedMsgCount = tavo.get('analysis_msg_count', 'chat');
var currentMsgCount = (await tavo.message.find([])).length;

if (cachedItems && cachedMsgCount === currentMsgCount) {
  renderItems(cachedItems);  // 秒出
  return;
}
// 有变化才重新生成
var result = await tavo.generate(prompt);
tavo.set('cached_analysis', result, 'chat');
tavo.set('analysis_msg_count', currentMsgCount, 'chat');
```

**5. 增量分析（第五季果汁记忆插件模式）**

```js
var oldSummary = tavo.get('story_summary', 'chat');
var prompt = oldSummary
  ? '上次分析:\n' + oldSummary + '\n\n[任务]结合以下新消息，在旧结论上追加更新'
  : '[任务]分析以下对话';
```

**6. `generation:prepare` 钩子注入预计算内容**

```js
tavo.plugin.on('generation:prepare', async (event) => {
  // 在 AI 生成前注入角色面板数据（零延迟）
  var hp = tavo.get('hp', 'chat');
  var mp = tavo.get('mp', 'chat');
  event.text = '[角色状态]\nHP: ' + hp + '/100   MP: ' + mp + '/50\n\n' + event.text;
});
```

**适用场景决策树**：

```
需要显示的内容是？
├─ 角色卡静态信息 → tavo.character.get() → 毫秒级
├─ 世界书条目内容 → tavo.lorebook.get() → 毫秒级
├─ 动态状态（HP/装备/属性） → tavo.get/set 变量 → 毫秒级
├─ AI 已输出的内容 → 正则解析 <tag> → 毫秒级
├─ 之前分析过的结果 → 缓存 + 消息数失效检测 → 秒出
├─ 在旧结论上更新 → 增量分析 prompt → 50%+省
└─ 全新开放式分析 → tavo.generate() → 2-30秒（不可避免）
```

**关键原则**：结构化数据走变量/世界书/正则，只有"需要AI理解才能生成"的内容才调 `tavo.generate`。

#### 模式 H：后台预生成 + 轮询检测

**场景**：用户发消息 → AI 回复 → 新消息到达 → 自动在后台生成选项/分析，用户下次打开面板时秒出。

```js
var lastChatId = null;
var lastMsgCount = 0;
setInterval(async function() {
  try {
    var chat = await tavo.chat.current();  // 1. 先确认聊天已加载
    if (!chat) return;
    if (chat.id !== lastChatId) {          // 2. 检测聊天切换
      lastChatId = chat.id;
      lastMsgCount = await tavo.message.count();
      return;
    }
    var count = await tavo.message.count();
    if (count > lastMsgCount && lastMsgCount > 0) {  // 3. 检测新消息
      cachedItems = null;                   // 4. 清除缓存
      if (!busy) doGen(true);              // 5. 后台生成（bgMode=true）
    }
    lastMsgCount = count;
  } catch(e) {}
}, 3000);
```

**关键要点**：
1. **先调 `tavo.chat.current()`** 确认聊天加载完成，否则 `message.count()` 可能返回0
2. **`tavo.message.count()`** 返回纯数字，比 `find([])` 更稳定可靠
3. **`async function + await`** 在 setInterval 中正确等待 Promise
4. **`lastMsgCount > 0`** 防止启动时误触发（首次轮询只记录不生成）
5. **`bgMode` 参数**：后台模式跳过所有面板 UI 更新（"思考中"提示等）

**参考实现**：剧情选择器（com.cyoa.choices）v1.9.5+，角色资料面板（com.relationship.panel）v4.2.9

> ⚠️ **对比 MutationObserver**：Tavo 的 DOM 结构多变，`[class*="message-list"]` 等选择器可能不匹配实际类名。setInterval + API 轮询不依赖 DOM，更可靠。

#### 模式 I：DOM 守卫防止元素丢失

**场景**：Tavo 在接收新消息/更新 UI 时会重建 DOM，清除插件注入的自定义元素（浮动按钮、面板、CSS）。需要 MutationObserver 守护自动重新注入。

```js
var guardTimer = null;
var guardObs = new MutationObserver(function() {
  if (guardTimer) clearTimeout(guardTimer);
  guardTimer = setTimeout(function() {
    if (!doc.getElementById('my-bar') || !doc.getElementById('my-pn')) {
      reinjectUI();
    }
  }, 500);
});
guardObs.observe(doc.body, { childList: true, subtree: true });

function reinjectUI() {
  // 1. 删除旧元素
  ['my-bar', 'my-pn', 'my-ss'].forEach(function(id) {
    var el = doc.getElementById(id);
    if (el) el.remove();
  });
  // 2. 重建 CSS（style 元素）
  // 3. 重建面板（div + 内容）
  // 4. 重建浮动按钮（div + button + 事件）
}
```

**关键要点**：
1. **防抖（500ms）**：避免高频 DOM 变化时反复重建
2. **`reinjectUI` 函数完整重建**：style → panel → bar，缺一不可
3. **`pn = doc.createElement(...)`** 用 `var` 声明（函数作用域），`reinjectUI` 中可直接重新赋值
4. **CSS 提取为常量**：`var CSS_TEXT = '...'`，init 和 reinjectUI 共用，避免两处维护同一份 CSS

#### 常用模式

##### CSS_TEXT 变量避免样式重复

```js
var CSS_TEXT = 'div#my-panel{...}';
var s = doc.createElement('style');
s.textContent = CSS_TEXT;
doc.head.appendChild(s);

function reinjectUI() {
  // 清理旧元素...
  var s2 = doc.createElement('style');
  s2.textContent = CSS_TEXT;  // 复用同一常量
  doc.head.appendChild(s2);
  // 重建面板...
}
```

##### genSeq 取消过时异步操作

当后台轮询检测到新状态时，通过自增计数器让正在运行的异步操作自动放弃结果：

```js
var genSeq = 0;

// 轮询检测到变化
genSeq++;  // 增量 → 旧操作的 curSeq !== genSeq

// 异步操作完成时检查
if (curSeq !== genSeq) { return; }  // 放弃旧结果
cachedItems = items;  // 只有最新操作的结果被保留
```

##### visualViewport 键盘自适应

```js
function adaptKeyboard() {
  var vv = window.visualViewport;
  if (!vv) return;
  var isKB = vv.height < window.innerHeight * 0.75;
  if (isKB) {
    pn.style.maxHeight = Math.round(Math.min(500, vv.height * 0.75)) + 'px';
    bar.style.bottom = (window.innerHeight - vv.height + 12) + 'px';
  } else {
    pn.style.maxHeight = '500px';
    bar.style.bottom = '80px';
  }
}
if (window.visualViewport) visualViewport.addEventListener('resize', adaptKeyboard);
```

##### String.replace 全局替换

模板字符串中有多个相同占位符时，需用 regex 全局匹配：

```js
// ❌ 只替换第一个 {target}
template.replace('{target}', 6);

// ✅ 替换所有 {target}
template.replace(/\{target\}/g, 6);
// 或
template.replaceAll('{target}', 6);  // ES2021+

---

## Action Bar 按钮 6 层稳定机制

Tavo 会在新消息时重建 action bar DOM，导致插件按钮消失。需要多重保险：

```javascript
function injectBtn() {
  // 找到 action bar
  var bars = doc.querySelectorAll('.tav-action-bar');
  var bar = null;
  for (var i = 0; i < bars.length; i++) {
    if (bars[i].children.length >= 2 && bars[i].querySelector('button')) { bar = bars[i]; break; }
  }
  if (!bar) return false;
  // 检查是否已存在
  var existing = doc.getElementById('my-btn');
  if (existing) {
    if (existing.isConnected && doc.contains(existing)) return true;
    existing.remove();
  }
  // 创建按钮
  var btn = doc.createElement('button');
  btn.id = 'my-btn'; btn.className = 'tav-action-bar-button';
  // ... click handler ...
  bar.appendChild(btn);  // 末尾追加：原生按钮在前
  // 如要排在最前：bar.insertBefore(btn, bar.firstElementChild);
  return true;
}

// === 6 层稳定机制 ===
// 1. 立即注入
injectBtn();
// 2. 延迟注入（弥补页面未完全加载）
setTimeout(injectBtn, 500);
setTimeout(injectBtn, 1000);
setTimeout(injectBtn, 2000);

// 3. 增强 MutationObserver
var injectTimer = null;
var observer = new MutationObserver(function() {
  if (!doc.getElementById('my-btn') || !doc.getElementById('my-btn').isConnected) {
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(injectBtn, 100);
  }
});
observer.observe(doc.body, { childList: true, subtree: true });

// 4. 高频轮询 + 父元素检查
setInterval(function() {
  var btn = doc.getElementById('my-btn');
  var bars = doc.querySelectorAll('.tav-action-bar');
  var barInUse = null;
  for (var i = 0; i < bars.length; i++) {
    if (bars[i].children.length >= 2 && bars[i].querySelector('button') && bars[i].isConnected) {
      barInUse = bars[i];
    }
  }
  if (!btn || !btn.isConnected || (barInUse && !barInUse.contains(btn))) {
    injectBtn();
  }
}, 1000);

// 5. scroll/resize 事件
var scrollTimer = null;
window.addEventListener('scroll', function() {
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(function() {
    if (!doc.getElementById('my-btn') || !doc.getElementById('my-btn').isConnected) injectBtn();
  }, 200);
}, true);
window.addEventListener('resize', function() { setTimeout(injectBtn, 100); });

// 6. requestAnimationFrame 持续检查
function checkButton() {
  var btn = doc.getElementById('my-btn');
  if (!btn || !btn.isConnected) injectBtn();
  requestAnimationFrame(checkButton);
}
requestAnimationFrame(checkButton);
```

---

## CYOA StyleConfig 系统提示分类模式

在剧情选择器插件中，可将系统提示按键整合到分类下拉菜单中：

```javascript
var styleConfig = {
  main:     { icon: '\u25c6', label: '\u4e3b\u7ebf\u5267\u60c5' },
  // ... 其他生成分类 ...
  sys: { icon: '\u2699', label: '\u7cfb\u7edf\u63d0\u793a' }  // ✅ 单一条目
};

// change handler 判断 sys
styleSelect.addEventListener('change', async function(e) {
  e.stopPropagation();
  var val = styleSelect.value;
  if (val === 'sys') {
    showSystemPrompts();  // 渲染系统提示按钮
    return;
  }
  currentStyle = val;
  doGen();
});
```

---

## 备忘录模式（Panel 标签页重设计）

替代实时情报站，改为累加式角色备忘录：

### 数据存储
```javascript
tavo.set('relCharList_' + chatId, {
  version: 1,
  updatedAt: "12:00",
  chars: [{
    name: "江南",
    identity: "地摊系统持有者",
    trait: "对钱不感兴趣",
    status: "正在街头摆摊",
    relations: [{ target: "冰神", desc: "系统制造者" }],
    events: [{ time: "12:00", text: "卖出第一瓶大力药水" }]
  }]
}, 'global');
```

### 刷新策略
| 触发 | 方式 | 失败处理 |
|------|------|---------|
| 打开面板 | 自动触发首次分析 | 显示角色名 +「等待分析」|
| 每条新消息 | 后台静默 AI 分析 | 跳过，保留上次数据 |
| 点击 🔄 | 手动强制分析 | 底部显示「△ 上次分析失败」|
