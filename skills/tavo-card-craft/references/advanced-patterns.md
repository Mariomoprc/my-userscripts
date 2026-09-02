# 实战代码逻辑库（进阶模式参考）

> 本文件提供 12 个实战代码逻辑范式，进阶模式按需参考。每个范式包含问题、代码、要点。

## 目录

- [I.1 变量持久化面板](#i1-变量持久化面板)
- [I.2 多角色好感度管理](#i2-多角色好感度管理)
- [I.3 背包系统](#i3-背包系统)
- [I.4 战斗回合制](#i4-战斗回合制)
- [I.5 地图探索与随机事件](#i5-地图探索与随机事件)
- [I.6 商店交易](#i6-商店交易)
- [I.7 任务系统](#i7-任务系统)
- [I.8 图鉴收集](#i8-图鉴收集)
- [I.9 存档/读档](#i9-存档读档)
- [I.10 多结局判定](#i10-多结局判定)
- [I.11 动态生图集成](#i11-动态生图集成)
- [I.12 遮罩层完整模板](#i12-遮罩层完整模板)

---

## I.1 变量持久化面板

**问题**：数值需要跨会话保留。

```javascript
(function() {
  // 初始化（首次进入）
  if (tavo.get('drHp') == null) {
    tavo.set('drHp', 100);
    tavo.set('drMp', 50);
  }

  // 渲染面板
  function renderPanel() {
    const hp = tavo.get('drHp') ?? 100;   // 第二参数是 scope，不是默认值！默认值用 ??
    const mp = tavo.get('drMp') ?? 50;
    const panel = document.querySelector('.dr-panel');
    if (panel) {
      panel.innerHTML = `
        <div class="dr-hp">HP: ${hp}/100</div>
        <div class="dr-mp">MP: ${mp}/50</div>
      `;
    }
  }

  // 正则注入脚本每条消息都会执行，直接渲染即可（无需事件监听）
  renderPanel();
})();
```

**要点**：
- 变量名加前缀（`drHp` 不是 `hp`），避免和其他卡冲突
- `tavo.get` 第二参数是 **scope**（作用域），不是默认值；需要默认值用 `??`：`tavo.get('hp') ?? 100`
- 正则注入脚本每条消息渲染时都会执行，直接在脚本末尾调用 `renderPanel()` 即可自动刷新，无需 `onVarChange`（该 API 不存在）

---

## I.2 多角色好感度管理

**问题**：多个 NPC 各自独立好感度。

```javascript
(function() {
  const characters = ['alice', 'bob', 'carol'];

  // 初始化
  characters.forEach(name => {
    if (!tavo.get(`drAffinity_${name}`)) {
      tavo.set(`drAffinity_${name}`, 50);
    }
  });

  // 改变好感度
  window.drChangeAffinity = function(name, delta) {
    const current = tavo.get(`drAffinity_${name}`) ?? 50;  // 默认值用 ??，不是第二参数
    const next = Math.max(0, Math.min(100, current + delta));
    tavo.set(`drAffinity_${name}`, next);
    tavo.utils.toast(`${name} 好感度 ${delta > 0 ? '+' : ''}${delta}`);
  };

  // 渲染好感度列表
  window.drRenderAffinity = function() {
    const list = document.querySelector('.dr-affinity-list');
    if (!list) return;
    list.innerHTML = characters.map(name => {
      const val = tavo.get(`drAffinity_${name}`) ?? 50;
      return `<div class="dr-affinity-item">${name}: ${val}/100</div>`;
    }).join('');
  };
})();
```

**要点**：
- 变量名用 `drAffinity_${name}` 格式，一个角色一个变量
- 好感度限制 0-100，用 `Math.max/min` 钳制
- 函数挂 `window.drXxx`，HTML onclick 可调用

---

## I.3 背包系统

**问题**：物品的增删改查 + 持久化。

```javascript
(function() {
  if (!tavo.get('drInventory')) {
    tavo.set('drInventory', []);
  }

  window.drAddItem = function(item) {
    const inv = tavo.get('drInventory') ?? [];
    inv.push(item);
    tavo.set('drInventory', inv);
    tavo.utils.toast(`获得：${item.name}`);
  };

  window.drRemoveItem = function(itemId) {
    let inv = tavo.get('drInventory') ?? [];
    inv = inv.filter(i => i.id !== itemId);
    tavo.set('drInventory', inv);
  };

  window.drUseItem = function(itemId) {
    const inv = tavo.get('drInventory') ?? [];
    const item = inv.find(i => i.id === itemId);
    if (!item) return;
    // 应用效果
    if (item.effect === 'heal') {
      const hp = tavo.get('drHp') ?? 100;
      tavo.set('drHp', Math.min(100, hp + item.value));
    }
    drRemoveItem(itemId);
  };

  window.drRenderInventory = function() {
    const inv = tavo.get('drInventory') ?? [];
    const grid = document.querySelector('.dr-inventory');
    if (!grid) return;
    grid.innerHTML = inv.map(item => `
      <div class="dr-inv-slot" data-quality="${item.quality || 'common'}"
           onclick="drUseItem('${item.id}')">
        ${item.name}
      </div>
    `).join('');
  };
})();
```

**要点**：
- 物品用对象数组，每个有 id/name/quality/effect
- 增删改都通过 `tavo.set` 持久化
- 使用物品时应用效果再删除

---

## I.4 战斗回合制

**问题**：回合制战斗的状态机。

```javascript
(function() {
  // 战斗状态
  function getBattleState() {
    return tavo.get('drBattle', null);
  }

  window.drStartBattle = function(enemy) {
    tavo.set('drBattle', {
      enemy: enemy,
      enemyHp: enemy.hp,
      playerHp: tavo.get('drHp') ?? 100,
      turn: 1,
      log: []
    });
  };

  window.drBattleAction = function(action) {
    const battle = getBattleState();
    if (!battle) return;

    // 玩家行动
    if (action === 'attack') {
      const dmg = 10 + Math.floor(Math.random() * 10);
      battle.enemyHp -= dmg;
      battle.log.push(`你造成 ${dmg} 伤害`);
    } else if (action === 'defend') {
      battle.log.push('你进入防御姿态');
    }

    // 检查胜利
    if (battle.enemyHp <= 0) {
      battle.log.push('胜利！');
      tavo.set('drBattle', null);
      tavo.input.set('战斗胜利，获得经验'); tavo.input.send();
      return;
    }

    // 敌人反击
    const enemyDmg = battle.enemy.atk + Math.floor(Math.random() * 5);
    battle.playerHp -= enemyDmg;
    battle.log.push(`${battle.enemy.name} 造成 ${enemyDmg} 伤害`);

    // 检查失败
    if (battle.playerHp <= 0) {
      battle.log.push('你被击败了...');
      tavo.set('drBattle', null);
      tavo.set('drHp', 0);
      return;
    }

    battle.turn++;
    tavo.set('drBattle', battle);
    tavo.set('drHp', battle.playerHp);
  };
})();
```

**要点**：
- 战斗状态用对象存（enemy/enemyHp/playerHp/turn/log）
- 每回合：玩家行动 → 检查胜利 → 敌人反击 → 检查失败
- 战斗结束清空 `drBattle` 变量

---

## I.5 地图探索与随机事件

**问题**：网格地图移动 + 随机遭遇。

```javascript
(function() {
  // 地图状态
  if (!tavo.get('drMapPos')) {
    tavo.set('drMapPos', {x: 0, y: 0});
  }
  if (!tavo.get('drExplored')) {
    tavo.set('drExplored', []);
  }

  window.drMove = function(dx, dy) {
    const pos = tavo.get('drMapPos', {x:0, y:0});
    const newX = pos.x + dx;
    const newY = pos.y + dy;

    // 边界检查
    if (newX < 0 || newX >= 5 || newY < 0 || newY >= 4) {
      tavo.utils.toast('无法越过边界');
      return;
    }

    tavo.set('drMapPos', {x: newX, y: newY});

    // 记录探索
    const explored = tavo.get('drExplored') ?? [];
    const key = `${newX},${newY}`;
    if (!explored.includes(key)) {
      explored.push(key);
      tavo.set('drExplored', explored);
    }

    // 随机事件（30% 概率）
    if (Math.random() < 0.3) {
      const events = ['enemy', 'treasure', 'npc', 'trap'];
      const event = events[Math.floor(Math.random() * events.length)];
      tavo.input.set(`移动到 (${newX},${newY}); tavo.input.send()，遭遇：${event}`);
    }
  };
})();
```

**要点**：
- 位置用 `{x, y}` 对象存
- 已探索格子用数组存 `"x,y"` 字符串
- 移动后随机触发事件（30% 概率）

---

## I.6 商店交易

**问题**：买卖逻辑 + 金币管理。

```javascript
(function() {
  window.drBuy = function(itemName, price) {
    const gold = tavo.get('drGold') ?? 0;
    if (gold < price) {
      tavo.utils.toast('金币不足');
      return;
    }
    tavo.set('drGold', gold - price);
    drAddItem({id: Date.now(), name: itemName, quality: 'common'});
    tavo.utils.toast(`购买 ${itemName}，花费 ${price} 金币`);
  };

  window.drSell = function(itemId, price) {
    const inv = tavo.get('drInventory') ?? [];
    const item = inv.find(i => i.id === itemId);
    if (!item) return;
    const gold = tavo.get('drGold') ?? 0;
    tavo.set('drGold', gold + price);
    drRemoveItem(itemId);
    tavo.utils.toast(`出售 ${item.name}，获得 ${price} 金币`);
  };
})();
```

**要点**：
- 买：检查金币 → 扣金币 → 加物品
- 卖：找物品 → 加金币 → 删物品
- 用 `tavo.utils.toast` 反馈交易结果

---

## I.7 任务系统

**问题**：任务的接取/进行/完成。

```javascript
(function() {
  if (!tavo.get('drQuests')) {
    tavo.set('drQuests', []);
  }

  window.drAcceptQuest = function(quest) {
    const quests = tavo.get('drQuests') ?? [];
    quests.push({...quest, status: 'active', progress: 0});
    tavo.set('drQuests', quests);
  };

  window.drUpdateQuest = function(questId, progress) {
    const quests = tavo.get('drQuests') ?? [];
    const q = quests.find(q => q.id === questId);
    if (q) {
      q.progress = progress;
      if (progress >= q.target) {
        q.status = 'completed';
        tavo.utils.toast(`任务完成：${q.name}`);
      }
      tavo.set('drQuests', quests);
    }
  };

  window.drRenderQuests = function() {
    const quests = tavo.get('drQuests') ?? [];
    const panel = document.querySelector('.dr-quest-panel');
    if (!panel) return;
    panel.innerHTML = quests.map(q => `
      <div class="dr-quest ${q.status}">
        <div class="dr-quest-name">${q.name}</div>
        <div class="dr-quest-progress">${q.progress}/${q.target}</div>
      </div>
    `).join('');
  };
})();
```

**要点**：
- 任务用对象数组，每个有 id/name/target/progress/status
- status: active/completed/failed
- 进度达到 target 自动标记完成

---

## I.8 图鉴收集

**问题**：收集进度 + 未收集显示。

```javascript
(function() {
  if (!tavo.get('drPokedex')) {
    tavo.set('drPokedex', {});
  }

  window.drDiscover = function(creature) {
    const dex = tavo.get('drPokedex') ?? {};
    if (!dex[creature.id]) {
      dex[creature.id] = {
        name: creature.name,
        discoveredAt: Date.now(),
        count: 1
      };
      tavo.utils.toast(`新发现：${creature.name}`);
    } else {
      dex[creature.id].count++;
    }
    tavo.set('drPokedex', dex);
  };

  window.drRenderPokedex = function(allCreatures) {
    const dex = tavo.get('drPokedex') ?? {};
    const panel = document.querySelector('.dr-pokedex');
    if (!panel) return;
    panel.innerHTML = allCreatures.map(c => {
      const entry = dex[c.id];
      if (entry) {
        return `<div class="dr-dex-entry discovered">
          <div class="dr-dex-name">${entry.name}</div>
          <div class="dr-dex-count">×${entry.count}</div>
        </div>`;
      } else {
        return `<div class="dr-dex-entry undiscovered">
          <div class="dr-dex-name">???</div>
        </div>`;
      }
    }).join('');
  };
})();
```

**要点**：
- 图鉴用对象存，key 是 creature id
- 未收集显示 `???`，收集后显示名字和数量
- 首次发现用 `showToast` 提示

---

## I.9 存档/读档

**问题**：完整状态存档/读档。

```javascript
(function() {
  window.drSave = function(slot) {
    const saveData = {
      hp: tavo.get('drHp'),
      mp: tavo.get('drMp'),
      gold: tavo.get('drGold'),
      inventory: tavo.get('drInventory'),
      quests: tavo.get('drQuests'),
      mapPos: tavo.get('drMapPos'),
      timestamp: Date.now()
    };
    await tavo.file.save(`save_${slot}.json`, JSON.stringify(saveData));  // file.save 是异步的
    tavo.utils.toast(`已保存到存档 ${slot}`);
  };

  window.drLoad = async function(slot) {
    try {
      const data = await tavo.file.load(`save_${slot}.json`);  // file.load，不是 loadFile
      if (!data) { tavo.utils.toast('存档不存在'); return; }
      const save = JSON.parse(data);
      Object.keys(save).forEach(key => {
        if (key !== 'timestamp') {
          tavo.set(`dr${key.charAt(0).toUpperCase()}${key.slice(1)}`, save[key]);
        }
      });
      tavo.utils.toast(`已读取存档 ${slot}`);
    } catch (e) {
      tavo.utils.toast('存档读取失败');
    }
  };
})();
```

**要点**：
- 存档：收集所有变量 → 序列化 → `await tavo.file.save`（异步，需 await）
- 读档：`await tavo.file.load` → 反序列化 → 逐个 `tavo.set`（不是 `loadFile` / `setVar`）
- 支持多存档槽（slot 参数）

---

## I.10 多结局判定

**问题**：根据多变量组合判定结局。

```javascript
(function() {
  window.drCheckEnding = function() {
    const hp = tavo.get('drHp') ?? 0;                    // 默认值用 ??，不是第二参数
    const affinity = tavo.get('drAffinity_alice') ?? 0;
    const gold = tavo.get('drGold') ?? 0;
    const days = tavo.get('drDays') ?? 0;

    // 结局判定（按优先级）
    if (hp <= 0) return {id: 'death', name: '死亡结局', desc: '你倒下了...'};
    if (days >= 30 && affinity >= 80) return {id: 'love', name: '真爱结局', desc: '与 Alice 共度余生'};
    if (days >= 30 && gold >= 1000) return {id: 'rich', name: '富贵结局', desc: '富甲一方'};
    if (days >= 30) return {id: 'normal', name: '平凡结局', desc: '平淡度日'};
    return null;  // 未达结局条件
  };

  window.drTriggerEnding = function() {
    const ending = drCheckEnding();
    if (ending) {
      tavo.input.set(`【${ending.name}】${ending.desc}`); tavo.input.send();
      // 清空存档，准备重玩（用 unset，不是 set null）
      tavo.unset('drHp');
      tavo.unset('drAffinity_alice');
    }
  };
})();
```

**要点**：
- 结局按优先级判定（死亡 > 真爱 > 富贵 > 平凡）
- 触发结局后用 `tavo.unset` 清空相关变量（不是 `tavo.set(name, null)`），准备重玩
- 未达条件返回 null，继续游戏

---

## I.11 动态生图集成

**问题**：根据场景动态生成配图。

```javascript
(function() {
  window.drGenerateSceneImage = async function(sceneDesc) {
    try {
      const prompt = `anime style, ${sceneDesc}, detailed background`;
      // 第一个参数是 prompt 字符串，第二个是 options 对象
      const dataUrl = await tavo.image.generate(prompt, {
        size: '1024x1024',           // OpenAI 系平台用 size
        // aspectRatio: '16:9',      // 支持宽高比的平台用 aspectRatio
        negativePrompt: 'low quality, blurry',
      });
      // 返回值是 dataUrl 字符串（或 saveAs 时的路径），不是 {url}
      if (dataUrl) {
        const imgEl = document.querySelector('.dr-scene-image');
        if (imgEl) imgEl.src = dataUrl;
      }
    } catch (e) {
      console.warn('生图失败', e);
    }
  };

  // 注意：tavo.event.on 监听的是事件名（如 'message_rendered'），不是变量名。
  // 变量变化监听（onVarChange）不存在。如需自动触发，可在正则注入脚本里
  // 每次渲染时检查场景是否变化，变化才生图：
  let lastScene = null;
  function checkSceneChange() {
    const cur = tavo.get('drCurrentScene');
    if (cur && cur !== lastScene) {
      lastScene = cur;
      drGenerateSceneImage(cur);
    }
  }
  checkSceneChange();  // 每条消息渲染时检查
})();
```

**要点**：
- 生图是异步的，用 async/await；`tavo.image.generate` 第一个参数是 prompt 字符串
- 失败要 try-catch，不能让生图失败影响主流程
- 变量变化监听（`onVarChange`）不存在；正则注入脚本每条消息都执行，可在其中比较变量旧值实现"变化才触发"

---

## I.12 遮罩层完整模板

**问题**：完整的遮罩层模板（含 10 铁律）。

```javascript
(function() {
  const PREFIX = 'dr';
  const topWin = window.top || window;
  const topDoc = topWin.document;

  // Era counter（铁律 10）
  topWin.__eraCounter = (topWin.__eraCounter || 0) + 1;
  const myEra = topWin.__eraCounter;

  let overlay = null;
  let lastSigil = null;

  function createOverlay() {
    if (overlay) return overlay;

    overlay = topDoc.createElement('div');
    overlay.className = `${PREFIX}-overlay`;
    overlay.style.cssText = `
      position: fixed !important;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 2147483647;
      display: none;
      background: rgba(0,0,0,0.8);
    `;

    const content = topDoc.createElement('div');
    content.className = `${PREFIX}-overlay-content`;
    content.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a2e;
      padding: 20px;
      border-radius: 12px;
      max-width: 90%; max-height: 90%;
      overflow-y: auto;
    `;

    overlay.appendChild(content);
    topDoc.body.appendChild(overlay);  // 铁律 1：挂顶层

    // 事件委托（铁律 7）
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
      const btn = e.target.closest(`.${PREFIX}-overlay-btn`);
      if (btn) {
        const action = btn.getAttribute('data-action');
        handleAction(action);
      }
    });

    return overlay;
  }

  function showOverlay(html) {
    const ov = createOverlay();
    const content = ov.querySelector(`.${PREFIX}-overlay-content`);
    content.innerHTML = html;
    ov.style.display = 'block';
  }

  function handleAction(action) {
    // 处理按钮动作
    tavo.input.set(action); tavo.input.send();
    overlay.style.display = 'none';
  }

  // 轮询 + Observer（铁律 8）
  function refresh() {
    if (topWin.__eraCounter !== myEra) return;  // 旧 era 退出

    const trigger = topDoc.querySelector(`.${PREFIX}-overlay-trigger`);
    if (trigger) {
      const sigil = trigger.getAttribute('data-sigil');
      if (sigil !== lastSigil) {  // sigil 去重
        lastSigil = sigil;
        const content = trigger.getAttribute('data-content');
        showOverlay(content);
      }
    }
  }

  setInterval(refresh, 1000);

  const observer = new MutationObserver(refresh);
  observer.observe(topDoc.body, {childList: true, subtree: true});

  // 暴露 API
  topWin[`${PREFIX}ShowOverlay`] = showOverlay;
  topWin[`${PREFIX}HideOverlay`] = () => {
    if (overlay) overlay.style.display = 'none';
  };
})();
```

**要点**：
- 包含铁律 1（挂顶层）、3（IIFE）、4（最大 z-index）、7（事件委托）、8（双引擎）、10（era counter）
- sigil 去重避免重复渲染
- 暴露 `drShowOverlay` / `drHideOverlay` 给 HTML 调用
