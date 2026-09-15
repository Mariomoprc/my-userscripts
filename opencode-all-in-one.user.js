// ==UserScript==
// @name         模型综合排名（OpenCode / Command Code）
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  opencode.ai（/go 订阅页 + /console 用量页）与 commandcode.ai（用量/套餐页）显示「智力评分 + 额度」综合排名，直接可见、不需点按钮、随刷新更新。
// @author       pass
// @match        https://opencode.ai/*
// @match        https://commandcode.ai/*
// @run-at       document-idle
// @updateURL    https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// ==/UserScript==

// v3.0.0 支持两个站点，面板一律「直接显示、无需点击」：
//   opencode.ai     /go 订阅页（模型额度表上方） + /console/*（用量区上方，文本锚点定位）
//   commandcode.ai  /<user>/settings/*（用量页） + /docs/plans/*（套餐文档页）
// 数据源：opencode 抓 docs/go；commandcode 抓 docs/plans/<plan>（含智力分 + 每模型 Monthly credits）
// 综合分 = 智力分 + 额度加成（额度按该站点模型里的最小值→0、最大值→+10 线性归一）
//
// 维护提示：
//   1. opencode 的智力分 SCORES 手写在下面（AA 智力指数），新模型上市补一行即可；缺失的会标「未收录评分」。
//   2. commandcode 的智力分/额度/请求数全部实时抓文档，不用手改；换套餐改 CC.plan。
//   3. 想调「额度」的权重改 BONUS_MAX，想调页面上的摆放位置改各站点 render 里的插入点。

(function () {
  'use strict';

  var IS_OC = /(^|\.)opencode\.ai$/.test(location.hostname);
  var IS_CC = /(^|\.)commandcode\.ai$/.test(location.hostname);
  if (!IS_OC && !IS_CC) return;

  var BONUS_MAX = 10;                 // 额度加成满分
  var TTL = 10 * 60 * 1000;           // 数据缓存 10 分钟（刷新页面超过 10 分钟就重新抓）
  var CARD_ID = 'ocrank-card';

  // ======================= 通用工具 =======================
  function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9.]/g, ''); }
  function nums(s) {
    return ((s || '').replace(/\d+(\.\d+)?x/gi, ' ').match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || [])
      .map(function (x) { return Number(x.replace(/,/g, '')) || 0; });
  }
  function maxNum(s) { var a = nums(s); return a.length ? Math.max.apply(null, a) : 0; }
  // 去掉括号注释 / 促销尾巴 / FREE 后缀，得到模型名主干
  function cleanName(s) {
    return (s || '')
      .replace(/\([^)]*\)/g, '')
      .split('·')[0]
      .replace(/\d+(\.\d+)?x.*$/i, '')
      .replace(/\s*(FREE|Off-peak|Peak)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function money(v) { return '$' + (Math.round(v * 100) / 100); }
  function el(tag, css, html) {
    var d = document.createElement(tag);
    if (css) d.style.cssText = css;
    if (html != null) d.innerHTML = html;
    return d;
  }

  // 计算综合分：智力分 + 额度加成（额度在 [lo, hi] 线性归一）
  function rank(models) {
    var withLimit = models.filter(function (m) { return m.allowance > 0; });
    var limits = withLimit.map(function (m) { return m.allowance; });
    var lo = limits.length ? Math.min.apply(null, limits) : 0;
    var hi = limits.length ? Math.max.apply(null, limits) : 0;
    models.forEach(function (m) {
      var t = (hi > lo) ? (m.allowance - lo) / (hi - lo) : 0;
      m.bonus = Math.round(BONUS_MAX * Math.max(0, Math.min(1, t)) * 10) / 10;
      m.total = (m.score == null) ? null : Math.round((m.score + m.bonus) * 10) / 10;
    });
    var ranked = models.filter(function (m) { return m.total != null; }).sort(function (a, b) {
      return b.total - a.total || b.score - a.score || b.allowance - a.allowance;
    });
    return { all: models, ranked: ranked, lo: lo, hi: hi };
  }

  function buildCard(title, res, note) {
    var best = res.ranked[0];
    if (!best) return null;
    var card = el('div', 'margin:14px 0;padding:12px 14px;border:1px solid rgba(127,127,127,.3);border-radius:10px;' +
      'background:rgba(127,127,127,.07);font-size:13px;line-height:1.75;color:inherit;');
    card.id = CARD_ID;
    var runners = res.ranked.slice(1, 4).map(function (m, i) { return (i + 2) + '. ' + m.name + ' ' + m.total; }).join(' · ');
    var unknown = res.all.length - res.ranked.length;
    var extras = [];
    if (best.reqMonth) extras.push('月 ' + best.reqMonth.toLocaleString() + ' 次');
    else if (best.req5h) extras.push('5 小时 ' + best.req5h.toLocaleString() + ' 次');
    if (best.context) extras.push('上下文 ' + best.context);
    var tag = function (txt, bg) {
      return '<span style="margin-left:6px;padding:1px 6px;border-radius:99px;background:' + bg +
        ';color:#fff;font-size:10px;vertical-align:middle">' + txt + '</span>';
    };
    card.innerHTML =
      '<div style="font-weight:700;font-size:14px">🏆 ' + title + '：<span style="color:#2ea043">' + best.name + '</span>' +
      (best.trained ? tag('训练用户数据', '#b7791f') : '') + (best.promo ? tag('限时', '#1f6feb') : '') +
      '<span style="margin-left:8px;font-weight:400;opacity:.75">综合 ' + best.total + ' 分</span></div>' +
      '<div style="opacity:.85">智力 ' + best.score + ' ＋ 额度加成 ' + best.bonus +
      (best.allowance ? '（' + money(best.allowance) + '/月）' : '') +
      (extras.length ? ' · ' + extras.join(' · ') : '') + '</div>' +
      (runners ? '<div style="opacity:.6">' + runners + '</div>' : '') +
      '<div style="opacity:.45;font-size:11px">综合分 = 智力分 + 额度加成（' + money(res.lo) + '→0、' + money(res.hi) + '→+' + BONUS_MAX +
      '）· 共 ' + res.all.length + ' 个模型' + (unknown ? '，' + unknown + ' 个未收录评分' : '') + ' · ' + note + '</div>';
    return card;
  }

  // 找到「同时包含若干关键词、且最小」的元素（抗改版的文本锚点）
  function smallestByText(markers, maxLen) {
    var best = null;
    Array.prototype.forEach.call(document.querySelectorAll('div,section,article,form'), function (n) {
      var t = n.textContent || '';
      if (t.length > (maxLen || 4000)) return;
      for (var i = 0; i < markers.length; i++) {
        if (t.indexOf(markers[i]) === -1) return;
      }
      if (!best || t.length < (best.textContent || '').length) best = n;
    });
    return best;
  }

  // 兜底：定位不到就贴一条固定在页面顶部的面板（永远可见）
  function fixedFallback(card) {
    if (document.getElementById(CARD_ID)) return;
    var wrap = el('div', 'position:fixed;top:0;left:0;right:0;z-index:2147483000;padding:0 10px;background:var(--background,transparent);');
    card.style.margin = '8px 0';
    var close = el('span', 'float:right;cursor:pointer;opacity:.5;padding:0 6px;', '×');
    close.addEventListener('click', function () { wrap.remove(); });
    card.appendChild(close);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  function load(storeKey, url) {
    try {
      var c = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if (c && Date.now() - c.t < TTL && c.html) return Promise.resolve(c.html);
    } catch (e) {}
    return fetch(url, { credentials: 'omit', headers: { 'Accept-Language': 'en-US,en;q=0.9' } })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (h) {
        if (h) { try { localStorage.setItem(storeKey, JSON.stringify({ t: Date.now(), html: h })); } catch (e) {} }
        return h;
      })
      .catch(function () { return null; });
  }

  // 通用：解析 HTML 里的表格 → [{head:[...], rows:[[...]]}]
  function parseTables(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll('table'), function (t) {
      var rows = Array.prototype.map.call(t.querySelectorAll('tr'), function (tr) {
        return Array.prototype.map.call(tr.querySelectorAll('th,td'), function (c) { return c.textContent.trim(); });
      }).filter(function (r) { return r.length > 1; });
      if (rows.length > 1) out.push({ head: rows[0].join(' ').toLowerCase(), rows: rows.slice(1) });
    });
    return out;
  }

  // ======================= opencode.ai =======================
  // AA 智力指数（2026-09-15 取自 artificialanalysis.ai 排行榜，取该模型最高档）
  var OC_SCORES = {
    'grok-4.6': 44.41, 'gpt-5.6-luna': 37.50, 'glm-5.3-flash': 41.91, 'glm-5.3': 44.86,
    'glm-5.2': 34.01, 'glm-5.1': 26.45, 'kimi-k3': 43.78, 'kimi-k2.7-code': 26.27,
    'kimi-k2.6': 27.46, 'longcat-2.0': 19.69, 'deepseek-v4.1-flash': 39.55, 'deepseek-v4-pro': 36.28,
    'deepseek-v4-flash': 34.53, 'deepseek-v4-flash-vision-exp': 35.01, 'mimo-v2.5': 22.30,
    'mimo-v2.5-pro': 26.41, 'minimax-m3': 29.61, 'minimax-m2.7': 23.22, 'minimax-m2.5': 22.80,
    'muse-spark-1.3-contributor': 48.17, 'muse-spark-1.2-contributor': 39.80, 'qwen3.8-max': 40.30,
    'qwen3.8-flash': 39.91, 'qwen3.7-max': 29.87, 'qwen3.7-plus': 25.82, 'qwen3.6-plus': 27.01,
    'hy3': 25.77
  };

  function ocParse(html) {
    var map = {};
    function slot(k, name) { return map[k] || (map[k] = { name: name, allowance: 0 }); }
    var hit = function (head, keys) {
      for (var i = 0; i < keys.length; i++) if (head.indexOf(keys[i]) !== -1) return true;
      return false;
    };
    parseTables(html).forEach(function (tb) {
      var kind = hit(tb.head, ['monthly limit', '每月限制']) ? 'price'
        : hit(tb.head, ['requests per 5 hour', '每 5 小时请求数']) ? 'req'
          : hit(tb.head, ['model id', '模型 id']) ? 'id'
            : hit(tb.head, ['model training', '模型训练']) ? 'train' : null;
      if (!kind) return;
      tb.rows.forEach(function (c) {
        var name = cleanName(c[0]);
        if (!name || /^(model|模型)$/i.test(name)) return;
        var m = slot(norm(name), name);
        if (kind === 'price') {
          m.allowance = Math.max(m.allowance, maxNum(c[5]));
          if (/4x|ends|结束|限时|倍/i.test(c[5])) m.promo = true;
        } else if (kind === 'req') {
          m.req5h = Math.max(m.req5h || 0, maxNum(c[1]));
          m.reqMonth = Math.max(m.reqMonth || 0, maxNum(c[3]));
        } else if (kind === 'id') {
          m.id = c[1];
        } else if (kind === 'train') {
          m.trained = /^(yes|是|使用)/i.test(c[1]) && !/^(not|不)/i.test(c[1]);
        }
      });
    });
    var models = [];
    Object.keys(map).forEach(function (k) {
      var m = map[k];
      if (!m.allowance) return;
      m.score = OC_SCORES[m.id || k];
      models.push(m);
    });
    return rank(models);
  }

  // opencode 面板：/go 订阅页插在模型额度表上方；/console 用量页插在用量区上方
  function ocRender(res) {
    var card = buildCard('当前最佳', res, '数据 docs/go + artificialanalysis');
    if (!card) return false;
    var host = document.querySelector('figure[data-component="go-usage"]') ||
      document.querySelector('section[data-component="comparison"]');
    // /console 用量页：用文本锚点找「用量区」，不依赖类名（抗改版）；找不到再退到 main
    if (!host) {
      host = smallestByText(['每周用量', '每月用量'], 4000) ||
        smallestByText(['5 小时用量', '每月用量'], 4000) ||
        smallestByText(['Weekly usage', 'Monthly usage'], 4000);
    }
    if (!host && /\/console/.test(location.pathname)) host = document.querySelector('main');
    if (!host) return false;
    var old = document.getElementById(CARD_ID);
    if (old) old.remove();
    if (host.tagName === 'MAIN') host.insertBefore(card, host.firstChild);
    else host.insertAdjacentElement('beforebegin', card);
    card.style.margin = '0 0 14px';
    return true;
  }

  // ======================= commandcode.ai =======================
  var CC = { plan: 'goat', base: 'https://commandcode.ai/docs/plans/' };

  function ccParse(html) {
    var models = {}, byKey = {};
    function put(k, name) { return byKey[k] || (byKey[k] = (models[k] = { name: name, allowance: 0 })); }
    parseTables(html).forEach(function (tb) {
      var h = tb.head;
      var isModels = h.indexOf('intelligence') !== -1 && h.indexOf('context') !== -1;
      var isReq = h.indexOf('requests / 5 hours') !== -1 || h.indexOf('requests / 5 hour') !== -1;
      var isCredits = h.indexOf('monthly credits') !== -1;
      if (!isModels && !isReq && !isCredits) return;
      tb.rows.forEach(function (c) {
        var name = cleanName(c[0]);
        if (!name || /^model$/i.test(name)) return;
        var m = put(norm(name), name);
        if (isModels) {
          m.score = maxNum(c[2]) || null;                 // Intelligence
          if (/not yet scored/i.test(c[2] || '')) m.score = null;
          var ctx = (c[1] || '').trim();
          if (/k$/i.test(ctx) || /m$/i.test(ctx)) m.context = ctx.toUpperCase();
          m.tok = maxNum(c[3]) || null;                   // Tok/s
        } else if (isReq) {
          m.req5h = Math.max(m.req5h || 0, maxNum(c[1]));
          m.reqMonth = Math.max(m.reqMonth || 0, maxNum(c[3]));
        } else if (isCredits) {
          m.allowance = Math.max(m.allowance, maxNum(c[c.length - 1]));  // Monthly credits（促销取大值）
          if (/\$40\$60|\$20\$40|boosted/i.test(c[c.length - 1])) m.promo = true;
        }
      });
    });
    // 文档里额度表用「Tencent Hy3」这类带厂牌的名字，跟模型表对不上 → 用尾部包含法兜底关联
    Object.keys(byKey).forEach(function (k) {
      var m = byKey[k];
      if (m.allowance || m.score) return;
      var bestKey = null;
      Object.keys(byKey).forEach(function (k2) {
        if (k2 === k) return;
        if (k2.indexOf(k) !== -1 || k.indexOf(k2) !== -1) {
          if (!bestKey || byKey[k2].allowance > (byKey[bestKey].allowance || 0)) bestKey = k2;
        }
      });
      if (bestKey) m.allowance = byKey[bestKey].allowance || 0;
    });
    var list = Object.keys(models).map(function (k) { return models[k]; })
      .filter(function (m) { return m.allowance || m.score != null; });
    return rank(list);
  }

  function ccRender(res) {
    if (!res.ranked.length) return false;
    var card = buildCard('当前最佳（' + CC.plan.toUpperCase() + ' 套餐）', res, '数据 commandcode.ai/docs/plans/' + CC.plan);
    if (!card) return false;
    var main = document.querySelector('main') || document.body;
    var old = document.getElementById(CARD_ID);
    if (old) old.remove();

    // 主内容区的页面标题：排除侧栏/导航，且要有实际宽度（侧栏项宽度很小或隐藏）
    var heads = Array.prototype.filter.call(main.querySelectorAll('h1'), function (h) {
      return !h.closest('aside,nav') && h.getBoundingClientRect().width > 300;
    });
    if (heads.length) {
      var h1 = heads[0];
      var block = (h1.parentElement && h1.parentElement !== main) ? h1.parentElement : h1;
      block.insertAdjacentElement('afterend', card);   // 放在标题块下方 = 内容区最上方
      return true;
    }
    var table = main.querySelector('table');
    if (table) {
      var fig = table.closest('figure');
      (fig || table.parentElement || table).insertAdjacentElement('beforebegin', card);
      return true;
    }
    if (main.firstChild) { main.insertBefore(card, main.firstChild); return true; }
    return false;
  }

  // ======================= 启动 =======================
  function targetUrl() {
    if (IS_OC) return 'https://opencode.ai/docs/go/';
    return CC.base + CC.plan;
  }

  var res = null, loading = false, fails = 0, cooldownUntil = 0, lastTick = 0;
  var MAX_TRIES = 12; // 找不到插入点时的重试次数（SPA 渲染慢）

  function shouldRender() {
    if (IS_OC) return true; // /go 与 /console 都由插入点决定是否出现
    if (IS_CC) return /\/settings(\/|$)/.test(location.pathname) || /\/docs\/plans\//.test(location.pathname);
    return false;
  }

  function tick() {
    if (!shouldRender()) return;
    if (Date.now() - lastTick < 400) return;
    lastTick = Date.now();
    if (res) {
      if (!document.getElementById(CARD_ID)) {
        var ok = IS_OC ? ocRender(res) : ccRender(res);
        if (!ok && ++fails > MAX_TRIES && !document.getElementById(CARD_ID)) {
          var fb = IS_OC ? buildCard('当前最佳', res, '数据 docs/go') : buildCard('当前最佳（' + CC.plan.toUpperCase() + '）', res, 'commandcode docs');
          if (fb) fixedFallback(fb);
        }
      }
      return;
    }
    if (loading || Date.now() < cooldownUntil) return;
    loading = true;
    load('ocrank_' + (IS_OC ? 'oc' : 'cc'), targetUrl()).then(function (html) {
      loading = false;
      var parsed = html && (IS_OC ? ocParse(html) : ccParse(html));
      if (!parsed || !parsed.ranked.length) {
        fails++;
        cooldownUntil = Date.now() + Math.min(30000 * fails, 180000);
        try { localStorage.removeItem('ocrank_' + (IS_OC ? 'oc' : 'cc')); } catch (e) {}
        console.warn('[OC Rank] 数据拉取或解析失败，第 ' + fails + ' 次，稍后重试');
        return;
      }
      res = parsed;
      console.log('[OC Rank] 共 ' + res.all.length + ' 个模型，最佳：' + res.ranked[0].name + ' ' + res.ranked[0].total);
      tick();
    });
  }

  tick();
  setInterval(tick, 1500);
  try { new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
