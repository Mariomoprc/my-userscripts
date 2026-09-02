---
name: tavo-card-craft
version: 3.0.0
author: 不要太正经
description: >-
  Use when creating Tavo or SillyTavern character cards, worldbooks, presets,
  regex patterns, long memory entries, JS API scripts, PNG-embedded cards,
  or when the user mentions character cards, roleplay cards, or card
  troubleshooting (conflicts, migration, multi-card coexistence).
---

# Tavo 角色卡制作 Skill

> 本文件是**精简路由器**。所有细节已下沉到 `references/` 与 `scripts/`，按需读取，不要一次性全读。

## 一、任务路由决策表（必读，先看这张表）

收到用户请求后，**先匹配下表**，再决定读哪些 reference 文件。

| 用户意图关键词 | 必读文件 | 可选文件 |
|----------------|----------|----------|
| "做张卡" / "做个角色卡" / "新建卡" | `task-routing.md`、`three-piece-spec.md`、`question-engine.md` | `visual-style-guide.md`、`gameplay-templates.md` |
| "修仙" / "末日" / "公司" / "剧本" / "玩法" | `gameplay-templates.md`、`three-piece-spec.md` | `visual-style-guide.md`、`extended-tag-modes.md` |
| "美化" / "好看" / "前端" / "渲染" / "UI" | `visual-style-guide.md`、`css-library.md` | `beautify-templates.md`、`advanced-beautify.md` |
| "状态" / "存档" / "变量" / "持久化" | `state-persistence.md`、`js-api-guide.md` | `advanced-patterns.md` |
| "遮罩" / "overlay" / "弹窗" / "覆盖层" | `overlay-pattern.md`、`pitfall-library.md` | `render-checklist.md` |
| "JS API" / "脚本" / "事件" / "扩展标签" | `js-api-guide.md`、`extended-tag-modes.md` | `js-api-examples.md`、`advanced-patterns.md` |
| "报错" / "不显示" / "渲染失败" / "白屏" | `error-library.md`、`debug-workflow.md` | `render-checklist.md` |
| "校验" / "检查" / "验证" | `render-checklist.md` + 运行 `scripts/validate_card.py` | `error-library.md` |
| "迁移" / "改卡" / "冲突" / "多卡共存" | `task-routing.md` 边界场景部分 | `pitfall-library.md` |
| "看示例" / "参考" / "例子" | `example-cards.md` | `js-api-examples.md` |
| "插件" / "生成器" / "重摇" / "配图" / "背景切换" | `js-api-examples.md` | `js-api-guide.md` |

**铁律**：每次任务**最多读 3 个 reference 文件**，避免 token 浪费。读完决策表还拿不准时，再读 `task-routing.md`。

## 二、核心工作流（强制三步）

任何"生成卡"类任务，必须按以下顺序执行，**不得跳步**：

```
Step 1: 问答定需求
  ├─ 用户明确要"简单/快速" → 走 basic-mode（3 问出卡，见 question-engine.md A部分）
  └─ 用户要"深度/定制" → 走 pro-mode（完整问答，见 question-engine.md B部分）

Step 2: 生成卡内容
  ├─ 三件套结构（description / first_mes / alternate_greetings）→ three-piece-spec.md
  ├─ 视觉范式选型（5 选 1）→ visual-style-guide.md 第6节
  └─ 写入 JSON，字段名严格遵循 ST 卡规范

Step 3: 校验与输出
  ├─ 运行 python scripts/validate_card.py <card.json>  ← 强制
  ├─ 对照 render-checklist.md 自检 5 项
  └─ 输出到 /home/z/my-project/download/<card_name>.json
```

**禁止**：跳过 Step 3 直接交付。校验失败必须修复后重跑。

## 三、文件索引

### references/（按需读取，不要全读）

| 文件 | 用途 | 何时读 |
|------|------|--------|
| `task-routing.md` | 任务路由决策表详解 + 边界场景 | 拿不准读哪个文件时 |
| `three-piece-spec.md` | 三件套结构规范 | 每次生成卡必读 |
| `question-engine.md` | 双通道问答引擎（basic/pro） | Step 1 定需求时 |
| `visual-style-guide.md` | 5 种视觉范式 + CSS 配方总集 | 涉及美化时（CSS 单一信源） |
| `css-library.md` | CSS 片段速查 | visual-style-guide 不够用时 |
| `beautify-templates.md` | 美化模板 | 需要现成模板时 |
| `advanced-beautify.md` | 进阶美化技巧 | 高级定制时 |
| `gameplay-templates.md` | 玩法模板（修仙/末日/公司等） | 做玩法卡时 |
| `overlay-pattern.md` | 遮罩模式与 10 条铁律 | 涉及遮罩/弹窗时 |
| `state-persistence.md` | 状态持久化方案 | 涉及存档/变量时 |
| `js-api-guide.md` | JS API 完整指南（v3.0 已按官方手册全面核对） | 涉及脚本/事件时 |
| `js-api-examples.md` | 5 个官方插件范例（生成器/隐藏/重摇/配图/背景） | 需要现成插件代码时 |
| `extended-tag-modes.md` | 扩展标签模式 | 涉及自定义标签时 |
| `advanced-patterns.md` | 12 个进阶代码模式 | 高级功能实现时 |
| `pitfall-library.md` | 10 条遮罩弯路库 | 遮罩类任务必读 |
| `basic-mode-pitfalls.md` | basic-mode 常见坑 | 走 basic-mode 时 |
| `error-library.md` | 错误库与修复方案 | 报错排查时 |
| `render-checklist.md` | 渲染自检清单 | Step 3 校验时 |
| `debug-workflow.md` | 调试流程 | 卡片不工作时 |
| `example-cards.md` | 6 张实战示例卡 | 需要参考时 |

### scripts/（生成与校验工具）

| 脚本 | 用途 | 调用方式 |
|------|------|----------|
| `build_card_template.py` | 生成空白卡模板 | `python scripts/build_card_template.py <name>` |
| `validate_card.py` | 校验卡 JSON 合法性 | `python scripts/validate_card.py <card.json>` |
| `gen_uuid.py` | 生成卡 UUID | `python scripts/gen_uuid.py` |

## 四、核心铁律（7 条，不可违反）

1. **三件套优先**：description / first_mes / alternate_greetings 必须齐全，缺一不可。
2. **遮罩 10 铁律**：见 `overlay-pattern.md`，违反任何一条都会导致渲染崩溃。
3. **CSS 单一信源**：所有 CSS 配方以 `visual-style-guide.md` 为准，`css-library.md` 仅作速查，不得与之冲突。
4. **状态持久化必须显式**：任何涉及存档/变量的卡，必须在 description 中声明持久化方案（见 `state-persistence.md`）。
5. **生成必校验**：Step 3 的 `validate_card.py` 不可跳过。
6. **扩展标签需声明**：使用自定义标签必须在 card spec 中声明模式（见 `extended-tag-modes.md`）。
7. **输出路径固定**：所有成品卡输出到 `/home/z/my-project/download/`，不得写到其他目录。

## 五、边界场景速查

| 场景 | 处理方式 |
|------|----------|
| 迁移已有卡 | 读 `task-routing.md` 迁移流程部分，先 `validate_card.py` 体检再改 |
| 卡冲突排查 | 读 `task-routing.md` 冲突排查部分，用 `debug-workflow.md` 流程 |
| 多卡共存 | 读 `task-routing.md` 多卡共存部分，注意 UUID 唯一性与变量命名空间隔离 |
| 用户只给一句话 | 默认走 basic-mode，3 问出卡 |
| 用户要深度定制 | 走 pro-mode，完整问答 |

## 六、版本与变更

- 当前版本：3.0.0
- 变更历史见 `CHANGELOG.md`
- 反馈与改进：记录到 `CHANGELOG.md` 末尾
