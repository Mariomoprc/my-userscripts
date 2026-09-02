# 常见错误库（9 个错误）

> ⚠️ **本文件与 `render-checklist.md` 互补，不重叠。**
>
> - `render-checklist.md` → 生成后的预防性自检清单（事前）
> - 本文件 → 报错发生后的症状→原因→修复手册（事后）
> - 两者一前一后，不要混用

> 本文件列出 Tavo 卡制作中最常见的 9 个错误，按"症状→原因→修复"格式。做卡时自检，调试时排查。

## 目录

- [错误 1：正则不渲染](#错误-1正则不渲染)
- [错误 2：标签被原样输出](#错误-2标签被原样输出)
- [错误 3：CSS 不生效](#错误-3css-不生效)
- [错误 4：JS 不执行](#错误-4js-不执行)
- [错误 5：状态不持久化](#错误-5状态不持久化)
- [错误 6：遮罩层闪烁](#错误-6遮罩层闪烁)
- [错误 7：事件不触发](#错误-7事件不触发)
- [错误 8：多实例冲突](#错误-8多实例冲突)
- [错误 9：跨域报错](#错误-9跨域报错)
- [错误速查表](#错误速查表)

---

## 错误 1：正则不渲染

**症状**：AI 输出了 `<{prefix}-scene>...</{prefix}-scene>` 标签，但页面显示的是原始标签文本，没有转成 HTML。

**原因**（按概率）：
1. `placement` 不是 `[2]`（写成 `2` 数字或 `[1]`）
2. `markdownOnly` 不是 `True`
3. `id` 字段缺失或重复
4. `disabled` 是 `True`
5. `findRegex` 正则写错（比如没转义 `<`）

**修复**：

```json
{
  "id": "<UUID>",           // 必须有，用 gen_uuid.py 生成
  "placement": [2],          // 必须是数组 [2]
  "disabled": false,         // 必须 false
  "markdownOnly": true,      // 必须 true
  "findRegex": "<{prefix}-scene>([\\s\\S]*?)</{prefix}-scene>"  // 注意转义
}
```

**自检命令**：用 `scripts/validate_card.py` 检查所有正则字段。

---

## 错误 2：标签被原样输出

**症状**：AI 输出里直接出现 `<{prefix}-scene>` 文本，而不是被正则替换。

**原因**：
1. 正则的 `findRegex` 和 AI 输出的标签不匹配（大小写/空格/换行）
2. 正则被 `disabled: true` 禁用了
3. AI 输出的标签格式和世界书里教的不一致

**修复**：
- 检查 `findRegex` 是否能匹配 AI 实际输出（用 regex101 测试）
- 确认世界书里教的标签格式和正则一致
- 正则用 `[\s\S]*?` 而不是 `.*?`，避免不匹配跨行内容

---

## 错误 3：CSS 不生效

**症状**：HTML 渲染了，但样式没应用。

**原因**：
1. CSS 没通过正则注入（直接写在 custom_css 但被消毒）
2. CSS 选择器优先级不够，被 Tavo 默认样式覆盖
3. CSS 类名和 HTML class 不匹配

**修复**：
- CSS 通过 `{prefix}-style` 正则注入（`findRegex: "^"`）
- 用 `!important` + 高特异性选择器：`body .{prefix}-container .{prefix}-scene { ... !important; }`
- 检查 HTML 的 class 和 CSS 选择器拼写一致

---

## 错误 4：JS 不执行

**症状**：按钮点击没反应，变量没初始化。

**原因**：
1. JS 放在 `extensions.custom_js` 字段但基础模式下不执行（见 [basic-mode-pitfalls.md 坑 3](basic-mode-pitfalls.md#坑-3custom_js-字段不执行)）
2. JS 有语法错误
3. JS 在 DOM 就绪前执行
4. `tavo` 对象未就绪就调用
5. API 名搞错（`tavo.input.set` + `tavo.input.send` 不存在，正确是 `tavo.input.set` + `tavo.input.send`）

**修复**：
- **基础模式**：JS 写在 CSS 注入正则的 `replaceString` 里（`</style>` 后加 `<script>`），用全局函数 + `onclick` 内联调用
- **进阶模式**：JS 放 `extensions.custom_js` 字段，用 IIFE + addEventListener
- 调用 `tavo.*` 前检查 `if (typeof tavo !== 'undefined')`
- 发送消息用 `tavo.input.set(msg); tavo.input.send();`

---

## 错误 5：状态不持久化

**症状**：刷新页面或切换会话后，HP/背包等状态丢失。

**原因**：
1. 用了局部变量而不是 `tavo.set`
2. 变量名没加前缀，被其他卡覆盖
3. `tavo.set` 的值是 undefined/null

**修复**：
- 所有需要持久化的状态用 `tavo.set('drXxx', value)`
- 变量名加卡前缀（`drHp` 不是 `hp`）
- setVar 前检查值不是 undefined：`if (value !== undefined) tavo.set(...)`

---

## 错误 6：遮罩层闪烁

**症状**：遮罩层反复出现/消失，或内容频繁刷新。

**原因**：
1. 没用 sigil 去重，轮询每次都重渲染
2. 多个实例同时跑（铁律 10 没做）
3. MutationObserver 触发太频繁

**修复**：
- 加 sigil 去重（见 [state-persistence.md](state-persistence.md#sigil-去重避免冗余渲染)）
- 用 era counter 管理单实例（见 [state-persistence.md](state-persistence.md#多实例管理era-counter)）
- Observer 加防抖：`const debounced = _.debounce(refresh, 200);`

---

## 错误 7：事件不触发

**症状**：点击按钮没反应。

**原因**：
1. `extensions.custom_js` 在基础模式下不执行（见 [basic-mode-pitfalls.md 坑 3](basic-mode-pitfalls.md#坑-3custom_js-字段不执行)）
2. 事件绑定时机太早，元素还没创建
3. API 名搞错（`tavo.input.set` + `tavo.input.send` 不存在）

**修复**：
- **基础模式**：JS 写在 CSS 正则的 `replaceString` 里，用 `onclick="全局函数名(this)"` 内联调用（Tavo 基础模式不消毒 onclick）
- **进阶模式**：用 `addEventListener` + 事件委托
- DOM 就绪后再绑定：`document.addEventListener('DOMContentLoaded', ...)`
- 发送用 `tavo.input.set(msg); tavo.input.send();`

---

## 错误 8：多实例冲突

**症状**：切换会话后，旧会话的 JS 还在跑，修改新会话的 DOM。

**原因**：没做单实例管理（铁律 10）。

**修复**：
- 简单场景：用 session.destroy() 清理旧实例
- 复杂场景：用 era counter（见 [state-persistence.md](state-persistence.md#多实例管理era-counter)）

```javascript
const topWin = window.top || window;
topWin.__eraCounter = (topWin.__eraCounter || 0) + 1;
const myEra = topWin.__eraCounter;

function pollingFn() {
  if (topWin.__eraCounter !== myEra) return;  // 旧 era 退出
  // ... 业务逻辑
}
```

---

## 错误 9：跨域报错

**症状**：`window.top.document` 报错 "Blocked a frame with origin..."。

**原因**：Tavo 在某些部署下，iframe 和顶层不同域。

**修复**：try-catch 包裹，失败时降级到当前文档。

```javascript
let topDoc;
try {
  topDoc = window.top.document;
} catch (e) {
  console.warn('跨域，降级到当前文档');
  topDoc = document;
}
```

---

## 错误速查表

| 错误 | 症状 | 首查 |
|------|------|------|
| 1 正则不渲染 | 标签变 HTML 失败 | placement/id/markdownOnly |
| 2 标签原样输出 | 看到 `<xxx>` 文本 | findRegex 匹配 |
| 3 CSS 不生效 | 无样式 | 注入方式/优先级 |
| 4 JS 不执行 | 按钮无反应 | custom_js 不执行/API 名搞错 |
| 5 状态不持久 | 刷新后丢失 | setVar/前缀 |
| 6 遮罩闪烁 | 反复出现消失 | sigil/单实例 |
| 7 事件不触发 | 点击无反应 | JS 注入方式/onclick/API 名 |
| 8 多实例冲突 | 旧会话干扰新 | era counter |
| 9 跨域报错 | topDoc 报错 | try-catch 降级 |

**调试顺序**：先查错误 1-4（基础渲染），再查 5-7（交互逻辑），最后查 8-9（进阶问题）。
**基础模式专属问题**：查 [basic-mode-pitfalls.md](basic-mode-pitfalls.md)（7 条实战坑）。
