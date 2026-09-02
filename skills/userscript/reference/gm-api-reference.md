# GM_* API 参考

## 存储相关

### GM_setValue / GM_getValue / GM_deleteValue / GM_listValues

持久化存储键值对（跨页面/刷新保持）。

```javascript
// 写入
GM_setValue('key', value);
// value 支持: string, number, boolean, array, object (JSON 序列化)

// 读取
var val = GM_getValue('key', defaultVal);

// 删除
GM_deleteValue('key');

// 列出所有 key
var keys = GM_listValues();
```

**注意**：Greasemonkey 4+ 限制 value 为 string 类型。

### 替代方案（无 GM_* 权限时）

```javascript
// localStorage（同域持久化）
localStorage.setItem('prefix_key', JSON.stringify(value));
var val = JSON.parse(localStorage.getItem('prefix_key'));

// sessionStorage（仅当前会话）
sessionStorage.setItem('prefix_key', 'value');
```

## 菜单相关

### GM_registerMenuCommand

在 Tampermonkey 菜单中添加自定义项。

```javascript
var id = GM_registerMenuCommand('菜单名称', function () {
  // 点击时的回调
}, accessKey);

// 移除菜单项
GM_unregisterMenuCommand(id);
```

**标准模式**：设置 toggle 菜单

```javascript
var on = GM_getValue('feature', true);
GM_registerMenuCommand((on ? '\u2714 ' : '\u2718 ') + '功能名', function () {
  GM_setValue('feature', !GM_getValue('feature', true));
  location.reload();
});
```

**注意**：Greasemonkey 4+ 只接受字符串回调，不支持箭头函数。

## DOM 相关

### GM_addStyle

向页面注入 CSS（无需创建 style 元素）。

```javascript
GM_addStyle('body { background: #000 !important; }');
```

**跨平台替代**（直接在 DOM 中注入）：

```javascript
var style = document.createElement('style');
style.textContent = 'body { background: #000 !important; }';
(document.head || document.documentElement).appendChild(style);
```

### GM_addElement

向页面添加元素（跨域安全，可添加 `<link>`, `<script>`, `<img>` 等）。

```javascript
GM_addElement('script', { src: 'https://example.com/lib.js' });
GM_addElement('link', { rel: 'stylesheet', href: 'https://example.com/style.css' });
```

## 网络请求

### GM_xmlhttpRequest

跨域 HTTP 请求（绕过 CORS）。

```javascript
GM_xmlhttpRequest({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: { 'Accept': 'application/json' },
  onload: function (res) {
    // res.responseText - 响应文本
    // res.status - HTTP 状态码
    // res.responseHeaders - 响应头
    var data = JSON.parse(res.responseText);
  },
  onerror: function (res) {
    console.error('请求失败:', res.status);
  },
  ontimeout: function () {
    console.error('请求超时');
  },
  timeout: 10000
});
```

| 参数 | 说明 |
|------|------|
| method | GET/POST/PUT/DELETE/HEAD |
| url | 请求地址 |
| data | POST 数据（string/FormData） |
| headers | 自定义请求头 |
| responseType | json/blob/arraybuffer/document/stream |
| overrideMimeType | 覆盖 MIME 类型 |
| timeout | 超时时间(ms) |
| anonymous | 不发送 Cookie 和认证头 |
| user/password | HTTP 认证 |
| onload/onerror/ontimeout/onprogress | 回调 |

### 备选：fetch（现代浏览器）

```javascript
// @grant        none
// 直接在页面上下文中使用 fetch（无需跨域权限）
fetch('https://api.example.com/data')
  .then(function (r) { return r.json(); })
  .then(function (data) { console.log(data); });
```

## 其他 API

### GM_notification

桌面通知。

```javascript
GM_notification({
  title: '通知标题',
  text: '通知内容',
  image: 'https://example.com/icon.png',
  onclick: function () { console.log('通知点击'); },
  ondone: function () { console.log('通知已展示'); }
});

// 简化版
GM_notification('text', 'title', 'https://example.com/icon.png');
```

### GM_openInTab

新标签页打开 URL。

```javascript
var tab = GM_openInTab('https://example.com', { active: true, insert: true, setParent: true });
// active: 是否激活标签页
// insert: 是否在当前标签页旁边插入
// setParent: 关闭当前页时是否关闭此标签页
// tab.close() - 关闭标签页
// tab.onclose - 关闭回调
```

### GM_setClipboard

复制到剪贴板。

```javascript
GM_setClipboard('要复制的文本', 'text');
// 第二个参数：text/html/ 等
```

### GM_download

触发文件下载。

```javascript
GM_download({
  url: 'https://example.com/file.zip',
  name: 'file.zip',         // 保存文件名
  headers: { 'Referer': 'https://example.com' },
  saveAs: true,             // 显示另存为对话框
  onload: function () { console.log('下载完成'); },
  onerror: function (err) { console.error('下载失败:', err); }
});
```

### GM_log

在控制台输出（与 console.log 相同，但部分平台会对齐格式）。

```javascript
GM_log('调试信息');
```

### GM_info

获取脚本运行信息。

```javascript
var info = GM_info;
// info.script.name        - 脚本名称
// info.script.version     - 脚本版本
// info.script.description - 脚本描述
// info.script.namespace   - 脚本命名空间
// info.script.grant       - 授权的 GM_* API 列表
// info.script.match       - @match 列表
// info.script.runAt       - 运行时机
// info.platform           - 平台信息 (Tampermonkey/Violentmonkey)
// info.scriptHandler      - 扩展名称
```

### unsafeWindow

访问页面上下文中的全局变量（仅在沙箱模式中需要）。

```javascript
// 读取页面变量
var pageVar = unsafeWindow.someGlobalVar;

// 覆盖页面函数
unsafeWindow.someFunction = function () { /*...*/ };

// 注意: unsafeWindow 需要 @grant unsafeWindow
```

## 跨平台兼容速查

| API | TM | VM | GM4+ |
|-----|----|----|------|
| GM_setValue | ✅ 任意类型 | ✅ 任意类型 | ⚠️ 仅 string |
| GM_getValue | ✅ | ✅ | ⚠️ 仅 string |
| GM_registerMenuCommand | ✅ | ✅ | ⚠️ 仅 string 回调 |
| GM_addStyle | ✅ | ✅ | ❌ 改用 CSS 注入 |
| GM_xmlhttpRequest | ✅ 完整 | ✅ 完整 | ⚠️ 简化版 |
| GM_notification | ✅ 对象参数 | ✅ 对象参数 | ⚠️ 仅 text/title |
| GM_setClipboard | ✅ | ✅ | ❌ |
| GM_download | ✅ | ✅ | ❌ |
| unsafeWindow | ✅ | ✅ | ✅ |
