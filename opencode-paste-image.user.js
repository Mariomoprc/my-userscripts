// ==UserScript==
// @name         OpenCode Web 粘贴图片
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  让 OpenCode Web 页面支持 Ctrl+V 粘贴图片到输入框
// @author       pass
// @include      /^https?://localhost:\d+/
// @include      /^https?://127\.0\.0\.1:\d+/
// @include      /^https?://192\.168\.\d+\.\d+:\d+/
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

            var base64 = canvas.toDataURL('image/png').split(',')[1];
            var markdown = '![paste.png](data:image/png;base64,' + base64 + ')';

            // 找到输入框并插入
            var inputBox = document.querySelector('textarea') ||
                          document.querySelector('[contenteditable="true"]') ||
                          document.querySelector('input[type="text"]');

            if (inputBox) {
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

              var div = document.createElement('div');
              div.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border-radius:8px;font-size:12px;font-family:monospace;';
              div.textContent = '图片已粘贴 (' + w + 'x' + h + ')';
              document.body.appendChild(div);
              setTimeout(function() { if (div.parentNode) div.remove(); }, 3000);
            } else {
              alert('未找到输入框');
            }
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
