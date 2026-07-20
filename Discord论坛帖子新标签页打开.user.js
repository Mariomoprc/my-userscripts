// ==UserScript==
// @name         Discord论坛帖子新标签页打开
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  点击论坛帖子时在新标签页打开，而不是显示侧边栏
// @author       You
// @match        https://discord.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 等待DOM就绪
    function onReady(fn) {
        if (document.body) { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }

    // 查找帖子卡片
    function findPostCards() {
        // 使用多个选择器来提高兼容性
        const selectors = [
            'li[data-item-role="item"]',  // 主要选择器
            '[data-item-id]',             // 备用选择器
            '[class*="card"]'             // 更宽泛的选择器
        ];

        for (const selector of selectors) {
            const cards = document.querySelectorAll(selector);
            if (cards.length > 0) {
                return cards;
            }
        }
        return [];
    }

    // 检查元素是否是帖子卡片
    function isPostCard(element) {
        if (!element || !element.dataset) return false;
        
        // 检查是否有item-role属性
        if (element.dataset.itemRole === 'item') return true;
        
        // 检查是否有data-item-id属性
        if (element.dataset.itemId) return true;
        
        // 检查父元素
        const parent = element.closest('li');
        if (parent && parent.dataset && parent.dataset.itemRole === 'item') return true;
        
        return false;
    }

    // 获取帖子ID
    function getPostId(element) {
        // 尝试从当前元素获取
        if (element.dataset && element.dataset.itemId) {
            return element.dataset.itemId;
        }
        
        // 尝试从子元素获取
        const container = element.querySelector('[data-item-id]');
        if (container) {
            return container.dataset.itemId;
        }
        
        // 尝试从父元素获取
        const parent = element.closest('li');
        if (parent) {
            const parentContainer = parent.querySelector('[data-item-id]');
            if (parentContainer) {
                return parentContainer.dataset.itemId;
            }
        }
        
        return null;
    }

    // 构造帖子URL
    function getPostUrl(postId) {
        const currentUrl = window.location.href;
        const urlParts = currentUrl.split('/');
        
        // 确保URL格式正确
        if (urlParts.length >= 5) {
            const guildId = urlParts[4];
            const channelId = urlParts[5];
            
            // 构造帖子URL
            return `https://discord.com/channels/${guildId}/${channelId}/${postId}`;
        }
        
        return null;
    }

    // 处理帖子点击
    function handlePostClick(event) {
        // 查找最近的帖子卡片
        let target = event.target;
        let postCard = null;
        
        // 向上查找直到找到帖子卡片
        while (target && target !== document.body) {
            if (isPostCard(target)) {
                postCard = target;
                break;
            }
            target = target.parentElement;
        }
        
        if (!postCard) return;
        
        // 获取帖子ID
        const postId = getPostId(postCard);
        if (!postId) return;
        
        // 构造帖子URL
        const postUrl = getPostUrl(postId);
        if (!postUrl) return;
        
        // 阻止事件冒泡和默认行为
        event.preventDefault();
        event.stopPropagation();
        
        // 在新标签页打开
        window.open(postUrl, '_blank');
    }

    // 初始化帖子卡片监听
    function initPostCards() {
        const postCards = findPostCards();
        
        postCards.forEach(card => {
            // 检查是否已经处理过
            if (card.dataset.postClickHandler) return;
            
            // 标记已处理
            card.dataset.postClickHandler = 'true';
            
            // 添加点击事件监听器（使用capture阶段）
            card.addEventListener('click', handlePostClick, true);
        });
    }

    // 设置MutationObserver监听新帖子
    function setupObserver() {
        const observer = new MutationObserver(function(mutations) {
            let shouldInit = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldInit = true;
                    break;
                }
            }
            
            if (shouldInit) {
                // 延迟初始化，等待DOM更新
                setTimeout(initPostCards, 100);
            }
        });
        
        // 监听整个文档
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }

    // 主函数
    function main() {
        // 初始化帖子卡片
        initPostCards();
        
        // 设置观察器
        const observer = setupObserver();
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', function() {
            if (observer) {
                observer.disconnect();
            }
        }, { passive: true });
    }

    // 页面加载完成后初始化
    onReady(main);

    // 也监听URL变化（SPA路由）
    let lastUrl = location.href;
    
    function onUrlChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // 重新初始化
            setTimeout(initPostCards, 500);
        }
    }
    
    // 监听pushState和replaceState
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    
    history.pushState = function() {
        origPushState.apply(this, arguments);
        onUrlChange();
    };
    
    history.replaceState = function() {
        origReplaceState.apply(this, arguments);
        onUrlChange();
    };
    
    // 监听popstate和hashchange
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
})();