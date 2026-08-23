// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      5.0
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

    const LOG = '[人人视频v5]';
    function log(...a) { console.log(LOG, ...a); }

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

    let lastBoundVideo = null;
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

    // === 弹幕修复：全屏时强制弹幕层可见 ===
    function fixDanmakuInFullscreen(container) {
        const style = document.createElement('style');
        style.id = 'rrmj-danmaku-fs-fix';
        style.textContent = `
            :fullscreen .barrage-container,
            :-webkit-full-screen .barrage-container,
            [class*="barrage"][class*="layer"],
            [class*="danmaku"],
            [class*="danmu"],
            [class*="bullet-comment"],
            [id*="barrage-layer"] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: none !important;
            }
            :fullscreen #player-container > *,
            :-webkit-full-screen #player-container > * {
                position: relative;
            }
        `;
        document.head.appendChild(style);
        log('已注入弹幕修复样式');
    }

    function setup() {
        const video = document.querySelector('#player-container video')
                   || document.querySelector('.player-container video')
                   || document.querySelector('video');
        if (!video) { setTimeout(setup, 1000); return; }

        // 检测是否是新视频（SPA切换）
        if (video === lastBoundVideo) return;
        lastBoundVideo = video;

        log('绑定事件到 video:', video.src?.substring(0, 80));

        // === 双击全屏 ===
        let lastTap = 0;

        function handleDblTap(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isFS()) {
                exitFS();
            } else {
                pendingPlayState = !video.paused;
                const target = video.closest('#player-container')
                            || video.closest('.player-container')
                            || video.parentElement;
                requestFS(target);
                tryLock();
                fixDanmakuInFullscreen(target);
            }
        }

        video.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                handleDblTap(e);
            } else {
                lastTap = now;
            }
        }, { passive: false });

        video.addEventListener('dblclick', handleDblTap);

        // 全屏进入后恢复播放状态
        function restoreState() {
            if (isFS() && pendingPlayState !== null) {
                setTimeout(() => {
                    if (video.paused && pendingPlayState) {
                        video.play().catch(() => {});
                    } else if (!video.paused && !pendingPlayState) {
                        video.pause();
                    }
                    pendingPlayState = null;
                }, 100);
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
        let hasMoved = false;

        video.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = false;
            hasMoved = false;
        }, { passive: true });

        video.addEventListener('touchmove', function(e) {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            if (!hasMoved && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                hasMoved = true;
            }

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

        video.addEventListener('touchend', function(e) {
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

    // 定期检查新视频（SPA路由变化）
    setInterval(() => {
        const video = document.querySelector('#player-container video')
                   || document.querySelector('.player-container video');
        if (video && video !== lastBoundVideo) {
            log('检测到新视频，重新绑定');
            setup();
        }
    }, 2000);

    setTimeout(setup, 2000);

    const obs = new MutationObserver(() => {
        const video = document.querySelector('#player-container video');
        if (video && video !== lastBoundVideo) setup();
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

    log('脚本已加载', location.href);
})();
