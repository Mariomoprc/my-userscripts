# 视觉美化速查手册（CSS 单一信源）

> ⚠️ **本文件是 CSS 与视觉范式的唯一权威信源。**
>
> `css-library.md`、`beautify-templates.md`、`advanced-beautify.md` 均为本文件的速查/扩展子集，
> 当内容冲突时以本文件为准。其他文件只允许引用本文件，不得定义新范式或新配方。

> **本文件只讲"做出来的卡好不好看"——CSS 框架、字号、颜色、容器尺寸、进度条、动画。**
> **不讲标签体系、不讲正则脚本、不讲玩法逻辑。那些见其他 references。**
>
> 范式提炼自 6 张实战卡：艾恩大陆(SAO)、不要抓亚人呀(PX-宝可梦)、末日丧尸生存、开放式修仙、封闭公司、怎么又是你(RPG)。
> **艾恩大陆与"怎么又是你"共用同一套 CSS 模板（仅换前缀）**——所以二者本质是**一个范式**。

---

## 0. 总览：5 种视觉范式

| 范式 | 代表 | 主色 | 字体策略 | 圆角 | 复杂度 | 适合 |
|------|------|------|---------|------|--------|------|
| **A. SAO/RPG 极客霓虹** | 艾恩大陆 / 怎么又是你 | 深色底 + 单一霓虹 | 系统无衬线 + 等宽 | 12px | 中 | RPG 战斗、数值面板 |
| **B. PX- 二次元卡牌** | 不要抓亚人呀 | 黑底 + 粉色霓虹 + 大量渐变 | 系统无衬线 | 2-8px | 极高（254 class + 44 动画） | 宝可梦/对战/Galgame |
| **C. 末日生存冷峻** | 末日丧尸生存 | 黑底 + 红色高亮 | 系统无衬线 | 2-3px | 高 | 生存恐怖、探索、物资 |
| **D. 修仙养成国风** | 开放式修仙 | 米黄 + 多品阶色 | 系统无衬线 | var() 驱动 + 14 品质色 | 极高（303 class） | 养成/经营/门派 |
| **E. 商务红黑** | 封闭公司 | 黑底 + 血红警示 | **Google Fonts: Cinzel + Noto Serif SC + JetBrains Mono** | 2-4px | 中 | 商业、悬疑、管理博弈 |

> **不要硬选一种**——实战里常组合：比如「PX- 风格做战斗面板 + 封闭公司的衬线字体做角色卡 + 修仙的品阶色做装备」。下面 第6节 会讲怎么拆组件复用。

---

## 1. 字号系统

**核心经验：实战卡的正文字号集中在 9-13px，标题 14-18px**。这个范围在 SillyTavern/酒馆的角色消息区里渲染最舒服——太大撑爆容器，太小看不清。

### 1.1 推荐字号档位（5 张卡的共识）

| 用途 | 推荐值 | 出现频次最高的来源 |
|------|--------|-------------------|
| 大标题（H1） | 18-20px | 封闭公司 20 / 末日 18 / 修仙 16 |
| 章节标题（H2） | 14-16px | 5 张卡都有 |
| H3 / 标签标题 | 13-14px | 封闭公司 13 / 修仙 13 |
| **正文** | **11-12px** | 封闭公司 13 / 末日 11 / 修仙 11 |
| 标签 / 副文 | 9-10px | 怎么又是你 9-10 / 末日 9 |
| 极小字（角标） | 7-8px | 怎么又是你 7-8（粒子标签上的数字） |

### 1.2 反模式
- ❌ 正文用 16px+ → 5 张卡没人这么做，撑爆酒馆的消息气泡
- ❌ 字号档位超过 6 个 → 看起来花，但实战卡都在 5-6 档内
- ❌ 全部用 em/rem → 5 张卡全用 px，因为酒馆渲染 em 不可控

### 1.3 字号变量化（推荐）
封闭公司用了 5 个变量统一管理：
```css
:root {
  --h1: 20px; --h2: 15px; --h3: 13px; --body: 13px; --cap: 11px;
}
```
修仙也用 `--ui-radius` 等变量统一管理。**强烈建议照搬**——以后改色改字只改一个地方。

---

## 2. 颜色系统

### 2.1 三层色系结构

实战卡的颜色都遵循**「底色 → 内容色 → 状态色」三层结构**：

```
:root {
  /* 第1层：底色（背景/容器） */
  --bg:     #0a192f;      /* 主背景 */
  --bg-2:   #0e0e0e;      /* 次级背景/卡片 */
  --card:   rgba(17,34,64,.85);  /* 卡片半透明叠加 */

  /* 第2层：内容色（文字/边框） */
  --text-main: #e6f1ff;   /* 主文字 */
  --text-sub:  #8892b0;   /* 副文字/标签 */
  --border:    #233554;   /* 默认边框 */

  /* 第3层：状态色（语义化） */
  --hp: #00ff7f;  --hp-danger: #ff4500;
  --mp: #00bfff;
  --exp: #ffd700;
  --safe: #00ff7f;  --combat: #ff4500;  --danger: #ff8c00;
  --friend: #64ffda;  --hostile: #ff4500;  --neutral: #8892b0;
  --accent: #64ffda;  /* 主题霓虹色，1 张卡只用 1 个 */
}
```

### 2.2 6 张卡的主题色速查

| 范式 | 主题色 | 底色 | 文字主 | 警示色 |
|------|--------|------|--------|--------|
| A. SAO 极客 | `#64ffda` 青 | `#0a192f` 海军蓝 | `#e6f1ff` | `#ff4500` 橙红 |
| A. RPG 柔粉 | `#f4b8c8` 浅粉 | `#1a1a2e` 深夜紫 | `#f0f0f5` | `#ff4757` 红 |
| B. PX- 卡牌 | `#f472b6` 粉 | `#0d0d0d` 纯黑 | `#fff` | `#ef4444` 红 |
| C. 末日 | `#4ade80` 绿 | `#0e0e0e` 黑 | `#ddd` | `#ff3333` 血红 |
| D. 修仙 | `#c9a237` 金 | `#f5e6c8` 米黄 | `#333` | `#c82e2e` 朱红 |
| E. 公司 | `#c41e3a` 血红 | `#0a0a0a` 黑 | `#d4d4d4` | `#c41e3a` 血红 |

### 2.3 品阶色（5 段式，最常用）

`怎么又是你` / `艾恩大陆` / `修仙` 都用同一套 5 段品阶色——做装备/技能/物品必备：

```css
--quality-normal:     #e0e0e8;  /* 普通：灰白 */
--quality-uncommon:   #7bed9f;  /* 优秀：绿 */
--quality-rare:       #a8c0ff;  /* 稀有：蓝 */
--quality-epic:       #c89ffc;  /* 史诗：紫 */
--quality-legendary:  #ffd700;  /* 传说：金 */
```

修仙扩展到 14 段（凡品/良品/上品/极品/玄级/地级/天级/灵宝/仙器/仙级/圣级/先天至宝...）——**一般 5 段够用**，扩到 8 段以上开始难分辨。

### 2.4 状态色速查

酒馆最常用的 8 种状态色（6 张卡出现 ≥4 次）：

| 语义 | 色值 | 用在 |
|------|------|------|
| 危险/红 | `#ef4444` / `#ff4757` / `#ff3333` | HP 危险、敌对、死亡 |
| 成功/绿 | `#4ade80` / `#7bed9f` / `#00ff7f` | 治疗、友方、激活 |
| 警示/橙 | `#f97316` / `#ff8c00` / `#ffa07a` | 中性警告、ATK |
| 信息/蓝 | `#00bfff` / `#a8c0ff` / `#4a90e2` | MP、Buff |
| 金/财 | `#ffd700` / `#d4af37` | 经验、奖励、金币 |
| 紫/稀有 | `#a78bfa` / `#c89ffc` / `#8B5CF6` | 史诗、特殊 |
| 粉/魅 | `#ec4899` / `#f472b6` / `#ff69b4` | Galgame 好感、捕获 |
| 灰/未激 | `#888` / `#9a9ab0` / `#666` | 副文、未激活 Tab |

### 2.5 透明叠加层

实战卡大量用 `rgba(255,255,255,0.06-0.18)` 做半透明叠加，模拟玻璃态：

```css
background: rgba(255,255,255,0.06);  /* 玻璃态底 */
border: 1px solid rgba(244,184,200,0.18);  /* 半透明边框 */
backdrop-filter: blur(12px);  /* 磨砂（部分酒馆支持） */
```

> ⚠️ `backdrop-filter` 在酒馆/移动端可能不渲染，但写上不亏，PC 上会自动用上。

---

## 3. 容器 / 卡片系统

### 3.1 卡片基类（6 张卡通用范式）

```css
.rpg-card {  /* 用你的前缀替换 rpg */
  background: linear-gradient(135deg, #0a0a0a 0%, #141414 100%);
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  margin: 10px 0;
  padding: 16px 22px;
  box-shadow: 0 4px 28px rgba(0,0,0,0.7);
  overflow: hidden;
}
```

**变体**：
- **封闭公司**：`border-radius: 4px`（商务方角）+ `box-shadow: 0 4px 28px rgba(0,0,0,0.7)`（重阴影）
- **怎么又是你**：`border-radius: 12px`（圆角活泼）+ `backdrop-filter: blur(12px)`（玻璃态）
- **末日**：`border-radius: 2-3px`（工业硬边）+ `border-left: 3px solid #c41e3a`（左侧警示条）

### 3.2 状态条 / 进度条（核心组件）

**最经典范式**（怎么又是你 + 艾恩大陆 + 修仙都在用）：

```css
.rpg-bar { display: flex; flex-direction: column; gap: 3px; }
.rpg-bar-label {
  font-size: 10px; color: var(--text-sub);
  display: flex; justify-content: space-between;
}
.rpg-bar-track {
  height: 6px;             /* 短条 6px，长条 8px */
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
}
.rpg-bar-fill {
  height: 100%;
  transition: width 0.5s ease;   /* 平滑过渡 */
  background: linear-gradient(90deg, var(--hp), #ffb8c6);
}
.rpg-bar-full .rpg-bar-track { height: 8px; }  /* 主血条加粗到 8px */
```

**7 种常见状态条的配色**（怎么又是你全集）：

```css
.rpg-bar-hp      .rpg-bar-fill { background: linear-gradient(90deg, #ff8fa3, #ffb8c6); }
.rpg-bar-hp.danger .rpg-bar-fill { background: #ff4757; animation: hpDanger 1s infinite; }
.rpg-bar-mp      .rpg-bar-fill { background: linear-gradient(90deg, #a8c0ff, #c8d8ff); }
.rpg-bar-exp     .rpg-bar-fill { background: linear-gradient(90deg, #ffd700, #ffe566); }
.rpg-bar-fav     .rpg-bar-fill { background: linear-gradient(90deg, #f4b8c8, #ffd6e0); }
.rpg-bar-hate    .rpg-bar-fill { background: #ff6b6b; animation: barGlow 1.5s infinite; }
.rpg-bar-atk     .rpg-bar-fill { background: linear-gradient(90deg, #ff6b6b, #ffa07a); }
.rpg-bar-def     .rpg-bar-fill { background: linear-gradient(90deg, #9a9ab0, #c0c0d0); }
```

**经验值**：
- 普通条 **6px**、主条（HP/经验）**8-10px**
- 高度 10px+ 时加 `border-radius: 5px`（半圆），低于 8px 不用圆角
- 必须加 `transition: width 0.5s ease` —— 数值变化有动画才好看

### 3.3 状态条网格布局

```css
.rpg-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 双列 */
  gap: 8px;
  border-top: 1px solid var(--accent-dim);
  border-bottom: 1px solid var(--accent-dim);
  padding: 10px 0;
}
.rpg-bar-full { grid-column: 1/-1; }  /* 主条占满整行 */
```

**实战变体**：
- 修仙 / 末日：用 `grid-template-columns: repeat(3, 1fr)` 三列
- 怎么又是你：双列 + 主条跨行
- 封闭公司：不用网格，用 flex 横排 + 状态徽章

### 3.4 容器尺寸

| 元素 | 推荐宽度 | 来源 |
|------|---------|------|
| 卡片最大宽 | `max-width: 100%`（让酒馆气泡决定） | 6 张卡共识 |
| 对话框 | `max-width: 480px` | 怎么又是你 |
| 战斗面板 | `max-width: 600-720px` | 不要抓亚人呀 |
| 数值网格单元 | `min-width: 140px` | 修仙 |
| 头像 | `width: 60-80px` | 5 张卡 |

> ⚠️ **不要写死 width: 100% 或 800px**——让容器用 `max-width` + `margin: auto`，让酒馆窗口决定实际宽度。

### 3.5 间距 / 内边距

| 用途 | 值 |
|------|---|
| 卡片外距 | `margin: 10px 0` |
| 卡片内距 | `padding: 16px 22px` |
| 章节内距 | `padding: 12px 20px` |
| 元素间隙 | `gap: 8-12px` |
| 行高 | `line-height: 1.6-1.85`（封闭公司 1.85 是高可读性极限） |

---

## 4. 字体系统

### 4.1 三种字体策略（5 张卡用的就是这三种）

| 策略 | 字体 | 代表 | 适合 |
|------|------|------|------|
| **纯系统** | `Segoe UI, 思源黑体, Microsoft YaHei, sans-serif` + `Consolas, Monaco, monospace` | 怎么又是你 / 艾恩大陆 / 末日 / 修仙 | 不引外网、移动端稳 |
| **Google Fonts 衬线** | `Cinzel, Noto Serif SC, STSong, serif` + `JetBrains Mono` | 封闭公司 | PC 端、有外网、想做出高级感 |
| **系统中文衬线** | `STSong, SimSun, serif` | 部分卡 fallback | 不想引外网但要衬线 |

**封闭公司 `@import` 范式**（推荐照搬）：
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@300;400;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
:root {
  --f-serif:    'Noto Serif SC', 'STSong', 'SimSun', serif;
  --f-mono:     'JetBrains Mono', 'SF Mono', Consolas, monospace;
  --f-display:  'Cinzel', 'Noto Serif SC', serif;
}
```

> 💡 **Cinzel 是拉丁石碑体**——做"严肃/古典/商务"一秒出氛围。Noto Serif SC 是中文思源宋体。两者搭配做"中西混血高级感"是封闭公司 v2.6 的招牌。

### 4.2 字体混搭的 4 个角色

| 角色 | 用什么 | 例子 |
|------|--------|------|
| 角色名 / 标题 | display 字体（衬线/特殊） | `font-family: var(--f-display)` |
| 正文 | 主字体（系统无衬线 / 宋体） | `font-family: var(--f-serif)` |
| 数值 / 时间戳 / 状态码 | 等宽 | `font-family: var(--f-mono); letter-spacing: 1-2px` |
| 标签 / 副文 | 主字体 + 小号 + 灰 | `font-size: 10px; color: var(--text-sub); text-transform: uppercase; letter-spacing: 2px` |

### 4.3 字符间距（letter-spacing）

实战卡里 4 个高频用法：
- **0.3px** —— 角色名/正文字距，`letter-spacing: 0.3px`（怎么又是你）
- **1px** —— 章节标题，`letter-spacing: 1px`（封闭公司 H1）
- **2-3px** —— 全大写副文/状态码，营造"打字机/档案"感
- **3px** —— 角色名大写时，营造仪式感（封闭公司 `.cc-name-big: letter-spacing: 3px`）

### 4.4 反模式
- ❌ 在卡片里用 emoji 字体：emoji 字号会盖过正文，看着像没做完
- ❌ 中英文混排不加 fallback：必须 `'Noto Serif SC', 'STSong', 'SimSun', serif`
- ❌ 装饰字（display）用在正文：会读不下去

---

## 5. 动画系统

### 5.1 6 张卡动画的 4 个目的

| 目的 | 动画 | 例子 |
|------|------|------|
| **状态警示** | 闪烁/呼吸 | `@keyframes hpDanger { 0%, 50% { opacity/brightness } }` |
| **数值变化** | 进度条过渡 | `transition: width 0.5s ease`（必须，6 张卡全用） |
| **入场/出场** | 淡入 + 轻微位移 | `@keyframes modalIn { from { opacity: 0; transform: translateY(4px) } }` |
| **氛围** | 粒子 / 光晕 / 摇摆 | 不要抓亚人呀 44 个粒子动画 |

### 5.2 必装的 4 个核心动画

```css
/* 1. 进度条过渡（必须） */
.rpg-bar-fill { transition: width 0.5s ease; }

/* 2. HP 危险闪烁（必装） */
@keyframes hpDanger {
  0%   { opacity: 0.8; }
  50%  { opacity: 1; filter: brightness(1.4); }
  100% { opacity: 0.8; }
}

/* 3. 模态框淡入（必装） */
@keyframes modalIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 4. 传说品阶发光（选装） */
@keyframes legendaryGlow {
  0%, 100% { box-shadow: 0 0 8px var(--quality-legendary); }
  50%      { box-shadow: 0 0 18px var(--quality-legendary); }
}
```

### 5.3 不要抓亚人呀的 44 动画简表（粒子参考）

如果想做"华丽战斗特效"，PX 卡的 44 个动画是现成范式库：

| 分类 | 动画 |
|------|------|
| 呼吸 | `pxBreathe` / `pxBreatheE` |
| 攻击 | `pxAtkPhyA`（玩家起手）/ `pxAtkPhyE`（敌方受击）/ `pxAtkSpA` / `pxAtkSpE` |
| 状态 | `pxStatusGlow` / `pxHpBlink` / `pxCurBlink` |
| 受击 | `pxHitShake` / `pxDmgPopup` / `pxFaint` |
| 18 元素粒子 | `pxPartFire` / `pxPartWater` / `pxPartGrass` / `pxPartIce` / `pxPartElec` ... |
| 捕获 | `pxCapBall` / `pxCapAppear` / `pxCapShake` / `pxCapOk` / `pxCapFail` |
| 升级 | `pxLvlUp` / `pxLvlUpTxt` / `pxEvoFlash` / `pxEvoTextPulse` |
| 商店 | `pxShopPulse` / `pxShopToast` |
| Galgame 对话 | `pxGalBlink` / `pxGalPulse` |

> 💡 **不要在 basic-mode 卡里抄这套**。basic-mode 玩家对 44 动画会看花眼。仅 pro-mode 战斗/对战/养成类卡用。

### 5.4 动画时长经验

| 类型 | 时长 | 来源 |
|------|------|------|
| 进度条 | 0.5s | 6 张卡共识 |
| 模态框淡入 | 0.25-0.3s | 封闭公司 / 末日 / 怎么又是你 |
| 闪烁 | 1-1.5s 循环 | hpDanger 1s / barGlow 1.5s |
| 攻击动画 | 0.4-0.6s | PX 卡 |
| 传说发光 | 2s 循环 | legendaryGlow |

### 5.5 反模式
- ❌ 入场动画超过 0.5s：酒馆里会卡顿
- ❌ 同时跑 5+ 个无限循环动画：CPU 占用飙高，移动端会烫
- ❌ 用 `transform: scale()` 做循环动画：会引发酒馆整页 reflow

---

## 6. 范式速查（按风格给完整配方）

每个范式给：底色、主题色、字体策略、容器规格、必备 class 前缀。**直接复制就能用，只需替换 `{prefix}` 和文案**。

### 范式 A. SAO 极客霓虹（艾恩大陆 / 怎么又是你）

**底色**：`#0a192f`（深空蓝）**主题色**：`#64ffda`（青色霓虹）
**字体**：`Segoe UI, 思源黑体, Microsoft YaHei` + `Consolas, Monaco`
**圆角**：12px **风格**：硬核极客、数值战斗

```css
:root {
  --{p}-bg: #0a192f; --{p}-card: rgba(17,34,64,0.85);
  --{p}-accent: #64ffda; --{p}-accent-dim: rgba(100,255,218,0.18);
  --{p}-text-main: #e6f1ff; --{p}-text-sub: #8892b0; --{p}-border: #233554;
  --{p}-hp: #00ff7f; --{p}-hp-danger: #ff4500;
  --{p}-mp: #00bfff; --{p}-exp: #ffd700;
  --{p}-safe: #00ff7f; --{p}-combat: #ff4500; --{p}-danger: #ff8c00;
  --{p}-friend: #64ffda; --{p}-hostile: #ff4500; --{p}-neutral: #8892b0;
  --quality-normal: #e0e0e8; --quality-uncommon: #7bed9f;
  --quality-rare: #a8c0ff; --quality-epic: #c89ffc; --quality-legendary: #ffd700;
  --font-main: 'Segoe UI','思源黑体','Microsoft YaHei',sans-serif;
  --font-mono: 'Consolas','Monaco',monospace;
}
body { background: var(--{p}-bg); color: var(--{p}-text-main); font-family: var(--font-main); }
.{p}-card { background: var(--{p}-card); border: 1px solid var(--{p}-accent-dim);
  border-radius: 12px; padding: 16px 22px; margin: 10px 0;
  backdrop-filter: blur(12px); box-shadow: 0 4px 28px rgba(0,0,0,0.4); }
.{p}-bar-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.{p}-bar-fill { height: 100%; transition: width 0.5s ease; }
.{p}-bar-full .{p}-bar-track { height: 8px; }
```

**适合**：SAO 风 RPG、数值战斗、双主角对峙面板、未来科幻
**class 前缀建议**：`sao-` / `rpg-` / `sci-` / `neo-`

---

### 范式 B. PX- 二次元卡牌（不要抓亚人呀）

**底色**：`#0d0d0d`（纯黑）**主题色**：`#f472b6`（粉色霓虹）
**字体**：系统无衬线 **圆角**：2-8px **风格**：宝可梦对战、Galgame、华丽粒子

**关键差异**：用大量 `linear-gradient` + 44 个动画 + 18 元素粒子。

```css
:root {
  --{p}-bg: #0d0d0d; --{p}-bg-2: #111; --{p}-card: #1a1a1a;
  --{p}-accent: #f472b6; --{p}-accent-2: #ec4899; --{p}-accent-3: #db2777;
  --{p}-text: #fff; --{p}-text-sub: #aaa;
  --{p}-hp: #ff6b6b; --{p}-mp: #4a90e2; --{p}-exp: #ffd700;
  --{p}-good: #4ade80; --{p}-bad: #ef4444;
  --{p}-ele-fire: #ff6b35; --{p}-ele-water: #4a90e2; --{p}-ele-grass: #4ade80;
  --{p}-ele-elec: #facc15; --{p}-ele-ice: #67e8f9; --{p}-ele-psy: #ec4899;
}
/* 渐变描边（PX 招牌） */
.{p}-border { position: relative; background: linear-gradient(180deg,#0d0d0d 0%,#111 60%,#1a1a1a 100%); }
.{p}-border::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(90deg, #f472b6, #ec4899, #db2777);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
```

**适合**：宝可梦/对战、卡牌对战、Galgame、二次元养成
**class 前缀建议**：`px-` / `gal-` / `card-` / `poke-`
**警告**：动画量巨大，**仅 pro-mode 用**。basic-mode 玩家会被粒子晃晕。

---

### 范式 C. 末日生存冷峻（末日丧尸生存）

**底色**：`#0e0e0e`（黑）**主题色**：`#4ade80`（毒绿，象征生）/ `#ff3333`（血，象征死）
**字体**：系统无衬线 **圆角**：2-3px（极硬） **风格**：工业、生存、物资

**关键差异**：**所有圆角几乎都是 2-3px**（硬朗工业感），左侧 3px 警示条大量使用。

```css
:root {
  --d-bg: #0e0e0e; --d-bg-2: #14140a; --d-card: #1a1a1a;
  --d-radius: 3px;        /* 全局统一 3px 硬圆角 */
  --d-hp: #ff3333;        /* 血红 HP */
  --d-hp-bg: #440000;     /* 深红 HP 底 */
  --d-inf: #aa00ff;       /* 感染紫 */
  --d-inf-bg: #220044;
  --d-exp: #4ade80;       /* 经验绿 */
  --d-exp-bg: #003300;
  --d-warn: #ff3333;      /* 警告红 */
  --d-text: #ddd; --d-text-sub: #888;
  --d-font: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
body { background: var(--d-bg); color: var(--d-text); font-family: var(--d-font); line-height: 1.5; }
.{p}-status-bar {
  background: linear-gradient(90deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid #333; border-left: 3px solid var(--d-warn);
  padding: 12px 20px; margin: 12px 0; border-radius: var(--d-radius);
  display: flex; justify-content: space-between; gap: 12px;
  font-family: 'Consolas', monospace; font-size: 11px;
}
.{p}-bar-track { height: 6px; background: rgba(255,255,255,0.05); border-radius: var(--d-radius); }
.{p}-bar-hp .bar-fill   { background: linear-gradient(90deg, #440000, var(--d-hp)); }
.{p}-bar-inf .bar-fill  { background: linear-gradient(90deg, #220044, var(--d-inf)); }
.{p}-bar-exp .bar-fill  { background: linear-gradient(90deg, #003300, var(--d-exp)); }
```

**适合**：末日生存、丧尸、恐怖探索、生存恐怖、密室逃脱
**class 前缀建议**：`doom-` / `surv-` / `dark-` / `hor-`

---

### 范式 D. 修仙养成国风（开放式修仙）

**底色**：`#f5e6c8`（米黄宣纸）**主题色**：`#c9a237`（国画金）
**字体**：系统无衬线 **圆角**：`var(--ui-radius)` 驱动 **风格**：国风、养成、经营、门派

**关键差异**：**14 段品阶色 + 米黄底 + 14 种 rank + 4 种 event 类型**——最复杂。

```css
:root {
  --ui-bg: #f5e6c8;          /* 宣纸米黄 */
  --ui-card: #fff8e7;        /* 浅米卡片 */
  --ui-text: #333; --ui-text-sub: #888;
  --ui-radius: 6px;          /* 全局圆角 */
  /* 品阶 14 段 */
  --q-凡品: #999; --q-良品: #4ade80; --q-上品: #4a90e2; --q-极品: #a78bfa;
  --q-玄级: #5dade2; --q-地级: #c9a237; --q-天级: #ff6b35; --q-灵宝: #ec4899;
  --q-仙器: #ffd700; --q-仙级: #ffd700; --q-圣级: #c41e3a; --q-先天至宝: #8B5CF6;
  /* 事件 4 类 */
  --e-喜讯: #4ade80; --e-机缘: #ffd700; --e-战事: #ff6b35; --e-危机: #c41e3a;
  /* 数值 */
  --hp: #c82e2e; --mp: #2e6bc8; --atk: #c82e2e; --def: #5dade2; --crit: #ffd700;
}
body { background: var(--ui-bg); color: var(--ui-text); }
.{p}-card { background: var(--ui-card); border: 1px solid #d4c5a0;
  border-radius: var(--ui-radius); padding: 16px 22px; margin: 10px 0;
  box-shadow: 0 2px 12px rgba(201,162,55,0.15); }
.{p}-bar-track { height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; }
.{p}-bar-hp .bar-fill { background: linear-gradient(90deg, #c82e2e, #e74c3c); }
.{p}-bar-mp .bar-fill { background: linear-gradient(90deg, #2e6bc8, #5dade2); }
.{p}-bar-exp .bar-fill { background: linear-gradient(90deg, #a08020, #c9a237); }
.{p}-bar-crit .bar-fill { background: linear-gradient(90deg, #c08020, #e8a838); }
/* 品阶颜色（节选） */
.q-凡品  { color: #999; } .q-良品 { color: #4ade80; } .q-上品 { color: #4a90e2; }
.q-极品  { color: #a78bfa; } .q-玄级 { color: #5dade2; } .q-地级 { color: #c9a237; }
.q-天级  { color: #ff6b35; } .q-灵宝 { color: #ec4899; } .q-仙器 { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.q-先天至宝 { color: #8B5CF6; text-shadow: 0 0 12px rgba(139,92,246,0.6); animation: immortalGlow 2s infinite; }
```

**适合**：修仙、养成、经营、门派、江湖、模拟经营
**class 前缀建议**：`xiu-` / `cult-` / `mgmt-` / `jqx-`

---

### 范式 E. 商务红黑（封闭公司）

**底色**：`#0a0a0a`（黑）**主题色**：`#c41e3a`（血红警示）
**字体**：**Google Fonts 衬线**（Cinzel + Noto Serif SC + JetBrains Mono）
**圆角**：2-4px **风格**：商业、悬疑、博弈、管理

**关键差异**：**唯一一张用了 Google Fonts 衬线**——出"高级感"全靠字体。

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@300;400;600;700&family=JetBrains+Mono:wght@300;400&display=swap');
:root {
  --{p}-bg: #0a0a0a; --{p}-bg-2: #141414;
  --{p}-text: #d4d4d4; --{p}-text-dim: #888;
  --{p}-warn: #c41e3a; --{p}-warn-2: #8B0000;
  --{p}-gold: #d4af37; --{p}-blue: #4a90e2;
  --{p}-prize: #ffd700; --{p}-purple: #8B5CF6;
  --{p}-h1: 20px; --{p}-h2: 15px; --{p}-h3: 13px; --{p}-body: 13px; --{p}-cap: 11px;
  --{p}-f-serif: 'Noto Serif SC', 'STSong', 'SimSun', serif;
  --{p}-f-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  --{p}-f-display: 'Cinzel', 'Noto Serif SC', serif;
}
body { background: var(--{p}-bg); color: var(--{p}-text);
  font-family: var(--{p}-f-serif); line-height: 1.85; }
h1 { font-size: var(--{p}-h1); font-weight: 700; letter-spacing: 1px; }
h2 { font-size: var(--{p}-h2); font-weight: 700; }
h3 { font-size: var(--{p}-h3); font-weight: 600; }
code, .{p}-mono, time { font-family: var(--{p}-f-mono);
  font-size: var(--{p}-cap); letter-spacing: 1px; }
.{p}-card { background: linear-gradient(135deg, #0a0a0a 0%, #141414 100%);
  border: 1px solid #2a2a2a; margin: 18px 0;
  box-shadow: 0 4px 28px rgba(0,0,0,0.7); border-radius: 4px; overflow: hidden; }
.{p}-name-big { font-family: var(--{p}-f-display); font-size: 26px;
  font-weight: 700; letter-spacing: 3px; line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
.{p}-status-bar {
  background: linear-gradient(90deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid #333; border-left: 3px solid var(--{p}-warn);
  padding: 12px 20px; margin: 12px 0;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  display: flex; justify-content: space-between; gap: 12px;
  box-shadow: 0 0 20px rgba(196,30,58,0.1);
}
.{p}-status-badge { font-family: var(--{p}-f-mono); font-size: 10px;
  letter-spacing: 2px; padding: 3px 10px; border-radius: 2px; }
.{p}-status-badge[data-status="alive"] { background: rgba(74,222,128,0.12);
  color: #4ade80; border: 1px solid rgba(74,222,128,0.4); }
.{p}-status-badge[data-status="dead"]  { background: rgba(196,30,58,0.15);
  color: var(--{p}-warn); border: 1px solid rgba(196,30,58,0.5); }
```

**适合**：商业博弈、悬疑、职场、谍战、宫廷、推理
**class 前缀建议**：`corp-` / `biz-` / `court-` / `case-`

---

## 7. 组件复用：跨范式拆解

实战中常把 A 范式的进度条 + B 范式的字体 + D 范式的品阶色拼到一起。**组件是独立的，跟范式解耦**。

### 7.1 进度条组件（6 张卡都同源）

```css
/* 通用 .bar — 替换 {p} 前缀后任何范式都能用 */
.{p}-bar { display: flex; flex-direction: column; gap: 3px; }
.{p}-bar-label { font-size: 10px; color: var(--text-sub);
  display: flex; justify-content: space-between; }
.{p}-bar-val { font-size: 10px; font-weight: 700; font-family: var(--font-mono); }
.{p}-bar-track { height: 6px; background: rgba(255,255,255,0.06);
  border-radius: 3px; overflow: hidden; }
.{p}-bar-fill { height: 100%; transition: width 0.5s ease; }
.{p}-bar-full .{p}-bar-track { height: 8px; }
```

### 7.2 品阶徽章组件（怎么又是你/艾恩大陆/修仙通用）

```css
.{p}-quality-tag { display: inline-block; padding: 2px 8px;
  font-size: 10px; font-weight: 600; border-radius: 3px;
  font-family: var(--font-mono); letter-spacing: 1px; }
.{p}-quality-tag.q-normal    { background: rgba(224,224,232,0.15); color: #e0e0e8; }
.{p}-quality-tag.q-uncommon  { background: rgba(123,237,159,0.15);  color: #7bed9f; }
.{p}-quality-tag.q-rare      { background: rgba(168,192,255,0.15); color: #a8c0ff; }
.{p}-quality-tag.q-epic      { background: rgba(200,159,252,0.15); color: #c89ffc;
  box-shadow: 0 0 6px rgba(200,159,252,0.3); }
.{p}-quality-tag.q-legendary { background: rgba(255,215,0,0.15); color: #ffd700;
  box-shadow: 0 0 8px rgba(255,215,0,0.4); animation: legendaryGlow 2s infinite; }
```

### 7.3 状态栏组件（封闭公司/末日招牌）

```css
.{p}-status-bar {
  background: linear-gradient(90deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 1px solid #333; border-left: 3px solid var(--warn);
  padding: 12px 20px; margin: 12px 0; border-radius: 2-4px;
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  font-family: var(--font-mono); font-size: 11-13px;
  box-shadow: 0 0 20px rgba(196,30,58,0.1);
}
```

### 7.4 头像+名字头部组件（5 张卡都用）

```css
.{p}-header { display: flex; align-items: center; gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(90deg, var(--accent) 0%, rgba(10,10,10,0.85) 80%);
  border-bottom: 1px solid var(--border);
  border-top: 3px solid var(--accent); }
.{p}-avatar { width: 60px; height: 60px; border-radius: 50%;
  border: 2px solid var(--accent); flex-shrink: 0; object-fit: cover; }
.{p}-name-big { color: #fff; font-family: var(--f-display);
  font-size: 26px; font-weight: 700; letter-spacing: 3px; line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
.{p}-title { color: rgba(255,255,255,0.92); font-size: 12px; margin-top: 6px;
  font-family: var(--font-mono); letter-spacing: 1.5px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
```

### 7.5 模态弹窗组件

```css
.{p}-modal-overlay { position: fixed; inset: 0;
  background: rgba(0,0,0,0.7); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  animation: modalIn 0.25s ease; backdrop-filter: blur(4px); }
.{p}-modal { background: var(--card); border: 1px solid var(--accent);
  border-radius: 12px; padding: 24px; max-width: 480px; width: 90%;
  box-shadow: 0 0 40px rgba(0,0,0,0.8); animation: modalIn 0.25s ease; }
@keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); } }
```

---

## 8. 实用速查表（按数字查）

| 想知道 | 看哪一节 |
|--------|---------|
| 字号用多大 | 第1.1节 |
| 状态色怎么配 | 第2.4节 |
| 5 段品阶色是哪 5 个 | 第2.3节 |
| 卡片圆角多大 | 第3.1节 |
| 进度条多高 | 第3.2节 |
| 容器最大宽 | 第3.4节 |
| 动画时长 | 第5.4节 |
| 完整范式代码 | 第6节 |
| 想拼不同范式 | 第7节 |
| 反模式 | 第1.2节 / 第4.4节 / 第5.5节 |

---

## 9. 实战组合建议

### 9.1 basic-mode 卡（< 5KB CSS）
**用范式 A 或 C**（最简洁）。模板：
- 1 个 `:root` 变量集（10-15 行）
- 1 个 `.card` + 1 个 `.bar-track` + 1 个 `.bar-fill`
- 1 个 `@keyframes hpDanger`
- 1 个 `.status-bar`
**总代码 < 3KB**，够用。

### 9.2 pro-mode 卡（5-30KB CSS）
**范式 A 主体 + 第7节 组件任选**。比如：
- 主体用 A 的变量集
- 加范式 D 的品阶色（5 段）做装备
- 加范式 E 的 `.status-bar` 做状态栏
- 加 第7.5节 模态框做弹窗

### 9.3 旗舰卡（> 30KB CSS）
照抄 5 张实战卡任一整套即可。**优先范式 B**（PX 战斗）或 **D**（修仙）—— 范式最丰富。

---

## 附录 A. 6 张卡的原始数据

| 卡 | CSS 大小 | class 数 | @keyframes | 渐变数 | 字号档 |
|----|---------|---------|-----------|--------|--------|
| 艾恩大陆 | 29.9KB | 108 | 6 | 11 | 7 档 |
| 不要抓亚人呀 | 43.1KB | **254** | **44** | 9 | 9 档 |
| 末日丧尸生存 | 25.5KB | 196 | 3 | 6 | 8 档 |
| 开放式修仙 | **59.6KB** | **303** | 10 | **22** | 8 档 |
| 封闭公司 | 23.2KB | 82 | 3 | 11 | 6 档 |
| 怎么又是你 | 33.2KB | 96 | 17 | **37** | 7 档 |

**洞察**：
- **PX 卡和修仙卡是"复杂度天花板"**——别去 1:1 抄，先想你要不要那么复杂
- **怎么又是你/艾恩大陆是"性价比最高"**——96-108 class + 6-17 动画做出精致感
- **封闭公司是"克制派"**——82 class + 0 装饰动画，纯靠字体+排版+留白出高级感

---

## 附录 B. 1 分钟工作流：3 步出片

1. **选范式**（第6节）→ 复制对应 CSS 骨架（约 50 行）→ 替换 `{p}` 前缀和色值
2. **挑组件**（第7节）→ 把需要的进度条/品阶/状态栏/模态框贴上去
3. **加动画**（第5.2节）→ 必装 4 个核心（bar transition、hpDanger、modalIn、legendaryGlow）

**3 步做完，CSS 一般 5-15KB**——出片但不臃肿。
