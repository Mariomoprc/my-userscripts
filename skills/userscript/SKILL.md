---
name: userscript
version: 1.2.0
description: >-
  Use when creating, modifying, or debugging Tampermonkey / Greasemonkey /
  Violentmonkey userscripts (.user.js files), or when the user mentions
  user scripts, oil monkey, Tampermonkey, Greasemonkey, or Violentmonkey.
---

# UserScript 用户脚本 Skill

## Overview

创建、修改和调试跨平台用户脚本。支持 Tampermonkey、Violentmonkey、Greasemonkey。提供模板生成、API 参考、DOM/网络操作模式、调试指南。

## When to Use

- 用户请求创建新的 `.user.js` 文件
- 需要修改现有的用户脚本
- 用户脚本出现 bug 或不生效
- 对话中提到 Tampermonkey、油猴、Greasemonkey、Violentmonkey、用户脚本、UserScript
- 涉及 GM_* API、@grant、@match 等用户脚本相关概念

## Core Flow: 三模式切换

根据用户意图进入对应模式：

### 🔵 模式一：创建新脚本

1. **收集需求**：目标网站、核心功能、是否需要菜单/设置
2. **选择元数据模板**：参考 `reference/metadata-templates.md`
3. **确定需要的 grant 权限**：参考 `reference/gm-api-reference.md`
4. **选择 DOM 策略**：参考 `reference/dom-patterns.md`
5. **如果需要网络拦截**：参考 `reference/network-patterns.md`
6. **生成脚本**：使用标准的 IIFE 包裹结构
7. **验证**：
   - 元数据头完整
   - @match 匹配目标 URL
   - @grant 声明了所有使用到的 GM_* API
   - 变量名无冲突
8. **发布部署**：
    - 脚本文件放入 `my-userscripts/` 目录（本地路径：`C:\Users\pass\AppData\Local\Temp\opencode\my-userscripts\`）
    - **更新 README.md 脚本列表**：新脚本放在列表最前面，序号从 1 开始，后续脚本顺延编号
    - `git add + commit + push`
    - 提交 raw GitHub URL 到 [Greasy Fork 导入页](https://greasyfork.org/zh-CN/import)，选择「自动」同步
    - 从 Greasy Fork URL 安装脚本（获得在线状态 + 云图标）

### 🟢 模式二：修改现有脚本

1. **解析元数据头**：读取 @name/@match/@grant/@run-at
2. **理解功能结构**：定位需要修改的功能模块
3. **确认修改范围**：局部修改还是新增功能
4. **实现修改**：
   - 保持现有代码风格
   - 遵循现有 toggle/设置模式（如果有）
   - 新增功能需要对应的菜单项和设置存储
5. **验证语法**：确保无 JS 语法错误
6. **检查兼容性**：@grant 声明是否更新
7. **发布部署**：
    - bump `@version` 版本号（Greasy Fork 识别新版本的依据）
    - 脚本文件放入 `my-userscripts/` 目录
    - **如果是新脚本，更新 README.md 脚本列表**（放在最前面，序号从 1 开始）
    - `git add + commit + push` → Webhook 自动同步到 Greasy Fork
    - Violentmonkey 自动检测新版本并更新
    - warn: 敏感数据用 `GM_getValue`/`GM_setValue` 存储，不要硬编码

### 🟠 模式三：调试脚本

1. **检查元数据头**：
   - @match 是否正确匹配当前 URL
   - @run-at 是否符合需求（document-start/end/body/ready）
   - @grant 是否完整
2. **检查控制台**：
   - 有无报错（权限不足、GM API 未定义等）
   - 有无 CSP (Content Security Policy) 阻止信息
3. **检查脚本是否注入**：在 Tampermonkey 面板中确认脚本状态
4. **分步排查**：
   - DOM 相关：检查元素是否存在、MutationObserver 是否触发
   - 网络拦截：检查 fetch/XHR 是否被拦截、URL 匹配是否正确
   - 设置相关：检查 localStorage/GM_getValue 值是否正确
5. **参考 `reference/debugging-guide.md`**

## Quick Reference

### 基础模板骨架

```javascript
// ==UserScript==
// @name         脚本名称
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  描述
// @author       You
// @match        *://*.example.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

})();
```

### 标准设置+菜单模式

```javascript
var S = {
  get: function (k, d) { var v = localStorage.getItem('prefix_' + k); return v !== null ? v === '1' : d; },
  set: function (k, v) { localStorage.setItem('prefix_' + k, v ? '1' : '0'); }
};

function buildMenu(label, key, def) {
  var on = S.get(key, def);
  GM_registerMenuCommand((on ? '\u2714 ' : '\u2718 ') + label, function () {
    S.set(key, !on);
    location.reload();
  });
}
```

### DOM 就绪等待

```javascript
function onReady(fn) {
  if (document.body) { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}
```

### CSS 注入

```javascript
var style = document.createElement('style');
style.textContent = '/* CSS rules */';
(document.head || document.documentElement).appendChild(style);
```

### MutationObserver 模式

```javascript
var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    for (var j = 0; j < mutations[i].addedNodes.length; j++) {
      var node = mutations[i].addedNodes[j];
      if (node.nodeType !== 1) continue;
      // 处理新节点
    }
  }
});
observer.observe(targetNode, { childList: true, subtree: true });
```

### 生命周期管理

```javascript
window.addEventListener('beforeunload', function () {
  clearInterval(timer);
  if (observer) observer.disconnect();
}, { passive: true });
```

### SPA 路由变化监听

```javascript
var lastUrl = location.href;

function onUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // 重新初始化
  }
}

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
window.addEventListener('popstate', onUrlChange);
window.addEventListener('hashchange', onUrlChange);
```

### 拖拽拦截防遮挡（仅 localhost:4096）

```javascript
var isLocalhost4096 = location.hostname==='localhost' && location.port==='4096';
// dragenter 时 getData 不可读，用 types 快判
function hasTextType(dt){ return ['text/plain','text/uri-list','text/html'].some(function(t){ return Array.from(dt.types).includes(t); }); }
function isTextTypesDrag(e){ var dt=e.dataTransfer; return dt && dt.files.length===0 && hasTextType(dt); }
// 仅隐藏精确浮层本体（TreeWalker 找"拖放文件以添加附件"文本节点上溯 dashed/fixed），栈式还原避免黑屏
// 早期注册：document-start 即 addEventListener('dragenter', onDragCheck, true)
```

### 抗网站覆写策略

```javascript
// 1. 保存原始方法，用完恢复
var origFetch = window.fetch;
window.fetch = function () { /* 拦截逻辑 */ };
// 恢复
setTimeout(function () { window.fetch = origFetch; }, 5000);

// 2. capture 阶段拦截事件（先于网站处理）
document.addEventListener('keydown', function (e) { /* ... */ }, true);

// 3. document-start 时 document.head 可能不存在，回退到 documentElement
(document.head || document.documentElement).appendChild(style);
```

## 部署工作流

### 仓库信息

| 项目 | 值 |
|------|-----|
| 远程仓库 | `github.com/Mariomoprc/my-userscripts`（公开） |
| 本地路径 | `C:\Users\pass\AppData\Local\Temp\opencode\my-userscripts\` |
| 分支 | `main` |
| Webhook | 已配置，push 即自动同步到 Greasy Fork |
| @namespace | 保持原始值，不修改 |

### 完整流程

```
创建脚本:
  本地写 .user.js → 更新 README → push → GF 导入 → 从 GF 安装（获得在线状态）

修改脚本:
  编辑 .user.js → bump @version → push → Webhook 同步 → VM 自动更新
```

### README 脚本列表格式

在 README.md 的 `## 脚本列表` 表格**第一行**（表头之后）插入新行：

```markdown
| 序号 | [脚本名称](Greasy Fork URL 或 GitHub Blob URL) | 用途简述 | [🔗](安装链接) |
```

> **规则：新脚本放列表最前面**，序号从 1 开始，后续脚本顺延编号。

示例：
```markdown
| 1 | [Discord 角色卡检测提示](https://github.com/Mariomoprc/my-userscripts/blob/main/discord-character-card-finder.user.js) | PNG 角色卡识别 + 版本号显示 | [🔗](https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/discord-character-card-finder.user.js) |
```

- 如果已在 Greasy Fork 上：脚本名链接到 GF 页面，安装链接用 GF code URL
- 如果未在 GF 上：脚本名链接到 GitHub Blob URL，安装链接用 raw GitHub URL

### 关键规则

- **必须从 GF URL 安装**才能获得在线状态（云图标 + 自动检查更新），导入 zip 不行
- **每次修改必须 bump @version**，否则 Greasy Fork 不会检测到新版本
- **不要手动修改 @downloadURL/@updateURL**，由 Greasy Fork 导入时自动设置
- **敏感数据用 GM_setValue 存储**，不在脚本代码中硬编码 token/密钥
- **修改前确认目标脚本**：仓库中可能有多个版本（如原版 vs 优化版），只有在 GF 上的那个才会通过 webhook 同步。先查 README 确认哪个文件对应 GF 脚本，改错文件用户看不到更新
- **Playwright 无法测试 Tampermonkey 脚本**：Playwright 是无头 Chromium，没有扩展支持。验证方式：1) `node -c` 检查语法 2) 让用户在自己的浏览器中测试

## 参考文件

| 文件 | 用途 |
|------|------|
| `reference/metadata-templates.md` | @match/@grant/@run-at 模板和生成器 |
| `reference/gm-api-reference.md` | GM_* API 签名、用法、跨平台兼容 |
| `reference/dom-patterns.md` | DOM 操作、MutationObserver、CSS 注入模式 |
| `reference/network-patterns.md` | fetch/XHR 拦截、URL 过滤、广告屏蔽 |
| `reference/debugging-guide.md` | 反调试绕过、console 调试、常见坑 |
