# 三件套规范（核心！必读）

> 本文件定义 Tavo 角色卡的核心架构规范：世界书、角色卡介绍、正则脚本三者的职责划分。

## 目录

- [必须做](#必须做)
  - [1. 世界书(character_book.entries)](#1-世界书character_bookentries)
  - [2. 角色卡介绍(data.description)](#2-角色卡介绍datadescription)
  - [3. 正则脚本(extensions.regex_scripts)](#3-正则脚本extensionsregex_scripts)
- [不要做](#不要做)
- [字段填充速查](#字段填充速查)

---

## 必须做

### 1. 世界书(character_book.entries)

世界书是 Tavo 卡的"大脑"，存放所有需要 AI 知道的规则和设定。它的优势是条目可以按关键词触发、按需注入，能显著节省常驻 token——常驻条目只放必须每轮都看到的，触发条目只在相关时才注入。

**4 类条目标准分法**：

| 类别 | 常驻/触发 | 作用 | 示例条目 |
|------|-----------|------|----------|
| 条目 1 | 常驻(keys=[]) | 格式铁律 + 固定模板 | 标签格式+输出顺序 |
| 条目 2 | 常驻(keys=[]) | 游戏系统规则 | 日循环/数值公式/特殊事件 |
| 条目 3+ | 关键词触发(keys=[...]) | 世界观/角色/物品/场景 | 方舟/聚落/感染者/委员会 |
| 末条目 | 常驻(keys=[]) | 角色扮演指引 | 行为规则/风格指引/禁忌事项 |

**为什么这样分**：条目 1 和条目 2 是 AI 每轮输出都必须遵守的，所以常驻；条目 3+ 是世界观细节，只在用户提到相关关键词时才需要 AI 知道，所以触发式注入能省 token；末条目是行为约束，常驻保证 AI 不跑偏。

### 2. 角色卡介绍(data.description)

**只写这三样**：
- 世界名称
- 世界本质
- 世界基本规则

**不写**：格式规则、技术细节、UI 说明（那些放世界书）

**为什么**：description 是常驻 prompt 的一部分，每个字都消耗 token。把技术细节塞这里会让 AI 每轮都被无关信息干扰，且改 UI 时还得动 description 容易引入 bug。技术细节放世界书触发条目，需要时才注入。

### 3. 正则脚本(extensions.regex_scripts)

正则负责把 AI 输出的纯文本标签转成带样式的 HTML。这样"内容生成"和"展示渲染"解耦——AI 只管写 `<xxx-scene>...</xxx-scene>` 标签，渲染逻辑全在正则里，改样式不用动 AI 提示词。

**按用途分桶**：

| 桶 | 用途 | 命名约定 |
|----|------|----------|
| 0. CSS 注入 | `findRegex: "^"`,单条幂等 | `{prefix}-style` |
| 1. 容器包裹 | 模块边界,包裹整段内容 | `{prefix}-container` |
| 2. 场景 | `<{prefix}-scene>` | `{prefix}-scene` |
| 3. 对话 | `<{prefix}-dialogue>` | `{prefix}-dialogue` |
| 4. 选择 | `<{prefix}-choice>` | `{prefix}-choice` |
| 5. 玩家面板 | `<{prefix}-player>` | `{prefix}-player` |
| 6. 特色模块 | 按题材需求 | `{prefix}-xxx` |
| 末. 容器关闭 | 注入闭合标记 | `{prefix}-close` |

---

## 不要做

### 错：在 system_prompt 塞格式规则

```json
"system_prompt": "你必须用 <scene>...</scene> 标签输出场景..."
```

**为什么错**：system_prompt 是常驻的，格式规则塞这里每轮都消耗 token，而且改格式还得动 system_prompt 容易引入其他问题。

**对**：放世界书条目 1（常驻，keys=[]）

### 错：填 personality

```json
"personality": "冷淡、高傲、毒舌..."
```

**为什么错**：personality 字段会被预设组装进 prompt，但 Tavo 卡的"性格"应该由玩法定义（不同玩法下同一个 NPC 性格表现不同），填死会限制灵活性。

**对**：保持空（由玩法定义）

### 错：填 scenario

```json
"scenario": "玩家进入末日世界，需要生存..."
```

**为什么错**：scenario 是常驻的，但世界观细节不需要每轮都看到，应该按需触发。

**对**：保持空（放世界书条目 3+ 关键词触发）

### 错：在 post_history_instructions 写内容

```json
"post_history_instructions": "记住玩家的选择..."
```

**为什么错**：post_history_instructions 是预设领域，不是卡的。填了会和用户的预设冲突。

**对**：保持空（预设的领域，不是卡的）

---

## 字段填充速查

| 字段 | 填什么 | 不填什么 |
|------|--------|----------|
| `data.name` | 卡名 | - |
| `data.description` | 世界名称+本质+基本规则 | 格式规则、技术细节、UI 说明 |
| `data.personality` | 角色性格概述 | 格式规则、技术细节 |
| `data.scenario` | 开局设定概述 | 世界观细节 |
| `data.first_mes` | 开场白（含初始标签） | 完整剧情 |
| `data.mes_example` | 2-3 组示例对话（教 AI 格式） | 过多示例 |
| `data.system_prompt` | AI 角色定位（可选） | 格式规则 |
| `data.post_history_instructions` | 每轮提醒（可选） | 过长内容 |
| `data.character_book.entries` | 4 类条目（见上） | - |
| `data.extensions.regex_scripts` | 按桶分（见上） | - |
| `data.extensions.custom_js` | 进阶模式 JS（IIFE+addEventListener） | 基础模式不填（不执行） |
| `data.extensions.custom_css` | 空（CSS 走正则注入） | 直接写 CSS |
| `data.spec` | `"chara_card_v3"` | 改成别的 |
| `data.spec_version` | `"3.0"` | 改成别的 |

**基础模式 JS 注入方式**：JS 写在 CSS 注入正则的 `replaceString` 里，跟在 `</style>` 后面的 `<script>` 标签内。用全局函数 + `onclick` 内联调用。详见 [basic-mode-pitfalls.md 坑 3](basic-mode-pitfalls.md)。

---

## 正则格式铁律

每条正则脚本必须满足以下字段要求，写错会导致正则不渲染或渲染错位：

| 字段 | 值 | 原因 |
|------|-----|------|
| `placement` | `[2]`（数组） | 2 表示 AI 输出，必须是数组不是数字 |
| `markdownOnly` | `True` | 只在 markdown 渲染时生效，避免污染纯文本 |
| `id` | UUID（用 `scripts/gen_uuid.py` 生成） | Tavo 用 id 去重，没有 id 会被忽略 |
| `substituteRegex` | `0` | 0 表示不替换宏，避免 `{{char}}` 被误解析 |
| `promptOnly` | `False` | False 表示作用于 AI 输出，不是 prompt |
| `runOnEdit` | `False` | False 表示编辑消息时不重跑，避免重复渲染 |
| `disabled` | `False` | False 表示启用 |

**完整正则脚本示例**：

```json
{{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "{{prefix}}-scene",
  "findRegex": "<{{prefix}}-scene>([\\s\\S]*?)</{{prefix}}-scene>",
  "replaceString": "<div class=\"{{prefix}}-scene\">$1</div>",
  "placement": [2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": false,
  "substituteRegex": 0
}}
```
