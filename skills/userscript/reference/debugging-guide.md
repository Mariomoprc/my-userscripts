# 调试指南

## 脚本因网站更新失效

### 常见失效原因

| 原因 | 说明 |
|------|------|
| DOM 结构变化 | 网站改版，CSS 选择器/ID/class 失效 |
| 新反脚本机制 | 网站增加 CSP、反调试、API 调用频率限制 |
| JS API 变更 | 网站改了内部函数签名或命名 |
| 新增 SPA 路由 | 原有 URL 匹配失效 |

### 如何判断是网站更新导致

1. **检查 Tampermonkey 图标** — 图标亮起说明脚本已被注入
2. **打开控制台查看错误** — 常见错误如 `Cannot read properties of null`（选择器失效）、`xxx is not a function`（API 变更）
3. **回退测试** — 用旧版本浏览器缓存或 Wayback Machine 确认旧版网站是否正常
4. **对比修复前的网页源码** — 用浏览器的 Elements 面板检查目标元素当前的结构

### 修复手段

```javascript
// 1. 使用多重选择器回退
var el = document.querySelector('#new-selector')
      || document.querySelector('.fallback-class')
      || document.querySelector('[data-old-attr]');

// 2. 按文本内容搜索（class/ID 变化时）
var btns = document.querySelectorAll('button');
for (var i = 0; i < btns.length; i++) {
  if (btns[i].textContent.indexOf('提交') !== -1) {
    // 找到了
  }
}

// 3. MutationObserver 监控目标容器，避免轮询
var target = document.querySelector('#container') || document.body;
var obs = new MutationObserver(function () { /* 重试逻辑 */ });
obs.observe(target, { childList: true, subtree: true });
```

### 自动修复的局限性

**脚本无法「自动修复」网站更新导致的失效**，原因：
- 每类脚本的失效模式不同，没有通用方案
- 不知道网站改了什么、改成了什么
- 全自动修复需要「网站变更追踪 + AI 适配」系统，成本远超收益

**可行的半自动措施**：
1. **版本检查提示** — 脚本启动时从 GitHub Release API 检查是否有新版本
2. **友好降级** — 关键功能检测失败时显示提示而非静默失效
3. **维护多个选择器备选** — 提前准备可能的 class/ID 变体

```javascript
// 版本检查示例
fetch('https://api.github.com/repos/Mariomoprc/my-userscripts/releases/latest')
  .then(function (r) { return r.json(); })
  .then(function (d) {
    var latest = d.tag_name;
    if (latest !== GM_info.script.version) {
      console.log('[更新可用]', latest);
    }
  })
  .catch(function () {});
```


## 反调试绕过

### 标准绕过流程

```javascript
// 1. 设置绕过标记（部分网站检查）
localStorage.setItem('__internal_devtools_bypass', '1');
sessionStorage.setItem('__internal_devtools_bypass', '1');

// 2. 拦截 alert 弹窗（阻断"请关闭控制台"）
var origAlert = window.alert;
window.alert = function (msg) {
  if (msg && msg.toString().indexOf('控制台') !== -1) return;
  return origAlert.apply(window, arguments);
};

// 3. 清除 debugger 定时器
var origSetInterval = window.setInterval;
var debuggerTimers = [];
window.setInterval = function (fn, ms) {
  var fnStr = fn.toString();
  if (fnStr.indexOf('debugger') !== -1 || (ms && ms <= 200)) {
    var id = origSetInterval.call(window, function () {}, 999999);
    debuggerTimers.push(id);
    return id;
  }
  return origSetInterval.apply(window, arguments);
};

// 4. 定时清理
var timer = setInterval(function () {
  debuggerTimers.forEach(function (id) { clearInterval(id); });
  debuggerTimers = [];
}, 500);

// 5. 恢复 setInterval
setTimeout(function () {
  window.setInterval = origSetInterval;
}, 5000);
```

### 恢复 document.onkeydown

如果网站覆盖了 document.onkeydown 来检测 F12，保存并恢复：

```javascript
var origOnKeydown = document.onkeydown;

// 定时恢复
var timer = setInterval(function () {
  if (document.onkeydown && document.onkeydown.toString().indexOf('debugger') !== -1) {
    document.onkeydown = origOnKeydown;
  }
}, 1000);
```

### DevToolsDetector 补丁

```javascript
var timer = setInterval(function () {
  if (typeof DevToolsDetector !== 'undefined') {
    DevToolsDetector.prototype.init = function () {};
    DevToolsDetector.prototype.start = function () {};
    DevToolsDetector.prototype.check = function () {};
    DevToolsDetector.prototype.checkPerformance = function () {};
    DevToolsDetector.prototype.showDebuggerAlertAndBlock = function () {};
    clearInterval(timer);
  }
}, 500);
```

## 控制台调试

### 检查脚本是否注入

```javascript
// 在页面控制台执行
console.log(typeof GM_info);
console.log(GM_info.script.name);

// 或者检查特定标记
console.log(document.querySelector('my-userscript-css'));
```

### 日志跟踪

```javascript
function log() {
  if (typeof GM_log !== 'undefined') {
    GM_log.apply(null, arguments);
  } else {
    console.log.apply(console, arguments);
  }
}

// 条件日志
var DEBUG = true;
function debugLog() {
  if (DEBUG) console.log.apply(console, arguments);
}
```

### 跟踪 MutationObserver 触发

```javascript
var observer = new MutationObserver(function (mutations) {
  console.log('[观察者] 触发, 变更数:', mutations.length);
  for (var i = 0; i < mutations.length; i++) {
    console.log('  类型:', mutations[i].type,
      '目标:', mutations[i].target.tagName || mutations[i].target.nodeType,
      '添加:', mutations[i].addedNodes.length,
      '移除:', mutations[i].removedNodes.length);
  }
});
```

### 跟踪网络请求

```javascript
// 跟踪 fetch
var origFetch = window.fetch;
window.fetch = function () {
  var url = arguments[0] && typeof arguments[0] === 'string' ? arguments[0] :
            arguments[0] && arguments[0].url ? arguments[0].url : '';
  console.log('[fetch]', url);
  return origFetch.apply(this, arguments);
};

// 跟踪 XHR
XMLHttpRequest.prototype._open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (m, u) {
  console.log('[XHR]', m, u);
  return XMLHttpRequest.prototype._open.apply(this, arguments);
};
```

## 常见问题排查

### 脚本不运行

| 原因 | 检查方法 |
|------|---------|
| @match 不匹配 | 打开页面后检查 Tampermonkey 图标是否亮起 |
| @run-at 太早/太晚 | 尝试不同的 @run-at 值 |
| @grant 缺少声明 | 控制台报错 "GM_xxx is not defined" |
| 权限不足 | 检查 Tampermonkey 设置中脚本的权限 |
| 文件名不是 `.user.js` | TM 只自动识别 `.user.js` 后缀文件 |
| localStorage/sessionStorage 键前缀冲突 | 检查同域其他脚本是否使用了相同前缀 |

### GM 方法报错

```
"GM_setValue is not defined"
→ 缺少 @grant GM_setValue 声明
```

```
"GM_xmlhttpRequest is not defined"
→ 缺少 @grant GM_xmlhttpRequest 声明；或 Greasemonkey 4+ 不支持
```

### DOM 操作无效

| 问题 | 可能原因 |
|------|---------|
| querySelector 返回 null | 元素在脚本运行时尚未加载，用 MutationObserver 等待 |
| 样式不生效 | 被页面 CSS 覆盖，加 `!important` |
| 事件未触发 | 需要 capture 阶段（第三个参数 true） |

### SPA 页面脚本不重复执行

SPA 路由切换后脚本只执行一次，新页面元素不会被处理：

```javascript
// 监听 URL 变化后重新运行
var lastUrl = location.href;
setInterval(function () {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    init(); // 重新初始化
  }
}, 1000);
// 或使用 history.pushState 覆写（详见 dom-patterns.md）
```

### 网络拦截不生效

| 问题 | 可能原因 |
|------|---------|
| fetch 拦截无效 | 网站使用 XHR 而非 fetch，需要同时拦截两者 |
| XHR 拦截无效 | 覆写时序不对，需要在页面脚本加载前拦截 |
| 广告仍在加载 | 检查域名是否拼写正确，URL 是否包含 tracking 参数 |
| video.src 无法拦截 | src 通过 `<source>` 标签而非属性设置 |

### 性能问题

```javascript
// MutationObserver scope 过大 → 限制到具体容器
observer.observe(playerContainer, { childList: true, subtree: true }); // ✅
// observer.observe(document.body, ...) // ❌ 监控整个 document

// 定时器频率过高
// ❌ setInterval(fn, 100) - 每秒 10 次
// ✅ setInterval(fn, 2000) - 每 2 秒一次

// 长期覆写全局方法 → 用完恢复
window.fetch = origFetch; // 恢复
document.createElement = origCreateEl; // 恢复
```

## 控制台快速诊断

粘贴到控制台检查脚本状态：

```javascript
(function () {
  console.log('[诊断]');
  console.log('GM_info:', typeof GM_info !== 'undefined' ? GM_info.script.name : '未定义');
  console.log('localStorage keys:', Object.keys(localStorage).filter(function (k) { return k.indexOf('prefix_') === 0; }));
  console.log('Session keys:', Object.keys(sessionStorage).filter(function (k) { return k.indexOf('prefix_') === 0; }));
  console.log('Video elements:', document.querySelectorAll('video').length);
  console.log('Observer signals:', document.querySelectorAll('[data-attr]').length);
})();
```
