// ==UserScript==
// @name         禁用 Google 语音搜索（解决 Ctrl+Shift+. 与 Copilot 冲突）
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  在 google.com 上禁用语音识别 API，解决 Ctrl+Shift+. 与 Edge Copilot 快捷键冲突
// @author       you
// @match        https://www.google.com/*
// @match        https://google.com/*
// @run-at       document-start
// @icon         https://www.google.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function nop() {}
    const apiNames = ['webkitSpeechRecognition', 'SpeechRecognition'];

    function killSpeechAPI() {
        for (const name of apiNames) {
            try {
                Object.defineProperty(window, name, {
                    get() { return undefined; },
                    set() {},
                    configurable: false,
                });
            } catch (_) {}
        }
        window.speechRecognitionDisabled = true;
    }

    killSpeechAPI();
})();
