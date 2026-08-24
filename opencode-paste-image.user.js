// ==UserScript==
// @name         OpenCode Web 粘贴图片
// @namespace    http://tampermonkey.net/
// @version      1.6
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

            canvas.toBlob(function(blob) {
              var pasteFile = new File([blob], file.name || 'paste.png', { type: 'image/png' });

              // 查找输入框 - 优先找 textarea 或 contenteditable
              var inputBox = document.querySelector('textarea') ||
                            document.querySelector('[contenteditable="true"]') ||
                            document.querySelector('input[type="text"]');

              if (inputBox) {
                // 找到了输入框，往里面 drop
                var dt = new DataTransfer();
                dt.items.add(pasteFile);
                var dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
                inputBox.dispatchEvent(dropEvent);

                var dragoverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
                inputBox.dispatchEvent(dragoverEvent);

                var div = document.createElement('div');
                div.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border-radius:8px;font-size:12px;font-family:monospace;max-width:400px;white-space:pre-wrap;';
                div.textContent = '已粘贴 (' + w + 'x' + h + ')\n\ntarget: ' + inputBox.tagName + '.' + inputBox.className.substring(0, 50);
                document.body.appendChild(div);
                setTimeout(function() { if (div.parentNode) div.remove(); }, 5000);
              } else {
                // 没找到，显示所有可能的元素
                var allTextareas = document.querySelectorAll('textarea');
                var allEditable = document.querySelectorAll('[contenteditable]');
                var info = '未找到输入框\n\ntextarea: ' + allTextareas.length + '\ncontenteditable: ' + allEditable.length;
                alert(info);
              }
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
