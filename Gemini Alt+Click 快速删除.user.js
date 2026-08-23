// ==UserScript==
// @name         Gemini Alt+Click 快速删除
// @namespace    https://gemini.google.com
// @version      4.2
// @description  Gemini 侧边栏中 Alt+左键点击对话直接删除。Alt+Shift+左键输出调试信息。
// @author       You
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ====== 选择器 ======
    const CONV_TAG = 'GEM-NAV-LIST-ITEM';
    const MORE_BTN_JSLG = '305704';
    const DELETE_TEST_ID = 'delete-button';
    const DIALOG_ROLE = 'dialog';
    const CONFIRM_TEXTS = ['delete', '删除', '削除', '确认', 'confirm'];

    // ====== 查找对话 ======
    function getConv(el) {
        if (!el || !el.closest) return null;
        const item = el.closest(CONV_TAG);
        if (!item) return null;
        const link = item.querySelector('a[href*="/app/"]');
        if (!link) return null;
        const href = link.getAttribute('href') || '';
        if (!href.includes('/app/')) return null;
        return item;
    }

    // ====== 找确认按钮 ======
    function findConfirmBtn(container) {
        const btns = container.querySelectorAll('button');
        for (const btn of btns) {
            const t = btn.textContent.trim().toLowerCase();
            if (CONFIRM_TEXTS.some(s => t === s || t.includes(s))) return btn;
        }
        return null;
    }

    // ====== 删除流程 ======
    function doDelete(item) {
        // 闪烁反馈
        const orig = { bg: item.style.background, shadow: item.style.boxShadow, trans: item.style.transition };
        item.style.transition = 'all 0.12s ease';
        item.style.background = '#d93025';
        item.style.boxShadow = 'inset 0 0 0 2px #d93025';
        setTimeout(() => {
            item.style.background = orig.bg;
            item.style.boxShadow = orig.shadow;
            setTimeout(() => { item.style.transition = orig.trans; }, 150);
        }, 350);

        const moreBtn = item.querySelector(`button[jslog="${MORE_BTN_JSLG}"]`) || item.querySelector('button');
        if (!moreBtn) return;
        moreBtn.click();

        const int1 = setInterval(() => {
            const delBtn = document.querySelector(`[data-test-id="${DELETE_TEST_ID}"]`);
            if (delBtn && delBtn.offsetParent !== null) {
                clearInterval(int1);
                delBtn.click();
                const int2 = setInterval(() => {
                    const dialog = document.querySelector(`[role="${DIALOG_ROLE}"]`);
                    if (dialog && dialog.offsetParent !== null) {
                        clearInterval(int2);
                        const confirmBtn = findConfirmBtn(dialog);
                        if (confirmBtn) confirmBtn.click();
                    }
                }, 80);
                setTimeout(() => clearInterval(int2), 5000);
            }
        }, 80);
        setTimeout(() => clearInterval(int1), 5000);
    }

    // ====== 调试 ======
    function debugConv(el) {
        const item = getConv(el);
        if (!item) { console.log('[Gemini Delete] 未找到对话项'); return; }
        const link = item.querySelector('a[href*="/app/"]');
        console.log('=== Gemini Delete 调试 ===');
        console.log('标题:', link?.getAttribute('aria-label'));
        const btns = item.querySelectorAll('button');
        console.log('按钮:', btns.length);
        btns.forEach((b, i) => console.log(`  [${i}] jslog=${b.getAttribute('jslog')} aria="${b.getAttribute('aria-label')}" visible=${b.offsetParent !== null}`));
        console.log('更多按钮(jslog=305704):', item.querySelector(`button[jslog="${MORE_BTN_JSLG}"]`) ? '✓' : '✗');
        console.log('删除菜单(data-test-id):', document.querySelector(`[data-test-id="${DELETE_TEST_ID}"]`) ? '存在' : '不存在（需先点更多按钮）');
    }

    // ====== 事件 ======
    document.addEventListener('mousedown', function (e) {
        try {
            // Alt+Shift = 调试
            if (e.altKey && e.shiftKey && getConv(e.target)) {
                e.preventDefault(); e.stopPropagation();
                debugConv(e.target);
                return;
            }
            // Alt = 删除
            if (e.altKey && !e.shiftKey) {
                const item = getConv(e.target);
                if (item) { e.preventDefault(); e.stopPropagation(); doDelete(item); }
            }
        } catch (err) { console.error('[Gemini Delete]', err); }
    }, true);

    document.addEventListener('click', function (e) {
        if (e.altKey && !e.shiftKey && getConv(e.target)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    console.log('%c[Gemini Delete] v4.2 已加载', 'color:#4285f4;font-weight:bold');
    console.log('  Alt + 左键          = 删除对话');
    console.log('  Alt + Shift + 左键  = 调试信息');
})();
