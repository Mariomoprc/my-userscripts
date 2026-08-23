// ==UserScript==
// @name         Bing 深色模式
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动设置Bing深色模式
// @author       You
// @match        *://www.bing.com/*
// @match        *://cn.bing.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    try { localStorage.setItem('bno', 'dark'); } catch(e) {}
    document.cookie = 'bno=dark; path=/; max-age=31536000; domain=.bing.com';
})();