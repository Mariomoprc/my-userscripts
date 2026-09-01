// ==UserScript==
// @name         OpenCode All-in-One 增强
// @namespace    http://tampermonkey.net/
// @version      1.8.5
// @description  OpenCode 全站增强：Go 模型额度面板 + 模型选择器额度+国家+评分+隐私显示 + Tab 切换代理 + 粘贴图片(静默) + 选项键盘导航 + 拖拽网页/链接到输入框(防遮挡无黑屏) + 后端掉线提示 | v1.8.5
// @author       pass
// @match        https://opencode.ai/*
// @include      /^https?:\/\/localhost:4096/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM.xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

// 版本历史：
// v1.8.5 修复拖拽文字黑屏（精确定位浮层+栈式还原）
// v1.8.4 拖拽文字遮挡修复（types快判+虚线框隐藏）
// v1.8.3 拖拽网页/链接恢复 + 额度显示加国家 + 粘贴图片去成功提示 + 仅保留 localhost:4096
// v1.8.2 Zen 免费模型补训练标记 + URL 拖放遮挡拦截
// v1.8.1 模型选择器+面板显示请求数据训练标记（Muse Spark 1.2 Contributor）
// v1.8.0 模型选择器+面板显示 AA 智能指数评分
// v1.7.9 自定义输入框数字键被拦截跳选项修复
// v1.7.8 Go 模型额度面板 + 模型选择器额度显示
// v1.7.7 Tab 键切换代理 + 粘贴图片 + 选项键盘导航

(function () {
  'use strict';

  var TAG = '[OC All-in-One]';
  var SET_PREFIX = 'ocall_';
  var PANEL_KEY = 'go_panel_visible';

  function S(k, v) {
    if (v === undefined) return localStorage.getItem(SET_PREFIX + k);
    localStorage.setItem(SET_PREFIX + k, v);
  }
  function getSetting(k, def) {
    var v = S(k);
    return v === null ? def : v === '1';
  }
  function setSetting(k, on) {
    S(k, on ? '1' : '0');
  }

  var SETTINGS = [
    { key: 'goPanel', label: 'Go 额度面板', def: true },
    { key: 'tabCycle', label: 'Tab 键切换代理', def: true },
    { key: 'pasteImg', label: '粘贴图片', def: true },
    { key: 'dragDrop', label: '拖拽链接/文字', def: true },
    { key: 'questionKeys', label: '选项键盘导航', def: true }
  ];

  function toast(text, color) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:rgba(0,0,0,.92);color:' + (color || '#0f0') + ';padding:10px 14px;border-radius:8px;font-size:12px;font-family:monospace;max-width:360px;line-height:1.5;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 3500);
  }

  SETTINGS.forEach(function (s) {
    GM_registerMenuCommand((getSetting(s.key, s.def) ? '✓ ' : '✗ ') + s.label, function () {
      var next = !getSetting(s.key, s.def);
      setSetting(s.key, next);
      toast((next ? '✓ 已开启' : '✗ 已关闭') + '：' + s.label, next ? '#2ea043' : '#f85149');
    });
  });

  var host = location.hostname;
  var port = location.port;
  var isOpencodeAi = host === 'opencode.ai';
  var isLocalWeb = /^(localhost|127\.0\.0\.1|192\.168\.|(\d+\.){3}\d+)/.test(host);
  var isLocalhost4096 = host === 'localhost' && port === '4096';

  if (isLocalWeb && typeof crypto !== 'undefined' && !crypto.subtle) {
    try {
      Object.defineProperty(crypto, 'subtle', {
        configurable: true,
        value: {
          digest: async function (algo, data) {
            var ab = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
            var bytes = new Uint8Array(ab);
            var h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x811c9dc5, h4 = 0x01000193;
            for (var i = 0; i < bytes.length; i++) {
              var b = bytes[i];
              h1 = Math.imul(h1 ^ b, 0x01000193) >>> 0;
              h2 = Math.imul(h2 ^ b, 0x01000193) >>> 0;
              h3 = Math.imul(h3 ^ b, 0x01000193) >>> 0;
              h4 = Math.imul(h4 ^ b, 0x01000193) >>> 0;
            }
            var out = new Uint8Array(32);
            var dv = new DataView(out.buffer);
            dv.setUint32(0, h1, true);
            dv.setUint32(4, h2, true);
            dv.setUint32(8, h3, true);
            dv.setUint32(12, h4, true);
            dv.setUint32(16, h1 ^ 0x9e3779b9, true);
            dv.setUint32(20, h2 ^ 0x85ebca6b, true);
            dv.setUint32(24, bytes.length, true);
            dv.setUint32(28, (h1 ^ bytes.length) >>> 0, true);
            return out;
          }
        }
      });
    } catch (err) {}
  }

  var GO_MODULE = (function () {
    var DOCS_URL = 'https://opencode.ai/docs/go/';
    var MODELS_API = 'https://opencode.ai/zen/go/v1/models';
    var ZEN_API = 'https://opencode.ai/zen/v1/models';
    var OPENROUTER_API = 'https://openrouter.ai/api/v1/models';
    var OR_CACHE_KEY = 'go_or_cache';
    var OR_CACHE_TTL = 6 * 60 * 60 * 1000;

    var OR_ID_MAP = {
      'grok-4.6': 'x-ai/grok-4.6',
      'gpt-5.6-luna': 'openai/gpt-5.6-luna',
      'glm-5.3-flash': 'z-ai/glm-5.3-flash',
      'glm-5.3': 'z-ai/glm-5.3',
      'glm-5.2': 'z-ai/glm-5.2',
      'glm-5.1': 'z-ai/glm-5.1',
      'kimi-k3': 'moonshotai/kimi-k3',
      'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
      'kimi-k2.6': 'moonshotai/kimi-k2.6',
      'longcat-2.0': 'meituan/longcat-2.0',
      'mimo-v2.5': 'xiaomi/mimo-v2.5',
      'mimo-v2.5-pro': 'xiaomi/mimo-v2.5-pro',
      'minimax-m3': 'minimax/minimax-m3',
      'minimax-m2.7': 'minimax/minimax-m2.7',
      'muse-spark-1.2-contributor': 'meta/muse-spark-1.2-contributor',
      'qwen3.8-max': 'qwen/qwen3.8-max',
      'qwen3.8-flash': 'qwen/qwen3.8-flash',
      'qwen3.7-max': 'qwen/qwen3.7-max',
      'qwen3.7-plus': 'qwen/qwen3.7-plus',
      'qwen3.6-plus': 'qwen/qwen3.6-plus',
      'deepseek-v4-pro': 'deepseek/deepseek-v4-pro-0813',
      'deepseek-v4-flash': 'deepseek/deepseek-v4-flash-0731',
      'deepseek-v4-flash-vision-exp': 'deepseek/deepseek-v4-flash-vision-exp',
      'hy3': 'tencent/hy3'
    };

    var MODEL_META = {
      'grok-4.6':                { context: 500000, modalities: ['text'],                reasoning: true,  country: '美国', cap: 9, aaScore: 60.9, speed: 57.8 },
      'gpt-5.6-luna':            { context: 1050000, modalities: ['text'],               reasoning: false, country: '美国', cap: 10, aaScore: 52.3, speed: 125.6 },
      'glm-5.3-flash':           { context: 1000000, modalities: ['text', 'image'],      reasoning: false, country: '中国', cap: 5, aaScore: 57.5, speed: 49.4 },
      'glm-5.3':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7, aaScore: 59.5, speed: 66.5 },
      'glm-5.2':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 6, aaScore: 52.6, speed: 69.2 },
      'glm-5.1':                 { context: 202000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5, aaScore: 41.0, speed: 60.7 },
      'kimi-k3':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 8, aaScore: 59.7, speed: 35.9 },
      'kimi-k2.7-code':          { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 43.0, speed: 46.6 },
      'kimi-k2.6':               { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5, aaScore: 45.1, speed: 37.9 },
      'longcat-2.0':             { context: 1000000, modalities: ['text'],               reasoning: false, country: '中国', cap: 4, aaScore: 34.0, speed: 42.1 },
      'mimo-v2.5':               { context: 1000000, modalities: ['text', 'image', 'audio', 'video'], reasoning: true, country: '中国', cap: 7, aaScore: 38.0, speed: 69.4 },
      'mimo-v2.5-pro':           { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 42.9, speed: 36.3 },
      'minimax-m3':              { context: 1000000, modalities: ['text', 'image'],      reasoning: false, country: '中国', cap: 6, aaScore: 45.4, speed: 113.9 },
      'minimax-m2.7':            { context: 205000, modalities: ['text', 'image'],       reasoning: false, country: '中国', cap: 5, aaScore: 38.9, speed: 60.9 },
      'muse-spark-1.2-contributor': { context: 1000000, modalities: ['text', 'image'],   reasoning: false, country: '美国', cap: 4, aaScore: 56.8, speed: 211.7, trainedOnUserData: true },
      'qwen3.8-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 8, aaScore: 58.1, speed: 22.8 },
      'qwen3.8-flash':           { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 6, aaScore: 55.8, speed: 74.0 },
      'qwen3.7-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7, aaScore: 46.7, speed: 205.2 },
      'qwen3.7-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 39.4, speed: 55.9 },
      'qwen3.6-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 40.5, speed: 56.6 },
      'deepseek-v4-pro':         { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 9, aaScore: 53.2, speed: 66.3 },
      'deepseek-v4-flash':       { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7, aaScore: 51.8, speed: 121.8 },
      'deepseek-v4-flash-vision-exp': { context: 1000000, modalities: ['text', 'image'], reasoning: true,  country: '中国', cap: 7, aaScore: 52.0, speed: 119.3 },
      'hy3':                     { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5, aaScore: 42.2, speed: 67.4 }
    };

    var ZEN_FREE_META = {
      'muse-spark-1.2-contributor-free': { context: 1048576, modalities: ['text', 'image', 'video', 'pdf', 'audio'], reasoning: true, suggest: '多模态', score: 57, country: '美国', speed: 211.7, trainedOnUserData: true },
      'nemotron-3-ultra-free': { context: 1000000, modalities: ['text'], reasoning: true, suggest: '长上下文', score: 48, country: '美国', speed: 157.3 },
      'hy3-free': { context: 190000, modalities: ['text'], reasoning: true, suggest: '通用', score: 42, country: '中国', speed: 67.4 },
      'mimo-v2.5-free': { context: 200000, modalities: ['text', 'image', 'audio', 'video'], reasoning: true, suggest: '多模态', score: 38, country: '中国', speed: 69.4, trainedOnUserData: true },
      'ling-3.0-flash-fin-free': { context: 262144, modalities: ['text'], reasoning: true, suggest: '金融', score: 38, country: '中国', speed: 0 },
      'nemotron-3.5-lightning-free': { context: 262144, modalities: ['text'], reasoning: true, suggest: '通用', score: 24, country: '美国', speed: 299.7 },
      'big-pickle': { context: 200000, modalities: ['text'], reasoning: true, suggest: '通用', score: 35, country: '中国', speed: 0 }
    };
    var ZEN_DEPRECATED = { 'deepseek-v4-flash-free': true, 'laguna-s-2.1-free': true };

    var SNAPSHOT = {
      requests: [
        ["Grok 4.6","169","423","845"],["GPT 5.6 Luna","2,050","5,100","10,250"],["GLM-5.3-Flash","1,580","3,950","7,900"],["GLM-5.3","220","540","1,080"],["GLM-5.2","880","2,150","4,300"],["GLM-5.1","880","2,150","4,300"],["Kimi K3","110","250","490"],["Kimi K2.7 Code","1,350","3,380","6,750"],["Kimi K2.6","1,150","2,880","5,750"],["LongCat-2.0","11,400","28,600","57,200"],["MiMo-V2.5","30,100","75,200","150,400"],["MiMo-V2.5-Pro","3,250","8,150","16,300"],["MiniMax M3","3,200","8,000","16,000"],["MiniMax M2.7","3,400","8,500","17,000"],["Muse Spark 1.2 Contributor","45,300","113,300","226,600"],["Qwen3.8 Max","160","400","810"],["Qwen3.8 Flash","5,400","13,500","27,000"],["Qwen3.7 Max","340","840","1,690"],["Qwen3.7 Plus","4,300","10,800","21,600"],["Qwen3.6 Plus","3,300","8,200","16,300"],["DeepSeek V4 Pro","1,050","2,600","5,200"],["DeepSeek V4 Flash","7,600","18,900","37,800"],["DeepSeek V4 Flash Vision Exp","3,800","9,450","18,900"],["Hy3","4,300","10,750","21,500"]
      ],
      prices: [
        ["Grok 4.6","$2.00","$6.00","$0.50","-","$15"],["GPT 5.6 Luna","$0.20","$1.20","$0.02","$0.25","$15"],["GLM-5.3-Flash","$0.15","$0.50","$0.03","-","$15"],["GLM-5.3","$1.40","$4.40","$0.26","-","$15"],["GLM-5.2","$1.40","$4.40","$0.26","-","$60"],["GLM-5.1","$1.40","$4.40","$0.26","-","$60"],["Kimi K3","$3.00","$15.00","$0.30","-","$15"],["Kimi K2.7 Code","$0.95","$4.00","$0.19","-","$60"],["Kimi K2.6","$0.95","$4.00","$0.16","-","$60"],["LongCat-2.0","$0.30","$1.20","$0.006","-","$60"],["MiMo V2.5","$0.14","$0.28","$0.0028","-","$60"],["MiMo V2.5 Pro","$0.435","$0.87","$0.003625","-","$15"],["MiniMax M3","$0.30","$1.20","$0.06","-","$60"],["MiniMax M2.7","$0.30","$1.20","$0.06","$0.375","$60"],["Muse Spark 1.2 Contributor","$0.10","$0.20","$0.002","-","$60"],["Qwen3.8 Max","$2.00","$6.00","$0.25","$2.50","$15"],["Qwen3.8 Flash","$0.15","$0.47","$0.016","$0.20","$30"],["Qwen3.7 Max","$2.50","$7.50","$0.50","$3.125","$60"],["Qwen3.7 Plus","$0.40","$1.60","$0.04","$0.50","$60"],["Qwen3.6 Plus","$0.50","$3.00","$0.05","$0.625","$60"],["DeepSeek V4 Pro (Off-Peak)","$0.66","$1.98","$0.022","-","$15"],["DeepSeek V4 Flash (Off-Peak)","$0.22","$0.66","$0.007","-","$30"],["DeepSeek V4 Flash Vision Exp (Off-Peak)","$0.22","$0.66","$0.007","-","$15"],["Hy3","$0.14","$0.58","$0.035","-","$60"]
      ],
      endpoints: [
        ["Grok 4.6","grok-4.6"],["GPT 5.6 Luna","gpt-5.6-luna"],["GLM-5.3-Flash","glm-5.3-flash"],["GLM-5.3","glm-5.3"],["GLM-5.2","glm-5.2"],["GLM-5.1","glm-5.1"],["Kimi K3","kimi-k3"],["Kimi K2.7 Code","kimi-k2.7-code"],["Kimi K2.6","kimi-k2.6"],["LongCat-2.0","longcat-2.0"],["DeepSeek V4 Pro","deepseek-v4-pro"],["DeepSeek V4 Flash","deepseek-v4-flash"],["DeepSeek V4 Flash Vision Exp","deepseek-v4-flash-vision-exp"],["MiMo-V2.5","mimo-v2.5"],["MiMo-V2.5-Pro","mimo-v2.5-pro"],["MiniMax M3","minimax-m3"],["MiniMax M2.7","minimax-m2.7"],["Muse Spark 1.2 Contributor","muse-spark-1.2-contributor"],["Qwen3.8 Max","qwen3.8-max"],["Qwen3.8 Flash","qwen3.8-flash"],["Qwen3.7 Max","qwen3.7-max"],["Qwen3.7 Plus","qwen3.7-plus"],["Qwen3.6 Plus","qwen3.6-plus"],["Hy3","hy3"]
      ]
    };

    function norm(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
    function parseNum(s) { if (!s || s === '-') return 0; return Number(s.replace(/[$,]/g, '')) || 0; }
    function formatContext(n) { if (!n) return '-'; if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M'; if (n >= 1000) return (n / 1000).toFixed(0) + 'K'; return String(n); }
    function modalitiesText(mods) { if (!mods || !mods.length) return '-'; var labels = { text: '文', image: '图', video: '视', audio: '音', pdf: 'PDF' }; return mods.map(function (m) { return labels[m] || m; }).join(' '); }
    function stars(score) { var s = Math.round(score / 20); return '\u2605'.repeat(s) + '\u2606'.repeat(5 - s); }

    function computeScore(model) { return (model.cap || 5) * 10; }

    function computeSuggest(model) {
      var cap = model.cap || 5;
      var contextBonus = model.context >= 1000000 ? 15 : (model.context >= 256000 ? 10 : (model.context >= 128000 ? 5 : 0));
      var planScore = cap * 10 * 0.5 + (model.reasoning ? 15 : 0) + contextBonus + (cap >= 8 ? 20 : (cap >= 6 ? 10 : 0));
      var reqBonus = model.req5h >= 10000 ? 15 : (model.req5h >= 5000 ? 10 : (model.req5h >= 1000 ? 5 : 0));
      var priceBonus = model.input > 0 && model.input <= 0.2 ? 15 : (model.input > 0 && model.input <= 0.5 ? 10 : (model.input > 0 && model.input <= 1 ? 5 : 0));
      var buildScore = cap * 10 * 0.6 + reqBonus + priceBonus;
      if (planScore >= 60 && buildScore >= 60) return '通用';
      if (planScore >= 60 && planScore > buildScore) return 'Plan';
      if (buildScore >= 60 && buildScore > planScore) return 'Build';
      return '-';
    }

    function fetchOpenRouterData() {
      try {
        var cached = GM_getValue(OR_CACHE_KEY);
        if (cached) {
          var obj = typeof cached === 'string' ? JSON.parse(cached) : cached;
          if (obj && obj.timestamp && (Date.now() - obj.timestamp) < OR_CACHE_TTL && obj.contextMap) {
            return Promise.resolve(obj);
          }
        }
      } catch (e) {}
      return fetch(OPENROUTER_API, { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (data) {
          if (!data || !data.data) return null;
          var contextMap = {}, scoreMap = {};
          data.data.forEach(function (m) {
            var id = m.id;
            var ctx = m.context_length;
            var aa = m.benchmarks && m.benchmarks.artificial_analysis ? m.benchmarks.artificial_analysis.intelligence_index : null;
            if (ctx) contextMap[id] = ctx;
            if (aa) scoreMap[id] = aa;
          });
          var result = { contextMap: contextMap, scoreMap: scoreMap, timestamp: Date.now() };
          try { GM_setValue(OR_CACHE_KEY, JSON.stringify(result)); } catch (e) {}
          return result;
        });
    }

    function lookupOpenRouter(orData, opencodeId) {
      if (!orData) return null;
      var orId = OR_ID_MAP[opencodeId];
      if (!orId) return null;
      var ctx = orData.contextMap[orId];
      var score = orData.scoreMap[orId];
      if (ctx === undefined && score === undefined) return null;
      return { context: ctx, score: score };
    }

    function parseTables(html) {
      var tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
      function rows(tableHtml) {
        var result = [];
        var trRe = /<tr>([\s\S]*?)<\/tr>/g;
        var m, first = true;
        while ((m = trRe.exec(tableHtml)) !== null) {
          if (first) { first = false; continue; }
          var cells = [];
          var tdRe = /<t[dh]>([\s\S]*?)<\/t[dh]>/g;
          var c;
          while ((c = tdRe.exec(m[1])) !== null) cells.push(c[1].replace(/<[^>]+>/g, '').trim());
          if (cells.length > 0) result.push(cells);
        }
        return result;
      }
      var requests = [], prices = [], endpoints = [];
      tables.forEach(function (t) {
        var header = (t.match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1];
        var ths = (header.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || []).map(function (h) { return h.replace(/<[^>]+>/g, '').trim().toLowerCase(); });
        var joined = ths.join('|');
        if (joined.indexOf('requests per 5') !== -1 || joined.indexOf('\u6BCF 5 \u5C0F\u65F6') !== -1 || joined.indexOf('\u8BF7\u6C42\u6570') !== -1) requests = rows(t);
        else if ((joined.indexOf('input') !== -1 && joined.indexOf('output') !== -1 && joined.indexOf('usage') !== -1) || (joined.indexOf('\u8F93\u5165') !== -1 && joined.indexOf('\u8F93\u51FA') !== -1 && joined.indexOf('\u4F7F\u7528\u989D\u5EA6') !== -1)) prices = rows(t);
        else if (joined.indexOf('model id') !== -1 || joined.indexOf('\u6A21\u578B id') !== -1 || joined.indexOf('\u7AEF\u70B9') !== -1) endpoints = rows(t);
      });
      return { requests: requests, prices: prices, endpoints: endpoints };
    }

    function mergeData(tables, apiModels, orData) {
      var map = {};
      tables.requests.forEach(function (r) {
        var name = r[0] || '';
        var n = norm(name);
        if (!n) return;
        map[n] = { name: name, modelId: '', req5h: parseNum(r[1]), reqWeek: parseNum(r[2]), reqMonth: parseNum(r[3]), input: 0, output: 0, usage: 0, context: 128000, modalities: ['text'], reasoning: false, country: '', cap: 5, score: 0, suggest: '' };
      });
      tables.prices.forEach(function (r) {
        var rawName = r[0] || '';
        var baseName = rawName.replace(/\s*[\(\uFF08].*$/, '').trim();
        var n = norm(baseName);
        var isUpperTier = rawName.indexOf('>') !== -1;
        if (!n || !map[n]) return;
        if (isUpperTier && map[n].input > 0) return;
        map[n].input = parseNum(r[1]);
        map[n].output = parseNum(r[2]);
        map[n].usage = parseNum(r[5]);
      });
      tables.endpoints.forEach(function (r) {
        var name = r[0] || '';
        var n = norm(name);
        if (!n || !map[n]) return;
        map[n].modelId = r[1] || '';
      });
      Object.keys(map).forEach(function (k) {
        var m = map[k];
        var meta = MODEL_META[m.modelId];
        if (meta) {
          m.modalities = meta.modalities;
          m.reasoning = meta.reasoning;
          m.country = meta.country || '';
          m.cap = meta.cap || 5;
          m.context = meta.context || 128000;
          m.aaScore = meta.aaScore || 0;
          m.speed = meta.speed || 0;
          m.trainedOnUserData = !!meta.trainedOnUserData;
        }
        var or = lookupOpenRouter(orData, m.modelId);
        if (or) {
          if (or.context) m.context = or.context;
          if (or.score) m.score = Math.round(or.score);
        }
        if (!m.score) {
          if (m.aaScore) m.score = Math.round(m.aaScore);
          else m.score = computeScore(m);
        }
        m.suggest = computeSuggest(m);
      });
      if (apiModels && apiModels.length) {
        var docsIds = {};
        Object.keys(map).forEach(function (k) { docsIds[map[k].modelId] = true; });
        apiModels.forEach(function (m) {
          if (m.id && !docsIds[m.id]) {
            var meta = MODEL_META[m.id] || {};
            var entry = { name: m.id, modelId: m.id, req5h: 0, reqWeek: 0, reqMonth: 0, input: 0, output: 0, usage: 0, context: meta.context || 128000, modalities: meta.modalities || ['text'], reasoning: meta.reasoning || false, country: meta.country || '', cap: meta.cap || 5, aaScore: meta.aaScore || 0, speed: meta.speed || 0, trainedOnUserData: !!meta.trainedOnUserData, score: 0, suggest: '', isNew: true };
            var or = lookupOpenRouter(orData, m.id);
            if (or) {
              if (or.context) entry.context = or.context;
              if (or.score) entry.score = Math.round(or.score);
            }
            if (!entry.score) {
              if (entry.aaScore) entry.score = Math.round(entry.aaScore);
              else entry.score = computeScore(entry);
            }
            entry.suggest = computeSuggest(entry);
            map[m.id] = entry;
          }
        });
      }
      var arr = Object.keys(map).map(function (k) { return map[k]; });
      arr.sort(function (a, b) { return b.reqMonth - a.reqMonth; });
      return arr;
    }

    function fetchZenFreeModels() {
      return fetch(ZEN_API, { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (data) {
          var ids = [];
          if (data && data.data) {
            data.data.forEach(function (m) {
              if (m.id && (m.id.indexOf('-free') !== -1 || m.id === 'big-pickle') && !ZEN_DEPRECATED[m.id]) {
                ids.push(m.id);
              }
            });
          }
          var list = ids.map(function (id) {
            var meta = ZEN_FREE_META[id] || { context: 128000, modalities: ['text'], reasoning: true, suggest: '通用', score: 30, country: '待确认', speed: 0 };
            return { id: id, context: meta.context, modalities: meta.modalities, reasoning: meta.reasoning, suggest: meta.suggest, score: meta.score, country: meta.country, speed: meta.speed, trainedOnUserData: !!meta.trainedOnUserData };
          });
          if (!list.length) {
            list = Object.keys(ZEN_FREE_META).map(function (id) {
              var meta = ZEN_FREE_META[id];
              return { id: id, context: meta.context, modalities: meta.modalities, reasoning: meta.reasoning, suggest: meta.suggest, score: meta.score, country: meta.country, speed: meta.speed, trainedOnUserData: !!meta.trainedOnUserData };
            });
          }
          list.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
          return list;
        });
    }

    function scoreColor(score) {
      if (score >= 80) return '#2ea043';
      if (score >= 60) return '#1f6feb';
      if (score >= 40) return '#d29922';
      return '#f85149';
    }

    function usageColor(usage) {
      if (usage >= 60) return '#2ea043';
      if (usage >= 30) return '#1f6feb';
      if (usage >= 15) return '#d29922';
      return '#f85149';
    }

    function suggestBadge(suggest) {
      if (suggest === 'Plan') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#fff;background:#555;">Plan</span>';
      if (suggest === 'Build') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#111;background:#ccc;">Build</span>';
      if (suggest === '通用') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#111;background:#eee;">通用</span>';
      return '<span style="color:#555;font-size:10px;">-</span>';
    }

    function renderPanel(data, zenFree) {
      var existing = document.getElementById('oc-go-panel');
      if (existing) existing.remove();
      var panel = document.createElement('div');
      panel.id = 'oc-go-panel';
      panel.style.cssText = 'margin:0;padding:16px;border:1px solid #333;border-radius:10px;background:#111;color:#e0e0e0;font-size:13px;font-family:system-ui,sans-serif;';
      var sorted = data.filter(function (d) { return d.req5h > 0 || d.isNew; });
      var totalModels = sorted.length;
      var topModel = sorted[0] || {};

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
      header.innerHTML =
        '<div><strong style="font-size:15px;color:#fff;">Go 模型额度 · 综合评分榜</strong><span style="margin-left:8px;font-size:11px;opacity:0.6;">' + totalModels + ' 个模型 · ' + new Date().toLocaleDateString('zh-CN') + ' 更新</span></div>' +
        '<div><button id="oc-go-refresh" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">刷新</button><button id="oc-go-toggle" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">折叠</button><button id="oc-go-close" title="关闭面板" style="padding:4px 10px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">✕</button></div>';
      panel.appendChild(header);

      var stats = document.createElement('div');
      stats.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;font-size:12px;flex-wrap:wrap;';
      var highScore = sorted.filter(function (d) { return d.score >= 80; }).length;
      var imgModels = sorted.filter(function (d) { return d.modalities && d.modalities.indexOf('image') !== -1; }).length;
      stats.innerHTML =
        '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">Top: ' + (topModel.name || '-') + ' <span style="color:' + scoreColor(topModel.score) + ';font-weight:600;">' + (topModel.score || 0) + '分</span></span>' +
        '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">≥80分: <span style="color:#2ea043;">' + highScore + '</span> 个</span>' +
        '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">识图: <span style="color:#1f6feb;">' + imgModels + '</span> 个</span>';
      panel.appendChild(stats);

      var controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;align-items:center;';
      controls.innerHTML =
        '<input id="oc-go-search" type="text" placeholder="搜索模型..." style="flex:1;max-width:180px;padding:5px 8px;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:12px;" />' +
        '<select id="oc-go-sort" style="padding:5px 8px;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:12px;"><option value="reqMonth">按月额度</option><option value="score">按综合评分</option><option value="req5h">按 5h 次数</option><option value="context">按上下文大小</option><option value="usage">按倍数</option></select>';
      panel.appendChild(controls);

      var tableWrap = document.createElement('div');
      tableWrap.id = 'oc-go-table-wrap';
      tableWrap.style.cssText = 'overflow-x:auto;max-height:50vh;overflow-y:auto;';
      panel.appendChild(tableWrap);

      function renderTable(items) {
        var t = document.createElement('table');
        t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
        t.innerHTML =
          '<thead><tr style="border-bottom:1px solid #333;text-align:left;position:sticky;top:0;background:#1a1a1a;">' +
          '<th style="padding:6px 6px;">模型</th><th style="padding:6px 6px;text-align:center;">模态</th><th style="padding:6px 6px;text-align:right;">上下文</th><th style="padding:6px 6px;text-align:right;">速度</th><th style="padding:6px 6px;text-align:right;">5h</th><th style="padding:6px 6px;text-align:right;">月额度</th><th style="padding:6px 6px;text-align:center;">倍数</th><th style="padding:6px 6px;text-align:center;">建议</th><th style="padding:6px 6px;text-align:center;">隐私</th><th style="padding:6px 6px;">操作</th>' +
          '</tr></thead>';
        var tbody = document.createElement('tbody');
        items.forEach(function (d, i) {
          var tr = document.createElement('tr');
          tr.style.cssText = 'border-bottom:1px solid #2a2a2a;' + (i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02);');
          var nameStyle = d.isNew ? 'color:#e0e0e0;font-weight:600;' : (d.score >= 80 ? 'font-weight:600;color:#fff;' : 'color:#bbb;');
          var idTip = d.modelId ? ' title="opencode-go/' + d.modelId + '"' : '';
          tr.innerHTML =
            '<td style="padding:6px 6px;' + nameStyle + '"' + idTip + '>' + d.name + (d.country ? ' <span style="font-size:10px;color:#777;">(' + d.country + ')</span>' : '') + ' <span style="color:' + scoreColor(d.score) + ';font-weight:600;font-size:11px;">' + d.score + '分</span> <span style="font-size:10px;color:' + scoreColor(d.score) + ';">' + stars(d.score) + '</span>' + (d.isNew ? ' <span style="font-size:10px;color:#f85149;">NEW</span>' : '') + '</td>' +
            '<td style="padding:6px 6px;text-align:center;font-size:11px;">' + modalitiesText(d.modalities) + (d.reasoning ? ' <span style="color:#aaa;">推理</span>' : '') + '</td>' +
            '<td style="padding:6px 6px;text-align:right;font-size:11px;">' + formatContext(d.context) + '</td>' +
            '<td style="padding:6px 6px;text-align:right;font-size:11px;">' + (d.speed ? d.speed.toFixed(0) + ' t/s' : '-') + '</td>' +
            '<td style="padding:6px 6px;text-align:right;">' + d.req5h.toLocaleString() + '</td>' +
            '<td style="padding:6px 6px;text-align:right;">' + d.reqMonth.toLocaleString() + '</td>' +
            '<td style="padding:6px 6px;text-align:center;"><span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;color:#fff;background:' + usageColor(d.usage) + ';">' + (d.usage ? d.usage + 'x' : '-') + '</span></td>' +
            '<td style="padding:6px 6px;text-align:center;">' + suggestBadge(d.suggest) + '</td>' +
            '<td style="padding:6px 6px;text-align:center;">' + (d.trainedOnUserData ? '<span style="color:#f85149;font-size:10px;font-weight:600;">⚠ 训练</span>' : '<span style="color:#555;font-size:10px;">-</span>') + '</td>' +
            '<td style="padding:6px 6px;"><button class="oc-go-copy" data-id="' + (d.modelId || '') + '" style="padding:2px 8px;cursor:pointer;border:1px solid #555;border-radius:3px;background:transparent;color:#aaa;font-size:11px;' + (d.modelId ? '' : 'opacity:0.3;cursor:default;') + '">复制</button></td>';
          tbody.appendChild(tr);
        });
        t.appendChild(tbody);
        tableWrap.innerHTML = '';
        tableWrap.appendChild(t);
      }
      renderTable(sorted);

      var zenSection = document.createElement('div');
      zenSection.style.cssText = 'margin-top:12px;padding:10px;border:1px solid #2ea043;border-radius:8px;background:rgba(46,160,67,.06);';
      var zenHeader = document.createElement('div');
      zenHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:pointer;';
      zenHeader.innerHTML = '<strong style="font-size:13px;color:#2ea043;">🆓 Zen 免费模型（额度耗尽时可用）· ' + (zenFree ? zenFree.length : 0) + ' 个</strong><span style="font-size:11px;color:#888;">点击折叠</span>';
      zenSection.appendChild(zenHeader);

      var zenBody = document.createElement('div');
      zenBody.id = 'oc-go-zen-body';
      if (zenFree && zenFree.length) {
        var zt = document.createElement('table');
        zt.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
        zt.innerHTML = '<thead><tr style="border-bottom:1px solid #2a2a2a;text-align:left;"><th style="padding:4px 6px;">评分</th><th style="padding:4px 6px;">模型</th><th style="padding:4px 6px;text-align:right;">上下文</th><th style="padding:4px 6px;text-align:right;">速度</th><th style="padding:4px 6px;text-align:center;">模态</th><th style="padding:4px 6px;text-align:center;">推理</th><th style="padding:4px 6px;text-align:center;">建议</th><th style="padding:4px 6px;text-align:center;">训练</th><th style="padding:4px 6px;">操作</th></tr></thead>';
        var ztb = document.createElement('tbody');
        zenFree.forEach(function (f) {
          var tr = document.createElement('tr');
          tr.style.cssText = 'border-bottom:1px solid #2a2a2a;';
          tr.innerHTML =
            '<td style="padding:4px 6px;"><span style="color:' + scoreColor(f.score) + ';font-weight:600;font-size:11px;">' + (f.score || '-') + '</span></td>' +
            '<td style="padding:4px 6px;color:#e0e0e0;">' + f.id + (f.country ? ' <span style="font-size:10px;color:#777;">(' + f.country + ')</span>' : '') + '</td>' +
            '<td style="padding:4px 6px;text-align:right;font-size:11px;">' + formatContext(f.context) + '</td>' +
            '<td style="padding:4px 6px;text-align:right;font-size:11px;">' + (f.speed ? f.speed.toFixed(0) + ' t/s' : '-') + '</td>' +
            '<td style="padding:4px 6px;text-align:center;font-size:11px;">' + modalitiesText(f.modalities) + '</td>' +
            '<td style="padding:4px 6px;text-align:center;">' + (f.reasoning ? '<span style="color:#2ea043;">✓</span>' : '-') + '</td>' +
            '<td style="padding:4px 6px;text-align:center;"><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#111;background:#eee;">' + f.suggest + '</span></td>' +
            '<td style="padding:4px 6px;text-align:center;">' + (f.trainedOnUserData ? '<span style="color:#f85149;font-size:10px;font-weight:600;">⚠ 训练</span>' : '<span style="color:#555;font-size:10px;">-</span>') + '</td>' +
            '<td style="padding:4px 6px;"><button class="oc-go-copy" data-id="' + f.id + '" style="padding:2px 8px;cursor:pointer;border:1px solid #555;border-radius:3px;background:transparent;color:#aaa;font-size:11px;">复制</button></td>';
          ztb.appendChild(tr);
        });
        zt.appendChild(ztb);
        zenBody.appendChild(zt);
      } else {
        zenBody.innerHTML = '<span style="font-size:11px;color:#888;">暂无免费模型</span>';
      }
      zenSection.appendChild(zenBody);
      panel.appendChild(zenSection);

      zenHeader.addEventListener('click', function () {
        var hidden = zenBody.style.display === 'none';
        zenBody.style.display = hidden ? '' : 'none';
      });

      var footer = document.createElement('div');
      footer.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid #333;font-size:11px;display:flex;justify-content:space-between;align-items:center;';
      footer.innerHTML =
        '<span style="opacity:0.5;">评分 = AA Intelligence Index · 速度 = AA Output Speed · 数据来自 <a href="' + DOCS_URL + '" target="_blank" style="color:#1f6feb;">docs/go</a> + <a href="https://openrouter.ai/models" target="_blank" style="color:#1f6feb;">OpenRouter</a></span>' +
        '<span style="opacity:0.5;">v1.6</span>';
      panel.appendChild(footer);

      var contentEls = [stats, controls, tableWrap, zenSection, footer];
      panel.querySelector('#oc-go-close').addEventListener('click', function () {
        panel.remove();
        var b = document.getElementById('oc-go-backdrop');
        if (b) b.remove();
        try { localStorage.setItem(PANEL_KEY, '0'); } catch (e) {}
        toast('面板已关闭', '#aaa');
      });
      panel.querySelector('#oc-go-toggle').addEventListener('click', function () {
        var hidden = tableWrap.style.display === 'none';
        contentEls.forEach(function (el) { el.style.display = hidden ? '' : 'none'; });
        this.textContent = hidden ? '折叠' : '展开';
      });
      panel.querySelector('#oc-go-refresh').addEventListener('click', function () { loadAndInject(true); });
      panel.querySelector('#oc-go-search').addEventListener('input', function () {
        var q = this.value.toLowerCase();
        var filtered = sorted.filter(function (d) { return d.name.toLowerCase().indexOf(q) !== -1 || (d.modelId && d.modelId.indexOf(q) !== -1); });
        renderTable(filtered);
        bindCopy();
      });
      panel.querySelector('#oc-go-sort').addEventListener('change', function () {
        var key = this.value;
        var arr = sorted.slice();
        arr.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });
        renderTable(arr);
        bindCopy();
      });
      function bindCopy() {
        panel.querySelectorAll('.oc-go-copy').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            if (!id) return;
            var text = 'opencode/' + id;
            if (navigator.clipboard) {
              navigator.clipboard.writeText(text).then(function () { toast('已复制: ' + text); });
            } else {
              var ta = document.createElement('textarea');
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
              toast('已复制: ' + text);
            }
          });
        });
      }
      bindCopy();
      return panel;
    }

    function injectToggleButton() {
      if (document.getElementById('oc-go-btn')) return;
      var btn = document.createElement('div');
      btn.id = 'oc-go-btn';
      btn.textContent = 'Go';
      btn.title = 'Go 模型额度综合评分榜';
      btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:#333;color:#fff;font-size:14px;font-weight:700;font-family:system-ui;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;transition:transform .15s,background .15s;';
      btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.1)'; btn.style.background = '#1f6feb'; });
      btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; btn.style.background = '#333'; });
      btn.addEventListener('click', function () {
        var panel = document.getElementById('oc-go-panel');
        var backdrop = document.getElementById('oc-go-backdrop');
        if (panel) {
          panel.remove();
          if (backdrop) backdrop.remove();
          try { localStorage.setItem(PANEL_KEY, '0'); } catch (e) {}
        } else {
          try { localStorage.setItem(PANEL_KEY, '1'); } catch (e) {}
          loadAndInject(false);
        }
      });
      document.body.appendChild(btn);
    }

    function injectPanel(data, zenFree, source) {
      var existing = document.getElementById('oc-go-panel');
      if (existing) existing.remove();
      var existingBackdrop = document.getElementById('oc-go-backdrop');
      if (existingBackdrop) existingBackdrop.remove();
      try {
        var panel = renderPanel(data, zenFree);
        var backdrop = document.createElement('div');
        backdrop.id = 'oc-go-backdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2147483646;';
        backdrop.addEventListener('click', function () {
          var p = document.getElementById('oc-go-panel');
          var b = document.getElementById('oc-go-backdrop');
          if (b) b.remove();
          if (p) p.remove();
          try { localStorage.setItem(PANEL_KEY, '0'); } catch (e) {}
        });
        panel.style.position = 'fixed';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.width = '720px';
        panel.style.maxWidth = 'calc(100vw - 32px)';
        panel.style.maxHeight = '85vh';
        panel.style.overflowY = 'auto';
        panel.style.zIndex = '2147483647';
        panel.style.boxShadow = '0 4px 24px rgba(0,0,0,.6)';
        document.body.appendChild(backdrop);
        document.body.appendChild(panel);
        console.log(TAG, 'Panel injected (' + source + ')');
        toast('✓ Go 额度面板已加载', '#2ea043');
      } catch (e) {
        console.error(TAG, 'Inject failed:', e);
        toast('✗ 面板注入失败: ' + (e.message || e), '#f85149');
      }
    }

    function loadAndInject(forceRefresh) {
      if (document.getElementById('oc-go-panel')) return;
      Promise.all([
        fetch(DOCS_URL, { credentials: 'omit' }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }),
        fetch(MODELS_API, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        fetchOpenRouterData(),
        fetchZenFreeModels()
      ]).then(function (results) {
        var html = results[0], apiData = results[1], orData = results[2], zenFree = results[3];
        if (html) {
          var tables = parseTables(html);
          if (tables.requests && tables.requests.length > 0) {
            var apiModels = (apiData && apiData.data) ? apiData.data : [];
            injectPanel(mergeData(tables, apiModels, orData), zenFree, 'live');
            return;
          }
        }
        injectPanel(mergeData(SNAPSHOT, [], orData), zenFree, 'snapshot');
      });
    }

    function init() {
      injectToggleButton();
      var wantVisible = false;
      try { wantVisible = localStorage.getItem(PANEL_KEY) === '1'; } catch (e) {}
      if (wantVisible) setTimeout(function () { loadAndInject(false); }, 500);
    }

    return { init: init, loadAndInject: loadAndInject, __parseTables: parseTables, __getSortedModels: function () { var sorted = SNAPSHOT.requests.map(function (r) { return { name: r[0], req5h: parseNum(r[1]), reqMonth: parseNum(r[3]), usage: parseNum(r[5]) }; }); sorted.sort(function (a, b) { return b.reqMonth - a.reqMonth; }); return sorted; }, __getScore: function (normId) { if (!normId) return null; var keys = Object.keys(MODEL_META); for (var i = 0; i < keys.length; i++) { if (norm(keys[i]) === normId) { var meta = MODEL_META[keys[i]]; var s = Math.round(meta.aaScore || meta.cap * 10); return { score: s, color: scoreColor(s) }; } } return null; }, __getPrivacy: function (normId) { if (!normId) return null; var keys = Object.keys(MODEL_META); for (var i = 0; i < keys.length; i++) { if (norm(keys[i]) === normId) { var meta = MODEL_META[keys[i]]; return { trainedOnUserData: !!meta.trainedOnUserData }; } } return null; }, __getCountry: function (normId) { if (!normId) return null; var keys = Object.keys(MODEL_META); for (var i = 0; i < keys.length; i++) { if (norm(keys[i]) === normId) { var meta = MODEL_META[keys[i]]; return meta.country || null; } } return null; }, __getMeta: function (normId) { if (!normId) return null; var keys = Object.keys(MODEL_META); for (var i = 0; i < keys.length; i++) { if (norm(keys[i]) === normId) return MODEL_META[keys[i]]; } return null; } };
  })();

  var TAB_MODULE = (function () {
    function init() {
      var lastCycleTime = 0;
      var cycleCooldown = 300;

      function findPromptInput() {
        return document.querySelector('[data-component="prompt-input"]') ||
               document.querySelector('[contenteditable="true"]') ||
               document.querySelector('textarea');
      }
      function isPopoverOpen() {
        return !!document.querySelector('[data-component="prompt-input-v2-popover"], [role="menu"]');
      }
      function triggerAgentCycle() {
        var now = Date.now();
        if (now - lastCycleTime < cycleCooldown) return;
        lastCycleTime = now;
        var input = findPromptInput();
        if (!input) return;
        var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        var modKey = isMac ? 'Meta' : 'Control';
        try {
          var event = new KeyboardEvent('keydown', { key: '.', code: 'Period', keyCode: 190, which: 190, bubbles: true, cancelable: true });
          Object.defineProperty(event, modKey.toLowerCase() + 'Key', { value: true, writable: false });
          Object.defineProperty(event, 'ctrlKey', { value: !isMac, writable: false });
          Object.defineProperty(event, 'metaKey', { value: isMac, writable: false });
          input.dispatchEvent(event);
        } catch (err) {}
      }
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var input = findPromptInput();
        if (!input) return;
        if (isPopoverOpen()) return;
        e.preventDefault();
        e.stopPropagation();
        triggerAgentCycle();
      }, true);
      console.log(TAG, 'Tab 键代理切换已启用');
    }
    return { init: init };
  })();

  var PASTE_MODULE = (function () {
    function extractImage(e) {
      var cd = e.clipboardData || window.clipboardData;
      if (!cd || !cd.items) return null;
      for (var i = 0; i < cd.items.length; i++) {
        if (cd.items[i].type.indexOf('image') !== -1) return cd.items[i].getAsFile();
      }
      return null;
    }
    function findInput() {
      return document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea') ||
             document.querySelector('input[type="text"]');
    }
    function waitForInput(waitMs, cb) {
      var el = findInput();
      if (el) { cb(el); return; }
      var done = false;
      var obs = new MutationObserver(function () {
        var el2 = findInput();
        if (el2) finish(el2);
      });
      function finish(result) {
        if (done) return;
        done = true;
        obs.disconnect();
        cb(result);
      }
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { finish(findInput()); }, waitMs);
    }
    function findComposer(input) {
      var el = input;
      for (var i = 0; i < 5 && el; i++) {
        var cls = el.className || '';
        if (typeof cls === 'string' && /prompt|composer|input|chat|message/i.test(cls)) return el;
        el = el.parentElement;
      }
      return input.parentElement || input;
    }
    function observeShadowRoots(root, obs, opts) {
      var hosts = root.querySelectorAll('*');
      for (var i = 0; i < hosts.length; i++) {
        if (hosts[i].shadowRoot) obs.observe(hosts[i].shadowRoot, opts);
      }
    }
    function makeDragEvent(type, dt) {
      try {
        return new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      } catch (err) {
        var ev = new DragEvent(type, { bubbles: true, cancelable: true });
        try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch (e) {}
        return ev;
      }
    }
    function tryNativeDrop(file) {
      var filename = 'paste-' + Date.now() + '.png';
      var payload, dt;
      try {
        payload = new File([file], filename, { type: file.type || 'image/png' });
        dt = new DataTransfer();
        dt.items.add(payload);
      } catch (err) {
        dropFailed('文件/DataTransfer 构造失败');
        return;
      }
      waitForInput(4000, function (target) {
        if (!target) { dropFailed('未找到输入框'); return; }
        document.dispatchEvent(makeDragEvent('dragover', dt));
        document.dispatchEvent(makeDragEvent('drop', dt));
        var settled = false;
        var obs = new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === 'childList') {
              for (var j = 0; j < m.addedNodes.length; j++) {
                var n = m.addedNodes[j];
                if (n.nodeType !== 1) continue;
                if (n === target || target.contains(n)) continue;
                settle(true);
                return;
              }
            }
          }
        });
        function settle(success) {
          if (settled) return;
          settled = true;
          obs.disconnect();
          if (success) { console.log(TAG, 'paste image attached'); }
          else dropFailed('前端未响应 drop。请手动拖拽图片或使用附件按钮');
        }
        var obsOpts = { childList: true, subtree: true, attributes: true, characterData: true };
        var composer = findComposer(target);
        obs.observe(composer, obsOpts);
        observeShadowRoots(composer, obs, obsOpts);
        setTimeout(function () { settle(false); }, 4000);
      });
    }
    function dropFailed(reason) {
      toast('✗ drop 未生效（' + reason + '）。请手动拖拽图片到输入框，或长按输入框左侧使用附件按钮', '#f55');
    }
    function init() {
      document.addEventListener('paste', function (e) {
        var file = extractImage(e);
        if (!file) return;
        e.preventDefault();
        e.stopPropagation();
        tryNativeDrop(file);
      }, true);
      console.log(TAG, '粘贴图片已启用');
    }
    return { init: init };
  })();

  var DRAG_MODULE = (function () {
    var _inited = false;
    function findInput() {
      return document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea') ||
             document.querySelector('input[type="text"]');
    }
    function extractText(e) {
      var dt = e.dataTransfer;
      if (!dt) return null;
      var text = dt.getData('text/uri-list');
      if (text) {
        var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l.indexOf('#') !== 0; });
        if (lines.length) text = lines[0];
        else text = '';
      }
      if (!text || text.indexOf('#') === 0) text = dt.getData('text/plain');
      if (!text) text = dt.getData('text');
      return text ? text.trim() : null;
    }
    function insertTextToInput(text) {
      var target = findInput();
      if (!target) { toast('✗ 未找到输入框', '#f55'); return; }
      var sel = window.getSelection();
      var range = null;
      if (sel && sel.rangeCount) range = sel.getRangeAt(0);
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        var start = target.selectionStart;
        var end = target.selectionEnd;
        var val = target.value;
        if (start == null || end == null) {
          target.value = val + (val && !val.endsWith('\n') ? '\n' : '') + text;
        } else {
          target.value = val.slice(0, start) + text + val.slice(end);
          target.selectionStart = target.selectionEnd = start + text.length;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.focus();
      } else if (target.isContentEditable) {
        target.focus();
        if (range && target.contains(range.startContainer)) {
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          var sep = target.textContent && !target.textContent.endsWith('\n') ? '\n' : '';
          target.appendChild(document.createTextNode(sep + text));
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        toast('✗ 不支持的输入框类型', '#f55');
        return;
      }
      toast('✓ 已插入 ' + text.length + ' 字符', '#2ea043');
    }
    function hasTextType(dt) {
      if (!dt || !dt.types) return false;
      for (var i = 0; i < dt.types.length; i++) {
        var t = dt.types[i];
        if (t === 'text/plain' || t === 'text/uri-list' || t === 'text/html' || t === 'text') return true;
      }
      return false;
    }
    function isTextOnlyDrag(e) {
      var dt = e.dataTransfer;
      if (!dt || dt.files.length > 0) return false;
      return !!extractText(e);
    }
    function isTextTypesDrag(e) {
      var dt = e.dataTransfer;
      if (!dt || dt.files.length > 0) return false;
      return hasTextType(dt);
    }
    var _hiddenOverlays = [];
    function findOverlayEl() {
      // 精确查找：含文案的文本节点 -> 上溯到虚线/fixed 容器
      try {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
          if (n.nodeValue && n.nodeValue.indexOf('拖放文件以添加附件') !== -1) {
            var el = n.parentElement;
            for (var i = 0; i < 6 && el; i++) {
              try {
                var cs = getComputedStyle(el);
                if (cs.borderStyle === 'dashed' || cs.position === 'fixed' || el.hasAttribute('data-drag-overlay')) return el;
              } catch (e2) {}
              el = el.parentElement;
            }
            return n.parentElement;
          }
        }
      } catch (e3) {}
      return null;
    }
    function hideOverlay() {
      var ov = findOverlayEl();
      if (!ov) return;
      // 仅隐藏该浮层本体，不动 body/#root
      if (ov.dataset.ocHidden) return;
      ov.dataset.ocHidden = '1';
      ov.style.display = 'none';
      _hiddenOverlays.push(ov);
    }
    function showOverlay() {
      while (_hiddenOverlays.length) {
        var el = _hiddenOverlays.pop();
        if (el && el.dataset.ocHidden) {
          delete el.dataset.ocHidden;
          el.style.display = '';
        }
      }
    }
    function onDragCheck(e) {
      // 输入框内拖选不拦截
      try { if (e.target && e.target.closest && e.target.closest('[contenteditable], textarea, input')) return; } catch (e2) {}
      if (!isTextTypesDrag(e)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {}
      hideOverlay();
    }
    function onDragLeave(e) {
      // 仅在真正离开视口时恢复，避免频繁闪烁
      if (e.relatedTarget) return;
      showOverlay();
    }
    function onDrop(e) {
      if (!isTextOnlyDrag(e) && !isTextTypesDrag(e)) { showOverlay(); return; }
      var text = extractText(e);
      if (!text) { showOverlay(); return; }
      e.stopImmediatePropagation();
      e.preventDefault();
      insertTextToInput(text);
      setTimeout(showOverlay, 200);
    }
    function init() {
      if (_inited) return;
      _inited = true;
      var _dragIsText = false;
      function updateFlag(e) { try { _dragIsText = isTextTypesDrag(e); } catch (e2) { _dragIsText = false; } }
      ['dragenter', 'dragover'].forEach(function (type) {
        document.addEventListener(type, function (e) { updateFlag(e); onDragCheck(e); }, true);
        window.addEventListener(type, function (e) { updateFlag(e); onDragCheck(e); }, true);
      });
      document.addEventListener('dragleave', function (e) { onDragLeave(e); if (!e.relatedTarget) _dragIsText = false; }, true);
      window.addEventListener('dragleave', function (e) { onDragLeave(e); if (!e.relatedTarget) _dragIsText = false; }, true);
      document.addEventListener('drop', function (e) { _dragIsText = false; onDrop(e); }, true);
      window.addEventListener('drop', function (e) { _dragIsText = false; onDrop(e); }, true);
      // 兜底：若 OC 在 dragover 后动态插入浮层，仅在文字拖拽时隐藏该浮层本体
      var mo = new MutationObserver(function (muts) {
        if (!_dragIsText) return;
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var nd = added[j];
            if (nd.nodeType === 1 && nd.textContent && nd.textContent.indexOf('拖放文件以添加附件') !== -1) {
              var ov = findOverlayEl();
              if (ov && !ov.dataset.ocHidden) { ov.dataset.ocHidden = '1'; ov.style.display = 'none'; _hiddenOverlays.push(ov); }
            }
          }
        }
      });
      try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
      console.log(TAG, '拖拽链接/文字已启用 (early capture, overlay suppressed)');
    }
    return { init: init };
  })();
  // Early DRAG registration for localhost:4096 to beat React hydration
  if (isLocalhost4096 && (getSetting('dragDrop', true) || getSetting('dragLinks', true))) {
    try { DRAG_MODULE.init(); } catch (e) {}
  }

  var QUESTION_MODULE = (function () {
    var ENTER_DEBOUNCE = 180;
    var lastEnter = 0;

    function findDock() {
      return document.querySelector('[data-component="session-question-dock"]');
    }
    function findOptions() {
      var dock = findDock();
      if (!dock) return [];
      return Array.prototype.slice.call(
        dock.querySelectorAll('[data-slot="question-options"] [data-slot="question-option"]')
      ).filter(function (el) { return el.getAttribute('data-custom') !== 'true'; });
    }
    function findSubmitBtn() {
      var dock = findDock();
      if (!dock) return null;
      return dock.querySelector('[aria-keyshortcuts*="Enter"]') ||
             dock.querySelector('[data-slot="question-footer-actions"] button:last-child');
    }
    function isVisible(el) {
      if (!el) return false;
      var s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
    }
    function isCustomInputFocused(target) {
      var el = (target && target.closest && target.closest('[data-slot="question-custom-input"],[data-custom="true"]')) ||
               (document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-slot="question-custom-input"],[data-custom="true"]'));
      return !!el;
    }
    function init() {
      document.addEventListener('keydown', function (e) {
        var dock = findDock();
        if (!dock || !isVisible(dock)) return;
        if (e.isComposing || e.keyCode === 229) return;
        var options = findOptions();
        if (!options.length) return;

        if (e.key >= '1' && e.key <= '9') {
          if (isCustomInputFocused(e.target)) return;
          var idx = parseInt(e.key, 10) - 1;
          if (idx < options.length) {
            e.preventDefault();
            e.stopPropagation();
            options[idx].click();
          }
          return;
        }

        if (e.key === 'Enter') {
          // Custom input: Shift+Enter newline, Enter submits if has text
          if (isCustomInputFocused(e.target)) {
            if (e.shiftKey || e.ctrlKey) return;
            // Find the textarea (may not be focused yet if user is on the button/form)
            var customTa = null;
            if (e.target && e.target.tagName === 'TEXTAREA') customTa = e.target;
            else if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') customTa = document.activeElement;
            else {
              // Focus is on the custom option button/form, not the textarea yet
              var taInDock = dock.querySelector('[data-slot="question-custom-input"]');
              if (taInDock) {
                e.preventDefault();
                e.stopPropagation();
                taInDock.focus();
                return;
              }
            }
            if (!customTa || !customTa.value.trim()) return;
            var sbCustom = findSubmitBtn();
            if (sbCustom) {
              e.preventDefault();
              e.stopPropagation();
              var nowC = Date.now();
              if (nowC - lastEnter < ENTER_DEBOUNCE) return;
              lastEnter = nowC;
              sbCustom.click();
            }
            return;
          }
          var active = document.activeElement;
          var inOptions = active && active.closest('[data-slot="question-options"]');
          var isMulti = inOptions && active.getAttribute('role') === 'checkbox';
          if (inOptions) {
            active.click();
            if (isMulti) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            var now = Date.now();
            if (now - lastEnter < 180) return;
            lastEnter = now;
            setTimeout(function () {
              var sb = findSubmitBtn();
              if (sb) sb.click();
            }, 30);
            return;
          }
          var picked = dock.querySelector('[data-slot="question-option"][data-picked="true"]');
          if (!picked) {
            if (options.length) options[0].focus();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          var submitBtn = findSubmitBtn();
          if (!submitBtn) return;
          var now2 = Date.now();
          if (now2 - lastEnter < 180) return;
          lastEnter = now2;
          e.preventDefault();
          e.stopPropagation();
          submitBtn.click();
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          var active = document.activeElement;
          var inOptions = active && active.closest('[data-slot="question-options"]');
          if (!inOptions) {
            e.preventDefault();
            e.stopPropagation();
            var targetIdx = e.key === 'ArrowDown' ? 0 : options.length - 1;
            options[targetIdx].focus();
          }
        }
      }, true);
      console.log(TAG, '选项键盘导航已启用');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  模型选择器旁额度显示模块 (local web only)
  // ════════════════════════════════════════════════════════════

  var MODEL_QUOTA = (function () {
    var quotaMap = {};

    // Local copies of functions (GO_MODULE's are not accessible)
    function norm(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
    function parseNum(s) { if (!s || s === '-') return 0; return Number(s.replace(/[$,]/g, '')) || 0; }

    function fetchQuotaMap() {
      return new Promise(function (resolve) {
        try {
          GM.xmlhttpRequest({
            method: 'GET',
            url: 'https://opencode.ai/docs/go/',
            onload: function (res) {
              if (res.status !== 200) { resolve(); return; }
              var html = res.responseText;
              var tables = GO_MODULE.__parseTables(html);
              if (!tables || !tables.requests) { resolve(); return; }
              tables.requests.forEach(function (r) {
                var name = (r[0] || '').trim();
                var n = norm(name);
                if (n) quotaMap[n] = { name: name, req5h: parseNum(r[1]), reqMonth: parseNum(r[3]), usage: parseNum(r[5]) };
              });
              console.log(TAG, 'Quota map loaded:', Object.keys(quotaMap).length, 'models');
              resolve();
            },
            onerror: function () { resolve(); }
          });
        } catch (e) {
          fetch('https://opencode.ai/docs/go/', { credentials: 'omit' })
            .then(function (r) { return r.ok ? r.text() : null; })
            .catch(function () { return null; })
            .then(function (html) {
              if (!html) { resolve(); return; }
              var tables = GO_MODULE.__parseTables(html);
              if (!tables || !tables.requests) { resolve(); return; }
              tables.requests.forEach(function (r) {
                var name = (r[0] || '').trim();
                var n = norm(name);
                if (n) quotaMap[n] = { name: name, req5h: parseNum(r[1]), reqMonth: parseNum(r[3]), usage: parseNum(r[5]) };
              });
              resolve();
            });
        }
      });
    }

    function injectQuotasIntoDropdown() {
      // Find dropdown with model options
      var items = document.querySelectorAll('[data-option-key]');
      if (!items.length) return;

      items.forEach(function (item) {
        if (item.querySelector('.oc-quota-tag')) return; // Already injected

        var key = item.getAttribute('data-option-key') || '';
        var modelId = key.split(':').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!modelId) return;

        // Look up quota by model ID
        var quota = quotaMap[modelId];
        if (!quota) {
          var keys = Object.keys(quotaMap);
          for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf(modelId) !== -1 || modelId.indexOf(keys[i]) !== -1) {
              quota = quotaMap[keys[i]];
              break;
            }
          }
        }
        if (!quota) return;

        var scoreInfo = GO_MODULE.__getScore(modelId);
        var privacyInfo = GO_MODULE.__getPrivacy(modelId);
        var country = GO_MODULE.__getCountry ? GO_MODULE.__getCountry(modelId) : null;
        var tag = document.createElement('span');
        tag.className = 'oc-quota-tag';
        tag.style.cssText = 'color:#666;font-size:10px;margin-left:6px;white-space:nowrap;flex-shrink:0;';
        tag.innerHTML = quota.reqMonth.toLocaleString() + '/月' + (country ? ' <span style="color:#888;">(' + country + ')</span>' : '') + (scoreInfo ? ' <span style="color:' + scoreInfo.color + ';font-weight:600;">' + scoreInfo.score + '分</span>' : '') + (privacyInfo && privacyInfo.trainedOnUserData ? ' <span style="color:#f85149;font-weight:600;">⚠ 训练</span>' : '');
        item.appendChild(tag);
      });
      console.log(TAG, 'Injected quotas into', items.length, 'dropdown items');
    }

    function init() {
      fetchQuotaMap().then(function () {
        // Also try injecting if dropdown already open
        injectQuotasIntoDropdown();
      });

      // Watch for dropdown opening
      var observer = new MutationObserver(function () {
        var dropdown = document.querySelector('[data-option-key]');
        if (dropdown) setTimeout(injectQuotasIntoDropdown, 100);
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      console.log(TAG, 'MODEL_QUOTA initialized (dropdown mode)');
    }

    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  后端连接监测 (仅 localhost:4096)
  // ════════════════════════════════════════════════════════════
  var CONNECTION_MODULE = (function () {
    var origTitle = '';
    var disconnected = false;
    var failCount = 0;
    var probeTimer = null;
    var origFetch = window.fetch;
    function setDisconnected(on) {
      if (on === disconnected) return;
      disconnected = on;
      if (on) {
        toast('✗ 后端已断开 (4096) - 等待重连…', '#f85149');
        try { document.title = '● 掉线 - ' + (origTitle || document.title); } catch (e) {}
      } else {
        toast('✓ 后端已重连', '#2ea043');
        try { document.title = origTitle || document.title.replace(/^● 掉线 - /, ''); } catch (e) {}
      }
    }
    function probe() {
      if (!isLocalhost4096) return;
      fetch(location.origin + '/', { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        if (r.ok || r.status < 500) { failCount = 0; setDisconnected(false); }
        else { failCount++; if (failCount >= 2) setDisconnected(true); }
      }).catch(function () { failCount++; if (failCount >= 2) setDisconnected(true); });
    }
    function wrapFetch() {
      if (!origFetch || window.__ocFetchWrapped) return;
      window.__ocFetchWrapped = true;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var isSelf = url.indexOf(location.origin) === 0 || url.indexOf('localhost:4096') !== -1;
        return origFetch.apply(this, arguments).then(function (r) {
          if (isSelf) { if (r.ok || r.status < 500) { failCount = 0; if (disconnected) setDisconnected(false); } }
          return r;
        }, function (err) {
          if (isSelf) { failCount++; if (failCount >= 2) setDisconnected(true); }
          throw err;
        });
      };
    }
    function init() {
      if (!isLocalhost4096) return;
      origTitle = document.title;
      wrapFetch();
      window.addEventListener('online', probe);
      window.addEventListener('offline', function () { setDisconnected(true); });
      probe();
      probeTimer = setInterval(probe, 5000);
      console.log(TAG, '后端连接监测已启用 (localhost:4096)');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  Main entry
  // ════════════════════════════════════════════════════════════

  function init() {
    if (isLocalhost4096 && (getSetting('dragDrop', true) || getSetting('dragLinks', true))) {
      try { DRAG_MODULE.init(); } catch (e) {}
    }
    if (isOpencodeAi && getSetting('goPanel', true)) {
      GO_MODULE.init();
    }
    if (isLocalhost4096) {
      if (getSetting('goPanel', true)) {
        MODEL_QUOTA.init();
      }
      if (getSetting('tabCycle', true)) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', TAB_MODULE.init);
        } else {
          TAB_MODULE.init();
        }
      }
      if (getSetting('pasteImg', true)) {
        PASTE_MODULE.init();
      }
      if (getSetting('questionKeys', true)) {
        QUESTION_MODULE.init();
      }
      CONNECTION_MODULE.init();
    } else if (isLocalWeb) {
      // Fallback for other local ports if script ever runs there (should not due to @include)
      if (getSetting('goPanel', true)) MODEL_QUOTA.init();
      if (getSetting('pasteImg', true)) PASTE_MODULE.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }

  if (isOpencodeAi) {
    var lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        if (getSetting('goPanel', true)) GO_MODULE.init();
      }
    }, 2000);
  }

  console.log(TAG, 'Ready');
})();