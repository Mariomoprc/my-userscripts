# my-userscripts

我的用户脚本合集，用于 Violentmonkey / Tampermonkey。

## 脚本列表

> 新添加的脚本放在列表最前面。

| # | 脚本 | 用途 | 安装 |
|---|------|------|------|
| 1 | [Discord Token 获取器](https://greasyfork.org/zh-CN/scripts/587500-discord-token-获取器) | 通过菜单获取 Discord Token | [🔗](https://greasyfork.org/scripts/587500/code/script.user.js) |
| 2 | [Gemini Alt+Click 快速删除](https://greasyfork.org/zh-CN/scripts/587501-gemini-alt-click-快速删除) | Gemini 对话 Alt+Click 快速删除 | [🔗](https://greasyfork.org/scripts/587501/code/script.user.js) |
| 3 | [Gemini 默认开启临时对话 (终极稳定版)](https://greasyfork.org/zh-CN/scripts/587502-gemini-默认开启临时对话-终极稳定版) | Gemini 默认开启临时对话 | [🔗](https://greasyfork.org/scripts/587502/code/script.user.js) |
| 4 | [DeepSeek 历史对话快捷删除 - 完美版](https://greasyfork.org/zh-CN/scripts/587499-deepseek-历史对话快捷删除-alt-左键-完美版) | DeepSeek Alt+左键快捷删除 | [🔗](https://greasyfork.org/scripts/587499/code/script.user.js) |
| 5 | [ChatGPT 历史对话快捷删除 - 彻底终结版](https://greasyfork.org/zh-CN/scripts/587497-chatgpt-历史对话快捷删除-alt-左键-彻底终结版) | ChatGPT Alt+左键快捷删除 | [🔗](https://greasyfork.org/scripts/587497/code/script.user.js) |
| 6 | [豆包对话快捷删除 (Alt+Click)](https://greasyfork.org/zh-CN/scripts/587510-豆包对话快捷删除-alt-click) | 豆包对话 Alt+Click 快捷删除 | [🔗](https://greasyfork.org/scripts/587510/code/script.user.js) |
| 7 | [禁用 Google 语音搜索](https://greasyfork.org/zh-CN/scripts/587507-禁用-google-语音搜索-解决-ctrl-shift-与-copilot-冲突) | 解决 Ctrl+Shift+. 与 Copilot 冲突 | [🔗](https://greasyfork.org/scripts/587507/code/script.user.js) |
| 8 | [谷歌搜索去污染 + 强制解锁 AI 概览](https://greasyfork.org/zh-CN/scripts/587509-谷歌搜索去污染-强制解锁-ai-概览) | 去除多余元素，强制启用 AI 概览 | [🔗](https://greasyfork.org/scripts/587509/code/script.user.js) |
| 9 | [Google 搜索新标签打开](https://greasyfork.org/zh-CN/scripts/587503-google-搜索新标签打开) | Google 搜索结果新标签打开 | [🔗](https://greasyfork.org/scripts/587503/code/script.user.js) |
| 10 | [Bing 深色模式](https://greasyfork.org/zh-CN/scripts/587496-bing-深色模式) | Bing 搜索深色模式 | [🔗](https://greasyfork.org/scripts/587496/code/script.user.js) |
| 11 | [Bing 搜索响应式布局 (like Google)](https://greasyfork.org/zh-CN/scripts/587495-bing-搜索响应式布局-like-google) | Bing 搜索响应式布局 | [🔗](https://greasyfork.org/scripts/587495/code/script.user.js) |
| 12 | [Chub AI 中文汉化](https://greasyfork.org/zh-CN/scripts/587498-chub-ai-中文汉化) | Chub AI 中文汉化 | [🔗](https://greasyfork.org/scripts/587498/code/script.user.js) |
| 13 | [坚果云 WebDAV 双击复制](https://greasyfork.org/zh-CN/scripts/587506-坚果云-webdav-双击复制) | 坚果云 WebDAV 链接双击复制 | [🔗](https://greasyfork.org/scripts/587506/code/script.user.js) |
| 14 | [豆瓣剧集完结时间](https://greasyfork.org/zh-CN/scripts/587512-豆瓣剧集完结时间) | 显示完结时间、更新进度 | [🔗](https://greasyfork.org/scripts/587512/code/script.user.js) |
| 15 | [豆瓣人人视频跳转](https://greasyfork.org/zh-CN/scripts/587511-豆瓣人人视频跳转) | 标题后添加人人视频搜索跳转 | [🔗](https://greasyfork.org/scripts/587511/code/script.user.js) |
| 16 | [豆瓣自动加载更多](https://greasyfork.org/zh-CN/scripts/587513-豆瓣自动加载更多) | 页面自动加载更多内容 | [🔗](https://greasyfork.org/scripts/587513/code/script.user.js) |
| 17 | [全站 最小化自动暂停](https://greasyfork.org/zh-CN/scripts/587505-全站-最小化自动暂停-仅在含音视频页面生效) | 切到后台时自动暂停音视频 | [🔗](https://greasyfork.org/scripts/587505/code/script.user.js) |
| 18 | [人人视频增强包](https://greasyfork.org/zh-CN/scripts/587504-人人视频增强包) | 反调试、去广告、豆瓣跳转等 | [🔗](https://greasyfork.org/scripts/587504/code/script.user.js) |
| 19 | [网页代理检测器](https://greasyfork.org/zh-CN/scripts/587508-网页代理检测器) | 检测是否需要代理 | [🔗](https://greasyfork.org/scripts/587508/code/script.user.js) |

## 工作流程

### 制造新脚本

1. 在[此仓库](https://github.com/Mariomoprc/my-userscripts)的 `main` 分支下创建 `.user.js` 文件
2. 确保元数据完整（`@name`, `@version`, `@match`, `@grant`, `@description`）
3. 更新 README.md：新脚本放在脚本列表**最前面**，序号从 1 开始递增，后续脚本顺延编号
4. `git add + commit + push`
5. 提交 raw GitHub URL 到 [Greasy Fork 导入页](https://greasyfork.org/zh-CN/import)，选择「自动」同步
6. 浏览器中从 Greasy Fork 安装脚本（获得在线状态 + 云图标）

### 修改已有脚本

1. 编辑 `.user.js` 文件
2. `@version` 版本号 +1（Greasy Fork 识别新版本的依据）
3. `git add + commit + push` → Webhook 自动同步到 Greasy Fork
4. Violentmonkey 检测到新版本 → 自动更新

### 注意事项

- 敏感数据（Token、密钥等）用 `GM_getValue`/`GM_setValue` 存储，不要硬编码在脚本中
- 不要手动修改 Greasy Fork 上的 `@downloadURL` 和 `@updateURL`，由 GF 自动管理
- 首次从 GF 安装后才能获得在线状态，导入 zip 无法得到云图标
