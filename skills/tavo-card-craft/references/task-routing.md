# 任务路由决策表（详解）

> 本文件是 SKILL.md 第一部分 决策表的展开版。当 SKILL.md 的速查表无法定位时，读本文件。

## 一、意图识别决策树

```
用户输入
  │
  ├─ 含"做/建/新建/创建" + "卡" → 生成类任务
  │     ├─ 含"简单/快速/随便" → basic-mode 生成
  │     └─ 含"深度/定制/复杂" → pro-mode 生成
  │
  ├─ 含"修仙/末日/公司/剧本/玩法/RP" → 玩法类任务
  │     └─ 读 gameplay-templates.md + three-piece-spec.md
  │
  ├─ 含"美化/好看/前端/渲染/UI/CSS" → 美化类任务
  │     └─ 读 visual-style-guide.md（CSS 单一信源）
  │
  ├─ 含"状态/存档/变量/持久化" → 状态类任务
  │     └─ 读 state-persistence.md + js-api-guide.md
  │
  ├─ 含"遮罩/overlay/弹窗/覆盖" → 遮罩类任务
  │     └─ 读 overlay-pattern.md + pitfall-library.md
  │
  ├─ 含"JS/脚本/事件/扩展标签" → 脚本类任务
  │     └─ 读 js-api-guide.md + extended-tag-modes.md
  │
  ├─ 含"报错/不显示/失败/白屏/崩" → 排错类任务
  │     └─ 读 error-library.md + debug-workflow.md
  │
  ├─ 含"迁移/改卡/冲突/共存" → 边界类任务
  │     └─ 读本文件 第二部分/第三部分/第四部分
  │
  └─ 含"示例/参考/例子" → 参考类任务
        └─ 读 example-cards.md
```

## 二、迁移已有卡流程

当用户上传一张已有卡要求修改/迁移时：

1. **体检**：先运行 `python scripts/validate_card.py <card.json>`，记录所有 warning/error。
2. **结构识别**：读取 JSON，识别三件套是否齐全（description / first_mes / alternate_greetings）。
3. **范式识别**：扫描 CSS/HTML，匹配 `visual-style-guide.md` 第6节 的 5 种范式之一。
4. **状态识别**：检查是否含 `getState`/`setState` 调用，判断是否为状态卡。
5. **改造方案**：根据用户需求，对照 `pitfall-library.md` 排查潜在风险。
6. **输出**：改完后必须重跑 `validate_card.py`，输出到 `/home/z/my-project/download/`。

**禁止**：未体检直接改卡。已有卡可能携带历史包袱（旧版字段、冲突变量），盲改必崩。

## 三、卡冲突排查流程

当用户反馈"卡不工作""渲染异常""状态丢失"时：

1. **复现**：让用户提供触发场景与报错截图（如有）。
2. **分类**：按 `error-library.md` 的错误码分类定位。
3. **隔离**：禁用其他卡，单独加载本卡测试，排除多卡冲突。
4. **日志**：开启 ST 控制台，捕获 JS 错误堆栈。
5. **对照**：按 `debug-workflow.md` 的 5 步流程逐步排查。
6. **修复**：定位到根因后，对照 `pitfall-library.md` 找对应修复方案。
7. **回归**：修复后重跑 `validate_card.py` + `render-checklist.md` 自检。

## 四、多卡共存规范

当用户的卡组中存在多张本 skill 生成的卡时：

1. **UUID 唯一性**：每张卡必须用 `gen_uuid.py` 生成独立 UUID，禁止复用。
2. **变量命名空间隔离**：状态变量必须加卡名前缀，例如 `<cardName>_state_<key>`，避免互相覆盖。
3. **CSS 作用域隔离**：所有自定义 CSS 必须包裹在 `#<cardUUID>-root` 选择器内，禁止全局样式泄漏。
4. **事件监听器清理**：JS 脚本必须在 `onUnload` 中移除所有事件监听器，防止内存泄漏与重复触发。
5. **遮罩 z-index 分层**：多卡同时弹遮罩时，按卡加载顺序分配 z-index 区间（卡 A: 10000-10999，卡 B: 11000-11999）。
6. **存档 key 隔离**：localStorage / 变量存档 key 必须含卡 UUID 后缀。

**违反任一条都会导致多卡互相污染**，这是实战中最常见的崩溃源。

## 五、basic-mode vs pro-mode 选择标准

| 信号 | 推荐模式 |
|------|----------|
| 用户说"随便""简单""快速""先来一张" | basic-mode |
| 用户只给一句话描述（如"做个傲娇学姐"） | basic-mode |
| 用户说"深度""定制""复杂""完整" | pro-mode |
| 用户给出详细人设/世界观/玩法说明 | pro-mode |
| 用户要求特定视觉范式/状态系统/遮罩 | pro-mode |
| 不确定 | 先问一句"要快速版还是深度版？" |

## 六、文件读取预算

为避免 token 浪费，每次任务的 reference 读取预算：

| 任务类型 | 最大读取文件数 |
|----------|----------------|
| basic-mode 生成 | 2 个（three-piece-spec + visual-style-guide 第6节） |
| pro-mode 生成 | 3 个（three-piece-spec + question-engine + 视觉/玩法二选一） |
| 排错 | 2 个（error-library + debug-workflow） |
| 迁移 | 2 个（本文件 第二部分 + pitfall-library） |
| 美化 | 2 个（visual-style-guide + css-library） |

**超预算时**：先完成当前任务，再按需补读，不要一次性堆读。
