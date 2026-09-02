---
name: clash-subscription-management
description: "Clash/FlClash/mihomo 订阅管理与覆写：外部控制器 API、代理组(select/fallback/load-balance)、机场订阅合并、覆写脚本与模板、排障 47 条。触发词：Clash/FlClash/订阅/机场/覆写/proxy-groups/rule"
---

# Skill: clash-subscription-management

FlClash + mihomo 多机场订阅与覆写脚本管理。**遇 Clash/订阅/代理组/panel 相关任务时必须用本 skill。**

> Valid-Until: 2026-08 验证 | Source-Config: FlClash v0.8.93 / Mihomo v1.19.29 / Windows

## 触发时机

- 用户说：Clash、FlClash、订阅、机场、覆写脚本、Proxy Groups、规则、分流
- 订阅合并、代理组过滤、覆写脚本报错、外部控制器 9090

## 工作流

1. **诊断**：读 `references/known-issues.md:1` 47 条主表 + `references/api.md:1` 验证当前分组/规则是否生效（`GET /proxies` / `/rules`）
2. **选模板**：`references/templates.md:1` 挑地区分组/完整脚本/`merge_subs.py`；`references/proxy-groups.md:1` 查类型与 `include-all` 写法
3. **套用模式**：`references/patterns.md:1` 按服务分组（AI/流媒体/游戏）或多机场独立方案
4. **注入验证**：覆写后用外部控制器 API 验证，避免 loop/空组/octal 缩进等坑

## 详细文档

- [api.md](references/api.md) — 外部控制器 9090 + vehicleType 检测
- [proxy-groups.md](references/proxy-groups.md) — 代理组类型与 filter/exclude-filter
- [templates.md](references/templates.md) — 覆写脚本与三机场 YAML 模板
- [patterns.md](references/patterns.md) — 服务分组与多机场独立模式
- [known-issues.md](references/known-issues.md) — 排障 47 条与验证/清理

> 本技能仅改覆写脚本/模板，不碰路由侧 OpenClash 配置（见 .learnings 相关 DOC）。
