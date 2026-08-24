// ==UserScript==
// @name         OpenCode 粘贴图片增强
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 OpenCode Web 界面支持 Ctrl+V 粘贴图片
// @author       You
// @match        http://192.168.3.100:4096/*
// @match        http://localhost:4096/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  function findFileInput() {
    const selectors = [
      'input[type="file"]',
      'input[accept*="image"]',
      'input[accept*="*/*"]',
      'input[name*="file"]',
      'input[name*="image"]',
      'input[name*="upload"]',
      'input[data-testid*="file"]',
      'input[data-testid*="upload"]'
    ];
    for (const sel of selectors) {
      const input = document.querySelector(sel);
      if (input) return input;
    }
    const allInputs = document.querySelectorAll('input[type="file"]');
    if (allInputs.length > 0) return allInputs[0];
    return null;
  }

  function findDropZone() {
    const selectors = [
      '[class*="drop"]',
      '[class*="upload"]',
      '[class*="paste"]',
      '[class*="chat-input"]',
      '[class*="message-input"]',
      '[class*="composer"]',
      '[class*="editor"]',
      '[class*="input-area"]',
      '[role="textbox"]',
      '[contenteditable="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function createFileFromBlob(blob, filename) {
    return new File([blob], filename, {
      type: blob.type || 'image/png',
      lastModified: Date.now()
    });
  }

  function simulateFileUpload(input, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    const event = new Event('change', { bubbles: true });
    input.dispatchEvent(event);
    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);
    console.log('[PasteImage] 文件已设置到input:', file.name);
  }

  function simulateDrop(element, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const events = ['dragenter', 'dragover', 'drop'];
    for (const eventType of events) {
      const event = new DragEvent(eventType, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      element.dispatchEvent(event);
    }
    console.log('[PasteImage] 模拟拖拽完成:', file.name);
  }

  async function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    let imageFile = null;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();
        const blob = item.getAsFile();
        const ext = item.type.split('/')[1] || 'png';
        const filename = `paste-image-${Date.now()}.${ext}`;
        imageFile = createFileFromBlob(blob, filename);
        break;
      }
    }
    if (!imageFile) return;
    console.log('[PasteImage] 检测到粘贴图片:', imageFile.name);
    const fileInput = findFileInput();
    if (fileInput) {
      console.log('[PasteImage] 找到file input，直接设置');
      simulateFileUpload(fileInput, imageFile);
      return;
    }
    const dropZone = findDropZone();
    if (dropZone) {
      console.log('[PasteImage] 找到拖拽区域，模拟drop');
      simulateDrop(dropZone, imageFile);
      return;
    }
    const textarea = document.querySelector('textarea');
    if (textarea) {
      console.log('[PasteImage] 找到textarea，触发paste-image自定义事件');
      const customEvent = new CustomEvent('paste-image', {
        bubbles: true,
        detail: { file: imageFile }
      });
      textarea.dispatchEvent(customEvent);
      return;
    }
    console.warn('[PasteImage] 未找到可用的上传入口');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .paste-image-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 99999;
        animation: fadeInOut 2s ease-in-out;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function showNotification(message) {
    const div = document.createElement('div');
    div.className = 'paste-image-indicator';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
  }

  function init() {
    injectStyles();
    document.addEventListener('paste', async function (e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          showNotification('📷 图片已粘贴');
          await handlePaste(e);
          return;
        }
      }
    }, true);
    console.log('[PasteImage] 脚本已加载，支持Ctrl+V粘贴图片');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
