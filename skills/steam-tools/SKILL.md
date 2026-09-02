---
name: steam-tools
description: "Steam 工具：Workshop 合集快照/steamcmd 批量下载/本机目录与 PZ/RimWorld 集成（Junction/mod 排序/翻译/JVM）。触发词：Steam/Workshop/steamcmd/Junction/appid 294100/108600/mod.info/default.txt"
---

# Skill: steam-tools

Steam Workshop 与本机目录操作闭环。**遇 Workshop/订阅/下载验证、mod 排序/翻译、Junction 时必须用本 skill。**

> Valid-Until: 2026-08 验证 | Source-Config: C:\Steam + Workshop appid 108600/294100

## 触发时机

- 用户说：Steam、Workshop、steamcmd、合集、订阅、mod 排序、Junction、PZ mod、RimWorld Mods

## 工作流（6 步）

1. **合集**：`references/workshop.md:1` 快照机制 + GetCollectionDetails 展开
2. **订阅**：GUI Subscribe 或 steamcmd +login anonymous 匿名批量（直连，$env:HTTPS_PROXY=""）
3. **验证**：计数 `C:\Steam\steamapps\workshop\content\<appid>\` 与 `appworkshop_<appid>.acf:SizeOnDisk`
4. **本机**：`references/local-setup.md:1` 读注册表 InstallPath、config.vdf、用户目录
5. **集成**：
   - PZ：`Zomboid\mods\default.txt` 排序 + `42.15\media\lua\shared\Translate\<LANG>\UI.json`（IGUI_/UI_ 分离，UTF-8 无 BOM）
   - RimWorld：Junction `common\RimWorld\Mods -> workshop\content\294100`
6. **维护**：JVM `-Xmx`、日志 `console.txt/Player.log`、编辑 Workshop mod 后用 steamcmd 还原

## 详细文档

- [steamcmd.md](references/steamcmd.md) — 定位/代理坑/匿名批量
- [workshop.md](references/workshop.md) — 合集机制与官方 API
- [local-setup.md](references/local-setup.md) — 本机目录与游戏集成

> 详见 .learnings DOC-project-zomboid / DOC-rimworld 及 20+ 实测条目。
