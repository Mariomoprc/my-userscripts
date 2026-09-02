# DOM 操作模式参考

## 就绪等待

### 标准 onReady

```javascript
function onReady(fn) {
  if (document.body) { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}
```

### 等待特定元素出现

```javascript
function waitForElement(selector, callback) {
  var el = document.querySelector(selector);
  if (el) { callback(el); return; }

  var observer = new MutationObserver(function () {
    var target = document.querySelector(selector);
    if (target) {
      observer.disconnect();
      callback(target);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// 使用
waitForElement('#player-container', function (el) {
  // el 已存在
});
```

### 定时轮询（简单场景）

```javascript
function pollForElement(selector, callback, interval) {
  interval = interval || 500;
  var timer = setInterval(function () {
    var el = document.querySelector(selector);
    if (el) {
      clearInterval(timer);
      callback(el);
    }
  }, interval);
}
```

## CSS 注入

### 静态 CSS

```javascript
var style = document.createElement('style');
style.id = 'my-userscript-css';
style.textContent = [
  '.target-class { display: none !important; }',
  '#overlay { opacity: 0 !important; }'
].join('\n');
(document.head || document.documentElement).appendChild(style);
```

### 条件 CSS（使用 data-* 属性标记）

```javascript
// 标记要隐藏的元素
el.setAttribute('data-my-hide', 'true');

// 对应的 CSS
var style = document.createElement('style');
style.textContent = '[data-my-hide="true"] { display: none !important; }';
document.head.appendChild(style);
```

## MutationObserver

### 监控子节点添加

```javascript
var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var m = mutations[i];
    for (var j = 0; j < m.addedNodes.length; j++) {
      var node = m.addedNodes[j];
      if (node.nodeType !== 1) continue; // 跳过文本节点

      // 检查节点本身
      if (node.matches && node.matches('.target-class')) {
        handleNode(node);
      }

      // 检查后代
      var matches = node.querySelectorAll && node.querySelectorAll('.target-class');
      if (matches && matches.length) {
        for (var k = 0; k < matches.length; k++) {
          handleNode(matches[k]);
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```

### 监控属性变化

```javascript
var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var m = mutations[i];
    if (m.type === 'attributes') {
      // m.attributeName - 变化的属性名
      // m.target - 变化的元素
      // m.oldValue - 旧值（需要 attributeOldValue: true）
    }
  }
});

observer.observe(target, {
  attributes: true,
  attributeFilter: ['class', 'style'], // 只关注 class/style 变化
  attributeOldValue: true
});
```

### 针对特定容器

仅监控播放器容器，不监听整个 document（性能优化）。

```javascript
var container = document.querySelector('#player-container') ||
                document.querySelector('#ve-player-container');
if (container) {
  var observer = new MutationObserver(function (mutations) {
    // 处理逻辑
  });
  observer.observe(container, { childList: true, subtree: true });

  // 页面卸载时断开
  window.addEventListener('beforeunload', function () {
    observer.disconnect();
  }, { passive: true });
}
```

## 事件处理

### 捕获阶段优先拦截

在 capture 阶段最先拦截事件，防止网站劫持处理。

```javascript
document.addEventListener('keydown', function (e) {
  if (e.key === 'MediaPlayPause') {
    e.preventDefault();
    e.stopPropagation();
    // 处理逻辑
  }
}, true); // capture 阶段
```

### 弱引用监听器

```javascript
document.addEventListener('visibilitychange', function () {
  // 处理逻辑
}, { passive: true }); // passive 优化性能
```

## 判断元素类型/标识

### 按 class 判断

```javascript
function isTargetElement(el) {
  if (!el || !el.className) return false;
  var cls = el.className.toString();
  return cls.indexOf('targetClass') !== -1 || cls.indexOf('otherClass') !== -1;
}
```

### 按 id 判断

```javascript
function isTargetElement(el) {
  var id = el.id || '';
  return id.indexOf('targetId') !== -1;
}
```

### 按 tag 判断

```javascript
function isTargetElement(el) {
  return el.tagName === 'XG-AD' || el.tagName === 'XG-AD-STUB';
}
```

## WeakSet 去重

避免重复处理同一个元素。

```javascript
var seen = new WeakSet();

function handleNode(node) {
  if (seen.has(node)) return;
  seen.add(node);
  // 处理逻辑
}
```

## TreeWalker 文本节点遍历

遍历 DOM 树中的纯文本节点（不经过元素包装），适用于文本替换/翻译场景。

```javascript
var walker = document.createTreeWalker(
  element,
  NodeFilter.SHOW_TEXT,
  {
    acceptNode: function (node) {
      // 跳过已标记的父元素
      if (node.parentElement && node.parentElement.hasAttribute('data-translated')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  },
  false
);

var node;
while ((node = walker.nextNode())) {
  if (node.textContent && node.textContent.indexOf('原文本') !== -1) {
    node.textContent = node.textContent.replace('原文本', '替换文本');
  }
}
```

## SPA 路由变化监听

用于 SPA（单页应用）场景，监听 URL 变化并重新初始化。

```javascript
var lastUrl = location.href;

function onUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // 重新初始化 DOM 监听/功能
  }
}

// 1. popstate（浏览器前进/后退）
window.addEventListener('popstate', onUrlChange);

// 2. hashchange（hash 路由）
window.addEventListener('hashchange', onUrlChange);

// 3. pushState/replaceState 覆写（框架路由，如 React Router、Vue Router）
var origPushState = history.pushState;
var origReplaceState = history.replaceState;
history.pushState = function () {
  origPushState.apply(this, arguments);
  onUrlChange();
};
history.replaceState = function () {
  origReplaceState.apply(this, arguments);
  onUrlChange();
};
```

## 抗网站覆写策略

### 保存原始方法，用完恢复

```javascript
var origFetch = window.fetch;
window.fetch = function () {
  // 拦截逻辑
  if (isBlockedUrl) return Promise.resolve(new Response('', { status: 204 }));
  return origFetch.apply(this, arguments);
};

// 恢复原始方法（避免长期性能影响）
setTimeout(function () {
  window.fetch = origFetch;
}, 5000);
```

### 恢复被网站覆盖的 document.onkeydown

```javascript
var origOnKeydown = document.onkeydown;
var restoreTimer = setInterval(function () {
  if (document.onkeydown && document.onkeydown !== origOnKeydown) {
    document.onkeydown = origOnKeydown;
  }
}, 1000);
```

### 用 capture 阶段绕过事件阻止

```javascript
// 第三个参数 true = capture 阶段，最先收到事件
document.addEventListener('keydown', function (e) {
  if (e.key === 'MediaPlayPause') {
    e.preventDefault();
    e.stopPropagation();
    // 处理逻辑
  }
}, true);
```

## 定时器管理

### 清理保护

```javascript
var timers = [];

var timer = setInterval(function () {
  // 逻辑
}, 2000);
timers.push(timer);

// 卸载时清理
window.addEventListener('beforeunload', function () {
  timers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
}, { passive: true });
```

## 伪造 drop 触发原生附件上传

用于让 Web 应用（如 opencode web）把剪贴板图片作为**原生附件**接收（等同桌面客户端体验），而不是塞 base64 文本。

### 核心要点

1. **dispatch 到输入框元素本身**（`contenteditable`/`textarea`），**不是 body**——事件冒泡到 document 级监听才有效；直接 dispatch 到 body 通常无效
2. **输入框可能延迟渲染**（SPA 组件挂载后才有）：先等待输入框出现再 dispatch
3. **附件 chip 渲染在输入框组件容器**（可能含 Shadow DOM）：检测成功需观察**组件容器新增元素**，排除输入框内部变化（打字）
4. 合成事件 `isTrusted=false`，但多数框架（SolidJS/React 事件委托）不检查此标志

### 完整模式

```javascript
// 等待输入框出现（opencode V2 是 contenteditable div，可能延迟渲染）
function waitForInput(waitMs, cb) {
  var el = document.querySelector('[contenteditable="true"]') ||
           document.querySelector('textarea');
  if (el) { cb(el); return; }
  var done = false;
  var obs = new MutationObserver(function () {
    var el2 = document.querySelector('[contenteditable="true"]') ||
              document.querySelector('textarea');
    if (el2) finish(el2);
  });
  function finish(result) {
    if (done) return;
    done = true;
    obs.disconnect();
    cb(result);
  }
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () { finish(null); }, waitMs);
}

// 向上找输入框组件容器（附件 chip 渲染区域）
function findComposer(input) {
  var el = input;
  for (var i = 0; i < 5 && el; i++) {
    var cls = el.className || '';
    if (typeof cls === 'string' && /prompt|composer|input|chat/i.test(cls)) return el;
    el = el.parentElement;
  }
  return input.parentElement || input;
}

// 观察容器内所有 shadow root
function observeShadowRoots(root, obs, opts) {
  var hosts = root.querySelectorAll('*');
  for (var i = 0; i < hosts.length; i++) {
    if (hosts[i].shadowRoot) obs.observe(hosts[i].shadowRoot, opts);
  }
}

// 伪造 drop
function fakeDrop(file, filename) {
  var dt = new DataTransfer();
  dt.items.add(new File([file], filename, { type: file.type || 'image/png' }));

  waitForInput(2000, function (target) {
    if (!target) return;
    var composer = findComposer(target);

    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: dt
    }));

    // 检测附件 chip：组件容器新增元素（排除输入框内部）
    var settled = false;
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type !== 'childList') continue;
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n === target || target.contains(n)) continue; // 输入框内部变化，跳过
          settled = true; // 输入框外部新增元素 = 附件 chip
          obs.disconnect();
          return;
        }
      }
    });
    var opts = { childList: true, subtree: true, attributes: true, characterData: true };
    obs.observe(composer, opts);
    observeShadowRoots(composer, obs, opts);
    setTimeout(function () { if (!settled) obs.disconnect(); }, 3000);
  });
}
```

### 常见坑

- **dispatch 到 body 无效**：必须 dispatch 到输入框元素（冒泡到 document 级监听）
- **检测只查新增节点 textContent 会漏**：附件 chip 可能在 Shadow DOM 或属性里，需观察组件容器（含 shadow root）的新增元素
- **busy-wait 阻塞异步处理**：drop 处理是异步的，同步轮询会阻塞它完成，必须用 MutationObserver/setTimeout
