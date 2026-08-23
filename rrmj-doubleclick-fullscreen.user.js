// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      8.0
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

    const LOG = '[人人视频v8]';
    function log(...a) { console.log(LOG, ...a); }

    // ====== 样式注入 ======
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'rrmj-fs-style';
        style.textContent = `
            /* 移除播放按钮覆盖层的触摸拦截 */
            #player-container > div.absolute.inset-x-0.inset-y-\\[96px\\] {
                pointer-events: none !important;
            }
            /* 全屏时保持弹幕层在播放器内部可见 */
            #player-container:fullscreen,
            #player-container:-webkit-full-screen {
                display: flex !important;
                align-items: center;
                justify-content: center;
                background: #000;
            }
            /* 全屏时让 ve-player 内的弹幕层保持正确层级 */
            #player-container:fullscreen #ve-player,
            #player-container:-webkit-full-screen #ve-player {
                position: relative !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 1 !important;
            }
        `;
        document.head.appendChild(style);
        log('样式已注入');
    }

    // ====== 全屏相关 ======
    function requestFS(el) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) {
            try { fn.call(el); log('requestFS 调用成功'); }
            catch(e) { log('requestFS 失败:', e); }
        }
    }

    function exitFS() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (fn) {
            try { fn.call(document); } catch(e) {}
        }
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

    // ====== 查找元素 ======
    function getVideo() {
        return document.querySelector('#player-container video')
            || document.querySelector('.player-container video')
            || document.querySelector('#ve-player video')
            || document.querySelector('video');
    }

    function getContainer() {
        const video = getVideo();
        if (!video) return null;
        // 优先 #player-container，它是播放器的最合理全屏目标
        const pc = video.closest('#player-container');
        if (pc) return pc;
        const pp = video.closest('.player-container');
        if (pp) return pp;
        // 向上找，找到第一个宽度匹配视频的容器
        let el = video.parentElement;
        while (el && el !== document.body) {
            if (el.offsetWidth >= video.offsetWidth * 0.9) return el;
            el = el.parentElement;
        }
        return video.parentElement;
    }

    // ====== 状态管理 ======
    let boundContainer = null;
    let pendingPlayState = null;
    let swipeIndicator = null;

    function formatTime(s) {
        if (!s || !isFinite(s)) return '0:00';
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
            background: 'rgba(0,0,0,0.85)',
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

    // ====== 核心绑定 ======
    function setup() {
        const video = getVideo();
        const container = getContainer();
        if (!video || !container) {
            setTimeout(setup, 1000);
            return;
        }

        if (container === boundContainer) return;
        boundContainer = container;
        log('绑定事件, 容器:', container.id || container.className?.substring(0, 40));

        // === 1. 双击全屏 ===
        let lastTap = 0;

        container.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                e.stopPropagation();
                lastTap = 0;

                if (isFS()) {
                    exitFS();
                } else {
                    // 保存播放状态
                    pendingPlayState = !video.paused;
                    log('双击 -> 全屏, 播放状态:', pendingPlayState);
                    requestFS(container);
                    tryLock();
                }
            } else {
                lastTap = now;
            }
        }, { passive: false, capture: true });

        container.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isFS()) {
                exitFS();
            } else {
                pendingPlayState = !video.paused;
                requestFS(container);
            }
        }, { capture: true });

        // === 2. 全屏状态恢复 ===
        function onFSChange() {
            if (isFS() && pendingPlayState !== null) {
                // 全屏进入：恢复播放状态
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

        document.addEventListener('fullscreenchange', onFSChange);
        document.addEventListener('webkitfullscreenchange', onFSChange);

        // === 3. 左右滑动进度 ===
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

    // ====== 初始化 ======
    injectStyles();
    setTimeout(setup, 2000);

    // SPA 路由变化检测
    setInterval(() => {
        const container = getContainer();
        if (container && container !== boundContainer) {
            log('SPA 切换检测到新容器');
            boundContainer = null;
            setup();
        }
    }, 2000);

    // DOM 变化检测
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
