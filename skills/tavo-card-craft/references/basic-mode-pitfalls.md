# 基础模式实战踩坑录（9 条）

> ⚠️ **本文件与 `pitfall-library.md` 互补，不重叠。**
>
> - `pitfall-library.md` → 遮罩层（overlay）的 10 条坑
> - 本文件 → 纯正则模式（非遮罩）的 9 条坑
> - 两者各管一域，调试时按卡是否含遮罩选择对应文件

> 本文件是纯正则模式（非遮罩）实战做卡时踩过的坑。这些坑不在弯路库（弯路库是遮罩层的坑），是基础模式特有的。做卡时自检，调试时排查。

## 目录

- [坑总结表（按概率排序）](#坑总结表按概率排序)
- [坑 1：Markdown 换行打断布局](#坑-1markdown-换行打断布局)
- [坑 2：CSS content 不支持 \u 转义](#坑-2css-content-不支持-u-转义)
- [坑 3：custom_js 字段不执行](#坑-3custom_js-字段不执行)
- [坑 4：tavo API 名搞错](#坑-4tavo-api-名搞错)
- [坑 5：JSON 传输截断](#坑-5json-传输截断)
- [坑 6：正则 replaceString 里的 Unicode 转义](#坑-6正则-replacestring-里的-unicode-转义)
- [坑 7：进度条竖排不换行](#坑-7进度条竖排不换行)
- [坑 8：导入后只有文字没渲染](#坑-8导入后只有文字没渲染)

---

## 坑总结表（按概率排序）

| # | 坑 | 踩坑概率 | 影响 |
|---|------|----------|------|
| 1 | Markdown 换行打断 flex/grid 布局 | 95% | 进度条/面板布局全乱 |
| 2 | CSS content 用 \u 转义显示乱码 | 90% | 状态标签显示 u65E5u5E38 |
| 3 | custom_js 字段在基础模式下不执行 | 85% | 所有交互失效 |
| 4 | tavo API 名搞错（sendMessage vs input.set/send） | 80% | 发送功能失效 |
| 5 | send_file 传 JSON 被截断 | 70% | 文件不完整无法导入 |
| 6 | Python 生成脚本里 \u 转义被二次解析 | 60% | UnicodeEncodeError |
| 7 | 进度条 float/grid 在 Tavo iframe 里不生效 | 55% | 进度条竖排 |
| 8 | 正则字段配置错误导致不渲染 | 90% | 导入后只有纯文字 |

---

## 坑 1：Markdown 换行打断布局

**症状**：进度条用 flex/grid 做 2×2 布局，但实际渲染全变成竖排，每行一个。

**原因**：Tavo 的消息渲染是 markdown。连续的 `<div>` 之间如果有换行（`\n`），markdown 会把它们解析成不同段落（`<p>`），flex/grid 容器被打断，子元素散落到不同段落里，布局失效。

**修复**：需要并排显示的标签必须写在**同一行**，中间不能有换行。

```
❌ 错（每个 stat 各占一行）：
<dr-stat name="HP" value="100" max="100"/>
<dr-stat name="好感度" value="0" max="100"/>
<dr-stat name="慌乱度" value="5" max="100"/>
<dr-stat name="欲望值" value="0" max="100"/>

✅ 对（四个 stat 写在一行）：
<dr-stat name="HP" value="100" max="100"/><dr-stat name="好感度" value="0" max="100"/><dr-stat name="慌乱度" value="5" max="100"/><dr-stat name="欲望值" value="0" max="100"/>
```

**关键规则**：first_mes 和 mes_example 里的标签如果要被正则包裹在同一个容器里渲染，这些标签之间**不能有换行**。

---

## 坑 2：CSS content 不支持 \u 转义

**症状**：状态标签显示成 `u65E5u5E38` 乱码，而不是"日常"。

**原因**：CSS `content` 属性的 Unicode 转义格式是 `\65E5`（反斜杠+hex），不是 `\u65E5`（JS 格式）。CSS 不认识 `\u` 前缀。

```css
/* ❌ 错：JS 风格的 \u 转义，CSS 不认识 */
.dr-tag::after { content: '\u65E5\u5E38'; }

/* ✅ 对：CSS 风格的转义，去掉 u */
.dr-tag::after { content: '\65E5\5E38'; }
```

**修复方案**：

方案 A（推荐）：CSS 转义去掉 `u`
```css
.dr-status-tag:not(.heat) .dr-status-text::before { content: '\65E5\5E38'; }
.dr-status-tag.heat .dr-status-text::before { content: '\26A0\FE0F \53D1\60C5\671F'; }
```

方案 B：直接在正则 replaceString 里写中文字符（不走 CSS content）
```json
"replaceString": "<span class=\"dr-status-tag\">日常</span>"
```

---

## 坑 3：custom_js 字段在基础模式下不执行

**症状**：`extensions.custom_js` 里写了事件绑定和发送逻辑，但按钮点击完全没反应。

**原因**：`custom_js` 字段是给遮罩层/进阶模式用的。基础模式下 Tavo 可能不执行 custom_js，或者执行时机不对。

**修复**：把 JS 写在 CSS 注入正则的 `replaceString` 里，跟在 `</style>` 后面的 `<script>` 标签中。这是基础模式下唯一可靠的 JS 注入方式。

```json
{
  "id": "<UUID>",
  "name": "dr-style",
  "findRegex": "^",
  "replaceString": "<style id=\"dr-style\">\n...CSS...\n</style>\n<script>\n...JS...\n</script>\n",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0
}
```

**关键**：JS 里用全局函数 + `onclick` 内联调用，不用事件委托（基础模式下 Tavo 不消毒 onclick）。

```javascript
// ✅ 基础模式可用：全局函数 + onclick
window.drToggleSelect = function(elem) {
  elem.classList.toggle('selected');
};

// replaceString 里：
// <button onclick="drToggleSelect(this)">选项文字</button>
```

**⚠️ 实战教训（误解传奇卡）**：曾用 `document.addEventListener('click', ...)` 事件委托实现"多选+一起发出"，结果导入 Tavo 后按钮点击完全无反应。根因是 Tavo 的消息渲染在 iframe 里，事件委托绑定的 document 与按钮所在 iframe 的 document 可能不一致，导致点击事件捕获不到。**改为 `onclick="misSubmit()"` 内联调用全局函数后立即生效**。基础模式下交互逻辑一律用全局函数 + onclick 内联，不要用事件委托。

---

## 坑 4：tavo API 名搞错

**症状**：点击发送按钮没反应，或报 `tavo.sendMessage is not a function`。

**原因**：Tavo 没有 `sendMessage` 这个 API。发送消息要用 `tavo.input.set()` 设置内容 + `tavo.input.send()` 发送。

```javascript
// ❌ 错：不存在的 API
tavo.sendMessage(msg);

// ✅ 对：正确的 Tavo API
tavo.input.set(msg);   // 设置输入框内容
tavo.input.send();     // 发送
```

**完整发送函数示例**：

```javascript
window.drConfirmSend = function(){
  var parts = [];
  // 收集选中的选项
  var sels = document.querySelectorAll('.dr-choice-item.selected');
  sels.forEach(function(elem){
    var text = elem.textContent.trim();
    if(text) parts.push(text);
  });
  // 收集自定义输入
  var input = document.getElementById('dr-custom-reply');
  var customText = input ? input.value.trim() : '';
  if(customText) parts.push(customText);
  if(parts.length === 0) return;
  var msg = parts.join('\n');
  try {
    if(typeof tavo !== 'undefined' && tavo.input){
      tavo.input.set(msg);
      tavo.input.send();
    }
  } catch(err){}
};
```

---

## 坑 5：send_file 传 JSON 被截断

**症状**：用 `send_file` 发送 .json 文件，玩家收到的文件不完整（字节数远小于预期）或无法导入，但本地文件验证是好的。

**原因**：`send_file` 工具传输 JSON 格式时可能有截断问题。

**触发条件**：不是每次都会触发，只有文件较大（通常 >50KB）或传输链路不稳定时才会出现。

**修复（条件触发，不要默认换 txt）**：

默认交付是 `.json`（Tavo 导入需要正确后缀）。**只有当玩家主动反馈以下任一情况时**，才改用 `.txt` 后缀交付：

1. 玩家说"文件打不开/无法导入 Tavo"
2. 玩家说"文件太小/不完整/字节数对不上"
3. Agent 收到文件后能直接看到文件大小异常（远小于本地原文件）

**不要**在交付前主动改成 `.txt`——Tavo 客户端对 `.json` 后缀识别更稳，换成 `.txt` 后玩家还得手动改后缀才能导入，正常情况下是多此一举。

```bash
# 默认：交付 .json（Tavo 标准导入格式）
send_file(ext="json", filepath="card.json", title="角色卡")

# 仅当玩家反馈截断/无法导入/过小时：复制一份 txt 重新发
cp card.json card.txt
send_file(ext="txt", filepath="card.txt", title="角色卡（txt 兜底）")
```

**配套动作**：用 `.txt` 兜底交付时，消息里**必须明确告诉玩家**两件事：
- 这是 `.txt` 不是 `.json`，需要把扩展名改回 `.json` 后再导入 Tavo
- 改后缀不会影响内容（因为我们用了 `cp` 复制，原 JSON 完整性不变）

如果玩家改回 `.json` 后还是无法导入，说明问题不在截断，而是 JSON 本身有非法字符或 spec 不兼容，需要回到 validate_card.py 排查。

---

## 坑 6：Python 生成脚本里 \u 转义被二次解析

**症状**：用 Python 脚本生成 JSON 卡，运行报 `UnicodeEncodeError: surrogates not allowed` 或 `SyntaxError: unicodeescape`。

**原因**：Python 字符串里的 `\u65E5` 会被 Python 解析为 Unicode 字符"日"。如果这个转义又出现在 JSON 字符串里被 json.dump 二次解析，就会产生 surrogate 字符导致编码错误。

**修复**：

1. JSON 字符串内容用原始字符串（`r""`）或直接写中文字符
2. emoji 字符（如 🎗️）是代理对（surrogate pair），在 Python 源码里直接写字面字符或用 `chr()` 构造，不用 `\uD83C` 转义
3. 生成脚本里检查 surrogate：

```python
def find_surrogates(s, name):
    for i, c in enumerate(s):
        cp = ord(c)
        if 0xD800 <= cp <= 0xDFFF:
            print(f'SURROGATE in {name} at pos {i}: U+{cp:04X}')
```

---

## 坑 7：进度条 float/grid 在 Tavo iframe 里不生效

**症状**：用 `float:left` 或 `display:grid` 做进度条 2 列布局，在浏览器里正常，在 Tavo 里不生效。

**原因**：Tavo 的 iframe 渲染环境可能有 CSS reset 或优先级问题，导致 float/grid 失效。另外如果用了 `@media(max-width:600px)` 的响应式规则，Tavo iframe 宽度可能触发媒体查询，覆盖了桌面端样式。

**修复方案**（按优先级）：

方案 A（推荐）：用 flex + flex-basis
```css
.dr-stat-grid { display:flex; flex-wrap:wrap; gap:4px 10px; }
.dr-stat-row { flex:0 0 calc(50% - 5px); }
```

方案 B：player 正则输出 flex 容器开标签，look 正则闭合
```
player replaceString 末尾加: <div class="dr-stat-grid">
look replaceString 开头加: </div>
```

方案 C：不用外层容器，每个 row 用 `display:inline-flex;width:49%`
```css
.dr-stat-row { display:inline-flex; width:49%; }
```

**注意**：无论哪种方案，都必须配合坑 1 的修复（标签写同一行）。

---

## 坑 8：导入后只有文字没渲染

**症状**：角色卡导入 Tavo 后，消息只显示纯文字（如 `<mis-card>序章...`），所有自定义标签原样暴露，CSS 样式和 JS 交互完全不生效。

**原因**：正则脚本字段配置违反铁律，导致 Tavo 不执行正则替换。常见 7 种错误：

| 错误 | 正确值 | 铁律 | 后果 |
|------|--------|------|------|
| **字段名用 `scriptName`** | **`name`** | — | ⚠️ 最致命！Tavo 只认 `name`，`scriptName` 是无效字段，正则被完全忽略 |
| **只写 CSS 注入正则，没有标签转换正则** | **每个标签单独一条正则转 div** | — | ⚠️ 致命！`<mis-card>` 等自定义标签不会被浏览器渲染，必须用正则转成 `<div class="mis-card">` |
| `markdownOnly: false` | `true` | A3 | 正则不在 markdown 渲染时执行，纯文字暴露 |
| `runOnEdit: true` | `false` | A5 | 编辑时重复渲染（不致命，但应避免） |
| `findRegex` 用 `<mis-card>` 而非 `^`（CSS注入） | `^` | A10 | CSS 没注入到消息开头 |
| `replaceString` 用 `\1` 反向引用 | `$1` | A9 | 捕获组不生效，替换结果错误 |
| `id` 用普通字符串如 `"css"` | UUID 格式 | A1 | Tavo 用 id 去重，非 UUID 可能被忽略 |

**最关键的两点**：
1. **字段名必须是 `name`**，不是 `scriptName`。这是 Tavo 的硬性要求，写错整个正则集都不生效。
2. **每个自定义标签必须有一条对应的正则**，把它转成 `<div class="xxx">`。浏览器不认识 `<mis-card>` 这种自定义标签，会原样显示为文字。标准做法是：CSS 注入 1 条 + 每个标签 1 条转换正则。

**修复方案**：逐条对照 `render-checklist.md` 的 A1-A10 检查。最关键的是 **A3（markdownOnly=true）** 和 **A10（CSS注入 findRegex=^）**——这两个错了必然导致"只有文字没渲染"。

**完整正确的正则脚本模板**（CSS+JS 注入）：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "scriptName": "样式注入",
  "findRegex": "^",
  "replaceString": "<style>...</style><script>...</script>",
  "trimStrings": [],
  "placement": [2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "minDepth": null,
  "maxDepth": null
}
```

**自检命令**：用 `scripts/validate_card.py` 自动检查 A1-A7，手动检查 A8-A10。

---

## 坑 9：选项文本含双引号破坏 HTML 属性

**症状**：多选选项中，部分选项显示异常，文本里混入 `onclick="misToggleChoice(this)">` 这样的原始 HTML 代码，且这些选项无法选中。

**原因**：正则把 `<mis-choice-item>选项文本</mis-choice-item>` 转成 `<div class="mis-choice-item" data-text="选项文本" onclick="...">` 时，如果选项文本里包含双引号（如 `摆摆手表示"不必多礼"`），双引号会提前关闭 `data-text="..."` 属性，导致后面的 `onclick="..."` 被当作文本内容显示。

**修复**：**不要用 data-* 属性存选项文本**。改为在 div 内放一个 `<span class="mis-choice-label">选项文本</span>`，JS 点击时用 `elem.querySelector('.mis-choice-label').textContent` 读取文本。

```javascript
// ❌ 错：用 data-text 属性（选项含双引号会破坏属性）
window.misToggleChoice = function(elem) {
  var text = elem.getAttribute('data-text');  // 含双引号时读取错误
};

// ✅ 对：读取子元素 textContent
window.misToggleChoice = function(elem) {
  var label = elem.querySelector('.mis-choice-label');
  var text = label ? label.textContent.trim() : elem.textContent.trim();
};
```

**正则 replaceString**：
- ❌ 错：`<div class="mis-choice-item" data-text="$1" onclick="...">$1</div>`
- ✅ 对：`<div class="mis-choice-item" onclick="..."><span class="mis-choice-label">$1</span></div>`

**通用原则**：任何用正则把用户内容塞进 HTML 属性的场景，都要警惕内容里可能含双引号。能用子元素 textContent 就别用 data-* 属性。

---

## 速查口诀

> **标签同行不换行、CSS 转义去掉 u、JS 放 style 正则里、发送用 input.set+send、默认 json 截断才换 txt、检查 surrogate、flex 代替 float、markdownOnly 必须 true、用户内容别进 data-* 属性。**

这 9 个动作对应坑 1-9。基础模式做卡时按这个顺序排查，95% 的问题能在前 3 个找到。坑 8（markdownOnly/findRegex 配置错误）是"导入后只有文字没渲染"的头号原因；坑 9（选项文本含双引号破坏属性）是"部分选项显示 HTML 代码"的根因。
