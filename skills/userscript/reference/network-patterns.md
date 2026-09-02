# 网络拦截模式参考

## URL 检测辅助

### 域名列表匹配

```javascript
var BLOCKED_DOMAINS = ['example.com', 'adserver.net', 'tracker.com'];

function isBlockedUrl(url) {
  if (typeof url !== 'string') return false;
  var lower = url.toLowerCase();
  for (var i = 0; i < BLOCKED_DOMAINS.length; i++) {
    if (lower.indexOf(BLOCKED_DOMAINS[i]) !== -1) return true;
  }
  return false;
}
```

## fetch 拦截

### 基本拦截

```javascript
var origFetch = window.fetch;
window.fetch = function () {
  var url = (arguments[0] && typeof arguments[0] === 'string') ? arguments[0] :
            (arguments[0] && arguments[0].url) ? arguments[0].url : '';
  if (isBlockedUrl(url)) {
    return Promise.resolve(new Response('', { status: 204 }));
  }
  return origFetch.apply(this, arguments);
};
```

### 替换响应

```javascript
var origFetch = window.fetch;
window.fetch = function () {
  var url = (arguments[0] && typeof arguments[0] === 'string') ? arguments[0] :
            (arguments[0] && arguments[0].url) ? arguments[0].url : '';
  if (url.indexOf('/api/ad') !== -1) {
    return Promise.resolve(new Response(
      JSON.stringify({ ads: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  }
  return origFetch.apply(this, arguments);
};
```

### 修改请求头

```javascript
var origFetch = window.fetch;
window.fetch = function (input, init) {
  init = init || {};
  init.headers = init.headers || {};
  // 添加自定义头
  init.headers['X-Custom'] = 'value';
  return origFetch.call(this, input, init);
};
```

## XMLHttpRequest 拦截

### 阻止特定请求

```javascript
XMLHttpRequest.prototype._origOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype._origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url) {
  if (isBlockedUrl(url)) {
    this._blocked = true;
    return;
  }
  return XMLHttpRequest.prototype._origOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function () {
  if (this._blocked) return;
  return XMLHttpRequest.prototype._origSend.apply(this, arguments);
};
```

### 修改响应

```javascript
XMLHttpRequest.prototype._origOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype._origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url) {
  this._url = url;
  return XMLHttpRequest.prototype._origOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function () {
  if (this._url && this._url.indexOf('/api/data') !== -1) {
    var origOnload = this.onload;
    var self = this;
    this.addEventListener('load', function () {
      try {
        var data = JSON.parse(self.responseText);
        // 修改响应数据
        data.modified = true;
        Object.defineProperty(self, 'responseText', {
          value: JSON.stringify(data),
          writable: false
        });
      } catch (e) {}
    });
  }
  return XMLHttpRequest.prototype._origSend.apply(this, arguments);
};
```

## video.src 拦截

### 阻止广告视频源

```javascript
var AD_VIDEO_DOMAINS = ['adserver.com', 'ad-video.cdn.com'];

function isAdVideoUrl(url) {
  if (typeof url !== 'string') return false;
  var lower = url.toLowerCase();
  for (var i = 0; i < AD_VIDEO_DOMAINS.length; i++) {
    if (lower.indexOf(AD_VIDEO_DOMAINS[i]) !== -1) return true;
  }
  return false;
}

var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
if (origSrcDesc && origSrcDesc.set) {
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    get: function () {
      try { return origSrcDesc.get.call(this); }
      catch (e) { return ''; }
    },
    set: function (val) {
      if (typeof val === 'string' && isAdVideoUrl(val)) {
        console.log('[脚本] 阻止广告源:', val);
        return;
      }
      return origSrcDesc.set.call(this, val);
    },
    configurable: true,
    enumerable: true
  });
}
```

## script 加载拦截

### 阻止特定 SDK 加载

```javascript
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
          if (typeof val === 'string' && val.indexOf('sdk.example.com') !== -1) {
            this.type = 'text/javascript'; // 禁用脚本
            return;
          }
          return origSrcDesc.set.call(this, val);
        }
      });
    }
  }
  return el;
};

// 恢复原始 createElement（避免长期性能影响）
setTimeout(function () {
  document.createElement = origCreateEl;
  sspIntercepted = true;
}, 5000);
```

### 移除已加载的脚本

```javascript
function removeExistingScripts(pattern) {
  document.querySelectorAll('script[src*="' + pattern + '"]').forEach(function (el) {
    el.remove();
  });
}
```

## 广告相关完整示例

```javascript
// 检测域名
var AD_DOMAINS = ['ads.example.com', 'tracker.com'];

function isAdUrl(url) {
  if (typeof url !== 'string') return false;
  var lower = url.toLowerCase();
  for (var i = 0; i < AD_DOMAINS.length; i++) {
    if (lower.indexOf(AD_DOMAINS[i]) !== -1) return true;
  }
  return false;
}

// 拦截 fetch
var origFetch = window.fetch;
window.fetch = function () {
  var url = (arguments[0] && typeof arguments[0] === 'string') ? arguments[0] :
            (arguments[0] && arguments[0].url) ? arguments[0].url : '';
  if (isAdUrl(url)) return Promise.resolve(new Response('', { status: 204 }));
  return origFetch.apply(this, arguments);
};

// 拦截 XHR
XMLHttpRequest.prototype._open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype._send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u) {
  if (isAdUrl(u)) { this._blocked = true; return; }
  return XMLHttpRequest.prototype._open.apply(this, arguments);
};
XMLHttpRequest.prototype.send = function () {
  if (this._blocked) return;
  return XMLHttpRequest.prototype._send.apply(this, arguments);
};

// CSS 隐藏广告元素
var adCSS = document.createElement('style');
adCSS.textContent = [
  '[class*="ad-container"],',
  '[id*="ad-"],',
  '.ad-banner {',
  '  display: none !important;',
  '}'
].join('\n');
document.head.appendChild(adCSS);
```

## webpack 模块提取

从 webpack chunk 中提取内部模块（适用于 Discord 等基于 webpack 的应用）。

```javascript
var pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

var chunk = pageWindow.webpackChunkdiscord_app; // 具体 chunk 名因应用而异
if (chunk) {
  var theReq = null;
  // push 一个随机 chunk 来获取 webpack require 函数
  chunk.push([[Math.random()], {}, function (req) { theReq = req; }]);

  if (theReq && theReq.m) {
    var moduleIds = Object.keys(theReq.m);
    for (var i = 0; i < moduleIds.length; i++) {
      try {
        var mod = theReq(moduleIds[i]);
        if (!mod) continue;
        var target = mod.default || mod;

        // 按特征匹配：查找具有特定方法的模块
        if (typeof target.getToken === 'function' &&
            typeof target.isAuthenticated === 'function') {
          var result = target.getToken();
          console.log('webpack 匹配:', result);
        }
      } catch (e) { /* 跳过不匹配的模块 */ }
    }
  }
}
```

**注意**：此模式依赖 webpack 的 `__webpack_require__` 暴露方式，不同应用的 chunk 名不同（`webpackChunkdiscord_app`、`webpackChunkapp` 等）。

## 注意事项

1. **恢复原始方法**：长期覆写全局方法会影响性能，使用完毕后恢复
2. **try/catch**：网络拦截可能影响网站正常功能，做好错误处理
3. **权限需求**：跨域请求拦截不需要 GM_* 权限，在 none 模式下也可用
4. **CSP 影响**：部分网站严格 CSP 会阻止脚本注入，需考虑 `@run-at document-start`
5. **浏览器兼容性**：fetch 在 IE 不可用，需降级到 XHR
