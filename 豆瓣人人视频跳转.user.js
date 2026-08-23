// ==UserScript==
// @name         豆瓣人人视频跳转
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在豆瓣剧集标题后添加人人视频搜索跳转图标
// @author       You
// @match        https://movie.douban.com/subject/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var SEARCH_URL = 'https://mh.yichengwlkj.com/pc/search?keyword=';
    var ICON_URL = 'https://mh.yichengwlkj.com/favicon.ico';

    // 从标题提取搜索关键词
    function getSearchKeyword() {
        var h1 = document.querySelector('#content h1 span');
        if (!h1) return null;

        var title = h1.textContent.trim();

        // 尝试提取中文名（开头的中文部分）
        var chMatch = title.match(/^([\u4e00-\u9fa5]+)/);
        if (chMatch) return chMatch[1];

        // 尝试提取英文名（在括号或中文之前的英文部分）
        var engMatch = title.match(/^([A-Za-z][A-Za-z''\- ]+?)(?:\s+[\u4e00-\u9fa5]|\s*\(|$)/);
        if (engMatch) return engMatch[1].trim();

        // 兜底：取括号前的内容
        return title.split('(')[0].trim();
    }

    function createLink() {
        var h1 = document.querySelector('#content h1');
        if (!h1 || document.querySelector('#reren-video-link')) return;

        var keyword = getSearchKeyword();
        if (!keyword) return;

        var searchUrl = SEARCH_URL + encodeURIComponent(keyword);

        // 创建链接
        var link = document.createElement('a');
        link.id = 'reren-video-link';
        link.href = searchUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = '在人人视频搜索: ' + keyword;
        link.style.cssText = 'display:inline-flex;align-items:center;margin-left:12px;padding:4px 10px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);border-radius:16px;text-decoration:none;font-size:12px;color:#fff;vertical-align:middle;transition:all 0.3s;box-shadow:0 2px 8px rgba(238,90,36,0.3);';

        // 创建图标
        var icon = document.createElement('img');
        icon.src = ICON_URL;
        icon.style.cssText = 'width:16px;height:16px;margin-right:6px;border-radius:3px;';
        icon.onerror = function() {
            this.style.display = 'none';
        };

        // 创建文字
        var text = document.createElement('span');
        text.textContent = '人人视频';

        link.appendChild(icon);
        link.appendChild(text);

        // 悬停效果
        link.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(238,90,36,0.4)';
        };
        link.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(238,90,36,0.3)';
        };

        h1.appendChild(link);
    }

    setTimeout(createLink, 2000);
})();
