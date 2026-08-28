// ==UserScript==
// @name         OpenCode Go 额度增强面板
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 workspace/go 页面注入模型额度表 + 性价比排名，数据来自 docs/go
// @author       pass
// @match        https://opencode.ai/workspace/*/go*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var CACHE_KEY = 'go_quota_cache_v2';
  var CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  var DOCS_URL = 'https://opencode.ai/docs/go/';
  var MODELS_API = 'https://opencode.ai/zen/go/v1/models';

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
    setTimeout(function () { if (d.parentNode) d.remove(); }, 3500);
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

    function rows(tableHtml) {
      var result = [];
      var trRe = /<tr>([\s\S]*?)<\/tr>/g;
      var m;
      var first = true;
      while ((m = trRe.exec(tableHtml)) !== null) {
        if (first) { first = false; continue; } // skip header
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

    // Identify tables by header text
    var requests = [], prices = [], endpoints = [], privacy = [];
    tables.forEach(function (t) {
      var header = (t.match(/<thead>([\s\S]*?)<\/thead>/) || ['', ''])[1];
      var ths = (header.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || [])
        .map(function (h) { return h.replace(/<[^>]+>/g, '').trim().toLowerCase(); });
      var joined = ths.join('|');
      if (joined.indexOf('requests per 5') !== -1) requests = rows(t);
      else if (joined.indexOf('input') !== -1 && joined.indexOf('output') !== -1 && joined.indexOf('usage') !== -1) prices = rows(t);
      else if (joined.indexOf('model id') !== -1) endpoints = rows(t);
      else if (joined.indexOf('data retention') !== -1) privacy = rows(t);
    });

    return { requests: requests, prices: prices, endpoints: endpoints, privacy: privacy };
  }

  // ─── Merge data ─────────────────────────────────────────────

  function mergeData(tables, apiModels) {
    var map = {};

    // 1. requests table (primary)
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

    // 2. prices table
    tables.prices.forEach(function (r) {
      var rawName = r[0] || '';
      // Handle tiered: "Model (≤ 200K tokens)" or "Model (> 200K tokens)"
      var baseName = rawName.replace(/\s*[\(（].*$/, '').trim();
      var n = norm(baseName);
      var isUpperTier = rawName.indexOf('>') !== -1 || rawName.indexOf('＞') !== -1;
      if (!n || !map[n]) return;
      // For tiered, keep the lower tier (≤), skip upper tier (>)
      if (isUpperTier && map[n].input > 0) return;
      if (isUpperTier) map[n].isTiered = true;
      map[n].input = parseNum(r[1]);
      map[n].output = parseNum(r[2]);
      map[n].cachedRead = parseNum(r[3]);
      map[n].cachedWrite = parseNum(r[4]);
      map[n].usage = parseNum(r[5]);
    });

    // 3. endpoints table
    tables.endpoints.forEach(function (r) {
      var name = r[0] || '';
      var n = norm(name);
      if (!n || !map[n]) return;
      map[n].modelId = r[1] || '';
      map[n].endpoint = r[2] || '';
      map[n].sdk = r[3] || '';
    });

    // 4. New models: in API but not in docs/go
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

    // Convert to array and sort by req5h desc
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    arr.sort(function (a, b) { return b.req5h - a.req5h; });
    return arr;
  }

  // ─── Render ─────────────────────────────────────────────────

  function usageColor(usage) {
    if (usage >= 60) return '#2ea043';  // green: high multiplier
    if (usage >= 30) return '#1f6feb';  // blue: medium
    if (usage >= 15) return '#d29922';  // yellow: low
    return '#f85149';                    // red: very low
  }

  function badgeForRank(i) {
    if (i === 0) return '<span title="性价比王" style="margin-right:4px">🏆</span>';
    if (i === 1) return '<span title="均衡之选" style="margin-right:4px">⚖️</span>';
    if (i === 2) return '<span title="预算友好" style="margin-right:4px">💰</span>';
    return '';
  }

  function renderPanel(data, cacheTime) {
    var existing = document.getElementById('oc-go-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'oc-go-panel';
    panel.style.cssText = 'margin:16px 0;padding:16px;border:1px solid var(--sl-color-border,#333);border-radius:8px;background:var(--sl-color-bg,#1a1a2e);color:var(--sl-color-text,#e0e0e0);font-size:13px;font-family:var(--sl-font-body,system-ui);';

    // Header
    var sorted = data.filter(function (d) { return d.req5h > 0; });
    var totalModels = sorted.length;
    var topModel = sorted[0] || {};

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    header.innerHTML =
      '<div>' +
        '<strong style="font-size:15px;">Go 模型额度 · 性价比榜</strong>' +
        '<span style="margin-left:8px;font-size:11px;opacity:0.6;">' + totalModels + ' 个模型 · 数据来自 docs/go · ' + timeAgo(cacheTime) + '更新</span>' +
      '</div>' +
      '<div>' +
        '<button id="oc-go-refresh" style="padding:4px 10px;margin-right:6px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:11px;">刷新</button>' +
        '<button id="oc-go-toggle" style="padding:4px 10px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:4px;background:var(--sl-color-bg,#222);color:var(--sl-color-text,#ccc);font-size:11px;">折叠</button>' +
      '</div>';

    panel.appendChild(header);

    // Stats bar
    var stats = document.createElement('div');
    stats.style.cssText = 'display:flex;gap:12px;margin-bottom:12px;font-size:12px;';
    var highMult = sorted.filter(function (d) { return d.usage >= 60; }).length;
    var lowMult = sorted.filter(function (d) { return d.usage > 0 && d.usage < 15; }).length;
    var newModels = data.filter(function (d) { return d.isNew; });
    stats.innerHTML =
      '<span style="background:rgba(46,160,67,.15);padding:3px 8px;border-radius:4px;color:#2ea043;">🏆 性价比王: ' + (topModel.name || '-') + ' (' + (topModel.req5h || 0).toLocaleString() + '/5h)</span>' +
      '<span style="background:rgba(31,111,235,.15);padding:3px 8px;border-radius:4px;color:#1f6feb;">6x 高倍率: ' + highMult + ' 个</span>' +
      '<span style="background:rgba(210,153,34,.15);padding:3px 8px;border-radius:4px;color:#d29922;"><15x 低倍率: ' + lowMult + ' 个</span>' +
      (newModels.length ? '<span style="background:rgba(248,81,73,.15);padding:3px 8px;border-radius:4px;color:#f85149;">🆕 新模型: ' + newModels.length + '</span>' : '');
    panel.appendChild(stats);

    // Search + sort controls
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

    // Table container
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
        tr.style.cssText = 'border-bottom:1px solid var(--sl-color-border,#333);' + (i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02);');
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
          '<td style="padding:6px 8px;"><button class="oc-go-copy" data-id="' + (d.modelId || '') + '" style="padding:2px 8px;cursor:pointer;border:1px solid var(--sl-color-border,#555);border-radius:3px;background:transparent;color:var(--sl-color-text,#aaa);font-size:11px;' + (d.modelId ? '' : 'opacity:0.3;cursor:default;') + '">复制 ID</button></td>';
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      tableWrap.innerHTML = '';
      tableWrap.appendChild(t);
    }

    renderTable(sorted);

    // Footer
    var footer = document.createElement('div');
    footer.style.cssText = 'margin-top:12px;padding-top:8px;border-top:1px solid var(--sl-color-border,#333);font-size:11px;display:flex;justify-content:space-between;align-items:center;';
    footer.innerHTML =
      '<span style="opacity:0.5;">倍数 = 模型月额度 / $10 月费（越高越划算）· 数据来自 <a href="' + DOCS_URL + '" target="_blank" style="color:#1f6feb;">docs/go</a></span>' +
      '<span style="opacity:0.5;">面板 v1.0</span>';
    panel.appendChild(footer);

    // ─── Event handlers ──────────────────────────────────────

    // Toggle collapse
    var contentEls = [stats, controls, tableWrap, footer];
    document.getElementById('oc-go-toggle').addEventListener('click', function () {
      var hidden = tableWrap.style.display === 'none';
      contentEls.forEach(function (el) { el.style.display = hidden ? '' : 'none'; });
      this.textContent = hidden ? '折叠' : '展开';
    });

    // Refresh
    document.getElementById('oc-go-refresh').addEventListener('click', function () {
      GM_setValue(CACHE_KEY, null);
      location.reload();
    });

    // Search
    document.getElementById('oc-go-search').addEventListener('input', function () {
      var q = this.value.toLowerCase();
      var filtered = sorted.filter(function (d) {
        return d.name.toLowerCase().indexOf(q) !== -1 || (d.modelId && d.modelId.indexOf(q) !== -1);
      });
      renderTable(filtered);
      bindCopy();
    });

    // Sort
    document.getElementById('oc-go-sort').addEventListener('change', function () {
      var key = this.value;
      var asc = key === 'input'; // input price: low→high
      var arr = sorted.slice();
      arr.sort(function (a, b) {
        return asc ? (a[key] - b[key]) : (b[key] - a[key]);
      });
      renderTable(arr);
      bindCopy();
    });

    // Copy model ID
    function bindCopy() {
      panel.querySelectorAll('.oc-go-copy').forEach(function (btn) {
        btn.addEventListener('click', function () {
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

  function inject(data, cacheTime) {
    if (document.getElementById('oc-go-panel')) return;

    // Find insertion point
    var target = document.querySelector('h1') ||
                 document.querySelector('[data-page]') ||
                 document.querySelector('main') ||
                 document.body;

    var panel = renderPanel(data, cacheTime);

    if (target === document.body) {
      panel.style.position = 'fixed';
      panel.style.bottom = '16px';
      panel.style.right = '16px';
      panel.style.width = '600px';
      panel.style.zIndex = '2147483647';
      panel.style.boxShadow = '0 4px 20px rgba(0,0,0,.5)';
    }

    if (target === document.body) {
      document.body.appendChild(panel);
    } else {
      target.parentNode.insertBefore(panel, target.nextSibling);
    }
  }

  // ─── Main flow ──────────────────────────────────────────────

  function isGoPage() {
    return /\/workspace\/[^/]+\/go/.test(location.pathname);
  }

  function loadAndInject() {
    if (!isGoPage()) return;
    if (document.getElementById('oc-go-panel')) return;

    // Check cache
    try {
      var cached = GM_getValue(CACHE_KEY);
      if (cached) {
        var obj = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (obj && obj.timestamp && (Date.now() - obj.timestamp) < CACHE_TTL && obj.requests) {
          inject(mergeData(obj, obj.apiModels), obj.timestamp);
          return;
        }
      }
    } catch (e) {}

    // Fetch fresh data
    Promise.all([
      fetch(DOCS_URL, { credentials: 'omit' }).then(function (r) { return r.text(); }).catch(function () { return null; }),
      fetch(MODELS_API, { credentials: 'omit' }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (results) {
      var html = results[0];
      var apiData = results[1];

      if (!html) {
        toast('⚠️ 无法获取 docs/go 数据，使用缓存', '#d29922');
        try {
          var fallback = GM_getValue(CACHE_KEY);
          if (fallback) {
            var fb = typeof fallback === 'string' ? JSON.parse(fallback) : fallback;
            if (fb && fb.requests) {
              inject(mergeData(fb, fb.apiModels), fb.timestamp);
              return;
            }
          }
        } catch (e) {}
        toast('❌ 无可用数据', '#f85149');
        return;
      }

      var tables = parseTables(html);
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
      } catch (e) {}

      inject(data, cacheTime);
    });
  }

  // ─── SPA monitoring ─────────────────────────────────────────

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(loadAndInject, 500); });
  } else {
    setTimeout(loadAndInject, 500);
  }

  // Re-inject on SPA navigation
  var lastPath = location.pathname;
  setInterval(function () {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      var old = document.getElementById('oc-go-panel');
      if (old) old.remove();
      setTimeout(loadAndInject, 800);
    }
  }, 1000);

  // Also watch popstate
  window.addEventListener('popstate', function () {
    setTimeout(loadAndInject, 500);
  });

  console.log('[OpenCode Go Enhancer] v1.0 loaded');
})();
