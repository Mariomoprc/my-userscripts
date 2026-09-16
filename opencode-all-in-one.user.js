// ==UserScript==
// @name         模型综合排名（OpenCode / Command Code）
// @namespace    http://tampermonkey.net/
// @version      3.3.0
// @description  opencode.ai（/go 订阅页 + /console 用量页）与 commandcode.ai（用量/套餐页）显示 AA 智力排名 + 三层额度（5小时/每周/每月）+ 月额度对比，直接可见、不需点按钮、随刷新更新。
// @author       pass
// @match        https://opencode.ai/*
// @match        https://commandcode.ai/*
// @run-at       document-idle
// @updateURL    https://fastly.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// @downloadURL  https://fastly.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// ==/UserScript==
// 更新地址说明（2026-09-16）：cdn.jsdelivr.net 的前置缓存出现过长时间不刷新（purge 两次仍返回旧版），
// v3.3.0 按反馈再改：①「限时」标签带到期日 ②加 tok/s 速度 ③面板顶部可点切换排序（智力/5小时/$额度）
// v3.2.0 按用户要求改：①不再自己算「综合分」，直接按官方 AA 智力分排名 ②列出三层额度+月额度
// v3.1.0 呈现方式可选（PLACEMENT）：commandcode 改成底部悬浮条，不再插进内容流
// v3.0.0 支持两个站点，面板一律「直接显示、无需点击」
// 维护提示：
//   1. opencode 的智力分 SCORES 手写在下面（AA 智力指数），新模型上市补一行即可；缺失的会标未收录。
//   2. commandcode 的智力分/额度/请求数全部实时抓文档，不用手改；换套餐改 CC.plan。
//   3. 排名口径只用官方指标，不自算综合分；可点面板顶部切换。AA_FALLBACK 是 AA 兜底分（带 *）。
(function () {
'use strict';
var IS_OC = /(^|\.)opencode\.ai$/.test(location.hostname);
var IS_CC = /(^|\.)commandcode\.ai$/.test(location.hostname);
if (!IS_OC && !IS_CC) return;
var TTL = 10 * 60 * 1000;
var CARD_ID = 'ocrank-card';
var FLOAT_ID = 'ocrank-float';
var PLACEMENT = { opencode: 'inline', commandcode: 'float' };
function placementFor(site) {
if (site === 'opencode') return /\/console/.test(location.pathname) ? 'float' : PLACEMENT.opencode;
return PLACEMENT[site];
}
function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9.]/g, ''); }
function nums(s) {
return ((s || '').replace(/\d+(\.\d+)?x/gi, ' ').match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || [])
.map(function (x) { return Number(x.replace(/,/g, '')) || 0; });
}
function maxNum(s) { var a = nums(s); return a.length ? Math.max.apply(null, a) : 0; }
function cleanName(s) {
return (s || '')
.replace(/\([^)]*\)/g, '')
.split('·')[0]
.replace(/\s*(off-?peak|peak|free|shown|new)\b[\s\S]*$/i, '')
.replace(/\d+(\.\d+)?x.*$/i, '')
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
var AA_FALLBACK = {
'longcat2.0': 19.69, 'ling3.0flashsante': 20.63, 'inkling': 25.54, 'inklingsmall': 26.09,
'step3.7flash': 19.48, 'step3.5flash': 16.96, 'nemotron3ultra': 23.41, 'qwen3.827b': 33.90,
'mimo-v2.5': 22.30
};
var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function shortDate(mon, day) {
var m = MONTHS[String(mon).slice(0, 3).toLowerCase()];
return m ? (m + '/' + day) : (mon + ' ' + day);
}
function findEndDate(text, name) {
var re = /(?:ends?(?:\s+on)?|through)\s+([A-Za-z]{3,9})\s+(\d{1,2})/gi;
var hits = [], m;
while ((m = re.exec(text)) !== null) hits.push({ i: m.index, s: shortDate(m[1], m[2]) });
if (!hits.length) return null;
if (name) {
var key = norm(name);
for (var j = 0; j < hits.length; j++) {
var win = norm(text.slice(Math.max(0, hits[j].i - 400), hits[j].i + 400));
if (win.indexOf(key) !== -1) return hits[j].s;
}
}
return hits.length === 1 ? hits[0].s : null;
}
var sortMode = 'score';
function metric(m) {
if (sortMode === 'req5h') return m.req5h || 0;
if (sortMode === 'allowance') return m.allowance || 0;
return m.score == null ? -1 : m.score;
}
function sortModels(models) {
var ok = models.filter(function (m) { return m.score != null || metric(m) > 0; });
ok.sort(function (a, b) {
var d = metric(b) - metric(a);
return d || (b.score || 0) - (a.score || 0) || (b.allowance || 0) - (a.allowance || 0);
});
return { all: models, ranked: ok };
}
function badge(txt, bg) {
return '<span style="margin-left:4px;padding:0 4px;border-radius:99px;background:' + bg +
';color:#fff;font-size:9px;white-space:nowrap">' + txt + '</span>';
}
function modelRow(m, i) {
var tags = (m.trained ? badge('训练', '#b7791f') : '') +
(m.promo ? badge('限时' + (m.promoEnd ? '·' + m.promoEnd + '止' : ''), '#1f6feb') : '');
var l2 = [];
if (m.allowance) l2.push('<b>' + money(m.allowance) + '</b>/月');
if (m.req5h) l2.push('5小时 ' + m.req5h.toLocaleString());
if (m.reqWeek) l2.push('每周 ' + m.reqWeek.toLocaleString());
if (m.reqMonth) l2.push('每月 ' + m.reqMonth.toLocaleString());
if (m.tok) l2.push(m.tok + ' tok/s');
if (m.context) l2.push('上下文 ' + m.context);
var val = sortMode === 'score' ? (m.score == null ? '—' : m.score + (m.aaFallback ? '*' : ''))
: sortMode === 'req5h' ? (m.req5h ? m.req5h.toLocaleString() : '—')
: (m.allowance ? money(m.allowance) : '—');
return '<div style="padding:5px 0;border-top:1px solid rgba(127,127,127,.16)">' +
'<div style="display:flex;align-items:baseline;gap:6px">' +
'<span style="opacity:.45;flex:none;min-width:14px;text-align:right">' + (i + 1) + '</span>' +
'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + m.name + tags + '</span>' +
'<b style="flex:none;color:#2ea043">' + val + '</b></div>' +
'<div style="opacity:.55;font-size:11px;padding-left:20px">' + (l2.join(' · ') || '（该模型无额度数据）') + '</div></div>';
}
function buildCard(title, res, note) {
var card = el('div', 'padding:10px 12px;border:1px solid rgba(127,127,127,.3);border-radius:10px;' +
'background:rgba(20,20,20,.96);font-size:12px;line-height:1.45;color:#eee;max-height:56vh;overflow:auto;' +
'-webkit-overflow-scrolling:touch;');
card.id = CARD_ID;
var list = res.ranked.slice(0, 12).map(modelRow).join('');
var scoredCount = res.all.filter(function (m) { return m.score != null; }).length;
var unscored = res.all.length - scoredCount;
var hasFallback = res.ranked.some(function (m) { return m.aaFallback; });
var stale = res.t && (Date.now() - res.t > 15 * 60 * 1000);
var t = new Date(res.t || Date.now());
var hhmm = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
function tab(mode, label) {
var on = sortMode === mode;
return '<span data-sort="' + mode + '" style="cursor:pointer;padding:1px 6px;border-radius:99px;' +
(on ? 'background:#2ea043;color:#fff;' : 'background:rgba(127,127,127,.18);opacity:.8;') + '">' + label + '</span>';
}
card.innerHTML =
'<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">' +
'<b style="flex:1;font-size:13px">🧠 ' + title + '</b>' + tab('score', '智力') + tab('req5h', '5小时') + tab('allowance', '$额度') + '</div>' +
'<div style="opacity:.5;font-size:11px;margin-bottom:2px">只按官方指标排序，不另外算综合分；额度是该模型的上限</div>' +
list +
'<div style="opacity:.45;font-size:11px;margin-top:6px;padding-top:5px;border-top:1px solid rgba(127,127,127,.16)">' +
'共 ' + res.all.length + ' 个模型 · 有评分 ' + scoredCount + ' 个' +
(unscored ? '（' + unscored + ' 个未收录评分）' : '') +
(hasFallback ? '；* = 取自 AA 排行榜（该站文档未收录）' : '') +
' · ' + note + ' · 抓取于 ' + hhmm + (stale ? ' · ⚠︎ 可能已过期，下拉刷新页面' : '') + '</div>';
Array.prototype.forEach.call(card.querySelectorAll('[data-sort]'), function (b) {
b.addEventListener('click', function () { setSort(b.getAttribute('data-sort')); });
});
return card;
}
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
var currentRender = null;
function setSort(mode) {
if (mode === sortMode) return;
sortMode = mode;
if (res && res.all) res.ranked = sortModels(res.all).ranked;
if (currentRender) currentRender();
}
function floatPanel(res, title, note) {
if (document.getElementById(FLOAT_ID)) return true;
if (dismissed) return true;
var wrap = el('div', 'position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));' +
'z-index:2147483000;font-size:12px;line-height:1.5;');
wrap.id = FLOAT_ID;
var bar = el('div', 'display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;' +
'background:rgba(18,18,18,.93);color:#eee;border:1px solid rgba(127,127,127,.35);box-shadow:0 3px 14px rgba(0,0,0,.45);');
var text = el('div', 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', '');
var exp = el('span', 'flex:none;cursor:pointer;opacity:.75;padding:0 4px;font-size:14px;', '⤢');
var close = el('span', 'flex:none;cursor:pointer;opacity:.6;padding:0 4px;font-size:15px;', '×');
var detail = null;
function barLine() {
var r = res.ranked;
if (!r.length) return '';
var pre = sortMode === 'score' ? '🧠' : (sortMode === 'req5h' ? '⚡' : '💰');
var val = function (x) {
if (sortMode === 'req5h') return x.req5h ? x.req5h.toLocaleString() : '—';
if (sortMode === 'allowance') return x.allowance ? money(x.allowance) : '—';
return x.score;
};
var s = pre + ' 1 ' + r[0].name + ' ' + val(r[0]);
if (r[1]) s += ' ｜ 2 ' + r[1].name + ' ' + val(r[1]);
if (r[2]) s += ' ｜ 3 ' + r[2].name + ' ' + val(r[2]);
return s;
}
function showDetail() {
var old = document.getElementById(CARD_ID);
if (old) old.remove();
detail = buildCard(title, res, note);
detail.style.margin = '0 0 6px';
detail.style.background = 'rgba(18,18,18,.95)';
wrap.insertBefore(detail, bar);
text.style.whiteSpace = 'normal';
}
text.textContent = barLine();
exp.addEventListener('click', function () {
if (detail) { detail.remove(); detail = null; text.style.whiteSpace = 'nowrap'; return; }
showDetail();
});
close.addEventListener('click', function () { dismissed = true; wrap.remove(); });
currentRender = function () {
text.textContent = barLine();
text.style.whiteSpace = 'nowrap';
if (detail) showDetail(); else detail = null;
};
bar.appendChild(text);
bar.appendChild(exp);
bar.appendChild(close);
wrap.appendChild(bar);
document.body.appendChild(wrap);
return true;
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
if (/4x|ends|结束|限时|倍/i.test(c[5])) {
m.promo = true;
m.promoEnd = m.promoEnd || findEndDate(c.join(' '), name);
}
} else if (kind === 'req') {
m.req5h = Math.max(m.req5h || 0, maxNum(c[1]));
m.reqWeek = Math.max(m.reqWeek || 0, maxNum(c[2]));
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
if (m.score == null && AA_FALLBACK[k] != null) { m.score = AA_FALLBACK[k]; m.aaFallback = true; }
models.push(m);
});
return sortModels(models);
}
function ocRender(res) {
if (placementFor('opencode') === 'float') return floatPanel(res, 'OpenCode Go', '数据 docs/go + artificialanalysis');
var card = buildCard('OpenCode Go', res, '数据 docs/go + artificialanalysis');
if (!card) return false;
var host = document.querySelector('figure[data-component="go-usage"]') ||
document.querySelector('section[data-component="comparison"]');
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
currentRender = function () { ocRender(res); };
return true;
}
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
m.score = maxNum(c[2]) || null;
if (/not yet scored/i.test(c[2] || '')) m.score = null;
if (m.score == null && AA_FALLBACK[norm(name)] != null) { m.score = AA_FALLBACK[norm(name)]; m.aaFallback = true; }
var ctx = (c[1] || '').trim();
if (/k$/i.test(ctx) || /m$/i.test(ctx)) m.context = ctx.toUpperCase();
m.tok = maxNum(c[3]) || null;
} else if (isReq) {
m.req5h = Math.max(m.req5h || 0, maxNum(c[1]));
m.reqWeek = Math.max(m.reqWeek || 0, maxNum(c[2]));
m.reqMonth = Math.max(m.reqMonth || 0, maxNum(c[3]));
} else if (isCredits) {
m.allowance = Math.max(m.allowance, maxNum(c[c.length - 1]));
if (/\$40\$60|\$20\$40|boosted/i.test(c[c.length - 1])) m.promo = true;
}
});
});
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
.filter(function (m) { return m.allowance || m.score != null || m.req5h; });
var pageText = '';
try { pageText = new DOMParser().parseFromString(html, 'text/html').body.textContent || ''; } catch (e) {}
list.forEach(function (m) {
if (m.promo && !m.promoEnd) m.promoEnd = findEndDate(pageText, m.name);
});
return sortModels(list);
}
function ccRender(res) {
if (!res.ranked.length) return false;
var title = CC.plan.toUpperCase() + ' 套餐';
var note = '数据 commandcode.ai/docs/plans/' + CC.plan;
if (placementFor('commandcode') === 'float') return floatPanel(res, title, note);
var card = buildCard(title, res, note);
if (!card) return false;
var main = document.querySelector('main') || document.body;
var old = document.getElementById(CARD_ID);
if (old) old.remove();
var heads = Array.prototype.filter.call(main.querySelectorAll('h1'), function (h) {
return !h.closest('aside,nav') && h.getBoundingClientRect().width > 300;
});
if (heads.length) {
var h1 = heads[0];
var block = (h1.parentElement && h1.parentElement !== main) ? h1.parentElement : h1;
block.insertAdjacentElement('afterend', card);
currentRender = function () { ccRender(res); };
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
function targetUrl() {
if (IS_OC) return 'https://opencode.ai/docs/go/';
return CC.base + CC.plan;
}
var res = null, loading = false, fails = 0, cooldownUntil = 0, lastTick = 0, dismissed = false;
var MAX_TRIES = 12;
function painted() { return !!(document.getElementById(CARD_ID) || document.getElementById(FLOAT_ID)); }
function shouldRender() {
if (IS_OC) return true;
if (IS_CC) return /\/settings(\/|$)/.test(location.pathname) || /\/docs\/plans\//.test(location.pathname);
return false;
}
function tick() {
if (!shouldRender()) return;
if (Date.now() - lastTick < 400) return;
lastTick = Date.now();
if (res) {
if (!painted()) {
var ok = IS_OC ? ocRender(res) : ccRender(res);
if (!ok && ++fails > MAX_TRIES && !painted()) {
var fb = IS_OC ? buildCard('OpenCode Go', res, '数据 docs/go') : buildCard(CC.plan.toUpperCase() + ' 套餐', res, 'commandcode docs');
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
parsed.t = Date.now();
res = parsed;
console.log('[OC Rank] 共 ' + res.all.length + ' 个模型，智力最高：' + res.ranked[0].name + ' ' + res.ranked[0].score);
tick();
});
}
tick();
setInterval(tick, 1500);
try { new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
