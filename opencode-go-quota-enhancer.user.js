// ==UserScript==
// @name         OpenCode Go 额度增强面板
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在 workspace/go 页面注入模型额度表 + 性价比排名，数据来自 docs/go
// @author       pass
// @match        https://opencode.ai/workspace/*/go*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var TAG = '[Go Enhancer]';
  var CACHE_KEY = 'go_quota_cache_v2';
  var CACHE_TTL = 6 * 60 * 60 * 1000;
  var DOCS_URL = 'https://opencode.ai/docs/go/';
  var MODELS_API = 'https://opencode.ai/zen/go/v1/models';

  console.log(TAG, 'v1.3 loaded, pathname:', location.pathname);

  // ─── Built-in snapshot (2026-08-28) ────────────────────────
  // Used as fallback when fetch fails (CORS, network, etc.)
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
      ["Grok 4.6 (≤ 200K tokens)","$2.00","$6.00","$0.50","-","$15"],
      ["GPT 5.6 Luna (≤ 272K tokens)","$0.20","$1.20","$0.02","$0.25","$15"],
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
      ["Qwen3.7 Plus (≤ 256K tokens)","$0.40","$1.60","$0.04","$0.50","$60"],
      ["Qwen3.6 Plus (≤ 256K tokens)","$0.50","$3.00","$0.05","$0.625","$60"],
      ["DeepSeek V4 Pro (Off-Peak)","$0.66","$1.98","$0.022","-","$15"],
      ["DeepSeek V4 Flash (Off-Peak)","$0.22","$0.66","$0.007","-","$30"],
      ["DeepSeek V4 Flash Vision Exp (Off-Peak)","$0.22","$0.66","$0.007","-","$15"],
      ["Hy3","$0.14","$0.58","$0.035","-","$60"]
    ],
    endpoints: [
      ["Grok 4.6","grok-4.6","https://opencode.ai/zen/go/v1/responses","@ai-sdk/openai"],
      ["GPT 5.6 Luna","gpt-5.6-luna","https://opencode.ai/zen/go/v1/responses","@ai-sdk/openai"],
      ["GLM-5.3-Flash","glm-5.3-flash","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["GLM-5.3","glm-5.3","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["GLM-5.2","glm-5.2","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["GLM-5.1","glm-5.1","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["Kimi K3","kimi-k3","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["Kimi K2.7 Code","kimi-k2.7-code","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["Kimi K2.6","kimi-k2.6","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["LongCat-2.0","longcat-2.0","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["DeepSeek V4 Pro","deepseek-v4-pro","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["DeepSeek V4 Flash","deepseek-v4-flash","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["DeepSeek V4 Flash Vision Exp","deepseek-v4-flash-vision-exp","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["MiMo-V2.5","mimo-v2.5","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["MiMo-V2.5-Pro","mimo-v2.5-pro","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"],
      ["MiniMax M3","minimax-m3","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["MiniMax M2.7","minimax-m2.7","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Muse Spark 1.2 Contributor","muse-spark-1.2-contributor","https://opencode.ai/zen/go/v1/responses","@ai-sdk/openai"],
      ["Qwen3.8 Max","qwen3.8-max","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Qwen3.8 Flash","qwen3.8-flash","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Qwen3.7 Max","qwen3.7-max","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Qwen3.7 Plus","qwen3.7-plus","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Qwen3.6 Plus","qwen3.6-plus","https://opencode.ai/zen/go/v1/messages","@ai-sdk/anthropic"],
      ["Hy3","hy3","https://opencode.ai/zen/go/v1/chat/completions","@ai-sdk/openai-compatible"]
    ],
    timestamp: 1756396800000 // 2026-08-28
  };

  // ─── Utilities ──────────────────────────────────────────────

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
    setTimeout(function () { if (d.parentNode) d.remove(); }, 4000);
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return Math.floor(diff / 86400000) + ' 天前';
  }

  // ─── Parse tables from HTML ─────────────────────────────────

  function parseTables(html) {
    var tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
    console.log(TAG, 'Found', tables.length, 'tables in HTML');

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

    var requests = [], prices = [], endpoints = [], privacy = [];
    tables.forEach(function (t, idx) {
      var header = (t.match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1];
      var ths = (header.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || [])
        .map(function (h) { return h.replace(/<[^>]+>/g, '').trim().toLowerCase(); });
      var joined = ths.join('|');
      console.log(TAG, 'Table', idx, ':', joined.substring(0, 60));
      if (joined.indexOf('requests per 5') !== -1) requests = rows(t);
      else if (joined.indexOf('input') !== -1 && joined.indexOf('output') !== -1 && joined.indexOf('usage') !== -1) prices = rows(t);
      else if (joined.indexOf('model id') !== -1) endpoints = rows(t);
      else if (joined.indexOf('data retention') !== -1) privacy = rows(t);
    });

    console.log(TAG, 'Parsed:', requests.length, 'requests,', prices.length, 'prices,', endpoints.length, 'endpoints');
    return { requests: requests, prices: prices, endpoints: endpoints, privacy: privacy };
  }

  // ─── Merge data ─────────────────────────────────────────────

  function mergeData(tables, apiModels) {
    var map = {};

    tables.requests.forEach(function (r) {
      var name = r[0] || '';
      var n = norm(name);
      if (!n) return;
      map[n] = {
        name: name,
        req5h: parseNum(r[1]),
        reqWeek: parseNum(r[2]),
        reqMonth: parseNum(r[3]),
        input: 0, output: 0, cachedRead: 0, cachedWrite: 0, usage: 0,
        modelId: '', endpoint: '', sdk: '',
        isTiered: false, isNew: false
      };
    });

    tables.prices.forEach(function (r) {
      var rawName = r[0] || '';
      var baseName = rawName.replace(/\s*[\(（].*$/, '').trim();
      var n = norm(baseName);
      var isUpperTier = rawName.indexOf('>') !== -1 || rawName.indexOf('＞') !== -1;
      if (!n || !map[n]) return;
      if (isUpperTier && map[n].input > 0) return;
      if (isUpperTier) map[n].isTiered = true;
      map[n].input = parseNum(r[1]);
      map[n].output = parseNum(r[2]);
      map[n].cachedRead = parseNum(r[3]);
      map[n].cachedWrite = parseNum(r[4]);
      map[n].usage = parseNum(r[5]);
    });

    tables.endpoints.forEach(function (r) {
      var name = r[0] || '';
      var n = norm(name);
      if (!n || !map[n]) return;
      map[n].modelId = r[1] || '';
      map[n].endpoint = r[2] || '';
      map[n].sdk = r[3] || '';
    });

    if (apiModels && apiModels.length) {
      var docsIds = {};
      Object.keys(map).forEach(function (k) { docsIds[map[k].modelId] = true; });
      apiModels.forEach(function (m) {
        if (m.id && !docsIds[m.id]) {
          map[m.id] = {
            name: m.id,
            req5h: 0, reqWeek: 0, reqMonth: 0,
            input: 0, output: 0, cachedRead: 0, cachedWrite: 0, usage: 0,
            modelId: m.id, endpoint: '', sdk: '',
            isTiered: false, isNew: true
          };
        }
      });
    }

    var arr = Object.keys(map).map(function (k) { return map[k]; });
    arr.sort(function (a, b) { return b.req5h - a.req5h; });
    console.log(TAG, 'Merged', arr.length, 'models, top:', arr[0] ? arr[0].name : 'none');
    return arr;
  }

  // ─── Render ─────────────────────────────────────────────────

  function usageColor(usage) {
    if (usage >= 60) return '#2ea043';
    if (usage >= 30) return '#1f6feb';
    if (usage >= 15) return '#d29922';
    return '#f85149';
  }

  function badgeForRank(i) {
    if (i === 0) return '<span title="性价比王" style="margin-right:4px">🏆</span>';
    if (i === 1) return '<span title="均衡之选" style="margin-right:4px">⚖️</span>';
    if (i === 2) return '<span title="预算友好" style="margin-right:4px">💰</span>';
    return '';
  }

  function renderPanel(data, cacheTime, source) {
    var existing = document.getElementById('oc-go-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'oc-go-panel';
    panel.style.cssText = 'margin:16px 0;padding:16px;border:1px solid var(--sl-color-border,#333);border-radius:8px;background:var(--sl-color-bg,#1a1a2e);color:var(--sl-color-text,#e0e0e0);font-size:13px;font-family:var(--sl-font-body,system-ui);';

    var sorted = data.filter(function (d) { return d.req5h > 0; });
    var totalModels = sorted.length;
    var topModel = sorted[0] || {};
    var sourceLabel = source === 'snapshot' ? '内置快照' : 'docs/go';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    header.innerHTML =
      '<div>' +
        '<strong style="font-size:15px;">Go 模型额度 · 性价比榜</strong>' +
        '<span style="margin-left:8px;font-size:11px;opacity:0.6;">' + totalModels + ' 个模型 · 数据来自 ' + sourceLabel + ' · ' + timeAgo(cacheTime) + '更新</span>' +
      '</div>' +
      '<div>' +
        '<button id="oc-go-refresh" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:11px;">刷新</button>' +
        '<button id="oc-go-toggle" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:11px;">折叠</button>' +
        '<button id="oc-go-close" title="关闭面板" style="padding:4px 10px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:11px;">✕</button>' +
      '</div>';

    panel.appendChild(header);

    var stats = document.createElement('div');
    stats.style.cssText = 'display:flex;gap:12px;margin-bottom:12px;font-size:12px;flex-wrap:wrap;';
    var highMult = sorted.filter(function (d) { return d.usage >= 60; }).length;
    var lowMult = sorted.filter(function (d) { return d.usage > 0 && d.usage < 15; }).length;
    var newModels = data.filter(function (d) { return d.isNew; });
    stats.innerHTML =
      '<span style="background:rgba(46,160,67,.15);padding:3px 8px;border-radius:4px;color:#2ea043;">🏆 性价比王: ' + (topModel.name || '-') + ' (' + (topModel.req5h || 0).toLocaleString() + '/5h)</span>' +
      '<span style="background:rgba(31,111,235,.15);padding:3px 8px;border-radius:4px;color:#1f6feb;">6x 高倍率: ' + highMult + ' 个</span>' +
      '<span style="background:rgba(210,153,34,.15);padding:3px 8px;border-radius:4px;color:#d29922;"><15x 低倍率: ' + lowMult + ' 个</span>' +
      (newModels.length ? '<span style="background:rgba(248,81,73,.15);padding:3px 8px;border-radius:4px;color:#f85149;">🆕 新模型: ' + newModels.length + '</span>' : '');
    panel.appendChild(stats);

    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;align-items:center;';
    controls.innerHTML =
      '<input id="oc-go-search" type="text" placeholder="搜索模型..." style="flex:1;max-width:200px;padding:5px 8px;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:12px;" />' +
      '<select id="oc-go-sort" style="padding:5px 8px;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:12px;">' +
        '<option value="req5h">按 5h 次数</option>' +
        '<option value="reqWeek">按周次数</option>' +
        '<option value="reqMonth">按月次数</option>' +
        '<option value="input">按输入价（低→高）</option>' +
        '<option value="usage">按倍数（高→低）</option>' +
      '</select>';
    panel.appendChild(controls);

    var tableWrap = document.createElement('div');
    tableWrap.id = 'oc-go-table-wrap';
    tableWrap.style.cssText = 'overflow-x:auto;max-height:500px;overflow-y:auto;';
    panel.appendChild(tableWrap);

    function renderTable(items) {
      var t = document.createElement('table');
      t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
      t.innerHTML =
        '<thead><tr style="border-bottom:1px solid var(--sl-color-border,#444);text-align:left;">' +
          '<th style="padding:6px 8px;">模型</th>' +
          '<th style="padding:6px 8px;text-align:right;">5h 次数</th>' +
          '<th style="padding:6px 8px;text-align:right;">周次数</th>' +
          '<th style="padding:6px 8px;text-align:right;">月次数</th>' +
          '<th style="padding:6px 8px;text-align:right;">输入价</th>' +
          '<th style="padding:6px 8px;text-align:right;">输出价</th>' +
          '<th style="padding:6px 8px;text-align:center;">倍数</th>' +
          '<th style="padding:6px 8px;">操作</th>' +
        '</tr></thead>';
      var tbody = document.createElement('tbody');
      items.forEach(function (d, i) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid var(--sl-color-border,#333);cursor:pointer;' + (i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02);');
        var nameStyle = d.isNew
          ? 'padding:6px 8px;color:#f85149;font-weight:600;'
          : (i < 3 ? 'padding:6px 8px;font-weight:600;color:#e0e0e0;' : 'padding:6px 8px;color:var(--sl-color-text,#ccc);');
        var idTip = d.modelId ? ' title="opencode-go/' + d.modelId + '"' : '';
        tr.innerHTML =
          '<td' + nameStyle + '>' + badgeForRank(i) + '<span' + idTip + '>' + d.name + '</span>' + (d.isNew ? ' <span style="font-size:10px;color:#f85149;">NEW</span>' : '') + '</td>' +
          '<td style="padding:6px 8px;text-align:right;">' + d.req5h.toLocaleString() + '</td>' +
          '<td style="padding:6px 8px;text-align:right;">' + d.reqWeek.toLocaleString() + '</td>' +
          '<td style="padding:6px 8px;text-align:right;">' + d.reqMonth.toLocaleString() + '</td>' +
          '<td style="padding:6px 8px;text-align:right;">' + (d.input ? '$' + d.input.toFixed(2) : '-') + '</td>' +
          '<td style="padding:6px 8px;text-align:right;">' + (d.output ? '$' + d.output.toFixed(2) : '-') + '</td>' +
          '<td style="padding:6px 8px;text-align:center;"><span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;color:#fff;background:' + usageColor(d.usage) + ';">' + (d.usage ? d.usage + 'x' : '-') + '</span></td>' +
          '<td style="padding:6px 8px;"><button class="oc-go-copy" data-id="' + (d.modelId || '') + '" style="padding:2px 8px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:3px;background:transparent;color:var(--sl-color-text,#aaa);font-size:11px;' + (d.modelId ? '' : 'opacity:0.3;cursor:default;') + '">复制</button></td>';
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      tableWrap.innerHTML = '';
      tableWrap.appendChild(t);
    }

    renderTable(sorted);

    var footer = document.createElement('div');
    footer.style.cssText = 'margin-top:12px;padding-top:8px;border-top:1px solid var(--sl-color-border,#333);font-size:11px;display:flex;justify-content:space-between;align-items:center;';
    footer.innerHTML =
      '<span style="opacity:0.5;">倍数 = 模型月额度 / $10 月费 · 数据来自 <a href="' + DOCS_URL + '" target="_blank" style="color:#1f6feb;">docs/go</a></span>' +
      '<span style="opacity:0.5;">v1.3</span>';
    panel.appendChild(footer);

    // Event handlers (use panel.querySelector since panel not yet in DOM)
    var contentEls = [stats, controls, tableWrap, footer];
    panel.querySelector('#oc-go-toggle').addEventListener('click', function () {
      var hidden = tableWrap.style.display === 'none';
      contentEls.forEach(function (el) { el.style.display = hidden ? '' : 'none'; });
      this.textContent = hidden ? '折叠' : '展开';
    });

    panel.querySelector('#oc-go-refresh').addEventListener('click', function () {
      GM_setValue(CACHE_KEY, null);
      location.reload();
    });

    panel.querySelector('#oc-go-close').addEventListener('click', function () {
      var p = document.getElementById('oc-go-panel');
      if (p) p.remove();
      toast('面板已关闭（刷新页面可重新显示）', '#aaa');
    });

    panel.querySelector('#oc-go-search').addEventListener('input', function () {
      var q = this.value.toLowerCase();
      var filtered = sorted.filter(function (d) {
        return d.name.toLowerCase().indexOf(q) !== -1 || (d.modelId && d.modelId.indexOf(q) !== -1);
      });
      renderTable(filtered);
      bindCopy();
    });

    panel.querySelector('#oc-go-sort').addEventListener('change', function () {
      var key = this.value;
      var asc = key === 'input';
      var arr = sorted.slice();
      arr.sort(function (a, b) { return asc ? (a[key] - b[key]) : (b[key] - a[key]); });
      renderTable(arr);
      bindCopy();
    });

    function bindCopy() {
      panel.querySelectorAll('.oc-go-copy').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.getAttribute('data-id');
          if (!id) return;
          var text = 'opencode-go/' + id;
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

  // ─── Inject ─────────────────────────────────────────────────

  function inject(data, cacheTime, source) {
    if (document.getElementById('oc-go-panel')) return;

    try {
      var panel = renderPanel(data, cacheTime, source);

      // Fixed floating panel - always visible regardless of page DOM structure
      panel.style.position = 'fixed';
      panel.style.top = '16px';
      panel.style.right = '16px';
      panel.style.width = '640px';
      panel.style.maxWidth = 'calc(100vw - 32px)';
      panel.style.maxHeight = '80vh';
      panel.style.overflowY = 'auto';
      panel.style.zIndex = '2147483647';
      panel.style.boxShadow = '0 4px 24px rgba(0,0,0,.5)';
      panel.style.margin = '0';

      document.body.appendChild(panel);

      console.log(TAG, 'Panel injected successfully (fixed floating)');
      toast('✓ Go 额度面板已加载（' + source + '）', '#2ea043');
    } catch (e) {
      console.error(TAG, 'Inject failed:', e);
      toast('✗ 面板注入失败: ' + (e.message || e), '#f85149');
    }
  }

  // ─── Main flow ──────────────────────────────────────────────

  function isGoPage() {
    var result = /\/workspace\/[^/]+\/go/.test(location.pathname);
    console.log(TAG, 'isGoPage:', result, 'path:', location.pathname);
    return result;
  }

  function useSnapshot() {
    console.log(TAG, 'Using built-in snapshot data');
    var data = mergeData(SNAPSHOT, []);
    inject(data, SNAPSHOT.timestamp, 'snapshot');
  }

  function loadAndInject() {
    if (!isGoPage()) return;
    if (document.getElementById('oc-go-panel')) return;

    console.log(TAG, 'loadAndInject called');

    // 1. Try cache first
    try {
      var cached = GM_getValue(CACHE_KEY);
      if (cached) {
        var obj = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (obj && obj.timestamp && (Date.now() - obj.timestamp) < CACHE_TTL && obj.requests && obj.requests.length > 0) {
          console.log(TAG, 'Using cache, age:', Math.floor((Date.now() - obj.timestamp) / 60000) + 'min');
          inject(mergeData(obj, obj.apiModels), obj.timestamp, 'cache');
          return;
        }
      }
    } catch (e) {
      console.log(TAG, 'Cache read error:', e);
    }

    // 2. Fetch fresh data
    console.log(TAG, 'Fetching fresh data...');
    Promise.all([
      fetch(DOCS_URL, { credentials: 'omit' })
        .then(function (r) {
          console.log(TAG, 'Docs response:', r.status, r.statusText);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .catch(function (e) {
          console.log(TAG, 'Docs fetch failed:', e.message || e);
          return null;
        }),
      fetch(MODELS_API, { credentials: 'omit' })
        .then(function (r) {
          console.log(TAG, 'Models API response:', r.status, r.statusText);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(function (e) {
          console.log(TAG, 'Models API fetch failed:', e.message || e);
          return null;
        })
    ]).then(function (results) {
      var html = results[0];
      var apiData = results[1];

      if (!html) {
        console.log(TAG, 'No HTML fetched, falling back to snapshot');
        toast('⚠️ 无法获取 docs/go，使用内置数据', '#d29922');
        useSnapshot();
        return;
      }

      var tables = parseTables(html);

      // Validate: if requests table is empty, snapshot is better
      if (!tables.requests || tables.requests.length === 0) {
        console.log(TAG, 'Parsed 0 requests rows, falling back to snapshot');
        toast('⚠️ 解析失败，使用内置数据', '#d29922');
        useSnapshot();
        return;
      }

      var apiModels = (apiData && apiData.data) ? apiData.data : [];
      var data = mergeData(tables, apiModels);
      var cacheTime = Date.now();

      // Save cache
      try {
        var toCache = {
          requests: tables.requests,
          prices: tables.prices,
          endpoints: tables.endpoints,
          privacy: tables.privacy,
          apiModels: apiModels,
          timestamp: cacheTime
        };
        GM_setValue(CACHE_KEY, JSON.stringify(toCache));
        console.log(TAG, 'Cache saved');
      } catch (e) {
        console.log(TAG, 'Cache save error:', e);
      }

      inject(data, cacheTime, 'live');
    });
  }

  // ─── SPA monitoring ─────────────────────────────────────────

  // Initial load with multiple attempts
  function tryLoad(attempt) {
    console.log(TAG, 'tryLoad attempt', attempt);
    if (document.getElementById('oc-go-panel')) return;
    loadAndInject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { tryLoad(1); }, 300);
      setTimeout(function () { tryLoad(2); }, 1000);
      setTimeout(function () { tryLoad(3); }, 3000);
    });
  } else {
    setTimeout(function () { tryLoad(1); }, 300);
    setTimeout(function () { tryLoad(2); }, 1000);
    setTimeout(function () { tryLoad(3); }, 3000);
  }

  // Watch for SPA navigation
  var lastPath = location.pathname;
  setInterval(function () {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      console.log(TAG, 'SPA navigation detected:', location.pathname);
      var old = document.getElementById('oc-go-panel');
      if (old) old.remove();
      setTimeout(loadAndInject, 800);
    }
  }, 1000);

  window.addEventListener('popstate', function () {
    console.log(TAG, 'popstate fired');
    setTimeout(loadAndInject, 500);
  });

  // MutationObserver: watch for DOM changes that indicate page load
  var observer = new MutationObserver(function (mutations) {
    if (document.getElementById('oc-go-panel')) return;
    if (!isGoPage()) return;
    // If h1 appears (SPA loaded), try inject
    if (document.querySelector('h1')) {
      console.log(TAG, 'h1 detected via MutationObserver');
      setTimeout(loadAndInject, 200);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log(TAG, 'SPA monitoring active');
})();