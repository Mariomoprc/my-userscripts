# 基础美化模板库（3 套即插即用方案）

> ⚠️ **本文件是 `visual-style-guide.md` 的模板子集，不是独立信源。**
>
> - 视觉范式选型 → 见 `visual-style-guide.md` 第6节
> - 本文件仅提供 3 套基础模板的完整代码，**不得定义新范式**
> - 当本文件与 `visual-style-guide.md` 冲突时，以 `visual-style-guide.md` 为准

> 本文件提供 3 套纯正则无遮罩的美化模板，直接改前缀就能用。新人默认从这里选一套。

## 目录

- [方案 A：场景+对话+单选](#方案-a场景对话单选)
- [方案 B：多选+自定义+状态](#方案-b多选自定义状态)
- [方案 C：纯对话+好感度](#方案-c纯对话好感度)
- [三套方案对比](#三套方案对比)

---

## 方案 A：场景+对话+单选

**适合**：叙事 RPG、冒险、文字冒险。最经典的"场景描述→对话→选项"三段式。

### 标签体系

```xml
<{prefix}-scene>
  青云宗·天枢峰，辰时，晨雾未散。
</{prefix}-scene>

<{prefix}-dialogue who="npc" name="师父">
  徒儿，今日修炼《太虚剑诀》第三式，可愿一试？
</{prefix}-dialogue>

<{prefix}-choice>
  <{prefix}-choice-item>弟子愿往！</{prefix}-choice-item>
  <{prefix}-choice-item>师父，弟子身体不适，改日可否？</{prefix}-choice-item>
  <{prefix}-choice-item>《太虚剑诀》？弟子想先问其理。</{prefix}-choice-item>
</{prefix}-choice>
```

### 正则脚本（3 条）

**1. {prefix}-style**（CSS 注入）：

```json
{
  "id": "<UUID>",
  "name": "{prefix}-style",
  "findRegex": "^",
  "replaceString": "<style>\n.{prefix}-scene{background:#16213e;border-left:4px solid #0f3460;padding:12px;border-radius:0 8px 8px 0;color:#a8b4c4;margin:8px 0;}\n.{prefix}-dialogue{margin:8px 0;padding:10px 14px;background:#1a1a2e;border-radius:8px;}\n.{prefix}-dialogue[data-who=\"npc\"]{border-left:3px solid #e94560;}\n.{prefix}-dialogue[data-who=\"player\"]{border-left:3px solid #4a90d9;margin-left:24px;}\n.{prefix}-dialogue-name{font-size:0.85em;color:#7a8a9a;margin-bottom:4px;}\n.{prefix}-choice{display:flex;flex-direction:column;gap:8px;margin:12px 0;}\n.{prefix}-choice-item{padding:10px 16px;background:#16213e;border:1px solid #0f3460;border-radius:8px;color:#e0e0e0;cursor:pointer;}\n.{prefix}-choice-item:hover{background:#0f3460;border-color:#e94560;}\n</style>\n",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

**2. {prefix}-scene**（场景正则）：

```json
{
  "id": "<UUID>",
  "name": "{prefix}-scene",
  "findRegex": "<{prefix}-scene>([\\s\\S]*?)</{prefix}-scene>",
  "replaceString": "<div class=\"{prefix}-scene\">$1</div>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

**3. {prefix}-dialogue**（对话正则）：

```json
{
  "id": "<UUID>",
  "name": "{prefix}-dialogue",
  "findRegex": "<{prefix}-dialogue\\s+who=\"(\\w+)\"\\s+name=\"([^\"]+)\">([\\s\\S]*?)</{prefix}-dialogue>",
  "replaceString": "<div class=\"{prefix}-dialogue\" data-who=\"$1\"><div class=\"{prefix}-dialogue-name\">$2</div>$3</div>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

**4. {prefix}-choice**（选项正则）：

```json
{
  "id": "<UUID>",
  "name": "{prefix}-choice",
  "findRegex": "<{prefix}-choice>([\\s\\S]*?)</{prefix}-choice>",
  "replaceString": "<div class=\"{prefix}-choice\">$1</div>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

**5. {prefix}-choice-item**（选项项正则）：

```json
{
  "id": "<UUID>",
  "name": "{prefix}-choice-item",
  "findRegex": "<{prefix}-choice-item>([\\s\\S]*?)</{prefix}-choice-item>",
  "replaceString": "<button class=\"{prefix}-choice-item\" onclick=\"(function(b){var t=b.innerText;tavo.input.set(t); tavo.input.send();})(this)\">$1</button>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

---

## 方案 B：多选+自定义+状态

**适合**：经营、养成、审批。需要多选提交 + 自定义输入 + 状态面板。

### 标签体系

```xml
<{prefix}-player>
  <{prefix}-stat name="金币" value="500"/>
  <{prefix}-stat name="天数" value="3"/>
  <{prefix}-stat name="声望" value="12"/>
</{prefix}-player>

<{prefix}-multichoice submit="提交方案">
  <{prefix}-multichoice-item>升级设施（-200金币）</{prefix}-multichoice-item>
  <{prefix}-multichoice-item>招募员工（-150金币）</{prefix}-multichoice-item>
  <{prefix}-multichoice-item>开展活动（-100金币）</{prefix}-multichoice-item>
</{prefix}-multichoice>

<{prefix}-custom placeholder="或输入你的方案..."/>
```

### 正则脚本（5 条）

CSS 注入 + player + stat + multichoice + multichoice-item + custom + 提交按钮。多选需要 JS 收集选中项，提交时一起发送。

**多选 JS 逻辑**（放 custom_js）：

```javascript
(function() {
  const selected = new Set();
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.{prefix}-multichoice-item');
    if (item) {
      item.classList.toggle('selected');
      const text = item.innerText;
      if (selected.has(text)) selected.delete(text);
      else selected.add(text);
    }
    const submit = e.target.closest('.{prefix}-multichoice-submit');
    if (submit) {
      const msg = Array.from(selected).join('；');
      if (msg) tavo.input.set(msg); tavo.input.send();
      selected.clear();
    }
    const custom = e.target.closest('.{prefix}-custom-submit');
    if (custom) {
      const input = document.querySelector('.{prefix}-custom-input');
      if (input && input.value) {
        tavo.input.set(input.value); tavo.input.send();
        input.value = '';
      }
    }
  });
})();
```

---

## 方案 C：纯对话+好感度

**适合**：单角色叙事、恋爱、悬疑。极简，只有对话和好感度。

### 标签体系

```xml
<{prefix}-affinity who="艾莉丝" value="45" max="100"/>

<{prefix}-dialogue who="艾莉丝" mood="冷淡">
  ...你来做什么。
</{prefix}-dialogue>

<{prefix}-choice>
  <{prefix}-choice-item>只是路过。</{prefix}-choice-item>
  <{prefix}-choice-item>想见你一面。</{prefix}-choice-item>
</{prefix}-choice>
```

### 正则脚本（4 条）

CSS + affinity + dialogue + choice + choice-item。好感度用进度条显示。

---

## 三套方案对比

| 方案 | 正则数 | 适合 | 复杂度 | 状态持久化 |
|------|--------|------|--------|------------|
| A. 场景+对话+单选 | 5 | 叙事 RPG/冒险 | ⭐ | 无 |
| B. 多选+自定义+状态 | 7 | 经营/养成/审批 | ⭐⭐ | 需 JS |
| C. 纯对话+好感度 | 4 | 单角色/恋爱/悬疑 | ⭐ | 无 |
| D. 异世界RPG面板+多选 | 20 | 沙盒RPG/误解流 | ⭐⭐⭐ | 需 JS |

**选择建议**：
- 新人第一次做卡 → 方案 A（最经典，5 条正则就能跑）
- 做经营/养成 → 方案 B（多选 + 状态面板）
- 做单角色叙事 → 方案 C（极简，专注对话）
- 做沙盒RPG/异世界 → 方案 D（RPG面板 + 多选+自定义+一起发出）

---

## 方案 D：异世界RPG面板+多选+自定义+一起发出

**适合**：沙盒 RPG、误解流、开放世界。需要 RPG 人物面板 + 多选选项 + 自定义输入 + 一起发出。

### 标签体系

```xml
<mis-player>
<mis-divider label="VITAL / 生命属性"/>
<mis-stat name="HP" value="50/100" color="hp"/>
<mis-stat name="MP" value="5/20" color="mp"/>
<mis-divider label="EQUIPMENT / 装备"/>
<mis-equip slot="武器" item="锈蚀短剑（F）"/>
<mis-equip slot="饰品" empty/>
</mis-player>

<mis-choice>
<mis-choice-item>选项A</mis-choice-item>
<mis-choice-item>选项B</mis-choice-item>
</mis-choice>

<mis-custom placeholder="或输入你的行动..."/>
<mis-submit>一起发出</mis-submit>
```

### 正则脚本（20 条）

CSS 注入 1 条 + 容器/结构标签 12 条（card/header/name/title/system/narrative/narrative-title/inner/player/scene/choice/hint）+ choice-item 1 条（转可点击多选 div）+ custom 1 条（转 input）+ submit 1 条（转 button）+ divider 1 条 + stat 1 条 + equip 1 条 + dialogue 1 条。

### 多选+自定义+一起发出 JS 逻辑（全局函数 + onclick 内联，基础模式必用）

```javascript
// JS 写在 CSS 注入正则的 replaceString 里，<style>后的<script>中
(function() {
  'use strict';
  if (!window.misSelected) window.misSelected = [];

  // 全局函数：切换选项选中（onclick 内联调用）
  // 注意：读取 .mis-choice-label 的 textContent，不用 data-text（坑9：避免选项含双引号破坏属性）
  window.misToggleChoice = function(elem) {
    elem.classList.toggle('selected');
    var label = elem.querySelector('.mis-choice-label');
    var text = label ? label.textContent.trim() : elem.textContent.trim();
    var idx = window.misSelected.indexOf(text);
    if (idx > -1) window.misSelected.splice(idx, 1);
    else window.misSelected.push(text);
  };

  // 全局函数：提交（收集选中项 + 自定义输入，一起发出）
  window.misSubmit = function() {
    var msgs = [];
    window.misSelected.forEach(function(t) { msgs.push(t); });
    var input = document.querySelector('.mis-custom-input');
    if (input && input.value.trim()) {
      msgs.push(input.value.trim());
      input.value = '';
    }
    if (msgs.length > 0) {
      tavo.input.set(msgs.join('；'));
      tavo.input.send();
      window.misSelected = [];
      document.querySelectorAll('.mis-choice-item.selected').forEach(function(el) {
        el.classList.remove('selected');
      });
    }
  };
})();
```

**正则 replaceString 里的 onclick 内联**：
- choice-item: `<div class="mis-choice-item" onclick="misToggleChoice(this)"><span class="mis-choice-label">$1</span></div>`（⚠️ 不用 data-text，用子元素 label，详见坑 9）
- submit: `<button class="mis-submit-btn" onclick="misSubmit()">$1</button>`

**⚠️ 不要用 `document.addEventListener('click', ...)` 事件委托**，基础模式下会失效（详见 basic-mode-pitfalls.md 坑 3）。

### 关键设计要点

1. **进度条纯 CSS**：用 `linear-gradient` + `--pct` 变量渲染，JS 只计算百分比写入变量
2. **多选交互**：choice-item 转成带勾选框的 div，点击切换 selected 类不直接发送；提交时收集所有选中项 + 自定义输入，用 `；` 连接后 `tavo.input.set + send`
3. **移动端适配**：`@media (max-width: 480px)` 保持列数不变只缩小尺寸（属性3列、装备3列），标题行 flex-wrap 允许换行
