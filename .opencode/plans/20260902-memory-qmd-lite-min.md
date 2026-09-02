# 计划：只给小本本加“搜一句就能找到”（qmd-lite 最小版）

> 状态：Plan 只读，已获口头 ok，待 plan_exit 批准后切 Build 执行
> 前情：分享 WFKSLfg8 已 809→200 精炼并停用 opencode-mem 向量库（267MB→归档），本次不复活向量，只做纯文件搜索
> 目标一句话：以后你问“DNS那个坑咋修的”，1秒回到 LEARNINGS 200条里那条，而不是靠 grep 死翻

---

## 1. 改前 / 改后 框图（AGENTS.md 16 要求）

```
改前（现在，Plan 只读核验）：
  ┌─────────────────────────────────┐
  │ 你： “上次DNS坑咋修的？”         │
  │  ↓                               │
  │ grep -ri "DNS" .learnings/      │  只能字面匹配，搜“主路由屏蔽”漏掉
  │  → 翻 200条 + 归档 600条          │  耗时 5-10秒，靠人肉拼关键词
  │  → 常漏同义/口语                  │
  └─────────────────────────────────┘

改后（本计划，Build 后）：
  ┌─────────────────────────────────┐
  │ 你： “DNS那个坑咋修的？”         │  口语也行
  │  ↓                               │
  │ qmd-lite 搜 .learnings/*.md     │  位置：本地 SQLite 单文件 `~/.cache/qmd-lite/index.db`
  │  索引：FTS5 关键词 + 标题加权     │  尺寸：<5MB，零模型，纯文件
  │  结果：LRN-20260901-015 (WLAN切  │  颜色：结果高亮 path:line，点开即 LEARNINGS.md:xxx
  │         192.168.3.100) + 2条相关   │  交互：`qmd-lite "关键词"` 或对话里自动提示“搜到3条要看吗？”
  │  耗时：<0.3秒                      │
  └─────────────────────────────────┘
溢出处理：结果>5条折叠，只显 Top5，余下“还有7条，展开？”；无结果回退 grep
```

---

## 2. 只改 3 处（最小侵入，零向量、零常驻）

| 序号 | 文件 | 动作 | 说明 |
|------|------|------|------|
| 1 | `scripts/qmd-lite.js` | **新增** 80行 | 纯 JS：建 `fts5(path,title,body)` + `rg` 兜底 + 简单排名（标题×2 + 近期×1.2），返回 `path:line`，`--no-model` 无向量 |
| 2 | `skills/memory/SKILL.md` | **追加 10行** | 加“搜前必 qmd-lite”一句：本地文件可能含答案时先 `node scripts/qmd-lite.js "问句"` 再 web_search |
| 3 | `plugins/self-improvement.js` | **追加 15行** | `system.transform` 注入检索提示 + `session.idle` 每周 `node scripts/qmd-lite.js --update` 增量索引（m time 比对，不常驻） |

**不改：** `opencode-mem.jsonc`（已停用不管）、`AGENTS.md`（仅口径复用先网后本）、`LEARNINGS.md`（只读被搜）

---

## 3. 步骤（Build 后 0.5 天）

1. `node scripts/qmd-lite.js --init` 扫 `.learnings/*.md + AGENTS.md` 建 `~/.cache/qmd-lite/index.db`（<5MB）
2. 手测：`node scripts/qmd-lite.js "DNS坑"` vs `grep -ri DNS .learnings/` 对比召回（预期 qmd 多回 1-2条同义）
3. 对话验证：问“上次那个主路由屏蔽咋修的” → 看是否 1秒回 LRN-20260901-015

---

## 4. 验证（只读可复现）

- [ ] `grep -c "Pattern-Key" .learnings/LEARNINGS.md` 基数（当前 ~10+）
- [ ] `node scripts/qmd-lite.js "DNS"` 返回 `LEARNINGS.md:xxx` 且含 `192.168.3.100`
- [ ] 同问用 grep 仅回 1条，qmd 回 3条（含“主路由/屏蔽”同义）
- [ ] `ls ~/.cache/qmd-lite/index.db` <5MB，无额外端口/模型

---

## 5. 风险与回滚

- 风险：低。纯文件 FTS5，无 547MB 模型，无 4747 端口，无 OOM；索引坏删 `index.db` 重建即可
- 回滚：删 `scripts/qmd-lite.js` + `~/.cache/qmd-lite/` + SKILL.md 那10行，1分钟回改前
- 不做：不装 `@tobilu/qmd` 1GB 模型、不引 LanceDB/Chroma、不复活 opencode-mem

---

## 6. 待你拍板

- 本计划批准后直接切 Build 执行 1-3 步，无需再搜（已满足先网后本四路验证）
- 若不做，保持现状也无损（仅继续 grep 死搜）

