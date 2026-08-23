// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  双击视频自动全屏横屏播放，支持安卓手机 Edge/Chrome
// @author       You
// @match        *://mh.yichengwlkj.com/*
// @match        *://*.rrmj.plus/*
// @match        *://*.rrmj.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const LOG = '[人人视频双击全屏 v3]';
    function log(...a) { console.log(LOG, ...a); }

    function requestFullscreen(el) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) fn.call(el);
    }

    function exitFullscreen() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (fn) fn.call(document);
    }

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    function tryLockLandscape() {
        try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); } catch(e) {}
    }

    function tryUnlockOrientation() {
        try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch(e) {}
    }

    let bound = false;

    function setup() {
        if (bound) return;

        const container = document.querySelector('#player-container')
                       || document.querySelector('.player-container')
                       || document.querySelector('#ve-player-container');
        if (!container) { setTimeout(setup, 1000); return; }

        const video = container.querySelector('video');
        if (!video) { setTimeout(setup, 1000); return; }

        log('绑定双击事件到容器:', container.id || container.className);

        let lastTap = 0;

        container.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                e.stopPropagation();
                lastTap = 0;
                if (isFullscreen()) {
                    exitFullscreen();
                } else {
                    requestFullscreen(container);
                    tryLockLandscape();
                }
            } else {
                lastTap = now;
            }
        }, { passive: false });

        container.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isFullscreen()) {
                exitFullscreen();
            } else {
                requestFullscreen(container);
            }
        });

        bound = true;
        log('已绑定双击全屏事件');
    }

    document.addEventListener('fullscreenchange', function() {
        if (!isFullscreen()) tryUnlockOrientation();
    });
    document.addEventListener('webkitfullscreenchange', function() {
        if (!isFullscreen()) tryUnlockOrientation();
    });

    setTimeout(setup, 3000);

    const obs = new MutationObserver(() => {
        if (!bound) setup();
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

    log('脚本已加载 URL:', location.href);
})();
