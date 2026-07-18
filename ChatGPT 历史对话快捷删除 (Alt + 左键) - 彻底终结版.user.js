// ==UserScript==
// @name         ChatGPT 历史对话快捷删除 (Alt + 左键) - 彻底终结版
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  按住 Alt + 鼠标左键 快速删除 ChatGPT 历史对话条目
// @author       Peer
// @match        https://chatgpt.com/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 采用捕获阶段，确保在所有框架逻辑前拦截点击
    document.addEventListener('click', function(e) {
        // 必须按住 Alt 键
        if (!e.altKey) return;

        // 1. 精准锁定最外层的 li 容器
        const chatItem = e.target.closest('li.list-none, [class*="history-item"]');
        if (!chatItem) return;

        // 强行拦截默认的跳转和切换聊天行为
        e.preventDefault();
        e.stopPropagation();

        // 2. 寻找那个绝对定位的“三个点”菜单按钮
        const menuBtn = chatItem.querySelector('button[data-testid*="history-item-"][data-testid*="-options"]');

        if (menuBtn) {
            // 步骤一：强行向“三个点”按钮派发底层点击事件
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            menuBtn.dispatchEvent(clickEvent);

            // 步骤二：延迟等待下拉菜单渲染
            setTimeout(() => {
                const menuItems = document.querySelectorAll('[role="menuitem"], div, span, button');
                let deleteMenuOption = null;

                for (let item of menuItems) {
                    const text = item.textContent.trim().toLowerCase();
                    if (text === 'delete' || text === '删除') {
                        deleteMenuOption = item;
                        break;
                    }
                }

                if (deleteMenuOption) {
                    // 触发下拉菜单中的“删除”
                    deleteMenuOption.click();

                    // 步骤三：延迟等待二次确认模态框（Modal）出现
                    setTimeout(() => {
                        // 【核心修复】：ChatGPT 的确认按钮可能用 div 包裹，这里扩大搜索范围
                        // 寻找弹窗中所有可能的点击元素
                        const modalElements = document.querySelectorAll('button, div[class*="flex"], px-4');
                        let confirmBtn = null;

                        for (let el of modalElements) {
                            const text = el.textContent.trim().toLowerCase();
                            // 精确匹配文字为“删除”或“delete”
                            if (text === 'delete' || text === '删除') {
                                // 优先选择 button，或者包含特定居中样式的 div
                                if (el.tagName === 'BUTTON' || el.classList.contains('flex')) {
                                    confirmBtn = el;
                                    break;
                                }
                            }
                        }

                        if (confirmBtn) {
                            // 最后一击，戳中那个“删除” div/button 节点
                            confirmBtn.click();
                        }
                    }, 250); // 给二次确认弹窗预留 250ms
                }
            }, 150); // 给下拉菜单预留 150ms
        }
    }, true);
})();