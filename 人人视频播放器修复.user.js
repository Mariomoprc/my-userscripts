// ==UserScript==
// @name         人人视频 播放器修复
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  修复暂停后继续播放时弹幕在动但视频画面卡住的问题（轻seek + 渲染层hack）
// @author       opencode
// @match        *://*.yichengwlkj.com/*
// @match        *://*.rrmj.plus/*
// @match        *://*.bwcgee.cn/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    //  设置读写
    // ============================================================
    var S = {
        get: function (k, d) { var v = localStorage.getItem('rrmv_fix_' + k); return v !== null ? v === '1' : d; },
        set: function (k, v) { localStorage.setItem('rrmv_fix_' + k, v ? '1' : '0'); }
    };

    // ============================================================
    //  菜单
    // ============================================================
    var videoFixEnabled = S.get('videoFix', true);
    GM_registerMenuCommand((videoFixEnabled ? '✔ ' : '✘ ') + '播放器修复', function () {
        S.set('videoFix', !videoFixEnabled);
        location.reload();
    });

    if (!videoFixEnabled) return;

    // ============================================================
    //  播放器修复核心逻辑
    // ============================================================

    // 渲染层 hack 样式
    var fixStyle = document.createElement('style');
    fixStyle.textContent = '.xgplayer video { will-change: transform !important; transform: translateZ(0) !important; }';
    (document.head || document.documentElement).appendChild(fixStyle);

    var fixTimers = [];

    function hookVideoForFix(video) {
        if (video._rrmvFixApplied) return;
        video._rrmvFixApplied = true;

        console.log('[播放器修复] hook video, currentTime:', video.currentTime);

        // 2. 监听 playing 事件，执行轻 seek
        var onPlaying = function () {
            console.log('[播放器修复] 视频恢复播放, currentTime:', video.currentTime);

            // 轻 seek：强制解码器输出新帧
            requestAnimationFrame(function () {
                var current = video.currentTime;
                video.currentTime = current;
                console.log('[播放器修复] 执行轻 seek, currentTime:', current);
            });
        };

        var onStalled = function () {
            console.warn('[播放器修复] 视频 stalled, 尝试恢复...');
            requestAnimationFrame(function () {
                video.currentTime = video.currentTime + 0.001;
            });
        };

        video.addEventListener('playing', onPlaying);
        video.addEventListener('stalled', onStalled);

        // 3. 定期检查缓冲区
        var bufferTimer = setInterval(function () {
            if (video.paused || video.ended) return;

            var buffered = video.buffered.length > 0
                ? video.buffered.end(video.buffered.length - 1)
                : 0;
            var bufferGap = buffered - video.currentTime;

            if (bufferGap < 1 && !video.seeking) {
                console.warn('[播放器修复] 缓冲区过小:', bufferGap.toFixed(2), 's');
                video.currentTime = video.currentTime + 0.001;
            }
        }, 2000);
        fixTimers.push(bufferTimer);
    }

    // 等待 video 元素出现并 hook
    function waitForVideo() {
        var video = document.querySelector('.xgplayer video') ||
                    document.querySelector('#ve-player-container video') ||
                    document.querySelector('#player-container video') ||
                    document.querySelector('video');

        if (video) {
            hookVideoForFix(video);
            return;
        }

        // 用 MutationObserver 监听
        var mo = new MutationObserver(function () {
            var v = document.querySelector('.xgplayer video') ||
                    document.querySelector('#ve-player-container video') ||
                    document.querySelector('#player-container video') ||
                    document.querySelector('video');
            if (v) {
                mo.disconnect();
                hookVideoForFix(v);
            }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        fixTimers.push(setTimeout(function () { mo.disconnect(); }, 30000));
    }

    // 页面加载完成后初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        waitForVideo();
    } else {
        document.addEventListener('DOMContentLoaded', waitForVideo);
    }

    // 页面卸载时清理
    window.addEventListener('beforeunload', function () {
        fixTimers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    }, { passive: true });

})();