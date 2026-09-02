# Tavo AI 使用经验总结

记录日期：2026-07-15

> **详细操作指南**：见 `skills/tavo-operations/SKILL.md`
> **账号信息**：已在 `AGENTS.md` 和 `skills/tavo-operations/SKILL.md` 中记录

## 角色卡导入

### 方式对比
| 方式 | 头像 | 数据 | 推荐度 |
|------|------|------|--------|
| Tavo 内 URL 导入（Chub/Pygmalion） | ✅ 完整 | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| Tavo 内 从文件导入（PNG） | ✅ 完整 | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| MCP `tavo_character_import_card`（JSON） | ❌ 无头像 | ✅ 完整 | ⭐⭐⭐ |
| MCP `tavo_character_update`（设 avatar 字段） | ❌ 只读无效 | ✅ | ⭐⭐ |

**结论：** 头像只能通过 PNG 文件导入或 Chub URL 导入获得。MCP 导入后手动补不了头像。

### 角色卡来源
| 平台 | Tavo URL导入 | 访问方式 |
|------|-------------|---------|
| Chub (chub.ai) | ✅ 支持 | 直接可访问 |
| Pygmalion.chat | ✅ 支持 | 直接可访问 |
| Character Tavern | ❌ 需下载PNG | 直接可访问 |
| JanitorAI | ✅ 支持 | 需浏览器访问 |

## 世界书（Lorebook）

### 获取方式
- Chub 世界书库：https://chub.ai/lorebooks
- 通过 playwright 浏览器获取 API 数据（ro.chub.ai）
- 通过 `tavo_lorebook_import` MCP 导入

### 注意
- Chub 直连 API 需要认证（403），需用浏览器获取
- 世界书名字可在导入后用 MCP 修改

## 行动按钮（已废弃）

折腾了很久但最终被 AI帮写 功能替代。结论：
- AI帮写（Tavo 内置）比自制 HTML 按钮更好用
- 可以修改建议文案，灵活性更高
- 不需要任何配置

## 预设

- Tavo 预设通过 `tavo_preset_create` + `tavo_preset_entry_upsert` 创建
- `jailbreak` 条目对应 Post-History Instructions
- `main` 条目对应 Main Prompt
- 预设可以设为默认（`tavo_preset_set_active`）

## 插件开发

- `.tpg` 格式 = zip 包，包含 manifest.json + 脚本文件
- 插件可以通过 MCP `tavo_plugin_install` 的 `zipBase64` 参数安装
- 插件的 HTML 片段运行在隔离上下文中，无法访问 `tavo` API
- 插件的 `actions.js` 运行在插件 runtime 中，可以访问 `tavo` API
- 插件可以声明 `sidebar`、`inputActions`、`htmlFragments`
- `tavo_plugin_uninstall` 可以卸载插件
- `htmlFragments` **必须**放在 `contributes` 对象内，不能放 manifest 顶层

### 工具栏按钮持久化（isConnected）
**问题**: 发送消息后 Tavo 重建 DOM，旧工具栏被 detach，按钮消失。

**修复方案**: 在 `injectBtn()` 中添加 `isConnected` 检查：
```js
function injectBtn() {
  // 1. 过滤已 detach 的工具栏
  var bars = doc.querySelectorAll('.tav-action-bar');
  var bar = null;
  for (var i = 0; i < bars.length; i++) {
    if (bars[i].children.length >= 3 && bars[i].querySelector('button') && bars[i].isConnected) {
      bar = bars[i];
    }
  }
  if (!bar) return false;
  
  // 2. 检查按钮是否仍连接在 DOM 中
  var existing = doc.getElementById('my-btn');
  if (existing) {
    if (existing.isConnected || doc.contains(existing)) return true;
    existing.remove();  // 清理 detached 元素
  }
  // ... 创建并注入新按钮
}
```

### 生成计时器管理（genTimer）
**问题**: 面板关闭后旧的 `setInterval` 继续运行，重新打开后多个 timer 叠加导致闪烁。

**修复方案**: 用模块级变量 `genTimer` 替代局部 `var timer`：
```js
var genTimer = null;  // 模块级变量

async function doGen() {
  if (genTimer) clearInterval(genTimer);  // 清理旧 timer
  
  bd.innerHTML = '<span id="timer">1</span>s';  // 从 1 开始
  genTimer = setInterval(function() {
    var el = doc.getElementById('timer');
    if (el) el.textContent = Math.ceil((Date.now() - startTime) / 1000);  // Math.ceil
  }, 500);
  
  try {
    var result = await tavo.generate(...);
    clearInterval(genTimer); genTimer = null;
    // ...
  } catch(e) {
    clearInterval(genTimer); genTimer = null;
  }
}

// 关闭面板时也要清理
function closePanel() {
  pn.style.display = 'none';
  if (genTimer) { clearInterval(genTimer); genTimer = null; }
}
```

### 计时器起始值
- 用 `Math.ceil` 替代 `Math.floor`，初始 `display: 1s`（避免显示 0s）
- 关闭面板时清理 genTimer，避免叠加闪烁

### GitHub Release 发布流程
```powershell
# 1. 创建 Release
gh release create "<plugin-id>-v<version>" --repo "Mariomoprc/tavo-plugins" --title "标题" --notes "变更说明"

# 2. 上传 .tpg 附件
gh release upload "<plugin-id>-v<version>" "plugin.tpg" --repo "Mariomoprc/tavo-plugins" --clobber

# 3. 删除损坏版本
gh release delete "<plugin-id>-v<version>" --repo "Mariomoprc/tavo-plugins" --yes
gh api --method DELETE "repos/Mariomoprc/tavo-plugins/git/refs/tags/<tag>" --silent
```

## MCP 连接

- Tavo 手机端开启 MCP 服务器 → 局域网访问
- OpenCode 的 `remote` 类型 MCP 不兼容（需要 SSE 传输）
- 替代方案：直接用 curl/Python 调用 `http://手机IP:7347/mcp`
- 锁屏后 MCP 会断开，需解锁恢复
- Bearer Token：62sv3j，URL 路径：/mcp

## Discord

- 小号：slime00260
- User Token 可通过 Playwright Edge 提取：`addInitScript` + `reload` + `evaluate` 读取 `localStorage.token`
- User Token 会过期，每次任务开始重新提取
- Bot Token 需要被邀请到服务器才能读消息（可访问 `/threads/active`）
- User Token 无法访问 `/threads/active`（返回 code 20002）
- 论坛频道（forum）需用 `/threads/archived/public` 获取帖子，不是 `/messages`

### 生成流程事件时序（2026-07-26 实验确认）

```
用户按发送 → input:beforeSend（捕获 scrollTop）
↓ ~200ms
Tavo 渲染用户消息 → 滚动到底部
↓ ~0ms
generation:prepare → scrollTop 已是 0
↓
生成过程中用户可能滚动 → 需 scroll 事件监听动态切换 hold
↓
generation:success → message:added → Tavo 滚动到底部
```

**关键发现：**
- `input:beforeSend` 是唯一早于 Tavo 滚动的事件
- `generation:prepare` 触发时 scrollTop 已是 0
- 用户在生成过程中滚动需要 scroll 事件 + `generating` flag 检测

### 滚动保护插件实验结论（2026-07-26）

**结果：** 经过 7 轮迭代修复，`com.mori.scroll-lock`（阅读位保持 v5.0.3）所有方案均失效，已放弃。

**确认有效的架构前提：**
- 所有 DOM 操作逻辑必须在 entry.js（主窗口）
- htmlFragment 仅用于 UI 显示（按钮+样式）
- `input:beforeSend` 必须用 `"permissions": ["input"]`
- 需要同时 patch `Element.prototype.scrollTo` 和 `scrollIntoView`

**最终判断：** Tavo 0.93.0 的 Flutter WebView 中可能存在 Flutter 原生滚动路径完全绕过 DOM 层，JS 层的 scroll 拦截无法彻底阻止程序化滚动。该功能在当前 Tavo 插件架构下**不可实现**。

### context:true 改进了分析质量
原先用 `tavo.message.find([])` 手动取消息 + `context:false`，AI 看不到完整上下文。
改为 `context:true` 后让 AI 读全部聊天上下文，结果更接近 `<System>总结</System>` 快捷键的质量。

### 增量分析设计
- `lastMsgCount`：每次分析时记录消息数
- 首次分析：全量 `context:true`
- 增量分析：旧总结 + 新消息片段 + `context:false`，省 token 且避免重复

### 自动触发（v1.8.0）
- `setInterval` 30s 轮询 `tavo.message.find([])`
- 消息数增 ≥ 5 条 → 后台静默分析（`silent=true`）
- 开关持久化到 `tavo.set('relAuto2', bool, 'global')`

## 功能开发选型原则（基于 v1.9.0 经验）

| 优先级 | 类型 | 示例 | 风险 |
|--------|------|------|------|
| ⭐⭐⭐⭐⭐ | 纯前端计算 | 搜索、统计、消息时间线 | 无 |
| ⭐⭐⭐⭐ | 只读 API | `lorebook.get()`、`chat.current()` | 低 |
| ⭐⭐⭐ | 未知 API | 预设读取、正则读取 | 未知 |
| ⭐⭐ | 写入 API | `character.update()`、`message.append()` | 中 |
| ❌ | 数据写入 | `pm clear` | 极高 |

## 主题美化

- Tavo 主题的发光效果来自主题 CSS，不是 HTML 按钮导致
- 无法通过插件 CSS 注入覆盖（隔离上下文）
- 无法通过 ADB 修改（应用数据不可访问）
- 唯一方式：在 Tavo 设置中编辑主题 CSS 或换主题

## 话题优化（2026-07-22）

### 入口方式对比

| 方式 | 特性 | 使用场景 |
|------|------|----------|
| **htmlFragments** | 在 iframe 中执行，可靠加载，需使用 `window.top.document` | ✅ 主要入口，必须使用 |
| **entry.js** | 在页面主上下文执行 | ❌ 只会在有 sidebar/inputActions 时执行 |
| **sidebar** | 侧边栏按钮稳定 | 用户反馈不方便（需点菜单展开） |
| **浮动按钮** | `position:fixed` 注入 body，持久稳定 | ✅ 推荐方式 |

### 浮动按钮模式
- 所有 DOM 通过 `doc.createElement` 动态创建 → 注入 `doc.body`
- MutationObserver 监控 `doc.body`，按钮被移除时 `reInject()`
- 拖动功能绑定在按钮容器上（`cursor:grab`），位置用 `tavo.set('key', value, 'global')` 持久化
- 面板互斥：打开一个时关闭另一个（`doc.getElementById('rel-pn').classList.remove('rel-open')`）
- 背景点击关闭：`doc.addEventListener('click', e)` 检查点击目标是否在面板/按钮内

### 情报站（AI 剧情分析）
- 用 `{context:true}` 让 AI 读取完整聊天上下文
- prompt 适配多种角色卡类型：感情片关注关系、生存片关注资源、剧情片关注情节
- 生成结果带 footer：`⏱Xs · 新消息自动刷新 · 点右上角的🔄手动刷新`
- 生成中显示读秒，完成后读秒移到 footer
- `_newMsgPending` flag 避免面板关闭时缓存被清除但没机会重新生成
- 自动刷新：每 5 秒 `tavo.message.count()` 检测消息数变化

### 世界书（Lorebook）
- 用 `tavo.chat.current().lorebooks` 获取当前对话绑定世界书，而非硬编码 ID
- 过滤模板代码：`cts.indexOf('<%') < 0 && cts.indexOf('getvar') < 0 && cts.indexOf('setvar') < 0`
- 角色资料面板用不透明背景（情报站/角色卡/世界书），避免磨砂玻璃穿透内容

### 面板 CSS 设计准则
- 情报站/角色卡/世界书用 `#1a1a1a` 不透明背景
- `.rel-body` padding: `10px 10px 10px`（tabs 和内容间距 10px）
- 计时器放在生成中的加载卡片内，完成后放到 footer
- tabs 行右侧显示刷新按钮（仅在情报站标签页可见）
- 字体适配平板：Tab 13px，内容 14px，状态标签 12px，footer 11px

### Release 发布
- GitHub API 创建 release：`POST /repos/{owner}/{repo}/releases` + Token auth
- 上传 .tpg 附件：`POST /uploads.github.com/.../assets?name=file.tpg`
- Token 从 `$env:GITHUB_PERSONAL_ACCESS_TOKEN` 获取
- Manifest version 必须在打包前更新

### htmlFragment 限制（重要）

**htmlFragment 运行在 iframe 环境中，以下操作会导致整个插件不加载：**

- ❌ `window.top.document.addEventListener('mousemove', handler)` — 在父页面注册全局事件监听器
- ❌ `e.preventDefault()` 在 `mousedown`/`touchstart` 上
- ❌ 使用 `write` 工具重写整个插件文件（可能改变编码）

**安全方案：**
- ✅ 用 `edit` 增量修改，不改变文件编码
- ✅ 从 GitHub Release 下载已验证的 .tpg 解压后修改
- ✅ 如需拖拽等复杂交互，用 `entry.js` + `inputActions` 在主页面上下文实现

**验证流程：**
1. MCP `tavo_plugin_install` 安装
2. `tavo_plugin_search` 确认版本和启用状态
3. `tavo_plugin_get_runtime_contributions` 检查运行时 HTML
4. Tavo WebView 的 JavaScript 控制台查看错误

## Discord 搜索角色卡经验

### 搜索方法
1. 使用无头浏览器登录 Discord（已有登录状态）
2. 进入 Tavo 服务器 → 🎭丨角色卡分享 频道
3. 使用搜索功能（Ctrl+Shift+F）搜索角色名
4. 查看搜索结果中的帖子标题和描述

### 搜索结果示例（2026-07-15）
| 角色名 | Discord帖子 | NSFW标签 |
|--------|-------------|----------|
| 林秀英 | 聊天中提到（非角色卡帖子） | 无 |
| Crimson Fall | 🍎Crimson Fall (深红坠落)｜酒吧经营｜全员渣男｜女性向 | 无明确NSFW |
| 相亲相爱一家人 | ❤️相亲相爱一家人❤️（内含乱伦/背德/骨科/NTR/绿帽癖） | **乱伦/背德/骨科/NTR/绿帽癖** |
| 渡仙门 | 无结果 | 未知 |
| 绒馆 | ❤️绒馆❤️（被上二楼/纯肉卡/NSFW/鸡鸭模拟器...） | **NSFW/纯肉卡** |
| 锦瑟楼 | 无结果 | 未知 |
| 袁青禾 | 无结果 | 未知 |
| 艾恩大陆 | 无结果 | 未知 |

### 不适合公共场所的角色
- **相亲相爱一家人** - 包含乱伦/背德/骨科/NTR/绿帽癖等敏感内容
- **绒馆** - 明确标注NSFW，成人服务业RPG主题

## MCP 角色卡标签操作

### 可用工具
- `tavo_character_search` - 搜索角色卡
- `tavo_character_get` - 获取角色卡详情
- `tavo_character_create` - 创建角色卡
- `tavo_character_update` - 更新角色卡（包括标签）
- `tavo_character_import_card` - 导入角色卡

### 更新标签示例
```bash
# 更新角色卡标签
Invoke-RestMethod -Uri "http://192.168.3.65:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json"} -Body '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tavo_character_update","arguments":{"id":42,"character":{"tags":["NSFW","纯肉卡","技师模拟"]},"dryRun":false}}}'
```

### 注意事项
- 更新标签会完全替换原有标签，需要保留原有标签
- 使用 `dryRun:true` 可以预览更改
- 中文标签在API返回中显示为乱码，但实际存储正常
- 标签是字符串数组，无长度限制

### 截图角色卡标签更新记录（2026-07-15）
| ID | 角色名 | 新增标签 |
|----|--------|----------|
| 45 | 林秀英 | 养老院, 护工, 现实向 |
| 44 | Crimson Fall v0.2 | 女性向, 恋爱模拟, 酒吧经营, 全员渣男, 都市奇幻, 犯罪喜剧 |
| 43 | 相亲相爱一家人 | 保持原有标签（已有NSFW, 乱伦, 骨科等） |
| 42 | 绒馆 | NSFW, 纯肉卡, 技师模拟, 不适合公共场所, 鸡鸭模拟器, 走肾不走心 |
| 41 | 渡仙门 | 保持原有标签（已有NSFW, 经营模拟等） |
| 40 | 锦瑟楼 | 保持原有标签 |
| 39 | 袁青禾 | OUNC |
| 38 | 艾恩大陆 | 奇幻, 冒险, 自定义开局 |

## Google Voice 账号信息

### 账号详情
- 邮箱：q16514208@gmail.com
- 密码：feftut-Zocnyg-9sewxy
- 2FA密钥：eovz bh7r pj37 6fzx f2sm 2fr4 jjxs vvu7
- 电话号码：(650) 503-3084
- 用途：Discord 登录、Google 服务认证

### 使用提醒
- 必须使用美国 IP 登录
- 新号禁止发送短信（谷歌严查电信诈骗）
- 延迟 48 小时才能修改密码等信息
- 账号质保 24 小时，有问题 24 小时内联系
- 登录教程：https://taohaome.org/177.html

---

## 备忘录模式（Panel v4.3.2+）

### 核心理念
替代原来的实时情报站，改为累加式角色备忘。核心原则：**稳定层永远在线，动态层有就更好，没有不崩**。

### 数据结构
```
tavo.set('relCharList_' + chatId, {
  version: 1,
  updatedAt: "12:00",
  chars: [{
    name: "江南",              // 角色名（稳定层）
    identity: "地摊系统持有者", // AI 分析（动态层）
    trait: "对钱不感兴趣",      // AI 分析
    status: "正在摆摊",         // AI 更新
    relations: [{..}],         // AI 更新
    events: [{ time, text }]   // AI 更新
  }]
}, 'global')
```

### 刷新策略
| 触发 | 方式 | 失败处理 |
|------|------|---------|
| 打开面板 | 自动 | 显示角色名，底部「等待分析」|
| 每条新消息 | 后台静默 | 跳过不报错，保留上次数据 |
| 点击 🔄 | 强制重分析 | 底部显示「△ 上次分析失败」|

### Action bar 稳定性 6 层机制
1. 立即注入
2. 延迟注入（500ms / 1000ms / 2000ms）
3. 增强 MutationObserver（100ms 响应）
4. 高频轮询（1秒 + 父元素检查）
5. scroll/resize 事件
6. requestAnimationFrame 持续检查

---

## 小说 → 剧情百科（世界书方案）

### 核心定位
用户将小说转为 Tavo 内容的真实需求是**剧情重温/百科查询**，而非角色扮演。

### 方案对比
| 方向 | 用途 | 做法 |
|------|------|------|
| ❌ 角色卡 | 与AI角色互动 | 提取角色信息，做 CCv3 卡 |
| ✅ **世界书剧情百科** | 随时问剧情细节 | 分卷整理剧情摘要成世界书条目 |

### 分块累加摘要流程（大长篇专用）
适用于100万字以上的超长篇网络小说：
1. 小说 TXT 分块（每块 5万字 ≈ 20章）
2. 块1 → AI摘要 → 累积摘要 v1
3. 块2 + 累积摘要 v1 → AI摘要 → 累积摘要 v2
4. 重复直到最后一块 → 完整剧情摘要
5. 用完整摘要生成世界书条目（每卷/每200章一条）

### 现有工具
| 工具 | 用途 | 状态 |
|------|------|------|
| `nariahlamb/st_book` | SillyTavern 小说→角色卡+世界书 | MIT, 1年未更新 |
| `cardplus.jiuci.top/toolbox` | 世界书转换等工具 | 网页版可用 |
| CardForge | 可视化角色卡编辑器 | 可用 |
