// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      4.0
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

    const LOG = '[人人视频v4]';
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

    let bound = false;

    function findFullscreenTarget(video) {
        const candidates = [
            video.closest('#player-container'),
            video.closest('.player-container'),
            video.closest('#ve-player-container'),
            video.closest('[class*="player"]'),
            video.parentElement
        ];
        for (const c of candidates) {
            if (c && c.offsetWidth > 100 && c.offsetHeight > 100) return c;
        }
        return video.parentElement;
    }

    function setup() {
        if (bound) return;

        const video = document.querySelector('#player-container video')
                   || document.querySelector('.player-container video')
                   || document.querySelector('video');
        if (!video) { setTimeout(setup, 1000); return; }

        const fsTarget = findFullscreenTarget(video);
        log('全屏目标:', fsTarget?.id || fsTarget?.className?.substring(0, 60));

        let lastTap = 0;
        let pendingPlayState = null;

        fsTarget.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                e.stopPropagation();
                lastTap = 0;

                if (isFS()) {
                    exitFS();
                } else {
                    pendingPlayState = !video.paused;
                    requestFS(fsTarget);
                    tryLock();
                }
            } else {
                lastTap = now;
            }
        }, { passive: false });

        fsTarget.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isFS()) {
                exitFS();
            } else {
                pendingPlayState = !video.paused;
                requestFS(fsTarget);
            }
        });

        // 全屏进入后，恢复播放状态（防止单击误触暂停）
        document.addEventListener('fullscreenchange', restoreState);
        document.addEventListener('webkitfullscreenchange', restoreState);

        function restoreState() {
            if (isFS() && pendingPlayState !== null) {
                if (video.paused && pendingPlayState) {
                    video.play().catch(() => {});
                } else if (!video.paused && !pendingPlayState) {
                    video.pause();
                }
                pendingPlayState = null;
            }
            if (!isFS()) {
                tryUnlock();
                pendingPlayState = null;
            }
        }

        // === 左右滑动控制进度 ===
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;
        let swipeIndicator = null;

        function createIndicator() {
            if (swipeIndicator) return swipeIndicator;
            swipeIndicator = document.createElement('div');
            Object.assign(swipeIndicator.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                zIndex: '999999',
                pointerEvents: 'none',
                display: 'none',
                fontFamily: 'sans-serif'
            });
            document.body.appendChild(swipeIndicator);
            return swipeIndicator;
        }

        fsTarget.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            isSwiping = false;
        }, { passive: true });

        fsTarget.addEventListener('touchmove', function(e) {
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
                const currentTime = video.currentTime;
                const targetTime = Math.max(0, Math.min(duration, currentTime + seekDelta));

                const ind = createIndicator();
                ind.style.display = 'block';
                const diff = targetTime - currentTime;
                const sign = diff >= 0 ? '+' : '';
                ind.textContent = formatTime(currentTime) + ' → ' + formatTime(targetTime) + ' (' + sign + formatTime(Math.abs(diff)) + ')';
            }
        }, { passive: false });

        fsTarget.addEventListener('touchend', function(e) {
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
                    setTimeout(() => { swipeIndicator.style.display = 'none'; }, 500);
                }
            }
        }, { passive: true });

        function formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        bound = true;
        log('已绑定双击全屏+滑动进度');
    }

    setTimeout(setup, 3000);

    const obs = new MutationObserver(() => { if (!bound) setup(); });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

    log('脚本已加载', location.href);
})();
