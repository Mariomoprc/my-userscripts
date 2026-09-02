// ==UserScript==
// @name         Discord 响应式布局
// @namespace    https://github.com/user
// @version      1.8.0
// @description  让 Discord 网页版自适应窗口宽度 — 窄屏自动折叠侧边栏，论坛帖子不再竖排
// @author       pass
// @match        *://discord.com/*
// @icon         https://discord.com/favicon.ico
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  var STYLE_ID = 'discord-responsive-style';
  var BODY_CLASS = 'discord-responsive';
  var breakpoints = { compact: 1100, narrow: 900, tiny: 700 };

  /* =============================================
     CSS 注入
     ============================================= */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = `
      /* =============================================
         Discord 响应式布局 v1.3
         ============================================= */

      /* --- 根容器重置 --- */
      html, body, #app-mount {
        min-width: 0 !important;
        overflow-x: hidden !important;
        width: 100% !important;
      }

      /* --- 服务器列表（最左侧图标栏）--- */
      /* 使用 aria-label 选择器，比 class 更稳定 */
      div[aria-label="Servers"],
      div[data-list-id="guildsnav"] {
        flex-shrink: 1 !important;
      }

      /* =============================================
         移动端优化 (≤ 500px)
         ============================================= */

      /* =============================================
         .dr-compact (≤ 1100px)：频道列表自动收起
         ============================================= */
      body.dr-compact div[data-list-id="channels"],
      body.dr-compact div[aria-label="Channels"] {
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      body.dr-compact div[data-list-id="channels"]:hover,
      body.dr-compact div[aria-label="Channels"]:hover {
        width: 260px !important;
        min-width: 180px !important;
        max-width: 300px !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /* hover 时显示子内容（更平滑的过渡） */
      body.dr-compact div[data-list-id="channels"] > div,
      body.dr-compact div[data-list-id="channels"] nav,
      body.dr-compact div[aria-label="Channels"] > div,
      body.dr-compact div[aria-label="Channels"] nav {
        opacity: 0 !important;
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) 0.05s !important;
      }
      body.dr-compact div[data-list-id="channels"]:hover > div,
      body.dr-compact div[data-list-id="channels"]:hover nav,
      body.dr-compact div[aria-label="Channels"]:hover > div,
      body.dr-compact div[aria-label="Channels"]:hover nav {
        opacity: 1 !important;
      }

      /* =============================================
         .dr-narrow (≤ 900px)：成员列表隐藏
         ============================================= */
      body.dr-narrow div[aria-label^="Members"],
      body.dr-narrow div[aria-label="Member List"],
      body.dr-narrow [class*="memberList"],
      body.dr-narrow [class*="members"] {
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        overflow: hidden !important;
        display: none !important;
      }

      /* =============================================
         .dr-tiny (≤ 700px)：紧凑模式
         ============================================= */
      body.dr-tiny div[data-list-id="guildsnav"],
      body.dr-tiny div[aria-label="Servers"] {
        width: 48px !important;
        min-width: 48px !important;
        max-width: 48px !important;
      }

      body.dr-tiny [class*="channelHeader"],
      body.dr-tiny [class*="titleWrapper"],
      body.dr-tiny header {
        padding: 4px 8px !important;
        min-height: 36px !important;
      }

      /* =============================================
         全局：主内容区 flex 修复
         ============================================= */
      [class*="chatContent"],
      [class*="contentPrimary"],
      [class*="mainColumn"],
      main[class*="chat"] {
        flex: 1 1 0% !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      /* =============================================
         全局：帖子/消息内容不竖排
         ============================================= */
      [class*="postContent"],
      [class*="forumPost"],
      [class*="threadContent"],
      [class*="messageContent"],
      [class*="messageText"],
      [class*="textContent"],
      [class*="markup"],
      [class*="message"] {
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      /* 帖子/线程容器扩展 */
      [class*="post"],
      [class*="thread"],
      [class*="forum"] {
        min-width: 0 !important;
        max-width: none !important;
      }

      /* =============================================
         搜索面板：限制最大宽度
         ============================================= */
      [class*="searchResults"],
      [class*="searchPanel"],
      [role="search"] {
        flex-shrink: 1 !important;
      }

      body.dr-compact [class*="searchResults"],
      body.dr-compact [class*="searchPanel"],
      body.dr-compact [role="search"] {
        max-width: 320px !important;
      }

      body.dr-narrow [class*="searchResults"],
      body.dr-narrow [class*="searchPanel"],
      body.dr-narrow [role="search"] {
        max-width: 260px !important;
        min-width: 150px !important;
      }

      /* =============================================
         工具栏紧凑
         ============================================= */
      body.dr-narrow [class*="toolbar"],
      body.dr-narrow [class*="headerBar"],
      body.dr-narrow header {
        flex-wrap: wrap !important;
        gap: 2px !important;
      }

      /* =============================================
         通知横幅
         ============================================= */
      [class*="notificationBar"],
      [class*="watchBar"],
      [class*="banner"] {
        max-width: 100% !important;
        left: 0 !important;
        right: 0 !important;
      }

      /* =============================================
         模态框/弹窗
         ============================================= */
      [role="dialog"],
      [class*="modal"],
      [class*="popup"],
      [class*="overlay"] {
        max-width: calc(100vw - 20px) !important;
        max-height: calc(100vh - 20px) !important;
      }

      /* =============================================
         修复面板分隔线（黑线问题）- 强制版
         ============================================= */
      /* 移除频道列表和聊天区域之间的黑色分隔线 */
      #app-mount div[data-list-id="channels"] + div,
      #app-mount div[aria-label="Channels"] + div,
      #app-mount div[class*="sidebar"] + div {
        border-left: 0px solid transparent !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      /* Discord 自带的分隔线 */
      #app-mount div[class*="divider"],
      #app-mount div[class*="separator"],
      #app-mount div[class*="divider-"] {
        border-color: transparent !important;
        background: transparent !important;
        width: 0 !important;
        min-width: 0 !important;
      }

      /* 直接移除所有可能的分隔线 */
      #app-mount [style*="border-left"],
      #app-mount [style*="border-right"] {
        border-color: transparent !important;
      }

      /* =============================================
         Discord CSS 变量修复
         ============================================= */
      :root {
        --custom-guild-sidebar-width: 72px !important;
      }

      /* =============================================
         移动端优化 (≤ 500px)
         ============================================= */
      @media (max-width: 500px) {
        body.dr-compact div[data-list-id="channels"],
        body.dr-compact div[aria-label="Channels"] {
          width: 0 !important;
        }
        
        body.dr-compact div[data-list-id="channels"]:hover,
        body.dr-compact div[aria-label="Channels"]:hover {
          width: 85vw !important;
          max-width: 300px !important;
        }
      }
    `;

    var styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  /* =============================================
     响应式断点检测：根据窗口宽度切换 body 类名
     ============================================= */
  function updateBreakpoint() {
    var w = window.innerWidth;
    var cl = document.body.classList;
    cl.toggle('dr-compact', w <= breakpoints.compact);
    cl.toggle('dr-narrow', w <= breakpoints.narrow);
    cl.toggle('dr-tiny', w <= breakpoints.tiny);
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateBreakpoint, 80);
  }

  /* =============================================
     MutationObserver：确保样式持续生效（优化版）
     ============================================= */
  function watchBody() {
    if (!window.MutationObserver) return;

    var timer;
    var observer = new MutationObserver(function (mutations) {
      // 只在 body class 变化时触发断点检测
      var bodyClassChanged = mutations.some(function (m) {
        return m.type === 'attributes' && m.attributeName === 'class';
      });

      if (bodyClassChanged) {
        updateBreakpoint();
      }

      // 只在样式元素被移除时重新注入
      var styleRemoved = mutations.some(function (m) {
        if (m.type !== 'childList') return false;
        for (var i = 0; i < m.removedNodes.length; i++) {
          if (m.removedNodes[i].id === STYLE_ID) return true;
        }
        return false;
      });

      if (styleRemoved) {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (!document.getElementById(STYLE_ID)) {
            injectStyles();
          }
        }, 100);
      }
    });

    // 监听 #app-mount 而不是整个 body，减少触发频率
    var target = document.getElementById('app-mount') || document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class']
      });
    }
  }

  /* =============================================
     初始化
     ============================================= */
  function init() {
    injectStyles();
    updateBreakpoint();
    watchBody();
    window.addEventListener('resize', onResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
