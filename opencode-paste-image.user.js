// ==UserScript==
// @name         OpenCode Web 粘贴图片
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  让 OpenCode Web 页面支持 Ctrl+V 粘贴图片到输入框
// @author       pass
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @match        http://192.168.*.*/*
// @match        https://localhost:*/*
// @match        https://127.0.0.1:*/*
// @match        https://192.168.*.*/*
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  function handlePaste(e) {
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    var items = clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        e.stopPropagation();

        var file = items[i].getAsFile();
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

            canvas.toBlob(function(blob) {
              var pasteFile = new File([blob], file.name || 'paste.png', { type: 'image/png' });

              // 尝试多种 drop target
              var targets = [
                document.querySelector('.xterm-screen'),
                document.querySelector('.terminal'),
                document.querySelector('[class*="chat"]'),
                document.querySelector('[class*="input"]'),
                document.querySelector('[class*="editor"]'),
                document.querySelector('[contenteditable]'),
                document.querySelector('textarea'),
                document.body
              ];

              var dropTarget = null;
              for (var j = 0; j < targets.length; j++) {
                if (targets[j]) {
                  dropTarget = targets[j];
                  break;
                }
              }

              if (!dropTarget) {
                alert('未找到 drop target');
                return;
              }

              // 模拟 drop 事件
              var dt = new DataTransfer();
              dt.items.add(pasteFile);
              var dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
              dropTarget.dispatchEvent(dropEvent);

              // 同时尝试 dragover 事件
              var dragoverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
              dropTarget.dispatchEvent(dragoverEvent);

              // 显示调试信息
              var div = document.createElement('div');
              div.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border-radius:8px;font-size:12px;font-family:monospace;max-width:400px;white-space:pre-wrap;';
              div.textContent = '已粘贴 (' + w + 'x' + h + ')\n\ndrop target: ' + dropTarget.tagName + '.' + dropTarget.className;
              document.body.appendChild(div);
              setTimeout(function() { if (div.parentNode) div.remove(); }, 5000);
            }, 'image/png', 0.85);
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  document.addEventListener('paste', handlePaste, true);
})();
