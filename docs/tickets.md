# HandLog Tickets

---

## ✅ E8 — Capture 写入 Notion（已完成）

- 找到/创建本周页面（标题格式 `5-25-31`）
- 追加简短日常属性：`三. [当天内容]`
- 复盘写入页面 body，结构：Toggle > heading_3 + to_do
- 标题彩色加粗，下一步用 checkbox，正能量用紫色标题

---

## E9 — 部署 Vercel（上线）

**目标：** 把 HandLog 部署到 Vercel，用真实域名访问，不依赖本地 `npm run dev`。

### 步骤

1. `vercel login` + `vercel link`
2. 在 Vercel Dashboard 设置所有环境变量（同 `.env.local`）
3. `vercel --prod` 部署
4. 验证生产环境 dashboard、capture、review 全部正常

### 涉及环境变量

- `NOTION_TOKEN` / `NOTION_DATABASE_ID`
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`（Vercel KV）
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`

---

## E10 — Dashboard 词云卡片

**目标：** 在 Dashboard 页面新增词云卡片，从「简短日常」和「复盘」字段提取高频词。

**不花钱：** 纯前端文字处理，不调用 Claude / Whisper。

### 实现思路

1. Dashboard API 读取每条记录的 `简短日常` + `复盘` 文字
2. 按标点/空格分词，统计词频，过滤停用词（的/了/我/在/是）
3. 返回 `wordFrequency: { word: string; count: number }[]`
4. 前端用气泡样式渲染，词越频繁字越大

### 涉及文件

- `src/lib/dashboard.ts` — 加 `wordFrequency` 字段和分词逻辑
- `src/app/api/dashboard/route.ts` — 读取简短日常/复盘字段
- `src/app/[locale]/dashboard/DashboardContent.tsx` — 新增词云卡片

---

## E11 — 时间轴页面（Timeline）

**目标：** 新增「时间轴」页面，把每周「简短日常」按天拆开，展示成每天一张卡片的日记墙。

**不花钱：** 只读 Notion API，不调用 AI。

### 数据解析逻辑

每条 Notion 周记录的「简短日常」格式：
```
一. Wheeler hills，看书，...
二. ben toy library，...
三. 预定clayton...
```
- 按 `\n中文数字.` 拆分成最多 7 条（一二三四五六七）
- 周一 = 标题开始日（如 `5-25-31` → 5月25日）+ 0天
- 周二 = +1天，以此类推

### 涉及文件

- `src/app/api/timeline/route.ts` — 新 API，按天展开条目
- `src/lib/timeline.ts` — 解析简短日常、计算每天日期
- `src/app/[locale]/timeline/page.tsx` — 时间轴页面
- `src/app/[locale]/timeline/TimelineContent.tsx` — 卡片墙 + 筛选 + 搜索
- `src/components/layout/AppNav.tsx` — 导航加「时间轴」入口

### 页面功能（参考 mockup）

- 按月分组，"2026 年 5 月 · N 条记录"
- 3列卡片网格（手机 1 列）
- 顶部标签筛选栏 + 搜索框
- 每张卡片：日期大字、评分、一句话感悟（来自当天 AI 复盘）、标签
- 右下角「+ 记录今天」跳转 Capture

---

## ✅ E12 — AI 生成日复盘手账图（已完成）

**模型：** `gpt-image-1`（OpenAI 最新图像模型）

### 图片存储规则（三层结构）

| 复盘类型 | 图片存在哪里 | 形式 |
|---------|------------|------|
| **日复盘图** | 当天 Toggle 的 Callout 里 | image block |
| **周复盘图** | 那一周行的「手绘复盘图」属性 | Files & media 属性 |
| **月复盘图** | 「复盘-汇总」行的页面 body 里 | Toggle（标题写"X月X日-X月X日复盘"） |

---

## E13 — 周复盘（含完整 18 sections）

**目标：** 每周结束时，把本周7天的日复盘内容汇总，用 Claude 生成包含完整 18 个 section 的周复盘报告 + AI 图片。

### 输入来源

<!-- 从本周7条日复盘记录（Notion page body 里的 Toggle）里提取所有字段： -->
需要重新读取本周的notion 简单日常里面的内容，重新总结


| 字段 | 合并方式 |
|------|---------|
| `people` / `places` / `events` / `books` / `mediaConsumed` / `moviesTV` | 去重合并，保留全部条目 |
| `parenting` / `health` / `finance` / `learning` / `creativeOutput` | 原文拼接，按天排列 |
| `emotions` | 原文拼接，保留每天情绪原话 |
| `score` | 取数组 `[7, 8, 6, ...]`，计算平均分 |
| `oneLineInsight` / `reviewParagraph` / `nextSteps` | 原文拼接，作为 Claude 的上下文素材 |
| `energyDistribution` / `progressZones` | 原文拼接 |

### Claude 生成内容（18 个核心 section + 4 个周专属）

**18 个核心 section**（对应 sections.md 里的定义）：

1. 👥 People — 本周所有出现的人物汇总
2. 📍 Places — 本周去过/提到的地点汇总
3. 📅 Events — 本周发生的重要事件
4. 📚 Books — 本周在读/读完的书
5. 🎙 Podcasts & Articles — 本周消费的媒体内容
6. 🎬 Movies & TV — 本周看的影视
7. 👶 Parenting — 本周育儿片段汇总
8. 💪 Health & Body — 本周运动/睡眠/饮食整体状态
9. 💰 Finance — 本周财务动态
10. 🧠 Learning — 本周学到的核心知识点
11. ✍️ Creative Output — 本周创作输出
12. 🌊 Emotions — 本周情绪全貌（不做评判，如实呈现）
13. 💡 One-line Insight — 一句话点出本周最核心的洞察
14. 🪞 Review Paragraph — 2-3 段叙述，串联本周脉络
15. 🎯 Next Steps — 下周需要跟进的行动项（3-5 条）
16. ⚡ Energy Distribution — 本周精力分布百分比（各类别加总=100%）
17. 🌱 Progress Zones — 本周突破 / 练习中 / 种下的种子
18. ⭐ Score — 本周评分（基于7天平均）+ 一句理由

**4 个周专属 section**：

19. 📈 Score Trend (`scoreTrend`) — 列出7天分数数组 + 趋势描述
20. 🔁 Emotion Pattern (`emotionPattern`) — 这周情绪反复出现的规律（如"前半周焦虑，周末放松"）
21. 🔍 Core Problem (`coreProblem`) — 这周最消耗你的那个核心问题是什么
22. 🚩 Cross-week Flag (`crossWeekFlag`) — 本周是否有跨周反复出现的信号（需和上周对比）

### 存储位置

- **复盘文字**：写入本周 Notion 页面 body（Toggle，标题"本周复盘"，每个 section 用 heading_3 分隔）
- **复盘图片**：更新本周行的「手绘复盘图」属性（Files & media）

### 涉及文件

- `src/lib/weekly-review.ts` — 汇总7天字段 + 构建 Claude prompt
- `src/app/api/review/weekly/route.ts` — 触发周复盘生成
- `src/lib/notion-writer.ts` — 把生成结果写回 Notion（复用日复盘的写入逻辑）

---

## E14 — 月复盘（含完整 18 sections + 月专属分析）

**目标：** 每月结束时，汇总本月所有周记录，用 Claude 生成包含完整 18 个 section 的月复盘报告 + AI 图片。

### 输入来源

<!-- 从本月所有周复盘的 Notion Toggle 里提取内容（而不是重新读所有日记录）。汇总方式同周复盘，时间跨度扩大到整月。 -->

需要重新读取本月的notion 简单日常里面的内容，重新总结


### Claude 生成内容（18 个核心 section + 6 个月专属）

**18 个核心 section**（同周复盘，但视角是整月）：

1-18. 同上，但维度变为「这个月」——例如 People 是本月出现频率最高的人，Events 是本月最重要的事件，Score 是月均分等。

**6 个月专属 section**（包含周复盘的4个 + 月额外2个）：

19. 📈 Score Trend (`scoreTrend`) — 本月按周的分数走势
20. 🔁 Emotion Pattern (`emotionPattern`) — 本月情绪规律（哪类情绪反复出现、在什么情境下触发）
21. 🔍 Core Problem (`coreProblem`) — 本月最消耗你的核心困境（不只是问题，要挖到困境层）
22. 🚩 Cross-week Flag (`crossWeekFlag`) — 本月持续信号（连续出现3周及以上的主题）
23. 📊 Monthly Pattern (`monthlyPattern`) — 本月高频主题：人物/地点/情绪/话题各出现了什么规律
24. 🧭 Next Month Direction (`nextMonthDirection`) — 下个月 1-3 个核心意图（基于本月规律推导，不是 to-do list）

### 存储位置

- 在 Notion 数据库里找到「复盘-汇总」那一行
- 在该页面 body 里追加一个 Toggle，标题格式：`5月1日-5月31日复盘`
- Toggle 里写入月复盘内容（每个 section 用 heading_3 分隔）+ AI 生成图片（image block）

### 涉及文件

- `src/lib/monthly-review.ts` — 汇总本月所有周复盘 + 构建 Claude prompt
- `src/app/api/review/monthly/route.ts` — 触发月复盘生成
- `src/lib/notion-writer.ts` — 写入「复盘-汇总」页面（复用逻辑）

---

## 待做顺序

1. **E10** — Dashboard 词云
2. **E13** — 周复盘（含完整 18 sections）
3. **E14** — 月复盘（含完整 18 sections + 月专属分析）
