## 插件自动测试流程（ADB + USB）

制作插件后可通过 ADB + USB 数据线进行自动化测试。前提：手机开启开发者模式 + USB 调试连接电脑。

### Phase 1：本地构建验证（无需手机，~10秒）

```powershell
# 1. manifest.json 校验 — 必备字段检查
python -c "
import json
with open('manifest.json','r') as f:
    m=json.load(f)
required=['id','name','version','specVersion','contributes']
for r in required:
    print(f'  {r}: {\"OK\" if r in m else \"MISSING\"}')
"

# 2. JS 语法检查
node --check entry.js 2>&1
if ($?) { echo "JS 语法 OK" }

# 3. HTML 花括号平衡检查（入口脚本）
$html = Get-Content "fragments\bootstrap.html" -Raw
$opens = [regex]::Matches($html, '{').Count
$closes = [regex]::Matches($html, '}').Count
if ($opens -eq $closes) { echo "花括号平衡 OK ($opens/$closes)" }

# 4. .tpg 打包并验证结构
# MCP: tavo_plugin_package(files: [{path:"manifest.json",text:"..."}], includeZipBase64: true)
# 或手动 zip + 改扩展名
Compress-Archive -Path "manifest.json","entry.js","fragments\" -DestinationPath "plugin.zip" -Force
Rename-Item -Path "plugin.zip" -NewName "plugin.tpg" -Force
echo "✅ .tpg 打包完成"
```

### Phase 2：ADB 安装验证（需 USB，~30秒）

```powershell
# 1. 确认 ADB 连接
adb devices
# 预期: List of devices attached + 设备序列号

# 2. 确认 Tavo 已安装
adb shell pm list packages | findstr tav
# 预期: package:app.bitbear.tav

# 3. 推送到手机 Download 目录
adb push plugin.tpg /sdcard/Download/plugin.tpg

# 4. 重启 Tavo（清状态）
adb shell am force-stop app.bitbear.tav
Start-Sleep -Seconds 1
adb shell monkey -p app.bitbear.tav 1
echo "✅ Tavo 已启动，用户需在 Tavo 中手动导入 .tpg"
```

**注**：v0.92.0+ 支持文件管理器点击 .tpg 直接安装。用户需在 Tavo 设置中启用插件 + 开启高级渲染。

### Phase 3：ADB UI 验证（需 USB，~1分钟）

```powershell
# 1. 截图基线
adb exec-out screencap -p > test_before.png

# 2. Dump UI 结构（检查按钮是否存在）
adb shell uiautomator dump /sdcard/ui.xml
adb shell cat /sdcard/ui.xml > ui_dump.xml

# 3. 从 ui_dump.xml 中提取插件按钮坐标
# 查找 <node text="🎲" ... bounds="[540,1776][600,1848]"/>
$xml = Get-Content "ui_dump.xml" -Raw
if ($xml -match 'text="🎲"') { echo "✅ 插件按钮存在" }

# 4. 点击按钮（替换为实际坐标）
# adb shell input tap X Y

# 5. 等待面板渲染
Start-Sleep -Seconds 2

# 6. 截图验证
adb exec-out screencap -p > test_after.png
echo "✅ 截图完成，对比 test_before.png 和 test_after.png"
```

### Phase 4：MCP 运行时验证（可选，需 USB 端口转发）

```powershell
# 1. USB 端口转发（MCP 走 USB 更稳定，锁屏不断）
adb forward tcp:7347 tcp:7347

# 2. 调用 MCP 验证插件加载状态
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tavo_plugin_get","arguments":{"id":"com.example.plugin"}}}'
# 执行后检查返回的 id/version/enabled 字段

# 3. 检查运行时贡献
$body2 = '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"tavo_plugin_get_runtime_contributions","arguments":{}}}'
# 确认插件的 htmlFragments 和 sidebar 已加载
```

### Phase 5：错误排查（出问题时，~30秒）

```powershell
# 1. 查看 Tavo 错误日志
adb logcat -d -s app.bitbear.tav:* 2>$null

# 2. 查找 JS 加载错误
adb logcat -d | findstr "error\|Error\|failed\|Failed\|Js\|JS"

# 3. 确认插件文件已推送到手机
adb shell ls -l /sdcard/Download/plugin.tpg
```

### 快速运行脚本

以下命令复制到终端即可依次执行 Phase 1-3：

```powershell
# === Phase 1: 本地构建验证 ===
echo "=== Phase 1 ==="
node --check entry.js; if ($?) { echo "JS 语法 OK" } else { exit 1 }
if (([regex]::Matches((Get-Content fragments\bootstrap.html -Raw),'{').Count) -eq ([regex]::Matches((Get-Content fragments\bootstrap.html -Raw),'}').Count)) { echo "花括号 OK" } else { echo "花括号不平衡!"; exit 1 }
Compress-Archive -Path "manifest.json","entry.js","fragments\" -DestinationPath "plugin.zip" -Force
Rename-Item -Path "plugin.zip" -NewName "plugin.tpg" -Force; echo "✅ .tpg 打包完成"

# === Phase 2: ADB 安装 ===
echo "=== Phase 2 ==="
adb push plugin.tpg /sdcard/Download/plugin.tpg
adb shell am force-stop app.bitbear.tav; Start-Sleep 1
adb shell monkey -p app.bitbear.tav 1; echo "✅ Tavo 已启动"

# === Phase 3: UI 截图验证 ===
echo "=== Phase 3 ==="
adb exec-out screencap -p > test_before.png
adb shell uiautomator dump /sdcard/ui.xml
adb shell cat /sdcard/ui.xml > ui_dump.xml
Start-Sleep 2
adb exec-out screencap -p > test_after.png
echo "✅ 测试完成，对比截图"
```

### 测试前提条件

| 条件 | 说明 |
|------|------|
| USB 数据线连接电脑 | `adb devices` 必须显示设备 |
| 开发者模式 + USB 调试 | 手机端必须开启 |
| Tavo 已安装（apk 或 Play Store） | `adb shell pm list packages` 确认 |
| v0.92.0+ 支持文件管理器导入 | 低版本需其他方式 |
| 高级渲染已开启 | 设置 → 聊天设置 → 高级渲染 |

### 社区插件源码参考

| 插件 | ID | 版本 | 特性 | 来源 |
|------|-----|------|------|------|
| 剧情选择器 | `com.cyoa.choices` | v1.7.0 | htmlFragments, 浮动面板, 5个差异化选项+7层解析器+工具栏注入+顺序修正 | 📌 自研 |
| 角色资料面板 | `com.relationship.panel` | v3.9.4 | htmlFragments, 浮动面板+工具栏按钮, 3标签（情报站/角色卡/世界书）, 状态AI分析+后台持续, 进对话自动分析, 世界书查看 | 📌 自研 |
| 第五季果汁记忆插件 | `fsj-official-release` | v3.1.0 | sidebar×6, htmlFragments×2(含message-tail桥接), actions, permissions 全6项 (input/message/generate/variable/file/network), `__FIFTH_SEASON_SHELL__` 全局命名空间通信, 787KB bootstrap包 | 🎯 Discord |
| 渡鸦生图 | `com.tizenry.duya-shengtu` | v7.3.0 | sidebar×7, htmlFragments×1, actions, inputActions, permissions [input,message,generate,variable,file,network], settings.schema 7类型, 桥接正则 | 🎯 Discord |
| 小手机 | `com.user.app-simulator` | v1.0.0 | htmlFragments×14, 模块化架构, 无 sidebar/actions, 内部设置管理 | 🎯 Discord |
| 清露终端V1.0 | `com.luna-miniphone` | v1.0.0 | 终端式状态管理面板, 20+模块(状态/属性/背包/技能/效果/角色/通讯), 正则桥接 | 🎯 Discord |
| CCC Plug-in Bundle | `com.clowuds.ccc-bundle` | — | all-in-one 合集, 多个子插件打包, 减少侧边栏杂音 | 🌍 Discord EN |
| CCT Relationship Tracker | `com.clowuds.cct-relation` | — | 角色间情感状态追踪, AI驱动更新, 支持别名/标签/禁忌标记 | 🌍 Discord EN |
| Deep Story Reforged Lite | `com.jeppster.deepstory` | — | 故事连续性追踪(场景/世界状态/剧情线索/关系), 变量注入上下文 | 🌍 Discord EN |
| Unspoken Thoughts | `com.strawberrykitty.unspokenthoughts` | — | 内心独白可视化, 5种颜色主题, 侧边栏触发+自动扫描模式 | 🌍 Discord EN |
| Scenekeeper | `com.strawberrykitty.scenekeeper` | — | 天气/场景装饰浮动部件, 自动检测天气和时间, 动画效果 | 🌍 Discord EN |
| ST Port - Summaryception | `com.clowuds.summaryception` | — | Summaryception 移植, 对话摘要, 需关闭 Tavo 内置长记忆 | 🌍 Discord EN |
| CCC Message Enhancer | `com.clowuds.msg-enhancer` | — | 消息增强+引导式重新生成, 支持「帮用户写」和「按指令改回复」 | 🌍 Discord EN |

完整源码可通过 `tavo_plugin_get_runtime_contributions` MCP 工具获取，或从 Discord 帖子附件下载 `.tpg` 文件解压分析。

### 自研插件详情

以下为 `slime098934` 开发的插件，已发布到 Discord #🧩丨插件分享 频道。

#### 剧情选择器 (com.cyoa.choices)

**Discord 帖子**: `1527572846791102464` (频道 `1371748407487762536`)
**发布账号**: `slime098934`
**适用版本**: Tavo v0.91.0+（需开启高级渲染）

**版本历史**:

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.3.0 | 首发 | 基础 CYOA 选项生成 |
| v1.3.1 | 7/17 | 选项提示词修改 |
| v1.4.0 | 7/17 | 面板可拖动、选项缓存、智能刷新、生成计时、并发锁修复 |
| v1.5.0 | 7/17 | 多格式 fallback、选项追加、计时定位 |
| v1.5.1 | 7/18 | ⛔ isConnected 修复（manifest 格式错误，导致插件不加载） |
| v1.5.2 | 7/18 | ⛔ 修复 manifest 格式（htmlFragments 位置再错） |
| v1.5.3 | 7/18 | ✅ 修复 manifest `contributes.htmlFragments` 格式 |
| v1.5.4 | 7/18 | ✅ 修复计时器闪烁、不从1开始的问题 |
| v1.5.5 | 7/20 | ✅ 修复"重要历史情节"生成问题（优化 prompt + 添加过滤词） |
| v1.5.6 | 7/21 | ✅ 终端风格 UI + 风格选择器（6种风格，自动记忆） |
| v1.5.7 | 7/21 | ✅ 显示生成时间 + 新增🔥亲密互动风格（NSFW） |
| v1.6.0 | 7/21 | ✅ 5个差异化选项（主线剧情/日常琐事/感情发展/冲突紧张/探索发现）+ 成人化prompt + 10个选项 |
| v1.6.2 | 7/22 | 🎨 风格图标改为黑白配色（◆○♡▲◎）、整体字体增大 12→14px、面板加宽 320→380px、自动重试（3次）+后台继续读秒 |
| **v1.7.0** | **7/22** | ⬆ **综合修复**：工具栏注入重连(isConnected+顺序修正)、7层解析器(多格式兼容)、简化prompt重试、毛玻璃半透明、计时器修复 |
| v1.7.1 | 7/25 | 适配 Tavo 0.93.0，manifest specVersion 更新 |
| v1.9.5 | 7/23 | 多项优化 |
| v1.9.6 | 7/23 | 多项优化 |
| v1.9.7 | 7/23 | 多项优化 |
| v1.9.8 | 7/23 | 多项优化，specVersion 2 |
| v1.9.8-patch | 7/24 | 紧急补丁 |
| v1.9.9 | 7/25 | 适配 specVersion 2，修复系统提示缓存 bug，SemVer 格式 |
| **v1.10.0** | **7/27** | ♡ 感情发展 prompt 增强（快速攻略方向），修复系统提示缓存 bug（系统提示优先于缓存） |

**核心功能**:
- 点击工具栏 🎲 按钮，AI 根据当前对话生成 5 个行动选项
- 选中选项自动填入输入框，支持"再来一组"
- 选项缓存（cachedItems + cachedMsgCount），关闭重开秒出
- 智能刷新：消息数变化自动重新生成
- 生成计时：实时读秒，选项左上角显示耗时

**社区反馈**:
- 用户反映有时提示"未能解析选项"（v1.5.0 已修复多格式 fallback）
- 用户问能否直接在预设中写死选项（不是插件设计目标，插件依赖实时 AI 生成+聊天上下文）
- 拖动功能让移动端体验更好

**技术实现**:
- 浮动面板（position:fixed，居中+拖动）
- `tavo.generate(context: true)` 生成选项
- `<suggestion>` 标签解析
- genSeq 计数器防并发
- 参考来源：CYOA 视频教程 + Tavo 小手机插件 UI 风格

**已知性能问题**（来自 Discord 帖子 `1527572846791102464`）：

| 反馈 | 来源 | 状态 |
|------|------|------|
| 生成选项等待 2-3 分钟 | kingnaive | ⚠️ 核心问题 |
| 新剧情按钮不出现，需切换卡 | mobao000_37295 | ✅ 已修复 v1.5.4 |
| "未能解析选项" 错误 | xijiuli_89011 | ✅ 已修复 v1.5.0 |
| 系统提示模式关闭再打开显示旧缓存选项 | 用户反馈 | ✅ 已修复 v1.10.0 |

**优化方向**（详见模式G部分）：
1. **预生成缓存**：进入对话时预先缓存一组选项，秒出而非等待
2. **消息数智能检测**：对比 cachedMsgCount，有变化才重新生成（已实现）
3. **差异化 prompt 优化**：缩短 prompt 长度，减少生成时间
4. **超时控制**：`withTimeout(promise, 15s)` 防止 AI 过慢
5. **模型提示**：建议用户使用快速模型（如 ds v4 flash）
6. **提示词通用化**：避免硬编码特定世界书机制，用条件句式保持跨卡兼容

#### 角色资料面板 (com.relationship.panel)

**Discord 帖子**: `1527673143139897344` (频道 `1371748407487762536`)
**发布账号**: `slime098934`
**适用版本**: Tavo v0.91.0+（需开启高级渲染）

**版本历史**:

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.3.0 | 首发 | 基础角色信息展示 |
| v1.4.0 | 7/17 | 角色颜色标记、故事线分析 |
| v1.5.0 | 7/17 | 修复角色信息丢失问题、移除 AI 异步获取逻辑 |
| v1.5.1 | 7/18 | ⛔ isConnected 修复（manifest 格式错误） |
| v1.5.2 | 7/18 | ⛔ 修复 manifest 格式 |
| v1.5.3 | 7/18 | ✅ 修复 manifest `contributes.htmlFragments` |
| v1.7.0 | 7/19 | 增量故事线分析、自动触发分析（每5条消息）、聊天统计标签页 |
| v1.7.1 | 7/19 | 移除超时限制 |
| v1.8.0 | 7/19 | 增量分析优化、自动触发开关、聊天统计完善 |
| v1.9.0 | 7/19 | 聊天搜索+高亮、世界书查看器、故事线导出到输入框 |
| v1.9.1 | 7/19 | 模板代码过滤（stripTemplate 版） |
| v1.9.2 | 7/19 | ⬆ **v1.9.2重大重构**：标签减至5个（角色卡/世界书/故事线/搜索/统计）、AI排版→正则排版秒出、角色卡合并4字段+开场白、世界书正则格式化、记住上次标签+滚动位置、故事线读秒防闪动+prompt优化60s超时、搜索简化、字号加大 |
| v1.9.3 | 7/20 | ✅ 优化故事线分析 Prompt，更通俗易懂，像讲故事一样总结剧情 |
| v1.9.4 | 7/20 | ✅ 修复对话开始后插件入口消失的问题 |
| v2.0.0 | 7/21 | ⚠️ 新 fragment id `rel-panel-v2` + src `panel2.html` + mount `/chat/body/end`，全新独立文件 |
| v2.2.0 | 7/21 | ⬆ 重构为 3 标签（状态/角色卡/世界书），删除故事线/搜索/统计，状态页 AI 分析 |
| v2.4.0 | 7/21 | 🐛 修复 `tavo.chat.current()` 世界书数据问题 |
| v3.0.0 | 7/21 | ⬆ 大幅重构，删除故事线分析所有代码，状态页 AI 角色摘要+读秒计时 |
| v3.3.0 | 7/21 | ⬆ 状态页 AI 摘要+读秒，世界书通过 MCP fetch 显示，工具栏按钮排序 |
| v3.4.0 | 7/21 | 🐛 世界书修复：硬编码 ID 1~6 直接 `tavo.lorebook.get()` |
| v3.5.0 | 7/21 | ⏱ 缩短状态页 prompt + 30s 超时，timer 上限30s |
| v3.6.0 | 7/21 | ⏱ 独立 DOM 的生成逻辑，后台持续分析，切换标签/关面板不中断，自动重试+120s超时 |
| v3.7.0 | 7/21 | ⏱ 自动重试（失败等2s重试1次）+ 重试提示 |
| v3.8.0 | 7/21 | 🎨 进对话自动后台分析 + 新格式（时间/地点/角色|身份|年龄|职业→状态+解说） |
| v3.8.1 | 7/21 | 🏷 标签名「状态」→「情报站」 |
| v3.8.2 | 7/21 | 🎨 美化读秒显示（居中卡片式：图标+标题+描述+时间） |
| v3.8.3 | 7/21 | 🔧 DOM 操作替代 innerHTML，避免 Webview 缓存 |
| v3.8.4 | 7/21 | ⏱ 读秒文字增大 11px→14px + prompt 添加时间地点 |
| v3.8.5 | 7/21 | 🐛 修复读秒到60重置 + 角色名缺失补全 + 时间格式化 mSs + 图标缩小 |
| v3.9.0 | 7/21 | ⚡ 一次 API 调用生成全部角色 + 去掉 `{context:false}` |
| v3.9.1 | 7/21 | 🎨 混合模板（即时角色骨架 + AI 后台更新） |
| v3.9.2 | 7/21 | 🐛 从角色卡 description 解析角色名（支持①编号）+ 读秒从1开始 |
| v3.9.3 | 7/21 | 🔧 回退纯 AI 模式，恢复 `{context:false}` |
| v3.9.4 | 7/21 | 🎨 优化加载卡显示，去掉沙漏图标 |
| **v4.0.0** | **7/22** | ⬆ **情报站重构**：JSON 格式输出（时间/地点/角色卡片/变化/状态/关系/焦点）、角色基础信息即时显示(年龄·身份·性格)、缓存+失效检测、多角色自动适配 |
| v4.0.1 | 7/22 | 🔴 **移除情报站功能**：AI 生成太慢（>15s），只保留角色卡和世界书两个标签，代码精简 40% |
| **v4.1.0** | **7/22** | ⬆ **综合修复**：毛玻璃半透明、工具栏注入重连(isConnected+顺序修正)、世界书正确读取(chat.lorebooks→lorebook.get)、删除6个死函数、MutationObserver去抖、state精简 |

**核心功能**:
- 2 个标签页：角色卡 / 世界书（v4.1.0 已移除情报站）
- 工具栏 📖 按钮展开右侧信息面板
- 角色卡：正则排版，合并角色设定+性格+情景+备注+开场白（5字段），名字高亮可点击填入输入框
- 世界书：正则排版，显示关联世界书条目内容+关键词
- 多角色/单角色都支持，自动识别角色数量
- 正则排版（formatText）：秒出，去掉 Markdown 符号/模板代码/HTML标签/特殊符号
- 记住上次打开的标签 + 每个标签的滚动位置

**社区反馈**:
- 用户反映"有意思"（正面）
- 故事线功能受到关注
- 模板代码过滤让角色设定显示更干净
- 搜索功能方便查找历史对话

**技术实现**:
- 侧滑面板（position:fixed，从右侧滑入，`min(380px, 100vw)`）
- `tavo.character.get(id)` 获取角色资料（loadData 加载全部字段）
- `tavo.chat.current()` 获取当前聊天角色列表+世界书ID
- `tavo.generate()` 分析故事线（增量：拼接旧总结+新消息，context 按消息数判断）
- `tavo.get/set('global')` 持久化：故事线缓存、标签(tab)、滚动位置(scrollTop)
- `formatText()` 正则排版：去 #/##/###/**/---/■/\*/HTML/EJS/\[CHAR-\]
- `stripTemplate()` 基础模板过滤（EJS/{{var}}/HTML/代码块）
- `saveScroll/restoreScroll`：关闭时保存 body.scrollTop，打开时 setTimeout 恢复
- 故事线读秒防闪动：`storyTimerVer` 版本号计数器，切标签自动停止旧计时
- setTimeout 轮询检测新消息用于自动触发（30s间隔，5条阈值）
- GitHub Release 发布：`gh release create/upload`

**已知性能问题与社区反馈**（来自 Discord 帖子 `1527673143139897344`）：

| 反馈 | 来源 | 状态 |
|------|------|------|
| 故事线分析慢（2-30秒）| 自测+用户 | ⚠️ 核心问题，见优化方案 |
| 进入对话自动分析阻塞 UI | slime00260 | ⚠️ 需后台异步 |
| 增量分析仍依赖 tavo.generate | 自测 | ⚠️ 可改用缓存+失效检测 |
| 角色卡/世界书内容显示慢 | 自测 | ✅ 已用 tavo.character.get / lorebook.get |
| 搜索功能有时慢 | 用户反馈 | ⚠️ 可用正则替代AI |

**优化方向**（基于社区通用模式，详见模式G部分）：
1. **角色卡/世界书标签**：已用 `tavo.character.get` + `tavo.lorebook.get` — 保持，无需改
2. **故事线分析**：改为缓存+失效检测（对比消息数），有变化才重新生成
3. **搜索标签**：从 `tavo.message.find` 匹配 + JS 正则过滤，不依赖 AI
4. **统计标签**：纯消息计数 `tavo.message.count()`，毫秒级
5. **增量分析**：旧总结+新消息，减少 token 消耗
6. **进入对话自动分析**：用 `/messages/end` 桥接替代 setTimeout 轮询
7. **角色名提取**：正则 `tavo.character.get().description` + 正则提取，不调 AI

**情报站输出格式设计（目标 v4.0）**：

```
┌─ 情报站 ────────────────────────────────────┐
│ 🕐 第三章第2幕 · 傍晚    📍 苏府东院 · 书房    │
│                                              │
│ 👤 苏锦绣  🔴                                 │
│  17岁 · 苏家嫡长女 · 外表端庄实则心思缜密      │
│  变化：发现密信，开始怀疑身边人                 │
│  状态：在书房中，独自翻阅旧信                 │
│                                              │
│ 👤 沈月白  🟡                                │
│  16岁 · 贴身丫鬟 · 忠心耿耿                  │
│  变化：在门外偷听到了谈话                     │
│  状态：在门外守候，神色紧张                   │
│                                              │
│ 🔗 关系：苏锦绣 ↔ 沈月白 [主仆/信任]          │
│ 📌 焦点：密信内容尚未被苏锦绣完全解读           │
└──────────────────────────────────────────────┘
```

**设计原则**：
- 🕐 故事内时间 + 📍 地点（AI 从上下文推断）
- 角色卡片：名字+🔴🟡🟢 → 基础信息(年龄·身份·性格) → 变化 → 状态
- 基础信息从 `tavo.character.get()` 提取（毫秒级），变化/状态 AI 生成
- 🔗 关系连线 + 📌 剧情焦点（AI 生成）
- 只有 name 和 change/status 是必有字段，其余没有就跳过
- 单角色/多角色/群聊自动适配，AI 只分析实际出场的角色

**字段来源**：
| 字段 | 来源 | 速度 |
|------|------|------|
| 名字/年龄/身份/性格 | `tavo.character.get()` 解析 description/personality | 毫秒级 |
| 🕐 时间/📍 地点/变化/状态/关系/焦点 | `tavo.generate()` AI 生成 | 2-30秒 |
| 缓存的上次分析 | `tavo.get('intel_cache', 'chat')` | 毫秒级 |

**多角色适配**：单角色只显示1个；2-5正常显示；5+只显示出场角色；10+最多6个折叠。

**AI Prompt 关键点**：
- 明确要求"变化 = 转变，不是动作描写"
- 去掉多余的动作描述（走/看/说...）
- 用 🟢🟡🔴 标注变化程度
- 不编造对话中没有的信息

#### 第五季果汁记忆插件 (fsj-official-release)

**Discord 帖子**: `1525736432461938719` (频道 `1371748407487762536`)
**作者**: 第五季果汁 (第五季)
**版本**: v3.1.0
**适用版本**: Tavo v0.91.0+

**manifest.json**:
```json
{
  "id": "fsj-official-release",
  "permissions": ["input", "message", "generate", "variable", "file", "network"],
  "contributes": {
    "sidebar": [
      { "id": "dashboard", "label": "信息面板", "icon": "📊" },
      { "id": "memory", "label": "总结", "icon": "📝" },
      { "id": "recall", "label": "向量召回", "icon": "🔍" },
      { "id": "api", "label": "API 设置", "icon": "🔌" },
      { "id": "settings", "label": "参数设置", "icon": "⚙️" },
      { "id": "tools", "label": "工具箱", "icon": "🧰" }
    ],
    "htmlFragments": [
      { "id": "bootstrap", "src": "fragments/bootstrap.html", "mount": "/chat/body/end" },
      { "id": "assistant-message-bridge", "src": "fragments/message-tail.html", "mount": "/messages/end?role=character&position=last" }
    ]
  }
}
```

**架构特点**:
- **actions.js → `__FIFTH_SEASON_SHELL__` → bootstrap.html**: 6个sidebar动作通过全局命名空间与HTML片段通信
- **message-tail桥接**: 每次角色回复后自动触发记忆入库 (`core.processAssistantMemo`)
- **6侧边栏面板**: 信息面板(概览)、总结(手动/自动摘要)、向量召回(关键词+语义)、API设置(外部向量API)、参数设置(间隔/模板)、工具箱(维护工具)
- **权限集**: 声明全部6大权限，其中 `network` 用于外部向量API调用
- **自动总结**: 按楼层间隔整理近期对话生成短期总结，多段短期总结可合并为长期记忆
- **向量召回**: 支持语义向量匹配 + 关键词匹配；可选「查找补全」功能(额外消耗一次 `tavo.generate`)
- **无限重试循环**: actions.js 最多等待 40×200ms = 8s 等待 shell 就绪；message-tail 最多等待 50×120ms = 6s
- **bootstrap.html**: 787KB 一体化脚本包(内联所有业务模块)

**社区反馈**:
- API 配置界面存在"条目越删越多"的 bug
- 向量召回大量消息(1000+楼)可能卡死
- 需配合「发送前注入」正则使用

### 英文社区插件 (🧩丨plugin-sharing, 1524661819765952513)

Tavo 英文社区也有活跃的插件生态，以 `clowuds` 和 `strawberrykitty` 为代表作者。

#### clowuds CCC 系列插件

| 插件 | 说明 | 热度 |
|------|------|------|
| **CCC - Plug-in Bundle** | 所有 CCC 子插件合集，减少侧边栏杂音 | 4🔼 38msg |
| **ST Port - Summaryception** | 从 SillyTavern 移植的对话摘要插件，自动生成摘要+变量保存 | 13🔥 74msg |
| **CCC - Message Enhancer & Guided Reroll** | 消息增强：帮用户写 + 按指令重写角色回复，支持自定义 OOC prompt | 4🙌 5msg |
| **CCT - Relationship Tracker** | 角色间情感状态追踪，AI实时更新，支持别名/禁忌标记 | 5❤️ 11msg |

**架构特点**：
- 使用 `permissions: ["input", "message", "generate", "variable"]`
- Summaryception 需要关闭 Tavo 内置长记忆（自动摘要设为0）
- CCT 使用侧边栏触发 AI 分析感情状态
- Message Enhancer 支持 `input:beforeSend` 钩子拦截输入

**缺点**: 无 `.tpg` 附件解析，仅基于 OP 描述分析。

#### strawberrykitty 插件

| 插件 | 说明 | 热度 |
|------|------|------|
| **Unspoken Thoughts** | 内心独白可视化，5种颜色主题(粉彩/柔和/透明/纯色/哑光)，侧边栏触发 + 自动扫描双模式 | 4💖 9msg |
| **Scenekeeper** | 天气/场景装饰浮动部件，自动检测天气/时间/环境，匹配动画效果(雪/雨/星等)，有 Full/Light 版本 | 2💖 4msg |

**Unspoken Thoughts 架构**：
- 双模式：侧边栏点击手动触发 / 每次 AI 回复自动扫描
- 颜色选择通过自定义正则标记实现（角色独立记忆颜色偏好）
- 提示词在插件设置中可自定义
- 依赖 `tavo.get/set('global')` 持久化颜色偏好

#### Jeppster - Deep Story Reforged Lite

**功能**: 故事连续性追踪，跟踪当前场景、世界状态、剧情线索、角色关系
**热度**: 5❤️ 73msg
**架构**:
- 使用 `tavo.get/set` 存储 `dsr_context`, `dsr_scene`, `dsr_world`, `dsr_relationships` 变量
- 侧边栏触发分析 + 自动注入模型上下文
- 通过 lorebook entry 使用 `{{getvar::dsr_context}}` 等宏注入到 prompt
- 需要新增 lorebook entry（constant, system 类型）
- 权限: `generate` + `message` + `variable`（无外部网络请求）
- 自带诊断工具可查看错误日志
- 自动场景追踪可选（默认关闭）

