// ==UserScript==
// @name         人人视频双击全屏
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  双击视频自动全屏横屏播放，支持安卓手机
// @author       You
// @match        *://mh.yichengwlkj.com/*
// @match        *://*.rrmj.plus/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 等待DOM加载完成
    function onReady(fn) {
        if (document.body) { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }

    // 尝试旋转屏幕为横屏
    function tryLockLandscape() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {
                    // 旋转锁定失败，忽略
                });
            }
        } catch (e) {
            // Screen Orientation API 不支持，忽略
        }
    }

    // 进入全屏
    function requestFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    // 退出全屏
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    // 检查是否全屏
    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    // 查找视频元素
    function findVideoElement() {
        // 尝试常见的视频容器选择器
        const selectors = [
            'video',
            '.player-container video',
            '#player-container video',
            '.video-container video',
            '.dplayer-video-wrap video',
            '.art-video-player video',
            'video.html5-main-video'
        ];

        for (const selector of selectors) {
            const video = document.querySelector(selector);
            if (video && video.offsetWidth > 100 && video.offsetHeight > 100) {
                return video;
            }
        }

        // 如果没找到，尝试查找最大的视频元素
        const videos = document.querySelectorAll('video');
        let largestVideo = null;
        let largestArea = 0;

        for (const video of videos) {
            const area = video.offsetWidth * video.offsetHeight;
            if (area > largestArea && area > 10000) { // 至少100x100
                largestArea = area;
                largestVideo = video;
            }
        }

        return largestVideo;
    }

    // 查找视频的父容器（用于全屏）
    function findVideoContainer(video) {
        // 尝试查找播放器容器
        const containerSelectors = [
            '.player-container',
            '#player-container',
            '.video-container',
            '.dplayer',
            '.art-video-player',
            '.video-js'
        ];

        for (const selector of containerSelectors) {
            const container = video.closest(selector);
            if (container) {
                return container;
            }
        }

        // 如果没找到合适的容器，返回视频的父元素
        return video.parentElement;
    }

    // 设置双击事件
    function setupDoubleTapFullscreen() {
        const video = findVideoElement();
        if (!video) {
            // 视频还没加载，稍后重试
            setTimeout(setupDoubleTapFullscreen, 1000);
            return;
        }

        let lastTap = 0;
        let tapTimeout;

        // 触摸事件（移动端）
        video.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            if (tapLength < 300 && tapLength > 0) {
                // 双击检测
                e.preventDefault();
                clearTimeout(tapTimeout);

                if (isFullscreen()) {
                    exitFullscreen();
                } else {
                    const container = findVideoContainer(video);
                    requestFullscreen(container);
                    tryLockLandscape();
                }
            } else {
                // 单击，设置延时
                lastTap = currentTime;
                tapTimeout = setTimeout(function() {
                    // 单击处理（如果需要）
                }, 300);
            }
        });

        // 鼠标事件（桌面端）
        video.addEventListener('dblclick', function(e) {
            e.preventDefault();
            if (isFullscreen()) {
                exitFullscreen();
            } else {
                const container = findVideoContainer(video);
                requestFullscreen(container);
            }
        });

        console.log('[人人视频双击全屏] 脚本已加载，双击视频可全屏');
    }

    // 监听全屏变化
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    function handleFullscreenChange() {
        if (!isFullscreen()) {
            // 退出全屏时，尝试解锁屏幕旋转
            try {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            } catch (e) {
                // 忽略
            }
        }
    }

    // 页面加载完成后初始化
    onReady(function() {
        // 延迟初始化，等待视频加载
        setTimeout(setupDoubleTapFullscreen, 2000);

        // 监听动态加载的视频
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'VIDEO' || node.querySelector && node.querySelector('video')) {
                            setTimeout(setupDoubleTapFullscreen, 500);
                            return;
                        }
                    }
                }
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    });
})();