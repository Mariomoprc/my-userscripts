## 常见错误

### PluginInstallException: unsupportedSpecVersion (value=2)

**原因：** Tavo 版本低于 0.93.0，不支持 specVersion 2。
**修复：** 将 Tavo 升级到 0.93.0+ 再安装。0.92.x 只接受 `specVersion: 1`。
**测试方法：** 先检查 MCP `tools/list` 确认 Tavo 版本，再决定用 specVersion 1 或 2。

### 面板在手机上不居中（视觉偏下）

**原因：** JS 计算居中 (`Math.round((window.innerHeight - height) / 2)`) 在手机竖屏上不准确，因为 action bar 占底部空间，实际视口高度小于 window.innerHeight。
**修复：** 改用纯 CSS 居中 `top:50%;left:50%;transform:translate(-50%,-50%)`，每次打开面板时清除 inline 样式 (`pn.style.left=''; pn.style.top=''`) 让 CSS 居中生效。拖动时用 `getBoundingClientRect()` 转为绝对定位。

### 中文标签变问号（MCP 请求）
**原因：** PowerShell `Invoke-RestMethod` 默认用 GBK 编码
**修复：** 必须用 `[System.Text.Encoding]::UTF8.GetBytes($body)` 编码请求体

### GitHub Release 中文变问号
**原因：** Windows GBK 下 `gh release create --title "中文"` 直接传中文参数会被损坏
**修复：** 创建时用 `--notes-file` 指向 UTF-8 编码的文件；已损坏的 Release 用 `gh release edit` 修复，但确保 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
**验证：** 用 playwright 浏览器导航到 Release URL 检查渲染结果

### MCP 连接失败
**原因：** 手机锁屏或 IP 变化
**修复：** 解锁手机，确认 MCP 地址正确

### 角色卡导入无头像
**原因：** MCP `import_card` 不支持头像
**修复：** 用 Chub URL 导入或从 PNG 文件导入

### 预设条目丢失
**原因：** `preset_update` 会覆盖整个预设
**修复：** 用 `preset_entry_upsert` 逐条添加

### 世界书/正则导入报 Null 类型错误
**原因：** `lorebook_import` 和 `regex_import` 的参数要求是对象，不是 JSON 字符串。`ConvertTo-Json` 会把对象序列化成字符串，导致 `type 'Null' is not a subtype of type 'String'` 错误
**修复：** 直接传 PowerShell 对象给 `lorebook`/`regex` 参数，不要用 `ConvertTo-Json` 转字符串后再解析

### tavo_regex_update 中文名称变乱码
**原因：** 同上，PowerShell 默认 GBK 编码
**修复：** 请求体必须用 `[System.Text.Encoding]::UTF8.GetBytes($body)` 编码，示例：
```powershell
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tavo_regex_update","arguments":{"id":33,"regex":{"name":"中文名称"}}}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "..." -Method Post -Headers @{"Authorization"="Bearer token";"Content-Type"="application/json; charset=utf-8"} -Body $bytes
```

### 工具栏按钮消失或位置错乱

**原因：** Tavo 重建 `.tav-action-bar` DOM 时，按钮元素被 detach。多个插件的按钮互相抢位置。

**最佳实践：**
1. **直接用工具栏注入，不要用浮动容器 `position:fixed`**。浮动容器在工具栏隐藏/变化时坐标计算错误，按钮会出现在文本中间或完全消失。
2. **按钮重连时用 `insertBefore(btn, 参照按钮)` 保持顺序**，不要用 `insertBefore(btn, bar.firstChild)` 插到最前。

**正确的 injectBtn 模式（两层回退）：**
```js
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

  var existing = doc.getElementById('my-btn');
  if (existing) {
    if (existing.isConnected && doc.contains(existing)) return true;
    existing.remove();
  }

  var btn = doc.createElement('button');
  btn.id = 'my-btn'; btn.className = 'tav-action-bar-button';
  // ...
  var otherBtn = doc.getElementById('other-btn');
  if (otherBtn && otherBtn.isConnected) { bar.insertBefore(btn, otherBtn); }
  else { bar.appendChild(btn); }
  return true;
}

// 多层恢复机制（缺一不可）：
injectBtn();
setTimeout(injectBtn, 500);
setTimeout(injectBtn, 1000);
setTimeout(injectBtn, 2000);

var injectTimer = null;
var observer = new MutationObserver(function() {
  if (injectTimer) clearTimeout(injectTimer);
  injectTimer = setTimeout(injectBtn, 100);
});
observer.observe(doc.body, { childList: true, subtree: true });

setInterval(injectBtn, 2000);

function checkButton() {
  injectBtn();
  requestAnimationFrame(checkButton);
}
requestAnimationFrame(checkButton);
```

**关键原则**：
- 不要用 `position: fixed` 浮动容器跟踪工具栏位置，直接在工具栏内注入
- `children.length >= 2` 条件在 UI 重建后可能过严，必须加 `isConnected` 回退
- `requestAnimationFrame(checkButton)` 是最可靠的恢复方式（每帧检查）
- **避免浮动按钮回退**：找不到 action bar 时不创建悬浮按钮，由每帧检查自动恢复。浮动按钮在生成内容时闪烁，体验差

### MCP 无法获取插件详情
**原因：** 多个插件的 `appendChild` 依赖加载顺序，先加载的按钮在前。
**修复：** 用 `insertBefore(btn, targetBtn.nextSibling)` 插入到指定按钮后面，`compareDocumentPosition` 动态修正顺序。

### 点击名字输入框出现 `[object Promise]名字`
**原因：** `tavo.input.get()` 是 async 方法，忘记 `await` 会返回 Promise 对象。
**修复：** `var cur = await tavo.input.get();` 等待 Promise 完成。

### 内容中的角色名高亮不显示
**原因：** `<pre>` 不支持 `innerHTML` 插入混合元素；名字提取失败（AI 超时/正则不匹配）。
**修复：** 用 `<div>` 替代 `<pre>`；正则提取不到时加 `ch.name` 回退；AI 提取做 fallback。

### 故事线分析超时
**原因：** 上下文量太大或 AI 响应慢。
**修复：** 减少消息数/字数（8条×150字合理），增加超时（35s），加读秒计时器反馈进度。

### AI 提取了错误的词作为角色名
**原因：** AI 把描述词（"控制""克制"）也当成名字提取了。
**修复：** 只用正则 `## 名字（角色）` 提取名字，AI 仅作为正则失败后的 fallback。

### 关闭面板重开后选项不生成（显示默认提示）
**原因：** `busy` 锁残留。关闭面板时 `busy=true` 的 `doGen()` 仍在运行，重开后新 `doGen()` 因 `busy=true` 跳过执行。
**修复：** 用 `genSeq` 计数器替代纯 `busy` 锁，`curSeq !== genSeq` 丢弃过期结果；关闭面板时清理状态。

### 拖动后面板位置不恢复
**原因：** `tavo.get/set` 存储位置对象，但 `tavo.get` 可能返回 JSON 字符串而非对象。
**修复：** 不需要记忆位置时，每次打开居中即可。如需持久化，存/取时都显式 `JSON.stringify/parse`。

### TavoJS API 不可用
**原因：** 插件的 `permissions` 未声明所需权限，或 Tavo 版本低于 0.91.0。
**修复：** 在 manifest 中声明 permission: `["input","message","generate","variable","file","network"]`；确认 `minAppVersion` 设置正确。

### 插件未加载 / 侧边栏无反应
**原因：** 未开启高级渲染开关。
**修复：** 设置 → 聊天设置 → 开启高级渲染。0.91.0+ 版本新增功能。

### 模型报错：streaming 未响应
**原因：** 某些模型需要关闭 streaming（流式输出）。
**修复：** 设置 → 模型设置 → 关闭 streaming 选项。

### API 密钥无效 / 403 错误
**原因：** IP 地区限制或密钥过期。
**修复：** 
- 确认使用的 API 平台未被屏蔽（DeepSeek、OpenAI 等在国内可能受限）
- 尝试使用中转 API
- 参考 Discord #🔑丨密钥之间 (1457338290536579072) 获取优质 API 渠道

### .tpg 文件无法导入
**原因：** 文件损坏或 Tavo 版本低于 0.91.0。
**修复：** 
- 确认 `.tpg` 是有效 zip 文件（改 `.zip` 可解压）
- 升级到 0.91.0+
- 尝试通过 MCP `tavo_plugin_install(zipBase64)` 安装

### MCP 安装后 htmlFragments 为空（manifest 格式问题）

**原因：** manifest 中 `htmlFragments` 放在了顶层而非 `contributes` 内。Tavo 的 manifest parser **只识别 `contributes.htmlFragments`**：

```json
// ❌ 错误 → htmlFragments 被丢弃
{ "id": "com.example.p", "htmlFragments": [...] }

// ✅ 正确 → htmlFragments 完整保留
{ "id": "com.example.p", "contributes": { "htmlFragments": [...] } }
```

**表现**: MCP 安装成功，但插件列表显示 `features: []`、`htmlFragments: []`，工具栏按钮不出现。

**验证**：安装后检查 `tavo_plugin_get` 返回的 manifest 中 `htmlFragments` 是否为空。

**修复**：修正 manifest 格式后重新打包安装即可。无需通过文件管理器安装，MCP `tavo_plugin_install` 本身是正常的。

### `tavo.message.update` 更新当前气泡后脚本中断

**原因：** 更新正在运行代码的消息时，Tavo 默认会重建脚本环境，导致后续代码不执行。

**修复：** 传入 `{ reuseContext: true }` 保持脚本环境：
```js
const self = await tavo.message.current();
self.content = '更新的内容';
await tavo.message.update(self, { reuseContext: true });
console.log('脚本继续运行');  // 必须加 reuseContext 才会执行到这里
```

### `tavo.character.import` 导入 CCv3 卡需要用户确认

**原因：** `tavo.character.import()` 会弹出确认对话框，用户在 Tavo 内点击确认才生效。同时如果卡包含 `character_book` 或 `regex_scripts`，会自动创建世界书和正则组。

**注意事项：**
- 返回值: `{ characterId, lorebookId, regexId }`
- 不会自动将世界书/正则关联到聊天，需手动 `tavo.chat.update` 添加
- 创建/更新/删除角色都会弹确认框，用户取消则不生效

### 使用 `entry` 字段后旧版 `scripts.actions` 不生效

**原因：** manifest 中同时声明 `entry` 和 `scripts.actions` 时，`entry` 优先。旧字段被忽略但不会报错。

**修复：** 迁移到 `entry` 字段，删除 `scripts.actions`。如遇旧版 Tavo（<0.91.0）需保留兼容，可同时声明两者但确保 `entry` 指向新文件。

### `tavo.plugin.config.get()` 在 HTML 片段中返回 null

**原因：** HTML 片段中 `tavo.plugin.config.get()` 仅读取**当前插件**的设置。如果调用时机过早（DOM 未挂载完成），可能返回 null。

**修复：** 
- 确认 manifest 中设置了 `default` 值
- 用 `tavo.plugin.config.all()` 获取所有设置
- 如需跨聊天持久化设置，使用 `tavo.get/set(key, value, 'global')`

### 调用 `tavo.input.send()` 后后续代码不执行

**原因：** `tavo.input.send()` 会触发生成流程，不会等待生成完成。后续代码立即执行，而非在 AI 回复后运行。

**修复：** 如需在 AI 回复后执行逻辑，注册 `generation:success` 或 `message:added` 事件钩子：
```js
// ✅ 正确：用事件钩子
tavo.plugin.on('generation:success', async (event) => {
  // AI 回复后执行
});
tavo.input.send();

// ❌ 错误：send 后不会等 AI 回复
await tavo.input.send();
console.log('这行立即执行，不等 AI 回复');
```

## 账号信息

### Google Voice（Discord 登录用）
| 项目 | 值 |
|------|-----|
| 邮箱 | `q16514208@gmail.com` |
| 密码 | `feftut-Zocnyg-9sewxy` |
| 2FA密钥 | `eovz bh7r pj37 6fzx f2sm 2fr4 jjxs vvu7` |
| 电话号码 | `(650) 503-3084` |
| 登录教程 | https://taohaome.org/177.html |

### 使用限制
- **必须使用美国 IP 登录**（FlClash 代理）
- 新号禁止发送短信（谷歌严查电信诈骗）
- 延迟 48 小时才能修改密码等信息
- 账号质保 24 小时

---

### MCP 打包报错 Invalid params: Expected exactly one of text or base64
**原因：** PowerShell `ConvertTo-Json -Depth` 会把字符串参数包装成 `{"value":"..."}` 对象
**修复：** 手动拼接 JSON，用 Escape-Json 函数转义：
```powershell
Function Escape-Json($s) { return ($s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')) }
$body = '{"text":"' + (Escape-Json $fileContent) + '"}'
```

### MCP 打包返回的 zipBase64 是 JSON 对象不是纯字符串
**原因：** `tavo_plugin_package` 的 `includeZipBase64: true` 返回 `{"ok":true,"pluginId":"...","zipBase64":"..."}` 而非纯 base64
**修复：** 需要先 `ConvertFrom-Json` 再取 `zipBase64`：
```powershell
$result = $r.result.content[0].text | ConvertFrom-Json
$zipBase64 = $result.zipBase64
```

### 发布 Release 时不要覆盖旧 .tpg 文件
**原因：** `gh release upload --clobber` 会覆盖已有 asset，旧版本作为备份会丢失
**修复：** 修复 bug 后发布新版本号（如 v4.3.2），用 `gh release create` 创建新 release 附带新 .tpg，保留旧 release 文件

### `input:beforeSend` hook 不执行

**原因：** manifest 中未声明 `"permissions": ["input"]`。

**表现：** handler 注册时不报错（被 try/catch 静默），但永远不会被调用。

**检查方法：** 在 handler 第一行加日志：
```js
try { tavo.plugin.on('input:beforeSend', function () {
  console.log('[test] input:beforeSend FIRED');
  // ...
}); } catch (_) {}
```

**修复：** manifest.json 的 `permissions` 数组中添加 `"input"`。

### entry.js 不执行 / 侧边栏无反应

**原因：** manifest 未声明 `contributes.sidebar` 或 `contributes.inputActions`。entry.js **只有**在 plugin 有 sidebar 或 inputActions 贡献时才会加载并执行。仅有 `htmlFragments` 时不会加载 entry.js。

**表现：** `tavo.plugin.on()` 注册的 hooks 不触发，`console.log` 不输出。

**修复：** 如果插件的核心逻辑需要 entry.js，必须至少声明一个 sidebar 或 inputActions：
```json
"contributes": {
  "sidebar": [{ "id": "noop", "label": "占位（确保 entry 加载）" }]
}
```

### 插件 scroll 保护不生效（htmlFragment 离屏节流）

**原因：** scroll 保护逻辑（`requestAnimationFrame`、`setInterval` 轮询、scroll 事件监听）放在 htmlFragment 中执行。htmlFragment 运行在 iframe 中，当用户滚动到聊天消息列表上方时，iframe 离屏，`requestAnimationFrame` 被节流到 ~1fps，`setInterval` 也可能暂停。

**表现：** 用户滚动到旧消息阅读，生成完成后依然滚动到底部，保护无效。

**修复：** 将所有 scroll 保护逻辑放在 `entry.js`（主窗口）中执行。htmlFragment 仅用于 UI 显示。参考 [plugin-dev.md](plugin-dev.md) 中的「滚动保护模式」章节。

### `generation:prepare` 触发时 scrollTop 已经是 0

**原因：** Tavo 在渲染用户发送的消息后会自动滚动到底部，然后才触发 `generation:prepare`。此时捕获 scrollTop 是 0（底部），位置保护无效。

**表现：** 在 `generation:prepare` 事件中调用 `protectCurrentPosition()` 看到 scrollTop=0 跳过保存。

**修复：** 使用 `input:beforeSend` hook 在用户按发送按钮时捕获 scrollTop（早于 Tavo 渲染消息 ≈200ms）。参考 LRN-20260726-010。

### entry.js 中 `Element.prototype.scrollTo` patch 被绕过

**原因：** Tavo 可能使用 `scrollIntoView()` 替代 `scrollTo()` 来滚动到底部。

**表现：** 仅 patch `Element.prototype.scrollTo` 无法阻止滚动，view 依然跳到底部。

**修复：** 必须同时 patch 两个原型方法：
```js
var _origST = Element.prototype.scrollTo;
Element.prototype.scrollTo = function () { ... };

var _origSIV = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (opts) { ... };
```
即使在 Flutter WebView 中也可能仍被 Flutter 原生滚动绕过。`scrollTop` setter patch 在 `Element.prototype` 层不可靠。
