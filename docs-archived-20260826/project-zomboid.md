# Project Zomboid（僵尸毁灭工程）配置指南

- **来源**：Steam，appid 108600
- **安装路径**：`C:\Steam\steamapps\common\ProjectZomboid`
- **版本**：Build 42.20.0（B42，正版，无破解）
- **用户配置目录**：`C:\Users\pass\Zomboid`
- **Workshop mod 目录**：`C:\Steam\steamapps\workshop\content\108600`
- **用途**：PZ B42 大 Mod 合集（低配向）的安装/配置/性能优化完整备忘

## 合集

- 早期使用：「无聊的栀子」合集（id=3489328697）→ 因 100 mod 合集取消订阅后 default.txt 残留 128 个失效引用，已清理
- **mod 推荐来源**：小黑盒《僵毁B42.14 自用MOD推荐》帖子（作者合集《丸布了》id=3678446773，86 个 mod），已整理为带创意工坊链接的 HTML 清单
- **合集订阅机制**：Steam 合集是快照式订阅，作者后续新增 mod **不会自动订阅**，需回合集页重新订阅（取消再订阅）同步
- 一个 Workshop item 可含多个 mod.info（主 mod + 分支/附加 mod），100 个 item ≠ 100 个 mod id
- **default.txt 由游戏自动维护**：游戏内勾选会自动写回，日常不用手动改；只有三种情况需手改：换 mod 集合（清残留）、被自动排序覆盖、想让新档默认带某些 mod

## 当前启用 mod（B42.20.2 单人）

`default.txt` 现 **31 个 mod**（2026-08-10 清理重写），顺序即加载顺序：
`ModLoadOrderSorter_b42, ModManager, NeatUI_Framework, B42Trans_CN, AutoAll, myspatialrefuge, RebalancedPropMoving, AutoEverything, AutoLoot, better-auto-mechanics, CleanHotBar, CombatText, EreFBIOpenUpDoor, ModernStatus, NoWeightB42, RainCleansBlood, simpleLockpicking, STA_PryOpen, TheShortcut, twistminimap, PinyinSearch_B42, CompanionDogs, B42ModTrans_CN, JumboTreeIndoorFix, LazoloDynamicBackpackUpgrades, LKB42, LTWB42, MoreDamagedObjects, myspatialrefuge_shop, Navigator, OpenAllContainers`

> **⚠️ 2026-08-10 mod 列表大清理**：workshop 08-10 重同步后只剩 37 项，default.txt 曾引用 14 个未安装 mod（**ETO_B/ETO_P 纹理优化、BB_Utils、Horse、ArcheryNexus、Neat_Building 全家、EQUIPMENT_UI、CustomMapLabels、TakeABathAndShowerNew、AutoDrinkRevert、manageContainers、EURY_CONTAINERS**）→ 全部移除引用。**ETO_B 已不再订阅**：核显纹理优化缺口，后续若加载慢优先补订阅 `Every Texture Optimized`(3119788162)。`yxjs_PinYinSearch` 改名 `PinyinSearch_B42`（同 mod）。本机启用中但 default.txt 未启用（仅订阅）：CleanUI/errorMagnifier/MiniHealthPanel/NepMoreOnFloor/ProximityInventory/PZ_Map/SandboxSettings。**备份**：`default.txt.bak-20260810-144509`。

> **⚠️ 2026-08-07 架构变更（LRN-069/071）**：AutoEverything 大幅瘦身至 **34 个 Lua 文件**。变更：①**AutoNav 自动驾驶导航移除**（7 文件，不稳定）；②**AutoLoot 家族 + AutoDrop 移除**，改订阅原版 **Auto Loot (3392699932)**；③**EreFBI 破门移除**，改订阅原版 **FBI Open Up Door (2732513069)**；④**SimpleBows 相关（SB_ArrowPatch + 商店分类）移除**；⑤**车辆收纳（AEV_Spatial_Vehicle）移除**（原版车 getScriptName 不稳定，只留家具收纳）；⑥**新增 AEV_ZeroWeight 无限负重补丁**（运行时清零，解决 NoWeightB42 只改脚本）。default.txt 已加入 `AutoLoot` + `EreFBIOpenUpDoor`。下方 AutoLoot/EreFBI 相关配置章节为**历史记录**（原版接管后部分配置不适用）。完整模块清单见 `AutoEverything\MODULES.md`。

**本地自定义 mod（`Zomboid\mods\`，非 Workshop）**：AutoLightsProximity、AutoCloseWindowsProximity、AutoEatB42、MINIMAP_NAV_PATCH、MSR_ShopPatch —— 详见下方「本地自制 mod / 补丁」章节。

**加载顺序原则**：依赖库前置（NeatUI→ModernStatus、ModLoadOrderSorter→ModManager、myspatialrefuge→shop→MSR_ShopPatch），汉化置底（B42Trans_CN / B42ModTrans_CN 放最后）；自定义补丁靠 mod.info 的 `require=` 声明让 Mod Load Order Sorter 自动排在依赖后。

**失效引用清理**：取消订阅的 mod 会残留在 default.txt（`mod = xxx,`）。用 `C:\Users\pass\Zomboid\Lua\ModManager\ModListData.ini` 查已取消 mod 的 workshopID，`Test-Path "workshop\content\108600\<id>"` 为 False 即失效。2026-08-03 清理 4 个：HBVCEFb42(3610677934)、HBAC(3637364024)、MarzVanillaGuns(3773834525)、SWMG(3722064198)。改前备份 `default.txt`。

## 配置

### 0. 2026-08-05 收藏 mod 对齐 + 性能优化（备份：*.bak-20260805*）

- **JVM 内存**：应用 Multi-CPU 优化 json（`ProjectZomboid64.json` + `.bat` 两处均改）`-Xmx12288m`（12G）、`-Xms4096m`、ParallelGC、删 AlwaysPreTouch、保留 B42 必需 `--enable-native-access`/`--add-exports`
- **启用 5 个收藏 mod**：PZ_Map（AI 地图数据）、LTWB42（传奇战术武器）、CleanUI（需 NeatUI_Framework，自带 AutoLoot 兼容保护）、OpenAllContainers（B42 版 id=OpenAllContainers，非 OpenAllContainers1）、errorMagnifier（需前置 ChuckleberryFinnAlertSystem 3077900375）→ default.txt 共 39 个 mod
- **options.ini 收紧**：`uiRenderOffscreen=false`、`usePhysicsHitReaction=false`、`water=0`、`renderPrecipitation=0`（核显减负）
- **ModOptions.ini 清理**：删除残留 mod 配置（JumboTreeIndoorFix/BicycleMod/Gunworks/ShotgunTrajectory/Neat_Building 系列/BravoItemDetails/PlainMoodles/KnoxBuildworks/MoodlesInLua），保留 CleanUI + OAC 配置（64 条，UTF-8 无 BOM）

### 0a. 2026-08-10 全面优化（本轮，备份：*.bak-20260810-144509*）

- **JVM 统一 12G ParallelGC**：json+bat 对齐 `-Xms4096m -Xmx12288m` + ParallelGC 全家；bat 去掉 ZGC；回退上午误改的 16G/8G
- **default.txt 清理**：51→31 mod，移除 14 个未安装引用（ETO_B/ETO_P/BB_Utils/Horse/ArcheryNexus/Neat_Building 全家/EQUIPMENT_UI/CustomMapLabels/TakeABathAndShowerNew/AutoDrinkRevert/manageContainers/EURY_CONTAINERS/ATakeABathAndShowerDepthMap），`yxjs_PinYinSearch`→`PinyinSearch_B42`（改名）
- **ModOptions.ini**：AutoLoot PerfMode（slider 15）`0`→`200`（0=每帧检测最耗 CPU）；删 EQUIPMENT_UI/CustomMapLabels 残留配置
- **ModernStatusConfig.txt**：Health/Endurance `150→300ms`、Bleeding/Panic `250→300ms`（降 CPU）
- **DynamicBackpacks 翻译修复**：LazoloDynamicBackpackUpgrades 42.20 CN/EN Sandbox.json 的 4 个 `*ReductionPercentage_tooltip` 裸 `%`→全角 `％`（LRN-066 防双重格式化），消除 String.format WARN
- **验证（已启动实测）**：ERROR 1272→6（余下均无害：fmod 正常日志误标/FluidContainer 清洗/启动 clamp 自愈）、WARN 90→54、31 mod 全部加载、JVM 12G 生效、无崩溃

### 1. JVM 堆内存（教程核心要求）

默认 `-Xmx3072m`，大合集需改内存一半。改两个文件：

- `ProjectZomboid64.bat`：java.exe 命令**两处**（主命令 + IF 失败重试）
- `ProjectZomboid64.json`：`vmArgs` 数组内

**2026-08-10 最终配置（已验证生效）**：json + bat 统一为 `-Xms4096m -Xmx12288m`（12G）+ ParallelGC 参数集（`UseParallelGC/ParallelGCThreads=4/UseNUMA/DisableExplicitGC/ParallelRefProcEnabled/OptimizeStringConcat/UseStringDeduplication/UseCompressedOops`），保留 B42 必需 `--enable-native-access`/`--add-exports`。**bat 原为 ZGC 已改回 ParallelGC**（与 json 一致）。⚠️ 曾误改 json 为 `-Xmx16384m`/`-Xms8192m`（08-10 上午），已回退——社区共识重 mod 8-12G 为佳，>16G 收益递减 + GC 停顿；Xms 8G 起步预占内存+核显共享显存。备份 `*.bak-20260810-144509`。

**内存分配参考（B42）**：原版 6G / 多人 8G / 10-50 mod 10G / 100+ mod 12-16G。32G 系统 → `-Xmx12288m`（12G）。
**`-XX:+AlwaysPreTouch` 注意**：该参数让 JVM 启动就预占满物理内存（12G），任务管理器显示内存高；删掉后按需增长。Multi-Cpu 优化版 JSON 里**建议删掉这行**保留 12G 上限。

### 2. mod 启用列表

`C:\Users\pass\Zomboid\mods\default.txt`（格式 `mod = id,`）：

1. 扫描 `Workshop\content\108600` 所有 item 的**全部** mod.info，提取 `id=` 字段（`Get-ChildItem -Recurse -Filter mod.info`）
2. 与教程排序文本（分号分隔）比对，确保无缺失/歧义
3. 严格按排序文本顺序写入 default.txt
4. `maps` 区：教程未要求则留空

### 3. 性能优化（核显机器）

本机 Intel Arc B390 是**核显**，显存动态共享系统内存，瓶颈是**算力 + 内存带宽**。优化顺序：降分辨率 > 关特效 > 压纹理。

`options.ini` 关键项：
- `tieredZombieUpdates=true`（分层僵尸更新，**性能优化项，勿关**）
- `uiRenderOffscreen=false`（关 UI 离屏渲染，修鼠标延迟）
- `frameRate=60`（光标跟手）
- `texture2x=false`、`maxTextureSize=1`(256)
- 特效全关：`bPerfReflections/corpseShadows/doVideoEffects/water/puddles/renderPrecipitation/usePhysicsHitReaction`
- `toggleToRun=true`（按一次 Shift 切跑步，再按一次切回走路，触控板/笔记本友好）

### VOIP 麦克风 = CPU 高占用元凶（2026-08-03 实测）

- 症状：暂停时 CPU 仍 ~142%（核显机器），误判为 Auto Loot 等 mod
- 根因：`启用VOIP=是` + 自动开麦=高灵敏 + 自动增益=自适应数字 → 持续监听麦克风 + 语音活动检测 + 数字增益
- 即使"只听不说"模式也会处理音频；**关闭 VOIP 后暂停时 CPU 恢复正常**
- 建议：单人默认关 VOIP；联机用低灵敏 + 关自动增益降耗

### Modern Status 配置（`Lua\ModernStatusConfig.txt`）

- 各指示器 `MS_*Indicator = {...}`，含：`autoHide`（值低于阈值隐藏）、`autoHideThreshold`、`displayThresholds`、`matrixLinked`/`matrixLinkOrder`（加入矩阵）、`updateIntervalMs`（刷新间隔 ms）、`alarmEnabled`/`alarmThreshold`
- **自动隐藏**：`autoHide=true` + `autoHideThreshold=N`（如血污/健康 5，值低于 N 时 HUD 隐藏）
- **矩阵**：`matrixLinked=true` + `matrixLinkOrder`（控制排序）；全局 `matrixSettings.autoHide/autoHideThreshold/displayThresholds`
- **性能**：高频指示器（Health 150ms、Endurance 150ms、Bleeding 250ms、Panic 250ms）可调 300/500ms 省 CPU，感知几乎无差
- ⚠️ 游戏运行中改此文件会在退出时被覆盖，先退出游戏再改

### Auto Loot 配置（id=3392699932）

- **默认只拾取 5 类**：Weapon/WeaponPart/Literature/Drainable/AlarmClockClothing（`AutoLoot_CreateDefaultConf.lua`）
- **全部拾取**：配置界面（需先设快捷键 OPTIONS→MODS→Auto Loot→Change Configuration）左侧"Not Looting Items"面板底部 **Add All** 按钮 → Accept
- 库存窗口 "Auto Loot ON/OFF" 按钮只是开关，非全部拾取
- `ModOptions.ini`：`combobox|AutoLoot|13|`=LootMode(1=AutoDrop 2=AutoLoot 3=InstaLoot)；`slider|AutoLoot|15|`=PerfMode(0=每帧检测最耗 CPU，建议 150-250)
- `AutoLoot_LastUsed.ini` 是上次拾取记录，非配置
- **⚠️ 站定才拾取**（LRN-20260805-033）：AutoLoot 只在玩家不动时拾取，走路路过不捡；每轮只处理一个格子，处理过的记缓存不再复查。要"路过也捡"用 AutoLootPickupPatch 补丁
- **拾取成功反馈**：自带 Display loot icon（Opt 16，默认 0 关，调 16-64 显示刚拾取的物品图标）；无现成拾取日志 mod（Dragon Radar 是找物品的探索雷达，非日志）
- **AutoEverything 视觉反馈增强**（2026-08-05）：`AutoLoot_Feedback.lua` 在容器上渲染浮动文字（物品名+数量合并，3s 淡出）+ `addGridSquareMarker` 绿色圆点标记 30s；触发点 `ISInventoryTransferAction:perform`（src 世界容器→玩家背包），独立于 displayLootIcon 滑块
- **配置界面 ESC 关闭**（2026-08-05）：`AutoLoot_ItemsListViewer.lua` 加 `onKeyDown`/`onKeyRelease` 检查 `Keyboard.KEY_ESCAPE`（参考 vanilla ISEntityWindow）

## 翻译与 UI 崩溃排查（2026-08-05，critical）

- **裸 `%` 崩 UI（LRN-20260805-044）**：PZ `getText` 用 Java `String.format` 解析翻译值，裸 `%`（尤其结尾）抛 `UnknownFormatConversionException`。主菜单崩查 UI.json（如 `UI_BloodDecals1='10%'` 末尾 `%`）；沙盒设置崩查 Sandbox.json；HUD 崩查 IG_UI.json。修复裸 `%`→`%%`，**所有版本目录都要改**（42/42.20/42.21/common）
- **Steam 清理未订阅下载（ERR-20260805-015）**：workshop 目录只保留已订阅 item，DBU/NoWeight/AutoLoot 曾被清。default.txt 引用的 mod 需确认存在，否则引用 nil 全局表崩

## 小地图（B42）

- 原版自带，需**创建世界时**在自定义沙盒（Custom Sandbox）开启 **Allow World Map** + **Allow Mini-Map**
- Apocalypse / Extinction / Six Months Later 预设默认关闭；已有存档不能中途开启，需新建世界
- 想更好看可装 TwisTonFire - minimap（3572564421）

## 视野 / 缩放

- Options → Display 缩放范围默认 50%~200%，可勾选 **缩放 250%**（原版上限）看得更远
- 拉太远掉帧（核显机器慎用）；还不够可装 Customisable Zoom（3405048727）

## 性能优化 mod（B42）

- **Every Texture Optimized**（id=3119788162，作者 maceleet，**已订阅**）：压缩全部游戏纹理（11300 文件），**纯纹理替换无 Lua**；三档：Well Balanced（id=**ETO_B**，均衡，作者推荐）/ Maximum Performance（id=**ETO_P**，Steam Deck/笔记本/低端）**二选一**；订阅含两版本。**放 mod 列表最顶部**（让其他 mod 覆盖它）。要求 B42.20+；比游戏内置纹理压缩效果更好且可叠加。⚠️ B42.19.1 beta 不可用
- **Multi-Cpu Enhance**（id=3459875383，作者 4Zeta）：优化 JVM 内存/GC 减少卡顿。需手动替换 `ProjectZomboid64.json`，**必须先备份原文件**，且替换后要保留 B42 必需的 `--enable-native-access` 与 `--add-exports` 参数（直接覆盖可能启动崩溃）；32G 内存建议 `-Xmx12288m`（12G）（本机已应用此配置）
- **Auto Loot**（id=3392699932，作者 Tchernobill）：自动拾取附近容器/尸体物品
- 自动吃喝：B42 **没有**真全自动吃东西 mod（Automate Series Auto Eat 2977628726 仅 B41）；替代用 Eat Smart（3456212729）/ Drink Smart（3447775367）右键精确吃喝
- **Modern Status**（3451167732）：状态 HUD，**双击状态指示器自动处理**（口渴自动喝水/流血自动绷带）；B42.13+ 需前置 `NeatUI_Framework`（3508537032），纯 UI mod 可中途加入不用新档

## 容量 / 负重（囤囤鼠）

- **B42 硬编码限制**：家具容量上限 ~100、背包 ~50、角色负重硬限 50kg——纯沙盒设置无法完全突破
- **Customizable Containers**（2719850086）：沙盒调各类容器容量/减重（WeightReduction→Weightless 100% 减重），依赖 `daneLibrary`（3715021740）；配置项多，加载较慢；可选子模块 Capacity Limit Bypass 需**手动覆盖**游戏 Java 文件（mods 菜单禁用是对的）
- **No Weight**（2606989930）：所有物品 0 重量，永不超重不掉血，任意模式生效零配置；⚠️ 篝火燃料失效 bug
- **Container Capacity Limit Bypass**（3686252520）：无视容器重量上限，能捡起超 50kg 容器；超重受伤保留
- **无限负重/容量三件套**（LRN-20260805-034）：**NoWeightB42**（重量=0）+ **Dynamic Backpack Upgrades**（2996978365，纯 Lua 突破 50 格子，B42.20+ 版本子目录，最稳）+ AutoLoot **Instant Loot**（LootMode=3，无拾取动画，移动批量拾取不卡）。避免 Customizable Containers 的 Java 覆盖子模块（更新冲突风险）
- **⚠️ NoWeightB42 只改脚本（LRN-20260807-108）**：只对物品脚本 Weight=0，已实例化旧物品不重读脚本 → 超重仍显示。配套 **AEV_ZeroWeight**（AutoEverything 补丁专区，每 3s 运行时 `setActualWeight(0)`）彻底清零
- **⚠️ 无限容量会刷 WARN 卡顿（LRN-20260807-111）**：DBUP 对引擎硬上限容器（trashbag=50）反复 setCapacity → 每 2.6s 刷 8-10 行 WARN 落盘 = 周期性卡顿。已修（读回容量 + skippedCaps 跳过表）；后续写容量补丁用同样模式

### AutoLoot 配置直改文件（2026-08 实测）

- 当前配置：`Zomboid\Lua\AutoLoot_LastUsed.ini`（每行一个 item ID）
- **预设机制**：预设文件 `AutoLoot_<名>.ini` + 注册表 `AutoLootPresetDic.ini`（`名:true`）；**必须 UTF-8 无 BOM**（PS `Set-Content -Encoding UTF8` 带 BOM 解析失败，用 `[System.IO.File]::WriteAllText(path, txt, New-Object System.Text.UTF8Encoding($false))`）
- 备份链：`.bak`（原始 5159 条）/ `.bak2`（过滤后 5002 条）
- **物品分类解析**：从 `media\scripts\generated\items\*.txt` 的 `item X{...}` 块解析 `ItemType=`（值带尾逗号需 `.rstrip(',')`）；`base:clothing`/`base:accessory`=衣物，`base:moveable`=家具
- 本次清理：移除 157 条纯装饰配饰（眼镜/丝袜/领带/珠宝）+ 323 条装饰家具（Mov_* 画/海报/骷髅/窗帘），保留手表/帽子/防弹背心/制服/背包/帐篷/皮革；现 **4679 条**
- ⚠️ **NoWeightB42 只解决重量=0，格子上限（约50）仍需 Dynamic Backpack Upgrades**（2996978365，292k 订阅，升级件 Cloth+10%/Denim+20%/Leather+25%/Military+35% 可叠加）

## 游牧玩法（房车）

- **Project RV Interior**（3543229299）：200+ 车进内舱居住；内舱是**空房间**需自己装修，进舱后几秒生成发电机（车有电才激活）；上方法：普通车**车尾按 V**，房车/巴士**坐驾驶座按 V**，出舱右键地面
- **Vanvival**（3547444619，B42.20 MP）：开局送车+钥匙+油+物资+清僵尸；选 RV Owner/Van Survivor 特质；动态发现车辆，找不到 RV 回退普通车
- **Bicycle!**（3461415167，190k）：B42.15+ 专属，SP 有"骑上后掉落"bug
- **Braven's Bicycles**（2988491347，476k，**已订阅**）：经典成熟，B42 支持，bug 少；id=`BB_Bicycles`，**必需依赖 Braven's Utilities**（2850135071，id=`BB_Utils`）——订阅时会弹"额外必需物品"确认框，须点"全部订阅"。自行车较难找（不在已探索区生成）。多人可用
- **骑马 Horse Mod**（3661336777，241k，**已订阅**）：B42.20，4 品种马（美式四分之一/花马/阿帕卢萨/纯血马）+ 马具制作；标题 "MP SOON" = **单机为主**。id=`Horse`

## 本地自制 mod / 补丁（Zomboid\mods\，非 Workshop）

> 这些是自定义 mod，**不在 Workshop**（不会因订阅更新被覆盖），目录在 `C:\Users\pass\Zomboid\mods\`。
> 出问题先看 `console.txt` 里是否有对应 mod 名的报错：搜下表的「日志关键词」。
> 特征：id 全大写或带 PATCH/B42 后缀；日志前缀 `[MOD名]` 是自定义 mod 自己打的，`LOG : Mod loading X` 是加载日志。

| mod | 类型 | 依赖 | 功能 | 日志关键词 |
|---|---|---|---|---|
| **AutoLightsProximity** | 自制 | 无 | 感应灯：玩家靠近自动开灯，离开延时关灯，全天感应；Options→Mods 调半径/延时 | `AutoLightsProximity` / `ALP` |
| **AutoCloseWindowsProximity** | 自制 | 无 | 离开延时自动关窗（ToggleWindow），靠近拉帘功能默认关闭（autoCurtain=false，窗+门通用） | `AutoCloseWindowsProximity` / `ACWP` |
| **AutoEatB42** | 移植 | 无 | 自动吃背包最合适食物（B41 AutoEat 2977628726 移植，修正 ISCraftAction 签名）；Options→Mods 调饥饿阈值/目标饱腹/每口比例 | `AutoEatB42` / `autoEat` |
| **MINIMAP_NAV_PATCH** | 补丁 | `twistminimap` | 小地图纯显示（方向箭头+目的地标记+距离）；大地图右键设目的地+导航线+搜索框（地点/符号/街道）+自动足迹标记（hook ISMiniMapInner + ISWorldMap）| `MINIMAP_NAV` |
| **MSR_ShopPatch** | 补丁 | `myspatialrefuge_shop` | 避难所商店 Sell 分类按 DisplayCategory 分组显示背包物品，框选批量出售，一键出售自动卖 Junk 垃圾换 MagicalCore（通用定价）| `MSR_ShopPatch` |
| **AutoLootPickupPatch** | 补丁 | `AutoLoot` | AutoLoot 增强：行走时也拾取（间隔 500-3000ms）+ 扩展扫描半径（1-3 格，默认 2=5x5）+ 剩余战利品屏幕提示（toast 6s）；不改 AutoLoot 源码，复用其全局函数；Options→Mods 全中文选项 | `AutoLootPickupPatch` / `ALPP` |
| **DBUP 无限容量** | 补丁（已并入 AutoEverything） | `LazoloDynamicBackpackUpgrades` | DBU 增强：override `DBU.GetUpgradedStats` 容量×N（slider 2-50 默认 10），所有容器进游戏即大容量；override `DBU.RestoreBagStats` 加 nil 保护（修 ERR-013 NPE）；onPlayerUpdate 5s 节流。⚠️ **已修引擎硬上限容器（trashbag=50）setCapacity 刷 WARN 卡顿**（LRN-111：读回容量 + skippedCaps 跳过表） | `DBUP` |
| **AEV_ZeroWeight 无限负重** | 补丁（并入 AutoEverything） | `NoWeightB42` | 运行时清零：每 3s 遍历主背包+穿戴+手持，`item:setActualWeight(0)`。解决 NoWeightB42 只改脚本、旧物品不清零导致的超重（LRN-108） | `AEV_ZeroWeight` / `ZeroWeight` |
| **MSCarryWeightZeroPatch** | 补丁（已并入 AutoEverything） | `ModernStatus` | MS 负重图标归零：override `MS_PlayerStatus.Get.CarryWeightData` 返回 weight/visualRatio=0，配合 NoWeightB42 负重图标恒空不误报（B42 encumbrance=weight+size，size 部分 Lua 无法改） | `MSCarryWeightZeroPatch` / `MSCZ` |

**排查顺序**：1) console.txt 搜表格关键词看有无报错 2) 确认依赖 mod 是否在前（default.txt 顺序）3) 查 `Zomboid\mods\<name>\` 文件是否完整 4) 备份在 `docs/project-zomboid.md` 历史版本可查
**改造记录**：MINIMAP_NAV hook 对象是 ISMiniMapInner（非 TTF_MiniMap）；MINIMAP_NAV 大地图搜索用 symbolsAPI 遍历文本符号（PZ 无文件读取，勿试解析 streets.xml），hook ISWorldMap 用 OnTick 轮询勿用 OnCreatePlayer；MINIMAP_NAV 小地图纯显示无右键功能，高德蓝配色（`{r=0.23,g=0.51,b=0.96}`）；MSR_ShopPatch 定价=按物品重量折算核心。

**2026-08-05 更新**：
- **AEV_AutoCombat 自动反击**（新增，并入 AutoEverything）：近战自动反击（面前有僵尸自动 DoAttack，无目标不挥空，0.5s 检查）+ 远程 CTRL 全自动（按住 CTRL 强制瞄准最近僵尸并自动射击）+ 推搡连锁（参考 BetterPush：高力量推搡时多米诺连锁放倒后排僵尸，概率/力量/数量/步距可调）；设置面板「── 自动反击 ──」分类（`IGUI_AEV_Cat_Combat`，13 项：启用/近战/远程/间隔 + 推搡连锁 8 项）。参考 AutoAttack 2837527039、BetterPush 3715137752 仅参考不缝合；已修复 BetterPush 42.20 联机崩溃 bug
- **AEV_AutoEquip 自动装备**（新增，并入 AutoEverything）：每 2s 轮询背包自动装备——主手最强近战、副手最强单手枪（跳过耐久<30%）；护甲按 bodyLocation 分槽穿防御最高；温度适配（`MoodleType.HYPERTHERMIA/HYPOTHERMIA` 触发，过热换低保暖/受寒穿高保暖）；自动换弹装夹（`ISReloadWeaponAction.BeginAutomaticReload`）；手动装备保护（`ModData.aeqPlayerEquipped` 标记）；设置面板「── 自动装备 ──」分类（`IGUI_AEV_Cat_Equip`，8 项：启用/近战/枪械/护甲/温度/换弹/保护/间隔）。参考 EquipmentUI 2950902979、ModernStatus 3451167732（状态读取）、CleanHotBar 3461263912（耐久 getConditionMax）仅调研 API，不缝合 UI
- **AEV_Spatial 自动收纳**（新增，并入 AutoEverything）：右键可移动家具「收进背包」→ parts 进主背包（无视重量/技能/工具），背包右键原版「放置」放回（`ISMoveableSpriteProps:pickUpMoveable(player,sq,true,true)` forceAllow + 原版 `ISMoveableContextMenu`，零 UI 改动）；右键车辆「收进背包」→ 生成「车辆印记」物品（modData 存 `spatialVehicle/spatialScript/spatialAngle`），右键印记「部署车辆」→ `addVehicle` 面前 2 格生成同款新车（仅车型+朝向，不保留油量/零件/车内物品，稳定优先）；车辆鼠标取用 `IsoObjectPicker.Instance:PickVehicle(getMouseXScaled(), getMouseYScaled())`（车外场景）；设置并入 AutoEverything 统一面板「── 自动收纳 ──」分类（`IGUI_AEV_Cat_Stow`，3 项：家具/车辆/保留朝向）
- **AutoLootPickupPatch**（新增）：AutoLoot 增强补丁——移动中每 `moveInterval`（默认 1500ms）调 `AutoLoot.PlunderSquare` 扫 `scanRadius`（默认 2=5x5）格，解决路过漏捡；容器仍有勾选物品时屏幕 toast（`getTextManager():DrawStringCentre` 右下，6s 消退，`notifyCooldown` 10s 防刷屏）；自定义 `getExpandedSquares` 替代 `AutoDrop_getReachableSquares` 并保留 isBlockedTo 墙阻挡；跨 mod 直接用 AutoLoot 全局函数（对应 LRN-20260804-019 改共享全局表正解），已 lupa 验证（radius2=25格/radius3=49格/节流/notify 全过）。选项全中文（fallback 直接中文，不依赖翻译表）
- **DBUInfinitePatch**（新增）：DBU 容量补丁——override `DBU.GetUpgradedStats` 返回 cap*N（默认 10，书包 15→150），所有容器进游戏即大容量不用逐个升级；override `DBU.RestoreBagStats` 加 nil 保护（否则 `setWeightReduction(nil)` Java NPE，ERR-20260805-013）；onPlayerUpdate 每 5s + getCapacity 脏检查 setCapacity（勿每帧）。lupa 验证 T1-T4 全过
- **MSCarryWeightZeroPatch**（新增）：Modern Status 负重图标归零——override `MS_PlayerStatus.Get.CarryWeightData` 返回 weight=0/visualRatio=0（默认开，可关）；根因：B42 encumbrance=weight+size（LRN-20260805-041），NoWeightB42 只清 weight，size 仍占负重故图标误报；纯 Lua 无法改引擎 `getCapacityWeight/getInventoryWeight`（Java），只能补丁显示层。lupa 验证开启归零/关闭透传
- **MSR_ShopPatch**：Sell 分类改用 `item:getDisplayCategory()`（参考 AutoLoot）分组 tab（含"垃圾"），**一键出售只自动卖 `DisplayCategory=="Junk"` 的非容器物品**（Junk 混有扑克/烟/相机等可右键物品，需卖/留可在 `SELLALL_FORCE_KEEP` 例外表按 fullType 控制）；背包/武器/食物/医疗等列表保留可手动框选卖；`doSellMultiple` 用 `getAllInventories` 并返回实际 removed（修复穿戴容器内物品"显示可卖实际卖不掉、统计虚高"）；联机 `sendShopSellAll` 改为逐条 `sendShopSell`（服务端 handleSell 用客户端完整数据）；`calculateGenericPrice` 补 StockCertificate=500
- **MINIMAP_NAV_PATCH**：绘制函数抽 `MINIMAP_NAV_Core.lua` 共享（小地图/大地图放大一致）；箭头 19px/边缘箭头 14px/目标点 16×16/距离文字 Medium；足迹改 per-save（`getMetaData():getModData()` 双保险）+ 300 上限 FIFO + 视口裁剪（`uiToWorldX/Y` 只画可见区）；符号列表 5s 缓存 + 250ms 输入防抖；到达检测移到 `Events.OnPlayerUpdate`（小地图隐藏也生效）；右键劫持 `HOOK_RIGHT_CLICK` 可关
- **ACWP**：`autoCurtain` 默认改为 false（靠近拉帘会把家中窗帘永久拉上、室内常暗；需要隐蔽时手动拉一次同样永久生效）
- **AEV_AutoNav 自动驾驶导航**（新增，并入 AutoEverything，2026-08-06）：大地图右键设目的地 → 路线叠加（小地图 hook ISMiniMapInner + 大地图 hook ISWorldMap，`javaObject:DrawLine` 画线）；步行自动移动用引擎原生 `ISPathFindAction:pathToLocationF`（零成本寻路）；驾驶辅助 = `setRegulatorSpeed`+`setRegulator(true)` 定速巡航 + `getSteerHint` 路口转向 HUD 提示（**无车辆转向写 API，不做自动转向**）；加油走开 = 检测 `obj:getPipedFuelAmount()>0` 油泵，距泵<2 格设安全目的地走开 + 油泵 LED HUD；战争迷雾 = `WorldMapVisited.getInstance():setKnownInSquares`（引擎原生）；StreetsPatch = 引擎 `initDefaultStreetData` 已自动加载全部街道（`clearStreetData`+逐目录 `addStreetData`），mod 增强版 streets.xml 放 `mods/<id>/common/media/maps/<map>/streets.xml` 即可被引擎加载，Lua 手动 addStreetData 是重复加载 bug；设置面板「── 自动驾驶 ──」分类（`IGUI_AEV_Cat_AutoNav`，13 项）。⚠️ 依赖 TwisTonFire Minimap（小地图叠加，未装自动跳过）
- **⚠️ ISWorldMap mapAPI 是公开字段**：`ISWorldMap_instance.mapAPI`（`self.javaObject:getAPIv3()` 缓存），Lua 用 `worldMap.mapAPI:getStreetsAPI()`，无 `worldMap:getAPIv3()` 方法
- **⚠️ streetsAPI 真实枚举**：`getStreetDataCount()`/`getStreetDataByIndex(i)`→WorldMapStreets→`getStreetCount()`/`getStreetByIndex(i)`→street→`getNumPoints()/getPointX(i)/getPointY(i)`；**无 getStreetData()**
- **⚠️ getAngleZ 返回度**（非弧度），与 math.atan2 比较前须 `*math.pi/180`
- **⚠️ 加油动作检测**：`ISTimedActionQueue.queues[player]:indexOfType("ISRefuelFromGasPump")` 判断正在加油（stopOnWalk=true，强行走开会打断）；步行寻路用 `indexOfType("ISPathFindAction")` 防重复排队
- **优化（2026-08-06）**：①路线改 **Dijkstra 沿街最短路径**（`buildStreetGraph` 街道顶点图 + 同坐标合并 + 同街连边，交叉点入路）；②小地图叠加用 **B42 原版 `ISMiniMapInner:prerender`** hook（无需 TwisTonFire，该 mod 未装、default.txt `twistminimap` 是失效引用可清理）；③战争迷雾 = 引擎原生 `mapAPI:setBoolean("HideUnvisited", fog)`（非自绘蒙层）；④移除无 API 的「更多损坏物体」选项；⑤HUD 转向/油泵提示中文化（`IGUI_AEV_AutoNav_DriveHint_*`/`PumpLED`）
- **优化2（2026-08-06）**：①路线缓存 `getStreetSig`（dataCount:streetCount 签名）+ routeCache 按 (起点,目的地,sig) 命中；②DriveAssist 直线稳定 `getDriftHint`（点到线段距离 + 叉积判侧，超阈值橙色警告）；③多拐点转向提示 `findNextTurn`（玩家前方 15 格内方向变化提前提示）；④步行箭头 HUD `renderWalkGuide`（`player:getForwardDirection():getDirection()` 朝向 → `^`/`>>`/`<<` + 距离）；⑤default.txt 删除失效 `twistminimap` 行
- **优化3（2026-08-07）**：①街道图缓存 `streetGraphCache[sig]`（同一 sig 复用 buildStreetGraph）；②手动转向暂停提示（`isManualDriving` steering>0.1 → 2s 暂停 HUD）；③default.txt 再清 5 个失效 mod（ModManager/CleanUI/drivestraight/SandboxSettings/RebalancedPropMoving，均无安装目录），剩 13 个有效；④Drive 到达 <2 格自动关巡航+清目的地；`clearDestination` 补清缓存字段；⑤小地图玩家十字标记 `renderMiniMapPlayer`
- **优化4（2026-08-07）**：①统一日志系统 `AEV.AutoNav.log`（`[AEV_AutoNav] (时间戳)` 前缀）+ `AEV_AutoNav_Debug` 选项（ModOptions 新增「调试」分类），全部 print 迁移；②巡航速度平滑 `nextCruiseSpeed`（每步 ±2 km/h，首次直达目标）；③驾驶中步行守卫（`player:getVehicle()` 非 nil 时 Walk 不排队寻路，下车自动恢复）；④街道图构建耗时日志（节点数+ms，性能监控）
- **优化5（2026-08-07）**：①A* 寻路 `astar`（欧氏启发式 + 简单 open 集合）替代 Dijkstra，失败 fallback；②到达 toast `notifyArrived`（`player:Say` 中文「已到达目的地」）；③多目的地队列 `queueDestination`/`popNextWaypoint`（到达自动续下一个）；④buildRoute 失败路径加日志（streetsAPI 不可用/街道空/图无节点）
- **优化6（2026-08-07）**：①大地图 **Ctrl+右键 = 加入途经点**（`Keyboard.isKeyDown(KEY_LCTRL/RCTRL)` 检测，入队 queueDestination），普通右键设目的地；②途经点 HUD 提示（`getWaypointInfo` 返回队列数，Walk 距离文字追加 `[途经点 N]`）；③A* 堆优化 YAGNI 跳过（实测卡顿再上）；④面板折叠 PZAPI 不支持（仅 addTitle/addSeparator），跳过
- **全 mod 健康优化（2026-08-07，LRN-059）**：①删 2 个 `--obsolete` 死文件（AutoEat_ISEatFoodAction/AutoEat_ISCraftAction）；②修 `\BetterSortCC` 无效转义；③补 15 个翻译键（DbViewer_Filters/TotalResult + 13 个 IGUI_ItemCat_*）；④建 `shared/AutoEverything.lua` 公共库（统一 log）；⑤硬编码 UI 汉化（ItemsListTable 7 按钮 + ItemsListViewer Save，`getText("IGUI_AutoLoot_*") or fallback`）；⑥**发现 27 文件重复相同 tr()（同哈希）**——未来可去重；⑦lupa 全量扫描对含 UI 类的缝合 mod 不可靠（stub 缺 :derive），性能优化需游戏实测
- **全 mod 优化2（2026-08-07，LRN-060）**：①全局 `_G.tr` 入口（000_AEV_ModOptions 定义，供新模块）；27 文件 local tr 保留（去重风险>收益）；②AutoNav log 落地 `AutoEverything.logModule`（保留 Debug 开关 + fallback）；③ModOptions 面板核对：**105 选项 id 0 冲突**（AEV 47/AL 16/MSR 11 等）；④工具沉淀：check_modoptions_ids.py/check_all_translations.py 可复用
- **default.txt BOM 坑 + 残留清理（2026-08-07，LRN-061）**：①**PS5.1 `Set-Content -Encoding UTF8` 写 UTF-8 BOM → PZ 读不到 default.txt → 全 mod 未启用**。修复：Python `utf-8-sig` 读 + `utf-8` 写无 BOM；②清理残留：myspatialrefuge_shop（代码已缝入 AE，UI 键全覆盖 0 缺失）、DBUInfinitePatch（依赖 DBU 未装）、examplemod（官方模板）、4 个 default.txt.bak*；③`reset-mods-42_00.txt` **必留**（PZ 标记文件，删了 default.txt 被重置）；④mods 目录现在仅 AutoEverything + default.txt + reset 标记
- **翻译 % 转义修复（2026-08-07，LRN-062）**：**PZ 42.20.2 翻译严格化——单个 `%` 触发 Java String.format 异常（ERROR 计数）**。修复 6 处：AutoCombat DominoMin/MaxChance（（%）→（%%））、AutoEquip Melee_Tooltip（30%→30%%），CN+EN。检测：`re.sub(r'%%\d*','')` 后仍含 `%` 即未转义。以后翻译键里字面 `%` 一律 `%%`
- **B42 ItemBodyLocation 破坏性变更（2026-08-07，LRN-063）**：`player:getWornItem()` 参数从字符串改 `ItemBodyLocation` 常量对象（传字符串报 `expected argument of type ItemBodyLocation, got String`，pcall 捕获但 ERROR 计数照计，运行时报 217 次）。修复 AEV_AutoEquip：①加映射表 `BL={Jacket=ItemBodyLocation.JACKET,...}`（12 槽位）；②`getWornItem(BL[loc] or loc)`；③**`findBestClothing` 比较 `loc == (BL[bodyLocation] or bodyLocation)`**——`item:getBodyLocation()` 返回对象，与字符串比较永远 false 导致护甲从不穿。`wearClothing` 的 `setWornItem(loc)` 用 `item:getBodyLocation()` 天然匹配不用改
- **LRN-064 修正 063 的两点**：①静态表 `ItemBodyLocation.JACKET` 在文件加载时可能未就绪 → BL 全 nil → fallback 字符串报错。**改运行时** `ItemBodyLocation.get(ResourceLocation.of(name))` + 别名表 `{Glasses="EYES",...}`（部分名不直接对应常量）；②**AutoCombat 空手持续推搡**：空手 `DoAttack(0)`=推搡动作 → 每 intervalMs 推一次。修复：`getPrimaryHandItem()` 空则跳过自动攻击（近战自动仅持武器）
- **LRN-065 高频错误拖垮 UI（背包点不开）**：①AutoNav `getSaveMD` 的 `getWorld():getMetaData()` 链式 nil 调用 → Kahlua `Object tried to call nil in pcall`（162 次/会话）——**Kahlua 的 pcall 捕获不到 nil 链式调用**，须逐层 `if getWorld then pcall(getWorld)...`；②`ItemBodyLocation.get(ResourceLocation.of())` 在 mod 运行时环境不可靠 → **直接 `ItemBodyLocation[key]` 查表**（此时全局已就绪）+ 别名表；③高频错误刷屏拖垮 Lua 引擎/UI（背包点不开 + [B42] Mod Manager createOptionControls 崩），修复源头后应恢复
- **LRN-066 getWornItem 重载 + 设置乱码**：①**`getWornItem(String)` 在 B42 运行时绑定到 ItemBodyLocation 重载仍报错**（JavaDoc 写 String 但实际 Lua 绑定歧义）——改用 `getWornItems()` 遍历 + `item:getBodyLocation()` 对象做 key（原版 ISInventoryPaneContextMenu/ISMakeUpUI 标准）；②**设置界面乱码 = Mod Manager 双重格式化翻译 `%%` 崩**（`String.format("%%")` 后单个 `%`+中文括号 → `UnknownFormatConversionException: Conversion='�'`）——**翻译字面 % 用全角 `％`（U+FF05）替代 `%%`**（非 Java 格式符，防第三方双重格式化），修复 CN/EN 11 处；③ModManager 之前误删但用户已加回（现 default.txt 20 个 mod）
- **LRN-067 最终确认 + 冲突提示**：①getBodyLoc 最终方案 = **`ItemBodyLocation.HAT` 静态常量**（原版 `k:getBodyLocation() == ItemBodyLocation.HAT` 验证）+ BL 别名表（Glasses=EYES）；②`getSaveMD` 加 `if ModData then` 前置（防 Kahlua nil 调用）；③**网上确认 Mod Manager（3567084868）与 ModLoadOrderSorter_b42 同时装可能冲突导致选项菜单不显示**（steam 评论）——用户两个都装了，若设置仍乱码建议二选一
- **LRN-069 AutoNav 模块移除（2026-08-07）**：**AEV_AutoNav 自动驾驶导航整个模块已移除**（7 文件 + 39 翻译键）——体量大维护不便、B42.20.2 下小地图/大地图 hook 不稳定（小地图图标消失、右键地图拖拽异常、导航不生效）。替代方案见 MODULES.md「原版 mod 参考」：Navigator 3708816224 / Auto Forage 3478924012 / Better Push 3715137752 / AutoAttack 2837527039 / TwisTonFire Minimap 3572564421。AutoEverything 现剩 69 文件、17 大类模块
- **LRN-071 原版 mod 替代（2026-08-07）**：**AutoLoot 家族（21 文件）+ AutoDrop（1 文件）+ EreFBI（2 文件）移除**，改订阅原版：Auto Loot (3392699932，含 AutoDrop 但仅 B41 目录) + FBI Open Up Door (2732513069)。⚠️ 原版 B42 版**无 AutoDrop 自动丢弃**（`isAutoDrop` 缺失）；ALPP 拾取移动保留（依赖原版公开 API `PlunderSquare`）。**翻译清理教训**：删模块清键时用「代码 used 判断」会误删其他模块用的键（UI_Shop*/IGUI_ACWP* 等），必须 fallback 重建 + 全量核对。AutoEverything 现剩 **38 文件、13 大类**。default.txt 已加入 AutoLoot + EreFBIOpenUpDoor（无 BOM）
- **AEV 模块统一初始化坑**：各 `AEV_AutoNav_*.lua` 顶部用 `AEV_AutoNav = AEV.AutoNav or {}` + `AEV.AutoNav = AEV_AutoNav`（复用已有 `AEV.AutoNav` 表），勿用 `AEV_AutoNav = AEV_AutoNav or {}`（会新建空表覆盖共享函数，导致已加载模块的函数丢失）
- **验证**：PZ Lua 无 luac，用 python lupa（`rt.compile` 语法 + mock `Events`/`getWorld`/`ModData` 后 `rt.execute` 做运行时逻辑测试，execute 返回值=模块表；⚠️ lupa 是 Lua 5.5 非 5.1，UTF-8 `string.find` 可能返 nil，勿当 bug）
**⚠️ B42 ISWorldMap hook 时序坑（LRN-20260804-020）**：`createChildren` hook 可能在安装前就执行（`ISWorldMap.ShowWorldMap()` 首次调用时 `instantiate()` → `createChildren()`），导致搜索 UI 永远不注入且无报错。**正解**：render 钩子中加懒初始化兜底 `if not searchBox then pcall(attachSearchUI, self) end`，加 `searchPanel:bringToTop()` 防 Java 渲染层遮挡。
**⚠️ Lua or 吞 nil 坐标（LRN-20260804-021）**：坐标交换用 `xa or x1` 模式，若任一值为 `nil`（pcall 失败）后续交换全错。正解：显式临时变量交换。
**⚠️ 补丁 hook 坑（LRN-20260804-019）**：MSR_ShopPatch 最初 hook `MSR_ShopGrid:setCategory` 完全不生效（PZ 每个 mod 独立 Lua 环境，改的是对方不用的表引用）；改为 override 共享全局表 `MSR.ShopData`（`getItemsByCategory("sell")`/`canPurchase`/`getSellItems` 等）后生效。诊断特征：hook 安装日志有、被 hook 函数内 print 无 = hook 错表。写第三方 mod 补丁优先改共享全局表数据层，勿 hook UI 类方法。

### 本地 mod 加设置界面（PZAPI.ModOptions，2026-08-04）

- **mod 不出现在 Options→Mods 界面 = 没调 `PZAPI.ModOptions:create` 注册选项**（不是 mod 失效）；补齐 `*_ModOptions.lua` 后**重启游戏**才出现
- 模式（已应用于 AutoEatB42 / ACWP / ALP）：client 目录建 `XX_ModOptions.lua`，`XX.options={}` 表 + `XX.initOptions()` 里 `PZAPI.ModOptions:create("ID","显示名")` → `addTickBox`/`addSlider`；主逻辑顶部 `require "XX_ModOptions"`（client lua 按文件名自动加载 + require 幂等双保险）
- `addSlider(id,name,min,max,step,value,tooltip)` 支持浮点步进（原版 precipitationSpeedMultiplier 用 0.01）；滑块值**点 Apply 才回写** option.value
- 配置存 `Lua\ModOptions.ini`（`type|modID|optionID|value`，未存值用代码默认值）；**改此文件前先退出游戏**（退出时被内存覆盖）
- per-player 开关（角色面板按钮）存 `getModData()`，参数类（阈值/半径/延时）用全局 options

### 本地 mod 中文化（设置界面/翻译表，2026-08-04）

- **设置界面显示英文 = ModOptions 的 name/tooltip 是硬编码字符串，未走本地化**；已应用于 ACWP / ALP
- 本地化文件位置：`mods\<name>\common\media\lua\shared\Translate\CN\`（LANG=CN 简体 / CH 繁体），游戏自动扫描加载，无需注册
- 格式：B42 原版 `.json`（`{"KEY":"值"}`）；`.txt` Lua 表（`IG_UI_CN = { KEY = "值" }`）兼容——Modern Status 3451167732 每个语言目录两种都给，**照它做 txt+json 双格式**；多 mod 同名表被合并，key 前缀 `IGUI_<MOD>_` 防冲突
- Lua 侧：ModOptions 文本用 `tr(key, fallback)` 包装（`getTextOrNull(key)` + `getText(key)` pcall 兜底，非中文语言自动回退英文 fallback，无需额外 EN 文件）；模板见 `ACWP_ModOptions.lua`
- 改翻译文件后**重启游戏**生效
- 语法验证：本机无 lua/luac 时 `pip install lupa` 做真实语法检查（txt 表直接 execute；含游戏全局的脚本先定义 stub 再 execute，见 LRN-20260804-016）
- **⚠️ 42.15+ 只认 JSON，且 key 前缀必须匹配文件名 schema（LRN-20260805-008）**：旧 `.txt` 翻译 42.20 不再读取（删了无影响）；JSON 文件名不带语言代码（`CN\UI.json` / `CN\IG_UI.json`）。**key 前缀必须与文件名匹配**：`IGUI_` 前缀 → `IG_UI.json`，`UI_` 前缀 → `UI.json`，`Sandbox_` → `Sandbox.json` 等；放错文件整个 key 被丢弃。AutoEatB42 曾把 7 个 `IGUI_AE_*` 塞进 `UI.json` → Options→Mods 界面全英文 fallback，拆到 `IG_UI.json` 后正常。JSON 必须 UTF-8 无 BOM（`[System.IO.File]::WriteAllText(path, txt, New-Object System.Text.UTF8Encoding($false))`）；`getTextOrNull` 查不到时 `tr()` 走 fallback 即显示英文，是排查断点。

## 避难所 My Spatial Refuge（myspatialrefuge 3632195933）

- **机制**：避难所是地图外 (1000,1000) 的真实世界空间，每玩家独立一格，有真实墙/地板，mod 只保护边界墙和圣遗物；初始 3x3，杀僵尸掉 Zombie Cores（MagicalCore）升级到最大 19x19
- **进出**：按住 Q（社交菜单）进入/退出避难所
- **放家具三法**：1) 外面右键家具"移动"拾取带进传送落地 2) 带木板/钉子现场建造 3) 用已装的商店扩展（myspatialrefuge_shop 3711250417）核心买建材/工具/武器
- **传送携带**：物品无限制，只按负重比例罚传送时间（超重最多罚 300s）
- **注意**：避难所无电力需发电机；升级数据在 mod 的 `upgrades.yaml`（可改/加升级）；作者已停止开发但开源（github.com/nuclearthinking/myspatialrefuge），允许 fork
- **搜索效率低/房间小**：先攒核心扩到 5x5+ 再布置；货架床放不下时优先升级空间

### 商店扩展 mod（myspatialrefuge_shop 3711250417，2026-08-05 有本地补丁）

- **功能**：在升级界面加商店，用 MagicalCore 购买生存物资/装备/书；含出售兑换（用物品换核心）、轮换特惠、抽奖、大保健/以德服人等彩蛋
- **目录架构**：`workshop\content\108600\3711250417\mods\MySpatialRefuge_Shop\`；代码在 `common\media\lua\`（shared\MSR_ShopData.lua 商品数据、client\MSR_ShopGrid/Details/Window 界面、server\MSR_ShopServer.lua）；翻译在 `42.15\media\lua\shared\Translate\CN|EN\UI.json`（版本目录）
- **状态（2026-08-05）**：Workshop 原版未改动；另挂**本地补丁 MSR_ShopPatch**（`Zomboid\mods\MSR_ShopPatch\`，default.txt 中排在 myspatialrefuge_shop 后）实现任意物品出售
- **本地补丁 MSR_ShopPatch 功能**（2026-08-05，见 LRN-20260805-037/038/039）：
  - **任意物品出售**：AutoLoot 全部拾取后，背包框选/Ctrl+Click 选中 → 右键「出售到商店（N 件，约 X 核心）」或点背包底部「出售」按钮，换成 MagicalCore
  - **定价**：按 `getDisplayCategory()` 分类 × 重量 × 磨损折价（PZ 原版无 sell value 字段）；MagicalCore 本身不可卖
  - **设置**：Options→Mods→「商店补丁-任意出售」——全局倍率、各分类倍率滑块、右键菜单/底部按钮开关
  - **架构**：shared\MSR_ShopPatch_Pricing.lua（定价）+ client\Main（注入 MSR.ShopData.sellAnyItems）+ Context（右键）+ Button（底部按钮，有选中才显示）+ ModOptions（设置）
- **⚠️ 教训**：直接改 Workshop 内文件会被 Steam Workshop 自动更新覆盖（新增文件残留、改过的文件还原）。要长期改应先复制到 `Zomboid\mods\` 本地（同 id 本地优先）。恢复原版用 `steamcmd +login anonymous +workshop_download_item 108600 3711250417 +quit`
- **曾做过的改造记录**（如需重做可参考）：① 新增 7 个出售分类（脏布条/碎玻璃/无用材料/用过的医疗品/塑料袋/一次性杯子/古龙水）共 24 类；② 一键出售配置系统（`MSR_ShopSellConfig.lua` INI 存 `Zomboid\MSR_ShopSellConfig.ini` 格式 `分类id:启用:核心:批量` + `MSR_ShopSellConfigUI.lua` 设置面板 + 出售页「设置」按钮）；③ `sellAllItems`/`handleSellAll` 配置过滤，sellAny 逐类型求和、非 sellAny 取最小值；④ getTexture 多路径 fallback；⑤ 曾计划 typeFilter 引擎类型动态出售（AutoLoot 1:1，FR-20260805-002 已取消）
- **B42 item type 参考**（本 mod 新增出售项实测有效）：眼镜 `Base.Glasses_*`（Sun/Normal/Aviators/CatsEye/HornRimmed/JackieO/Macho/Round/70s_Gold/HalfMoon/SafetyGoggles/Shooting/SkiGoggles/SwimmingGoggles/Eyepatch 等）；手表 `Base.WristWatch_Right|Left_*`（DigitalBlack/DigitalRed/DigitalDress/Expensive/ClassicBlack/Brown/Military/Gold）+ `Base.Pocketwatch`/`Base.AlarmClock2`；空容器 `Base.EmptyJar/TinCanEmpty/PopEmpty/Pop2Empty/Pop3Empty/BeerCanEmpty/BeerEmpty/MayonnaiseEmpty/RemouladeEmpty/GardeningSprayEmpty/BucketEmpty/PaintbucketEmpty`；纸质 `Base.Newspaper*`/`Paperwork`/`PaperBag*`；破损武器 `Base.*_Broken`（BaseballBat/Branch/MetalPipe/Plank/Katana/Sword 等）+`BrokenGlass`；垃圾 `Base.UnusableMetal/UnusableWood/Splinters/Tissue/CottonBalls/Plasticbag*/Garbagebag/FountainCup/PlasticCup/Cologne`；脏布 `Base.RippedSheetsDirty/BandageDirty/DenimStripsDirty/LeatherStripsDirty`
- **注意**：`Base.MoneyBundle`/`Base.StockCertificate`/`Base.RippedSheetsBundle` 为捆绑类，别和散件混淆；改翻译后重启游戏生效
- **B42 出生点（非商店问题）**：默认模式只有 4 个出生点（Muldraugh/Riverside/Rosewood/West Point），其他城镇（Brandenburg/Echo Creek/Ekron/Fallas Lake/Irvington/March Ridge/Valley Station）需**自定义沙盒 Custom Sandbox** 才可选（B42.17 起）。media/maps 各城镇缺 objects.lua 仅 WARN 非致命，地图数据整合在 Muldraugh 目录（见 LRN-20260805-031）

## 自动化 mod（B42.20）

- **Better Auto Mechanics**（3635856965）：一键训练机械技能，42.20+ 明确支持
- **Auto Forage**（3478924012）：自动行走+觅食，B42 专用
- **Karas Fully Automatic Fishing**（3642554378）：全自动钓鱼，42.13+
- **Project Cook**（3490188370）：烹饪 UI，42.10-42.20；需 NeatUI_Framework；⚠️ MP 主机有 bug 单人正常
- **Auto Reload**（3389448389，135k）：一键自动训练换弹速度（自动装弹/退弹循环）
- **AutoEatB42**（本地 mod）：自动吃背包最合适食物（B41 AutoEat 移植）

### 自动开关灯/窗/窗帘（B42 调研结论，2026-08）

- ⚠️ **AutoLights [B42]**（3737087835）是**时间式**（日落/定时开关灯），不适用游牧/不固定基地玩法；**2026 已被 Steam 移除**且作者不活跃 → 自写 **AutoLightsProximity**（感应式，人在附近亮）是唯一方案，无原版替代
- **自动开门/关门：FBI Open Up Door**（2732513069）——跑步/冲刺自动开门+多格大门，可选自动关闭，踢门动画+耐力机制，B41/B42，15.5k 订阅（功能全，推荐）；**EasyDoors [B42]**（3621001191）更轻量但只处理单扇门
- **玩法向自动门：HydeCo Automatic Garage Doors**（3594285774）——车库门/大门遥控+密码盘+链式传动，需电池/遥控器
- **自动关窗/拉窗帘：Workshop 无任何独立 mod**（FBI/EasyDoors 都只管门）→ **AutoCloseWindowsProximity**（靠近拉窗帘/离开关窗）填补 B42 功能缺口，唯一方案
- **自写感应 mod 均无原版替代**（2026-08 复核）：AutoLightsProximity、AutoCloseWindowsProximity、AutoEatB42（原版 AutoEat 2977628726 停更仅 B41；替代 Eat Smart 3456212729 需手动非全自动）——三者保留为本地 mod

### 导航（B42 调研结论，2026-08）

- **车载导航：Navigator**（3708816224，82k 订阅）——装 Navigator 收音机到车辆 Radio 槽，电源键开屏幕，右键小地图/世界地图 Build route 建路线，路线显示在导航屏/小地图/世界地图；建议装 streets.xml patch 提升路线质量
- **Mini Compass**（3772670381）——罗盘 HUD 只显示方向（N/NE...），无目的地/路线
- **Follow Your Compass**（3695133903）——自动朝罗盘指定方向走，适合野外长途
- B42 **无步行+目的地指引导航**；找枪/找路推荐 PZ_Map 浏览器地图看全图 + Navigator 开车导航

## 热门 mod 推荐（B42，2026-08 实测订阅数）

> 数据来自 Steam 详情页抓取（Playwright + innerText 正则，见 steam-tools skill）。⚠️ = 评论区有报错/兼容性风险。**推荐 mod 前必须先读评论区确认 B42 可用。**

### 自动化练技能（按订阅数）

| mod | 订阅 | 功能 | 链接 |
|---|---|---|---|
| **Better Auto Mechanics** | 258,470 | 一键训练机械 + 批量拆车件 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3635856965) |
| **Auto Tailoring** | 182,479 | 自动训练裁缝 + 补洞 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3388183573) |
| **Auto Cook** | 115,883 | 自动烹饪 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3388721641) |
| **Faster Cloth Ripping + Rip all** | 56,506 | 批量撕裂衣物 ⚠️B42.18 有 crash 报错 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3414409419) |
| **Karas 自动钓鱼** | 10,938 | 全自动钓鱼 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3642554378) |
| **I Learn What I Read Too** | 5,686 | 读书直接给经验 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3725249649) |
| **Auto Forage** | 2,665 | 自动行走+觅食 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3478924012) |

### QoL 简化操作

| mod | 订阅 | 功能 | 链接 |
|---|---|---|---|
| **I Don't Need A Lighter** | **1,435,311** | 炉灶/车载点烟，无需打火机（可替代 AutoSmokeB42） | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=2714198296) |
| **Drink Smart** | 39,898 | 精确喝到刚好解渴 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3447775367) |
| **Eat Smart** | 32,644 | 精确吃到目标热量/饥饿 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3456212729) |
| **Auto Move Corpses** | 28,287 | 一键搬运尸体 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3415416226) |
| **Pick Up All** | 13,978 | 框选区域自动捡地面物品 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3660401764) |
| **EasyDoors** | 3,055 | 跑步自动开门关门 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3621001191) |

### 背包 / 分类

| mod | 订阅 | 功能 | 链接 |
|---|---|---|---|
| **Better Sorting** | **3,383,111** | 全物品智能分类（B41 原版，B42 需补丁 3413005308） | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=2313387159) |
| **Dynamic Backpack Upgrades** | 292,546 | 任意包加容量/减重升级，兼容全部 mod 包 | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=2996978365) |
| **Bag Upgrade Plus** | 36,802 | 包变 Plus 版（100% 减重 / 0.1 重量 / 挂件槽） | [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3403697073) |
| **Extended categories** | 87,682 | 细分分类（**已装**） | — |
| **Search Containers** | 135,017 | 容器搜索框（**已装**） | — |

### 分解

- **[B42] Vehicle Salvage**（3407175135）：拆车辆部件（车门/引擎盖/悬挂等）得金属板
- **Disassemble Container With Items**（2835852387）：容器连内容一起拆 ⚠️ **B42.19 有坏档/无法搬家具反馈，跳过**

### B42 配饰不可分解

眼镜/手表/帽子等配饰类 **B42 无拆解配方**（右键无"拆解"、解包也无效）。处理：AutoLoot 标记"不想要"不再自动捡，或装 Weightless Accessories（2947370877）清零重量。

## 触控板 / 纯键盘操作（B42 原版设置，无需 mod）

笔记本电脑只用触控板（单指=左键、双指=右键）时的原版解决方案（Options → Key Bindings）：

| 痛点 | 原版设置 | 说明 |
|------|---------|------|
| 无法"按住右键瞄准+点左键攻击" | **Toggle LCONTROL key to Aim**（默认关） | 按一下 Ctrl 进瞄准模式（角色面向鼠标、可防御/探视野），再按退出 |
| 移动需按住 Shift 加速 | **Toggle Run to Jog** / **Toggle Sprint to Sprint** | 按一次保持奔跑，不用按住 |

- Aim 键 = 左 Ctrl 或 RMB（按住），功能等价
- 触控板做不到"按住+点击"组合，但单指/双指点击都可以
- 曾计划自研 TouchPad Combat mod（一键攻击等 24 项），确认原版全覆盖后放弃

### 无鼠标/触控板增强 mod（B42，2026-08 调研）

原版键盘覆盖已足（WASD、E 交互、Y Walk To、Tab 建造、Ctrl 瞄准、Space 近战、I/B/L/H/J/M 面板、1-8 快捷栏、V 车辆径向、F2-F6 时间），真正缺的是"点地移动替代"和"右键菜单替代"：

- **Auto Move To [B42]**（3389328028）：绑定按键（默认 F1）移动到指定点、左键/双击地面移动、可选目标光标；Tchernobill 出品（与 AutoLoot 同作者），触控板轻点即可
- **Smart Radial Menu**（3494108029）：动态径向菜单吃喝/吸烟/用药/读书/制作一键调用，支持键盘+触控板+手柄+Steam Deck，键位可自定义；作者 Phoenix，配套 Steam Deck/控制器 QoL 合集（3485507224）
- **Left Click Redux**（B41 2795987309，点击容器自动开 loot/点门/窗/窗帘/灯开关自动操作）：B42 移植版 3705248289 已失效；需实测验证 B42 可用版再装
- 可选 **BindAid**（2945066057）：附加鼠标键+键盘模拟+自动隐藏光标
- 配置补充：Options 里 **Building UI / Pan Camera / Toggle UI 默认未绑定**需自己设键；笔记本无 End 键重绑 **Toggle Search Mode**

## 传送 / 消音器 / 弓箭

- **传送**：传送石碑 Waystone（2900928983）523 评热门但 **B42.13+ 已坏**；纯传送用 TP Mod（3596782504，F10 坐标传送，冷门但适配）；热门传送功能多在 Cheat Menu/Debug 菜单里
- **消音器**：B42 原版**没有**（pzfans 确认）；需 mod——Gunworks 生态的 GoM - Guns of Marz（3722134990，需前置 Gunworks Framework 3722064198）或 Simple Suppressor（3682106012，支持到 42.15）
- **弓箭**：**Archery Nexus**（3617854007，83k，**已订阅**）：B42 原版无弓，此 mod 补全——箭袋(16箭)/弓袋/定制动画/原始制作风/瞄准+装填技能；id=`ArcheryNexus`；⚠️ 42.19 评论有"装备弓时砍树报错"，B42.20 需实测。修复版 Archery Nexus [Fixed]（3731579266，42.19 SP 正常但订阅少）；JM3_ArcheryMP（3721635668，现代弓弩合集，勿与单机版混用）

## 批量 mod 清单整理（小黑盒帖子→创意工坊链接）

抓小黑盒 mod 推荐帖整理成带跳转链接清单的流程：
1. Playwright 滚动加载帖子全部懒加载图片（`img.img-item`，真实 URL 在 `data-src`）
2. evaluate 提取文字+图片，`encodeURIComponent` 编码返回（避免 >20KB 截断），PowerShell 解码存 JSON
3. Windows 自带 OCR（`Windows.Media.Ocr`）识别图片里的 mod 英文名，零安装
4. **优先找作者合集拿准确 ID**（如《丸布了》86 项），用 OCR 名+中文标题匹配；缺失项 Exa 搜索补全
5. 生成 HTML：每个 mod = 中文标题(链接) + 描述 + 图片；输出 `mod推荐清单.html`

## 显示模式

| 需求 | 设置 |
|------|------|
| 独占全屏 | `fullScreen=true`（切换窗口麻烦） |
| 无边窗口全屏（推荐） | `fullScreen=false` + `borderless=true` + 分辨率=桌面物理像素 |
| 窗口化 | `fullScreen=false` + `borderless=false` |

**DPI 坑**：本机 Windows DPI 缩放 200%（物理 3072×1920 → 逻辑 1536×960）。渲染分辨率要用**物理像素**才能填满屏幕。任务栏可见需窗口高度减任务栏物理高度，但游戏启动可能自动改回桌面分辨率。

## 字体（B42）

- 全局字体：固定像素档 **16/19/26/33/38px** 或「随窗口高度缩放」（游戏内 Options → UI → Fonts）
- 4K/高分辨率字小 → 固定 **38px** 最有效
- `options.ini` 的 `fontSize=6` 是 **B41 遗留字段**，不控制 B42 全局字体，改了无效
- 子字体独立档位：右键菜单 / 容器(背包) / 说明

## 日志

- `C:\Users\pass\Zomboid\console.txt`：启动日志，含分辨率、mod 加载、错误
- `C:\Users\pass\Zomboid\Logs\`：DebugLog 分次记录

## 常见问题

- **鼠标不跟手**：关 `uiRenderOffscreen` + `frameRate=60`；仍延迟多半是核显实际帧率不足
- **字小**：游戏内字体固定 38px（改 options.ini 的 fontSize 无效）
- **加载慢/卡**：先看 VSGirlBody 类高覆盖 mod 数量（一个变体就 2000+ XML overrides），可禁用多余变体；再查 console.txt
- **窗口只占 1/4**：渲染分辨率固定像素 + DPI 200% 缩放所致，用物理像素 + borderless
- **合集作者加 mod 后没看到**：Steam 合集快照机制，需重新订阅
- **tiledef fileNumber N used by more than one mod**：日志不含 mod 名；递归扫描所有 mod.info 的 `tiledef=文件名 起始编号` 行找编号重叠。案例：UsefulBarrelsMP 两个文件都 8188 → 改 patch 文件为 8180。⚠️ 改 workshop 内 mod.info 会被 mod 更新覆盖，建议同步向作者反馈
- **切窗口输入法跳中文**：微软拼音默认模式注册表 `HKCU\Software\Microsoft\InputMethod\Settings\CHS\Default Mode = 0`（0=英文），改后注销或重启 ctfmon

## 出生点 / 搜枪（B42.20）

- 路易斯维尔**不是出生点**（特殊区域，需自驾前往）
- **山谷站**：贴路易斯维尔南部，沿迪克西高速公路北上直达 → 搜枪效率最高
- **三月岭**：附近军事设施（检查站/训练营）枪多，尸群凶
- **罗斯伍德**：警察局武器库 + 出门枪店，新手安全
- **欧文顿**：镇上有枪店
- 路易斯维尔枪点：LVPD 总部、枪店 ×2、军事检查站

## AI mod 生态（B42，2026-08 调研）

B42 **目前无"开箱即用 LLM 智能队友 mod"**，生态分四类：

| 类型 | 代表 | 说明 |
|------|------|------|
| MCP（mod 开发） | wink-/pz-mcp-server（pzmcp） | search_vanilla / generate_script / validate_script / analyze_mod，面向开发者非游戏内操作 |
| RCON/远程 | Zomboid_Server_Manager_Docker、pz-crcon | 广播/传送/给物品/玩家管理，**仅 Dedicated Server 生效**，单机 SP 用不了 |
| AI NPC 对话 | zomboid-gpt-companion（GitHub，半成品/B41）、NPC Chat with Me!（3667458787 框架底座）、Pat's NPC - Project Remnants（3738362476，B42.19 alpha 实体队友需 Java agent，对话脚本式非 LLM） | 实体队友可用但对话非真 AI；PZ AI agent 是学术项目 |
| 外部 DM | project-zomboid-ai-companion（Claude/Gemini 当 DM） | 游戏外对话，跟踪世界/写日记 |

**本机决策（2026-08）**：稳优先，不装 alpha mod、不做桥接 → 采用**纯外部 AI 队友**方案：AI 只读存档/日志实时监督+参谋，零 mod 零风险。

### PZ mod 自动化测试工具

| 工具 | 类型 | 流行度 | 特点 |
|------|------|--------|------|
| **PZ Test Runner [B42][MP]** (3678799478) | 游戏内框架 | ⭐⭐⭐ 社区标准 | setup/run/wait/assert 阶段，PZTest API，console.txt 输出，零外部依赖，B42+MP；需进存档触发 `/test` 命令 |
| **ZBSpec** (github.com/zed-0xff/ZBSpec) | 外部 CLI | ⭐ 小众 | BDD 风格 Ruby CLI，无人值守 auto-start→test→exit(0/1)，CI 友好；需 Ruby 2.7+ + ZombieBuddy mod，**Windows 自动启动未实现** |
| **pz-mcp-server** (wink-) | MCP 工具链 | — | search_vanilla/generate_script/validate_script，**只读脚本数据不读运行时状态**，非测试工具 |
| **手动测试** | — | ⭐⭐⭐ 大多数 mod 作者 | 进游戏目测，简单粗暴 |

**本机选择（2026-08）**：三个补丁验证用自测 mod（零依赖），规模扩大再上 PZ Test Runner。

## 对话上下文自动读取（用户问 PZ 问题前先做）

用户无需每次解释 mod/出生点/地图。收到 PZ 相关问题时，自动读取：

1. `C:\Users\pass\Zomboid\latestSave.ini`：两行 = 当前存档时间戳 + 模式（如 `Rising`、`Apocalypse`、`Sandbox`）
2. `Saves\<模式>\<时间戳>\players.db`（SQLite，只读打开 `sqlite3.connect("file:"+db+"?mode=ro", uri=True)`）：
   - `localPlayers` 表：name / wx,wy（世界格）/ x,y,z（精确坐标）/ isDead
   - `data` BLOB 二进制含技能/背包/mod 数据（Fitness、Strength、Axe、AutoLoot 开关、MSR 传送点等）
3. 同目录 `mods.txt`：本存档实际启用的 mod 列表（与 default.txt 可不同）
4. `InGameMap.ini`：`WorldMap.CenterX/Y` 世界坐标（地图中心，非玩家位置）
5. **游戏运行时实时数据**（优先于 players.db 坐标，文件新鲜度=最近修改时间）：
   - `Lua\PZ_Map\data.txt`：`window.PZ_DATA = {"player":{"x":..,"y":..,"z":..,"dx":..,"dy":..}}` 实时精确坐标+朝向（比 players.db 的世界格精确）
   - `Lua\PZ_Map\fog.txt`：已探索迷雾 cell 数据（`"x,y":"000...` 位图，cell 32px）
   - `Lua\PZ_Map\heartbeat.txt`：`window.PZ_BEAT` 含游戏状态(state)/内存(mem.used/total)/版本(engine)/SP/MP
   - `Lua\PZ_Pulse\`（游戏运行时生成）：角色全状态仪表盘数据（技能/负重/装备/健康，纯 JSON）
   - **判断游戏是否在跑**：`Get-Process ProjectZomboid64`；文件 LastWriteTime 距今 >5min 即旧残留，勿当实时数据

- 世界坐标 → 具体地名：PZ_Map 的网页（`file:///C:/Steam/steamapps/workshop/content/108600/3770149036/mods/PZ_Map/42/media/web/index.html`）含完整地图几何可换算，但需要 URL 参数指向数据目录；当前可行做法：读 data.txt 坐标 + 对照 cell 位置估算
- "Rising" 是模组场景模式，非原版五种模式；`mods.txt` 里无 maps 段说明未加地图 mod
- 2026-08-04 实测：能读出角色名、坐标、技能、mod 数据；PZ_Map/PZ_Pulse 数据文件可自动读，无需浏览器 URL

## 存档结构 / 实时只读（外部 AI 队友技术基础）

- 存档路径：`Saves\<模式>\<时间戳>\`（如 `Saves\Apocalypse\2026-08-03_18-52-42`），核心 `.bin` + SQLite `.db` + 明文 `.lua`
- **players.db**（SQLite）：表 `localPlayers`（id/name/wx/wy 世界格/x/y/z 精确坐标/worldversion/data BLOB/isDead）——`sqlite3.connect(r"file:"+db+"?mode=ro", uri=True)` 只读打开，**游戏运行时可并发读**；data BLOB 含背包/状态为二进制需解析
- **vehicles.db**（SQLite）：车辆数据
- **WorldDictionaryReadable.lua**：全物品/配方明文字典（~1.1MB）
- **latestSave.ini**：指向当前活动存档（两行：时间戳 + 模式）
- **console.txt**：实时日志（报错/事件/mod 行为）
- **AutoEverything 分类结构（2026-08-05 重排）**：9 大分类——自动进食/自动饮水/自动开灯（原感应灯）/自动关窗/自动拾取（含子分组：自动拾取设置、无限背包、避难所商店）/自动开门（原自动开关门）/自动收纳/自动装备/自动反击（含子分组：推搡连锁）。无限背包与避难所商店从独立分类并入「自动拾取」子分组（`addTitle` 子标题挂主分类），选项 id 不变设置自动保留；固定设施（浴盆/洗手盆/马桶，不在 `scripts/generated/items/moveable.txt`）无通用重建 API，不做收纳（稳定优先）
- 读策略：只读 URI 规避写锁；读失败自动重试；PowerShell 下复杂 Python 写 .py 脚本执行（`python -c` 多层引号会炸）
