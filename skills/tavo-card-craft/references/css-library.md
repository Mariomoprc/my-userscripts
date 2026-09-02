# CSS 样式库（速查子集）

> ⚠️ **本文件是 `visual-style-guide.md` 的速查子集，不是独立信源。**
>
> - 视觉范式定义、5 种风格选型 → 见 `visual-style-guide.md` 第6节
> - 本文件仅提供 CSS 片段速查，**不得定义新范式**
> - 当本文件与 `visual-style-guide.md` 冲突时，以 `visual-style-guide.md` 为准

> 本文件提供 Tavo 卡的 CSS 样式参考。所有 CSS 通过正则注入（`findRegex: "^"`），不要写在 custom_css 字段。

## 目录

- [CSS 注入正则模板](#css-注入正则模板)
- [1. 基础重置](#1-基础重置)
- [2. 场景样式](#2-场景样式)
- [3. 对话气泡](#3-对话气泡)
- [4. 选项按钮](#4-选项按钮)
- [5. 玩家面板](#5-玩家面板)
- [6. 进度条](#6-进度条)
- [7. 背包网格](#7-背包网格)
- [8. Modal 弹窗](#8-modal-弹窗)
- [9. 隐藏区/揭示](#9-隐藏区揭示)
- [10. 品质着色](#10-品质着色)
- [11. 响应式适配](#11-响应式适配)

---

## CSS 注入正则模板

CSS 通过正则注入，`findRegex: "^"` 匹配消息开头，`replaceString` 是 `<style>...</style>` + 原文。幂等检查用 id。

```json
{
  "id": "<UUID>",
  "name": "{prefix}-style",
  "findRegex": "^",
  "replaceString": "<style id=\"{prefix}-style\">\n{CSS内容}\n</style>\n",
  "placement": [2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0
}
```

**幂等处理**：如果担心重复注入，replaceString 里加 id，浏览器会自动去重相同 id 的 style 标签（但更稳妥的做法是 JS 检查）。

---

## 1. 基础重置

```css
.{prefix}-container {
  font-family: 'Noto Sans SC', sans-serif;
  color: #e0e0e0;
  background: #1a1a2e;
  padding: 16px;
  border-radius: 12px;
  line-height: 1.6;
}

.{prefix}-container * {
  box-sizing: border-box;
}
```

---

## 2. 场景样式

```css
.{prefix}-scene {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-left: 4px solid #0f3460;
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: #a8b4c4;
}

.{prefix}-scene::before {
  content: '📍 ';
  font-style: normal;
}
```

---

## 3. 对话气泡

```css
.{prefix}-dialogue {
  display: flex;
  margin: 8px 0;
  gap: 12px;
}

.{prefix}-dialogue-npc {
  flex-direction: row;
}

.{prefix}-dialogue-player {
  flex-direction: row-reverse;
}

.{prefix}-dialogue-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #0f3460;
  flex-shrink: 0;
}

.{prefix}-dialogue-bubble {
  background: #16213e;
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 70%;
  position: relative;
}

.{prefix}-dialogue-npc .{prefix}-dialogue-bubble {
  border-bottom-left-radius: 4px;
}

.{prefix}-dialogue-player .{prefix}-dialogue-bubble {
  border-bottom-right-radius: 4px;
  background: #0f3460;
}

.{prefix}-dialogue-name {
  font-size: 0.85em;
  color: #7a8a9a;
  margin-bottom: 4px;
}
```

---

## 4. 选项按钮

```css
.{prefix}-choice {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.{prefix}-choice-item {
  display: block;
  padding: 10px 16px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.{prefix}-choice-item:hover {
  background: #0f3460;
  border-color: #e94560;
  transform: translateX(4px);
}

.{prefix}-choice-item::before {
  content: '▸ ';
  color: #e94560;
}
```

---

## 5. 玩家面板

```css
.{prefix}-player {
  background: #0f0f1a;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.{prefix}-player-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.{prefix}-player-label {
  font-size: 0.75em;
  color: #7a8a9a;
  text-transform: uppercase;
}

.{prefix}-player-value {
  font-size: 1.2em;
  font-weight: bold;
  color: #e94560;
}
```

---

## 6. 进度条

```css
.{prefix}-bar {
  width: 100%;
  height: 8px;
  background: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
  margin: 4px 0;
}

.{prefix}-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #0f3460);
  transition: width 0.3s;
}

.{prefix}-bar-hp .{prefix}-bar-fill {
  background: linear-gradient(90deg, #e94560, #ff6b6b);
}

.{prefix}-bar-mp .{prefix}-bar-fill {
  background: linear-gradient(90deg, #0f3460, #4a90d9);
}

.{prefix}-bar-exp .{prefix}-bar-fill {
  background: linear-gradient(90deg, #f5a623, #ffd700);
}
```

---

## 7. 背包网格

```css
.{prefix}-inventory {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
  padding: 12px;
  background: #0f0f1a;
  border-radius: 8px;
}

.{prefix}-inventory-slot {
  aspect-ratio: 1;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.{prefix}-inventory-slot:hover {
  border-color: #e94560;
  transform: scale(1.05);
}

.{prefix}-inventory-slot-empty {
  opacity: 0.3;
}
```

---

## 8. Modal 弹窗

```css
.{prefix}-modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
}

.{prefix}-modal {
  background: #1a1a2e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.{prefix}-modal-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #e94560;
  margin-bottom: 12px;
  border-bottom: 1px solid #0f3460;
  padding-bottom: 8px;
}

.{prefix}-modal-close {
  float: right;
  cursor: pointer;
  color: #7a8a9a;
  font-size: 1.5em;
  line-height: 1;
}

.{prefix}-modal-close:hover {
  color: #e94560;
}
```

---

## 9. 隐藏区/揭示

```css
.{prefix}-hidden {
  background: #0f0f1a;
  color: transparent;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.{prefix}-hidden::before {
  content: '🔒 点击揭示';
  color: #7a8a9a;
}

.{prefix}-hidden.revealed {
  color: #e0e0e0;
  background: #16213e;
}

.{prefix}-hidden.revealed::before {
  content: '';
}
```

---

## 10. 品质着色

```css
[data-quality="common"] { color: #9d9d9d; }
[data-quality="uncommon"] { color: #1eff00; }
[data-quality="rare"] { color: #0070dd; }
[data-quality="epic"] { color: #a335ee; }
[data-quality="legendary"] { color: #ff8000; }

.{prefix}-item[data-quality="legendary"] {
  border-color: #ff8000;
  box-shadow: 0 0 8px rgba(255, 128, 0, 0.5);
}
```

---

## 11. 响应式适配

```css
@media (max-width: 600px) {
  .{prefix}-container {
    padding: 8px;
    font-size: 0.9em;
  }

  .{prefix}-dialogue-bubble {
    max-width: 85%;
  }

  .{prefix}-player {
    grid-template-columns: 1fr 1fr;
  }

  .{prefix}-inventory {
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  }
}
```

---

## 配色方案参考

| 风格 | 主色 | 辅色 | 强调色 | 适合 |
|------|------|------|--------|------|
| 暗夜 | #1a1a2e | #16213e | #e94560 | 末日/悬疑 |
| 修真 | #2c1810 | #5c3a1e | #d4af37 | 修真/古风 |
| 清新 | #f0f4f8 | #d6e4f0 | #4a90d9 | 经营/养成 |
| 赛博 | #0a0a0a | #1a1a2e | #00ff88 | 科幻/赛博 |
| 暖阳 | #fff5e6 | #ffe0b3 | #ff8c42 | 日常/恋爱 |
