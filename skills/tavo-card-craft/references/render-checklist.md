# Tavo 渲染验证清单（事前自检）

> ⚠️ **本文件与 `error-library.md` 互补，不重叠。**
>
> - 本文件 → 生成后的预防性自检清单（事前用）
> - `error-library.md` → 报错发生后的症状→原因→修复手册（事后用）
> - 两者一前一后，不要混用

> 本文件是 Tavo 卡输出前的自检清单。任何输出（first_mes/正则/JS）都必须跑完这个清单。

## 目录

- [A. 正则脚本自检（10 项）](#a-正则脚本自检10-项)
- [B. 世界书自检（6 项）](#b-世界书自检6-项)
- [C. 角色卡字段自检（8 项）](#c-角色卡字段自检8-项)
- [D. JS 代码自检（7 项）](#d-js-代码自检7-项)
- [E. 遮罩层自检（5 项）](#e-遮罩层自检5-项)
- [F. 整体一致性自检（4 项）](#f-整体一致性自检4-项)

---

## A. 正则脚本自检（10 项）

每条正则脚本必须满足：

- [ ] **A1** `id` 字段存在且是 UUID 格式（用 `scripts/gen_uuid.py` 生成）
- [ ] **A2** `placement` 是 `[2]`（数组，不是数字）
- [ ] **A3** `markdownOnly` 是 `true`
- [ ] **A4** `promptOnly` 是 `false`
- [ ] **A5** `runOnEdit` 是 `false`
- [ ] **A6** `disabled` 是 `false`
- [ ] **A7** `substituteRegex` 是 `0`
- [ ] **A8** `findRegex` 能匹配 AI 实际输出（用 regex101 测试）
- [ ] **A9** `replaceString` 用 `$1` `$2` 引用捕获组，不是 `\1` `\2`
- [ ] **A10** CSS 注入正则的 `findRegex` 是 `^`，`replaceString` 以 `<style>` 开头

**为什么**：这 10 项是 Tavo 正则的硬性要求，任一不满足都会导致正则不渲染或渲染错位。详见 [three-piece-spec.md 正则格式铁律](three-piece-spec.md#正则格式铁律)。

---

## B. 世界书自检（6 项）

- [ ] **B1** 至少有 4 类条目（格式铁律/系统规则/世界观触发/角色扮演指引）
- [ ] **B2** 条目 1（格式铁律）是常驻（`keys: []`，`constant: true`）
- [ ] **B3** 末条目（角色扮演指引）是常驻
- [ ] **B4** 世界观条目是关键词触发（`keys: ["关键词1", "关键词2"]`）
- [ ] **B5** 每个条目有 `name`、`content`、`keys`、`constant`、`position`、`disable` 字段
- [ ] **B6** 条目内容里教的标签格式和正则的 `findRegex` 一致

**为什么**：世界书是 AI 的大脑，结构不对会导致 AI 不知道格式或 token 浪费。详见 [three-piece-spec.md](three-piece-spec.md#1-世界书character_bookentries)。

---

## C. 角色卡字段自检（8 项）

- [ ] **C1** `spec` 是 `"chara_card_v3"`
- [ ] **C2** `spec_version` 是 `"3.0"`
- [ ] **C3** `data.name` 有值（卡名）
- [ ] **C4** `data.description` 只写世界名称+本质+基本规则，不写格式/技术细节
- [ ] **C5** `data.first_mes` 有值，且包含初始标签（如 `<{prefix}-scene>`）
- [ ] **C6** `data.system_prompt` 留空（格式规则放世界书）
- [ ] **C7** `data.post_history_instructions` 留空
- [ ] **C8** `data.extensions.regex_scripts` 是数组，每项是完整正则脚本对象

**为什么**：字段填错会导致 Tavo 不识别卡或 AI 行为异常。详见 [three-piece-spec.md 字段填充速查](three-piece-spec.md#字段填充速查)。

---

## D. JS 代码自检（9 项）

- [ ] **D1** JS 注入方式正确：基础模式放 CSS 正则的 replaceString 里（`</style>` 后加 `<script>`），进阶模式放 `extensions.custom_js`
- [ ] **D2** 基础模式用全局函数 + `onclick` 内联调用；进阶模式用 IIFE + addEventListener
- [ ] **D3** 变量名/函数名加卡前缀（`drHp` 不是 `hp`，`window.drSubmit` 不是 `window.submit`）
- [ ] **D4** JS 变量名不用连字符（`window.drSubmit` 不是 `window.dr-Submit`）
- [ ] **D5** 调用 `tavo.*` 前检查 `if (typeof tavo !== 'undefined')`
- [ ] **D6** 发送消息用 `tavo.input.set(msg); tavo.input.send();`（不是 `tavo.input.set` + `tavo.input.send`）
- [ ] **D7** DOM 操作前等 DOM 就绪：`document.addEventListener('DOMContentLoaded', ...)`
- [ ] **D8** 异步操作（生图/文件）用 async/await + try-catch
- [ ] **D9** Python 生成脚本检查 surrogate 字符（emoji 代理对会导致 UnicodeEncodeError）

**为什么**：这 9 项保证 JS 能执行、不冲突、不报错。详见 [js-api-guide.md](js-api-guide.md) 和 [basic-mode-pitfalls.md](basic-mode-pitfalls.md)。

---

## E. 遮罩层自检（5 项）

- [ ] **E1** 遮罩挂在 `topDoc.body`，不是 iframe 的 `document.body`
- [ ] **E2** `z-index` 是 `2147483647`（最大值）
- [ ] **E3** 用 era counter 管理单实例
- [ ] **E4** 用 sigil 去重避免重复渲染
- [ ] **E5** 事件用委托（绑在父容器，`e.target.closest()` 找目标）

**为什么**：遮罩层是 Tavo 卡最容易出 bug 的部分，这 5 项是 10 铁律的核心。详见 [overlay-pattern.md](overlay-pattern.md) 和 [pitfall-library.md](pitfall-library.md)。

---

## F. 整体一致性自检（7 项）

- [ ] **F1** 所有 `{prefix}` 占位符已替换为实际前缀（如 `dr-`）
- [ ] **F2** 所有 `<UUID>` 占位符已替换为实际 UUID
- [ ] **F3** 所有 `{{` `}}` 已替换为 `{` `}`（模板转义还原）。**注意**：`{{user}}` 和 `{{char}}` 是 Tavo 标准宏，必须保留不要替换
- [ ] **F4** 正则的 `findRegex` 匹配的标签和世界书教的标签、first_mes 用的标签三者一致
- [ ] **F5** 需要并排显示的标签（如多个 `<dr-stat>`）写在同一行，中间不留空行（markdown 会打断布局）
- [ ] **F6** CSS `content` 属性里的 Unicode 转义用 `\65E5` 格式（不是 `\u65E5`）
- [ ] **F7** 默认 `.json` 交付（send_file 传 .json 可能被截断，**仅当玩家反馈文件无法导入或过小时**才复制一份 `.txt` 兜底重发，并提醒玩家把后缀改回 `.json` 再导入；不要主动改 `.txt`）

**为什么**：占位符没替换是最常见的低级错误，标签不一致会导致正则匹配失败，markdown 换行会打断布局，CSS 转义错误会显示乱码。

---

## 自检流程

```
输出任何内容前
    ↓
跑 A（正则）+ C（字段）+ F（一致性）→ 基础卡必跑
    ↓
有 JS？→ 跑 D（JS 代码）
    ↓
有遮罩？→ 跑 E（遮罩）+ B（世界书）
    ↓
全部通过 → 输出
```

**自动化**：用 `scripts/validate_card.py` 自动检查 A/B/C/F 项，手动检查 D/E。
