# 状态持久化与头像缓存


> 本文件讲清楚两件事：① 怎么存状态才不丢；② 头像/图片怎么缓存到本地。
>
> ⚠️ 本文件已根据 Tavo 官方手册核对，所有 API 均为真实可用版本。
>
> **关键修正（2.5）**：变量 API（`tavo.get/set/update/unset`）是**同步**的，**无需 `await`**。
> 文件 API（`tavo.file.*`）是**异步**的，返回 Promise，需要 `await` 或 `.then()`。

## 一、两条持久化通道

Tavo 提供两条通道存状态，**用途不同，不可混用**：

| 通道 | API | 同步/异步 | 存什么 | 容量 | 适合场景 |
|------|-----|----------|--------|------|----------|
| **变量** | `tavo.get/set/unset` | **同步** | 小块结构化数据（数字、对象、字符串） | 小 | HP、好感度、剧情进度、配置 |
| **文件系统** | `tavo.file.*` | **异步** | 二进制/大文本（图片、长存档） | 大 | 头像缓存、立绘、音频 |

**原则**：能用变量就别用文件；图片和大数据才用文件。

## 二、变量（tavo.get / set / unset）—— 同步！

### 作用域

```js
// chat 作用域（默认）：每个聊天独立，换聊天就丢
tavo.set('hp', 80, 'chat');
tavo.set('affection', 30, 'chat');

// global 作用域：跨所有聊天共享
tavo.set('user_prefs', {theme: 'dark'}, 'global');
tavo.set('avatar_version', 2, 'global');

// message 作用域：随消息保存（官方手册新增）
tavo.set('temp_flag', true, 'message');
```

**选择规则**：
- 剧情相关（HP、好感、当前章节）→ `chat`
- 用户偏好、全局配置、缓存版本号 → `global`
- 仅当前消息需要的临时标记 → `message`

### 基本用法（同步，无需 await）

```js
// 读（同步！直接返回值，不是 Promise）
let hp = tavo.get('hp', 'chat');           // 不存在返回 undefined
let hp2 = tavo.get('hp', 'chat') ?? 100;   // 带默认值

// 路径形式访问嵌套字段
let curHp = tavo.get('status.hp');         // 等价于 tavo.get('status')?.hp

// 写（同步）
tavo.set('hp', 80, 'chat');

// 部分更新 object（同步，只改指定字段，保留其余字段）
tavo.set('status', { hp: 100, mp: 32 }, 'chat');   // status = { hp: 100, mp: 32 }
tavo.update('status', { hp: 70 }, 'chat');           // status = { hp: 70, mp: 32 }（只改 hp）

// 路径形式写入（同步，自动创建中间对象）
tavo.set('status.hp', 70, 'chat');                   // 等价于部分更新单个字段

// 删（同步）
tavo.unset('hp', 'chat');
```

### 常见陷阱

**陷阱 1：跨消息状态丢失**
Tavo 每条消息的脚本运行在独立上下文，`window` 全局变量**不跨消息共享**。
要跨消息保持状态，**必须**用 `tavo.set/get`，不能靠 `window.xxx`。

```js
// ❌ 错：window 不跨消息
window.myState = {hp: 80};
// 下一条消息里 window.myState 是 undefined

// ✅ 对：用 tavo 变量（同步）
tavo.set('myState', {hp: 80}, 'chat');
let s = tavo.get('myState', 'chat');
```

**陷阱 2：作用域选错**
头像缓存用 `chat` 作用域 → 每个聊天重新下载一遍，浪费流量。
应该用 `global`，跨聊天复用。

**陷阱 3：误用 await（2.5 修正）**
变量 API 是**同步**的，**不需要 await**。加了 await 反而会拿到 Promise 对象。

```js
// ❌ 错（2.5 之前文档的写法，已废弃）
const hp = await tavo.get('hp', 'chat');  // hp 是 Promise（错误！）

// ✅ 对（2.5 正确写法）
const hp = tavo.get('hp', 'chat');        // hp 是实际值
if (hp > 50) { ... }                      // 正常工作
```

## 三、文件系统（tavo.file.*）—— 异步

### API 速览

```js
// 保存（content 可以是 base64、远程 URL、Blob）—— 异步
await tavo.file.save('avatar.png', base64OrUrl, {scope: 'global'});

// 是否存在 —— 异步，返回 Promise<boolean>
const exists = await tavo.file.exists('avatar.png', {scope: 'global'});

// 取可访问 URL —— 同步！拼到 <img src> 用
const url = tavo.file.url('avatar.png', 'global');

// 加载内容 —— 异步
const data = await tavo.file.load('avatar.png', {scope: 'global'});

// 删除 —— 异步
await tavo.file.delete('avatar.png', {scope: 'global'});
```

> **注意**：`tavo.file.url()` 是**同步**的（返回 URL 字符串），其余 file 方法都是异步的。

### 头像缓存标准模式

**需求**：远程图片先显示 → 后台存本地 → 有本地就用本地、没有就继续用远程。

```js
function applyAvatar(imgEl, name, remoteUrl) {
  // 文件名带 URL 哈希：URL 变了自动重下，不会用旧图
  var hash = String(name + '|' + remoteUrl).split('')
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) >>> 0;
  var fname = 'avatar_' + hash + '.png';

  // 1. 远程 URL 立即显示（保证一定有图）
  imgEl.src = remoteUrl;
  imgEl.onerror = function() {
    if (imgEl.src !== remoteUrl) {
      imgEl.src = remoteUrl;          // 本地失败，回退远程
    } else {
      imgEl.style.display = 'none';   // 远程也失败，隐藏
    }
  };

  // 2. 后台查本地缓存（file.exists 是异步的）
  if (typeof tavo === 'undefined' || !tavo.file) return;
  tavo.file.exists(fname, {scope: 'global'}).then(function(exists) {
    if (exists) {
      imgEl.src = tavo.file.url(fname, 'global');  // file.url 是同步的
    } else {
      // 3. 后台下载（file.save 是异步的）
      tavo.file.save(fname, remoteUrl, {scope: 'global'})
        .then(() => { imgEl.src = tavo.file.url(fname, 'global'); })
        .catch(() => { /* 下载失败，继续用远程，不报错 */ });
    }
  }).catch(() => { /* tavo 未就绪，继续用远程 */ });
}
```

### 为什么不用变量镜像文件状态

**反模式**：用 `tavo.set('avatar_cached', true)` 记录"文件已缓存"。

```js
// ❌ 多余且易错
tavo.file.save(fname, data, {scope:'global'});   // 异步
tavo.set('avatar_cached', true, 'global');        // 同步，但两者容易不同步
// 文件被清了但变量还在 → 误判有缓存

// ✅ 文件系统本身就是缓存，直接查（异步）
const exists = await tavo.file.exists(fname, {scope:'global'});
```

**原则**：文件系统是单一事实来源，不要用变量镜像它。

### 文件命名规范

文件名要**稳定且唯一**，建议格式：`{用途}_{标识}_{哈希}.ext`

```js
// 头像：角色名 + URL 哈希
'avatar_lilith_3a7f2b.png'

// 立绘：角色名 + 场景
'stand_lilith_battle.png'

// 存档：聊天 ID + 时间戳
'save_chat123_1719600000.json'
```

**为什么带哈希**：URL 变了（换图）时，哈希变 → 文件名变 → 自动重下，
不会误用旧图。

## 四、完整示例：带缓存的角色头像系统

```js
// 配置区（硬编码在正则注入脚本顶部，所有消息生效）
window.RPG_AVATARS = {
  '莉莉丝': 'https://cdn.example.com/lilith.png',
  '阿斯特拉亚': 'https://cdn.example.com/astra.png',
  '看板娘': 'https://cdn.example.com/keeper.png',
};

function rpgAvatarFilename(name, url) {
  var s = String(name) + '|' + String(url);
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'rpg_avatar_' + (h >>> 0) + '.png';
}

function rpgApplyAvatar(imgEl, name) {
  var url = window.RPG_AVATARS[name];
  if (!url) return;
  var fname = rpgAvatarFilename(name, url);

  // 远程先显示
  imgEl.src = url;
  imgEl.onerror = function() {
    if (imgEl.src !== url) imgEl.src = url;
    else imgEl.style.display = 'none';
  };

  // 后台查缓存 / 下载（file API 是异步的）
  if (typeof tavo === 'undefined' || !tavo.file) return;
  tavo.file.exists(fname, {scope: 'global'}).then(function(exists) {
    if (exists) {
      imgEl.src = tavo.file.url(fname, 'global');  // file.url 同步
    } else {
      tavo.file.save(fname, url, {scope: 'global'}).then(function() {
        imgEl.src = tavo.file.url(fname, 'global');
      });
    }
  }).catch(function(){ /* 静默，继续用远程 */ });
}

// 渲染所有未处理的头像
function rpgRenderAvatars() {
  document.querySelectorAll('.rpg-avatar-img:not([data-done])').forEach(function(img) {
    img.setAttribute('data-done', '1');
    var name = img.getAttribute('data-character');
    if (name) rpgApplyAvatar(img, name);
  });
}
rpgRenderAvatars();
new MutationObserver(function(muts) {
  for (var i = 0; i < muts.length; i++) {
    if (muts[i].addedNodes.length) { rpgRenderAvatars(); break; }
  }
}).observe(document.body, {childList: true, subtree: true});
```

## 五、调试技巧

1. **查变量**（同步，直接打印）：
   ```js
   console.log(tavo.get('hp', 'chat'));        // 直接输出值
   console.log(tavo.get('status', 'chat'));    // 输出对象
   ```

2. **查文件**（异步，用 then）：
   ```js
   tavo.file.exists('avatar_lilith.png', {scope:'global'}).then(console.log);
   ```

3. **清缓存**（开发时）：
   ```js
   tavo.file.delete('avatar_lilith.png', {scope:'global'});  // 异步，但不阻塞
   tavo.unset('avatar_cached', 'global');                     // 同步
   ```

4. **常见报错**：
   - `tavo.file is undefined` → Tavo 版本太旧或脚本执行时机太早，加 `typeof tavo` 守卫
   - `tavo.get(...) is not a function` → API 名写错，对照本文件检查
   - `Cannot read property 'hp' of Promise` → 误用了 `await tavo.get(...)`，去掉 await（变量 API 是同步的）
