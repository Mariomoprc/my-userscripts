# RimWorld（边缘世界）配置指南

- **安装路径**：`C:\Steam\steamapps\common\RimWorld`
- **版本**：1.6.4871（正版本体 + 破解 DLC）
- **Workshop Mod 目录**：`C:\Steam\steamapps\workshop\content\294100`
- **Mods 目录**：`C:\Steam\steamapps\common\RimWorld\Mods`（Junction 指向 Workshop）
- **用途**：RimWorld 破解 DLC + Mod 集成的整体配置备忘

## 破解 DLC

- 来源：`https://h.juij.fun/game/rimworld-边缘世界/`，5 个 DLC 数据复制到 Steam Data 目录
- **判定补丁**：`steam_api64.dll` 大文件（11MB）= 解锁补丁版，小文件（295KB）= 原版
- 替换补丁 DLL 后 DLC 全部识别

## Workshop Mod 集成（Junction 方案）

破解 `steam_api64.dll` 会破坏 SteamUGC API，游戏不再自动读 Workshop，只认 `Mods\` 目录。

换合集流程（免管理员，用 Junction 而非硬链接）：
```powershell
# 删旧建新，把 Mods 链接到 Workshop
New-Item -ItemType Junction -Path "C:\Steam\steamapps\common\RimWorld\Mods" -Target "C:\Steam\steamapps\workshop\content\294100"
# 验证两目录内项数相等
```
- DDS 写在 Workshop 源目录，Junction 无需重建
- 当前合集：多种族轻量版 [2.0]（id=3724074964，409 Mod，已下架但已收藏），用户选择内置自动排序

## 贴图 DDS 转换（降内存）

详见 [`docs/rimsort-todds.md`](rimsort-todds.md)。要点：
- 用 RimSort 自带 todds 裸调（CLI flags 全部失效）
- BC7 要求宽高为 4 倍数，非 4 倍数贴图需先用 System.Drawing 补位

## 常见问题

- **教程提示卡住不推进**（如「请在种植区内选择「水稻」」）：Learning Helper 在大 Mod 包下检测失效，操作实际已成功（看种植区面板确认）。点提示条 × 或按 Esc 跳过，纯引导不影响游戏
- **种植后殖民者不去种**：检查工作选项卡是否勾选「种植」、管制是否允许进入该区域、优先级是否够高
- **DLC 不识别**：确认 `steam_api64.dll` 是 11MB 补丁版（295KB 是原版）
- **游戏不识别 Workshop Mod**：破解 DLL 破坏集成，需重建 Mods Junction 到 Workshop
