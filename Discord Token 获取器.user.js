// ==UserScript==
// @name        Discord Token 获取器
// @namespace   http://tampermonkey.net/
// @version     4.0
// @description 通过Tampermonkey菜单获取Discord已登录用户的Token
// @match       https://discord.com/*
// @match       https://discordapp.com/*
// @grant       GM_setClipboard
// @grant       GM_notification
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       unsafeWindow
// @run-at      document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== Discord Token获取脚本启动 ===');

    var capturedToken = null;

    // 在页面加载前设置拦截器
    function setupInterceptors() {
        var pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        // 拦截fetch - 使用更底层的方法
        var origFetch = pageWindow.fetch;
        pageWindow.fetch = function() {
            var args = Array.from(arguments);

            // 检查headers
            function extractToken(headers) {
                if (!headers) return;
                if (headers.Authorization) {
                    capturedToken = headers.Authorization;
                } else if (headers instanceof Headers) {
                    var auth = headers.get('Authorization');
                    if (auth) capturedToken = auth;
                }
            }

            // 检查Request对象
            if (args[0] && args[0].headers) {
                extractToken(args[0].headers);
            }

            // 检查第二个参数
            if (args[1]) {
                extractToken(args[1].headers);

                // 如果headers是普通对象
                if (args[1].headers && typeof args[1].headers === 'object' && !(args[1].headers instanceof Headers)) {
                    for (var key in args[1].headers) {
                        if (key.toLowerCase() === 'authorization') {
                            capturedToken = args[1].headers[key];
                        }
                    }
                }
            }

            return origFetch.apply(this, args);
        };

        // 拦截XMLHttpRequest
        var origXHROpen = XMLHttpRequest.prototype.open;
        var origXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function() {
            this._customHeaders = {};
            return origXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            if (name && name.toLowerCase() === 'authorization') {
                capturedToken = value;
            }
            return origXHRSetHeader.apply(this, arguments);
        };

        console.log('拦截器已设置');
    }

    setupInterceptors();

    // 获取Token的函数
    function getToken() {
        // 方法1: 从拦截器获取
        if (capturedToken) {
            console.log('从拦截器获取到Token');
            return capturedToken;
        }

        var pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        // 方法2: 从webpackChunkdiscord_app获取
        try {
            var chunk = pageWindow.webpackChunkdiscord_app;
            if (chunk) {
                var theReq = null;
                chunk.push([[Math.random()], {}, function(req) { theReq = req; }]);

                if (theReq && theReq.m) {
                    var moduleIds = Object.keys(theReq.m);
                    for (var i = 0; i < moduleIds.length; i++) {
                        try {
                            var mod = theReq(moduleIds[i]);
                            if (!mod) continue;
                            var target = mod.default || mod;

                            // 检查是否有getToken方法且返回字符串
                            if (typeof target.getToken === 'function' && typeof target.isAuthenticated === 'function') {
                                var token = target.getToken();
                                if (token && typeof token === 'string' && token.length > 50) {
                                    console.log('从webpack获取到Token');
                                    return token;
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('webpack方法出错:', e.message);
        }

        // 方法3: 触发一个请求然后从拦截器获取
        return capturedToken;
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text, 'text');
            return true;
        }

        try {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            var success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (e) {
            return false;
        }
    }

    GM_registerMenuCommand('获取 Discord Token', function() {
        console.log('菜单命令被点击');

        try {
            var token = getToken();

            if (token && typeof token === 'string') {
                // 清理token (移除可能的 "Bot " 或 "Bearer " 前缀)
                if (token.startsWith('Bot ')) token = token.substring(4);
                if (token.startsWith('Bearer ')) token = token.substring(7);

                var copySuccess = copyToClipboard(token);

                GM_setValue('discord_token', token);
                GM_setValue('discord_token_timestamp', new Date().toISOString());

                alert('✅ Token获取成功！\n\nToken已复制到剪贴板\n长度: ' + token.length + ' 字符');
            } else {
                // 如果没有立即获取到，尝试触发一个请求
                var pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
                pageWindow.fetch('/api/v9/users/@me').then(function() {
                    // 等待请求完成后再检查
                    setTimeout(function() {
                        var retryToken = getToken();
                        if (retryToken && typeof retryToken === 'string') {
                            if (retryToken.startsWith('Bot ')) retryToken = retryToken.substring(4);
                            if (retryToken.startsWith('Bearer ')) retryToken = retryToken.substring(7);
                            copyToClipboard(retryToken);
                            GM_setValue('discord_token', retryToken);
                            GM_setValue('discord_token_timestamp', new Date().toISOString());
                            alert('✅ Token获取成功！\n\nToken已复制到剪贴板\n长度: ' + retryToken.length + ' 字符');
                        } else {
                            alert('❌ Token获取失败\n\n请确保已登录Discord并刷新页面\n然后滚动页面或切换频道触发请求');
                        }
                    }, 500);
                }).catch(function() {
                    alert('❌ Token获取失败\n\n请确保已登录Discord并刷新页面');
                });
            }
        } catch (error) {
            console.error('错误:', error);
            alert('获取Token时出错: ' + error.message);
        }
    });

    console.log('=== 脚本初始化完成 ===');
    console.log('菜单命令已注册，可通过Tampermonkey菜单使用');
})();