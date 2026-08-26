// ==UserScript==
// @name         OpenCode Web 粘贴图片
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Ctrl+V 粘贴图片到 OpenCode Web：优先伪造 drop 走原生附件通道（等同桌面客户端体验），失败自动回退 base64 内联；油猴菜单可切换模式
// @author       pass
// @include      /^https?://localhost:\d+/
// @include      /^https?://127\.0\.0\.1:\d+/
// @include      /^https?://192\.168\.\d+\.\d+:\d+/
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  var MODES = ['auto', 'drop', 'base64'];
  var MODE_DESC = { auto: '自动（原生附件→base64 兜底）', drop: '仅原生附件', base64: '仅 base64 内联' };

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

  function extractImage(e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd || !cd.items) return null;
    for (var i = 0; i < cd.items.length; i++) {
      if (cd.items[i].type.indexOf('image') !== -1) return cd.items[i].getAsFile();
    }
    return null;
  }

  // opencode V2 输入框是 contenteditable div，优先匹配
  function findInput() {
    return document.querySelector('[contenteditable="true"]') ||
           document.querySelector('textarea') ||
           document.querySelector('input[type="text"]');
  }

  // 等待输入框出现（最多 waitMs）
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

  // ---------- ① 原生附件通道：伪造 drop 事件 ----------
  function tryNativeDrop(file, allowFallback) {
    var filename = 'paste-' + Date.now() + '.png';
    var payload;
    try {
      payload = new File([file], filename, { type: file.type || 'image/png' });
    } catch (err) {
      fallbackOrReport(allowFallback, file, 'File 构造失败');
      return;
    }

    var dt;
    try {
      dt = new DataTransfer();
      dt.items.add(payload);
    } catch (err) {
      fallbackOrReport(allowFallback, file, 'DataTransfer 构造失败');
      return;
    }

    waitForInput(2000, function(target) {
      if (!target) {
        fallbackOrReport(allowFallback, file, '未找到输入框');
        return;
      }

      var dispatched = false;
      try {
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        dispatched = true;
      } catch (err) {}

      if (!dispatched) {
        fallbackOrReport(allowFallback, file, 'DragEvent 不受支持');
        return;
      }

      // 用唯一文件名探测附件是否真的渲染出来
      // 覆盖：新增节点 textContent / 新增节点属性 / 已有节点属性变化 / text 节点变化
      var settled = false;
      var obs = new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'attributes') {
            var t = m.target;
            if (t.getAttribute && t.getAttribute(m.attributeName) &&
                t.getAttribute(m.attributeName).indexOf(filename) !== -1) {
              settle(true);
              return;
            }
          }
          if (m.type === 'characterData') {
            if (m.target.nodeValue && m.target.nodeValue.indexOf(filename) !== -1) {
              settle(true);
              return;
            }
          }
          if (m.type === 'childList') {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var n = m.addedNodes[j];
              if (n.nodeType === 3) {
                if (n.nodeValue && n.nodeValue.indexOf(filename) !== -1) { settle(true); return; }
                continue;
              }
              if (n.nodeType !== 1) continue;
              if (n.textContent && n.textContent.indexOf(filename) !== -1) { settle(true); return; }
              for (var a = 0; a < n.attributes.length; a++) {
                if (n.attributes[a].value.indexOf(filename) !== -1) { settle(true); return; }
              }
            }
          }
        }
      });

      function settle(success) {
        if (settled) return;
        settled = true;
        obs.disconnect();
        if (success) {
          toast('✓ 已附加为原生附件（provider-native 图片输入）');
        } else {
          fallbackOrReport(allowFallback, file, '前端未响应 drop');
        }
      }

      obs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      setTimeout(function() { settle(false); }, 2000);
    });
  }

  function fallbackOrReport(allowFallback, file, reason) {
    if (allowFallback) {
      toast('⚠ 原生附件通道无效（' + reason + '），回退 base64', '#fa0');
      insertBase64(file);
    } else {
      toast('✗ drop 未生效：' + reason, '#f55');
    }
  }

  // ---------- ② base64 兜底通道 ----------
  function insertBase64(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var w = img.width, h = img.height;
        if (w > 1024 || h > 1024) {
          if (w > h) { h = Math.round(h * 1024 / w); w = 1024; }
          else { w = Math.round(w * 1024 / h); h = 1024; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        var base64 = canvas.toDataURL('image/png').split(',')[1];
        var markdown = '![paste.png](data:image/png;base64,' + base64 + ')';

        var inputBox = findInput();
        if (!inputBox) { toast('✗ 未找到输入框', '#f55'); return; }

        if (inputBox.tagName === 'TEXTAREA') {
          var start = inputBox.selectionStart;
          var end = inputBox.selectionEnd;
          inputBox.value = inputBox.value.substring(0, start) + markdown + inputBox.value.substring(end);
          inputBox.selectionStart = inputBox.selectionEnd = start + markdown.length;
          inputBox.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          inputBox.focus();
          document.execCommand('insertText', false, markdown);
        }
        toast('✓ base64 已插入 (' + w + 'x' + h + ')');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- 主入口 ----------
  document.addEventListener('paste', function(e) {
    var file = extractImage(e);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();

    var mode = getMode();
    if (mode === 'base64') { insertBase64(file); return; }
    if (mode === 'drop')   { tryNativeDrop(file, false); return; }
    tryNativeDrop(file, true); // auto
  }, true);
})();