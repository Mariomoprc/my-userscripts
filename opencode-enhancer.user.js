// ==UserScript==
// @name         OpenCode Web Enhancer
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  OpenCode Web 增强：Tab 键切换 plan/build 代理、Ctrl+V 粘贴图片（伪造 drop 走原生附件通道，识图模型可读）；兼容软路由和笔记本 OC Web
// @author       pass
// @include      /^https?://localhost:\d+/
// @include      /^https?://127\.0\.0\.1:\d+/
// @include      /^https?://192\.168\.\d+\.\d+:\d+/
// @include      /^https?://\d+\.\d+\.\d+\.\d+:\d+/
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // ---------- crypto.subtle polyfill ----------
  // 浏览器只在安全上下文（HTTPS/localhost）暴露 Web Crypto（crypto.subtle）。
  // 通过局域网 IP + HTTP 访问 OpenCode Web（如 http://192.168.3.100:4096）时，
  // crypto.subtle 为 undefined，前端 putBlob 调用 crypto.subtle.digest 崩溃，图片附件无法添加。
  // 这里在 document-start 注入非加密哈希替代（OpenCode 仅用作 IndexedDB 唯一键，无需加密强度）。
  if (typeof crypto !== 'undefined' && !crypto.subtle) {
    try {
      Object.defineProperty(crypto, 'subtle', {
        configurable: true,
        value: {
          digest: async function(algo, data) {
            var ab = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
            var bytes = new Uint8Array(ab);
            // FNV-1a 128-bit 变体，返回 32 字节（与 SHA-256 输出等长）
            var h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x811c9dc5, h4 = 0x01000193;
            for (var i = 0; i < bytes.length; i++) {
              var b = bytes[i];
              h1 = Math.imul(h1 ^ b, 0x01000193) >>> 0;
              h2 = Math.imul(h2 ^ b, 0x01000193) >>> 0;
              h3 = Math.imul(h3 ^ b, 0x01000193) >>> 0;
              h4 = Math.imul(h4 ^ b, 0x01000193) >>> 0;
            }
            var out = new Uint8Array(32);
            var dv = new DataView(out.buffer);
            dv.setUint32(0, h1, true);
            dv.setUint32(4, h2, true);
            dv.setUint32(8, h3, true);
            dv.setUint32(12, h4, true);
            dv.setUint32(16, h1 ^ 0x9e3779b9, true);
            dv.setUint32(20, h2 ^ 0x85ebca6b, true);
            dv.setUint32(24, bytes.length, true);
            dv.setUint32(28, (h1 ^ bytes.length) >>> 0, true);
            return out;
          }
        }
      });
    } catch (err) {}
  }

  var MODES = ['auto', 'drop'];
  var MODE_DESC = { auto: '自动（原生附件）', drop: '仅原生附件' };

  function S(k, v) {
    if (v === undefined) return localStorage.getItem('ocpaste_' + k);
    localStorage.setItem('ocpaste_' + k, v);
  }
  function getMode() { var m = S('mode'); return MODES.indexOf(m) !== -1 ? m : 'auto'; }

  function toast(text, color) {
    var div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:rgba(0,0,0,.9);color:' + (color || '#0f0') + ';padding:12px 15px;border-radius:8px;font-size:12px;font-family:monospace;max-width:340px;line-height:1.5;';
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(function() { if (div.parentNode) div.remove(); }, 3500);
  }

  GM_registerMenuCommand('切换贴图模式（当前：' + MODE_DESC[getMode()] + '）', function() {
    var next = MODES[(MODES.indexOf(getMode()) + 1) % MODES.length];
    S('mode', next);
    toast('贴图模式 → ' + MODE_DESC[next], '#4af');
  });

  // ---------- Tab 键切换代理（plan/build） ----------
  // OpenCode 的 agent cycling 通过 Mod+. (Ctrl/Cmd+.) 快捷键触发
  // 这里在 prompt input 上拦截 Tab 键，转换为 agent cycling
  function initAgentCycleByTab() {
    var lastCycleTime = 0;
    var cycleCooldown = 300; // 防抖：300ms 内忽略重复 Tab

    function findPromptInput() {
      return document.querySelector('[data-component="prompt-input"]') ||
             document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea');
    }

    function isPopoverOpen() {
      return !!document.querySelector('[data-component="prompt-input-v2-popover"], [role="menu"]');
    }

    // 模拟 Mod+. 快捷键（Ctrl/Cmd+.）触发 agent cycling
    function triggerAgentCycle() {
      var now = Date.now();
      if (now - lastCycleTime < cycleCooldown) return;
      lastCycleTime = now;

      var input = findPromptInput();
      if (!input) return;

      // 构建键盘事件：模拟 Mod+.
      var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      var modKey = isMac ? 'Meta' : 'Control';

      try {
        var event = new KeyboardEvent('keydown', {
          key: '.',
          code: 'Period',
          keyCode: 190,
          which: 190,
          bubbles: true,
          cancelable: true
        });
        // 设置修饰键标志
        Object.defineProperty(event, modKey.toLowerCase() + 'Key', { value: true, writable: false });
        Object.defineProperty(event, 'ctrlKey', { value: !isMac, writable: false });
        Object.defineProperty(event, 'metaKey', { value: isMac, writable: false });
        input.dispatchEvent(event);
      } catch (err) {
        // 失败时不做任何事，让 Tab 键正常工作
      }
    }

    // 监听 keydown 事件（捕获阶段）
    document.addEventListener('keydown', function(e) {
      // 仅处理 Tab 键
      if (e.key !== 'Tab') return;

      // 检查是否在 prompt input 内
      var input = findPromptInput();
      if (!input) return;

      // 检查弹出菜单是否打开
      if (isPopoverOpen()) return;

      // 阻止默认行为（焦点切换）
      e.preventDefault();
      e.stopPropagation();

      // 触发 agent cycling
      triggerAgentCycle();
    }, true);

    console.log('[OpenCode Enhancer] Tab 键代理切换已启用');
  }

  // 等待 DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentCycleByTab);
  } else {
    initAgentCycleByTab();
  }

  // ---------- 粘贴图片功能 ----------
  function extractImage(e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd || !cd.items) return null;
    for (var i = 0; i < cd.items.length; i++) {
      if (cd.items[i].type.indexOf('image') !== -1) return cd.items[i].getAsFile();
    }
    return null;
  }

  function findInput() {
    return document.querySelector('[contenteditable="true"]') ||
           document.querySelector('textarea') ||
           document.querySelector('input[type="text"]');
  }

  // 等待输入框出现（最多 waitMs）——输入框出现即组件已挂载、document 上的 drop 监听已绑定
  function waitForInput(waitMs, cb) {
    var el = findInput();
    if (el) { cb(el); return; }
    var done = false;
    var obs = new MutationObserver(function() {
      var el2 = findInput();
      if (el2) finish(el2);
    });
    function finish(result) {
      if (done) return;
      done = true;
      obs.disconnect();
      cb(result);
    }
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() { finish(findInput()); }, waitMs);
  }

  // 向上找输入框组件容器（附件 chip 渲染区域）
  function findComposer(input) {
    var el = input;
    for (var i = 0; i < 5 && el; i++) {
      var cls = el.className || '';
      if (typeof cls === 'string' && /prompt|composer|input|chat|message/i.test(cls)) return el;
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

  // 构造带 dataTransfer 的 DragEvent，老浏览器 fallback 手动注入
  function makeDragEvent(type, dt) {
    try {
      return new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
    } catch (err) {
      var ev = new DragEvent(type, { bubbles: true, cancelable: true });
      try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch (e) {}
      return ev;
    }
  }

  // ---------- 原生附件通道：伪造 dragover + drop 直接派发到 document ----------
  function tryNativeDrop(file) {
    var filename = 'paste-' + Date.now() + '.png';
    var payload, dt;
    try {
      payload = new File([file], filename, { type: file.type || 'image/png' });
      dt = new DataTransfer();
      dt.items.add(payload);
    } catch (err) {
      dropFailed('文件/DataTransfer 构造失败');
      return;
    }

    waitForInput(4000, function(target) {
      if (!target) {
        dropFailed('未找到输入框');
        return;
      }

      // OpenCode v1/v2 的 drop 监听器都绑定在 document 上并读取
      // event.dataTransfer.files。直接向 document 派发完整拖拽序列，
      // 不依赖冒泡、不依赖组件 DOM 位置，兼容 /、/server/... 所有路由。
      document.dispatchEvent(makeDragEvent('dragover', dt));
      document.dispatchEvent(makeDragEvent('drop', dt));

      // 检测：输入框组件容器（含 shadow DOM）新增元素 = 附件 chip 添加成功
      var settled = false;
      var obs = new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'childList') {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var n = m.addedNodes[j];
              if (n.nodeType !== 1) continue;
              if (n === target || target.contains(n)) continue; // 输入框内部变化，跳过
              settle(true); // 输入框外部新增元素 = 附件 chip
              return;
            }
          }
        }
      });

      function settle(success) {
        if (settled) return;
        settled = true;
        obs.disconnect();
        if (success) {
          toast('✓ 已附加为原生附件（识图模型可读）');
        } else {
          dropFailed('前端未响应 drop。请手动拖拽图片或使用附件按钮');
        }
      }

      var obsOpts = { childList: true, subtree: true, attributes: true, characterData: true };
      var composer = findComposer(target);
      obs.observe(composer, obsOpts);
      observeShadowRoots(composer, obs, obsOpts);
      setTimeout(function() { settle(false); }, 4000);
    });
  }

  function dropFailed(reason) {
    toast('✗ drop 未生效（' + reason + '）。请手动拖拽图片到输入框，或长按输入框左侧使用附件按钮', '#f55');
  }

  // ---------- 主入口 ----------
  document.addEventListener('paste', function(e) {
    var file = extractImage(e);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();

    tryNativeDrop(file);
  }, true);
})();
