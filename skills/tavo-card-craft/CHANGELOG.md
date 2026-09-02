# 变更日志

本文件记录 tavo-card-craft skill 的版本变更。新版本发布时在顶部追加条目。

## [3.0.0] - 2026-07-06

### 重大升级：按 Tavo 官方手册（2026-07 版）全面核对修正 JS API

本次升级基于用户提供的最新 Tavo 官方手册和 TavoJS 指南卡，对 JS API 文档进行了**逐条核对与全面修正**。这是 v2.x 系列以来最大规模的一次 API 文档校正，修复了大量签名错误和过时用法。

#### 🔴 关键修正（CRITICAL — 旧代码会直接报错）

1. **`tavo.update` 签名错误修正**
   - 旧（错误）：`tavo.update(name, updater: (old)=>new, scope?)` — 回调形式
   - 新（正确）：`tavo.update(name, value, scope?)` — 部分更新 object 值
   - 影响：`state-persistence.md`、`advanced-patterns.md` 中的示例已修正

2. **`tavo.message.find` 签名错误修正**
   - 旧（错误）：`tavo.message.find(filter: object)` — filter 对象
   - 新（正确）：`tavo.message.find(indexRange?, filter?)` — 索引范围 + filter
   - 用法：`tavo.message.find(-1, { role: 'user' })` / `tavo.message.find([0, 4])` / `tavo.message.find(0)`

3. **`tavo.character.find` / `persona.find` / `preset.find` / `lorebook.find` / `regex.find` 签名修正**
   - 旧（错误）：`tavo.xxx.find(filter: object)` — filter 对象
   - 新（正确）：`tavo.xxx.find(name: string, options?)` — 名称字符串 + options

4. **`tavo.chat.update` 字段名修正**
   - 旧（错误）：`tavo.chat.update({ title })` — title
   - 新（正确）：`tavo.chat.update({ name })` — name

5. **返回值类型修正（create/update/import 系列）**
   - 旧（错误）：返回完整对象（`Promise<Character>` / `Promise<Preset>` 等）
   - 新（正确）：返回 ID（`Promise<number>`），import 返回 `{characterId, lorebookId, regexId}`

6. **`tavo.message.append/update/delete` 返回值修正**
   - append：返回新消息 ID（number|null），非 Message 对象
   - update：返回消息 ID（number|null），新增 `opts.reuseContext` 第二参数
   - delete：返回被删消息 ID（number|null），非 void

7. **`tavo.get` 第二参数语义修正**
   - 旧（错误）：`tavo.get('hp', 100)` — 第二参数是默认值
   - 新（正确）：`tavo.get('hp', 'chat')` — 第二参数是 scope（作用域）
   - 默认值用 `??`：`tavo.get('hp') ?? 100`
   - 影响：`advanced-patterns.md` 中 12 处误用已全部修正

8. **正则条目字段名修正（CCv3 新格式）**
   - 旧：`scriptName` / `placement` / `markdownOnly` / `promptOnly` / `runOnEdit` / `substituteRegex`
   - 新：`name` / `placements` / `timing` / `substitution` / `minDepth` / `maxDepth` / `enabled`

#### 🟡 新增内容

1. **新增 `js-api-examples.md`**：5 个官方插件范例
   - 角色卡生成器（`tavo.generate` + `tavo.utils.export` + `tavo.character.import`）
   - 一键隐藏消息（`tavo.message.count/find/update`）
   - 引导式重摇（`tavo.message.current/find/update` + `tavo.generate`）
   - 插图生成器（`tavo.utils.select` + `tavo.image.generate` + `tavo.utils.preview`）
   - 剧情背景切换（`tavo.chat.update({background})` + `tavo.message.append`）

2. **`js-api-guide.md` 新增章节**：
   - 变量 message scope 的 `{scope:'message', id:n}` 形式（v0.88.0+）
   - 变量宏 `{{getvar::name}}` / `{{getglobalvar::name}}`
   - Character 对象完整字段表（18 个字段）
   - Persona 对象字段表（6 个字段）
   - Preset 对象字段表（含 basicPrompts 和 entries 子结构）
   - Lorebook 条目完整字段表（16 个字段）
   - Regex 条目完整字段表（10 个字段，新格式）
   - 内置预设标识符表（main/narrator/characterDescription/jailbreak/chatHistory 等）
   - Chat background 功能（image/useAvatar/color/opacity）
   - CCv3 兼容性说明（create/update 接受 `first_mes` 等下划线字段）
   - `tavo.message.update` 的 `reuseContext` 选项
   - `tavo.message.append` 的 `characterId` 字段
   - `tavo.message.update` 的 `reasoning` 字段
   - 常见错误 API 对照表（20+ 条错误→正确映射）

3. **`js-api-guide.md` 结构优化**：
   - 按 API 命名空间分 20 个章节，目录清晰
   - 每个方法标注是否异步、返回值类型
   - 关键方法附最小可运行示例

#### 🟢 修正的文档错误

1. `advanced-patterns.md`：
   - 12 处 `tavo.get(name, default)` → `tavo.get(name) ?? default`
   - `tavo.loadFile` → `tavo.file.load`
   - `tavo.image.generate({prompt, size})` → `tavo.image.generate(prompt, {size})`
   - `result.url` → 直接返回 dataUrl 字符串
   - `tavo.set(name, null)` → `tavo.unset(name)`（清空变量）
   - `tavo.event.on(varName, cb)` → 移除（变量变化监听不存在，改用每次渲染比较）
   - `setVar` 引用 → `tavo.set`
   - `onVarChange` 引用 → 移除并注明不存在

2. `state-persistence.md`：
   - `tavo.update(name, callback)` → `tavo.update(name, partialValue)`

#### 📋 路由更新

- SKILL.md 路由表新增"插件/生成器/重摇/配图/背景切换"→ `js-api-examples.md`
- 文件索引新增 `js-api-examples.md` 条目
- 版本号 2.6.0 → 3.0.0

---

## [2.6.0] - 2026-07-02

### 清理（精简冗余内容，保留多样化美化范式）

本次清理基于对 2.4-2.5.7 系列更新的审视。原则：**美化方案应多样化保留**（黑白极简、彩色奇幻RPG各有适用场景），只删真正冗余的临时补丁和文档不一致。

**删除的冗余内容：**
- 删除 2.5.0 的"自闭合标签修复正则"记录——这是"标签选择器+自闭合"的临时方案，改成"每标签一条正则转 div"后已无此问题
- 删除 2.5.4/2.5.5 的"方案 E：三角色卡"CHANGELOG 记录——beautify-templates.md 中方案 E 内容已丢失，记录成了空壳（方案 E 的三角色卡思路已体现在「误解传奇」实战卡中，需要时可从该卡提取）
- 删除 2.5.2 的"RPG 面板范式细化（VITAL/ANOMALY/EQUIPMENT/LOCATION 四区）"作为通用范式的定位——这是误解流特有的数值分区，但保留作为"分区思路"的参考
- 合并 2.5.6/2.5.7 的小修复到 2.5.3 条目，不再单独记版本

**保留的美化范式（多样化）：**
- ✅ 保留 2.5.0 的"异世界RPG视觉范式（深色奇幻卷轴+古金/魔法青/神秘紫）"——彩色奇幻RPG风格，适合传统西幻RPG卡，与黑白极简并行作为两种选择
- ✅ 保留方案 D（异世界RPG面板+多选）——可配黑白或彩色配色
- ✅ 保留方案 A/B/C——不同复杂度的美化选择

**修正的文档不一致：**
- 修正 basic-mode-pitfalls.md 标题"7 条坑"→"9 条坑"，目录补全坑 8/9
- 修正 beautify-templates.md 方案 D 的 JS 代码：`data-text` 属性 → `.mis-choice-label` 子元素（与坑 9 一致）
- 精简方案 D 的"关键设计要点"从 7 条到 3 条（只保留通用部分：进度条纯CSS、多选交互、移动端适配），删除误解流特有的数值分区内容

**保留的核心更新（2.4-2.5.7 合并）：**
- js-api-guide.md 对齐官方手册（2.4.0）
- state-persistence.md 修正 await 误用（2.5.0）
- 坑 8：`name` vs `scriptName` + 每标签一条正则转 div（2.5.1）
- 坑 3 实战教训：事件委托失效→onclick 内联（2.5.3）
- 坑 9：选项文本含双引号破坏 data-* 属性（2.5.6）
- 方案 D：异世界RPG面板+多选+自定义+一起发出（2.5.2，精简后）
- 彩色奇幻RPG视觉范式（2.5.0，保留作为配色选择）

## [2.5.3] - 2026-07-02

### 修复（合并 2.5.3/2.5.6/2.5.7）

- **"一起发出"按钮点击无反应**：用 `document.addEventListener('click', ...)` 事件委托在 Tavo iframe 里失效。改为全局函数 + `onclick` 内联调用（`window.misSubmit` + `onclick="misSubmit()"`）
- **选项文本含双引号破坏 data-* 属性**：选项文本如 `摆摆手表示"不必多礼"` 的双引号会提前关闭 `data-text="..."` 属性。修复：移除 data-text，改用 `<span class="mis-choice-label">` 子元素，JS 用 textContent 读取
- **手机端布局**：窄屏保持列数不变只缩小尺寸（属性3列、装备3列），标题行 flex-wrap 允许换行

### 新增

- basic-mode-pitfalls.md 坑 8：`name` vs `scriptName` + 每标签一条正则转 div（"导入后只有文字"的根因）
- basic-mode-pitfalls.md 坑 9：选项文本含双引号破坏 HTML 属性
- beautify-templates.md 方案 D：异世界RPG面板+多选+自定义+一起发出（20 条正则）

## [2.5.0] - 2026-07-01

### 修复

- **state-persistence.md 全面修正**：变量 API（`tavo.get/set/update/unset`）由"异步需 await"改为**同步**，删除所有误导性 `await`；文件 API（`tavo.file.*`）保持异步

## [2.4.0] - 2026-07-01

### 修复（JS API 速查全面对齐官方手册）

依据《Tavo 手册》逐条核对 `references/js-api-guide.md`：

- 变量 `tavo.get/set/update/unset` 由"异步 Promise"改为**同步**，补全 `message` 作用域与路径形式
- `tavo.user.get()` → `tavo.persona.*`；`tavo.character.current()` → 不存在
- `tavo.generate` 第二参由 `{temperature}` 改为 `{context, preset, settings}`
- `tavo.image.generate` 第二参改为 `{size, aspectRatio, ...}`
- 补全 `tavo.chat` / `tavo.persona` / `tavo.lorebook` / `tavo.memory` / `tavo.app` / `tavo.v1` 等命名空间
- 常见错误 API 对照表扩充至 ~35 条

## [2.3.0] - 2026-06-28

### 重构

- SKILL.md 重构为精简路由器，细节下沉到 references
- 新增任务路由决策表、问答引擎双通道（basic/pro）
- CSS 单一信源：visual-style-guide.md 为唯一权威
- 脚本融入主工作流：生成→validate→输出三步强制流程

## [2.2.2] - 之前版本

- 18 个 reference 文件 + 3 个脚本
- 知识来源：6 张实战卡

---

## 改进反馈

发现新坑或想补充内容时，在本文件末尾追加条目，格式：

```
### 待办（下一版本）
- [ ] 描述待补充内容
- [ ] 触发场景：xxx
- [ ] 建议落地文件：xxx.md
```
