// ==UserScript==
// @name         Bing & Google 增强合集
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Bing 深色+响应式 + 禁用 Google 语音（解决 Ctrl+Shift+. 冲突）合集
// @author       pass
// @match        https://www.google.com/*
// @match        https://google.com/*
// @match        *://www.bing.com/*
// @match        *://cn.bing.com/*
// @updateURL    https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/Bing%20&%20Google%20%E5%A2%9E%E5%BC%BA%E5%90%88%E9%9B%86.user.js
// @downloadURL  https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/Bing%20&%20Google%20%E5%A2%9E%E5%BC%BA%E5%90%88%E9%9B%86.user.js
// @run-at       document-start
// @grant        none
// @icon         https://www.bing.com/favicon.ico
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  var h = location.hostname;

  // --- 1. Google 语音禁用 ---
  if (/google\.com$/.test(h)) {
    var apis = ['webkitSpeechRecognition', 'SpeechRecognition'];
    for (var i = 0; i < apis.length; i++) {
      try { Object.defineProperty(window, apis[i], { get: function(){ return undefined; }, set: function(){}, configurable: false }); } catch (e) {}
    }
    window.speechRecognitionDisabled = true;
  }

  // --- 2. Bing 深色 + 响应式（仅 bing）---
  if (/bing\.com$/.test(h)) {
    // 深色
    try { localStorage.setItem('bno', 'dark'); } catch (e) {}
    try { document.cookie = 'bno=dark; path=/; max-age=31536000; domain=.bing.com'; } catch (e) {}
    // 响应式仅在 /search
    if (/\/search/.test(location.pathname)) {
      var STYLE_ID = 'bing-responsive-style';
      function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var css = 'body, #b_header, #b_content, #b_results, #sa_container { min-width: 0 !important; max-width: 100% !important; } html { overflow-x: hidden !important; }';
        var el = document.createElement('style'); el.id = STYLE_ID; el.textContent = css; (document.head || document.documentElement).appendChild(el);
      }
      function watchBody() {
        if (!window.MutationObserver) return;
        var timer; var obs = new MutationObserver(function(){ clearTimeout(timer); timer=setTimeout(function(){ var e=document.getElementById(STYLE_ID); if(e) e.remove(); injectStyles(); },200); });
        var target = document.documentElement; if(target) obs.observe(target,{childList:true,subtree:true});
        try { var head=document.head; if(head) obs.observe(head,{childList:true}); } catch(e){}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ injectStyles(); watchBody(); });
      } else { injectStyles(); watchBody(); }
    }
  }
})();
