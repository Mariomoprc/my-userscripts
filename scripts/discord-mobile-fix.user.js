// ==UserScript==
// @name         Discord 手机端布局修复
// @namespace    http://tampermonkey.net/
// @version      9.0.0
// @description  修复 Discord 移动网页版帖子/线程详情页左侧文字截断问题
// @author       pass
// @match        https://discord.com/*
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function applyFixes() {
        if (!isMobile()) return;

        // 检测是否在帖子/线程详情页（URL含 /threads/ 或有 absolute 的 panel）
        const isThreadView = window.location.pathname.includes('/threads/') ||
            document.querySelector('[class*="sidebar__"] [class*="panel_"][style*="position"]') !== null;

        document.querySelectorAll('div').forEach(el => {
            const cls = String(el.className || '');

            // 修复 base grid 容器（不缓存，需要随视图切换）
            if (cls.includes('base__')) {
                const s = getComputedStyle(el);
                if (s.display === 'grid') {
                    const cols = s.gridTemplateColumns;
                    if (cols.includes('72px') && cols.includes('263px')) {
                        const newCols = isThreadView ? '0px 0px 1fr' : '72px 0px 1fr';
                        if (el.style.getPropertyValue('grid-template-columns') !== newCols) {
                            el.style.setProperty('grid-template-columns', newCols, 'important');
                        }
                    }
                }
            }

            // 修复 sidebar subgrid 子元素（不缓存，因为需要随帖子/列表切换）
            if (cls.includes('sidebar__')) {
                const s = getComputedStyle(el);
                if (s.display === 'grid' && s.gridTemplateColumns.includes('subgrid')) {
                    const sidebarCols = isThreadView ? '0px 0px 4px 1fr' : '72px 0px 4px 1fr';
                    if (el.style.getPropertyValue('grid-template-columns') !== sidebarCols) {
                        el.style.setProperty('grid-template-columns', sidebarCols, 'important');
                    }
                }
            }

            // 修复 content subgrid 子元素
            if (cls.includes('content__') && el.style.getPropertyValue('--tw-grid-fixed') !== 'done') {
                const s = getComputedStyle(el);
                if (s.display === 'grid' && s.gridTemplateColumns.includes('subgrid')) {
                    el.style.setProperty('grid-template-columns', '1fr 55px', 'important');
                    el.style.setProperty('--tw-grid-fixed', 'done', 'important');
                }
            }

            // 修复帖子面板（absolute定位的 panel）
            if (cls.includes('panel_') && el.style.getPropertyValue('--panel-fixed') !== 'done') {
                const s = getComputedStyle(el);
                if (s.position === 'absolute') {
                    el.style.setProperty('position', 'relative', 'important');
                    el.style.setProperty('left', '0', 'important');
                    el.style.setProperty('width', '100vw', 'important');
                    el.style.setProperty('max-width', '100vw', 'important');
                    el.style.setProperty('--panel-fixed', 'done', 'important');
                }
            }
        });

        // 修复帖子面板内的内容溢出
        document.querySelectorAll('[class*="messageContent"]').forEach(el => {
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('overflow-wrap', 'break-word', 'important');
            el.style.setProperty('word-break', 'break-word', 'important');
        });

        // 修复 header 标题
        document.querySelectorAll('[class*="headerTitle"]').forEach(el => {
            el.style.setProperty('overflow', 'visible', 'important');
            el.style.setProperty('text-overflow', 'unset', 'important');
        });
    }

    setTimeout(applyFixes, 2000);
    setTimeout(applyFixes, 4000);

    const observer = new MutationObserver(() => requestAnimationFrame(applyFixes));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', () => setTimeout(applyFixes, 500));
    setInterval(applyFixes, 3000);
})();
