// ==UserScript==
// @name        网页代理检测器
// @namespace   http://tampermonkey.net/
// @version     1.9
// @description 检测当前网页是否需要代理，国内直连网站不提示，需要代理的网站显示国旗+状态
// @author      You
// @match       *://*/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @run-at      document-end
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置常量
    const CONFIG = {
        enabled: GM_getValue('configEnabled', true),
        displayMode: GM_getValue('displayMode', 'dot'), // 'banner' | 'dot' | 'menu'
        autoUpdate: true,
        updateInterval: 24 * 60 * 60 * 1000,
        timeout: 5000,
        // 代理规则源
        proxyRulesUrls: [
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt',
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt',
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/greatfire.txt',
        ],
        // 直连规则源
        directRulesUrls: [
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt',
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt',
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt',
            'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt',
        ],
        // 降级备用
        proxyRulesUrlFallback: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt',
        directRulesUrlFallback: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt',
    };
    
    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 全局模块实例（避免重复创建）
    let ruleManager = null;
    let networkTester = null;
    let flagIdentifier = null;
    let dnsDetector = null;
    let uiPrompt = null;
    let lastHostname = '';
    
    // 规则管理模块
    class RuleManager {
        constructor() {
            this.proxyRules = new Set();
            this.directRules = new Set();
            this.proxyKeywords = new Set();
            this.directKeywords = new Set();
            this.lastUpdate = null;
            this.ruleSources = [];
            this._loadingPromise = null;
        }
        
        // 从在线资源加载规则
        async loadRules() {
            if (this._loadingPromise) return this._loadingPromise;
            this._loadingPromise = this._doLoadRules();
            try {
                await this._loadingPromise;
            } finally {
                this._loadingPromise = null;
            }
        }
        
        async _doLoadRules() {
            try {
                // 检查缓存版本
                const cacheVersion = GM_getValue('ruleCacheVersion', 0);
                if (cacheVersion < 4) {
                    GM_setValue('lastRuleUpdate', 0);
                    GM_setValue('ruleCacheVersion', 4);
                }
                
                // 检查是否需要更新
                const lastUpdate = GM_getValue('lastRuleUpdate', 0);
                const now = Date.now();
                
                if (now - lastUpdate < CONFIG.updateInterval) {
                    const cachedProxyRules = GM_getValue('proxyRules', []);
                    const cachedDirectRules = GM_getValue('directRules', []);
                    
                    if (cachedProxyRules.length > 0) {
                        this.proxyRules = new Set(cachedProxyRules);
                        this.directRules = new Set(cachedDirectRules);
                        this.proxyKeywords = new Set(GM_getValue('proxyKeywords', []));
                        this.directKeywords = new Set(GM_getValue('directKeywords', []));
                        this.lastUpdate = lastUpdate;
                        this.ruleSources = GM_getValue('ruleSources', []);
                        console.log(`[Proxy Detector] 使用缓存规则: ${this.proxyRules.size} 代理 / ${this.directRules.size} 直连`);
                        return;
                    }
                }
                
                // 批量下载所有规则源
                console.log('[Proxy Detector] 开始下载规则...');
                this.ruleSources = [];
                const allProxyRules = new Set();
                const allDirectRules = new Set();
                const allProxyKeywords = new Set();
                const allDirectKeywords = new Set();
                
                // 下载代理规则
                for (const url of CONFIG.proxyRulesUrls) {
                    try {
                        const text = await this.fetchUrl(url);
                        const parsed = this.parseRules(text);
                        for (const r of parsed.rules) allProxyRules.add(r);
                        for (const k of parsed.keywords) allProxyKeywords.add(k);
                        const name = url.split('/').pop();
                        this.ruleSources.push({ name, type: 'proxy', count: parsed.rules.size });
                        console.log(`[Proxy Detector] ✓ ${name}: ${parsed.rules.size} 条`);
                    } catch (e) {
                        console.warn(`[Proxy Detector] ✗ ${url.split('/').pop()}: ${e.message}`);
                    }
                }
                
                // 下载直连规则
                for (const url of CONFIG.directRulesUrls) {
                    try {
                        const text = await this.fetchUrl(url);
                        const parsed = this.parseRules(text);
                        for (const r of parsed.rules) allDirectRules.add(r);
                        for (const k of parsed.keywords) allDirectKeywords.add(k);
                        const name = url.split('/').pop();
                        this.ruleSources.push({ name, type: 'direct', count: parsed.rules.size });
                        console.log(`[Proxy Detector] ✓ ${name}: ${parsed.rules.size} 条`);
                    } catch (e) {
                        console.warn(`[Proxy Detector] ✗ ${url.split('/').pop()}: ${e.message}`);
                    }
                }
                
                // 全部失败时降级
                if (allProxyRules.size === 0 && allDirectRules.size === 0) {
                    console.warn('[Proxy Detector] 所有规则源下载失败，使用默认规则');
                    this.loadDefaultRules();
                    return;
                }
                
                this.proxyRules = allProxyRules;
                this.directRules = allDirectRules;
                this.proxyKeywords = allProxyKeywords;
                this.directKeywords = allDirectKeywords;
                
                // 缓存
                GM_setValue('proxyRules', Array.from(this.proxyRules));
                GM_setValue('directRules', Array.from(this.directRules));
                GM_setValue('proxyKeywords', Array.from(this.proxyKeywords));
                GM_setValue('directKeywords', Array.from(this.directKeywords));
                GM_setValue('lastRuleUpdate', now);
                GM_setValue('ruleSources', this.ruleSources);
                
                this.lastUpdate = now;
                console.log(`[Proxy Detector] 规则下载完成: ${this.proxyRules.size} 代理 / ${this.directRules.size} 直连`);
                
            } catch (error) {
                console.error('[Proxy Detector] 规则加载失败:', error);
                this.loadDefaultRules();
            }
        }
        
        // 获取URL内容
        fetchUrl(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: CONFIG.timeout,
                    onload: function(response) {
                        if (response.status === 200) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    },
                    ontimeout: function() {
                        reject(new Error('Request timeout'));
                    }
                });
            });
        }
        
        // 解析规则文本（支持YAML payload格式 + Clash规则格式 + 纯域名列表）
        parseRules(rulesText) {
            const rules = new Set();
            const keywords = new Set();
            const lines = rulesText.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // 跳过空行、注释、YAML头部
                if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine === 'payload:') {
                    continue;
                }
                
                // 格式1：YAML payload 格式 → "- '+.domain.com'" 或 "- 'domain.com'"
                const yamlMatch = trimmedLine.match(/^-\s+['"]?([^\s'"#]+)['"]?$/);
                if (yamlMatch) {
                    let domain = yamlMatch[1].toLowerCase();
                    // 处理 +. 前缀（+.domain.com = 匹配该域及所有子域）
                    if (domain.startsWith('+.')) {
                        domain = domain.substring(2);
                    }
                    rules.add(domain);
                    continue;
                }
                
                // 格式2：纯域名列表（无逗号、无前缀）
                if (!trimmedLine.includes(',') && trimmedLine.includes('.')) {
                    rules.add(trimmedLine.toLowerCase());
                    continue;
                }
                
                // 格式3：Clash 规则格式
                const firstCommaIndex = trimmedLine.indexOf(',');
                if (firstCommaIndex === -1) continue;
                const prefix = trimmedLine.substring(0, firstCommaIndex).trim();
                const value = trimmedLine.substring(firstCommaIndex + 1).trim();
                if (!value) continue;
                
                if (prefix === 'DOMAIN-SUFFIX' || prefix === 'DOMAIN') {
                    rules.add(value.toLowerCase());
                } else if (prefix === 'DOMAIN-KEYWORD') {
                    keywords.add(value.toLowerCase());
                }
            }
            
            return { rules, keywords };
        }
        
        // 加载默认规则（仅在在线下载完全失败时使用）
        loadDefaultRules() {
            const defaultProxyDomains = [
                'google.com', 'googleapis.com', 'youtube.com', 'youtu.be',
                'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
                'whatsapp.com', 'telegram.org', 't.me',
                'github.com', 'github.io',
                'openai.com', 'chat.openai.com', 'claude.ai', 'anthropic.com',
                'perplexity.ai', 'netflix.com', 'spotify.com', 'reddit.com',
                'wikipedia.org', 'discord.com'
            ];
            
            this.proxyRules = new Set(defaultProxyDomains);
            this.directRules = new Set();
            
            console.log('[Proxy Detector] 使用默认规则（在线规则下载失败）');
        }
        
        // 匹配域名是否在规则中
        matchDomain(domain) {
            const normalizedDomain = domain.toLowerCase();
            
            // 检查是否在代理规则中
            if (this.proxyRules.has(normalizedDomain)) {
                return 'proxy';
            }
            
            // 检查是否在直连规则中
            if (this.directRules.has(normalizedDomain)) {
                return 'direct';
            }
            
            // 检查父域名
            const parts = normalizedDomain.split('.');
            for (let i = 1; i < parts.length; i++) {
                const parentDomain = parts.slice(i).join('.');
                
                if (this.proxyRules.has(parentDomain)) {
                    return 'proxy';
                }
                
                if (this.directRules.has(parentDomain)) {
                    return 'direct';
                }
            }
            
            // 检查关键词匹配（代理）
            for (const keyword of this.proxyKeywords) {
                if (normalizedDomain.includes(keyword)) {
                    return 'proxy';
                }
            }
            
            // 检查关键词匹配（直连）
            for (const keyword of this.directKeywords) {
                if (normalizedDomain.includes(keyword)) {
                    return 'direct';
                }
            }
            
            return 'unknown';
        }
        
        // 判断域名是否需要代理
        needsProxy(domain) {
            const matchResult = this.matchDomain(domain);
            return matchResult === 'proxy';
        }
        
        // 判断域名是否直连
        isDirect(domain) {
            const matchResult = this.matchDomain(domain);
            return matchResult === 'direct';
        }
    }
    
    // 网络测试模块
    class NetworkTester {
        constructor() {
            this.timeout = CONFIG.timeout;
        }
        
        // 测试网页是否可访问
        testAccessibility(url) {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'HEAD',
                    url: url,
                    timeout: this.timeout,
                    onload: function(response) {
                        // 2xx 或 3xx 状态码视为可访问
                        resolve(response.status >= 200 && response.status < 400);
                    },
                    onerror: function() {
                        resolve(false); // 网络错误视为不可访问
                    },
                    ontimeout: function() {
                        resolve(false); // 超时视为不可访问
                    }
                });
            });
        }
        
        // 测试当前网页
        async testCurrentPage() {
            const currentUrl = window.location.href;
            console.log(`[Proxy Detector] 测试页面可访问性: ${currentUrl}`);
            
            const isAccessible = await this.testAccessibility(currentUrl);
            console.log(`[Proxy Detector] 页面可访问性: ${isAccessible}`);
            
            return isAccessible;
        }
    }
    
    // DNS对比检测模块（Google DNS vs 阿里DNS）
    class DnsDetector {
        constructor() {
            this.cacheTTL = 24 * 60 * 60 * 1000; // 24小时缓存
        }
        
        // 查询DNS并返回IP列表
        queryDns(provider, domain) {
            return new Promise((resolve) => {
                const url = provider.url + encodeURIComponent(domain);
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: 8000,
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const ips = (data.Answer || [])
                                .filter(a => a.type === 1)
                                .map(a => a.data);
                            resolve(ips);
                        } catch (e) {
                            resolve([]);
                        }
                    },
                    onerror: function() { resolve([]); },
                    ontimeout: function() { resolve([]); }
                });
            });
        }
        
        // 对比检测
        async detect(domain) {
            // DNS缓存版本，升级时清旧缓存
            const dnsCacheVer = GM_getValue('dnsCacheVersion', 0);
            if (dnsCacheVer < 6) {
                GM_setValue('dnsCacheVersion', 6);
            }
            
            // 检查缓存（新格式：verdict在顶层）
            const cacheKey = `dns_${domain}`;
            const cached = GM_getValue(cacheKey);
            if (cached && typeof cached === 'object' && cached.verdict && cached.time && (Date.now() - cached.time < this.cacheTTL)) {
                console.log(`[Proxy Detector] DNS缓存命中: ${cached.verdict}`);
                return cached;
            }
            
            console.log(`[Proxy Detector] DNS检测: ${domain}`);
            
            // 并行查询两个DNS
            const [googleIps, aliIps] = await Promise.all([
                this.queryDns({ url: 'https://dns.google/resolve?name=' }, domain),
                this.queryDns({ url: 'https://dns.alidns.com/resolve?name=' }, domain)
            ]);
            
            console.log(`[Proxy Detector] Google DNS: [${googleIps.join(', ')}]`);
            console.log(`[Proxy Detector] 阿里 DNS: [${aliIps.join(', ')}]`);
            
            let result;
            
            if (aliIps.length === 0 && googleIps.length === 0) {
                result = { verdict: 'unknown', reason: 'DNS查询失败', googleIps: [], aliIps: [] };
            } else if (aliIps.length === 0) {
                result = { verdict: 'proxy', reason: '阿里DNS无法解析，疑似被墙', googleIps, aliIps };
            } else if (googleIps.length === 0) {
                const hasInvalidAli = aliIps.some(ip => 
                    ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('198.')
                );
                result = hasInvalidAli
                    ? { verdict: 'proxy', reason: '阿里DNS返回异常IP，疑似DNS污染', googleIps, aliIps }
                    : { verdict: 'direct', reason: '国内DNS可解析', googleIps, aliIps };
            } else {
                // 两个都能解析 → 对比IP判断是否DNS污染
                const aliSet = new Set(aliIps);
                const overlap = googleIps.filter(ip => aliSet.has(ip)).length;
                const overlapRatio = overlap / Math.max(googleIps.length, 1);
                
                // 先检查阿里是否有异常IP（127.0.0.1、0.0.0.0等）
                const hasInvalidAli = aliIps.some(ip => 
                    ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('198.')
                );
                
                if (hasInvalidAli) {
                    result = { verdict: 'proxy', reason: '阿里DNS返回异常IP，DNS污染', googleIps, aliIps };
                } else if (overlapRatio > 0.3) {
                    result = { verdict: 'direct', reason: 'DNS解析一致，可直连', googleIps, aliIps };
                } else if (aliIps.length <= 3 && googleIps.length > 5) {
                    result = { verdict: 'proxy', reason: 'DNS差异大，疑似污染', googleIps, aliIps };
                } else {
                    result = { verdict: 'direct', reason: 'DNS有差异但可解析，大概率可直连', googleIps, aliIps };
                }
            }
            
            // 缓存结果
            result.time = Date.now();
            GM_setValue(cacheKey, result);
            return result;
        }
        
        // 清除缓存
        clearCache(domain) {
            GM_setValue(`dns_${domain}`, null);
        }
    }
    
    // 国旗识别模块
    class FlagIdentifier {
        constructor() {
            // 国家代码到国旗emoji的映射
            this.FLAGS = {
                'US': '🇺🇸',  // 美国
                'GB': '🇬🇧',  // 英国
                'JP': '🇯🇵',  // 日本
                'KR': '🇰🇷',  // 韩国
                'SG': '🇸🇬',  // 新加坡
                'HK': '🇭🇰',  // 香港
                'TW': '🇹🇼',  // 台湾
                'DE': '🇩🇪',  // 德国
                'FR': '🇫🇷',  // 法国
                'RU': '🇷🇺',  // 俄罗斯
                'AU': '🇦🇺',  // 澳大利亚
                'CA': '🇨🇦',  // 加拿大
                'BR': '🇧🇷',  // 巴西
                'IN': '🇮🇳',  // 印度
                'NL': '🇳🇱',  // 荷兰
                'SE': '🇸🇪',  // 瑞典
                'CH': '🇨🇭',  // 瑞士
                'IT': '🇮🇹',  // 意大利
                'ES': '🇪🇸',  // 西班牙
                'PL': '🇵🇱',  // 波兰
                'UA': '🇺🇦',  // 乌克兰
                'CN': '🇨🇳',  // 中国
                'DEFAULT': '🌍'  // 默认
            };
            
            // 顶级域名到国家代码的映射
            this.TLD_MAP = {
                'uk': 'GB',
                'co.uk': 'GB',
                'jp': 'JP',
                'kr': 'KR',
                'sg': 'SG',
                'hk': 'HK',
                'tw': 'TW',
                'de': 'DE',
                'fr': 'FR',
                'ru': 'RU',
                'au': 'AU',
                'ca': 'CA',
                'br': 'BR',
                'in': 'IN',
                'nl': 'NL',
                'se': 'SE',
                'ch': 'CH',
                'it': 'IT',
                'es': 'ES',
                'pl': 'PL',
                'ua': 'UA',
                'cn': 'CN',   // 中国
                'com': 'UNKNOWN',  // 通用域名，需要进一步判断
                'net': 'UNKNOWN',
                'org': 'UNKNOWN',
                'io': 'UNKNOWN'
            };
        }
        
        // 通过域名后缀推断国家/地区
        getCountryFromDomain(domain) {
            if (!domain) return 'UNKNOWN';
            const normalizedDomain = domain.toLowerCase();
            const parts = normalizedDomain.split('.');
            
            // 检查顶级域名（如 .co.uk）
            if (parts.length >= 2) {
                const ccTLD = parts.slice(-2).join('.');
                if (this.TLD_MAP[ccTLD] !== undefined) {
                    return this.TLD_MAP[ccTLD];
                }
            }
            
            // 检查单个顶级域名（如 .uk）
            if (parts.length >= 1) {
                const tld = parts[parts.length - 1];
                if (this.TLD_MAP[tld] !== undefined) {
                    return this.TLD_MAP[tld];
                }
            }
            
            // 默认返回未知
            return 'UNKNOWN';
        }
        
        // 获取国旗emoji
        getFlag(countryCode) {
            return this.FLAGS[countryCode] || this.FLAGS['DEFAULT'];
        }
        
        // 从域名获取国旗
        getFlagFromDomain(domain) {
            const countryCode = this.getCountryFromDomain(domain);
            return this.getFlag(countryCode);
        }
    }
    
    // UI提示模块
    class UIPrompt {
        constructor() {
            this.element = null;
            this.isExpanded = false;
            this.stylesAdded = false;
        }
        
        createStyles() {
            if (this.stylesAdded) return;
            GM_addStyle(`
                .proxy-detector-prompt {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 999999;
                    opacity: 0.7;
                    transition: opacity 0.3s, transform 0.3s;
                    cursor: pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                    max-width: 300px;
                }
                .proxy-detector-prompt:hover {
                    opacity: 1;
                    transform: translateY(-2px);
                }
                .proxy-detector-prompt .flag {
                    font-size: 20px;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                .proxy-detector-prompt .status {
                    font-weight: bold;
                }
                .proxy-detector-details {
                    display: none;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.2);
                    font-size: 12px;
                    color: #ccc;
                    line-height: 1.5;
                    white-space: pre-line;
                }
                .proxy-detector-details.visible {
                    display: block;
                }
                .proxy-detector-dot {
                    position: fixed;
                    bottom: 12px;
                    right: 12px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    z-index: 999999;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
                }
                .proxy-detector-dot:hover {
                    transform: scale(1.5);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                }
                .proxy-detector-dot-tooltip {
                    position: fixed;
                    bottom: 30px;
                    right: 8px;
                    background: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    z-index: 999999;
                    pointer-events: none;
                    white-space: nowrap;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
            `);
            this.stylesAdded = true;
        }
        
        createBanner() {
            this.createStyles();
            this.element = document.createElement('div');
            this.element.className = 'proxy-detector-prompt';
            
            this.flagElement = document.createElement('span');
            this.flagElement.className = 'flag';
            
            this.statusElement = document.createElement('span');
            this.statusElement.className = 'status';
            
            this.detailsElement = document.createElement('div');
            this.detailsElement.className = 'proxy-detector-details';
            
            this.element.appendChild(this.flagElement);
            this.element.appendChild(this.statusElement);
            this.element.appendChild(this.detailsElement);
            
            this.element.addEventListener('click', () => this.toggleDetails());
            document.body.appendChild(this.element);
            this.hide();
        }
        
        createDot() {
            this.createStyles();
            this.element = document.createElement('div');
            this.element.className = 'proxy-detector-dot';
            document.body.appendChild(this.element);
            this.hide();
        }
        
        show(flag, status, details = {}) {
            const mode = CONFIG.displayMode;
            
            if (mode === 'menu') return;
            
            if (mode === 'dot') {
                if (!this.element || !this.element.classList.contains('proxy-detector-dot')) {
                    this.removeElement();
                    this.createDot();
                }
                const color = details.matchType === 'direct' ? '#4caf50' : details.matchType === 'proxy' ? '#f44336' : '#ff9800';
                this.element.style.backgroundColor = color;
                this.element.title = `${flag} ${details.domain || ''} - ${status}`;
                this.element.style.display = 'block';
                return;
            }
            
            // banner mode
            if (!this.element || !this.element.classList.contains('proxy-detector-prompt')) {
                this.removeElement();
                this.createBanner();
            }
            
            this.flagElement.textContent = flag;
            this.statusElement.textContent = status;
            this.statusElement.style.color = details.matchType === 'direct' ? '#4caf50' : details.matchType === 'proxy' ? '#ff6b6b' : '#ff9800';
            
            if (details.domain) {
                const detailsText = [];
                detailsText.push(`域名: ${details.domain}`);
                detailsText.push(`检测方式: ${details.method || '规则匹配'}`);
                if (details.updateTime) {
                    detailsText.push(`规则更新: ${details.updateTime}`);
                }
                this.detailsElement.textContent = detailsText.join('\n');
            }
            
            this.element.style.display = 'block';
        }
        
        hide() {
            if (this.element) {
                this.element.style.display = 'none';
            }
        }
        
        removeElement() {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
        
        toggleDetails() {
            if (!this.detailsElement) return;
            this.isExpanded = !this.isExpanded;
            if (this.isExpanded) {
                this.detailsElement.classList.add('visible');
            } else {
                this.detailsElement.classList.remove('visible');
            }
        }
    }
    
    // 主入口函数
    async function init() {
        try {
            console.log('[Proxy Detector] 初始化中...');
            
            // 初始化全局模块实例（如果尚未创建）
            if (!ruleManager) {
                ruleManager = new RuleManager();
            }
            if (!networkTester) {
                networkTester = new NetworkTester();
            }
            if (!flagIdentifier) {
                flagIdentifier = new FlagIdentifier();
            }
            if (!dnsDetector) {
                dnsDetector = new DnsDetector();
            }
            if (!uiPrompt) {
                uiPrompt = new UIPrompt();
            }
            
            // 加载规则
            await ruleManager.loadRules();
            
            // 获取当前域名
            const currentDomain = window.location.hostname;
            console.log(`[Proxy Detector] 当前域名: ${currentDomain}`);
            
            // 检测是否需要代理
            let matchType = 'unknown';
            let detectionMethod = '';
            
            if (ruleManager.isDirect(currentDomain)) {
                matchType = 'direct';
                detectionMethod = '直连规则';
                console.log('[Proxy Detector] 直连网站');
            } else if (ruleManager.needsProxy(currentDomain)) {
                matchType = 'proxy';
                detectionMethod = '代理规则';
                console.log('[Proxy Detector] 需要代理（规则匹配）');
            } else {
                // 未收录 → DNS对比检测
                detectionMethod = 'DNS检测中...';
                matchType = 'unknown';
                
                // 先显示橙色"检测中"
                const flag = flagIdentifier.getFlagFromDomain(currentDomain);
                uiPrompt.show(flag, '检测中...', {
                    domain: currentDomain,
                    method: detectionMethod,
                    matchType: 'unknown',
                    updateTime: new Date(ruleManager.lastUpdate).toLocaleString()
                });
                
                try {
                    const dnsResult = await dnsDetector.detect(currentDomain);
                    matchType = dnsResult.verdict;
                    detectionMethod = `DNS检测: ${dnsResult.reason}`;
                    console.log(`[Proxy Detector] DNS检测结果: ${dnsResult.verdict} (${dnsResult.reason})`);
                } catch (e) {
                    matchType = 'unknown';
                    detectionMethod = 'DNS检测失败';
                    console.warn('[Proxy Detector] DNS检测异常:', e.message);
                }
            }
            
            const flag = flagIdentifier.getFlagFromDomain(currentDomain);
            const statusMap = { direct: '可直接访问', proxy: '需要代理', unknown: '未确认' };
            
            uiPrompt.show(flag, statusMap[matchType], {
                domain: currentDomain,
                method: detectionMethod,
                matchType: matchType,
                updateTime: new Date(ruleManager.lastUpdate).toLocaleString()
            });
        } catch (error) {
            console.error('[Proxy Detector] 初始化失败:', error);
        }
    }
    
    // 播放页面自动隐藏
    function setupVideoAutoHide() {
        let hideTimeout = null;
        
        function checkVideo() {
            if (!uiPrompt || !uiPrompt.element) return;
            
            // 检查是否有全屏元素
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                uiPrompt.hide();
                return;
            }
            
            // 检查是否有正在播放的视频
            const videos = document.querySelectorAll('video');
            for (const video of videos) {
                if (!video.paused && !video.ended && video.readyState > 2) {
                    uiPrompt.hide();
                    return;
                }
            }
            
            // 恢复显示
            if (uiPrompt.element && uiPrompt.element.style.display === 'none' && !uiPrompt._userHidden) {
                uiPrompt.element.style.display = 'block';
            }
        }
        
        // 监听视频播放事件
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO') {
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(checkVideo, 300);
            }
        }, true);
        
        document.addEventListener('pause', (e) => {
            if (e.target.tagName === 'VIDEO') {
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(checkVideo, 500);
            }
        }, true);
        
        // 监听全屏变化
        document.addEventListener('fullscreenchange', () => {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(checkVideo, 300);
        });
        document.addEventListener('webkitfullscreenchange', () => {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(checkVideo, 300);
        });
    }
    
    // === 菜单命令 ===
    
    // 工具函数：轻量提示
    function tip(msg, duration = 3000) {
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText = 'position:fixed;bottom:50px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font:14px/1.4 system-ui;z-index:999999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:opacity 0.5s';
        document.body.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, duration);
    }
    
    // 同步快速检测（规则缓存 + DNS缓存）
    function quickCheck(domain) {
        // 先查规则缓存
        try {
            const proxyRules = new Set(GM_getValue('proxyRules', []));
            const directRules = new Set(GM_getValue('directRules', []));
            if (directRules.has(domain)) return { icon: '🟢', text: '直连' };
            if (proxyRules.has(domain)) return { icon: '🔴', text: '需要代理' };
            const parts = domain.split('.');
            for (let i = 1; i < parts.length; i++) {
                const p = parts.slice(i).join('.');
                if (directRules.has(p)) return { icon: '🟢', text: '直连' };
                if (proxyRules.has(p)) return { icon: '🔴', text: '需要代理' };
            }
        } catch(e) {}
        // 再查DNS检测缓存
        try {
            const dnsCache = GM_getValue(`dns_${domain}`);
            if (dnsCache && dnsCache.verdict && dnsCache.time) {
                const ttl = 24 * 60 * 60 * 1000;
                if (Date.now() - dnsCache.time < ttl) {
                    if (dnsCache.verdict === 'direct') return { icon: '🟢', text: '可直连(DNS)' };
                    if (dnsCache.verdict === 'proxy') return { icon: '🔴', text: '需要代理(DNS)' };
                }
            }
        } catch(e) {}
        return { icon: '🟠', text: '未收录' };
    }
    
    const currentDomain = window.location.hostname;
    const status = quickCheck(currentDomain);
    
    // ① 状态行（保留颜色）
    GM_registerMenuCommand(`${status.icon} ${status.text} | ${currentDomain}`, () => {});
    
    // ② 测试入口
    GM_registerMenuCommand('① 测试 (itdog)', () => {
        window.open(`https://www.itdog.cn/ping/${currentDomain}`, '_blank');
    });
    
    GM_registerMenuCommand('② 测试 (check-host)', () => {
        window.open(`https://check-host.net/http-host/${currentDomain}`, '_blank');
    });
    
    // ③ DNS检测
    GM_registerMenuCommand('③ DNS检测', async () => {
        if (!dnsDetector) dnsDetector = new DnsDetector();
        tip('DNS检测中...');
        const result = await dnsDetector.detect(currentDomain);
        const icon = { proxy: '🔴', direct: '🟢', unknown: '🟠' }[result.verdict];
        const label = { proxy: '需要代理', direct: '可直连', unknown: '无法判断' }[result.verdict];
        dnsDetector.clearCache(currentDomain);
        init();
        alert(`${icon} ${currentDomain}\n${label}\n${result.reason}\n\nGoogle: ${(result.googleIps||[]).join(', ')||'-'}\n阿里: ${(result.aliIps||[]).join(', ')||'-'}`);
    });
    
    // ④ 刷新规则
    GM_registerMenuCommand('↻ 刷新规则', async () => {
        if (!ruleManager) ruleManager = new RuleManager();
        GM_setValue('lastRuleUpdate', 0);
        tip('规则下载中...');
        await ruleManager.loadRules();
        tip(`已更新: ${ruleManager.proxyRules.size} 代理 / ${ruleManager.directRules.size} 直连`);
        await init();
    });
    
    // ⑤ 显示模式选项（3个独立命令，当前选中带✓）
    const modeLabels = { dot: '小圆点', banner: '页面横幅', menu: '仅菜单' };
    const modes = ['dot', 'banner', 'menu'];
    
    for (const m of modes) {
        const mark = CONFIG.displayMode === m ? ' ✓' : '';
        GM_registerMenuCommand(`${m === CONFIG.displayMode ? '●' : '○'} ${modeLabels[m]}${mark}`, () => {
            if (CONFIG.displayMode === m) return;
            CONFIG.displayMode = m;
            GM_setValue('displayMode', m);
            uiPrompt.removeElement();
            if (m !== 'menu') init();
            tip(`显示模式 → ${modeLabels[m]}`);
        });
    }
    
    // ⑥ 启用/禁用（保留颜色）
    GM_registerMenuCommand(CONFIG.enabled ? '✅ 已启用' : '⬜ 已禁用', () => {
        CONFIG.enabled = !CONFIG.enabled;
        GM_setValue('configEnabled', CONFIG.enabled);
        if (CONFIG.enabled) { init(); tip('已启用'); } else { uiPrompt.hide(); tip('已禁用'); }
    });
    
    // URL变化监听（使用防抖包装）
    const debouncedInit = debounce(() => {
        console.log('[Proxy Detector] 检测到URL变化，重新初始化...');
        init();
    }, 500);
    
    // 监听URL变化（包括pushState和replaceState）
    let lastUrl = window.location.href;
    
    function watchUrlChanges() {
        // 监听popstate事件（浏览器前进后退）
        window.addEventListener('popstate', debouncedInit);
        
        // 监听hashchange事件
        window.addEventListener('hashchange', debouncedInit);
        
        // 重写pushState和replaceState以捕获SPA路由变化
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            checkUrlChange();
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            checkUrlChange();
        };
    }
    
    function checkUrlChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            lastHostname = window.location.hostname;
            debouncedInit();
        }
    }
    
    // 启动脚本
    if (CONFIG.enabled) {
        init();
        watchUrlChanges();
        setupVideoAutoHide();
    }
})();
