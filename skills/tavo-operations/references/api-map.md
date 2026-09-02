#### Tavo API 关键映射

**变量操作（同步，不需要 await）：**
| 功能 | API | 注意 |
|------|-----|------|
| 读取变量 | `tavo.get(name, scope)` | scope: chat（默认）/ global / message |
| 设置变量 | `tavo.set(name, value, scope)` | 完全替换 |
| 部分更新变量 | `tavo.update(name, value, scope)` | 对象类型部分更新，保留未提及字段 |
| 删除变量 | `tavo.unset(name, scope)` | 删除后 get 返回 null |
| 变量路径访问 | `tavo.get('status.hp')` | 点号路径访问嵌套字段，set/update 也支持 |
| 消息级变量 | `tavo.set('hp', 100, 'message')` | 绑定到当前消息，消息删除后变量自动删除 |
| 读取插件设置 | `tavo.plugin.config.get(key)` | 同步，回退 schema default，无则 null |
| 插件全部设置 | `tavo.plugin.config.all()` | 返回所有有效设置的浅拷贝 |
| 注册插件事件 | `tavo.plugin.on(event, handler)` | 事件: chat:/message:/generation:/input: |
| 注册侧边栏动作 | `tavo.plugin.onSidebarAction(id, cb)` | 在 entry.js 中注册 |
| 注册输入框动作 | `tavo.plugin.onInputAction(id, cb)` | 在 entry.js 中注册 |

**异步操作（必须 await）：**
| 功能 | API | 注意 |
|------|-----|------|
| AI 生成 | `await tavo.generate(prompt, opts)` | context=true 带聊天上下文 |
| 图片生成 | `await tavo.image.generate(desc, opts)` | 返回图片 URL 或 b64 |
| 文件保存 | `await tavo.file.save(name, data, opts)` | 保存到本地，返回相对路径 |
| 设置输入框 | `await tavo.input.set(text)` | 替换整个内容 |
| 追加到输入框 | `await tavo.input.append(text)` | 追加文本，不替换已有内容 |
| 获取输入框 | `await tavo.input.get()` | 返回 string |
| 发送输入框 | `await tavo.input.send()` | 触发生成 |
| 追加消息 | `await tavo.message.append({role, content})` | 不触发 AI 回复，返回新消息 ID |
| 查找消息 | `await tavo.message.find(range, filter)` | range=数字/数组，filter 支持 role/hidden |
| 获取单条消息 | `await tavo.message.get(id)` | 通过消息 ID 获取消息对象 |
| 获取当前消息 | `await tavo.message.current()` | 获取正在执行代码的消息对象 |
| 获取消息总数 | `await tavo.message.count()` | 含隐藏消息 |
| 更新消息 | `await tavo.message.update(msg, opts)` | opts.reuseContext=true 保持脚本环境 |
| 删除消息 | `await tavo.message.delete(id)` | 通过消息 ID 删除 |
| 当前聊天 | `await tavo.chat.current()` | 返回聊天对象（characters/lorebooks/persona/preset）。**注意**：`lorebooks` 是 ref 对象数组（`[{id, name, entries:count}]`），`entries` 是**数字计数**不是数组。需用 `lorebook.get(ref.id)` 获取完整条目。 |
| 更新当前聊天 | `await tavo.chat.update(chat)` | 可修改名称/角色列表/人物/背景 |
| 角色列表 | `await tavo.character.all()` | 返回角色摘要数组（id/name/avatar） |
| 角色详情 | `await tavo.character.get(id)` | 返回角色完整信息 |
| 角色搜索 | `await tavo.character.find(name, opts)` | opts.match: exact/prefix/suffix/contains |
| 创建角色 | `await tavo.character.create(character)` | 需 name 和 firstMes |
| 更新角色 | `await tavo.character.update(character)` | 需 id/name/firstMes |
| 导入角色卡 | `await tavo.character.import(card)` | 支持 CCv3 格式，自动创建世界书/正则 |
| 删除角色 | `await tavo.character.delete(id)` | 通过 ID 删除 |
| 人物列表 | `await tavo.persona.all()` | 返回人物摘要数组 |
| 人物详情 | `await tavo.persona.get(id)` | 返回人物完整信息 |
| 人物搜索 | `await tavo.persona.find(name, opts)` | 同上，支持 match 模式 |
| 创建人物 | `await tavo.persona.create(persona)` | 需 name 和 description |
| 更新人物 | `await tavo.persona.update(persona)` | 需 id/name/description |
| 删除人物 | `await tavo.persona.delete(id)` | 通过 ID 删除 |
| 预设列表 | `await tavo.preset.all()` | 返回预设摘要数组 |
| 预设详情 | `await tavo.preset.get(id)` | 返回预设完整信息（含 entries） |
| 预设搜索 | `await tavo.preset.find(name, opts)` | 返回完整预设对象 |
| 创建预设 | `await tavo.preset.create(preset)` | 需 name，其他自动填充默认值 |
| 更新预设 | `await tavo.preset.update(preset)` | entries 会完全覆盖已有条目 |
| 导入预设 | `await tavo.preset.import(preset)` | 支持 SillyTavern 格式 |
| 删除预设 | `await tavo.preset.delete(id)` | 通过 ID 删除 |
| 世界书列表 | `await tavo.lorebook.all()` | 返回世界书摘要数组 |
| 世界书详情 | `await tavo.lorebook.get(id)` | 返回世界书对象（含 entries） |
| 世界书搜索 | `await tavo.lorebook.find(name, opts)` | 同上 |
| 世界书创建 | `await tavo.lorebook.create(lorebook)` | 需 name，entries 可选 |
| 世界书更新 | `await tavo.lorebook.update(lorebook)` | 需 id/name |
| 世界书导入 | `await tavo.lorebook.import(lorebook)` | 支持 CCv3 character_book 格式 |
| 世界书删除 | `await tavo.lorebook.delete(id)` | 通过 ID 删除 |
| 正则列表 | `await tavo.regex.all()` | 返回正则组摘要数组 |
| 正则详情 | `await tavo.regex.get(id)` | 返回正则组完整信息 |
| 正则搜索 | `await tavo.regex.find(name, opts)` | 同上 |
| 创建正则 | `await tavo.regex.create(regex)` | 需 name |
| 更新正则 | `await tavo.regex.update(regex)` | 需 id |
| 导入正则 | `await tavo.regex.import(regex)` | 支持 SillyTavern 格式 |
| 删除正则 | `await tavo.regex.delete(id)` | 通过 ID 删除 |
| Toast 通知 | `tavo.utils.toast(msg)` | 原生 toast，无需手动实现 |

