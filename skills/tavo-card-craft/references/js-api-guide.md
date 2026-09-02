# Tavo JS API 速查（按用途分类）

> 本文件定义 Tavo JS API 的两条路径选择和完整 API 速查。进阶模式必读。

> ✅ **本速查已根据 Tavo 官方手册（2026-07 版，v0.75.0+）逐条核对**，所有 API 均为真实可用版本。

> ⚠️ **重要**：早期版本中出现的 `tavo.setVar` / `tavo.saveFile` / `tavo.generateImage` / `tavo.user.get` / `tavo.character.current` / `tavo.loadFile` 等**均为错误 API 或错误用法**，请勿使用。

> 📌 **核心规则**：除变量操作（`tavo.get/set/update/unset`）外，**所有 TavoJS API 调用前面必须加 `await`**，而调用的函数要用 `async` 声明。

## 目录

1. [路径选择：内联脚本 vs 正则注入](#路径选择)
2. [变量（状态持久化）](#变量)
3. [消息](#消息)
4. [聊天](#聊天)
5. [角色](#角色)
6. [用户身份（Persona）](#用户身份)
7. [预设](#预设)
8. [世界书（Lorebook）](#世界书)
9. [正则](#正则)
10. [长记忆（Memory）](#长记忆)
11. [生成请求](#生成请求)
12. [生图](#生图)
13. [文件](#文件)
14. [输入框](#输入框)
15. [工具](#工具)
16. [App](#app)
17. [版本命名空间](#版本命名空间)
18. [兼容性](#兼容性)
19. [事件（官方手册未列出）](#事件)
20. [常见错误 API 对照表](#常见错误-api-对照表)

---

## 路径选择

Tavo 卡片里跑 JS 有两条路径，**必须先选对**：

| 路径 | 写在哪 | 何时执行 | 适合场景 |
|------|--------|----------|----------|
| **内联脚本** | 消息正文里的 `<script>...</script>` | 该条消息渲染时 | 单条消息的 DOM 操作、头像渲染 |
| **正则注入** | `extensions.regex_scripts[].replaceString` 里的 `<script>` | 每条消息渲染时（全局） | 全局 CSS/JS、跨消息状态、事件监听 |

**关键区别**：正则注入的脚本是**全局且持久**的（每条消息都会跑一遍），内联脚本只在该条消息里跑一次。需要跨消息维护状态（如头像缓存）→ 用正则注入。

---

## 变量

Tavo 的变量系统是**唯一的状态持久化方式**。变量接口为**同步方法，无需 `await`**。

支持三种作用域：`chat`（默认）、`global`、`message`。还支持路径形式访问嵌套字段。

```js
// 读取（同步！无需 await）
let hp = tavo.get('hp');                    // 当前聊天作用域（默认）
let globalCfg = tavo.get('cfg', 'global');  // 全局作用域（跨聊天）
let msgVar = tavo.get('temp', 'message');   // 消息作用域（随消息保存）

// 路径形式访问嵌套字段（用 . 分隔）
let hp = tavo.get('status.hp');             // 等价于 tavo.get('status')?.hp
let mp = tavo.get('status.mp');

// 写入（同步）
tavo.set('hp', 80);
tavo.set('hp', 80, 'chat');
tavo.set('avatar_cache', {lilith:'local.png'}, 'global');

// 路径形式写入（自动创建中间对象）
tavo.set('status.hp', 80);                  // status 不存在会自动创建

// 更新（部分更新 object 值，同步）
tavo.set('status', { hp: 100, mp: 32 });     // status = { hp: 100, mp: 32 }
tavo.update('status', { hp: 70 });           // status = { hp: 70, mp: 32 }（只改 hp，保留 mp）

// 删除（同步）
tavo.unset('hp');
tavo.unset('hp', 'chat');
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.get` | `(name: string, scope?: 'chat'\|'global'\|'message')` | `any`（同步） | 读取变量，不存在返回 `undefined`；支持 `a.b.c` 路径 |
| `tavo.set` | `(name: string, value: any, scope?: 'chat'\|'global'\|'message')` | `void`（同步） | 写入变量；支持路径形式自动创建中间对象 |
| `tavo.update` | `(name: string, value: object, scope?: 'chat'\|'global'\|'message')` | `any`（同步） | **部分更新** object 值（与 set 最大区别：允许对 object 进行部分更新，而非整体覆盖） |
| `tavo.unset` | `(name: string, scope?: 'chat'\|'global'\|'message')` | `void`（同步） | 删除变量 |

**作用域选择**：
- `chat`（默认）：每个聊天独立，换聊天就丢。适合剧情进度、当前心情。可随聊天导出。
- `global`：跨所有聊天共享。适合头像缓存、全局配置、用户偏好。需格外小心命名冲突。
- `message`：随消息保存，消息删除时一并清理。适合与特定消息绑定的临时状态。

> ⚠️ 不同作用域中的变量完全不通，不存在跨作用域覆盖。

### 消息作用域（Since v0.88.0）

消息作用域的变量挂在单条消息（楼层）上，随消息删除一并消失。除了传字符串 `'message'` 外，还支持传对象指定具体消息：

```js
// 获取/设置当前消息作用域的变量
let temp = tavo.get('temp', 'message');
tavo.set('temp', '值', 'message');

// 指定具体消息 ID（v0.88.0+）
let temp = tavo.get('temp', { scope: 'message', id: 42 });
tavo.set('temp', '值', { scope: 'message', id: 42 });
```

### 变量宏（在提示词中使用）

在角色卡描述、预设等提示词位置，可用宏读取变量值：

```text
{{getvar::hp}}          // 读取聊天作用域的 hp 变量
{{getglobalvar::cfg}}   // 读取全局作用域的 cfg 变量
```

> ⚠️ **没有** `tavo.setVar` / `tavo.getVar` / `tavo.deleteVar` / `tavo.onVarChange`。

> 变量接口是**同步的**，不要加 `await`。`tavo.get` 的第二个参数是 **scope**（作用域），不是默认值！需要默认值请用 `??`：`tavo.get('hp') ?? 100`。

---

## 消息

可以通过此接口读取或操作当前聊天的消息列表，所有消息接口均为 `tavo.message.<method>(...)`。

```js
// 当前消息
const cur = await tavo.message.current();

// 获取所有消息
const all = await tavo.message.find();

// 按索引范围获取（支持负数、单值、区间数组）
const last = await tavo.message.find(-1);           // 最后一条
const first5 = await tavo.message.find([0, 4]);     // 第 0~4 条
const at3 = await tavo.message.find(3);             // 第 3 条

// 按索引范围 + 过滤条件
const lastChar = await tavo.message.find(-1, { role: 'assistant' });

// 按 ID 获取
const msg = await tavo.message.get(msgId);

// 消息总数
const count = await tavo.message.count();

// 追加消息（返回新消息 ID）
const newId = await tavo.message.append({role: 'assistant', content: '...'});

// 更新消息（返回消息 ID）
await tavo.message.update({id: 12, content: '新内容'})

// 删除消息（返回被删除的消息 ID）
await tavo.message.delete(12)
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.message.current` | `()` | `Promise<Message>` | 当前渲染的消息 |
| `tavo.message.find` | `(indexRange?, filter?)` | `Promise<Message[]>` | 按索引范围 + 过滤条件查找；不传参返回全部 |
| `tavo.message.get` | `(id)` | `Promise<Message\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.message.count` | `()` | `Promise<number>` | 消息总数 |
| `tavo.message.append` | `(message)` | `Promise<number\|null>` | 追加消息，成功返回新消息 ID，失败返回 null |
| `tavo.message.update` | `(message, opts?)` | `Promise<number\|null>` | 更新消息（需含 id），成功返回消息 ID，失败返回 null |
| `tavo.message.delete` | `(id)` | `Promise<number\|null>` | 删除消息，成功返回被删除的消息 ID，失败返回 null |

### `find` 的 `indexRange` 参数

- 不传：返回所有消息
- `number`（如 `-1`）：返回该索引处的消息（负数从末尾算）
- `[start, end]`（如 `[0, 4]`）：返回闭区间内的消息

### `find` 的 `filter` 参数

可选过滤条件对象，常见字段：
- `role`：`'assistant' | 'user'`

### `append` 的 `message` 字段

```js
{
  content: '消息内容',        // 必填，string
  role: 'assistant',         // 可选，'assistant' | 'user'，默认 'assistant'
  characterId: 34,           // 可选，number；role='assistant' 时指定发言角色 ID（群聊必传）
  hidden: false,             // 可选，boolean，默认 false
}
```

> 注意：
> 1. 当 `role = 'assistant'` 且未传 `characterId` 时，会按当前会话上下文自动推断角色
> 2. 若无法推断角色，或角色不属于当前聊天，会创建失败并返回 `null`

### `update` 的 `message` 字段

```js
{
  id: 12,                    // 必填，number，要更新的消息 ID
  content: '更新后的内容',    // 必填，string
  reasoning: '推理内容',     // 可选，string；传空字符串会清空
  hidden: true,              // 可选，boolean
}
```

### `update` 的 `opts` 参数

```js
{
  reuseContext: false,  // boolean，是否保留当前气泡的脚本执行环境，默认 false
}
```

**`reuseContext` 说明**：如果你的脚本调用 `tavo.message.update` 更新**自己所在的气泡**，并且希望更新后继续执行后续脚本，传 `reuseContext: true`：

```js
// 脚本里调用，且更新的是自己所在的气泡
await tavo.message.update(self, { reuseContext: true })
console.log('更新后继续执行')
```

> ⚠️ **没有** `tavo.getCurrentMessage` / `tavo.getMessages`。消息增删改用 `tavo.message.append/update/delete`。

---

## 聊天

可以通过此接口读取或修改当前聊天信息，所有聊天接口均为 `tavo.chat.<method>(...)`。

```js
// 获取当前聊天
const chat = await tavo.chat.current();
console.log(chat.name, chat.id);

// 更新当前聊天（部分更新，只传要改的字段）
await tavo.chat.update({ name: '新名称' });

// 切换预设
await tavo.chat.update({ preset: 8 });

// 切换世界书（ID 数组）
await tavo.chat.update({ lorebooks: [3, 5] });

// 设置会话级背景
await tavo.chat.update({ background: { color: '#222222' } });
await tavo.chat.update({ background: { useAvatar: true } });
await tavo.chat.update({ background: { image: 'files/chat/bg.png' } });

// 清除会话级背景
await tavo.chat.update({ background: null });
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.chat.current` | `()` | `Promise<Chat\|null>` | 获取当前聊天，无聊天返回 null |
| `tavo.chat.update` | `(chat)` | `Promise<Chat>` | 更新当前聊天（部分更新） |

### Chat 对象字段

```js
{
  id: 12,                    // 聊天 ID
  name: '聊天名称',           // 聊天名称（注意：是 name 不是 title）
  characters: [              // 参与本聊天的角色数组
    { id: 1, name: 'Alice', avatar: '...' },
  ],
  persona: { id: 5 },        // 当前用户身份
  preset: 8,                 // 当前预设 ID
  lorebooks: [3, 5],         // 当前世界书 ID 数组
  regexes: [1, 2],           // 当前正则 ID 数组
  background: {              // 会话级背景（独立于主题）
    image: 'files/chat/bg.png',  // 背景图片路径
    useAvatar: false,            // 是否使用角色头像作背景
    color: '#222222',            // 纯色背景
    opacity: 0.8,                // 不透明度
  },
}
```

### `update` 可更新字段

- `name`：聊天名称
- `characters`：参与角色
- `persona`：用户身份
- `preset`：预设 ID
- `lorebooks`：世界书 ID 数组
- `regexes`：正则 ID 数组
- `background`：会话级背景对象或 `null`（清除）

### 背景三种来源（互斥，优先级 useAvatar > image > color）

```js
// 纯色背景
await tavo.chat.update({ background: { color: '#222222' } });

// 用角色头像作背景
await tavo.chat.update({ background: { useAvatar: true } });

// 图片背景（传 tavo.file.save/url 返回的路径）
await tavo.chat.update({ background: { image: 'files/chat/bg.png' } });

// 清除
await tavo.chat.update({ background: null });
```

> ⚠️ 字段是 `name`，**不是** `title`。

---

## 角色

可以通过此接口管理角色卡，所有角色接口均为 `tavo.character.<method>(...)`。

```js
// 所有角色概要
const all = await tavo.character.all();

// 按 ID 获取
const char = await tavo.character.get(id);

// 按名称查找（返回数组）
const found = await tavo.character.find('莉莉丝');
const found2 = await tavo.character.find('莉莉', { match: 'prefix' });

// 创建角色（返回新角色 ID）
const newId = await tavo.character.create({
  name: '新角色',           // 必填
  firstMes: '你好',         // 必填
  description: '...',
});

// 更新角色（返回角色 ID）
await tavo.character.update({id: 5, name: '新名字', firstMes: '你好'});

// 导入角色卡（返回 {characterId, lorebookId, regexId}）
const result = await tavo.character.import(cardData);

// 删除角色
await tavo.character.delete(5);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.character.all` | `()` | `Promise<CharacterSummary[]>` | 所有角色概要（每项含 id、name） |
| `tavo.character.get` | `(id)` | `Promise<Character\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.character.find` | `(name: string, options?)` | `Promise<Character[]>` | 按名称查找，返回数组 |
| `tavo.character.create` | `(character)` | `Promise<number>` | 创建角色，返回新角色 ID |
| `tavo.character.update` | `(character)` | `Promise<number>` | 更新角色，返回角色 ID |
| `tavo.character.import` | `(card)` | `Promise<{characterId, lorebookId, regexId}\|null>` | 导入 CCv3 角色卡，取消返回 null |
| `tavo.character.delete` | `(id \| character)` | `Promise<void>` | 删除角色 |

### `find` 的 `options.match`

`'exact'`（默认）| `'prefix'` | `'suffix'` | `'contains'`

### `create` / `update` 必填字段

- `create`：`name`、`firstMes` 必填
- `update`：`id`、`name`、`firstMes` 必填

> **CCv3 兼容**：创建和更新时同样接受 CCv3 规范的字段名（如 `first_mes`、`mes_example`、`creator_notes` 等），会自动转换为 tavo 格式。

### `import` 说明

导入一个完整的 CCv3 角色卡对象（`{ spec: "chara_card_v3", data: {...} }` 格式或裸 data 对象均可）。若卡片包含 `character_book`，会同时创建世界书；包含 `extensions.regex_scripts`，会同时创建正则脚本。操作前会弹窗请求用户确认。

返回值：
```js
{
  characterId: 12,     // 创建的角色 ID
  lorebookId: 5,       // 创建的世界书 ID（若无则为 null）
  regexId: 3,          // 创建的正则脚本 ID（若无则为 null）
}
```

### 角色对象字段

角色对象（`get` / `find` 返回）包含以下常见字段：

```js
{
  id: 12,                    // 角色的唯一 ID
  avatar: 'xxx.png',         // 角色头像图片 URL 或路径
  name: 'Alice',             // 角色名称（必填）
  description: '...',        // 角色简介/描述
  firstMes: '...',           // 角色打招呼内容（必填）
  personality: '...',        // 角色性格描述
  scenario: '...',           // 适用场景或使用场景描述
  mesExample: '...',         // 消息示例，以 <START> 分割
  creatorNotes: '...',       // 创建者注释或补充说明
  systemPrompt: '...',       // 系统提示词
  postHistoryInstructions: '...',  // 信息上下文历史后的额外提示或说明
  alternateGreetings: ['...'],     // 角色可用的备用打招呼
  tags: ['guide'],           // 角色标签，用于分类或检索
  creator: 'Colin',          // 创建者用户名或昵称
  characterVersion: '1.0',  // 角色版本号
  nickname: 'Ali',           // 角色昵称或别名，如果填写了将替代 name 作为 {{char}} 的输出
  groupOnlyGreetings: ['...'],     // 仅限群聊使用的特定打招呼语
  creationDate: new Date('2026-03-05T10:20:30.000Z'),      // 创建时间（Date 对象）
  modificationDate: new Date('2026-03-05T11:30:00.000Z'),  // 最后修改时间（Date 对象）
}
```

> 说明：创建、更新、导入、删除角色时会弹出确认框，用户取消后操作不会生效。

> ⚠️ **没有** `tavo.character.current()` / `tavo.getCharacter()`。取当前角色用 `tavo.character.all()` 或 `tavo.character.find()`。取字段直接 `char.description`、`char.name` 等。

---

## 用户身份

可以通过此接口管理用户身份（Persona），所有接口均为 `tavo.persona.<method>(...)`。

```js
// 所有用户身份概要
const all = await tavo.persona.all();

// 按 ID 获取
const persona = await tavo.persona.get(id);

// 按名称查找（返回数组）
const found = await tavo.persona.find('默认用户身份');

// 创建用户身份（返回新 ID）
const newId = await tavo.persona.create({
  name: '侦探用户身份',
  description: '注重细节，擅长结构化推理。',
});

// 更新用户身份
await tavo.persona.update({id: 5, name: '默认用户身份', description: '...'});

// 删除用户身份
await tavo.persona.delete(5);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.persona.all` | `()` | `Promise<PersonaSummary[]>` | 所有用户身份概要（每项含 id、name） |
| `tavo.persona.get` | `(id)` | `Promise<Persona\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.persona.find` | `(name: string, options?)` | `Promise<Persona[]>` | 按名称查找，返回数组 |
| `tavo.persona.create` | `(persona)` | `Promise<number>` | 创建，返回新 ID（name、description 必填） |
| `tavo.persona.update` | `(persona)` | `Promise<number>` | 更新，返回 ID（id、name、description 必填） |
| `tavo.persona.delete` | `(id \| persona)` | `Promise<void>` | 删除 |

### `find` 的 `options.match`

`'exact'`（默认）| `'prefix'` | `'suffix'` | `'contains'`

### Persona 对象字段

```js
{
  id: 5,
  name: '默认用户身份',
  description: '...',
  avatar: 'chara/persona-xxx.png',
  active: true,       // 是否为当前激活的用户身份
  sortIndex: 0,       // 排序索引
}
```

> ⚠️ **没有** `tavo.user.get()` / `tavo.getUser()`。用户身份用 `tavo.persona.*`。

---

## 预设

可以通过此接口管理预设，所有预设接口均为 `tavo.preset.<method>(...)`。

```js
const all = await tavo.preset.all();
const preset = await tavo.preset.get(id);
const found = await tavo.preset.find('默认预设');
const newId = await tavo.preset.create({...});
await tavo.preset.update({id, ...});
const importedId = await tavo.preset.import(presetData);
await tavo.preset.delete(id);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.preset.all` | `()` | `Promise<PresetSummary[]>` | 所有预设概要（每项含 id、name） |
| `tavo.preset.get` | `(id)` | `Promise<Preset\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.preset.find` | `(name: string, options?)` | `Promise<Preset[]>` | 按名称查找，返回数组 |
| `tavo.preset.create` | `(preset)` | `Promise<number>` | 创建预设，返回新 ID |
| `tavo.preset.update` | `(preset)` | `Promise<number>` | 更新预设，返回 ID |
| `tavo.preset.import` | `(data)` | `Promise<number\|null>` | 导入预设，返回新 ID，取消返回 null |
| `tavo.preset.delete` | `(id \| preset)` | `Promise<void>` | 删除预设 |

### `find` 的 `options.match`

`'exact'`（默认）| `'prefix'` | `'suffix'` | `'contains'`

### Preset 对象字段

```js
{
  id: 8,
  name: '默认预设',
  basicPrompts: {
    temperature: 0.7,
    topP: 0.9,
    maxCompletionTokens: 300,
    contextSize: 8192,
    frequencyPenalty: 0,
    presencePenalty: 0,
    reasoningEffort: 'medium',  // 'low' | 'medium' | 'high'
    stream: true,
    imageInputEnabled: false,
  },
  entries: [
    {
      identifier: 'main',           // 条目标识符（内置 identifier 见下表）
      name: 'Main Prompt',          // 显示名称
      content: '...',               // 提词内容
      enabled: true,                // 是否启用
      active: true,                 // 是否激活
      type: 'builtin',              // 'builtin' | 'marker'
      role: 'system',               // 'system' | 'user' | 'assistant'
      injectionPosition: 'relative',// 'relative' | 'absolute'
      injectionDepth: 4,            // 注入深度（仅 absolute 生效）
    },
  ],
}
```

### 内置条目 identifier 列表

以下 `identifier` 对应系统内置的固定提词或位置标记，创建 / 更新时可直接引用：

| identifier | 名称 | 类型 | 说明 |
|---|---|---|---|
| `main` | Main Prompt | builtin | 主提词，对话的核心指令 |
| `worldInfoBefore` | Lorebook Before | marker | 世界书（角色描述上方）插入点 |
| `personaDescription` | Persona Description | marker | 用户身份描述插入点 |
| `charDescription` | Char Description | marker | 角色描述插入点 |
| `charPersonality` | Char Personality | marker | 角色性格插入点 |
| `scenario` | Scenario | marker | 场景描述插入点 |
| `enhanceDefinitions` | Enhance Definitions | builtin | 增强角色定义的补充提词 |
| `nsfw` | Auxiliary Prompt | builtin | 辅助提词（默认为空） |
| `worldInfoAfter` | Lorebook After | marker | 世界书（角色描述下方）插入点 |
| `dialogueExamples` | Chat Examples | marker | 示例对话插入点 |
| `chatHistory` | Chat History | marker | 聊天历史插入点 |
| `jailbreak` | Post-History Instructions | builtin | 历史记录后的补充指令 |

> ⚠️ **没有** `tavo.getPreset` / `tavo.setPreset`。

---

## 世界书

可以通过此接口管理世界书（Lorebook），所有接口均为 `tavo.lorebook.<method>(...)`。

```js
const all = await tavo.lorebook.all();
const lb = await tavo.lorebook.get(id);
const found = await tavo.lorebook.find('奇幻世界');
const newId = await tavo.lorebook.create({...});
await tavo.lorebook.update({id, ...});
const importedId = await tavo.lorebook.import(data);
await tavo.lorebook.delete(id);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.lorebook.all` | `()` | `Promise<LorebookSummary[]>` | 所有世界书概要（每项含 id、name、entries） |
| `tavo.lorebook.get` | `(id)` | `Promise<Lorebook\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.lorebook.find` | `(name: string, options?)` | `Promise<Lorebook[]>` | 按名称查找，返回数组 |
| `tavo.lorebook.create` | `(lorebook)` | `Promise<number>` | 创建世界书，返回新 ID |
| `tavo.lorebook.update` | `(lorebook)` | `Promise<number>` | 更新世界书，返回 ID |
| `tavo.lorebook.import` | `(data)` | `Promise<number\|null>` | 导入 CCv3 character_book 格式，返回新 ID，取消返回 null |
| `tavo.lorebook.delete` | `(id \| lorebook)` | `Promise<void>` | 删除世界书 |

### `find` 的 `options.match`

`'exact'`（默认）| `'prefix'` | `'suffix'` | `'contains'`

### Lorebook 对象字段

```js
{
  id: 3,
  name: '城市设定',
  entries: [   // 条目数组
    {
      identifier: 'entry-1',
      name: '条目名',
      content: '条目内容',
      enabled: true,
      strategy: 'activate',              // 'activate' | 'select'
      keywords: ['关键词1', '关键词2'],
      secondaryKeywords: [],
      secondaryKeywordStrategy: 'any',   // 'any' | 'all'
      scanDepth: 100,
      caseSensitive: false,
      matchWholeWord: false,
      injectionPosition: 'before_char',  // 'before_char' | 'after_char'
      injectionDepth: 4,
      injectionRole: 'system',           // 'system' | 'user' | 'assistant'
      probability: 100,
      sticky: 0,
      cooldown: 0,
      delay: 0,
    },
  ],
}
```

---

## 正则

可以通过此接口管理正则脚本，所有接口均为 `tavo.regex.<method>(...)`。

```js
const all = await tavo.regex.all();
const regex = await tavo.regex.get(id);
const found = await tavo.regex.find('头像渲染');
const newId = await tavo.regex.create({...});
await tavo.regex.update({id, ...});
const importedId = await tavo.regex.import(data);
await tavo.regex.delete(id);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.regex.all` | `()` | `Promise<RegexSummary[]>` | 所有正则概要（每项含 id、name、entries） |
| `tavo.regex.get` | `(id)` | `Promise<Regex\|null>` | 按 ID 获取，不存在返回 null |
| `tavo.regex.find` | `(name: string, options?)` | `Promise<Regex[]>` | 按名称查找，返回数组 |
| `tavo.regex.create` | `(regex)` | `Promise<number>` | 创建正则，返回新 ID |
| `tavo.regex.update` | `(regex)` | `Promise<number>` | 更新正则，返回 ID |
| `tavo.regex.import` | `(data)` | `Promise<number\|null>` | 导入 SillyTavern 格式正则，返回新 ID，取消返回 null |
| `tavo.regex.delete` | `(id \| regex)` | `Promise<void>` | 删除正则 |

### `find` 的 `options.match`

`'exact'`（默认）| `'prefix'` | `'suffix'` | `'contains'`

### 正则组对象字段

```js
{
  id: 3,
  name: '头像渲染组',
  entries: [   // 规则条目数组（RegexEntry）
    {
      name: '规则显示名',             // 必填（字符串），否则解析可能失败
      findRegex: 'pattern',          // 查找用正则（可支持 JavaScript 正则类似的 /pattern/flags 写法）
      replaceString: '',             // 替换为的字符串
      trimStrings: [],               // 额外要裁剪的字符串列表
      placements: ['char'],          // 作用位置，可多选：
                                     //   'user'      - 用户输入
                                     //   'char'      - AI 输出
                                     //   'reasoning' - 推理内容
                                     //   'lorebook'  - 世界书注入内容
      timing: 'display',             // 执行时机：
                                     //   'display'         - 仅显示时（不写入持久消息）
                                     //   'send'            - 仅发送进模型前
                                     //   'sendAndDisplay'  - 显示与发送都执行
                                     //   'receive'         - 收到回复后持久化
                                     //   'editAndReceive'  - 收到与编辑消息时都会持久化改写
      substitution: 'none',          // 宏替换方式：'none' | 'raw' | 'escaped'
      minDepth: null,                // 可选，消息深度下限（整数）
      maxDepth: null,                // 可选，消息深度上限（整数）
      enabled: true,                 // 是否启用该条规则
    },
  ],
}
```

> 省略字段时，端侧会为 `findRegex`、`replaceString`、`trimStrings`、`placements`、`timing`、`substitution`、`enabled` 等填入合理默认值（例如 `placements: ['char']`、`timing: 'display'`）。

> ⚠️ **没有** `tavo.getRegexScripts` / `tavo.disableRegex`。

---

## 长记忆

可以通过此接口读取或修改当前聊天的长期记忆，所有接口均为 `tavo.memory.<method>(...)`。

```js
// 获取当前记忆
const memory = await tavo.memory.current();
console.log(memory.enabled);         // true / false
console.log(memory.memories.length); // 记忆条数

// 更新记忆
memory.enabled = true;
memory.memories = [
  '用户喜欢简洁、结论先行的回答风格',
  '用户倾向于让角色保持冷静和专业',
];
const updated = await tavo.memory.update(memory);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.memory.current` | `()` | `Promise<Memory>` | 获取当前聊天记忆 |
| `tavo.memory.update` | `(memory)` | `Promise<Memory>` | 更新记忆（可改 enabled、memories） |

### 记忆对象字段

```js
{
  id: 12,              // 记忆记录 ID
  enabled: true,       // 是否启用长期记忆
  memories: [          // 记忆条目列表（字符串数组）
    '用户偏好简洁回复',
    '避免重复解释已确认信息'
  ],
}
```

> ⚠️ **没有** `tavo.addMemory` / `tavo.searchMemory` / `tavo.clearMemory`。改记忆用 `tavo.memory.current()` + `tavo.memory.update()`。

---

## 生成请求

可以通过此接口直接触发一次文本生成，接口为 `tavo.generate(...)`。

```js
// 基础用法
const result = await tavo.generate('请用一句话总结今天发生的事情');

// 带上下文 + 预设 + 模型参数
const text = await tavo.generate(
  '根据最近对话，给我 3 条行动建议',
  {
    context: true,           // 带当前对话上下文
    preset: { id: 8 },       // 使用指定预设
    settings: {              // 覆盖模型参数
      temperature: 0.7,
      topP: 0.9,
      maxCompletionTokens: 300,
    },
  },
);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.generate` | `(prompt: string, options?: object)` | `Promise<string>` | 一次性生成，返回完整文本 |

**options 字段**：
- `context`（boolean，默认 `false`）：`true` 带当前对话上下文；`false` 与当前对话无关
- `preset`（number | object，可选）：预设 ID 或 `{id}`，例如 `12` 或 `{id: 12}`
- `settings`（object，可选）：覆盖本次请求的模型参数，如 `temperature`、`topP`、`maxCompletionTokens`

> ⚠️ **没有** `tavo.generateStream`。该接口为一次性请求，不返回流式分片。无可用 API 会抛异常，请用 `try/catch` 捕获。

---

## 生图

可以通过此接口直接触发一次生图，接口为 `tavo.image.generate(...)`。

```js
// 基础用法（返回 dataUrl）
const img = await tavo.image.generate('a calico cat sleeping on a keyboard');
document.getElementById('cat').src = img;

// 带宽高比 + 负面提示词
const wide = await tavo.image.generate('cyberpunk night street, neon', {
  aspectRatio: '16:9',
  negativePrompt: 'low quality, blurry, watermark',
  extraBody: { quality: 'hd' },
});

// 一步生成 + 落盘（返回虚拟路径）
const path = await tavo.image.generate('a calico cat', {
  saveAs: 'hero.png',        // 返回 'files/chat/hero.png'
});
imgEl.src = path;
tavo.set('hero', path);      // 路径塞变量，跨克隆/导入免重写
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.image.generate` | `(prompt: string, options?: object)` | `Promise<string>` | 返回 dataUrl；传 `saveAs` 时返回虚拟路径 |

**options 字段**（全部可选）：
- `size`（string，如 `"1024x1024"`）：OpenAI 系平台使用
- `aspectRatio`（string，如 `"16:9"`、`"1:1"`）：支持宽高比的平台使用
- `negativePrompt`（string）：负面提示词，NovelAI / SD 类生效，OpenAI / Gemini 忽略
- `referenceImages`（string[]）：参考图数组，用于 img2img。每项可以是 dataUrl 或 `tavo.file.save` 返回的相对路径
- `extraBody`（object）：透传到平台 API 的额外字段（如 `seed` / `guidance_scale` / `quality`）
- `saveAs`（string，含扩展名，如 `'hero.png'`）：传了直接落盘，返回虚拟路径而非 dataUrl
- `scope`（string）：`'chat'`（默认）| `'global'`，仅在传了 `saveAs` 时生效

> ⚠️ **没有** `tavo.generateImage` / `tavo.insertImage`。插入图片直接在消息正文写 `<img src="...">`。不会触发提示词扩写，不弹确认框。

> ⚠️ 第一个参数是 **prompt 字符串**，不是 options 对象。

---

## 文件

可以通过此接口把数据持久化到 app 本地存储，所有文件接口均为 `tavo.file.<method>(...)`。

适合把生成的图片、下载的资源、配置文件等存到磁盘，避免把大体积数据（如图片 dataUrl）直接塞进变量或消息内容里。

```js
// 保存文件（返回相对路径，可直接用于 <img src>）
const path = await tavo.file.save('avatar.png', base64Data, {scope: 'global'});

// 纯文本 / JSON（自动 utf8）
await tavo.file.save('note.md', '# 标题\n正文');
await tavo.file.save('cfg.json', JSON.stringify({theme: 'dark'}), {scope: 'global'});

// 从 URL 下载
await tavo.file.save('report.pdf', 'https://example.com/report.pdf', {scope: 'global'});

// 读取文件（文件不存在返回 null）
const text = await tavo.file.load('note.md');
const dataUrl = await tavo.file.load('cat.png', {encoding: 'dataUrl'});

// 检查文件是否存在
const exists = await tavo.file.exists('avatar.png', {scope: 'global'});

// 拼接渲染路径（同步，不检测是否存在）
imgEl.src = tavo.file.url('avatar.png', 'global');

// 删除文件
await tavo.file.delete('avatar.png', {scope: 'global'});
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.file.save` | `(name, content, {scope?, encoding?})` | `Promise<string>` | 保存文件，返回相对路径 |
| `tavo.file.load` | `(name, {scope?, encoding?})` | `Promise<string\|null>` | 读取内容，不存在返回 null |
| `tavo.file.delete` | `(name, {scope?})` | `Promise<void>` | 删除文件，不存在静默返回 |
| `tavo.file.exists` | `(name, {scope?})` | `Promise<boolean>` | 是否存在 |
| `tavo.file.url` | `(name, scope?)` | `string`（同步） | 拼接渲染路径，不检测是否存在 |

**scope**：`'chat'`（默认，随聊天保存，删除时清理）| `'global'`（跨聊天持久，需主动删除）。

**encoding**（save/load 均支持）：
- save 不传时按内容自动识别：`data:` 开头当 dataUrl；`http(s)://` 开头下载远程内容；其余当 UTF-8 文本
- save 显式传：`'utf8'`（纯文本）| `'base64'`（裸 base64）| `'dataUrl'`（dataUrl）
- load 默认 `'utf8'` 返回文本；传 `'dataUrl'` 返回 dataUrl；传 `'base64'` 返回裸 base64

> 提示：渲染图片通常不需要 `load`，直接用 `tavo.file.url(name)` 或 `save` 的返回值当 `<img src>` 即可。`load` 主要用于读回文本配置，或需要把图片字节做二次处理时。

**头像缓存标准模式**（远程先显示 → 后台存本地 → 本地优先）：

```js
async function applyAvatar(name, remoteUrl) {
  const fname = 'avatar_' + name + '.png';
  const img = document.getElementById('avatar-' + name);
  // 1. 先用远程 URL 立即显示
  img.src = remoteUrl;
  img.onerror = () => { img.style.display = 'none'; };
  // 2. 后台查本地缓存
  const exists = await tavo.file.exists(fname, {scope: 'global'});
  if (exists) {
    img.src = tavo.file.url(fname, 'global');  // 本地优先
  } else {
    // 3. 后台下载
    tavo.file.save(fname, remoteUrl, {scope: 'global'}).then(() => {
      img.src = tavo.file.url(fname, 'global');
    });
  }
}
```

> ⚠️ **没有** `tavo.saveFile` / `tavo.readFile` / `tavo.loadFile` / `tavo.deleteFile` / `tavo.listFiles`。

> 文件名不能含 `/ \ : ..`（防路径穿越），违反抛 `Error`；同名覆盖。

---

## 输入框

可以通过此接口读取或操作聊天输入框，所有接口均为 `tavo.input.<method>(...)`。

```js
// 读取
let text = await tavo.input.get();

// 覆盖写入
tavo.input.set('你好！');           // 同步，无需 await

// 追加
tavo.input.append(' 继续聊吧');     // 同步

// 清空
tavo.input.clear();                 // 同步

// 发送
tavo.input.set('今天天气不错');
tavo.input.send();                  // 同步，自动发送
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.input.get` | `()` | `Promise<string>` | 获取输入框内容 |
| `tavo.input.set` | `(text: string)` | `void`（同步） | 覆盖写入 |
| `tavo.input.append` | `(text: string)` | `void`（同步） | 末尾追加 |
| `tavo.input.clear` | `()` | `void`（同步） | 清空 |
| `tavo.input.send` | `()` | `void`（同步） | 发送当前输入 |

> ⚠️ **没有** `tavo.setInput` / `tavo.send` / `tavo.onInput` / `tavo.addQuickReply`。

> `set` / `append` / `clear` / `send` 是**同步的**，不要加 `await`；`get` 是异步的。

---

## 工具

通用工具接口，所有工具接口均为 `tavo.utils.<method>(...)`。

```js
// 轻量提示
tavo.utils.toast('已保存');

// 打开外部链接
tavo.utils.openUrl('https://example.com');

// 导出文件（触发系统分享/保存）
tavo.utils.export('叶离角色卡', btoa('文本内容'));  // base64（推荐）
tavo.utils.export('record.txt', '文本内容');        // 普通文本

// 全屏图片预览
tavo.utils.preview(imgDataUrl);   // dataUrl / http(s) URL / app 内相对路径

// 原生选择器
const fruit = await tavo.utils.select(['苹果', '香蕉', '橙子'], '选择水果');
const role = await tavo.utils.select([
  {value: 'warrior', label: '战士', description: '近战物理攻击', subtitle: '推荐新手'},
  {value: 'mage',    label: '法师', description: '远程魔法攻击', subtitle: '高爆发'},
], '选择职业', 'mage');
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.utils.toast` | `(text: string)` | `void` | 轻量提示，数秒后消失 |
| `tavo.utils.openUrl` | `(url: string)` | `void` | 在外部浏览器打开 URL |
| `tavo.utils.export` | `(name: string, data: string)` | `void` | 导出文件（data 可为 base64 或文本） |
| `tavo.utils.preview` | `(src: string)` | `void` | 全屏图片预览（可缩放/拖动/保存） |
| `tavo.utils.select` | `(options, title?, defaultValue?)` | `Promise<string\|null>` | 原生选择器，取消返回 null |

**select 的 options 三种格式**：
- `string[]`：`value` 与显示文本相同
- `{value, label}[]`：`value` 为返回值，`label` 为显示文本
- `{value, label, description?, subtitle?}[]`：完整对象，支持副标题与描述

> ⚠️ **没有** `tavo.showModal` / `tavo.showToast` / `tavo.confirm` / `tavo.copyToClipboard`。

> 模态框用 DOM 自己写；剪贴板用 `navigator.clipboard.writeText`。

---

## App

可以通过此接口读取应用属性，所有接口均为 `tavo.app.<method>(...)`。

```js
await tavo.app.version();       // 字符串：'0.77.0'
await tavo.app.versionNumber(); // 数字：770
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.app.version` | `()` | `Promise<string>` | app 版本字符串 |
| `tavo.app.versionNumber` | `()` | `Promise<number>` | app 版本数字 |

---

## 版本命名空间

Tavo 提供不同版本的 API 接口访问，例如 `tavo.v1` 即为 v1 版本的命名空间。

```js
// 以下方式等效
tavo.get('name');
tavo.v1.get('name');
```

---

## 兼容性

提供与其他平台的兼容性支持。

### 触发斜杠命令（SillyTavern 兼容）

```js
triggerSlash('/send Hello World | /trigger');
```

用于兼容从 SillyTavern 迁移过来的脚本。

---

## 事件

> ⚠️ **注意**：`tavo.event.*` 在官方手册中**未列出**。以下内容来自早期 skill 版本，使用前请先在 Tavo 中验证可用性，或改用正则注入 + 轮询方案。

```js
// 注册事件监听（返回注销函数）
const off = tavo.event.on('message_rendered', (msg) => {
  console.log('新消息渲染:', msg);
});

// 注销
off();
// 或
tavo.event.off('message_rendered', handler);
```

| API | 签名 | 返回 | 说明 |
|-----|------|------|------|
| `tavo.event.on` | `(name: string, handler: Function)` | `() => void`（注销函数） | 注册监听 |
| `tavo.event.off` | `(name: string, handler: Function)` | `void` | 注销监听 |

常见事件名：`message_rendered`（消息渲染后）、`message_sent`（用户发送后）等，具体视 Tavo 版本而定。

> ⚠️ **没有** `tavo.onVarChange`。变量变化监听若 `tavo.event` 不可用，可用正则注入 + `setInterval` 轮询 `tavo.get` 实现。

---

## 常见错误 API 对照表

以下是**不存在或错误用法**的 API，请勿使用，附正确替代：

| ❌ 错误（不存在/错误用法） | ✅ 正确 |
|---|---|
| `await tavo.get(name, scope)` | `tavo.get(name, scope)`（同步，无需 await） |
| `await tavo.set(name, val, scope)` | `tavo.set(name, val, scope)`（同步） |
| `await tavo.update(name, val, scope)` | `tavo.update(name, val, scope)`（同步） |
| `tavo.get('hp', 100)`（第二参数当默认值） | `tavo.get('hp') ?? 100`（第二参数是 scope，不是默认值） |
| `tavo.update('hp', old => old - 10)`（回调形式） | `tavo.update('status', { hp: 70 })`（部分更新 object） |
| `await tavo.input.set(text)` | `tavo.input.set(text)`（同步） |
| `await tavo.input.send()` | `tavo.input.send()`（同步） |
| `tavo.setVar(name, val)` | `tavo.set(name, val, scope)` |
| `tavo.getVar(name)` | `tavo.get(name, scope)` |
| `tavo.deleteVar(name)` | `tavo.unset(name, scope)` |
| `tavo.onVarChange(name, cb)` | `tavo.event.on(event, cb)`（需验证）或轮询 |
| `tavo.saveFile(name, data)` | `tavo.file.save(name, data, {scope})` |
| `tavo.readFile(name)` | `tavo.file.load(name, {scope, encoding})` |
| `tavo.loadFile(name)` | `tavo.file.load(name, {scope, encoding})` |
| `tavo.deleteFile(name)` | `tavo.file.delete(name, {scope})` |
| `tavo.listFiles()` | 无（用 `tavo.file.exists` 逐个探测） |
| `tavo.file.save(name, data, {type})` | `tavo.file.save(name, data, {encoding})`（无 type） |
| `tavo.generateImage(opts)` | `tavo.image.generate(prompt, opts)` |
| `tavo.image.generate({prompt, ...})`（对象作首参） | `tavo.image.generate(prompt, opts)`（首参是字符串） |
| `tavo.image.generate(prompt, {width, height})` | `tavo.image.generate(prompt, {size, aspectRatio, ...})` |
| `tavo.insertImage(url)` | 无（直接写 `<img src>`） |
| `tavo.getCurrentMessage()` | `tavo.message.current()` |
| `tavo.getMessages()` | `tavo.message.find()` |
| `tavo.message.find({role, contains})`（filter 对象） | `tavo.message.find(indexRange, {role})`（索引范围 + filter） |
| `tavo.appendMessage / editMessage / deleteMessage` | `tavo.message.append / update / delete` |
| `tavo.setInput(text)` | `tavo.input.set(text)` |
| `tavo.send()` | `tavo.input.send()` |
| `tavo.onInput(cb)` | `tavo.event.on(event, cb)`（需验证） |
| `tavo.addQuickReply(...)` | 无 |
| `tavo.showModal(opts)` | 无（用 DOM 写） |
| `tavo.showToast(text)` | `tavo.utils.toast(text)` |
| `tavo.confirm(text)` | 无（用 DOM 写）或 `tavo.utils.select` |
| `tavo.copyToClipboard(text)` | `navigator.clipboard.writeText(text)` |
| `tavo.addMemory / searchMemory / clearMemory` | `tavo.memory.current()` + `tavo.memory.update()` |
| `tavo.generateStream(opts)` | 无（用 `tavo.generate`） |
| `tavo.generate(prompt, {temperature, maxTokens})` | `tavo.generate(prompt, {settings: {temperature, ...}})` |
| `tavo.getPreset()` | `tavo.preset.all()` |
| `tavo.setPreset(p)` | `tavo.preset.update(p)` 或 `tavo.chat.update({preset: id})` |
| `tavo.getRegexScripts()` | `tavo.regex.all()` |
| `tavo.disableRegex(name)` | 无 |
| `tavo.getCharacter()` | `tavo.character.all()` 或 `tavo.character.find()` |
| `tavo.character.current()` | 不存在；用 `tavo.character.all()` / `find()` |
| `tavo.character.find({name})`（filter 对象） | `tavo.character.find(name, options)`（名称字符串 + options） |
| `tavo.getUser()` | `tavo.persona.all()` 或 `tavo.persona.find()` |
| `tavo.user.get()` | 不存在；用 `tavo.persona.*` |
| `tavo.persona.find({name})`（filter 对象） | `tavo.persona.find(name, options)`（名称字符串 + options） |
| `tavo.preset.find({name})`（filter 对象） | `tavo.preset.find(name, options)`（名称字符串 + options） |
| `tavo.lorebook.find({name})`（filter 对象） | `tavo.lorebook.find(name, options)`（名称字符串 + options） |
| `tavo.regex.find({name})`（filter 对象） | `tavo.regex.find(name, options)`（名称字符串 + options） |
| `chat.title` | `chat.name`（聊天名称字段是 name） |
| `tavo.chat.update({title})` | `tavo.chat.update({name})` |
| `tavo.getCharacterField(f)` | `char[f]`（直接取属性） |
