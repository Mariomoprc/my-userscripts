// ==UserScript==
// @name         OpenCode All-in-One 增强
// @namespace    http://tampermonkey.net/
// @version      1.12.7
// @description  OpenCode 全站增强：Go 模型额度面板 + 模型选择器额度+国家+评分+隐私显示 + Tab 切换代理 + 粘贴图片(静默压缩) + 选项键盘导航 + 拖拽网页/链接到输入框(防遮挡无黑屏) + 后端掉线提示(10s上限+前景补探活) + 静音 capture(12s窗口) + ESC单按中断 + 断连自动续对话 + DS峰时提醒 + 大图懒加载 + 长输出折叠 + 智能滚动 + 推理折叠 + 草稿持久化 + 代码换行 | v1.11.1
// @author       pass
// @match        https://opencode.ai/*
// @include      /^https?:\/\/localhost:4096/
// @include      /^https?:\/\/127\.0\.0\.1:4096/
// @include      /^https?:\/\/192\.168\.\d+\.\d+:4096/
// @include      /^https?:\/\/100\.\d+\.\d+\.\d+:4096/
// @include      /^https?:\/\/.*\.ts\.net:4096/
// @include      /^https?:\/\/localhost:4747/
// @include      /^https?:\/\/127\.0\.0\.1:4747/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/Mariomoprc/my-userscripts@main/opencode-all-in-one.user.js
// @grant        GM.xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

// 版本历史：
// v1.12.7 workspace 用量区上方嵌入 Go 月额度 Top5 榜（复用 Top5 数据源＋配色，hover 全名）
// v1.12.6 国家评分搬进 Top5 榜行内，模型行退回纯额度（hover 保留全量）
// v1.12.5 行标签恢复国家＋评分显示（训练标识留 hover，名字保持全显）
// v1.12.4 最大行皇冠改左上角叠加（零占位）＋行名 Contributor 后缀缩写（全名进 hover）
// v1.12.3 模型行标签瘦身：行内只留月额度，国家/评分/训练收进 hover
// v1.12.2 头条升级为 Go月额度Top5榜（短名＋并列合并＋hover全名）
// v1.12.1 今日最大头条移到搜索框之上（面板根，不再混进分组）
// v1.12.0 模型面板置顶今日最大额度头条＋最大行描边＋易主/首开提醒，SNAPSHOT 补 Hy4 preview
// v1.11.1 修复刷新 new-session 带 draftId 弹旧对话（reload 时清理参数）
// v1.11.0 去掉 4747 入口（按用户要求改存书签）
// v1.10.13 修复 SW 弹窗无条件拦截被窗口门挡（capture 文案一律拦）+ 图标改锚 Build 栏紧挨
// v1.10.12 4747 与服务按钮放一起（同排紧挨 gap 6px，优先服务旁/输入框旁）
// v1.10.11 后端 web 仍有通知/音效修复（补 WS 钩子 + DOM 打点，capture 实时打点窗口）
// v1.10.10 后端 web 弹窗/提示音漏拦修复（capture 窗口内一律静默，lastNormal 覆盖）
// v1.10.9 修复 4747 按钮绿点被遮挡（dot 内收 2px + header/按钮 overflow visible）
// v1.10.8 完善静音 capture（窗口 5s→12s，轮询 2s→1s，补 data-session-id 隐藏）
// v1.10.7 去掉 4747 按钮灰边（背景 transparent，hover 0.08）
// v1.10.6 去掉 4747 按钮边框（border 0，保留圆角背景+绿点）
// v1.10.5 现场实测对齐 4747 按钮与 header 按钮同基线（y=9，margin-top 7px 精调）
// v1.10.4 对齐 4747 按钮与 header 内其他 28px 按钮同基线（y=9，margin-top 4px）
// v1.10.3 修复 4747 按钮在 header 时的垂直居中（header alignItems center）
// v1.10.2 去掉 4747 按钮在线绿框（保留右上角绿点）
// v1.10.1 移除 token 用量胶囊（in/out/cache/cost 显示）
// v1.10.0 修复 OpenCode Go 告警：opencode.ai 域 fetch 补 x-opencode-session 标头（zenHeaders，09/06 起强制）
// v1.9.9 ESC单按中断+完成提示5s窗口+断连自动续对话+4747网格黑白去文字+token胶囊默认关闭
// v1.9.8 4096断连10s上限+切回前景补探活，后端已重连提示优化
// v1.9.7 修复 4747 web 绿点注入到 img 内不可见（改 span afterend 绝对定位，与 OC 侧同款）
// v1.9.6 4747 web 左上角 logo 加同款绿点（复用 OC 侧 oc-dot 样式，位置风格一致）
// v1.9.5 新增 服务旁 4747 记忆入口（黑白 logo，点击直达 127.0.0.1:4747，健康绿点） + 静默覆盖局域网/Tailscale
// v1.9.4 修复 capture 静默局域网/Tailscale 不生效 + 静音窗口 3s→12s 对齐文档 | 覆盖 192.168.*/100.*/*.ts.net:4096
// v1.9.3 修复拖拽文字到输入框双插/蓝底选中（输入框统一受控 execCommand）+ CODE_WRAP 右移 48px避让复制 + 默认换行
// v1.9.2 修复 CODE_WRAP 按钮与复制重叠（右移 40px+悬浮）+ 默认换行
// v1.9.1 修复草稿串台（事件驱动+切换隔离+发送清空）+ ESC 提速（fetch 透传 signal + 4 个 Observer 节流）
// v1.9.0 参考oc-remote优化：大图懒加载/降采样(>200KB) + 长输出折叠(>50行) + 粘贴压缩(1280px/WebP) + 智能滚动(手动暂停) + 推理折叠 + 指数退避重连(1s-30s) + token用量胶囊 + 草稿持久化 + 代码换行 + MODEL_QUOTA防抖
// v1.8.14 DS峰时紧凑修复：徽标缩至🔥峰时/🌙谷时/⏰将峰(9px)倒计时移至hover，周末全谷，解决名字被挤
// v1.8.13 DS峰时提醒(轻跟随opencode)：下拉/badge+倒计时 + 面板时钟条 + 底部胶囊，三处全加，解析 opencode.ai/docs/go 文案自动跟随，回退硬编码 09-12/14-18 BJT
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

  function zenHeaders() {
    var sid = localStorage.getItem('oc_zen_sid');
    if (!sid) {
      var rnd = '';
      for (var i = 0; i < 16; i++) rnd += Math.floor(Math.random() * 16).toString(16);
      sid = 'ses_' + rnd;
      try { localStorage.setItem('oc_zen_sid', sid); } catch (e) {}
    }
    return { 'x-opencode-session': sid };
  }

  var SETTINGS = [
    { key: 'goPanel', label: 'Go 额度面板', def: true },
    { key: 'tabCycle', label: 'Tab 键切换代理', def: true },
    { key: 'pasteImg', label: '粘贴图片', def: true },
    { key: 'pasteCompress', label: '粘贴图片压缩', def: true },
    { key: 'dragDrop', label: '拖拽链接/文字', def: true },
    { key: 'questionKeys', label: '选项键盘导航', def: true },
    { key: 'memSilence', label: '静音 capture 会话', def: true },
    { key: 'peakHint', label: 'DS峰时提醒', def: true },
    { key: 'maxQuota', label: '今日最大额度头条', def: true },
    { key: 'usageTop5', label: '用量区额度Top5', def: true },
    { key: 'largeImg', label: '大图懒加载', def: true },
    { key: 'toolFold', label: '长输出折叠', def: true },
    { key: 'smartScroll', label: '智能滚动', def: true },
    { key: 'reasonFold', label: '推理折叠', def: true },
    { key: 'draftSave', label: '草稿持久化', def: true },
    { key: 'codeWrap', label: '代码换行切换', def: true }
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
  var isLocalhost4096 = (host === 'localhost' || host === '127.0.0.1' || /^192\.168\.\d+\.\d+$/.test(host) || /^100\.\d+\.\d+\.\d+$/.test(host) || /\.ts\.net$/.test(host)) && port === '4096';
  var isMemWeb = (host === '127.0.0.1' || host === 'localhost') && port === '4747';

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

  // ════════════════════════════════════════════════════════════
  //  DS 峰谷时钟（轻跟随 opencode.ai/docs/go 文案，回退硬编码）
  // ════════════════════════════════════════════════════════════
  var PEAK_MODULE = (function () {
    var CACHE_KEY = 'oc_peak_rule';
    var CACHE_TTL = 6 * 60 * 60 * 1000;
    var DEFAULT_RULE = { segs: [[1, 4], [6, 10]], weekdays: [1, 2, 3, 4, 5] }; // UTC hours
    var _rule = null;
    var _cachedAt = 0;

    function parsePeakRule(html) {
      if (!html) return null;
      try {
        // strip tags to plain text for robust match, keep numbers and UTC
        var text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        // Try English: Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday through Friday
        var re = /Peak[^0-9]*?(\d{1,2}):(\d{2})\s*[—\-–to]+\s*(\d{1,2}):(\d{2})[^0-9]+(\d{1,2}):(\d{2})\s*[—\-–to]+\s*(\d{1,2}):(\d{2})\s*UTC/i;
        var m = text.match(re);
        if (m) {
          var s1 = Number(m[1]) + Number(m[2]) / 60;
          var e1 = Number(m[3]) + Number(m[4]) / 60;
          var s2 = Number(m[5]) + Number(m[6]) / 60;
          var e2 = Number(m[7]) + Number(m[8]) / 60;
          // weekday check: if text mentions Monday through Friday or 周一至周五 -> weekdays 1-5 else all
          var wd = [1, 2, 3, 4, 5];
          if (/weekend/i.test(text) && /including weekends/i.test(text)) wd = [1, 2, 3, 4, 5];
          // if explicitly says weekends are Off-Peak we keep 1-5
          return { segs: [[s1, e1], [s2, e2]], weekdays: wd };
        }
        // Fallback simple: find 4 times near UTC
        var simple = text.match(/(\d{1,2}):(\d{2})[^0-9]+(\d{1,2}):(\d{2})[^0-9]+(\d{1,2}):(\d{2})[^0-9]+(\d{1,2}):(\d{2})[^]*?UTC/i);
        if (simple) {
          var ss1 = Number(simple[1]) + Number(simple[2]) / 60;
          var ee1 = Number(simple[3]) + Number(simple[4]) / 60;
          var ss2 = Number(simple[5]) + Number(simple[6]) / 60;
          var ee2 = Number(simple[7]) + Number(simple[8]) / 60;
          return { segs: [[ss1, ee1], [ss2, ee2]], weekdays: [1, 2, 3, 4, 5] };
        }
      } catch (e2) {}
      return null;
    }

    function loadRuleFromCache() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (!obj || !obj.rule || !obj.ts) return null;
        if (Date.now() - obj.ts > CACHE_TTL) return null;
        return obj.rule;
      } catch (e3) { return null; }
    }
    function saveRule(rule) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rule: rule, ts: Date.now() })); } catch (e4) {}
      _rule = rule; _cachedAt = Date.now();
    }
    function getRule() {
      if (_rule && (Date.now() - _cachedAt < CACHE_TTL)) return _rule;
      var cached = loadRuleFromCache();
      if (cached) { _rule = cached; _cachedAt = Date.now(); return cached; }
      return DEFAULT_RULE;
    }
    function updateFromHtml(html) {
      var parsed = parsePeakRule(html);
      if (parsed) saveRule(parsed);
      return parsed || getRule();
    }
    function isPeakAt(date, rule) {
      rule = rule || getRule();
      var d = date || new Date();
      var wd = d.getUTCDay(); // 0 Sun - 6 Sat
      if (rule.weekdays.indexOf(wd) === -1) return false;
      var h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
      for (var i = 0; i < rule.segs.length; i++) {
        var s = rule.segs[i][0], e = rule.segs[i][1];
        if (h >= s && h < e) return true;
      }
      return false;
    }
    function nextSwitchAt(date, rule) {
      rule = rule || getRule();
      var cur = date ? new Date(date.getTime()) : new Date();
      // look ahead up to 8 days, minute granularity
      for (var step = 0; step < 8 * 24 * 60; step++) {
        var test = new Date(cur.getTime() + step * 60 * 1000);
        var curPeak = isPeakAt(cur, rule);
        var testPeak = isPeakAt(test, rule);
        if (curPeak !== testPeak) return test;
      }
      return null;
    }
    function formatCountdown(ms) {
      if (ms == null || ms < 0) return '-';
      var total = Math.floor(ms / 1000);
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      if (h > 0) return h + '时' + (m < 10 ? '0' : '') + m + '分';
      if (m > 0) return m + '分' + (s < 10 ? '0' : '') + s + '秒';
      return s + '秒';
    }
    function formatCountdownShort(ms) {
      if (ms == null || ms < 0) return '-';
      var total = Math.floor(ms / 1000);
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      if (h > 0) return h + '时' + m + '分';
      return m + '分';
    }
    function getState(date, rule) {
      rule = rule || getRule();
      date = date || new Date();
      var peak = isPeakAt(date, rule);
      var next = nextSwitchAt(date, rule);
      var remain = next ? (next.getTime() - date.getTime()) : null;
      var wd = date.getUTCDay();
      var isWeekend = (wd === 0 || wd === 6);
      return { isPeak: peak, isWeekend: isWeekend, nextAt: next, remainMs: remain, rule: rule, countdown: formatCountdownShort(remain), countdownFull: formatCountdown(remain) };
    }
    function ruleToBJTText(rule) {
      rule = rule || getRule();
      // Convert UTC segs to BJT (UTC+8)
      function toBJT(h) { var b = (h + 8) % 24; var hh = Math.floor(b); var mm = Math.round((b - hh) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
      var a = toBJT(rule.segs[0][0]) + '-' + toBJT(rule.segs[0][1]);
      var b = toBJT(rule.segs[1][0]) + '-' + toBJT(rule.segs[1][1]);
      return a + ' / ' + b + ' BJT';
    }
    return {
      DEFAULT_RULE: DEFAULT_RULE,
      parsePeakRule: parsePeakRule,
      getRule: getRule,
      updateFromHtml: updateFromHtml,
      isPeakAt: isPeakAt,
      nextSwitchAt: nextSwitchAt,
      formatCountdown: formatCountdown,
      formatCountdownShort: formatCountdownShort,
      getState: getState,
      ruleToBJTText: ruleToBJTText
    };
  })();

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
      'muse-spark-1.3-contributor': 'meta/muse-spark-1.3-contributor',
      'muse-spark-1.2-contributor': 'meta/muse-spark-1.2-contributor',
      'qwen3.8-max': 'qwen/qwen3.8-max',
      'qwen3.8-flash': 'qwen/qwen3.8-flash',
      'qwen3.7-max': 'qwen/qwen3.7-max',
      'qwen3.7-plus': 'qwen/qwen3.7-plus',
      'qwen3.6-plus': 'qwen/qwen3.6-plus',
      'deepseek-v4-pro': 'deepseek/deepseek-v4-pro-0813',
      'deepseek-v4-flash': 'deepseek/deepseek-v4-flash-0731',
      'deepseek-v4-flash-vision-exp': 'deepseek/deepseek-v4-flash-vision-exp',
      'hy4-preview': 'tencent/hy4-preview',
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
      'muse-spark-1.3-contributor': { context: 1000000, modalities: ['text', 'image'],   reasoning: false, country: '美国', cap: 4, aaScore: 57.5, speed: 215.0, trainedOnUserData: true },
      'muse-spark-1.2-contributor': { context: 1000000, modalities: ['text', 'image'],   reasoning: false, country: '美国', cap: 4, aaScore: 56.8, speed: 211.7, trainedOnUserData: true },
      'qwen3.8-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 8, aaScore: 58.1, speed: 22.8 },
      'qwen3.8-flash':           { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 6, aaScore: 55.8, speed: 74.0 },
      'qwen3.7-max':             { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7, aaScore: 46.7, speed: 205.2 },
      'qwen3.7-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 39.4, speed: 55.9 },
      'qwen3.6-plus':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 6, aaScore: 40.5, speed: 56.6 },
      'deepseek-v4-pro':         { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 9, aaScore: 53.2, speed: 66.3 },
      'deepseek-v4-flash':       { context: 1000000, modalities: ['text'],               reasoning: true,  country: '中国', cap: 7, aaScore: 51.8, speed: 121.8 },
      'deepseek-v4-flash-vision-exp': { context: 1000000, modalities: ['text', 'image'], reasoning: true,  country: '中国', cap: 7, aaScore: 52.0, speed: 119.3 },
      'hy4-preview':            { context: 256000, modalities: ['text'],                reasoning: true,  country: '中国', cap: 5 },
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
        ["Grok 4.6","169","423","845"],["GPT 5.6 Luna","2,050","5,100","10,250"],["GLM-5.3-Flash","1,580","3,950","7,900"],["GLM-5.3","220","540","1,080"],["GLM-5.2","880","2,150","4,300"],["GLM-5.1","880","2,150","4,300"],["Kimi K3","110","250","490"],["Kimi K2.7 Code","1,350","3,380","6,750"],["Kimi K2.6","1,150","2,880","5,750"],["LongCat-2.0","11,400","28,600","57,200"],["MiMo-V2.5","30,100","75,200","150,400"],["MiMo-V2.5-Pro","3,250","8,150","16,300"],["MiniMax M3","3,200","8,000","16,000"],["MiniMax M2.7","3,400","8,500","17,000"],["Muse Spark 1.3 Contributor","45,300","113,300","226,600"],["Muse Spark 1.2 Contributor","45,300","113,300","226,600"],["Qwen3.8 Max","160","400","810"],["Qwen3.8 Flash","5,400","13,500","27,000"],["Qwen3.7 Max","340","840","1,690"],["Qwen3.7 Plus","4,300","10,800","21,600"],["Qwen3.6 Plus","3,300","8,200","16,300"],["DeepSeek V4 Pro","1,050","2,600","5,200"],["DeepSeek V4 Flash","7,600","18,900","37,800"],["DeepSeek V4 Flash Vision Exp","3,800","9,450","18,900"],["Hy4 preview","1,350","3,380","6,770"],["Hy3","4,300","10,750","21,500"]
      ],
      prices: [
        ["Grok 4.6","$2.00","$6.00","$0.50","-","$15"],["GPT 5.6 Luna","$0.20","$1.20","$0.02","$0.25","$15"],["GLM-5.3-Flash","$0.15","$0.50","$0.03","-","$15"],["GLM-5.3","$1.40","$4.40","$0.26","-","$15"],["GLM-5.2","$1.40","$4.40","$0.26","-","$60"],["GLM-5.1","$1.40","$4.40","$0.26","-","$60"],["Kimi K3","$3.00","$15.00","$0.30","-","$15"],["Kimi K2.7 Code","$0.95","$4.00","$0.19","-","$60"],["Kimi K2.6","$0.95","$4.00","$0.16","-","$60"],["LongCat-2.0","$0.30","$1.20","$0.006","-","$60"],["MiMo V2.5","$0.14","$0.28","$0.0028","-","$60"],["MiMo V2.5 Pro","$0.435","$0.87","$0.003625","-","$15"],["MiniMax M3","$0.30","$1.20","$0.06","-","$60"],        ["MiniMax M2.7","$0.30","$1.20","$0.06","$0.375","$60"],["Muse Spark 1.3 Contributor","$0.10","$0.20","$0.002","-","$60"],["Muse Spark 1.2 Contributor","$0.10","$0.20","$0.002","-","$60"],["Qwen3.8 Max","$2.00","$6.00","$0.25","$2.50","$15"],["Qwen3.8 Flash","$0.15","$0.47","$0.016","$0.20","$30"],["Qwen3.7 Max","$2.50","$7.50","$0.50","$3.125","$60"],["Qwen3.7 Plus","$0.40","$1.60","$0.04","$0.50","$60"],["Qwen3.6 Plus","$0.50","$3.00","$0.05","$0.625","$60"],["DeepSeek V4 Pro (Off-Peak)","$0.66","$1.98","$0.022","-","$15"],["DeepSeek V4 Flash (Off-Peak)","$0.22","$0.66","$0.007","-","$30"],["DeepSeek V4 Flash Vision Exp (Off-Peak)","$0.22","$0.66","$0.007","-","$15"],["Hy4 preview","$0.834","$2.501","$0.042","-","$30"],["Hy3","$0.14","$0.58","$0.035","-","$60"]
      ],
      endpoints: [
        ["Grok 4.6","grok-4.6"],["GPT 5.6 Luna","gpt-5.6-luna"],["GLM-5.3-Flash","glm-5.3-flash"],["GLM-5.3","glm-5.3"],["GLM-5.2","glm-5.2"],["GLM-5.1","glm-5.1"],["Kimi K3","kimi-k3"],["Kimi K2.7 Code","kimi-k2.7-code"],["Kimi K2.6","kimi-k2.6"],["LongCat-2.0","longcat-2.0"],["DeepSeek V4 Pro","deepseek-v4-pro"],["DeepSeek V4 Flash","deepseek-v4-flash"],["DeepSeek V4 Flash Vision Exp","deepseek-v4-flash-vision-exp"],["Hy4 preview","hy4-preview"],["MiMo-V2.5","mimo-v2.5"],["MiMo-V2.5-Pro","mimo-v2.5-pro"],["MiniMax M3","minimax-m3"],        ["MiniMax M2.7","minimax-m2.7"],["Muse Spark 1.3 Contributor","muse-spark-1.3-contributor"],["Muse Spark 1.2 Contributor","muse-spark-1.2-contributor"],["Qwen3.8 Max","qwen3.8-max"],["Qwen3.8 Flash","qwen3.8-flash"],["Qwen3.7 Max","qwen3.7-max"],["Qwen3.7 Plus","qwen3.7-plus"],["Qwen3.6 Plus","qwen3.6-plus"],["Hy3","hy3"]
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
      return fetch(ZEN_API, { credentials: 'omit', headers: zenHeaders() })
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

      // DS 峰谷时钟条（B）
      var peakBar = null;
      if (getSetting('peakHint', true)) {
        peakBar = document.createElement('div');
        peakBar.id = 'oc-peak-bar';
        peakBar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;border:1px solid #333;border-radius:8px;background:rgba(255,255,255,.04);font-size:11px;line-height:1.4;';
        panel.appendChild(peakBar);
        (function updatePeakBar() {
          if (!peakBar || !peakBar.parentNode) return;
          var st = PEAK_MODULE.getState(new Date());
          var isPeak = st.isPeak;
          var bjtText = PEAK_MODULE.ruleToBJTText(st.rule);
          if (isPeak) {
            peakBar.style.borderColor = 'rgba(248,81,73,.35)';
            peakBar.style.background = 'rgba(248,81,73,.08)';
            peakBar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#fff;background:#f85149;">🔥 峰时·2x</span>' +
              '<span style="color:#e0e0e0;">距谷时 <strong style="color:#fff;">' + st.countdown + '</strong></span>' +
              '<span style="opacity:.6;">| 峰时 ' + bjtText + ' 周末全谷 · 峰时计费翻倍，建议切 MiMo/Qwen</span>';
          } else {
            var warn = st.remainMs != null && st.remainMs < 30 * 60 * 1000;
            if (warn) {
              peakBar.style.borderColor = 'rgba(210,153,34,.35)';
              peakBar.style.background = 'rgba(210,153,34,.08)';
              peakBar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#111;background:#d29922;">⏰ ' + st.countdown + '后峰时</span>' +
                '<span style="color:#e0e0e0;">🌙 谷时</span>' +
                '<span style="opacity:.6;">| ' + bjtText + ' 周末全谷 · 谷时 0.5x 抓紧用 DS</span>';
            } else {
              peakBar.style.borderColor = 'rgba(46,160,67,.35)';
              peakBar.style.background = 'rgba(46,160,67,.08)';
              peakBar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#fff;background:#2ea043;">🌙 谷时</span>' +
                '<span style="color:#e0e0e0;">距峰时 <strong style="color:#fff;">' + st.countdown + '</strong></span>' +
                '<span style="opacity:.6;">| ' + bjtText + ' 周末全谷 · 峰时×2 轻跟随 opencode.ai/docs/go</span>';
            }
          }
        })();
        // store timer on panel for cleanup
        var peakTimer = setInterval(function () {
          if (!document.getElementById('oc-go-panel') || !document.getElementById('oc-peak-bar')) { clearInterval(peakTimer); return; }
          var bar = document.getElementById('oc-peak-bar');
          if (!bar) { clearInterval(peakTimer); return; }
          var st2 = PEAK_MODULE.getState(new Date());
          var isPeak2 = st2.isPeak;
          var bjt2 = PEAK_MODULE.ruleToBJTText(st2.rule);
          if (isPeak2) {
            bar.style.borderColor = 'rgba(248,81,73,.35)';
            bar.style.background = 'rgba(248,81,73,.08)';
            bar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#fff;background:#f85149;">🔥 峰时·2x</span>' +
              '<span style="color:#e0e0e0;">距谷时 <strong style="color:#fff;">' + st2.countdown + '</strong></span>' +
              '<span style="opacity:.6;">| 峰时 ' + bjt2 + ' 周末全谷 · 峰时计费翻倍，建议切 MiMo/Qwen</span>';
          } else {
            var warn2 = st2.remainMs != null && st2.remainMs < 30 * 60 * 1000;
            if (warn2) {
              bar.style.borderColor = 'rgba(210,153,34,.35)';
              bar.style.background = 'rgba(210,153,34,.08)';
              bar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#111;background:#d29922;">⏰ ' + st2.countdown + '后峰时</span>' +
                '<span style="color:#e0e0e0;">🌙 谷时</span>' +
                '<span style="opacity:.6;">| ' + bjt2 + ' 周末全谷 · 谷时 0.5x 抓紧用 DS</span>';
            } else {
              bar.style.borderColor = 'rgba(46,160,67,.35)';
              bar.style.background = 'rgba(46,160,67,.08)';
              bar.innerHTML = '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;color:#fff;background:#2ea043;">🌙 谷时</span>' +
                '<span style="color:#e0e0e0;">距峰时 <strong style="color:#fff;">' + st2.countdown + '</strong></span>' +
                '<span style="opacity:.6;">| ' + bjt2 + ' 周末全谷 · 峰时×2 轻跟随 opencode.ai/docs/go</span>';
            }
          }
        }, 10000);
        peakBar._timer = peakTimer;
      }

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

    function usageTopRanks(requests, limit) {
      var byMonth = {};
      requests.forEach(function (r) {
        var name = (r[0] || '').trim();
        var m = parseNum(r[3]);
        if (!name || !m) return;
        if (!byMonth[m]) byMonth[m] = [];
        byMonth[m].push(name);
      });
      var months = Object.keys(byMonth).map(Number).sort(function (a, b) { return b - a; });
      var rows = [];
      for (var i = 0; i < months.length && rows.length < limit; i++) {
        var names = byMonth[months[i]].slice().sort(function (a, b) { return a < b ? -1 : 1; });
        rows.push({ reqMonth: months[i], names: names, keys: names.map(function (n) { return norm(n); }) });
      }
      return rows;
    }
    function shortUsageName(name) {
      return (name || '').replace(/ Contributor$/i, '').replace(/^Muse Spark/i, 'Muse').trim();
    }
    function usageMetaByNorm(id) {
      var ks = Object.keys(MODEL_META);
      for (var k = 0; k < ks.length; k++) { if (norm(ks[k]) === id) return MODEL_META[ks[k]]; }
      return null;
    }
    function paintUsageTop(el, rows, today) {
      while (el.firstChild) el.removeChild(el.firstChild);
      var head = document.createElement('div');
      head.style.cssText = 'font-weight:700;margin-bottom:2px;';
      head.textContent = '🏆 Go月额度Top5 · ' + today + '更新';
      el.appendChild(head);
      rows.forEach(function (row, i) {
        var line = document.createElement('div');
        line.style.cssText = 'display:flex;align-items:baseline;gap:6px;line-height:17px;' + (i === 0 ? 'color:#e8c547;font-weight:700;' : 'color:#bdbdbd;');
        var rank = document.createElement('span');
        rank.style.cssText = 'flex:none;width:12px;opacity:.8;';
        rank.textContent = String(i + 1);
        var nm = document.createElement('span');
        nm.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nm.textContent = row.names.map(shortUsageName).join(' / ');
        nm.title = row.names.join(' / ');
        line.appendChild(rank); line.appendChild(nm);
        var country = null, scoreInfo = null;
        for (var ci = 0; ci < row.keys.length; ci++) {
          var meta = usageMetaByNorm(row.keys[ci]);
          if (!meta) continue;
          if (!country && meta.country) country = meta.country;
          var s = Math.round(meta.aaScore || meta.cap * 10);
          if (s && (!scoreInfo || s > scoreInfo.score)) scoreInfo = { score: s, color: scoreColor(s) };
        }
        if (country) {
          var ct = document.createElement('span');
          ct.style.cssText = 'flex:none;opacity:.65;font-weight:400;';
          ct.textContent = '(' + country + ')';
          line.appendChild(ct);
        }
        if (scoreInfo) {
          var sc = document.createElement('span');
          sc.style.cssText = 'flex:none;font-weight:700;';
          try { sc.style.color = scoreInfo.color; } catch (eC) {}
          sc.textContent = scoreInfo.score + '分';
          sc.title = 'AA 智力指数';
          line.appendChild(sc);
        }
        var num = document.createElement('span');
        num.style.cssText = 'flex:none;font-variant-numeric:tabular-nums;';
        num.textContent = row.reqMonth.toLocaleString() + '/月';
        line.appendChild(num);
        el.appendChild(line);
      });
      el.title = rows.map(function (row, i) { return (i + 1) + '. ' + row.names.join(' / ') + ' ' + row.reqMonth.toLocaleString() + '/月'; }).join('\n') + '\n数据来自 docs/go';
    }
    function findUsageContainer() {
      var week = null, month = null;
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var tn;
      while ((tn = walker.nextNode())) {
        var v = tn.nodeValue || '';
        if (!week && v.indexOf('每周用量') !== -1) week = tn.parentElement;
        else if (!month && v.indexOf('每月用量') !== -1) month = tn.parentElement;
        if (week && month) break;
      }
      if (!week || !month) return null;
      var chain = [];
      var a = week;
      while (a && a !== document.body && a !== document.documentElement) { chain.push(a); a = a.parentElement; }
      var b = month, best = null;
      while (b && b !== document.body && b !== document.documentElement) {
        if (chain.indexOf(b) !== -1) {
          if (b.textContent.indexOf('每周用量') !== -1 && b.textContent.indexOf('每月用量') !== -1) best = b;
          break;
        }
        b = b.parentElement;
      }
      return best;
    }
    function injectUsageTop5(container, requests) {
      var rows = usageTopRanks(requests, 5);
      if (!rows.length) return;
      var today = new Date().toLocaleDateString('zh-CN');
      var parent = container.parentElement;
      if (!parent) return;
      var el = document.getElementById('oc-usage-top5');
      if (el && el.parentElement !== parent) { try { el.remove(); } catch (eR) { el = null; } }
      if (!el) {
        el = document.createElement('div');
        el.id = 'oc-usage-top5';
        el.style.cssText = 'display:block;box-sizing:border-box;background:#1c1a12;color:#e0e0e0;font-size:11px;padding:8px 12px;border:1px solid #333;border-radius:10px;line-height:1.4;margin-bottom:12px;';
        try { parent.insertBefore(el, container); } catch (eI) { return; }
      }
      paintUsageTop(el, rows, today);
    }
    function loadUsageTop5(container) {
      function done(requests) {
        try { injectUsageTop5(container, requests); } catch (e) {}
      }
      try {
        fetch(DOCS_URL, { credentials: 'omit', headers: zenHeaders() }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }).then(function (html) {
          if (html) {
            try {
              var tables = parseTables(html);
              if (tables && tables.requests && tables.requests.length) { done(tables.requests); return; }
            } catch (eP) {}
          }
          done(SNAPSHOT.requests);
        });
      } catch (eF) { done(SNAPSHOT.requests); }
    }
    function initUsageTop5() {
      if (!isOpencodeAi) return;
      if (!getSetting('usageTop5', true)) { var stale = document.getElementById('oc-usage-top5'); if (stale) { try { stale.remove(); } catch (eR2) {} } return; }
      if (location.pathname.indexOf('/workspace') === -1) return;
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        try {
          if (document.getElementById('oc-usage-top5')) { clearInterval(timer); return; }
          var container = findUsageContainer();
          if (container) { clearInterval(timer); loadUsageTop5(container); return; }
          if (tries >= 30) clearInterval(timer);
        } catch (eT) { clearInterval(timer); }
      }, 2000);
    }

    function loadAndInject(forceRefresh) {
      if (document.getElementById('oc-go-panel')) return;
      Promise.all([
        fetch(DOCS_URL, { credentials: 'omit', headers: zenHeaders() }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }),
        fetch(MODELS_API, { credentials: 'omit', headers: zenHeaders() }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        fetchOpenRouterData(),
        fetchZenFreeModels()
      ]).then(function (results) {
        var html = results[0], apiData = results[1], orData = results[2], zenFree = results[3];
        if (html) {
          try { PEAK_MODULE.updateFromHtml(html); } catch (ePeak) {}
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
      try { initUsageTop5(); } catch (eU) {}
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
        if (getSetting('pasteCompress', true) && typeof PASTE_COMPRESS_MODULE !== 'undefined' && PASTE_COMPRESS_MODULE.compress) {
          PASTE_COMPRESS_MODULE.compress(file).then(function (compressed) { tryNativeDrop(compressed); }).catch(function () { tryNativeDrop(file); });
        } else {
          tryNativeDrop(file);
        }
      }, true);
      console.log(TAG, '粘贴图片已启用' + (getSetting('pasteCompress', true) ? ' (压缩)' : ''));
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
        var done = false;
        try { done = document.execCommand('insertText', false, text); } catch (e3) {}
        if (!done) {
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
        }
        try { target.dispatchEvent(new InputEvent('input', { data: text, bubbles: true, inputType: 'insertText' })); } catch (e4) { target.dispatchEvent(new Event('input', { bubbles: true })); }
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
      var isOverInput = false;
      try { isOverInput = !!(e.target && e.target.closest && e.target.closest('[contenteditable], textarea, input')); } catch (e2) {}
      if (!isTextTypesDrag(e)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {}
      if (!isOverInput) hideOverlay();
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
              try { PEAK_MODULE.updateFromHtml(html); } catch (eP) {}
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
          fetch('https://opencode.ai/docs/go/', { credentials: 'omit', headers: zenHeaders() })
            .then(function (r) { return r.ok ? r.text() : null; })
            .catch(function () { return null; })
            .then(function (html) {
              if (!html) { resolve(); return; }
              try { PEAK_MODULE.updateFromHtml(html); } catch (eP2) {}
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

    function isDeepSeekModel(modelId) {
      if (!modelId) return false;
      return modelId.indexOf('deepseek') !== -1;
    }
    function buildPeakBadge(modelId) {
      if (!getSetting('peakHint', true)) return null;
      if (!isDeepSeekModel(modelId)) return null;
      var st = PEAK_MODULE.getState(new Date());
      var span = document.createElement('span');
      span.className = 'oc-peak-tag';
      var remain = st.countdown;
      var warn = st.remainMs != null && st.remainMs < 30 * 60 * 1000;
      if (st.isPeak) {
        span.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#fff;background:#f85149;margin-left:4px;white-space:nowrap;flex-shrink:0;';
        span.textContent = '🔥峰时';
        span.title = '距谷时 ' + remain + ' | 北京时间 09:00-12:00 / 14:00-18:00 峰时（' + PEAK_MODULE.ruleToBJTText(st.rule) + '）周末全谷 · 峰时×2';
      } else if (warn) {
        span.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#111;background:#d29922;margin-left:4px;white-space:nowrap;flex-shrink:0;';
        span.textContent = '⏰将峰';
        span.title = remain + '后峰时 | ' + PEAK_MODULE.ruleToBJTText(st.rule) + ' 周末全谷 · 峰时×2 抓紧用';
      } else {
        span.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#fff;background:#2ea043;margin-left:4px;white-space:nowrap;flex-shrink:0;';
        span.textContent = '🌙谷时';
        span.title = '距峰时 ' + remain + ' | 谷时 0.5x ' + PEAK_MODULE.ruleToBJTText(st.rule) + ' 周末全谷';
      }
      return span;
    }
    function refreshPeakTags() {
      if (!getSetting('peakHint', true)) {
        document.querySelectorAll('.oc-peak-tag').forEach(function (el) { el.style.display = 'none'; });
        return;
      }
      document.querySelectorAll('.oc-peak-tag').forEach(function (el) {
        var mid = el.getAttribute('data-peak-model') || '';
        var st = PEAK_MODULE.getState(new Date());
        var remain = st.countdown;
        var warn = st.remainMs != null && st.remainMs < 30 * 60 * 1000;
        if (st.isPeak) {
          el.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#fff;background:#f85149;margin-left:4px;white-space:nowrap;flex-shrink:0;';
          el.textContent = '🔥峰时';
          el.title = '距谷时 ' + remain + ' | 峰时×2 ' + PEAK_MODULE.ruleToBJTText(st.rule);
        } else if (warn) {
          el.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#111;background:#d29922;margin-left:4px;white-space:nowrap;flex-shrink:0;';
          el.textContent = '⏰将峰';
          el.title = remain + '后峰时 | ' + PEAK_MODULE.ruleToBJTText(st.rule);
        } else {
          el.style.cssText = 'display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;color:#fff;background:#2ea043;margin-left:4px;white-space:nowrap;flex-shrink:0;';
          el.textContent = '🌙谷时';
          el.title = '距峰时 ' + remain + ' | 谷时 ' + PEAK_MODULE.ruleToBJTText(st.rule);
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
        tag.textContent = quota.reqMonth.toLocaleString() + '/月';
        var tipLines = [quota.name + ' ' + quota.reqMonth.toLocaleString() + '/月'];
        if (quota.req5h) tipLines.push('5h ' + quota.req5h.toLocaleString());
        if (country) tipLines.push('国家 ' + country);
        if (scoreInfo) tipLines.push('评分 ' + scoreInfo.score + '分');
        if (privacyInfo && privacyInfo.trainedOnUserData) tipLines.push('⚠ 会用请求数据训练');
        tipLines.push('数据来自 docs/go');
        tag.title = tipLines.join('\n');
        if (!item.title) item.title = tipLines.join('\n');
        item.appendChild(tag);
        // DS 峰时 badge (A)
        var peakBadge = buildPeakBadge(modelId);
        if (peakBadge) {
          peakBadge.setAttribute('data-peak-model', modelId);
          item.appendChild(peakBadge);
        }
      });
      console.log(TAG, 'Injected quotas into', items.length, 'dropdown items');
      try { injectMaxHead(items); } catch (eH) {}
      try { highlightMaxRows(items); } catch (eH2) {}
      try { checkMaxChange(); } catch (eH3) {}
    }

    function computeMax() {
      var max = 0, tops = [];
      Object.keys(quotaMap).forEach(function (k) {
        var q = quotaMap[k];
        if (q && q.reqMonth > max) max = q.reqMonth;
      });
      if (!max) return null;
      Object.keys(quotaMap).forEach(function (k) {
        if (quotaMap[k] && quotaMap[k].reqMonth === max) tops.push(quotaMap[k]);
      });
      var second = null;
      Object.keys(quotaMap).forEach(function (k) {
        var q = quotaMap[k];
        if (q && q.reqMonth < max && (!second || q.reqMonth > second.reqMonth)) second = q;
      });
      return { max: max, tops: tops, second: second };
    }
    function findDropdownSearch() {
      var sels = ['input[placeholder*="搜索"]', 'input[placeholder*="Search"]', 'input[type="search"]'];
      for (var i = 0; i < sels.length; i++) {
        var inputs = document.querySelectorAll(sels[i]);
        for (var j = 0; j < inputs.length; j++) {
          var inp = inputs[j];
          var r = null;
          try { r = inp.getBoundingClientRect(); } catch (e) {}
          if (r && r.width > 100 && r.height > 0) return inp;
        }
      }
      return null;
    }
    function shortQuotaName(name) {
      return (name || '').replace(/ Contributor$/i, '').replace(/^Muse Spark/i, 'Muse').trim();
    }
    function topQuotaRanks(limit) {
      var byMonth = {};
      Object.keys(quotaMap).forEach(function (k) {
        var q = quotaMap[k];
        if (!q || !q.reqMonth) return;
        if (!byMonth[q.reqMonth]) byMonth[q.reqMonth] = [];
        byMonth[q.reqMonth].push({ key: k, name: q.name });
      });
      var months = Object.keys(byMonth).map(Number).sort(function (a, b) { return b - a; });
      var rows = [];
      for (var i = 0; i < months.length && rows.length < limit; i++) {
        var entries = byMonth[months[i]].slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        rows.push({ reqMonth: months[i], names: entries.map(function (e) { return e.name; }), keys: entries.map(function (e) { return e.key; }) });
      }
      return rows;
    }
    function paintTopBoard(el, rows, today) {
      while (el.firstChild) el.removeChild(el.firstChild);
      var head = document.createElement('div');
      head.style.cssText = 'font-weight:700;margin-bottom:2px;';
      head.textContent = '🏆 Go月额度Top5 · ' + today + '更新';
      el.appendChild(head);
      rows.forEach(function (row, i) {
        var line = document.createElement('div');
        line.style.cssText = 'display:flex;align-items:baseline;gap:6px;line-height:17px;' + (i === 0 ? 'color:#e8c547;font-weight:700;' : 'color:#bdbdbd;');
        var rank = document.createElement('span');
        rank.style.cssText = 'flex:none;width:12px;opacity:.8;';
        rank.textContent = String(i + 1);
        var nm = document.createElement('span');
        nm.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nm.textContent = row.names.map(shortQuotaName).join(' / ');
        nm.title = row.names.join(' / ');
        line.appendChild(rank); line.appendChild(nm);
        // 国家＋评分（并列取最高分，国家取首个有数据的，缺数据静默省略）
        var country = null, scoreInfo = null;
        for (var ci = 0; ci < row.keys.length; ci++) {
          if (!country && GO_MODULE.__getCountry) country = GO_MODULE.__getCountry(row.keys[ci]);
          if (GO_MODULE.__getScore) {
            var si = GO_MODULE.__getScore(row.keys[ci]);
            if (si && (!scoreInfo || si.score > scoreInfo.score)) scoreInfo = si;
          }
        }
        if (country) {
          var ct = document.createElement('span');
          ct.style.cssText = 'flex:none;opacity:.65;font-weight:400;';
          ct.textContent = '(' + country + ')';
          line.appendChild(ct);
        }
        if (scoreInfo) {
          var sc = document.createElement('span');
          sc.style.cssText = 'flex:none;font-weight:700;';
          try { sc.style.color = scoreInfo.color; } catch (eC) {}
          sc.textContent = scoreInfo.score + '分';
          sc.title = 'AA 智力指数';
          line.appendChild(sc);
        }
        var num = document.createElement('span');
        num.style.cssText = 'flex:none;font-variant-numeric:tabular-nums;';
        num.textContent = row.reqMonth.toLocaleString() + '/月';
        line.appendChild(num);
        el.appendChild(line);
      });
      el.title = rows.map(function (row, i) { return (i + 1) + '. ' + row.names.join(' / ') + ' ' + row.reqMonth.toLocaleString() + '/月'; }).join('\n') + '\n数据来自 docs/go';
    }
    function injectMaxHead(items) {
      if (!getSetting('maxQuota', true)) return;
      if (!items || !items.length) return;
      var rows = topQuotaRanks(5);
      if (!rows.length) return;
      var today = new Date().toLocaleDateString('zh-CN');
      // 首选：面板根＋搜索框之上（与分组列表平级，不伪装成模型行）
      var searchEl = findDropdownSearch();
      var panel = null, anchor = null;
      if (searchEl) {
        var n = items[0];
        while (n && n !== document.body && n !== document.documentElement) {
          if (n.contains(searchEl)) { panel = n; break; }
          n = n.parentElement;
        }
        if (panel) {
          anchor = searchEl;
          while (anchor && anchor.parentElement !== panel) anchor = anchor.parentElement;
          if (!anchor) panel = null;
        }
      }
      var el = document.getElementById('oc-max-head');
      var wantCss = 'display:block;width:100%;box-sizing:border-box;flex:none;flex-shrink:0;background:#1c1a12;color:#e0e0e0;font-size:11px;padding:6px 10px 7px;border-bottom:1px solid #d29922;line-height:1.4;cursor:default;pointer-events:none;';
      if (panel && anchor) {
        // 清掉旧位置（分组内）的残留头，避免重复
        var stale = panel.querySelectorAll('#oc-max-head');
        for (var s = 0; s < stale.length; s++) {
          if (stale[s] !== el) { try { stale[s].remove(); } catch (eR) {} }
        }
        if (!el || el.parentElement !== panel) {
          if (el && el.parentElement) { try { el.remove(); } catch (eR2) {} el = null; }
          el = document.createElement('div');
          el.id = 'oc-max-head';
          el.style.cssText = wantCss;
          try { panel.insertBefore(el, anchor); } catch (eI) { panel = null; }
        }
        if (panel && el) {
          el.style.cssText = wantCss;
          paintTopBoard(el, rows, today);
          return;
        }
      }
      // 回退：分组列表顶部 sticky（搜索框不可定位时）
      var container = items[0].parentElement;
      if (!container) return;
      el = container.querySelector('#oc-max-head');
      if (!el) {
        el = document.createElement('div');
        el.id = 'oc-max-head';
        el.style.cssText = 'position:sticky;top:0;z-index:5;' + wantCss;
        container.insertBefore(el, container.firstChild);
      } else {
        el.style.cssText = 'position:sticky;top:0;z-index:5;' + wantCss;
      }
      paintTopBoard(el, rows, today);
    }
    function highlightMaxRows(items) {
      if (!getSetting('maxQuota', true)) return;
      var info = computeMax();
      if (!info) return;
      items.forEach(function (item) {
        var key = item.getAttribute('data-option-key') || '';
        var modelId = key.split(':').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        var quota = quotaMap[modelId];
        if (!quota) {
          var keys = Object.keys(quotaMap);
          for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf(modelId) !== -1 || modelId.indexOf(keys[i]) !== -1) { quota = quotaMap[keys[i]]; break; }
          }
        }
        var crown = item.querySelector('.oc-max-crown');
        if (quota && quota.reqMonth === info.max) {
          item.style.outline = '1px solid #d29922';
          item.style.borderRadius = '6px';
          if (!item.dataset.ocRel) { item.dataset.ocRel = '1'; item.style.position = 'relative'; }
          if (!crown) {
            crown = document.createElement('span');
            crown.className = 'oc-max-crown';
            crown.textContent = '🏆';
            crown.style.cssText = 'position:absolute;left:0;top:-7px;font-size:9px;line-height:1;background:#1c1a12;border-radius:4px;padding:0 1px;pointer-events:none;';
            crown.title = '今日最大月额度 ' + info.max.toLocaleString() + '/月';
            item.appendChild(crown);
          }
          // 行名超长后缀缩写（全名保留在 hover），省出行内空间
          try {
            var walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null);
            var tn, targets = [];
            while ((tn = walker.nextNode())) targets.push(tn);
            targets.forEach(function (t) {
              var p = t.parentElement;
              if (p && (p.closest('.oc-quota-tag') || p.closest('.oc-peak-tag') || p.classList.contains('oc-max-crown'))) return;
              if (t.nodeValue && t.nodeValue.indexOf(' Contributor') !== -1) t.nodeValue = t.nodeValue.replace(/ Contributor/g, '');
            });
          } catch (eT) {}
        } else {
          if (item.style.outline === '1px solid rgb(210, 153, 34)') { item.style.outline = ''; item.style.borderRadius = ''; }
          if (item.dataset.ocRel) { delete item.dataset.ocRel; item.style.position = ''; }
          if (crown) crown.remove();
        }
      });
    }
    function checkMaxChange() {
      if (!getSetting('maxQuota', true)) return;
      var info = computeMax();
      if (!info) return;
      var cur = info.tops.map(function (t) { return t.name; }).sort().join('|') + '|' + info.max;
      var prev = null, prevDate = null;
      try { prev = S('maxquota_v1'); prevDate = S('maxquota_date'); } catch (e) {}
      var today = new Date().toLocaleDateString('zh-CN');
      if (prev && prev !== cur) {
        try { toast('🏆 Go最大额度变更：' + info.tops.map(function (t) { return t.name; }).join('/') + ' ' + info.max.toLocaleString() + '/月', '#d29922'); } catch (eT) {}
      } else if (prevDate !== today) {
        try { toast('🏆今日最大 ' + info.tops.map(function (t) { return t.name; }).join('/') + ' ' + info.max.toLocaleString() + '/月', '#2ea043'); } catch (eT2) {}
      }
      try { S('maxquota_v1', cur); S('maxquota_date', today); } catch (eS) {}
    }

    function findBottomModelEl() {
      // Heuristic: bottom bar model button - try a few selectors, fallback to text scan near bottom
      var el = document.querySelector('[data-component="model-selector"]') ||
               document.querySelector('[data-testid="model-selector"]') ||
               document.querySelector('button[aria-label*="model" i]') ||
               null;
      if (el) return el;
      // fallback: scan buttons near bottom (last 150px)
      var btns = document.querySelectorAll('button');
      var best = null;
      var bestY = -1;
      for (var i = 0; i < btns.length; i++) {
        try {
          var r = btns[i].getBoundingClientRect();
          if (r.top > window.innerHeight - 160 && r.width > 80 && r.height > 20) {
            var txt = (btns[i].textContent || '').toLowerCase();
            if (txt.indexOf('muse') !== -1 || txt.indexOf('deepseek') !== -1 || txt.indexOf('mimo') !== -1 || txt.indexOf('qwen') !== -1 || txt.indexOf('glm') !== -1 || txt.indexOf('kimi') !== -1 || txt.indexOf('grok') !== -1 || txt.indexOf('minimax') !== -1 || txt.indexOf('hy') !== -1) {
              if (r.top > bestY) { bestY = r.top; best = btns[i]; }
            }
          }
        } catch (e2) {}
      }
      return best;
    }
    function updateBottomBadge() {
      if (!getSetting('peakHint', true)) {
        var old = document.getElementById('oc-bottom-peak');
        if (old) old.remove();
        return;
      }
      var btn = findBottomModelEl();
      if (!btn) return;
      var txt = (btn.textContent || '').toLowerCase();
      var isDS = txt.indexOf('deepseek') !== -1;
      var existing = document.getElementById('oc-bottom-peak');
      if (!isDS) {
        if (existing) existing.remove();
        return;
      }
      var st = PEAK_MODULE.getState(new Date());
      var label = st.isPeak ? '🔥峰时' : (st.remainMs < 30 * 60 * 1000 ? '⏰将峰' : '🌙谷时');
      var bg = st.isPeak ? '#f85149' : (st.remainMs < 30 * 60 * 1000 ? '#d29922' : '#2ea043');
      var fg = (st.remainMs < 30 * 60 * 1000 && !st.isPeak) ? '#111' : '#fff';
      if (!existing) {
        existing = document.createElement('span');
        existing.id = 'oc-bottom-peak';
        existing.style.cssText = 'display:inline-flex;align-items:center;padding:1px 5px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap;margin-left:4px;vertical-align:middle;flex-shrink:0;';
        existing.title = '北京时间 09:00-12:00 / 14:00-18:00 峰时，周末全谷 · ' + PEAK_MODULE.ruleToBJTText(st.rule);
        // insert after button or inside
        try { btn.parentNode.insertBefore(existing, btn.nextSibling); } catch (e3) { btn.appendChild(existing); }
      }
      existing.style.background = bg;
      existing.style.color = fg;
      existing.textContent = label;
      existing.title = (st.isPeak ? '距谷时 ' + st.countdown + ' | 峰时×2 ' : '距峰时 ' + st.countdown + ' | 谷时 ') + PEAK_MODULE.ruleToBJTText(st.rule) + ' 周末全谷';
    }

    function ensureCompactStyle() {
      if (document.getElementById('oc-peak-compact-style')) return;
      var st = document.createElement('style');
      st.id = 'oc-peak-compact-style';
      st.textContent = '[data-option-key]{display:flex!important;align-items:center!important;gap:4px!important;min-width:0!important} [data-option-key] .oc-quota-tag,[data-option-key] .oc-peak-tag{flex-shrink:0!important}';
      (document.head || document.documentElement).appendChild(st);
    }
    function init() {
      ensureCompactStyle();
      fetchQuotaMap().then(function () {
        // Also try injecting if dropdown already open
        injectQuotasIntoDropdown();
        try { updateBottomBadge(); } catch (eB) {}
      });

      // Watch for dropdown opening (debounced 300ms to avoid SSE-driven DOM churn)
      var debounceTimer = null;
      var observer = new MutationObserver(function () {
        if (!document.querySelector('[data-option-key]')) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          injectQuotasIntoDropdown();
          try { updateBottomBadge(); } catch (eB2) {}
        }, 300);
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      // Refresh peak countdowns every 30s (A) + bottom badge (D)
      setInterval(function () {
        try { refreshPeakTags(); } catch (eR) {}
        try { updateBottomBadge(); } catch (eB3) {}
      }, 30000);
      // also immediate 60s timer for dropdown already open
      setInterval(function () {
        if (document.querySelector('[data-option-key]')) {
          try { refreshPeakTags(); } catch (eR2) {}
        }
      }, 15000);

      console.log(TAG, 'MODEL_QUOTA initialized (dropdown+peak mode) A+B+D');
    }

    return { init: init, _refreshPeakTags: refreshPeakTags, _updateBottomBadge: updateBottomBadge };
  })();

  // ════════════════════════════════════════════════════════════
  //  后端连接监测 (仅 localhost:4096)
  // ════════════════════════════════════════════════════════════
  var CONNECTION_MODULE = (function () {
    var origTitle = '';
    var disconnected = false;
    var failCount = 0;
    var probeTimer = null;
    var currentInterval = 5000;
    var MIN_INTERVAL = 1000;
    var MAX_INTERVAL = 10000;
    var origFetch = window.fetch;
    var bannerEl = null;
    var reloadTimer = null;
    var countdownTimer = null;
    var reconnectAt = 0;
    function ensureStyle() {
      if (document.getElementById('oc-conn-style')) return;
      var st = document.createElement('style');
      st.id = 'oc-conn-style';
      st.textContent = '#oc-disconnected-banner{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%) translateY(8px);opacity:0;z-index:2147483647;max-width:520px;width:calc(100% - 32px);padding:11px 14px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:12px;line-height:1.4;transition:opacity 180ms,transform 180ms,border-color 300ms,background 300ms;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);pointer-events:auto;box-shadow:0 12px 28px rgba(0,0,0,.18)}#oc-disconnected-banner.oc-visible{opacity:1;transform:translateX(-50%) translateY(0)}#oc-disconnected-banner .oc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;animation:oc-pulse 1.6s infinite}#oc-disconnected-banner.oc-state-offline{border:1px solid rgba(255,255,255,.10);background:rgba(22,22,22,.88);color:#e6edf3;box-shadow:0 12px 28px rgba(0,0,0,.45)}#oc-disconnected-banner.oc-state-offline .oc-dot{background:#f85149;box-shadow:0 0 0 6px rgba(248,81,73,.18)}#oc-disconnected-banner.oc-state-online{border:1px solid rgba(255,255,255,.10);background:rgba(16,24,18,.92);color:#e6edf3;box-shadow:0 12px 28px rgba(0,0,0,.45)}#oc-disconnected-banner.oc-state-online .oc-dot{background:#2ea043;box-shadow:0 0 0 6px rgba(46,160,67,.18)}#oc-disconnected-banner .oc-text{flex:1;min-width:0}#oc-disconnected-banner .oc-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}#oc-disconnected-banner .oc-retry{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:inherit;font-size:11px;cursor:pointer}#oc-disconnected-banner .oc-retry:hover{background:rgba(255,255,255,.14)}#oc-disconnected-banner .oc-close{width:24px;height:24px;border-radius:6px;border:none;background:transparent;color:inherit;opacity:.6;cursor:pointer;font-size:14px;line-height:1}#oc-disconnected-banner .oc-close:hover{opacity:1;background:rgba(255,255,255,.08)}#oc-disconnected-banner .oc-progress-track{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.08);border-radius:0 0 12px 12px;overflow:hidden}#oc-disconnected-banner .oc-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#2ea043,#3fb950);transition:width 2s linear}@keyframes oc-pulse{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}@media(prefers-color-scheme:light){#oc-disconnected-banner.oc-state-offline{background:rgba(255,255,255,.94);border-color:rgba(0,0,0,.08);color:#24292f;box-shadow:0 12px 28px rgba(0,0,0,.12)}#oc-disconnected-banner.oc-state-online{background:rgba(242,255,242,.96);border-color:rgba(0,0,0,.08);color:#24292f}#oc-disconnected-banner.oc-state-offline .oc-dot{box-shadow:0 0 0 6px rgba(248,81,73,.12)}#oc-disconnected-banner.oc-state-online .oc-dot{box-shadow:0 0 0 6px rgba(46,160,67,.12)}#oc-disconnected-banner .oc-retry{border-color:rgba(0,0,0,.08);background:rgba(0,0,0,.04)}#oc-disconnected-banner .oc-retry:hover{background:rgba(0,0,0,.08)}#oc-disconnected-banner .oc-progress-track{background:rgba(0,0,0,.06)}}';
      (document.head || document.documentElement).appendChild(st);
    }
    function clearTimers() { if (reloadTimer) { clearTimeout(reloadTimer); reloadTimer = null; } if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
    function removeBanner() { clearTimers(); if (bannerEl && bannerEl.parentNode) bannerEl.remove(); bannerEl = null; reconnectAt = 0; }
    function createBanner() {
      if (bannerEl) return bannerEl;
      ensureStyle();
      var el = document.createElement('div');
      el.id = 'oc-disconnected-banner';
      el.className = 'oc-state-offline';
      el.innerHTML = '<span class="oc-dot"></span><span class="oc-text"><span class="oc-title">后端已断开 (4096)</span><span style="opacity:.65;margin-left:6px">等待重连…</span></span><span class="oc-actions"><button class="oc-retry" title="立即重试">重试</button><button class="oc-close" title="关闭">✕</button></span><div class="oc-progress-track" style="display:none"><div class="oc-progress-fill"></div></div>';
      var retry = el.querySelector('.oc-retry');
      var close = el.querySelector('.oc-close');
      if (retry) retry.addEventListener('click', function (e) { e.stopPropagation(); failCount = 0; probe(); toast('正在重试…', '#1f6feb'); });
      if (close) close.addEventListener('click', function (e) { e.stopPropagation(); removeBanner(); disconnected = false; try { document.title = origTitle || document.title.replace(/^● 掉线 - /, ''); } catch (err) {} });
      document.body.appendChild(el);
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('oc-visible'); }); });
      bannerEl = el;
      return el;
    }
    function switchToReconnect() {
      if (!bannerEl) bannerEl = createBanner();
      bannerEl.className = 'oc-state-online oc-visible';
      var track = bannerEl.querySelector('.oc-progress-track');
      var fill = bannerEl.querySelector('.oc-progress-fill');
      var text = bannerEl.querySelector('.oc-text');
      if (track) track.style.display = 'block';
      if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; void fill.offsetWidth; fill.style.transition = 'width 2s linear'; fill.style.width = '100%'; }
      var remain = 2.0;
      if (text) text.innerHTML = '<span class="oc-title">后端已重连</span><span style="opacity:.65;margin-left:6px" class="oc-countdown">' + remain.toFixed(1) + 's 后自动刷新</span>';
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(function () {
        remain -= 0.1;
        if (remain < 0) remain = 0;
        var cd = bannerEl && bannerEl.querySelector('.oc-countdown');
        if (cd) cd.textContent = remain.toFixed(1) + 's 后自动刷新';
        if (remain <= 0) clearInterval(countdownTimer);
      }, 100);
      // lock to avoid double reload within 10s
      try { if (sessionStorage.getItem('oc_reload_lock') && Date.now() - Number(sessionStorage.getItem('oc_reload_lock')) < 10000) return; } catch (e) {}
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(function () {
        try { sessionStorage.setItem('oc_reload_lock', String(Date.now())); } catch (e2) {}
        location.reload();
      }, 2000);
    }
    function setDisconnected(on) {
      if (on === disconnected && on) return;
      // if already disconnected and banner exists, keep banner
      if (on) {
        if (disconnected && bannerEl) return;
        disconnected = true;
        createBanner();
        try { if (document.title.indexOf('● 掉线') === -1) { origTitle = origTitle || document.title; document.title = '● 掉线 - ' + origTitle; } } catch (e) {}
      } else {
        if (!disconnected) return;
        disconnected = false;
        try { document.title = origTitle || document.title.replace(/^● 掉线 - /, ''); } catch (e2) {}
        toast('✓ 后端已重连', '#2ea043');
        switchToReconnect();
      }
    }
    function probe() {
      if (!isLocalhost4096) return;
      fetch(location.origin + '/', { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        // 401/403 是鉴权而非断线，视为存活；仅 5xx / 网络异常算断
        var alive = r.ok || r.status === 401 || r.status === 403 || (r.status >= 200 && r.status < 500);
        if (alive) { failCount = 0; setDisconnected(false); currentInterval = 5000; }
        else { failCount++; if (failCount >= 2) setDisconnected(true); currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL); }
        scheduleNext();
      }).catch(function (e) {
        // 网络错误里若能取到状态 401/403 也算存活
        try { var s = e && e.status ? e.status : 0; if (s === 401 || s === 403) { failCount = 0; setDisconnected(false); currentInterval = 5000; scheduleNext(); return; } } catch (err2) {}
        failCount++; if (failCount >= 2) setDisconnected(true);
        currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
        scheduleNext();
      });
    }
    function scheduleNext() {
      if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
      probeTimer = setTimeout(probe, currentInterval);
    }
    function wrapFetch() {
      if (!origFetch || window.__ocFetchWrapped) return;
      window.__ocFetchWrapped = true;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var isSelf = url.indexOf(location.origin) === 0 || url.indexOf('localhost:4096') !== -1;
        var signal = init && init.signal;
        if (signal && signal.aborted) {
          return origFetch.apply(this, arguments);
        }
        return origFetch.apply(this, arguments).then(function (r) {
          if (isSelf) {
            var alive = r.ok || r.status === 401 || r.status === 403 || (r.status >= 200 && r.status < 500);
            if (alive) { failCount = 0; if (disconnected) setDisconnected(false); }
            else if (r.status >= 500) { failCount++; if (failCount >= 2) setDisconnected(true); }
          }
          return r;
        }, function (err) {
          var isAbort = false;
          try {
            isAbort = (err && (err.name === 'AbortError' || err.name === 'Abort')) ||
                      (signal && signal.aborted) ||
                      (err && err.message && err.message.toLowerCase().indexOf('abort') !== -1);
          } catch (eAbort) {}
          if (isAbort) throw err;
          if (isSelf) {
            try { var s2 = err && err.status ? err.status : 0; if (s2 === 401 || s2 === 403) { failCount = 0; if (disconnected) setDisconnected(false); throw err; } } catch (err3) {}
            failCount++; if (failCount >= 2) setDisconnected(true);
          }
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
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          failCount = 0;
          probe();
        }
      });
      probe();
      scheduleNext();
      console.log(TAG, '后端连接监测已启用 (localhost:4096) 10s上限+visibilitychange补探活');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  静音 opencode-mem capture (仅 localhost:4096, 前端静音不改后端写入)
  // ════════════════════════════════════════════════════════════
  var MEM_CAPTURE_SILENCE_MODULE = (function () {
    var CAPTURE_TITLE = 'opencode-mem capture';
    function isCaptureSession(s) {
      if (!s) return false;
      if (s.title === CAPTURE_TITLE) return true;
      try { var m = s.metadata && s.metadata['opencode-mem']; if (m && m.internal) return true; } catch (e) {}
      return false;
    }
    function enabled() { return getSetting('memSilence', true); }
    function isCaptureWindow() {
      try {
        if (!enabled()) return false;
        if (!window.__oc_lastCaptureAt) return false;
        if (Date.now() - window.__oc_lastCaptureAt > 12000) return false;
        // precise: capture must be more recent than last normal session update
        if (window.__oc_lastNormalAt && window.__oc_lastNormalAt > window.__oc_lastCaptureAt) return false;
        return true;
      } catch (e) { return false; }
    }
    function hookAudio() {
      try {
        var proto = window.HTMLAudioElement && window.HTMLAudioElement.prototype;
        if (proto && !proto.__ocMemHooked) {
          var origPlay = proto.play;
          proto.__ocMemHooked = true;
          proto.play = function () {
            try {
              if (isCaptureWindow()) {
                console.log(TAG, 'MEM silence: Audio.play suppressed (capture precise)');
                return Promise.resolve();
              }
            } catch (e3) {}
            return origPlay.apply(this, arguments);
          };
          try { Audio.prototype.play = proto.play; } catch (e) {}
        }
        // AudioContext (Web Audio API) - opencode web may use oscillator/beep
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC && AC.prototype && !AC.prototype.__ocMemHooked) {
            AC.prototype.__ocMemHooked = true;
            var origResume = AC.prototype.resume;
            if (origResume) {
              AC.prototype.resume = function () {
                if (isCaptureWindow()) {
                  console.log(TAG, 'MEM silence: AudioContext.resume suppressed');
                  return Promise.resolve();
                }
                return origResume.apply(this, arguments);
              };
            }
            var origCreateOsc = AC.prototype.createOscillator;
            if (origCreateOsc) {
              AC.prototype.createOscillator = function () {
                var osc = origCreateOsc.apply(this, arguments);
                var origStart = osc.start;
                osc.start = function () {
                  if (isCaptureWindow()) {
                    console.log(TAG, 'MEM silence: Oscillator.start suppressed');
                    return;
                  }
                  return origStart.apply(this, arguments);
                };
                return osc;
              };
            }
          }
        } catch (e4) {}
        // Notification - unconditional for capture (no time window), to kill +20 spam - robust getter hook
        try {
          if (!window.__ocNotifHooked) {
            window.__ocNotifHooked = true;
            var OrigNotif = window.Notification;
            var checkCapture = function (title, opts) {
              try {
                if (!enabled()) return false;
                var txt = (title || '') + ' ' + ((opts && opts.body) || '');
                var low = txt.toLowerCase();
                return low.indexOf('opencode-mem capture') !== -1 || low.indexOf('opencode-mem') !== -1;
              } catch (e) { return false; }
            };
            var WrappedNotif = function (title, opts) {
              if (checkCapture(title, opts)) {
                console.log(TAG, 'MEM silence: Notification suppressed (unconditional capture)');
                // return dummy notification that does nothing
                this.title = title; this.body = opts && opts.body; this.close = function () {};
                return;
              }
              if (isCaptureWindow()) {
                console.log(TAG, 'MEM silence: Notification suppressed (capture window)');
                this.title = title; this.body = opts && opts.body; this.close = function () {};
                return;
              }
              return new OrigNotif(title, opts);
            };
            WrappedNotif.requestPermission = OrigNotif.requestPermission ? OrigNotif.requestPermission.bind(OrigNotif) : function () { return Promise.resolve('granted'); };
            try { WrappedNotif.permission = OrigNotif.permission; } catch (e) {}
            WrappedNotif.__ocMemHooked = true;
            // use getter to survive early caching
            try {
              Object.defineProperty(window, 'Notification', {
                configurable: true,
                get: function () { return WrappedNotif; },
                set: function (v) { OrigNotif = v; WrappedNotif.requestPermission = v.requestPermission ? v.requestPermission.bind(v) : WrappedNotif.requestPermission; }
              });
            } catch (e) { window.Notification = WrappedNotif; }
            try { window.Notification = WrappedNotif; } catch (e2) {}
            try { if (window.self) Object.defineProperty(window.self, 'Notification', { configurable: true, get: function () { return WrappedNotif; } }); } catch (e3) {}
          }
          // ServiceWorker showNotification bypass
          try {
            if (window.ServiceWorkerRegistration && window.ServiceWorkerRegistration.prototype && !window.ServiceWorkerRegistration.prototype.__ocMemHooked) {
              var origShow = window.ServiceWorkerRegistration.prototype.showNotification;
              if (origShow) {
                window.ServiceWorkerRegistration.prototype.__ocMemHooked = true;
                window.ServiceWorkerRegistration.prototype.showNotification = function (title, opts) {
                  try {
                    if (enabled()) {
                      var txt0 = (title || '') + ' ' + ((opts && opts.body) || '');
                      var low0 = txt0.toLowerCase();
                      if (low0.indexOf('opencode-mem capture') !== -1 || low0.indexOf('opencode-mem') !== -1) {
                        console.log(TAG, 'MEM silence: SW Notification suppressed (unconditional capture)');
                        return Promise.resolve();
                      }
                    }
                    if (enabled() && isCaptureWindow()) {
                      console.log(TAG, 'MEM silence: SW Notification suppressed (capture window)');
                      return Promise.resolve();
                    }
                    if (enabled()) {
                      var txt = (title || '') + ' ' + ((opts && opts.body) || '');
                      var low = txt.toLowerCase();
                      if (low.indexOf('opencode-mem capture') !== -1 || low.indexOf('opencode-mem') !== -1) {
                        console.log(TAG, 'MEM silence: SW Notification suppressed');
                        return Promise.resolve();
                      }
                    }
                  } catch (e7) {}
                  return origShow.apply(this, arguments);
                };
              }
            }
          } catch (e8) {}
        } catch (e5) {}
      } catch (e) {}
    }
    function hookFetch() {
      try {
        if (window.__ocFetchMemHooked || !window.fetch) return;
        var origFetch = window.fetch;
        window.__ocFetchMemHooked = true;
        window.fetch = function (input, init) {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          var bodyStr = '';
          try { bodyStr = init && init.body ? (typeof init.body === 'string' ? init.body : JSON.stringify(init.body)) : ''; } catch (e) {}
          // detect capture session creation: POST /session with title or internal metadata
          var isCaptureCreate = false;
          if (url.indexOf('/session') !== -1 && init && init.method === 'POST' && bodyStr) {
            if (bodyStr.indexOf('opencode-mem capture') !== -1 || bodyStr.indexOf('"internal":true') !== -1 || bodyStr.indexOf('opencode-mem') !== -1) isCaptureCreate = true;
          }
          if (isCaptureCreate || url.indexOf('opencode-mem') !== -1) { try { window.__oc_lastCaptureAt = Date.now(); console.log(TAG, 'MEM silence: capture fetch detected', url); } catch (e) {} }
          return origFetch.apply(this, arguments).then(function (res) {
            try {
              if (url.indexOf('/api/sessions') !== -1 || url.indexOf('/api/session') !== -1 || url.indexOf('/session') !== -1) {
                var clone = res.clone();
                return clone.json().then(function (data) {
                  // track lastCapture vs lastNormal for precise window
                  try {
                    var sessions = null;
                    if (Array.isArray(data)) sessions = data;
                    else if (data && Array.isArray(data.sessions)) sessions = data.sessions;
                    else if (data && data.data && Array.isArray(data.data)) sessions = data.data;
                    if (sessions) {
                      var hasCapture = false, hasNormal = false;
                      for (var i = 0; i < sessions.length; i++) { if (isCaptureSession(sessions[i])) { hasCapture = true; break; } }
                      for (var j = 0; j < sessions.length; j++) { if (!isCaptureSession(sessions[j])) { hasNormal = true; break; } }
                      if (hasCapture) window.__oc_lastCaptureAt = Date.now();
                      if (hasNormal) window.__oc_lastNormalAt = Date.now();
                    }
                  } catch (e6) {}
                  if (!enabled()) return res;
                  var filtered = false;
                  if (Array.isArray(data)) {
                    var before = data.length;
                    data = data.filter(function (s) { return !isCaptureSession(s); });
                    filtered = data.length !== before;
                  } else if (data && Array.isArray(data.sessions)) {
                    var b = data.sessions.length;
                    data.sessions = data.sessions.filter(function (s) { return !isCaptureSession(s); });
                    filtered = data.sessions.length !== b;
                  } else if (data && data.data && Array.isArray(data.data)) {
                    var b2 = data.data.length;
                    data.data = data.data.filter(function (s) { return !isCaptureSession(s); });
                    filtered = data.data.length !== b2;
                  }
                  if (filtered) {
                    console.log(TAG, 'MEM silence: filtered capture from', url);
                    return new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText, headers: res.headers });
                  }
                  return res;
                }).catch(function () { return res; });
              }
            } catch (e2) {}
            return res;
          });
        };
      } catch (e) {}
    }
    function hideCaptureDOM() {
      if (!enabled()) return;
      try {
        var found = false;
        document.querySelectorAll('[data-title="opencode-mem capture"], [title="opencode-mem capture"]').forEach(function (el) {
          found = true;
          var row = el.closest ? (el.closest('[data-session-id]') || el.closest('li') || el.closest('[role="row"]') || el) : el;
          if (row) row.style.display = 'none';
        });
        document.querySelectorAll('[data-session-id]').forEach(function (row) {
          var t = row.getAttribute('data-title') || row.getAttribute('title') || '';
          if (t === 'opencode-mem capture') { found = true; row.style.display = 'none'; }
        });
        if (found) window.__oc_lastCaptureAt = Date.now();
      } catch (e) {}
    }
    function hookWS() {
      try {
        if (window.__ocWSMemHooked) return;
        window.__ocWSMemHooked = true;
        var OrigWS = window.WebSocket;
        if (!OrigWS) return;
        window.WebSocket = function (url, protos) {
          var ws = protos ? new OrigWS(url, protos) : new OrigWS(url);
          var origAdd = ws.addEventListener;
          ws.addEventListener = function (type, listener, opts) {
            if (type === 'message') {
              var wrapped = function (ev) {
                try {
                  var d = ev && ev.data ? (typeof ev.data === 'string' ? ev.data : '') : '';
                  if (d && (d.indexOf('opencode-mem capture') !== -1 || d.indexOf('opencode-mem') !== -1 || d.indexOf('"internal":true') !== -1)) {
                    window.__oc_lastCaptureAt = Date.now();
                    console.log(TAG, 'MEM silence: WS capture detected');
                  }
                } catch (e) {}
                return listener.call(this, ev);
              };
              return origAdd.call(this, type, wrapped, opts);
            }
            return origAdd.call(this, type, listener, opts);
          };
          var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ws), 'onmessage');
          if (desc && desc.configurable) {
            Object.defineProperty(ws, 'onmessage', {
              configurable: true,
              get: function () { return this.__oc_onmessage || null; },
              set: function (fn) {
                this.__oc_onmessage = fn;
                if (!fn) { try { Object.getPrototypeOf(ws).onmessage = null; } catch (e) {} return; }
                var self = this;
                var wrapped2 = function (ev) {
                  try {
                    var d2 = ev && ev.data ? (typeof ev.data === 'string' ? ev.data : '') : '';
                    if (d2 && (d2.indexOf('opencode-mem capture') !== -1 || d2.indexOf('opencode-mem') !== -1)) window.__oc_lastCaptureAt = Date.now();
                  } catch (e2) {}
                  return fn.call(self, ev);
                };
                try { Object.getPrototypeOf(ws).onmessage = wrapped2; } catch (e3) { ws.__oc_onmessage = wrapped2; }
              }
            });
          }
          return ws;
        };
        window.WebSocket.prototype = OrigWS.prototype;
        try { Object.setPrototypeOf(window.WebSocket, OrigWS); } catch (e) {}
      } catch (e4) {}
    }
    function init() {
      if (!isLocalhost4096) return;
      hookAudio();
      hookFetch();
      hookWS();
      try {
        var st = document.createElement('style');
        st.id = 'oc-mem-silence-style';
        st.textContent = '[data-title="opencode-mem capture"]{display:none !important}[data-session-id] [data-title="opencode-mem capture"]{display:none !important}';
        (document.head || document.documentElement).appendChild(st);
      } catch (e) {}
      setInterval(hideCaptureDOM, 1000);
      try { var mo = new MutationObserver(hideCaptureDOM); mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
      console.log(TAG, 'MEM capture silence enabled');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  LARGE_IMAGE_MODULE — 大图懒加载/降采样 (参考 oc-remote Image optimization)
  //  >200KB base64 图片 → 占位 + IntersectionObserver 进入视口才解码 + canvas ≤1280px
  // ════════════════════════════════════════════════════════════
  var LARGE_IMAGE_MODULE = (function () {
    var THRESHOLD = 200 * 1024;
    var MAX_DIM = 1280;
    var PROCESSED = '__oc_li_done';

    function processImg(img) {
      if (img[PROCESSED]) return;
      var src = img.src || '';
      if (!src || src.indexOf('data:image') !== 0) return;
      if (src.length < THRESHOLD) return;
      img[PROCESSED] = true;
      var kb = Math.round(src.length / 1024);
      var origW = img.naturalWidth, origH = img.naturalHeight;
      var placeholder = document.createElement('div');
      placeholder.className = 'oc-li-placeholder';
      placeholder.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px dashed rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.04);color:#888;font-size:12px;cursor:pointer;max-width:100%;';
      placeholder.innerHTML = '<span>⬜</span><span>图片 ' + kb + 'KB' + (origW ? ' (' + origW + '×' + origH + ')' : '') + '</span><span style="color:#58a6ff;">[点击加载]</span>';
      placeholder.title = '点击加载此图片（已降采样到 ≤' + MAX_DIM + 'px）';
      var rect = img.getBoundingClientRect();
      if (rect.width > 0) placeholder.style.width = Math.min(rect.width, 400) + 'px';
      img.style.display = 'none';
      img.parentNode && img.parentNode.insertBefore(placeholder, img);
      function loadAndDownsample() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var w = origW || img.naturalWidth || MAX_DIM;
        var h = origH || img.naturalHeight || MAX_DIM;
        if (w > MAX_DIM || h > MAX_DIM) {
          var scale = MAX_DIM / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        var outSrc = canvas.toDataURL('image/webp', 0.8);
        img.src = outSrc;
        img.style.display = '';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        placeholder.remove();
        console.log(TAG, 'LARGE_IMAGE: downsampled', kb + 'KB →', Math.round(outSrc.length / 1024) + 'KB', w + '×' + h);
      }
      placeholder.addEventListener('click', function () { loadAndDownsample(); });
      var observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { observer.disconnect(); loadAndDownsample(); return; }
        }
      }, { rootMargin: '200px' });
      observer.observe(placeholder);
    }

    function scan(root) {
      var imgs = (root || document).querySelectorAll('img[src^="data:image"]');
      for (var i = 0; i < imgs.length; i++) processImg(imgs[i]);
    }

    function init() {
      if (!isLocalhost4096) return;
      scan();
      var pending = [];
      var t = null;
      function flush() {
        t = null;
        var batch = pending.slice(); pending.length = 0;
        for (var i = 0; i < batch.length; i++) {
          var n = batch[i];
          if (n.tagName === 'IMG') processImg(n);
          if (n.querySelectorAll) scan(n);
        }
      }
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType !== 1) continue;
            pending.push(n);
            if (pending.length > 40) break;
          }
        }
        if (!t) t = setTimeout(flush, 120);
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      console.log(TAG, 'LARGE_IMAGE_MODULE enabled (>' + (THRESHOLD / 1024) + 'KB threshold) [throttled]');
    }
    return { init: init, scan: scan };
  })();

  // ════════════════════════════════════════════════════════════
  //  TOOL_FOLD_MODULE — 长输出折叠 (参考 oc-remote expandable tool-call cards)
  //  >50 行或 >10KB 的 tool 输出 → 默认折叠，点击展开
  // ════════════════════════════════════════════════════════════
  var TOOL_FOLD_MODULE = (function () {
    var LINE_THRESHOLD = 50;
    var SIZE_THRESHOLD = 10 * 1024;
    var FOLDED_ATTR = '__oc_tf_folded';
    var STYLE_ID = 'oc-tool-fold-style';

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = '.oc-tf-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:rgba(255,255,255,.06);color:#8b949e;font-size:11px;cursor:pointer;margin:4px 0;transition:background .15s}.oc-tf-btn:hover{background:rgba(255,255,255,.12)}.oc-tf-folded{max-height:120px;overflow:hidden;position:relative}.oc-tf-folded::after{content:"";position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,rgba(30,30,30,.95))}';
      (document.head || document.documentElement).appendChild(st);
    }

    function foldBlock(el) {
      if (el[FOLDED_ATTR]) return;
      var text = el.textContent || '';
      var lines = text.split('\n');
      var isLong = lines.length > LINE_THRESHOLD || text.length > SIZE_THRESHOLD;
      if (!isLong) return;
      el[FOLDED_ATTR] = true;
      el.classList.add('oc-tf-folded');
      var btn = document.createElement('button');
      btn.className = 'oc-tf-btn';
      var kb = Math.round(text.length / 1024);
      btn.textContent = '▸ 展开 ' + lines.length + ' 行' + (kb > 1 ? ' / ' + kb + 'KB' : '');
      btn.addEventListener('click', function () {
        var folded = el.classList.contains('oc-tf-folded');
        if (folded) {
          el.classList.remove('oc-tf-folded');
          btn.textContent = '▾ 折叠';
        } else {
          el.classList.add('oc-tf-folded');
          btn.textContent = '▸ 展开 ' + lines.length + ' 行' + (kb > 1 ? ' / ' + kb + 'KB' : '');
        }
      });
      el.parentNode && el.parentNode.insertBefore(btn, el);
    }

    function scan(root) {
      var targets = (root || document).querySelectorAll('pre, code, [class*="output"], [class*="tool"]');
      for (var i = 0; i < targets.length; i++) foldBlock(targets[i]);
    }

    function init() {
      if (!isLocalhost4096) return;
      ensureStyle();
      scan();
      var pending2 = [];
      var t2 = null;
      function flush2() {
        t2 = null;
        var batch = pending2.slice(); pending2.length = 0;
        for (var i = 0; i < batch.length; i++) {
          var n = batch[i];
          if (n.tagName === 'PRE' || n.tagName === 'CODE') foldBlock(n);
          if (n.querySelectorAll) scan(n);
        }
      }
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType !== 1) continue;
            pending2.push(n);
            if (pending2.length > 40) break;
          }
        }
        if (!t2) t2 = setTimeout(flush2, 140);
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      console.log(TAG, 'TOOL_FOLD_MODULE enabled (>' + LINE_THRESHOLD + ' lines) [throttled]');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  PASTE_MODULE 增强 — 粘贴图片压缩 (参考 oc-remote Image optimization controls)
  //  粘贴前 canvas 压缩 ≤1280px / WebP 0.8 / <200KB
  // ════════════════════════════════════════════════════════════
  var PASTE_COMPRESS_MODULE = (function () {
    var MAX_DIM = 1280;
    var TARGET_KB = 200;

    function compressImage(file) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var img = new Image();
          img.onload = function () {
            var w = img.width, h = img.height;
            if (w > MAX_DIM || h > MAX_DIM) {
              var scale = MAX_DIM / Math.max(w, h);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
            }
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            var quality = 0.8;
            var out = canvas.toDataURL('image/webp', quality);
            while (out.length > TARGET_KB * 1024 && quality > 0.3) {
              quality -= 0.1;
              out = canvas.toDataURL('image/webp', quality);
            }
            var origKB = Math.round(file.size / 1024);
            var newKB = Math.round(out.length / 1024);
            if (newKB < origKB) {
              console.log(TAG, 'PASTE_COMPRESS: ' + origKB + 'KB → ' + newKB + 'KB (quality=' + quality.toFixed(2) + ')');
              var binary = atob(out.split(',')[1]);
              var arr = new Uint8Array(binary.length);
              for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
              resolve(new File([arr], file.name || 'paste-' + Date.now() + '.webp', { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
    return { compress: compressImage };
  })();

  // ════════════════════════════════════════════════════════════
  //  SMART_SCROLL_MODULE — 智能滚动 (参考 oc-remote Smart scroll behavior)
  //  手动上滚暂停自动滚动 +「↓ 回到底部」浮标
  // ════════════════════════════════════════════════════════════
  var SMART_SCROLL_MODULE = (function () {
    var autoScroll = true;
    var fab = null;
    var STYLE_ID = 'oc-smart-scroll-style';

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = '#oc-scroll-fab{position:fixed;bottom:80px;right:20px;z-index:2147483646;padding:8px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:rgba(30,30,30,.92);color:#8b949e;font-size:12px;cursor:pointer;display:none;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:opacity .15s}#oc-scroll-fab:hover{background:rgba(50,50,50,.95);color:#e6edf3}';
      (document.head || document.documentElement).appendChild(st);
    }

    function createFab() {
      if (fab) return fab;
      fab = document.createElement('button');
      fab.id = 'oc-scroll-fab';
      fab.textContent = '↓ 回到底部';
      fab.addEventListener('click', function () {
        autoScroll = true;
        fab.style.display = 'none';
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      });
      document.body && document.body.appendChild(fab);
      return fab;
    }

    function onScroll() {
      var atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 100);
      if (atBottom) {
        autoScroll = true;
        if (fab) fab.style.display = 'none';
      } else if (autoScroll) {
        autoScroll = false;
        createFab();
        fab.style.display = 'block';
      }
    }

    function init() {
      if (!isLocalhost4096) return;
      ensureStyle();
      window.addEventListener('scroll', onScroll, { passive: true });
      console.log(TAG, 'SMART_SCROLL_MODULE enabled');
    }
    return { init: init, isAutoScroll: function () { return autoScroll; } };
  })();

  // ════════════════════════════════════════════════════════════
  //  REASONING_FOLD_MODULE — 推理折叠 (参考 oc-remote Collapsible reasoning)
  //  reasoning 内容默认折叠，点击展开
  // ════════════════════════════════════════════════════════════
  var REASONING_FOLD_MODULE = (function () {
    var STYLE_ID = 'oc-reason-fold-style';
    var FOLDED_ATTR = '__oc_rf_done';

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = '.oc-rf-folded{max-height:80px;overflow:hidden;position:relative;opacity:.7}.oc-rf-folded::after{content:"";position:absolute;bottom:0;left:0;right:0;height:30px;background:linear-gradient(transparent,rgba(30,30,30,.95))}.oc-rf-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid rgba(255,255,255,.12);border-radius:5px;background:rgba(255,255,255,.05);color:#8b949e;font-size:11px;cursor:pointer;margin:2px 0}';
      (document.head || document.documentElement).appendChild(st);
    }

    function foldReasoning(el) {
      if (el[FOLDED_ATTR]) return;
      el[FOLDED_ATTR] = true;
      el.classList.add('oc-rf-folded');
      var btn = document.createElement('button');
      btn.className = 'oc-rf-btn';
      btn.textContent = '▸ 展开推理';
      btn.addEventListener('click', function () {
        var folded = el.classList.contains('oc-rf-folded');
        if (folded) { el.classList.remove('oc-rf-folded'); btn.textContent = '▾ 折叠推理'; }
        else { el.classList.add('oc-rf-folded'); btn.textContent = '▸ 展开推理'; }
      });
      el.parentNode && el.parentNode.insertBefore(btn, el);
    }

    function scan(root) {
      var targets = (root || document).querySelectorAll('[class*="reasoning"], [data-type="reasoning"]');
      for (var i = 0; i < targets.length; i++) foldReasoning(targets[i]);
    }

    function init() {
      if (!isLocalhost4096) return;
      ensureStyle();
      scan();
      var pending3 = [];
      var t3 = null;
      function flush3() {
        t3 = null;
        var batch = pending3.slice(); pending3.length = 0;
        for (var i = 0; i < batch.length; i++) {
          if (batch[i].querySelectorAll) scan(batch[i]);
        }
      }
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType !== 1) continue;
            pending3.push(n);
            if (pending3.length > 40) break;
          }
        }
        if (!t3) t3 = setTimeout(flush3, 160);
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      console.log(TAG, 'REASONING_FOLD_MODULE enabled [throttled]');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  DRAFT_MODULE — 草稿持久化 (参考 oc-remote Draft persistence)
  //  输入框内容按会话 ID 存 localStorage，刷新/切换会话恢复
  // ════════════════════════════════════════════════════════════
  var DRAFT_MODULE = (function () {
    var PREFIX = 'ocall_draft_';
    var currentSession = null;
    var saveTimer = null;
    var hookInstalled = false;

    function getSessionId() {
      var m = location.pathname.match(/\/session\/([^/?#]+)/);
      if (m && m[1]) return m[1];
      try {
        var m2 = location.href.match(/\/session\/([^/?#&]+)/);
        if (m2 && m2[1]) return m2[1];
      } catch (e2) {}
      try {
        var sp = new URLSearchParams(location.search);
        var q = sp.get('session') || sp.get('sessionId') || sp.get('sid');
        if (q) return q;
      } catch (e3) {}
      try {
        var el = document.querySelector('[data-session-id]');
        if (el) {
          var v = el.getAttribute('data-session-id');
          if (v) return v;
        }
      } catch (e4) {}
      return null;
    }

    function getInput() {
      return document.querySelector('[data-component="prompt-input"] [contenteditable="true"]') ||
             document.querySelector('[data-component="prompt-input"] textarea') ||
             document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea');
    }

    function readInput(el) {
      if (!el) return '';
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
      return el.textContent || el.innerText || '';
    }

    function writeInput(el, text) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.isContentEditable) {
        el.textContent = text;
        if (text) {
          try {
            var range = document.createRange();
            var sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e) {}
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function clearDraft(sid) {
      if (!sid) sid = getSessionId();
      if (!sid) return;
      try { localStorage.removeItem(PREFIX + sid); } catch (e) {}
    }

    function saveDraft() {
      var sid = getSessionId();
      if (!sid) return;
      var el = getInput();
      if (!el) return;
      if (el !== document.activeElement && document.hasFocus && !document.hasFocus()) return;
      var text = readInput(el);
      if (!text.trim()) { try { localStorage.removeItem(PREFIX + sid); } catch (e2) {} return; }
      try { localStorage.setItem(PREFIX + sid, text); } catch (e3) {}
    }

    function saveDraftDebounced() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 350);
    }

    function handleSwitch() {
      var newSid = getSessionId();
      if (!newSid) return;
      if (newSid === currentSession) return;
      var oldSid = currentSession;
      var el = getInput();
      if (el && oldSid) {
        var oldText = readInput(el);
        if (oldText.trim()) {
          try { localStorage.setItem(PREFIX + oldSid, oldText); } catch (e) {}
        } else {
          try { localStorage.removeItem(PREFIX + oldSid); } catch (e2) {}
        }
      }
      currentSession = newSid;
      var saved = null;
      try { saved = localStorage.getItem(PREFIX + newSid); } catch (e3) {}
      if (!el) {
        if (saved) console.log(TAG, 'DRAFT: pending restore for', newSid.slice(0, 12));
        return;
      }
      var curText = readInput(el);
      if (saved) {
        if (curText !== saved) {
          writeInput(el, saved);
          console.log(TAG, 'DRAFT: restored for', newSid.slice(0, 12));
        } else {
          currentSession = newSid;
        }
      } else {
        if (oldSid && curText) {
          var oldSaved = null;
          try { oldSaved = localStorage.getItem(PREFIX + oldSid); } catch (e4) {}
          if (oldSaved && curText === oldSaved) {
            writeInput(el, '');
            console.log(TAG, 'DRAFT: cleared for new session', newSid.slice(0, 12));
          }
        }
      }
    }

    function installHooks() {
      if (hookInstalled) return;
      hookInstalled = true;
      try {
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function () {
          var r = origPush.apply(this, arguments);
          setTimeout(handleSwitch, 80);
          return r;
        };
        history.replaceState = function () {
          var r = origReplace.apply(this, arguments);
          setTimeout(handleSwitch, 80);
          return r;
        };
        window.addEventListener('popstate', function () { setTimeout(handleSwitch, 80); });
      } catch (e5) {}
      window.addEventListener('hashchange', function () { setTimeout(handleSwitch, 80); });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) setTimeout(handleSwitch, 120);
      });
      window.addEventListener('focus', function () { setTimeout(handleSwitch, 120); });
      document.addEventListener('click', function (e) {
        var t = e.target;
        try {
          if (t && t.closest) {
            var tab = t.closest('a[href*="/session/"], [data-session-id], [role="tab"]');
            if (tab) setTimeout(handleSwitch, 180);
            var sendBtn = t.closest('button');
            if (sendBtn) {
              var nearInput = false;
              try { nearInput = !!sendBtn.closest('[data-component="prompt-input"], form'); } catch (e6) {}
              if (nearInput || sendBtn.getAttribute('aria-label') || (sendBtn.textContent || '').trim() === '') {
                setTimeout(function () {
                  var sid = getSessionId() || currentSession;
                  var el2 = getInput();
                  var txt = el2 ? readInput(el2) : '';
                  if (!txt.trim()) clearDraft(sid);
                }, 400);
              }
            }
          }
        } catch (e7) {}
      }, true);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          var el3 = getInput();
          if (el3 && document.activeElement === el3) {
            setTimeout(function () {
              var sid2 = getSessionId() || currentSession;
              var txt2 = el3 ? readInput(el3) : '';
              if (!txt2.trim()) clearDraft(sid2);
            }, 400);
          }
        }
      }, true);
      var fetchHooked = false;
      function hookFetchForClear() {
        if (fetchHooked || !window.fetch) return;
        var orig = window.fetch;
        if (orig.__ocDraftHooked) return;
        fetchHooked = true;
        var wrapped = function (input, init) {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          var isSend = false;
          try {
            var method = (init && init.method) || 'GET';
            isSend = method.toUpperCase() === 'POST' && (url.indexOf('/session') !== -1 || url.indexOf('/api/session') !== -1);
          } catch (e8) {}
          var p = orig.apply(this, arguments);
          if (isSend) {
            p.then(function (r) {
              try {
                if (r && r.ok) {
                  var sid3 = getSessionId() || currentSession;
                  setTimeout(function () { clearDraft(sid3); }, 300);
                }
              } catch (e9) {}
              return r;
            }).catch(function (err) { throw err; });
          }
          return p;
        };
        wrapped.__ocDraftHooked = true;
        try { window.fetch = wrapped; } catch (e10) {}
      }
      hookFetchForClear();
      setTimeout(hookFetchForClear, 800);
    }

    function init() {
      if (!isLocalhost4096) return;
      try { currentSession = getSessionId(); } catch (e) {}
      if (currentSession) {
        try {
          var curEl = getInput();
          var saved0 = localStorage.getItem(PREFIX + currentSession);
          var curTxt0 = curEl ? readInput(curEl) : '';
          if (saved0 && curEl && !curTxt0.trim()) {
            writeInput(curEl, saved0);
            console.log(TAG, 'DRAFT: initial restore for', currentSession.slice(0, 12));
          }
        } catch (e0) {}
      } else {
        restoreLoop: try { currentSession = getSessionId(); } catch (eLoop) {}
      }
      installHooks();
      document.addEventListener('input', function (e) {
        var el4 = getInput();
        if (!el4) return;
        if (e.target === el4 || el4.contains(e.target)) saveDraftDebounced();
      }, true);
      document.addEventListener('keyup', function (e) {
        var el5 = getInput();
        if (el5 && document.activeElement === el5) saveDraftDebounced();
      }, true);
      setInterval(function () { handleSwitch(); }, 1200);
      console.log(TAG, 'DRAFT_MODULE enabled (isolated+debounced)');
    }

    function restoreDraft() { handleSwitch(); }

    return { init: init, save: saveDraft, _handleSwitch: handleSwitch, _getSessionId: getSessionId };
  })();

  // ════════════════════════════════════════════════════════════
  //  CODE_WRAP_MODULE — 代码换行切换 (参考 oc-remote Code word wrap)
  //  代码块加「换行/滚动」切换按钮
  // ════════════════════════════════════════════════════════════
  var CODE_WRAP_MODULE = (function () {
    var STYLE_ID = 'oc-code-wrap-style';
    var DONE_ATTR = '__oc_cw_done';

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = '.oc-cw-btn{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border:1px solid rgba(255,255,255,.1);border-radius:4px;background:rgba(255,255,255,.05);color:#8b949e;font-size:10px;cursor:pointer;position:absolute;top:4px;right:48px;z-index:1;opacity:.45;transition:opacity .15s,background .15s}.oc-cw-btn:hover{background:rgba(255,255,255,.12);opacity:1}pre:hover .oc-cw-btn{opacity:.85}.oc-cw-wrapped pre,.oc-cw-wrapped code{white-space:pre-wrap!important;word-break:break-all!important}';
      (document.head || document.documentElement).appendChild(st);
    }

    function addButton(pre) {
      if (pre[DONE_ATTR]) return;
      pre[DONE_ATTR] = true;
      pre.style.position = 'relative';
      pre.classList.add('oc-cw-wrapped');
      var btn = document.createElement('button');
      btn.className = 'oc-cw-btn';
      btn.textContent = '↕ 换行';
      btn.addEventListener('click', function () {
        var wrapped = pre.classList.contains('oc-cw-wrapped');
        if (wrapped) { pre.classList.remove('oc-cw-wrapped'); btn.textContent = '↔ 滚动'; }
        else { pre.classList.add('oc-cw-wrapped'); btn.textContent = '↕ 换行'; }
      });
      pre.appendChild(btn);
    }

    function scan(root) {
      var pres = (root || document).querySelectorAll('pre');
      for (var i = 0; i < pres.length; i++) addButton(pres[i]);
    }

    function init() {
      if (!isLocalhost4096) return;
      ensureStyle();
      scan();
      var pending4 = [];
      var t4 = null;
      function flush4() {
        t4 = null;
        var batch = pending4.slice(); pending4.length = 0;
        for (var i = 0; i < batch.length; i++) {
          var n = batch[i];
          if (n.tagName === 'PRE') addButton(n);
          if (n.querySelectorAll) scan(n);
        }
      }
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var n = muts[i].addedNodes[j];
            if (n.nodeType !== 1) continue;
            pending4.push(n);
            if (pending4.length > 40) break;
          }
        }
        if (!t4) t4 = setTimeout(flush4, 180);
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      console.log(TAG, 'CODE_WRAP_MODULE enabled [throttled]');
    }
    return { init: init };
  })();

  // MEM_4747_ENTRY 已移除：按用户要求去掉 4747 入口，改存书签 javascript:window.open('http://127.0.0.1:4747')

  // ════════════════════════════════════════════════════════════
  //  MEM_4747_WEB_STATUS — 4747 web 左上角 logo 同款绿点
  // ════════════════════════════════════════════════════════════
  var MEM_4747_WEB_STATUS = (function () {
    var STYLE_ID = 'oc-mem-4747-web-style';
    var DOT_ID = 'oc-mem-4747-web-dot';
    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = '#' + DOT_ID + '{width:7px;height:7px;border-radius:50%;background:#6e7681;box-shadow:0 0 0 4px rgba(110,118,129,.15);display:inline-block;transition:background .15s,box-shadow .15s;flex-shrink:0}#' + DOT_ID + '.oc-mem-ok{background:#2ea043;box-shadow:0 0 0 4px rgba(46,160,67,.18)} #' + DOT_ID + '[style*="position: absolute"]{border:2px solid #1a1a1a;width:8px;height:8px}';
      (document.head || document.documentElement).appendChild(st);
    }
    function findLogoWrap() {
      var pool = document.querySelectorAll('aside a[href="/"] span, a[href="/"] span, a[href="/"] div, [class*="opencode-mem"] span');
      for (var p = 0; p < pool.length; p++) {
        if (pool[p].textContent.trim().toLowerCase().indexOf('opencode') !== -1 && pool[p].children.length === 0) return pool[p];
      }
      var a = document.querySelector('aside a[href="/"]') || document.querySelector('a[href="/"]');
      if (a) return a;
      var spans = document.querySelectorAll('span, div');
      for (var i = 0; i < spans.length; i++) {
        if (spans[i].textContent.trim().toLowerCase().indexOf('opencode') !== -1 && spans[i].children.length === 0) return spans[i];
      }
      return document.querySelector('header') || document.querySelector('aside') || document.querySelector('nav');
    }
    function injectDot() {
      if (document.getElementById(DOT_ID)) return true;
      var target = findLogoWrap();
      if (!target) return false;
      ensureStyle();
      var dot = document.createElement('span');
      dot.id = DOT_ID;
      dot.title = '4747 未检测';
      if (target.tagName === 'SPAN' && target.textContent.trim() === 'opencode-mem') {
        target.style.position = 'relative';
        target.style.display = 'inline-flex';
        target.style.alignItems = 'center';
        target.insertAdjacentElement('afterend', dot);
        dot.style.position = 'absolute';
        dot.style.top = '-4px';
        dot.style.right = '-10px';
        console.log(TAG, '4747 web logo dot injected (span+afterend)');
        return true;
      }
      if (target.tagName === 'A' && target.querySelector('span.truncate')) {
        var span = target.querySelector('span.truncate');
        span.style.position = 'relative';
        span.insertAdjacentElement('afterend', dot);
        dot.style.position = 'absolute';
        dot.style.top = '-4px';
        dot.style.right = '-10px';
        console.log(TAG, '4747 web logo dot injected (a>span afterend)');
        return true;
      }
      target.style.position = 'relative';
      target.appendChild(dot);
      console.log(TAG, '4747 web logo dot injected (fallback append)');
      return true;
    }
    function probe() {
      var dot = document.getElementById(DOT_ID);
      if (!dot) return;
      try {
        fetch(location.origin, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }).then(function () {
          dot.classList.add('oc-mem-ok');
          dot.title = '4747 在线';
        }).catch(function () {
          dot.classList.remove('oc-mem-ok');
          dot.title = '4747 未检测';
        });
      } catch (e) {}
    }
    function initWeb() {
      if (!isMemWeb) return;
      ensureStyle();
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (injectDot()) { clearInterval(timer); probe(); setInterval(probe, 30000); return; }
        if (tries > 20) clearInterval(timer);
      }, 600);
      var obs = new MutationObserver(function () { if (!document.getElementById(DOT_ID)) injectDot(); });
      try { if (document.body) obs.observe(document.body, { childList: true, subtree: true }); } catch (e2) {}
      console.log(TAG, 'MEM 4747 web status enabled');
    }
    return { init: initWeb };
  })();

  // ════════════════════════════════════════════════════════════
  //  ESC single-press abort
  // ════════════════════════════════════════════════════════════
  var ESC_MODULE = (function () {
    var lastEsc = 0;
    function findStopBtn() {
      var sels = ['button[title*="停止"]','button[title*="Stop"]','button[aria-label*="停止"]','button[aria-label*="Stop"]','[data-testid*="stop"]','button:has-text("停止")'];
      for (var i=0;i<sels.length;i++) { try{ var el=document.querySelector(sels[i]); if(el) return el; }catch(e){} }
      var btns=document.querySelectorAll('button');
      for (var j=0;j<btns.length;j++) { var t=(btns[j].textContent||'').trim(); if(t==='停止'||t==='Stop'||t.indexOf('中断')!==-1) return btns[j]; }
      return null;
    }
    function abortFetch() {
      try { window.stop(); } catch(e){}
      var stop=findStopBtn();
      if(stop){ try{ stop.click(); return true; }catch(e2){} }
      try{ var ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}); document.dispatchEvent(ev); }catch(e3){}
      return false;
    }
    function init() {
      if (!isLocalhost4096 && !isMemWeb) return;
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' && e.keyCode !== 27) return;
        var now=Date.now();
        if (now - lastEsc < 400) { e.preventDefault(); e.stopPropagation(); return; }
        lastEsc=now;
        var hasGenerating=document.querySelector('[data-generating="true"]') || document.querySelector('button[title*="停止"]') || document.querySelector('.oc-generating');
        if (hasGenerating || document.querySelector('button[title*="Stop"]')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          abortFetch();
          console.log(TAG,'ESC abort triggered');
        }
      }, true);
      console.log(TAG,'ESC single-press enabled');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  AUTO_RESUME — 断连恢复后自动继续中断对话
  // ════════════════════════════════════════════════════════════
  var AUTO_RESUME_MODULE = (function () {
    function findContinueBtn() {
      var btns = document.querySelectorAll('button');
      for (var i=0;i<btns.length;i++) {
        var t=(btns[i].textContent||'').trim();
        if (t==='继续'||t==='Continue'||t==='重试'||t==='Retry'||t.indexOf('继续')!==-1) return btns[i];
      }
      return document.querySelector('button[title*="继续"], button[title*="Continue"], [data-testid*="continue"]');
    }
    function init() {
      if (!isLocalhost4096) return;
      var key='oc_auto_resume_'+location.pathname;
      var pending=sessionStorage.getItem(key);
      if (pending && Date.now()-parseInt(pending,10) < 30000) {
        sessionStorage.removeItem(key);
        setTimeout(function(){
          var btn=findContinueBtn();
          if (btn) { try{ btn.click(); console.log(TAG,'auto-resume clicked'); }catch(e){} }
        }, 1500);
      }
      window.addEventListener('beforeunload', function(){
        var banner=document.getElementById('oc-disconnected-banner');
        if (banner && banner.classList.contains('oc-visible')) {
          try{ sessionStorage.setItem(key, String(Date.now())); }catch(e){}
        }
      });
      console.log(TAG,'auto-resume enabled');
    }
    return { init: init };
  })();

  // ════════════════════════════════════════════════════════════
  //  Main entry
  // ════════════════════════════════════════════════════════════

  function init() {
    try {
      if (isLocalhost4096 && location.pathname.indexOf('/new-session') !== -1 && location.search.indexOf('draftId=') !== -1 && performance && performance.getEntriesByType) {
        var nav = performance.getEntriesByType('navigation')[0];
        if (nav && nav.type === 'reload') {
          var u = location.pathname + location.hash;
          history.replaceState(null, '', u);
          console.log(TAG, 'new-session draftId cleared on reload');
        }
      }
    } catch (e0) {}
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
      MEM_CAPTURE_SILENCE_MODULE.init();
      try { ESC_MODULE.init(); } catch (e) {}
      try { AUTO_RESUME_MODULE.init(); } catch (e) {}
      if (getSetting('largeImg', true)) {
        try { LARGE_IMAGE_MODULE.init(); } catch (e) {}
      }
      if (getSetting('toolFold', true)) {
        try { TOOL_FOLD_MODULE.init(); } catch (e) {}
      }
      if (getSetting('smartScroll', true)) {
        try { SMART_SCROLL_MODULE.init(); } catch (e) {}
      }
      if (getSetting('reasonFold', true)) {
        try { REASONING_FOLD_MODULE.init(); } catch (e) {}
      }
      if (getSetting('draftSave', true)) {
        try { DRAFT_MODULE.init(); } catch (e) {}
      }
      if (getSetting('codeWrap', true)) {
        try { CODE_WRAP_MODULE.init(); } catch (e) {}
      }
    } else if (isLocalWeb) {
      // Fallback for other local ports if script ever runs there (should not due to @include)
      if (getSetting('goPanel', true)) MODEL_QUOTA.init();
      if (getSetting('pasteImg', true)) PASTE_MODULE.init();
    }
    if (isMemWeb) {
      try { MEM_4747_WEB_STATUS.init(); } catch (e) {}
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