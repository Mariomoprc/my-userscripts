# 调试卡流程（修卡专用）

> 本文件定义修卡/调试卡时的标准流程。当用户说"卡坏了""不渲染""有 bug"时按此流程。

## 目录

- [调试总流程](#调试总流程)
- [Step 1：卡档报告](#step-1卡档报告)
- [Step 2：病灶定位](#step-2病灶定位)
- [Step 3：诊断表](#step-3诊断表)
- [Step 4：改造方案](#step-4改造方案)
- [Step 5：自检输出](#step-5自检输出)
- [常见病灶速查](#常见病灶速查)

---

## 调试总流程

```
用户说"卡坏了"
    ↓
Step 1：要 JSON，生成卡档报告
    ↓
Step 2：根据症状定位病灶（查弯路库 + 错误库）
    ↓
Step 3：列诊断表（每条正则的健康度）
    ↓
Step 4：给改造方案（影响范围 + 改动原因 + 风险）
    ↓
用户确认 → Step 5：输出修复片段 + 跑自检清单
```

**核心原则**：
- 先诊断再动手，不要上来就改
- 任何修改先列影响范围
- 任何输出先跑自检清单
- 调试时先查弯路库再查铁律

---

## Step 1：卡档报告

让用户提供卡的 JSON 文件，然后生成卡档报告：

```
【卡档报告】
- 卡名：xxx
- 类型：xxx（修真/经营/冒险/单角色/...）
- 标签体系前缀：xxx-
- 正则脚本数量：N 条
- 正则命名清单：[xxx-style, xxx-container, xxx-scene, ...]
- 是否已有前端 UI：是/否
- system_prompt 长度：xxx 字符
- first_mes 长度：xxx 字符
- 病灶定位：xxx
```

**为什么**：卡档报告让你快速了解卡的结构，定位问题时有的放矢。正则命名清单尤其重要——能看出卡的复杂度和可能出问题的模块。

---

## Step 2：病灶定位

根据用户描述的症状，对照下表定位病灶：

| 症状 | 首查文件 | 首查章节 |
|------|----------|----------|
| 标签变 HTML 失败（看到 `<xxx>` 文本） | [error-library.md](error-library.md) | 错误 1/2 |
| HTML 渲染了但没样式 | [error-library.md](error-library.md) | 错误 3 |
| 按钮点击没反应 | [error-library.md](error-library.md) | 错误 4/7 |
| 刷新后状态丢失 | [error-library.md](error-library.md) | 错误 5 |
| 遮罩层闪烁/错位 | [pitfall-library.md](pitfall-library.md) | 弯路 1-10 |
| 遮罩层不显示 | [pitfall-library.md](pitfall-library.md) | 弯路 1/3/10 |
| 切换会话后 UI 错乱 | [pitfall-library.md](pitfall-library.md) | 弯路 7 |
| AI 输出格式不对 | [three-piece-spec.md](three-piece-spec.md) | 世界书条目 1 |
| AI 不知道世界观 | [three-piece-spec.md](three-piece-spec.md) | 世界书条目 3+ |

**定位顺序**：先查 error-library（基础错误），再查 pitfall-library（遮罩进阶），最后查 three-piece-spec（AI 行为）。

---

## Step 3：诊断表

列出每条正则脚本的健康度：

| 脚本 | 用途 | findRegex 健康度 | replaceString 风险点 |
|------|------|------------------|----------------------|
| xxx-style | CSS 注入 | ✅ 正常 | 无 |
| xxx-container | 容器包裹 | ⚠️ 贪婪匹配 | 可能吞掉相邻内容 |
| xxx-scene | 场景 | ✅ 正常 | 无 |
| xxx-dialogue | 对话 | ❌ 未转义 `<` | 正则不匹配 |
| xxx-choice | 选项 | ✅ 正常 | 无 |

**健康度判定**：
- ✅ 正常：`findRegex` 正确转义，`placement: [2]`，`markdownOnly: true`
- ⚠️ 警告：贪婪匹配（`.*` 而非 `.*?`）、优先级问题
- ❌ 错误：字段缺失、正则语法错、转义错

**为什么**：诊断表让你一眼看出哪条正则有风险，避免逐条排查。

---

## Step 4：改造方案

给出改造方案，必须包含 4 部分：

```
【改造方案】
1. 影响范围：
   - 修改：xxx 正则
   - 新增：xxx 正则
   - 不动：xxx 正则（避免连锁失效）
2. 改动原因：xxx
3. 改后效果：xxx
4. 风险提示：xxx
请确认后我输出修复片段。
```

**为什么 4 部分缺一不可**：
- 影响范围：让用户知道改了什么、没改什么，避免"改一个坏一片"
- 改动原因：让用户理解为什么这么改，不是瞎改
- 改后效果：让用户预期改完会怎样
- 风险提示：让用户知道可能的副作用

**等用户确认后再输出修复片段**，不要直接改。

---

## Step 5：自检输出

输出修复片段后，跑 [render-checklist.md](render-checklist.md) 的自检清单：

```
【自检结果】
A. 正则脚本自检：✅ A1-A10 全部通过
B. 世界书自检：✅ B1-B6 全部通过
C. 角色卡字段自检：✅ C1-C8 全部通过
D. JS 代码自检：✅ D1-D7 全部通过（如有 JS）
E. 遮罩层自检：✅ E1-E5 全部通过（如有遮罩）
F. 整体一致性自检：✅ F1-F4 全部通过

修复片段已通过自检，可导入 Tavo 测试。
```

**为什么**：自检清单是最后一道防线，避免修复引入新问题。

---

## 常见病灶速查

### 病灶 1：正则全部不渲染

**排查**：
1. 检查 `data.extensions.regex_scripts` 是否是数组
2. 检查每条正则的 `placement` 是否 `[2]`
3. 检查 `markdownOnly` 是否 `true`
4. 检查 `id` 是否存在

**修复**：用 `scripts/validate_card.py` 批量检查。

### 病灶 2：只有部分正则渲染

**排查**：
1. 不渲染的正则 `findRegex` 是否能匹配 AI 输出（用 regex101 测试）
2. 不渲染的正则是否 `disabled: true`
3. 不渲染的正则 `id` 是否和其他重复

**修复**：逐条用 regex101 测试 `findRegex`。

### 病灶 3：AI 输出格式乱

**排查**：
1. 世界书条目 1（格式铁律）是否常驻
2. 条目 1 内容是否清晰教了标签格式
3. first_mes 是否用了正确标签

**修复**：强化世界书条目 1，加更多格式示例。

### 病灶 4：遮罩层时灵时不灵

**排查**：
1. 是否挂顶层（铁律 1）
2. 是否单实例（铁律 10）
3. 是否 sigil 去重（避免闪烁）

**修复**：查 [pitfall-library.md](pitfall-library.md)，按弯路 1-10 顺序排查。

### 病灶 5：状态丢失

**排查**：
1. 是否用 `tavo.set`（不是局部变量）
2. 变量名是否加前缀
3. 是否在 setVar 前检查值非 undefined

**修复**：查 [error-library.md 错误 5](error-library.md#错误-5状态不持久化)。
