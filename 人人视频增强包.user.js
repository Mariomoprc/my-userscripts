// ==UserScript==
// @name         人人视频增强包
// @namespace    http://tampermonkey.net/
// @version      2.9.8
// @description  反调试绕过 + 隐藏滚动条 + 无感去广告(播放态自动续播/暂停态保持/loading修复) + 豆瓣跳转 + 唤醒后暂停(点播放即恢复) + 播放卡死自愈(智能判定不误伤正常缓冲+慢速播放识别含慢动作+seek卡死识别+seek循环识别) + 播放器修复(渲染层hack) + 豆瓣页跳转人人 | 菜单可开关
// @author       opencode
// @match        *://*.yichengwlkj.com/*
// @match         *://*.rrmj.plus/*
// @match        *://*.bwcgee.cn/*
// @match        https://movie.douban.com/subject/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/人人视频增强包.user.js
// @downloadURL  https://raw.githubusercontent.com/Mariomoprc/my-userscripts/main/人人视频增强包.user.js
// @run-at       document-start
// ==/UserScript==

(function () {
   'use strict';

  // ============================================================
  //  设 置读写
  // ============================================================
  var S = {
     get: function (k, d) { var v = localStorage .getItem('rrmv_' + k); return v !== null ? v  === '1' : d; },
    set: function (k, v) { localStorage.setItem('rrmv_' + k, v ? '1' : '0' ); }
  };

  // ============================================================
  //  菜单
   // ============================================================
  window.__rrmv_lastAdBlockAt = 0;
  function buildMenu(label, key, def) {
    var on = S.get(key, def);
    GM_registerMenuCommand((on ? '✔ ' : '✘ ') + label, function () {
      S.set(key, !on);
       location.reload();
    });
  }

  buildMenu('反调试自动绕过',     'antiDebug',   true);
  buildMenu('隐藏滚动条',         'scrollbar',   true);
  buildMenu('去广告（无感）',    'adBlock',     true);
  buildMenu('豆瓣跳转',          'douban',       true);
  buildMenu('唤醒/刷新后暂停',    'pauseOnWake', true);
  buildMenu('播放卡死自愈',      'stallHeal',   true);
  buildMenu('播放器修复',        'videoFix',    true);
  buildMenu('豆瓣页跳转人人',    'doubanJump',  true);

  // ============================================================
  //  1. 反调试自动绕 过
  // ============================================================
  if (S.get('antiDebug', true)) {
    // 1. 设置绕过标记
     localStorage.setItem('__internal_devtools_bypass', '1');
    sessionStorage.setItem('__internal_devtools_bypass', '1');

    // 2. 保存并恢复 document.onkeydown（防止网站反调试覆盖媒体键处理）
    var origOnKeydown = document.onkeydown;

    // 3.  拦截 alert（阻断"请关闭控制台"弹 窗）
    var origAlert = window.alert;
     window.alert = function (msg) {
      if (msg  && msg.indexOf('请关闭控制台') !== -1)  return;
      return origAlert.apply(window,  arguments);
    };

    // 4. 清除已有的 debuggerInterval 定时器（通过覆写 setInterval 捕获）
    var origSetInterval  = window.setInterval;
    var debuggerTimers  = [];
    window.setInterval = function (fn,  ms) {
      var fnStr = fn.toString();
      // 检测反调试的 debugger 定时器（含 debugger 语句或执行间隔 <= 200ms）
       if (fnStr.indexOf('debugger') !== -1 ||  (ms && ms <= 200)) {
        var id = origSetInterval.call(window, function () {}, 999999 );
        debuggerTimers.push(id);
        return id;
      }
      return origSetInterval.apply(window, arguments);
    };

    // 5.  更强力的 DevToolsDetector 补丁
    var  patchTimer = origSetInterval.call(window, function () {
      // 清除 debugger 定时器
      debuggerTimers.forEach(function (id)  { clearInterval(id); clearTimeout(id); });
       debuggerTimers = [];

      // 恢复 document.onkeydown（如果被网站反调试覆 盖了）
      if (document.onkeydown && document.onkeydown.toString().indexOf('debugger' ) !== -1) {
        document.onkeydown = origOnKeydown;
      }

      // patchDevToolsDetector
      if (typeof DevToolsDetector !==  'undefined') {
        // 完全禁用检测
         DevToolsDetector.prototype.init = function () {};
        DevToolsDetector.prototype.start = function () {};
        DevToolsDetector.prototype.check = function () {};
         DevToolsDetector.prototype.checkPerformance = function () {};
        DevToolsDetector .prototype.showDebuggerAlertAndBlock = function () {};

        // 清除已有的检测定时器
        if (this && this.checkTimer)  clearInterval(this.checkTimer);
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
  //  2.  隐藏滚动条
  // ============================================================
  if (S .get('scrollbar', true)) {
    var scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = 'html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none  !important; }';
    (document.head || document.documentElement).appendChild(scrollbarStyle );
  }

  // ============================================================
  //  以下功能需要 DOM 就绪
  // ============================================================
  function onReady(fn) {
    if (document.body) {  fn(); }
    else { document.addEventListener ('DOMContentLoaded', fn); }
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
        document.querySelectorAll ('video').forEach(function (v) {
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

      function watchForVideo () {
        if (!needPause) return;
         if (pauseAllVideo()) return;

        wakeMO  = new MutationObserver(function () {
           if (!needPause) { wakeMO.disconnect(); wakeMO = null; return; }
          if (pauseAllVideo()) { wakeMO.disconnect(); wakeMO = null;  }
        });
        wakeMO.observe(document .documentElement, { childList: true, subtree:  true });

        var checkCount = 0;
         wakeTimer = setInterval(function () {
           checkCount++;
          if (!needPause || checkCount > 60) { clearInterval(wakeTimer) ; wakeTimer = null; if (wakeMO) { wakeMO.disconnect(); wakeMO = null; } return; }
           if (pauseAllVideo()) { clearInterval(wakeTimer); wakeTimer = null; if (wakeMO) { wakeMO. disconnect(); wakeMO = null; } }
        }, 500);
      }

      function cleanupWake() {
         if (wakeMO) { wakeMO.disconnect(); wakeMO = null; }
        if (wakeTimer) { clearInterval(wakeTimer); wakeTimer = null; }
       }

      var hiddenAt = 0;
      document.addEventListener('visibilitychange', function  () {
        if (document.hidden) {
           hiddenAt = Date.now();
        } else if (hiddenAt > 0) {
          var gap = Date.now()  - hiddenAt;
          hiddenAt = 0;
           if (gap > 10000 && !sessionStorage.getItem(PAUSE_ONCE_KEY)) {
            sessionStorage. setItem(PAUSE_ONCE_KEY, '1');
            needPause = true;
            watchForVideo();
           }
        }
      }, { passive: true  });

      if (needPause) {
        sessionStorage.setItem(PAUSE_ONCE_KEY, '1');
         onReady(watchForVideo);
      }

      onReady(function () {
        document.addEventListener('play', function (e) {
          if (e.target && e.target.tagName === 'VIDEO') {
             sessionStorage.setItem(WATCHING_KEY,  '1');
            // 用户点播放立即恢 复（不再二次按停），只清除本次 唤醒暂停状态
            needPause = false;
            sessionStorage.removeItem(PAUSE_ONCE_KEY);
            cleanupWake();
           }
        }, true);
      });

      window.addEventListener('beforeunload', function () {
        sessionStorage.removeItem(PAUSE_ONCE_KEY);
        cleanupWake();
      },  { passive: true });
    })();
  }

  // ============================================================
  //  6. 播放卡死自愈（currentTime 零进展才判定真卡死 → play 重试 → 软重载 → 刷新页面）
  //      不再用固定超时触发 video.load() ：暂停恢复/seek 后的正常缓冲
  //      （currentTime 几秒内恢复推进）则会被误判，避免短等待被放大成大量重载
  // ============================================================
  if (S.get('stallHeal', true)) {
    (function () {
       var HEAL_COUNT_KEY = 'rrmv_heal_count';
       var HEAL_TIME_KEY = 'rrmv_heal_time';
       var stallTimer = null;
      var softTried =  false;

      function healCountOk() {
         var now = Date.now();
        var last = parseInt(sessionStorage.getItem(HEAL_TIME_KEY)  || '0', 10);
        if (now - last > 10 * 60 * 1000) {
          sessionStorage.setItem( HEAL_TIME_KEY, String(now));
          sessionStorage.setItem(HEAL_COUNT_KEY, '0');
           return true;
        }
        var n = parseInt(sessionStorage.getItem(HEAL_COUNT_KEY)  || '0', 10);
        return n < 2;
      }

       function bumpHealCount() {
        var  n = parseInt(sessionStorage.getItem(HEAL_COUNT_KEY) || '0', 10);
        sessionStorage.setItem(HEAL_COUNT_KEY, String(n + 1));
      } 

      function clearStallTimer() {
         if (stallTimer) { clearInterval(stallTimer);  stallTimer = null; }
      }

      // 监控  currentTime 推进：连续 noProgressSec 秒零进展且未暂停 → 判定真卡死
       function armStallWatch(video, noProgressSec) {
        try {
          var lastAd2 = window.__rrmv_lastAdBlockAt || 0;
          if  (Date.now() - lastAd2 < 3000) return;
         } catch (err) {}
        clearStallTimer(); 
        var lastTime = -1;
        var still  = 0;
        var slowCount = 0;
        var seekStart = 0;
        stallTimer = setInterval(function () {
          if (!video.isConnected || video.paused) { clearStallTimer(); return; }
           if (video.seeking) {
            // [v2.9.5] seeking 卡死检测：seek 超过 10 秒未完成 → 判定卡死
            if (!seekStart) seekStart = Date.now();
            if (Date.now() - seekStart > 10000) { clearStallTimer(); onStallTimeout(video); return; }
            still = 0; slowCount = 0;
            return;
          }
          seekStart = 0;
           var delta = Math.abs(video.currentTime - lastTime);
           if (delta > 0.01) {
            lastTime = video.currentTime;
            still = 0;
            // [v2.9.7] 慢速播放检测：推进速率远低于预期 → 累计判定卡死（不再要求 readyState<3，覆盖慢动作卡顿）
            var expected = (video.playbackRate || 1) * 0.2;
            if (delta < expected) {
              slowCount++;
              if (slowCount >= noProgressSec) { clearStallTimer(); onStallTimeout(video); return; }
            } else {
              slowCount = 0;
              // 正常速率且数据充足 → 停止监控
              if (video.readyState >= 3) clearStallTimer();
            }
            return;
          }
          still++;
           if (still >= noProgressSec) {
            clearStallTimer();
            onStallTimeout(video);
          }
        }, 1000);
      }

       function onStallTimeout(video) {
         if (!video.isConnected || video.paused) return;
        if (!softTried) {
          // 一级：play() 重试（无损，很多卡死只是播放器状态机停住）
           softTried = true;
          console.log('[增强包] 播放停滞，尝试 play() 重试 ');
          try { video.play().catch(function () {}); } catch (e) {}
           setTimeout(function () {
             if (!video.isConnected || video.paused) return;
             var stillSlow = video.readyState < 3 && (video.seeking || Math.abs(video.currentTime - (video.__rrmvLastCheck || 0)) < 0.2);
             if (stillSlow) {
                // 第二级：软恢复（重？加载源，会丢 buffer，最后手段）
                if (!healCountOk()) { armStallWatch(video, 12); return; }
                bumpHealCount();
               console.log('[增强包] play() 重试无效，？恢复（重新加载视频源）');
                var t = video.currentTime;
                video.load();
               video.addEventListener('loadedmetadata', function once() { 
                 video.removeEventListener('loadedmetadata', once);
                 try {  video.currentTime = t; } catch (e) {}
                  video.play().catch(function () {});
                });
              armStallWatch (video, 12);
             } else {
              // 恢复或仍在慢速 → 重新监控（避免无人监控）
              armStallWatch(video, 12);
             }
           }, 4000) ;
        } else if (healCountOk()) {
           // 第三级：刷新页面（网站有续 播，进度不丢）
          bumpHealCount ();
          console.log('[增强包] 软恢 复无效，刷新页面');
          
          // [v2.9.1] 刷新前快照：保存进度与沉浸状态，刷新后还原窗口大小
          try {
            var __rrmv_v = document.querySelector('video');
            var __rrmv_t = (__rrmv_v && !isNaN(__rrmv_v.currentTime)) ? __rrmv_v.currentTime : 0;
            var __rrmv_isTheater = !!document.querySelector('.xgplayer-theater-btn.active, .xgplayer-enter-theater, [class*="theater"].active, .player-theater-active');
            var __rrmv_isFull = !!document.fullscreenElement;
            sessionStorage.setItem('rrmv_restore', JSON.stringify({t: __rrmv_t, theater: __rrmv_isTheater, isFull: __rrmv_isFull, ts: Date.now(), url: location.href}));
            sessionStorage.setItem('rrmv_expected_reload', String(Date.now()));
            console.log('[增强包] 刷新前快照 t=' + __rrmv_t.toFixed(1) + ' theater=' + __rrmv_isTheater);
          } catch(e) {}
          location.reload();
        }
      }

      onReady( function () {
        // 记录恢复播放时间，用于 waiting 宽限判断
        document.addEventListener('play', function (e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            e.target.__rrmvResumeAt = Date.now();
          }
        }, true);

        // waiting：缓冲不断（转圈出现）→ 开始监控时间推进，而非固定超时
        // 暂停恢复后 5 秒内触发的 waiting → 更长宽限（20 秒），避免 CDN 重连耗时误触发重载
        document.addEventListener('waiting', function (e) {
           if (!e.target || e.target.tagName !== 'VIDEO') return;
          try {
            var lastAd = window.__rrmv_lastAdBlockAt || 0;
             if (Date.now() - lastAd < 3000) return;
          } catch (err) {}
          softTried = false;
          e.target.__rrmvLastCheck = e.target.currentTime;
          var justResumed = Date.now() - (e.target.__rrmvResumeAt || 0) < 5000;
          armStallWatch(e.target, justResumed ? 20 : 8);
        }, true);

         // 暂停/换源/出错 → 取消监控（恢复播放由 currentTime 推进自动判定）
        ['pause', 'emptied', 'error '].forEach(function (ev) {
          document .addEventListener(ev, function (e) {
             if (e.target && e.target.tagName === 'VIDEO') clearStallTimer();
          }, true);
         });
        // [v2.9.6] 反复 seek 循环检测：10 秒内 seek ≥ 5 次 → 判定卡死
        var seekCount = 0;
        var seekWindowStart = Date.now();
        document.addEventListener('seeking', function (e) {
          if (!e.target || e.target.tagName !== 'VIDEO') return;
          try {
            var lastAd = window.__rrmv_lastAdBlockAt || 0;
            if (Date.now() - lastAd < 3000) return;
          } catch (err) {}
          seekCount++;
          if (Date.now() - seekWindowStart > 10000) { seekWindowStart = Date.now(); seekCount = 0; }
          if (seekCount >= 5) {
            seekCount = 0;
            console.log('[增强包] 检测到反复 seek 循环，触发自愈');
            onStallTimeout(e.target);
          }
        }, true);
       });
    })();
  }


  // [v2.9.1] 刷新后还原：窗口大小+进度+去广告二次扫荡
  (function restoreAfterReload(){
    try {
      var raw = sessionStorage.getItem('rrmv_restore');
      var exp = sessionStorage.getItem('rrmv_expected_reload');
      if (!raw || !exp) return;
      if (Date.now() - parseInt(exp,10) > 60000) { sessionStorage.removeItem('rrmv_restore'); sessionStorage.removeItem('rrmv_expected_reload'); return; }
      var info = JSON.parse(raw);
      if (!info || typeof info.t !== 'number') return;
      sessionStorage.removeItem('rrmv_expected_reload');
      console.log('[增强包] 检测到刷新还原 t=' + info.t);
      onReady(function(){
        var tries = 0;
        var timer = setInterval(function(){
          tries++;
          var v = document.querySelector('video');
          var player = document.querySelector('.xgplayer, #player, .player-container, #ve-player-container, .video-player');
          if (v && player) {
            try {
              if (Math.abs(v.currentTime - info.t) > 0.5) { v.currentTime = info.t; }
              if (info.theater || info.isFull) {
                var btn = document.querySelector('.xgplayer-theater-btn:not(.active), [class*="theater"]:not(.active), .xgplayer-fullscreen-btn');
                if (btn) { try{ btn.click(); }catch(e){} }
                if (player) { player.style.width = '100%'; player.style.maxWidth = '100%'; }
                window.scrollTo(0,0);
              }
              var adSelectors = '#adPlayContainer, [class*="QH_SSP"], [class*="openWindowAd"], .xgplayer-ads, [class*="member-modal"], [class*="vip-modal"], [class*="pay-modal"]';
              document.querySelectorAll(adSelectors).forEach(function(el){ el.style.display='none'; el.setAttribute('data-rrmv-ad','hide'); });
            } catch(e){}
            clearInterval(timer);
            var sweep = 0;
            var mo = new MutationObserver(function(muts){
              muts.forEach(function(m){ m.addedNodes.forEach(function(n){
                if (n.nodeType!==1) return;
                if (n.matches && n.matches(adSelectors)) n.setAttribute('data-rrmv-ad','hide');
                if (n.querySelectorAll) n.querySelectorAll(adSelectors).forEach(function(e){ e.setAttribute('data-rrmv-ad','hide'); });
              });});
            });
            try{ mo.observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
            var sw = setInterval(function(){
              sweep++;
              document.querySelectorAll(adSelectors).forEach(function(el){ el.setAttribute('data-rrmv-ad','hide'); });
              if (sweep>16) { clearInterval(sw); mo.disconnect(); }
            },500);
            setTimeout(function(){ try{ sessionStorage.removeItem('rrmv_restore'); }catch(e){} }, 3000);
          }
          if (tries>40) clearInterval(timer);
        },500);
      });
    } catch(e) {}
  })();

  // ============================================================
  //  3. 去广告（无感版） 
  // ============================================================
  if (S.get('adBlock',  true)) {
    onReady(function () {

      //  --- PhaseA: CSS 隐藏广告元素 ---
       var adCSS = document.createElement('style'); 
      adCSS.id = 'rrmv-ad-css';
      adCSS. textContent = [
        '#adPlayContainer,',
         '[class*="QH_SSP_OPENWINDOW_AD"],',
         '[class*="openWindowAd"],',
        '[class*="popupAd"],',
        '[class*="bannerAd"],',
        '[class*="iconAdContainer"],' ,
        '[class*="textLinkAd"],',
        ' [class*="adSignWrapper"],',
        '[class*="closeAdSign"],',
        '.xgplayer-ads, xg-ad, xg-ad-stub,',
        '[class*="sssdk-ad" ],',
        '[id*="ssp_ad"],',
        '[id* ="QH_SSP"],',
        '#QH_SSP_AD_WINDOW_MAX, ',
        '[class*="ad-container"],',
         '[class*="prism-ad"],',
        '[class*="ad-overlay"],',
        '[class*="ad-mask"],', 
        '[data-rrmv-ad="hide"],',
        '[ class*="member-modal"],',
        '[class*="vip-modal"],',
        '[class*="membership-modal"],',
        '[class*="pay-modal"],',
         '[class*="upgrade-modal"],',
        '[class*="subscribe-modal"],',
        '[class*= "union-member"],',
        '[class*="joint-vip"],',
        '[class*="promo-modal"],',
         '[class*="promotion-modal"],',
        ' [class*="open-window-ad"],',
        '[class*="float-ad"],',
        '[class*="pop-ad"],', 
        '[class*="modal-mask"][data-rrmv-ad= "hide"],',
        '[class*="dialog-mask"][data-rrmv-ad="hide"],',
        '.xgplayer-loading[data-rrmv-ad="hide"],',
        '.xgplayer-enter-loading[data-rrmv-ad="hide"],',
         '.xg-loading[data-rrmv-ad="hide"],',
         '.xgplayer-is-loading [data-rrmv-ad="hide" ],',
        'html.rrmv-ad-active .xgplayer-loading,',
        'html.rrmv-ad-active .xgplayer-enter-loading,',
        'html.rrmv-ad-active .xg-loading,',
        'html.rrmv-ad-active [class*="animate-spinner"],',
        'html.rrmv-ad-active [class*="spinner-spin"],',
         '  opacity: 0 !important;',
        '   pointer-events: none !important;',
         '  visibility: hidden !important;',
        '   display: none !important;',
        '  animation: none !important;',
        '}'
      ] .join('\n');
      (document.head || document .documentElement).appendChild(adCSS);

      // --- Phase A: CSS 隐藏广告元素 ---
      var AD_TIP_KEYWORDS = ['秒后展示广告', '开通VIP免广告', '联合会员', '立即前往', '开通会员', 'VIP特惠', '免广告'];
      function hideAdTips( node) {
        if (node.nodeType !== 1) return;
        var text = node.textContent || '' ;
        for (var k = 0; k < AD_TIP_KEYWORDS .length; k++) {
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

      // --- PhaseC: 拦截 360SSPSDK（用完即弃，不长期覆写 createElement） ---
      var sspIntercepted = false;
      var origCreateEl = document.createElement.bind(document);
      document.createElement = function (tag) {
        var el = origCreateEl(tag);
        if (!sspIntercepted  && tag.toLowerCase() === 'script') {
           var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
           if (origSrcDesc && origSrcDesc.set)  {
            Object.defineProperty(el, 'src ', {
              get: function () { return  origSrcDesc.get.call(this); },
               set: function (val) {
                if (typeof val === 'string' && (val.indexOf('ssp_sdk') !== -1 || val.indexOf('ssp.360.cn') !== -1 )) {
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
      setTimeout(function ( ) {
        document.createElement = origCreateEl;
        sspIntercepted = true;
      }, (sessionStorage.getItem("rrmv_expected_reload") ? 10000 : 5000));

      function removeExistingSspSdk( ) {
        document.querySelectorAll('script[src*="ssp_sdk"], script[src*="ssp.360.cn"]') .forEach(function (el) { el.remove(); });
       }
      removeExistingSspSdk();

      //  --- PhaseD: 拦截广告请求 (fetch / XHR)  ---
      var AD_DOMAINS = ['ssp.360.cn', 'mediav.com', 'sspweb', 'doubleclick', 'googlesyndication', 'pagead', 'googleadservices', 'imasdk.googleapis.com', 'fengkongcloud.cn', 'openfpcdn.io'];

      function isAdUrl(url) { 
        if (typeof url !== 'string') return  false;
        var lower = url.toLowerCase(); 
        for (var i = 0; i < AD_DOMAINS.length; i++) {
          if (lower.indexOf(AD_DOMAINS[i]) !== -1) return true;
        }
         return false;
      }

      var AD_VIDEO_DOMAINS = ['mediav.com', 'live-s3m.mediav', 's3m.mediav.com', 'doubleclick.net', 'googlesyndication.com', 'pagead2.googlesyndication.com '];

      function isAdVideoUrl(url) {
         if (typeof url !== 'string') return false; 
        var lower = url.toLowerCase();
         for (var i = 0; i < AD_VIDEO_DOMAINS.length; i++) {
          if (lower.indexOf(AD_VIDEO_DOMAINS[i]) !== -1) return true;
        }
         return false;
      }

      var savedContentSrc = null;

      // 广告拦截状 态：用于无感续播（播放态自动续 /暂停态保持）
      var adState = new WeakMap();
      var lastAdBlockAt = 0;
       var AD_RESUME_WINDOW = 10000;

      function  setAdActive(video, on) {
        if (on) document.documentElement.classList.add('rrmv-ad- active');
        else document.documentElement.classList.remove('rrmv-ad-active');
       }

      function hideLoading(video) {
         document.querySelectorAll('.xgplayer-loading, .xgplayer-enter-loading, .xg-loading, .xgplayer-loading-spinner').forEach(function (el)  {
          el.setAttribute('data-rrmv-ad',  'hide');
        });
        document.querySelectorAll('[class*="animate-spinner"], [class *="spinner-spin"]').forEach(function (el) {
           el.setAttribute('data-rrmv-ad', 'hide');
        });
        var xp = document.querySelector('.xgplayer');
        if (xp && xp.classList.contains('xgplayer-isloading')) xp.classList.remove('xgplayer-isloading');
         if (Date.now() - lastAdBlockAt < AD_RESUME_WINDOW) setAdActive(video, true);
      }
 
      function resumeIfNeeded(video, reason)  {
        try {
          video = (video &&  video.isConnected) ? video : findMainVideo(); 
        } catch (e) { video = findMainVideo( ); }
        if (!video || video.ended) return;
        var st = adState.get(video);
         var wasPlaying = st ? st.wasPlaying : !userPaused;
        if (!wasPlaying || userPaused) { hideLoading(video); return; }
        if  (Date.now() - (st ? st.blockedAt : lastAdBlockAt) > AD_RESUME_WINDOW) return;
        if  (!video.paused && video.readyState >= 2) { hideLoading(video); return; }
        try {
           if (sessionStorage.getItem('rrmv_paused_once') === '1') {
            try { hideLoading(video); } catch (e) {}
            try {  sessionStorage.removeItem('rrmv_paused_once' ); } catch (e) {}
            return;
           }
        } catch (e) {}
        hideLoading(video);
        try { if (typeof stealthCleanup === 'function') stealthCleanup(); } catch (e) {}
        try {
          var xp = window.player || window.__xgplayer__ ||
                    (video && (video.__xgplayer__ ||  video.xgplayer)) ||
                   (document.querySelector('.xgplayer') && document.querySelector('.xgplayer').__xgplayer__);
           if (xp && typeof xp.play === 'function'  && xp !== video) xp.play();
        } catch ( e) {}
        try { video.play().catch(function () {}); } catch (e) {}
        setTimeout( function () {
          try {
            if  (Date.now() - lastAdBlockAt >= AD_RESUME_WINDOW) setAdActive(video, false);
          } catch (e) {}
        }, 500);
        console.log('[增强包] 无感续播 (' + reason + ')  wasPlaying=' + wasPlaying);
      }

      function scheduleResume(video, reason) {
         try {
          var v = (video && video.isConnected) ? video : findMainVideo();
           if (!v) v = video;
          var st = v ?  adState.get(v) : null;
          if (st && st .timer) {
            if (Array.isArray(st.timer)) st.timer.forEach(function (id) { clearTimeout(id); });
            else clearTimeout (st.timer);
          }
          var delays  = reason === 'src-intercept' ? [120, 800, 2000] : [200, 1000];
          var timers = delays.map(function (d, i) {
            return setTimeout(function () { resumeIfNeeded(v, reason + (i > 0 ? '-r' + i : '')); }, d);
           });
          if (v) {
            if (st ) st.timer = timers;
            else adState .set(v, { wasPlaying: v ? (!v.paused && !v.ended) : !userPaused, blockedAt: Date.now(), adUrl: st ? st.adUrl : '', timer: timers });
             var cur = adState.get(v);
             if (cur && !cur.blockedAt) cur.blockedAt =  Date.now();
            try { window.__rrmv_lastAdBlockAt = cur ? cur.blockedAt : Date.now(); } catch (e) {}
          }
        } catch (e) {}
      }

      // --- PhaseE: video.src 拦截 ---
      var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement. prototype, 'src');
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
                  var isMain = false;
                  try {
                     var mainV = findMainVideo();
                     isMain = (this === mainV) || (this.tagName === 'VIDEO') && ( !this.closest || this.closest('#ve-player-container, #player-container, .xgplayer, video'));
                   } catch (e) { isMain = (this.tagName === 'VIDEO'); }
                  if (isMain) {
                     var wasPlaying = false;
                     try { wasPlaying = !this.paused && !this.ended && !document.hidden; } catch  (e) {}
                    adState.set(this,  { wasPlaying: wasPlaying, blockedAt: Date.now(), adUrl: val, timer: null });
                     lastAdBlockAt = Date.now(); window.__rrmv_lastAdBlockAt = lastAdBlockAt;
                     if (wasPlaying && !savedContentSrc ) {
                      try { savedContentSrc = this.currentSrc || this.src || savedContentSrc; } catch (e) {}
                    }
                     console.log('[增强包]  拦截主视频广告 src wasPlaying=' + wasPlaying, val.slice(0, 80));
                     setAdActive(this, true);
                     scheduleResume(this, 'src-intercept');
                     return;
                  } else {
                    try { this.pause();  } catch (e) {}
                    try { this.setAttribute('data-rrmv-ad', 'hide'); } catch (e) {}
                    console.log('[增强包] 拦截非主视频广告', val.slice(0, 80));
                    return;
                   }
                }
                 savedContentSrc = val;
              }
               return origSrcDesc.set.call(this,  val);
            } catch (e) {
               return origSrcDesc.set.call(this, val);
             }
          },
          configurable : true,
          enumerable: true
        }) ;
      }

      var origFetch = window.fetch ;
      window.fetch = function () {
         var url = (arguments[0] && typeof arguments[0 ] === 'string') ? arguments[0] :
                   (arguments[0] && arguments[0].url) ? arguments[0].url : '';
        if (isAdUrl(url) ) return Promise.resolve(new Response('', { status: 204 }));
        return origFetch.apply(this, arguments);
      };

      var origXhrOpen = XMLHttpRequest.prototype.open;
       var origXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (isAdUrl(url)) { this._blocked = true; return; }
         return origXhrOpen.apply(this, arguments);
       };
      XMLHttpRequest.prototype.send =  function () {
        if (this._blocked) return;
        return origXhrSend.apply(this, arguments);
      };

      // --- Phase F: 视频监控 + 广告恢复 - 优化版 ---
      var userPaused = false;

      function findMainVideo( ) {
        return document.querySelector('#ve-player-container video') ||
                document.querySelector('#player-containervideo') ||
               document.querySelector ('.xgplayervideo') ||
               document.querySelector('#ve-playervideo');
      }
 
      function isAdElement(el) {
        if  (!el || (!el.classList && !el.id)) return false;
        var cls = el.className ? el.className.toString() : '';
        var id = el.id  || '';
        return (
          cls.indexOf ('openWindowAd') !== -1 || cls.indexOf('popupAd') !== -1 ||
          cls.indexOf('bannerAd') !== -1 || cls.indexOf('iconAdContainer')  !== -1 ||
          cls.indexOf('textLinkAd')  !== -1 || cls.indexOf('adSignWrapper') !== - 1 ||
          cls.indexOf('closeAdSign') !==  -1 || cls.indexOf('sssdk-ad') !== -1 ||
           cls.indexOf('xgplayer-ads') !== -1 || id === 'QH_SSP_AD_WINDOW_MAX' ||
          id. indexOf('ssp_ad') !== -1 || id.indexOf('QH_SSP') !== -1 ||
          el.tagName === 'XG-AD ' || el.tagName === 'XG-AD-STUB' ||
           cls.indexOf('member-modal') !== -1 || cls.indexOf('vip-modal') !== -1 ||
          cls.indexOf('membership-modal') !== -1 || cls.indexOf('pay-modal') !== -1 ||
          cls.indexOf('upgrade-modal') !== -1 || cls.indexOf('subscribe-modal') !== -1 ||
          cls.indexOf('union-member') !== -1 || cls.indexOf('joint-vip') !== -1 ||
          cls.indexOf('promo-modal') !== -1 || cls.indexOf('promotion-modal') !== -1 ||
          cls.indexOf('float -ad') !== -1 || cls.indexOf('pop-ad') !== -1
         );
      }

      function hideElement(el) {
        if (el && el.style) el.setAttribute('data-rrmv-ad', 'hide');
      }

       var pageLoadTime = Date.now();
      var seen = new WeakSet();

      // --- MediaSession API：全局媒体按键支持 ---
      function setupMediaSession(video) {
        if  (!navigator.mediaSession) return;

        // 设置元数据
        var title = document.title.replace(/-人人视频$/, '').trim(); 
        if (title && !navigator.mediaSession .metadata) {
          navigator.mediaSession .metadata = new MediaMetadata({
            title: title,
            artist: '人人视频',
            album: '人人视频'
           });
        }

        // 注册 action handler（用 findMainVideo 动态查找，不用闭包引用）
        try {
          navigator.mediaSession.setActionHandler('play',  function () {
            var v = findMainVideo();
            if (v) v.play().catch(function () {});
          });
          navigator .mediaSession.setActionHandler('pause', function () {
            var v = findMainVideo(); 
            if (v) v.pause();
          });
           navigator.mediaSession.setActionHandler('previoustrack', function () {
             var v = findMainVideo();
            if (v ) v.currentTime = Math.max(0, v.currentTime -  10);
          });
          navigator.mediaSession.setActionHandler('nexttrack', function () {
            var v = findMainVideo();
             if (v) v.currentTime = Math.min(v. duration || 0, v.currentTime + 10);
           });
          navigator.mediaSession.setActionHandler('seekbackward', function (details)  {
            var v = findMainVideo();
             if (v) v.currentTime = Math.max(0, v.currentTime - (details.seekOffset || 10));
           });
          navigator.mediaSession.setActionHandler('seekforward', function (details) {
            var v = findMainVideo();
             if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + (details.seekOffset || 10));
          });
        } catch ( e) {}

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

      // --- 备选方案： keydown 事件直接捕获媒体键 ---
       var mediaKeyHandled = false;
      function  setupMediaKeyListener() {
        if (mediaKeyHandled) return;
        mediaKeyHandled = true;

        document.addEventListener('keydown', function (e) {
          var video = findMainVideo();
          if (!video) return;
 
          // MediaPlayPause: 播放/暂停切换
          if (e.key === 'MediaPlayPause'  || e.code === 'MediaPlayPause' || e.keyCode  === 179) {
            e.preventDefault();
             e.stopPropagation();
            if  (video.paused) {
              video.play(). catch(function (err) {
                console.warn('[增强包] 媒体键 play 失败:',  err.message);
              });
            }  else {
              video.pause();
             }
            return;
          }

           // MediaTrackNext: 下一曲/快进
           if (e.key === 'MediaTrackNext' || e.code  === 'MediaTrackNext' || e.keyCode === 176) { 
            e.preventDefault();
             e.stopPropagation();
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
            return;
           }

          // MediaTrackPrevious: 上一 曲/后退
          if (e.key === 'MediaTrackPrevious' || e.code === 'MediaTrackPrevious'  || e.keyCode === 177) {
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

         if (video.src && !isAdVideoUrl(video. src)) savedContentSrc = video.src;

        setupMediaSession(video);

        video.addEventListener('play', function () {
          userPaused = false;
          if (video.src && !isAdVideoUrl (video.src)) savedContentSrc = video.src;
         }, { passive: true });

        video.addEventListener('pause', function () {
           if (video.src && isAdVideoUrl(video.src))  return;
          if (video.ended || video.seeking) return;
          if (Date.now() - pageLoadTime < 3000) return;
          if (Date. now() - lastAdBlockAt < AD_RESUME_WINDOW) return;
          // 标签不可见时的暂停是浏览器行为（切标签/最小化），不是用户手动暂停
          if (document.hidden) return;
          // 广告覆盖 层存在时的暂停是网站行为，不是 用户手动暂停
          var adOverlay =  document.querySelector('#adPlayContainer');
           if (adOverlay) return;
          userPaused = true;
        }, { passive: true }) ;

        video.addEventListener('timeupdate ', function () {
          if (video.src && ! isAdVideoUrl(video.src) && video.readyState >= 2) savedContentSrc = video.src;
        },  { passive: true });
        video.addEventListener('loadeddata', function () {
          if (video.src && !isAdVideoUrl(video.src)) savedContentSrc = video.src;
        }, { passive: true });
      }

      function stealthCleanup() {
        var video = findMainVideo() ;

        document.querySelectorAll(
           '[class*="openWindowAd"], [class*="popupAd "], [class*="bannerAd"],' +
          '[class *="iconAdContainer"], [class*="textLinkAd"],  [class*="adSignWrapper"],' +
          '[class*="closeAdSign"], #QH_SSP_AD_WINDOW_MAX, [class*="sssdk-ad"],' +
          '[id*="ssp_ad" ], [id*="QH_SSP"], .xgplayer-ads, xg-ad, xg-ad-stub,' +
          '[class*="member-modal"] , [class*="vip-modal"], [class*="membership-modal"],' +
          '[class*="pay-modal"], [ class*="upgrade-modal"], [class*="subscribe-modal"],' +
          '[class*="union-member"] , [class*="joint-vip"], [class*="promo-modal" ],' +
          '[class*="promotion-modal"],  [class*="float-ad"], [class*="pop-ad"]'
         ).forEach(hideElement);

        // 广告 窗口期内隐藏 loading + spinner（统一 走 hideLoading）
        if (Date.now() - lastAdBlockAt < AD_RESUME_WINDOW) hideLoading( video);

        // 自动关闭会员/VIP推 广弹窗
        document.querySelectorAll(' [data-rrmv-ad="hide"]').forEach(function (el)  {
          if (el.offsetParent !== null) {
             tryClosePopup(el);
          }
         });

        document.querySelectorAll( 'video').forEach(function (v) {
          if  (v !== video) {
            var src = v.src || (v.querySelector('source') && v.querySelector('source').src) || '';
            if (isAdVideoUrl(src)) {
              v.pause();
               v.setAttribute('data-rrmv-ad', 'hide');
            }
          }
        });

         // 不要移除 xgplayer 的 ad class ，会触发布局变化导致退出网页全 屏
        // 用 CSS 覆盖其视觉效果即可
      }

      // --- DOM 变化监控：只监听播放器容器，不监听整个 document ---
      var playerContainer = document.querySelector('#ve-player-container') || 
                            document.querySelector('#player-container');

      if (playerContainer) {
        var observer = new MutationObserver(function (mutations) {
           var needResume = false;
          for (var i  = 0; i < mutations.length; i++) {
             var m = mutations[i];
            if (m.type === 'attributes' && m.target) {
               if (m.target.classList && (m.target.classList.contains('xgplayer-is-loading') || isAdElement(m.target))) {
                hideLoading(findMainVideo());
              }
               continue;
            }
            for  (var j = 0; j < m.addedNodes.length; j++) {
               var node = m.addedNodes[j];
               if (node.nodeType !== 1) continue; 
              var videos = node.tagName ===  'VIDEO' ? [node] :
                (node.querySelectorAll ? Array.from(node.querySelectorAll('video')) : []);
              videos.forEach(function (v) { hookVideo(v); });
               if (node.classList && isAdElement(node) ) {
                hideElement(node);
                 needResume = true;
              }
               if (node.id === 'adPlayContainer' || (node.querySelector && node.querySelector('#adPlayContainer'))) {
                needResume = true;
              }
               hideAdTips(node);
            }
          } 
          if (needResume && Date.now() - lastAdBlockAt < AD_RESUME_WINDOW * 2) scheduleResume(findMainVideo(), 'ad-dom');
        });
 
        observer.observe(playerContainer, {
           childList: true, subtree: true, attributes: true, attributeFilter: ['class']
         });
      } else {
        // 播放器容器还没出现，等它出现后再监听
         onReady(function () {
          var waitContainer = setInterval(function () {
             var pc = document.querySelector('#ve- player-container') ||
                     document.querySelector('#player-container');
             if (pc) {
              clearInterval(waitContainer);
              var obs = new MutationObserver(function (mutations) {
                 var needResume = false;
                 for (var i = 0; i < mutations.length;  i++) {
                  var m = mutations[i ];
                  if (m.type === 'attributes' && m.target) {
                    if (m. target.classList && (m.target.classList.contains('xgplayer-is-loading') || isAdElement(m.target))) {
                      hideLoading( findMainVideo());
                    }
                     continue;
                  }
                   for (var j = 0; j < m.addedNodes.length; j++) {
                    var  node = m.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                     var videos = node.tagName === 'VIDEO ' ? [node] :
                      (node.querySelectorAll ? Array.from(node.querySelectorAll('video')) : []);
                    videos.forEach(function (v) { hookVideo(v); });
                     if (node.classList && isAdElement(node)) {
                      hideElement(node);
                      needResume  = true;
                    }
                     if (node.id === 'adPlayContainer' || (node.querySelector && node.querySelector('#adPlayContainer'))) {
                      needResume = true;
                    }
                     hideAdTips(node);
                   }
                }
                if (needResume && Date.now() - lastAdBlockAt < AD_RESUME_WINDOW * 2) scheduleResume(findMainVideo (), 'ad-dom');
              });
               obs.observe(pc, {
                childList : true, subtree: true,
                attributes: true, attributeFilter: ['class']
               });
            }
          }, 500);
         });
      }

      // --- Phase G: 全页面弹窗自动隐藏（会员/VIP 推广弹窗） ---
      var POPUP_KEYWORDS = ['联合会员', '立即前往', '开通VIP', '开通会员', 'VIP特惠', '免广告', '附赠', '不限量'];
      var CLOSE_BTN_SELECTORS = [
        '[class*="close"]', '[class*=" Close"]', '[aria-label="close"]', '[aria-label="Close"]',
        'button svg', '.modal-close', '.dialog-close', '.popup-close'
      ] ;

      function isPopupAd(el) {
        if  (!el || el.nodeType !== 1) return false;
         var cls = (el.className && el.className.toString()) || '';
        var id = el.id || ' ';
        // 已知广告 class
        if ( cls.indexOf('member-modal') !== -1 || cls.indexOf('vip-modal') !== -1 ||
            cls.indexOf('membership-modal') !== -1 || cls.indexOf('pay-modal') !== -1 ||
            cls.indexOf('upgrade-modal') !== -1 || cls.indexOf( 'subscribe-modal') !== -1 ||
            cls. indexOf('union-member') !== -1 || cls.indexOf ('joint-vip') !== -1 ||
            cls.indexOf('promo-modal') !== -1 || cls.indexOf('promotion-modal') !== -1 ||
            cls.indexOf('popupAd') !== -1 || cls.indexOf('openWindowAd') !== -1) {
          return true;
         }
        // 检查文本内容是否包含推广关键词
        var text = el.textContent || '';
        for (var k = 0; k < POPUP_KEYWORDS.length; k++) {
          if (text. includes(POPUP_KEYWORDS[k])) {
            //  再检查是否是模态框/弹窗样式（固定定位 + 高 z-index）
            var  style = window.getComputedStyle(el);
             if (style && (style.position === 'fixed'  || style.position === 'absolute') &&
                 parseInt(style.zIndex, 10) > 100) {
               return true;
            }
           }
        }
        return false;
       }

      function tryClosePopup(el) {
         // 尝试点击关闭按钮
        for (var  s = 0; s < CLOSE_BTN_SELECTORS.length; s++)  {
          var btn = el.querySelector(CLOSE_BTN_SELECTORS[s]);
          if (btn && btn.offsetParent !== null) {
            btn.click ();
            return true;
          }
         }
        return false;
      }

      function hidePopupAd(el) {
        if (tryClosePopup(el)) return;
        el.setAttribute('data-rrmv-ad', 'hide');
      }

      var fullPageObserver = new MutationObserver(function  (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node =  m.addedNodes[j];
            if (node.nodeType !== 1) continue;
            if (isPopupAd (node)) {
              hidePopupAd(node);
               continue;
            }
             // 检查子元素中的弹窗
             if (node.querySelectorAll) {
              var popups = node.querySelectorAll(
                 '[class*="member-modal"], [class*="vip- modal"], [class*="membership-modal"],' +
                 '[class*="pay-modal"], [class*="upgrade-modal"], [class*="subscribe-modal"],'  +
                '[class*="union-member"], [ class*="joint-vip"], [class*="promo-modal"],'  +
                '[class*="promotion-modal" ], [class*="popupAd"], [class*="openWindowAd" ]'
              );
              popups.forEach(function (p) { hidePopupAd(p); });
             }
          }
        }
      });

       if (document.body) {
        fullPageObserver.observe(document.body, { childList: true,  subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          fullPageObserver.observe (document.body, { childList: true, subtree: true });
        });
      }

      // 初始  hook + 巡检定时器（带清理保护）
       document.querySelectorAll('video').forEach(function (v) { hookVideo(v); });

      //  广告诱发的 waiting 立即尝试无感续播
      document.addEventListener('waiting ', function (e) {
        if (!e.target || e. target.tagName !== 'VIDEO') return;
        if (Date.now() - lastAdBlockAt < AD_RESUME_WINDOW && !userPaused) {
          hideLoading(e .target);
          scheduleResume(e.target,  'waiting');
        } else if (Date.now() - lastAdBlockAt < AD_RESUME_WINDOW) {
           hideLoading(e.target);
        }
      }, true);

      var lastCheckTime = 0, stuckCount  = 0;
      var cleanupTimer = setInterval(stealthCleanup, 2000);
      var stuckTimer = setInterval(function () {
        var video = findMainVideo();
        if (!video || video.paused || video.ended) return;
        var ct  = video.currentTime;
        if (ct === lastCheckTime) {
          stuckCount++;
           if (stuckCount > 4) {
            stuckCount  = 0;
            stealthCleanup();
           }
        } else { stuckCount = 0; }
         lastCheckTime = ct;
      }, 2000);


       // 页面卸载时清理定时器
      window.addEventListener('beforeunload', function ( ) {
        clearInterval(cleanupTimer);
         clearInterval(stuckTimer);
        if (observer) observer.disconnect();
        if (fullPageObserver) fullPageObserver.disconnect() ;
      }, { passive: true });
    });
  }

   // ============================================================
  //  4. 豆瓣跳转
  // ============================================================
  if (S.get('douban', true) ) {
    onReady(function () {

      function  getDramaName() {
        var title = document.title;
        if (title) {
          var match = title.match(/^(.+?)[\s-]*人人视频/ );
          if (match) return match[1].trim( );
        }
        var nameEl = document.querySelector('[class*="text-xl"], [class*="text-2xl"], [class*="font-bold"]');
        if ( nameEl) return nameEl.textContent.trim();
         return null;
      }

      function createDoubanButton(dramaName) {
        var btn  = document.createElement('a');
        btn.href = 'https://search.douban.com/movie/subject_search?search_text=' + encodeURIComponent(dramaName);
        btn.target = '_blank';
         btn.rel = 'noopenernoreferrer';
         btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px8px;margin -left:8px;font-size:12px;color:#00b51d;background:rgba(0,181,29,0.1);border:1pxsolidrgba (0,181,29,0.3);border-radius:4px;text-decoration:none;cursor:pointer;transition:all0.2s'; 
        btn.innerHTML = '<svgviewBox="002424" width="14" height="14" fill="currentCol or"><pathd="M122C6.48226.48212s4.4810101010-4.4810-10S17.522122zm-115l-4-41.41-1.41L1114.17l6.59-6.59L199l-88z"/></ svg> 豆瓣';
        btn.onmouseenter = function () { btn.style.background = 'rgba(0,181, 29,0.2)'; };
        btn.onmouseleave = function () { btn.style.background = 'rgba(0,181,29,0.1)'; };
        return btn;
      }

       function injectDoubanButton() {
        var  dramaName = getDramaName();
        if (!dramaName) return;

        var titleContainers  = document.querySelectorAll('div');
        for (var i = 0; i < titleContainers.length; i++) {
          var container = titleContainers[i];
          var children = Array.from(container.children);
          if (children.length < 2) continue;

          var hasTitle = children.some(function (el) { return el.textContent.trim() === dramaName; });
          var  hasIntro = children.some(function (el) { return el.textContent.trim() === '简介'; });

           if (hasTitle && hasIntro) {
             if (container.querySelector('[data-douban]')) return;
            var introBtn = children.find(function (el) { return el.textContent.trim() === '简介'; });
            if (introBtn) {
              var doubanBtn = createDoubanButton(dramaName);
              doubanBtn.setAttribute('data-douban', 'true');
               introBtn.parentNode.insertBefore( doubanBtn, introBtn.nextSibling);
             }
            break;
          }
        }
       }

      var doubanObserver = new MutationObserver(function () { injectDoubanButton() ; });
      doubanObserver.observe(document.body, { childList: true, subtree: true });
       injectDoubanButton();
    });
  }

  // ============================================================
  //  7. 播放器修复（渲染层hack）
  //      暂停恢复后画面卡住但弹幕正常：渲染层hack 强制 GPU 合成
  //      [v2.9.8] 移除轻seek：轻seek 在 PCDN 缓冲不足时导致反复 seek 循环（慢动作卡顿）
  // ============================================================
  if (S.get('videoFix', true)) {
    onReady(function () {
      // 渲染层 hack：给 video 提升为 GPU 合成层
      var fixStyle = document.createElement('style');
      fixStyle.textContent = '.xgplayervideo { will-change: transform !important; transform: translateZ(0) !important; }';
      (document.head || document.documentElement).appendChild(fixStyle);
    });
  }

  // ============================================================
  //  8. 豆瓣页跳转人人（在豆瓣剧集页面添加人人视频搜索跳转图标）
  // ============================================================
  if (S.get('doubanJump', true)) {
    onReady(function () {
      var SEARCH_URL = 'https://mh.yichengwlkj.com/pc/search?keyword=';
      var ICON_URL = 'https://mh.yichengwlkj.com/favicon.ico';

      function getSearchKeyword() {
        var h1 = document.querySelector('#content h1 span');
        if (!h1) return null;
        var title = h1.textContent.trim();
        var chMatch = title.match(/^([\u4e00-\u9fa5]+)/);
        if (chMatch) return chMatch[1];
        var engMatch = title.match(/^([A-Za-z][A-Za-z''\- ]+?)(?:\s+[\u4e00-\u9fa5]|\s*\(|$)/);
        if (engMatch) return engMatch[1].trim();
        return title.split('(')[0].trim();
      }

      function createLink() {
        var h1 = document.querySelector('#contenth1');
        if (!h1 || document.querySelector('#reren-video-link')) return;
        var keyword = getSearchKeyword();
        if (!keyword) return;
        var searchUrl = SEARCH_URL + encodeURIComponent(keyword);
        var link = document.createElement('a');
        link.id = 'reren-video-link';
        link.href = searchUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = '在人人视频搜索: ' + keyword;
        link.style.cssText = 'display:inline-flex;align-items:center;margin-left:12px;padding:4px10px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);border-radius:16px;text-decoration:none;font-size:12px;color:#fff;vertical-align:middle;transition:all0.3s;box-shadow:02px8pxrgba(238,90,36,0.3);';
        var icon = document.createElement('img');
        icon.src = ICON_URL;
        icon.style.cssText = 'width:16px;height:16px;margin-right:6px;border-radius:3px;';
        icon.onerror = function() { this.style.display = 'none'; };
        var text = document.createElement('span');
        text.textContent = '人人视频';
        link.appendChild(icon);
        link.appendChild(text);
        link.onmouseover = function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '04px12pxrgba(238,90,36,0.4)';
        };
        link.onmouseout = function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '02px8pxrgba(238,90,36,0.3)';
        };
        h1.appendChild(link);
      }

      setTimeout(createLink, 2000);
    });
  }

})();
 
