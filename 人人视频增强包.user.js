// ==UserScript==
// @name         人人视频增强包
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  反调试绕过 + 隐藏滚动条 + 无感去广告 + 豆瓣跳转 + 唤醒后暂停(点播放即恢复) + 播放卡死自愈 | 菜单可开关
// @author       opencode
// @match        *://*.yichengwlkj.com/*
// @match        *://*.rrmj.plus/*
// @match        *://*.bwcgee.cn/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  //  设置读写
  // ============================================================
  var S = {
    get: function (k, d) { var v = localStorage.getItem('rrmv_' + k); return v !== null ? v === '1' : d; },
    set: function (k, v) { localStorage.setItem('rrmv_' + k, v ? '1' : '0'); }
  };

  // ============================================================
  //  菜单
  // ============================================================
  function buildMenu(label, key, def) {
    var on = S.get(key, def);
    GM_registerMenuCommand((on ? '✔ ' : '✘ ') + label, function () {
      S.set(key, !on);
      location.reload();
    });
  }

  buildMenu('反调试自动绕过',     'antiDebug',  true);
  buildMenu('隐藏滚动条',        'scrollbar',   true);
  buildMenu('去广告（无感）',    'adBlock',     true);
  buildMenu('豆瓣跳转',          'douban',      true);
  buildMenu('唤醒/刷新后暂停',   'pauseOnWake', true);
  buildMenu('播放卡死自愈',      'stallHeal',   true);

  // ============================================================
  //  1. 反调试自动绕过
  // ============================================================
  if (S.get('antiDebug', true)) {
    // 1. 设置绕过标记
    localStorage.setItem('__internal_devtools_bypass', '1');
    sessionStorage.setItem('__internal_devtools_bypass', '1');

    // 2. 保存并恢复 document.onkeydown（防止网站反调试覆盖媒体键处理）
    var origOnKeydown = document.onkeydown;

    // 3. 拦截 alert（阻断"请关闭控制台"弹窗）
    var origAlert = window.alert;
    window.alert = function (msg) {
      if (msg && msg.indexOf('请关闭控制台') !== -1) return;
      return origAlert.apply(window, arguments);
    };

    // 4. 清除已有的 debuggerInterval 定时器（通过覆写 setInterval 捕获）
    var origSetInterval = window.setInterval;
    var debuggerTimers = [];
    window.setInterval = function (fn, ms) {
      var fnStr = fn.toString();
      // 检测反调试的 debugger 定时器（含 debugger 语句或执行间隔 <= 200ms）
      if (fnStr.indexOf('debugger') !== -1 || (ms && ms <= 200)) {
        var id = origSetInterval.call(window, function () {}, 999999);
        debuggerTimers.push(id);
        return id;
      }
      return origSetInterval.apply(window, arguments);
    };

    // 5. 更强力的 DevToolsDetector 补丁
    var patchTimer = origSetInterval.call(window, function () {
      // 清除 debugger 定时器
      debuggerTimers.forEach(function (id) { clearInterval(id); clearTimeout(id); });
      debuggerTimers = [];

      // 恢复 document.onkeydown（如果被网站反调试覆盖了）
      if (document.onkeydown && document.onkeydown.toString().indexOf('debugger') !== -1) {
        document.onkeydown = origOnKeydown;
      }

      // patch DevToolsDetector
      if (typeof DevToolsDetector !== 'undefined') {
        // 完全禁用检测
        DevToolsDetector.prototype.init = function () {};
        DevToolsDetector.prototype.start = function () {};
        DevToolsDetector.prototype.check = function () {};
        DevToolsDetector.prototype.checkPerformance = function () {};
        DevToolsDetector.prototype.showDebuggerAlertAndBlock = function () {};

        // 清除已有的检测定时器
        if (this && this.checkTimer) clearInterval(this.checkTimer);
        if (this && this.timer) clearInterval(this.timer);

        clearInterval(patchTimer);
      }
    }, 500);

    // 6. 恢复 setInterval 原始方法（5秒后，广告 SDK 加载窗口期过后）
    setTimeout(function () {
      window.setInterval = origSetInterval;
    }, 5000);
  }

  // ============================================================
  //  2. 隐藏滚动条
  // ============================================================
  if (S.get('scrollbar', true)) {
    var scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = 'html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }';
    (document.head || document.documentElement).appendChild(scrollbarStyle);
  }

  // ============================================================
  //  以下功能需要 DOM 就绪
  // ============================================================
  function onReady(fn) {
    if (document.body) { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  // ============================================================
  //  5. 唤醒/刷新后暂停（在去广告之前执行）
  // ============================================================
  if (S.get('pauseOnWake', true)) {
    (function () {
      var PAUSE_ONCE_KEY = 'rrmv_paused_once';
      var WATCHING_KEY = 'rrmv_watching';
      var needPause = sessionStorage.getItem(WATCHING_KEY) === '1' &&
                      sessionStorage.getItem(PAUSE_ONCE_KEY) !== '1';
      var pauseTime = 0;

      function pauseAllVideo() {
        var found = false;
        document.querySelectorAll('video').forEach(function (v) {
          try {
            if (!v.paused && !v.ended) {
              v.pause();
              v.setAttribute('data-rrmv-paused', '1');
              found = true;
            }
          } catch (e) {}
        });
        if (found) pauseTime = Date.now();
        return found;
      }

      var wakeMO = null;
      var wakeTimer = null;

      function watchForVideo() {
        if (!needPause) return;
        if (pauseAllVideo()) return;

        wakeMO = new MutationObserver(function () {
          if (!needPause) { wakeMO.disconnect(); wakeMO = null; return; }
          if (pauseAllVideo()) { wakeMO.disconnect(); wakeMO = null; }
        });
        wakeMO.observe(document.documentElement, { childList: true, subtree: true });

        var checkCount = 0;
        wakeTimer = setInterval(function () {
          checkCount++;
          if (!needPause || checkCount > 60) { clearInterval(wakeTimer); wakeTimer = null; if (wakeMO) { wakeMO.disconnect(); wakeMO = null; } return; }
          if (pauseAllVideo()) { clearInterval(wakeTimer); wakeTimer = null; if (wakeMO) { wakeMO.disconnect(); wakeMO = null; } }
        }, 500);
      }

      function cleanupWake() {
        if (wakeMO) { wakeMO.disconnect(); wakeMO = null; }
        if (wakeTimer) { clearInterval(wakeTimer); wakeTimer = null; }
      }

      var hiddenAt = 0;
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          hiddenAt = Date.now();
        } else if (hiddenAt > 0) {
          var gap = Date.now() - hiddenAt;
          hiddenAt = 0;
          if (gap > 10000 && !sessionStorage.getItem(PAUSE_ONCE_KEY)) {
            sessionStorage.setItem(PAUSE_ONCE_KEY, '1');
            needPause = true;
            watchForVideo();
          }
        }
      }, { passive: true });

      if (needPause) {
        sessionStorage.setItem(PAUSE_ONCE_KEY, '1');
        onReady(watchForVideo);
      }

      onReady(function () {
        document.addEventListener('play', function (e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            sessionStorage.setItem(WATCHING_KEY, '1');
            // 用户点播放立即恢复（不再二次按停），只清除本次唤醒暂停状态
            needPause = false;
            sessionStorage.removeItem(PAUSE_ONCE_KEY);
            cleanupWake();
          }
        }, true);
      });

      window.addEventListener('beforeunload', function () {
        sessionStorage.removeItem(PAUSE_ONCE_KEY);
        cleanupWake();
      }, { passive: true });
    })();
  }

  // ============================================================
  //  6. 播放卡死自愈（waiting 转圈不恢复 → 软重载 → 刷新页面）
  // ============================================================
  if (S.get('stallHeal', true)) {
    (function () {
      var HEAL_COUNT_KEY = 'rrmv_heal_count';
      var HEAL_TIME_KEY = 'rrmv_heal_time';
      var stallTimer = null;
      var softTried = false;

      function healCountOk() {
        var now = Date.now();
        var last = parseInt(sessionStorage.getItem(HEAL_TIME_KEY) || '0', 10);
        if (now - last > 10 * 60 * 1000) {
          sessionStorage.setItem(HEAL_TIME_KEY, String(now));
          sessionStorage.setItem(HEAL_COUNT_KEY, '0');
          return true;
        }
        var n = parseInt(sessionStorage.getItem(HEAL_COUNT_KEY) || '0', 10);
        return n < 2;
      }

      function bumpHealCount() {
        var n = parseInt(sessionStorage.getItem(HEAL_COUNT_KEY) || '0', 10);
        sessionStorage.setItem(HEAL_COUNT_KEY, String(n + 1));
      }

      function clearStallTimer() {
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
      }

      function onStallTimeout(video) {
        // 已恢复、已暂停或数据充足则不处理
        if (!video.isConnected || video.paused || video.readyState >= 3) return;
        if (!softTried && healCountOk()) {
          // 软恢复：重新加载当前源
          softTried = true;
          bumpHealCount();
          console.log('[增强包] 播放卡死，尝试软恢复（重新加载视频源）');
          var t = video.currentTime;
          video.load();
          video.addEventListener('loadedmetadata', function once() {
            video.removeEventListener('loadedmetadata', once);
            try { video.currentTime = t; } catch (e) {}
            video.play().catch(function () {});
          });
          armStallTimer(video, true);
        } else if (healCountOk()) {
          // 硬恢复：刷新页面（网站有续播，进度不丢）
          bumpHealCount();
          console.log('[增强包] 软恢复无效，刷新页面');
          location.reload();
        }
      }

      function armStallTimer(video, isRetry) {
        clearStallTimer();
        stallTimer = setTimeout(function () { onStallTimeout(video); }, isRetry ? 10000 : 8000);
      }

      onReady(function () {
        // waiting：缓冲不足（转圈出现）
        document.addEventListener('waiting', function (e) {
          if (!e.target || e.target.tagName !== 'VIDEO') return;
          softTried = false;
          armStallTimer(e.target, false);
        }, true);

        // 恢复播放/暂停/换源 → 取消计时
        ['playing', 'canplay', 'pause', 'emptied', 'error'].forEach(function (ev) {
          document.addEventListener(ev, function (e) {
            if (e.target && e.target.tagName === 'VIDEO') clearStallTimer();
          }, true);
        });
      });
    })();
  }

  // ============================================================
  //  3. 去广告（无感版）
  // ============================================================
  if (S.get('adBlock', true)) {
    onReady(function () {

      // --- Phase A: CSS 隐藏广告元素 ---
      var adCSS = document.createElement('style');
      adCSS.id = 'rrmv-ad-css';
      adCSS.textContent = [
        '#adPlayContainer,',
        '[class*="QH_SSP_OPENWINDOW_AD"],',
        '[class*="openWindowAd"],',
        '[class*="popupAd"],',
        '[class*="bannerAd"],',
        '[class*="iconAdContainer"],',
        '[class*="textLinkAd"],',
        '[class*="adSignWrapper"],',
        '[class*="closeAdSign"],',
        '.xgplayer-ads, xg-ad, xg-ad-stub,',
        '[class*="sssdk-ad"],',
        '[id*="ssp_ad"],',
        '[id*="QH_SSP"],',
        '#QH_SSP_AD_WINDOW_MAX,',
        '[class*="ad-container"],',
        '[class*="prism-ad"],',
        '[class*="ad-overlay"],',
        '[class*="ad-mask"],',
        '[data-rrmv-ad="hide"],',
        '[class*="member-modal"],',
        '[class*="vip-modal"],',
        '[class*="membership-modal"],',
        '[class*="pay-modal"],',
        '[class*="upgrade-modal"],',
        '[class*="subscribe-modal"],',
        '[class*="union-member"],',
        '[class*="joint-vip"],',
        '[class*="promo-modal"],',
        '[class*="promotion-modal"],',
        '[class*="open-window-ad"],',
        '[class*="float-ad"],',
        '[class*="pop-ad"],',
        '[class*="modal-mask"][data-rrmv-ad="hide"],',
        '[class*="dialog-mask"][data-rrmv-ad="hide"] {',
        '  opacity: 0 !important;',
        '  pointer-events: none !important;',
        '  visibility: hidden !important;',
        '  display: none !important;',
        '}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(adCSS);

      // --- Phase B: 动态隐藏广告提示文案 ---
      var AD_TIP_KEYWORDS = ['秒后展示广告', '开通VIP免广告', '联合会员', '立即前往', '开通会员', 'VIP特惠', '免广告'];
      function hideAdTips(node) {
        if (node.nodeType !== 1) return;
        var text = node.textContent || '';
        for (var k = 0; k < AD_TIP_KEYWORDS.length; k++) {
          if (text.includes(AD_TIP_KEYWORDS[k])) {
            node.setAttribute('data-rrmv-ad', 'hide');
            return;
          }
        }
        var children = node.querySelectorAll('*');
        for (var i = 0; i < children.length; i++) {
          var t = children[i].textContent || '';
          for (var k2 = 0; k2 < AD_TIP_KEYWORDS.length; k2++) {
            if (t.includes(AD_TIP_KEYWORDS[k2]) && children[i].children.length < 5) {
              children[i].setAttribute('data-rrmv-ad', 'hide');
              break;
            }
          }
        }
      }

      // --- Phase C: 拦截 360 SSP SDK（用完即弃，不长期覆写 createElement） ---
      var sspIntercepted = false;
      var origCreateEl = document.createElement.bind(document);
      document.createElement = function (tag) {
        var el = origCreateEl(tag);
        if (!sspIntercepted && tag.toLowerCase() === 'script') {
          var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
          if (origSrcDesc && origSrcDesc.set) {
            Object.defineProperty(el, 'src', {
              get: function () { return origSrcDesc.get.call(this); },
              set: function (val) {
                if (typeof val === 'string' && (val.indexOf('ssp_sdk') !== -1 || val.indexOf('ssp.360.cn') !== -1)) {
                  this.type = 'text/javascript'; return;
                }
                return origSrcDesc.set.call(this, val);
              }
            });
          }
        }
        return el;
      };
      // 5秒后恢复原始 createElement，避免长期影响性能
      setTimeout(function () {
        document.createElement = origCreateEl;
        sspIntercepted = true;
      }, 5000);

      function removeExistingSspSdk() {
        document.querySelectorAll('script[src*="ssp_sdk"], script[src*="ssp.360.cn"]').forEach(function (el) { el.remove(); });
      }
      removeExistingSspSdk();

      // --- Phase D: 拦截广告请求 (fetch / XHR) ---
      var AD_DOMAINS = ['ssp.360.cn', 'mediav.com', 'sspweb', 'doubleclick', 'googlesyndication', 'pagead', 'googleadservices', 'imasdk.googleapis.com', 'fengkongcloud.cn', 'openfpcdn.io'];

      function isAdUrl(url) {
        if (typeof url !== 'string') return false;
        var lower = url.toLowerCase();
        for (var i = 0; i < AD_DOMAINS.length; i++) {
          if (lower.indexOf(AD_DOMAINS[i]) !== -1) return true;
        }
        return false;
      }

      var AD_VIDEO_DOMAINS = ['mediav.com', 'live-s3m.mediav', 's3m.mediav.com', 'doubleclick.net', 'googlesyndication.com', 'pagead2.googlesyndication.com'];

      function isAdVideoUrl(url) {
        if (typeof url !== 'string') return false;
        var lower = url.toLowerCase();
        for (var i = 0; i < AD_VIDEO_DOMAINS.length; i++) {
          if (lower.indexOf(AD_VIDEO_DOMAINS[i]) !== -1) return true;
        }
        return false;
      }

      var savedContentSrc = null;

      // --- Phase E: video.src 拦截 ---
      // 只阻止广告 URL 设置，不替换为内容源，避免干扰网站恢复逻辑
      var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      if (origSrcDesc && origSrcDesc.set) {
        Object.defineProperty(HTMLMediaElement.prototype, 'src', {
          get: function () {
            try { return origSrcDesc.get.call(this); }
            catch (e) { return ''; }
          },
          set: function (val) {
            try {
              if (typeof val === 'string' && val.length > 0) {
                if (isAdVideoUrl(val)) {
                  // 广告源 → 阻止设置，不替换，让网站自己的恢复逻辑处理
                  console.log('[增强包] 阻止广告源设置');
                  return;
                }
                savedContentSrc = val;
              }
              return origSrcDesc.set.call(this, val);
            } catch (e) {
              return origSrcDesc.set.call(this, val);
            }
          },
          configurable: true,
          enumerable: true
        });
      }

      var origFetch = window.fetch;
      window.fetch = function () {
        var url = (arguments[0] && typeof arguments[0] === 'string') ? arguments[0] :
                  (arguments[0] && arguments[0].url) ? arguments[0].url : '';
        if (isAdUrl(url)) return Promise.resolve(new Response('', { status: 204 }));
        return origFetch.apply(this, arguments);
      };

      var origXhrOpen = XMLHttpRequest.prototype.open;
      var origXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (isAdUrl(url)) { this._blocked = true; return; }
        return origXhrOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this._blocked) return;
        return origXhrSend.apply(this, arguments);
      };

      // --- Phase F: 视频监控 + 广告恢复 ---
      var userPaused = false;

      function findMainVideo() {
        return document.querySelector('#ve-player-container video') ||
               document.querySelector('#player-container video') ||
               document.querySelector('.xgplayer video') ||
               document.querySelector('#ve-player video');
      }

      function isAdElement(el) {
        if (!el || (!el.classList && !el.id)) return false;
        var cls = el.className ? el.className.toString() : '';
        var id = el.id || '';
        return (
          cls.indexOf('openWindowAd') !== -1 || cls.indexOf('popupAd') !== -1 ||
          cls.indexOf('bannerAd') !== -1 || cls.indexOf('iconAdContainer') !== -1 ||
          cls.indexOf('textLinkAd') !== -1 || cls.indexOf('adSignWrapper') !== -1 ||
          cls.indexOf('closeAdSign') !== -1 || cls.indexOf('sssdk-ad') !== -1 ||
          cls.indexOf('xgplayer-ads') !== -1 || id === 'QH_SSP_AD_WINDOW_MAX' ||
          id.indexOf('ssp_ad') !== -1 || id.indexOf('QH_SSP') !== -1 ||
          el.tagName === 'XG-AD' || el.tagName === 'XG-AD-STUB' ||
          cls.indexOf('member-modal') !== -1 || cls.indexOf('vip-modal') !== -1 ||
          cls.indexOf('membership-modal') !== -1 || cls.indexOf('pay-modal') !== -1 ||
          cls.indexOf('upgrade-modal') !== -1 || cls.indexOf('subscribe-modal') !== -1 ||
          cls.indexOf('union-member') !== -1 || cls.indexOf('joint-vip') !== -1 ||
          cls.indexOf('promo-modal') !== -1 || cls.indexOf('promotion-modal') !== -1 ||
          cls.indexOf('float-ad') !== -1 || cls.indexOf('pop-ad') !== -1
        );
      }

      function hideElement(el) {
        if (el && el.style) el.setAttribute('data-rrmv-ad', 'hide');
      }

      var pageLoadTime = Date.now();
      var seen = new WeakSet();

      // --- Media Session API：全局媒体按键支持 ---
      function setupMediaSession(video) {
        if (!navigator.mediaSession) return;

        // 设置元数据
        var title = document.title.replace(/-人人视频$/, '').trim();
        if (title && !navigator.mediaSession.metadata) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: '人人视频',
            album: '人人视频'
          });
        }

        // 注册 action handler（用 findMainVideo 动态查找，不用闭包引用）
        try {
          navigator.mediaSession.setActionHandler('play', function () {
            var v = findMainVideo();
            if (v) v.play().catch(function () {});
          });
          navigator.mediaSession.setActionHandler('pause', function () {
            var v = findMainVideo();
            if (v) v.pause();
          });
          navigator.mediaSession.setActionHandler('previoustrack', function () {
            var v = findMainVideo();
            if (v) v.currentTime = Math.max(0, v.currentTime - 10);
          });
          navigator.mediaSession.setActionHandler('nexttrack', function () {
            var v = findMainVideo();
            if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          });
          navigator.mediaSession.setActionHandler('seekbackward', function (details) {
            var v = findMainVideo();
            if (v) v.currentTime = Math.max(0, v.currentTime - (details.seekOffset || 10));
          });
          navigator.mediaSession.setActionHandler('seekforward', function (details) {
            var v = findMainVideo();
            if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + (details.seekOffset || 10));
          });
        } catch (e) {}

        // 同步播放状态（用 findMainVideo 动态查找）
        video.addEventListener('play', function () {
          navigator.mediaSession.playbackState = 'playing';
        }, { passive: true });
        video.addEventListener('pause', function () {
          navigator.mediaSession.playbackState = 'paused';
        }, { passive: true });
        video.addEventListener('ended', function () {
          navigator.mediaSession.playbackState = 'none';
        }, { passive: true });
      }

      // --- 备选方案：keydown 事件直接捕获媒体键 ---
      var mediaKeyHandled = false;
      function setupMediaKeyListener() {
        if (mediaKeyHandled) return;
        mediaKeyHandled = true;

        document.addEventListener('keydown', function (e) {
          var video = findMainVideo();
          if (!video) return;

          // MediaPlayPause: 播放/暂停切换
          if (e.key === 'MediaPlayPause' || e.code === 'MediaPlayPause' || e.keyCode === 179) {
            e.preventDefault();
            e.stopPropagation();
            if (video.paused) {
              video.play().catch(function (err) {
                console.warn('[增强包] 媒体键 play 失败:', err.message);
              });
            } else {
              video.pause();
            }
            return;
          }

          // MediaTrackNext: 下一曲/快进
          if (e.key === 'MediaTrackNext' || e.code === 'MediaTrackNext' || e.keyCode === 176) {
            e.preventDefault();
            e.stopPropagation();
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
            return;
          }

          // MediaTrackPrevious: 上一曲/后退
          if (e.key === 'MediaTrackPrevious' || e.code === 'MediaTrackPrevious' || e.keyCode === 177) {
            e.preventDefault();
            e.stopPropagation();
            video.currentTime = Math.max(0, video.currentTime - 10);
            return;
          }
        }, true); // capture 阶段，最先拦截
      }

      // 初始化时就设置 keydown 监听（不等视频出现）
      setupMediaKeyListener();

      function hookVideo(video) {
        if (seen.has(video)) return;
        seen.add(video);

        if (video.src && !isAdVideoUrl(video.src)) savedContentSrc = video.src;

        // 设置 MediaSession
        setupMediaSession(video);

        video.addEventListener('play', function () {
          userPaused = false;
          if (video.src && !isAdVideoUrl(video.src)) savedContentSrc = video.src;
        }, { passive: true });

        video.addEventListener('pause', function () {
          if (video.src && isAdVideoUrl(video.src)) return;
          if (video.ended || video.seeking) return;
          if (Date.now() - pageLoadTime < 3000) return;
          // 标签不可见时的暂停是浏览器行为（切标签/最小化），不是用户手动暂停
          if (document.hidden) return;
          // 广告覆盖层存在时的暂停是网站行为，不是用户手动暂停
          var adOverlay = document.querySelector('#adPlayContainer');
          if (adOverlay) return;
          userPaused = true;
        }, { passive: true });

        video.addEventListener('timeupdate', function () {
          if (video.src && !isAdVideoUrl(video.src) && video.readyState >= 2) savedContentSrc = video.src;
        }, { passive: true });
        video.addEventListener('loadeddata', function () {
          if (video.src && !isAdVideoUrl(video.src)) savedContentSrc = video.src;
        }, { passive: true });
      }

      function stealthCleanup() {
        var video = findMainVideo();

        document.querySelectorAll(
          '[class*="openWindowAd"], [class*="popupAd"], [class*="bannerAd"],' +
          '[class*="iconAdContainer"], [class*="textLinkAd"], [class*="adSignWrapper"],' +
          '[class*="closeAdSign"], #QH_SSP_AD_WINDOW_MAX, [class*="sssdk-ad"],' +
          '[id*="ssp_ad"], [id*="QH_SSP"], .xgplayer-ads, xg-ad, xg-ad-stub,' +
          '[class*="member-modal"], [class*="vip-modal"], [class*="membership-modal"],' +
          '[class*="pay-modal"], [class*="upgrade-modal"], [class*="subscribe-modal"],' +
          '[class*="union-member"], [class*="joint-vip"], [class*="promo-modal"],' +
          '[class*="promotion-modal"], [class*="float-ad"], [class*="pop-ad"]'
        ).forEach(hideElement);

        // 自动关闭会员/VIP推广弹窗
        document.querySelectorAll('[data-rrmv-ad="hide"]').forEach(function (el) {
          if (el.offsetParent !== null) {
            tryClosePopup(el);
          }
        });

        document.querySelectorAll('video').forEach(function (v) {
          if (v !== video) {
            var src = v.src || (v.querySelector('source') && v.querySelector('source').src) || '';
            if (isAdVideoUrl(src)) {
              v.pause();
              v.setAttribute('data-rrmv-ad', 'hide');
            }
          }
        });

        // 不要移除 xgplayer 的 ad class，会触发布局变化导致退出网页全屏
        // 用 CSS 覆盖其视觉效果即可
      }

      // --- DOM 变化监控：只监听播放器容器，不监听整个 document ---
      var playerContainer = document.querySelector('#ve-player-container') ||
                            document.querySelector('#player-container');

      if (playerContainer) {
        var observer = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];

            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node.nodeType !== 1) continue;

              var videos = node.tagName === 'VIDEO' ? [node] :
                (node.querySelectorAll ? Array.from(node.querySelectorAll('video')) : []);
              videos.forEach(function (v) { hookVideo(v); });

              if (node.classList && isAdElement(node)) {
                hideElement(node);
              }

              hideAdTips(node);
            }
          }
        });

        observer.observe(playerContainer, {
          childList: true, subtree: true
        });
      } else {
        // 播放器容器还没出现，等它出现后再监听
        onReady(function () {
          var waitContainer = setInterval(function () {
            var pc = document.querySelector('#ve-player-container') ||
                     document.querySelector('#player-container');
            if (pc) {
              clearInterval(waitContainer);
              var obs = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                  var m = mutations[i];
                  for (var j = 0; j < m.addedNodes.length; j++) {
                    var node = m.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    var videos = node.tagName === 'VIDEO' ? [node] :
                      (node.querySelectorAll ? Array.from(node.querySelectorAll('video')) : []);
                    videos.forEach(function (v) { hookVideo(v); });
                    if (node.classList && isAdElement(node)) hideElement(node);
                    hideAdTips(node);
                  }
                }
              });
              obs.observe(pc, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ['class']
              });
            }
          }, 500);
        });
      }

      // --- Phase G: 全页面弹窗自动隐藏（会员/VIP 推广弹窗） ---
      var POPUP_KEYWORDS = ['联合会员', '立即前往', '开通VIP', '开通会员', 'VIP特惠', '免广告', '附赠', '不限量'];
      var CLOSE_BTN_SELECTORS = [
        '[class*="close"]', '[class*="Close"]', '[aria-label="close"]', '[aria-label="Close"]',
        'button svg', '.modal-close', '.dialog-close', '.popup-close'
      ];

      function isPopupAd(el) {
        if (!el || el.nodeType !== 1) return false;
        var cls = (el.className && el.className.toString()) || '';
        var id = el.id || '';
        // 已知广告 class
        if (cls.indexOf('member-modal') !== -1 || cls.indexOf('vip-modal') !== -1 ||
            cls.indexOf('membership-modal') !== -1 || cls.indexOf('pay-modal') !== -1 ||
            cls.indexOf('upgrade-modal') !== -1 || cls.indexOf('subscribe-modal') !== -1 ||
            cls.indexOf('union-member') !== -1 || cls.indexOf('joint-vip') !== -1 ||
            cls.indexOf('promo-modal') !== -1 || cls.indexOf('promotion-modal') !== -1 ||
            cls.indexOf('popupAd') !== -1 || cls.indexOf('openWindowAd') !== -1) {
          return true;
        }
        // 检查文本内容是否包含推广关键词
        var text = el.textContent || '';
        for (var k = 0; k < POPUP_KEYWORDS.length; k++) {
          if (text.includes(POPUP_KEYWORDS[k])) {
            // 再检查是否是模态框/弹窗样式（固定定位 + 高 z-index）
            var style = window.getComputedStyle(el);
            if (style && (style.position === 'fixed' || style.position === 'absolute') &&
                parseInt(style.zIndex, 10) > 100) {
              return true;
            }
          }
        }
        return false;
      }

      function tryClosePopup(el) {
        // 尝试点击关闭按钮
        for (var s = 0; s < CLOSE_BTN_SELECTORS.length; s++) {
          var btn = el.querySelector(CLOSE_BTN_SELECTORS[s]);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        }
        return false;
      }

      function hidePopupAd(el) {
        if (tryClosePopup(el)) return;
        el.setAttribute('data-rrmv-ad', 'hide');
      }

      var fullPageObserver = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType !== 1) continue;
            if (isPopupAd(node)) {
              hidePopupAd(node);
              continue;
            }
            // 检查子元素中的弹窗
            if (node.querySelectorAll) {
              var popups = node.querySelectorAll(
                '[class*="member-modal"], [class*="vip-modal"], [class*="membership-modal"],' +
                '[class*="pay-modal"], [class*="upgrade-modal"], [class*="subscribe-modal"],' +
                '[class*="union-member"], [class*="joint-vip"], [class*="promo-modal"],' +
                '[class*="promotion-modal"], [class*="popupAd"], [class*="openWindowAd"]'
              );
              popups.forEach(function (p) { hidePopupAd(p); });
            }
          }
        }
      });

      if (document.body) {
        fullPageObserver.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          fullPageObserver.observe(document.body, { childList: true, subtree: true });
        });
      }

      // 初始 hook + 巡检定时器（带清理保护）
      document.querySelectorAll('video').forEach(function (v) { hookVideo(v); });

      var cleanupTimer = setInterval(stealthCleanup, 2000);
      var stuckTimer = setInterval(function () {
        var video = findMainVideo();
        if (!video || video.paused || video.ended) return;
        var ct = video.currentTime;
        if (ct === lastCheckTime) {
          stuckCount++;
          if (stuckCount > 4) {
            stuckCount = 0;
            stealthCleanup();
          }
        } else { stuckCount = 0; }
        lastCheckTime = ct;
      }, 2000);

      var lastCheckTime = 0, stuckCount = 0;

      // 页面卸载时清理定时器
      window.addEventListener('beforeunload', function () {
        clearInterval(cleanupTimer);
        clearInterval(stuckTimer);
        if (observer) observer.disconnect();
        if (fullPageObserver) fullPageObserver.disconnect();
      }, { passive: true });
    });
  }

  // ============================================================
  //  4. 豆瓣跳转
  // ============================================================
  if (S.get('douban', true)) {
    onReady(function () {

      function getDramaName() {
        var title = document.title;
        if (title) {
          var match = title.match(/^(.+?)[\s-]*人人视频/);
          if (match) return match[1].trim();
        }
        var nameEl = document.querySelector('[class*="text-xl"], [class*="text-2xl"], [class*="font-bold"]');
        if (nameEl) return nameEl.textContent.trim();
        return null;
      }

      function createDoubanButton(dramaName) {
        var btn = document.createElement('a');
        btn.href = 'https://search.douban.com/movie/subject_search?search_text=' + encodeURIComponent(dramaName);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 8px;margin-left:8px;font-size:12px;color:#00b51d;background:rgba(0,181,29,0.1);border:1px solid rgba(0,181,29,0.3);border-radius:4px;text-decoration:none;cursor:pointer;transition:all 0.2s';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg> 豆瓣';
        btn.onmouseenter = function () { btn.style.background = 'rgba(0,181,29,0.2)'; };
        btn.onmouseleave = function () { btn.style.background = 'rgba(0,181,29,0.1)'; };
        return btn;
      }

      function injectDoubanButton() {
        var dramaName = getDramaName();
        if (!dramaName) return;

        var titleContainers = document.querySelectorAll('div');
        for (var i = 0; i < titleContainers.length; i++) {
          var container = titleContainers[i];
          var children = Array.from(container.children);
          if (children.length < 2) continue;

          var hasTitle = children.some(function (el) { return el.textContent.trim() === dramaName; });
          var hasIntro = children.some(function (el) { return el.textContent.trim() === '简介'; });

          if (hasTitle && hasIntro) {
            if (container.querySelector('[data-douban]')) return;
            var introBtn = children.find(function (el) { return el.textContent.trim() === '简介'; });
            if (introBtn) {
              var doubanBtn = createDoubanButton(dramaName);
              doubanBtn.setAttribute('data-douban', 'true');
              introBtn.parentNode.insertBefore(doubanBtn, introBtn.nextSibling);
            }
            break;
          }
        }
      }

      var doubanObserver = new MutationObserver(function () { injectDoubanButton(); });
      doubanObserver.observe(document.body, { childList: true, subtree: true });
      injectDoubanButton();
    });
  }

})();
