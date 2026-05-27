# HandLog Review Sections

每日、每周、每月复盘共用以下 18 个 section，区别只在于输入来源和时间跨度。

---

## 18 个核心 Section

### 记录类（发生了什么）

| # | Section | 字段名 | 说明 |
|---|---------|--------|------|
| 1 | 👥 People | `people` | 提到/遇到的人 |
| 2 | 📍 Places | `places` | 去过/提到的地点 |
| 3 | 📅 Events | `events` | 发生的事件/活动 |
| 4 | 📚 Books | `books` | 读的书 |
| 5 | 🎙 Podcasts & Articles | `mediaConsumed` | 听的播客、读的文章/博主 |
| 6 | 🎬 Movies & TV | `moviesTV` | 看的影视 |
| 7 | 👶 Parenting | `parenting` | 育儿相关 |
| 8 | 💪 Health & Body | `health` | 运动、睡眠、饮食、身体感受 |
| 9 | 💰 Finance | `finance` | 花销、收入、财务决策 |
| 10 | 🧠 Learning | `learning` | 学到的知识、技能、概念 |
| 11 | ✍️ Creative Output | `creativeOutput` | 写作、设计、创作输出 |
| 12 | 🌊 Emotions | `emotions` | 情绪状态、感受 |

### 分析类（AI 的洞察）

| # | Section | 字段名 | 说明 |
|---|---------|--------|------|
| 13 | 💡 One-line Insight | `oneLineInsight` | 一句话核心洞察 |
| 14 | 🪞 Review Paragraph | `reviewParagraph` | 整体叙述段落 |
| 15 | 🎯 Next Steps | `nextSteps` | 行动清单 |
| 16 | ⚡ Energy Distribution | `energyDistribution` | 精力分布百分比（各类别加总=100%）|
| 17 | 🌱 Progress Zones | `progressZones` | 突破 / 练习中 / 种下的种子 |
| 18 | ⭐ Score | `score` + `scoreReason` | 1-10 分 + 理由 |

### 附加类

| # | Section | 字段名 | 说明 |
|---|---------|--------|------|
| +1 | 🧘 Psych Note | `psychNote` | 一个心理学概念的白话解释 |

---

## 各复盘类型的额外 Section

### 📅 每日复盘
只包含上述 18 个核心 section + psychNote，无额外 section。

---

### 📆 周复盘（18 个核心 + 4 个额外）

| # | Section | 字段名 | 说明 |
|---|---------|--------|------|
| +2 | 📈 Score Trend | `scoreTrend` | 7 天分数变化（数组） |
| +3 | 🔁 Emotion Pattern | `emotionPattern` | 这周情绪反复出现的规律 |
| +4 | 🔍 Core Problem | `coreProblem` | 这周最消耗你的核心问题 |
| +5 | 🚩 Cross-week Flag | `crossWeekFlag` | 跨周反复出现的信号（如"连续3周提到睡眠"） |

**输入来源：** 本周 7 天每日复盘的字段汇总（people/events/emotions 等去重合并，score 取数组）

---

### 🗓 月复盘（18 个核心 + 6 个额外）

包含周复盘的 4 个额外 section，再加：

| # | Section | 字段名 | 说明 |
|---|---------|--------|------|
| +6 | 📊 Monthly Pattern | `monthlyPattern` | 整月高频主题/词云级别的规律 |
| +7 | 🧭 Next Month Direction | `nextMonthDirection` | 下个月 1-3 个核心意图 |

**输入来源：** 本月所有周复盘的字段汇总
