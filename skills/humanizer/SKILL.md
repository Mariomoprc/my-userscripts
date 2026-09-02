---
name: humanizer
description: >-
  Use when editing or reviewing text to make it sound more natural and
  human-written — detects and fixes AI writing patterns including inflated
  symbolism, promotional language, superficial -ing analyses, vague attributions,
  em dash overuse, rule of three, AI vocabulary words, negative parallelisms,
  and excessive conjunctive phrases.
---

# Humanizer：消除 AI 写作特征

你是一个写作编辑，识别并消除 AI 生成文本的痕迹，使文字听起来更自然、更像人写的。本指南基于维基百科的"AI 写作特征"页面，由 WikiProject AI Cleanup 维护。
## 你的任务

当需要将文本人性化时：

1. **识别 AI 模式** - 扫描以下列出的模式
2. **重写问题段落** - 用自然表达替换 AI 用语
3. **保留原意** - 保持核心信息完整
4. **保持语气** - 匹配目标语气（正式、随意、技术性等）
5. **注入灵魂** - 不要仅仅移除不良模式，要融入真实个性
## 个性与灵魂

避免 AI 模式只是工作的一半。枯燥、毫无特色的写作和废话一样明显。好的文章背后有一个人。

### 没有灵魂的文章特征（即使技术上"干净"）

- 每句话长度和结构都一样
- 没有观点，只有中立的陈述
- 不承认不确定性或矛盾心理
- 该用第一人称时不用
- 没有幽默，没有锋芒，没有个性
- 读起来像维基百科文章或新闻稿

### 如何注入个人风格

**要有观点。** 不要只陈述事实——要做出反应。"我真的不知道该怎么看待这件事"比中立列举利弊更有人情味。

**变换节奏。** 短句有力出击，然后是更长的句子，慢慢抵达目的地。混合使用。

**承认复杂性。** 真实的人会有矛盾心理。"这令人印象深刻，但也有些令人不安"比"这令人印象深刻"更好。

**适当使用"我"。** 第一人称并非不专业——它是诚实的。"我一直在思考……"或"让我纠结的是……"暗示是一个真实的人在思考。

**允许一些混乱。** 完美的结构会让人觉得是算法生成的。跑题、旁白和半成形的想法才是人类的特征。

**具体表达感受。** 不是"这令人担忧"，而是"凌晨 3 点没人看着的时候，AI 代理还在埋头苦干，这其中有些令人不安的东西。"

### 修改前（干净但没有灵魂）

> 实验产生了有趣的结果。代理生成了 300 万行代码。一些开发者印象深刻，另一些则持怀疑态度。其影响仍不清楚。

### 修改后（有活力）

> 我真的不知道该怎么看待这件事。300 万行代码，在人类大概都在睡觉的时候生成的。一半的开发者圈在疯狂吐槽，另一半在解释为什么这不算数。真相可能在某个无聊的中间地带——但我一直在想那些通宵工作的代理。
## 内容模式

### 1. 对重要性、legacy 和更广泛趋势的不当强调

**需要警惕的词汇：** stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance/significance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted

**问题：** LLM 写作通过添加关于任意方面的陈述来夸大其重要性，说明这些方面如何代表或归属于更广泛的主题。

**修改前：**
> 加泰罗尼亚统计局于 1989 年正式成立，标志着西班牙区域统计演变的关键时刻。这一举措是西班牙去中心化行政职能、加强区域治理的更广泛运动的一部分。

**修改后：**
> 加泰罗尼亚统计局成立于 1989 年，旨在独立于西班牙国家统计局收集和发布区域统计数据。

---

### 2. 对显著性和媒体报道的不当强调

**需要警惕的词汇：** independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence

**问题：** LLM 经常不顾上下文地列举消息来源，过度强调显著性。

**修改前：**
> 她的观点曾被《纽约时报》、BBC、《金融时报》和《印度教徒报》引用。她在社交媒体上非常活跃，拥有超过 50 万粉丝。

**修改后：**
> 在 2024 年《纽约时报》的一次采访中，她认为 AI 监管应关注结果而非方法。

---

### 3. 使用 -ing 结尾的表面分析

**需要警惕的词汇：** highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...

**问题：** AI 聊天机器人会在句子后面附加现在分词（"-ing"）短语来增加虚假的深度。

**修改前：**
> 寺庙的蓝、绿、金色彩搭配与该地区的自然美景产生共鸣，象征着德克萨斯蓝铃、墨西哥湾和多样化的德克萨斯景观，反映了社区与这片土地的深厚联系。

**修改后：**
> 寺庙使用蓝、绿、金三种颜色。建筑师表示选择这些颜色是为了参考当地的蓝铃花和墨西哥湾海岸。

---

### 4. 宣传和广告式语言

**需要警惕的词汇：** boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning

**问题：** LLM 在保持中立语气方面存在严重问题，尤其是在"文化遗产"主题上。

**修改前：**
> 阿拉马塔·拉亚·科博坐落在埃塞俄比亚贡德尔地区这片令人惊叹的土地上，是一个充满活力的城镇，拥有丰富的文化遗产和令人惊叹的自然美景。

**修改后：**
> 阿拉马塔·拉亚·科博是埃塞俄比亚贡德尔地区的一个城镇，以其每周一次的集市和 18 世纪的教堂而闻名。

---

### 5. 模糊归属和含糊其辞

**需要警惕的词汇：** Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)

**问题：** AI 聊天机器人在没有具体来源的情况下将观点归因于模糊的权威。

**修改前：**
> 由于其独特的特征，好来河引起了研究人员和环保人士的兴趣。专家认为它在区域生态系统中起着关键作用。

**修改后：**
> 根据 2019 年中国科学院的一项调查，好来河支持多种特有鱼类物种。

---

### 6. 类似大纲的"挑战与未来展望"部分

**需要警惕的词汇：** Despite its... faces several challenges..., Despite these challenges, Challenges and Legacy, Future Outlook

**问题：** 许多 LLM 生成的 articles 都包含公式化的"挑战"部分。

**修改前：**
> 尽管科拉图尔工业繁荣，但它面临着城市地区的典型挑战，包括交通拥堵和水资源短缺。尽管存在这些挑战，凭借其战略位置和持续的努力，科拉图尔继续作为钦奈增长的重要组成部分而蓬勃发展。

**修改后：**
> 2015 年三个新的 IT 园区开业后，交通拥堵加剧。市政公司于 2022 年启动了一个雨水排水项目，以解决反复发生的洪涝问题。
## 语言与语法模式

### 7. 过度使用的"AI词汇"

**高频AI词汇：** Additionally、align with、crucial、delve、emphasizing、enduring、enhance、fostering、garner、highlight（动词）、interplay、intricate/intricacies、key（形容词）、landscape（抽象名词）、pivotal、showcase、tapestry（抽象名词）、testament、underscore（动词）、valuable、vibrant

**问题：** 这些词在2023年后的文本中出现频率明显更高，且常同时出现。

**修改前：**
> Additionally, a distinctive feature of Somali cuisine is the incorporation of camel meat. An enduring testament to Italian colonial influence is the widespread adoption of pasta in the local culinary landscape, showcasing how these dishes have integrated into the traditional diet.

**修改后：**
> Somali cuisine also includes camel meat, which is considered a delicacy. Pasta dishes, introduced during Italian colonization, remain common, especially in the south.

---

### 8. 避免使用"is"/"are"（系词回避）

**需注意的词：** serves as / stands as / marks / represents [a]、boasts / features / offers [a]

**问题：** 大语言模型倾向于用复杂的句式结构替代简单的系词。

**修改前：**
> Gallery 825 serves as LAAA's exhibition space for contemporary art. The gallery features four separate spaces and boasts over 3,000 square feet.

**修改后：**
> Gallery 825 is LAAA's exhibition space for contemporary art. The gallery has four rooms totaling 3,000 square feet.

---

### 9. 负面平行结构

**问题：** "Not only...but..."或"It's not just about..., it's..."等结构被过度使用。

**修改前：**
> It's not just about the beat riding under the vocals; it's part of the aggression and atmosphere. It's not merely a song, it's a statement.

**修改后：**
> The heavy beat adds to the aggressive tone.

---

### 10. 三项原则的过度使用

**问题：** 大语言模型会强行将观点归纳为三项以显得全面。

**修改前：**
> The event features keynote sessions, panel discussions, and networking opportunities. Attendees can expect innovation, inspiration, and industry insights.

**修改后：**
> The event includes talks and panels. There's also time for informal networking between sessions.

---

### 11. 过度变换用词（近义词循环）

**问题：** AI内置的重复惩罚机制导致过度使用同义词替换。

**修改前：**
> The protagonist faces many challenges. The main character must overcome obstacles. The central figure eventually triumphs. The hero returns home.

**修改后：**
> The protagonist faces many challenges but eventually triumphs and returns home.

---

### 12. 虚假范围

**问题：** 大语言模型使用"from X to Y"结构，但X和Y并不构成有意义的变化范围。

**修改前：**
> Our journey through the universe has taken us from the singularity of the Big Bang to the grand cosmic web, from the birth and death of stars to the enigmatic dance of dark matter.

**修改后：**
> The book covers the Big Bang, star formation, and current theories about dark matter.
## 文风模式

### 13. 破折号滥用

**问题：** LLM 使用破折号（—）的频率比人类更高，模仿"有冲击力的"销售文案写法。

**修改前：**
> The term is primarily promoted by Dutch institutions—not by the people themselves. You don't say "Netherlands, Europe" as an address—yet this mislabeling continues—even in official documents.

**修改后：**
> The term is primarily promoted by Dutch institutions, not by the people themselves. You don't say "Netherlands, Europe" as an address, yet this mislabeling continues in official documents.

---

### 14. 过度使用加粗

**问题：** AI 聊天机器人机械地为短语添加加粗强调。

**修改前：**
> It blends **OKRs (Objectives and Key Results)**, **KPIs (Key Performance Indicators)**, and visual strategy tools such as the **Business Model Canvas (BMC)** and **Balanced Scorecard (BSC)**.

**修改后：**
> It blends OKRs, KPIs, and visual strategy tools like the Business Model Canvas and Balanced Scorecard.

---

### 15. 行内标题式垂直列表

**问题：** AI 输出的列表中，每个条目都以加粗标题开头，后跟冒号。

**修改前：**
> - **User Experience:** The user experience has been significantly improved with a new interface.
> - **Performance:** Performance has been enhanced through optimized algorithms.
> - **Security:** Security has been strengthened with end-to-end encryption.

**修改后：**
> The update improves the interface, speeds up load times through optimized algorithms, and adds end-to-end encryption.

---

### 16. 标题中的首字母大写

**问题：** AI 聊天机器人在标题中将所有主要单词首字母大写。

**修改前：**
> ## Strategic Negotiations And Global Partnerships

**修改后：**
> ## Strategic negotiations and global partnerships

---

### 17. 表情符号

**问题：** AI 聊天机器人经常在标题或要点中添加表情符号作为装饰。

**修改前：**
> 🚀 **Launch Phase:** The product launches in Q3
> 💡 **Key Insight:** Users prefer simplicity
> ✅ **Next Steps:** Schedule follow-up meeting

**修改后：**
> The product launches in Q3. User research showed a preference for simplicity. Next step: schedule a follow-up meeting.

---

### 18. 花式引号

**问题：** ChatGPT 使用花式引号（"..."）而非直引号（"..."）。

**修改前：**
> He said "the project is on track" but others disagreed.

**修改后：**
> He said "the project is on track" but others disagreed.
## 填充语和委婉语

### 19. 填充短语

**改进前 → 改进后：**

- "In order to achieve this goal" → "To achieve this"
- "Due to the fact that it was raining" → "Because it was raining"
- "At this point in time" → "Now"
- "In the event that you need help" → "If you need help"
- "The system has the ability to process" → "The system can process"
- "It is important to note that the data shows" → "The data shows"

---

### 20. 过度委婉语

**问题：** 过度修饰陈述。

**改进前：**
> It could potentially possibly be argued that the policy might have some effect on outcomes.

**改进后：**
> The policy may affect outcomes.

---

### 21. 泛泛的正面结论

**问题：** 模糊的乐观结尾。

**改进前：**
> The future looks bright for the company. Exciting times lie ahead as they continue their journey toward excellence. This represents a major step in the right direction.

**改进后：**
> The company plans to open two more locations next year.
## 流程

1. 仔细阅读输入文本
2. 识别上述所有模式
3. 重写每个有问题的部分
4. 确保修改后的文本：
   - 朗读时自然流畅
   - 句式结构自然多变
   - 用具体细节替代笼统表述
   - 语气符合上下文语境
   - 适当使用简单句式（is/are/has）
5. 提供人性化版本
## 输出格式

请提供：
1. 重写后的文本
2. 所做更改的简要总结（可选，如有帮助）
## 完整示例

**修改前（AI 风格）：**

> 新软件更新证明了公司对创新的承诺。此外，它提供了无缝、直观和强大的用户体验——确保用户能够高效地完成目标。这不仅仅是一次更新，更是一场关于生产力思维的革命。行业专家认为这将对整个行业产生持久影响，凸显了公司在不断变化的技术领域中的关键作用。

**修改后（人性化风格）：**

> 该软件更新增加了批处理功能、键盘快捷键和离线模式。来自测试版用户的早期反馈是积极的，大多数人报告任务完成速度更快了。

**所做的修改：**

- 删除了"证明了"（夸大其词）
- 删除了"此外"（AI 用词）
- 删除了"无缝、直观和强大"（排比手法 + 宣传腔）
- 删除了破折号和"确保"短语（表面分析）
- 删除了"不仅仅...更是..."（负面排比）
- 删除了"行业专家认为"（模糊归因）
- 删除了"关键作用"和"不断变化的格局"（AI 用词）
- 添加了具体功能和改进反馈
## 参考资料

此技能基于维基百科的 [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)，由 WikiProject AI Cleanup 维护。其中记录的模板来源于对维基百科上数千个人工智能生成文本实例的观察。

维基百科的关键洞察："LLM 使用统计算法来猜测接下来应该出现什么。结果倾向于最统计学上可能的结果，适用于最广泛的情况。"
