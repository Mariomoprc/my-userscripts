# Tavo JS API 实战范例（5 个官方插件）

> 本文件收录 5 个来自 Tavo 官方指南卡的完整插件范例，涵盖生成、消息操作、生图、聊天背景等核心 API 的真实用法。每个范例均可直接粘贴到正则注入脚本的 `replaceString` 中使用。

> 📌 **核心规则**：除变量操作（`tavo.get/set/update/unset`）外，所有 API 调用前加 `await`，调用函数用 `async` 声明。变量操作是同步的，无需 `await`（加了也不会报错，但非必需）。

> ⚠️ 以下范例中变量操作已统一改为同步形式（去掉 `await`），与官方手册一致。

## 目录

1. [角色卡生成器](#1-角色卡生成器)
2. [一键隐藏消息](#2-一键隐藏消息)
3. [引导式重摇](#3-引导式重摇)
4. [插图生成器](#4-插图生成器)
5. [剧情背景切换](#5-剧情背景切换)

---

## 1. 角色卡生成器

**功能**：用 `tavo.generate` 让模型按 CCv3 规范生成角色卡 JSON，再导出或一键导入（角色卡 + 世界书 + 正则全部到位）。

**演示 API**：`tavo.generate` · `tavo.utils.export` · `tavo.character.import` · `tavo.utils.toast`

```html
<h3>🧙 角色卡生成器</h3>
<div class="control">
  <button id="btn-generate" onclick="generate()">开始生成</button>
  <p id="status"></p>
  <div id="actions" hidden>
    <button onclick="downloadJson()">导出角色卡</button>
    <button onclick="importCharacter()">导入角色卡</button>
  </div>
</div>

<script>
let card = null;
function setUi(loading, status, showActions = false) {
  document.getElementById('btn-generate').disabled = loading;
  document.getElementById('status').textContent = status;
  document.getElementById('actions').hidden = !showActions;
}
async function generate() {
  const p = prompt('请输入想要生成的角色特点');
  if (!p) return;
  setUi(true, '生成中...');
  try {
    // tavo.generate：让模型生成文本（不带上下文）
    let text = await tavo.generate(
      `根据以下信息生成一张角色卡，输出符合 Character Card Spec V3 规范的 JSON 格式（chara_card_v3）。\n${p}`
    );
    text = text.trim();
    // 去除可能的 ```json 代码块包裹
    if (text.startsWith('```') && text.endsWith('```')) {
      text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
    }
    card = JSON.parse(text);
    const data = card.data || card;
    // CCv3 的 mes_example 可能是数组，转成字符串
    if (Array.isArray(data.mes_example)) data.mes_example = data.mes_example.join('\n');
    setUi(false, `角色卡 《${data.name}》 已生成`, true);
  } catch (e) {
    setUi(false, `角色卡生成格式错误，请尝试切换模型`, false);
  }
}
function downloadJson() {
  const name = (card.data || card).name;
  // tavo.utils.export：触发浏览器下载
  tavo.utils.export(`${name}.json`, JSON.stringify(card));
}
async function importCharacter() {
  // tavo.character.import：一键导入角色卡（含世界书、正则）
  // 返回 { characterId, lorebookId, regexId }
  const result = await tavo.character.import(card);
  if (!result || !result.characterId) {
    tavo.utils.toast('角色卡导入失败，换个模型重新生成');
    return;
  }
  const parts = [`角色 #${result.characterId}`];
  if (result.lorebookId) parts.push(`世界书 #${result.lorebookId}`);
  if (result.regexId) parts.push(`正则 #${result.regexId}`);
  tavo.utils.toast(`已导入：${parts.join(' · ')}`);
}
</script>
```

**要点**：
- `tavo.generate(prompt)` 返回生成的文本字符串；用 `{ context: false }` 可不带聊天上下文
- `tavo.character.import(card)` 返回 `{ characterId, lorebookId, regexId }`，三个 ID 可能都有也可能只有部分
- `tavo.utils.export(filename, content)` 触发浏览器下载，适合导出 JSON / PNG

---

## 2. 一键隐藏消息

**功能**：保留最后 N 层消息，把之前的消息全部隐藏（不删除，只是不送入上下文）。

**演示 API**：`tavo.message.count` · `tavo.message.find([start, end])` · `tavo.message.update`

```html
<button id="btn-hide-old" onclick="hideOldMessages()">🫥 隐藏旧消息</button>

<script>
async function hideOldMessages() {
  const input = prompt('保留最后多少楼层（隐藏之前的）', '2');
  if (input === null) return; // 用户取消

  const keepLastN = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(keepLastN) || keepLastN < 0) {
    tavo.utils.toast('请输入 >= 0 的整数');
    return;
  }

  // tavo.message.count：获取当前聊天消息总数
  const total = await tavo.message.count();
  if (total <= keepLastN) {
    tavo.utils.toast(`当前总楼层为 ${total}，无需隐藏`);
    return;
  }

  // tavo.message.find([start, end])：按索引范围查询消息
  const endIndex = total - keepLastN - 1;
  const targets = await tavo.message.find([0, endIndex]);

  if (!targets.length) {
    tavo.utils.toast('没有可隐藏的楼层');
    return;
  }

  const btn = document.getElementById('btn-hide-old');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '处理中...';

  try {
    for (const msg of targets) {
      msg.hidden = true;  // 设置 hidden 字段
      // tavo.message.update：更新消息，返回消息 ID
      await tavo.message.update(msg);
    }
    tavo.utils.toast(`已隐藏 ${targets.length} 层旧消息（保留最近 ${keepLastN} 层）`);
  } catch (err) {
    console.error(err);
    tavo.utils.toast('隐藏失败，请稍后重试');
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}
</script>
```

**要点**：
- `tavo.message.find([0, endIndex])` 用数组指定索引范围，返回该范围内所有消息
- `msg.hidden = true` 后调用 `tavo.message.update(msg)` 即可隐藏消息（不送入上下文，但仍在列表中）
- `tavo.message.count()` 返回当前聊天消息总数

---

## 3. 引导式重摇

**功能**：对角色的最新回复进行"引导式重摇"——输入引导词，让 AI 按方向重新生成，并保留所有历史版本可前后切换。

**演示 API**：`tavo.message.current` · `tavo.message.find(index)` · `tavo.message.update` · `tavo.generate({context: true})` · `tavo.get/set`（变量持久化）

```html
<div id="reroll-ui" style="margin-top:0.5em;padding-top:0.5em;border-top:1px dashed #fff3;font-size:12px;">
  <button id="btn-reroll" onclick="rerollWithGuidance()">🎲 引导式重摇</button>
  <button id="btn-reroll-prev" onclick="rerollNav(-1)" style="display:none">⬅ 上一版</button>
  <button id="btn-reroll-next" onclick="rerollNav(1)" style="display:none">➡ 下一版</button>
  <span id="reroll-label" style="color:#fff9;margin-left:0.5em;"></span>
</div>

<script>
(async function rerollInit() {
  // tavo.message.current：获取当前正在渲染的消息
  const cur = await tavo.message.current();
  if (!cur || cur.role !== 'assistant') {
    const ui = document.getElementById('reroll-ui');
    if (ui) ui.style.display = 'none';
    return;
  }
  await _rerollRefreshUI(cur);
})();

async function _rerollRefreshUI(cur) {
  // 变量操作是同步的，无需 await（加了也不报错）
  const history = tavo.get('rerollHistory') || {};
  const entry = history[cur.id];
  const prevBtn = document.getElementById('btn-reroll-prev');
  const nextBtn = document.getElementById('btn-reroll-next');
  const label = document.getElementById('reroll-label');
  if (!entry || !entry.versions || entry.versions.length <= 1) {
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (label) label.textContent = '';
    return;
  }
  if (prevBtn) prevBtn.style.display = entry.index > 0 ? 'inline-block' : 'none';
  if (nextBtn) nextBtn.style.display = entry.index < entry.versions.length - 1 ? 'inline-block' : 'none';
  if (label) label.textContent = `${entry.index + 1}/${entry.versions.length}`;
}

async function rerollWithGuidance() {
  const guidance = prompt('请输入引导内容（让 AI 按此方向重新生成本条回复）');
  if (!guidance) return;

  const cur = await tavo.message.current();
  if (!cur) return tavo.utils.toast('无法获取当前消息');
  if (cur.role !== 'assistant') return tavo.utils.toast('只能对角色消息进行重摇');

  const btn = document.getElementById('btn-reroll');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '生成中...';

  // 生成期间临时隐藏首条（菜单），避免污染 context
  // tavo.message.find(0)：查询单条消息（索引 0），返回数组
  const first = (await tavo.message.find(0))[0];
  const wasHidden = !!(first && first.hidden);
  if (first && !wasHidden) {
    first.hidden = true;
    await tavo.message.update(first);
  }

  try {
    // tavo.generate(prompt, { context: true })：带聊天上下文生成
    const promptText = `请依据以下要求重新生成你的上一条回复，直接输出替换内容，不要任何前后解释、不要用引号包裹：\n\n${guidance}`;
    const text = await tavo.generate(promptText, { context: true });
    if (!text) { tavo.utils.toast('生成失败（当前聊天可能无可用端点）'); return; }
    const newContent = text.trim();

    // 用变量持久化重摇历史（同步操作）
    const history = tavo.get('rerollHistory') || {};
    const entry = history[cur.id] || { versions: [cur.content], index: 0 };
    entry.versions = entry.versions.slice(0, entry.index + 1); // 截断后续版本
    entry.versions.push(newContent);
    entry.index = entry.versions.length - 1;
    history[cur.id] = entry;
    tavo.set('rerollHistory', history);

    cur.content = newContent;
    await tavo.message.update(cur);
  } catch (e) {
    console.error(e);
    tavo.utils.toast('重摇失败');
  } finally {
    // 恢复菜单显示
    if (first && !wasHidden) {
      first.hidden = false;
      await tavo.message.update(first);
    }
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

async function rerollNav(delta) {
  const cur = await tavo.message.current();
  if (!cur) return;
  const history = tavo.get('rerollHistory') || {};
  const entry = history[cur.id];
  if (!entry) return tavo.utils.toast('本消息暂无历史版本');
  const newIdx = entry.index + delta;
  if (newIdx < 0 || newIdx >= entry.versions.length) return;
  entry.index = newIdx;
  history[cur.id] = entry;
  tavo.set('rerollHistory', history);
  cur.content = entry.versions[newIdx];
  await tavo.message.update(cur);
}
</script>
```

**要点**：
- `tavo.message.current()` 返回当前渲染的消息对象（含 `id`、`role`、`content`、`hidden` 等字段）
- `tavo.message.find(0)` 返回索引 0 的消息（数组形式）；`find([0, 3])` 返回 0~3 范围
- `tavo.generate(prompt, { context: true })` 带聊天上下文生成；`{ context: false }` 不带
- 用 `tavo.get/set('rerollHistory')` 持久化重摇版本，跨会话不丢

---

## 4. 插图生成器

**功能**：为角色的最新回复自动生成配图——先用模型提炼画面描述，再调生图 API 生成图片并缓存路径，点击可预览大图。

**演示 API**：`tavo.message.current` · `tavo.utils.select` · `tavo.generate({context: false})` · `tavo.image.generate(prompt, opts)` · `tavo.file`（saveAs 自动存图）· `tavo.utils.preview` · `tavo.get/set`

```html
<div id="illo-ui" style="margin-top:0.5em;padding-top:0.5em;border-top:1px dashed #fff3;font-size:12px;">
  <button id="btn-illo" onclick="illoGenerate()">🎨 配图</button>
</div>
<div id="illo-out"></div>

<script>
(async function illoInit() {
  const cur = await tavo.message.current();
  const ui = document.getElementById('illo-ui');
  if (!cur || cur.role !== 'assistant') { if (ui) ui.style.display = 'none'; return; }
  // 检查是否已有缓存的配图路径
  const map = tavo.get('illoImages') || {};
  if (map[cur.id]) _illoRender(map[cur.id]);
})();

function _illoRender(path) {
  // tavo.utils.preview(path)：点击图片预览大图
  document.getElementById('illo-out').innerHTML =
    `<img src="${path}" onclick="tavo.utils.preview('${path}')" style="max-width:240px;border-radius:8px;cursor:pointer;margin-top:6px" />`;
}

async function illoGenerate() {
  const cur = await tavo.message.current();
  if (!cur) return tavo.utils.toast('无法获取当前消息');
  if (cur.role !== 'assistant') return tavo.utils.toast('只能为角色消息配图');

  // tavo.utils.select(options, title)：弹窗让用户选择，返回 value 或 null
  const style = await tavo.utils.select([
    { value: 'anime illustration, soft cinematic lighting', label: '🎨 动漫' },
    { value: 'photorealistic portrait, 50mm, shallow depth of field', label: '📷 写实' },
    { value: 'delicate watercolor painting', label: '🖌️ 水彩' },
    { value: 'first-person POV close-up, bokeh', label: '👀 第一人称特写' },
  ], '选择插图风格 / 视角');
  if (style === null) return;

  const btn = document.getElementById('btn-illo');
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = '提炼中...';
  try {
    // 第一步：用模型把消息内容提炼成英文画面提示词（不带上下文）
    const desc = await tavo.generate(
      `把下面这段角色消息提炼成一句英文图像生成提示词，只描述画面（人物外貌、表情、动作、环境、镜头），不要旁白与引号：\n${cur.content}`,
      { context: false }
    );
    if (!desc) { tavo.utils.toast('提炼失败（当前聊天可能无可用端点）'); return; }

    // 第二步：生图
    btn.textContent = '生图中...';
    // tavo.image.generate(prompt, opts)：
    //   - prompt 是字符串（不是对象！）
    //   - aspectRatio：宽高比（如 '3:4'、'16:9'）
    //   - saveAs：指定文件名，图片自动保存到文件系统，返回路径（而非 dataUrl）
    const path = await tavo.image.generate(`${desc.trim()}, ${style}`, {
      aspectRatio: '3:4',
      saveAs: `illo-${cur.id}.png`
    });

    // 缓存路径到变量（同步操作）
    const map = tavo.get('illoImages') || {};
    map[cur.id] = path;
    tavo.set('illoImages', map);
    _illoRender(path);
  } catch (e) {
    console.error(e);
    tavo.utils.toast('配图失败：' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}
</script>
```

**要点**：
- `tavo.image.generate(prompt, opts)` 第一个参数是 **prompt 字符串**，不是对象
- `saveAs: 'filename.png'` 让图片自动保存到文件系统，返回值是文件路径（可直接做 `<img src>`）
- 不用 `saveAs` 时返回值是 dataUrl（base64），体积大，不推荐用于多图场景
- `tavo.utils.select(options, title)` 返回选中项的 `value`，取消返回 `null`
- `tavo.utils.preview(path)` 点击图片预览大图

---

## 5. 剧情背景切换

**功能**：多幕剧情推进器——点击"继续剧情"按钮，自动切换聊天背景图并追加下一幕文本，到末幕时按钮变成"剧终"。

**演示 API**：`tavo.message.current` · `tavo.get/set` · `tavo.chat.update({background})` · `tavo.message.append`

```html
<div class="story-next" style="margin-top:0.6em;padding-top:0.5em;border-top:1px dashed #fff3;">
  <button id="btn-story-next" onclick="storyNext()">继续剧情 ▶</button>
</div>

<script>
(function () {
  // 从消息内容中解析场景索引（用 HTML 注释标记）
  function sceneIndexOf(msg) {
    const m = msg && /tavo-scene:(\d+)/.exec(msg.content || '');
    return m ? parseInt(m[1]) : 0;
  }

  window.storyNext = async () => {
    const cur = await tavo.message.current();
    // 从变量读取剧情场景列表（需预先用 tavo.set('storyScenes', [...]) 初始化）
    const scenes = tavo.get('storyScenes') || [];
    const next = sceneIndexOf(cur) + 1;
    const btn = document.getElementById('btn-story-next');
    if (next >= scenes.length) {
      if (btn) { btn.textContent = '剧终 🎬'; btn.disabled = true; }
      return;
    }
    if (btn) btn.disabled = true;

    // tavo.chat.update({ background })：切换聊天背景
    //   background.image：背景图 URL 或路径
    //   background.opacity：背景图不透明度（0~1）
    //   background.color：纯色背景（如 '#222222'）
    //   background.useAvatar：用当前角色头像做背景
    //   background = null：清除背景
    await tavo.chat.update({ background: { image: scenes[next].bg, opacity: 0.55 } });

    // tavo.message.append({ content })：追加一条用户消息
    // 用 HTML 注释标记场景索引，供下次解析
    await tavo.message.append({ content: `${scenes[next].text}\n\n<!--tavo-scene:${next}-->` });
  };

  // 末幕检测：把按钮改成「剧终」
  (async function () {
    const cur = await tavo.message.current();
    const scenes = tavo.get('storyScenes') || [];
    if (scenes.length && sceneIndexOf(cur) >= scenes.length - 1) {
      const btn = document.getElementById('btn-story-next');
      if (btn) { btn.textContent = '剧终 🎬'; btn.disabled = true; }
    }
  })();
})();
</script>
```

**初始化数据**（需在卡牌首次加载时用正则注入脚本设置）：

```javascript
// 在另一个正则注入脚本中初始化剧情场景
if (!tavo.get('storyScenes')) {
  tavo.set('storyScenes', [
    { text: '清晨，阳光洒进房间...', bg: '/path/to/morning.jpg' },
    { text: '午后的咖啡馆里...', bg: '/path/to/cafe.jpg' },
    { text: '夜幕降临，星空璀璨...', bg: '/path/to/night.jpg' },
  ]);
}
```

**要点**：
- `tavo.chat.update({ background: { image, opacity, color, useAvatar } })` 切换聊天背景
- `background: null` 清除背景
- `tavo.message.append({ content })` 追加消息，返回新消息 ID
- 用 HTML 注释 `<!--tavo-scene:N-->` 在消息内容中埋标记，下次渲染时解析出当前场景索引

---

## API 速查矩阵

| 范例 | 核心 API | 异步 | 返回值 |
|------|----------|------|--------|
| 角色卡生成器 | `tavo.generate` | ✅ | 生成文本字符串 |
| | `tavo.utils.export` | ❌ | 触发下载 |
| | `tavo.character.import` | ✅ | `{characterId, lorebookId, regexId}` |
| 一键隐藏消息 | `tavo.message.count` | ✅ | 消息总数 |
| | `tavo.message.find([0, n])` | ✅ | 消息数组 |
| | `tavo.message.update(msg)` | ✅ | 消息 ID 或 null |
| 引导式重摇 | `tavo.message.current` | ✅ | 当前消息对象 |
| | `tavo.message.find(0)` | ✅ | 消息数组（取 [0]） |
| | `tavo.generate(p, {context:true})` | ✅ | 生成文本 |
| | `tavo.get/set` | ❌（同步） | 值 / undefined |
| 插图生成器 | `tavo.utils.select` | ✅ | value 或 null |
| | `tavo.image.generate(prompt, opts)` | ✅ | dataUrl 或文件路径 |
| | `tavo.utils.preview` | ✅ | 预览大图 |
| 剧情背景 | `tavo.chat.update({background})` | ✅ | undefined |
| | `tavo.message.append({content})` | ✅ | 新消息 ID 或 null |
