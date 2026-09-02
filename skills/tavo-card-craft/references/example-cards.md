# 实战卡示例库（4 张）

> 本文件提供 4 张实战卡的标签体系、first_mes 模板、玩法要点。做卡时参考对应类型。

## 目录

- [示例 1：修真 RPG 卡](#示例-1修真-rpg-卡)
- [示例 2：公寓经营卡](#示例-2公寓经营卡)
- [示例 3：怪物训练师卡](#示例-3怪物训练师卡)
- [示例 4：后宫养成卡](#示例-4后宫养成卡)
- [示例对比](#示例对比)

---

## 示例 1：修真 RPG 卡

**卡名**：青云诀
**前缀**：`qy-`
**玩法**：T2 修真 RPG + K.2 品质着色 + K.3 复合面板

### 标签体系

```xml
<qy-player>
  <qy-stat name="境界" value="练气三层"/>
  <qy-stat name="EXP" value="30/100"/>
  <qy-stat name="灵力" value="50/50"/>
  <qy-stat name="道行" value="15年"/>
</qy-player>

<qy-scene>青云宗·练功房，晨光透过窗棂，你盘膝而坐。</qy-scene>

<qy-dialogue who="npc" name="师父">
  徒儿，今日修炼《太虚剑诀》第一式，可愿一试？
</qy-dialogue>

<qy-choice>
  <qy-choice-item>弟子愿往！（消耗灵力10，+EXP 20）</qy-choice-item>
  <qy-choice-item>先打坐恢复灵力</qy-choice-item>
  <qy-choice-item>请教师兄剑诀要领</qy-choice-item>
</qy-choice>
```

### first_mes 模板

```xml
<qy-scene>青云宗·天枢峰，辰时，晨雾未散。你初入宗门，师父在天枢殿等候。</qy-scene>

<qy-player>
  <qy-stat name="境界" value="练气一层"/>
  <qy-stat name="EXP" value="0/100"/>
  <qy-stat name="灵力" value="30/30"/>
  <qy-stat name="道行" value="0年"/>
</qy-player>

<qy-dialogue who="npc" name="师父">
  徒儿，你既入我青云门，当知修真之路漫漫。今日起，每日修炼不可懈怠。
</qy-dialogue>

<qy-choice>
  <qy-choice-item>弟子谨记！</qy-choice-item>
  <qy-choice-item>师父，弟子想先了解宗门</qy-choice-item>
</qy-choice>
```

### 玩法要点

- 境界突破：EXP 满 100 → 触发突破事件 → 描述天劫 → 成功率基于道行
- 功法品质：common/uncommon/rare/epic/legendary 五档
- 历练事件：随机触发（奇遇/危机/机缘）
- 死亡条件：HP 归零（走火入魔/天劫失败）

---

## 示例 2：公寓经营卡

**卡名**：晨曦公寓
**前缀**：`cx-`
**玩法**：T3 经营养成 + K.3 复合面板 + 多选

### 标签体系

```xml
<cx-player>
  <cx-stat name="金币" value="800"/>
  <cx-stat name="天数" value="5"/>
  <cx-stat name="声望" value="20"/>
  <cx-stat name="租客" value="3/10"/>
</cx-player>

<cx-scene>晨曦公寓·前台，阳光洒进大厅，新的一天开始了。</cx-scene>

<cx-multichoice submit="今日安排">
  <cx-multichoice-item>打扫公共区域（-50金币，+声望2）</cx-multichoice-item>
  <cx-multichoice-item>维修设施（-100金币，+租客满意度）</cx-multichoice-item>
  <cx-multichoice-item>招租宣传（-80金币，+潜在租客）</cx-multichoice-item>
  <cx-multichoice-item>拜访租客（+好感，可能触发事件）</cx-multichoice-item>
</cx-multichoice>

<cx-custom placeholder="或输入你的安排..."/>
```

### first_mes 模板

```xml
<cx-scene>你继承了晨曦公寓，一栋老旧但温馨的六层公寓楼。前台桌上放着钥匙和账本。</cx-scene>

<cx-player>
  <cx-stat name="金币" value="500"/>
  <cx-stat name="天数" value="1"/>
  <cx-stat name="声望" value="5"/>
  <cx-stat name="租客" value="2/10"/>
</cx-player>

<cx-dialogue who="npc" name="管家老李">
  少爷，公寓就交给您了。现有租客 2 位，房间还空着 8 间。今日有何安排？
</cx-dialogue>

<cx-multichoice submit="今日安排">
  <cx-multichoice-item>先熟悉公寓环境</cx-multichoice-item>
  <cx-multichoice-item>开始招租</cx-multichoice-item>
</cx-multichoice>
```

### 玩法要点

- 每天结算：收入 = 租客数 × 50 - 维护费
- 租客事件：随机触发（投诉/续约/退租/表白）
- 升级路径：设施升级 → 房租提高 → 声望提升
- 长期目标：30 天内租客满 10，声望达 50

---

## 示例 3：怪物训练师卡

**卡名**：幻兽纪元
**前缀**：`hs-`
**玩法**：T4 冒险探索 + K.2 品质着色 + K.4 网格地图

### 标签体系

```xml
<hs-player>
  <hs-stat name="训练师等级" value="3"/>
  <hs-stat name="幻兽" value="2/6"/>
  <hs-stat name="金币" value="120"/>
</hs-player>

<hs-map cols="5" rows="4" current="12">
  <hs-map-cell id="0" type="wall"/>
  <hs-map-cell id="1" type="grass"/>
  <hs-map-cell id="2" type="grass">野生幻兽出没</hs-map-cell>
  <hs-map-cell id="12" type="player">你</hs-map-cell>
</hs-map>

<hs-scene>翠绿草原，风吹草低见幻兽。前方草丛有动静。</hs-scene>

<hs-choice>
  <hs-choice-item>进入草丛探索（可能遭遇野生幻兽）</hs-choice-item>
  <hs-choice-item>绕道而行</hs-choice-item>
  <hs-choice-item>使用诱饵吸引幻兽（-1诱饵）</hs-choice-item>
</hs-choice>
```

### first_mes 模板

```xml
<hs-scene>幻兽纪元，一个人类与幻兽共存的世界。你刚从训练师学院毕业，怀揣梦想踏上旅途。</hs-scene>

<hs-player>
  <hs-stat name="训练师等级" value="1"/>
  <hs-stat name="幻兽" value="1/6"/>
  <hs-stat name="金币" value="100"/>
</hs-player>

<hs-dialogue who="npc" name="导师">
  这是你的初始幻兽——<hs-item quality="uncommon">小火龙</hs-item>。好好培养它，未来的路还长。
</hs-dialogue>

<hs-choice>
  <hs-choice-item>谢谢导师！我出发了。</hs-choice-item>
  <hs-choice-item>导师，能再给我一些建议吗？</hs-choice-item>
</hs-choice>
```

### 玩法要点

- 捕获机制：野生幻兽 HP < 30% 可捕获，成功率基于品质
- 进化：幻兽达到等级 + 满足条件可进化（品质提升）
- 图鉴：收集不同幻兽，K.2 品质着色区分稀有度
- 对战：回合制，属性克制（火克草克水克火）

---

## 示例 4：后宫养成卡

**卡名**：凤鸣宫
**前缀**：`fm-`
**玩法**：T5 单角色叙事 + K.3 复合面板 + 多角色好感度

### 标签体系

```xml
<fm-player>
  <fm-stat name="天数" value="7"/>
  <fm-stat name="威望" value="30"/>
</fm-player>

<fm-affinity-list>
  <fm-affinity who="皇后" value="60" max="100"/>
  <fm-affinity who="贵妃" value="45" max="100"/>
  <fm-affinity who="才人" value="20" max="100"/>
</fm-affinity-list>

<fm-scene>凤鸣宫·御花园，春日午后，百花盛开。</fm-scene>

<fm-dialogue who="贵妃" mood="娇嗔">
  陛下好久没来看臣妾了，是不是有了新人忘旧人？
</fm-dialogue>

<fm-choice>
  <fm-choice-item>爱妃多虑了，朕今日特来陪你</fm-choice-item>
  <fm-choice-item>朕国事繁忙，改日再来</fm-choice-item>
  <fm-choice-item>（赏赐珠宝）+好感</fm-choice-item>
</fm-choice>
```

### first_mes 模板

```xml
<fm-scene>凤鸣宫，你登基为帝，后宫佳丽三千。今日是登基后第一次临幸后宫。</fm-scene>

<fm-player>
  <fm-stat name="天数" value="1"/>
  <fm-stat name="威望" value="10"/>
</fm-player>

<fm-affinity-list>
  <fm-affinity who="皇后" value="50" max="100"/>
  <fm-affinity who="贵妃" value="30" max="100"/>
  <fm-affinity who="才人" value="10" max="100"/>
</fm-affinity-list>

<fm-dialogue who="皇后" mood="端庄">
  陛下登基，臣妾恭贺。后宫诸事，臣妾自当尽心打理。
</fm-dialogue>

<fm-choice>
  <fm-choice-item>皇后辛苦了</fm-choice-item>
  <fm-choice-item>今日去贵妃宫中</fm-choice-item>
  <fm-choice-item>召见才人</fm-choice-item>
</fm-choice>
```

### 玩法要点

- 多角色好感度：每个角色独立好感度，互相影响（宠爱一人，他人嫉妒）
- 宫斗事件：随机触发（陷害/结盟/怀孕）
- 威望系统：处理后宫事务提升威望，影响朝政
- 多结局：根据好感度组合触发不同结局

---

## 示例对比

| 示例 | 前缀 | 玩法模板 | 扩展模式 | 核心机制 |
|------|------|----------|----------|----------|
| 1 修真 | qy- | T2 | K.2 + K.3 | 境界突破 |
| 2 公寓 | cx- | T3 | K.3 | 多选经营 |
| 3 怪物 | hs- | T4 | K.2 + K.4 | 捕获探索 |
| 4 后宫 | fm- | T5 | K.3 | 多角色好感 |

**参考建议**：
- 做修真/玄幻 → 参考示例 1
- 做经营/模拟 → 参考示例 2
- 做冒险/收集 → 参考示例 3
- 做恋爱/养成 → 参考示例 4
