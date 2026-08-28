// ==UserScript==
// @name         OpenCode Go 额度增强面板
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  在 opencode.ai 全站注入 Go 模型额度性价比榜（评分/模态/上下文/建议），数据来自 docs/go
// @author       pass
// @match        https://opencode.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var TAG = '[Go Enhancer]';
  var PANEL_KEY = 'go_panel_visible';
  var DOCS_URL = 'https://opencode.ai/docs/go/';
  var MODELS_API = 'https://opencode.ai/zen/go/v1/models';

  console.log(TAG, 'v1.7 loaded, pathname:', location.pathname);

  var MODEL_META = {
    'grok-4.6':                { context: 500000, modalities: ['text'],                reasoning: true,  country: '美国', cap: 9 },
    'gpt-5.6-luna':            { context: 1050000, modalities: ['text'],               reasoning: false, country: '美国', cap: 10 },
    'glm-5.3-flash':           { context: 1000000, modalities: ['text', 'image'],      reasoning: false, country: '中国', cap: 5 },
    'glm-5.3':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7 },
    'glm-5.2':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 6 },
    'glm-5.1':                 { context: 202000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5 },
    'kimi-k3':                 { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 8 },
    'kimi-k2.7-code':          { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6 },
    'kimi-k2.6':               { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5 },
    'longcat-2.0':             { context: 1000000, modalities: ['text'],               reasoning: false, country: '中国', cap: 4 },
    'mimo-v2.5':               { context: 1000000, modalities: ['text', 'image', 'audio', 'video'], reasoning: true, country: '中国', cap: 7 },
    'mimo-v2.5-pro':           { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6 },
    'minimax-m3':              { context: 1000000, modalities: ['text', 'image'],      reasoning: false, country: '中国', cap: 6 },
    'minimax-m2.7':            { context: 205000, modalities: ['text', 'image'],       reasoning: false, country: '中国', cap: 5 },
    'muse-spark-1.2-contributor': { context: 1000000, modalities: ['text', 'image'],   reasoning: false, country: '美国', cap: 4 },
    'qwen3.8-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 8 },
    'qwen3.8-flash':           { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 6 },
    'qwen3.7-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7 },
    'qwen3.7-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6 },
    'qwen3.6-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6 },
    'deepseek-v4-pro':         { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 9 },
    'deepseek-v4-flash':       { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7 },
    'deepseek-v4-flash-vision-exp': { context: 1000000, modalities: ['text', 'image'], reasoning: true,  country: '中国', cap: 7 },
    'hy3':                     { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5 }
  };

  var SNAPSHOT = {
    requests: [
      ["Grok 4.6","169","423","845"],
      ["GPT 5.6 Luna","2,050","5,100","10,250"],
      ["GLM-5.3-Flash","1,580","3,950","7,900"],
      ["GLM-5.3","220","540","1,080"],
      ["GLM-5.2","880","2,150","4,300"],
      ["GLM-5.1","880","2,150","4,300"],
      ["Kimi K3","110","250","490"],
      ["Kimi K2.7 Code","1,350","3,380","6,750"],
      ["Kimi K2.6","1,150","2,880","5,750"],
      ["LongCat-2.0","11,400","28,600","57,200"],
      ["MiMo-V2.5","30,100","75,200","150,400"],
      ["MiMo-V2.5-Pro","3,250","8,150","16,300"],
      ["MiniMax M3","3,200","8,000","16,000"],
      ["MiniMax M2.7","3,400","8,500","17,000"],
      ["Muse Spark 1.2 Contributor","45,300","113,300","226,600"],
      ["Qwen3.8 Max","160","400","810"],
      ["Qwen3.8 Flash","5,400","13,500","27,000"],
      ["Qwen3.7 Max","340","840","1,690"],
      ["Qwen3.7 Plus","4,300","10,800","21,600"],
      ["Qwen3.6 Plus","3,300","8,200","16,300"],
      ["DeepSeek V4 Pro","1,050","2,600","5,200"],
      ["DeepSeek V4 Flash","7,600","18,900","37,800"],
      ["DeepSeek V4 Flash Vision Exp","3,800","9,450","18,900"],
      ["Hy3","4,300","10,750","21,500"]
    ],
    prices: [
      ["Grok 4.6","$2.00","$6.00","$0.50","-","$15"],
      ["GPT 5.6 Luna","$0.20","$1.20","$0.02","$0.25","$15"],
      ["GLM-5.3-Flash","$0.15","$0.50","$0.03","-","$15"],
      ["GLM-5.3","$1.40","$4.40","$0.26","-","$15"],
      ["GLM-5.2","$1.40","$4.40","$0.26","-","$60"],
      ["GLM-5.1","$1.40","$4.40","$0.26","-","$60"],
      ["Kimi K3","$3.00","$15.00","$0.30","-","$15"],
      ["Kimi K2.7 Code","$0.95","$4.00","$0.19","-","$60"],
      ["Kimi K2.6","$0.95","$4.00","$0.16","-","$60"],
      ["LongCat-2.0","$0.30","$1.20","$0.006","-","$60"],
      ["MiMo V2.5","$0.14","$0.28","$0.0028","-","$60"],
      ["MiMo V2.5 Pro","$0.435","$0.87","$0.003625","-","$15"],
      ["MiniMax M3","$0.30","$1.20","$0.06","-","$60"],
      ["MiniMax M2.7","$0.30","$1.20","$0.06","$0.375","$60"],
      ["Muse Spark 1.2 Contributor","$0.10","$0.20","$0.002","-","$60"],
      ["Qwen3.8 Max","$2.00","$6.00","$0.25","$2.50","$15"],
      ["Qwen3.8 Flash","$0.15","$0.47","$0.016","$0.20","$30"],
      ["Qwen3.7 Max","$2.50","$7.50","$0.50","$3.125","$60"],
      ["Qwen3.7 Plus","$0.40","$1.60","$0.04","$0.50","$60"],
      ["Qwen3.6 Plus","$0.50","$3.00","$0.05","$0.625","$60"],
      ["DeepSeek V4 Pro (Off-Peak)","$0.66","$1.98","$0.022","-","$15"],
      ["DeepSeek V4 Flash (Off-Peak)","$0.22","$0.66","$0.007","-","$30"],
      ["DeepSeek V4 Flash Vision Exp (Off-Peak)","$0.22","$0.66","$0.007","-","$15"],
      ["Hy3","$0.14","$0.58","$0.035","-","$60"]
    ],
    endpoints: [
      ["Grok 4.6","grok-4.6"],
      ["GPT 5.6 Luna","gpt-5.6-luna"],
      ["GLM-5.3-Flash","glm-5.3-flash"],
      ["GLM-5.3","glm-5.3"],
      ["GLM-5.2","glm-5.2"],
      ["GLM-5.1","glm-5.1"],
      ["Kimi K3","kimi-k3"],
      ["Kimi K2.7 Code","kimi-k2.7-code"],
      ["Kimi K2.6","kimi-k2.6"],
      ["LongCat-2.0","longcat-2.0"],
      ["DeepSeek V4 Pro","deepseek-v4-pro"],
      ["DeepSeek V4 Flash","deepseek-v4-flash"],
      ["DeepSeek V4 Flash Vision Exp","deepseek-v4-flash-vision-exp"],
      ["MiMo-V2.5","mimo-v2.5"],
      ["MiMo-V2.5-Pro","mimo-v2.5-pro"],
      ["MiniMax M3","minimax-m3"],
      ["MiniMax M2.7","minimax-m2.7"],
      ["Muse Spark 1.2 Contributor","muse-spark-1.2-contributor"],
      ["Qwen3.8 Max","qwen3.8-max"],
      ["Qwen3.8 Flash","qwen3.8-flash"],
      ["Qwen3.7 Max","qwen3.7-max"],
      ["Qwen3.7 Plus","qwen3.7-plus"],
      ["Qwen3.6 Plus","qwen3.6-plus"],
      ["Hy3","hy3"]
    ]
  };

  function norm(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function parseNum(s) {
    if (!s || s === '-') return 0;
    return Number(s.replace(/[$,]/g, '')) || 0;
  }

  function toast(text, color) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:rgba(0,0,0,.9);color:' + (color || '#0f0') + ';padding:10px 14px;border-radius:8px;font-size:12px;font-family:monospace;max-width:360px;line-height:1.5;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 3500);
  }

  function formatContext(n) {
    if (!n) return '-';
    if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return String(n);
  }

  function modalitiesText(mods) {
    if (!mods || !mods.length) return '-';
    var labels = { text: '文', image: '图', video: '视', audio: '音', pdf: 'PDF' };
    return mods.map(function (m) { return labels[m] || m; }).join(' ');
  }

  function stars(score) {
    var s = Math.round(score / 20);
    return '\u2605'.repeat(s) + '\u2606'.repeat(5 - s);
  }

  function computeScore(model) {
    return (model.cap || 5) * 10;
  }

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

  function parseTables(html) {
    var tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
    function rows(tableHtml) {
      var result = [];
      var trRe = /<tr>([\s\S]*?)<\/tr>/g;
      var m;
      var first = true;
      while ((m = trRe.exec(tableHtml)) !== null) {
        if (first) { first = false; continue; }
        var cells = [];
        var tdRe = /<t[dh]>([\s\S]*?)<\/t[dh]>/g;
        var c;
        while ((c = tdRe.exec(m[1])) !== null) {
          cells.push(c[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) result.push(cells);
      }
      return result;
    }
    var requests = [], prices = [], endpoints = [];
    tables.forEach(function (t) {
      var header = (t.match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1];
      var ths = (header.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || [])
        .map(function (h) { return h.replace(/<[^>]+>/g, '').trim().toLowerCase(); });
      var joined = ths.join('|');
      if (joined.indexOf('requests per 5') !== -1) requests = rows(t);
      else if (joined.indexOf('input') !== -1 && joined.indexOf('output') !== -1 && joined.indexOf('usage') !== -1) prices = rows(t);
      else if (joined.indexOf('model id') !== -1) endpoints = rows(t);
    });
    return { requests: requests, prices: prices, endpoints: endpoints };
  }

  function mergeData(tables, apiModels) {
    var map = {};
    tables.requests.forEach(function (r) {
      var name = r[0] || '';
      var n = norm(name);
      if (!n) return;
      map[n] = {
        name: name, modelId: '',
        req5h: parseNum(r[1]), reqWeek: parseNum(r[2]), reqMonth: parseNum(r[3]),
        input: 0, output: 0, usage: 0,
        context: 128000, modalities: ['text'], reasoning: false,
        country: '', cap: 5, score: 0, suggest: ''
      };
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
        m.context = meta.context;
        m.modalities = meta.modalities;
        m.reasoning = meta.reasoning;
        m.country = meta.country || '';
        m.cap = meta.cap || 5;
      }
      m.score = computeScore(m);
      m.suggest = computeSuggest(m);
    });
    if (apiModels && apiModels.length) {
      var docsIds = {};
      Object.keys(map).forEach(function (k) { docsIds[map[k].modelId] = true; });
      apiModels.forEach(function (m) {
        if (m.id && !docsIds[m.id]) {
          var meta = MODEL_META[m.id] || {};
          var entry = {
            name: m.id, modelId: m.id,
            req5h: 0, reqWeek: 0, reqMonth: 0,
            input: 0, output: 0, usage: 0,
            context: meta.context || 128000,
            modalities: meta.modalities || ['text'],
            reasoning: meta.reasoning || false,
            country: meta.country || '',
            cap: meta.cap || 5,
            score: 0, suggest: '', isNew: true
          };
          entry.score = computeScore(entry);
          entry.suggest = computeSuggest(entry);
          map[m.id] = entry;
        }
      });
    }
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    arr.sort(function (a, b) { return b.reqMonth - a.reqMonth; });
    return arr;
  }

  function usageColor(usage) {
    if (usage >= 60) return '#666';
    if (usage >= 30) return '#555';
    if (usage >= 15) return '#444';
    return '#333';
  }

  function scoreColor(score) {
    return '#888';
  }

  function suggestBadge(suggest) {
    if (suggest === 'Plan') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#fff;background:#555;">Plan</span>';
    if (suggest === 'Build') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#111;background:#ccc;">Build</span>';
    if (suggest === '通用') return '<span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;color:#111;background:#eee;">通用</span>';
    return '<span style="color:#555;font-size:10px;">-</span>';
  }

  function renderPanel(data) {
    var existing = document.getElementById('oc-go-panel');
    if (existing) existing.remove();
    var panel = document.createElement('div');
    panel.id = 'oc-go-panel';
    panel.style.cssText = 'margin:0;padding:16px;border:1px solid #333;border-radius:8px;background:#111;color:#e0e0e0;font-size:13px;font-family:system-ui,sans-serif;';
    var sorted = data.filter(function (d) { return d.req5h > 0 || d.isNew; });
    var totalModels = sorted.length;
    var topModel = sorted[0] || {};

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    header.innerHTML =
      '<div><strong style="font-size:15px;">Go \u6A21\u578B\u989D\u5EA6 \u00B7 \u7EFC\u5408\u8BC4\u5206\u699C</strong><span style="margin-left:8px;font-size:11px;opacity:0.6;">' + totalModels + ' \u4E2A\u6A21\u578B \u00B7 ' + new Date().toLocaleDateString('zh-CN') + ' \u66F4\u65B0</span></div>' +
      '<div><button id="oc-go-refresh" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">\u5237\u65B0</button><button id="oc-go-toggle" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">\u6298\u53E0</button><button id="oc-go-close" title="\u5173\u95ED\u9762\u677F" style="padding:4px 10px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:11px;">\u2715</button></div>';
    panel.appendChild(header);

    var stats = document.createElement('div');
    stats.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;font-size:12px;flex-wrap:wrap;';
    var highScore = sorted.filter(function (d) { return d.score >= 80; }).length;
    var imgModels = sorted.filter(function (d) { return d.modalities && d.modalities.indexOf('image') !== -1; }).length;
    stats.innerHTML =
      '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">Top: ' + (topModel.name || '-') + ' (' + (topModel.score || 0) + '\u5206)</span>' +
      '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">\u226580\u5206: ' + highScore + ' \u4E2A</span>' +
      '<span style="background:rgba(255,255,255,.08);padding:3px 8px;border-radius:4px;color:#ccc;">\u8BC6\u56FE: ' + imgModels + ' \u4E2A</span>';
    panel.appendChild(stats);

    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;align-items:center;';
    controls.innerHTML =
      '<input id="oc-go-search" type="text" placeholder="\u641C\u7D22\u6A21\u578B..." style="flex:1;max-width:180px;padding:5px 8px;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:12px;" />' +
      '<select id="oc-go-sort" style="padding:5px 8px;border:1px solid #555;border-radius:4px;background:#222;color:#ccc;font-size:12px;"><option value="reqMonth">\u6309\u6708\u989D\u5EA6</option><option value="score">\u6309\u7EFC\u5408\u8BC4\u5206</option><option value="req5h">\u6309 5h \u6B21\u6570</option><option value="context">\u6309\u4E0A\u4E0B\u6587\u5927\u5C0F</option><option value="usage">\u6309\u500D\u6570</option></select>';
    panel.appendChild(controls);

    var tableWrap = document.createElement('div');
    tableWrap.id = 'oc-go-table-wrap';
    tableWrap.style.cssText = 'overflow-x:auto;max-height:60vh;overflow-y:auto;';
    panel.appendChild(tableWrap);

    function renderTable(items) {
      var t = document.createElement('table');
      t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
      t.innerHTML =
        '<thead><tr style="border-bottom:1px solid #333;text-align:left;position:sticky;top:0;background:#111;">' +
          '<th style="padding:6px 6px;">\u6A21\u578B</th>' +
          '<th style="padding:6px 6px;text-align:center;">\u6A21\u6001</th>' +
          '<th style="padding:6px 6px;text-align:right;">\u4E0A\u4E0B\u6587</th>' +
          '<th style="padding:6px 6px;text-align:right;">5h</th>' +
          '<th style="padding:6px 6px;text-align:right;">\u6708\u989D\u5EA6</th>' +
          '<th style="padding:6px 6px;text-align:center;">\u500D\u6570</th>' +
          '<th style="padding:6px 6px;text-align:center;">\u5EFA\u8BAE</th>' +
          '<th style="padding:6px 6px;">\u64CD\u4F5C</th>' +
        '</tr></thead>';
      var tbody = document.createElement('tbody');
      items.forEach(function (d, i) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #333;' + (i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02);');
        var nameStyle = d.isNew ? 'color:#e0e0e0;font-weight:600;' : (d.score >= 80 ? 'font-weight:600;color:#fff;' : 'color:#bbb;');
        var idTip = d.modelId ? ' title="opencode-go/' + d.modelId + '"' : '';
        tr.innerHTML =
          '<td style="padding:6px 6px;' + nameStyle + '"' + idTip + '>' + d.name + (d.country ? ' <span style="font-size:10px;color:#777;">(' + d.country + ')</span>' : '') + ' <span style="color:#888;font-weight:600;font-size:11px;">' + d.score + '\u5206</span> <span style="font-size:10px;color:#666;">' + stars(d.score) + '</span>' + (d.isNew ? ' <span style="font-size:10px;color:#aaa;">NEW</span>' : '') + '</td>' +
          '<td style="padding:6px 6px;text-align:center;font-size:11px;">' + modalitiesText(d.modalities) + (d.reasoning ? ' <span style="color:#aaa;">\u63A8\u7406</span>' : '') + '</td>' +
          '<td style="padding:6px 6px;text-align:right;font-size:11px;">' + formatContext(d.context) + '</td>' +
          '<td style="padding:6px 6px;text-align:right;">' + d.req5h.toLocaleString() + '</td>' +
          '<td style="padding:6px 6px;text-align:right;">' + d.reqMonth.toLocaleString() + '</td>' +
          '<td style="padding:6px 6px;text-align:center;"><span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;color:#e0e0e0;background:#333;">' + (d.usage ? d.usage + 'x' : '-') + '</span></td>' +
          '<td style="padding:6px 6px;text-align:center;">' + suggestBadge(d.suggest) + '</td>' +
          '<td style="padding:6px 6px;"><button class="oc-go-copy" data-id="' + (d.modelId || '') + '" style="padding:2px 8px;cursor:pointer;border:1px solid #555;border-radius:3px;background:transparent;color:#aaa;font-size:11px;' + (d.modelId ? '' : 'opacity:0.3;cursor:default;') + '">\u590D\u5236</button></td>';
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      tableWrap.innerHTML = '';
      tableWrap.appendChild(t);
    }
    renderTable(sorted);

    var footer = document.createElement('div');
    footer.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid #333;font-size:11px;display:flex;justify-content:space-between;align-items:center;';
    footer.innerHTML =
      '<span style="opacity:0.5;">\u8BC4\u5206 = \u6A21\u578B\u80FD\u529B\uFF081-10\uFF09 \u00B7 \u6570\u636E\u6765\u81EA <a href="' + DOCS_URL + '" target="_blank" style="color:#aaa;">docs/go</a></span>' +
      '<span style="opacity:0.5;">v1.7</span>';
    panel.appendChild(footer);

    var contentEls = [stats, controls, tableWrap, footer];
    panel.querySelector('#oc-go-close').addEventListener('click', function () {
      panel.remove();
      var b = document.getElementById('oc-go-backdrop');
      if (b) b.remove();
      try { localStorage.setItem(PANEL_KEY, '0'); } catch (e) {}
      toast('\u9762\u677F\u5DF2\u5173\u95ED', '#aaa');
    });
    panel.querySelector('#oc-go-toggle').addEventListener('click', function () { var hidden = tableWrap.style.display === 'none'; contentEls.forEach(function (el) { el.style.display = hidden ? '' : 'none'; }); this.textContent = hidden ? '\u6298\u53E0' : '\u5C55\u5F00'; });
    panel.querySelector('#oc-go-refresh').addEventListener('click', function () { loadAndInject(true); });
    panel.querySelector('#oc-go-search').addEventListener('input', function () { var q = this.value.toLowerCase(); var filtered = sorted.filter(function (d) { return d.name.toLowerCase().indexOf(q) !== -1 || (d.modelId && d.modelId.indexOf(q) !== -1); }); renderTable(filtered); bindCopy(); });
    panel.querySelector('#oc-go-sort').addEventListener('change', function () { var key = this.value; var arr = sorted.slice(); arr.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); }); renderTable(arr); bindCopy(); });
    function bindCopy() { panel.querySelectorAll('.oc-go-copy').forEach(function (btn) { btn.addEventListener('click', function (e) { e.stopPropagation(); var id = this.getAttribute('data-id'); if (!id) return; var text = 'opencode-go/' + id; if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function () { toast('\u5DF2\u590D\u5236: ' + text); }); } else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('\u5DF2\u590D\u5236: ' + text); } }); }); }
    bindCopy();
    return panel;
  }

  function injectToggleButton() {
    if (document.getElementById('oc-go-btn')) return;
    var btn = document.createElement('div');
    btn.id = 'oc-go-btn';
    btn.textContent = 'Go';
    btn.title = 'Go \u6A21\u578B\u989D\u5EA6\u7EFC\u5408\u8BC4\u5206\u699C';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:#333;color:#fff;font-size:14px;font-weight:700;font-family:system-ui;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;transition:transform .15s;';
    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
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

  function injectPanel(data, source) {
    var existing = document.getElementById('oc-go-panel');
    if (existing) existing.remove();
    var existingBackdrop = document.getElementById('oc-go-backdrop');
    if (existingBackdrop) existingBackdrop.remove();

    try {
      var panel = renderPanel(data);

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
      panel.style.width = '680px';
      panel.style.maxWidth = 'calc(100vw - 32px)';
      panel.style.maxHeight = '80vh';
      panel.style.overflowY = 'auto';
      panel.style.zIndex = '2147483647';
      panel.style.boxShadow = '0 4px 24px rgba(0,0,0,.6)';

      document.body.appendChild(backdrop);
      document.body.appendChild(panel);
      console.log(TAG, 'Panel injected (' + source + ')');
      toast('\u2713 Go \u989D\u5EA6\u9762\u677F\u5DF2\u52A0\u8F7D', '#ccc');
    } catch (e) {
      console.error(TAG, 'Inject failed:', e);
      toast('\u2717 \u9762\u677F\u6CE8\u5165\u5931\u8D25: ' + (e.message || e), '#f85149');
    }
  }

  function loadAndInject(forceRefresh) {
    if (document.getElementById('oc-go-panel')) return;
    var wantVisible = false;
    try { wantVisible = localStorage.getItem(PANEL_KEY) === '1'; } catch (e) {}
    if (!wantVisible && !forceRefresh) return;
    console.log(TAG, 'loadAndInject, force:', forceRefresh);
    Promise.all([
      fetch(DOCS_URL, { credentials: 'omit' }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }),
      fetch(MODELS_API, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (results) {
      var html = results[0]; var apiData = results[1];
      if (html) {
        var tables = parseTables(html);
        if (tables.requests && tables.requests.length > 0) {
          var apiModels = (apiData && apiData.data) ? apiData.data : [];
          injectPanel(mergeData(tables, apiModels), 'live');
          return;
        }
      }
      console.log(TAG, 'Using snapshot fallback');
      injectPanel(mergeData(SNAPSHOT, []), 'snapshot');
    });
  }

  function init() {
    injectToggleButton();
    var wantVisible = false;
    try { wantVisible = localStorage.getItem(PANEL_KEY) === '1'; } catch (e) {}
    if (wantVisible) { setTimeout(function () { loadAndInject(false); }, 500); }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); }); } else { setTimeout(init, 300); }
  var lastPath = location.pathname;
  setInterval(function () { if (location.pathname !== lastPath) { lastPath = location.pathname; injectToggleButton(); } }, 2000);
  console.log(TAG, 'Ready');
})();