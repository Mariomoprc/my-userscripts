// ==UserScript==
// @name         OpenCode Web 粘贴图片
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  让 OpenCode Web 页面支持 Ctrl+V 粘贴图片到输入框
// @author       pass
// @match        *://localhost:*/*
// @match        *://127.0.0.1:*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // 配置
  var CONFIG = {
    MAX_SIZE: 1024,           // 最大尺寸（px）
    QUALITY: 0.85,            // JPEG 压缩质量
    MAX_BASE64: 2097152,      // 最大 base64 大小（2MB）
    PREVIEW_ENABLED: true     // 是否显示预览
  };

  // 加载保存的配置
  function loadConfig() {
    try {
      var saved = GM_getValue('oc_paste_config');
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.assign(CONFIG, parsed);
      }
    } catch(e) {}
  }

  // 保存配置
  function saveConfig() {
    try {
      GM_setValue('oc_paste_config', JSON.stringify(CONFIG));
    } catch(e) {}
  }

  // 注册菜单
  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('⚙️ 粘贴图片设置', function() {
        var enabled = CONFIG.PREVIEW_ENABLED;
        CONFIG.PREVIEW_ENABLED = !enabled;
        saveConfig();
        alert('预览功能: ' + (CONFIG.PREVIEW_ENABLED ? '开启' : '关闭'));
      });
    }
  }

  // 压缩图片
  function compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        var width = img.width;
        var height = img.height;

        // 限制尺寸
        if (width > CONFIG.MAX_SIZE || height > CONFIG.MAX_SIZE) {
          if (width > height) {
            height = Math.round(height * CONFIG.MAX_SIZE / width);
            width = CONFIG.MAX_SIZE;
          } else {
            width = Math.round(width * CONFIG.MAX_SIZE / height);
            height = CONFIG.MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 转为 base64
        var base64 = canvas.toDataURL('image/jpeg', CONFIG.QUALITY);
        var base64Data = base64.split(',')[1];

        // 检查大小
        if (base64Data.length > CONFIG.MAX_BASE64) {
          alert('图片太大，请选择更小的图片');
          callback(null);
          return;
        }

        callback({
          name: file.name,
          type: 'image/jpeg',
          data: base64Data,
          width: width,
          height: height
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 查找输入框
  function findInputBox() {
    // OpenCode web 可能使用的输入框选择器
    var selectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      '.terminal-input',
      '.input-area',
      '#input'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var elements = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        // 检查是否可见
        if (el.offsetParent !== null || el.offsetHeight > 0) {
          return el;
        }
      }
    }

    return null;
  }

  // 插入文本到输入框
  function insertText(textarea, text) {
    if (textarea.tagName === 'TEXTAREA') {
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      var before = textarea.value.substring(0, start);
      var after = textarea.value.substring(end);
      textarea.value = before + text + after;
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (textarea.contentEditable === 'true') {
      textarea.focus();
      document.execCommand('insertText', false, text);
    }
  }

  // 显示预览
  function showPreview(imageData) {
    if (!CONFIG.PREVIEW_ENABLED) return;

    var existing = document.getElementById('oc-image-preview');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.id = 'oc-image-preview';
    container.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:#1a1a2e;border:2px solid #444;border-radius:8px;padding:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:300px;';

    var img = document.createElement('img');
    img.src = 'data:image/jpeg;base64,' + imageData.data;
    img.style.cssText = 'max-width:100%;border-radius:4px;';
    container.appendChild(img);

    var info = document.createElement('div');
    info.style.cssText = 'color:#888;font-size:12px;margin-top:8px;text-align:center;';
    info.textContent = imageData.name + ' (' + imageData.width + 'x' + imageData.height + ')';
    container.appendChild(info);

    var tip = document.createElement('div');
    tip.style.cssText = 'color:#666;font-size:11px;margin-top:4px;text-align:center;';
    tip.textContent = '已复制到剪贴板，Ctrl+V 粘贴';
    container.appendChild(tip);

    document.body.appendChild(container);

    // 3秒后自动消失
    setTimeout(function() {
      if (container.parentNode) {
        container.style.transition = 'opacity 0.3s';
        container.style.opacity = '0';
        setTimeout(function() { container.remove(); }, 300);
      }
    }, 3000);
  }

  // 处理粘贴事件
  function handlePaste(e) {
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    var items = clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        e.stopPropagation();

        var file = items[i].getAsFile();
        compressImage(file, function(imageData) {
          if (!imageData) return;

          // 格式化为 OpenCode 可识别的格式
          var markdown = '![' + imageData.name + '](data:' + imageData.type + ';base64,' + imageData.data + ')';

          // 查找并插入到输入框
          var inputBox = findInputBox();
          if (inputBox) {
            insertText(inputBox, markdown);
            showPreview(imageData);
          } else {
            alert('未找到输入框，请确保页面已加载完成');
          }
        });

        return;
      }
    }
  }

  // 初始化
  function init() {
    loadConfig();
    registerMenu();

    // 使用 capture 阶段拦截，优先于页面处理
    document.addEventListener('paste', handlePaste, true);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 监听 SPA 路由变化（如果页面是 SPA）
  var lastUrl = location.href;
  var observer = new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 页面变化后重新检查输入框
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

})();
