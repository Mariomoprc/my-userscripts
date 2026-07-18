// ==UserScript==
// @name         Chub AI 中文汉化
// @namespace    https://github.com/CharHubAI/chub-zh
// @version      1.0.0
// @description  将 chub.ai 界面翻译为简体中文
// @author       chub-zh
// @match        *://chub.ai/*
// @icon         https://chub.ai/favicon/favicon.ico
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const MARKER = 'data-zh-translated';

    const zhMap = {
        'Search for...': '搜索角色/知识书...',
        'Login': '登录',
        'Register': '注册',

        'Sign In': '登录',
        'GenAI for everyone.': '人人可用的生成式 AI。',
        'Username': '用户名',
        'Get Started': '开始使用',
        'Search without Login >>': '无需登录开始搜索 >>',
        'Legacy Site >>': '旧版网站 >>',

        'Need an account? Register here.': '没有账号？在此注册。',
        'Username or Email': '用户名或邮箱',
        'Password': '密码',
        'Forgot Password?': '忘记密码？',
        'Login with Google': '使用 Google 登录',
        'Login with Apple': '使用 Apple 登录',
        'Login with GitHub': '使用 GitHub 登录',

        'Already registered? Login instead.': '已有账号？去登录。',
        'Email': '邮箱',
        'By registering, you agree to our': '注册即表示您同意我们的',
        'and': '和',
        'Register with Apple': '使用 Apple 注册',
        'Register with Google': '使用 Google 注册',
        'Register with GitHub': '使用 GitHub 注册',

        'All': '全部',
        'Characters': '角色',
        'Lorebooks': '知识书',
        'Presets': '预设',
        'Stages': '场景',
        'People': '人物',
        'Tags': '标签',
        'Enter or click to search': '输入关键词搜索',
        'Sort:': '排序：',
        'Sort :': '排序：',
        'User Default': '默认排序',
        'Includes Tags': '包含标签',

        'Previous': '上一页',
        'Next': '下一页',

        'Preview': '预览',
        'Import Chat': '导入聊天',
        'Download': '下载',
        'Favorite': '收藏',
        'Fork': '克隆',
        'Add': '添加',
        'Report': '举报',
        'Discussion': '讨论',
        'Shared public chats': '公开聊天记录',
        'Gallery': '画廊',
        'Forks': '克隆版本',
        'Version history': '版本历史',
        'You May Also Like': '猜你喜欢',
        'Definitions - May contain spoilers': '定义 - 可能包含剧透',
        'Created on': '创建于',
        'Last Updated:': '最后更新：',
        'fork': '克隆自',

        'Feedback & Ideas': '反馈与建议',
        'System Status': '系统状态',
        'Careers': '加入我们',
        'Privacy Policy': '隐私政策',
        'TOS': '服务条款',
    };

    const attrMap = {
        'placeholder': true,
        'aria-label': true,
        'title': true,
    };

    function getTranslation(text) {
        var trimmed = text.trim();
        if (zhMap.hasOwnProperty(trimmed)) {
            return zhMap[trimmed];
        }
        return null;
    }

    function translateTextNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) return false;
        var text = node.nodeValue;
        if (!text || !text.trim()) return false;
        var parent = node.parentElement;
        if (parent && parent.hasAttribute(MARKER)) return false;

        var translated = getTranslation(text);
        if (translated !== null) {
            node.nodeValue = text.replace(text.trim(), translated);
            if (parent) parent.setAttribute(MARKER, 'true');
            return true;
        }
        return false;
    }

    function translateAttributes(element) {
        var changed = false;
        for (var attr in attrMap) {
            if (!element.hasAttribute(attr)) continue;
            var val = element.getAttribute(attr);
            var translated = getTranslation(val);
            if (translated !== null) {
                element.setAttribute(attr, translated);
                changed = true;
            }
        }
        return changed;
    }

    function translateElement(element) {
        if (element.hasAttribute && element.hasAttribute(MARKER)) return;
        var changed = false;

        if (element.hasAttribute && translateAttributes(element)) {
            changed = true;
        }

        var walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement && node.parentElement.hasAttribute(MARKER)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        var node;
        while ((node = walker.nextNode())) {
            if (translateTextNode(node)) {
                changed = true;
            }
        }

        if (changed) {
            element.setAttribute(MARKER, 'true');
        }
    }

    function translateAll() {
        translateElement(document.body);
    }

    function setupObserver() {
        var observer = new MutationObserver(function(mutations) {
            var needsTranslate = false;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (!node.hasAttribute(MARKER)) {
                                needsTranslate = true;
                                break;
                            }
                        }
                    }
                }
                if (needsTranslate) break;
            }
            if (needsTranslate) {
                translateAll();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
        });
    }

    function main() {
        if (document.body) {
            translateAll();
            setupObserver();
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                translateAll();
                setupObserver();
            });
        }
    }

    main();
})();
