# 元数据头模板参考

## 命名约定

- 文件名统一使用 `.user.js` 后缀（如 `my-script.user.js`），Tampermonkey/Violentmonkey 自动识别
- @name 建议中英文独立命名，英文名通过 `@name:en` 指定
- @namespace 统一使用 `http://tampermonkey.net/` 或个人 GitHub

## 完整模板

```javascript
// ==UserScript==
// @name         中文脚本名
// @name:en      English Name
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  功能描述
// @description:en  English description
// @author       YourName
// @match        *://*.example.com/*
// @exclude      *://*.example.com/excluded/*
// @include      /^https?://example\.com/\w+$/
// @grant        none
// @run-at       document-start
// @license      MIT
// @icon         https://example.com/favicon.ico
// @downloadURL  https://example.com/script.user.js
// @updateURL    https://example.com/script.meta.js
// @supportURL   https://example.com/support
// @homepageURL  https://example.com
// ==/UserScript==
```

## @match 模式速查

| 模式 | 匹配 |
|------|------|
| `*://*.example.com/*` | 所有子域名+所有路径 |
| `https://example.com/*` | HTTPS 下所有路径 |
| `http://example.com/*` | HTTP 下所有路径 |
| `*://example.com/*` | HTTP+HTTPS 下所有路径 |
| `https://*.example.com/*` | HTTPS 子域名+所有路径 |
| `https://example.com/path/*` | HTTPS 下 /path/ 下所有 |
| `https://example.com/path/spec` | 精确路径 |
| `http://localhost:3000/*` | 本地开发 |

**注意**：Tampermonkey 支持 @include（正则），但不建议与 @match 混用。

## @run-at document-start 最佳实践

`document-start` 时 `document.head` 可能尚未存在，CSS 注入需回退到 `documentElement`：

```javascript
var style = document.createElement('style');
style.textContent = 'body { background: #000; }';
(document.head || document.documentElement).appendChild(style);
```

`document-start` 适用场景：反调试绕过、CSS 注入、网络拦截前置、事件捕获前置.

## @exclude 示例

```javascript
// @exclude  *://example.com/no-script/*
// @exclude  *://*.example.com/admin/*
```

## @run-at 选项

| 值 | 触发时机 | 适用场景 |
|----|---------|---------|
| `document-start` | DOM 构建前 | CSS 注入、反调试绕过、DOM 监听前置 |
| `document-body` | `<body>` 存在时 | 需要 body 但不关心完整 DOM |
| `document-end` | DOMContentLoaded | 需要完整 DOM 树 |
| `document-idle` | DOMContentLoaded 后 | 默认值，不紧急的功能 |
| `context-menu` | 右键菜单手动触发 | 仅在用户点击时运行 |

## @grant 权限声明

**必须声明所有使用的 GM_* API**，否则脚本可能不工作。

### 常用权限

```
// @grant  GM_setValue
// @grant  GM_getValue
// @grant  GM_deleteValue
// @grant  GM_listValues
// @grant  GM_registerMenuCommand
// @grant  GM_unregisterMenuCommand
// @grant  GM_addStyle
// @grant  GM_addElement
// @grant  GM_xmlhttpRequest
// @grant  GM_notification
// @grant  GM_openInTab
// @grant  GM_download
// @grant  GM_setClipboard
// @grant  GM_info
// @grant  GM_log
```

### 沙箱逃逸

```javascript
// @grant        unsafeWindow
// @grant        window.close
// @grant        window.focus
// @grant        window.onurlchange
```

### none 模式

```javascript
// @grant  none
```
- 脚本在页面上下文运行，而非沙箱
- 无法使用任何 GM_* API
- 可以直接访问页面全局变量

## 跨平台兼容

| 特性 | Tampermonkey | Violentmonkey | Greasemonkey 4+ |
|------|-------------|---------------|-----------------|
| @match | ✅ | ✅ | ✅ |
| @include 正则 | ✅ | ✅ | ❌ |
| @run-at document-start | ✅ | ✅ | ✅ |
| GM_setValue | ✅ | ✅ | ✅ |
| GM_getValue | ✅ | ✅ | ✅ |
| GM_registerMenuCommand | ✅ | ✅ | ⚠️ 仅支持字符串回调 |
| GM_addStyle | ✅ | ✅ | ❌ |
| GM_xmlhttpRequest | ✅ | ✅ | ⚠️ 简化版 |
| GM_notification | ✅ | ✅ | ✅ |
| unsafeWindow | ✅ | ✅ | ✅ |
| @require | ✅ | ✅ | ✅ |
| @resource | ✅ | ✅ | ✅ |
