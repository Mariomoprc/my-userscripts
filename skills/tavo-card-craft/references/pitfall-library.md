# 遮罩失效弯路库（10 条弯路）

> 本文件是实战踩过的死胡同集。调试遮罩问题时**先查这里再查铁律**——弯路库是实战踩过的，铁律是理论范式。每条弯路按"症状→原因→修复"格式，并标注踩坑概率。

## 目录

- [弯路总结表（按概率排序）](#弯路总结表按概率排序)
- [弯路 1：iframe 销毁后 UI 丢失](#弯路-1iframe-销毁后-ui-丢失)
- [弯路 2：fixed 被 transform 吸附](#弯路-2fixed-被-transform-吸附)
- [弯路 3：z-index 不够大被盖住](#弯路-3z-index-不够大被盖住)
- [弯路 4：重复注入导致 DOM 堆积](#弯路-4重复注入导致-dom-堆积)
- [弯路 5：事件绑定丢失](#弯路-5事件绑定丢失)
- [弯路 6：轮询和 Observer 互相打架](#弯路-6轮询和-observer-互相打架)
- [弯路 7：多实例同时跑](#弯路-7多实例同时跑)
- [弯路 8：消毒边界误伤](#弯路-8消毒边界误伤)
- [弯路 9：CSS 优先级被覆盖](#弯路-9css-优先级被覆盖)
- [弯路 10：跨域 topDoc 访问失败](#弯路-10跨域-topdoc-访问失败)
- [速查口诀](#速查口诀)

---

## 弯路总结表（按概率排序）

| # | 弯路 | 踩坑概率 | 对应铁律 |
|---|------|----------|----------|
| 1 | iframe 销毁后 UI 丢失 | 90% | 铁律 1 |
| 4 | 重复注入导致 DOM 堆积 | 85% | 铁律 6 |
| 5 | 事件绑定丢失 | 80% | 铁律 7 |
| 7 | 多实例同时跑 | 75% | 铁律 10 |
| 2 | fixed 被 transform 吸附 | 70% | 铁律 5 |
| 3 | z-index 不够大被盖住 | 65% | 铁律 4 |
| 9 | CSS 优先级被覆盖 | 60% | 铁律 4 |
| 6 | 轮询和 Observer 互相打架 | 50% | 铁律 8 |
| 8 | 消毒边界误伤 | 40% | 铁律 2 |
| 10 | 跨域 topDoc 访问失败 | 30% | 铁律 1 |

---

## 弯路 1：iframe 销毁后 UI 丢失

**症状**：遮罩 UI 第一次显示正常，切换会话或编辑消息后消失。

**原因**：遮罩挂在 iframe 里，iframe 销毁时 UI 跟着没了。

**修复**：挂顶层文档。

```javascript
// ❌ 错
document.body.appendChild(overlay);

// ✅ 对
const topDoc = window.top.document;
if (!topDoc.body) throw new Error('topDoc.body not ready');
topDoc.body.appendChild(overlay);
```

详见 [overlay-pattern.md 铁律 1](overlay-pattern.md#铁律-1iframe-销毁后-ui-丢失)。

---

## 弯路 2：fixed 被 transform 吸附

**症状**：遮罩层位置不对，滚动时跟着某个元素走，而不是固定在视口。

**原因**：祖先元素有 `transform`，导致 `position: fixed` 失效，变成相对祖先定位。

**修复**：挂顶层文档（顶层没有 transform 祖先）+ 三个 important。

```javascript
// 挂顶层
const topDoc = window.top.document;
topDoc.body.appendChild(overlay);
```

```css
.dr-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
}
```

详见 [overlay-pattern.md 铁律 5](overlay-pattern.md#铁律-5fixed-元素受-transform-父容器吸附)。

---

## 弯路 3：z-index 不够大被盖住

**症状**：遮罩层显示在 Tavo UI 下面，看不见或被部分遮挡。

**原因**：Tavo 自己的 UI 元素 z-index 很高，遮罩层 z-index 不够大。

**修复**：用最大 z-index（2147483647）+ important。

```css
.dr-overlay {
  z-index: 2147483647 !important;
}
```

详见 [overlay-pattern.md 铁律 4](overlay-pattern.md#铁律-4z-index-与层级)。

---

## 弯路 4：重复注入导致 DOM 堆积

**症状**：UI 越来越多，同一个面板出现好几次，页面卡顿。

**原因**：正则每次匹配都注入，没有幂等检查。

**修复**：注入前检查是否已存在。

```javascript
function injectOverlay() {
  if (document.querySelector('.dr-overlay')) return;  // 幂等
  // ... 注入
}
```

详见 [overlay-pattern.md 铁律 6](overlay-pattern.md#铁律-6幂等注入)。

---

## 弯路 5：事件绑定丢失

**症状**：按钮第一次点有效，重新渲染后点没反应。

**原因**：直接绑事件在动态元素上，元素重新创建后事件丢失。

**修复**：事件委托。

```javascript
// ✅ 事件委托
document.addEventListener('click', (e) => {
  if (e.target.closest('.dr-btn')) {
    handler(e);
  }
});
```

详见 [overlay-pattern.md 铁律 7](overlay-pattern.md#铁律-7事件委托)。

---

## 弯路 6：轮询和 Observer 互相打架

**症状**：UI 闪烁，频繁重绘。

**原因**：轮询和 MutationObserver 都触发 refresh，互相触发导致死循环。

**修复**：用 sigil 去重，数据没变就跳过。

```javascript
var lastSigil = null;
function refresh() {
  var sigil = hp + '|' + mp + '|' + status;
  if (sigil === lastSigil) return;
  lastSigil = sigil;
  // ... 渲染
}
```

详见 [state-persistence.md Sigil 去重](state-persistence.md#sigil-去重避免冗余渲染)。

---

## 弯路 7：多实例同时跑

**症状**：切换会话后，旧会话的轮询还在跑，修改新会话的 DOM。

**原因**：旧实例没有清理。

**修复**：session.destroy() 或 era counter。

```javascript
// 简单场景：session.destroy()
if (currentSession) currentSession.destroy();

// 复杂场景：era counter
const topWin = window.top || window;
topWin.__eraCounter = (topWin.__eraCounter || 0) + 1;
var myEra = topWin.__eraCounter;
function pollingFn() {
  if (topWin.__eraCounter !== myEra) return;
  // ...
}
```

详见 [overlay-pattern.md 铁律 10](overlay-pattern.md#铁律-10sessiondestroy-单实例管理) 和 [state-persistence.md Era Counter](state-persistence.md#多实例管理era-counter)。

---

## 弯路 8：消毒边界误伤

**症状**：JS 代码不执行，事件不触发。

**原因**：内联在消息里的 `<script>` 或 `on*` 事件被 Tavo 消毒删掉。

**修复**：JS 放 custom_js 字段，事件用 addEventListener。

```json
// ❌ 错
"first_mes": "<div onclick='alert(1)'>"

// ✅ 对
"extensions": { "custom_js": "document.addEventListener('click', ...)" }
```

详见 [overlay-pattern.md 铁律 2](overlay-pattern.md#铁律-2消毒边界)。

---

## 弯路 9：CSS 优先级被覆盖

**症状**：样式不生效，被 Tavo 默认样式覆盖。

**原因**：CSS 优先级不够。

**修复**：用 important + 高特异性选择器。

```css
/* ❌ 错：优先级低 */
.dr-panel { color: red; }

/* ✅ 对：important + 高特异性 */
body .dr-overlay .dr-panel {
  color: red !important;
}
```

---

## 弯路 10：跨域 topDoc 访问失败

**症状**：`window.top.document` 报错跨域。

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
if (!topDoc.body) throw new Error('topDoc.body not ready');
topDoc.body.appendChild(overlay);
```

---

## 速查口诀

> **挂顶层、去重复、委托事、清旧例、防吸附、最大 z、加 important、sigil 去重、放 custom_js、try-catch 跨域。**

这 10 个动作对应弯路 1-10。调试遮罩问题时按这个顺序排查，90% 的问题能在前 4 个找到。
