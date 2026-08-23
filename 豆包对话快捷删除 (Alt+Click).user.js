// ==UserScript==
// @name         豆包对话快捷删除 (Alt+Click)
// @namespace    https://github.com/yourname
// @version      2.0
// @description  按住 Alt + 鼠标左键点击历史对话，瞬间删除，无弹窗干扰
// @author       You
// @match        https://www.doubao.com/chat/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function waitForElement(selector, timeout, textFilter) {
        return new Promise(function(resolve, reject) {
            function find() {
                var els = document.querySelectorAll(selector);
                for (var i = 0; i < els.length; i++) {
                    if (!textFilter) return els[i];
                    if (els[i].textContent.trim().includes(textFilter)) return els[i];
                }
                return null;
            }
            var el = find();
            if (el) return resolve(el);
            var observer = new MutationObserver(function() {
                var el = find();
                if (el) { observer.disconnect(); resolve(el); }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            if (timeout > 0) setTimeout(function() { observer.disconnect(); reject('timeout'); }, timeout);
        });
    }

    // 使用捕获阶段，在 React Router 处理前拦截
    document.addEventListener('click', function(e) {
        if (!e.altKey || e.button !== 0) return;

        var link = e.target.closest('a[id^="conversation_"]');
        if (!link) return;

        // 阻止页面导航和事件传播
        e.preventDefault();
        e.stopPropagation();

        console.log('豆包删除: 对话 ' + link.id.replace('conversation_', ''));

        // 推迟到当前事件周期结束后再操作，避免干扰 React 事件系统
        setTimeout(function() {
            var menuBtn = link.querySelector('button[aria-haspopup="menu"]');
            if (!menuBtn) return;

            // Radix UI 需要 pointerdown 来打开下拉菜单
            menuBtn.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true, cancelable: true, composed: true,
                button: 0, pointerType: 'mouse'
            }));

            waitForElement('[role="menuitem"]', 3000, '删除').then(function(deleteItem) {
                // 点击"删除"菜单项
                deleteItem.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true, cancelable: true, composed: true,
                    button: 0, pointerType: 'mouse'
                }));
                deleteItem.click();

                return waitForElement('[role="dialog"] button', 3000, '删除');
            }).then(function(confirmBtn) {
                if (confirmBtn) {
                    // 点击确认删除按钮
                    confirmBtn.dispatchEvent(new PointerEvent('pointerdown', {
                        bubbles: true, cancelable: true, composed: true,
                        button: 0, pointerType: 'mouse'
                    }));
                    confirmBtn.click();
                }
            }).catch(function() {
                // 静默处理超时
            });
        }, 50);
    }, true);

    console.log('豆包快捷删除已加载 — Alt+Click 删除历史对话');
})();
