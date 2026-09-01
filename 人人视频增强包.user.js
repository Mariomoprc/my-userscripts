// ==UserScript==
// @name         人人视� ��增强包
// @namespace    http://tampermon key.net/
// @version      2.9.0
// @descripti on  反调试绕过 + 隐藏滚动条 + 无� �去广告(播放态自动续播/暂停态保 持/loading修复) + 豆瓣跳转 + 唤醒后 暂停(点播放即恢复) + 播放卡死自� ��(智能判定不误伤正常缓冲) + 播放器修复(轻seek+渲染层hack) + 豆瓣页跳转人人 | 菜� �可开关
// @author       opencode
// @matc h        *://*.yichengwlkj.com/*
// @match         *://*.rrmj.plus/*
// @match        *://* .bwcgee.cn/*
// @match        https://movie.douban.com/subject/*
// @grant        GM_registerMenu Command
// @grant        GM_setValue
// @gran t        GM_getValue
// @run-at       documen t-start
// ==/UserScript==

(function () {
   'use strict';

  // ========================= ===================================
  //  设 置读写
  // ============================== ==============================
  var S = {
     get: function (k, d) { var v = localStorage .getItem('rrmv_' + k); return v !== null ? v  === '1' : d; },
    set: function (k, v) { lo calStorage.setItem('rrmv_' + k, v ? '1' : '0' ); }
  };

  // ============================= ===============================
  //  菜单
   // ======================================== ====================
  window.__rrmv_lastAdBl ockAt = 0;
  function buildMenu(label, key, d ef) {
    var on = S.get(key, def);
    GM_re gisterMenuCommand((on ? '✔ ' : '✘ ') + la bel, function () {
      S.set(key, !on);
       location.reload();
    });
  }

  buildMen u('反调试自动绕过',     'antiDebug',   true);
  buildMenu('隐藏滚动条',         'scrollbar',   true);
  buildMenu('去广告� ��无感）',    'adBlock',     true);
  buil dMenu('豆瓣跳转',          'douban',       true);
  buildMenu('唤醒/刷新后暂停',    'pauseOnWake', true);
  buildMenu('播放� ��死自愈',      'stallHeal',   true);
  buildMenu('播放器修复',        'videoFix',    true);
  buildMenu('豆瓣页跳转人人',    'doubanJump',  true);

  / / =========================================== =================
  //  1. 反调试自动绕 过
  // ==================================== ========================
  if (S.get('antiDeb ug', true)) {
    // 1. 设置绕过标记
     localStorage.setItem('__internal_devtools_b ypass', '1');
    sessionStorage.setItem('__i nternal_devtools_bypass', '1');

    // 2. � �存并恢复 document.onkeydown（防止网� ��反调试覆盖媒体键处理）
    var o rigOnKeydown = document.onkeydown;

    // 3.  拦截 alert（阻断"请关闭控制台"弹 窗）
    var origAlert = window.alert;
     window.alert = function (msg) {
      if (msg  && msg.indexOf('请关闭控制台') !== -1)  return;
      return origAlert.apply(window,  arguments);
    };

    // 4. 清除已有� � debuggerInterval 定时器（通过覆写 s etInterval 捕获）
    var origSetInterval  = window.setInterval;
    var debuggerTimers  = [];
    window.setInterval = function (fn,  ms) {
      var fnStr = fn.toString();
       // 检测反调试的 debugger 定时器（� � debugger 语句或执行间隔 <= 200ms）
       if (fnStr.indexOf('debugger') !== -1 ||  (ms && ms <= 200)) {
        var id = origSe tInterval.call(window, function () {}, 999999 );
        debuggerTimers.push(id);
        r eturn id;
      }
      return origSetInterva l.apply(window, arguments);
    };

    // 5.  更强力的 DevToolsDetector 补丁
    var  patchTimer = origSetInterval.call(window, fu nction () {
      // 清除 debugger 定时� �
      debuggerTimers.forEach(function (id)  { clearInterval(id); clearTimeout(id); });
       debuggerTimers = [];

      // 恢复 doc ument.onkeydown（如果被网站反调试覆 盖了）
      if (document.onkeydown && doc ument.onkeydown.toString().indexOf('debugger' ) !== -1) {
        document.onkeydown = orig OnKeydown;
      }

      // patch DevToolsDe tector
      if (typeof DevToolsDetector !==  'undefined') {
        // 完全禁用检测
         DevToolsDetector.prototype.init = fun ction () {};
        DevToolsDetector.prototy pe.start = function () {};
        DevToolsDe tector.prototype.check = function () {};
         DevToolsDetector.prototype.checkPerforman ce = function () {};
        DevToolsDetector .prototype.showDebuggerAlertAndBlock = functi on () {};

        // 清除已有的检测� �时器
        if (this && this.checkTimer)  clearInterval(this.checkTimer);
        if (t his && this.timer) clearInterval(this.timer); 

        clearInterval(patchTimer);
      }
     }, 500);

    // 6. 恢复 setInterval � �始方法（5秒后，广告 SDK 加载窗� �期过后）
    setTimeout(function () {
       window.setInterval = origSetInterval;
     }, 5000);
  }

  // ======================== ====================================
  //  2.  隐藏滚动条
  // ======================= =====================================
  if (S .get('scrollbar', true)) {
    var scrollbarS tyle = document.createElement('style');
    s crollbarStyle.textContent = 'html, body { scr ollbar-width: none !important; -ms-overflow-s tyle: none !important; } html::-webkit-scroll bar, body::-webkit-scrollbar { display: none  !important; }';
    (document.head || documen t.documentElement).appendChild(scrollbarStyle );
  }

  // ================================ ============================
  //  以下功� ��需要 DOM 就绪
  // ==================== ========================================
  fu nction onReady(fn) {
    if (document.body) {  fn(); }
    else { document.addEventListener ('DOMContentLoaded', fn); }
  }

  // ======= ============================================= ========
  //  5. 唤醒/刷新后暂停（� �去广告之前执行）
  // ============== ============================================= =
  if (S.get('pauseOnWake', true)) {
    (fu nction () {
      var PAUSE_ONCE_KEY = 'rrmv_ paused_once';
      var WATCHING_KEY = 'rrmv_ watching';
      var needPause = sessionStora ge.getItem(WATCHING_KEY) === '1' &&
                       sessionStorage.getItem(PAUSE_ONC E_KEY) !== '1';
      var pauseTime = 0;

       function pauseAllVideo() {
        var fou nd = false;
        document.querySelectorAll ('video').forEach(function (v) {
          tr y {
            if (!v.paused && !v.ended) {
               v.pause();
              v.setA ttribute('data-rrmv-paused', '1');
               found = true;
            }
          } c atch (e) {}
        });
        if (found) pa useTime = Date.now();
        return found;
       }

      var wakeMO = null;
      var wa keTimer = null;

      function watchForVideo () {
        if (!needPause) return;
         if (pauseAllVideo()) return;

        wakeMO  = new MutationObserver(function () {
           if (!needPause) { wakeMO.disconnect(); wake MO = null; return; }
          if (pauseAllVi deo()) { wakeMO.disconnect(); wakeMO = null;  }
        });
        wakeMO.observe(document .documentElement, { childList: true, subtree:  true });

        var checkCount = 0;
         wakeTimer = setInterval(function () {
           checkCount++;
          if (!needPause | | checkCount > 60) { clearInterval(wakeTimer) ; wakeTimer = null; if (wakeMO) { wakeMO.disc onnect(); wakeMO = null; } return; }
           if (pauseAllVideo()) { clearInterval(wakeTi mer); wakeTimer = null; if (wakeMO) { wakeMO. disconnect(); wakeMO = null; } }
        }, 5 00);
      }

      function cleanupWake() {
         if (wakeMO) { wakeMO.disconnect(); wa keMO = null; }
        if (wakeTimer) { clear Interval(wakeTimer); wakeTimer = null; }
       }

      var hiddenAt = 0;
      document.a ddEventListener('visibilitychange', function  () {
        if (document.hidden) {
           hiddenAt = Date.now();
        } else if (hi ddenAt > 0) {
          var gap = Date.now()  - hiddenAt;
          hiddenAt = 0;
           if (gap > 10000 && !sessionStorage.getItem(P AUSE_ONCE_KEY)) {
            sessionStorage. setItem(PAUSE_ONCE_KEY, '1');
            nee dPause = true;
            watchForVideo();
           }
        }
      }, { passive: true  });

      if (needPause) {
        sessionS torage.setItem(PAUSE_ONCE_KEY, '1');
         onReady(watchForVideo);
      }

      onRead y(function () {
        document.addEventList ener('play', function (e) {
          if (e.t arget && e.target.tagName === 'VIDEO') {
             sessionStorage.setItem(WATCHING_KEY,  '1');
            // 用户点播放立即恢 复（不再二次按停），只清除本次 唤醒暂停状态
            needPause = fa lse;
            sessionStorage.removeItem(PA USE_ONCE_KEY);
            cleanupWake();
           }
        }, true);
      });

      w indow.addEventListener('beforeunload', functi on () {
        sessionStorage.removeItem(PAU SE_ONCE_KEY);
        cleanupWake();
      },  { passive: true });
    })();
  }

  // ==== ============================================= ===========
  //  6. 播放卡死自愈（cur rentTime 零进展才判定真卡死 → play 重试 → 软重载 → 刷新页面）
  //      不再用固定超时触发 video.load() ：暂停恢复/seek 后的正常缓冲
  //      （currentTime 几秒内恢复推进）� �会被误判，避免短等待被放大成� �量重载
  // ============================= ===============================
  if (S.get(' stallHeal', true)) {
    (function () {
       var HEAL_COUNT_KEY = 'rrmv_heal_count';
       var HEAL_TIME_KEY = 'rrmv_heal_time';
       var stallTimer = null;
      var softTried =  false;

      function healCountOk() {
         var now = Date.now();
        var last = p arseInt(sessionStorage.getItem(HEAL_TIME_KEY)  || '0', 10);
        if (now - last > 10 * 6 0 * 1000) {
          sessionStorage.setItem( HEAL_TIME_KEY, String(now));
          sessio nStorage.setItem(HEAL_COUNT_KEY, '0');
           return true;
        }
        var n = pa rseInt(sessionStorage.getItem(HEAL_COUNT_KEY)  || '0', 10);
        return n < 2;
      }

       function bumpHealCount() {
        var  n = parseInt(sessionStorage.getItem(HEAL_COUN T_KEY) || '0', 10);
        sessionStorage.se tItem(HEAL_COUNT_KEY, String(n + 1));
      } 

      function clearStallTimer() {
         if (stallTimer) { clearInterval(stallTimer);  stallTimer = null; }
      }

      // 监控  currentTime 推进：连续 noProgressSec � �零进展且未暂停 → 判定真卡死
       function armStallWatch(video, noProgressS ec) {
        try {
          var lastAd2 = w indow.__rrmv_lastAdBlockAt || 0;
          if  (Date.now() - lastAd2 < 3000) return;
         } catch (err) {}
        clearStallTimer(); 
        var lastTime = -1;
        var still  = 0;
        stallTimer = setInterval(functi on () {
          if (!video.isConnected || v ideo.paused) { clearStallTimer(); return; }
           if (video.seeking) { still = 0; retu rn; } // seek 等数据不算卡死
           if (Math.abs(video.currentTime - lastTime) >  0.01) {
            lastTime = video.current Time;
            still = 0;
            // � ��全恢复（时间在走且数据充足）� �� 停止监控
            if (video.readySt ate >= 3) clearStallTimer();
            retu rn;
          }
          still++;
           if (still >= noProgressSec) {
            cle arStallTimer();
            onStallTimeout(vi deo);
          }
        }, 1000);
      }

       function onStallTimeout(video) {
         if (!video.isConnected || video.paused) ret urn;
        if (!softTried) {
          // � ��一级：play() 重试（无损，很多卡 死只是播放器状态机停住）
           softTried = true;
          console.log('[� ��强包] 播放停滞，尝试 play() 重试 ');
          try { video.play().catch(functi on () {}); } catch (e) {}
          setTimeou t(function () {
            if (video.isConne cted && !video.paused && video.readyState < 3  &&
                Math.abs(video.currentTim e - (video.__rrmvLastCheck || 0)) < 0.01) {
               // 第二级：软恢复（重� �加载源，会丢 buffer，最后手段）
               if (!healCountOk()) return;
               bumpHealCount();
              con sole.log('[增强包] play() 重试无效，� ��恢复（重新加载视频源）');
               var t = video.currentTime;
               video.load();
              video.addEven tListener('loadedmetadata', function once() { 
                video.removeEventListener('l oadedmetadata', once);
                try {  video.currentTime = t; } catch (e) {}
                 video.play().catch(function () {});
               });
              armStallWatch (video, 12);
            }
          }, 4000) ;
        } else if (healCountOk()) {
           // 第三级：刷新页面（网站有续 播，进度不丢）
          bumpHealCount ();
          console.log('[增强包] 软恢 复无效，刷新页面');
          locatio n.reload();
        }
      }

      onReady( function () {
        // 记录恢复播放时间，用于 waiting 宽限判断
        document.add EventListener('play', function (e) {
          if (e.target && e.target.tagName === 'VID EO') {
            e.target.__rrmvResumeAt = Date.now();
          }
        }, true);

        // waiting：缓冲不� ��（转圈出现）→ 开始监控时间推 进，而非固定超时
        // 暂停恢复后 5 秒内触发的 waiting → 更长宽限（20 秒），避免 CDN 重连耗时误触发重载
        document.add EventListener('waiting', function (e) {
           if (!e.target || e.target.tagName !== 'V IDEO') return;
          try {
            va r lastAd = window.__rrmv_lastAdBlockAt || 0;
             if (Date.now() - lastAd < 3000) r eturn;
          } catch (err) {}
          s oftTried = false;
          e.target.__rrmvLa stCheck = e.target.currentTime;
          var justResumed = Date.now() - (e.target.__rrmvResumeAt || 0) < 5000;
          arm StallWatch(e.target, justResumed ? 20 : 8);
        }, true);

         // 暂停/换源/出错 → 取消监� ��（恢复播放由 currentTime 推进自动 判定）
        ['pause', 'emptied', 'error '].forEach(function (ev) {
          document .addEventListener(ev, function (e) {
             if (e.target && e.target.tagName === 'VID EO') clearStallTimer();
          }, true);
         });
       });
    })();
  }

  // ==== ============================================= ===========
  //  3. 去广告（无感版） 
  // ======================================= =====================
  if (S.get('adBlock',  true)) {
    onReady(function () {

      //  --- Phase A: CSS 隐藏广告元素 ---
       var adCSS = document.createElement('style'); 
      adCSS.id = 'rrmv-ad-css';
      adCSS. textContent = [
        '#adPlayContainer,',
         '[class*="QH_SSP_OPENWINDOW_AD"],',
         '[class*="openWindowAd"],',
        '[ class*="popupAd"],',
        '[class*="banner Ad"],',
        '[class*="iconAdContainer"],' ,
        '[class*="textLinkAd"],',
        ' [class*="adSignWrapper"],',
        '[class*= "closeAdSign"],',
        '.xgplayer-ads, xg- ad, xg-ad-stub,',
        '[class*="sssdk-ad" ],',
        '[id*="ssp_ad"],',
        '[id* ="QH_SSP"],',
        '#QH_SSP_AD_WINDOW_MAX, ',
        '[class*="ad-container"],',
         '[class*="prism-ad"],',
        '[class*="a d-overlay"],',
        '[class*="ad-mask"],', 
        '[data-rrmv-ad="hide"],',
        '[ class*="member-modal"],',
        '[class*="v ip-modal"],',
        '[class*="membership-mo dal"],',
        '[class*="pay-modal"],',
         '[class*="upgrade-modal"],',
        '[c lass*="subscribe-modal"],',
        '[class*= "union-member"],',
        '[class*="joint-vi p"],',
        '[class*="promo-modal"],',
         '[class*="promotion-modal"],',
        ' [class*="open-window-ad"],',
        '[class* ="float-ad"],',
        '[class*="pop-ad"],', 
        '[class*="modal-mask"][data-rrmv-ad= "hide"],',
        '[class*="dialog-mask"][da ta-rrmv-ad="hide"],',
        '.xgplayer-load ing[data-rrmv-ad="hide"],',
        '.xgplaye r-enter-loading[data-rrmv-ad="hide"],',
         '.xg-loading[data-rrmv-ad="hide"],',
         '.xgplayer-is-loading [data-rrmv-ad="hide" ],',
        'html.rrmv-ad-active .xgplayer-l oading,',
        'html.rrmv-ad-active .xgpla yer-enter-loading,',
        'html.rrmv-ad-ac tive .xg-loading,',
        'html.rrmv-ad-act ive [class*="animate-spinner"],',
        'ht ml.rrmv-ad-active [class*="spinner-spin"],',
         '  opacity: 0 !important;',
        '   pointer-events: none !important;',
         '  visibility: hidden !important;',
        '   display: none !important;',
        '  anim ation: none !important;',
        '}'
      ] .join('\n');
      (document.head || document .documentElement).appendChild(adCSS);

       // --- Phase B: 动态隐藏广告提示文� � ---
      var AD_TIP_KEYWORDS = ['秒后展 示广告', '开通VIP免广告', '联合会� ��', '立即前往', '开通会员', 'VIP特� ��', '免广告'];
      function hideAdTips( node) {
        if (node.nodeType !== 1) retu rn;
        var text = node.textContent || '' ;
        for (var k = 0; k < AD_TIP_KEYWORDS .length; k++) {
          if (text.includes(A D_TIP_KEYWORDS[k])) {
            node.setAtt ribute('data-rrmv-ad', 'hide');
            r eturn;
          }
        }
        var chil dren = node.querySelectorAll('*');
        fo r (var i = 0; i < children.length; i++) {
           var t = children[i].textContent || ''; 
          for (var k2 = 0; k2 < AD_TIP_KEYWO RDS.length; k2++) {
            if (t.include s(AD_TIP_KEYWORDS[k2]) && children[i].childre n.length < 5) {
              children[i].set Attribute('data-rrmv-ad', 'hide');
               break;
            }
          }
         }
      }

      // --- Phase C: 拦截 360 S SP SDK（用完即弃，不长期覆写 creat eElement） ---
      var sspIntercepted = fa lse;
      var origCreateEl = document.create Element.bind(document);
      document.create Element = function (tag) {
        var el = o rigCreateEl(tag);
        if (!sspIntercepted  && tag.toLowerCase() === 'script') {
           var origSrcDesc = Object.getOwnPropertyDes criptor(HTMLScriptElement.prototype, 'src');
           if (origSrcDesc && origSrcDesc.set)  {
            Object.defineProperty(el, 'src ', {
              get: function () { return  origSrcDesc.get.call(this); },
               set: function (val) {
                if (typ eof val === 'string' && (val.indexOf('ssp_sdk ') !== -1 || val.indexOf('ssp.360.cn') !== -1 )) {
                  this.type = 'text/java script'; return;
                }
                 return origSrcDesc.set.call(this, val); 
              }
            });
          }
         }
        return el;
      };
      / / 5秒后恢复原始 createElement，避免� ��期影响性能
      setTimeout(function ( ) {
        document.createElement = origCrea teEl;
        sspIntercepted = true;
      },  5000);

      function removeExistingSspSdk( ) {
        document.querySelectorAll('script [src*="ssp_sdk"], script[src*="ssp.360.cn"]') .forEach(function (el) { el.remove(); });
       }
      removeExistingSspSdk();

      //  --- Phase D: 拦截广告请求 (fetch / XHR)  ---
      var AD_DOMAINS = ['ssp.360.cn', 'm ediav.com', 'sspweb', 'doubleclick', 'googles yndication', 'pagead', 'googleadservices', 'i masdk.googleapis.com', 'fengkongcloud.cn', 'o penfpcdn.io'];

      function isAdUrl(url) { 
        if (typeof url !== 'string') return  false;
        var lower = url.toLowerCase(); 
        for (var i = 0; i < AD_DOMAINS.lengt h; i++) {
          if (lower.indexOf(AD_DOMA INS[i]) !== -1) return true;
        }
         return false;
      }

      var AD_VIDEO_D OMAINS = ['mediav.com', 'live-s3m.mediav', 's 3m.mediav.com', 'doubleclick.net', 'googlesyn dication.com', 'pagead2.googlesyndication.com '];

      function isAdVideoUrl(url) {
         if (typeof url !== 'string') return false; 
        var lower = url.toLowerCase();
         for (var i = 0; i < AD_VIDEO_DOMAINS.lengt h; i++) {
          if (lower.indexOf(AD_VIDE O_DOMAINS[i]) !== -1) return true;
        }
         return false;
      }

      var save dContentSrc = null;

      // 广告拦截状 态：用于无感续播（播放态自动续 /暂停态保持）
      var adState = new W eakMap();
      var lastAdBlockAt = 0;
       var AD_RESUME_WINDOW = 10000;

      function  setAdActive(video, on) {
        if (on) doc ument.documentElement.classList.add('rrmv-ad- active');
        else document.documentEleme nt.classList.remove('rrmv-ad-active');
       }

      function hideLoading(video) {
         document.querySelectorAll('.xgplayer-loadin g, .xgplayer-enter-loading, .xg-loading, .xgp layer-loading-spinner').forEach(function (el)  {
          el.setAttribute('data-rrmv-ad',  'hide');
        });
        document.querySe lectorAll('[class*="animate-spinner"], [class *="spinner-spin"]').forEach(function (el) {
           el.setAttribute('data-rrmv-ad', 'hid e');
        });
        var xp = document.qu erySelector('.xgplayer');
        if (xp && x p.classList.contains('xgplayer-isloading')) x p.classList.remove('xgplayer-isloading');
         if (Date.now() - lastAdBlockAt < AD_RESU ME_WINDOW) setAdActive(video, true);
      }
 
      function resumeIfNeeded(video, reason)  {
        try {
          video = (video &&  video.isConnected) ? video : findMainVideo(); 
        } catch (e) { video = findMainVideo( ); }
        if (!video || video.ended) retur n;
        var st = adState.get(video);
         var wasPlaying = st ? st.wasPlaying : !use rPaused;
        if (!wasPlaying || userPause d) { hideLoading(video); return; }
        if  (Date.now() - (st ? st.blockedAt : lastAdBlo ckAt) > AD_RESUME_WINDOW) return;
        if  (!video.paused && video.readyState >= 2) { hi deLoading(video); return; }
        try {
           if (sessionStorage.getItem('rrmv_pause d_once') === '1') {
            try { hideLoa ding(video); } catch (e) {}
            try {  sessionStorage.removeItem('rrmv_paused_once' ); } catch (e) {}
            return;
           }
        } catch (e) {}
        hideLoadi ng(video);
        try { if (typeof stealthCl eanup === 'function') stealthCleanup(); } cat ch (e) {}
        try {
          var xp = wi ndow.player || window.__xgplayer__ ||
                    (video && (video.__xgplayer__ ||  video.xgplayer)) ||
                   (docum ent.querySelector('.xgplayer') && document.qu erySelector('.xgplayer').__xgplayer__);
           if (xp && typeof xp.play === 'function'  && xp !== video) xp.play();
        } catch ( e) {}
        try { video.play().catch(functi on () {}); } catch (e) {}
        setTimeout( function () {
          try {
            if  (Date.now() - lastAdBlockAt >= AD_RESUME_WIND OW) setAdActive(video, false);
          } ca tch (e) {}
        }, 500);
        console.l og('[增强包] 无感续播 (' + reason + ')  wasPlaying=' + wasPlaying);
      }

      f unction scheduleResume(video, reason) {
         try {
          var v = (video && video.is Connected) ? video : findMainVideo();
           if (!v) v = video;
          var st = v ?  adState.get(v) : null;
          if (st && st .timer) {
            if (Array.isArray(st.ti mer)) st.timer.forEach(function (id) { clearT imeout(id); });
            else clearTimeout (st.timer);
          }
          var delays  = reason === 'src-intercept' ? [120, 800, 200 0] : [200, 1000];
          var timers = dela ys.map(function (d, i) {
            return s etTimeout(function () { resumeIfNeeded(v, rea son + (i > 0 ? '-r' + i : '')); }, d);
           });
          if (v) {
            if (st ) st.timer = timers;
            else adState .set(v, { wasPlaying: v ? (!v.paused && !v.en ded) : !userPaused, blockedAt: Date.now(), ad Url: st ? st.adUrl : '', timer: timers });
             var cur = adState.get(v);
             if (cur && !cur.blockedAt) cur.blockedAt =  Date.now();
            try { window.__rrmv_ lastAdBlockAt = cur ? cur.blockedAt : Date.no w(); } catch (e) {}
          }
        } cat ch (e) {}
      }

      // --- Phase E: vide o.src 拦截 ---
      var origSrcDesc = Obje ct.getOwnPropertyDescriptor(HTMLMediaElement. prototype, 'src');
      if (origSrcDesc && o rigSrcDesc.set) {
        Object.defineProper ty(HTMLMediaElement.prototype, 'src', {
           get: function () {
            try { ret urn origSrcDesc.get.call(this); }
             catch (e) { return ''; }
          },
           set: function (val) {
            try {
               if (typeof val === 'string' && v al.length > 0) {
                if (isAdVide oUrl(val)) {
                  var isMain = f alse;
                  try {
                     var mainV = findMainVideo();
                     isMain = (this === mainV) || (this.t agName === 'VIDEO') && ( !this.closest || thi s.closest('#ve-player-container, #player-cont ainer, .xgplayer, video'));
                   } catch (e) { isMain = (this.tagName === 'VI DEO'); }
                  if (isMain) {
                     var wasPlaying = false;
                     try { wasPlaying = !this.pause d && !this.ended && !document.hidden; } catch  (e) {}
                    adState.set(this,  { wasPlaying: wasPlaying, blockedAt: Date.no w(), adUrl: val, timer: null });
                     lastAdBlockAt = Date.now(); window.__ rrmv_lastAdBlockAt = lastAdBlockAt;
                     if (wasPlaying && !savedContentSrc ) {
                      try { savedContentS rc = this.currentSrc || this.src || savedCont entSrc; } catch (e) {}
                    }
                     console.log('[增强包]  拦截主视频广告 src wasPlaying=' + wasP laying, val.slice(0, 80));
                     setAdActive(this, true);
                     scheduleResume(this, 'src-intercept');
                     return;
                  } e lse {
                    try { this.pause();  } catch (e) {}
                    try { thi s.setAttribute('data-rrmv-ad', 'hide'); } cat ch (e) {}
                    console.log('[� ��强包] 拦截非主视频广告', val.slic e(0, 80));
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
                   (arguments[0] && arguments[0].url) ? ar guments[0].url : '';
        if (isAdUrl(url) ) return Promise.resolve(new Response('', { s tatus: 204 }));
        return origFetch.appl y(this, arguments);
      };

      var origX hrOpen = XMLHttpRequest.prototype.open;
       var origXhrSend = XMLHttpRequest.prototype.s end;
      XMLHttpRequest.prototype.open = fu nction (method, url) {
        if (isAdUrl(ur l)) { this._blocked = true; return; }
         return origXhrOpen.apply(this, arguments);
       };
      XMLHttpRequest.prototype.send =  function () {
        if (this._blocked) ret urn;
        return origXhrSend.apply(this, a rguments);
      };

      // --- Phase F: � �频监控 + 广告恢复 ---
      var userP aused = false;

      function findMainVideo( ) {
        return document.querySelector('#v e-player-container video') ||
                document.querySelector('#player-container vid eo') ||
               document.querySelector ('.xgplayer video') ||
               documen t.querySelector('#ve-player video');
      }
 
      function isAdElement(el) {
        if  (!el || (!el.classList && !el.id)) return fal se;
        var cls = el.className ? el.class Name.toString() : '';
        var id = el.id  || '';
        return (
          cls.indexOf ('openWindowAd') !== -1 || cls.indexOf('popup Ad') !== -1 ||
          cls.indexOf('bannerA d') !== -1 || cls.indexOf('iconAdContainer')  !== -1 ||
          cls.indexOf('textLinkAd')  !== -1 || cls.indexOf('adSignWrapper') !== - 1 ||
          cls.indexOf('closeAdSign') !==  -1 || cls.indexOf('sssdk-ad') !== -1 ||
           cls.indexOf('xgplayer-ads') !== -1 || i d === 'QH_SSP_AD_WINDOW_MAX' ||
          id. indexOf('ssp_ad') !== -1 || id.indexOf('QH_SS P') !== -1 ||
          el.tagName === 'XG-AD ' || el.tagName === 'XG-AD-STUB' ||
           cls.indexOf('member-modal') !== -1 || cls.in dexOf('vip-modal') !== -1 ||
          cls.in dexOf('membership-modal') !== -1 || cls.index Of('pay-modal') !== -1 ||
          cls.index Of('upgrade-modal') !== -1 || cls.indexOf('su bscribe-modal') !== -1 ||
          cls.index Of('union-member') !== -1 || cls.indexOf('joi nt-vip') !== -1 ||
          cls.indexOf('pro mo-modal') !== -1 || cls.indexOf('promotion-m odal') !== -1 ||
          cls.indexOf('float -ad') !== -1 || cls.indexOf('pop-ad') !== -1
         );
      }

      function hideElemen t(el) {
        if (el && el.style) el.setAtt ribute('data-rrmv-ad', 'hide');
      }

       var pageLoadTime = Date.now();
      var se en = new WeakSet();

      // --- Media Sessi on API：全局媒体按键支持 ---
      f unction setupMediaSession(video) {
        if  (!navigator.mediaSession) return;

        / / 设置元数据
        var title = documen t.title.replace(/-人人视频$/, '').trim(); 
        if (title && !navigator.mediaSession .metadata) {
          navigator.mediaSession .metadata = new MediaMetadata({
            t itle: title,
            artist: '人人视� �',
            album: '人人视频'
           });
        }

        // 注册 action ha ndler（用 findMainVideo 动态查找，不� ��闭包引用）
        try {
          nav igator.mediaSession.setActionHandler('play',  function () {
            var v = findMainVid eo();
            if (v) v.play().catch(funct ion () {});
          });
          navigator .mediaSession.setActionHandler('pause', funct ion () {
            var v = findMainVideo(); 
            if (v) v.pause();
          });
           navigator.mediaSession.setActionHan dler('previoustrack', function () {
             var v = findMainVideo();
            if (v ) v.currentTime = Math.max(0, v.currentTime -  10);
          });
          navigator.media Session.setActionHandler('nexttrack', functio n () {
            var v = findMainVideo();
             if (v) v.currentTime = Math.min(v. duration || 0, v.currentTime + 10);
           });
          navigator.mediaSession.setActi onHandler('seekbackward', function (details)  {
            var v = findMainVideo();
             if (v) v.currentTime = Math.max(0, v.cu rrentTime - (details.seekOffset || 10));
           });
          navigator.mediaSession.se tActionHandler('seekforward', function (detai ls) {
            var v = findMainVideo();
             if (v) v.currentTime = Math.min(v.d uration || 0, v.currentTime + (details.seekOf fset || 10));
          });
        } catch ( e) {}

        // 同步播放状态（用 fi ndMainVideo 动态查找）
        video.add EventListener('play', function () {
           navigator.mediaSession.playbackState = 'play ing';
        }, { passive: true });
         video.addEventListener('pause', function () { 
          navigator.mediaSession.playbackSta te = 'paused';
        }, { passive: true }); 
        video.addEventListener('ended', func tion () {
          navigator.mediaSession.pl aybackState = 'none';
        }, { passive: t rue });
      }

      // --- 备选方案： keydown 事件直接捕获媒体键 ---
       var mediaKeyHandled = false;
      function  setupMediaKeyListener() {
        if (mediaKe yHandled) return;
        mediaKeyHandled = t rue;

        document.addEventListener('keyd own', function (e) {
          var video = fi ndMainVideo();
          if (!video) return;
 
          // MediaPlayPause: 播放/暂停� �换
          if (e.key === 'MediaPlayPause'  || e.code === 'MediaPlayPause' || e.keyCode  === 179) {
            e.preventDefault();
             e.stopPropagation();
            if  (video.paused) {
              video.play(). catch(function (err) {
                consol e.warn('[增强包] 媒体键 play 失败:',  err.message);
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
            video.curren tTime = Math.min(video.duration || 0, video.c urrentTime + 10);
            return;
           }

          // MediaTrackPrevious: 上一 曲/后退
          if (e.key === 'MediaTrac kPrevious' || e.code === 'MediaTrackPrevious'  || e.keyCode === 177) {
            e.preven tDefault();
            e.stopPropagation();
             video.currentTime = Math.max(0, v ideo.currentTime - 10);
            return;
           }
        }, true); // capture 阶� �，最先拦截
      }

      // 初始化� ��就设置 keydown 监听（不等视频出� ��）
      setupMediaKeyListener();

      f unction hookVideo(video) {
        if (seen.h as(video)) return;
        seen.add(video);

         if (video.src && !isAdVideoUrl(video. src)) savedContentSrc = video.src;

        / / 设置 MediaSession
        setupMediaSessi on(video);

        video.addEventListener('p lay', function () {
          userPaused = fa lse;
          if (video.src && !isAdVideoUrl (video.src)) savedContentSrc = video.src;
         }, { passive: true });

        video.ad dEventListener('pause', function () {
           if (video.src && isAdVideoUrl(video.src))  return;
          if (video.ended || video.se eking) return;
          if (Date.now() - pag eLoadTime < 3000) return;
          if (Date. now() - lastAdBlockAt < AD_RESUME_WINDOW) ret urn;
          // 标签不可见时的暂停 是浏览器行为（切标签/最小化）� �不是用户手动暂停
          if (docum ent.hidden) return;
          // 广告覆盖 层存在时的暂停是网站行为，不是 用户手动暂停
          var adOverlay =  document.querySelector('#adPlayContainer');
           if (adOverlay) return;
          use rPaused = true;
        }, { passive: true }) ;

        video.addEventListener('timeupdate ', function () {
          if (video.src && ! isAdVideoUrl(video.src) && video.readyState > = 2) savedContentSrc = video.src;
        },  { passive: true });
        video.addEventLis tener('loadeddata', function () {
          i f (video.src && !isAdVideoUrl(video.src)) sav edContentSrc = video.src;
        }, { passiv e: true });
      }

      function stealthCl eanup() {
        var video = findMainVideo() ;

        document.querySelectorAll(
           '[class*="openWindowAd"], [class*="popupAd "], [class*="bannerAd"],' +
          '[class *="iconAdContainer"], [class*="textLinkAd"],  [class*="adSignWrapper"],' +
          '[clas s*="closeAdSign"], #QH_SSP_AD_WINDOW_MAX, [cl ass*="sssdk-ad"],' +
          '[id*="ssp_ad" ], [id*="QH_SSP"], .xgplayer-ads, xg-ad, xg-a d-stub,' +
          '[class*="member-modal"] , [class*="vip-modal"], [class*="membership-m odal"],' +
          '[class*="pay-modal"], [ class*="upgrade-modal"], [class*="subscribe-m odal"],' +
          '[class*="union-member"] , [class*="joint-vip"], [class*="promo-modal" ],' +
          '[class*="promotion-modal"],  [class*="float-ad"], [class*="pop-ad"]'
         ).forEach(hideElement);

        // 广告 窗口期内隐藏 loading + spinner（统一 走 hideLoading）
        if (Date.now() - l astAdBlockAt < AD_RESUME_WINDOW) hideLoading( video);

        // 自动关闭会员/VIP推 广弹窗
        document.querySelectorAll(' [data-rrmv-ad="hide"]').forEach(function (el)  {
          if (el.offsetParent !== null) {
             tryClosePopup(el);
          }
         });

        document.querySelectorAll( 'video').forEach(function (v) {
          if  (v !== video) {
            var src = v.src | | (v.querySelector('source') && v.querySelect or('source').src) || '';
            if (isAd VideoUrl(src)) {
              v.pause();
               v.setAttribute('data-rrmv-ad', 'hi de');
            }
          }
        });

         // 不要移除 xgplayer 的 ad class ，会触发布局变化导致退出网页全 屏
        // 用 CSS 覆盖其视觉效果� ��可
      }

      // --- DOM 变化监控� ��只监听播放器容器，不监听整个  document ---
      var playerContainer = docu ment.querySelector('#ve-player-container') || 
                            document.querySe lector('#player-container');

      if (playe rContainer) {
        var observer = new Muta tionObserver(function (mutations) {
           var needResume = false;
          for (var i  = 0; i < mutations.length; i++) {
             var m = mutations[i];
            if (m.typ e === 'attributes' && m.target) {
               if (m.target.classList && (m.target.classL ist.contains('xgplayer-is-loading') || isAdEl ement(m.target))) {
                hideLoadi ng(findMainVideo());
              }
               continue;
            }
            for  (var j = 0; j < m.addedNodes.length; j++) {
               var node = m.addedNodes[j];
               if (node.nodeType !== 1) continue; 
              var videos = node.tagName ===  'VIDEO' ? [node] :
                (node.quer ySelectorAll ? Array.from(node.querySelectorA ll('video')) : []);
              videos.forE ach(function (v) { hookVideo(v); });
               if (node.classList && isAdElement(node) ) {
                hideElement(node);
                 needResume = true;
              }
               if (node.id === 'adPlayContaine r' || (node.querySelector && node.querySelect or('#adPlayContainer'))) {
                ne edResume = true;
              }
               hideAdTips(node);
            }
          } 
          if (needResume && Date.now() - las tAdBlockAt < AD_RESUME_WINDOW * 2) scheduleRe sume(findMainVideo(), 'ad-dom');
        });
 
        observer.observe(playerContainer, {
           childList: true, subtree: true, att ributes: true, attributeFilter: ['class']
         });
      } else {
        // 播放器� ��器还没出现，等它出现后再监听
         onReady(function () {
          var w aitContainer = setInterval(function () {
             var pc = document.querySelector('#ve- player-container') ||
                     do cument.querySelector('#player-container');
             if (pc) {
              clearInterv al(waitContainer);
              var obs = ne w MutationObserver(function (mutations) {
                 var needResume = false;
                 for (var i = 0; i < mutations.length;  i++) {
                  var m = mutations[i ];
                  if (m.type === 'attribut es' && m.target) {
                    if (m. target.classList && (m.target.classList.conta ins('xgplayer-is-loading') || isAdElement(m.t arget))) {
                      hideLoading( findMainVideo());
                    }
                     continue;
                  }
                   for (var j = 0; j < m.added Nodes.length; j++) {
                    var  node = m.addedNodes[j];
                    i f (node.nodeType !== 1) continue;
                     var videos = node.tagName === 'VIDEO ' ? [node] :
                      (node.quer ySelectorAll ? Array.from(node.querySelectorA ll('video')) : []);
                    video s.forEach(function (v) { hookVideo(v); });
                     if (node.classList && isAdE lement(node)) {
                      hideEle ment(node);
                      needResume  = true;
                    }
                     if (node.id === 'adPlayContainer' || (no de.querySelector && node.querySelector('#adPl ayContainer'))) {
                      needR esume = true;
                    }
                     hideAdTips(node);
                   }
                }
                if (nee dResume && Date.now() - lastAdBlockAt < AD_RE SUME_WINDOW * 2) scheduleResume(findMainVideo (), 'ad-dom');
              });
               obs.observe(pc, {
                childList : true, subtree: true,
                attrib utes: true, attributeFilter: ['class']
               });
            }
          }, 500);
         });
      }

      // --- Phase G: � �页面弹窗自动隐藏（会员/VIP 推广 弹窗） ---
      var POPUP_KEYWORDS = ['� �合会员', '立即前往', '开通VIP', '� �通会员', 'VIP特惠', '免广告', '附� �', '不限量'];
      var CLOSE_BTN_SELECTO RS = [
        '[class*="close"]', '[class*=" Close"]', '[aria-label="close"]', '[aria-labe l="Close"]',
        'button svg', '.modal-cl ose', '.dialog-close', '.popup-close'
      ] ;

      function isPopupAd(el) {
        if  (!el || el.nodeType !== 1) return false;
         var cls = (el.className && el.className.t oString()) || '';
        var id = el.id || ' ';
        // 已知广告 class
        if ( cls.indexOf('member-modal') !== -1 || cls.ind exOf('vip-modal') !== -1 ||
            cls.i ndexOf('membership-modal') !== -1 || cls.inde xOf('pay-modal') !== -1 ||
            cls.in dexOf('upgrade-modal') !== -1 || cls.indexOf( 'subscribe-modal') !== -1 ||
            cls. indexOf('union-member') !== -1 || cls.indexOf ('joint-vip') !== -1 ||
            cls.index Of('promo-modal') !== -1 || cls.indexOf('prom otion-modal') !== -1 ||
            cls.index Of('popupAd') !== -1 || cls.indexOf('openWind owAd') !== -1) {
          return true;
         }
        // 检查文本内容是否包� �推广关键词
        var text = el.textCo ntent || '';
        for (var k = 0; k < POPU P_KEYWORDS.length; k++) {
          if (text. includes(POPUP_KEYWORDS[k])) {
            //  再检查是否是模态框/弹窗样式（� ��定定位 + 高 z-index）
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
          var btn = el.querySelector(CLOSE_ BTN_SELECTORS[s]);
          if (btn && btn.o ffsetParent !== null) {
            btn.click ();
            return true;
          }
         }
        return false;
      }

      fu nction hidePopupAd(el) {
        if (tryClose Popup(el)) return;
        el.setAttribute('d ata-rrmv-ad', 'hide');
      }

      var ful lPageObserver = new MutationObserver(function  (mutations) {
        for (var i = 0; i < mu tations.length; i++) {
          var m = muta tions[i];
          for (var j = 0; j < m.add edNodes.length; j++) {
            var node =  m.addedNodes[j];
            if (node.nodeTy pe !== 1) continue;
            if (isPopupAd (node)) {
              hidePopupAd(node);
               continue;
            }
             // 检查子元素中的弹窗
             if (node.querySelectorAll) {
              v ar popups = node.querySelectorAll(
                 '[class*="member-modal"], [class*="vip- modal"], [class*="membership-modal"],' +
                 '[class*="pay-modal"], [class*="u pgrade-modal"], [class*="subscribe-modal"],'  +
                '[class*="union-member"], [ class*="joint-vip"], [class*="promo-modal"],'  +
                '[class*="promotion-modal" ], [class*="popupAd"], [class*="openWindowAd" ]'
              );
              popups.forE ach(function (p) { hidePopupAd(p); });
             }
          }
        }
      });

       if (document.body) {
        fullPageObserv er.observe(document.body, { childList: true,  subtree: true });
      } else {
        docu ment.addEventListener('DOMContentLoaded', fun ction () {
          fullPageObserver.observe (document.body, { childList: true, subtree: t rue });
        });
      }

      // 初始  hook + 巡检定时器（带清理保护）
       document.querySelectorAll('video').forEa ch(function (v) { hookVideo(v); });

      //  广告诱发的 waiting 立即尝试无感� �播
      document.addEventListener('waiting ', function (e) {
        if (!e.target || e. target.tagName !== 'VIDEO') return;
        i f (Date.now() - lastAdBlockAt < AD_RESUME_WIN DOW && !userPaused) {
          hideLoading(e .target);
          scheduleResume(e.target,  'waiting');
        } else if (Date.now() - l astAdBlockAt < AD_RESUME_WINDOW) {
           hideLoading(e.target);
        }
      }, tru e);

      var lastCheckTime = 0, stuckCount  = 0;
      var cleanupTimer = setInterval(ste althCleanup, 2000);
      var stuckTimer = se tInterval(function () {
        var video = f indMainVideo();
        if (!video || video.p aused || video.ended) return;
        var ct  = video.currentTime;
        if (ct === lastC heckTime) {
          stuckCount++;
           if (stuckCount > 4) {
            stuckCount  = 0;
            stealthCleanup();
           }
        } else { stuckCount = 0; }
         lastCheckTime = ct;
      }, 2000);


       // 页面卸载时清理定时器
      windo w.addEventListener('beforeunload', function ( ) {
        clearInterval(cleanupTimer);
         clearInterval(stuckTimer);
        if (ob server) observer.disconnect();
        if (fu llPageObserver) fullPageObserver.disconnect() ;
      }, { passive: true });
    });
  }

   // ========================================= ===================
  //  4. 豆瓣跳转
  / / =========================================== =================
  if (S.get('douban', true) ) {
    onReady(function () {

      function  getDramaName() {
        var title = documen t.title;
        if (title) {
          var m atch = title.match(/^(.+?)[\s-]*人人视频/ );
          if (match) return match[1].trim( );
        }
        var nameEl = document.qu erySelector('[class*="text-xl"], [class*="tex t-2xl"], [class*="font-bold"]');
        if ( nameEl) return nameEl.textContent.trim();
         return null;
      }

      function cre ateDoubanButton(dramaName) {
        var btn  = document.createElement('a');
        btn.hr ef = 'https://search.douban.com/movie/subject _search?search_text=' + encodeURIComponent(dr amaName);
        btn.target = '_blank';
         btn.rel = 'noopener noreferrer';
         btn.style.cssText = 'display:inline-flex;alig n-items:center;gap:4px;padding:4px 8px;margin -left:8px;font-size:12px;color:#00b51d;backgr ound:rgba(0,181,29,0.1);border:1px solid rgba (0,181,29,0.3);border-radius:4px;text-decorat ion:none;cursor:pointer;transition:all 0.2s'; 
        btn.innerHTML = '<svg viewBox="0 0 2 4 24" width="14" height="14" fill="currentCol or"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10  10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4  1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></ svg> 豆瓣';
        btn.onmouseenter = func tion () { btn.style.background = 'rgba(0,181, 29,0.2)'; };
        btn.onmouseleave = funct ion () { btn.style.background = 'rgba(0,181,2 9,0.1)'; };
        return btn;
      }

       function injectDoubanButton() {
        var  dramaName = getDramaName();
        if (!dra maName) return;

        var titleContainers  = document.querySelectorAll('div');
        f or (var i = 0; i < titleContainers.length; i+ +) {
          var container = titleContainer s[i];
          var children = Array.from(con tainer.children);
          if (children.leng th < 2) continue;

          var hasTitle = c hildren.some(function (el) { return el.textCo ntent.trim() === dramaName; });
          var  hasIntro = children.some(function (el) { ret urn el.textContent.trim() === '简介'; });

           if (hasTitle && hasIntro) {
             if (container.querySelector('[data-douba n]')) return;
            var introBtn = chil dren.find(function (el) { return el.textConte nt.trim() === '简介'; });
            if (i ntroBtn) {
              var doubanBtn = crea teDoubanButton(dramaName);
              doub anBtn.setAttribute('data-douban', 'true');
               introBtn.parentNode.insertBefore( doubanBtn, introBtn.nextSibling);
             }
            break;
          }
        }
       }

      var doubanObserver = new Mutati onObserver(function () { injectDoubanButton() ; });
      doubanObserver.observe(document.b ody, { childList: true, subtree: true });
       injectDoubanButton();
    });
  }

  // ============================================================
  //  7. 播放器修复（轻seek + 渲染层hack）
  //      暂停恢复后画面卡住但弹幕正常：渲染层hack 强制 GPU 合成 + 轻seek 强制帧输出
  // ============================================================
  if (S.get('videoFix', true)) {
    onReady(function () {
      // 渲染层 hack：给 video 提升为 GPU 合成层
      var fixStyle = document.createElement('style');
      fixStyle.textContent = '.xgplayer video { will-change: transform !important; transform: translateZ(0) !important; }';
      (document.head || document.documentElement).appendChild(fixStyle);

      var fixSeen = new WeakSet();

      function hookVideoForFix(video) {
        if (fixSeen.has(video)) return;
        fixSeen.add(video);

        // playing 事件 → 轻 seek 强制解码器输出新帧
        video.addEventListener('playing', function () {
          requestAnimationFrame(function () {
            if (video.currentTime > 0) {
              video.currentTime = video.currentTime;
            }
          });
        }, { passive: true });

        // stalled → 轻 seek 恢复
        video.addEventListener('stalled', function () {
          requestAnimationFrame(function () {
            video.currentTime = video.currentTime + 0.001;
          });
        }, { passive: true });

        // 缓冲区监控：gap < 1s 时轻 seek
        setInterval(function () {
          if (video.paused || video.ended) return;
          var buffered = video.buffered.length > 0
            ? video.buffered.end(video.buffered.length - 1)
            : 0;
          var bufferGap = buffered - video.currentTime;
          if (bufferGap < 1 && !video.seeking) {
            video.currentTime = video.currentTime + 0.001;
          }
        }, 2000);
      }

      // 等待 video 出现并 hook
      function waitForVideo() {
        var video = document.querySelector('.xgplayer video') ||
                    document.querySelector('#ve-player-container video') ||
                    document.querySelector('video');
        if (video) {
          hookVideoForFix(video);
          return;
        }
        var mo = new MutationObserver(function () {
          var v = document.querySelector('.xgplayer video') ||
                  document.querySelector('#ve-player-container video') ||
                  document.querySelector('video');
          if (v) {
            mo.disconnect();
            hookVideoForFix(v);
          }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 30000);
      }

      document.querySelectorAll('video').forEach(function (v) { hookVideoForFix(v); });
      waitForVideo();
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
        var h1 = document.querySelector('#content h1');
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
        link.style.cssText = 'display:inline-flex;align-items:center;margin-left:12px;padding:4px 10px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);border-radius:16px;text-decoration:none;font-size:12px;color:#fff;vertical-align:middle;transition:all 0.3s;box-shadow:0 2px 8px rgba(238,90,36,0.3);';
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
          this.style.boxShadow = '0 4px 12px rgba(238,90,36,0.4)';
        };
        link.onmouseout = function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '0 2px 8px rgba(238,90,36,0.3)';
        };
        h1.appendChild(link);
      }

      setTimeout(createLink, 2000);
    });
  }

})();
 