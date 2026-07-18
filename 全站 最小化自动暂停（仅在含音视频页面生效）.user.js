// ==UserScript==
// @name         全站 最小化自动暂停（仅在含音视频页面生效）
// @namespace    http://tampermonkey.net
// @version      1.2
// @description  当页面不可见（最小化或切换到其他窗口/标签）时自动暂停页面上的 HTML5 音视频，可选恢复播放；仅在页面存在音视频时生效。
// @match        *://*.yichengwlkj.com/pc/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 配置：是否在页面重新可见时自动恢复之前正在播放的媒体
  const autoResume = false;

  // 存储被暂停前的播放状态
  const pausedByScript = new WeakMap();

  // 查找页面上的所有 HTML5 <video> 和 <audio> 元素
  function getAllMedia() {
    return Array.from(document.querySelectorAll('video, audio'));
  }

  // 暂停并记录状态
  function pauseMedia() {
    const medias = getAllMedia();
    medias.forEach(m => {
      try {
        const wasPlaying = !m.paused && !m.ended && m.readyState > 2;
        pausedByScript.set(m, wasPlaying);
        if (!m.paused) m.pause();
      } catch (e) {
        console.warn('pauseMedia error', e);
      }
    });
  }

  // 根据记录恢复播放（仅恢复之前确实在播放的）
  function resumeMedia() {
    if (!autoResume) return;
    const medias = getAllMedia();
    medias.forEach(m => {
      try {
        const shouldResume = pausedByScript.get(m);
        if (shouldResume && m.paused && !m.ended) {
          m.play().catch(() => {});
        }
        pausedByScript.delete(m);
      } catch (e) {
        console.warn('resumeMedia error', e);
      }
    });
  }

  // 仅在页面存在媒体元素时启用可见性监听
  function ensureVisibilityHandler() {
    if (getAllMedia().length === 0) return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseMedia();
      } else {
        resumeMedia();
      }
    }, { passive: true });
  }

  // 初次检查并安装监听
  ensureVisibilityHandler();

  // 监听后续动态插入的媒体元素，首次发现后安装可见性处理器
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.matches && (node.matches('video') || node.matches('audio'))) {
              ensureVisibilityHandler();
              return;
            }
            // 也检查子元素
            if (node.querySelector && node.querySelector('video, audio')) {
              ensureVisibilityHandler();
              return;
            }
          }
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  // 可选：在页面卸载时断开 observer
  window.addEventListener('beforeunload', () => observer.disconnect(), { passive: true });
})();
