# 扩展标签模式（基础模式可用）

> 本文件提供 5 个扩展标签模式，纯正则 + 轻量 JS，基础模式就能用。每个模式独立，按需选用。

## 目录

- [K.1 隐藏风险选项（hidden_risk）](#k1-隐藏风险选项hidden_risk)
- [K.2 品质等级着色（data-quality）](#k2-品质等级着色data-quality)
- [K.3 复合面板（主面板+子项嵌套）](#k3-复合面板主面板子项嵌套)
- [K.4 网格地图](#k4-网格地图)
- [K.5 双向交易](#k5-双向交易)
- [模式汇总](#模式汇总)

---

## K.1 隐藏风险选项（hidden_risk）

**用途**：选项表面看不出来，但点击后会触发风险事件。增加博弈感。

### 标签

```xml
<{prefix}-choice>
  <{prefix}-choice-item risk="high">强行突破</{prefix}-choice-item>
  <{prefix}-choice-item risk="low">稳扎稳打</{prefix}-choice-item>
  <{prefix}-choice-item risk="hidden">？？？</{prefix}-choice-item>
</{prefix}-choice>
```

### 正则

```json
{
  "id": "<UUID>",
  "name": "{prefix}-choice-item-risk",
  "findRegex": "<{prefix}-choice-item\\s+risk=\"(\\w+)\">([\\s\\S]*?)</{prefix}-choice-item>",
  "replaceString": "<button class=\"{prefix}-choice-item\" data-risk=\"$1\" onclick=\"tavo.input.set(this.innerText); tavo.input.send()\">$2</button>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

### CSS

```css
.{prefix}-choice-item[data-risk="high"] {
  border-color: #e94560;
}
.{prefix}-choice-item[data-risk="high"]::after {
  content: ' ⚠';
  color: #e94560;
}
.{prefix}-choice-item[data-risk="hidden"] {
  color: #7a8a9a;
  font-style: italic;
}
.{prefix}-choice-item[data-risk="hidden"]:hover {
  color: #e94560;
}
```

---

## K.2 品质等级着色（data-quality）

**用途**：物品/技能按品质着色，一眼看出稀有度。

### 标签

```xml
<{prefix}-item quality="legendary">天罡剑</{prefix}-item>
<{prefix}-item quality="epic">玄冰符</{prefix}-item>
<{prefix}-item quality="rare">聚灵丹</{prefix}-item>
<{prefix}-item quality="common">木剑</{prefix}-item>
```

### 正则

```json
{
  "id": "<UUID>",
  "name": "{prefix}-item-quality",
  "findRegex": "<{prefix}-item\\s+quality=\"(\\w+)\">([\\s\\S]*?)</{prefix}-item>",
  "replaceString": "<span class=\"{prefix}-item\" data-quality=\"$1\">$2</span>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

### CSS

```css
.{prefix}-item[data-quality="common"] { color: #9d9d9d; }
.{prefix}-item[data-quality="uncommon"] { color: #1eff00; }
.{prefix}-item[data-quality="rare"] { color: #0070dd; }
.{prefix}-item[data-quality="epic"] { color: #a335ee; }
.{prefix}-item[data-quality="legendary"] {
  color: #ff8000;
  text-shadow: 0 0 4px rgba(255, 128, 0, 0.5);
}
```

---

## K.3 复合面板（主面板+子项嵌套）

**用途**：一个面板里嵌套多个子项，比如角色面板里嵌套装备/技能/状态。

### 标签

```xml
<{prefix}-panel title="角色状态">
  <{prefix}-panel-section title="基础">
    <{prefix}-stat name="HP" value="80/100"/>
    <{prefix}-stat name="MP" value="45/50"/>
  </{prefix}-panel-section>
  <{prefix}-panel-section title="装备">
    <{prefix}-item quality="legendary">天罡剑</{prefix}-item>
    <{prefix}-item quality="rare">玄铁甲</{prefix}-item>
  </{prefix}-panel-section>
</{prefix}-panel>
```

### 正则（3 条）

- `{prefix}-panel`：外层容器
- `{prefix}-panel-section`：分区
- `{prefix}-stat`：单条数值

### CSS

```css
.{prefix}-panel {
  background: #0f0f1a;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}
.{prefix}-panel-title {
  font-weight: bold;
  color: #e94560;
  border-bottom: 1px solid #0f3460;
  padding-bottom: 6px;
  margin-bottom: 8px;
}
.{prefix}-panel-section {
  margin: 8px 0;
}
.{prefix}-panel-section-title {
  font-size: 0.85em;
  color: #7a8a9a;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.{prefix}-stat {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
.{prefix}-stat-name { color: #a8b4c4; }
.{prefix}-stat-value { color: #e94560; font-weight: bold; }
```

---

## K.4 网格地图

**用途**：网格化地图，点击格子移动/探索。

### 标签

```xml
<{prefix}-map cols="5" rows="4" current="7">
  <{prefix}-map-cell id="0" type="wall"/>
  <{prefix}-map-cell id="1" type="path"/>
  <{prefix}-map-cell id="2" type="treasure">宝箱</{prefix}-map-cell>
  <{prefix}-map-cell id="3" type="enemy">哥布林</{prefix}-map-cell>
  <{prefix}-map-cell id="7" type="player">你</{prefix}-map-cell>
</{prefix}-map>
```

### 正则

```json
{
  "id": "<UUID>",
  "name": "{prefix}-map",
  "findRegex": "<{prefix}-map\\s+cols=\"(\\d+)\"\\s+rows=\"(\\d+)\"\\s+current=\"(\\d+)\">([\\s\\S]*?)</{prefix}-map>",
  "replaceString": "<div class=\"{prefix}-map\" style=\"grid-template-columns:repeat($1,1fr)\" data-current=\"$3\">$4</div>",
  "placement": [2],
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0,
  "disabled": false
}
```

### CSS

```css
.{prefix}-map {
  display: grid;
  gap: 2px;
  background: #0f0f1a;
  padding: 8px;
  border-radius: 8px;
  margin: 8px 0;
}
.{prefix}-map-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.8em;
  cursor: pointer;
}
.{prefix}-map-cell[data-type="wall"] { background: #333; }
.{prefix}-map-cell[data-type="path"] { background: #1a1a2e; }
.{prefix}-map-cell[data-type="treasure"] { background: #4a3500; color: #ffd700; }
.{prefix}-map-cell[data-type="enemy"] { background: #4a0000; color: #ff6b6b; }
.{prefix}-map-cell[data-type="player"] {
  background: #0f3460; color: #fff;
  box-shadow: 0 0 8px #4a90d9;
}
```

### JS（点击移动）

```javascript
document.addEventListener('click', (e) => {
  const cell = e.target.closest('.{prefix}-map-cell');
  if (cell) {
    const id = cell.getAttribute('data-id');
    tavo.input.set(`移动到格子 ${id}`); tavo.input.send();
  }
});
```

---

## K.5 双向交易

**用途**：买卖交易，左侧我的物品，右侧 NPC 物品，中间金币显示。

### 标签

```xml
<{prefix}-trade gold="500">
  <{prefix}-trade-side who="me" title="我的背包">
    <{prefix}-trade-item name="木剑" value="50" quality="common"/>
    <{prefix}-trade-item name="聚灵丹" value="100" quality="rare"/>
  </{prefix}-trade-side>
  <{prefix}-trade-side who="npc" title="商人" npc-name="老王">
    <{prefix}-trade-item name="玄铁甲" value="300" quality="epic"/>
    <{prefix}-trade-item name="天罡剑" value="800" quality="legendary"/>
  </{prefix}-trade-side>
</{prefix}-trade>
```

### 正则（4 条）

- `{prefix}-trade`：交易容器
- `{prefix}-trade-side`：单侧
- `{prefix}-trade-item`：物品项
- `{prefix}-trade-gold`：金币显示

### JS（交易逻辑）

```javascript
(function() {
  let myGold = 500;
  let cart = [];
  
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.{prefix}-trade-item');
    if (item) {
      const side = item.closest('.{prefix}-trade-side').getAttribute('data-who');
      const name = item.getAttribute('data-name');
      const value = parseInt(item.getAttribute('data-value'));
      
      if (side === 'npc') {
        // 买
        if (myGold >= value) {
          myGold -= value;
          cart.push(`购买 ${name}（-${value}金币）`);
        } else {
          tavo.utils.toast('金币不足');
        }
      } else {
        // 卖
        myGold += value;
        cart.push(`出售 ${name}（+${value}金币）`);
      }
      updateGold();
    }
    
    const submit = e.target.closest('.{prefix}-trade-submit');
    if (submit && cart.length) {
      tavo.input.set(cart.join('；'); tavo.input.send());
      cart = [];
    }
  });
  
  function updateGold() {
    const el = document.querySelector('.{prefix}-trade-gold');
    if (el) el.textContent = myGold;
  }
})();
```

---

## 模式汇总

| 模式 | 正则数 | 需要 JS | 适合 |
|------|--------|---------|------|
| K.1 隐藏风险选项 | 1 | 否 | 博弈/策略 |
| K.2 品质着色 | 1 | 否 | RPG/收集 |
| K.3 复合面板 | 3 | 否 | RPG/养成 |
| K.4 网格地图 | 1 + JS | 是 | 探索/冒险 |
| K.5 双向交易 | 4 + JS | 是 | 经营/RPG |

**组合建议**：K.2（品质着色）几乎百搭，建议所有 RPG 卡都加。K.3（复合面板）适合需要展示多维度状态的卡。K.4 和 K.5 是专题功能，按玩法选。
