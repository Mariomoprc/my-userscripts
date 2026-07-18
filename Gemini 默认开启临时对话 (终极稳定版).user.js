// ==UserScript==
// @name         Gemini 默认开启临时对话 (终极稳定版)
// @namespace    https://gemini.google.com
// @version      2.0
// @description  自动开启临时对话，采用防抖与智能锁，彻底解决频繁失效与死循环问题
// @author       You
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 1. 核心配置
    const TEMP_BTN_SELECTOR = '[data-test-id="temp-chat-button"]';
    let lastActionTime = 0;
    const COOLDOWN = 1500; // 冷却时间 1.5 秒，防止对同一个按钮疯狂点击

    function checkAndEnable() {
        const now = Date.now();
        if (now - lastActionTime < COOLDOWN) return; // 还在冷却期，直接跳过

        // 如果当前的 URL 已经是临时对话（比如链接里带了相关参数，或者已经刷新成功），可以根据需要跳过
        // 这里主要通过按钮本身的状态来精准判断
        const btn = document.querySelector(TEMP_BTN_SELECTOR);
        if (!btn) return;

        // 核心优化：大厂一般用 aria-checked 或 aria-pressed 来标记开关状态，或者检查特定的内部 svg/类名
        // 如果实在拿不准，可以通过 btn.getAttribute('aria-checked') 判定
        const isSelected = btn.getAttribute('aria-checked') === 'true' ||
                           btn.getAttribute('aria-pressed') === 'true' ||
                           btn.classList.contains('temp-chat-on'); // 保留你之前的方案作为备选

        // 如果检测到未开启
        if (!isSelected) {
            lastActionTime = now; // 立即上锁
            console.log('[Gemini Auto Temp] 检测到临时对话未开启，正在尝试激活...');

            // 使用原生点击事件
            btn.click();

            // 延迟双保险检查
            setTimeout(() => {
                const reCheckBtn = document.querySelector(TEMP_BTN_SELECTOR);
                if (reCheckBtn) {
                    const stillNotSelected = reCheckBtn.getAttribute('aria-checked') !== 'true' &&
                                             reCheckBtn.getAttribute('aria-pressed') !== 'true' &&
                                             !reCheckBtn.classList.contains('temp-chat-on');
                    if (stillNotSelected) {
                        console.log('[Gemini Auto Temp] 状态未同步，尝试二次补刀...');
                        reCheckBtn.click();
                    }
                }
            }, 800);
        }
    }

    // 2. 用防抖（Debounce）改造观察者，防止 DOM 频繁变动导致脚本发疯
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            checkAndEnable();
        }, 200); // 停止变动 200ms 后再检查
    });

    function init() {
        // 监听整个 body，只要元素出来或者属性变了就去查
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // 初次进入执行
        checkAndEnable();
    }

    // 确保在 body 存在时挂载监听器
    if (document.body) {
        init();
    } else {
        const docObserver = new MutationObserver(() => {
            if (document.body) {
                init();
                docObserver.disconnect();
            }
        });
        docObserver.observe(document.documentElement, { childList: true });
    }
})();