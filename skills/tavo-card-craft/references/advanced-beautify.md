# 高级美化模板与配色方案库

> ⚠️ **本文件是 `visual-style-guide.md` 的进阶子集，不是独立信源。**
>
> - 视觉范式选型 → 见 `visual-style-guide.md` 第6节
> - 基础模板 → 见 `beautify-templates.md`
> - 本文件仅提供配色方案、高级组件、动画等进阶素材，**不得定义新范式**
> - 当本文件与 `visual-style-guide.md` 冲突时，以 `visual-style-guide.md` 为准

> 本文件提取自多张实战卡的CSS设计经验，提供配色方案、高级组件模板、动画效果等。新人先看 beautify-templates.md 的3套基础方案，本文件是进阶美化参考。

## 目录

- [配色方案（5种主题）](#配色方案5种主题)
- [高级组件模板](#高级组件模板)
- [动画与特效](#动画与特效)
- [CSS 技巧集](#css-技巧集)

---

## 配色方案（5种主题）

### 配色 A：末日暗色系

**适合**：末日生存、丧尸、灾难题材

```css
:root {{
  --bg-main: #0a0a0a;
  --bg-card: #141414;
  --bg-card-alt: #1a1a1a;
  --text-main: #c8c8c8;
  --text-dim: #888888;
  --accent: #ff3333;
  --accent-dim: rgba(255, 51, 51, 0.15);
  
  /* 语义色 */
  --danger: #cc0000;
  --safe: #00ff41;
  --warning: #ffaa00;
  --info: #00bfff;
  --purple: #9b30ff;
  
  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  
  /* 圆角 */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
}}
```

**基础样式**：
```css
.{prefix}-container {{
  background: var(--bg-card);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}}

.{prefix}-danger {{
  color: var(--danger);
  animation: dangerPulse 1.5s ease-in-out infinite;
}}

@keyframes dangerPulse {{
  0%, 100% {{ opacity: 1; }}
  50% {{ opacity: 0.4; }}
}}
```

---

### 配色 B：修仙古典色

**适合**：修仙、法宝、玄幻、古风题材

```css
:root {{
  --bg-main: #1a120b;
  --bg-card: rgba(40, 26, 18, 0.85);
  --bg-card-solid: #281a12;
  --text-main: #f0e6d3;
  --text-dim: #a89078;
  --accent: #c9a237;
  --accent-glow: rgba(201, 162, 55, 0.3);
  
  /* 数值色 */
  --hp-color: #c82e2e;
  --mp-color: #4a90e2;
  --exp-color: #c9a237;
  --def-color: #5a8a5a;
  
  /* 品质色阶（7级） */
  --quality-凡品: #b0b0b0;
  --quality-良品: #1eff00;
  --quality-上品: #00bfff;
  --quality-极品: #9932cc;
  --quality-灵宝: #ffd700;
  --quality-仙器: #ff4500;
  --quality-先天至宝: #ff00ff;
}}
```

**品质色应用**：
```css
/* 装备/道具品质边框 */
.{prefix}-item-quality-{品质} {{
  border-left: 3px solid var(--quality-{品质});
  background: linear-gradient(90deg, rgba(201,162,55,0.05), transparent);
}}

/* 传说物品发光 */
.{prefix}-legendary {{
  box-shadow: 0 0 12px var(--quality-灵宝);
  animation: legendaryGlow 2s ease-in-out infinite;
}}

@keyframes legendaryGlow {{
  0% {{ box-shadow: 0 0 8px var(--quality-灵宝); }}
  50% {{ box-shadow: 0 0 20px var(--quality-灵宝), 0 0 30px rgba(255,215,0,0.3); }}
  100% {{ box-shadow: 0 0 8px var(--quality-灵宝); }}
}}
```

---

### 配色 C：可爱明亮色

**适合**：恋爱、养成、温馨、公寓题材

```css
:root {{
  --bg-main: #12121a;
  --bg-card: rgba(22, 25, 38, 0.9);
  --text-main: #ffffff;
  --text-dim: #8888a0;
  --accent: #ff7e5f;
  --accent-secondary: #feb47b;
  --accent-gradient: linear-gradient(90deg, #ff7e5f, #feb47b);
  
  /* 心情色 */
  --mood-normal: #a0a0b8;
  --mood-happy: #00ff7f;
  --mood-angry: #ff4500;
  --mood-anxious: #ffd700;
  --mood-shy: #ff69b4;
  --mood-estrus: #ff4580;
  
  /* 资源色 */
  --funds-color: #00ff7f;
  --reputation-color: #ffd700;
}}
```

**渐变按钮**：
```css
.{prefix}-btn {{
  background: var(--accent-gradient);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}}

.{prefix}-btn:hover {{
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 126, 95, 0.4);
}}

.{prefix}-btn:active {{
  transform: translateY(0);
}}
```

---

### 配色 D：冷峻悬疑色

**适合**：悬疑、推理、封闭空间、生存游戏题材

```css
:root {{
  --bg-main: #0a0a0a;
  --bg-card: #141414;
  --bg-modal: #1a1a1a;
  --text-main: #d4d4d4;
  --text-dim: #666666;
  --accent: #c41e3a;
  --accent-glow: rgba(196, 30, 58, 0.3);
  
  /* 角色专属色（12色循环） */
  --char-1: #C0392B;
  --char-2: #E91E63;
  --char-3: #5B8DBE;
  --char-4: #95A5A6;
  --char-5: #27AE60;
  --char-6: #F39C12;
  --char-7: #8E44AD;
  --char-8: #1ABC9C;
  --char-9: #E74C3C;
  --char-10: #3498DB;
  --char-11: #9B59B6;
  --char-12: #F1C40F;
}}
```

**角色对话框（自动着色）**：
```css
/* data-speaker 属性自动匹配角色色 */
.{prefix}-dialogue {{
  border-left: 3px solid var(--char-1);
  padding: 8px 12px;
  border-radius: 0 4px 4px 0;
  background: var(--bg-card);
  margin: 6px 0;
}}

.{prefix}-dialogue[data-speaker="周瑾瑜"] {{ border-left-color: #C0392B; }}
.{prefix}-dialogue[data-speaker="林婉清"] {{ border-left-color: #E91E63; }}
.{prefix}-dialogue[data-speaker="顾寒声"] {{ border-left-color: #5B8DBE; }}
/* ... 依此类推 */
```

---

### 配色 E：RPG游戏色

**适合**：RPG、冒险、宠物养成、战斗系统

```css
:root {{
  --bg-main: #12121a;
  --bg-card: rgba(22, 25, 38, 0.92);
  --text-main: #e8e8f0;
  --text-dim: #8888a0;
  
  /* 数值条 */
  --hp-color: #ff8fa3;
  --mp-color: #a8c0ff;
  --exp-color: #ffd700;
  --favor-color: #ff7e5f;
  --lust-color: #ff4580;
  
  /* 装备品质（5级） */
  --quality-普通: #e0e0e8;
  --quality-优秀: #7bed9f;
  --quality-稀有: #a8c0ff;
  --quality-史诗: #c89ffc;
  --quality-传说: #ffd700;
}}
```

**HP/MP 进度条**：
```css
.{prefix}-bar {{
  height: 6px;
  background: rgba(0,0,0,0.4);
  border-radius: 3px;
  overflow: hidden;
}}

.{prefix}-bar-fill {{
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}}

.{prefix}-bar-hp .bar-fill {{ background: linear-gradient(90deg, #ff8fa3, #ff6b7a); }}
.{prefix}-bar-mp .bar-fill {{ background: linear-gradient(90deg, #a8c0ff, #8ba8ff); }}
.{prefix}-bar-exp .bar-fill {{ background: linear-gradient(90deg, #ffd700, #ffed4a); }}

/* 危险状态脉动 */
.{prefix}-bar-hp.danger .bar-fill {{
  animation: dangerPulse 1s ease-in-out infinite;
  background: linear-gradient(90deg, #ff4444, #ff6666);
}}
```

---

## 高级组件模板

### 1. 场景面板（带位置/时间/状态）

```css
.{prefix}-scene {{
  background: var(--bg-card);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  margin: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}}

.{prefix}-scene::before {{
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-gradient);
}}

.{prefix}-scene-loc {{
  font-weight: 600;
  color: var(--text-main);
}}

.{prefix}-scene-time {{
  color: var(--text-dim);
  font-size: 12px;
}}

.{prefix}-scene-status {{
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}}

.{prefix}-scene-status.safe {{
  background: rgba(0, 255, 65, 0.15);
  color: var(--safe);
}}

.{prefix}-scene-status.danger {{
  background: rgba(255, 51, 51, 0.15);
  color: var(--danger);
}}
```

**HTML 结构**：
```xml
<{prefix}-scene>
  <loc>青云宗·天枢峰</loc>
  <time>辰时</time>
  <status class="safe">安全</status>
</{prefix}-scene>
```

---

### 2. 数值状态栏（HP/MP/EXP）

```css
.{prefix}-stat-grid {{
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}}

.{prefix}-stat-row {{
  display: flex;
  align-items: center;
  gap: 8px;
}}

.{prefix}-stat-label {{
  min-width: 32px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
}}

.{prefix}-stat-bar {{
  flex: 1;
  height: 8px;
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
}}

.{prefix}-stat-fill {{
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}}

.{prefix}-stat-value {{
  min-width: 60px;
  text-align: right;
  font-size: 11px;
  font-family: monospace;
}}
```

**HTML 结构**：
```xml
<{prefix}-player>
  <{prefix}-stat name="HP" value="8500" max="12000" pct="71"/>
  <{prefix}-stat name="MP" value="3000" max="5000" pct="60"/>
  <{prefix}-stat name="EXP" value="4500" max="10000" pct="45"/>
</{prefix}-player>
```

---

### 3. 选项卡片组

```css
.{prefix}-choice-container {{
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
}}

.{prefix}-choice-item {{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}}

.{prefix}-choice-item:hover {{
  transform: translateX(4px);
  border-color: var(--accent);
  background: var(--accent-dim);
}}

.{prefix}-choice-item.selected {{
  border-color: var(--accent);
  background: var(--accent-dim);
}}

.{prefix}-choice-item.selected::before {{
  content: '✓';
  color: var(--accent);
  font-weight: bold;
}}

.{prefix}-choice-icon {{
  width: 20px;
  height: 20px;
  border: 2px solid var(--text-dim);
  border-radius: 50%;
  flex-shrink: 0;
}}

.{prefix}-choice-item.selected .choice-icon {{
  border-color: var(--accent);
  background: var(--accent);
}}
```

---

### 4. 系统对话框

```css
.{prefix}-dialogue-system {{
  background: linear-gradient(135deg, rgba(201,162,55,0.1), rgba(201,162,55,0.05));
  border: 1px solid rgba(201,162,55,0.3);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 10px 14px;
  margin: 10px 0;
  font-size: 13px;
  line-height: 1.6;
}}

.{prefix}-dialogue-system::before {{
  content: '⚡ 系统';
  display: block;
  font-size: 10px;
  color: var(--accent);
  margin-bottom: 4px;
  letter-spacing: 1px;
}}
```

---

### 5. 装备面板（网格布局）

```css
.{prefix}-equipment-grid {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}}

.{prefix}-equip-slot {{
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  padding: 6px;
  transition: all 0.2s ease;
}}

.{prefix}-equip-slot:hover {{
  border-color: var(--accent);
  transform: translateY(-2px);
}}

.{prefix}-equip-slot.empty {{
  opacity: 0.4;
}}

.{prefix}-equip-icon {{
  font-size: 20px;
  margin-bottom: 4px;
}}

.{prefix}-equip-name {{
  font-size: 9px;
  text-align: center;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}}

/* 响应式：移动端2列 */
@media (max-width: 480px) {{
  .{prefix}-equipment-grid {{
    grid-template-columns: repeat(2, 1fr);
  }}
}}
```

---

## 动画与特效

### 常用关键帧

```css
/* 危险脉动 - 用于低HP警告 */
@keyframes dangerPulse {{
  0%, 100% {{ opacity: 1; }}
  50% {{ opacity: 0.4; }}
}}

/* 弹窗进入 */
@keyframes modalIn {{
  from {{
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }}
  to {{
    opacity: 1;
    transform: scale(1) translateY(0);
  }}
}}

/* 流光滑动 */
@keyframes shimmerSlide {{
  0% {{ left: -100%; }}
  100% {{ left: 100%; }}
}}

/* 传说呼吸光 */
@keyframes legendaryGlow {{
  0% {{ box-shadow: 0 0 8px var(--legendary-color); }}
  50% {{ box-shadow: 0 0 18px var(--legendary-color), 0 0 30px rgba(255,215,0,0.2); }}
  100% {{ box-shadow: 0 0 8px var(--legendary-color); }}
}}

/* 摇晃警告 */
@keyframes shake {{
  0%, 100% {{ transform: translateX(0); }}
  25% {{ transform: translateX(-5px); }}
  75% {{ transform: translateX(5px); }}
}}

/* 淡入 */
@keyframes fadeIn {{
  from {{ opacity: 0; }}
  to {{ opacity: 1; }}
}}

/* 上浮 */
@keyframes slideUp {{
  from {{
    opacity: 0;
    transform: translateY(10px);
  }}
  to {{
    opacity: 1;
    transform: translateY(0);
  }}
}}
```

### 常用过渡

```css
/* 快速反馈 */
.{prefix}-btn, .{prefix}-choice-item {{
  transition: all 0.15s ease;
}}

/* 标准过渡 */
.{prefix}-bar-fill, .{prefix}-container {{
  transition: all 0.2s ease;
}}

/* 平滑过渡 */
.{prefix}-modal, .{prefix}-panel {{
  transition: all 0.3s ease;
}}
```

---

## CSS 技巧集

### 1. CSS 变量集中管理

```css
:root {{
  /* 主题色 */
  --accent: #ff7e5f;
  --accent-glow: rgba(255, 126, 95, 0.3);
  
  /* 背景 */
  --bg-main: #12121a;
  --bg-card: rgba(22, 25, 38, 0.9);
  
  /* 文字 */
  --text-main: #ffffff;
  --text-dim: #8888a0;
  
  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  
  /* 圆角 */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-pill: 20px;
  
  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
}}
```

### 2. 伪元素装饰

```css
/* 顶部装饰线 */
.{prefix}-container::before {{
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}}

/* 角落装饰 */
.{prefix}-panel::after {{
  content: '◆';
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 12px;
  color: var(--accent);
}}
```

### 3. 毛玻璃效果

```css
.{prefix}-modal-backdrop {{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
}}

.{prefix}-modal {{
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 30px rgba(0,0,0,0.7);
  animation: modalIn 0.2s ease;
}}
```

### 4. 自定义滚动条

```css
/* Webkit 滚动条 */
.{prefix}-container::-webkit-scrollbar {{
  width: 3px;
  height: 3px;
}}

.{prefix}-container::-webkit-scrollbar-track {{
  background: transparent;
}}

.{prefix}-container::-webkit-scrollbar-thumb {{
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}}

.{prefix}-container::-webkit-scrollbar-thumb:hover {{
  background: rgba(255,255,255,0.2);
}}

/* Firefox 滚动条 */
.{prefix}-container {{
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}}
```

### 5. 响应式适配

```css
/* 移动端适配 */
@media (max-width: 768px) {{
  .{prefix}-container {{
    padding: var(--space-sm);
  }}
  
  .{prefix}-stat-grid {{
    grid-template-columns: 1fr;
  }}
}}

@media (max-width: 480px) {{
  .{prefix}-equipment-grid {{
    grid-template-columns: repeat(2, 1fr);
  }}
  
  .{prefix}-btn {{
    min-height: 44px; /* 触摸目标 */
  }}
}}
```

---

## 速查对照表

| 效果 | 代码 | 备注 |
|------|------|------|
| 危险脉动 | `animation: dangerPulse 1.5s ease-in-out infinite` | 低HP警告 |
| 传说发光 | `animation: legendaryGlow 2s ease-in-out infinite` | 传说装备 |
| 弹窗进入 | `animation: modalIn 0.2s ease` | Modal显示 |
| 按钮悬停 | `transform: translateY(-2px); box-shadow: ...` | 交互反馈 |
| 选项右移 | `transform: translateX(4px); border-color: var(--accent)` | Hover效果 |
| 左侧强调 | `border-left: 3px solid var(--accent)` | 角色对话 |
| 渐变填充 | `background: linear-gradient(90deg, #color1, #color2)` | 进度条 |
| 毛玻璃 | `backdrop-filter: blur(12px)` | 遮罩背景 |

---

**设计原则**：配色服务于氛围，组件服务于功能，动画服务于反馈。
