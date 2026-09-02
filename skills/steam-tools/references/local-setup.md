# 本机 Steam 目录操作与 Mod 集成

## Steam 目录结构

```
C:\Steam\
├── steam.exe
├── steamapps\
│   ├── common\<game>\         # 游戏本体
│   └── workshop\content\<appid>\  # Workshop mod（按 appid 分）
├── config\config.vdf
└── userdata\<steamid3>\        # 用户配置/云存档
```

## 常用只读操作

```powershell
# Steam 安装路径（注册表）
(Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam").InstallPath

# 已下载 Workshop item 数
(Get-ChildItem "C:\Steam\steamapps\workshop\content\294100" -Directory).Count

# 下载状态（acf）
Get-Content "C:\Steam\steamapps\workshop\appworkshop_294100.acf" | Select-String "SizeOnDisk|NeedsDownload|TimeLastUpdated"
```

## Mod 启用文件

| 游戏 | 启用列表文件 | 格式 |
|------|-------------|------|
| Project Zomboid | `C:\Users\pass\Zomboid\mods\default.txt` | `mod = <id>,` |
| RimWorld | 游戏内管理（破解版读 `Mods\` 目录） | — |

### PZ default.txt 重建流程
1. 扫描 `workshop\content\108600` 全部 item 的**所有** `mod.info`，提取 `id=`
2. 与作者排序文本（分号分隔）比对，确保无缺失
3. 严格按排序文本顺序写入 `mods\default.txt`（顺序即加载顺序）
4. `maps` 区：未要求则留空

### PZ 本地 mod 移除（非 Workshop）
1. 删除 `Zomboid\mods\<id>\` 整个目录
2. 从 `mods\default.txt` 移除 `mod = <id>,` 行
3. 更新知识条目（记忆库检索 tag `doc:project-zomboid`）
4. **不要手动改**存档 `mods.txt` / `ModListData.ini` / `HistoryData.cfg` —— 游戏启动/加载时自动同步

### PZ 翻译 / 汉化（key 前缀 schema，详见 SKILL.md 本地化小节）
- 翻译文件：`mods\<name>\common\media\lua\shared\Translate\<LANG>\`；42.15+ 只读 **JSON 且文件名不带语言代码**（`CN\UI.json` / `CN\IG_UI.json`），旧 `.txt`（`UI_EN.txt` 等）不读取
- **key 前缀必须匹配文件名**：`IGUI_` → `IG_UI.json`、`UI_` → `UI.json`；放错文件整个 key 被丢弃 → 选项界面 fallback 英文
- JSON 必须 **UTF-8 无 BOM**；改完翻译文件**重启游戏**生效

### PZ JVM 内存
大合集默认 `-Xmx3072m` 不足，改为内存一半：
- `ProjectZomboid64.bat`：`-Xmx3072m` 出现**两处**（主命令 + IF 失败重试）
- `ProjectZomboid64.json`：`vmArgs` 内一处
- 32G 内存 → `-Xmx16384m`

## RimWorld 破解环境

- **Junction 链接**：破解 DLL 破坏 SteamUGC API 后，游戏只读 `Mods\` 目录：
  ```powershell
  New-Item -ItemType Junction -Path "C:\Steam\steamapps\common\RimWorld\Mods" -Target "C:\Steam\steamapps\workshop\content\294100"
  ```
  免管理员；验证两目录 item 数相等。
- **破解 DLL 判断**：`steam_api64.dll` 11MB = 补丁版（解锁 DLC），295KB = 原版。判断前对比 `.dll` 与 `.bak` 哪个与 Steam 目录一致。

## 游戏日志

| 游戏 | 日志位置 |
|------|---------|
| RimWorld | `C:\Users\pass\AppData\LocalLow\Ludeon Studios\RimWorld by Ludeon Studios\Player.log` |
| Project Zomboid | `C:\Users\pass\Zomboid\console.txt`；DebugLog 在 `Zomboid\Logs\` |
