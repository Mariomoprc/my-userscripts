// ==UserScript==
// @name         豆瓣自动加载更多
// @namespace    https://github.com/douban-auto-load
// @version      11.0.0
// @description  自动点击豆瓣"加载更多"按钮，不强制滚动
// @author       OpenCode
// @match        https://movie.douban.com/*
// @match        https://search.douban.com/*
// @match        https://book.douban.com/*
// @match        https://music.douban.com/*
// @grant        none
// @run-at       document-end
// @inject-into  page
// ==/UserScript==

(function () {
  'use strict';

  var MAX = 200;
  var COOLDOWN = 2000;
  var count = 0;
  var busy = false;

  function log(msg) { console.log('[豆瓣自动加载] ' + msg); }

  function isVisible(el) {
    if (!el) return false;
    var s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetHeight > 0;
  }

  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function findBtn() {
    var xp = document.evaluate(
      '//*[contains(text(),"加载更多") or contains(text(),"Load More")]',
      document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    );
    for (var i = 0; i < xp.snapshotLength; i++) {
      var el = xp.snapshotItem(i);
      if (isVisible(el)) return el;
    }
    var all = document.querySelectorAll('a, button, span, div, p');
    for (var j = 0; j < all.length; j++) {
      var t = all[j].textContent.trim();
      if ((t === '加载更多' || t === 'Load More') && isVisible(all[j])) return all[j];
    }
    return null;
  }

  function waitGone(btn, cb) {
    var done = false;
    function fire() { if (!done) { done = true; cb(); } }
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (!btn || !btn.parentNode || !isVisible(btn) || n > 20) { clearInterval(t); fire(); }
    }, 200);
    setTimeout(function () { clearInterval(t); fire(); }, 6000);
  }

  function tryClick() {
    if (count >= MAX || busy) return;
    var btn = findBtn();
    if (!btn || !inViewport(btn)) return;

    busy = true;
    btn.click();
    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    count++;
    log('已加载 ' + count + ' 次');

    waitGone(btn, function () {
      setTimeout(function () { busy = false; }, COOLDOWN);
    });
  }

  function start() {
    new MutationObserver(function () { tryClick(); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(tryClick, 1000);
    log('已启动，滚到底部自动加载');
    tryClick();
  }

  window.stopLoad = function () { log('已停止，共加载 ' + count + ' 次'); };
  log('3秒后开始...');
  setTimeout(start, 3000);
})();
