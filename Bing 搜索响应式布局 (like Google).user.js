// ==UserScript==
// @name         Bing 搜索响应式布局 (like Google)
// @namespace    https://github.com/user
// @version      1.2.0
// @description  让必应搜索页面像谷歌一样自适应窗口宽度 — 覆盖 body 和 #b_header 的 min-width: 1204px 限制
// @author       pass
// @match        *://www.bing.com/search*
// @match        *://cn.bing.com/search*
// @icon         https://www.bing.com/favicon.ico
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  var STYLE_ID = 'bing-responsive-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = `
      /* 核心修复：移除 Bing 的 min-width: 1204px 限制 */
      body, #b_header {
        min-width: 0 !important;
      }
      /* 确保 html 不产生横向滚动 */
      html {
        overflow-x: hidden !important;
      }
    `;

    var styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  /* === MutationObserver safety net === */
  /* Bing may dynamically toggle classes on #b_header or #sb_form
     that trigger alternative fixed-width rules. We re-inject styles
     on body changes to stay in control. */
  function watchBody() {
    if (!window.MutationObserver) return;

    var timer;
    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var el = document.getElementById(STYLE_ID);
        if (el) el.remove();
        injectStyles();
      }, 200);
    });

    var target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class']
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectStyles();
      watchBody();
    });
  } else {
    injectStyles();
    watchBody();
  }
})();
