# 玩法模板库（6 类）

> 本文件提供 6 类玩法模板，每类包含数值体系、标签体系、AI 提示词要点。按题材选用。

## 目录

- [T1. 末日生存](#t1-末日生存)
- [T2. 修真 RPG](#t2-修真-rpg)
- [T3. 经营养成](#t3-经营养成)
- [T4. 冒险探索](#t4-冒险探索)
- [T5. 单角色叙事](#t5-单角色叙事)
- [T6. 审批/审核](#t6-审批审核)
- [模板对比](#模板对比)

---

## T1. 末日生存

**核心循环**：探索→收集→消耗→生存→推进剧情。

### 数值体系

| 数值 | 范围 | 作用 | 衰减 |
|------|------|------|------|
| HP | 0-100 | 生命，归零死亡 | 受伤/饥饿/口渴 |
| 饥饿 | 0-100 | 饱食度，归零开始扣 HP | 每天扣 20 |
| 口渴 | 0-100 | 水分，归零开始扣 HP | 每天扣 30 |
| 体力 | 0-100 | 行动力，归零无法探索 | 每次行动扣 10 |
| 天数 | 1+ | 时间推进 | 每天结算 |

### 标签体系

```xml
<{prefix}-player>
  <{prefix}-stat name="HP" value="80/100"/>
  <{prefix}-stat name="饥饿" value="60/100"/>
  <{prefix}-stat name="口渴" value="40/100"/>
  <{prefix}-stat name="体力" value="70/100"/>
  <{prefix}-stat name="天数" value="3"/>
</{prefix}-player>

<{prefix}-scene>废弃超市，货架大多被洗劫，角落有可疑声响。</{prefix}-scene>

<{prefix}-choice>
  <{prefix}-choice-item>搜索货架（消耗体力10）</{prefix}-choice-item>
  <{prefix}-choice-item>查看声响来源（风险高）</{prefix}-choice-item>
  <{prefix}-choice-item>离开这里</{prefix}-choice-item>
</{prefix}-choice>
```

### AI 提示词要点

- 每轮必须输出 `<{prefix}-player>` 显示当前数值
- 选项要标注消耗和风险
- 数值变化要明确（"饥饿 -20"）
- HP 归零触发死亡结局
- 每 3 天推进一次主线事件

---

## T2. 修真 RPG

**核心循环**：修炼→突破→历练→获得资源→更强修炼。

### 数值体系

| 数值 | 作用 | 进阶 |
|------|------|------|
| 境界 | 练气→筑基→金丹→元婴→化神 | 突破需 EXP 满 |
| EXP | 修炼/历练获得 | 满 100 可突破 |
| 灵力 | 释放功法消耗 | 修炼恢复 |
| 悟性 | 影响修炼速度 | 固定值 |
| 道行 | 影响突破成功率 | 历练增加 |

### 标签体系

```xml
<{prefix}-player>
  <{prefix}-stat name="境界" value="筑基中期"/>
  <{prefix}-stat name="EXP" value="45/100"/>
  <{prefix}-stat name="灵力" value="80/120"/>
  <{prefix}-stat name="道行" value="120年"/>
</{prefix}-player>

<{prefix}-scene>青云宗·藏经阁，你翻阅《太虚剑诀》残卷。</{prefix}-scene>

<{prefix}-dialogue who="npc" name="师兄">师弟，此剑诀需悟性 80 方可入门，你悟性几何？</{prefix}-dialogue>

<{prefix}-choice>
  <{prefix}-choice-item>弟子悟性 85，愿一试</{prefix}-choice-item>
  <{prefix}-choice-item>先修炼基础剑法积累 EXP</{prefix}-choice-item>
</{prefix}-choice>
```

### AI 提示词要点

- 境界突破要有仪式感（描述天劫/心魔）
- 功法/法宝用品质着色（K.2）
- 历练事件随机化（探索/奇遇/危机）
- 突破失败有惩罚（道行倒退/走火入魔）

---

## T3. 经营养成

**核心循环**：经营→收入→升级→扩张→更多收入。

### 数值体系

| 数值 | 作用 |
|------|------|
| 金币 | 通用货币 |
| 天数 | 时间推进 |
| 声望 | 影响客流量 |
| 员工数 | 影响产能 |
| 设施等级 | 影响收入 |

### 标签体系

```xml
<{prefix}-player>
  <{prefix}-stat name="金币" value="500"/>
  <{prefix}-stat name="天数" value="3"/>
  <{prefix}-stat name="声望" value="12"/>
</{prefix}-player>

<{prefix}-multichoice submit="今日安排">
  <{prefix}-multichoice-item>升级设施（-200金币，+声望）</{prefix}-multichoice-item>
  <{prefix}-multichoice-item>招募员工（-150金币，+产能）</{prefix}-multichoice-item>
  <{prefix}-multichoice-item>开展活动（-100金币，+声望）</{prefix}-multichoice-item>
</{prefix}-multichoice>

<{prefix}-custom placeholder="或输入你的安排..."/>
```

### AI 提示词要点

- 每天结算收入（基于设施等级 × 员工数）
- 多选提交后批量执行
- 随机事件（客人投诉/员工离职/商机）
- 长期目标（30 天达到某声望）

---

## T4. 冒险探索

**核心循环**：移动→遭遇→选择→结果→继续探索。

### 数值体系

| 数值 | 作用 |
|------|------|
| HP | 生命 |
| 坐标 | 当前位置（x,y） |
| 已探索 | 探索率 |
| 背包 | 物品列表 |

### 标签体系

```xml
<{prefix}-map cols="5" rows="4" current="7">
  <{prefix}-map-cell id="0" type="wall"/>
  <{prefix}-map-cell id="1" type="path"/>
  <{prefix}-map-cell id="2" type="treasure">宝箱</{prefix}-map-cell>
  <{prefix}-map-cell id="7" type="player">你</{prefix}-map-cell>
</{prefix}-map>

<{prefix}-scene>你站在十字路口，北边是幽暗森林，东边是废弃村庄。</{prefix}-scene>

<{prefix}-choice>
  <{prefix}-choice-item>向北进入森林</{prefix}-choice-item>
  <{prefix}-choice-item>向东进入村庄</{prefix}-choice-item>
  <{prefix}-choice-item>原地休息恢复 HP</{prefix}-choice-item>
</{prefix}-choice>
```

### AI 提示词要点

- 地图用 K.4 网格地图模式
- 移动消耗体力，遭遇随机
- 宝箱/敌人/事件按格子类型
- 探索率 100% 触发结局

---

## T5. 单角色叙事

**核心循环**：对话→选择→好感变化→剧情推进。

### 数值体系

| 数值 | 作用 |
|------|------|
| 好感度 | 0-100，影响剧情走向 |
| 信任 | 0-100，影响信息揭示 |
| 天数 | 对话次数 |

### 标签体系

```xml
<{prefix}-affinity who="艾莉丝" value="45" max="100"/>

<{prefix}-dialogue who="艾莉丝" mood="冷淡">
  ...你来做什么。
</{prefix}-dialogue>

<{prefix}-choice>
  <{prefix}-choice-item>只是路过。</{prefix}-choice-item>
  <{prefix}-choice-item>想见你一面。</{prefix}-choice-item>
  <{prefix}-choice-item>（沉默）</{prefix}-choice-item>
</{prefix}-choice>
```

### AI 提示词要点

- 好感度变化要细腻（+5/+10/-5）
- 对话 mood 影响语气（冷淡/开心/愤怒）
- 高好感解锁隐藏剧情
- 多结局（好感度阈值触发）

---

## T6. 审批/审核

**核心循环**：查看档案→判定→盖章→推进案件。

### 数值体系

| 数值 | 作用 |
|------|------|
| 案件数 | 已处理 |
| 正确率 | 判定准确度 |
| 天数 | 时间推进 |
| 警觉 | 影响隐藏信息揭示 |

### 标签体系

```xml
<{prefix}-player>
  <{prefix}-stat name="案件数" value="12"/>
  <{prefix}-stat name="正确率" value="85%"/>
  <{prefix}-stat name="天数" value="3"/>
</{prefix}-player>

<{prefix}-dossier title="案件 #013">
  <{prefix}-dossier-field name="姓名">张三</{prefix}-dossier-field>
  <{prefix}-dossier-field name="罪名">偷窃</{prefix}-dossier-field>
  <{prefix}-dossier-hidden>关键证据：监控显示...</{prefix}-dossier-hidden>
</{prefix}-dossier>

<{prefix}-choice>
  <{prefix}-choice-item>批准（有罪）</{prefix}-choice-item>
  <{prefix}-choice-item>驳回（无罪）</{prefix}-choice-item>
  <{prefix}-choice-item>要求补充证据</{prefix}-choice-item>
</{prefix}-choice>
```

### AI 提示词要点

- 档案用 K.3 复合面板
- 隐藏区用 K.1 风险选项思路（揭示有代价）
- 判定错误有惩罚（正确率下降）
- 高警觉揭示更多隐藏信息

---

## 模板对比

| 模板 | 核心循环 | 数值数 | 标签复杂度 | 适合 |
|------|----------|--------|------------|------|
| T1 末日生存 | 探索→生存 | 5 | 中 | 生存/末日 |
| T2 修真 RPG | 修炼→突破 | 5 | 中 | 修真/玄幻 |
| T3 经营养成 | 经营→扩张 | 5 | 中（多选） | 经营/模拟 |
| T4 冒险探索 | 移动→遭遇 | 4 | 高（地图） | 冒险/迷宫 |
| T5 单角色叙事 | 对话→好感 | 3 | 低 | 恋爱/悬疑 |
| T6 审批/审核 | 查看→判定 | 4 | 中（档案） | 审核/解谜 |

**选择建议**：
- 末日/生存类 → T1
- 修真/玄幻类 → T2
- 经营/模拟类 → T3
- 冒险/迷宫类 → T4
- 恋爱/悬疑类 → T5
- 审核/解谜类 → T6
