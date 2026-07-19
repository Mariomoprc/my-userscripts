// ==UserScript==
// @name         Discord 角色卡检测提示
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  仅针对含有 chara 元数据的 PNG 提供图标按钮，显示版本号
// @author       pass
// @match        https://discord.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_download
// @grant        GM_addStyle
// @connect      *
// @license MIT
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .chara-tag-container {
            position: absolute; top: 8px; left: 8px; display: flex; align-items: center;
            background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); border-radius: 6px;
            padding: 2px 4px; z-index: 10000; border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif;
            pointer-events: auto;
        }
        .chara-label { color: #ff4785; font-size: 11px; font-weight: bold; padding: 0 6px; border-right: 1px solid rgba(255, 255, 255, 0.2); }
        .chara-version { color: #fff; font-size: 11px; font-weight: bold; padding: 0 6px; border-right: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 71, 133, 0.25); border-radius: 3px; margin: 0 2px; }
        .chara-icon-btn { background: none; border: none; color: white; padding: 4px 6px; cursor: pointer; font-size: 14px; transition: transform 0.1s; display: flex; }
        .chara-icon-btn:hover { filter: brightness(1.5); transform: scale(1.1); }
    `);

    const LOG = '[角色卡]';
    const knownCharaUrls = new Map();
    const nonCharaUrls = new Set();
    const checkedUrls = new Set();
    const SCANNED_ATTR = 'data-chara-scanned';

    function parseMetadata(type, dataUint8Array) {
        const decoder = (type === 'iTXt') ? new TextDecoder('utf-8') : new TextDecoder('iso-8859-1');
        const fullString = decoder.decode(dataUint8Array);
        const parts = fullString.split('\0');
        return { key: parts[0] || '', value: parts.slice(1).join('\0') || '' };
    }

    function extractVersionFromChara(key, value) {
        let jsonStr = value;
        if (value && !value.trimStart().startsWith('{')) {
            try {
                const raw = atob(value.trim());
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                jsonStr = new TextDecoder('utf-8').decode(bytes);
            } catch (e) { jsonStr = value; }
        }
        if (jsonStr) {
            try {
                const obj = JSON.parse(jsonStr);
                const cv = obj.character_version || (obj.data && obj.data.character_version);
                if (cv) return cv;
                const spec = obj.spec || (obj.data && obj.data.spec);
                if (spec) { const m = spec.match(/v(\d+(?:\.\d+)?)/); if (m) return m[1]; }
                if (obj.spec_version) return obj.spec_version;
            } catch (e) {}
        }
        const m = (key || '').toLowerCase().match(/chara(?:_card)?_v(\d+)/);
        return m ? m[1] : null;
    }

    function extractVersionFromMessage(element) {
        let el = element;
        for (let i = 0; i < 10 && el; i++) el = el.parentElement;
        if (!el) return null;
        const content = el.querySelector('[class*="messageContent"]');
        if (!content) return null;
        const m = content.textContent.match(/[vV](\d+\.?\d*(?:\.\d+)*)|版本\s*(\d+\.?\d*(?:\.\d+)*)/);
        return m ? (m[1] || m[2]) : null;
    }

    function getPngUrl(el) {
        if (el.tagName === 'A') return el.href;
        if (el.tagName === 'IMG') {
            const src = el.src || el.getAttribute('data-src') || '';
            if (src && (src.includes('.png') || src.includes('.PNG') || src.includes('attachments'))) return src;
        }
        const img = el.querySelector('img[src*=".png"], img[src*=".PNG"], img[src*="attachments"]');
        if (img) return img.src || '';
        return null;
    }

    function getContainer(el) {
        const w = el.closest('[class*="imageWrapper"]') ||
                  el.closest('[class*="clickableWrapper"]') ||
                  el.closest('[class*="imageContainer"]');
        if (w) return w;
        if (el.tagName === 'IMG') {
            let p = el.parentElement;
            for (let i = 0; i < 8 && p; i++) {
                const s = getComputedStyle(p);
                if (s.position !== 'static' || s.overflow === 'hidden') return p;
                p = p.parentElement;
            }
        }
        return el;
    }

    function checkImage(url, container) {
        if (nonCharaUrls.has(url) || checkedUrls.has(url)) return;
        if (knownCharaUrls.has(url)) {
            addFloatingUI(container, url, knownCharaUrls.get(url));
            return;
        }

        checkedUrls.add(url);
        console.log(LOG, '正在检测 PNG:', url.substring(0, 80));

        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            responseType: "arraybuffer",
            timeout: 15000,
            onload: function(response) {
                const buffer = response.response;
                if (!buffer || buffer.byteLength < 8) {
                    console.log(LOG, '文件太小或为空');
                    nonCharaUrls.add(url);
                    return;
                }
                const view = new DataView(buffer);
                if (view.getUint32(0) !== 0x89504E47) {
                    console.log(LOG, '不是 PNG 文件');
                    nonCharaUrls.add(url);
                    return;
                }

                let offset = 8;
                let charaKey = null;
                let charaValue = null;
                while (offset < buffer.byteLength) {
                    const length = view.getUint32(offset);
                    if (length > buffer.byteLength - offset - 12) break;
                    const type = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
                    if (type === 'tEXt' || type === 'iTXt') {
                        const meta = parseMetadata(type, new Uint8Array(buffer.slice(offset + 8, offset + 8 + length)));
                        if (meta.key.toLowerCase().includes('chara')) {
                            charaKey = meta.key;
                            charaValue = meta.value;
                            break;
                        }
                    }
                    if (type === 'IEND') break;
                    offset += 12 + length;
                }

                if (charaKey) {
                    const version = extractVersionFromChara(charaKey, charaValue);
                    console.log(LOG, '✅ 角色卡!', charaKey, '版本:', version);
                    knownCharaUrls.set(url, version);
                    addFloatingUI(container, url, version);
                } else {
                    console.log(LOG, '❌ 非角色卡');
                    nonCharaUrls.add(url);
                }
            },
            onerror: function(e) {
                console.log(LOG, '⚠️ 请求失败', e);
                nonCharaUrls.add(url);
                checkedUrls.delete(url);
            },
            ontimeout: function() {
                console.log(LOG, '⚠️ 请求超时');
                nonCharaUrls.add(url);
                checkedUrls.delete(url);
            }
        });
    }

    function addFloatingUI(container, url, metadataVersion) {
        if (container.querySelector('.chara-tag-container')) return;

        const version = metadataVersion || extractVersionFromMessage(container);
        const ui = document.createElement('div');
        ui.className = 'chara-tag-container';
        ui.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };

        ui.innerHTML = `
            <span class="chara-label">角色卡</span>
            ${version ? `<span class="chara-version">v${version}</span>` : ''}
            <button class="chara-icon-btn btn-copy" title="复制链接">📋</button>
            <button class="chara-icon-btn btn-dl" title="下载图片">📥</button>
        `;

        ui.querySelector('.btn-copy').onclick = function() {
            GM_setClipboard(url);
            this.innerHTML = '✅';
            setTimeout(() => this.innerHTML = '📋', 1500);
        };

        ui.querySelector('.btn-dl').onclick = function() {
            const fileName = url.split('/').pop().split('?')[0] || 'character.png';
            GM_download(url, fileName);
        };

        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        container.appendChild(ui);
        console.log(LOG, '📌 标签已添加到 DOM');
    }

    function scan() {
        const els = document.querySelectorAll(
            'a[href*=".png"], a[href*=".PNG"], img[src*=".png"], img[src*=".PNG"], img[src*="attachments"]'
        );
        els.forEach(el => {
            if (el.querySelector && el.querySelector('.chara-tag-container')) return;
            if (el.closest && el.closest('.chara-tag-container')) return;
            const url = getPngUrl(el);
            if (!url) return;
            const container = getContainer(el);
            checkImage(url, container);
        });
    }

    console.log(LOG, '🚀 v2.4 已加载');
    console.log(LOG, '匹配到的元素:', document.querySelectorAll('a[href*=".png"], img[src*=".png"], img[src*="attachments"]').length);
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', () => setTimeout(scan, 500));
    window.addEventListener('pageshow', () => scan());
    setInterval(scan, 3000);
})();
