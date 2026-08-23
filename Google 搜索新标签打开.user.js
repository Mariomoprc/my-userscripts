// ==UserScript==
// @name         Google 搜索新标签打开
// @match        *://www.google.com/search*
// @match        *://www.google.com.hk/search*
// @match        *://www.google.co.jp/search*
// @match        *://www.google.de/search*
// @match        *://www.google.co.uk/search*
// @description  谷歌搜索结果链接点击时在新标签页打开
// @version      1.0
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.href;
    if (!href) return;
    if (href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;

    e.preventDefault();
    e.stopPropagation();
    window.open(href, '_blank');
  }, true);
})();
