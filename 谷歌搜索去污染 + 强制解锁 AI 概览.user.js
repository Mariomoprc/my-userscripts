// ==UserScript==
// @name         谷歌搜索去污染 + 强制解锁 AI 概览
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  无论节点跳到哪里，强制谷歌搜索以美国地区运行，激活 AI Overview 功能
// @author       Gemini
// @match        *://*.google.com/search*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const urlObj = new URL(window.location.href);
    let changed = false;

    // 强制锁死地理位置为美国 (gl=us)
    if (urlObj.searchParams.get('gl') !== 'us') {
        urlObj.searchParams.set('gl', 'us');
        changed = true;
    }

    // 强制使用美式英语界面 (hl=en) -> 这样最容易稳定触发谷歌的 AI 功能
    // 如果你一定要看全中文的谷歌界面，可以把下面的 'en' 改成 'zh-CN'
    if (urlObj.searchParams.get('hl') !== 'zh-CN') {
        urlObj.searchParams.set('hl', 'zh-CN');
        changed = true;
    }

    // 如果缺失参数，立马重定向刷新
    if (changed) {
        window.location.replace(urlObj.toString());
    }
})();