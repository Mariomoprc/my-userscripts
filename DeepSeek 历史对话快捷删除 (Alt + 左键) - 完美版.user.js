// ==UserScript==
// @name         DeepSeek 历史对话快捷删除 (Alt + 左键) - 完美版
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  按住 Alt + 鼠标左键 快速删除 DeepSeek 历史对话条目
// @author       Peer
// @match        https://chat.deepseek.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 使用事件捕获（true），在页面原生跳转逻辑触发前进行拦截
    document.addEventListener('click', function(e) {
        // 必须同时满足：按住 Alt 键
        if (!e.altKey) return;

        // 寻找当前点击的历史对话条目
        const chatItem = e.target.closest('a[href*="/a/chat/s/"]');
        if (!chatItem) return;

        // 拦截默认的页面跳转和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 寻找该条目下的“三个点”操作按钮容器
        const menuBtn = chatItem.querySelector('.ds-icon-button');

        if (menuBtn) {
            // 1. 点击“三个点”菜单
            menuBtn.click();

            // 2. 延迟等待下拉菜单渲染完成
            setTimeout(() => {
                // 全局寻找包含“删除”字样的菜单项
                const menuItems = document.querySelectorAll('div, span, p, li');
                let deleteMenuOption = null;

                for (let item of menuItems) {
                    if (item.textContent.trim() === '删除' || item.textContent.trim() === 'Delete') {
                        deleteMenuOption = item;
                        break;
                    }
                }

                if (deleteMenuOption) {
                    // 2. 点击弹出菜单里的“删除”
                    deleteMenuOption.click();

                    // 3. 延迟等待二次确认弹窗出现
                    setTimeout(() => {
                        // 优先通过 DeepSeek 专用的危险按钮类名来精确定位红色“删除该对话”按钮
                        let confirmBtn = document.querySelector('.ds-basic-button--danger');

                        // 如果类名匹配不到，再通过文字兜底查找
                        if (!confirmBtn) {
                            const actionButtons = document.querySelectorAll('button');
                            for (let btn of actionButtons) {
                                const text = btn.textContent.trim();
                                if (text.includes('删除该对话') || text === '确认' || text === '确定') {
                                    confirmBtn = btn;
                                    break;
                                }
                            }
                        }

                        if (confirmBtn) {
                            // 3. 点击确认删除按钮，完成操作
                            confirmBtn.click();
                        }
                    }, 200); // 留出 200ms 等待确认弹窗动画
                }
            }, 150); // 留出 150ms 等待下拉菜单动画
        }
    }, true);
})();