# LearningsCorrections, insights, and knowledge gaps captured during development.**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260806-059] best_practice**Logged**:  2026-08-06T09:38:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### SummaryWindows 图标缓存硬清理：`ie4uinit.exe -show` / `-ClearIconCache` 常不够；可靠做法 = 结束 explorer → 删 `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db` → 重启 explorer。### Details- 结束 explorer 释放文件锁定后删除 iconcache_*.db（含 iconcache_idx/custom_stream 等），再 `Start-Process explorer`- 改 .ico 内容/路径后旧图标顽固时用此方法### Suggested Action已用此方法清理（配合删除重建 .lnk 强制重读）。### Metadata- Source: conversation- Tags: windows, icon-cache, explorer- Related Skill: opencode-maintenance





---

## [LRN-20260806-060] best_practice**Logged**:  2026-08-06T09:40:00+08:00**Priority**:  low**Status**:  done**Area**:  config### Summary验证 opencode serve/web 认证最简方法：curl 健康检查端点 `/global/health`，无密码 401、带密码 200。### Details```powershell$env:OPENCODE_SERVER_PASSWORD = 'xxx'curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/healthcurl.exe -s -u 'opencode:xxx' -o NUL -w "%{http_code}" http://127.0.0.1:4096/global/health```### Suggested Action部署后按此验证密码生效。### Metadata- Source: conversation- Tags: opencode, curl, auth, health- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-055] aev-autonav-optimizations-3**Logged**:  2026-08-07T00:05:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAEV_AutoNav 第三轮优化：街道图缓存复用、手动转向暂停提示、清理 default.txt 全部失效 mod 引用、到达自动清理、小地图玩家标记。### Details- **街道图缓存（优化1）**：`AEV_AutoNav.streetGraphCache[sig]` 按 getStreetSig 复用 buildStreetGraph 结果，同一 sig 不重复构建（测试用包装 buildStreetGraph 计数验证）。⚠️ 测试坑：两个 mock 街道（_streets/_streetsD）计数相同 sig="2:2" 但内容不同，会命中错误缓存 → 换街道数据前须清 `streetGraphCache`。- **手动转向暂停（优化2）**：`isManualDriving(vehicle)` = `getCurrentSteering()` 绝对值 >0.1；`shouldPauseHints()` = `now < _manualUntil`（手动后 2s 暂停）。driveTick 提示块开头更新 `_manualUntil`。- **default.txt 全清（优化3）**：除 twistminimap 外，ModManager/CleanUI/drivestraight/SandboxSettings/RebalancedPropMoving 在所有 mod 目录（workshop/本地/游戏内）都不存在 = 失效引用（取消订阅残留），已删。保留 13 个有效 mod。- **到达清理（优化4）**：Drive driveTick 距目的地 <2 格 → `setRegulator(false)`+`setRegulatorSpeed(0)`+`clearDestination()`。`clearDestination` 补清 `routeCacheStart/Dest/Sig`（避免残留缓存命中）。Walk 到达已走 clearDestination。- **小地图玩家标记（优化5）**：`renderMiniMapPlayer` 用 `worldToUIX/Y` 转玩家坐标画十字（2 条 DrawLine）。hook prerender 一并调用。- **lupa 断言坑**：`lua.eval("_linesDrawn or 0 > 0")` 中 lua `or` 优先级 = `_linesDrawn or (0>0)`，返回 2 时 python `2 == True` 失败 → 必须写 `(_linesDrawn or 0) > 0`。### Suggested Action- 可进一步：手动转向暂停用 `getCurrentSteering` 阈值可调（当前硬编码 0.1）。- Drive 到达后若玩家继续开，巡航已关；可加「一键重设最近目的地」快捷键。### Metadata- Source: conversation- Tags: project-zomboid, autonav, cache, steering, default-txt, minimap- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-056] aev-autonav-logging-and-polish**Logged**:  2026-08-07T00:15:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAEV_AutoNav 加入统一日志系统（维护友好）+ 巡航速度平滑 + 驾驶中步行守卫 + 街道图构建耗时监控。为后续维护提供可排查日志。### Details- **统一日志（优化A）**：Core 加 `AEV_AutoNav.log(msg)`（`[AEV_AutoNav] (时间戳) msg`）+ `debugEnabled()`（读 `AEV_AutoNav_Debug` 选项，默认开）。全部模块 print 替换为 `AEV_AutoNav.log`（ModOptions 的注册 print 保留——它在 Core 前可能加载，无共享 log）。ModOptions 新增「调试」分类 + `AEV_AutoNav_Debug` 开关 + 翻译键。- **巡航速度平滑（优化B）**：`nextCruiseSpeed(vehicle, target)` 每步 ±2 km/h 渐进；首次启用巡航直接设目标，之后 tick 渐进（避免急加速）。- **驾驶中步行守卫（优化C）**：walkTick 自动移动前 `player:getVehicle()` 非 nil 则跳过（不排队 ISPathFindAction，避免打断驾驶）。下车后自动恢复步行。- **性能监控（优化D）**：buildRoute 街道图构建记录耗时日志 `"街道图构建: N 节点 Xms"`，便于确认真实规模（全地图街道 Dijkstra 性能）。- **测试联动**：新增 `AEV_AutoNav_Debug` 后翻译键 34→37；集成测试 stub 因 Walk 驾驶守卫需在 Walk 断言前 `_player.getVehicle = function() return nil end`、Drive 断言前恢复。### Suggested Action- 实测进游戏验证：日志时间戳、街道图构建耗时（真地图可能数千节点）、巡航平滑实际表现。- 若真地图街道图节点过多导致 Dijkstra 卡顿 → 换 A*（启发式）。### Metadata- Source: conversation- Tags: project-zomboid, autonav, logging, cruise-control, perf- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-057] aev-autonav-optimizations-5**Logged**:  2026-08-07T00:25:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAEV_AutoNav 第五轮优化：A* 寻路替代 Dijkstra、到达中文 toast、多目的地队列、错误恢复日志。### Details- **A* 寻路（优化1）**：`astar(graph, startIdx, endIdx)` 启发式 = 到终点欧氏距离，open 集合用简单数组每次取 f 最小（节点少时够用）。buildRoute 优先 astar，失败 fallback dijkstra。测试断言 astar 与 dijkstra 路径一致。- **到达 toast（优化2）**：`notifyArrived(player)` 用 `player:Say()` 气泡提示（`IGUI_AEV_AutoNav_Arrived`）。Walk/Drive 到达时调用。⚠️ `player.Say` 用点号取方法再 `player:Say()` 调用（冒号传 self）。- **多目的地队列（优化3）**：`queueDestination(x,y,z)` 当前无目的地直接设，有则入队 `waypointQueue`；`popNextWaypoint()` 弹队首设为新目的地。Walk/Drive 到达时：有队列 → popNextWaypoint 继续，无 → clearDestination。注意 popNextWaypoint 只设目的地，路线由后续 tick 自动重建（cacheStart 变化触发）。- **错误恢复日志（优化5）**：buildRoute 各失败点加 log（streetsAPI 不可用/街道为空/图无节点），便于排查。- **测试 stub 联动**：新增 notifyArrived/popNextWaypoint 后测试 stub 需补（批量 patch 脚本）。### Suggested Action- 实测验证 A* 在真地图（数千节点）的构建耗时（日志已含「街道图构建: N 节点 Xms」），若 open 集合简单数组 O(n²) 仍慢 → 换二叉堆。- 多目的地可加大地图右键「加入途经点」入口（当前只有 API）。### Metadata- Source: conversation- Tags: project-zomboid, autonav, astar, waypoint, toast- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-058] aev-autonav-waypoints**Logged**:  2026-08-07T00:35:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAEV_AutoNav 第六轮优化：大地图 Ctrl+右键加入途经点 + 途经点 HUD 提示。### Details- **右键途经点（优化A）**：Map.lua onRightMouseUp 检测 `Keyboard.isKeyDown(Keyboard.KEY_LCTRL/RCTRL)`，Ctrl+右键 → `queueDestination`（入队），普通右键 → setDestination。pcall 包裹 Keyboard（联机/无键盘环境跳过）。- **途经点 HUD（优化B）**：Core `getWaypointInfo()` 返回 `{count=#waypointQueue}`；Walk renderWalkGuide 距离文字追加 `[途经点 N]`。- **A* 堆优化（C）**：YAGNI 跳过——当前 open 集合简单数组够用，实测真地图节点数确认卡顿再上二叉堆。- **面板折叠（D）**：PZAPI ModOptions 无 addGroup/collapse API（仅 addTitle/addSeparator），折叠不可行，已用 addTitle 分组达标。- **测试 stub 坑**：lupa 冒号方法 `api:uiToWorldY(x,y)` 调 stub `function(self, y)` 时参数错位（self=api 吞掉 x），必须定义双参 `function(self, x, y)` 才正确。### Suggested Action- 实测确认 Ctrl+右键在游戏内可用（Keyboard.isKeyDown 需游戏焦点）。- 途经点 HUD 已显示队列数，可进一步显示「当前第 N/M 站」。### Metadata- Source: conversation- Tags: project-zomboid, autonav, waypoint, context-menu- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-059] autoeverything-mod-optimization**Logged**:  2026-08-07T00:45:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAutoEverything 整个 mod 层面健康检查与优化：清死文件、修笔误、补翻译键、建公共库、硬编码 UI 汉化。盘点全 mod 80 文件结构。### Details- **结构盘点**：80 Lua 文件 ≈40 模块（AutoLoot/AutoEat/AutoDrop/AutoOpenFood/MSR_Shop/EreFBIOpenUpDoor/AEV_*/ALP/ACWP 等），缝合 + 自研混合。- **死文件**：`AutoEat_ISEatFoodAction.lua`/`AutoEat_ISCraftAction.lua` 只有 `--obsolete`，无任何 require/引用，已删。mod.info 用 media/lua 目录自动加载机制，删除安全。- **\B 笔误**：`Autoloot_InventoryContainerFilter.lua:25` `getModInfoByID("\BetterSortCC")` 无效转义（Lua 5.1 容忍但不规范，lupa 5.3 报错）→ 改 `"BetterSortCC"`。- **翻译键核对**：写 `check_all_translations.py` 扫全 mod `tr/getText("KEY")`，178 引用 / 542 键，缺 4。补 `IGUI_DbViewer_Filters`/`IGUI_DbViewer_TotalResult` + 13 个 `IGUI_ItemCat_*`（Food/Weapon/Clothing 等）。剩 2 误报：`IGUI_ItemCat_`（动态拼接前缀）+ `IGUI_ItemList_Info`（注释代码）。- **公共库**：建 `shared/AutoEverything.lua`（`AutoEverything.log`/`logModule`）。**发现 27 文件各自重复定义相同 tr()（同一哈希 5d189325）**——可安全抽离，但改动面大未动（标注未来优化）。print 迁移评估：AutoEat/AutoOpenFood 的 print 有 `AutoEat.Verbose` 调试开关依赖，保留不迁移。- **硬编码汉化**：ItemsListTable 7 个按钮（Add/Remove Type/Category/DispCat/All）+ ItemsListViewer Save → `getText("IGUI_AutoLoot_*") or fallback`。ItemsListViewer 面板标题已走 `UI_AutoLoot_ModeDropDown_2` 键。- **lupa 全量扫描局限**：`check_all_autoeverything.py` 47 OK / 30 FAIL，FAIL 全是 stub 缺 Lua 类继承（`:derive`/`__classmetatables`）和游戏全局（MSR/AutoDrink/ISVehicleMenu），**非代码错误**。lupa 无法模拟 B42 类系统，语法检查对含 UI 类的缝合 mod 不可靠 → 需游戏内实测。### Suggested Action- 性能优化（OnRenderTick/OnPlayerUpdate 频率）需游戏实测，不盲改缝合 mod。- 未来可做：27 文件 tr() 去重（已确认同实现，风险低）。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, mod-health, translation, dedup- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-060] autoeverything-tr-dedup-and-panel-audit**Logged**:  2026-08-07T00:55:00+08:00**Priority**:  medium**Status**:  done**Area**:  project-zomboid### SummaryAutoEverything 全局 tr 入口 + AutoNav log 落地公共库 + ModOptions 面板 105 选项无冲突核对。### Details- **tr() 去重评估**：27 文件各含相同 `local function tr`（同一哈希 5d189325）。激进「全局 tr + 删 local」有加载顺序风险（PZ 先加载 shared 后 client，shared 里 tr 文件若删 local 会在全局 tr 未定义时崩）。**决定**：保留各文件 local tr（已工作），在 `000_AEV_ModOptions.lua`（client 第一个文件）定义 `_G.tr` 作为未来新模块统一入口。零风险。- **AutoNav log 落地公共库**：`AEV.AutoNav.log` 优先调 `AutoEverything.logModule("AEV_AutoNav", msg)`，无公共库时 fallback 原格式（保留 Debug 开关）。测试 stub 无 AutoEverything → fallback 分支验证通过。- **ModOptions 面板核对**：写 `check_modoptions_ids.py` 扫全部 addTickBox/addSlider/addComboBox/addKeyBind 选项 id → **105 个 id，0 重复**。前缀分布：AEV 47 / AL 16 / MSR 11 / ACWP 5 / ALPP 5 / AE 4 / ALP 4 / ADR 1 + AutoLoot 物品类别（Junk/Household/Material 等）。面板无冲突。- **检查工具沉淀**：`check_modoptions_ids.py`、`check_all_translations.py`、`check_all_autoeverything.py`、`scan_hardcode.py` 可复用。### Suggested Action- 新模块统一用 `_G.tr` + `AutoEverything.logModule`。- 旧 27 文件 local tr 保留（行为一致，去重风险>收益）。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, tr-dedup, modoptions, audit- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-061] default-txt-bom-and-mod-residues**Logged**:  2026-08-07T01:05:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### Summary修复 default.txt 被 PowerShell 写入 UTF-8 BOM 导致 PZ 读不到 mod（全 mod 未启用），并清理 mods 目录全部残留（myspatialrefuge_shop/DBUInfinitePatch/examplemod/4 个 bak）。### Details- **default.txt BOM 坑（关键）**：Windows PowerShell 5.1 `Set-Content -Encoding UTF8` 会写 **UTF-8 BOM**（EF BB BF 开头）。PZ 的 `mods\default.txt` 读不到带 BOM 的文件 → **全部 mod 显示未启用**。修复：Python `open(p, encoding='utf-8-sig')` 读去 BOM + `encoding='utf-8'` 写无 BOM。验证首字节为 `56 45 52`（"VER"）而非 EF BB BF。- **myspatialrefuge_shop 残留**：商店代码已完全缝入 AutoEverything（18 个 MSR/Spatial 文件 + items_shop.txt + UI 翻译全覆盖，shop 有而 AE 无的键 = 0）。本地目录冗余，已删（备份 temp）。- **DBUInfinitePatch 残留**：自制补丁依赖 DBU/LazoloDynamicBackpackUpgrades（**workshop 未安装**），无法工作且不在 default.txt，已删（备份 temp）。- **examplemod 残留**：PZ 官方模板副本，无功能，已删。- **bak 残留**：default.txt.bak/.bak2/.bak_20260803/.bak-20260805-140500 四个历史备份，已删。- **reset-mods-42_00.txt 必留**：PZ 官方标记文件（存在则 default.txt 生效；删除会导致 default.txt 被重置为空）。**不可删**。- 清理后 mods 目录仅剩：AutoEverything / default.txt / reset-mods-42_00.txt。- **旧存档 mods.txt**：含大量失效引用（ModManager/CleanUI/twistminimap/myspatialrefuge_shop/MSR_ShopPatch 等），但用户明确「旧存档随便玩不用管」，不处理存档内记录。### Suggested Action- 以后用脚本改 PZ 配置文件，务必用 UTF-8 **无 BOM** 写入（Python `utf-8` 或 PS7 `utf8NoBOM`）。- 缝合 mod 后要清理源目录 + 检查默认配置里旧 id。### Metadata- Source: conversation- Tags: project-zomboid, default-txt, bom, mod-management, cleanup- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-062] pz-translation-percent-escape**Logged**:  2026-08-07T01:15:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryPZ 42.20.2 翻译严格化：值里的单个 `%` 触发 Java String.format 异常（UnknownFormatConversionException），翻译必须用 `%%` 显示字面百分号。修复 AutoEverything 6 处翻译键。### Details- **根因**：PZ 翻译用 Java `String.format()` 处理，`%` 是格式说明符。42.20.1 起 mod 翻译的 `%` 必须写成 `%%`（当时查更新日志看到这条但没检查自家翻译）。42.20.2 严格报错。- **症状**：游戏内右下角 ERROR 计数，日志 `WARN: Translator.reportMissingArgumentsFromPastAbuse > UnknownFormatConversionException: Conversion = '�'` + `ERROR: Formatting "IGUI_..."`。- **修复 6 处**：`IGUI_AEV_AutoCombat_DominoMinChance/MaxChance`（最小/最大触发概率（%））、`IGUI_AEV_AutoEquip_Melee_Tooltip`（30%），CN+EN 各 3 个，`%` → `%%`。- **检测脚本**：`re.sub(r'%%\d*', '', v)` 移除合法 `%%`/`%%N` 后仍含单个 `%` 即未转义。CN/EN 修复后 0 残留。- **已正确的**：`IGUI_ADR_Enabled_Tooltip`（51%%）、`IGUI_AEV_Doors_KnockChance`（%%）、`IGUI_ItemCat_AutoLootPriority`（%%1 占位符）。- **顺带发现**：default.txt BOM 修复后主菜单中文完全正常（之前的截断是 BOM 间接导致的？——实际上截断是 B42Trans_CN 兼容，但 BOM 修复后显示正常，说明之前是误判，根因就是 BOM 影响 mod 加载导致汉化不完整）。### Suggested Action- 写 PZ mod 翻译键时，任何字面 `%` 一律用 `%%`。- 新增翻译键后用本 LRN 的检测脚本扫一遍（check_all_translations.py 可扩展）。### Metadata- Source: conversation- Tags: project-zomboid, translation, percent-escape, format- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-063] b42-itembodylocation-break**Logged**:  2026-08-07T01:25:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryB42 API 变化：`player:getWornItem()` 参数从字符串改为 `ItemBodyLocation` 常量。修复 AEV_AutoEquip 的 3 处：传参、比较、映射表。### Details- **B42 破坏性变更**：B41 里 `player:getWornItem("Jacket")` 传字符串；B42 必须传 `ItemBodyLocation.JACKET` 常量对象。传字符串 → Java 异常 `expected argument of type ItemBodyLocation, got String`，pcall 捕获但 PZ ERROR 计数器照计（运行时报 217 次）。- **3 处修复**（AEV_AutoEquip_Logic.lua）：  1. 顶部加映射表 `local BL = {Jacket=ItemBodyLocation.JACKET, Shirt=..., ...}`（12 个槽位）  2. `checkArmor` line 152：`player:getWornItem(BL[loc] or loc)`  3. `findBestClothing` line 85：`loc == (BL[bodyLocation] or bodyLocation)` — **重要**：`item:getBodyLocation()` 在 B42 返回 ItemBodyLocation 对象，与字符串比较永远 false → 护甲筛选失效（护甲从不穿）。必须转成对象比较。- **不用改的**：`wearClothing` 的 `setWornItem(loc, item)` 里 loc 来自 `item:getBodyLocation()`（B42 已返回 ItemBodyLocation），天然匹配。- **ItemBodyLocation 常用常量**：HAT/MASK/MASK_EYES/MASK_FULL/EYES/JACKET/SHIRT/TORSO/BACK/PANTS/SKIRT/SHOES/HANDS/BELT/NECK/UNDERWEAR 等约 100 个。- **测试**：lupa mock ItemBodyLocation 常量（表对象），验证 tick 后 getWornItem 收到 12 个对象、0 字符串。- **排查日志方法**：错误后紧跟 STACK TRACE 显示 `Lua((MOD:AutoSuite)).checkArmor(AEV_AutoEquip_Logic.lua:152)` → 直接定位文件行号。### Suggested Action- B42 写护甲/装备相关代码，bodyLocation 一律用 ItemBodyLocation 常量，勿用字符串。- 其他缝合 mod 若报同类错，先 grep `getWornItem\("` 和 `getBodyLocation\(\) == "`。### Metadata- Source: conversation- Tags: project-zomboid, b42-api, itembodylocation, autoequip- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-064] autonav-equip-and-melee-fixes**Logged**:  2026-08-07T01:40:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### Summary两个运行 bug 修复：①AutoEquip 的 ItemBodyLocation 静态表加载时机问题（改用运行时 ResourceLocation.of 转换 + 别名表）；②AutoCombat 空手持续推搡（DoAttack 空手=推搡，加空手守卫）。### Details- **ItemBodyLocation 静态表坑**：`local BL = {Jacket=ItemBodyLocation.JACKET,...}` 在文件加载时求值，若 `ItemBodyLocation` 全局未就绪则 BL 全 nil，`BL[loc]` 返回 nil fallback 字符串 → 报错。**改用运行时**：`ItemBodyLocation.get(ResourceLocation.of(name))`（CharacterCreationMain.lua 验证的原版范式）。⚠️ 部分位置名不直接对应常量（Glasses→EYES），需**别名表** `{Glasses="EYES",...}` 先映射常量名再 ResourceLocation.of。- **空手持续推搡（关键）**：`meleeCounter` 空手时 `CanAttack()` true → `DoAttack(0)`，**空手的 DoAttack 就是推搡动作** → 每 intervalMs 推一次 = 小人一直在推。修复：`getPrimaryHandItem()` 为空则跳过自动攻击（近战自动反击仅持武器时生效）。远程 CTRL 模块不受影响。- **测试沉淀**：`test_aev_autocombat_emptyhand.py`（空手不攻、持武攻）、`test_aev_autoequip_bodyloc.py`（mock ItemBodyLocation.get/ResourceLocation.of）。### Suggested Action- AutoCombat 空手时的预期行为：推搡应手动，自动仅武器。若想要「自动推搡」需单独选项，勿复用 DoAttack。- 报 ItemBodyLocation 错先查是否静态表求值时全局未就绪。### Metadata- Source: conversation- Tags: project-zomboid, itembodylocation, melee, autoequip, autocombat- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-065] pz-mod-mgr-ui-blocked-by-highfreq-lua-errors**Logged**:  2026-08-07T01:50:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### Summary游戏内高频 Lua 错误（AutoNav getSaveMD 162 次/会话 + AutoEquip ItemBodyLocation 84 次，均每 tick 触发）拖垮 UI：背包点不开、[B42] Mod Manager 选项面板渲染崩溃。修复两个高频错误源。### Details- **getSaveMD nil 调用**（162 次）：`getWorld():getMetaData():getModData()` 当 getWorld 为 nil 时，Kahlua 报 `Object tried to call nil in pcall`——PZ 的 pcall 捕获不到 nil 链式调用（pcall 内部再触发 Kahlua 异常）。修复：链式安全 `if getWorld then pcall(getWorld)...` 逐层检查，nil 走 ModData fallback。**不用缓存**（跨存档 metadata 会串）。- **ItemBodyLocation.get(ResourceLocation.of()) 在运行时仍失败**（84 次）：`ResourceLocation` 全局在部分上下文不可用或格式不符。**最稳方案**：运行时直接 `ItemBodyLocation[key]`（大写常量名查表）——此时 ItemBodyLocation 全局已就绪（ModOptions registered 证明），且别名表 `{Glasses="EYES",...}` 先映射。CharacterCreationMain 的 ResourceLocation.of 方式在 mod 运行时环境不可靠。- **症状关联**：背包点不开 + Mod Manager createOptionControls 崩溃 = 高频错误刷屏拖垮 Lua 引擎/UI 线程。修复高频源头后应恢复。- **排查技巧**：`STACK TRACE` 后 `Lua((MOD:AutoSuite)).file.lua:NNN` 直接定位；Group-Object 统计 `(MOD:X)` 堆栈频率找高频源。### Suggested Action- onPlayerUpdate/OnTick 里任何可能 nil 的链式调用都要逐层 pcall 检查（Kahlua pcall 无法捕获 nil 调用）。- 高频轮询逻辑出现异常会刷爆日志拖垮 UI，先修源头再谈优化。### Metadata- Source: conversation- Tags: project-zomboid, kahlua, pcall, highfreq-error, ui-block- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-066] pz-autoequip-getwornitem-overload-and-mod-manager**Logged**:  2026-08-07T02:05:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAutoEquip 的 getWornItem 字符串调用在 B42 运行时绑定到 ItemBodyLocation 重载仍报错（官方 ILuaGameCharacterClothing 接口文档写 String，但实际 Lua 绑定歧义）。改用 getWornItems() 遍历方案彻底规避。设置界面乱码根因：翻译值含 `%%`，Mod Manager 双重格式化崩 → 全角 `％` 替代。### Details- **getWornItem 重载歧义**：JavaDoc `ILuaGameCharacterClothing.getWornItem(String location)` 官方是 String，但实际运行时 `IsoPlayer:getWornItem("Jacket")` 报 `expected argument of type ItemBodyLocation, got String`（MethodArguments 校验选了 ItemBodyLocation 重载）。字符串、ItemBodyLocation[key]、ResourceLocation.of 三种方式都不可靠。- **可靠方案**：不用 `getWornItem(loc)` 单查。改用 `player:getWornItems()` 遍历（原版 ISInventoryPaneContextMenu/ISMakeUpUI 标准）：  ```lua  local worn = player:getWornItems()  for i = 0, worn:size()-1 do      local item = worn:get(i):getItem()      local bl = item:getBodyLocation()   -- ItemBodyLocation 对象      wornMap[bl] = item                  -- 对象做 key  end  ```  位置查询用 `getBodyLoc(loc)`（ItemBodyLocation.get(ResourceLocation.of(name))，CharacterCreationMain 验证）返回对象查 wornMap。对象 key 匹配依赖引擎缓存单例（原版如此用且工作）。- **设置界面乱码（Mod Manager）**：`[B42] Mod Manager`（3567084868）的 createOptionControls 对每个选项 `getText(option.name)`，某翻译值含 `%%` 时它**双重格式化** → `String.format("%%")`→`%` 再 format 单个 `%`+中文括号 → `UnknownFormatConversionException: Conversion='�'`（全角括号误判）。**修复：翻译值用全角 `％`（U+FF05）替代 `%%`**——不是 Java 格式符，无双重格式化问题，显示相同。修复 CN/EN 共 11 处（AutoCombat Domino、AutoEquip Melee_Tooltip、ADR Tooltip、Doors、Sandbox EreFBI 3 项）。`IGUI_ItemCat_AutoLootPriority='%%1'` 是传参占位符保留。- **误删恢复**：ModManager 之前被误删（搜索正则问题，实际 3567084868 存在），但用户已自己加回 default.txt（现 20 个 mod）。### Suggested Action- B42 写装备相关：一律 `getWornItems()` 遍历 + `item:getBodyLocation()` 对象比较，勿用 getWornItem(字符串)。- 翻译里字面 % 用全角 ％ 最安全（防第三方 mod 双重格式化）。### Metadata- Source: conversation- Tags: project-zomboid, getwornitem, mod-manager, percent-fullwidth- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-067] autoequip-bodyloc-final-and-mod-manager-conflict**Logged**:  2026-08-07T02:15:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### Summary自查确认 AutoEquip bodyLocation 最终正确方案（静态常量）+ 修复 getSaveMD 的 ModData nil 风险；网上确认 Mod Manager 与 ModLoadOrderSorter 可能冲突导致选项菜单不显示。### Details- **getBodyLoc 最终方案**：`ItemBodyLocation.get(ResourceLocation.of())` 和 `ItemBodyLocation[name]` 都不可靠。原版 ISInventoryPaneContextMenu 验证：**`ItemBodyLocation.HAT` 静态常量**（`k:getBodyLocation() == ItemBodyLocation.HAT`）+ **`newItem:getBodyLocation() == wornItem:getLocation()`**（两者同为 ItemBodyLocation 引擎缓存对象，可直接比较）。最终：BL 别名表（小写位置名→大写常量名，Glasses=EYES）+ `ItemBodyLocation[key]` 运行时访问（此时全局就绪）。- **getSaveMD ModData nil 风险**：`ModData.getOrCreate()` 若 ModData 全局为 nil（某些时机），pcall 捕获不到 Kahlua nil 调用 → 前置 `if ModData then`。- **网上最新**：42.20 是当前 Stable（7/29），官方计划 B42 Support Update（modding 优化）。无 42.21 Stable。- **Mod Manager（3567084868）**：B42.17 正常，但有社区报告兼容问题（选项不显示/ModListData.lua 缺失）。**与 ModLoadOrderSorter_b42 同时安装可能冲突导致选项菜单不显示**（steam 评论确认）。用户两个都装了——设置界面乱码/选项不显示可能因此。- **设置乱码缓解**：翻译 `%%` → 全角 `％`（U+FF05）已做，防 Mod Manager 双重格式化崩。### Suggested Action- 若设置界面仍乱码/选项不显示：**二选一卸载 Mod Manager 或 ModLoadOrderSorter**（两者冲突）。- 关注官方 B42 Support Update 对 modding 的改动。### Metadata- Source: conversation- Tags: project-zomboid, itembodylocation, mod-manager, modloadordersorter, conflict- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-068] autoeverything-module-architecture**Logged**:  2026-08-07T02:30:00+08:00**Priority**:  medium**Status**:  done**Area**:  project-zomboid### Summary架构决策：AutoEverything 保持单一整合 mod，不拆独立 mod。生成 MODULES.md 维护索引 + 全局冲突检查确认模块边界清晰。### Details- **决策**：保持整合（单 mod），理由：①统一 default.txt 引用/统一面板/统一翻译是整合核心价值；②拆分 18 个独立 mod 增加 18 份加载顺序+mod.info+翻译+面板维护，不解决第三方缝合代码的 bug；③这几天的问题全是第三方代码内部 bug，与整合结构无关。- **真实代价**：76 文件一锅烩，排查需全局 grep。缓解：MODULES.md 索引 + 全局冲突验证。- **现状**：76 lua 文件，18 大类（AutoLoot 20 / MSR 14 / AutoNav 7 / AutoEat 5 / Spatial 4 / AutoCombat 3 / AutoEquip 3...），105 选项，543+ 翻译键，1.5 MB。- **全局冲突检查**：23 个跨文件全局全为预期共享（AEV.*/.tr、lcl.* Java 缓存表、AutoLoot 共享表），**无真正冲突**。模块边界清晰。- **维护注意**：AEV_Doors/MSCZ/Unlimited 选项命名风格不一（小写），勿改（破坏 ModOptions.ini）；`lcl.*` 是 AutoLoot 缝合源的 Java 方法缓存共享表。- **工具沉淀**：inventory_modules.py（盘点）、check_global_conflicts.py（冲突检测）、MODULES.md（模块清单）。### Suggested Action- 以后新模块照 MODULES.md 登记 + 统一 `AEV_模块名_*` 命名（大写下划线）+ 独立命名空间。- 维护先查 MODULES.md 定位文件，再针对性改。### Metadata- Source: conversation- Tags: project-zomboid, architecture, modules, maintenance- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md





---

## [LRN-20260807-069] remove-autonav-module**Logged**:  2026-08-07T02:45:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### Summary移除 AutoEverything 的 AEV_AutoNav（自动驾驶导航）模块：7 文件 + 39 翻译键。原因：模块过大维护不便、稳定性不足（小地图图标消失、右键地图拖拽异常、大地图导航不生效）。### Details- **移除内容**：shared/AEV_AutoNav_Core.lua + client 6 文件（Map/Walk/Drive/Refuel/StreetsPatch/ModOptions）+ CN/EN 各 39 翻译键。- **验证**：rg 确认无其他模块引用 AEV_AutoNav（完全独立）；JSON 有效；无 AutoNav 残留；ModOptions.ini 无残留（用户存档未设置过）。- **原版 mod 参考**（用户要单独订阅）：Navigator 3708816224（大地图导航/路线）、Auto Forage 3478924012（自动移动/寻路）、Better Push 3715137752（推搡连锁）、AutoAttack 2837527039（近战自动攻击）、TwisTonFire Minimap 3572564421（小地图）。- **决策逻辑**：AutoNav 是自研模块，问题不在缝合；但体量大（7 文件 + 复杂地图 hook）+ 小地图/大地图 hook 在 B42.20.2 表现不稳定 → 用户决定移除改用独立成熟 mod。### Suggested Action- 以后新模块控制规模；涉及地图 UI hook（ISWorldMap/ISMiniMapInner）优先用成熟独立 mod。- MODULES.md 已更新（移除 AutoNav，加原版 mod 参考表）。### Metadata- Source: conversation- Tags: project-zomboid, autonav, module-removal, workshop-mods- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md





---

## [LRN-20260807-070] autoeverything-cleanup-dead-files**Logged**:  2026-08-07T03:00:00+08:00**Priority**:  low**Status**:  done**Area**:  project-zomboid### Summary清理 AutoEverything 2 个死文件：AutoEat_ISBaseTimedAction（--obsolete）、AutoOpenFood（AllCookingRecipes 无引用）。确认 AutoEat_ISContinue/ISCharacterScreen/ProlongTimeSpeed 有效保留。### Details- **删除**：  - `AutoEat_ISBaseTimedAction.lua`（12 行，`--obsolete`，无事件/无引用）  - `AutoOpenFood.lua`（154 行，定义 AutoEat.AllCookingRecipes/AllCookingRecipesSet/PerfVerbose，但 AutoEat.lua 不用这些；无 Events）- **保留**（经引用验证）：  - `AutoEat_ISContinue.lua` — AutoEat.lua:87 用 `ISContinue:new(AutoEat, playerObj, 1)`  - `AutoEat_ISCharacterScreen.lua` — hook `ISCharacterScreen.render/create`（角色面板加 AutoEat 开关），运行时 PZ 自动加载生效  - `AutoEat_ProlongTimeSpeed.lua` — AutoEat.lua 用 `prolongTime`- **判断死文件方法**：PZ 的 media/lua 目录**自动加载**（非 require），所以「无 require 引用」≠死文件。需检查：①是否定义被其他文件用的全局/类；②是否 hook 原版类（ISCharacterScreen 等运行时生效）；③是否注册 Events。三者皆无为死文件。### Suggested Action- 清理后 AutoEverything = 66 文件、17 大类。MODULES.md 已同步。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, dead-code, cleanup- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md





---

## [LRN-20260807-071] autoeverything-replace-with-original-mods**Logged**:  2026-08-07T03:20:00+08:00**Priority**:  high**Status**:  done**Area**:  project-zomboid### SummaryAutoEverything 移除 AutoLoot 家族（21 文件）+ AutoDrop（1 文件）+ EreFBI（2 文件），用户订阅原版 Auto Loot (3392699932) 和 FBI Open Up Door (2732513069) 替代。现 38 文件。### Details- **AutoLoot 家族移除**：21 文件（AutoLoot/Config/Filtering/UI）。原版 Auto Loot B42 (3392699932) 提供 AutoLoot + StoreItems + Tools + Config + Filtering。- **AutoDrop 一并移除**：原版 B42 版**不含 AutoDrop**（common 目录 B41 才有），且 AutoDrop 依赖 `AutoLoot.isAutoDrop`（原版 42.13 **无此函数**，会导致报错）→ 移除。**原版 B42 自动丢弃功能缺失**，需用户接受（或后续找 B42 版 AutoDrop mod）。- **ALPP_Main 保留**：依赖原版公开 API `AutoLoot.PlunderSquare`/`isAutoLoot`/`isAutoLootActiveOnContainerByObj`，原版 42.13 确认提供。- **EreFBI 移除**（2 文件）：用户订阅原版 2732513069（id EreFBIOpenUpDoor）。AEV_Doors 读 `SandboxVars.EreFBIOpenUpDoor` 有 nil 保护，无影响。- **翻译清理教训（重要）**：删除模块后清理翻译键，用「代码 used 判断」会误删仍被其他模块用的键（如 `UI_Shop_*` MSR 商店用、`IGUI_ACWP_*`/`IGUI_ADR_*`）。**必须用 fallback 重建 + 全量核对**，否则显示键名。本次误删后从代码 fallback 重建 124+ 键。- **default.txt**：加入 `AutoLoot`（id=AutoLoot）+ `EreFBIOpenUpDoor`，无 BOM。### Suggested Action- 原版 AutoLoot 无 B42 自动丢弃——若需要可找独立 AutoDrop B42 mod 或要求原版作者更新。- 游戏内验证：AutoLoot 原版拾取 + ALPP 拾取移动 + AutoEat/AutoDrink 缝合版共存。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, autoloot, erefbi, mod-replacement- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md





---

## [LRN-20260807-072] stitch-vs-original-mod-decision**Logged**:  2026-08-07T03:40:00+08:00**Priority**:  medium**Status**:  done**Area**:  project-zomboid### Summary本次 AutoEverything 大瘦身（38 文件）沉淀的「缝合 mod vs 原版订阅」决策框架：缝合适合深度定制/原版失效，原版订阅适合功能通用/原版活跃维护。### Details- **本次决策**：AutoNav（自研导航，7 文件）因体量大+地图 hook 不稳定移除；AutoLoot 家族（21 文件）+ AutoDrop 因原版 Auto Loot (3392699932) 维护良好改订阅；EreFBI 破门（2 文件）因原版 FBI Open Up Door (2732513069) 改订阅。AutoEat/AutoDrink 原版久未更新 → **保留缝合版**。- **决策框架**：  1. **原版活跃维护 + 功能通用** → 订阅原版（升级稳定、社区支持）。如 AutoLoot、EreFBI。  2. **原版久未更新/功能私有** → 保留缝合（可本地修 bug 加汉化）。如 AutoEat、AutoDrink。  3. **需深度集成进统一面板/自定义增强** → 缝合（如 MSR 商店补丁、AEV_* 自研）。  4. **体量大 + 地图/UI 复杂 hook + 表现不稳** → 放弃自研，用原版（AutoNav 教训：ISWorldMap/ISMiniMapInner hook 在 B42.20.2 不稳定）。- **缝合版 vs 原版的 API 差异风险**：原版 AutoLoot B42 版**不含 AutoDrop**（`isAutoDrop` 缺失）→ 缝合 AutoDrop 一并移除。验证原版 API 完整性后再决定依赖模块去留。- **翻译清理误删教训（重要）**：删模块清翻译键时，用「代码 used 判断」会误删**其他模块仍用**的键（UI_Shop* MSR 商店、IGUI_ACWP*/IGUI_ADR* 等）。必须：删键前先全量收集剩余代码用的键 → 只删「既不在 used 又属于被删模块」的键 → 删后全量核对 + 从代码 fallback 重建缺失。本次误删后从 fallback 重建 124+ 键。- **SKILL.md 同步**：steam-tools 的 AutoNav 段落已标记「已移除」，补充 AutoEquip getWornItems 遍历/AutoCombat 空手推搡等 B42 兼容重点。### Suggested Action- 新功能评估先做「缝合 vs 原版」决策（查原版维护状态 + 是否需深度定制）。- 缝合 mod 的翻译键清理严格按「used 集合 → 白名单删除 → fallback 重建」流程。- 地图/UI 复杂 hook 类功能优先用原版 mod。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, stitch-vs-original, architecture- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md## [LRN-20260807-073] pz-autoeverything-split-round2-drinkdoors### Context继续拆分 AutoEverything 多合一 mod，评估剩余 13 模块哪些可直接换 Workshop 原版。### Summary- **Eat Smart / Drink Smart 都不是"自动吃喝"**：只是右键菜单加"吃到 0% 饥饿/口渴"选项，与缝合的 AutoEat/AutoDrink（自动吃喝）功能不同，不能替代。- **本次可替换（已执行）**：  1. AutoDrinkRevert + ADR（4 文件）→ 原版 `[B42.19+] Auto-Drink Revert` (3737205872)，4,562 订阅、8 月 6 日活跃更新、B42.20 兼容，功能完全一致（恢复 42.19 改掉的"以水为主即可自动喝"），缝合版 `Hook.AutoDrink` 风险由原版接管。  2. AEV_Doors（1 文件）→ 本就是已订阅 FBI Open Up Door (2732513069) 的 ModOptions 镜像面板，冗余直接删。- **候选但功能不匹配（保留缝合/自研）**：  - ALP 感应灯 → AutoLights [B42] (3737087835) 是定时/日出日落开灯，评论区作者确认接近感应"不确定能做"；Sensors and Traps (3209239259) 需自制传感器太重。  - AutoEat → Eat Smart (3456212729) 非自动吃；原版 AutoEat (2977628726) 是 B41。  - AutoCombat → AutoAttack (2837527039) 是 2022 B41（需 Mod Options B41）。  - ACWP 关窗/窗帘 → EasyDoors (3621001191) 只处理门（跑步撞门自动开/关）不管窗/帘。  - ADR 自动饮水 → Drink Smart (3447775367) 非自动喝；Auto Drink (2980530069) 是 B41。- **无现成原版（保留）**：MSR 商店补丁、AEV_Spatial 自动收纳、AEV_AutoEquip、ALPP（原版 AutoLoot 增强）、AEV_MSCZ/AEV_Unlimited。- **执行结果**：删 5 文件（38→33 Lua），清 120 翻译键（IGUI_AEV_Doors_* / IGUI_ADR_* / IGUI_AEV_Cat_Drink / ContextMenu_Enable-DisableAutodrink），default.txt 加 `[B42.19]





AutoDrinkRevert`（无 BOM），MODULES.md 同步，语法全过、全局冲突 0 真实。- **方法**：先 read 每个模块代码确认功能边界再调研，不信搜索摘要；Eat/Drink Smart 类"名字像自动"的 mod 必须读代码/评论确认是否真自动；Workshop 全文搜索相关性差（返回热门 B41），用 Exa 语义搜索 + Playwright 详情页验证订阅数/更新时间/评论区。### Suggested Action- 拆 mod 前先按"缝合 vs 原版决策框架"（LRN-072）逐模块核对，重点看原版是否活跃维护 + 功能是否真覆盖。- AutoDrinkRevert 原版 mod id 含方括号：`[B42.19]

AutoDrinkRevert`，default.txt 直接写。### Metadata- Source: conversation- Tags: project-zomboid, autoeverything, split, stitch-vs-original- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md, MODULES.md

---

## [LRN-20260807-074] correction**Logged**:  2026-08-06T11:00:00+08:00**Priority**:  high**Status**:  done**Area**:  config### Summary用户咨询性提问（"现成的有没有"）勿擅自实施配置——先回答，明确授权后再动手。### Details- 用户问 opencode 任务完成通知有没有现成插件，我直接装了 `opencode-ntfy.sh` 并建了配置文件、设了环境变量；用户立刻说"别啊 我就问问你别做啊,去掉"- 教训：问题带"有没有/能不能/怎么用"多是咨询，先给结论和选项，等用户确认再执行；擅自改配置浪费双方时间还破坏信任### Suggested Action咨询类问题默认只回答；行动前确认"要我现在做吗"。### Metadata- Source: conversation- Tags: opencode, communication, consultative- Related Skill: opencode-maintenance





---

## [LRN-20260807-075] best_practice**Logged**:  2026-08-06T11:05:00+08:00**Priority**:  high**Status**:  done**Area**:  config### Summary火绒杀软把"快捷方式→PowerShell 隐藏窗口执行脚本"判定为木马并删除（连带图标）；快捷方式启动服务应直接指向应用或用 .cmd。### Details- `.lnk` Target=`powershell.exe -WindowStyle Hidden -File xxx.ps1` 被火绒（HipsDaemon）隔离，`OpenCode Web.lnk` 和 `opencode-web.ico` 被删，`start-opencode.ps1` 幸免- 判定依据：快捷方式 + 隐藏窗口执行脚本 = 木马典型特征- 修正：`start-opencode.ps1` 删除，改 `.lnk` 直接指向 wt.exe + profile（profile commandline 直接写 serve），或 `.cmd` 批处理（服务用 `/min` 最小化窗口而非隐藏）### Suggested ActionWindows 上"双击快捷方式后台启动服务"避免：.lnk→powershell -WindowStyle Hidden；用 .cmd 或 .lnk 直接指向应用（正常特征，不误报）。### Metadata- Source: conversation- Tags: windows, antivirus, huorong, shortcut, startup- Related Skill: opencode-maintenance- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-076] insight**Logged**:  2026-08-06T11:10:00+08:00**Priority**:  high**Status**:  done**Area**:  backend### SummaryHermes 字节码（.hbc）对非 ASCII 字符串用 **UTF-16LE** 存储，UTF-8 搜不到；验证 APK/JS bundle 是否含中文要用 UTF-16LE 搜索。### Details- RN 打包后 `assets/index.android.bundle` 是 Hermes 字节码；用 `raw.count('设置'.encode('utf-8'))` 搜 =0，误判"汉化没进包"- 实为 Hermes 字符串表把含非 ASCII 的字符串整串存 UTF-16LE：`raw.count('设置'.encode('utf-16-le'))` 命中- ASCII 字符串（如 'Connection'）以 ASCII 存，可直接搜到- 另：bundle 里 E4-E9 字节大量出现是指令操作码，不是中文 UTF-8，别据此判断### Suggested Action验证 RN release APK 是否含中文/非 ASCII：用 UTF-16LE 编码搜索；Hermes 运行时解码正常，搜索不到不代表 app 显示缺字。### Metadata- Source: conversation- Tags: hermes, bytecode, utf16, react-native, localization- Related Doc: docs/opencode-mobile-localization.md





---

## [LRN-20260807-077] best_practice**Logged**:  2026-08-06T11:15:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### SummaryRN/Expo 开源 app 汉化的完整流程：clone → npm ci → 词典三形式替换 → typecheck → expo prebuild --clean → gradlew assembleRelease → aapt 查包名 → adb install -r。### Details- 词典键必须覆盖源码三种写法：JSX 文本 `>text<`、双引号 `"text"`、单引号 `'text'`，否则大量漏网（首轮只匹配一种形式，16 文件仅部分汉化）- 短英文词（Server/Delete 等）单引号形式可能是代码逻辑值，单引号替换需排除，避免误伤- debug 构建（assembleDebug）是 dev client，APK 无 JS bundle，打开进 expo launcher 非 app 本体；要独立可用的 app 必须 assembleRelease（bundle 打进 APK）- release 默认用 debug keystore 签名（Expo 模板 `signingConfig signingConfigs.debug`），可与同包名 debug 版互相覆盖安装- 用 Python 脚本提取全部 UI 字符串清单（JSX 文本 + 引号字符串）+ 位置，据此构建翻译词典，比逐文件人工快且全### Suggested Action汉化流程见 `docs/opencode-mobile-localization.md`；升级 app 后重跑词典替换 + 构建即可。### Metadata- Source: conversation- Tags: react-native, expo, localization, localization-build- Related Doc: docs/opencode-mobile-localization.md





---

## [LRN-20260807-078] insight**Logged**:  2026-08-06T11:20:00+08:00**Priority**:  medium**Status**:  done**Area**:  backend### Summaryopencode 官方无手机 app（issue #10288 仍 open）、PWA 也被拒（#19174 not_planned）；第三方安卓客户端：`alvarolorentedev/opencode-mobile`（纯英文、有通知/语音/后台任务）与 `giuliastro/opencode-remote-android`（现名 Harness Remote，支持繁体中文，完成提示音非系统推送）。### Details- `opencode-mobile`：Expo/RN 原生 app，Play Beta + GitHub APK，连 `http://ip:4096`（默认），依赖含 expo-notifications/expo-background-task/expo-speech；**无 i18n（纯英文）**- `Harness Remote`（原 opencode-remote-android，giuliastro）：README 明确 completion sound（会话完成播放提示音），非 Android 系统推送；UI 可切英/意/繁中- 两者都连 opencode serve（HTTP API），需 IP+端口+用户名+密码；官方 roadmap 有 React Native app 未发布### Suggested Action手机端选择：要系统级推送用 ntfy 插件（LRN-20260806-055）；要中文界面装 Harness Remote；要功能全（通知/语音）且接受英文装 opencode-mobile。### Metadata- Source: conversation- Tags: opencode, mobile, android, app- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-079] best_practice**Logged**:  2026-08-06T11:25:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### SummaryMetro 缓存未随源码更新导致 bundle 不含最新改动，`expo export --clear` 不够；彻底清 `.expo`、`node_modules/.cache`、`%TEMP%` 下 `metro-*`/`react-native-*` 缓存；用字符串字面量 marker 验证 bundle 是否含最新源码。### Details- 现象：源码改中文后 export/构建的 bundle 仍是旧英文；`--clear` 无效- 删 `.expo` + `node_modules/.cache` + Temp 下 metro 缓存后重新 export 才生效- 验证法：源码加 `const __PROBE__ = '中文探针';` 字符串字面量，export 后按 UTF-16 搜 bundle；注释 marker 会被 minify 剥离，必须用字符串字面量- 另注意：minify 会 mangle 变量名，别用变量名做 marker### Suggested Action改源码后 bundle 不更新优先怀疑 Metro 缓存；验证用字符串字面量 marker + UTF-16 搜索。### Metadata- Source: conversation- Tags: metro, cache, react-native, debugging- Related Doc: docs/opencode-mobile-localization.md





---

## [LRN-20260807-080] best_practice**Logged**:  2026-08-06T11:30:00+08:00**Priority**:  low**Status**:  done**Area**:  config### Summary"双击快捷方式启动 opencode 服务"最简单可靠方案：WT profile commandline 直接写 `opencode.exe serve --hostname 0.0.0.0 --port 4096`，.lnk 用 `wt.exe -w new-window -p "profile名"`；别过度设计脚本/联动 TUI。### Details- 用户先后要求"web+浏览器"→"服务+TUI 联动"→最后明确"单纯打开服务就行"- 联动方案（ps1 检测端口+开服务+开 TUI）被火绒误杀（LRN-075），且用户根本不需要- 最终：profile 写死 serve（不弹浏览器、serve 也 serve 网页前端供手机用），.lnk 直接指向 wt 即完成，一个窗口显示服务日志、关窗即停### Suggested Action服务类快捷方式优先用"profile 写死命令 + .lnk 指向 wt"，避免脚本与隐藏窗口。### Metadata- Source: conversation- Tags: opencode, shortcut, serve, wt- Related Skill: opencode-maintenance- Related Doc: docs/opencode-web-mobile.md## [LRN-20260807-074] pz-dbu-capacity-override-reeval### Context用户要求突破 B42 容器容量上限。先选 CCLB 又退回 DBU+补丁。最终确认 DBU 补丁放大 10 倍用户实测有效，推翻此前"setCapacity 硬上限 49 无法突破"的结论。### Summary- **B42 setCapacity 硬上限存在但非绝对**：LRN-20260805-046 记录玩家背包 `InventoryContainer.setCapacity` clamp 49、脚本 `ItemContainer` clamp 100。但 **DBU (2996978365) + DBUInfinitePatch 放大 10 倍用户实测有效**——DBU 的容量路径（`DBU.GetUpgradedStats` → `setCapacity` → `syncItemModData`/`syncItemFields`）可能绕过或另走引擎通道，勿再用"49 封顶"断言否定 setCapacity 类 mod。- **方案演进**：CCLB (3686252520, 纯 Lua 绕过检查, SP 可用但 MP 有 bug, 拖拽仍显示超重) → 用户弃用 → 回归 **DBU + DBUInfinitePatch**（用户记忆"上次放大 10 倍成功"）。- **DBUInfinitePatch 重建要点**（独立 mod, id=DBUInfinitePatch, require=LazoloDynamicBackpackUpgrades）：  1. override `DBU.GetUpgradedStats` 返回 `cap*mult`（DBU 是 shared 全局表，跨文件共享可 patch）。  2. OnPlayerUpdate 5s 节流，对**主背包自身**（`playerObj:getInventory()`）和背包内所有容器 `setCapacity`——主背包是收家具/大件的入口，此前 AEV_Unlimited 漏掉它导致"装不下"。  3. override `DBU.RestoreBagStats` 加 nil 保护（ERR-013 教训：setWeightReduction(nil) NPE）。  4. `mod.info` 必须 `require=DBU id` 保证 DBU 先加载。  5. 翻译：IG_UI.json 干净 UTF-8，勿用旧备份的损坏 JSON（原备份文件有 `�?` 乱码）。- **方法**：用户实测反馈 > 我的历史结论。当用户说"上次成功"而记录说"不可行"时，优先尊重用户实测，重建并验证，同时记录差异供后续纠偏。### Suggested Action- DBU+补丁方案：默认倍率 10，改后重进存档生效。若用户仍超重，检查 `DBU.GetUpgradedStats` override 是否被 DBU 内部缓存覆盖。- 不要轻易删除有用户成功经验的 mod；归档备份（Temp\opencode\DBUInfinitePatch_BACKUP）已用于重建。### Metadata- Source: conversation- Tags: project-zomboid, dbu, capacity, inventory, unlimited- Related Skill: steam-tools- Related Doc: docs/project-zomboid.md





---

## [LRN-20260807-081] correction**Logged**:  2026-08-06T13:00:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### Summary官网品牌素材 PNG 预览是带背景色的矩形图，SVG 才是透明源；转换图标应取 SVG（用户纠正"官网图标都是透明的，你搞完都带背景"）。### Details- opencode.ai/brand 8 套资产（logo light/dark、logo square、wordmark、wordmark-simple），PNG preview 带浅灰 `#F1F0F0`/深色 `#252121` 背景，直接转 ICO 会带背景色块- 网页展示的透明图标来自 SVG（data URI 或按钮下载的 blob），PNG 只是预览- 参考：现有 opencode.ico / opencode-multi.ico 是透明背景 logo（73% 填充率）### Suggested Action取品牌/图标一律用 SVG 源（透明矢量）；PNG preview 只用于预览，勿直接转 ICO。### Metadata- Source: conversation- Tags: opencode, brand, svg, ico, transparent- Related Doc: docs/opencode-icon-conversion.md





---

## [LRN-20260807-082] best_practice**Logged**:  2026-08-06T13:05:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### Summary品牌页 SVG 获取 + Edge headless 渲染透明 PNG + 转 6 尺寸 ICO 的完整流程。### Details- **SVG 获取**：品牌页 SVG 按钮是 JS 动态生成 blob URL 下载，静态 HTML 无 `.svg` asset 链接；用 Playwright 打开页面，逐个点击 SVG 按钮捕获 `download` 事件取 URL，文件落到 `.playwright-mcp\`- **透明渲染**：`msedge --headless=new --disable-gpu --hide-scrollbars --window-size=512,512 --default-background-color=00000000 --screenshot=out.png "file.html"`，`--default-background-color=00000000` 使背景透明（验证四角 alpha=0）；SVG 内联 HTML 用 `data:image/svg+xml;base64,...` + img flex 居中- **viewBox**：SVG 属性可能用单引号（`viewBox='0 0 240 300'`），正则要匹配单/双引号- **转 ICO**：渲染的 512 透明 PNG → System.Drawing 缩放 6 尺寸（16~256）→ PNG 压缩 entries + ICO header（同 opencode-multi 格式）### Suggested Action流程见 `docs/opencode-icon-conversion.md`；品牌图标转换走 SVG 源 + Edge headless 透明渲染。### Metadata- Source: conversation- Tags: svg, ico, playwright, edge, headless, transparent- Related Doc: docs/opencode-icon-conversion.md





---

## [LRN-20260807-083] insight**Logged**:  2026-08-06T13:10:00+08:00**Priority**:  medium**Status**:  done**Area**:  frontend### SummaryPlaywright `run_code_unsafe` 运行在浏览器页面上下文（无 `require`/`fs`/`setTimeout` 等 Node 全局），不能直接读写本地文件。### Details- 尝试用 run_code_unsafe 读 `.playwright-mcp\*.svg` 渲染截图，报 `ReferenceError: require is not defined`、`setTimeout is not defined`- 它执行在 page 环境（有 `page` 参数），可操作 DOM/截图，但无 Node fs；文件读写需回落本地脚本（Edge headless + PowerShell）或 page 内纯浏览器逻辑### Suggested Action浏览器自动化涉及本地文件 IO 时，用 Edge headless / 本地脚本处理；run_code_unsafe 只用于页面内操作。### Metadata- Source: conversation- Tags: playwright, mcp, run_code_unsafe, sandbox- Related Doc: docs/opencode-icon-conversion.md## [LRN-20260807-084] pz-default-txt-mod-id-root-not-version### Context用户订阅 NoWeightB42 (2606989930)，default.txt 写 `mod = NoWeightB42`，但 mod 不加载。原因是该 workshop item 有两个 mod.info：根目录 `id=NoWeightB41`（无 versionMin），版本目录 `42/id=NoWeightB42`（versionMin=42.0.0）。### Summary**PZ default.txt 匹配 mod 用根目录 mod.info 的 ID，不是版本覆盖目录的 ID。** 含版本目录的 workshop item 必须用根 ID 写 default.txt（如 `mod = NoWeightB41`），游戏会自动按版本选择对应目录。### Suggested Action- 订阅有版本目录的 mod 后，先 `Get-ChildItem mods/*/mod.info` 确认根 ID- default.txt 始终写根 ID，不写版本目录 ID### Metadata- Source: conversation- Tags: project-zomboid, default-txt, mod-loading, versioned-mod- Related Skill: steam-tools





---

## [LRN-20260807-085] pz-db42-carry-weight-vs-bag-slots### Context用户混淆了"格子数"（bag slots）和"负重"（carry weight）。截图 14.01/14 是负重超重，不是格子满。DBU 只改格子（setCapacity），NoWeightB42 只改负重（DoParam Weight=0）。两者独立不冲突。### Summary**B42 两个独立系统：格子（setCapacity，DBU 管）和负重（getCapacityWeight，NoWeightB42 管）。** "无限负重"需要同时处理两者。DBU+DBUP 管格子，NoWeightB42 管负重，加起来才完整。之前 AEV_Unlimited 同时处理两者但被引擎 clamp。### Suggested Action- 无格子/无负重时分别查 DBU（格子）和 NoWeightB42（负重），不要混为一谈- AutoLoot 超重不拾取 = 负重问题，不是格子问题### Metadata- Source: conversation- Tags: project-zomboid, carry-weight, bag-slots, DBU, NoWeightB42- Related Skill: steam-tools- Related Doc: LEARNINGS.md (LRN-20260805-041, LRN-20260807-074)

---

## [LRN-20260807-086] pz-b42-symbols-api-layerid### ContextAutoBuildingLabels 地图标签不显示。日志显示 "Flushed 1 labels to map"（写入成功），但视觉上无标签。根因：`addUntranslatedText(name, "text-building", x, y)` 第二参数应是 `getDefaultTextLayerID()` 返回的层 ID，硬编码字符串 `"text-building"` 可能不是有效层名，符号创建了但不可见。### Summary**B42 symbols API 的 addUntranslatedText 第二参数必须用 `getDefaultTextLayerID()` 获取有效层 ID，不能硬编码字符串。** 错误的 layerID 不会报错，但符号不可见（静默失败）。### Suggested Action- 修 ABL 用 `pcall(symbolsAPI.getDefaultTextLayerID, symbolsAPI)` 获取层，fallback 到 `"text-building"`- 加 `print` 诊断 `addUntranslatedText` 返回值和 layerID### Metadata- Source: conversation- Tags: project-zomboid, worldmap, symbols-api, building-labels- Related Skill: steam-tools

---

## [LRN-20260807-087] pz-modoptions-button-type### Context用户要求来源链接可点击跳转。B42 `Options:addButton(id, name, tooltip, onclickfunc, target, args)` 是 ModOptions 支持的 button 类型，MainOptions.lua 有渲染分支（line 2974）。`setOnClick` 调用 `onclickfunc(args...)`。配合全局 `openUrl(url)` 可打开浏览器。### Summary**PZ ModOptions 支持 addButton 类型（B42 MainOptions 有渲染），可做可点击按钮。** onclick 接收 args 参数（最多4个），用 `openUrl(url)` 打开浏览器。addDescription 只显示文本不可交互。### Suggested Action- 需要可交互的 ModOptions 控件（链接/执行动作）用 addButton- addDescription 只用于静态文本说明### Metadata- Source: conversation- Tags: project-zomboid, modoptions, button, openurl- Related Skill: steam-tools

---

## [LRN-20260807-088] pz-autoload-weight-block### ContextAutoLoot 配置全部物品勾选拾取（5041 件），但货架上 VHS/技能书没被自动拾取。根因：AutoLoot 有负重保护，玩家超重（14.01/14）时拒绝继续拾取。### Summary**AutoLoot 即使配置全选也会在超重时停止拾取（保护机制）。** 超重 → 拾取停止 → 视觉上"自动拾取没生效"。修复负重（NoWeightB42）后 AutoLoot 恢复正常。### Suggested Action- AutoLoot "没拾取"先查是否超重，再查配置- 安装 NoWeightB42（负重=0）= 一劳永逸解决### Metadata- Source: conversation- Tags: project-zomboid, autoloot, overweight, weight-limit- Related Skill: steam-tools

---

## [LRN-20260807-089] pz-patch-section-vs-regular-options### Context用户反馈"自动标记怎么跑补丁分区了"。ABL 是自研功能（不是第三方 mod 补丁），但 initOptions 调了 `AEV.ensurePatchSection(options)` 导致出现在补丁专区。### Summary**`ensurePatchSection` + `OnGameStart` 延迟 = 补丁专区（面板底部）。自研功能应立即注册为普通分类（不调 ensurePatchSection，不延迟 OnGameStart）。** 判断标准：依赖第三方原版 mod → 补丁专区；自研/无原版依赖 → 普通分类。### Suggested Action- ABL 改为 `ABL.initOptions()` 立即调用，不延迟- 新模块：先判断是否补丁，再决定用 ensurePatchSection 还是普通注册### Metadata- Source: conversation- Tags: project-zomboid, modoptions, patch-section, panel-order- Related Skill: steam-tools

---

## [LRN-20260807-090] pz-simpleshops-mod-filter### ContextMSR 商店增加 SimpleBows 物品后，用户问"取消订阅后商店里还有吗"。MSR_ShopData.initialize() 用 `isItemValid(fullType)` 检查 ScriptManager 中物品是否存在，不存在则过滤。取消订阅 → 重启 → 自动过滤消失。### Summary**MSR_ShopData 初始化时有物品存在性检查（`ScriptManager.instance:getItem`），mod 取消订阅后重启自动过滤该 mod 的物品。** 无需手动修改商店配置。### Suggested Action- mod 增减时只需重启游戏，商店自动同步- 但 initialize 用 `_initialized` 防重，重启才能刷新### Metadata- Source: conversation- Tags: project-zomboid, shop, mod-compatibility, item-validation- Related Skill: steam-tools

---

## [LRN-20260807-091] pz-core-display-player-validation### ContextMSR_ShopPatch_CoreDisplay（背包核心数显示）崩溃导致背包栏消失（31次循环崩溃）。根因：`getAllInventories` 收到非 IsoPlayer 对象（CoreDisplay handler 的 playerObj 可能是容器而非玩家），`player:getInventory()` 在非玩家对象上抛 nil。### Summary**ModOptions/控件 handler 的 playerObj 不一定是 IsoPlayer，使用前必须 `instanceof(player, "IsoPlayer")` 校验。** getAllInventories 等遍历玩家容器的函数入口必须加双重保护：① nil check ② instanceof 校验。### Suggested Action- 所有接收 player 参数的共享函数入口加 `instanceof` 校验- ISInventoryWindowControlHandler 的 getControl 里 playerObj 可能是容器，不是玩家### Metadata- Source: conversation- Tags: project-zomboid, core-display, crash, inventory, player-validation- Related Skill: steam-tools

---

## [LRN-20260807-092] pz-autoloot-arrow-simplebows-patch### ContextSimpleBows 射箭后箭在僵尸背包（onHitZombie AddItem），需手动捡尸。补丁方案：① OnHitZombie 后把僵尸背包的 SB_ 箭移到玩家背包 ② OnPlayerUpdate 轮询弓箭数=0 时自动从背包装填。SimpleBows 提供公开 API（SimpleBows_AmmoRuntime + ISSimpleBowsReloadAction），补丁不改源码。### Summary**SimpleBows 箭矢回收+自动装填补丁：OnHitZombie 移箭回玩家 + OnPlayerUpdate 自动装填。** 利用 SimpleBows 公开 API（runtime.getSelectedAmmoType、ISSimpleBowsReloadAction:new），不改 workshop 源码。### Suggested Action- 补丁命名：SB_ArrowPatch（放在补丁专区）- 需要 SimpleBows 先加载（mod.id=SimpleBows），在补丁专区用 require 或 OnGameStart### Metadata- Source: conversation- Tags: project-zomboid, simplebows, arrow-recovery, auto-reload- Related Skill: steam-tools## [LRN-20260807-093] pz-autoloot-isItemSelectedForAutoDrop-blocks-vacuum### ContextALPP 真空拾取重写后仍"需停下才拾取"。根因：`vacuumScan` 用 `isItemSelectedForAutoDrop(item)` 过滤物品，该函数依赖 AutoLoot 的每物品配置（用户未勾选的物品不拾取）。`isAutoLootActiveOnContainerByObj` 同样依赖 AutoLoot 容器配置。### Summary**真空拾取要完全绕过 AutoLoot 的配置检查（isItemSelectedForAutoDrop / isAutoLootActiveOnContainerByObj），否则只在用户勾选过的物品上生效。** 直接扫描所有容器，跳过 `IsInventoryContainer`（不拆包），直接 `container:removeItemOnServer(item)` + `inv:addItem(item)`。也无需 `AutoLoot.isAutoLoot()` 前置判断。### Suggested Action- 真空模式 = 独立拾取循环，与 AutoLoot 配置解耦- 用 pcall 包裹 removeItemOnServer/addItem（部分物品转移可能抛异常）### Metadata- Source: conversation- Tags: project-zomboid, autoloot, vacuum-pickup, alpp- Related Skill: steam-tools

---

## [LRN-20260807-094] pz-isInventoryContainer-throws-on-non-bag### ContextDBUP 右下角持续报错（异常计数 106）。`Bag:IsInventoryContainer()` 在非 InventoryContainer 对象上**抛 Java 异常**，即使 pcall 捕获，游戏仍计入异常并打完整 Java 栈。移除该检查后报错消失。### Summary**PZ 某些 Java 方法（如 IsInventoryContainer）在错误类型对象上直接抛异常，pcall 能捕获但游戏仍记录为异常（污染错误计数）。** 正确做法是调用前检查方法存在（`if Bag.getModData then`）或对调用对象类型有把握再调用，而非依赖 pcall 兜底。### Suggested Action- 对未知类型 Java 对象，先 `if obj.methodName then` 再调用- pcall 只防 Lua 错误，Java 层异常仍会被游戏记录### Metadata- Source: conversation- Tags: project-zomboid, lua, java-interop, exception-handling, dbup- Related Skill: steam-tools

---

## [LRN-20260807-095] pz-shop-category-translation-keys-missing### Context商店分类标签显示原始键名 `UI_ShopCategory_Sell`。根因：MSR_ShopData 用 `UI_n_*` 键，getText 找不到翻译时返回键名本身。CN/EN 的 UI.json 均缺失这些键。### Summary**getText 找不到翻译键时返回键名本身（不返回 nil），导致 UI 显示原始键名。** 修复：补全缺失翻译键即可，无需改代码。ShopData 用 `UI_n_Sell` 等键，但需同时补 `UI_ShopCategory_*`（可能其他文件引用）。### Suggested Action- 新增翻译键后必须 CN+EN 同步- 用 rg 全仓搜键名确认所有引用位置### Metadata- Source: conversation- Tags: project-zomboid, translation, getText, shop- Related Skill: steam-tools

---

## [LRN-20260807-096] pz-shop-icon-slot-size-96-128### Context用户反馈商店图标太小。MSR_ShopGrid.calculateGridMetrics 中 `slotSize = math.min(slotSize, 96)` 限制图标最大 96px。改为 128 后图标更大。### Summary**PZ 自定义商店网格的图标大小由 slotSize 决定，注意 math.min 上限值。** 商店窗口尺寸用 FONT_HGT_SMALL 乘数（62×42），与网格 slotSize 配合决定每行格子数。### Suggested Action- 图标小先查 grid slotSize 上限，再查窗口尺寸### Metadata- Source: conversation- Tags: project-zomboid, shop, ui, grid- Related Skill: steam-tools

---

## [LRN-20260807-097] pz-kick-zombie-vanilla-api### Context踢门补丁 AEV_KickDoor 增强为可踢僵尸。实现：`cell:getZombieList()` 遍历找面前最近僵尸（dot product 判定面向）、`zed:setHealth(zed:getHealth()-dmg)` 造成伤害、`zed:setX/setY` 偏移击退、`player:playSound("KickDoor")` 音效。`zed.hitReaction` 可选触发动画。### Summary**PZ B42 踢僵尸纯 Lua 可实现：setHealth 减血 + setX/setY 位移击退 + playSound。** 找目标用 getZombieList + 方向 dot product（>0 在面前）+ 距离阈值。面向 8 方向需映射 fdx/fdy（斜向用 0.7）。### Suggested Action- 击退方向从玩家指向僵尸归一化，dist<0.01 时兜底- 每个僵尸单独 cooldown key（tostring(zed)），300ms 节流### Metadata- Source: conversation- Tags: project-zomboid, lua, zombie, knockback, kickdoor- Related Skill: steam-tools

---

## [LRN-20260807-098] pz-junk-sell-button-inventory-handler### Context新增"一键出售垃圾"背包按钮：`ISInventoryWindowControlHandler:derive` + `shouldBeVisible()` 常显（不依赖选中物品）+ `getControl()` 建按钮 + `perform()` 扫描背包垃圾物品出售。垃圾判定：JUNK_KEYWORDS 白名单关键词 + KEEP_KEYWORDS 黑名单 + 已读文献。调用 `MSR_ShopPatch.sellAnyItems(player, items)`。### Summary**背包底部自定义按钮 = ISInventoryWindowControlHandler 子类 + ISInventoryWindowContainerControls.AddHandler。** shouldBeVisible 控制显隐，perform 执行动作。垃圾物品过滤用 fullType 关键词黑白名单，比 getCategory 可靠（B42 分类值不直观）。### Suggested Action- `item:IsInventoryContainer()` 过滤容器本体（防卖包）- KEEP_KEYWORDS 优先于 JUNK_KEYWORDS 检查### Metadata- Source: conversation- Tags: project-zomboid, inventory, sell, junk-filter- Related Skill: steam-tools

---

## [LRN-20260807-099] pz-noweightb42-initial-works### Context用户最初反馈"怎么又超重了"（负重 34.2/14.0）。查 mods 文件夹发现只有 AutoEverything，NoWeightB42 未下载。后续用户重启游戏后负重变 1.0/14.0，确认生效。### Summary**Steam 订阅后 mod 需重启游戏（或 Steam 下载完成后）才出现在 mods 文件夹。** 用户反馈 mod 未生效时，先查 `Zomboid\mods\` 是否有对应目录，别急着改代码。NoWeightB42 负重清零对"AutoLoot 超重不拾取"问题直接有效。### Suggested Action- 排查 mod 未生效：先 Test-Path mods 目录 → 再查 default.txt ID → 再查选项- 负重显示 34.2/14.0 = 负重系统生效，NoWeightB42 需重启游戏加载### Metadata- Source: conversation- Tags: project-zomboid, noweightb42, mod-loading, troubleshooting- Related Skill: steam-tools## [LRN-20260807-100] opencode-enabled-providers-empty-models### Contextopencode(Windows 本地 1.18.14)模型选择突然全空,免费+付费模型全消失,当时在用 oc-remote 手机远程连 `opencode serve`。排查发现 `~/.config/opencode/config.json` 出现 `"enabled_providers": []`。### Summary**opencode 的 `enabled_providers` 是白名单,默认 null(不限制);显式设为 `[]`(空数组)会让空 Set 成为 truthy,`enabled.has(id)` 对所有 provider 都 false → 所有 provider 被禁用 → 模型列表全空。** 与 `disabled_providers` 语义不对称(disabled 空数组=不限制)。诊断:`opencode models` 空输出、`opencode models opencode` 报 "Provider not found"、`--refresh` 后依然空;缓存 `~/.cache/opencode/models.json` 完整说明数据没丢。修复:删除 config.json 里 `enabled_providers` 字段(保留 disabled_providers),`opencode models` 恢复 78 个模型。### Suggested Action- 模型列表全空时先查 config.json 是否有 `enabled_providers: []`- 别怀疑网络/缓存:用 `opencode models <provider>` 是否报 "Provider not found" 快速区分过滤问题 vs 数据问题- oc-remote 是纯客户端,但它同步 "hidden models" 客户端偏好;config 写入时间(mtime)与事故时间对比可定位触发器### Metadata- Source: conversation- Tags: opencode, config, enabled_providers, models, troubleshooting- Related Skill: opencode-config

---

## [LRN-20260807-101] cc-switch-apifield-meta-not-settings**Logged**:  2026-08-07T17:00:00+08:00**Priority**:  high**Status**:  done**Area**:  config### SummaryCC Switch 的 `apiFormat` 字段存在 `provider.meta` 中，不在 `settings_config` 中；源码读取优先级为 `meta.api_format` > `settings_config.api_format`(snake_case) > `openrouter_compat_mode`，驼峰 `apiFormat` 不被识别。### Details1. `get_claude_api_format()` (claude.rs) 优先读 `provider.meta.api_format`2. legacy fallback 读 `settings_config.get("api_format")`（下划线 snake_case，非驼峰 `apiFormat`）3. 驼峰 `apiFormat` 在 settings_config 中被完全忽略4. OpenCode Go 的 meta 已默认含 `{"apiFormat":"openai_chat"}`，无需手动修改5. 有效值：`"anthropic"`（默认透传）、`"openai_chat"`、`"openai_responses"`、`"gemini_native"`### Suggested Action配置 CC Switch provider 的 API 格式时，直接通过 UI 操作或确保在 `meta` 字段（而非 `settings_config`）写入 `apiFormat`；不要在 `settings_config` 中添加驼峰版本的 `apiFormat` 字段。### Metadata- Source: conversation- Tags: cc-switch, apiformat, meta, settings-config, anthropic, openai-chat- Related Doc: docs/opencode-config.md





---

## [LRN-20260807-102] opencode-zen-go-distinction**Logged**:  2026-08-07T17:00:00+08:00**Priority**:  high**Status**:  done**Area**:  config### SummaryOpenCode Zen 和 Go 是两套不同的套餐：Zen=按量付费+7个免费模型，Go=$10/月订阅无免费模型，端点和 API key 独立。### Details| 项目 | Zen | Go ||------|-----|-----|| 付费方式 | $20 余额按量付费 | $10/月订阅 || Base URL | `https://opencode.ai/zen/v1` | `https://opencode.ai/zen/go/v1` || 免费模型 | 有（`-free` 后缀，7个） | 无 || chat/completions | `/zen/v1/chat/completions` | `/zen/go/v1/chat/completions` || 模型列表 | `/zen/v1/models` | `/zen/go/v1/models` |免费模型列表（截至 2026-08）：- `deepseek-v4-flash-free`、`mimo-v2.5-free`、`ling-3.0-flash-free`- `nemotron-3-ultra-free`、`north-mini-code-free`、`laguna-s-2.1-free`- `longcat-2.0-free`CC Switch 内置预设（OpenCode Go preset）使用 `https://opencode.ai/zen/go` 作为 base_url，需额外修改才能用 Zen 免费模型。### Suggested Action使用 Zen 免费模型时，CC Switch 配置需将 `ANTHROPIC_BASE_URL` 改为 `https://opencode.ai/zen`（非 `/zen/go`），模型改为对应的 `-free` 后缀模型，并确认 API key 为 Zen key（opencode.ai/auth 创建）。### Metadata- Source: conversation- Tags: opencode, zen, go, free-models, api-key, subscription- Related Doc: docs/opencode-config.md





---

## [LRN-20260807-103] cc-switch-opencode-go-preset-config**Logged**:  2026-08-07T17:00:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### SummaryCC Switch 内置 OpenCode Go 预设的完整配置：base_url=`https://opencode.ai/zen/go`，apiFormat=openai_chat（在 meta 中），需开启 Local Proxy 才能正常工作。### Details从 CC Switch 源码（claudeProviderPresets.ts）确认：```typescript{  name: "OpenCode Go",  websiteUrl: "https://opencode.ai/go",  settingsConfig: {    env: {      ANTHROPIC_BASE_URL: "https://opencode.ai/zen/go",      ANTHROPIC_AUTH_TOKEN: "",      ANTHROPIC_MODEL: "deepseek-v4-flash",      ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek-v4-flash",      ANTHROPIC_DEFAULT_SONNET_MODEL: "deepseek-v4-flash",      ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-v4-flash",    },  },  apiFormat: "openai_chat",  // 存入 meta  endpointCandidates: ["https://opencode.ai/zen/go"],}```关键点：- Zen/Go 是 OpenAI 兼容端点（非 Anthropic），必须开启 Local Proxy 做 Anthropic→OpenAI 格式转换- UI 标签显示"需要路由"即指需开启代理- API key 在 `ANTHROPIC_AUTH_TOKEN` 中设置### Suggested Action配置 CC Switch OpenCode Go 时，确保开启 Local Proxy（Settings → Proxy）；若要使用 Zen 免费模型，还需修改 base_url 和模型名。### Metadata- Source: conversation- Tags: cc-switch, opencode-go, preset, api-format, proxy- Related Doc: docs/opencode-config.md





---

## [LRN-20260807-104] opencode-zen-500-known-bug**Logged**:  2026-08-07T17:00:00+08:00**Priority**:  critical**Status**:  pending**Area**:  infra### SummaryOpenCode Zen/Go 的 chat/completions 推理端点当前返回 500 Internal Server Error，属于已知服务端 bug，与客户端配置无关。### DetailsGitHub issue: [anomalyco/opencode#35276](https://github.com/anomalyco/opencode/issues/35276)相关 issue: #30283、#30310、#33942、#14795（tools 使用时 prompt_tokens undefined）症状：- `GET /zen/v1/models` → 200（模型列表正常）- `POST /zen/v1/chat/completions` → **500 Internal Server Error**（所有模型，无论 key 是否正确）- 即使不带 Authorization header，free 模型也返回 500- 流式/非流式、有无 tools 均复现诊断要点：1. 模型列表端点正常 + 推理端点 500 = 服务端问题，非客户端配置问题2. 用 curl 直接测试 chat/completions 可快速确认3. 此 bug 是间歇性的（issue 描述中有时恢复有时故障）### Suggested Action遇到 Zen/Go 500 错误时，先用 `curl -s https://opencode.ai/zen/v1/chat/completions` 确认是服务端问题；若确认是服务端问题，临时切换到可用的 DeepSeek 官方 Anthropic 端点（`https://api.deepseek.com/anthropic`）。### Metadata- Source: conversation- Tags: opencode, zen, go, 500-error, server-bug, known-issue- Related Skill: opencode-maintenance





---

## [LRN-20260807-105] sqlite-json-quoting-pitfall**Logged**:  2026-08-07T17:00:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### Summary向 SQLite 写入 JSON 字符串时，sqlite3 CLI 会把双引号当标识符解析，导致 JSON 键名丢失引号；需用 SQL 文件管道方式写入。### Details问题：PowerShell 变量拼接的 SQL 字符串中，JSON 双引号被 sqlite3 CLI 吞掉，导致 `{env:{ANTHROPIC_MODEL:xxx}}` 丢失键名引号，CC Switch 解析失败报"Claude configuration must be a JSON object"。解决：先用 PowerShell 生成 UTF-8 SQL 文件（含完整 JSON），再通过管道执行：```powershell$configObj | ConvertTo-Json -Compress | Out-File -FilePath "update.sql" -Encoding utf8Get-Content "update.sql" -Raw | & sqlite3.exe "cc-switch.db"```### Suggested Action通过 sqlite3 CLI 写入含 JSON 的字段时，避免在命令行直接拼接 SQL；改为生成临时 SQL 文件后管道执行，确保 JSON 双引号完整保留。### Metadata- Source: conversation- Tags: sqlite3, json, quoting, cc-switch, database, powershell- Related Skill: opencode-maintenance





---

## [LRN-20260807-106] opencode-clippy-tray-scope**Logged**:  2026-08-07T09:50:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### Summaryopencode-clippy 插件的托盘图标只管理自身 Electron 桌面小宠物窗口，不控制 opencode serve 的 Windows Terminal 窗口。两个进程独立。### Details- opencode-clippy：OpenCode 插件 + Electron 桌面 widget，有独立托盘图标- opencode serve：跑在 WT 里的控制台进程，与 clippy 无 IPC 控制关系- clippy 的托盘 show/hide 只切换自己的 Electron 窗口- 如需 opencode serve 窗口最小化到托盘，需用 ConsoleSystemTray 等外部工具### Suggested Actionopencode serve 的托盘化需求不能用 opencode-clippy 解决，推荐 ConsoleSystemTray（GitHub: yanghuan/ConsoleSystemTray）。### Metadata- Source: conversation- Tags: opencode-clippy, tray, system-tray, opencode-serve, plugin- Related Skill: opencode-maintenance





---

## [LRN-20260807-107] console-app-to-tray-needs-external-tool**Logged**:  2026-08-07T09:50:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryWindows 下将控制台程序（如 opencode serve）最小化到系统托盘，没有原生方案，必须借助外部工具。推荐 ConsoleSystemTray。### Details- Windows Terminal 的 `wt.exe` 是特殊控制台宿主，忽略 LNK WindowStyle、`start /min`、VBScript Run style 等所有启动时最小化标志- PowerShell 隐藏窗口 + P/Invoke ShowWindow 可以在窗口创建后最小化，但会闪现且触发火绒误报- 可行的外部工具：  | 工具 | Stars | 说明 |  |------|-------|------|  | ConsoleSystemTray | - | 专门包装控制台程序进托盘，支持 -m 最小化启动、-s 防休眠 |  | CLITrayWrapper | - | 点击托盘图标切换窗口显隐 |  | runtray-ps | - | 纯 PowerShell，自带 install 命令创建开机自启 |- 配合启动文件夹 .lnk 可实现开机自启### Suggested Action控制台程序托盘化：使用 ConsoleSystemTray，命令 `ConsoleSystemTray.exe -p opencode.exe -a "serve --hostname 0.0.0.0 --port 4096" -i opencode.ico -t "OpenCode Web" -m`。### Metadata- Source: conversation- Tags: windows, system-tray, minimize, console, external-tool, ConsoleSystemTray- Related Skill: opencode-maintenance## [LRN-20260807-108] PZ-NoWeightB42-only-fixes-scripts-not-instances- **问题**: 装了 NoWeightB42 (2606989930) 仍超重。该 mod 只在 OnGameBoot 改物品脚本 Weight=0，已实例化的旧物品不重新读脚本，重量保留原值。- **解决**: 新增 AEV_ZeroWeight.lua 运行时每 3s 遍历主背包+穿戴容器+手持，对所有物品 `item:setActualWeight(0)`。API 确认：vanilla `ISMoveableSpriteProps.lua:227` 用 setActualWeight 改重量。- **关键**: `setActualWeight(float)` 是有效 API（forageSystem/fishing 都用它）；嵌套容器递归最多 3 层防环；wornItems 的 get(i) 可能返回 WornItem 需兼容。## [LRN-20260807-109] PZ-weight-slot-mods-layering- 三 mod 分工：NoWeightB42=无限负重（物品重量清零）；DBU(2996978365)+DBUP=无限格数（DBU.GetUpgradedStats 容量×10）；AutoLoot=自动拾取（其"无视超重"选项不冲突）。- 核心不可卖是设计（MSR_ShopPatch_Pricing.lua:81 SPECIFIC_ITEMS 里 MagicalCore=0）；核心显示 0 因为没出售过物品获得核心。- 出售按钮/右键出售选项只在框选物品后出现（shouldBeVisible 检查 #items>0）。## [LRN-20260807-110] PZ-mod-remove-checklist- 移除一个整合 mod 依赖时：删 Lua 文件 + 清理 ModOptions.ini 里的残留选项条目 + 清理 ModManager 的 ModListData 缓存 + 更新 default.txt + 同步 MODULES.md（含已移除列表）。- ModOptions.ini 残留条目会导致面板仍显示已删除的选项；ModManager HistoryData.cfg 是历史记录可留。## [LRN-20260807-111] PZ-DBUP-setCapacity-spams-WARN-causing-stutter- **问题**: 游戏周期性一卡一卡。Console 每 ~2.6s 刷 8-10 行 WARN：`Attempting to set capacity of Base.Bag_TrashBag/CompanionDogsSaddlebag over maximum capacity of 50`。- **根因**: DBUP_Main.lua applyMultiplier 每 5s 对引擎硬上限容器（trashbag 上限 50）调 `setCapacity(500)`，引擎 clamp 拒绝 → 每轮刷 WARN 写磁盘。因 getCapacity() 被 clamp 返 50 而目标 500，`curCap ~= cap` 永远成立 → 每轮都重试。- **修复**: 读回 setCapacity 后实际容量，若 newCap < 目标（被 clamp）则记入 skippedCaps 类型跳过表，后续轮询直接 return，杜绝重复调用。另加 curCap==cap 早退。- **关键**: PZ InventoryContainer.setCapacity 有引擎硬上限（trashbag=50），且 getCapacity() 会被 clamp 回上限值——判断"是否生效"必须读回而非比较目标。## [LRN-20260807-112] PZ-stutter-diagnosis-log-spam- **问题**: 游戏周期性一卡一卡（每几秒一顿）。- **排查**: 查 console.txt 里高频重复的 WARN/ERROR——按 `f:帧号` 差值估算频率（f:40601→40684→40902 差 83~318 帧 ≈ 每 2.6~5s 一轮），每轮 8-10 行同类 WARN = 某个定时轮询补丁在重复失败。- **常见元凶**: ①DBUP/容量补丁对引擎硬上限容器反复 setCapacity（见 LRN-111）；②`addTickBox` 面板选项残留（ModOptions.ini 损坏行）；③高频 print（OnTick/OnPlayerUpdate 里 print 刷屏）。- **修复思路**: 找到刷屏源头函数 → 加"失败后跳过"缓存表（skippedCaps 等）→ 杜绝重复调用。写轮询补丁时主动规避：setCapacity 前判断 getCapacity()==目标即早退。





---

## [LRN-20260807-113] tailscale-subnet-routing**Logged**:  2026-08-07T18:30:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### SummaryTailscale 子网路由配置：`tailscale up --advertise-routes=192.168.3.0/24` + admin console 批准，让外网设备通过虚拟内网 IP 访问家庭局域网服务。### Details- 笔记端：管理员 PowerShell 执行 `tailscale up --advertise-routes=192.168.3.0/24`，验证 `tailscale status --json` 的 `Self.PrimaryRoutes` 包含该网段- 管理后台：admin.tailscale.com/machines → 笔记本详情 → Subnets → Edit route settings → 勾选批准- 手机端：Tailscale app → Settings → Subnet routes → 开启 Use Tailscale subnets- 效果：手机在外网（4G/5G）用 `http://192.168.3.53:4096` 直接访问 opencode，客户端地址零改动- 子网路由对本账号 tailnet 设备开放，不暴露公网；配合 Basic Auth 双层防护### Suggested Action记录入 `docs/opencode-web-mobile.md` §8### Metadata- Source: conversation- Tags: tailscale, vpn, subnet, nat, remote-access- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-114] tailscale-open-source-alternatives**Logged**:  2026-08-07T18:35:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryTailscale 开源替代方案：ZeroTier（GPLv3，可自建 Moon）、Headscale（Tailscale 开源控制服务器，软路由 Docker 可跑）、EasyTier（国产 Rust 去中心化，国内优化）、frp（反代单服务，手机浏览器访问无需装 app）。### Details- ZeroTier 最接近 Tailscale 成熟度，安卓有 Play/官网 APK- Headscale 用 Tailscale 官方客户端 + 自建控制端，不依赖官方云- frp 适合只暴露单个服务（如 opencode），手机浏览器访问域名即可- F-Droid 版 Tailscale 支持自动更新（解决官方 APK 不自动更新问题）### Suggested Action若 Tailscale 国内 4G 中继不稳或需去中心化，优先考虑 Headscale（软路由 R66S Docker 可跑）或 EasyTier。### Metadata- Source: conversation- Tags: tailscale, zerotier, headscale, frp, vpn- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-115] tailscale-android-accept-subnets**Logged**:  2026-08-07T18:40:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### Summary安卓 Tailscale app 需手动开启 **Use Tailscale subnets** 才能路由子网流量（默认关闭），否则无法访问 tailnet 内的 192.168.x.x 等非 100.x.x.x 地址。### Details- 路径：Tailscale app → Settings → Subnet routes → Use Tailscale subnets → 开启- 开启后手机 VPN 流量自动路由已批准的子网（如 192.168.3.0/24）到对应节点- 若不开此开关，手机只能访问 tailnet 内的 100.x.x.x 地址，无法用 192.168.3.53 访问### Suggested Action子网路由部署后务必检查手机端此开关。### Metadata- Source: conversation- Tags: tailscale, android, subnet, mobile- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-116] tailscale-flclash-coexist**Logged**:  2026-08-07T18:45:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryAndroid 系统同一时刻只能有一个活跃 VPN（VpnService 单槽位），Tailscale 和 FlClash 不能同时生效；分时切换或浏览器级代理并行。### Details- Tailscale 默认 split-tunnel（只接管 100.64.0.0/10 tailnet 网段），其他 App 流量直连- 分时切换：翻墙开 FlClash，连笔记本开 Tailscale（状态栏快捷切换，约 3 秒）- 并行方案：Tailscale 开着 + 浏览器内代理（Firefox 代理插件 / Kiwi Browser），应用代理与系统 VPN 不冲突### Suggested Action日常分时切换即可；频繁同时需要时上浏览器级代理。### Metadata- Source: conversation- Tags: tailscale, flclash, android, vpn, coexist- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-117] router-tailscale-exitnode-openclash**Logged**:  2026-08-07T20:30:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summary软路由装 Tailscale 作 Exit Node + OpenClash 透明代理，手机只装 Tailscale 一个 app 即可全 App 翻墙 + 访问内网，彻底摆脱手机 FlClash。### Details- 部署：iStoreOS 应用商店/opkg 装 `tailscale`（官方源 v1.80.3）→ `tailscale up --advertise-exit-node` → 生成 AuthURL（`tailscale status --json` 的 AuthURL 字段）→ 浏览器授权 → admin console 批准 exit node- 流量路径：手机开 Tailscale → 隧道 → 软路由 tailscale0 → OpenClash(mihomo TUN utun) 透明代理 → 翻墙；访问 192.168.3.x 走更具体的子网路由（笔记本宣告）直连- 手机需同时开启 Use exit node=istoreos + Allow LAN access（否则走 exit node 时内网不通）- 软路由本机翻墙正常（`curl google=200`），mihomo 日志可见手机流量（Fake-IP 源 198.18.0.1）被规则分流### Suggested Action记录入 `docs/opencode-web-mobile.md` §8.8### Metadata- Source: conversation- Tags: tailscale, exit-node, openclash, openwrt, transparent-proxy- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-118] tailscale-dns-warning-fix**Logged**:  2026-08-07T20:35:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### SummaryTailscale 手机端 "DNS unavailable" 警告的消除：手机 Use Tailscale DNS 关掉 + 软路由 accept-dns=true，让 DNS 走系统经隧道由 dnsmasq→mihomo 解析。### Details- 症状：exit node 激活后手机显示 "DNS unavailable - Tailscale can't reach the configured DNS servers"- 根因：手机 Use Tailscale DNS=ON 时，手机 app 本地处理 100.100.100.100，但 admin console 未配置 Global nameserver → 手机无 resolver → 解析失败 → 警告（与软路由无关）- 修复：手机 Use Tailscale DNS=OFF（DNS 走系统 DNS，经隧道到软路由）→ 软路由 dnsmasq hijack（UDP 53 重定向本地）→ 上游 `127.0.0.1#7874`（mihomo）→ Fake-IP 解析- 注意：软路由 `tailscale set --accept-dns=false` 会让 100.100.100.100 SERVFAIL，需保持 accept-dns=true- tailscaled 不监听 100.100.100.100:53（Linux 版由 dnsmasq/nft hijack 承担 DNS 应答）### Suggested Action手机 Use Tailscale DNS 保持关闭；软路由 accept-dns 保持 true。### Metadata- Source: conversation- Tags: tailscale, dns, openclash, fakepip, warning- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-119] tailscale-exitnode-verify-tailscale0-rx**Logged**:  2026-08-07T20:40:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### Summary验证手机是否真正使用 exit node：看软路由 tailscale0 接口 RX 流量是否暴涨，或 mihomo 日志是否出现手机 Fake-IP 流量。### Details- 手机未启用 exit node 时 tailscale0 RX 仅几百字节/几个包；启用后暴涨到百 KB/千包- mihomo 日志：`198.18.0.1:xxxxx --> www.google.com match ... using 节点`（Fake-IP 源 198.18.0.1 是经隧道的手机流量）- 注意 mihomo 日志含 emoji，Windows 下需 `PYTHONIOENCODING=utf-8` 否则 GBK print 崩溃（见 ERR-20260806-012）### Suggested Action诊断 exit node 是否生效先看这两处，别只看客户端 UI。### Metadata- Source: conversation- Tags: tailscale, exit-node, diagnosis, mihomo- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-120] istoreos-busybox-limits**Logged**:  2026-08-07T20:45:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryiStoreOS(OpenWrt) busybox 限制：`grep -P`、`timeout`、`nohup` 均不存在；复杂远程命令用 base64 传参最稳。### Details- busybox grep 无 `-P`（Perl regex），`grep -oP` 报错- `timeout`、`nohup` 不在（精简 busybox），后台任务用 `tailscale up > log 2>&1 &` 会被 SSH 会话杀掉（用 status --json 读 AuthURL 代替）- 远程复杂命令（含引号/管道）经 `[Convert]::ToBase64String` + `echo <b64> | base64 -d | sh` 传递，避免 PowerShell 引号解析问题- **读含中文的 UTF-8 脚本再 base64 必须用 `[System.IO.File]::ReadAllText`**：`Get-Content -Raw` 按 GBK 解码 UTF-8 中文 → 双重乱码 → 远端执行时中文文件名/参数损坏（实测把 `二合一.yaml` 变 `浜屽悎涓€.yaml`）。`Get-Content` 只能读纯 ASCII 脚本### Suggested ActionSSH 软路由执行复杂命令优先 base64 传递；busybox 工具按需探测再组合；含中文脚本 base64 前用 ReadAllText（UTF-8）读取。### Metadata- Source: conversation- Tags: istoreos, openwrt, busybox, ssh, base64- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-121] openclash-api-auth**Logged**:  2026-08-07T20:50:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryOpenClash(mihomo) 控制 API 认证：密钥在 `/etc/openclash/三合一.yaml` 的 `secret` 字段，用 `Authorization: Bearer <secret>` 头；iStoreOS 界面显示的大写 I/l9bwWaB7 可能是小写 L。### Details- 认证：`curl -H "Authorization: Bearer <secret>" http://192.168.3.100:9090/configs`（query `?secret=` 和空认证均 401）- 密钥位置：mihomo 配置 `三合一.yaml` 的 `secret`；`/etc/config/openclash` 里 `dashboard_password` 是网页界面密钥（大写 I 实为小写 L 视觉差异）- 混合端口 7893、控制端口 9090、DNS 7874；mihomo 进程 `-f /etc/openclash/三合一.yaml`- 本机 127.0.0.1:9090 是 FlClash（global-ua 不同），路由器是 192.168.3.100:9090### Suggested Action调试 OpenClash 用 Bearer 认证读 /configs；注意区分本机 FlClash 与路由器 OpenClash 的 9090。### Metadata- Source: conversation- Tags: openclash, mihomo, api, auth, secret- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-113] tailscale-subnet-routing**Logged**:  2026-08-07T18:30:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### SummaryTailscale 子网路由配置：`tailscale up --advertise-routes=192.168.3.0/24` + admin console 批准，让外网设备通过虚拟内网 IP 访问家庭局域网服务。### Details- 笔记端：管理员 PowerShell 执行 `tailscale up --advertise-routes=192.168.3.0/24`，验证 `tailscale status --json` 的 `Self.PrimaryRoutes` 包含该网段- 管理后台：admin.tailscale.com/machines → 笔记本详情 → Subnets → Edit route settings → 勾选批准- 手机端：Tailscale app → Settings → Subnet routes → 开启 Use Tailscale subnets- 效果：手机在外网（4G/5G）用 `http://192.168.3.53:4096` 直接访问 opencode，客户端地址零改动- 子网路由对本账号 tailnet 设备开放，不暴露公网；配合 Basic Auth 双层防护### Suggested Action记录入 `docs/opencode-web-mobile.md` §8### Metadata- Source: conversation- Tags: tailscale, vpn, subnet, nat, remote-access- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-114] tailscale-open-source-alternatives**Logged**:  2026-08-07T18:35:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryTailscale 开源替代方案：ZeroTier（GPLv3，可自建 Moon）、Headscale（Tailscale 开源控制服务器，软路由 Docker 可跑）、EasyTier（国产 Rust 去中心化，国内优化）、frp（反代单服务，手机浏览器访问无需装 app）。### Details- ZeroTier 最接近 Tailscale 成熟度，安卓有 Play/官网 APK- Headscale 用 Tailscale 官方客户端 + 自建控制端，不依赖官方云- frp 适合只暴露单个服务（如 opencode），手机浏览器访问域名即可- F-Droid 版 Tailscale 支持自动更新（解决官方 APK 不自动更新问题）### Suggested Action若 Tailscale 国内 4G 中继不稳或需去中心化，优先考虑 Headscale（软路由 R66S Docker 可跑）或 EasyTier。### Metadata- Source: conversation- Tags: tailscale, zerotier, headscale, frp, vpn- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-115] tailscale-android-accept-subnets**Logged**:  2026-08-07T18:40:00+08:00**Priority**:  high**Status**:  done**Area**:  frontend### Summary安卓 Tailscale app 需手动开启 **Use Tailscale subnets** 才能路由子网流量（默认关闭），否则无法访问 tailnet 内的 192.168.x.x 等非 100.x.x.x 地址。### Details- 路径：Tailscale app → Settings → Subnet routes → Use Tailscale subnets → 开启- 开启后手机 VPN 流量自动路由已批准的子网（如 192.168.3.0/24）到对应节点- 若不开此开关，手机只能访问 tailnet 内的 100.x.x.x 地址，无法用 192.168.3.53 访问### Suggested Action子网路由部署后务必检查手机端此开关。### Metadata- Source: conversation- Tags: tailscale, android, subnet, mobile- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-116] tailscale-flclash-coexist**Logged**:  2026-08-07T18:45:00+08:00**Priority**:  medium**Status**:  done**Area**:  infra### SummaryAndroid 系统同一时刻只能有一个活跃 VPN（VpnService 单槽位），Tailscale 和 FlClash 不能同时生效；分时切换或浏览器级代理并行。### Details- Tailscale 默认 split-tunnel（只接管 100.64.0.0/10 tailnet 网段），其他 App 流量直连- 分时切换：翻墙开 FlClash，连笔记本开 Tailscale（状态栏快捷切换，约 3 秒）- 并行方案：Tailscale 开着 + 浏览器内代理（Firefox 代理插件 / Kiwi Browser），应用代理与系统 VPN 不冲突### Suggested Action日常分时切换即可；频繁同时需要时上浏览器级代理。### Metadata- Source: conversation- Tags: tailscale, flclash, android, vpn, coexist- Related Doc: docs/opencode-web-mobile.md- **关键**: PZ 每行 WARN 都是 Java 调用栈落盘，100 行/秒 ≈ 磁盘 I/O 瓶颈。卡顿优先查日志刷屏，不是 GPU/CPU 满载。





---

## [LRN-20260807-122] powershell-tray-opencode-serve**Logged**:  2026-08-07T21:15:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summaryopencode serve 开机自启 + 最小化到系统托盘：PowerShell WinForms 托盘脚本（零第三方依赖）+ 计划任务（登录触发），避开火绒误报。### Details- **背景**：第三方托盘工具（ConsoleSystemTray 仅 12 stars、无签名、VT 2/72；GitHub 搜遍无高 star 同类）→ 弃用，改自写 PowerShell 脚本- **脚本** `scripts/opencode-tray.ps1`：加载 WinForms/Drawing → 启动 `opencode.exe serve --hostname 0.0.0.0 --port 4096`（隐藏窗口）→ NotifyIcon（opencode.ico 256x256 加载成功）→ 右键菜单（打开 Web/重启/日志/退出）→ Application.Run()- **开机自启**：`Register-ScheduledTask`（AtLogOn + `New-ScheduledTaskPrincipal -LogonType Interactive`），**不用 .lnk**（避开 ERR-20260807-003 火绒误报）- **防重复**：Start-OcService 先查 4096 端口占用，已监听则跳过（托盘仅作指示）- **真实 exe 路径**：`AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`（npm shim 是 .ps1/.cmd，需用真实 exe 避免 cmd 窗口）### Suggested Action记录入 `docs/opencode-web-mobile.md` §3；脚本含中文需 UTF-8 BOM（见 ERR-20260806-013）。### Metadata- Source: conversation- Tags: opencode, tray, autostart, powershell, scheduled-task- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-123] env-var-pollution-server-password**Logged**:  2026-08-07T21:20:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summarybash/opencode 会话进程环境的 `OPENCODE_SERVER_PASSWORD` 可能与 User 级注册表值不一致（本机 36 vs 16 字符），托盘脚本启动 serve 时须显式设 User 级密码，否则手机认证 401。### Details- 症状：托盘脚本启动的 serve 用手机配置的密码（User 级 16 字符）验证返回 401；旧 WT 窗口启动的 serve 同密码 200- 根因：`Start-Process` 继承 bash 进程环境（36 字符，疑似污染），≠ `[Environment]::GetEnvironmentVariable(...,"User")`（16 字符）- 修复：脚本里启动前 `$env:OPENCODE_SERVER_PASSWORD = [Environment]::GetEnvironmentVariable("OPENCODE_SERVER_PASSWORD","User")`- 验证：`curl -H "Authorization: Basic <b64(opencode:pwd)>"` 而非 `-u`（避免特殊字符引号问题）### Suggested Action任何脚本用 Start-Process 启动 opencode serve，必须先显式注入 User 级密码环境变量。### Metadata- Source: conversation- Tags: opencode, password, env-var, basic-auth, server- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-124] clear-http-proxy-tailscale-exit-node**Logged**:  2026-08-07T22:40:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### SummaryMCP 直连不设 HTTP_PROXY，靠 Tailscale Exit Node（istoreos）走软路由 OpenClash TUN 自动翻墙，不依赖软路由 7893 端口。### Details- 清空 User 级 `HTTP_PROXY`/`HTTPS_PROXY`（`SetEnvironmentVariable(...,$null,"User")`）- MCP 直连 → Tailscale 隧道 → 软路由 → OpenClash TUN 透明代理 → 翻墙- 验证：直连 curl google/github/steam 均 200，出口 IP 显示新加坡（OpenClash 节点）- npm 代理保留 `Clash:****@192.168.3.100:7893` 作兜底（Tailscale 关了 npm 也能下载）- GITHUB_TOKEN 需设 User 级（从 `gh auth token` 导出），否则 GitHub MCP 红灯### Suggested ActionMCP 不依赖 HTTP_PROXY，靠 Tailscale exit node 翻墙。npm 代理保留作兜底。### Metadata- Source: conversation- Tags: tailscale, exit-node, http-proxy, mcp, proxy- Related Doc: AGENTS.md





---

## [LRN-20260807-125] npm-proxy-flclash-shutdown-trap**Logged**:  2026-08-07T22:45:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### SummaryFlClash 关闭后 npm 代理（127.0.0.1:7890）变成死代理，导致 npx 无法下载 MCP 包 → MCP 全红。npm proxy 必须指向可用代理。### Details- 根因：`npm config set proxy/https-proxy` 写入 `.npmrc`，FlClash 关闭后端口无人监听- 症状：opencode 重启后 exa/playwright/tavily MCP 红灯，github/context7 正常（不依赖 npx）- 修复：`npm config set proxy http://Clash:****@192.168.3.100:7893` + `npm config set https-proxy ...`- 教训：**切换代理软件时必须同步更新 npm 代理配置**### Suggested Actionnpm 代理始终指向稳定的代理（软路由），不跟随客户端软件切换。### Metadata- Source: conversation- Tags: npm, proxy, flclash, openclash, mcp- Related Doc: AGENTS.md





---

## [LRN-20260807-126] router-docker-opencode-backup**Logged**:  2026-08-07T23:00:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summary软路由（iStoreOS ARM64/musl）Docker 部署 opencode serve 1.18.15 作为 24h 备份，笔记本睡眠/更新时手机经 Tailscale 访问。### Details- **musl 兼容性**：GitHub 0.0.55 是 Bun 静态编译（musl 可直接跑，但无 `--hostname`）；npm 的 1.18.15 是 glibc 动态链接（musl 报 `ld-linux-aarch64.so.1` 缺失）→ 需 Docker- **Docker**：`node:20-slim` 基础镜像（直连 Docker Hub 拉取成功；daemon.json 原代理 `127.0.0.1:7890` 拉取 EOF，改 `{}` 直连 OK）- **构建**：`COPY opencode /usr/local/bin/opencode` + `CMD ["opencode","serve","--hostname","0.0.0.0","--port","4096"]` → 镜像 589MB- **运行**：`docker run -d --name opencode --restart always -p 4096:4096 -v /etc/opencode:/root/.config/opencode -v /etc/opencode/data:/root/.local/share/opencode -e OPENCODE_SERVER_PASSWORD=...`- **认证/模型**：auth.json（`opencode-go` key，复用笔记本）+ opencode.json（`model: opencode-go/deepseek-v4-flash`）；容器重启后 auth 加载生效（首次调用报 `j.split` 错误，重启后正常）- **验证**：本机 4096 health 200；Tailscale IP 100.97.187.104:4096 200；模型调用 "OK"### Suggested Action软路由 opencode 备份可复用；手机访问 `http://100.97.187.104:4096`（Tailscale）或 `http://192.168.3.100:4096`。### Metadata- Source: conversation- Tags: opencode, docker, openwrt, musl, backup, arm64- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-127] router-opencode-browser-playwright**Logged**:  2026-08-07T23:30:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summary软路由 Docker 里的 opencode 可以配置 playwright MCP 使用 Chromium headless 浏览器（ARM64 可行，按需启动）。### Details- 安装：容器内 `npm install -g @playwright/mcp@latest` + `npx @playwright/mcp install-browser chrome-for-testing`（需装 chromium-1237，不是只有 headless-shell）- opencode.json 配 `mcp.playwright`：`command: ["npx","-y","@playwright/mcp@latest","--browser=chromium","--headless"]`- 验证：`opencode run -m opencode-go/deepseek-v4-flash "用浏览器打开 https://example.com 告诉我标题"` → 成功返回 "Example Domain"- **内存**：Chromium 按需启动（瞬时 CPU 93% 峰值，容器内存瞬涨到 500MB+），用完释放；常驻仅 211-410MB- **注意**：MCP server 默认用 `chrome-for-testing`（chromium-1237），单装 `chromium-headless-shell`（1234）会报 "Browser not installed"### Suggested Action软路由 opencode 可作手机端浏览器搜索备份；浏览器调用瞬时耗资源，避免频繁/并发调用。### Metadata- Source: conversation- Tags: opencode, playwright, chromium, docker, arm64, backup- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260807-128] router-opencode-config-copy**Logged**:  2026-08-07T23:50:00+08:00**Priority**:  high**Status**:  done**Area**:  infra### Summary笔记本 opencode 配置复制到软路由备份实例的取舍：复制核心通用配置 + exa/context7/github MCP，跳过插件/playwright-edge/tavily。### Details- **复制**：模型（opencode-go/deepseek-v4-flash + small_model）、default_agent、permission（*:allow + bash 危险命令 ask）、compaction、tool_output、attachment、instructions(AGENTS.md)- **MCP 复制**：exa（npx exa-mcp-server + EXA_API_KEY）、context7（npx @upstash/context7-mcp + CONTEXT7_API_KEY）、github（remote api.githubcopilot + GITHUB_PERSONAL_ACCESS_TOKEN）、playwright（已配，固化石）- **跳过**：playwright-edge（无 Edge）、tavily（免费额度 1,000 credits/月，每月 1 号重置，耗尽等次月）、plugin（路径不同）、lsp/formatter（备份不需要）、username/watcher（路径不符）- **Docker 固化**：playwright + npm 镜像（npmmirror）写进 Dockerfile 重新 build，容器重建不丢- **环境变量注入**：容器重建 `docker run -e EXA_API_KEY/CONTEXT7_API_KEY/GITHUB_PERSONAL_ACCESS_TOKEN/OPENCODE_SERVER_PASSWORD`（-e 无法热加，需重建）- **验证**：exa 搜索、context7 文档、github 搜索均返回结果；health 200；Tailscale IP 访问 200### Suggested Action软路由 opencode 已配 4 个 MCP（playwright/exa/context7/github）；tavily 缺配额，每月 1 号恢复。### Metadata- Source: conversation- Tags: opencode, mcp, docker, config-copy, tavily- Related Doc: docs/opencode-web-mobile.md## [LRN-20260807-129] PZ-ModManager-requires-ModLoadOrderSorter- **问题**: MODULES.md 旧记录"ModLoadOrderSorter_b42 + ModManager 同时装可能致选项菜单不显示/乱码，二选一"。- **真相（代码级验证）**: 两者是设计好的配套，非冲突——①Mod Manager 的 mod.info:11 显式 `require=ModLoadOrderSorter_b42`；②Mod Manager `ModSelector.lua:5` require 且 `:263` 调用 `MLOS_sorting:SortModsOrder()` 做"Sort & Apply"；③MLOS `MLOS_sorting.lua:18` 排序优先级表首项 `ModManager = 1`；④Mod Manager 官方不兼容列表（Zed's Better ModList/WorkshopUpdateChecker/ClientModsToServer/BetterServerSettings/MultiplayerUI/ZombieBuddy-soft）不含 MLOS。- **共存机理**: 两者都动 `OptionScreens/ModSelector`，但 MLOS override `ModLoadOrderPanel`/`ModOrderListBox`（加载顺序面板），Mod Manager override `ModSelector` 主类 + `MainOptions:addModOptionsPanel`（列表/信息/选项）——不同 hook 层面。- **排查教训**: "判断两个 mod 是否冲突"先看 mod.info 的 require/incompatible + 双方是否 require 对方模块 + hook 的目标类是否重叠，不要凭主观印象记结论。Workshop 评论区常不可靠（Mod Manager 作者明说"评论不处理 bug 报告"）。- **相关**: MLOS 对 ServerSettingsScreen 也做 override 但会检测 `ClientModsToServer` 存在时跳过（`MLOS_ServerSettingsScreen_overrides.lua:144`），说明作者有同类冲突规避意识。## [LRN-20260807-130] PZ-wornItems-getItem-unpacking- **问题**: `player:getWornItems():get(i)` 返回 WornItem 对象（带 `getItem()` 方法的包装），直接对其调 `IsInventoryContainer()` / `setActualWeight()` 报 nil 调用异常。- **修复**: 先 `wornItem:getItem()` 获取实际 IsoInventoryItem 对象，再对物品对象调用 API。WornItem 本身只有 `getItem()`、`getBodyLocation()` 等有限方法，不继承物品方法。- **类比**: 类似 Java 的 `getItem()` 解包；`getWornItems()` 是 `ArrayList<WornItem>`，不是 `ArrayList<IsoInventoryItem>`。- **相关 ERR**: ERR-20260807-013## [LRN-20260807-131] PZ-mod-removal-MSR-ShopPatch- **任务**: 用户重新订阅原版商店扩展（3711250417），从 AutoEverything 中移除 MSR 商店补丁（15 文件 + 108 翻译键）。- **移除清单**: ①删除 client MSR_ShopDetails/Grid/Integration/Patch_Button/Context/Patch_CoreDisplay/Patch_Main/Patch_ModOptions/Window (9) + shared MSR_ShopData/Patch_Pricing/TraitReborn (3) + server MSR_ShopServer/RefugeExpansion/TraitRebornServer (3)；②翻译 CN/EN UI.json 中 UI_Shop_* 键全部删除；③AEV_PauseWindows 移除 MSR_ShopWindow 实例检测（保留 MSR_UpgradeWindow）；④ModOptions.ini 删除 MSR_ShopPatch_* 配置行；⑤MODULES.md 删除 MSR 商店模块条目、更新文件总数 34→19、更新原版 mod 替代表格。- **关键**: 移除 MSR 商店后 AEV_PauseWindows 仍依赖 MSR_UpgradeWindow（避难所升级窗口，来自 myspatialrefuge 主 mod），该依赖通过 `require=myspatialrefuge` 保持有效。- **相关 ERR**: 本轮同时修复 ERR-20260807-013（AEV_ZeroWeight worn:getItem 解包）。## [LRN-20260808-131] tailscale-router-subnet-route-phone- **问题**: 软路由 Tailscale 作为 exit node + subnet router（广告 192.168.3.0/24），手机连上 exit node 后外网正常但内网（192.168.3.100）不通；笔记本却可以。- **根因**: 软路由 Tailscale 版本太旧（OpenWrt 包 1.80.3）导致子网路由同步异常，手机 AllowedIPs 收不到 192.168.3.0/24。更新软路由 Tailscale 到最新静态二进制（1.82.5）后解决。- **诊断方法**: `tailscale status --json` 看各节点 AllowedIPs——手机没有 192.168.3.0/24 就是没收到子网路由；对比笔记本有则说明软路由广告正常、问题在手机同步。- **更新软路由 Tailscale**: OpenWrt 的 `opkg` 包太旧，官方 `install.sh` 也不认 iStoreOS。手动方案：从 https://pkgs.tailscale.com/stable/ 下载 `tailscale_<ver>_arm64.tgz`，解压后把 `tailscale`（客户端，约 19MB）和 `tailscaled`（守护进程，约 36MB）分别装到 `/usr/sbin/`。注意 OpenWrt 的 `/usr/sbin/tailscale` 原是指向 `tailscaled` 的符号链接，换成独立二进制即可。- **坑**: 更新 tailscaled 后 `/etc/init.d/tailscale restart` 会执行 up.sh；up.sh 若用 bash 的 `config_load`/`config_get` 会报 `not found`（OpenWrt 是 ash），改用 `uci -q get tailscale.settings.xxx`。- **坑**: 中途 SSH 短暂连不上不要慌——软路由没重启，可能只是 tailscaled --cleanup 时网络抖动；用 Web 后台确认服务正常即可。- **相关**: 手机 Android 12 + Tailscale 1.102.2 无问题；问题全在软路由端版本。### Metadata- Source: conversation- Tags: tailscale, openwrt, subnet-router, exit-node, android, debugging- Related Doc: docs/router.md, docs/opencode-web-mobile.md## [LRN-20260808-132] tailscale-openclash-conflict-audit- **发现**: iStoreOS 上 Tailscale + OpenClash 存在已知冲突风险：  1. **iptables/nftables 混用**：Tailscale 配置 w_mode='nftables'，但 iptables-nft 包（Docker 依赖）会引入 iptables 层，导致双重过滤。已清理 iptables 旧规则（ts-input/ts-forward），保留 nftables。  2. **OpenClash 运行后 Tailscale 掉线**（Issue #14595）：开启 OpenClash 可能导致 Tailscale 掉线，需重启恢复。  3. **Tailscale IPv4 打洞失败**（Issue #4434）：OpenClash 运行一段时间后，Tailscale 流量被误判为"漏网之鱼"走代理，IPv4 直连失败。重启 OpenClash 可临时恢复。  4. **iStoreOS Tailscale 插件问题**（Issue #2432）：官方插件使用 iptables 规则，混用 nftables 导致过滤不完整；且强制使用 Tailscale DNS。- **修复**: 清理 iptables 旧规则（iptables -F; iptables -X），保留 nftables；确认 Tailscale 正常。- **未解决**: iptables-nft 包（Docker 依赖）无法卸载，"meta sreg is not an immediate" 错误持续但不影响功能。- **建议**: 定期检查 iptables 规则是否被 OpenClash/Docker 重新添加混用规则。### Metadata- Source: conversation- Tags: tailscale, openclash, istoreos, nftables, iptables, conflict- Related Doc: docs/router.md## [LRN-20260808-133] router-opencode-toolkit-expansion- **目标**: 最大化软路由 opencode 的搜索/信息收集/自动化能力。- **容器工具固化**（Dockerfile）: apt install curl wget git jq ca-certificates openssh-client unzip python3 procps（Debian 12 基础）。- **SSH 管理软路由**: 容器内生成 ed25519 密钥 → 公钥加入宿主 dropbear `/etc/dropbear/authorized_keys`（**不是** /root/.ssh/！iStoreOS 用 dropbear 读 /etc/dropbear/authorized_keys）。已验证 `ssh root@192.168.3.100` 可执行 uci/tailscale status。- **密钥持久化**: 容器重建丢 /root/.ssh，所以：把 .ssh 复制到数据挂载 `/root/.local/share/opencode/ssh-backup`（宿主 /etc/opencode/data/ssh-backup），Dockerfile 加 entrypoint 启动时自动恢复。- **tavily MCP**: 加 `@mcptools/mcp-tavily`，TAVILY_API_KEY 环境变量注入。**免费额度 1,000 credits/月，每月 1 号重置**，耗尽等次月 1 号（已在 AGENTS.md 说明）。- **r.jina.ai 需 API key**: 免费匿名访问对数据中心 IP（AS30058）返回 401 封锁，需去 https://jina.ai 注册免费 key 才能用。笔记本和软路由同样受影响（同出口 IP）。- **笔记本 curl 残留代理**: 当前 bash 会话有 `http_proxy=http://127.0.0.1:7890`（FlClash 死端口）导致 curl 外网失败；`curl --noproxy "*"` 跳过即可。User/Machine 级环境变量已是空（之前 LRN-20260807-124/125 清理过）。### Metadata- Source: conversation- Tags: opencode, router, ssh, dropbear, mcp, tavily, docker- Related Doc: docs/opencode-web-mobile.md## [LRN-20260808-134] tailscale-opkg-hold-and-proxy-residue- **opkg hold 防止旧版覆盖**: 软路由手动更新 Tailscale 1.82.5 后，opkg 记录仍是 1.80.3-r1。用 `opkg flag hold tailscale` 阻止自动升级覆盖；hold 状态在 sysupgrade 后丢失，所以把 `opkg flag hold tailscale 2>/dev/null` 加进 `/etc/rc.local`（**必须放在 `exit 0` 之前**，OpenWrt 默认 rc.local 的 exit 0 在文件末尾，追加的命令不会执行）。- **OpenWrt dropbear 公钥路径**: iStoreOS 用 dropbear（非 OpenSSH），读 `/etc/dropbear/authorized_keys` 而非 `/root/.ssh/authorized_keys`。容器公钥要加进前者。- **opencode serve 残留代理**: FlClash 时代启动的 serve 进程会继承 `http_proxy=http://127.0.0.1:7890`（死端口），导致该会话内 curl 外网全失败（000）。`curl --noproxy "*"` 可绕过；User/Machine 级注册表已是空（LRN-20260807-124/125 清过），**重启 serve 即彻底消失**。判断方法：`$env:http_proxy` 在 bash 子进程里非空即 serve 仍带旧环境。### Metadata- Source: conversation- Tags: openwrt, tailscale, opkg, dropbear, proxy, curl- Related Doc: docs/router.md## [LRN-20260808-132] steam-workshop-subscribe-via-opencli-browser- **任务**: 用 OpenCLI 浏览器（Edge 登录态）订阅 PZ Workshop mod。- **订阅操作流程**: ①`opencli browser <session> open <url>` 导航到 filedetails 页；②`find --css "#SubscribeItemBtn"` 找订阅按钮；③**不能直接 click**（click 不触发 Steam 的 onclick），要 `eval` 读按钮 onclick 属性（`SubscribeItem('id','108600')`）然后 eval 直接调用；④验证：按钮 class 出现 `toggled` = 已订阅，消失 = 未订阅。- **关键**: Steam 订阅按钮 onclick 是 `SubscribeItem(id, appid)`，`opencli click` 的合成点击不触发；必须 eval 直接调该函数。JS 传参用 `Get-Content file -Raw` 读取临时文件避免 PowerShell 转义（正则 `/`、`?`、中文都会踩坑）。- **Steam 下载卡住的真凶（ERR-20260808-014）**: 订阅成功但本地不下载——`logs\content_log.txt` 全 `failed to send manifest request`，走 `127.0.0.1:7890`（FlClash 旧代理，已弃用，端口无服务）。来源 `HKCU\...\Internet Settings\ProxyServer=127.0.0.1:7890`（ProxyEnable=0 但 Steam 仍读）。修复：清空 ProxyServer + 重启 Steam → 下载走软路由 TUN 直连成功。- **触发下载**: Steam 订阅变更后需 Steam 客户端在线且触发一次下载循环；代理失效时永远卡住。重启 Steam 生效。- **关联**: acf `TimeLastUpdated` 变化 = 订阅已同步到客户端；`NeedsDownload=1` = 待下载。取消订阅的 mod 会被 Steam 自动删目录。## [LRN-20260808-001] router-syncthing-android-photo-backup**Logged**: 2026-08-08T10:10:00+08:00**Priority**: medium**Status**: done**Area**: infra### Summary软路由（iStoreOS 24.10.6, aarch64, 2GB RAM）用 opkg 原生包装 Syncthing 1.30.0，配合安卓官方 App 实现手机照片/视频自动备份到 USB 移动硬盘。关键：init 脚本默认 `enabled=0` 需 uci 启用；`home` 目录建议从内置 flash 迁到外置 USB 盘（overlay 仅 1.3G，索引 db 会膨胀）。### Details- **连接软路由**：笔记本 SSH 直连用 `id_router` 密钥（`~/.ssh/id_router`），不是默认 key；AGENTS.md 记的"容器内 ssh"是软路由备份实例的路径，笔记本直连用 `ssh -i ~/.ssh/id_router root@192.168.3.100`- **安装**：`opkg update && opkg install syncthing`（cernet 镜像，aarch64_generic 有 1.30.0-r3）；`luci-app-syncthing` 源里没有，Syncthing 自带 8384 Web UI 够用- **启动坑**：装完 `/etc/init.d/syncthing start` 后进程不启动（status 显示 "active with no instances"）——init 脚本要求 `/etc/config/syncthing` 里 `option enabled '0'` 改为 `1`（`uci set syncthing.syncthing.enabled=1`）- **home 目录**：默认 `/etc/syncthing`（内置 flash/overlay 只有 1.3G 可用）。注释建议生产用外置存储。改 `uci set syncthing.syncthing.home='/mnt/usb4-1/syncthing'` + `chown syncthing:syncthing`，避免索引 db 撑爆 overlay- **端口**：8384(Web UI) / 22000(tcp+udp 同步) / 21027(udp 发现)，内网防火墙默认放行- **备份目录**：`/mnt/usb4-1/photos-backup`（chown syncthing），Web UI 里设 Receive Only，安卓端 DCIM 目录设 Send Only- **验证**：`curl http://192.168.3.100:8384` HTTP 200；`/etc/init.d/syncthing enabled` 确认随开机自启### Suggested Action软路由跑 Syncthing 部署路径：opkg 装包 → uci 设 enabled=1 + home 指到 USB 盘 → 启动 → 8384 Web UI 配共享目录（Receive Only）→ 安卓 App 扫码配对。笔记本 SSH 管理软路由用 `~/.ssh/id_router`。### Metadata- Source: conversation- Tags: syncthing, iStoreOS, openwrt, android, photo-backup, usb, opkg, ssh- Related Skill: N/A- Related Doc: docs/router.md## [LRN-20260808-002] syncthing-folder-id-mismatch-android-app**Logged**: 2026-08-08T10:25:00+08:00**Priority**: high**Status**: done**Area**: infra### SummarySyncthing 安卓 App 创建文件夹时**文件夹 ID 由 App 自动生成随机短 ID**（如 `0ond6-sh9q7`），不是用户填的名称；且手机端 App 里文件夹 ID **不可编辑**。服务端手工建的文件夹 ID（如 `photos-backup`）与手机端不一致会被拒绝（FolderRejected 事件）。解法：改服务端文件夹 ID 匹配手机端，或扫码/邀请链接自动配对。### Details- 现象：软路由端建好 `photos-backup` 文件夹（receiveonly）并配对设备后，手机端添加文件夹只填了名称"photos-backup"，但 App 实际生成的文件夹 ID 是 `0ond6-sh9q7`，两端 ID 不一致 → 服务端事件出现 `FolderRejected` + `PendingFoldersChanged`，手机设备 `connected=false`- 排查：`/rest/events?since=0` 看到 FolderRejected 的 folder 字段是 `0ond6-sh9q7`；`/rest/cluster/pending/folders` 能看到手机端 offer 的 folderID- 修复：PUT 全量 config 把服务端文件夹 `id` 从 `photos-backup` 改为 `0ond6-sh9q7`（路径 `/mnt/usb4-1/photos-backup`、type receiveonly 不变），pending 立即清空，随后握手连接成功，100 个文件全部同步- Syncthing 配对时**两端文件夹 ID 必须完全一致**；设备 ID 配对 ≠ 文件夹共享，文件夹要单独共享给设备- REST API 经验：`POST /rest/config/folders`（建文件夹）返回 200 但 `POST /rest/config/folders/{id}/devices/{id}` 返回 404（路径不对），正确做法是 GET /rest/config 全量 → 改 JSON → PUT /rest/config；PS 写 JSON 必须无 BOM（`[System.IO.File]::WriteAllText(..., UTF8Encoding::new($false))`），Out-File/Set-Content 的 UTF8 带 BOM 会报 `invalid character 'ï'`### Suggested Action软路由/服务端手动配 Syncthing 文件夹时：要么用手机 App 生成邀请链接/二维码让服务端接受（ID 自动一致），要么先看手机端实际生成的 folder ID 再改服务端匹配。排查不同步先看 `/rest/events` 的 FolderRejected 和 `/rest/cluster/pending/folders`。### Metadata- Source: conversation- Tags: syncthing, folder-id, android, pairing, rest-api, utf8-bom- Related Skill: N/A- Related Doc: docs/router.md## [LRN-20260808-133] PZ-AutoEverything-optimization-round- **任务**: 借鉴热门 mod 优化 AutoEverything（AEV_Spatial + AutoEat）。- **AEV_Spatial 容器保护**: 参考 Professional Mover (3637951074，已下架) / Rebalanced Prop Moving (2699828474)。Rebalanced 评论区高频坑 = **带物品收纳容器类家具后物品丢失**。修复：`emptyContainerInto` 递归清空容器物品到玩家背包，失败中止 + `IGUI_AEV_Spatial_ContainerFull` 提示，绝不静默丢物品。错误分级：not-moveable/pickup-failed/container-full/transfer-failed。- **AutoEat 冷却**: Auto Eat (2977628726) 评论高频差评 = "取消动作后立刻又吃"。加 `lastEatTime` + `COOLDOWN_MS=3000`，入队进食动作后 3s 冷却。- **关键验证**: EN UI.json 有非法尾逗号（第74行 `"UI_n_Mod": "Mod",`）→ PZ 的 JSON 翻译文件不能有尾逗号（严格 JSON）。用 `json.load` 全量验证 CN/EN 全部 6 个翻译文件 OK。- **热门 mod 调研结论（借鉴）**:  - Pro Mover 已下架（违反 Steam 准则）；Rebalanced Prop Moving 的"容器复制/物品丢失"bug 是社区热点——**绝不在收容器时动内部物品**（我们改成先清空）。  - EasyDoors/FBI 共性 bug：B42 玩家自建门 + 自动关门类 mod 冲突。ACWP 只管窗/帘不管门，天然规避。  - UGO 感应灯"玩家远离全灭"bug：状态持久化问题。ALP 只在 OnPlayerUpdate 触发，玩家远离不误关（安全）。  - Drink/Eat Smart 双版本发布处理右键冲突；Companion Dogs 沙盒 tooltip 非法格式符崩主菜单（`%`/`)`）→ 翻译必须格式符安全。- **参考**: ERR-20260808-014（Steam 代理坑）、LRN-20260808-132（OpenCLI 订阅流程）。## [LRN-20260808-135] tailscale-subnet-router-lan-hijack- **症状**: 软路由局域网(192.168.3.100)突然无法访问, 但 Tailscale IP 正常, OpenClash 仍在运行。笔记本 ping 软路由不通、软路由 ping 网关/笔记本全丢包。- **根因**: Tailscale 配置 `advertise_routes='192.168.3.0/24'` (subnet router), 会在本机 `table 52` 添加 `192.168.3.0/24 dev tailscale0`, 而 `ip rule 5270: from all lookup 52` 优先级高于 main 表。导致软路由本机访问局域网全部被劫持到 tailscale0, 回包丢失。- **诊断方法**: `ip route show table 52` 看到 `192.168.3.0/24 dev tailscale0`; `ip rule` 看到 5270 lookup 52 在 32766 lookup main 之前。验证: `ip rule add from all to 192.168.3.0/24 lookup main pref 100` 后立即恢复连通, 删除后立即断。- **修复**: 在 `rc.local` + `/etc/tailscale/up.sh` + `/etc/openclash/custom/openclash_custom_firewall_rules.sh` 三处添加 `ip rule del from all to 192.168.3.0/24 lookup main pref 100 2>/dev/null; ip rule add from all to 192.168.3.0/24 lookup main pref 100`(幂等, 三重保险)。- **教训**: Tailscale subnet router 广告本机所在网段是经典坑, 别在 OpenClash 找原因(它只是导火索)。重启后规则会重建, 必须持久化到启动脚本。- **OpenClash 重启坑**: `/etc/init.d/openclash restart` 会阻塞 SSH; busybox 无 `nohup`/`timeout`, 用 `setsid /etc/init.d/openclash restart >/log 2>&1 </dev/null &` 分离。快速启动模式 `Quick Start Mode` 会跳过配置修改, 删除 `/tmp/openclash.change` 强制完整模式。- **OpenClash overwrite 机制**: `/etc/openclash/overwrite/<name>` 支持 `[YAML]` 块, 通过 `YAML.overwrite` 深度合并; `+key` prepend, `key+` append, `key!` force。需 uci 注册 `config_overwrite` (name/enable/order/config)。但快速模式不执行 overwrite。### Metadata- Source: conversation- Tags: tailscale, openwrt, routing, ip rule, openclash## [LRN-20260808-136] openclash-xfltd-file-provider-persistence- **需求**: XFLTD 机场订阅链接 10 分钟过期, 需要像电脑 Clash Verge "永不刷新"一样在 OpenClash 永久缓存节点。- **方案**: 用 **file 类型 proxy-provider** 实现本地缓存:  1. 把节点固化为 `/etc/openclash/proxy_provider/Provider_XFLTD.yaml`(纯 proxies 列表)。  2. 在源配置 `/etc/openclash/config/二合一.yaml` 添加 `Provider_XFLTD: {type: file, path: ./providers/Provider_XFLTD.yaml, ...}` + 策略组 + 所有 use 列表加 Provider_XFLTD。  3. OpenClash 生成时自动把 path 改写成 `./proxy_provider/`(init.d 3655 行的 provider path 处理逻辑对 file/http 通用, File.basename 保留文件名)。  4. 热重载: `curl -X PUT http://127.0.0.1:9090/configs -d '{"path":"/etc/openclash/二合一.yaml"}'` + Bearer secret。- **关键**: 必须同时注入**源配置** config/ 目录(OpenClash 重启会从源配置重新生成根目录配置, 只改根目录会丢); mihomo 加载根目录 `/etc/openclash/二合一.yaml`。- **验证**: `curl http://127.0.0.1:9090/providers/proxies/Provider_XFLTD` 返回 `"vehicleType":"File"` 即本地缓存生效, 之后订阅链接失效不影响。- **XFLTD 节点当前状态**: 8/7 缓存的全 20 节点已 dead(订阅过期, 服务器迁移)。需用户提供最新订阅链接刷新 Provider_XFLTD.yaml 一次, 之后永久有效。### Metadata- Source: conversation- Tags: openclash, xfltd, proxy-provider, file, persistence## [LRN-20260808-137] openclash-xfltd-node-refresh-and-auth-gotcha- **XFLTD 订阅格式**: `https://api2.xfltd.click/cctv/user/client/get?token=...` 返回 base64 编码的 vless:// 链接列表（每行一个, 20 节点）。`base64 -d` 解码。- **vless 链接 -> mihomo YAML 转换**: 软路由宿主无 python, 用 ruby 纯字符串解析（不能用 `require 'uri'`/`require 'json'`, 软路由 ruby 缺这些库）。解析 @ 分隔 uuid@server:port, ? 分隔参数, # 分隔 URL 编码的节点名(用 gsub %XX 解码)。- **reality short-id 坑**: 以 0 开头的 short-id (如 09561058) 在 YAML 里被当数字/八进制, 必须加引号 `'09561058'`, 否则 mihomo 报 `invalid REALITY short ID`。- **OpenClash 代理认证**: 配置含 `authentication: - Clash:vOknt8m0`, 经 7890 用 `curl -x http://Clash:vOknt8m0@127.0.0.1:7890`, 否则 407。health check 内部走节点不依赖此认证。- **mihomo DNS 缓存**: 节点服务器域名解析到旧 IP 时, 重启 OpenClash 刷新(删 /tmp/openclash.change 强制完整模式)。nslookup 显示新 IP 但 mihomo 连接用旧 IP = mihomo 进程内缓存, 需重启。- **file provider health check 怪异**: Provider_XFLTD 实测 20/20 节点转发 204 成功, 但 API 的 alive 始终 false(delay=0)。不影响实际使用, 手动切换节点可用。- **自动选择不选 file provider 节点**: `♻️ 自动选择` (url-test) 因 XFLTD alive=false 不自动选它。但 🖥 XFLTD 组手动选节点完全可用。### Metadata- Source: conversation- Tags: xfltd, openclash, vless, reality, ruby, dns-cache## [LRN-20260808-138] mihomo-reality-nodes-delay-test-gotcha- **症状**: XFLTD reality 节点实际转发 100% 可用(20/20 经 7890 转发 200), 但 mihomo 的 url-test/health-check/delay API 全部超时(`all proxies timeout`), alive 标记 false。- **根因**: mihomo 测延迟时直接连节点服务器做 HTTP 请求, reality 协议握手在 mihomo 的 delay 测试路径下不工作(实际流量转发走不同路径正常)。这是 mihomo 对 reality 节点的已知行为差异, 非节点故障。- **验证方法**: 转发测试用 `curl -x http://Clash:vOknt8m0@127.0.0.1:7890 https://ipinfo.io/ip`(带认证, 配置里 authentication: Clash:vOknt8m0), 返回 200 + 出口 IP 即节点可用。不要用 delay API 判断 reality 节点可用性。- **结论**: reality 节点无法在 mihomo 显示延迟 → 不能放进 url-test 自动选择。保持为 select 手动切换组。- **mihomo DNS 双 IP**: XFLTD 节点域名 0af4430.cnrcz.cn 有多条 A 记录(13.112.2.47/18.183.154.222 轮询), mihomo 测延迟时可能连到瞬时不可用的 IP。重启 OpenClash 刷新。- **修改 XFLTD 组类型**: 用 ruby 脚本改 YAML(name="🖥 XFLTD", type=select/url-test), 改后热重载。url-test 组若 proxies 列表含 ♻️ 自动选择 会干扰, 应清空 proxies 只留 use。### Metadata- Source: conversation- Tags: mihomo, reality, delay, url-test, health-check## [LRN-20260808-134] PZ-subscribe-bike-horse-archery- **任务**: 调研并订阅自行车/骑马/弓箭热门 mod。- **订阅结果**（全部下载完成 + default.txt 已加）：  - Braven's Bicycles 2988491347 → id `BB_Bicycles`（require `BB_Utils`），476k 订阅，B42 支持  - Braven's Utilities 2850135071 → id `BB_Utils`（依赖，2.6MB）  - Horse Mod 3661336777 → id `Horse`，241k 订阅，B42.20 支持，**MP SOON（单机为主）**，4 品种马+马具  - Archery Nexus 3617854007 → id `ArcheryNexus`，83k 订阅，B42（原版无弓）- **⚠️ Steam 依赖确认弹窗坑（关键）**：有必需依赖的 mod（如 Braven's 依赖 Braven's Utilities）订阅时，Steam 弹"额外的必需物品"确认框——**`SubscribeItem()` 调用会被静默拦截**（无网络请求、按钮不变 toggled、acf 无记录）。**正解**：①点击订阅按钮（btn.click() 有效）→ ②立即检测 `.newmodal_buttons` 弹窗 → ③点击 `div.btn_blue_steamui` 文本为"全部订阅"（按钮是 **DIV** 不是 a/button，之前选择器找不到）。- **评论 bug 调研**：  - [B42]





Bicycle! (3461415167, 190k)：SP 有"骑上后掉落"bug；Braven's 更稳（无同类反馈）→ 选 Braven's。  - Archery Nexus 原版 42.19 有砍树报错（装备弓时砍树）；[Fixed] 版 42.19 SP 正常但订阅少。用户选原版。  - Professional Mover 已下架（违规）；Rebalanced Prop Moving 有"带物品收纳丢东西"bug（已在 LRN-20260808-133 处理）。- **调试技巧**: opencli browser `network --since` 可诊断订阅请求是否发出；`tab new <url>` 开新 tab；按钮状态用 `#SubscribeItemBtn` class 含 `toggled` 判断。- **参考**: ERR-20260808-014（Steam 代理）、LRN-20260808-132（OpenCLI 订阅流程）。## [LRN-20260808-135] PZ-research-workflow-tools- **子代理卡死教训**: `task` 子代理调研 Steam Workshop 页卡死（家具收纳调研子代理挂起 10 分钟被取消）。**用户纠正：以后别用子代理调研 Steam mod**。正解：主 agent 直接用 Playwright/OpenCLI 浏览器自己做，小任务手到擒来。- **Steam 评论抓取（Playwright 胜 opencli）**: opencli eval `innerText` 抓不到 Steam 详情页评论区（iframe/懒加载）；评论 API `steamcommunity.com/comment/PublishedFile_Public/render/<id>` 需 sessionid 否则返回空/private。**正解**：Playwright headless 导航 → 滚动 8-15 次触发评论懒加载 → `querySelectorAll('.commentthread_comment')` 提取用户 bug 报告。**评论比订阅数更有决策价值**——Archery Nexus 的"42.19 装备弓砍树报错"、[B42]

Bicycle! 的"骑上后掉落"、JM3 作者自认"42.13-42.16 很坏"全是从评论挖出。- **Steam 依赖确认弹窗**: 见 LRN-20260808-134 与 steam-tools skill「常见错误」。补充：`SubscribeItem()` 对带必需依赖的 mod 静默失败，必须点 `.newmodal_buttons div.btn_blue_steamui`（"全部订阅"，DIV 非 a/button）。- **已订阅 mod 汇总（2026-08-08）**: 自行车 Braven's Bicycles(2988491347)+Utilities(2850135071)、骑马 Horse Mod(3661336777)、弓箭 Archery Nexus(3617854007)。default.txt 47 mod。详见 docs/project-zomboid.md。- **参考**: ERR-20260808-014（Steam 代理）、LRN-20260808-132（OpenCLI 订阅）、LRN-20260808-134（订阅自行车/骑马/弓箭）。## [LRN-20260808-139] openclash-custom-rules-and-resource-optimization- **opencode 容器移除**: 用户确认软路由 opencode 主要笔记本用, 移除释放内存。`docker stop opencode && docker rm opencode`, 保留镜像 opencode-arm64:1.18.15 和 /etc/opencode 数据目录(备份到 /mnt/usb4-1/Backup/opencode-20260808-130816)。清理 dangling 镜像回收 2.9GB, 移除废弃 gv-chrome 容器 + playwright 镜像回收 ~3.8GB。- **OpenClash 自定义规则**: 文件 `/etc/openclash/custom/openclash_custom_rules.list` 格式是 YAML 含 `rules:` 段。需先 `uci set openclash.config.enable_custom_clash_rules=1`。规则在完整模式(删 /tmp/openclash.change)下由 yml_rules_change.sh 合并进 config。- **DEST-PORT 坑**: mihomo 规则类型是 **DST-PORT**(不是 DEST-PORT), 写错会导致 `unsupported rule type: DEST-PORT` 致命错误, OpenClash core 启动失败, watchdog 自动把 enable 置 0。- **OpenClash 启动失败后恢复**: `uci set openclash.config.enable=1` + `setsid /etc/init.d/openclash start`。start 需 setsid 分离否则 SSH 断开进程被杀。- **syncthing 直连规则**: PROCESS-NAME,syncthing,DIRECT + PROCESS-NAME,syncthin(15字符截断) + DST-PORT,22000/8384/21027,DIRECT + DOMAIN-KEYWORD,syncthing,DIRECT + DOMAIN-SUFFIX,syncthing.net,DIRECT。生效后 syncthing 局域网照片备份不走代理。- **优化后内存**: 578MB 已用(原860MB), 可用 1.38GB。tailscaled 165MB, clash 75MB, syncthing 75MB, dockerd+containerd 118MB。### Metadata- Source: conversation- Tags: openclash, opencode, syncthing, docker, resource-optimization## [LRN-20260808-140] openclash-overwrite-mechanism**Logged**:  2026-08-08T13:25:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### SummaryOpenClash overwrite 机制通过 `[YAML]` 块深度合并配置，但快速模式会跳过不执行。删除 `/tmp/openclash.change` 可强制完整模式。### Details- overwrite 文件：`/etc/openclash/overwrite/<name>`，uci 注册 `config_overwrite`（name/enable/order/config）- `[YAML]` 块通过 `YAML.overwrite(Value, yaml_data)` 深度合并，支持：普通键 merge、`+key` prepend、`key+` append、`key!` force_overwrite- **快速模式跳过**：`QUICK_START=true` 时 Step 3 跳过 yml_change.sh/overwrite/provider_path，直接用现有配置- **触发完整模式**：删 `/tmp/openclash.change` 或让 change 文件时间戳不匹配- **provider path 处理**：init.d 3655 行，对所有 provider（包括 file 类型）把 `./providers/` 改写成 `./proxy_provider/`### Suggested Action需要注入持久化配置时：1. 用 `[YAML]` 块 + uci 注册 config_overwrite2. 或直接改源配置 `/etc/openclash/config/二合一.yaml`（订阅更新会覆盖）3. 改完后删 `/tmp/openclash.change` + 重启触发完整模式### Metadata- Source: conversation- Tags: openclash, overwrite, yaml, config-persistence- Related Doc: /etc/init.d/openclash (3611行 QUICK_START, 3051行 overwrite_file)## [LRN-20260808-141] xfltd-subscription-vless-parsing**Logged**: 2026-08-08T13:30:00+08:00**Priority**: medium**Status**: done**Area**: infra### SummaryXFLTD 机场订阅返回 base64 编码的 vless:// 链接列表。软路由无 python，用 ruby 纯字符串解析转为 mihomo proxy YAML。### Details- 订阅格式：`base64(vless://uuid@server:port?params#url-encoded-name)` 每行一个- 解码：`base64 -d file.txt` → 纯 vless 链接- 软路由无 python（只有容器内有），用 ruby 纯字符串解析：拆 `@`（uuid@server）、`:`（端口）、`?`（参数）、`#`（URL 编码名）- reality 节点需：type=vless, flow=xtls-rprx-vision, tls=true, reality-opts{public-key, short-id}- **short-id 以 0 开头**（如 09561058）在 YAML 中被当八进制，必须加引号 `'09561058'`### Suggested Action解析 vless 链接时用 ruby 纯字符串（`gsub %XX` 解码 URL 编码），不依赖 `require 'uri'`（软路由 ruby 缺库）。给 short-id 以 0 开头的加引号。### Metadata- Source: conversation- Tags: xfltd, vless, reality, ruby, yaml, short-id## [LRN-20260808-142] self-hosted-mcp-search-research**Logged**: 2026-08-08T13:40:00+08:00**Priority**: low**Status**: done**Area**: infra### Summary自托管免 API key 搜索 MCP 调研结论：mcp-searxng（1102 stars）最成熟，duckduckgo-mcp-server（1404 stars）最轻。但用户判断现有 exa/tavily 搜索足够，不需要额外安装。### Details- **mcp-searxng**（1102 stars）：SearXNG MCP，需额外跑 SearXNG Docker（300-600MB），arm64 官方镜像- **duckduckgo-mcp-server**（1404 stars）：纯 Python，DDG 限流严- **meilisearch-mcp**（194 stars）：本地全文搜索，用户场景用不上（grep/glob 足够）- **mcp-server-ssh**（npm 1.0.2，57 stars）：SSH 远程管理，用户指出"本来就能操作 SSH"，不需装### Conclusion现有 MCP（exa/tavily/playwright/context7/github）已覆盖搜索需求，不额外安装。等以后遇到现有工具做不到的场景再加。### Metadata- Source: conversation- Tags: mcp, search, searxng, duckduckgo, self-hosted## [LRN-20260808-143] soft-router-resource-optimization**Logged**: 2026-08-08T13:50:00+08:00**Priority**: high**Status**: done**Area**: infra### Summary软路由资源优化：移除 opencode 容器释放 450MB + 清理 Docker 镜像回收 6.7GB + syncthing 改直连不走代理。内存从 860MB 降到 578MB，可用从 1.1GB 升到 1.38GB。### Details- **移除 opencode**：`docker stop opencode && docker rm opencode`，保留镜像和数据目录- **清理 Docker**：`docker image prune -f` + 移除 gv-chrome 容器和 playwright 镜像，回收 ~6.7GB- **syncthing 直连**：`openclash_custom_rules.list` 加 PROCESS-NAME/DST-PORT/DOMAIN-KEYWORD syncthing → DIRECT- **备份**：`/mnt/usb4-1/Backup/opencode-20260808-130816`（242MB）- **资源对比**：860MB→578MB used，1.1GB→1.38GB available- **autotimeset 每日重启**：用户确认故意的，和主路由一致，增加稳定性### Metadata- Source: conversation- Tags: soft-router, resource, opencode, syncthing, docker, memory- Related Skill: opencode-maintenance





---

## [LRN-20260808-144] soft-router-opencode-restore-and-learnings-sync**Logged**:  2026-08-08T14:30:00+08:00**Priority**:  medium**Status**:  done**Area**:  opencode-infra### Summary手机远程访问需求恢复，软路由 opencode 容器重新启用（此前 LRN-20260814-143 移除）。笔记本保持睡眠时，手机经 Tailscale 访问软路由 opencode（100.97.187.104:4096）作为替代。同时配置笔记本↔软路由 syncthing 双向同步经验文件（.learnings/ 和 docs/），两边 AI 共享同一知识库。### Details- **恢复 opencode 容器**：镜像 opencode-arm64:1.18.15（1.82GB）和数据 /etc/opencode/ 一直保留，只需重新 docker run（命令见 docs/opencode-web-mobile.md §9）；OPENCODE_SERVER_PASSWORD 从笔记本 User env 读取，base64 经 ssh_run.py 传入避免特殊字符转义- **清理闲置镜像**：changedetection.io（972MB，7-24 调研残留从未部署）docker rmi 释放空间- **syncthing 双向同步**：软路由已有 syncthing（0.0.0.0:8384，home /mnt/usb4-1/syncthing，原本用于手机照片备份）；笔记本装官方 Syncthing.Syncthing（winget），HKCU Run 自启- **配对**：REST API 互 PUT /config/devices + /config/folders；设备 ID 软路由 TM7K4YB-...、笔记本 LBXNFWG-...；folder 类型 sendreceive（双向），trashcan versioning 90 天- **同步范围**：.learnings/（4 文件 457KB）和 docs/（37 文件 414KB）双向；AGENTS.md、opencode.json、auth.json 各自独立（软路由是精简版 AGENTS.md 3.9KB）- **权限**：软路由先 mkdir /etc/opencode/.learnings /docs 并 chown syncthing:syncthing（容器挂载目录，同步后容器内自动可见）- **验证**：双向文件/删除均实测传播（.sync-test.txt 往返）；笔记本侧 globalFiles==localFiles 无 need### 关键决策- **双向而非单向**：经验文件是共享知识库不是个人账本，来源不区分（条目内容自带上下文，如'软路由实测'）；真正需区分的是 AGENTS.md（人设/指导），故排除- **会话历史（opencode.db）不同步**：笔记本 1.28GB、SQLite WAL 运行中复制不安全、两实例会话本就独立（文档已确认），同步价值低- **笔记本保持睡眠**：插电 5 分钟关屏/3 小时睡眠不改为 7x24 挂机；软路由作为常开替代### Metadata- Source: conversation- Tags: opencode, soft-router, docker, syncthing, sync, tailscale, remote- Related Doc: docs/opencode-web-mobile.md, docs/router.md## [LRN-20260808-145] PZ-performance-optimization-ETO- **性能优化 mod 调研（小黑盒帖子触发）**：帖子《老大们有没有优化性能的mod推荐呀》推荐 Every Texture Optimized + Multi-Cpu Enhance + 改内存/纹理。调研结论：  - **Every Texture Optimized**（3119788162，508k 订阅/7.8k 评价）：纯纹理压缩（11300 文件 265MB），无 Lua，不占加载逻辑；两版本 **ETO_B**(Well Balanced 均衡)/**ETO_P**(Maximum Performance 极致)，订阅一个 item 两版都下、default.txt 只启用一个；作者确认比游戏内置纹理压缩更好（内置压缩"显著降低画质且收益小"）且可叠加；**必须放 mod 列表最顶部**让其他 mod 覆盖；versionMin=42.20，B42.19.1 beta 不可用。**已订阅 + 启用 ETO_B**  - **Multi-Cpu Enhance**（3459875383，28k/666）：**不是 mod 是 JVM 参数教程**（ProjectZomboid64.json 的 vmArgs）。关键参数：`-Xmx8192m`(建议，Win11 勿超内存一半)+UseParallelGC+ParallelGCThreads=4+UseNUMA+AlwaysPreTouch+DisableExplicitGC+ParallelRefProcEnabled+OptimizeStringConcat+UseStringDeduplication+UseCompressedOops。**本机已应用且更优**（Xmx 12G + JDK21 必需 --enable-native-access/--add-exports，B42.20 用 JDK21+）。**无需重复订阅**（订阅了也只是教程内容）- **流程参考**：小黑盒帖子用 opencli browser 打开分享链接读 Vue 渲染内容（curl 直连 API 404）；评论懒加载需 eval window.scrollTo 到底 + 滚动多次；Steam mod 详情用 Playwright headless 抓（评论 .commentthread_comment_text，需滚动触发懒加载）- **订阅**：opencli browser eval `SubscribeItem('id','108600')` → 按钮 class 含 toggled=成功；ETO 无依赖弹窗直接成功；下载 265MB 需 2-3 分钟（软路由代理 5.7Mbps），检查 workshop\content\108600\3119788162 目录出现- **验证**：mod.info `versionMin=42.20.0`；用户游戏 JDK 25（B42.20.1+）满足。游戏已开 textureCompression=true 可与 ETO 叠加





---

## [LRN-20260808-146] soft-router-mcp-keys-and-npm-packages**Logged**:  2026-08-08T15:00:00+08:00**Priority**:  medium**Status**:  done**Area**:  opencode-infra### Summary软路由 opencode 容器的 MCP 服务初始化：`docker run` 必须用 `-e` 注入 API key（opencode.json 用 `{env:XXX}` 占位符），npm 包需预装否则 `npx -y` 首次拉包 30s 超时。### Details- **容器环境变量**：只有 `OPENCODE_SERVER_PASSWORD` 时，exa/context7/github/tavily 的 `{env:EXA_API_KEY}` 等解析为空 → MCP 无法认证- **key 迁移**：笔记本 User env 有 EXA/GITHUB/TAVILY 三个 key；CONTEXT7 key（`ctx7sk-...`）明文存在笔记本 `opencode.jsonc` 的 MCP env 里（不在 User env），恢复时手动读入- **注入方式**：base64 编码经 ssh_run.py 传入（避免特殊字符转义），不落盘- **npm 包预装**：`npm install -g exa-mcp-server @upstash/context7-mcp @mcptools/mcp-tavily`（registry 已配 npmmirror，40s）- **验证**：`opencode mcp list` 5/5 connected；exa_web_search 真实调用返回结果### 关键决策- 用 `-e` 环境变量而非容器内 `.env` 文件：`.env` 在 `/etc/opencode/` 会被 syncthing 双向同步到笔记本，有泄漏风险（AGENTS.md 敏感信息规范）- CONTEXT7 key 补上后 5/5 MCP 全部可用（playwright/exa/context7/github/tavily），context7 真实调用验证通过### 注意- 全局 npm 包在容器可写层，`docker rm + run` 重建会丢失，需重装（已写入 docs §9）### Metadata- Source: conversation- Tags: opencode, soft-router, docker, mcp, env, npm- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260808-147] syncthing-oneway-and-tray-icon**Logged**:  2026-08-08T16:40:00+08:00**Priority**:  medium**Status**:  done**Area**:  opencode-infra### Summary笔记本↔软路由经验同步从双向改为**单向**（笔记本 `sendonly` → 软路由 `receiveonly`），并给笔记本 syncthing 加托盘图标（Syncthing Tray，弃用 SyncTrayzor）。### Details- **改单向原因**：笔记本是主要记录产生方（LEARNINGS 346KB 全在笔记本），软路由只是消费；双向有冲突风险（两边同时改生成 `.sync-conflict-*`）；单向错误率更低、逻辑清晰- **类型名坑（ERR 级别）**：syncthing 文件夹类型是 `sendonly`/`receiveonly`/`sendreceive`/`receiveencrypted`。**`send`/`receive` 是非法值，PUT 返回 200 但被忽略不生效**（配置仍是 sendreceive）- **改法**：REST API GET folder 完整对象 → 改 `type` → PUT 回去（必须传完整对象，不能只传 type）- **托盘图标方案对比**：  - **SyncTrayzor（弃）**：winget 1.1.29，2021 年后停更；自带 syncthing v1.18.1 读不了新版 config（version 52>35），日志报 `Failed to initialize config` 无限重启  - **Syncthing Tray（选用）**：winget `Martchus.syncthingtray` v2.1.3，项目活跃（2026-07 发版）；不内置 syncthing 实例，作为前端连接已运行的 syncthing（8384）- **自启**：HKCU Run 两个项——`Syncthing`（syncthing.exe serve）和 `syncthingtray`（真实 exe 路径）- **验证**：笔记本写入文件 → 软路由收到（sendonly 生效）；软路由写入 → 笔记本不收（单向生效）；无冲突文件### 关键决策- 保留两个自启项（syncthing.exe + syncthingtray.exe），不用 Syncthing Tray 的内置库（避免版本冲突，直接用已配好的 v2.1.3）### Metadata- Source: conversation- Tags: syncthing, oneway, tray, sync, opencode-infra- Related Doc: docs/opencode-web-mobile.md## [LRN-20260808-148] opencode-multi-config-conflict**Logged**: 2026-08-08T17:30:00+08:00**Priority**: high**Status**: done**Area**: config### Summaryopencode.jsonc �� config.json ���� agent/small_model ���ã��޸�һ������һ������Ч�������ֻ����л�ģ�ͱ��Զ��Ļء�### Details- �û�Ҫ��ȥ���̶��� plan/build ģʽģ�ͺ� ds ģ������- ���޸��� opencode.jsonc��ɾ���� agent �� small_model- ���û������ֻ����л�ģ�ͺ��ֱ��Զ��Ļ�ȥ- ԭ��config.json �ﻹ�оɵ� agent �� small_model ���ã������ļ�ͬʱ��Ч��- �����ͬʱ���������ļ��е��ظ�����### Suggested Action�޸� opencode ����ʱ����� opencode.jsonc �� config.json �����ļ���ȷ��û���ظ����ͻ�����á�### Metadata- Source: conversation- Tags: opencode, config, multi-file, conflict- Related Doc: docs/opencode-config.md





---

## [LRN-20260808-149] opencli-replace-playwright-edge**Logged**:  2026-08-08T17:30:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### SummaryPlaywright-edge MCP �����ã����� OpenCLI ��� Browser Bridge ��չ��Ϊ��ʵ�����������### Details- Playwright-edge MCP ������ʵ����������- OpenCLI ͨ�� Browser Bridge ��չ���� Edge ��¼̬�����ȶ�- �� opencode.jsonc��config.json��AGENTS.md ���Ƴ� playwright-edge- �� OpenCLI ���Ϊ��ʵ�������ѡ### Suggested Action��Ҫ��¼̬�ĳ�����С���顢Reddit��Twitter �ȣ�ͳһ�� OpenCLI�������� Playwright-edge��### Metadata- Source: conversation- Tags: opencli, playwright, edge, browser- Related Skill: agent-reach- Related Doc: docs/opencli-agent-reach.md





---

## [LRN-20260809-150] firecrawl-mcp-integration**Logged**:  2026-08-09T03:30:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### Summary笔记本接入 Firecrawl MCP（fc- 前缀 key），作为 JS 渲染/反爬页面的首选工具，替代本地 Playwright 用于这些场景。### Details- key: fc-13c4e41ea8234bf480177ec1dd65861e，存 .env（FIRECRAWL_API_KEY），配置用 {env:...} 引用- MCP 包: firecrawl-mcp（npx -y firecrawl-mcp），opencode.jsonc + config.json 都配置- 免费 1000 credits/月：search=2、scrape=1 credit/页- 实测能力：v2/search（搜索+正文全文）、v2/scrape（JS 渲染，B站成功）、v1/map（站点 URL 发现）- v1/extract 已废弃 → 用 v2/scrape + formats:["json"] + jsonOptions.schema（schema 必须带 required 数组）- 搜索降级链更新：webfetch → Firecrawl（JS 渲染/反爬首选）→ Playwright → Exa → Tavily/Context7### Suggested ActionJS 渲染/反爬/懒加载图片场景优先用 firecrawl_scrape / firecrawl_search，配额耗尽再降级 Playwright。### Metadata- Source: conversation- Tags: firecrawl, mcp, scraping, js-rendering, search- Related Skill: agent-reach- Related Doc: docs/search-strategy.md, docs/opencode-config.md





---

## [LRN-20260809-151] skills-sync-to-router**Logged**:  2026-08-09T07:10:00+08:00**Priority**:  low**Status**:  done**Area**:  opencode-infra### Summary笔记本 skills 精选同步到软路由：27 个 skill（排除硬编码 Windows 路径的 steam-tools），配置 skills.paths 指向容器内 `/root/.config/opencode/skills`。### Details- 软路由原本无 skills 目录、无 superpowers、无 skills.paths 配置- 传输方式：笔记本打包 tar.gz → scp 到软路由 → 解压到 /etc/opencode/skills（宿主）→ 容器内自动可见（bind mount /etc/opencode → /root/.config/opencode）- 配置更新：软路由无 python3/jq，用笔记本 PowerShell 生成完整新 JSON + scp 覆盖（先备份 .bak-skills）- 排除项：steam-tools（硬编码 C:\Steam\steam.exe、steamapps、junction、本地 DLL 检查，纯 Windows）- 验证：`docker exec opencode opencode debug skill` 输出确认全部加载- 软路由 AGENTS.md 独立维护，不覆盖（结构/环境说明不同）### Suggested Action后续同步用：tar.gz + scp + base64 传输脚本；验证用 `opencode debug skill`（无 list-sources 命令）。### Metadata- Source: conversation- Tags: skills, router, sync, opencode-infra- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260809-152] syncthing-opencode-sync-disabled**Logged**:  2026-08-09**Priority**:  medium**Status**:  done**Area**:  opencode-infra### Summary停用笔记本 <-> 软路由的 opencode 经验文件（.learnings/docs）syncthing 双向同步。理由：笔记本是经验产生主力，软路由侧新增少，双向同步意义不大；且软路由 syncthing 必须保留（手机照片备份 Photos Backup 依赖）。### Details- 笔记本侧：删 HKCU Run 自启（Syncthing + syncthingtray 两条）、Stop-Process 退出进程、winget uninstall Syncthing Tray（Martchus.syncthingtray，--silent 参数不受支持会报错，用 --disable-interactivity 成功）、config.xml 删除两个 opencode 文件夹定义（正则删 <folder id="opencode-..."</folder>，config 备份到 Temp\opencode\）- 软路由侧：REST API（X-API-Key 从 config.xml 取）DELETE /rest/config/folders/{id} 删除 opencode-docs/opencode-learnings，DELETE /rest/config/devices/{笔记本ID} 删除笔记本设备；config.xml 备份 config.xml.bak-20260809；syncthing 服务保持 enabled- 手机照片备份 folder（0ond6-sh9q7，receiveonly）与 Android Phone 设备均保留- 同步期间产生的 .stversions/、.stfolder/ 残留文件无害，可留### Suggested Action笔记本 .learnings/、docs/ 与软路由侧为历史副本，各自独立维护；如需重新启用同步，双端 config 备份均可用。### Metadata- Source: conversation- Tags: syncthing, router, sync, opencode-infra- Related Doc: docs/opencode-web-mobile.md





---

## [LRN-20260809-153] github-mcp-disconnect-env-missing**Logged**:  2026-08-09T08:15:00+08:00**Priority**:  high**Status**:  done**Area**:  config### SummaryGitHub remote MCP 频繁断连（红点），根因是 .env 缺少 GITHUB_PERSONAL_ACCESS_TOKEN，opencode.jsonc 用 {env:GITHUB_PERSONAL_ACCESS_TOKEN} 引用解析为空→认证失败。### Details- opencode.jsonc 的 github MCP（type: remote, url: api.githubcopilot.com/mcp/）用 headers 引用 {env:GITHUB_PERSONAL_ACCESS_TOKEN}- .env 之前只配了 EXA_API_KEY 和 FIRECRAWL_API_KEY，没有 GITHUB_PERSONAL_ACCESS_TOKEN- config.json 里有硬编码明文 token 但无 env 字段，两边不一致- 修复：.env 加 GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx，config.json 改用 {env:GITHUB_PERSONAL_ACCESS_TOKEN}- remote MCP 比 local MCP 更依赖网络连接，断连后需重启 opencode 才能恢复### Suggested Action新增任何 {env:XXX} 引用时，先确认 .env 里有对应的变量。新增 MCP 工具后检查 env 引用完整性。### Metadata- Source: conversation- Tags: github, mcp, remote, env, auth- Related Doc: docs/opencode-config.md





---

## [LRN-20260809-154] backup-excludes-chat-history**Logged**:  2026-08-09T08:20:00+08:00**Priority**:  low**Status**:  done**Area**:  config### Summary备份插件（plugin/backup.ts）不包含对话记录。对话记录在 ~/.local/share/opencode/opencode.db，备份只备份 ~/.config/opencode/（配置目录），robocopy 显式排除 opencode.db。### Details- 对话记录存储：~/.local/share/opencode/opencode.db + storage/ + snapshot/ + tool-output/- 备份源：~/.config/opencode/（配置、skills、learnings、plugins、docs、scripts）- robocopy /XD 排除：node_modules, mcp-servers, backups, .learnings, .playwright-mcp- robocopy /XF 排除：*.bak, package-lock.json, opencode.db, opencode.db.gz- 备份大小约 2MB，保留 3 份，存 OneDrive- 用户的 .local/share/ 不在 OneDrive 同步范围内### Suggested Action无需修改。如用户担心对话隐私，可确认 .local/share/opencode 不在云同步目录内。### Metadata- Source: conversation- Tags: backup, plugin, chat-history, privacy- Related Doc: docs/opencode-config.md





---

## [LRN-20260809-155] config-json-comments-break-parsing**Logged**:  2026-08-09T08:25:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### Summaryconfig.json 不支持注释（// 或 /* */），PowerShell ConvertFrom-Json 解析失败。opencode.jsonc 支持注释（JSONC），但 config.json 是纯 JSON 格式。### Details- opencode.jsonc = JSONC 格式（支持 // 和 /* */ 注释），opencode 内部解析支持- config.json = 标准 JSON 格式，不支持注释- PowerShell ConvertFrom-Json 遇到注释会抛 ArgumentException- 本次对话中用 ConvertFrom-Json 读取 config.json 失败，影响调试/验证流程- 两个文件都可能被 opencode 加载（之前已验证 config.json 的 agent 配置确实生效）### Suggested Action读取/验证 config.json 时用 `Get-Content -Raw` 直接查看文本，不用 ConvertFrom-Json。或改用 node -e "JSON.parse(...)" 解析（但 node 也拒绝注释）。建议 config.json 保持纯 JSON 无注释。### Metadata- Source: conversation- Tags: config, json, jsonc, parsing- Related Doc: docs/opencode-config.md





---

## [LRN-20260809-156] check-user-config-before-recommending**Logged**:  2026-08-09T10:00:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### Summary推荐软件/方案前应先查看用户电脑配置，避免误判。用户说"带不动"时，实际配置可能是高端机型。### Details用户问"Windows 上怎么实现按住空格语音输入"，我搜索后推荐了 CapsWriter-Offline（本地离线方案）。用户说"跑本地模型?那我的电脑可能带不动啊"，我查看配置后发现是高端配置：- CPU: Intel Core Ultra X7 358H（16核）- 内存: 32GB- 显卡: Intel Arc B390实际上完全跑得动本地模型。但用户最终选择云端免费方案，说明用户更看重"免费"而非"本地离线"。### Suggested Action1. 推荐方案前先询问或查看用户配置2. 区分"技术可行性"和"用户偏好"——即使能跑本地模型，用户可能更想要免费/简单的方案3. 提供多种选项让用户选择，而非单一推荐### Metadata- Source: conversation- Tags: recommendation, user-preference, hardware, config- Related Skill: N/A- Related Doc: N/A





---

## [LRN-20260809-157] user-prefer-cloud-free-over-local**Logged**:  2026-08-09T10:00:00+08:00**Priority**:  low**Status**:  done**Area**:  config### Summary用户更倾向云端免费方案而非本地离线，即使本地配置足够。Windows 内置 Win+H 已能满足基本需求。### Details用户明确选择"云端免费"方案，最终确认 Win+H 在线语音识别已开启就足够了。说明：1. 用户不需要安装第三方软件2. 用户接受云端识别（数据上传）3. 用户追求"零成本"而非"最高准确率"### Suggested Action对于语音输入需求，优先推荐 Windows 内置 Win+H + 在线语音识别，除非用户明确要求：- 更高准确率 → 推荐豆包/LazyTyper- 完全离线 → 推荐 CapsWriter-Offline- 专业术语 → 推荐 Dragon### Metadata- Source: conversation- Tags: speech-input, windows, cloud, free, user-preference- Related Skill: N/A- Related Doc: N/A





---

## [LRN-20260809-158] windows-speech-online-recognition-key-setting**Logged**:  2026-08-09T10:00:00+08:00**Priority**:  medium**Status**:  done**Area**:  config### Summary提高 Windows 内置语音输入（Win+H）准确率的关键设置：开启"在线语音识别"。### DetailsWindows 语音隐私设置路径：`隐私和安全性 > 语音 > 在线语音识别`- 开启后使用微软云端模型，准确率明显提升- 关闭则使用本地模型，准确率较低- 另外可选"开始提供我的语音剪辑"帮助改进服务其他优化方法：- 训练计算机识别声音：`控制面板 > 轻松使用设置中心 > 语音识别 > 训练计算机以提高其理解能力`- 音频增强：选择 `Windows Studio Effects Voice Clarity`（Intel AI 降噪）### Suggested Action用户问如何提高 Win+H 准确率时，首先检查"在线语音识别"是否开启，这是最有效的单一设置。### Metadata- Source: conversation- Tags: windows, speech-recognition, win-h, online, accuracy- Related Skill: N/A- Related Doc: N/A





---

## [LRN-20260809-159] wifi-wol-unreliable-lenovo-wired-only**Logged**:  2026-08-09T11:00:00+08:00**Priority**:  high**Status**:  pending**Area**:  infra### Summary笔记本 WiFi 远程唤醒（WoWLAN）在联想 ThinkBook 上实测极不可靠，联想官方只承诺有线网卡 WOL；做远程唤醒方案前应先调研硬件支持，避免白忙活。### Details针对 ThinkBook 14 G8+ IPH (21VG, Intel Wi-Fi 7 BE213) 做了完整调研：- **联想官方 PSREF**（同系列 G8 IAL）：明确写 "Gigabit Ethernet, 1x RJ-45, supports Wake-on-LAN"，只承诺有线网卡- **Linus Tech Tips 实测**（ThinkPad 用户）："It works when connected to ethernet cable, but not over wifi"- **华为官方"远程唤醒"文档**：要求"电脑设备的网卡为运行状态，若网卡为休眠状态则无法唤醒"- **CSDN 华为云专家**：USB 网卡不支持 WOL，PCIe 有线网卡关机后仍供电才支持- 微软现代待机(S0)文档：WiFi 理论上可作为唤醒源，但实际依赖笔记本固件/BIOS 是否给无线网卡在睡眠时供电已确认的本机现状：- 无线网卡 Intel Wi-Fi 7 BE213（MAC 80-13-16-57-64-A3）驱动层已开魔术封包唤醒、允许唤醒计算机- 但驱动层开启 ≠ 硬件固件/BIOS 支持；BIOS 是否有 Wake on WLAN 选项是关键，需用户进 BIOS 确认- 系统为现代待机(S0)，无传统 S3### Suggested Action- 远程唤醒类需求：优先查官方 PSREF/规格是否承诺 WOL，再决定是否投入配置- 联想笔记本 WiFi 唤醒大概率不可行：若用户不愿接网线，推荐"合盖不睡眠/锁屏 + SSH/RDP/远程软件"方案- 有条件时实测：睡眠后从软路由 etherwake -i br-lan <MAC> 看能否唤醒，10 分钟确认成败### Metadata- Source: conversation- Tags: wake-on-lan, wowlan, lenovo, thinkbook, modern-standby, wifi-wake- Related Skill: agent-reach- Related Doc: docs/router.md





---

## [LRN-20260809-160] exa-http-api-fallback-when-mcp-missing**Logged**:  2026-08-09T11:00:00+08:00**Priority**:  high**Status**:  pending**Area**:  infra### SummaryExa MCP 工具（exa_web_search_exa）在当前会话未加载时，可用 Exa HTTP API 直连兜底，效果相同。### Detailsopencode.jsonc 里配置了 exa/tavily MCP（enabled:true，EXA_API_KEY/TAVILY_API_KEY 环境变量都在），但当前会话工具列表并未暴露 exa_web_search_exa / 	avily_search。调用时返回 "unavailable tool"。兜底方案（已验证可用）：- 搜索：Invoke-RestMethod -Uri "https://api.exa.ai/search" -Headers @{"x-api-key"=f9c2cd8d-b24f-430e-8255-20400e238c82} -Method Post -ContentType "application/json" -Body '{"query":"...","numResults":8,"type":"neural","contents":{"text":true,"highlights":{"numSentences":6}}}'- type:auto/中文关键词有时无结果，	ype:neural + contents 更稳- 抓取页面用 https://r.jina.ai/<URL>（Jina Reader），国内可用、无需代理### Suggested Action- 搜索 MCP 未加载时直接用 HTTP API，不要声称"工具不可用"就放弃- agent-reach search.md 应补充此兜底方案### Metadata- Source: conversation- Tags: exa, mcp, http-api, search, jina-reader, fallback- Related Skill: agent-reach- Related Doc: skills/agent-reach/references/search.md





---

## [LRN-20260809-161] check-mcp-config-before-claiming-unavailable**Logged**:  2026-08-09T11:00:00+08:00**Priority**:  medium**Status**:  pending**Area**:  config### Summary用户纠正：声称 Exa/Tavily 搜索工具"不可用"前，应先检查 opencode.jsonc 的 mcp 配置确认它们确实配置了。工具未加载 ≠ 未配置。### Details对话中我先说"没有 exa/tavily 工具"，用户反驳"明明有"。核实后发现：- opencode.jsonc 里 exa/tavily/firecrawl 都配置了，enabled:true- 只是当前会话的工具列表未包含这些 MCP 工具（可能启动加载失败或该会话未启用）- 正确做法：先 grep opencode.jsonc 确认配置存在，再用 HTTP API 兜底，最后才考虑告知用户### Suggested Action- 声称某个 MCP/工具不存在前，先检查配置文件确认- 本条目与 LRN-20260809-160 配套：配置存在但工具未加载时用 HTTP API### Metadata- Source: user_feedback- Tags: mcp, config, opencode.jsonc, tool-availability- Related Skill: agent-reach- Related Doc: docs/opencode-config.md





---

## [LRN-20260809-162] bios-wol-state-not-readable-from-windows**Logged**:  2026-08-09T11:00:00+08:00**Priority**:  medium**Status**:  pending**Area**:  infra### Summary笔记本 BIOS 的 Wake on LAN/WLAN 开关状态无法从 Windows 系统内读取，只能由用户进 BIOS 确认；涉及 BIOS 的可行性判断必须先问用户。### Details用 PowerShell 查了 Win32_BIOS、Win32_ComputerSystem、powercfg -a、网卡注册表/属性，能拿到：- 机型/BIOS 版本/网卡 MAC/网卡驱动层唤醒开关（*WakeOnMagicPacket、*WakeOnPattern 等）- 系统睡眠状态（现代待机 S0、有无 S3）但**无法**读到 BIOS 固件里的 Wake on LAN 选项是否 Enabled。这是固件层状态，Windows API 不暴露。### Suggested Action- 判断远程唤醒可行性时，把"BIOS 是否有 Wake on LAN/WLAN 选项 + 是否开启"作为用户手动步骤明确列出- 进 BIOS 按键（联想 F2/F1、华硕 F2/Del、戴尔 F2、惠普 F10/Esc）### Metadata- Source: conversation- Tags: bios, wake-on-lan, windows, limitation- Related Skill: N/A- Related Doc: N/A## [LRN-20260809-153] router-usb-cleanup**Logged**: 2026-08-09T12:00:00+08:00**Priority**: low**Status**: done**Area**: opencode-router### Summary软路由移动硬盘 `/mnt/usb4-1` 历史遗留清理：79 个 docker 匿名卷（633MB）+ 一堆 2023 年旧媒体配置/缓存全清除，保留系统备份与在用服务。### Details- **移动硬盘结构**：1.8T ext4，已用 243G；大头是 `Backup/WindowsImageBackup` 243GB（笔记本系统备份，用户选择保留）。- **清理清单**（约 0.9G）：  - docker 匿名卷 79 个（633MB）：最大 618MB 是 2023-07 媒体工具缓存。**坑：`docker volume prune -f` 输出 Total reclaimed space: 0B 且实际没删**，改用 `docker volume ls -q | xargs docker volume rm` 逐个删才成功（保留 metadata.db/backingFsBlockDev）。  - `gv-chrome/`（playwright whl 残留）、`Caches/`（Emby/Jellyfin 缓存）、`upper/`+`work/`（旧 extroot overlay）、`alist/`（日志）、`.linkease_recycle/`、`Backupmkdir/`、`etc/`  - Configs 下 16 个旧媒体配置（Emby/Jellyfin/NasTools×4/Jackett/HomeAssistant/qb×4/transmission/ChineseSubFinder 等），**保留 `aria2/`**（正在运行，配置+session 引用）。- **保留**：WindowsImageBackup 243G、Win11 ISO 8.5G、OperitBackup 快照、opencode 备份、photos-backup（syncthing 在用）、download/（aria2 下载目录）。- **验证**：df 243.4G→242.5G；aria2 进程和 opencode 容器均正常。### Suggested Action软路由清硬盘前先看 `du -sk` 找大头；docker 残留卷别信 prune 的输出，直接 `volume ls -q | xargs volume rm`；删除 Configs 前先查 `ps w | grep` 确认哪些服务还在跑。## [LRN-20260809-154] opencode-db-bloat-cleanup-remote**Logged**: 2026-08-09T17:40:00+08:00**Priority**: high**Status**: done**Area**: opencode-performance### Summary笔记本 opencode.db 膨胀导致使用中 CPU 高：SSH 远程删除 322MB 超大僵尸会话（Project Zomboid mod），VACUUM 压缩 933MB→378MB（回收 61%），通过计划任务正常重启服务。根因是 opencode event sourcing 只增不删（官方 PR #36710 未合并）。### Details- **根因**：opencode 用 event sourcing 持久化，流式输出每 token 写一条 `message.part.updated.1` 事件，从不清理由。实测 DB 3.9GB 时空闲 CPU 20-35%。- **超大会话即使不打开也拖慢全局**：event 表是全局的，DB 越大，每次写入的索引维护 + WAL checkpoint 越重，拖累所有会话的读写。- **删除必须清全表**（直接 SQL 时）：event/part/message/session 之外，还要清 `event_sequence`、`todo`、`session_share`、`session_context_epoch`、`session_input`、`session_message`，否则留孤儿（本次残留 event_sequence 1条、todo 7条、session_share 1条）。- **压缩流程**：用 `VACUUM INTO` 生成压缩副本（在线可做，无需排他锁）→ 验证完整性（session/event/part 计数一致、孤儿为 0）→ 停 opencode → 删旧 db+wal+shm → 换副本 → 重启。- **重启必须用计划任务**：opencode serve 由计划任务 "OpenCode Web Tray" 的 `scripts\opencode-tray.ps1` 管理（设置 `OPENCODE_SERVER_PASSWORD` 环境变量）。直接 Start-Process 会因缺环境变量而启动失败。正确做法：`Stop-ScheduledTask` + `Start-ScheduledTask`。- **防复发**：compact 只压缩上下文窗口、不清 event 历史，长会话要"归档开新会话"而非无限续；超大无用会话直接删。### Suggested Action- 长会话及时归档（开新会话），别用 compact 无限续命- 定期检查 DB：`sqlite3 opencode.db "SELECT count(*) FROM event"`，>50万 或 >500MB 时考虑清理- 超大会话（>100MB）确认无用后删除，收益远大于 VACUUM- 清理流程见 `docs/opencode-maintenance.md`（已有完整命令）### Metadata- Source: conversation- Tags: opencode, database, sqlite, performance, cpu, maintenance, windows, ssh- Related Skill: opencode-maintenance- Related Doc: docs/opencode-maintenance.md





---

## [LRN-20260809-149] opencode-desktop-add-server**Logged**:  2026-08-09T19:40:00+08:00**Priority**:  medium**Status**:  done**Area**:  opencode-desktop### SummaryOpenCode Desktop 添加远程服务器的正确方式，以及编辑 `opencode.global.dat` 的注意事项。### Details**添加远程服务器的两种方式**：1. **UI 方式**（推荐）：主屏幕 → 点击服务器名称 → 服务器选择器 → "+ 添加服务器"。**但有已知 bug**（#38193, #40658）：Server name / Username / Password 字段无法编辑（输入框变灰），只有 Server address 能输入。2. **手动编辑配置文件**：修改 `opencode.global.dat` 中的 `server.list` 数组。**`opencode.global.dat` 结构**：- 顶层字段都是 **stringified JSON**（字符串化的 JSON），不是嵌套对象- `server` 字段包含 `list`（服务器列表）、`projects`（项目）、`lastProject`（上次项目）等- 服务器条目格式：  ```json  {    "type": "http",    "http": {      "url": "http://192.168.3.100:4096",      "username": "opencode",      "password": "xxx"    },    "displayName": "soft-router-opencode"  }  ```**⚠️ 编辑文件的致命坑**：- **绝不能用** PowerShell 的 `ConvertFrom-Json | ConvertTo-Json` 管道！这会：  1. 丢失数据（124KB → 8KB，大部分字段被截断）  2. 破坏 stringified JSON 值（双重转义）  3. 产生损坏的字段名（如 `http://192.168.3.100:4096\u0000notification`）- **正确方式**：用字符串操作（`IndexOf` + `Substring`）直接修改原始文本，或用 Python/Node.js 处理- 编辑前**必须备份**：`Copy-Item opencode.global.dat opencode.global.dat.bak`**`opencode.settings.dat` 的 `defaultServerUrl`**：- 这是 PR #7363 添加的功能，用于启动时连接远程服务器（替代本地 sidecar）- 存储位置：`opencode.settings.dat` 中的 `defaultServerUrl` 字段- **限制**：health check（`GET /health`）不带 Basic Auth，所以需要认证的服务器会失败- 弹出 "Connection Failed" 对话框，用户需手动点 "Start Local"**修复损坏文件**：1. 去掉 UTF-8 BOM（`0xEF 0xBB 0xBF`）2. 删除损坏的字段/尾部逗号3. 验证 JSON 有效性（Python `json.load` 比 PowerShell `ConvertFrom-Json` 更严格准确）### Suggested Action- 编辑 `opencode.global.dat` 时用 Python 而非 PowerShell- 始终先备份再编辑- 遇到 UI bug 时直接编辑配置文件是可行的替代方案### Metadata- Source: conversation- Tags: opencode-desktop, configuration, json, powershell, bug, server, remote- Related Issue: #38193, #40658, #7363- Related Doc: docs/opencode-web-mobile.md### WD Elements 移动硬盘断电重启 spin-up 超时挂载失败- **问题**：软路由拔电源重启后，移动硬盘（WD Elements 2621, USB ID 1058:2621）被识别成 0B，/mnt/usb4-1 挂载失败。导致 Docker（数据目录在硬盘上）落到 tmpfs/overlay，镜像容器全丢（Images:0），opencode 容器消失；SAMBA 共享只剩重启时新建的空壳目录（易误判"数据还在"）。- **根因**：机械硬盘断电后需重新 spin-up，WD USB 桥接在转起来前一直响应 NOT READY，内核 SCSI 等 30-120s 后放弃读容量（dmesg: Read Capacity(10) failed / ASC=0x44 ASCQ=0x81 需硬复位）。- **修复**：/etc/rc.local 接入 /etc/usb-mount-retry.sh —— 开机 30s 后检查 /dev/sda1 就绪（存在且 /sys/class/block/sda1/size>0），未就绪则 SCSI rescan 重试（注意 rescan 会阻塞，用后台子进程），就绪后 block mount 按 fstab UUID 挂载。实测拔电重启日志 "sda1 mounted OK"，全部服务自恢复。- **坑**：  - size 路径是 /sys/class/block/sda1/size，不是 /sys/block/sda1/size  - USB 端口号会变（usb3/3-1 → usb4/4-1），脚本勿硬编码  - OpenWrt 无 nohup，用 setsid 或后台子 shell  - sed 改 rc.local 中文/exit 0 匹配易报 unmatched '/'，用本地拼好后 base64 传输覆盖  - SSH 传 docker ps --format 引号会被剥掉，直接 docker ps 最简单  - rescan/unbind/authorized 手动折腾风险高（authorized=0 会把设备禁掉），尽量物理拔插或重启- **验证**：拔电重启后 cat /tmp/usb-mount.log 看 "sda1 mounted OK"- Source: conversation- Tags: openwrt, router, usb, wd-elements, docker, opencode, mount- @2026-08-10 [笔记本] 用户发图后应主动调用 vision/image-reader 识图；找图要选最新时间戳的文件（Temp 下 r4_*/ScreenShot_* 多），别误读旧的 user_pasted_image.png 缓存图 #识图 #流程- @2026-08-10 [笔记本] opencode-vision 识图插件完整机制：messages.transform 钩子存图到 %TEMP%\opencode-vision\image{N}\{hash}.ext + 注入路径提示；VISION_MODE=api(需VISION_API_KEY+URL)/subagent(委托@image-reader子代理,mimo-v2.5,零凭据,本机采用)。主模型无原生视觉时必须用 Task 委托 image-reader 子代理，不可用主模型 read 直接读图。官方文档:github.com/JochenYang/opencode-vision #识图 #插件- @2026-08-11 [笔记本] 用户指令有歧义(尤其语音输入)时先澄清再执行：用户说\"去掉第8个模式\"实指\"去掉 -debug 启动参数\"，不是 todo 第 8 项；理解偏差会浪费一轮操作 #流程 #沟通## [LRN-20260810-001] xiaoheihe-post-to-html-with-workshop-links**Logged**: 2026-08-10T12:00:00+08:00**Priority**: medium**Status**: done**Area**: web-scraping### Summary小黑盒帖子登录墙突破 + 帖子转「带 Workshop 链接网页预览」的完整流程：Jina Reader / Playwright / `link/tree` API 三层方案都能拿到未登录正文，图片 CDN 直连，mod 靠搜索+评论区线索识别。### Details- 小黑盒帖子是**登录墙 + SPA**：curl/webfetch/Firecrawl(云渲染) 只能拿到分享摘要（`redirect_data` 里的 title/description，会截断），拿不到完整正文与 Workshop ID。- **突破方法（无需登录）**：  - `curl -s "https://r.jina.ai/<分享链接>"`：Jina Reader 穿透登录墙，返回完整 markdown 正文。  - Playwright 直接打开分享链接也能看到完整正文（未登录即可）。  - **关键 API**：`https://api.xiaoheihe.cn/bbs/app/link/tree?link_id=<id>&h_src=...`（页面实际调用的接口），响应 `result.link.text` = 完整帖子 HTML（`<p>/<h3>/<h4>/<img>`），含全部图片 URL。用 Playwright network 面板可抓到该请求。- **图片 CDN 可直连**：`imgheybox.max-c.com` 图片不设登录墙（HTTP 200），HTML 可直接引用，无需下载。- **数据坑**：`link.text` 是**双层 JSON**（`[{"text":"<html>"}]`），需 `json.loads` 两次才得到真 HTML；图片 URL 在 `<img data-original="...">` 属性。- **PowerShell 坑**：`python -c` 里嵌双引号会与 PowerShell 转义冲突（ParserError），复杂脚本先写 `.py` 文件再执行。- **中文民间名 → Workshop ID**：帖子正文通常无 ID，mod 名是玩家俗称。识别法：① 按描述特征搜索 tavily/exa + webfetch 验证页面描述吻合；② 评论区常有英文 mod 名线索（如"recorded the hotbar 与 clean hotbar 会冲突"）；③ 命名直接可猜的如 Lifestyle: Hobbies。- 生成 HTML：python 脚本把 `<h3>` 标题替换为 `<a>` 超链接 + Workshop ID 徽标，`<img>` 转真实 src，保留原排版；`Start-Process` 用默认浏览器打开。### Suggested Action遇小黑盒登录墙：优先 Jina Reader 或 `link/tree` API 抓正文（result.link.text 双层 JSON）；图片直连 imgheybox CDN；mod 识别靠搜索 + 评论区线索，无法唯一确认的要标注"疑似"供用户核对。### Metadata- Source: conversation- Tags: xiaoheihe, web-scraping, playwright, jina-reader, project-zomboid, mod, workshop, html- Related Skill: agent-reach- Related Doc: docs/search-strategy.md---- @2026-08-11 [笔记本] opencode-vision 发图不回复的根因与修复：  场景：主模型 deepseek-v4-flash 贴图后一直不回复，消息下方持续加载，日志满屏 prompt_async failed: ReferenceError: Bun is not defined（出现 25 次）。  根因：plugins/vision-helper.ts 第 258/263 行用 Bun.file()/Bun.write() 写临时图片，但本机 opencode(1.18.16) 经 Node 加载插件时 Bun 全局未定义 → messages.transform 处理图片即抛异常 → 委托 @image-reader 的提示没注入 → 模型收到 unsupportedParts 的 ERROR 文本却不知委托看图。  修复：改用 Node 原生 fs.stat(path).then(exists) + fs.writeFile()（插件已 import promises as fs），bun build 验证通过，无残留 Bun. 引用。  经验：插件代码避免用 Bun 专属全局（Bun.file/Bun.write/Bun.$），opencode 插件加载环境不保证有 Bun；用 Node 标准库最稳。排查法：opencode.log 搜 prompt_async failed / Bun is not defined；顺带确认 %TEMP%\opencode-vision 目录为空=插件没写图。  Status: resolved #识图 #opencode #bug## @2026-08-11 Tailscale Windows 前端驱动 bug：突然断网+NoState 无法自愈（笔记本）- 症状：Tailscale 突然无法访问外网和内网；	ailscale status 显示 unexpected state: NoState + Tailscale is starting. Please wait.；网卡拿不到 100.x IP（APIPA 169.254.x）- 关键日志（C:\ProgramData\Tailscale\Logs\*.txt）：client disconnected (S-1-5-21-...) → Switching ipn state Running -> NoState → magicsock: SetPrivateKey called (zeroed)；此后每次启动 TryLogin: fetch control key ... context canceled，magicsock 报 o private key，服务重启无效- 根因：Tailscale 1.102 Windows 架构=前端驱动（服务跟随 GUI tailscale-ipn 生命周期）。桌面会话事件触发 client disconnected (SID) 错误清零密钥掉线；且 GUI 未运行时服务处于无前端状态，无法自行重新登录，卡在 NeedsLogin/NoState 循环（对应官方 issue #16849，Entra 用户会话变更触发）- 修复：启动 GUI C:\Program Files\Tailscale\tailscale-ipn.exe（Start-Process）→ 自动重新登录恢复 Running（本机 100.71.42.119）- 预防：	ailscale up --unattended 开启无人值守，服务不再依赖 GUI；否则每次会话事件都可能复发- 排查速查：tailscaled 日志在 C:\ProgramData\Tailscale\Logs\；state 在 server-state.conf；双进程（tailscaled + /subproc 子进程）是正常架构非冲突；status --json 看 BackendState/PrivateNodeKey（debug prefs 显示全零可能是脱敏）- Status: pending## @2026-08-12 全量编码审计 + 防乱码体系落地（跨双端）- **核心认知**：PowerShell 控制台按 GBK 显示 UTF-8 中文 = 乱码，但**文件本身可能是好的**。判断文件是否损坏必须用字节检查（前 3 字节 EF BB BF = 有 BOM；UTF-8 严格解码），不能凭终端显示。- **双端扫描结果**：笔记本 + 软路由全部中文内容文件合法 UTF-8 无损坏；笔记本清理 11 个带 BOM 文件（.learnings/ERRORS.md、FEATURE_REQUESTS.md、docs/project-zomboid.md、skills/tavo-operations 全家、configuration SKILL）+ 本次 review 顺手清掉 scripts/opencode-tray.ps1；软路由全净。- **文件名真损坏案例**：.playwright-mcp 三个 Tavo 卡片文件名中文已不可逆变 `?`（文件系统层 0x3F，内容完好）——历史工具在 GBK 下处理所致，无法恢复，按内容重命名。- **落地的防乱码规则**（已提升为 AGENTS.md 双端「编码纪律」）：统一 UTF-8 无 BOM；读写文件用 opencode read/write/edit 工具；禁止 PowerShell Get-Content/Set-Content 直接读写中文文件；scp 二进制安全；ssh 命令行禁内联中文；脚本文件保持 ASCII-only。- **工具**：scripts/encoding-audit.ps1（笔记本）+ encoding-audit.js（软路由 node 版，无 python3）。node 版内置严格 UTF-8 校验（overlong/surrogate 检查）。- Status: resolved## @2026-08-12 PowerShell 5.1 读 UTF-8 脚本文件 = GBK 解析，中文报语法错- **坑**：用 write 工具写的 UTF-8 无 BOM .ps1 脚本，被 `powershell -File` 执行时 PS 5.1 默认按 ANSI/GBK 读 → 脚本里中文注释/字符串解析错乱（`字符串缺少终止符` ParserError）。strip-bom.ps1 首次运行即踩此坑。- **修**：脚本内所有字符串改纯 ASCII（echo "TOTAL: ..." 替代中文），或脚本文件存 UTF-8 **带 BOM**（PS 5.1 识别 BOM 后按 UTF-8 读）。- **规则**：凡是会被 PowerShell 5.1 直接 `-File` 执行的脚本，一律保持 ASCII-only，中文输出全部移出脚本（运行时再组装）。- Status: resolved## @2026-08-12 paramiko 连软路由：默认不加载 id_router，需显式 Ed25519Key- **坑**：ssh_run.py 改造时，paramiko `c.connect(host, username=root)` 默认只找 `~/.ssh/id_rsa`/`id_dsa`/`id_ecdsa`/`id_ed25519` 等标准名，本机 `~/.ssh/config` 为软路由指定 `IdentityFile ~/.ssh/id_router` + `IdentitiesOnly yes`，paramiko **不读 config 的 IdentityFile** → Authentication failed。- **修**：paramiko 显式 `paramiko.Ed25519Key(filename=os.path.expanduser("~/.ssh/id_router"))` 后 `pkey=` 传入 connect。- **附带**：软路由 root 密码原硬编码在 ssh_run.py（918821），已改为密钥优先 + `ROUTER_PASS` 环境变量兜底，双路径实测通过。密码类敏感信息禁止硬编码进任何脚本。- Status: resolved## @2026-08-12 ssh 远程命令内联中文/引号 = PowerShell→ash 双层转义必炸- **坑**：`ssh root@192.168.3.100 "cat > /tmp/x.txt << 'EOF' ...中文... EOF"` 在 PowerShell 里 $()、反引号、$TMPDIR 被本地插值；远端 ash 又对双引号/反引号二次解析，含中文内容必乱或报 not found。awk 的 `NR==67{...}` 也被 PowerShell 转义破坏（Unexpected end of string）。- **修**：一切含中文/特殊字符的远端操作：本地用 write 工具写脚本文件 → scp 到远端 /tmp → `ssh root@... "sh /tmp/xxx.sh"`。远端无 python3 时用 node 或 sed/awk（UTF-8 字节安全）。scp 本身二进制安全不损坏编码。- Status: resolved## [LRN-20260812-001] ollama-intel-igpu-gpu-accel**Logged**: 2026-08-12T18:56:07Z**Priority**: high**Status**: done**Area**: infra### SummaryIntel Arc 核显跑 Ollama 必须设置 OLLAMA_IGPU_ENABLE 等环境变量才能 GPU 加速。### Details- Ollama 默认丢弃集成显卡（日志出现 "dropping integrated GPU"），全部走 CPU。- 需设 User 级环境变量：OLLAMA_IGPU_ENABLE=1 + OLLAMA_VULKAN=1 + OLLAMA_INTEL_GPU=1 + OLLAMA_NUM_GPU_LAYERS=99。- 设完后重启 ollama serve，ollama ps 应显示 PROCESSOR: 100% GPU。- 核显共享系统内存（32GB 笔记本可分 ~16.8GB 给 iGPU），无独立显存墙。- Intel iGPU 跑 MoE 模型（如 Qwen3-30B-A3B）会崩溃（xe 驱动 job timeout），只能选 dense 模型。### Suggested Action笔记本部署 Ollama 前先设这 4 个环境变量，核显用户避免 MoE 模型。### Metadata- Source: conversation- Tags: ollama, intel-igpu, gpu, environment- Related Doc: docs/opencode-config.md## [LRN-20260812-006] qwen3-thinking-disable-reasoning-effort**Logged**: 2026-08-12T18:56:17Z**Priority**: high**Status**: done**Area**: backend### SummaryQwen3 默认开启思考链（reasoning），在 OpenAI 兼容端点上无法用 think:false 关闭，需用 reasoning_effort:none。### Details- Ollama 的 /api/chat 原生端点支持 think:false，但 /v1/chat/completions（OpenAI 兼容，opencode/Open WebUI 用）不支持。- 顶层 easoning_effort: "none" 在 v1 端点上有效（思考关闭，响应 70s→2.9s）。- opencode.jsonc 的 model options 用 camelCase easoningEffort（SDK 转 snake_case 发送）；直接写 snake_case 不生效。- Qwen3 思考链在 Open WebUI 显示为灰色思考块，content 正常不碍事（可接受）。- 14B 在 iGPU 上思考链会拖慢 10 倍（70s vs 7s），关闭后工具调用正常。### Suggested Action本地 Qwen3 接入 OpenAI 兼容客户端时，用 reasoning_effort:none 而非 think:false。### Metadata- Source: conversation- Tags: qwen3, thinking, reasoning-effort, ollama, opencode- Related Skill: opencode-maintenance## [LRN-20260812-002] openwebui-web-search-config**Logged**: 2026-08-12T18:55:00+08:00**Priority**: medium**Status**: done**Area**: config### SummaryOpen WebUI（uvx 方式）启用 Tavily 联网搜索的完整流程与三个关键坑：DB 权威值、config/update 整块覆盖、UI 会话级开关。### Details- 部署方式：`uvx --python 3.11 open-webui serve --port 3000`，托盘脚本 scripts/openwebui-tray.ps1 守护（计划任务 OpenWebUI Web Tray）。- 数据目录在 uv cache 包内：`AppData\Local\uv\cache\archive-v0\<hash>\Lib\site-packages\open_webui\data\webui.db`（非默认 ~/.open-webui），uvx 升级换 hash 目录有数据"丢失"风险。- 配置启用（DB 权威）：UPDATE config SET value WHERE key：  - web.search.enable = 'true'（纯字符串，无引号）  - web.search.engine = '"tavily"'（JSON 编码带引号）  - web.search.result_count = 5（int）  - web.search.bypass_embedding_and_retrieval = 'true'  - web.search.tavily_api_key 从 env TAVILY_API_KEY 自动同步进 DB- 启动脚本注入 env ENABLE_WEB_SEARCH=true + WEB_SEARCH_ENGINE=tavily 是保底，但 DB 已有旧值 false 时 env 不覆盖。- 用户环境变量已有 TAVILY_API_KEY，直接复用无需申请。- UI 操作：每会话需手动开 输入框左侧 + 号 → 扩展功能 → 联网搜索 开关（会话级，刷新/切对话即关）。- 纯 API 调用 /api/chat/completions 不带 session_id 不会注入 search_web 工具，UI 请求才注入（middleware 判断 metadata.session_id）。- 验证方式：GET /api/v1/retrieval/config 看 web.ENABLE_WEB_SEARCH / WEB_SEARCH_ENGINE；UI 实测 search_web 调用返回 5 来源。### Suggested ActionOpen WebUI 数据目录建议固定 DATA_DIR 环境变量避免 uvx 升级丢数据（未做，待用户确认）。### Metadata- Source: conversation- Tags: openwebui, web-search, tavily, config, uvx- Related Doc: docs/openwebui.md## [LRN-20260812-003] powershell-script-encoding-gbk-trap**Logged**: 2026-08-12T18:56:27Z**Priority**: high**Status**: done**Area**: config### SummaryPowerShell 5.1 解析含中文注释的 UTF-8 无 BOM .ps1 会乱码导致括号错乱，计划任务静默启动失败。### Details- 现象：托盘脚本 .ps1 含中文注释且 UTF-8 无 BOM，[Parser]::ParseFile 报"缺少右花括号"，计划任务启动后 task=Ready 非 Running、无托盘进程。- 根因：PS 5.1 默认按系统 ANSI(GBK) 解析 .ps1，中文注释被误读破坏括号/引号。- 解法：用 [IO.File]::WriteAllText(path, content, [Text.Encoding]::GetEncoding(936)) 转 GBK 保存后语法 OK。- 或：脚本注释全用英文/ASCII（UTF-8 无 BOM 即可）。- 此前 openwebui-tray.ps1 踩过同样坑（转 GBK 后解析正常）。### Suggested Action新建含中文的 .ps1 脚本：要么转 GBK 编码保存，要么注释用英文。### Metadata- Source: conversation- Tags: powershell, encoding, gbk, utf8, scheduled-task## [LRN-20260812-004] tray-script-scheduled-task-pattern**Logged**: 2026-08-12T18:56:39Z**Priority**: high**Status**: done**Area**: infra### SummaryWindows 托盘服务脚本（openwebui-tray.ps1 / opencode-tray.ps1）的正确模式：计划任务托管 + 隐藏窗口 + 按端口停服务。### Details- **启动方式**：必须用计划任务（Register-ScheduledTask，AtLogOn + Interactive），父进程是 svchost，彻底独立于任何终端。用 Start-Process 启动的脚本父进程是调用者（如 OpenCode.exe），关掉终端会被连带杀掉。- **隐藏窗口**：计划任务 Arguments 必须含 -WindowStyle Hidden，否则弹 PowerShell 窗口。- **启动服务**：Start-Process uvx/服务exe 带 -WorkingDirectory（用户目录）+ -WindowStyle Hidden，避免在 system32 写文件报 PermissionError（.webui_secret_key）。- **停止服务**：Stop-OcService/Stop-OpenWebUI 必须**按端口**查监听进程杀（Get-NetTCPConnection -LocalPort X），不能只杀自己 Start 的进程——否则孤儿服务残留后台。- **退出机制**：托盘 Exit 菜单 = 停服务 + Application.Exit()。已验证"退出托盘=停服务，计划任务可恢复"。- **uvx 链弹窗结论**：uvx→uv→open-webui→python 链在 -WindowStyle Hidden 下无 conhost 不弹窗（正常）。调试期用 WMI/直接启动才会弹。- 多个托盘实例会重复：需按命令行匹配 openwebui-tray 清理，只保留计划任务那个。### Suggested ActionWindows 后台服务托盘化照此模板：计划任务 + Hidden + 按端口停。### Metadata- Source: conversation- Tags: tray, scheduled-task, powershell, service, windows- Related Skill: opencode-maintenance## [LRN-20260812-005] openwebui-uvx-python311-deploy**Logged**: 2026-08-12T18:56:51Z**Priority**: high**Status**: done**Area**: infra### SummaryOpen WebUI 在 Python 3.14 系统上需用 uvx 隔离 Python 3.11 运行（3.14 不兼容），Web 搜索走 Tavily。### Details- 系统 Python 3.14.4 不兼容 Open WebUI（官方支持 3.11/3.12），用 uvx --python 3.11 open-webui@latest serve --port 3000 隔离运行。- 首次启动需下载 Python 3.11 + Open WebUI + embedding 模型（all-MiniLM-L6-v2），完整启动 40-60 秒。- 首次注册走 POST /api/v1/auths/signup（界面登录按钮识别为 signin 会 400）。- 账号密码不匹配时浏览器靠旧 token 登录，API 测 signin 返回 400。- Web 搜索配置：设置→联网搜索→tavily，key 从环境变量自动读；输入框"扩展功能"菜单开"联网搜索"开关（每对话）。- 14B 模型优先用知识库工具（query_knowledge_files）而非 web search，需明确提示"用联网搜索工具"才触发 search_web。- 生图（ComfyUI/SDXL）预留：Open WebUI 支持 IMAGE_GENERATION_ENGINE，将来接本地 ComfyUI。### Suggested ActionOpen WebUI 部署固定用 uvx 隔离 3.11；搜索 key 放环境变量。### Metadata- Source: conversation- Tags: openwebui, uvx, python311, tavily, web-search- Related Skill: opencode-maintenance## [LRN-20260812-007] qwen3-moe-30b-a3b-intel-igpu-recheck**Logged**: 2026-08-13T06:06:14Z**Priority**: medium**Status**: done**Area**: infra### SummaryMoE 模型并非绝对不适合 Intel 核显：64 专家的 Qwen3-30B-A3B 官方实测可跑 34 t/s，但 32GB 内存是瓶颈。### Details- 早期结论"Intel iGPU 跑 MoE 会崩"过于绝对。修正：  - **128 专家 MoE**（如 qwen3-coder-next 80B）会崩：MUL_MAT_ID 操作超 10 秒被 Intel 驱动 kill（issue #19327）。  - **64 专家 MoE**（Qwen3-30B-A3B / 235B-A22B）Intel 官方在 Core Ultra 9 285H + Arc 核显实测 34 t/s（intel.com 官方文档）。- **内存才是真瓶颈**：30B-A3B 总参数 30B（激活仅 3B），但全部参数要驻留内存 = 19GB（Q4），32GB 笔记本加载后仅剩 ~1GB，系统卡顿。- MoE 省的是计算量（快）不是内存（模型多大占多大），适合算力瓶颈设备，不适合内存瓶颈设备。- 结论：14B dense（17GB 占用）vs 30B-A3B（19GB 占用）内存几乎一样，但 14B 下载便宜（9GB vs 19GB）、生态成熟，仍是 32GB 核显本最优解。### Suggested ActionIntel 核显选 dense 模型；若试 MoE 确认专家数 ≤64，且内存必须 ≥ 模型大小+系统余量。### Metadata- Source: conversation- Tags: moe, qwen3, 30b-a3b, intel-igpu, memory## [LRN-20260812-008] local-small-model-tool-calling-unrealistic**Logged**: 2026-08-13T07:10:16Z**Priority**: medium**Status**: done**Area**: backend### Summary本地小模型（≤14B）在 opencode 里自主工具调用不现实，官方/实测均指向 Gemma4 26B+；混合模式（云端主+本地兜底）是务实方案。### Details- 用户需求"模型自主搜+调工具"（agent 场景）在本地 14B 上不可行。- 证据：  - glukhov opencode 实测：本地能过工具测试的是 Gemma 4 26B/31B（IQ3/IQ4），Qwen3-14B Fail、Qwen3-Coder-30B Fail。  - opencode 官方推荐本地默认 gemma-3n-e4b（4B MoE），但实测 E4B 工具调用弱。  - 知乎踩坑：Ollama OpenAI 兼容接口 + 本地小模型 tool_calls 格式不稳定，agent 场景不可靠。  - 根因：opencode system prompt 含几十个工具定义，14B 处理能力带不动。- 决策：混合模式——opencode 主模型 deepseek-v4-flash（云端）负责自主搜索+工具调用；本地 14B 无审查只作断网/隐私/无审查应急兜底（简单问答+总结）。- 14B 做"简单总结"已验证可用（opencode CLI 里正确总结 RAG，中文流畅，无思考泄漏）。### Suggested Action本地 14B 定位为应急兜底，不承担自主 agent/工具调用任务；要自主工具调用需 26B+（核显上速度慢）。### Metadata- Source: conversation- Tags: opencode, local-model, tool-calling, agent, hybrid- Related Doc: AGENTS.md## [LRN-20260813-001] comfyui-intel-igpu-sdxl-gguf-deploy**Logged**: 2026-08-13T09:34:25Z**Priority**: high**Status**: done**Area**: infra### SummaryComfyUI 在 Intel Arc B390 核显上部署成功：手动部署（非一键脚本）+ PyTorch XPU + Juggernaut XL GGUF，文生图验证通过。### Details- **为什么不用一键脚本**：ai-joe-git 脚本默认装 C:\ComfyUI（C 盘根目录需管理员权限，本机不可写），改手动部署到 C:\Users\pass\ComfyUI。- **Python**：系统 3.14 不兼容，用 uv python install 3.11 装 3.11，python -m venv comfyui_venv 建 venv。- **PyTorch XPU**：pip install --pre torch --index-url https://download.pytorch.org/whl/nightly/xpu。**坑**：先装 requirements.txt 会装 CPU 版 torch 覆盖 XPU 版，需装完 requirements 后 --force-reinstall torch 重装 XPU。- **验证**：	orch.xpu.is_available() True，get_device_name = Intel Arc B390 GPU；ComfyUI system_stats 显示 xpu:0。- **SDXL 模型组件**（GGUF unet 需配齐）：unet=juggernaut-xl-v9-Q4_K.gguf（2.76GB，offgrid-ai 仓库）+ clip 需**双编码器**（clip_l.safetensors + sdxl_clip_g.safetensors，用 DualCLIPLoader type=sdxl）+ vae=sdxl_vae.safetensors（stabilityai/sdxl-vae）。**坑**：单 CLIPLoader 会报 mat shape mismatch，SDXL 必须 DualCLIPLoader。- **启动参数**：main.py --lowvram --bf16-unet --async-offload --disable-smart-memory + env SYCL_CACHE_PERSISTENT=1。- **生图**：API 提交 workflow，1024x1024 约 1-2 分钟/张（核显），画质良好。- **sd-prompt 脚本**：opencode 全局 prompt 含 vision 指令，14B 作 agent 被干扰（误认为有图），改用独立脚本 scripts/sd-prompt.py 直接调 Ollama，纯文本转换正常 + 无审查。### Suggested Action核显生图用此方案；模型从 HuggingFace（offgrid-ai/HyperX-Sentience/SDXL-GGUF）下载走 XF 节点。### Metadata- Source: conversation- Tags: comfyui, intel-igpu, xpu, sdxl, gguf, image-gen## [LRN-20260813-002] sdxl-face-preserve-intel-igpu-img2img**Logged**: 2026-08-13T14:11:03Z**Priority**: high**Status**: done**Area**: infra### SummaryIntel Arc 核显生图保脸方案：IP-Adapter 彻底不兼容（黑图），改用 img2img + 匹配原图比例 + 低 denoise(0.35)，人脸相似度 85-95%。### Details- **IP-Adapter 在 Intel Arc XPU 黑图（硬限制）**：无论 GGUF/fp16 模型、bf16/fp32 模式都输出纯黑图（5KB）。IPAdapter_plus 的 CrossAttentionPatch 明确"ignore casts to CPU"，无法强制 CPU。核显上无解。- **fp16 Juggernaut + fp32 也黑图**：核显只兼容 GGUF 模型 + --bf16-unet（已多次验证正常出图）。fp16 模型在核显 fp32 推理全黑。- **可用保脸方案**：GGUF Juggernaut + img2img + 低 denoise(0.35) + **匹配参考图比例**（竖图用 768x1152，避免方形裁脸），人脸相似度 85-95%，无畸形。- **保脸 vs 换装权衡**：denoise 0.35 保脸 90% 但换装弱；0.5 换装明显脸略变；要换装需提示词明确"replace gray dress with white shirt"。- 已整合进网页生图（image-web.py）：上传参考图自动检测原图比例选尺寸，denoise 档位 0.25/0.35/0.5/0.65。- **注意**：参考图是全身竖构图时，img2img 尺寸必须匹配比例，否则 crop:center 会裁掉脸（之前 1024x1024 方形只留躯干）。### Suggested Action核显生图保脸用 GGUF+img2img+低denoise+匹配比例；别用 IP-Adapter（核显黑图）。### Metadata- Source: conversation- Tags: sdxl, face-preserve, intel-igpu, img2img, ipadapter## [LRN-20260813-003] reactor-face-swap-intel-igpu**Logged**: 2026-08-13T17:02:08Z**Priority**: high**Status**: done**Area**: infra### Summary核显换衣保脸最终方案：用 ReActor 换脸节点（img2img 换衣 + 人脸交换），绕开 IP-Adapter 黑图和 inpaint 不兼容。### Details- 核显（Intel Arc B390）上保脸方案演进：  - IP-Adapter：彻底黑图（无解，见 LRN-20260813-002）  - inpaint 局部重绘：GGUF 核显不兼容，重绘区域生成新人物/纯背景，接缝生硬  - img2img 低 denoise(0.35)：保脸 85-95% 但换装弱- **ReActor 换脸方案**（最终）：img2img 高 denoise 换衣（脸随便）→ ReActor 把参考图人脸贴回去。换衣和保脸分离。- **ReActor v0.6+ 不需要 insightface**（"No Insightface required"），用 ONNX 模型 inswapper_128.onnx（13.5MB）。- 部署：git clone Gourieff/ComfyUI-ReActor → pip install onnxruntime → 下载 inswapper_128.onnx 到 ComfyUI/models/insightface/。- **下载坑**：HF 直连/软路由 7893 代理 SSL 失败（UNEXPECTED_EOF），**本机 FlClash 代理 http://127.0.0.1:7890（xf 机场）可下载**。### Suggested Action核显换衣保脸用 img2img+ReActor；模型从 HF 走本机 FlClash(127.0.0.1:7890) 代理下载。### Metadata- Source: conversation- Tags: sdxl, face-swap, reactor, intel-igpu, img2img## [LRN-20260814-144] qwen3.6-27b 在 Ollama 0.32.8 必须 think:false 否则 content 空**Logged**: 2026-08-14T20:15:00+08:00**Priority**: high**Status**: done**Area**: config### SummaryOllama 0.32.8 跑 qwen3.6:27b（qwen35 新架构）时默认开 thinking，回复全进 `message.thinking` 字段，content 恒空（done_reason=length，eval_count 有值但无输出）。加 `think:false` 参数后正常输出。### Details- 现象：ollama API 调用返回 content 为空，thinking 字段有内容；测试 2+2 只出思考不出答案- 排查：检查 message 所有 key 发现 `thinking` 字段；加 think:false 后 content='4' 正常- 解决：opencode.jsonc 的 local-ollama provider 模型 options 加 `"think": false`- 后续：qwen3.6:27b 已删除（见 LRN-20260814-149），此坑已无实际影响，但若以后再配 3.6 系列需注意### Suggested Action配置 Qwen3.6+ 系模型时，模型 options 必须含 think:false；用 API 测试时检查 message.thinking### Metadata- Source: conversation- Tags: ollama, qwen3.6, thinking, local-llm- Related Doc: AGENTS.md## [LRN-20260814-145] Ollama 下载大模型必须 serve 带 7890 代理重启**Logged**: 2026-08-14T20:15:00+08:00**Priority**: high**Status**: done**Area**: config### SummaryOllama 的 pull 下载由常驻 serve 进程执行，serve 启动时的环境变量决定是否走代理。FlClash TUN 透明代理对 Ollama 下载通道不生效（registry 大文件 0 进展），必须重启 serve 并注入 HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:7890 才成功。### Details- 现象：ollama pull gpt-oss:20b 超时 1 小时 0 字节；9b 之前也遇到- 排查：Ollama 是 ollama app.exe 托盘进程，serve 后台常驻；`ollama pull` 只是客户端发指令，真正下载在 serve 进程- 解决：`Stop-Process ollama,ollama app` → 设 $env:HTTPS_PROXY/HTTP_PROXY=7890 → `Start-Process ollama.exe serve` → 再 pull- 注意：TUN 模式虽是透明代理，但对 Ollama 下载不生效（Ollama 下载可能走系统代理检测或特殊通道）- 附带：下载后要恢复正常模式（不带代理）需重启 serve 并清空代理环境变量；但 serve 已加载模型时重启会丢模型，先 ollama stop### Suggested ActionOllama 下载失败/0 进度时，先检查 serve 是否带代理环境变量；大模型下载用断点续传多次重试### Metadata- Source: conversation- Tags: ollama, proxy, download, flclash- Related Doc: AGENTS.md## [LRN-20260814-146] (Status: promoted) ComfyUI spawn 的 uv python 子进程是正常架构**Logged**: 2026-08-14T20:15:00+08:00**Priority**: medium**Status**: done**Area**: infra### SummaryComfyUI（venv python 主进程）会 spawn 一个 uv python 子进程承担 8188 服务，子进程通过 PYTHONPATH 继承 venv 的 site-packages，属正常架构。勿当残留进程杀掉（曾导致黑图/显存异常假象）。### Details- 现象：启动 venv ComfyUI 后，8188 端口被 AppData\Roaming\uv\python\...python.exe 子进程占用；该子进程 import comfy 报错（裸环境）- 排查：子进程加 venv site-packages 到 sys.path 后 import comfy/onnxruntime 正常 → 说明通过 PYTHONPATH 继承 venv 包- 结论：venv 主进程 spawn uv worker 承担 server，是 ComfyUI 正常多进程架构- 判断标准：看 8188 是否实际可用（system_stats 200），可用即正常；不可用才需排查### Suggested Action勿仅凭"uv python 缺依赖"判断进程异常；先验证 8188 可用性### Metadata- Source: conversation- Tags: comfyui, multiprocessing, uv, python- Related Doc: docs/comfyui-image-gen.md## [LRN-20260814-147] (Status: promoted) 生图峰值显存实测仅 2.14GB（SDXL GGUF Q4 按需加载）**Logged**: 2026-08-14T20:15:00+08:00**Priority**: high**Status**: done**Area**: infra### Summary实测 ComfyUI 生图（juggernaut-xl-v9-Q4_K.gguf + sdxl_vae）峰值显存需求仅 2.14GB，而非之前误以为的 16GB。GGUF 模型通过 CPU offload 按需加载到 GPU。### Details- 方法：提交生图任务同时轮询 system_stats 的 vram_free，捕捉 min_free 反推 peak_used- 结果：baseline free=16.45GB，生图时 min_free=14.31GB → peak_used=2.14GB- 影响：qwen3.6:27b（16GB）+ 生图（2.14GB）≈ 18.1GB，在 16.45GB 可见显存下实测共存成功（74s 出图非黑）- 之前 OOM 是双进程混乱（uv 旧进程 + reserve-vram 干扰）的假象，非真实显存不足### Suggested Action评估显存需求时用实测（监控 vram_free）而非 system_stats 报告的 vram_total### Metadata- Source: conversation- Tags: comfyui, vram, gguf, sdxl- Related Doc: docs/comfyui-image-gen.md## [LRN-20260814-148] ollama run 是交互式命令会卡终端**Logged**: 2026-08-14T20:15:00+08:00**Priority**: medium**Status**: done**Area**: infra### Summary`ollama run <model> "prompt"` 即使带参数也会进入交互式对话模式不退出，阻塞终端直到超时。测试模型应改用 API 方式（/api/chat 非流式）。### Details- 现象：ollama run qwen3.6:27b "say ready" 挂起直到 300s 超时（终端全是 ANSI 进度刷屏）- 解决：用 python/urllib 调 http://localhost:11434/api/chat，stream:false，读取 message.content- 附带：该现象导致用户等待焦虑（"怎么这么久没结果"），测试模型必须用 API 非交互方式### Suggested Action验证 Ollama 模型一律用 API 调 /api/chat，不用 ollama run（除非确认会退出）### Metadata- Source: conversation- Tags: ollama, cli, testing- Related Doc: AGENTS.md## [LRN-20260814-149] 27B 本地模型对 32GB 机器负担过重，最终移除**Logged**: 2026-08-14T20:20:00+08:00**Priority**: high**Status**: done**Area**: config### Summaryqwen3.6:27b（17GB）和 gpt-oss:20b（13GB）经实测评估后均已删除。27B 模型加载时 llama-server 占 ~18GB（内存+显存），32GB 机器可用内存从 21.8GB 骤降到 3.7GB，且与生图/日常使用冲突。### Details- 评估过程：qwen3.6 中文好+多步工具调用完美（搜索→生图串联），但代价是 ~18GB 占用- 决策：用户选择删除（ollama rm），释放 30GB 磁盘，本地只留 qwen3.5-9b（6.6GB）应急- 结论沉淀：本地 ≤9B 只够轻量/单步工具调用；完整多步 agent 靠云端 deepseek-v4-flash- 附带：内存占用排查方法 = `Get-Process llama-server` 看 WorkingSet64，Ollama 模型占内存大头### Suggested Action配本地大模型前先评估内存预算（32GB 机 ≤9B 模型），27B+ 除非用户明确接受内存代价否则不推荐### Metadata- Source: conversation- Tags: ollama, 27b, memory, decision- Related Doc: AGENTS.md





### LRN-20260814-xxx  opencode 4096 僵尸 socket（双托盘实例竞态）
- 现象：手机连不上 opencode web；本机 health 超时；TCP 能连但 HTTP 无响应；端口 4096 显示 Listen 但 OwningProcess 进程不存在；CLOSE_WAIT 连接堆积
- 根因：用户看到 2 个托盘图标 = 2 个 opencode-tray.ps1 实例同时运行。Exit 时两实例并发执行 Stop-OcService，实例 A 杀掉 serve 进程后实例 B 再杀（进程已消失），serve 被非正常终止，TCP socket 未由 OS 回收 → 僵尸监听端口
- 修复：托盘脚本加单实例 Mutex（WaitOne(0) 已运行则 exit），防重复启动
- 处置：僵尸端口 Windows 侧无 API 强制释放，只能重启系统（脚本日志已注明 system reboot REQUIRED）
- 教训：① 后台常驻脚本必须单实例锁；② 杀进程后 socket 未必立即释放，绑定时要兼容僵尸端口


### LRN-20260814-xxx  opencode serve 托盘→NSSM 服务迁移（僵尸端口根因与根治）
- 反复出问题根因：托盘脚本无单实例锁，双实例并发 Stop-OcService 竞态 → serve 被非正常终止 → socket 不回收 → 僵尸端口需重启系统
- 根治方案：NSSM 注册系统服务（opencode-web），AppExit Default Restart + AppThrottle 2000 崩溃自动重启；ObjectName .\pass 让服务继承 User 级环境变量（密码/token）；无需托盘图标
- 安装脚本：scripts/install-nssm-opencode.ps1（winget 装 NSSM → 禁用托盘任务 → 杀残留 → nssm install/set）
- 环境变量继承：服务以 .\\pass 运行即自动读 User env，**不要**用 AppEnvironmentExtra 重复注入
- 日志：AppStdout/AppStderr 重定向 + AppRotateFiles 轮转，避免 C 盘膨胀
- 状态：托盘计划任务已禁用；服务 Auto 启动；僵尸端口待系统重启释放后服务自动拉起

### LRN-20260815-xxx  opencode 4096 托盘优雅关停（借鉴 DeepSeek Harness 桌面壳）
- 背景：DS 官方 2026-08-14 开源 DeepSeek Harness（dsh），只提供 Web UI（npx dsh web → 127.0.0.1:3080），社区 48h 做了十几个桌面壳（deepseek-harness-desktop 等）。核心 supervisor 模式与 opencode-tray.ps1 同构：spawn 子进程 + 单实例锁 + 托盘 + 崩溃重启。
- 借鉴落地到 scripts/opencode-tray.ps1：
  1) **优雅关停**：Stop-OcService 由 Stop-Process（TerminateProcess 硬杀）改为 Ctrl+C 模拟（AttachConsole + GenerateConsoleCtrlEvent，等效 SIGTERM）→ 等 10s 端口释放 → 硬杀兜底 → 仍占报僵尸。**实测 serve 1s 内退出、端口干净释放**（治僵尸端口根因）
  2) **指数退避自检**：2 连败重启，间隔 60s→120s→240s→480s 翻倍，4 轮熔断停止 + Error balloon
  3) **开机自启托盘开关**：菜单 "Auto-Start at Login"，Enable/Disable-ScheduledTask 切换 + 勾选态
  4) **就绪判定**：轮询 /global/health 200 才算 READY（端口绑定≠就绪）
- 技术要点：Ctrl+C 前必须 SetConsoleCtrlHandler(NULL, TRUE) 忽略自身进程，否则托盘脚本同组收信被杀；AttachConsole 失败自动降级硬杀
- 教训：① supervisor（用户态壳）优于 Windows 服务——NSSM 曾因 CloudAP 1069/LocalSystem 分号坑失败，社区也选 supervisor 而非服务；② 托盘图标 UI 自动化取不到坐标，验证靠日志+隔离测试（%TEMP%\opencode\test-graceful.ps1）

### LRN-20260815-xxx PowerShell here-string（@"..."@）里反引号是转义符
- 用 Add-Content 写入含 npx 的 markdown 文本时，n 被解释成 LF → 写入内容被拆断（"npx"变换行+"px"）
- 教训：PS 双引号 here-string 中反引号有转义语义；写含反引号/行内码的文本用单引号 here-string（@'...'@）或直接用 opencode edit 工具；写入中文/代码文件后必须用 read 复查编码与内容
- 相关：编码纪律见 AGENTS.md §14（统一 UTF-8，终端乱码≠文件坏）

### LRN-20260815-xxx opencode DB 定期清理机制（脚本+计划任务+官方修复自动停用）
- **归档不省空间**：opencode 内置 `session archive` 只置 `time_archived` 字段，event 快照全留（Windows 用户实测 archived 会话仍占 2.67GB）；省空间只能删。膨胀主因是 `message.updated.1`/`message.part.updated.1` 全量快照（issue #33356，PR #36710 已关闭未合并）
- **方案**：`scripts/opencode-db-cleanup.ps1`（UTF-8 BOM）+ 计划任务 `OpenCode DB Cleanup`（每月 1 号 04:00）→ 备份(.backup 保留3份)→SQL 删 30 天前会话→孤儿 event 清理→opencode 未运行时 VACUUM INTO+校验+替换→清 TEMP 残留
- **官方修复自动停用**：脚本第一步检测 `opencode db --help` 是否含 `compact-events`/`event-log-status`（命令名在 PR #36710 已定型），含则 Disable-ScheduledTask + Toast 后退出
- **踩坑**：①PS 5.1 `New-ScheduledTaskTrigger` 无 `-Monthly`；`schtasks /XML` 中文环境报 `(11,23):DaysOfMonth:1`（须用 `<DaysOfMonth><Day>1</Day></DaysOfMonth>` 格式）；最终用 `schtasks /Create /SC MONTHLY /D 1 /ST 04:00 /F`（参数数组传引用避免引号坑）②PS 5.1 `$ErrorActionPreference=Stop` 下原生命令 stderr 抛 NativeCommandError，检测命令须 `cmd /c "..."` + 局部 EAP 抑制③首次实测释放 TEMP 残留 12.9GB（opencode-backup-*/compacted*/bak_*）
### LRN-20260815-xxx 锁屏验证策略 + 记录后乱码检查
- **锁屏时验证**：用户锁屏后 `windows-mcp_Screenshot`/`Snapshot` 只能拍到锁屏界面（深色+Windows 徽标+指纹），任务栏/托盘/插件显示全部看不到，UI 交互失效。改用「锁屏也能用的后台手段」：查进程（Get-CimInstance/Get-Process）、读文件（go_usage.txt/config.ini/error.log）、LoadLibrary 验证 DLL、API 调用、写标记文件（%TEMP%\xxx-ok.txt）轮询结果
- **提权重启管理员程序**（如 TrafficMonitor）：`Start-Process -Verb RunAs` 弹 UAC，锁屏时 UAC 在安全桌面显示，用户点「是」后脚本照常执行；用标记文件轮询避免 `-Wait` 挂起
- **记录后必查乱码**：每次写完记忆/文档，用 `[System.IO.File]::ReadAllText` 或 opencode read 工具复查中文内容与编码（UTF-8 无 BOM）；终端 GBK 显示乱码 ≠ 文件坏，别凭终端显示判断
- 相关：AGENTS.md §14 编码纪律

### LRN-20260815-xxx OpenCode Go 用量 TrafficMonitor 插件（最终：插件独立调官方 API）
- **数据源**：`GET https://opencode.ai/zen/go/v1/usage`（Bearer 用 `%USERPROFILE%\.local\share\opencode\auth.json` 的 opencode-go key）→ `usage.{rolling,weekly,monthly}.{percent,resetsAt}`，无需 cookie
- **最终实现**：纯 C++ TrafficMonitor 插件（`tools\go-usage\plugin\opencode_go_usage.cpp`），WinHTTP 直连官方 API，2 个显示项（已用% + 重置时间），**无外部脚本/托盘/自启**。VS2022 BuildTools `cl /utf-8 /LD` 编译（`#pragma comment(lib,"winhttp.lib")`），放 plugins\ 后重启加载
- **动态刷新**（v2.10）：刷新间隔随剩余时间自适应（>24h:60min / >6h:30min / >2h:15min / >1h:10min / >30m:5min / >10m:2min / <=10m:1min）；Reset 项目用**动态值回调**（`SetDynamicValue` + 函数指针），每次 `GetItemValueText` 实时重算剩余秒，数值随分钟递减而非等拉取周期；剩余秒用 UTC FILETIME 差值（GetSystemTime 统一 UTC，避免时区混用）
- **踩坑**：①PS 无 `elif` 用 `elseif` ②`NotifyIcon.Text` 上限 63 字符 ③PS 5.1 读 UTF-8 无 BOM 含中文脚本按 GBK 解析乱码 ④TrafficMonitor 插件必须管理员重启才加载，DLL 被占用不能覆盖，先杀进程再复制 ⑤中文路径用 WScript.Shell 快捷方式解析 ⑥**JSON 解析必须限定 `"monthly"` 对象**，响应里 rolling/weekly/monthly 各有一个 percent/resetsAt，find 第一个会命中 rolling ⑦auth.json 的 `"key": ` 冒号后有空格，解析要容忍空白 ⑧WinHTTP 用 `WINHTTP_ACCESS_TYPE_NO_PROXY` 直连成功，`DEFAULT_PROXY` 在软路由透明代理环境不稳
- **验证**：`test_plugin.cpp` 直接 LoadLibrary DLL → TMPluginGetInstance → 模拟 DataRequired，打印 item 值（曾验证 used=99% reset=50m），比重启 TrafficMonitor 快得多

## DSH (deepseek-harness) 接入 opencode-go 踩坑记录
@2026-08-16 [笔记本] 安装 `@deepseek-ai/dsh`（DeepSeek Harness 0.1.0-rc.6）接入 opencode-go (OC Go) provider 的踩坑：

1. **必须配两处**：`llm-pi-ai.providers.opencode-go.apiKeyEnv` + `agent-default-model`（provider/model/reasoningEffort），只配第一处 headless 会报 `MISSING_CREDENTIAL: llm-deepseek: no API key for provider route "deepseek-official"`。默认模型 provider 名是 `opencode-go`，模型 `deepseek-v4-pro/flash`。
2. **DSH 读取调用目录的 `.env` 且拒绝 bootstrap-only 键名**（`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`、`DSH_`/`XDG_`/`DYLD_`/`BASH_FUNC_` 前缀）：在 opencode 配置目录跑 dsh 会报 `sets "ALL_PROXY", which only the launching environment may set`。解决：opencode 的 `.env` 里那三行空值代理已删除（User 级代理早已清空，无实际作用）。注意任何目录下 `.env` 里有这些键都会报错。
3. **验证 key 用 node 不用 curl**：Windows curl 有 `SEC_E_NO_CREDENTIALS` 坑，用 node https 调 `https://opencode.ai/zen/go/v1/models`（GET 带 Bearer）验证，OC Go 网关返回 26 个模型。
4. **headless 冒烟**：`dsh --profile headless "Reply with exactly: OK"` 首次会初始化 profile（慢），返回 OK 即通。web UI 启动：`dsh web` → http://127.0.0.1:3080（HTTP 200 验证）。
5. **自动更新**：npm 全局包无内置自更机制，建了计划任务 `dsh-auto-update`（每周日 03:00 跑 `~/.dsh/update-dsh.ps1`）。脚本里版本正则必须匹配 `dsh@([0-9]...)` 而不是第一个 `@`，否则会把包名当版本号。
Status: active
- @2026-08-16 [笔记本] Tailscale Windows 托盘客户端界面纯英文（菜单/Preferences 均无中文，无 Language 选项，语言不跟随系统），别再说它有中文版；服务 tailscaled.exe 正常，仅 UI 无中文 #纠正 #Tailscale

## @2026-08-16 FlClash 扩展脚本劫持 opencode 流量（慢+ECONNRESET）
- 现象：opencode zen DS 模型慢、频繁红字 AI_APICallError（socket closed / ECONNRESET）
- 根因：FlClash profile 关联扩展脚本 scripts/339618059322920960.js 在 rules.unshift 强制 DOMAIN-SUFFIX,opencode.ai,XFLTD，把 opencode 请求送 XFLTD→自动选择→新加坡 01。运行配置无 opencode 专属规则，纯靠 Match 兜底进代理。TUN 模式下 NO_PROXY 无效（DNS 返回 fake-ip 198.18.x.x）
- 定位方法：FlClash 数据目录 AppData\Roaming\com.follow\clash\（旧 ~/.config/clash 是废弃的 FlClash 魔戒订阅）；shared_preferences.json 看 currentProfileId；database.sqlite 的 profiles 表查 profile→script_id 映射；9090 mihomo API 看 /rules /connections（无鉴权）
- 修复：脚本改 opencode.ai 等 AI 域为 DIRECT（持久，FlClash 重载 profile 时生效）；运行配置 config.yaml 同步插 DIRECT + PUT /configs?force=true body={path:...} 立即重载（204）
- 验证：DELETE /connections 清旧连接→再请求→新连接 chains=DIRECT；直连 models.opencode.ai 0.7-1.1s
- 坑：API PUT /configs 直接传完整 YAML 报 Body invalid，必须用 {path:"..."} 形式
- 注意：opencode.ai 是境外 Cloudflare，直连 0.7-1.1s 尚可；若再断可改香港节点而非 DIRECT
Status: resolved
- @2026-08-19 image-reader（mimo-v2.5）报告屏幕坐标不可靠：同一元素两次坐标差异巨大（看视频按钮 1545 vs 1806；晚餐领取 950 vs 2247）。可靠定位法：db shell uiautomator dump 解析 bounds 拿精确中心坐标再点击。 #手机 #adb #坐标
- @2026-08-19 番茄小说（com.dragon.read）领时长机制：看视频领时长=播放广告（约40秒，可能跳"刺激推荐/下载应用"落地页，返回键退出）；时长自动加到听书可用时长；uiautomator dump 可拿到红包/按钮精确 bounds（含 Compose 节点）。 #手机 #番茄小说 #听书
- @2026-08-19 Windows 下 adb 截图正确姿势：db shell screencap -p /sdcard/x.png 存手机端再 db pull，避免 PowerShell db exec-out > file 重定向损坏二进制。 #adb #Windows- @2026-08-20 [笔记本] opencode 会话标题全部消失（"New session-时间戳"）：根因是未设置 small_model，opencode 1.18 默认标题生成走付费 gpt-5.4-nano，账户余额不足导致 agent=title 静默失败（日志可见 AI_APICallError: Insufficient balance）。修复：opencode.jsonc 加 "small_model": "opencode/deepseek-v4-flash-free"（免费）。教训：opencode 标题/摘要等轻量任务消失时先查日志 agent=title 的 stream error。#坑 #opencode #时效
- @2026-08-20 [笔记本] 批量修 opencode 旧会话标题：sqlite3 直接 UPDATE session.title + event.data（session.created.1/session.updated.1 的 $.info.title 用 json_set 同步），UI 从 session 表读取。注意：cmd 传中文给 sqlite3 会被 ANSI 转成 GBK 存库（hex D5E2B8F6），必须用 UTF-8 无 BOM 的 .sql 文件 .read 执行。#坑 #opencode
- @2026-08-22 [笔记本] opencode-tray.ps1 添加 Explorer 重启检测：每5秒检查 explorer.exe PID，变化时自动重建 NotifyIcon，解决睡眠/唤醒后托盘图标消失问题 #tray #stability #sleep-wake
- @2026-08-24 [笔记本] OpenCode web 粘贴图片脚本：创建 opencode-paste-image.user.js，支持 Ctrl+V 粘贴图片到输入框，自动压缩（最大1024px）、预览、配置菜单。部署到 my-userscripts 仓库。 #userscript #opencode #web
- @2026-08-25 Greasy Fork 脚本同步：仓库中有两个版本的脚本（原版 `人人视频增强包.user.js` 在 GF 上，优化版 `rrmv-enhance-optimized.user.js` 不在 GF 上）。修改脚本时必须先确认用户安装的是哪个版本，改对应的文件才能通过 webhook 同步到 GF。不能只改优化版就推。 #userscript #greasyfork #时效
- @2026-08-25 Tampermonkey 脚本无法在 Playwright 中测试：Playwright 是无头 Chromium，没有 Tampermonkey 扩展，userscript 不会执行。正确做法：1) 验证 JS 语法（`node -c`）2) 让用户在自己的浏览器中测试。 #playwright #userscript #测试
- @2026-08-25 Greasy Fork webhook 同步延迟：push 到 GitHub 后 webhook 自动同步到 GF 通常需要 1-2 分钟，但有时更久。如果用户看不到更新，让他们刷新 GF 页面或等一会。 #greasyfork #sync #时效

## OpenCode 套餐切换与 Fallback 配置
@2026-08-25 [笔记本] 用户从 Zen 免费额度切换到 Go 套餐的完整配置流程：

### 核心配置
1. **Go 套餐模型 ID**：格式为 `opencode-go/model_id`（如 `opencode-go/mimo-v2.5`），不是 `opencode/` 前缀
2. **small_model 配置**：用于标题生成等轻量任务，必须配置免费模型，否则标题消失
3. **当前可用 Zen 免费模型**：`mimo-v2.5-free`、`big-pickle`、`ox-alpha-free`（隐私最佳，零数据保留）、`nemotron-3-ultra-free`、`nemotron-3.5-lightning-free`
4. **已下线免费模型**：`hy3-free`、`deepseek-v4-flash-free`（不再可用）

### Fallback 配置示例
```json
{
  "model": "opencode-go/mimo-v2.5",
  "small_model": "opencode/mimo-v2.5-free",
  "fallback": {
    "enabled": true,
    "runtime_fallback": {
      "enabled": true,
      "retry_on_errors": [429, 500, 502, 503, 504],
      "max_fallback_attempts": 3,
      "cooldown_seconds": 60,
      "notify_on_fallback": true
    },
    "fallback_models": ["opencode/mimo-v2.5-free"]
  }
}
```

### 踩坑点
1. `hy3-free` 已失效，配置后标题生成静默失败
2. Go 套餐需要先通过 `/connect` 命令连接，粘贴 API 密钥
3. Zen 免费额度会定期恢复，可作为备用
4. 标题消失时先查日志 `agent=title` 的 stream error

#opencode #配置 #go-suite #fallback #时效

---

## [LRN-20260825-001] best_practice

**Logged**:  2026-08-25T10:30:00+08:00

**Priority**:  medium

**Status**:  done

**Area**:  config


### Summary
Go 套餐模型选择策略：按额度+能力分层配置，Plan 用强模型，Build 用额度大的模型。

### Details
- **MiMo-V2.5**：额度最大（150,400次/月）但能力最差（⭐⭐），适合纯干活
- **DeepSeek V4 Flash Vision Exp**：额度中等（18,900次/月），能力⭐⭐⭐⭐，支持识图，适合需要分析截图/错误图的场景
- **DeepSeek V4 Pro**：额度最小（5,200次/月），能力⭐⭐⭐⭐⭐，适合高要求推理

**最优组合（保留识图+省钱）：**
```jsonc
{
  "model": "opencode-go/deepseek-v4-flash-vision-exp",
  "agent": {
    "plan": {
      "model": "opencode-go/deepseek-v4-flash-vision-exp",
      "temperature": 0.1
    },
    "build": {
      "model": "opencode-go/mimo-v2.5",
      "temperature": 0.2
    }
  },
  "fallback": {
    "fallback_models": ["opencode/mimo-v2.5-free"]
  }
}
```

### Suggested Action
按此方案配置笔记本和软路由。

### Metadata
- Source: conversation
- Tags: go-suite, model-selection, config, vision
- Related Doc: AGENTS.md §1

---

## [LRN-20260825-002] insight

**Logged**:  2026-08-25T10:35:00+08:00

**Priority**:  medium

**Status**:  done

**Area**:  config


### Summary
软路由 opencode 容器配置文件是 `opencode.json`（非 `.jsonc`），不支持注释。

### Details
- 笔记本配置：`~/.config/opencode/opencode.jsonc`（支持注释）
- 软路由配置：容器内 `/root/.config/opencode/opencode.json`（纯 JSON，无注释）
- 同步时需用 `ssh router "docker exec opencode bash -c 'cat > ...'"` 写入
- 验证：`ssh router "docker exec opencode cat /root/.config/opencode/opencode.json"`

### Suggested Action
修改软路由配置时，确保 JSON 格式正确无注释。

### Metadata
- Source: conversation
- Tags: router, opencode, config, json
- Related Doc: docs/router.md

---

### LRN-20260825-xxx  Windows 11 �̶���ݷ�ʽ��������

- �����Ҽ����� .lnk �ļ�û��"�̶���������"ѡ��
- ��ȷ������1) �����г�����������������ʾ��2) �Ҽ�������ͼ�� �� �̶���������
- PowerShell ������Shell.Application �� InvokeVerb("pintotaskbar")�����û����鲻��
- ��ѵ��Windows 11 ��֧���Ҽ��̶��������������ٹ̶�

### LRN-20260825-xxx  ������������ PowerShell ִ��

- ����VBS ���� PowerShell ���ش������� opencode serve �� ���޵���"���ֳ�����ͼ����������ִ��PowerShell"
- ���򣺻��޼�⵽ svchost.exe ���� powershell.exe ����ִ��
- ���������VBS ֱ������ opencode.exe�������� PowerShell���� ���޲�����
- ��ѵ���������� opencode ������ VBS ֱ�ӵ��� opencode.exe����Ҫͨ�� PowerShell

### LRN-20260825-xxx  �ƻ�������̲��̳��û���������

- ���󣺼ƻ����������� opencode serve ������ OPENCODE_SERVER_PASSWORD �Ȼ����������ֻ����ӷ��� 401
- ���򣺼ƻ����������Ľ��̲��̳� User ����������
- ���������������д�� .env �ļ���opencode ���Զ���ȡ����������������������
- ��ѵ��opencode serve ��Ҫ��������ʱ������д .env �ļ�

### LRN-20260825-xxx  ��Ҫ��ͣ��ǰ opencode ����

- ����ִ�� Stop-Process opencode ʱ�ѵ�ǰ�ỰҲͣ�ˣ����¶���
- ����û������ serve ���̺Ϳͻ��˽���
- ����������ö˿ںŶ�λ������̣�Get-NetTCPConnection -LocalPort 4096 -State Listen ��ȡ PID����ֹͣ�� PID
- ��ѵ��ֹͣ opencode ����ǰ����ȷ���� serve ���̣����ǵ�ǰ�ͻ��˽���

### LRN-20260825-xxx  opencode 4096 web serve ���շ���

- ������VBS ������ֱ�ӵ��� opencode.exe serve�������� PowerShell�����޲����أ�
- �ƻ�����OpenCode Web Serve����������
- ���룺д�� .env �ļ���opencode �Զ���ȡ
- ������ˣ���Ҫ����ϵͳ����ʬ�˿����⣩
- �����̡��޿�ݷ�ʽ���޴���
- ��ѵ���򵥷������ȶ������ӷ��������̡�VBS+PowerShell�����������׳�����

### LRN-20260825-xxx  mimo-v2.5 生成极慢，Build 换回 deepseek-v4-flash
- 现象：oc 客户端用 mimo-v2.5 回复极慢，界面长时间"思考中"
- 根因：mimo-v2.5 服务端推理慢，日志实测每步 77~97 秒（stream 发起→下一步返回），deepseek-v4-flash 仅 3 秒/步，同机同网相差约 30 倍；且多会话并发调 mimo 加剧排队
- 修复：用户拍板模型分工——plan=opencode-go/deepseek-v4-flash-vision-exp（识图）、build=opencode-go/mimo-v2.5、fallback=opencode/mimo-v2.5-free；笔记本 opencode.jsonc + 软路由 opencode.json 两端同步（软路由备份 opencode.json.bak-agent-swap-20260825c）
- 教训：① 慢速大模型（mimo）不适合 Build 高频交互，flash 才是干活主力；② 排查"回复慢"看日志 stream→loop 时间差即可定位是模型慢还是网络/客户端问题；③ 改软路由容器内文件用 docker exec + jq 一条龙，宿主 /tmp 与容器 /tmp 不互通；④ 用户描述含糊时先澄清问题范围（笔记本客户端 vs 软路由、慢 vs 无响应）再动手，本次误把"客户端 mimo 慢"当"软路由 oc 无法对话"白排查一轮

### LRN-20260825-xxx  软路由部署 Lightpanda 隐形浏览器（MCP 集成）
- 背景：软路由（R66S，2GB RAM）需要无头浏览器供 OpenCode 搜索 JS 渲染页面，Chromium 太重会挤占 OpenClash 资源
- 选型：Lightpanda（Zig 编写，专为 AI/自动化设计）——空闲仅 2.7MB 内存，100 页峰值 123MB（Chromium 的 1/16），原生 CDP + MCP 支持，arm64 Docker 镜像 267MB
- 部署：
  - 容器：`docker run -d --name lightpanda --memory=256m --cpus=0.5 --restart=unless-stopped --network host -e TAVILY_API_KEY=xxx lightpanda/browser:nightly`
  - `--network host` 让 Lightpanda 直接使用宿主网络栈，OpenCode 容器通过 `192.168.3.100:9222` 访问 CDP
  - 资源限制：内存 256MB、CPU 0.5 核，确保不挤压 OpenClash/Tailscale 优先级
  - Tavily API key 注入容器环境变量，搜索走 Tavily 而非 DuckDuckGo（防反爬 CAPTCHA）
- MCP 集成：
  - OpenCode 容器无法直接运行 Lightpanda 二进制（glibc 2.36 < 要求 2.38）
  - 解决方案：SSH wrapper 脚本 `/usr/local/bin/lightpanda-mcp`，通过 `ssh -T root@192.168.3.100 "docker exec -i lightpanda lightpanda mcp"` 桥接 stdio
  - 关键：`ssh -T` 禁用伪终端 + `docker exec -i` 保持 stdin，否则 MCP 双向通信会断
  - opencode.json 添加：`"lightpanda": {"type": "local", "command": ["/usr/local/bin/lightpanda-mcp"], "enabled": true, "timeout": 30000}`
- 管理脚本：`/usr/bin/lightpandactl`（start/stop/restart/status/logs），支持按需启动
- 工具集：goto（导航）、search（Tavily 搜索）、markdown（渲染为 md）、tree（DOM 树）、html（原始 HTML）、findElement、click、fill 等
- 测试：Hacker News 首页抓取成功，Tavily 搜索 "hello world" 返回 Wikipedia 等结果
- 教训：① glibc 版本不匹配时无法在容器内运行二进制，SSH wrapper 是可靠的桥接方案；② `--network host` 简化网络但暴露端口到所有接口，内网环境可接受；③ Lightpanda 搜索默认走 DuckDuckGo HTML 抓取易触发 CAPTCHA，必须注入 TAVILY_API_KEY/BRAVE_API_KEY/EXA_API_KEY 之一

## @2026-08-26 [笔记本] opencode 4096 serve 换 C++ 托盘程序（opencode-tray.exe）根治僵尸端口 + 托盘图标消失 #tray #zombie #cpp #opencode
- 背景：serve 由 VBS+计划任务(OpenCode Web Serve)启动，重启电脑后常不启动；且无托盘图标（历史 opencode-tray.ps1 被弃用后图标能力丢失）。手机连不上 4096 后端。
- 最终方案：**纯 C++ 托盘程序** `tools/opencode-tray/opencode-tray.exe`（源码 opencode-tray.cpp + build-tray.bat），替代 VBS 计划任务：
  - 功能：托盘图标显示 serve 状态（运行中=opencode-web.ico / 停止=opencode.ico）；右键菜单 打开Web/重启serve/开机自启/退出(=停serve)
  - **单实例锁**（Global mutex）防双实例竞态→僵尸端口（历史根因）
  - **优雅关停**：AttachConsole(pid)+SetConsoleCtrlHandler(NULL,TRUE)+GenerateConsoleCtrlEvent(CTRL_C_EVENT,0) 等效 SIGTERM → 等10s端口释放 → 硬杀兜底。实测多数情况 1-2s 优雅退出、端口干净释放（治僵尸端口根因）
  - **崩溃自动重启**：watch 线程检测 serve 退出 → 指数退避 60/120/240/480s，4轮熔断。**g_manualStop 标志**区分手动重启/退出，避免 watch 线程误判崩溃多调度一次重启（实测修复前后：手动重启会额外 scheduling restart 60s 二次拉起导致 EADDRINUSE）
  - **StartServe 防重复**：启动前 GetPidByPort 检查端口已被监听(非僵尸)则跳过启动直接 attach，防定时器与新实例竞态
  - **Explorer 重启检测**：每5s查 explorer PID，变化则重建托盘图标（治睡眠/唤醒图标消失）
  - 环境变量：RegGetValue 读 User 级 OPENCODE_SERVER_PASSWORD/GITHUB_TOKEN 注入子进程（计划任务不继承 User env 的坑绕开）
  - 日志：opencode-tray.log（UTF-8），含启动/退出/重启/僵尸检测
- 部署：禁用计划任务 OpenCode Web Serve（schtasks /Change /Disable）；开机自启用注册表 HKCU\...\Run\OpenCodeTray 指向 exe（等效托盘菜单 Auto-start at login）
- 编译：`call vcvars64.bat && cl /utf-8 /EHsc /O2 /DUNICODE /D_UNICODE opencode-tray.cpp /Fe:opencode-tray.exe /link shell32.lib user32.lib advapi32.lib iphlpapi.lib ws2_32.lib /SUBSYSTEM:WINDOWS`（VS2022 BuildTools）
- 验证：托盘启动 serve→health 200；WM_COMMAND 1003 重启→旧 pid 优雅退出新 pid 拉起（日志无多余 scheduling restart）；WM_COMMAND 1005 退出→端口释放托盘退出
- 教训：① 菜单命令处理放 WndProc 的 WM_COMMAND（TrackPopupMenu 不带 TPM_RETURNCMD）便于自动化测试（SendMessage WM_COMMAND 触发），TPM_RETURNCMD 方式无法从外部发消息触发 ② 硬杀托盘(Stop-Process)不会触发优雅关停，serve 会残留，正常退出必须走托盘菜单 ③ serve 偶发对 Ctrl+C 响应慢(>10s)会走硬杀兜底，端口仍能释放，功能可接受
- Scope: laptop-only
- Related: ERR-20260826-002(僵尸端口), LRN-20260814/15(托盘/NSSM历史), LRN-20260825(VBS)
## @2026-08-26 [笔记本] opencode-tray.exe 中文菜单 + 重启健壮性增强 #tray #cpp #opencode
- 菜单/托盘提示/僵尸警告全部改中文：服务状态(运行中/已停止)、打开网页、重启服务、开机自启、退出（停止服务）；szTip=OpenCode 服务：运行中/已停止；僵尸警告弹窗中文
- 中文嵌入验证：C++ 源码 /utf-8 编译，宽字符串字面量 L"中文" 正确转 UTF-16 嵌入 exe（用 Encoding.Unicode 读 exe 字节验证 Contains 全 True），不会像 PowerShell 那样乱码
- 重启健壮性增强（回答"手动重启会不会僵尸"）：
  - 优雅关停等待 10s→20s（serve 偶发对 Ctrl+C 响应慢）
  - 硬杀兜底后**主动验证端口释放**（等5s），若仍占用且 IsZombiePort() 则弹窗"端口被僵尸 socket 占用，需要重启电脑"，重启流程中止（不再盲目 StartServe）
  - StopServe 返回 bool，ID_TRAY_RESTART 里 stopOk=false 时跳过 StartServe 并记日志
  - 结论：手动重启基本不会僵尸（优雅关停多数 1-2s 成功），仅优雅超时走硬杀时有理论风险，现已加验证+弹窗兜底
- 测试：重启→优雅关停+新pid拉起（无多余 scheduling restart）；退出→优雅超时20s→硬杀→port released after hard kill（端口释放无僵尸）
- 教训：① PowerShell 不支持 /* */ C 风格注释，内联注释会 ParserError ② switch case 内声明变量需花括号包裹否则 C2360 ③ 验证 exe 内嵌中文用 Encoding.Unicode 读字节 Contains，比截图/OCR 可靠（当前模型不支持读图）
- Scope: laptop-only
- Related: LRN-20260826(opencode-tray.exe 初版)

## @2026-08-26 [笔记本] TrafficMonitor Go用量插件 v3.0：三维度轮换+选项设置+自动隐藏 #trafficmonitor #cpp #plugin
- 需求来源：Go 套餐实际有三个用量维度（hourly/weekly/monthly，dashboard 可见），旧插件只解析 monthly；用户要求"哪个超了或快超了就显示哪个"+ 选项设置 + 超额/到期时隐藏任务栏显示
- API 响应含 `usage.{hourly,weekly,monthly}.{percent,resetsAt,status}`，旧代码只 find "monthly"——**解析前先确认 API 完整结构**（dashboard 截图对照），别只看旧代码用了什么
- 轮换优先级算法：任一维度 >=100% → 锁定显示重置最近的那个；无超额 → 显示百分比最高的（平局取重置更近的）；轮换间隔可配置（默认10s），锁定期间不轮换
- 显示格式：值前缀周期字母 `H74%/W101%/M50%`（H=小时 W=周 M=月），标签保持 Go/Reset 不变；简洁模式去掉前缀
- 隐藏实现：TrafficMonitor 插件接口**没有隐藏项目的 API**，用 `GetItemLableText/GetItemValueText` 返回空串实现视觉隐藏（项目仍在但不可见）；隐藏策略可配置（不隐藏/额度耗尽/月度过期/任一）
- 选项对话框：纯 Win32 内存 DLGTEMPLATE（DialogBoxIndirectParam），无需 .rc 文件；控件数据用文件作用域 POD 数组（见 ERR-20260826-003 编译坑）
- 配置持久化：`OnExtenedInfo(EI_CONFIG_DIR)` 接收主程序配置目录 → `OpenCodeGoUsage.dll.ini`（GetPrivateProfileInt/WritePrivateProfileString），首次保存才创建文件
- 部署：TrafficMonitor 以管理员运行时 DLL 被锁，普通权限无法覆盖；流程=提权杀进程→等句柄释放（可能需 10s+，OneDrive 路径更慢）→复制→提权重启；**杀进程后立即复制仍可能锁**，重试或稍等
- 验证：config.ini 出现 `OpenCodeGoUsed/Reset` 显示项即插件加载成功；插件 INI 首次保存才生成
- Scope: laptop-only
- Related: LRN-20260815(插件初版 v2.10), ERR-20260826-003(DLGTEMPLATE 编译坑)