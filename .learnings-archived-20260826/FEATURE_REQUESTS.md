## FR-20260725-002 plugin-button-resilience

**Logged**: 2026-07-25T09:30:00+08:00
**Priority**: high
**Status**: completed

### Summary
Tavo 重建 UI 后工具栏按钮消失，需要多层恢复机制确保按钮稳定存在。

### Details
action bar 重建后子元素不足，`children.length >= 2` 条件不满足。通过 `findActionBar()` 两层回退 + 每帧 `checkButton` + `setInterval` 2s + `MutationObserver` 组合解决。

### Resolution
更新 plugin-dev.md 和 common-errors.md 中的 injectBtn 示例。CYOA v1.9.9 & Panel v4.3.3 已实装。

### Metadata
- Source: conversation
- Tags: tavo, plugin, button-injection
- Plugin: com.cyoa.choices, com.relationship.panel

## FR-20260725-001 plugin-CSS-centering-and-drag

**Logged**: 2026-07-25T09:30:00+08:00
**Priority**: medium
**Status**: completed

### Summary
剧情选择器插件面板用 CSS 居中替代 JS 计算居中，确保手机/平板跨设备适配。

### Details
用户反馈面板在手机竖屏上不居中。改用纯 CSS `top:50%; left:50%; transform:translate(-50%,-50%)` 后跨设备一致。

### Resolution
在 plugin-dev.md 中更新「模式4：浮动面板」示例，增加 CSS 居中 + 拖动转换的完整实现。CYOA v1.9.9 已实装。

### Metadata
- Source: conversation
- Tags: tavo, plugin, panel, centering
- Plugin: com.cyoa.choices

## FR-20260725-003 userscript-auto-repair

**Logged**: 2026-07-25T09:50:00+08:00
**Priority**: low
**Status**: declined

### Summary
用户希望浏览器脚本在网站更新失效时能自动修复（自愈能力）。经讨论认为技术难度过高，放弃。

### Details
用户希望实现四级自愈：
1. 脚本内置自愈逻辑 — 监测 DOM 变化自动适配
2. 失效时自动检测 + 通知用户
3. 自动从 GitHub 拉取最新版本替换

经分析，脚本失效的根因是网站 DOM 结构/选择器变化，每类脚本的失效模式不同，无法通用化。全自动修复需要针对每个靶网站做适配，相当于维护一套网站变更追踪系统，成本远超收益。

### Resolution
放弃。标记为 declined，未来如果有更成熟的方案（如 AI 驱动的 DOM 适配）可重新考虑。

### Metadata
- Source: conversation
- Tags: userscript, self-healing, auto-repair
- Related Skill: userscript

## [FRQ-20260802-002] pz-touchpad-combat-mod-cancelled

**Logged**: 2026-08-02T12:15:00+08:00
**Priority**: low
**Status**: cancelled
**Area**: project-zomboid

### Summary
用户要求自研 PZ B42 触控板/纯键盘操作辅助 mod（一键攻击、瞄准切换、自动奔跑、键盘导航菜单等），调研后发现原版 Toggle Aim + Toggle Run/Sprint 已全覆盖，取消开发。

### Details
- 曾计划功能：一键攻击、瞄准模式切换（Tab/Ctrl）、自动奔跑、目标指示器、键盘导航右键菜单、自动拾取等约 24 项。
- 调研关键发现：PZ 原版 Options → Key Bindings 有 "Toggle LCONTROL key to Aim"（切换瞄准，等效按住 RMB）；"Toggle Run to Jog" / "Toggle Sprint to Sprint"（奔跑切换）。
- 结论：先查原版功能，避免重复造轮子。

### Suggested Action
已取消。未来若用户再提触控板需求，先引用原版 Toggle 设置，再评估是否真缺功能。

### Metadata
- Source: conversation
- Tags: project-zomboid, mod, touchpad, cancelled, vanilla-feature
- Related Skill: N/A
- Related Doc: docs/project-zomboid.md

---

## [FRQ-20260803-003] pz-mod-recommendation-html-with-links

**Logged**: 2026-08-03T00:35:00+08:00
**Priority**: medium
**Status**: done
**Area**: project-zomboid

### Summary
用户要求把小黑盒《僵毁B42.14 MOD推荐》帖子的 77 个 mod 整理成带创意工坊跳转链接的清单页面。

### Details
- 原帖每个 mod 只有"介绍+图片"，图片里有 mod 英文名但没有链接
- 用户需求：保持"介绍+图片"格式，mod 名称变成可点击的创意工坊链接，浏览器打开
- 已实现：抓取帖子 → OCR 识别名称 → 合集《丸布了》ID 匹配 → 生成 HTML → 浏览器打开
- 最终产物：`C:\Users\pass\AppData\Local\Temp\opencode\pz_mods\mod推荐清单.html`（77 mod + 94 链接 + 99 图）

### Suggested Action
已完成。后续类似需求（批量整理 mod 清单带链接）可复用此流程：合集匹配 > OCR 名称辅助 > Exa 补缺。

### Metadata
- Source: conversation
- Tags: project-zomboid, mod-list, html, workshop-links, scraping
- Related Skill: agent-reach
- Related Doc: docs/project-zomboid.md

---

## [FR-20260804-001] pz-custom-proximity-mods

**Logged**: 2026-08-04T06:10:00+08:00
**Priority**: medium
**Status**: done
**Area**: project-zomboid

### Summary
用户要求自写 B42 本地 mod 解决现成 mod 缺口：感应灯（人在附近亮）、自动关窗/窗帘、AutoEat B41 移植。已完成 3 个本地 mod。

### Details
- **AutoLightsProximity**：玩家 ±半径内 IsoLightSwitch 自动开灯，离开延时关灯，全天感应（用户拉窗帘场景），ModOptions 可调半径/延时/昼夜
- **AutoCloseWindowsProximity**：玩家靠近拉窗帘（ToggleDoorSilent），离开延时关窗（ToggleWindow），窗+门都有 HasCurtains
- **AutoEatB42**：B41 AutoEat (2977628726) 移植，修正 ISCraftAction:new 签名（B42 去掉 getTimeToMake 参数）
- 全部在 `Zomboid\mods\<name>\common\`，已加入 default.txt

### Suggested Action
后续用户要求"做一个 X mod"时复用此流程：API 研究（对照原版 Lua）→ Python 语法检查 → default.txt 启用 → 游戏内验证

### Metadata
- Source: conversation
- Tags: project-zomboid, custom-mod, proximity, auto-eat
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md

---
## [FR-20260805-001] msr-shop-sellall-configurable

**Logged**: 2026-08-05T10:45:00+08:00
**Priority**: high
**Status**: done
**Area**: config

### Summary
避难所商店（myspatialrefuge_shop 3711250417）一键出售可配置：参考 AutoLoot（3392699932）的自选物品系统，支持分类自选、保存、兑换比例、批量数量自定义。

### Details
- 需求：把不需要的没作用物品（脏衣服、空容器、眼镜、纸质垃圾、破损物、银/金饰品扩展等）放进一键出售，可直接全部拾取后一键卖；且像 AutoLoot 一样可自选分类、可保存
- 追加需求：兑换比例也进设置（每个分类多少核心/多少个换一次）
- 已实现：24 个出售分类（新增脏布条/碎玻璃/无用材料/用过的医疗品/塑料袋/一次性杯子/古龙水 + 原 17 分类），配置存 Zomboid\MSR_ShopSellConfig.ini（格式 分类id:启用:核心:批量），设置面板（MSR_ShopSellConfigUI）支持勾选/调节/全部启用禁用/恢复默认/保存
- 参考模式：AutoLoot 的 AutoLoot_ini.lua（getFileWriter/readFileWrite） + AutoLoot_ConfigManager.lua（preset 保存）

### Suggested Action
后续如需给 mod 加"可配置系统"，直接复用本方案：INI 文件 + shared/ 配置模块 + client/ 设置面板 + 数据层 override。AutoLoot 的 INI preset 模式（AutoLoot_<name>.ini + 注册文件）可作为多预设扩展。

### Metadata
- Source: conversation
- Tags: project-zomboid, shop-mod, sellall, config, autoloot
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md

## [FR-20260805-002] shop-mod-typefilter-sell-all

**Logged**: 2026-08-05T11:58:00+08:00
**Priority**: medium
**Status**: cancelled
**Area**: config

### Summary
曾计划把 AutoLoot（3392699932）的物品列表"1:1 搬到"商店 mod 一键出售：实现 typeFilter 引擎类型动态过滤（Weapon/WeaponPart/Literature/Drainable/AlarmClockClothing 5 类）。

### Details
- 用户先确认"1:1还原"，方案设计完成：扩展 sell 条目加 typeFilter 字段 + 新增 3 个辅助函数（getItemsByTypeFilter/getTotalCountByTypeFilter/removeByTypeFilter）+ 5 个新分类 + 修改 sellAllItems/handleSellAll + 更新配置/翻译
- **随后用户改变主意**："把我这个删掉吧 我还是使用原版吧"——决定放弃所有本地修改，恢复使用原版商店 mod，本地修改版已删除、原版已恢复
- 结果：FR 取消，typeFilter 方案未实施。ShopData 已回原版（无 sellCategoryId），SellConfig 文件已清理

### Suggested Action
若未来又想给商店加"按类型一键出售"，本方案可用：sell 条目支持 typeFilter = 引擎类型字符串，运行时 getScriptManager():getAllItems() + item:getTypeString() 动态匹配（AutoLoot 的 AutoLoot_isDefaultSelection 范式）。但用户当前明确要原版，勿主动重做。

### Metadata
- Source: conversation
- Tags: project-zomboid, shop-mod, sellall, typefilter, cancelled
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md


## [FR-20260805-003] autoloot-move-pickup-patch

**Logged**: 2026-08-05T21:30:00+08:00
**Priority**: high
**Status**: implemented
**Area**: config

### Summary
用户请求：AutoLoot 自动拾取"路过漏捡"问题——开启全部拾取后每次路过不知道柜子还有没有东西，好几次发现有东西没捡干净。需要"移动中自动拾取 + 扩展范围 + 剩余物品提示"补丁，且不改 AutoLoot 源码。

### Details
- 背景：AutoLoot 只在站定时拾取（LRN-20260805-033），路过不停必然漏
- 需求拆解（用户确认）：1) 移动中低频自动拾取；2) 路过提示"此柜还有可拾取物品"；3) 扩大扫描半径（默认 2 格=5x5）
- 实施：本地 mod **AutoLootPickupPatch**（`Zomboid\mods\AutoLootPickupPatch\`，ModOptions ID `ALPP`）
  - `movePickup`（tickbox，默认 true）：移动中每 `moveInterval` ms（500-3000，默认 1500）调 `AutoLoot.PlunderSquare` 扫 `scanRadius`（1-3，默认 2=5x5）
  - `notify`（tickbox，默认 true）+ `notifyCooldown`（3-60s，默认 10）：容器仍有 `isItemSelectedForAutoDrop` 物品时屏幕 toast（`getTextManager():DrawStringCentre`，6s 消退）
  - 自定义 `getExpandedSquares` 替代 `AutoDrop_getReachableSquares`（扩展半径+保留 isBlockedTo 墙阻挡）
  - 所有选项名/tooltip 中文（fallback 直接写中文，不依赖翻译表）
  - 已启用：default.txt 加 `mod = AutoLootPickupPatch,`
- 关联 mod：Dynamic Backpack Upgrades（2996978365）补格子、NoWeightB42 补重量，组合成"走到哪扫到哪+无限负重"

### Suggested Action
已实现并验证（lupa 逻辑测试：25/49 格拾取正确、节流生效、notify 触发）。后续若用户反馈卡顿：调低 scanRadius 到 1 或调大 moveInterval；若漏：调小 moveInterval 到 500。

### Metadata
- Source: conversation
- Tags: project-zomboid, autoloot, patch, feature
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md

## [FR-20260805-004] msr-shop-arbitrary-item-sell

**Logged**: 2026-08-05T14:00:00+08:00
**Priority**: high
**Status**: implemented
**Area**: config

### Summary
用户请求：给避难所商店扩展加"任意物品出售"——AutoLoot 全部自动拾取后，把不需要的物品（垃圾/杂物等）卖成奇异核心。要求补丁形式（本地 mod 而非改 Workshop 文件）+ 设置面板可调 + 单机 + 任意地点可卖。已实现为本地 mod MSR_ShopPatch。

### Details
- 需求来源：AutoLoot（3392699932）自动拾取全部物品后，商店扩展（3711250417）原版只能卖固定 6 类（碎布/钱/股票/金银饰品），其余物品卖不掉
- 用户确认的交互方式：**右键菜单出售 + 背包框选批量出售**（PZ 原生框选/Ctrl+Click/Ctrl+A），未选商店面板方案
- 定价"按原版设定"：PZ 无原生 sell value，用 getDisplayCategory（87 类）+ 重量 + 磨损折价
- 实施（本地 mod Zomboid\mods\MSR_ShopPatch\）：
  - MSR_ShopPatch_Pricing.lua（shared）：DEFAULT_PRICING 分类倍率表 + getItemCoreValue + 滑块覆盖
  - MSR_ShopPatch_Main.lua（client）：注入 MSR.ShopData.sellAnyItems（isOwnedByPlayer 校验 + container:Remove + 主背包 AddItem MagicalCore）
  - MSR_ShopPatch_Context.lua（client）：OnFillInventoryObjectContextMenu 加"出售到商店（N 件，约 X 核心）"
  - MSR_ShopPatch_Button.lua（client）：ISInventoryWindowControlHandler 底部"出售"按钮（有选中才显示）
  - MSR_ShopPatch_ModOptions.lua（client）：PZAPI.ModOptions 全局倍率 + 各分类倍率滑块 + 两入口开关
  - default.txt 加 mod = MSR_ShopPatch,（在 myspatialrefuge_shop 后）
- lupa 验证：语法 5 文件通过 + 定价单测（Junk/Weapon/磨损/滑块覆盖/全局倍率）+ 真实 sellAnyItems（2 卖 1 跳）

### Suggested Action
已完成。后续若用户反馈定价不合理：调滑块即可（无需改码）。如需商店面板也显示任意出售项，可在 getSellItems override 中追加动态项（代码已留注释模板）。

### Metadata
- Source: conversation
- Tags: project-zomboid, shop-mod, sell, patch, local-mod, feature
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md

## [FR-20260805-005] dbu-infinite-capacity-and-ms-carryweight-zero

**Logged**: 2026-08-05T22:10:00+08:00
**Priority**: high
**Status**: implemented
**Area**: project-zomboid

### Summary
用户需求：1) Dynamic Backpack Upgrades 加补丁实现"进游戏直接无限容量"（不用逐个制作升级件）；2) NoWeightB42 后 Modern Status 负重图标仍报负重，希望图标不报。均已完成（DBUInfinitePatch + MSCarryWeightZeroPatch）。

### Details
- **DBUInfinitePatch**（`Zomboid\mods\DBUInfinitePatch\`，ModOptions ID DBUP）：override `DBU.GetUpgradedStats` 返回 cap*N（slider 2-50，默认 10）→ 所有容器容量直接×10（书包 15→150）；override `DBU.RestoreBagStats` 加 nil 保护；OnPlayerUpdate 每 5s 脏检查 setCapacity；修复 ERR-20260805-013
- **MSCarryWeightZeroPatch**（`Zomboid\mods\MSCarryWeightZeroPatch\`，ModOptions ID MSCZ）：override `MS_PlayerStatus.Get.CarryWeightData` 返回 weight=0/visualRatio=0（开关默认 true），配合 NoWeightB42 负重图标恒空
- 两者都中文选项、纯 Lua、不碰原 mod 源码、已 lupa 验证、已写入 default.txt

### Suggested Action
已完成。若用户后续要原版 HUD 负重条也隐藏：需 hideEncumbrance 类 mod（B42 引擎 getCapacityWeight 含 size，Lua 不可改）；若 ×10 不够可调 DBUP slider。

### Metadata
- Source: conversation
- Tags: project-zomboid, dbu, modern-status, infinite, capacity, feature
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md


## [FR-20260805-006] autoloot-container-visual-feedback

**Logged**: 2026-08-05T23:40:00+08:00
**Priority**: medium
**Status**: implemented
**Area**: project-zomboid

### Summary
用户反馈 AutoLoot 自动拾取时无法知道哪些容器已拾取、拾取了什么。抱怨：显示拾取图标太慢（逐个 1s/个，大量拾取等很久）、封闭容器无视觉变化。

### Details
- 问题：封闭柜子被拾取后无视觉变化（尸体/货架可见物品消失，柜子看不到）；Display loot icon 1s/个太慢
- 参考 mod：Open All Containers（3465040406，打开容器看内容）、Proximity Inventory（2847184718，集中展示附近容器）
- 已实现（AutoLoot_Feedback.lua）：1) 容器上方浮动文字（物品名+数量合并，3s 淡出，多容器并发）2) addGridSquareMarker 绿色圆点标记 30s 3) DisplayLooted 时间 1000->300ms 4) 容器反馈独立于 displayLootIcon 滑块
- 用户确认：容器反馈 + 物品反馈两者都要

### Metadata
- Source: conversation
- Tags: project-zomboid, autoloot, feedback, visual, container, feature
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md


## [FR-20260807-007] simplify-plugins-keep-only-infinite-weight-slots

**Logged**: 2026-08-07T14:50:00+08:00
**Priority**: medium
**Status**: completed

### Summary
用户对 AutoEverything 商店核心显示/出售机制 + 多个负重/格数插件叠加感到困惑，希望只保留"无限负重 + 无限格数"两个核心能力，减少插件数量。

### Details
- 用户原话："我只是需要它的一个无限负重和无限格数的这样一个功能"。三个 mod 分工：NoWeightB42（负重=0）、DBU+DBUP（格数×10）、AutoLoot（自动拾取，含"无视超重"选项）——用户担心三者冲突导致无法实现无限负重/格数。
- 实际验证：三者不冲突、互补。DBUP 只依赖 DBU 的 `DBU.GetUpgradedStats`；NoWeightB42 只改脚本层；AutoLoot 的负重选项仅影响拾取时机。
- 已解决：新增 `AEV_ZeroWeight.lua`（补丁专区，默认开，每 3s 运行时清零所有物品重量），彻底解决旧物品不清零导致的超重——NoWeightB42 只管脚本、不管已实例化物品。

### Resolution
AEV_ZeroWeight.lua 已实现并验证（lupa 平衡检查 + 翻译键 + MODULES.md 同步）。商店核心机制保留原样（核心显示 0 因玩家从未出售过物品，属正常）。

### Metadata
- Source: conversation
- Tags: project-zomboid, autoeverything, infinite-weight, simplify
- Related Skill: steam-tools
- Related Doc: docs/project-zomboid.md, AutoEverything/MODULES.md

## [FR-20260808-001] xfltd-reality-nodes-auto-select-blocked

**Logged**: 2026-08-08T13:45:00+08:00
**Priority**: medium
**Status**: blocked
**Area**: config

### Summary
XFLTD reality 节点无法显示延迟（url-test 测延迟全部 timeout），导致不能放进自动选择组。

### Details
- 实际转发：20/20 节点全部 200 成功
- delay API：file provider 节点返回 404（不在顶层 proxies 注册）
- url-test group delay：`all proxies timeout`
- 根因：mihomo 对 reality 节点在 url-test/delay 测试路径下的握手行为与实际流量转发不同

### Blocked By
mihomo 内部行为差异，非节点故障，非配置可解

### Metadata
- Source: conversation
- Tags: xfltd, reality, delay, url-test, health-check


## [FEAT-20260812-001] local-uncensored-model-and-web-search

**Logged**: 2026-08-12T18:57:59Z
**Priority**: medium
**Status**: done
**Area**: backend

### Summary
本地应急 AI 模型要无审查（abliterated）+ 联网搜索补知识盲区 + 可选生图。

### Details
- 需求1：本地模型无审查，能讨论任意问题（不拒答"我无法..."）→ 用 huihui-ai abliterated 版解决。
- 需求2：模型知识库旧，需要联网搜索补知识 → Open WebUI 的 Tavily Web 搜索解决（前端注入结果）。
- 需求3：本地生图（SDXL + ComfyUI）预留 → Open WebUI IMAGE_GENERATION_ENGINE 支持，将来装 ComfyUI 接上。
- 需求4：服务托盘化（像 opencode 4096 一样托盘图标、退出停服务、不弹终端）→ 已实现。
- 需求5：手机访问 → 局域网 http://192.168.3.53:3000 或 Tailscale http://100.71.42.119:3000。

### Suggested Action
已实现，生图（SDXL+ComfyUI）留待下轮部署。

### Metadata
- Source: conversation
- Tags: local-ai, uncensored, web-search, image-gen, openwebui
## [FR-20260814-008] 本地 LLM 与生图 MCP 同时使用

**Logged**: 2026-08-14T20:20:00+08:00
**Priority**: medium
**Status**: done
**Area**: infra

### Summary
用户希望本地大模型（agent）与生图 MCP 能同时使用。已实测验证：qwen3.6:27b（16GB）+ ComfyUI 生图（峰值 2.14GB）可共存，74s 正常出图，无需调 Shared GPU Memory Override。但 27b 因内存负担已被删除，当前 9b + 生图共存无压力。

### Details
- 需求：qwen3.6:27b 和生图需要同时使用
- 探索：NPU 协助（不支持，上限 15.1GB 只支持 ≤7B）、Shared GPU Memory Override（实测不需要）、llama.cpp 部分 offload（用户否决，速度损失大）
- 最终：实测生图峰值仅 2.14GB，与 16GB 的 27b 共存成功；后续 27b 删除后此问题自然解决
- 沉淀：ComfyUI 生图 + 本地 9b 模型可长期共存

### Suggested Action
无需开发；如未来再配大本地模型，参考 LRN-20260814-147 的共存实测方法

### Metadata
- Source: conversation
- Tags: local-llm, comfyui, coexist, vram
- Related Doc: docs/comfyui-image-gen.md
