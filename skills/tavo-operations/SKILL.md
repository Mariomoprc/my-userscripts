---
name: tavo-operations
description: Use when managing Tavo AI app — character cards, presets, lorebooks, regex, plugins, Discord integration, MCP operations, or when the user mentions Tavo, Tavo Muse, character card tags, NSFW filtering, DeepSeek presets, Tavo MCP tools, 备忘录, 角色列表, action bar, 剧情百科, 剧情重温, 小说转角色卡.
references: macros, community, api-map, plugin-dev, auto-testing, common-errors
---

# Tavo AI 操作指南

## 概述
Tavo 是一款手机端 AI 角色聊天应用，支持角色卡、预设、世界书、插件等。通过 MCP Server 实现远程 API 操作。

**当前状态**: 内测中，更新频繁（平均每周一个版本）。插件开发前务必检查当前版本对应的 API 和功能。

**官方文档**: https://docs.tavoai.dev — TavoJS API、插件开发、宏参考等所有信息以官方文档为准。本文档基于官方文档 + Discord 社区 + 实战经验整理。

## Tavo 版本更新记录（插件开发相关）

从 Discord #📢丨announcements 频道整理，截至 2026-07-22。

Tavo 每周更新约一个版本。插件开发只需关注从 0.91.0（插件系统首发）开始的版本。

### 版本速查表

| 版本 | 日期 | 对插件开发的关键影响 |
|------|------|-------------------|
| <0.75 | - | 基础 JS API |
| 0.75.2 | 5月 | JS CRUD API（角色/身份/世界书） |
| 0.77 | 6月 | 聊天消息增删改查 API |
| 0.82 | 6月 | 正则助手 |
| 0.83 | 6月 | 生图 API |
| 0.86 | 6月 | 文件读写接口 |
| 0.87 | 6/9 | EJS 宏增强 |
| 0.88 | 6/16 | TavoJS 命名、消息级变量 |
| 0.89 | 6/23 | CCv3 导入 |
| 0.90 | 7/1 | 标签过滤、Gallery 模式 |
| **0.91.0** | **7/7** | **插件系统首发** |
| **0.92.0** | **7/15** | **事件钩子、persona/regex/preset API** |
| **0.93.0** | **7/25** | **插件 specVersion 2、i18n、SemVer 强制** |

**插件最低要求**: `minAppVersion: "0.91.0"`（specVersion 1）/ `"0.93.0"`（specVersion 2）
**当前最新**: 0.93.0
**发布渠道**: iOS TF / Android 测试版（iOS 应用商店同步延迟）

> 完整宏参考见 [references/macros.md](references/macros.md) — 包括基础宏、角色宏、变量宏、EJS 支持。

## MCP 连接

### 基本信息
| 项目 | 值 |
|------|-----|
| MCP 地址 | 设备 IP:7347/mcp（见 AGENTS.md 中 `TAVO_MCP_URL`） |
| Bearer Token | 见 AGENTS.md 中 `TAVO_MCP_TOKEN` |
| 协议 | HTTP JSON-RPC |
| 限制 | OpenCode 的 `remote` 类型 MCP 不兼容，需用 curl/PowerShell 直接调用 |

### 调用模板
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"TOOL_NAME","arguments":{...}}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$result = Invoke-RestMethod -Uri "$env:TAVO_MCP_URL" -Method Post -Headers @{"Authorization"="Bearer $env:TAVO_MCP_TOKEN";"Content-Type"="application/json; charset=utf-8"} -Body $bytes
```

**重要：中文内容必须用 `[System.Text.Encoding]::UTF8.GetBytes()` 强制 UTF-8 编码，否则会变成问号。**

### 注意事项
- 锁屏后 MCP 断开，需解锁恢复
- 平板 USB 数据线连电脑，`adb devices` 直连可识别
- 设备 IP 变化时需更新地址（见上方历史记录）
- 不支持 SSE 传输，OpenCode 原生 remote MCP 不用

### ADB 操作规范（⚠️ 红线）

**绝对禁止：**
```bash
# ❌ 这会清除 Tavo 全部数据（角色卡、聊天记录、设置、MCP、插件）
adb shell pm clear app.bitbear.tav
```

**`pm clear` 的实际效果** = 设置 → 应用 → Tavo → **清除全部数据**，不是只清缓存。

**正确的缓存清理方式：**
```bash
# 只清 WebView 缓存（不丢数据）
adb shell su 0 rm -rf /data/data/app.bitbear.tav/cache/

# 只清 WebView 缓存（无需 root）
adb shell run-as app.bitbear.tav rm -rf cache/
```

**其他安全操作：**
```bash
# 推送文件到手机（安全）
adb push local.file /sdcard/Download/

# 从手机拉文件（安全）
adb pull /sdcard/Download/file.txt ./

# 启动 Tavo（安全）
adb shell monkey -p app.bitbear.tav 1

# 强制停止（安全）
adb shell am force-stop app.bitbear.tav

# 截图（安全）
adb exec-out screencap -p > screen.png
```

**原则：`pm` 命令中只有 `install`/`force-stop`/`uninstall` 是安全的。`clear` 和 `delete-user-data` 会导致数据丢失。

> 社区精华内容（FAQ、教程、世界书设计模式、预设趋势等）见 [references/community.md](references/community.md)

## 可用工具速查

### 角色卡
| 工具 | 用途 |
|------|------|
| `tavo_character_search` | 搜索角色卡（query, limit） |
| `tavo_character_get` | 获取角色卡详情（id） |
| `tavo_character_create` | 创建角色卡 |
| `tavo_character_update` | 更新角色卡（id, character, dryRun） |
| `tavo_character_import_card` | 从 JSON 导入角色卡 |
| `tavo_character_delete` | 删除角色卡 |

### 预设
| 工具 | 用途 |
|------|------|
| `tavo_preset_search` | 搜索预设 |
| `tavo_preset_get` | 获取预设详情 |
| `tavo_preset_create` | 创建预设 |
| `tavo_preset_update` | 更新预设 |
| `tavo_preset_import` | 导入预设 |
| `tavo_preset_entry_upsert` | 添加/更新预设条目 |
| `tavo_preset_entry_delete` | 删除预设条目 |
| `tavo_preset_set_active` | 设为默认预设 |

### 世界书
| 工具 | 用途 |
|------|------|
| `tavo_lorebook_search` | 搜索世界书 |
| `tavo_lorebook_get` | 获取世界书详情（参数: `id`） |
| `tavo_lorebook_create` | 创建世界书 |
| `tavo_lorebook_update` | 更新世界书（参数: `id` + `lorebook` 对象） |
| `tavo_lorebook_delete` | 删除世界书（参数: `id`） |
| `tavo_lorebook_import` | 导入世界书 |
| `tavo_lorebook_entry_upsert` | 添加/更新世界书条目（参数: `lorebookId`） |

**注意:** `entry_upsert` 参数是 `lorebookId`，其他 lorebook 工具参数是 `id`。

### 正则
| 工具 | 用途 |
|------|------|
| `tavo_regex_search` | 搜索正则 |
| `tavo_regex_get` | 获取正则详情 |
| `tavo_regex_create` | 创建正则 |
| `tavo_regex_update` | 更新正则 |
| `tavo_regex_delete` | 删除正则 |
| `tavo_regex_import` | 导入正则 |
| `tavo_regex_entry_upsert` | 添加/更新正则条目 |
| `tavo_regex_test` | 测试正则匹配 |

### 插件
| 工具 | 用途 |
|------|------|
| `tavo_plugin_search` | 搜索插件 |
| `tavo_plugin_get` | 读取已安装插件详情 |
| `tavo_plugin_install` | 安装插件（zipBase64 或 zipPath） |
| `tavo_plugin_uninstall` | 卸载插件 |
| `tavo_plugin_set_enabled` | 启用/禁用插件 |
| `tavo_plugin_set_config` | 设置插件配置 |
| `tavo_plugin_package` | 打包 .tpg（files 数组传入 text/base64，includeZipBase64） |
| `tavo_plugin_validate_manifest` | 验证 manifest 格式 |
| `tavo_plugin_get_runtime_contributions` | 列出所有插件运行时贡献（sidebar/fragments/settings/features） |

### 聊天/消息
| 工具 | 用途 |
|------|------|
| `tavo_chat_search` | 搜索聊天 |
| `tavo_chat_get` | 获取聊天详情 |
| `tavo_chat_create` | 创建聊天 |
| `tavo_chat_update` | 更新聊天 |
| `tavo_chat_delete` | 删除聊天 |
| `tavo_chat_copy` | 复制聊天 |
| `tavo_chat_reset` | 重置聊天 |
| `tavo_current_chat_get` | 获取当前聊天 |
| `tavo_current_chat_set` | 设置当前聊天 |
| `tavo_message_find` | 查找消息 |
| `tavo_message_append` | 追加消息 |
| `tavo_message_insert` | 在指定位置插入消息 |
| `tavo_message_delete` | 删除消息 |
| `tavo_message_count` | 消息统计 |
| `tavo_input_set` / `tavo_input_send` | 操作输入框 |

### 服务器
| 工具 | 用途 |
|------|------|
| `tavo_status` | MCP 服务器状态（资产数量等） |


## 插件操作

### 插件开发 & 安装流程

纯 MCP 全流程（不依赖手机端操作）:
1. 本地准备 manifest.json, index.js, 资源文件等
2. `tavo_plugin_package(files: [{path, text}], includeZipBase64: true)` → 打包并获取 zipBase64
3. `tavo_plugin_install(zipBase64: "...")` → 安装
4. `tavo_plugin_set_enabled(id: "com.example.plugin", enabled: true)` → 启用

### 插件要求
- **高级渲染**: 部分插件需在 设置 → 聊天设置 中启用
- **权限**: manifest 中声明所需权限（variable, network, file 等）

### 已安装插件记录

#### 清露终端V1.0 (com.luna-miniphone)
- **功能**: 小手机状态管理系统（状态栏、背包、技能、效果、NPC角色卡）
- **来源**: Discord #🧩丨插件分享 频道，帖子 1526469952586907799
- **安装时间**: 2026-07-16
- **组件**:
  - 插件: `com.luna-miniphone` (v1.0.0)
  - 世界书: `清露终端V1.0` (ID: 42)，3个条目
  - 正则1: `清露终端V1.0 - update解析器` (ID: 33) - 解析AI输出的`<update>`标签
  - 正则2: `清露终端V1.0 - 不发送update` (ID: 34) - 从回复中移除update标签
- **工作原理**: AI输出`<update>`标签 → 正则解析 → 更新变量 → 插件显示状态
- **变量**: mp_statusbar, mp_inventory, mp_skills, mp_effects, mp_cards
- **注意**: 这是通用系统，需要配合角色卡使用；变量初始为空，由AI在聊天中自动填充

#### 剧情选择器 (com.cyoa.choices)
- **功能**: CYOA 互动小说式行动选项生成器
- **来源**: 原创（slime098934）
- **最新版本**: v1.10.0
- **组件**:
  - HTML 片段: `cyoa.html` (挂载 `/chat/body/end`)
- **工作原理**: 点击工具栏骰子按钮 → `tavo.generate(context: true)` 生成选项 → 7层 fallback 解析器提取 `<suggestion>` 标签 → 渲染为可点击按钮 → 点击填入输入框
- **GitHub**: `Mariomoprc/tavo-plugins` → Release `com.cyoa.choices-v1.10.0`
- **风格**: 6 种（主线剧情/日常琐事/感情发展/冲突紧张/探索发现/系统提示），下拉菜单切换
- **缓存**: 结果按消息数缓存，关闭面板再打开秒出；系统提示模式跳过缓存

> **完整开发指南**：插件开发实战（Manifest、HTML 片段、API 映射、发布流程）见 [references/plugin-dev.md](references/plugin-dev.md)
> **API 映射参考**：TavoJS 完整 API 表格见 [references/api-map.md](references/api-map.md)
> **自动测试流程**：ADB + USB 测试脚本见 [references/auto-testing.md](references/auto-testing.md)


## 角色卡操作

### 导入方式对比
| 方式 | 头像 | 数据 | 推荐度 |
|------|------|------|--------|
| Tavo 内 URL 导入（Chub/Pygmalion） | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Tavo 内 从文件导入（PNG） | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Tavo 内 从文件导入（JSON） | ❌ 无头像 | ✅ | ⭐⭐⭐ |
| MCP `tavo_character_import_card` | ❌ 无头像 | ✅ | ⭐⭐⭐ |
| ADB push PNG + Tavo 手动导入 | ✅ 头像+数据 | ✅ | ⭐⭐⭐⭐⭐ |

**最佳流程（从 Discord 下载）：**
1. 用 Discord API 翻到 OP 帖子的附件
2. `Invoke-WebRequest` 下载 PNG 文件
3. `adb push` 到手机 `/sdcard/Download/`
4. 用户在 Tavo 中：角色列表 → +新建 → 从文件导入 → 选刚推的 PNG

### 角色卡来源平台
| 平台 | Tavo URL导入 | 访问方式 |
|------|-------------|---------|
| Chub (chub.ai) | ✅ | 直接可访问 |
| Pygmalion.chat | ✅ | 直接可访问 |
| Character Tavern | ❌ 需PNG | 直接可访问 |
| JanitorAI | ✅ | 需浏览器访问 |

### 更新角色卡标签（UTF-8编码）
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tavo_character_update","arguments":{"id":42,"character":{"tags":["NSFW","纯肉卡","不适合公共场所"]},"dryRun":false}}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$result = Invoke-RestMethod -Uri "http://192.168.3.96:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json; charset=utf-8"} -Body $bytes
```

**注意：更新标签会完全替换原有标签。需先读取再追加。**

### 角色卡翻译（批量更新字段）
```powershell
$character = @{
    name = "中文名称"
    tags = @("标签1", "标签2")
    personality = "性格描述"
    description = "角色描述"
    scenario = "场景设定"
    first_mes = "首条消息"
    mes_example = "示例对话"
    creator_notes = "创作者说明"
}
$updateBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "tavo_character_update"
        arguments = @{ id = $id; character = $character; dryRun = $false }
    }
} | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($updateBody)
Invoke-RestMethod -Uri "http://192.168.3.96:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json; charset=utf-8"} -Body $bytes

## 预设操作

### 创建预设（两步）
```powershell
# Step 1: 创建预设框架
$presetObj = @{
    name = "预设名称"
    description = "描述"
    impersonation_prompt = "代入提示"
    # ... 其他字段
}
# 通过 tavo_preset_create 创建 → 获取 presetId

# Step 2: 添加 prompt 条目（循环）
# 通过 tavo_preset_entry_upsert 添加每个条目
# system_prompt=true → Main Prompt 区域
# system_prompt=false → Jailbreak/自定义区域
```

### 预设条目属性
| 属性 | 说明 |
|------|------|
| `identifier` | 唯一标识（UUID） |
| `name` | 条目名称 |
| `system_prompt` | true=系统提示区, false=用户提示区 |
| `marker` | true=特殊标记位（如 Lorebook、Persona） |
| `content` | 提示内容 |


## 世界书操作

### 导入世界书（关键：参数是对象，不是JSON字符串！）
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# 错误 ❌：把 lorebook 作为 JSON 字符串传入
# $json = '{"name":"xxx","entries":[...]}'  # 这样会报类型错误！

# 正确 ✅：传入 PowerShell 对象
$lorebookObj = @{
    name = "世界书名称"
    entries = @(
        @{
            uid = 0
            name = "条目名"
            content = "内容"
            constant = $true
            position = 0
        }
    )
}
$bodyObj = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "tavo_lorebook_import"
        arguments = @{
            lorebook = $lorebookObj  # 直接传对象
        }
    }
}
$body = $bodyObj | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$result = Invoke-RestMethod -Uri "http://192.168.3.96:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json; charset=utf-8"} -Body $bytes -TimeoutSec 120
```

**⚠️ 常见错误：** `lorebook_import` 的 `lorebook` 参数要求是对象类型，不是字符串。`ConvertTo-Json` 会将对象序列化为字符串，导致 `type 'Null' is not a subtype of type 'String'` 错误。

**从 SillyTavern JSON 导入：**
```powershell
$json = Get-Content -Path "st-lorebook.json" -Raw -Encoding UTF8
$rawLorebook = $json | ConvertFrom-Json
# 转换为 Tavo 格式
$entries = @()
foreach ($prop in $rawLorebook.entries.PSObject.Properties) {
    $e = $prop.Value
    $entries += @{
        uid = [int]$e.uid
        name = [string]$e.name
        content = [string]$e.content
        constant = [bool]$e.constant
        position = [int]$e.position
    }
}
$lorebookObj = @{ name = "导入的世界书"; entries = $entries }
# 然后用上面的方式导入
```

## 正则操作

### 导入正则（同理：参数是对象，不是JSON字符串）
```powershell
$regexObj = @{
    name = "正则名称"
    entries = @(
        @{
            findRegex = "<update>\\s*([\\s\\S]*?)\\s*<\\/update>"
            replaceString = "<script>...</script>"
            placement = @(2)
            disabled = $false
            markdownOnly = $true
            promptOnly = $false
        }
    )
}
$bodyObj = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "tavo_regex_import"
        arguments = @{
            regex = $regexObj  # 直接传对象
        }
    }
}
$body = $bodyObj | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$result = Invoke-RestMethod -Uri "http://192.168.3.96:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json; charset=utf-8"} -Body $bytes -TimeoutSec 120
```

**从 SillyTavern JSON 导入正则：**
```powershell
$regex = Get-Content -Path "st-regex.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$regexObj = @{
    name = $regex.scriptName
    entries = @(
        @{
            findRegex = $regex.findRegex
            replaceString = $regex.replaceString
            placement = $regex.placement
            disabled = $regex.disabled
            markdownOnly = $regex.markdownOnly
            promptOnly = $regex.promptOnly
        }
    )
}
# 然后用上面的方式导入
```

### 更新正则名称/属性

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "tavo_regex_update"
        arguments = @{
            id = 33  # 正则ID
            regex = @{
                name = "新名称"  # 只传需要修改的字段
            }
        }
    }
} | ConvertTo-Json -Depth 10
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "http://192.168.3.96:7347/mcp" -Method Post -Headers @{"Authorization"="Bearer 62sv3j";"Content-Type"="application/json; charset=utf-8"} -Body $bytes
```

**注意：** `regex` 参数是对象，不是字符串。只需传需要修改的字段。

## NSFW 标签分类

### 不适合公共场所的标签
- NSFW、纯肉卡、鸡鸭模拟器
- 乱伦、背德、骨科、NTR、绿帽癖
- 不适合公共场所（自定义标签）

### 安全标签示例
- 女性向、恋爱模拟、酒吧经营
- 奇幻、冒险、自定义开局
- 养老院、护工、现实向

## Discord 操作

### 基本信息
| 项目 | 值 |
|------|-----|
| Tavo 社区 ID | `1356606095207960616` |
| 小号用户名 | `slime00260` |

### 频道列表

| 频道 | ID | 类型 | 用途 |
|------|-----|------|------|
| 📢丨announcements | 1356609677265473768 | 公告 | 官方更新日志（插件开发重点关注） |
| 🧩丨插件分享 | 1371748407487762536 | 论坛 | 中文插件分享与讨论 |
| 🧩丨plugin-sharing | 1524661819765952513 | 论坛 | 英文插件分享 |
| 📖丨世界书-预设-正则分享 | 1386957951704633465 | 论坛 | 预设/世界书/正则脚本分享（50+帖子） |
| 👏丨使用教程和技巧分享 | 1389629803266707458 | 论坛 | 社区教程和技巧（50+帖子） |
| 🎭丨角色卡分享 | 1384795939184574546 | 论坛 | 角色卡下载 |
| 📚丨support-faqs | 1409786410600370187 | 论坛 | API 配置指南、宏参考、模型错误解决 |
| 👏丨guides-tips | 1402179287385378907 | 论坛 | 英文教程与指南 |
| 📖丨lorebook-presets-regex | 1402180069434200134 | 论坛 | 英文预设/世界书/正则分享 |
| 🪛丨tavo内测中文交流区 | 1357910301839982655 | 文字 | 内测讨论、Bug 反馈 |
| 🐛丨bug-反馈 | 1356841011745263656 | 论坛 | Bug 报告 |
| 💡丨提交-想法建议 | 1356841114732204072 | 论坛 | 功能建议 |
| 📋丨投票-功能需求 | 1356929121149653054 | 论坛 | 功能需求投票 |
| 🔑丨密钥之间 | 1457338290536579072 | 文字 | API 密钥交流（优惠/拼车） |
| 🎭丨character-sharing | 1402173435601358859 | 论坛 | 英文角色卡分享 |
| 🌍丨english-chat | 1394564848955818087 | 文字 | 英文闲聊 |
| 🌱丨新人交流互助区 | 1356616167254524086 | 文字 | 新手帮助 |
| ❓丨question-collection | 1469291639683158171 | 文字 | 问题收集 |

### User Token 获取（浏览器自动提取）

Discord 将 User Token 存储在 `localStorage.token` 中，但 Playwright sandbox 无法直接访问。需要通过 `addInitScript` 在页面加载前注入捕获脚本。

**方法**：
```
1. 确保当前在已登录 Discord 的 tab（playwright-edge_browser_tabs -> select）
2. 调用 addInitScript 捕获 token：
   page.addInitScript(() => { window.__TOKEN = localStorage.getItem('token'); })
3. 刷新页面：page.reload()
4. 等待加载完成后用 page.evaluate 读取 captured token
```

**关键要点**：
- `addInitScript` 必须在 `reload` 之前调用，注入到页面原始 JS 执行环境
- `evaluate` 读取的是已注入的全局变量 `window.__TOKEN`
- Token 会过期，每次任务开始时重新提取
- 提取后存到变量 `$DISCORD_TOKEN` 供后续 API 调用使用

### 社区功能建议汇总（#💡丨提交-想法建议）

| 建议 | 热度 | 描述 |
|------|------|------|
| 世界书分组 | 2msgs | 世界书增加分组功能 |
| JS 控制台日志复制 | 5msgs | JS 控制台日志支持整体复制 |
| 消息收藏 | 1msg | 收藏单条对话功能 |
| 聊天批量删除 | 2msgs | 聊天列表支持多选删除 |
| AI 回复通知 | 3msgs | AI 回完消息后提醒用户 |
| 回收站功能 | 1msg | 误删聊天的回收站 |
| 纵向搜索 | 7msgs | 聊天内搜索功能 |
| 流式生成不抖动 | 2msgs | 流式输出时聊天气泡不抖动 |

### 当前版本 Bug 反馈（#🪛丨tavo内测中文交流区）

| Bug | 影响版本 | 说明 |
|-----|---------|------|
| 正则失效 | 最新 | 更新后字体正则无法正常运行 |
| DeepSeek v4 flash 丢格式 | 0.92+ | 状态栏/剧情图等标签格式不输出 |
| MCP 插件安装 htmlFragments 为空 | 全版本 | manifest 误用顶层 `htmlFragments`（需用 `contributes.htmlFragments`） |
| 插件侧边栏不显示 | 0.91-0.92 | 需启用高级渲染 |

### 搜索角色卡
1. 浏览器进入 Tavo Discord → 🎭丨角色卡分享
2. 使用 `Ctrl+Shift+F` 搜索角色名
3. 查看帖子标题和描述中的 NSFW 标签

### 下载 Discord 附件
1. 从帖子中找到 CDN 链接
2. 用 Playwright 浏览器导航到链接触发下载
3. 文件保存在 `.playwright-mcp/` 目录

> 常见错误排查（中文编码、MCP 连接、工具栏问题等）见 [references/common-errors.md](references/common-errors.md)
