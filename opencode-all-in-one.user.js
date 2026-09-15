// ==UserScript==
// @name         OpenCode Go 最佳模型
// @namespace    http://tampermonkey.net/
// @version      2.0.1
// @description  在 opencode.ai/go 订阅页显示「当前最佳模型」：综合分 = AA 智力分 + 月额度加成，并高亮对应模型行。
// @author       pass
// @match        https://opencode.ai/*
// @run-at       document-idle
// @updateURL    https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// ==/UserScript==

// v2.0.0 精简重写：只保留「/go 订阅页显示当前最佳模型」。
// 已删除：Go 额度大面板、Zen 免费模型表、模型选择器注入、用量 Top5 榜、4096/4747 后端相关、
//          峰谷提醒、Tab 切代理、粘贴图片、拖拽、ESC 中断、自动刷新、设置面板等全部旧功能。
// 旧版完整代码（v1.16.0）见 git 历史。
//
// 维护提示：
//   1. SCORES 是 AA 智力指数（artificialanalysis.ai/leaderboards/models），新模型上市时手动补一行，缺的会显示为「未收录评分」。
//   2. 额度、请求数、价格都实时抓自 docs/go，不需要手改。
//   3. TRAIN_PENALTY > 0 可给「会用你的数据训练」的模型扣分（设 10 则 GLM-5.3-Flash 会反超 Muse Spark 1.3）。
//
// v2.0.1 修复：docs/go 会按 Accept-Language 返回中文本地化页面（表头「每月限制/每 5 小时请求数」），
//             之前只匹配英文表头 → 中文环境下解析不出模型、卡片不显示。现在①抓取显式要英文版
//             ②表头匹配中英双语兜底 ③解析失败不再永久放弃（退避重试 + 清缓存）。
//             实测环境：软路由 192.168.3.100 上 browser 容器（playwright 1.62）zh-CN / en-US 均通过。

(function () {
  'use strict';

  if (!/\/go\/?$/.test(location.pathname)) return; // 只在 /go（含 /zh/go）订阅页运行

  var DOCS_URL = 'https://opencode.ai/docs/go/';
  var CACHE_KEY = 'ocgb_docs_cache_v2';
  var CACHE_TTL = 6 * 3600 * 1000;
  var LIMIT_MIN = 15;      // 月额度下限 $
  var LIMIT_MAX = 60;      // 月额度上限 $
  var LIMIT_BONUS = 10;    // 额度加成满分：$15→+0，$30→+3.3，$60→+10
  var TRAIN_PENALTY = 0;   // 训练用户数据的扣分（默认 0，只打标签不扣分）

  // AA 智力指数（Artificial Analysis Intelligence Index v4.3，2026-09-15 取自官方排行榜，取该模型最高档）
  var SCORES = {
    'grok-4.6': 44.41,
    'gpt-5.6-luna': 37.50,
    'glm-5.3-flash': 41.91,
    'glm-5.3': 44.86,
    'glm-5.2': 34.01,
    'glm-5.1': 26.45,
    'kimi-k3': 43.78,
    'kimi-k2.7-code': 26.27,
    'kimi-k2.6': 27.46,
    'longcat-2.0': 19.69,
    'deepseek-v4.1-flash': 39.55,
    'deepseek-v4-pro': 36.28,
    'deepseek-v4-flash': 34.53,
    'deepseek-v4-flash-vision-exp': 35.01,
    'mimo-v2.5': 22.30,
    'mimo-v2.5-pro': 26.41,
    'minimax-m3': 29.61,
    'minimax-m2.7': 23.22,
    'minimax-m2.5': 22.80,
    'muse-spark-1.3-contributor': 48.17,
    'muse-spark-1.2-contributor': 39.80,
    'qwen3.8-max': 40.30,
    'qwen3.8-flash': 39.91, // AA 条目为 Qwen3.8-Flash-Next
    'qwen3.7-max': 29.87,
    'qwen3.7-plus': 25.82,
    'qwen3.6-plus': 27.01,
    'hy3': 25.77
    // 'hy4-preview': 待 AA 收录
  };

  function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9.]/g, ''); }

  // 取单元格里的数字（兼容 "6,50026,000"、"$15 $604x" 这种新旧值并排的促销写法）
  function nums(s) {
    return ((s || '').replace(/\d+(\.\d+)?x/gi, ' ').match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || [])
      .map(function (x) { return Number(x.replace(/,/g, '')) || 0; });
  }
  function maxNum(s) { var a = nums(s); return a.length ? Math.max.apply(null, a) : 0; }

  // "Qwen3.7 Plus (≤ 256K tokens)" / "DeepSeek V4.1 Flash4x · Ends Sep 20" → "Qwen3.7 Plus" / "DeepSeek V4.1 Flash"
  function cleanName(s) {
    return (s || '').replace(/\([^)]*\)/g, '').split('·')[0].replace(/\d+(\.\d+)?x.*$/i, '').replace(/\s+/g, ' ').trim();
  }

  function parseDocs(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var map = {}; // key = norm(模型名)，与 norm(modelId) 一致
    function slot(k, name) { return map[k] || (map[k] = { name: name }); }
    function hit(head, keys) {
      for (var i = 0; i < keys.length; i++) if (head.indexOf(keys[i]) !== -1) return true;
      return false;
    }
    // docs 会按 Accept-Language 本地化，表头中英双语都认
    function tableKind(head) {
      if (hit(head, ['monthly limit', '每月限制'])) return 'price';
      if (hit(head, ['requests per 5 hour', '每 5 小时请求数'])) return 'req';
      if (hit(head, ['model id', '模型 id'])) return 'id';
      if (hit(head, ['model training', '模型训练'])) return 'train';
      return null;
    }

    Array.prototype.forEach.call(doc.querySelectorAll('table'), function (t) {
      var headRow = t.querySelector('tr');
      var kind = tableKind(headRow ? headRow.textContent.toLowerCase() : '');
      if (!kind) return;
      Array.prototype.forEach.call(t.querySelectorAll('tr'), function (tr) {
        var c = Array.prototype.map.call(tr.querySelectorAll('th,td'), function (x) { return x.textContent.trim(); });
        if (c.length < 2) return;
        var name = cleanName(c[0]);
        if (!name || /^(model|模型)$/i.test(name)) return;
        var m = slot(norm(name), name);
        if (kind === 'price') {
          m.limit = Math.max(m.limit || 0, maxNum(c[5]));
          m.input = Math.min(m.input || 99, maxNum(c[1]) || 99);
          if (/4x|ends|结束|限时|倍/i.test(c[5])) m.promo = true;
        } else if (kind === 'req') {
          m.req5h = Math.max(m.req5h || 0, maxNum(c[1]));
        } else if (kind === 'id') {
          m.id = c[1];
        } else if (kind === 'train') {
          m.trained = /^(yes|是|使用)/i.test(c[1]) && !/^(not|不)/i.test(c[1]);
        }
      });
    });

    var all = [];
    Object.keys(map).forEach(function (k) {
      var m = map[k];
      if (!m.limit) return; // 没有额度数据的（已下架）不参与
      m.aa = SCORES[m.id || k];
      m.bonus = Math.round(LIMIT_BONUS * Math.min(1, Math.max(0, (m.limit - LIMIT_MIN) / (LIMIT_MAX - LIMIT_MIN))) * 10) / 10;
      m.total = m.aa == null ? null : Math.round((m.aa + m.bonus - (m.trained ? TRAIN_PENALTY : 0)) * 10) / 10;
      all.push(m);
    });
    var ranked = all.filter(function (m) { return m.total != null; }).sort(function (a, b) {
      return b.total - a.total || b.aa - a.aa || (a.trained ? 1 : 0) - (b.trained ? 1 : 0) || a.input - b.input || b.req5h - a.req5h;
    });
    return { all: all, ranked: ranked };
  }

  function card(res) {
    var best = res.ranked[0];
    if (!best) return null;
    var el = document.createElement('div');
    el.id = 'ocgb-card';
    el.style.cssText = 'margin:0 0 14px;padding:12px 14px;border:1px solid rgba(127,127,127,.28);border-radius:10px;' +
      'background:rgba(127,127,127,.07);font-size:13px;line-height:1.75;color:inherit;';

    var tag = function (txt, bg) {
      return '<span style="margin-left:6px;padding:1px 6px;border-radius:99px;background:' + bg + ';color:#fff;font-size:10px;vertical-align:middle">' + txt + '</span>';
    };
    var tags = (best.trained ? tag('训练用户数据', '#b7791f') : '') + (best.promo ? tag('限时 4×', '#1f6feb') : '');
    var runners = res.ranked.slice(1, 4).map(function (m, i) {
      return (i + 2) + '. ' + m.name + ' ' + m.total;
    }).join(' · ');
    var unknown = res.all.length - res.ranked.length;

    el.innerHTML =
      '<div style="font-weight:700;font-size:14px">🏆 当前最佳：<span style="color:#2ea043">' + best.name + '</span>' + tags +
      '<span style="margin-left:8px;font-weight:400;opacity:.75">综合 ' + best.total + ' 分</span></div>' +
      '<div style="opacity:.85">智力 ' + best.aa + ' ＋ 额度加成 ' + best.bonus + '（$' + best.limit + '/月）' +
      (best.req5h ? ' · 5 小时 ' + best.req5h.toLocaleString() + ' 次' : '') + '</div>' +
      (runners ? '<div style="opacity:.6">' + runners + '</div>' : '') +
      '<div style="opacity:.45;font-size:11px">综合分 = AA 智力分 + 额度加成（$15→0、$60→+10），共 ' + res.all.length + ' 个模型' +
      (unknown ? '，' + unknown + ' 个未收录评分' : '') + ' · 数据来自 docs/go + artificialanalysis</div>';
    return el;
  }

  function highlight(id) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-slot="model-row"]'), function (row) {
      var cell = row.querySelector('[data-slot="model"]');
      if (!cell) return;
      var pill = cell.querySelector('.ocgb-pill');
      var hit = (id && row.getAttribute('data-model') === id);
      if (hit && !pill) {
        pill = document.createElement('span');
        pill.className = 'ocgb-pill';
        pill.textContent = '最佳';
        pill.style.cssText = 'margin-left:6px;padding:1px 6px;border-radius:99px;background:#2ea043;color:#fff;font-size:10px;vertical-align:middle;';
        cell.appendChild(pill);
      } else if (!hit && pill) {
        pill.remove();
      }
    });
  }

  function inject(res) {
    var host = document.querySelector('figure[data-component="go-usage"]') ||
               document.querySelector('section[data-component="comparison"]');
    if (!host) return false;
    var el = card(res);
    if (!el) return false;
    var old = document.getElementById('ocgb-card');
    if (old) old.remove();
    host.insertAdjacentElement('beforebegin', el);
    highlight(res.ranked[0].id);
    return true;
  }

  function load() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < CACHE_TTL) return Promise.resolve(c.html);
    } catch (e) {}
    return fetch(DOCS_URL, { credentials: 'omit', headers: { 'Accept-Language': 'en-US,en;q=0.9' } })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (html) {
        if (html) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), html: html })); } catch (e) {} }
        return html;
      })
      .catch(function () { return null; });
  }

  // —— 幂等重入：应付 SSR 水合抹掉卡片 / 站内路由切到 /go / 展开全部模型 ——
  var res = null, loading = false, lastTick = 0, fails = 0, cooldownUntil = 0;

  function tick() {
    if (!/\/go\/?$/.test(location.pathname)) return;
    if (Date.now() - lastTick < 400) return;
    lastTick = Date.now();
    if (res) {
      if (!document.getElementById('ocgb-card')) inject(res);
      else highlight(res.ranked[0].id);
    } else if (!loading && Date.now() > cooldownUntil) {
      loading = true;
      load().then(function (html) {
        loading = false;
        var parsed = html && parseDocs(html);
        if (!parsed || !parsed.ranked.length) { // 失败不放弃：清缓存 + 30s 起步退避重试
          fails++;
          cooldownUntil = Date.now() + Math.min(60000 * fails, 300000);
          try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
          console.warn('[OC Go Best] docs/go 拉取或解析失败，第 ' + fails + ' 次，稍后重试');
          return;
        }
        res = parsed;
        inject(res);
      });
    }
  }

  tick();
  setInterval(tick, 1500);
  try { new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
