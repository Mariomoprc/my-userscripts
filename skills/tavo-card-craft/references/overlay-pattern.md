# 遮罩层稳定注入模板（10 条铁律）

> 本文件定义 Tavo 卡遮罩层（全屏浮层 UI）的稳定注入范式。进阶模式必读。遮罩层是 Tavo 卡最容易出 bug 的部分，这 10 条铁律是实战沉淀的硬性要求。

## 目录

- [铁律 1：iframe 销毁后 UI 丢失](#铁律-1iframe-销毁后-ui-丢失)
- [铁律 2：消毒边界](#铁律-2消毒边界)
- [铁律 3：IIFE 隔离](#铁律-3iife-隔离)
- [铁律 4：z-index 与层级](#铁律-4z-index-与层级)
- [铁律 5：fixed 元素受 transform 父容器吸附](#铁律-5fixed-元素受-transform-父容器吸附)
- [铁律 6：幂等注入](#铁律-6幂等注入)
- [铁律 7：事件委托](#铁律-7事件委托)
- [铁律 8：轮询 + MutationObserver 双引擎](#铁律-8轮询--mutationobserver-双引擎)
- [铁律 9：模块圣所（切换不销毁 DOM）](#铁律-9模块圣所切换不销毁-dom)
- [铁律 10：session.destroy() 单实例管理](#铁律-10sessiondestroy-单实例管理)

---

## 铁律 1：iframe 销毁后 UI 丢失

**问题**：Tavo 的消息渲染在 iframe 里，切换会话或编辑消息时 iframe 会被销毁，挂在 iframe 里的遮罩 UI 也跟着没了。

**铁律**：遮罩层必须挂在顶层文档（`topDoc.body`），不能挂在 iframe 里。

```javascript
// ❌ 错：挂在 iframe 里
document.body.appendChild(overlay);

// ✅ 对：挂在顶层文档
const topDoc = window.top.document;
if (!topDoc.body) throw new Error('topDoc.body not ready');
topDoc.body.appendChild(overlay);
```

**安全网**：挂载前检查 `topDoc.body` 是否存在，不存在就 throw，避免静默失败。

**为什么**：iframe 是临时的，顶层文档是持久的。遮罩 UI 需要跨消息存在，必须挂顶层。

---

## 铁律 2：消毒边界

**问题**：Tavo 会对消息内容做消毒（sanitize），可能删掉你的 script 标签或 on* 事件。

**铁律**：JS 代码放在 `extensions.custom_js` 字段，不要内联在消息 HTML 里。

```json
// ❌ 错：内联在消息里
"first_mes": "<script>alert('hi')</script>"

// ✅ 对：放在 custom_js
"extensions": {
  "custom_js": "alert('hi');"
}
```

**为什么**：custom_js 字段不会被消毒，消息内容会被消毒。把 JS 放 custom_js 保证它能执行。

---

## 铁律 3：IIFE 隔离

**问题**：多个正则/脚本共用全局作用域，变量名冲突。

**铁律**：每个脚本块用 IIFE（立即执行函数表达式）包裹，隔离作用域。

```javascript
// ❌ 错：直接写全局
var hp = 100;
function updateHp() { ... }

// ✅ 对：IIFE 包裹
(function() {
  var hp = 100;
  function updateHp() { ... }
  // 暴露必要的到顶层
  window.drUpdateHp = updateHp;
})();
```

**函数级 vs 文档级隔离**：
- 函数级隔离：IIFE 包裹，变量不泄漏到全局
- 文档级隔离：用命名空间对象，所有 API 挂在一个对象下

```javascript
// 文档级隔离（推荐）
window.drNamespace = window.drNamespace || {};
(function(ns) {
  ns.hp = 100;
  ns.updateHp = function() { ... };
})(window.drNamespace);
```

**为什么**：Tavo 卡可能同时跑多个正则脚本，没有隔离会互相覆盖变量。

---

## 铁律 4：z-index 与层级

**问题**：遮罩层被其他元素盖住，看不见。

**铁律**：遮罩层用最大 z-index，加 `!important`。

```css
.dr-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;  /* 最大 32 位整数 */
}
```

**为什么**：Tavo 自己的 UI 元素也有 z-index，不用最大值 + important 会被盖住。

---

## 铁律 5：fixed 元素受 transform 父容器吸附

**问题**：`position: fixed` 的元素，如果祖先有 `transform`，会变成相对于那个祖先定位，而不是视口。

**铁律**：遮罩层挂顶层文档 + 三个 important + 最大 z-index。

```javascript
// 挂顶层文档（避免 transform 祖先）
const topDoc = window.top.document;
const overlay = topDoc.createElement('div');
overlay.className = 'dr-overlay';
topDoc.body.appendChild(overlay);
```

```css
.dr-overlay {
  position: fixed !important;
  z-index: 2147483647 !important;
  /* 三个 important 保证不被覆盖 */
}
```

**为什么**：iframe 内部可能有 transform，导致 fixed 失效。挂顶层文档 + important 双保险。

---

## 铁律 6：幂等注入

**问题**：正则每次匹配都注入一次，导致重复 DOM。

**铁律**：注入前检查是否已存在，存在就跳过。

```javascript
function injectOverlay() {
  // 幂等检查
  if (document.querySelector('.dr-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'dr-overlay';
  document.body.appendChild(overlay);
}
```

**CSS 注入也要幂等**：

```javascript
function injectCSS() {
  if (document.querySelector('#dr-style')) return;
  const style = document.createElement('style');
  style.id = 'dr-style';
  style.textContent = '...';
  document.head.appendChild(style);
}
```

**为什么**：正则可能多次匹配，不幂等会导致 DOM 越来越多，UI 错乱。

---

## 铁律 7：事件委托

**问题**：动态生成的元素，直接绑事件会丢失。

**铁律**：用事件委托，绑在父元素上。

```javascript
// ❌ 错：直接绑（动态元素丢失）
document.querySelectorAll('.dr-btn').forEach(btn => {
  btn.addEventListener('click', handler);
});

// ✅ 对：事件委托
document.addEventListener('click', (e) => {
  if (e.target.closest('.dr-btn')) {
    handler(e);
  }
});
```

**为什么**：遮罩层内容是动态渲染的，直接绑事件在重新渲染后会丢失。事件委托绑在稳定父元素上，子元素变化不影响。

---

## 铁律 8：轮询 + MutationObserver 双引擎

**问题**：单靠轮询有延迟，单靠 MutationObserver 可能漏掉某些变化。

**铁律**：双引擎——轮询兜底 + MutationObserver 实时响应。

```javascript
// 轮询兜底（每秒检查一次）
setInterval(refreshPanel, 1000);

// MutationObserver 实时响应
const observer = new MutationObserver(refreshPanel);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
```

**为什么**：轮询保证最终一致，MutationObserver 保证实时性。两者结合既不漏也不延迟。

---

## 铁律 9：模块圣所（切换不销毁 DOM）

**问题**：切换模块时销毁 DOM，再切回来要重新创建，闪烁且丢失状态。

**铁律**：用"模块圣所"——所有模块预创建，切换时只切换 display。

```javascript
// 预创建所有模块
const sanctuary = document.createElement('div');
sanctuary.className = 'dr-sanctuary';

const modules = {};
['inventory', 'quest', 'map', 'shop'].forEach(name => {
  const mod = document.createElement('div');
  mod.className = 'dr-module dr-module-' + name;
  mod.style.display = 'none';
  sanctuary.appendChild(mod);
  modules[name] = mod;
});

document.body.appendChild(sanctuary);

// 切换模块（只切 display，不销毁）
function switchModule(name) {
  Object.values(modules).forEach(m => m.style.display = 'none');
  modules[name].style.display = 'block';
}
```

**为什么**：销毁再创建 DOM 会丢失滚动位置、输入框内容等状态。模块圣所保留所有模块，切换零成本。

---

## 铁律 10：session.destroy() 单实例管理

**问题**：多个实例同时跑，互相干扰。

**铁律**：用 session 对象管理生命周期，切换时调用 destroy() 清理旧实例。

```javascript
// 简单场景：单正则，用 session.destroy()
var currentSession = null;

function startSession() {
  if (currentSession) currentSession.destroy();
  
  currentSession = {
    intervalId: setInterval(refresh, 1000),
    observer: new MutationObserver(refresh),
    destroy: function() {
      clearInterval(this.intervalId);
      this.observer.disconnect();
    }
  };
}

// 复杂场景：多正则各自管理 timer，用 era counter
// 详见 state-persistence.md 的 Era Counter 章节
```

**为什么**：不清理旧实例会导致多个轮询同时跑，UI 闪烁、内存泄漏。session.destroy() 保证只有一个活跃实例。

---

## 速查口诀

> **挂顶层、用 IIFE、最大 z、幂等注、委托事、双引擎、建圣所、destroy。**

这 8 个字对应铁律 1/3/4/6/7/8/9/10。铁律 2（消毒边界）和铁律 5（transform 吸附）是踩坑补充，记住"JS 放 custom_js"和"fixed 挂顶层"即可。
