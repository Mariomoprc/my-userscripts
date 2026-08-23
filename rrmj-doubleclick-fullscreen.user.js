// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  双击全屏+滑动进度+弹幕保留，支持安卓手机
// @author       You
// @match        *://mh.yichengwlkj.com/*
// @match        *://*.rrmj.plus/*
// @match        *://*.rrmj.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const LOG = '[人人视频v7]';
    function log(...a) { console.log(LOG, ...a); }

    // 注入样式：让播放器覆盖层不拦截双击事件
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 让播放器中间的按钮覆盖层不拦截触摸，让事件穿透到容器 */
            #player-container > div.absolute.inset-x-0.inset-y-\\[96px\\] {
                pointer-events: none !important;
            }
            /* 保留顶部栏的 pointer-events（返回按钮需要点击） */
        `;
        document.head.appendChild(style);
        log('已注入样式');
    }

    function requestFS(el) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) fn.call(el);
    }

    function exitFS() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (fn) fn.call(document);
    }

    function isFS() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    function tryLock() {
        try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); } catch(e) {}
    }

    function tryUnlock() {
        try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch(e) {}
    }

    let boundContainer = null;
    let pendingPlayState = null;
    let swipeIndicator = null;

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function createIndicator() {
        if (swipeIndicator) return swipeIndicator;
        swipeIndicator = document.createElement('div');
        Object.assign(swipeIndicator.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: '10px',
            fontSize: '18px',
            zIndex: '999999',
            pointerEvents: 'none',
            display: 'none',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap'
        });
        document.body.appendChild(swipeIndicator);
        return swipeIndicator;
    }

    function getVideo() {
        return document.querySelector('#player-container video')
            || document.querySelector('.player-container video')
            || document.querySelector('video');
    }

    function getContainer() {
        const video = getVideo();
        if (!video) return null;
        return video.closest('#player-container')
            || video.closest('.player-container')
            || video.parentElement;
    }

    function setup() {
        const video = getVideo();
        const container = getContainer();
        if (!video || !container) { setTimeout(setup, 1000); return; }

        if (container === boundContainer) return;
        boundContainer = container;
        log('绑定到容器');

        // === 双击全屏（capture 阶段，优先于覆盖层事件） ===
        let lastTap = 0;

        function onDblTap(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isFS()) {
                exitFS();
            } else {
                pendingPlayState = !video.paused;
                requestFS(container);
                tryLock();
            }
        }

        container.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                onDblTap(e);
            } else {
                lastTap = now;
            }
        }, { passive: false, capture: true });

        container.addEventListener('dblclick', function(e) {
            onDblTap(e);
        }, { capture: true });

        // === 全屏进入后恢复播放状态 ===
        function restoreState() {
            if (isFS() && pendingPlayState !== null) {
                setTimeout(() => {
                    if (video.paused && pendingPlayState) {
                        video.play().catch(() => {});
                    } else if (!video.paused && !pendingPlayState) {
                        video.pause();
                    }
                    pendingPlayState = null;
                }, 200);
            }
            if (!isFS()) {
                tryUnlock();
                pendingPlayState = null;
            }
        }

        document.addEventListener('fullscreenchange', restoreState);
        document.addEventListener('webkitfullscreenchange', restoreState);

        // === 左右滑动进度 ===
        let touchStartX = 0;
        let touchStartY = 0;
        let isSwiping = false;

        container.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = false;
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            if (!isSwiping && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                isSwiping = true;
                e.preventDefault();
            }

            if (isSwiping) {
                e.preventDefault();
                const duration = video.duration || 0;
                if (!duration) return;
                const seekDelta = (dx / window.innerWidth) * duration * 0.5;
                const targetTime = Math.max(0, Math.min(duration, video.currentTime + seekDelta));
                const ind = createIndicator();
                ind.style.display = 'block';
                const diff = targetTime - video.currentTime;
                const sign = diff >= 0 ? '+' : '';
                ind.textContent = formatTime(video.currentTime) + ' → ' + formatTime(targetTime) + ' (' + sign + formatTime(Math.abs(diff)) + ')';
            }
        }, { passive: false });

        container.addEventListener('touchend', function(e) {
            if (isSwiping) {
                const touch = e.changedTouches[0];
                const dx = touch.clientX - touchStartX;
                const duration = video.duration || 0;
                if (duration) {
                    const seekDelta = (dx / window.innerWidth) * duration * 0.5;
                    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seekDelta));
                }
                isSwiping = false;
                if (swipeIndicator) {
                    setTimeout(() => { swipeIndicator.style.display = 'none'; }, 600);
                }
            }
        }, { passive: true });

        log('绑定完成');
    }

    injectStyles();

    // SPA 路由变化检测
    setInterval(() => {
        const container = getContainer();
        if (container && container !== boundContainer) {
            log('检测到新容器，重新绑定');
            boundContainer = null;
            setup();
        }
    }, 2000);

    setTimeout(setup, 2000);

    const obs = new MutationObserver(() => {
        const container = getContainer();
        if (container && container !== boundContainer) {
            boundContainer = null;
            setup();
        }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

    log('脚本已加载', location.href);
})();
